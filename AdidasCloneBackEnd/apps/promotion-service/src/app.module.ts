import { Module } from '@nestjs/common';
import { HealthModule } from '../../../libs/health/src/health.module';

/** No business logic, database, or message consumers are connected in Phase 1. */
@Module({ imports: [HealthModule] })
export class AppModule {}
