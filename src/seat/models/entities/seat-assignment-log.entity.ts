/* eslint-disable @typescript-eslint/no-explicit-any */
import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('SeatAssignmentLog')
export class SeatAssignmentLog {
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

  @Field(() => String, { nullable: true })
  data?: any;

  @Field()
  createdAt!: Date;
}
