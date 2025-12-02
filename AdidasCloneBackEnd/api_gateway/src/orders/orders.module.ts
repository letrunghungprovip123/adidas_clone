import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
import { ORDER_SERVICE } from 'src/config/rabbitmq-client.config';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from 'src/strategy/jwt.stragety';
import { AdminGuard } from 'src/strategy/admin.guard';
import { EmailModule } from 'src/email/email.module';
import { EmailService } from 'src/email/email.service';

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
    EmailModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, JwtStrategy, AdminGuard, EmailService],
})
export class OrdersModule {}
