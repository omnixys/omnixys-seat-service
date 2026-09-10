import { interpretShapes } from './layout-interpreter.js';
import type {
  LayoutRecognitionResult,
  LayoutRecognizer,
  PreparedLayoutSource,
} from './layout-recognizer.js';
import { binaryThreshold, extractShapes } from './raster-components.js';

/** Deterministic analysis of actual raster pixels. No provider, fixtures or persistence. */
export class GeometryLayoutRecognizer implements LayoutRecognizer {
  async analyze(
    source: PreparedLayoutSource,
  ): Promise<LayoutRecognitionResult> {
    const threshold = binaryThreshold(source);
    const candidates =
      threshold === null ? [] : extractShapes(source, threshold);
    return {
      recognizer: 'geometry-v1',
      ...interpretShapes(candidates, source),
      analysis: { width: source.width, height: source.height, threshold },
    };
  }
}
