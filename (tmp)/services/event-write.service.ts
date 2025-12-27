// TODO resolve eslint

import pkg from '@prisma/client.js';
const { UserRole } = pkg;

import { LoggerPlusService } from '../../logger/logger-plus.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateSeatDTO } from '../models/dto/create-seat.dto.js';
import { Event } from '../models/entities/event.entity.js';
import { AssignUserRoleInput } from '../models/inputs/assign-user-role.input.js';
import { CreateEventInput } from '../models/inputs/create-event.input.js';
import { UpdateEventInput } from '../models/inputs/update-event.input.js';
import { SeatWriteService } from './seat-write.service.js';
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class EventWriteService {
  private readonly logger;

  constructor(
    private readonly prisma: PrismaService,
    private readonly seatWriteService: SeatWriteService,
    private readonly loggerService: LoggerPlusService,
  ) {
    this.logger = this.loggerService.getLogger(EventWriteService.name);
  }

  async create(data: CreateEventInput, userId: string): Promise<Event> {
    // 1️⃣ Event erstellen
    const event = await this.prisma.event.create({
      data: {
        name: data.name,
        startsAt: new Date(data.startsAt),
        endsAt: new Date(data.endsAt),
        allowReEntry: data.allowReEntry ?? true,
        rotateSeconds: data.rotateSeconds,
        maxSeats: data.maxSeats,
        location: data.location,
        dressCode: data.dressCode,
        description: data.description,
        defaultSection: data.defaultSection,
        defaultTable: data.defaultTable,
      },
    });

    // 2️⃣ Dem User ADMIN-Rolle für dieses Event geben
    await this.prisma.userEventRole.create({
      data: {
        userId,
        eventId: event.id,
        role: UserRole.ADMIN,
      },
    });

    await this.generateDefaultSeats(
      event.id,
      data.maxSeats,
      data.defaultSection,
      data.defaultTable,
    );

    return event;
  }

  async update(input: UpdateEventInput): Promise<Event> {
    const { id, ...patch } = input;

    const exists = await this.prisma.event.findUnique({ where: { id } });
    if (!exists) {
      throw new NotFoundException('Event nicht gefunden');
    }

    return this.prisma.event.update({
      where: { id },
      data: {
        ...patch,
        startsAt: patch.startsAt ? new Date(String(patch.startsAt)) : undefined,
        endsAt: patch.endsAt ? new Date(String(patch.endsAt)) : undefined,
      },
    });
  }

  async remove(id: string): Promise<boolean> {
    const exists = await this.prisma.event.findUnique({ where: { id } });
    if (!exists) {
      throw new NotFoundException('Event nicht gefunden');
    }

    // event.delete() cascade-löscht auch Seats & UserEventRole (wegen Prisma)
    await this.prisma.event.delete({ where: { id } });
    return true;
  }

  private async generateDefaultSeats(
    eventId: string,
    maxSeats: number = 50,
    sections: number = 5,
    tables: number = 2,
  ): Promise<void> {
    if (!sections || !tables || sections <= 0 || tables <= 0) {
      return;
    }

    const totalTables = sections * tables;
    const baseSeatsPerTable = Math.floor(maxSeats / totalTables);
    let remaining = maxSeats % totalTables;

    const seatCreates: CreateSeatDTO[] = [];

    for (let s = 1; s <= sections; s++) {
      for (let t = 1; t <= tables; t++) {
        // seats for this table
        const seatCount = baseSeatsPerTable + (remaining > 0 ? 1 : 0);
        if (remaining > 0) {
          remaining--;
        }

        for (let seatNum = 1; seatNum <= seatCount; seatNum++) {
          seatCreates.push({
            eventId,
            section: String(s),
            table: String(t),
            number: seatNum,
          });
        }
      }
    }

    // Perform bulk insert
    await this.seatWriteService.bulkImport2(seatCreates);
  }

  /**
   * Assigns a user to an event with a specific role.
   * Creates or updates the UserEventRole relation.
   */
  async assignUserToEvent(input: AssignUserRoleInput): Promise<void> {
    const { userId, eventId, eventRole: role } = input;
    this.logger.debug('Assigning user %s to event %s with role %s', userId, eventId, role);
    // 1) Check if event exists
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    });

    if (!event) {
      throw new Error('Event not found.');
    }

    // 3) Check for existing role relation
    const existing = await this.prisma.userEventRole.findUnique({
      where: {
        userId_eventId: { userId, eventId },
      },
    });

    if (existing) {
      // Update existing relation
      await this.prisma.userEventRole.update({
        where: {
          userId_eventId: { userId, eventId },
        },
        data: { role },
      });
      return;
    }

    // 4) Create a new relation
    await this.prisma.userEventRole.create({
      data: {
        userId,
        eventId,
        role,
      },
    });

    //  await this.producer.emit(Topics.EVENT_USER_ROLE_ASSIGNED, {
    //    eventId,
    //    userId: targetUserId,
    //    role,
    //    timestamp: new Date().toISOString(),
    //  });
  }
}
