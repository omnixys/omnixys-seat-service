import {
  LAYOUT_IMPORT_LIMITS,
  LayoutImportSourceError,
  type LayoutImportJob,
} from './layout-import.contract.js';
import { prepareImportRaster } from './layout-import.preprocessor.js';
import { GeometryLayoutRecognizer } from './recognizers/geometry-layout.recognizer.js';
import { LayoutRecognitionError } from './recognizers/layout-recognizer.js';
import { parentPort, workerData } from 'node:worker_threads';

try {
  const source = await prepareImportRaster(workerData as LayoutImportJob);
  const result = await new GeometryLayoutRecognizer().analyze(source);
  if (result.elements.length > LAYOUT_IMPORT_LIMITS.proposals) {
    throw new LayoutImportSourceError(
      'SOURCE_TOO_COMPLEX',
      'The source contains more than 10,000 proposals.',
    );
  }
  parentPort?.postMessage({ result });
} catch (error) {
  parentPort?.postMessage({
    error:
      error instanceof LayoutImportSourceError ||
      error instanceof LayoutRecognitionError
        ? { code: error.code, message: error.message }
        : {
            code: 'ANALYSIS_FAILED',
            message: 'The source could not be analyzed.',
          },
  });
} finally {
  parentPort?.close();
}
