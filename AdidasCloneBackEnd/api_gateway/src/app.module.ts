import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import {
  ORDER_SERVICE,
  PRODUCT_SERVICE,
  USER_SERVICE,
} from './config/rabbitmq-client.config';
import { UserModule } from './user/user.module';
import { AddressesModule } from './addresses/addresses.module';
import { LoyaltyPointModule } from './loyalty_point/loyalty_point.module';
import { ProductsModule } from './products/products.module';
import { ReviewsModule } from './reviews/reviews.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { WishlistsModule } from './wishlists/wishlists.module';
import { DiscountsModule } from './discounts/discounts.module';
import { OrdersModule } from './orders/orders.module';
import { EmailModule } from './email/email.module';
import { CategoriesModule } from './categories/categories.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ClientsModule.register([USER_SERVICE, PRODUCT_SERVICE, ORDER_SERVICE]),
    UserModule,
    AddressesModule,
    LoyaltyPointModule,
    ProductsModule,
    ReviewsModule,
    AuthModule,
    WishlistsModule,
    DiscountsModule,
    OrdersModule,
    EmailModule,
    CategoriesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
