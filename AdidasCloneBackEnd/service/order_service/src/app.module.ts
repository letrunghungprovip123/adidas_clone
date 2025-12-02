import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { PrismaModule } from './prisma/prisma.module';
import { DiscountsModule } from './discounts/discounts.module';
import { OrdersModule } from './orders/orders.module';
import { StripeService } from './stripe/stripe.service';
import { StripeModule } from './stripe/stripe.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    PrismaModule,
    DiscountsModule,
    OrdersModule,
    StripeModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService, StripeService],
})
export class AppModule {}
