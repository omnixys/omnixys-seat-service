import {
  corsOriginAllowlist,
  parseCheckpointOrigin,
} from '../../dist/config/cors-origins.js';
import cors from '@fastify/cors';
import Fastify from 'fastify';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import test from 'node:test';

const checkpoint = 'https://checkpoint.example.com';

test('Checkpoint origin is optional, canonical and additive to existing browser origins', () => {
  assert.deepEqual(corsOriginAllowlist(''), [
    'http://localhost:3000',
    'https://studio.apollographql.com',
  ]);
  assert.equal(
    parseCheckpointOrigin('https://CHECKPOINT.example.com/'),
    checkpoint,
  );
  assert.equal(
    parseCheckpointOrigin('http://localhost:4500'),
    'http://localhost:4500',
  );
  assert.deepEqual(corsOriginAllowlist(checkpoint), [
    'http://localhost:3000',
    'https://studio.apollographql.com',
    checkpoint,
  ]);
  assert.equal(corsOriginAllowlist('http://localhost:3000').length, 2);
});

test('invalid origin configuration fails closed without echoing configuration input', () => {
  for (const value of [
    '*',
    'null',
    'https://*.example.com',
    'https://%2a.example.com',
    'https://checkpoint.example.com/app',
    'https://checkpoint.example.com?x=1',
    'https://checkpoint.example.com#fragment',
    'https://user:private@example.com',
    'ftp://checkpoint.example.com',
    'file:///tmp/source',
    'https://a.example,https://b.example',
    'https://a.example,b.example',
    ' https://checkpoint.example.com',
    'https://checkpoint.example.com\\other',
    'https://checkpoint.example.com:99999',
  ]) {
    assert.throws(
      () => parseCheckpointOrigin(value),
      (error) =>
        error.message.includes('CHECKPOINT_ORIGIN') &&
        !error.message.includes(value),
    );
  }
});

test('environment configuration reaches the production CORS options', () => {
  const moduleUrl = new URL('../../dist/config/cors.js', import.meta.url).href;
  const result = execFileSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `const {corsOptions}=await import(${JSON.stringify(moduleUrl)});process.stdout.write(JSON.stringify({origin:corsOptions.origin,credentials:corsOptions.credentials}));`,
    ],
    {
      env: { ...process.env, NODE_ENV: 'test', CHECKPOINT_ORIGIN: checkpoint },
      encoding: 'utf8',
    },
  );
  assert.deepEqual(JSON.parse(result), {
    origin: [
      'http://localhost:3000',
      'https://studio.apollographql.com',
      checkpoint,
    ],
    credentials: true,
  });
});

test('actual Fastify CORS permits exact configured/local origins and denies lookalikes and alternate ports', async () => {
  const app = Fastify();
  await app.register(cors, {
    origin: corsOriginAllowlist(checkpoint),
    credentials: true,
    methods: ['POST'],
    allowedHeaders: ['Content-Type'],
  });
  app.post('/layout-import/event/analyze', async () => ({ ok: true }));
  try {
    for (const origin of [
      checkpoint,
      'http://localhost:3000',
      'https://studio.apollographql.com',
    ]) {
      const response = await app.inject({
        method: 'OPTIONS',
        url: '/layout-import/event/analyze',
        headers: {
          origin,
          'access-control-request-method': 'POST',
          'access-control-request-headers': 'content-type',
        },
      });
      assert.equal(response.headers['access-control-allow-origin'], origin);
      assert.equal(
        response.headers['access-control-allow-credentials'],
        'true',
      );
      assert.equal(response.statusCode, 204);
    }
    for (const origin of [
      'https://checkpoint.example.com.evil.example',
      'https://evil.example',
      'http://checkpoint.example.com',
      'https://checkpoint.example.com:8443',
      'null',
    ]) {
      const response = await app.inject({
        method: 'OPTIONS',
        url: '/layout-import/event/analyze',
        headers: { origin, 'access-control-request-method': 'POST' },
      });
      assert.equal(response.headers['access-control-allow-origin'], undefined);
    }
  } finally {
    await app.close();
  }
});
