export const LAYOUT_IMPORT_LIMITS = {
  originalBytes: 20 * 1024 * 1024,
  originalPixels: 24_000_000,
  preparedBytes: 8 * 1024 * 1024,
  preparedEdge: 2048,
  recognitionEdge: 1600,
  pdfPages: 100,
  proposals: 10_000,
  timeoutMs: 20_000,
  concurrency: 2,
} as const;

export interface LayoutImportMetadata {
  kind: 'IMAGE' | 'PDF' | 'CAMERA';
  width: number;
  height: number;
  pageNumber?: number;
}

export interface LayoutImportFile {
  bytes: Uint8Array;
  mimetype: string;
}

export interface LayoutImportJob {
  metadata: LayoutImportMetadata;
  originalSource: LayoutImportFile;
  preparedImage: LayoutImportFile;
}

export class LayoutImportSourceError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'LayoutImportSourceError';
  }
}

export function parseImportMetadata(value: unknown): LayoutImportMetadata {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new LayoutImportSourceError(
      'INVALID_METADATA',
      'Source metadata is required.',
    );
  }
  const metadata = value as Record<string, unknown>;
  if (
    typeof metadata.kind !== 'string' ||
    !['IMAGE', 'PDF', 'CAMERA'].includes(metadata.kind) ||
    !Number.isSafeInteger(metadata.width) ||
    !Number.isSafeInteger(metadata.height) ||
    (metadata.width as number) < 1 ||
    (metadata.height as number) < 1 ||
    (metadata.width as number) > LAYOUT_IMPORT_LIMITS.preparedEdge ||
    (metadata.height as number) > LAYOUT_IMPORT_LIMITS.preparedEdge ||
    (metadata.kind === 'PDF' &&
      (!Number.isSafeInteger(metadata.pageNumber) ||
        (metadata.pageNumber as number) < 1 ||
        (metadata.pageNumber as number) > LAYOUT_IMPORT_LIMITS.pdfPages)) ||
    (metadata.kind !== 'PDF' && metadata.pageNumber !== undefined) ||
    Object.keys(metadata).some(
      (key) => !['kind', 'width', 'height', 'pageNumber'].includes(key),
    )
  ) {
    throw new LayoutImportSourceError(
      'INVALID_METADATA',
      'Source type, dimensions or page are invalid.',
    );
  }
  return metadata as unknown as LayoutImportMetadata;
}
