import { Module, Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthModule } from '../../../libs/health/src/health.module';

@ApiTags('system')
@Controller('api/v1/system')
class SystemController {
  @Get()
  @ApiOperation({ summary: 'V2 gateway foundation; no business routes active' })
  @ApiOkResponse({ description: 'Gateway skeleton is reachable' })
  status() { return { service: 'api-gateway', stage: 'foundation', business_routes_active: false }; }
}

@Module({ imports: [HealthModule], controllers: [SystemController] })
export class AppModule {}
