import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { ClientsModule } from '@nestjs/microservices';
import { PRODUCT_SERVICE } from 'src/config/rabbitmq-client.config';

@Module({
  imports: [ClientsModule.register([PRODUCT_SERVICE])],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
