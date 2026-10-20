import {Module} from '@nestjs/common';
import {HealthModule} from '../../../libs/health/src/health.module';
import {CatalogModule} from './catalog/catalog.module';
@Module({imports:process.env.V2_CATALOG_ENABLED==='true'?[CatalogModule]:[HealthModule]})
export class AppModule {}
