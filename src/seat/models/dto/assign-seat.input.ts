import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class AssignSeatDTO {
  @Field({ nullable: true })
  seatId?: string;

  @Field()
  guestId!: string;

  @Field()
  eventId!: string;

  @Field(() => String, { nullable: true })
  note?: string;

  @Field(() => String)
  actorId!: string;
}
