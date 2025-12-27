// import { computeSectionPositions } from '../utils/layout/compute-section-positions.js';
// import { computeTablePositions } from '../utils/layout/compute-table-positions.js';
// import { shapeRegistry } from '../utils/shape/index.js';
// import { ShapeType } from '../models/enums/shape.enum.js';
// import { prepareMeta } from '../../utils/meta-defaults.js';

// async autoGenerateLayout(input: AutoGenerateLayoutDTO) {
//   const { eventId, config, maxSeats, actorId } = input;
//   const result = [];

//   const sectionForm = config.sectionForm ?? ShapeType.CIRCLE;
//   const tableForm   = config.tableForm   ?? ShapeType.CIRCLE;
//   const seatForm    = config.seatForm    ?? ShapeType.CIRCLE;

//   // ============================================================
//   // SIMPLE MODE
//   // ============================================================
//   if (config.simple) {
//     const { sections, tables, seats } = config.simple;

//     const totalTables = sections * tables;
//     const seatsPerTable = seats ?? Math.floor(maxSeats / totalTables);

//     // ---- SECTION POSITIONS ----
//     const sectionPositions = computeSectionPositions(
//       sections,
//       config.meta?.section,
//     );

//     for (let s = 1; s <= sections; s++) {
//       const secPos = sectionPositions[s - 1];

//       const section = await this.prisma.section.create({
//         data: {
//           eventId,
//           name: `Section ${s}`,
//           order: s,
//           meta: prepareMeta(config.meta?.section),
//           x: secPos.x,
//           y: secPos.y,
//         },
//       });

//       // ---- TABLE POSITIONS INSIDE SECTION ----

//       const tablePositions = computeTablePositions(
//         tables,
//         config.meta?.table,
//       );

//       for (let t = 1; t <= tables; t++) {
//         const tblPos = tablePositions[t - 1];

//         const table = await this.prisma.table.create({
//           data: {
//             eventId,
//             sectionId: section.id,
//             name: `Table ${s}.${t}`,
//             order: t,
//             meta: prepareMeta(config.meta?.table),
//             x: tblPos.x + secPos.x,
//             y: tblPos.y + secPos.y,
//           },
//         });

//         // ---- SEAT GENERATION BY FORM ----
//         const generator = shapeRegistry[seatForm];
//         const seatMeta = prepareMeta(config.meta?.seat);

//         const seatsGenerated = generator(table, seatsPerTable, seatMeta);

//         // add section + table offset
//         const positioned = seatsGenerated.map((seat) => ({
//           ...seat,
//           x: seat.x + tblPos.x + secPos.x,
//           y: seat.y + tblPos.y + secPos.y,
//         }));

//         await this.prisma.seat.createMany({
//           data: positioned,
//         });
//       }

//       result.push(section);
//     }

//     return result;
//   }

//   // ============================================================
//   // CUSTOM MODE (wird später ergänzt in Block 2)
//   // ============================================================
//   throw new Error('Custom mode not implemented yet in Block 1.');
// }
