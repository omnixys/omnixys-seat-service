// TODO resolve eslint

import { PrismaService } from '../../prisma/prisma.service.js';
import { Event } from '../models/entities/event.entity.js';
import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '../models/enums/user-role.enum.js';
import {
  mapEventToPayload,
  mapFullEventToPayload,
} from '../models/mapper/event.mapper.js';
import {
  EventPayload,
  EventPayloadFull,
} from '../models/payloads/event.payload.js';
import { LoggerPlusService } from '../../logger/logger-plus.service.js';

/**
 * EventReadService
 * -------------------------------------------------------------
 * Provides read-only access to Event entities from the database.
 * Uses Prisma for typed data retrieval.
 */
@Injectable()
export class EventReadService {
  private readonly logger;

  constructor(
    private readonly prisma: PrismaService,
    private readonly loggerService: LoggerPlusService,
  ) {
    this.logger = this.loggerService.getLogger(EventReadService.name);
  }

  /**
   * Liefert alle Events, für die der gegebene Benutzer irgendeine Rolle besitzt.
   * - Vollständig typisiert.
   * - Nutzt die Relation userRoles (UserEventRole).
   * - Early-return falls keine Rollen gefunden wurden.
   * - Sortiert Events korrekt nach startsAt.
   */
  async findMyEvents(userId: string): Promise<EventPayload[]> {
    this.logger.debug('');
    // 1️⃣ Alle Event-Beziehungen des Users holen
    const relations = await this.prisma.userEventRole.findMany({
      where: { userId },
      select: { eventId: true },
    });

    // IDs extrahieren + validieren
    const ids = [
      ...new Set(
        relations
          .map((r) => r.eventId)
          .filter(
            (id): id is string =>
              typeof id === 'string' && id.trim().length > 0,
          ),
      ),
    ];

    // 2️⃣ Wenn keine Events → sofort zurück
    if (ids.length === 0) {
      return [];
    }

    // 3️⃣ Events holen (geordnet)
    const myEvents = await this.prisma.event.findMany({
      where: { id: { in: ids } },
      orderBy: { startsAt: 'asc' },
      include: {
        userRoles: {
          where: { userId },
        },
      },
    });

    return myEvents.map(mapEventToPayload);
  }

  // Returns all events, ordered by start date
  async findAll(): Promise<EventPayload[]> {
    return this.prisma.event.findMany({
      orderBy: { startsAt: 'asc' },
    });
  }

  /**
   * Returns a fully hydrated event including user roles and seats.
   * Throws a NotFoundException if the ID does not exist.
   */
  async findOne(id: string, currentUserId?: string): Promise<EventPayloadFull> {
    const found = await this.prisma.event.findUnique({
      where: { id },
      include: {
        userRoles: true,
        seats: true,
      },
    });

    if (!found) {
      throw new NotFoundException(`Event with ID "${id}" not found`);
    }

    // this.logger.debug('Found event: %o', found);

    return mapFullEventToPayload(found, currentUserId);
  }

  async findMyEventsByRole(
    userId: string,
    roles: UserRole[],
  ): Promise<Event[]> {
    const rel = await this.prisma.userEventRole.findMany({
      where: { userId, role: { in: roles } },
      select: { eventId: true },
    });

    const ids = [...new Set(rel.map((r) => r.eventId))];
    if (ids.length === 0) {
      return [];
    }

    return this.prisma.event.findMany({
      where: { id: { in: ids } },
      orderBy: { startsAt: 'asc' },
    });
  }
}
