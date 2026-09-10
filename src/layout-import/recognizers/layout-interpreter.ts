import {
  LayoutRecognitionError,
  type DetectedLayoutElement,
  type LayoutRecognitionWarning,
  type PreparedLayoutSource,
} from './layout-recognizer.js';
import type { ShapeCandidate } from './raster-components.js';

const area = (shape: ShapeCandidate): number => shape.width * shape.height;
const diameter = (shape: ShapeCandidate): number =>
  Math.max(shape.width, shape.height);

function contains(outer: ShapeCandidate, inner: ShapeCandidate): boolean {
  const dx = Math.abs(outer.x - inner.x) + inner.width / 2;
  const dy = Math.abs(outer.y - inner.y) + inner.height / 2;
  if (outer.shape === 'ROUND' || outer.shape === 'OVAL') {
    return (dx / (outer.width / 2)) ** 2 + (dy / (outer.height / 2)) ** 2 < 1;
  }
  return dx < outer.width / 2 && dy < outer.height / 2;
}

function similarSize(a: ShapeCandidate, b: ShapeCandidate): boolean {
  return (
    Math.max(a.width / b.width, b.width / a.width) <= 1.35 &&
    Math.max(a.height / b.height, b.height / a.height) <= 1.35
  );
}

/** Distance to the body along its radial direction; candidates inside are excluded. */
function bodyGap(table: ShapeCandidate, seat: ShapeCandidate): number {
  const dx = Math.abs(table.x - seat.x);
  const dy = Math.abs(table.y - seat.y);
  if (table.shape === 'ROUND' || table.shape === 'OVAL') {
    const radius = Math.hypot(dx / (table.width / 2), dy / (table.height / 2));
    return radius <= 1 ? Infinity : Math.hypot(dx, dy) * (1 - 1 / radius);
  }
  if (dx <= table.width / 2 && dy <= table.height / 2) {
    return Infinity;
  }
  return Math.hypot(
    Math.max(0, dx - table.width / 2),
    Math.max(0, dy - table.height / 2),
  );
}

/** Geometry suggests semantics. Ambiguous relationships never become definite counts. */
export function interpretShapes(
  candidates: readonly ShapeCandidate[],
  source: PreparedLayoutSource,
): {
  elements: DetectedLayoutElement[];
  warnings: LayoutRecognitionWarning[];
} {
  if (candidates.length ** 2 > 2_000_000) {
    throw new LayoutRecognitionError(
      'SOURCE_TOO_COMPLEX',
      'Too many objects to compare safely. Crop the source into smaller areas. No objects were imported.',
    );
  }
  const warnings: LayoutRecognitionWarning[] = [
    {
      code: 'GEOMETRY_ONLY',
      message:
        'Geometric suggestions only: labels, seat numbers, occupancy and assignments are not recognized. Review before importing.',
    },
  ];
  const fitted = candidates.filter(
    (candidate) => candidate.shape !== undefined,
  );
  const sections = fitted.filter((candidate) => {
    const children = fitted.filter(
      (other) => other !== candidate && contains(candidate, other),
    );
    return (
      children.length >= 3 &&
      children.some((child) => area(candidate) >= area(child) * 4) &&
      area(candidate) >= source.width * source.height * 0.08
    );
  });
  const sectionIds = new Set(sections.map((section) => section.id));
  const bodies = fitted.filter((candidate) => !sectionIds.has(candidate.id));
  const families = bodies.map((candidate) => ({
    members: bodies.filter((other) => similarSize(candidate, other)),
    area: area(candidate),
  }));
  families.sort(
    (a, b) => b.members.length - a.members.length || a.area - b.area,
  );
  const repeated = families[0]?.members;
  const seats = repeated && repeated.length >= 3 ? repeated : [];
  const seatIds = new Set(seats.map((seat) => seat.id));
  const tables = bodies.filter(
    (body) =>
      !seatIds.has(body.id) &&
      seats.filter(
        (seat) =>
          area(body) >= area(seat) * 4 &&
          bodyGap(body, seat) <= diameter(seat) * 2.5,
      ).length >= 3,
  );
  const tableIds = new Set(tables.map((table) => table.id));
  const seatCounts = new Map(tables.map((table) => [table.id, 0]));
  const elements = candidates.map((candidate): DetectedLayoutElement => {
    const kind = sectionIds.has(candidate.id)
      ? 'SECTION'
      : tableIds.has(candidate.id)
        ? 'TABLE'
        : seatIds.has(candidate.id)
          ? 'SEAT'
          : 'UNKNOWN';
    const geometry = {
      x: candidate.x / source.width,
      y: candidate.y / source.height,
      width: candidate.width / source.width,
      height: candidate.height / source.height,
      rotation: 0,
    };
    const enclosing = sections
      .filter(
        (section) =>
          section.id !== candidate.id && contains(section, candidate),
      )
      .sort((a, b) => area(a) - area(b));
    const element: DetectedLayoutElement = {
      id: candidate.id,
      kind,
      geometry,
      sourceBounds: { ...geometry },
      shape:
        kind === 'SEAT' && candidate.shape === 'ROUND'
          ? 'CIRCLE'
          : candidate.shape,
      parentCandidateId: enclosing[0]?.id,
      confidence: {
        geometry: candidate.quality,
        classification: kind === 'UNKNOWN' ? 0.35 : 0.8,
      },
      needsReview: kind === 'UNKNOWN',
    };
    if (kind === 'SEAT') {
      const nearby = tables
        .map((table) => ({ table, gap: bodyGap(table, candidate) }))
        .filter(
          ({ table, gap }) =>
            area(table) >= area(candidate) * 4 &&
            gap <= diameter(candidate) * 2.5,
        )
        .sort((a, b) => a.gap - b.gap);
      const closest = nearby[0];
      const second = nearby[1];
      if (
        closest &&
        second &&
        (second.gap - closest.gap < diameter(candidate) * 0.5 ||
          second.gap <= closest.gap * 1.25)
      ) {
        element.needsReview = true;
        element.confidence.relationship = 0.4;
        warnings.push({
          code: 'AMBIGUOUS_PARENT',
          message:
            'This seat is close to more than one table. Confirm its table or keep it free.',
          elementIds: [candidate.id, closest.table.id, second.table.id],
        });
      } else if (closest) {
        element.parentCandidateId = closest.table.id;
        element.confidence.relationship = 0.85;
        seatCounts.set(
          closest.table.id,
          (seatCounts.get(closest.table.id) ?? 0) + 1,
        );
      }
    }
    if (kind === 'UNKNOWN') {
      warnings.push({
        code: 'UNKNOWN_OBJECT',
        message:
          'The type of this contour is uncertain. Classify or remove it during review.',
        elementIds: [candidate.id],
      });
    }
    return element;
  });
  for (const element of elements) {
    if (element.kind === 'TABLE') {
      element.seatCount = seatCounts.get(element.id) ?? 0;
    }
  }
  if (elements.length === 0) {
    warnings.push({
      code: 'NO_OBJECTS',
      message:
        'No supported objects detected. You can use the image as a background and build the layout manually.',
    });
  }
  return { elements, warnings };
}
