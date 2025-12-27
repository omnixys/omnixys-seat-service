/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { Table } from '../../../prisma/generated/client.js';
import type { ShapeOptions } from './type.js';

export const scatterShape = (
  table: Table,
  count: number,
  opts: ShapeOptions = {},
) => {
  const area = opts.area ?? 250;
  const meta = opts.meta ?? null;

  const seats = [];

  for (let i = 0; i < count; i++) {
    seats.push({
      eventId: table.eventId,
      sectionId: table.sectionId,
      tableId: table.id,
      number: i + 1,
      label: `${i + 1}`,
      x: (Math.random() - 0.5) * area,
      y: (Math.random() - 0.5) * area,
      rotation: Math.random() * 360,
      meta,
    });
  }

  return seats;
};
