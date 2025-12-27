/* eslint-disable @typescript-eslint/no-explicit-any */
import { JsonScalar } from '../../../core/scalars/json.scalar.js';
import { Field, ID, InputType, Int } from '@nestjs/graphql';

@InputType()
export class UpdateTableInput {
  @Field(() => ID)
  id!: string;

  @Field({ nullable: true })
  name?: string;

  @Field(() => Int, { nullable: true })
  order?: number;

  @Field(() => Int, { nullable: true })
  capacity?: number;

  @Field(() => JsonScalar, { nullable: true })
  meta?: any;
}
