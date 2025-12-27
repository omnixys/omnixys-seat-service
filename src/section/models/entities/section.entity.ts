/* eslint-disable @typescript-eslint/no-explicit-any */
import { Field, Float, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('Section')
export class Section {
  @Field(() => ID)
  id!: string;

  @Field()
  eventId!: string;

  @Field()
  name!: string;

  @Field()
  order!: number;

  @Field({ nullable: true })
  capacity?: number;

  @Field(() => String, { nullable: true })
  meta?: any;

  @Field(() => Float, { nullable: true })
  x!: number;

  @Field(() => Float, { nullable: true })
  y!: number;

  // @Field(() => [
  //   forwardRef(() =>
  //     import('../../../table/models/entities/table.entity.js').then(
  //       (m) => m.Table,
  //     ),
  //   ),
  // ])
  // tables: any;

  // @Field(() => [
  //   forwardRef(() =>
  //     import('../../../seat/models/entities/seat.entity.js').then(
  //       (m) => m.Seat,
  //     ),
  //   ),
  // ])
  // seats: any;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}
