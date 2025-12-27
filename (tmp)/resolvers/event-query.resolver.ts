import { UnauthorizedException, UseGuards } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import {
  CurrentUser,
  CurrentUserData,
} from '../../auth/decorators/current-user.decorator.js';
import { CookieAuthGuard } from '../../auth/guards/cookie-auth.guard.js';
import { LoggerPlusService } from '../../logger/logger-plus.service.js';
import { Event } from '../models/entities/event.entity.js';
import {
  EventPayload,
  EventPayloadFull,
} from '../models/payloads/event.payload.js';
import { EventReadService } from '../services/event-read.service.js';

@Resolver(() => Event)
export class EventQueryResolver {
  private readonly logger;

  constructor(
    private readonly loggerService: LoggerPlusService,
    private readonly service: EventReadService,
  ) {
    this.logger = this.loggerService.getLogger(EventQueryResolver.name);
  }

  @Query(() => [EventPayload], { name: 'events' })
  get(): Promise<EventPayload[]> {
    return this.service.findAll();
  }

  @UseGuards(CookieAuthGuard)
  @Query(() => EventPayloadFull, { name: 'event' })
  getById(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() currentUser: CurrentUserData,
  ): Promise<EventPayloadFull> {
    this.logger.debug('getById: id=%s', id);
    return this.service.findOne(id, currentUser?.id);
  }

  @Query(() => [EventPayload], { name: 'myEvents' })
  @UseGuards(CookieAuthGuard)
  async getMyEvents(
    @CurrentUser() currentUser: CurrentUserData,
  ): Promise<EventPayload[]> {
    if (!currentUser?.id) {
      throw new UnauthorizedException('Not authenticated');
    }
    return this.service.findMyEvents(currentUser.id);
  }
}
