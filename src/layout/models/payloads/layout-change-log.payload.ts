/* eslint-disable @typescript-eslint/no-explicit-any */
import { JsonScalar } from '../../../core/scalars/json.scalar.js';
import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class LayoutChangeLogPayload {
  @Field(() => ID)
  id!: string;

  @Field()
  eventId!: string;

  @Field({ nullable: true })
  actorId?: string;

  @Field()
  type!: string;

  @Field(() => JsonScalar)
  payload!: any;

  @Field()
  createdAt!: Date;
}
