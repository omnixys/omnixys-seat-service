import { LayoutVersionPayload } from '../models/payloads/layout-version.payload.js';
import { Resolver } from '@nestjs/graphql';

@Resolver(() => LayoutVersionPayload)
export class LayoutVersionFieldsResolver {
  // constructor(private readonly prisma: PrismaService) {}
  // ------------------------------------------------------
  // PLACEHOLDER FOR FUTURE RELATIONS
  // e.g. event(eventId) → EventPayload
  // ------------------------------------------------------
  // Example (uncomment when your EventPayload exists in seat-service federation):
  /*
  @ResolveField(() => EventPayload)
  async event(@Parent() version: LayoutVersionPayload): Promise<EventPayload> {
    // fetch from event service (federated query)
  }
  */
  // NO relations in schema → no active fields yet
}
