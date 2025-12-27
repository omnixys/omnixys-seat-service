/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { LoggerPlusService } from '../../logger/logger-plus.service.js';
import { Prisma } from '../../prisma/generated/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  CloneSectionInput,
  DuplicateTableInput,
  GenerateSeatsCircleInput,
  GenerateSeatsGridInput,
} from '../models/dto/tmp.js';
import { AssignSeatInput } from '../models/inputs/assign-seat.input.js';
import { CreateSeatInput } from '../models/inputs/create-seat.input.js';
import { CreateSectionInput } from '../models/inputs/create-section.input.js';
import { CreateTableInput } from '../models/inputs/create-table.input.js';
import { LogChangeInput } from '../models/inputs/log-change.input.js';
import { MoveSeatInput } from '../models/inputs/move-seat.input.js';
import { SaveLayoutVersionInput } from '../models/inputs/save-layout-version.input.js';
import { SeatingConfigInput } from '../models/inputs/seating-config.input.js';
import { UpdateSeatInput } from '../models/inputs/update-seat.input.js';
import { UpdateSectionInput } from '../models/inputs/update-section.input.js';
import { UpdateTableInput } from '../models/inputs/update-table.input.js';
import { shapeRegistry } from '../utils/seatGenerators.js';
import { Injectable, NotFoundException } from '@nestjs/common';
import { JsonValue } from '@prisma/client/runtime/client.js';

@Injectable()
export class SeatWriteService {
  private readonly logger;

  constructor(
    private readonly prisma: PrismaService,
    private readonly loggerService: LoggerPlusService,
  ) {
    this.logger = this.loggerService.getLogger(SeatWriteService.name);
  }

  // ---------------------------------------------------------------------------
  // UTILS
  // ---------------------------------------------------------------------------

  /** Compute the next available order index within a collection */
  private async nextOrder(model: any, where: any): Promise<number> {
    const max = await model.aggregate({
      where,
      _max: { order: true },
    });

    return (max._max.order ?? 0) + 1;
  }

  /** Write an entry to the LayoutChangeLog */
  async logChange(input: LogChangeInput) {
    return this.prisma.layoutChangeLog.create({
      data: {
        eventId: input.eventId,
        actorId: input.actorId ?? null,
        type: input.type,
        payload: input.payload,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // SECTION MUTATIONS
  // ---------------------------------------------------------------------------

  async createSection(input: CreateSectionInput, actorId: string) {
    const order = await this.nextOrder(this.prisma.section, {
      eventId: input.eventId,
    });

    const created = await this.prisma.section.create({
      data: {
        eventId: input.eventId,
        name: input.name,
        order,
        capacity: input.capacity ?? null,
        meta: input.meta ?? null,
      },
    });

    await this.logChange({
      eventId: input.eventId,
      actorId,
      type: 'SECTION_CREATE',
      payload: created,
    });

    return created;
  }

  async updateSection(input: UpdateSectionInput, actorId: string) {
    const exists = await this.prisma.section.findUnique({
      where: { id: input.id },
    });
    if (!exists) {
      throw new NotFoundException('Section not found.');
    }

    const updated = await this.prisma.section.update({
      where: { id: input.id },
      data: {
        name: input.name ?? undefined,
        order: input.order ?? undefined,
        capacity: input.capacity ?? undefined,
        meta: input.meta ?? undefined,
      },
    });

    await this.logChange({
      eventId: exists.eventId,
      actorId,
      type: 'SECTION_UPDATE',
      payload: input,
    });

    return updated;
  }

  async deleteSection(sectionId: string, actorId: string) {
    const exists = await this.prisma.section.findUnique({
      where: { id: sectionId },
    });
    if (!exists) {
      throw new NotFoundException('Section not found.');
    }

    await this.prisma.section.delete({
      where: { id: sectionId },
    });

    await this.logChange({
      eventId: exists.eventId,
      actorId,
      type: 'SECTION_DELETE',
      payload: { id: sectionId },
    });

    return true;
  }

  // ---------------------------------------------------------------------------
  // TABLE MUTATIONS
  // ---------------------------------------------------------------------------

  async createTable(input: CreateTableInput, actorId: string) {
    const order = await this.nextOrder(this.prisma.table, {
      sectionId: input.sectionId,
    });

    const created = await this.prisma.table.create({
      data: {
        eventId: input.eventId,
        sectionId: input.sectionId,
        name: input.name,
        order,
        capacity: input.capacity ?? null,
        meta: input.meta ?? null,
      },
    });

    await this.logChange({
      eventId: input.eventId,
      actorId,
      type: 'TABLE_CREATE',
      payload: created,
    });

    return created;
  }

  async updateTable(input: UpdateTableInput, actorId: string) {
    const exists = await this.prisma.table.findUnique({
      where: { id: input.id },
    });
    if (!exists) {
      throw new NotFoundException('Table not found.');
    }

    const updated = await this.prisma.table.update({
      where: { id: input.id },
      data: {
        name: input.name ?? undefined,
        order: input.order ?? undefined,
        capacity: input.capacity ?? undefined,
        meta: input.meta ?? undefined,
      },
    });

    await this.logChange({
      eventId: exists.eventId,
      actorId,
      type: 'TABLE_UPDATE',
      payload: input,
    });

    return updated;
  }

  async deleteTable(tableId: string, actorId: string) {
    const exists = await this.prisma.table.findUnique({
      where: { id: tableId },
    });
    if (!exists) {
      throw new NotFoundException('Table not found.');
    }

    await this.prisma.table.delete({
      where: { id: tableId },
    });

    await this.logChange({
      eventId: exists.eventId,
      actorId,
      type: 'TABLE_DELETE',
      payload: { id: tableId },
    });

    return true;
  }

  // ---------------------------------------------------------------------------
  // SEAT MUTATIONS
  // ---------------------------------------------------------------------------

  async createSeat(input: CreateSeatInput, actorId: string) {
    const created = await this.prisma.seat.create({
      data: {
        eventId: input.eventId,
        sectionId: input.sectionId,
        tableId: input.tableId ?? null,
        number: input.number ?? null,
        label: input.label ?? null,
        note: input.note ?? null,
        x: input.x ?? null,
        y: input.y ?? null,
        rotation: input.rotation ?? null,
        seatType: input.seatType ?? null,
      },
    });

    await this.logChange({
      eventId: input.eventId,
      actorId,
      type: 'SEAT_CREATE',
      payload: created,
    });

    return created;
  }

  async updateSeat(input: UpdateSeatInput, actorId: string) {
    const exists = await this.prisma.seat.findUnique({
      where: { id: input.id },
    });
    if (!exists) {
      throw new NotFoundException('Seat not found.');
    }

    const updated = await this.prisma.seat.update({
      where: { id: input.id },
      data: {
        label: input.label ?? undefined,
        note: input.note ?? undefined,
        number: input.number ?? undefined,
        seatType: input.seatType ?? undefined,
        x: input.x ?? undefined,
        y: input.y ?? undefined,
        rotation: input.rotation ?? undefined,
      },
    });

    await this.logChange({
      eventId: exists.eventId,
      actorId,
      type: 'SEAT_UPDATE',
      payload: input,
    });

    return updated;
  }

  async moveSeat(input: MoveSeatInput, actorId: string) {
    const exists = await this.prisma.seat.findUnique({
      where: { id: input.id },
    });
    if (!exists) {
      throw new NotFoundException('Seat not found.');
    }

    const updated = await this.prisma.seat.update({
      where: { id: input.id },
      data: {
        x: input.x,
        y: input.y,
        rotation: input.rotation ?? exists.rotation,
      },
    });

    await this.logChange({
      eventId: exists.eventId,
      actorId,
      type: 'SEAT_MOVE',
      payload: input,
    });

    return updated;
  }

  async deleteSeat(seatId: string, actorId: string) {
    const exists = await this.prisma.seat.findUnique({
      where: { id: seatId },
    });
    if (!exists) {
      throw new NotFoundException('Seat not found.');
    }

    await this.prisma.seat.delete({
      where: { id: seatId },
    });

    await this.logChange({
      eventId: exists.eventId,
      actorId,
      type: 'SEAT_DELETE',
      payload: { id: seatId },
    });

    return true;
  }

  async assignSeat(input: AssignSeatInput, actorId: string) {
    const seat = await this.prisma.seat.findUnique({
      where: { id: input.seatId },
    });
    if (!seat) {
      throw new NotFoundException('Seat not found.');
    }

    const updated = await this.prisma.seat.update({
      where: { id: input.seatId },
      data: {
        guestId: input.guestId,
        status: 'ASSIGNED',
      },
    });

    await this.prisma.seatAssignmentLog.create({
      data: {
        eventId: seat.eventId,
        seatId: seat.id,
        guestId: input.guestId,
        action: 'ASSIGNED',
        data: {},
      },
    });

    await this.logChange({
      eventId: seat.eventId,
      actorId,
      type: 'SEAT_ASSIGNED',
      payload: input,
    });

    return updated;
  }

  async unassignSeat(seatId: string, actorId: string) {
    const seat = await this.prisma.seat.findUnique({
      where: { id: seatId },
    });
    if (!seat) {
      throw new NotFoundException('Seat not found.');
    }

    const updated = await this.prisma.seat.update({
      where: { id: seatId },
      data: {
        guestId: null,
        status: 'AVAILABLE',
      },
    });

    await this.prisma.seatAssignmentLog.create({
      data: {
        eventId: seat.eventId,
        seatId: seat.id,
        guestId: null,
        action: 'UNASSIGNED',
        data: {},
      },
    });

    await this.logChange({
      eventId: seat.eventId,
      actorId,
      type: 'SEAT_UNASSIGNED',
      payload: { seatId },
    });

    return updated;
  }

  // ---------------------------------------------------------------------------
  // LAYOUT VERSIONING
  // ---------------------------------------------------------------------------

  async saveLayoutVersion(input: SaveLayoutVersionInput, actorId: string) {
    const created = await this.prisma.layoutVersion.create({
      data: {
        eventId: input.eventId,
        version: input.version,
        label: input.label ?? null,
        data: input.data,
      },
    });

    await this.logChange({
      eventId: input.eventId,
      actorId,
      type: 'LAYOUT_VERSION_SAVED',
      payload: created,
    });

    return created;
  }

  async generateSeatsCircle(input: GenerateSeatsCircleInput, actorId: string) {
    const table = await this.prisma.table.findUnique({
      where: { id: input.tableId },
    });

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    const radius = input.radius ?? 120;
    const count = input.count;

    const angleStep = (2 * Math.PI) / count;

    const seats = [];

    for (let i = 0; i < count; i++) {
      const angle = i * angleStep;

      seats.push({
        eventId: table.eventId,
        sectionId: table.sectionId,
        tableId: table.id,
        label: `${i + 1}`,
        number: i + 1,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        rotation: (angle * 180) / Math.PI + 90,
      });
    }

    await this.prisma.seat.createMany({ data: seats });

    await this.logChange({
      actorId,
      eventId: table.eventId,
      type: 'SEATS_GENERATED_CIRCLE',
      payload: { tableId: table.id, count },
    });

    return true;
  }

  async generateSeatsGrid(input: GenerateSeatsGridInput, actorId: string) {
    const spacing = input.spacing ?? 50;
    const seats = [];

    for (let r = 0; r < input.rows; r++) {
      for (let c = 0; c < input.cols; c++) {
        seats.push({
          eventId: input.eventId,
          sectionId: input.sectionId,
          tableId: null,
          number: null,
          label: null,
          x: c * spacing,
          y: r * spacing,
          rotation: 0,
        });
      }
    }

    await this.prisma.seat.createMany({ data: seats });

    await this.logChange({
      actorId,
      eventId: input.eventId,
      type: 'SEATS_GENERATED_GRID',
      payload: { rows: input.rows, cols: input.cols },
    });

    return seats.length;
  }

  async duplicateTable(input: DuplicateTableInput, actorId: string) {
    const table = await this.prisma.table.findUnique({
      where: { id: input.tableId },
      include: { seats: true },
    });

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    const clone = await this.prisma.table.create({
      data: {
        eventId: table.eventId,
        sectionId: table.sectionId,
        name: `${table.name}_copy`,
        order: table.order + 1,
        capacity: table.capacity,
        meta: table.meta,
      },
    });

    const clonedSeats = table.seats.map((s) => ({
      eventId: table.eventId,
      sectionId: table.sectionId,
      tableId: clone.id,
      label: s.label,
      number: s.number,
      x: (s.x ?? 0) + input.offsetX,
      y: (s.y ?? 0) + input.offsetY,
      rotation: s.rotation,
      seatType: s.seatType,
    }));

    await this.prisma.seat.createMany({ data: clonedSeats });

    await this.logChange({
      actorId,
      eventId: table.eventId,
      type: 'TABLE_DUPLICATED',
      payload: { original: table.id, clone: clone.id },
    });

    return clone;
  }

  async cloneSection(input: CloneSectionInput, actorId: string) {
    const section = await this.prisma.section.findUnique({
      where: { id: input.sectionId },
      include: {
        tables: { include: { seats: true } },
        seats: true,
      },
    });

    if (!section) {
      throw new NotFoundException('Section not found');
    }

    const newSection = await this.prisma.section.create({
      data: {
        eventId: section.eventId,
        name: input.newName,
        order: section.order + 1,
        capacity: section.capacity,
        meta: section.meta ?? Prisma.JsonNull,
      },
    });

    // Clone tables
    for (const table of section.tables) {
      const newTable = await this.prisma.table.create({
        data: {
          eventId: table.eventId,
          sectionId: newSection.id,
          name: `${table.name}_copy`,
          order: table.order,
          capacity: table.capacity,
          meta: section.meta ?? Prisma.JsonNull,
        },
      });

      const tableSeats = table.seats.map((s) => ({
        eventId: s.eventId,
        sectionId: newSection.id,
        tableId: newTable.id,
        label: s.label,
        number: s.number,
        x: s.x,
        y: s.y,
        rotation: s.rotation,
        seatType: s.seatType,
      }));

      await this.prisma.seat.createMany({ data: tableSeats });
    }

    // Clone seats directly under section
    if (section.seats?.length) {
      await this.prisma.seat.createMany({
        data: section.seats.map((s) => ({
          eventId: s.eventId,
          sectionId: newSection.id,
          tableId: null,
          label: s.label,
          number: s.number,
          x: s.x,
          y: s.y,
          rotation: s.rotation,
        })),
      });
    }

    await this.logChange({
      actorId,
      eventId: section.eventId,
      type: 'SECTION_CLONED',
      payload: { from: section.id, to: newSection.id },
    });

    return newSection;
  }

  async autoGenerateLayout(
    eventId: string,
    config: SeatingConfigInput,
    maxSeats: number,
    actorId: string,
  ) {
    const generatedSections = [];

    // ----------------------------------------------------------
    // 1) SIMPLE MODE
    // ----------------------------------------------------------
    if (config.simple) {
      const { sections, tables, seats } = config.simple;
      const totalTables = sections * tables;

      // auto seats distribution if seats not provided
      const seatsPerTable = seats ?? Math.floor(maxSeats / totalTables);

      for (let s = 1; s <= sections; s++) {
        const section = await this.prisma.section.create({
          data: {
            eventId,
            name: `Section ${s}`,
            order: s,
            meta: {},
          },
        });

        for (let t = 1; t <= tables; t++) {
          const table = await this.prisma.table.create({
            data: {
              eventId,
              sectionId: section.id,
              name: `Table ${s}.${t}`,
              order: s,
              meta: {},
            },
          });

          await this.generateSeatsByForm(table.id, seatsPerTable, config.form ?? 'circle');
        }

        generatedSections.push(section);
      }

      return generatedSections;
    }

    // ----------------------------------------------------------
    // 2) CUSTOM MODE
    // ----------------------------------------------------------
    if (config.sections && config.sections.length > 0) {
      // calculate total table count
      const totalTables = config.sections.reduce((acc, s) => acc + s.tables, 0);

      // auto seat count if not provided in custom tables
      const autoSeats = Math.floor(maxSeats / totalTables);

      const tableSeatMap = new Map(config.tables?.map((t) => [t.name, t.seats ?? autoSeats]) ?? []);

      for (const sec of config.sections) {
        const section = await this.prisma.section.create({
          data: {
            eventId,
            name: sec.name,
            order: 0,
            meta: {},
          },
        });

        for (let i = 1; i <= sec.tables; i++) {
          const tableName = `${sec.name}_${i}`;
          const seatCount = tableSeatMap.get(tableName) ?? autoSeats;

          const table = await this.prisma.table.create({
            data: {
              eventId,
              sectionId: section.id,
              name: tableName,
              order: 0,
              meta: {},
            },
          });

          await this.generateSeatsByForm(table.id, seatCount, config.form ?? 'circle');
        }

        generatedSections.push(section);
      }

      return generatedSections;
    }

    throw new Error('Invalid seating configuration');
  }

  async generateCircle(tableId: string, count: number, radius = 120) {
    const angleStep = (2 * Math.PI) / count;
    const seats = [];

    for (let i = 0; i < count; i++) {
      const angle = i * angleStep;

      seats.push({
        tableId,
        eventId: '2',
        sectionId: 's',
        label: `${i + 1}`,
        number: i + 1,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        rotation: (angle * 180) / Math.PI + 90,
      });
    }

    await this.prisma.seat.createMany({ data: seats });
  }

  async generateGala(tableId: string, count: number, radius = 140) {
    const seats = [];

    for (let i = 0; i < count; i++) {
      const angle = Math.PI * (i / (count - 1)); // 0..180°
      seats.push({
        tableId,
        eventId: '2',
        sectionId: 's',
        label: `${i + 1}`,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        rotation: angle * (180 / Math.PI),
      });
    }

    await this.prisma.seat.createMany({ data: seats });
  }

  async generateGrid(tableId: any, count: number, cols = 10, spacing = 50) {
    const seats = [];

    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      seats.push({
        tableId,
        eventId: '2',
        sectionId: 's',
        label: `${i + 1}`,
        x: col * spacing,
        y: row * spacing,
        rotation: 0,
      });
    }

    await this.prisma.seat.createMany({ data: seats });
  }

  async generateUForm(tableId: any, count: number, width = 300, height = 200, spacing = 50) {
    const seats = [];
    let index = 1;

    // bottom row
    for (let x = -width / 2; x <= width / 2; x += spacing) {
      if (index <= count) {
        seats.push({ tableId, label: `${index++}`, x, y: height / 2 });
      }
    }

    // left side
    for (let y = height / 2; y >= -height / 2; y -= spacing) {
      if (index <= count) {
        seats.push({ tableId, label: `${index++}`, x: -width / 2, y });
      }
    }

    // right side
    for (let y = height / 2; y >= -height / 2; y -= spacing) {
      if (index <= count) {
        seats.push({ tableId, label: `${index++}`, x: width / 2, y });
      }
    }
  }

  async generateHorseshoe(tableId: any, count: number, radius = 160) {
    const seats = [];
    const angleStart = Math.PI * 0.2;
    const angleEnd = Math.PI * 1.8;
    const angleStep = (angleEnd - angleStart) / (count - 1);

    for (let i = 0; i < count; i++) {
      const angle = angleStart + i * angleStep;
      seats.push({
        tableId,
        eventId: '2',
        sectionId: 's',
        label: `${i + 1}`,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        rotation: angle * (180 / Math.PI),
      });
    }

    await this.prisma.seat.createMany({ data: seats });
  }

  async generateScatter(tableId: any, count: number, area = 250) {
    const seats = [];

    for (let i = 0; i < count; i++) {
      seats.push({
        tableId,
        eventId: '2',
        sectionId: 's',
        label: `${i + 1}`,
        x: (Math.random() - 0.5) * area,
        y: (Math.random() - 0.5) * area,
        rotation: Math.random() * 360,
      });
    }

    await this.prisma.seat.createMany({ data: seats });
  }

  private async createSeatsBulk(
    seats: string | any[],
    eventId: any,
    actorId: any,
    type: string,
    payload?: { tableId: any; count: any },
  ) {
    await this.prisma.seat.createMany({ data: seats });

    await this.prisma.layoutChangeLog.create({
      data: {
        eventId,
        actorId,
        type,
        payload: payload ?? seats.length,
      },
    });

    return true;
  }

  private async generateSeatsByForm(
    table:
      | string
      | {
          id: string;
          eventId: string;
          name: string;
          order: number;
          capacity: number | null;
          meta: JsonValue;
          createdAt: Date;
          updatedAt: Date;
          sectionId: string;
        },
    count: number,
    form: string,
    actorId: undefined,
  ) {
    const generator = shapeRegistry[form] ?? shapeRegistry['circle'];

    const seats = generator(table, count);

    return this.createSeatsBulk(
      seats,
      table.eventId,
      actorId,
      `SEATS_GENERATED_${form.toUpperCase()}`,
      { tableId: table.id, count },
    );
  }

  // ---------------------------
  // AUTO LAYOUT GENERATOR
  // ---------------------------
  async autoGenerateLayout(
    eventId: any,
    config: SeatingConfigInput,
    maxSeats: number,
    actorId: any,
  ) {
    const result = [];

    if (config.simple) {
      const { sections, tables, seats } = config.simple;
      const totalTables = sections * tables;
      const seatsPerTable = seats ?? Math.floor(maxSeats / totalTables);

      for (let s = 1; s <= sections; s++) {
        const section = await this.prisma.section.create({
          data: { eventId, name: `Section ${s}`, order: s },
        });

        for (let t = 1; t <= tables; t++) {
          const table = await this.prisma.table.create({
            data: {
              eventId,
              sectionId: section.id,
              name: `Table ${s}.${t}`,
            },
          });

          await this.generateSeatsByForm(table, seatsPerTable, config.form ?? 'circle', actorId);
        }

        result.push(section);
      }

      return result;
    }

    if (config.sections?.length > 0) {
      const totalTables = config.sections.reduce((a: any, s: { tables: any }) => a + s.tables, 0);
      const autoSeats = Math.floor(maxSeats / totalTables);

      const tableSeatMap = new Map(
        config.tables?.map((t: { name: any; seats: any }) => [t.name, t.seats ?? autoSeats]) ?? [],
      );

      for (const sec of config.sections) {
        const section = await this.prisma.section.create({
          data: { eventId, name: sec.name },
        });

        for (let i = 1; i <= sec.tables; i++) {
          const tableName = `${sec.name}_${i}`;
          const seatCount = tableSeatMap.get(tableName) ?? autoSeats;

          const table = await this.prisma.table.create({
            data: { eventId, sectionId: section.id, name: tableName },
          });

          await this.generateSeatsByForm(table, seatCount, config.form ?? 'circle', actorId);
        }

        result.push(section);
      }

      return result;
    }

    throw new Error('Invalid seating configuration');
  }
}
