import {
  Field,
  GraphQLISODateTime,
  ID,
  Int,
  ObjectType,
} from '@nestjs/graphql';
import { UserRole } from '../enums/user-role.enum.js';
import { IsEnum } from 'class-validator';
import { Seat } from '../entities/seat.entity.js';
import { UserEventRole } from '../entities/user-role.entity.js';

@ObjectType()
export class EventPayload {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => GraphQLISODateTime)
  startsAt!: Date;

  @Field(() => GraphQLISODateTime)
  endsAt!: Date;

  @Field(() => String)
  allowReEntry!: boolean;

  @Field(() => Number)
  maxSeats!: number;

  @Field(() => Number)
  rotateSeconds!: number;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt!: Date;

  @Field(() => String, { nullable: true })
  location?: string | null;

  @Field(() => String, { nullable: true })
  dressCode?: string | null;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => Int)
  defaultSection?: number;

  @Field(() => Int)
  defaultTable?: number;

  @Field(() => UserRole)
  @IsEnum(UserRole)
  myRole?: UserRole;
}

@ObjectType()
export class EventPayloadFull {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => GraphQLISODateTime)
  startsAt!: Date;

  @Field(() => GraphQLISODateTime)
  endsAt!: Date;

  @Field(() => Boolean)
  allowReEntry!: boolean;

  @Field(() => Int)
  maxSeats!: number;

  @Field(() => Int)
  rotateSeconds!: number;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt!: Date;

  @Field(() => String, { nullable: true })
  location?: string | null;

  @Field(() => String, { nullable: true })
  dressCode?: string | null;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => Int)
  defaultSection!: number;

  @Field(() => Int)
  defaultTable!: number;

  // All user-role relations:
  @Field(() => [UserEventRole])
  userRoles!: UserEventRole[];

  // All seats of the event:
  @Field(() => [Seat])
  seats!: Seat[];

  // Current user role (optional)
  @Field(() => UserRole, { nullable: true })
  myRole?: UserRole;
}
