import { Field, ID, InputType, Float } from '@nestjs/graphql';

@InputType()
export class MoveSeatInput {
  @Field(() => ID)
  id!: string;

  @Field(() => Float)
  x!: number;

  @Field(() => Float)
  y!: number;

  @Field(() => Float, { nullable: true })
  rotation?: number;
}

@InputType()
export class MoveSectionInput {
  @Field(() => ID)
  id!: string;

  @Field(() => Float)
  x!: number;

  @Field(() => Float)
  y!: number;
}

@InputType()
export class MoveTableInput {
  @Field(() => ID)
  id!: string;

  @Field(() => Float)
  x!: number;

  @Field(() => Float)
  y!: number;
}
