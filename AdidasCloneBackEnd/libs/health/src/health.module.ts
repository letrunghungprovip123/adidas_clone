import { Controller, Get, Module } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService, TerminusModule } from '@nestjs/terminus';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthCheckService) {}

  @Get('live')
  @ApiOperation({ summary: 'Process liveness only' })
  live(): { status: string } { return { status: 'ok' }; }

  @Get('ready')
  @HealthCheck()
  @ApiOperation({ summary: 'Nest application readiness (foundation only)' })
  ready() {
    // Phase 1 skeleton has no domain integrations; future phases must add dependency checks.
    return this.health.check([async () => ({ framework: { status: 'up' } })]);
  }
}

@Module({ imports: [TerminusModule], controllers: [HealthController] })
export class HealthModule {}
