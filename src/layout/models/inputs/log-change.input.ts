/* eslint-disable @typescript-eslint/no-explicit-any */
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class LogChangeInput {
  @Field()
  eventId!: string;

  @Field()
  type!: string;

  @Field(() => String)
  payload: any;

  @Field()
  actorId!: string;
}
