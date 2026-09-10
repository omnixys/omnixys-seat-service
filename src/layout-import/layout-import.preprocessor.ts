import {
  LAYOUT_IMPORT_LIMITS,
  LayoutImportSourceError,
  parseImportMetadata,
  type LayoutImportJob,
} from './layout-import.contract.js';
import type { PreparedLayoutSource } from './recognizers/layout-recognizer.js';
import sharp from 'sharp';

const IMAGE_FORMATS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpeg',
  'image/webp': 'webp',
};

export async function prepareImportRaster(
  job: LayoutImportJob,
): Promise<PreparedLayoutSource> {
  const metadata = parseImportMetadata(job.metadata);
  if (
    job.originalSource.bytes.byteLength === 0 ||
    job.originalSource.bytes.byteLength > LAYOUT_IMPORT_LIMITS.originalBytes ||
    job.preparedImage.bytes.byteLength === 0 ||
    job.preparedImage.bytes.byteLength > LAYOUT_IMPORT_LIMITS.preparedBytes ||
    job.preparedImage.mimetype !== 'image/png'
  ) {
    throw new LayoutImportSourceError(
      'INVALID_SOURCE',
      'Source is empty, too large or not a prepared PNG.',
    );
  }
  if (metadata.kind === 'PDF') {
    if (job.originalSource.mimetype !== 'application/pdf') {
      throw new LayoutImportSourceError(
        'INVALID_PDF',
        'Original source must be a PDF.',
      );
    }
    await validateImportPdf(job.originalSource.bytes, metadata.pageNumber ?? 0);
  } else {
    const expectedFormat = IMAGE_FORMATS[job.originalSource.mimetype];
    if (!expectedFormat) {
      throw new LayoutImportSourceError(
        'INVALID_IMAGE',
        'Use PNG, JPEG or WebP.',
      );
    }
    const original = sharp(job.originalSource.bytes, {
      failOn: 'error',
      limitInputPixels: LAYOUT_IMPORT_LIMITS.originalPixels,
    });
    try {
      const info = await original.metadata();
      if (
        info.format !== expectedFormat ||
        (info.pages ?? 1) !== 1 ||
        !validDimensions(info.width, info.height)
      ) {
        throw new LayoutImportSourceError(
          'INVALID_IMAGE',
          'Image format or dimensions are invalid.',
        );
      }
      // Decode the original as well: metadata alone does not detect truncated pixels.
      await original.rotate().resize(1, 1).raw().toBuffer();
    } catch (error) {
      if (error instanceof LayoutImportSourceError) {
        throw error;
      }
      throw new LayoutImportSourceError(
        'INVALID_IMAGE',
        'The image is corrupt or exceeds 24 megapixels.',
      );
    } finally {
      original.destroy();
    }
  }

  const prepared = sharp(job.preparedImage.bytes, {
    failOn: 'error',
    limitInputPixels: LAYOUT_IMPORT_LIMITS.preparedEdge ** 2,
  });
  try {
    const info = await prepared.metadata();
    if (
      info.format !== 'png' ||
      (info.pages ?? 1) !== 1 ||
      info.width !== metadata.width ||
      info.height !== metadata.height ||
      (info.orientation ?? 1) !== 1
    ) {
      throw new LayoutImportSourceError(
        'INVALID_PREPARED_IMAGE',
        'Prepared PNG dimensions or orientation do not match.',
      );
    }
    const { data, info: raster } = await prepared
      .flatten({ background: '#ffffff' })
      .resize({
        width: LAYOUT_IMPORT_LIMITS.recognitionEdge,
        height: LAYOUT_IMPORT_LIMITS.recognitionEdge,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });
    return { data, width: raster.width, height: raster.height, channels: 1 };
  } catch (error) {
    if (error instanceof LayoutImportSourceError) {
      throw error;
    }
    throw new LayoutImportSourceError(
      'INVALID_PREPARED_IMAGE',
      'Prepared PNG is corrupt or too large.',
    );
  } finally {
    prepared.destroy();
  }
}

function validDimensions(
  width: number | undefined,
  height: number | undefined,
): boolean {
  return (
    !!width &&
    !!height &&
    width > 0 &&
    height > 0 &&
    width * height <= LAYOUT_IMPORT_LIMITS.originalPixels
  );
}

export async function validateImportPdf(
  bytes: Uint8Array,
  pageNumber: number,
): Promise<void> {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = getDocument({
    data: Uint8Array.from(bytes),
    useSystemFonts: false,
    disableFontFace: true,
    useWorkerFetch: false,
    enableXfa: false,
    verbosity: 0,
  });
  try {
    const pdf = await task.promise;
    if ((await pdf.getPermissions()) !== null) {
      throw new LayoutImportSourceError(
        'ENCRYPTED_PDF',
        'Encrypted PDFs are not supported.',
      );
    }
    if (
      !Number.isSafeInteger(pageNumber) ||
      pdf.numPages < 1 ||
      pdf.numPages > LAYOUT_IMPORT_LIMITS.pdfPages ||
      pageNumber < 1 ||
      pageNumber > pdf.numPages
    ) {
      throw new LayoutImportSourceError(
        'INVALID_PDF_PAGE',
        'PDF must contain at most 100 pages and the selected page must exist.',
      );
    }
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    if (
      !Number.isFinite(viewport.width) ||
      !Number.isFinite(viewport.height) ||
      !validDimensions(viewport.width, viewport.height)
    ) {
      throw new LayoutImportSourceError(
        'INVALID_PDF_DIMENSIONS',
        'Selected PDF page has invalid dimensions.',
      );
    }
    page.cleanup();
  } catch (error) {
    if (error instanceof LayoutImportSourceError) {
      throw error;
    }
    if (error instanceof Error && error.name === 'PasswordException') {
      throw new LayoutImportSourceError(
        'ENCRYPTED_PDF',
        'Encrypted PDFs are not supported.',
      );
    }
    throw new LayoutImportSourceError('INVALID_PDF', 'The PDF cannot be read.');
  } finally {
    await task.destroy();
  }
}
