export enum SeatSyncEventType {
  SEAT_UPDATED = 'SEAT_UPDATED',
  SEAT_MOVED = 'SEAT_MOVED',
  SEAT_ASSIGNED = 'SEAT_ASSIGNED',
  SEAT_UNASSIGNED = 'SEAT_UNASSIGNED',
  TABLE_UPDATED = 'TABLE_UPDATED',
  SECTION_UPDATED = 'SECTION_UPDATED',
  BULK_OPERATION = 'BULK_OPERATION',
}
import { SeatSyncEventType } from '../types/seat-sync.types';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SeatSyncPayload {
  @Field()
  eventId: string;

  @Field(() => SeatSyncEventType)
  type: SeatSyncEventType;

  @Field(() => String)
  payload: any;
}


await this.sync.publishUpdate(eventId, SeatSyncEventType.SEAT_MOVED, {
  seatId,
  x,
  y,
  rotation,
});


async moveSeat(input: MoveSeatInput, actorId: string) {
  const seat = await this.prisma.seat.update({
    where: { id: input.seatId },
    data: {
      x: input.x,
      y: input.y,
      rotation: input.rotation ?? undefined,
    },
  });

  await this.sync.publishUpdate(
    seat.eventId,
    SeatSyncEventType.SEAT_MOVED,
    seat,
  );

  return seat;
}


async assignSeat(input: AssignSeatInput, actorId: string) {
  const seat = await this.prisma.seat.update({
    where: { id: input.seatId },
    data: { guestId: input.guestId, status: 'ASSIGNED' },
  });

  await this.sync.publishUpdate(
    seat.eventId,
    SeatSyncEventType.SEAT_ASSIGNED,
    seat,
  );

  return seat;
}

await this.sync.publishUpdate(
  eventId,
  SeatSyncEventType.BULK_OPERATION,
  { action: 'GRID_GENERATED', count: seats.length }
);


// ======================== ======================== ======================== ======================== ======================== ======================== ========================
import { useEffect } from 'react';
import { gql, useSubscription } from '@apollo/client.js';

const SEAT_SYNC_SUB = gql`
  subscription SeatSync($eventId: String!) {
    seatSync(eventId: $eventId) {
      eventId
      type
      payload
    }
  }
`;

export function useSeatSync(eventId: string, onEvent: (evt) => void) {
  const { data } = useSubscription(SEAT_SYNC_SUB, {
    variables: { eventId },
    skip: !eventId,
  });

  useEffect(() => {
    if (data?.seatSync) {
      onEvent(data.seatSync);
    }
  }, [data]);
}

useSeatSync(eventId, (evt) => {
  switch (evt.type) {
    case "SEAT_MOVED":
      updateSeatPosition(evt.payload);
      break;

    case "SEAT_ASSIGNED":
      refreshSeat(evt.payload);
      break;

    case "BULK_OPERATION":
      reloadSeats();
      break;
  }
});
