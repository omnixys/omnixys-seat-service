/* eslint-disable @typescript-eslint/no-explicit-any */
import { Field, Float, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('Table')
export class Table {
  @Field(() => ID)
  id!: string;

  @Field()
  eventId!: string;

  @Field()
  sectionId!: string;

  @Field()
  name!: string;

  @Field({ nullable: true })
  order?: number;

  @Field({ nullable: true })
  capacity?: number;

  @Field(() => Float, { nullable: true })
  x!: number;

  @Field(() => Float, { nullable: true })
  y!: number;

  @Field(() => String, { nullable: true })
  meta?: any;

  // @Field(() => [
  //   forwardRef(() =>
  //     import('../../../seat/models/entities/seat.entity.js').then(
  //       (m) => m.Seat,
  //     ),
  //   ),
  // ])
  // seats: any;

  // @Field(
  //   () =>
  //     forwardRef(() =>
  //       import('../../../section/models/entities/section.entity.js').then(
  //         (m) => m.Section,
  //       ),
  //     ),
  //   { nullable: true },
  // )
  // section: any;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}
