import { SeatSyncPayload } from './seat-sync.payload';
import { Resolver, Subscription, Args } from '@nestjs/graphql';
import { PubSub } from 'graphql-subscriptions';

@Resolver()
export class SeatSyncResolver {
  constructor(private readonly pubsub: PubSub) {}

  @Subscription(() => SeatSyncPayload, {
    filter: (payload, variables) =>
      payload.seatSync.eventId === variables.eventId,
  })
  seatSync(@Args('eventId') eventId: string) {
    return this.pubsub.asyncIterator(`SEAT_SYNC_${eventId}`);
  }
}
