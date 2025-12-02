import { Module } from '@nestjs/common';
import { DiscountsService } from './discounts.service';
import { DiscountsController } from './discounts.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
import { ORDER_SERVICE } from 'src/config/rabbitmq-client.config';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from 'src/strategy/jwt-auth.guard';
import { JwtStrategy } from 'src/strategy/jwt.stragety';
import { AdminGuard } from 'src/strategy/admin.guard';

@Module({
  imports: [
    ConfigModule,
    ClientsModule.register([ORDER_SERVICE]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'your_jwt_secret',
        signOptions: { expiresIn: '1h' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [DiscountsController],
  providers: [DiscountsService, JwtStrategy, AdminGuard],
})
export class DiscountsModule {}
