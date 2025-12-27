/* eslint-disable @typescript-eslint/explicit-function-return-type */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* ---------------------------------------------------------------------------
 * Spiral / Helix Shape
 * Places seats in a spiral pattern expanding outward.
 * Useful for modern, artistic or dynamic seating arrangements.
 * ------------------------------------------------------------------------- */

import type { Table } from '../../../prisma/generated/client.js';
import type { ShapeOptions } from './type.js';

export const spiralShape = (
  table: Table,
  count: number,
  opts: ShapeOptions = {},
) => {
  const spacing = opts.spacing ?? 22;
  const angleStep = opts.angleStep ?? 28;
  const meta = opts.meta ?? null;

  const seats = [];

  let radius = opts.radius ?? 25;
  let angle = 0;

  for (let i = 0; i < count; i++) {
    seats.push({
      eventId: table.eventId,
      sectionId: table.sectionId,
      tableId: table.id,
      number: i + 1,
      label: `${i + 1}`,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      rotation: angle,
      meta,
    });

    radius += spacing * 0.5;
    angle += (angleStep * Math.PI) / 180;
  }

  return seats;
};
