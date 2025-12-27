import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class CreateVersionLabelInput {
  @Field(() => ID)
  versionId!: string;

  @Field()
  label!: string;
}
