import { registerEnumType } from '@nestjs/graphql';

export enum SeatStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  ASSIGNED = 'ASSIGNED',
  BLOCKED = 'BLOCKED',
}

registerEnumType(SeatStatus, {
  name: 'SeatStatus',
});
