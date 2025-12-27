import { PrismaService } from '../../prisma/prisma.service.js';
import { SeatMapper } from '../../seat/models/mappers/seat.mapper.js';
import { SeatPayload } from '../../seat/models/payloads/seat.payload.js';
import { TableMapper } from '../../table/models/mappers/table.mapper.js';
import { TablePayload } from '../../table/models/payloads/table.payload.js';
import { SectionPayload } from '../models/payloads/section.payload.js';
import { Resolver, ResolveField, Parent } from '@nestjs/graphql';

@Resolver(() => SectionPayload)
export class SectionFieldsResolver {
  constructor(private readonly prisma: PrismaService) {}

  // ------------------------------------------------------
  // TABLES[]
  // ------------------------------------------------------
  @ResolveField(() => [TablePayload])
  async tables(@Parent() section: SectionPayload): Promise<TablePayload[]> {
    const tables = await this.prisma.table.findMany({
      where: { sectionId: section.id },
      orderBy: { order: 'asc' },
    });

    return TableMapper.toPayloadList(tables);
  }

  // ------------------------------------------------------
  // SEATS[] (section-level seats WITHOUT tableId)
  // ------------------------------------------------------
  @ResolveField(() => [SeatPayload])
  async seats(@Parent() section: SectionPayload): Promise<SeatPayload[]> {
    const seats = await this.prisma.seat.findMany({
      where: { sectionId: section.id, tableId: null },
      orderBy: { number: 'asc' },
    });

    return SeatMapper.toPayloadList(seats);
  }
}
