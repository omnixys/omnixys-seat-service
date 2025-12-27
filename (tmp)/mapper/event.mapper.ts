// src/event/mappers/event.mapper.ts

import { Seat } from '../entities/seat.entity.js';
import { UserEventRole } from '../entities/user-role.entity.js';
import { UserRole } from '../enums/user-role.enum.js';
import { EventPayload, EventPayloadFull } from '../payloads/event.payload.js';
import type {
  Event as PrismaEvent,
  Seat as PrismaSeat,
  UserEventRole as PrismaUserEventRole,
} from '@prisma/client.js';

/**
 * Maps a Prisma Event (with userRoles) to EventPayload for GraphQL.
 * All fields are transformed 1:1; myRole is extracted from the user's relation.
 */
export function mapEventToPayload(
  event: PrismaEvent & { userRoles: PrismaUserEventRole[] },
): EventPayload {
  const payload = new EventPayload();

  // Base fields
  payload.id = event.id;
  payload.name = event.name;
  payload.startsAt = event.startsAt;
  payload.endsAt = event.endsAt;
  payload.allowReEntry = event.allowReEntry;
  payload.maxSeats = event.maxSeats;
  payload.rotateSeconds = event.rotateSeconds;
  payload.createdAt = event.createdAt;
  payload.updatedAt = event.updatedAt;

  // Optional fields
  payload.location = event.location ?? null;
  payload.dressCode = event.dressCode ?? null;
  payload.description = event.description ?? null;

  // Defaults
  payload.defaultSection = event.defaultSection ?? 0;
  payload.defaultTable = event.defaultTable ?? 0;

  // Extracting user role
  const rel = event.userRoles[0];
  payload.myRole = rel ? (rel.role as UserRole) : UserRole.GUEST;

  return payload;
}

/**
 * Maps a complete Prisma Event model (with seats + roles)
 * into a fully detailed GraphQL payload.
 */
export function mapFullEventToPayload(
  event: PrismaEvent & {
    seats: PrismaSeat[];
    userRoles: PrismaUserEventRole[];
  },
  currentUserId?: string,
): EventPayloadFull {
  const payload = new EventPayloadFull();

  // Base event fields
  payload.id = event.id;
  payload.name = event.name;
  payload.startsAt = event.startsAt;
  payload.endsAt = event.endsAt;
  payload.allowReEntry = event.allowReEntry;
  payload.maxSeats = event.maxSeats;
  payload.rotateSeconds = event.rotateSeconds;
  payload.createdAt = event.createdAt;
  payload.updatedAt = event.updatedAt;

  // Optional metadata
  payload.location = event.location ?? null;
  payload.dressCode = event.dressCode ?? null;
  payload.description = event.description ?? null;

  payload.defaultSection = event.defaultSection;
  payload.defaultTable = event.defaultTable;

  // Map all user roles
  payload.userRoles = event.userRoles.map((ur) => {
    const u = new UserEventRole();
    u.eventId = ur.eventId;
    u.id = ur.id;
    u.userId = ur.userId;
    u.role = ur.role as UserRole;
    return u;
  });

  // Map all seats
  payload.seats = event.seats.map((s) => {
    const seat = new Seat();
    seat.id = s.id;
    seat.eventId = s.eventId;
    seat.section = s.section;
    seat.table = s.table;
    seat.number = s.number;
    seat.note = s.note;
    seat.guestId = s.guestId;
    return seat;
  });

  // Optional current user's role
  payload.myRole = currentUserId
    ? ((event.userRoles.find((r) => r.userId === currentUserId)
        ?.role as UserRole) ?? UserRole.GUEST)
    : undefined;

  return payload;
}
