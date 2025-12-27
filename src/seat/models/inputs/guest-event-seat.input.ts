import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class GuestEventSeatInput {
  @Field(() => ID)
  eventId!: string;

  @Field(() => ID)
  guestId!: string;
}
