import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class RenameSectionInput {
  @Field(() => ID)
  sectionId!: string;

  @Field()
  newName!: string;
}
