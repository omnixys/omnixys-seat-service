/** An oriented, flattened grayscale raster. Source bytes are never part of a result. */
export interface PreparedLayoutSource {
  readonly data: Uint8Array;
  readonly width: number;
  readonly height: number;
  readonly channels: 1;
}

export interface DetectedGeometry {
  /** Centers and extents in normalized source space; rotations are clockwise degrees. */
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export type DetectedElementKind =
  'SECTION' | 'TABLE' | 'SEAT' | 'STAGE' | 'AISLE' | 'LABEL' | 'UNKNOWN';
export type DetectedShape = 'ROUND' | 'RECTANGLE' | 'OVAL' | 'CIRCLE';

export interface DetectedLayoutElement {
  /** Ephemeral draft identifier, never a domain entity identifier. */
  id: string;
  kind: DetectedElementKind;
  geometry: DetectedGeometry;
  sourceBounds: DetectedGeometry;
  shape?: DetectedShape;
  parentCandidateId?: string;
  seatCount?: number;
  needsReview: boolean;
  /** Heuristic quality indicators, not calibrated probabilities. */
  confidence: {
    geometry: number;
    classification?: number;
    relationship?: number;
  };
}

export interface LayoutRecognitionWarning {
  code: 'GEOMETRY_ONLY' | 'UNKNOWN_OBJECT' | 'AMBIGUOUS_PARENT' | 'NO_OBJECTS';
  message: string;
  elementIds?: string[];
}

export interface LayoutRecognitionResult {
  recognizer: 'geometry-v1';
  elements: DetectedLayoutElement[];
  warnings: LayoutRecognitionWarning[];
  analysis: { width: number; height: number; threshold: number | null };
}

export interface LayoutRecognizer {
  analyze(source: PreparedLayoutSource): Promise<LayoutRecognitionResult>;
}

export class LayoutRecognitionError extends Error {
  constructor(
    readonly code:
      'INVALID_RASTER' | 'SOURCE_TOO_COMPLEX' | 'UNSUPPORTED_CONTRAST',
    message: string,
  ) {
    super(message);
    this.name = 'LayoutRecognitionError';
  }
}
