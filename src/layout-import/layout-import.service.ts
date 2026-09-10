import {
  LAYOUT_IMPORT_LIMITS,
  LayoutImportSourceError,
  parseImportMetadata,
  type LayoutImportFile,
  type LayoutImportJob,
} from './layout-import.contract.js';
import type { LayoutRecognitionResult } from './recognizers/layout-recognizer.js';
import { HttpException, Injectable } from '@nestjs/common';
import { OmnixysLogger } from '@omnixys/logger-ts';
import type { FastifyRequest } from 'fastify';
import { Worker } from 'node:worker_threads';

export class LayoutImportRequestError extends HttpException {
  constructor(code: string, message: string, status = 400) {
    super({ statusCode: status, code, message }, status);
  }
}

/** One admission slot includes upload, validation and recognition; never queue source bytes. */
@Injectable()
export class LayoutImportService {
  private active = 0;
  private readonly log;

  constructor(logger: OmnixysLogger) {
    this.log = logger.log(this.constructor.name, 'service:seat');
  }

  async analyze(
    request: FastifyRequest,
    eventId: string,
    clientSignal?: AbortSignal,
  ): Promise<LayoutRecognitionResult> {
    if (this.active >= LAYOUT_IMPORT_LIMITS.concurrency) {
      throw new LayoutImportRequestError(
        'IMPORT_BUSY',
        'Two imports are already running. Try again shortly.',
        429,
      );
    }
    this.active++;
    const controller = new AbortController();
    const cancel = (): void =>
      controller.abort(
        new LayoutImportRequestError('IMPORT_CANCELLED', 'Import was cancelled.', 408),
      );
    clientSignal?.addEventListener('abort', cancel, { once: true });
    if (clientSignal?.aborted) {
      cancel();
    }
    const started = Date.now();
    const timeout = setTimeout(
      () =>
        controller.abort(
          new LayoutImportRequestError(
            'IMPORT_TIMEOUT',
            'Import exceeded the 20-second limit.',
            408,
          ),
        ),
      LAYOUT_IMPORT_LIMITS.timeoutMs,
    );
    timeout.unref();
    try {
      const job = await readImportRequest(request, controller.signal);
      const result = await runImportWorker(job, controller.signal);
      this.log.info('Layout import analyzed', {
        eventId,
        sourceType: job.metadata.kind,
        elements: result.elements.length,
        durationMs: Date.now() - started,
      });
      return result;
    } catch (error) {
      if (controller.signal.aborted) {
        throw abortReason(controller.signal);
      }
      if (error instanceof HttpException) {
        throw error;
      }
      if (error instanceof LayoutImportSourceError) {
        throw new LayoutImportRequestError(error.code, error.message);
      }
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'ERR_STREAM_PREMATURE_CLOSE'
      ) {
        throw new LayoutImportRequestError(
          'INVALID_UPLOAD',
          'Upload ended before all source data was received.',
        );
      }
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        String(error.code).startsWith('FST_')
      ) {
        throw new LayoutImportRequestError(
          'INVALID_UPLOAD',
          'Upload is malformed or exceeds the file limits.',
          413,
        );
      }
      this.log.warn('Layout import failed', { eventId, durationMs: Date.now() - started });
      throw new LayoutImportRequestError('IMPORT_FAILED', 'Import could not be processed.', 500);
    } finally {
      clearTimeout(timeout);
      clientSignal?.removeEventListener('abort', cancel);
      this.active--;
    }
  }
}

export async function readImportRequest(
  request: FastifyRequest,
  signal: AbortSignal,
): Promise<LayoutImportJob> {
  signal.throwIfAborted();
  if (!request.isMultipart()) {
    throw new LayoutImportRequestError('INVALID_UPLOAD', 'Expected multipart/form-data.');
  }
  const files = new Map<string, LayoutImportFile>();
  let metadata: unknown;
  const parts = request.parts({
    limits: {
      files: 2,
      fields: 1,
      parts: 3,
      fieldSize: 1024,
      fileSize: LAYOUT_IMPORT_LIMITS.originalBytes,
    },
  });
  try {
    while (true) {
      const next = await abortable(parts.next(), signal);
      if (next.done) {
        break;
      }
      const part = next.value;
      if (part.type === 'field') {
        if (
          part.fieldname !== 'metadata' ||
          metadata !== undefined ||
          part.valueTruncated ||
          typeof part.value !== 'string'
        ) {
          throw new LayoutImportRequestError(
            'INVALID_METADATA',
            'Exactly one metadata field is required.',
          );
        }
        try {
          metadata = JSON.parse(part.value);
        } catch {
          throw new LayoutImportRequestError(
            'INVALID_METADATA',
            'Source metadata is invalid JSON.',
          );
        }
        continue;
      }
      if (
        !['originalSource', 'preparedImage'].includes(part.fieldname) ||
        files.has(part.fieldname)
      ) {
        part.file.resume();
        throw new LayoutImportRequestError(
          'INVALID_UPLOAD',
          'Only one original source and one prepared image are allowed.',
        );
      }
      const maximum =
        part.fieldname === 'preparedImage'
          ? LAYOUT_IMPORT_LIMITS.preparedBytes
          : LAYOUT_IMPORT_LIMITS.originalBytes;
      let size = 0;
      const chunks: Buffer[] = [];
      const cancel = (): void => {
        part.file.destroy();
      };
      signal.addEventListener('abort', cancel, { once: true });
      try {
        const stream = part.file[Symbol.asyncIterator]();
        while (true) {
          const chunk = await abortable(stream.next(), signal);
          if (chunk.done) {
            break;
          }
          const bytes = chunk.value as Buffer;
          size += bytes.byteLength;
          if (size > maximum) {
            part.file.resume();
            throw new LayoutImportRequestError(
              'SOURCE_TOO_LARGE',
              'Original must be at most 20 MiB; prepared PNG at most 8 MiB.',
              413,
            );
          }
          chunks.push(bytes);
        }
        if (part.file.truncated || size === 0) {
          throw new LayoutImportRequestError(
            'INVALID_UPLOAD',
            'Source is empty or exceeds the file limit.',
            413,
          );
        }
        files.set(part.fieldname, { bytes: Buffer.concat(chunks, size), mimetype: part.mimetype });
      } finally {
        signal.removeEventListener('abort', cancel);
      }
    }
  } finally {
    // Do not leave a multipart iterator alive after validation failure or abort.
    void parts.return?.(undefined).catch(() => undefined);
  }
  const originalSource = files.get('originalSource');
  const preparedImage = files.get('preparedImage');
  if (!originalSource || !preparedImage) {
    throw new LayoutImportRequestError(
      'MISSING_SOURCE',
      'Original source and prepared PNG are required.',
    );
  }
  return { metadata: parseImportMetadata(metadata), originalSource, preparedImage };
}

function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const cancel = (): void => {
      signal.removeEventListener('abort', cancel);
      reject(abortReason(signal));
    };
    signal.addEventListener('abort', cancel, { once: true });
    if (signal.aborted) {
      cancel();
    }
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', cancel));
  });
}

export async function runImportWorker(
  job: LayoutImportJob,
  signal: AbortSignal,
): Promise<LayoutRecognitionResult> {
  signal.throwIfAborted();
  const worker = new Worker(new URL('./layout-import.worker.js', import.meta.url), {
    workerData: job,
    resourceLimits: { maxOldGenerationSizeMb: 192 },
  });
  try {
    return await new Promise<LayoutRecognitionResult>((resolve, reject) => {
      const cancel = (): void => reject(abortReason(signal));
      signal.addEventListener('abort', cancel, { once: true });
      const clean = (): void => signal.removeEventListener('abort', cancel);
      worker.once(
        'message',
        (message: {
          result?: LayoutRecognitionResult;
          error?: { code: string; message: string };
        }) => {
          clean();
          if (message.result) {
            resolve(message.result);
          } else {
            reject(
              new LayoutImportRequestError(
                message.error?.code ?? 'ANALYSIS_FAILED',
                message.error?.message ?? 'Source analysis failed.',
                422,
              ),
            );
          }
        },
      );
      worker.once('error', () => {
        clean();
        reject(new LayoutImportRequestError('ANALYSIS_FAILED', 'Source analysis failed.', 422));
      });
      worker.once('exit', () => {
        clean();
        reject(
          new LayoutImportRequestError('ANALYSIS_STOPPED', 'Source analysis was stopped.', 422),
        );
      });
      if (signal.aborted) {
        cancel();
      }
    });
  } finally {
    await worker.terminate();
  }
}

function abortReason(signal: AbortSignal): Error {
  return signal.reason instanceof Error
    ? signal.reason
    : new LayoutImportRequestError('IMPORT_CANCELLED', 'Import was cancelled.', 408);
}
