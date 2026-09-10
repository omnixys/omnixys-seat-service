import { EventAuthModule } from '../event-auth/event-auth.module.js';
import { LayoutImportController } from './layout-import.controller.js';
import { LayoutImportService } from './layout-import.service.js';
import { Module } from '@nestjs/common';

@Module({
  imports: [EventAuthModule],
  controllers: [LayoutImportController],
  providers: [LayoutImportService],
})
export class LayoutImportModule {}
