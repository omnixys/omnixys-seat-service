import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class AssignSeatInput {
  @Field(() => ID)
  seatId!: string;

  @Field(() => ID, { nullable: true })
  guestId?: string;

  @Field(() => String, { nullable: true })
  invitationId?: string;

  @Field(() => String, { nullable: true })
  note?: string;
}
