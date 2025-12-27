import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class CreateAutoLayoutInput {
  @Field()
  eventId!: string;

  // wizard parameters
  @Field(() => Int)
  sections!: number;

  @Field(() => Int)
  tablesPerSection!: number;

  @Field(() => Int)
  seatsPerTable!: number;

  @Field()
  shape!: string;

  @Field(() => String)
  color!: string;
}
