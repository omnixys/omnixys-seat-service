import { Injectable } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { SeatSyncEventType } from './seat-sync.types';

@Injectable()
export class SeatSyncService {
  constructor(private readonly pubsub: PubSub) {}

  async publishUpdate(eventId: string, type: SeatSyncEventType, payload: any) {
    await this.pubsub.publish(`SEAT_SYNC_${eventId}`, {
      seatSync: {
        eventId,
        type,
        payload,
      },
    });
  }
}
