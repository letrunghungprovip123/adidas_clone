import { Global, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AddressesModule } from './addresses/addresses.module';
import { LoyaltyPointModule } from './loyalty_point/loyalty_point.module';
import { AuthModule } from './auth/auth.module';
import { WishlistsModule } from './wishlists/wishlists.module';

@Global()
@Module({
  imports: [
    UserModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AddressesModule,
    LoyaltyPointModule,
    AuthModule,
    WishlistsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
