import { TablePayload } from '../models/payloads/table.payload.js';
import { TableReadService } from '../services/table-read.service.js';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';

@Resolver()
export class TableQueryResolver {
  constructor(private readonly tableReadService: TableReadService) {}

  @Query(() => [TablePayload])
  async tablesBySection(
    @Args('sectionId', { type: () => ID }) sectionId: string,
  ): Promise<TablePayload[]> {
    return this.tableReadService.getTablesBySection(sectionId);
  }

  @Query(() => [TablePayload])
  async table(
    @Args('sectionId', { type: () => ID }) sectionId: string,
  ): Promise<TablePayload> {
    return this.tableReadService.getTableById(sectionId);
  }

  @Query(() => [TablePayload])
  async eventTables(
    @Args('sectionId', { type: () => ID }) sectionId: string,
  ): Promise<TablePayload[]> {
    return this.tableReadService.getEventTables(sectionId);
  }
}
