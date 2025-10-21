import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PRODUCT_SERVICE, USER_SERVICE } from './config/rabbitmq-client.config';
import { UserModule } from './user/user.module';
import { AddressesModule } from './addresses/addresses.module';
import { LoyaltyPointModule } from './loyalty_point/loyalty_point.module';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [
    ClientsModule.register([USER_SERVICE, PRODUCT_SERVICE]),
    UserModule,
    AddressesModule,
    LoyaltyPointModule,
    ProductsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
