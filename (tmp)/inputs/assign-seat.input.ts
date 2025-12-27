import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class AssignSeatsInput {
  @Field()
  seatId!: string;

  @Field()
  guestId!: string;

  @Field()
  eventId!: string;

  @Field(() => String, { nullable: true })
  note?: string;
}
