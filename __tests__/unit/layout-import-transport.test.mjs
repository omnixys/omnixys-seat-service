import {
  parseImportMetadata,
  LAYOUT_IMPORT_LIMITS,
} from '../../dist/layout-import/layout-import.contract.js';
import { LayoutImportController } from '../../dist/layout-import/layout-import.controller.js';
import { LayoutImportModule } from '../../dist/layout-import/layout-import.module.js';
import {
  prepareImportRaster,
  validateImportPdf,
} from '../../dist/layout-import/layout-import.preprocessor.js';
import {
  LayoutImportService,
  readImportRequest,
  runImportWorker,
} from '../../dist/layout-import/layout-import.service.js';
import { SeatEventRoleResolver } from '../../dist/seat/services/seat-event-role-resolver.service.js';
import multipart from '@fastify/multipart';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { EventPermissionKey } from '@omnixys/contracts-ts';
import {
  CookieAuthGuard,
  RoleGuard,
  EventPermissionResolver,
} from '@omnixys/security-ts';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import { test } from 'node:test';
import 'reflect-metadata';
import sharp from 'sharp';

const logger = {
  log: () => ({ info() {}, warn() {}, error() {}, debug() {} }),
};
const eventId = '019b0000-0000-7000-8000-000000000001';
const otherEventId = '019b0000-0000-7000-8000-000000000002';
const png = await sharp({
  create: { width: 128, height: 96, channels: 3, background: 'white' },
})
  .png()
  .toBuffer();
const job = {
  metadata: { kind: 'IMAGE', width: 128, height: 96 },
  preparedImage: { bytes: png, mimetype: 'image/png' },
  originalSource: { bytes: png, mimetype: 'image/png' },
};

function pdfFixture(count, encrypted = false) {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Count ${count} /Kids [${Array.from({ length: count }, (_, i) => `${i + 3} 0 R`).join(' ')}] >>`,
  ];
  for (let i = 0; i < count; i++)
    objects.push(
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 400] /Resources << >> >>',
    );
  if (encrypted) {
    objects.push(
      `<< /Filter /Standard /V 1 /R 2 /O <${'00'.repeat(32)}> /U <${'00'.repeat(32)}> /P -4 >>`,
    );
  }
  let document = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, i) => {
    offsets.push(Buffer.byteLength(document));
    document += `${i + 1} 0 obj\n${object}\nendobj\n`;
  });
  const start = Buffer.byteLength(document);
  document += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  document += offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`)
    .join('');
  const encryption = encrypted
    ? `/Encrypt ${objects.length} 0 R /ID [<${'00'.repeat(16)}> <${'00'.repeat(16)}>]`
    : '';
  document += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R ${encryption} >>\nstartxref\n${start}\n%%EOF\n`;
  return Buffer.from(document);
}

function requestParts(overrides = {}) {
  return {
    isMultipart: () => true,
    async *parts() {
      yield {
        type: 'field',
        fieldname: 'metadata',
        value: JSON.stringify(job.metadata),
      };
      for (const [fieldname, source] of Object.entries({
        originalSource: job.originalSource,
        preparedImage: job.preparedImage,
        ...overrides,
      })) {
        yield {
          type: 'file',
          fieldname,
          mimetype: source.mimetype,
          file: Readable.from([source.bytes]),
        };
      }
    },
  };
}

function multipartBody(value = job, extra = '') {
  const boundary = 'seat-layout-test-boundary';
  const chunks = [
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="metadata"\r\n\r\n${JSON.stringify(value.metadata)}\r\n`,
    ),
  ];
  for (const name of ['originalSource', 'preparedImage']) {
    const source = value[name];
    chunks.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${name}"; filename="source"\r\nContent-Type: ${source.mimetype}\r\n\r\n`,
      ),
      source.bytes,
      Buffer.from('\r\n'),
    );
  }
  if (extra)
    chunks.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="extra"\r\n\r\n${extra}\r\n`,
      ),
    );
  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  return {
    payload: Buffer.concat(chunks),
    headers: {
      'content-type': `multipart/form-data; boundary=${boundary}`,
      'x-test-user': 'user',
    },
  };
}

test('metadata rejects unsafe dimensions, extra identity and invalid source pages', () => {
  assert.deepEqual(parseImportMetadata(job.metadata), job.metadata);
  for (const invalid of [
    { ...job.metadata, kind: { toString: null } },
    { ...job.metadata, width: Infinity },
    { ...job.metadata, height: NaN },
    { ...job.metadata, width: 2049 },
    { ...job.metadata, eventId: otherEventId },
    { ...job.metadata, pageNumber: 1 },
    { kind: 'PDF', width: 128, height: 96, pageNumber: 0 },
  ]) {
    assert.throws(
      () => parseImportMetadata(invalid),
      (error) => error.code === 'INVALID_METADATA',
    );
  }
});

test('server decodes PNG/JPEG/WebP originals and bounds normalized grayscale pixels', async () => {
  for (const format of ['png', 'jpeg', 'webp']) {
    const original = await sharp(png)[format]().toBuffer();
    const result = await prepareImportRaster({
      ...job,
      originalSource: { bytes: original, mimetype: `image/${format}` },
    });
    assert.equal(result.channels, 1);
    assert.equal(result.width, 128);
    assert.equal(result.height, 96);
    assert.equal(result.data.byteLength, 128 * 96);
  }
  const rotated = await sharp(png)
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer();
  await prepareImportRaster({
    ...job,
    originalSource: { bytes: rotated, mimetype: 'image/jpeg' },
  });
  const large = await sharp({
    create: { width: 2048, height: 1024, channels: 3, background: 'white' },
  })
    .png()
    .toBuffer();
  const result = await prepareImportRaster({
    ...job,
    metadata: { kind: 'IMAGE', width: 2048, height: 1024 },
    preparedImage: { bytes: large, mimetype: 'image/png' },
  });
  assert.deepEqual([result.width, result.height], [1600, 800]);
});

test('server rejects corrupt files, MIME mismatch, excessive source pixels and prepared dimension mismatch', async () => {
  const oversized = await sharp({
    create: { width: 5000, height: 5000, channels: 3, background: 'white' },
  })
    .png()
    .toBuffer();
  for (const source of [
    { bytes: Buffer.from('invalid'), mimetype: 'image/png' },
    { bytes: png, mimetype: 'image/jpeg' },
    { bytes: png, mimetype: 'image/svg+xml' },
    { bytes: oversized, mimetype: 'image/png' },
  ]) {
    await assert.rejects(
      prepareImportRaster({ ...job, originalSource: source }),
      (error) => error.code === 'INVALID_IMAGE',
    );
  }
  await assert.rejects(
    prepareImportRaster({ ...job, metadata: { ...job.metadata, width: 127 } }),
    (error) => error.code === 'INVALID_PREPARED_IMAGE',
  );
  await assert.rejects(
    prepareImportRaster({
      ...job,
      preparedImage: { bytes: png.subarray(0, 60), mimetype: 'image/png' },
    }),
    (error) => error.code === 'INVALID_PREPARED_IMAGE',
  );
});

test('PDF validation parses real one/multi-page sources and rejects invalid selection, count and corrupt bytes', async () => {
  await validateImportPdf(pdfFixture(1), 1);
  await validateImportPdf(pdfFixture(3), 2);
  await assert.rejects(
    validateImportPdf(pdfFixture(1, true), 1),
    (error) => error.code === 'ENCRYPTED_PDF',
  );
  await assert.rejects(
    validateImportPdf(pdfFixture(3), 4),
    (error) => error.code === 'INVALID_PDF_PAGE',
  );
  await assert.rejects(
    validateImportPdf(pdfFixture(101), 1),
    (error) => error.code === 'INVALID_PDF_PAGE',
  );
  await assert.rejects(
    validateImportPdf(Buffer.from('not a PDF'), 1),
    (error) => error.code === 'INVALID_PDF',
  );
  const result = await prepareImportRaster({
    ...job,
    metadata: { ...job.metadata, kind: 'PDF', pageNumber: 2 },
    originalSource: { bytes: pdfFixture(2), mimetype: 'application/pdf' },
  });
  assert.equal(result.data.byteLength, 128 * 96);
});

test('stream reader refuses excess prepared bytes before recognition', async () => {
  await assert.rejects(
    readImportRequest(
      requestParts({
        preparedImage: {
          bytes: Buffer.alloc(LAYOUT_IMPORT_LIMITS.preparedBytes + 1),
          mimetype: 'image/png',
        },
      }),
      new AbortController().signal,
    ),
    (error) => error.getStatus() === 413,
  );
});

test('worker executes real decoding/recognition and termination on cancellation', async () => {
  const result = await runImportWorker(job, new AbortController().signal);
  assert.equal(result.recognizer, 'geometry-v1');
  assert.deepEqual(result.elements, []);
  assert.ok(result.warnings.some((warning) => warning.code === 'NO_OBJECTS'));
  const controller = new AbortController();
  const running = runImportWorker(job, controller.signal);
  controller.abort(new Error('cancelled'));
  await assert.rejects(running, /cancelled/);
  assert.equal(
    (await runImportWorker(job, new AbortController().signal)).recognizer,
    'geometry-v1',
  );
});

test('admission rejects a third request without reading it; cancellation frees both slots', async () => {
  const service = new LayoutImportService(logger);
  const stalled = {
    isMultipart: () => true,
    async *parts() {
      await new Promise(() => {});
    },
  };
  const first = new AbortController();
  const second = new AbortController();
  const a = service.analyze(stalled, eventId, first.signal);
  const b = service.analyze(stalled, eventId, second.signal);
  await assert.rejects(
    service.analyze(
      {
        isMultipart() {
          throw new Error('must not read overload');
        },
      },
      eventId,
    ),
    (error) => error.getStatus() === 429,
  );
  first.abort();
  second.abort();
  await Promise.all([
    assert.rejects(a, (error) => error.getStatus() === 408),
    assert.rejects(b, (error) => error.getStatus() === 408),
  ]);
  assert.equal(
    (await service.analyze(requestParts(), eventId)).recognizer,
    'geometry-v1',
  );
});

test('upload/analysis share the 20-second deadline and timeout releases admission', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const service = new LayoutImportService(logger);
  const pending = service.analyze(
    {
      isMultipart: () => true,
      async *parts() {
        await new Promise(() => {});
      },
    },
    eventId,
  );
  const rejected = assert.rejects(
    pending,
    (error) => error.getResponse().code === 'IMPORT_TIMEOUT',
  );
  t.mock.timers.tick(20_000);
  await rejected;
  t.mock.timers.reset();
  assert.equal(
    (await service.analyze(requestParts(), eventId)).recognizer,
    'geometry-v1',
  );
});

test('REST authorization uses the path event, clears disconnect listeners and never starts unauthorized work', async () => {
  let calls = 0;
  const observed = [];
  const controller = new LayoutImportController(
    {
      async analyze() {
        calls++;
        return { elements: [] };
      },
    },
    {
      async getPermissionsForUser(user, event) {
        observed.push([user, event]);
        return event === eventId ? [EventPermissionKey.ManageSeats] : [];
      },
    },
  );
  const request = {
    raw: new EventEmitter(),
    headers: { 'x-active-event-id': eventId },
  };
  const reply = { raw: new EventEmitter() };
  await assert.rejects(
    controller.analyze(otherEventId, { id: 'user' }, request, reply),
    (error) => error.getStatus() === 403,
  );
  await assert.rejects(
    controller.analyze(eventId, null, request, reply),
    (error) => error.getStatus() === 401,
  );
  assert.equal(calls, 0);
  await controller.analyze(eventId, { id: 'user' }, request, reply);
  assert.equal(calls, 1);
  assert.deepEqual(observed[0], ['user', otherEventId]);
  assert.equal(request.raw.listenerCount('aborted'), 0);
  assert.equal(reply.raw.listenerCount('close'), 0);
});

test('Nest/Fastify boundary handles actual multipart, status/error contracts and authenticated event access', async () => {
  const builder = Test.createTestingModule({ imports: [LayoutImportModule] });
  builder
    .overrideProvider(LayoutImportService)
    .useValue(new LayoutImportService(logger));
  builder.overrideProvider(SeatEventRoleResolver).useValue({});
  builder.overrideProvider(EventPermissionResolver).useValue({
    async getPermissionsForUser(_user, target) {
      return target === eventId ? [EventPermissionKey.ManageSeats] : [];
    },
  });
  builder.overrideGuard(CookieAuthGuard).useValue({
    canActivate(context) {
      const request = context.switchToHttp().getRequest();
      request.user = request.headers['x-test-user']
        ? { id: 'user', raw: { realm_access: { roles: ['USER'] } } }
        : null;
      return !!request.user;
    },
  });
  builder.overrideGuard(RoleGuard).useValue({ canActivate: () => true });
  const module = await builder.compile();
  const app = module.createNestApplication(new FastifyAdapter(), {
    logger: false,
  });
  await app.register(multipart);
  await app.init();
  try {
    const fastify = app.getHttpAdapter().getInstance();
    const response = await fastify.inject({
      method: 'POST',
      url: `/layout-import/${eventId}/analyze`,
      ...multipartBody(),
    });
    assert.equal(response.statusCode, 200, response.body);
    assert.equal(response.json().recognizer, 'geometry-v1');
    assert.equal(response.headers['cache-control'], 'no-store');
    const denied = await fastify.inject({
      method: 'POST',
      url: `/layout-import/${otherEventId}/analyze`,
      ...multipartBody(),
      headers: { ...multipartBody().headers, 'x-active-event-id': eventId },
    });
    assert.equal(denied.statusCode, 403);
    const invalid = await fastify.inject({
      method: 'POST',
      url: `/layout-import/${eventId}/analyze`,
      ...multipartBody({ ...job, metadata: { ...job.metadata, width: 12 } }),
    });
    assert.equal(invalid.statusCode, 422, invalid.body);
    assert.equal(invalid.json().code, 'INVALID_PREPARED_IMAGE');
    const extra = await fastify.inject({
      method: 'POST',
      url: `/layout-import/${eventId}/analyze`,
      ...multipartBody(job, 'not allowed'),
    });
    assert.equal(extra.statusCode, 400, extra.body);
    const badId = await fastify.inject({
      method: 'POST',
      url: '/layout-import/not-a-uuid/analyze',
      ...multipartBody(),
    });
    assert.equal(badId.statusCode, 400);
  } finally {
    await app.close();
  }
});
