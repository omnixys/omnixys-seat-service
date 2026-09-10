import { LayoutImportService } from './layout-import.service.js';
import type { LayoutRecognitionResult } from './recognizers/layout-recognizer.js';
import {
  Controller,
  ForbiddenException,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { EventPermissionKey, RealmRoleType } from '@omnixys/contracts-ts';
import {
  CookieAuthGuard,
  CurrentUser,
  type CurrentUserData,
  EventPermissionResolver,
  RoleGuard,
  Roles,
} from '@omnixys/security-ts';
import type { FastifyReply, FastifyRequest } from 'fastify';

@Controller('layout-import')
@UseGuards(CookieAuthGuard, RoleGuard)
@Roles(RealmRoleType.USER, RealmRoleType.ADMIN)
export class LayoutImportController {
  constructor(
    private readonly imports: LayoutImportService,
    private readonly permissions: EventPermissionResolver,
  ) {}

  @Post(':eventId/analyze')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async analyze(
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @CurrentUser() user: CurrentUserData,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<LayoutRecognitionResult> {
    if (!user?.id) {
      throw new UnauthorizedException('Authenticated user is required.');
    }
    // REST target is explicit; active-event cookies/headers must never authorize another event.
    const permissions = await this.permissions.getPermissionsForUser(user.id, eventId);
    if (!permissions.includes(EventPermissionKey.ManageSeats)) {
      throw new ForbiddenException('Seat management is not authorized for this event.');
    }
    const controller = new AbortController();
    const cancel = (): void => controller.abort();
    const close = (): void => {
      if (!reply.raw.writableEnded) {
        cancel();
      }
    };
    request.raw.once('aborted', cancel);
    reply.raw.once('close', close);
    if (request.raw.aborted) {
      cancel();
    }
    try {
      return await this.imports.analyze(request, eventId, controller.signal);
    } catch (error) {
      if (!request.raw.complete && !request.raw.destroyed) {
        // Finish the error response, then release an unfinished/slow multipart upload.
        reply.raw.once('finish', () => request.raw.destroy());
      }
      throw error;
    } finally {
      request.raw.removeListener('aborted', cancel);
      reply.raw.removeListener('close', close);
    }
  }
}
