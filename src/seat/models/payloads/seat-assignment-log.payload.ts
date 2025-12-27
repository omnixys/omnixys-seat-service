/* eslint-disable @typescript-eslint/no-explicit-any */
import { JsonScalar } from '../../../core/scalars/json.scalar.js';
import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SeatAssignmentLogPayload {
  @Field(() => ID)
  id!: string;

  @Field()
  eventId!: string;

  @Field()
  seatId!: string;

  @Field({ nullable: true })
  guestId?: string;

  @Field()
  action!: string;

  @Field(() => JsonScalar, { nullable: true })
  data?: any;

  @Field()
  createdAt!: Date;
}
