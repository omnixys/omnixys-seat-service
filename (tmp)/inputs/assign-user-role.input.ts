import { Field, InputType } from '@nestjs/graphql';
import { UserRole } from '../enums/user-role.enum.js';

@InputType()
export class AssignUserRoleInput {
  @Field()
  eventId!: string;

  @Field()
  userId!: string;

  @Field(() => UserRole)
  eventRole!: UserRole;
}
