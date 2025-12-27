import type { SeatAssignmentLog } from '../../../prisma/generated/client.js';
import { n2u } from '../../../utils/null-to-undefined.js';
import type { SeatAssignmentLogPayload } from '../payloads/seat-assignment-log.payload.js';

export class SeatAssignmentLogMapper {
  static toPayload(log: SeatAssignmentLog): SeatAssignmentLogPayload {
    return {
      id: log.id,
      eventId: log.eventId,
      seatId: log.seatId,
      guestId: n2u(log.guestId),
      action: log.action,
      data: log.data,
      createdAt: log.createdAt,
    };
  }

  static toPayloadList(list: SeatAssignmentLog[]): SeatAssignmentLogPayload[] {
    return list.map((x) => this.toPayload(x));
  }
}
