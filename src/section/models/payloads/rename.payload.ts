import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class RenamePayload {
  @Field()
  success!: boolean;

  @Field()
  affectedSeats!: number;
}

@ObjectType()
export class RenameConflict {
  @Field()
  type!: 'SECTION' | 'TABLE';

  @Field()
  id!: string;

  @Field()
  name!: string;
}

@ObjectType()
export class BulkRenamePayload {
  @Field()
  success!: boolean;

  @Field()
  affectedSeats!: number;

  @Field({ nullable: true })
  affectedSections?: number;

  @Field({ nullable: true })
  affectedTables?: number;

  @Field(() => [RenameConflict])
  conflicts!: RenameConflict[];
}
