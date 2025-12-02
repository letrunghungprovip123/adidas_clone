import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { ClientsModule } from '@nestjs/microservices';
import { PRODUCT_SERVICE } from 'src/config/rabbitmq-client.config';

@Module({
  imports: [ClientsModule.register([PRODUCT_SERVICE])],
  controllers: [CategoriesController],
  providers: [CategoriesService],
})
export class CategoriesModule {}
