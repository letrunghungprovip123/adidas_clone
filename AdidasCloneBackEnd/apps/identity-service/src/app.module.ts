import { Module } from '@nestjs/common';
import { HealthModule } from '../../../libs/health/src/health.module';
import { IdentityModule } from './identity/identity.module';

@Module({
  imports: process.env.V2_IDENTITY_ENABLED === 'true' ? [IdentityModule] : [HealthModule]
})
export class AppModule {}
