import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class RenameTableInput {
  @Field(() => ID)
  tableId!: string;

  @Field()
  newName!: string;
}
