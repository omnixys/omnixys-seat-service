/* eslint-disable @typescript-eslint/no-explicit-any */
import { JsonScalar } from '../../../core/scalars/json.scalar.js';
import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class LayoutVersionPayload {
  @Field(() => ID)
  id!: string;

  @Field()
  eventId!: string;

  @Field()
  version!: number;

  @Field({ nullable: true })
  label?: string;

  @Field(() => JsonScalar)
  data!: any;

  @Field()
  createdAt!: Date;
}
