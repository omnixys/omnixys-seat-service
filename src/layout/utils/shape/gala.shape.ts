/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import type { Table } from '../../../prisma/generated/client.js';
import type { ShapeOptions } from './type.js';

export const galaShape = (
  table: Table,
  count: number,
  opts: ShapeOptions = {},
) => {
  const radius = opts.radius ?? 140;
  const meta = opts.meta ?? null;

  const seats = [];

  for (let i = 0; i < count; i++) {
    const angle = Math.PI * (i / (count - 1));

    seats.push({
      eventId: table.eventId,
      sectionId: table.sectionId,
      tableId: table.id,
      number: i + 1,
      label: `${i + 1}`,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      rotation: angle * (180 / Math.PI),
      meta,
    });
  }

  return seats;
};
