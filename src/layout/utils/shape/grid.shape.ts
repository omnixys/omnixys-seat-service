/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { Table } from '../../../prisma/generated/client.js';
import type { ShapeOptions } from './type.js';

export const gridShape = (
  table: Table,
  count: number,
  opts: ShapeOptions = {},
) => {
  const spacing = opts.spacing ?? 50;
  const cols = opts.cols ?? Math.ceil(Math.sqrt(count));
  const meta = opts.meta ?? null;

  const seats = [];

  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;

    seats.push({
      eventId: table.eventId,
      sectionId: table.sectionId,
      tableId: table.id,
      number: i + 1,
      label: `${i + 1}`,
      x: col * spacing,
      y: row * spacing,
      rotation: 0,
      meta,
    });
  }

  return seats;
};
