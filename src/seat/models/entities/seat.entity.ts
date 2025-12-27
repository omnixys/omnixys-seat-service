import { Section } from '../../../section/models/entities/section.entity.js';
import { Table } from '../../../table/models/entities/table.entity.js';
import { SeatStatus } from '../enums/seat-status.enum.js';
import { Field, Float, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('Seat')
export class Seat {
  @Field(() => ID)
  id!: string;

  @Field(() => SeatStatus)
  status!: SeatStatus;

  @Field()
  eventId!: string;

  @Field()
  sectionId!: string;

  @Field({ nullable: true })
  tableId!: string;

  @Field({ nullable: true })
  number!: number;

  @Field({ nullable: true })
  label?: string;

  @Field({ nullable: true })
  note?: string;

  @Field(() => Float, { nullable: true })
  x!: number;

  @Field(() => Float, { nullable: true })
  y!: number;

  @Field(() => Float, { nullable: true })
  rotation?: number;

  @Field({ nullable: true })
  seatType?: string;

  @Field({ nullable: true })
  guestId?: string;

  @Field(() => Section)
  section!: Section;

  @Field(() => Table, { nullable: true })
  table!: Table;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}
