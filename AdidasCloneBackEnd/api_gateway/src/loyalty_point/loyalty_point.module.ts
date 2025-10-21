import { Module } from '@nestjs/common';
import { LoyaltyPointService } from './loyalty_point.service';
import { LoyaltyPointController } from './loyalty_point.controller';
import { ClientsModule } from '@nestjs/microservices';
import { USER_SERVICE } from 'src/config/rabbitmq-client.config';

@Module({
  imports: [ClientsModule.register([USER_SERVICE])],
  controllers: [LoyaltyPointController],
  providers: [LoyaltyPointService],
})
export class LoyaltyPointModule {}
