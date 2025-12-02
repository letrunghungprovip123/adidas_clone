import { Module } from '@nestjs/common';
import { WishlistsService } from './wishlists.service';
import { WishlistsController } from './wishlists.controller';
import { ClientsModule } from '@nestjs/microservices';
import { USER_SERVICE } from 'src/config/rabbitmq-client.config';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from 'src/strategy/jwt.stragety';

@Module({
  imports: [
    ClientsModule.register([USER_SERVICE]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'your_jwt_secret',
        signOptions: { expiresIn: '1h' },
      }),
    }),
  ],
  controllers: [WishlistsController],
  providers: [WishlistsService, JwtStrategy],
})
export class WishlistsModule {}
