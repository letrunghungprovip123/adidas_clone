import { Module } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { ClientsModule } from '@nestjs/microservices';
import { PRODUCT_SERVICE } from 'src/config/rabbitmq-client.config';

@Module({
  imports : [ClientsModule.register([PRODUCT_SERVICE])],
  controllers: [ReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
