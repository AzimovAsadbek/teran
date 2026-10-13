import { Module } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service.js';

/** Background housekeeping of expired records. */
@Module({
  providers: [MaintenanceService],
})
export class MaintenanceModule {}
