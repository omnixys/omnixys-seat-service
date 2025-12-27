/* eslint-disable @typescript-eslint/no-explicit-any */
import { JsonScalar } from '../../../core/scalars/json.scalar.js';
import { Field, ID, InputType, Int } from '@nestjs/graphql';

@InputType()
export class SaveLayoutVersionInput {
  @Field(() => ID)
  eventId!: string;

  @Field(() => Int)
  version!: number;

  @Field(() => JsonScalar)
  data: any;

  @Field({ nullable: true })
  label?: string;
}
