import { Field, InputType, ID, Int, Float } from '@nestjs/graphql';

@InputType()
export class GenerateSeatsCircleInput {
  @Field(() => ID)
  tableId!: string;

  @Field(() => Int)
  count!: number; // number of seats to generate

  @Field(() => Float, { nullable: true })
  radius?: number; // default 120 px
}
