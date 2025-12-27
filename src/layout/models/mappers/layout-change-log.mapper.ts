import type { LayoutChangeLog } from '../../../prisma/generated/client.js';
import type { LayoutChangeLogPayload } from '../payloads/layout-change-log.payload.js';

export class LayoutChangeLogMapper {
  static toPayload(log: LayoutChangeLog): LayoutChangeLogPayload {
    return {
      id: log.id,
      eventId: log.eventId,
      actorId: log.actorId,
      type: log.type,
      payload: log.payload,
      createdAt: log.createdAt,
    };
  }

  static toPayloadList(list: LayoutChangeLog[]): LayoutChangeLogPayload[] {
    return list.map((x) => this.toPayload(x));
  }
}
