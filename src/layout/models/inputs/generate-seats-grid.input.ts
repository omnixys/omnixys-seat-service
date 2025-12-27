import { Field, Float, InputType, Int } from '@nestjs/graphql';

@InputType()
export class GenerateSeatsGridInput {
  @Field()
  eventId!: string;

  @Field()
  sectionId!: string;

  @Field(() => Int)
  rows!: number;

  @Field(() => Int)
  cols!: number;

  @Field(() => Float, { nullable: true })
  spacing?: number; // default 50 px
}
