/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* ---------------------------------------------------------------------------
 * VIP Cluster Shape
 * Arranges chairs in a diamond/cluster pattern around the center.
 * Useful for VIP areas or special highlight seating groups.
 * ------------------------------------------------------------------------- */
import type { Table } from '../../../prisma/generated/client.js';
import type { ShapeOptions } from './type.js';

export const vipShape = (
  table: Table,
  count: number,
  opts: ShapeOptions = {},
) => {
  const spacing = opts.spacing ?? 55;
  const meta = opts.meta ?? null;

  const seats = [];

  seats.push({
    eventId: table.eventId,
    sectionId: table.sectionId,
    tableId: table.id,
    number: 1,
    label: '1',
    x: 0,
    y: 0,
    rotation: 0,
    meta,
  });

  let index = 2;
  let layer = 1;

  while (index <= count) {
    const positions = [
      { x: 0, y: -layer * spacing },
      { x: layer * spacing, y: 0 },
      { x: 0, y: layer * spacing },
      { x: -layer * spacing, y: 0 },
    ];

    for (const pos of positions) {
      if (index > count) {
        break;
      }

      seats.push({
        eventId: table.eventId,
        sectionId: table.sectionId,
        tableId: table.id,
        number: index,
        label: `${index}`,
        x: pos.x,
        y: pos.y,
        rotation: 0,
        meta,
      });

      index++;
    }

    layer++;
  }

  return seats;
};
