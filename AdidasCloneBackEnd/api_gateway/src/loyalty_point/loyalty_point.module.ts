import { Module } from '@nestjs/common';
import { LoyaltyPointService } from './loyalty_point.service';
import { LoyaltyPointController } from './loyalty_point.controller';
import { ClientsModule } from '@nestjs/microservices';
import { USER_SERVICE } from 'src/config/rabbitmq-client.config';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from 'src/strategy/jwt.stragety';

@Module({
  imports: [
    ClientsModule.register([USER_SERVICE]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'your_jwt_secret',
        signOptions: { expiresIn: '1h' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [LoyaltyPointController],
  providers: [LoyaltyPointService,JwtStrategy],
})
export class LoyaltyPointModule {}
