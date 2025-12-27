/* eslint-disable @typescript-eslint/no-explicit-any */
import { JsonScalar } from '../../../core/scalars/json.scalar.js';
import { Field, Float, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SectionPayload {
  @Field(() => ID)
  id!: string;

  @Field()
  eventId!: string;

  @Field()
  name!: string;

  @Field()
  order!: number;

  @Field({ nullable: true })
  capacity?: number;

  @Field(() => JsonScalar)
  meta!: any;

  @Field(() => Float)
  x!: number;

  @Field(() => Float)
  y!: number;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}
