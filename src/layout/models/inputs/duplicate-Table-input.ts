import { Field, InputType, ID, Float } from '@nestjs/graphql';

@InputType()
export class DuplicateTableInput {
  @Field(() => ID)
  tableId!: string;

  @Field(() => Float)
  offsetX!: number;

  @Field(() => Float)
  offsetY!: number;
}
