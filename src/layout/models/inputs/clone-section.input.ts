import { Field, InputType, Int } from '@nestjs/graphql';

/**
 * Clones an entire section including tables and seats.
 * Everything is offset by the given XY values.
 */
@InputType()
export class CloneSectionInput {
  @Field()
  sectionId!: string;

  @Field(() => Int)
  offsetX!: number;

  @Field(() => Int)
  offsetY!: number;
}
