import {Module} from '@nestjs/common';
import {HealthModule} from '../../../libs/health/src/health.module';
import {CustomerModule} from './customer/customer.module';
@Module({imports:process.env.V2_CUSTOMER_ENABLED==='true'?[CustomerModule]:[HealthModule]})
export class AppModule{}
