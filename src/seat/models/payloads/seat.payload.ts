/* eslint-disable @typescript-eslint/no-explicit-any */
import { JsonScalar } from '../../../core/scalars/json.scalar.js';
import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SeatPayload {
  @Field(() => ID)
  id!: string;

  @Field()
  status!: string;

  @Field()
  eventId!: string;

  @Field()
  sectionId!: string;

  @Field({ nullable: true })
  tableId?: string;

  @Field({ nullable: true })
  number?: number;

  @Field({ nullable: true })
  label?: string;

  @Field({ nullable: true })
  note?: string;

  @Field({ nullable: true })
  x?: number;

  @Field({ nullable: true })
  y?: number;

  @Field({ nullable: true })
  rotation?: number;

  @Field({ nullable: true })
  seatType?: string;

  @Field({ nullable: true })
  guestId?: string;

  @Field({ nullable: true })
  invitationId?: string;

  @Field(() => JsonScalar, { nullable: true })
  meta?: any;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}
