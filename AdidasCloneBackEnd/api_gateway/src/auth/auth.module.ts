import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ClientsModule } from '@nestjs/microservices';
import { USER_SERVICE } from 'src/config/rabbitmq-client.config';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from 'src/strategy/jwt.stragety';
import { EmailModule } from 'src/email/email.module';
import { EmailService } from 'src/email/email.service';

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
    EmailModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, EmailService],
})
export class AuthModule {}
