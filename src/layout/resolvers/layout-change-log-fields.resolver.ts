import { LayoutChangeLogPayload } from '../models/payloads/layout-change-log.payload.js';
import { Resolver } from '@nestjs/graphql';

@Resolver(() => LayoutChangeLogPayload)
export class LayoutChangeLogFieldsResolver {
  // constructor(private readonly prisma: PrismaService) {}
  // ------------------------------------------------------
  // FUTURE FIELDS (Federation or internal services)
  // ------------------------------------------------------
  // Event Lookup (from Event-Service)
  /*
  @ResolveField(() => EventPayload)
  async event(@Parent() log: LayoutChangeLogPayload): Promise<EventPayload> {
    // GraphQL federation call to event-service
  }
  */
  // Actor Lookup (from User/Identity service)
  /*
  @ResolveField(() => UserPayload, { nullable: true })
  async actor(@Parent() log: LayoutChangeLogPayload): Promise<UserPayload | null> {
    if (!log.actorId) return null;
    // federation call to user-service
  }
  */
  // No relations → no active resolvers for now
}
