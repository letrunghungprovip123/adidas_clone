import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { ClientsModule } from '@nestjs/microservices';
import { USER_SERVICE } from 'src/config/rabbitmq-client.config';

@Module({
  imports: [ClientsModule.register([USER_SERVICE])],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
