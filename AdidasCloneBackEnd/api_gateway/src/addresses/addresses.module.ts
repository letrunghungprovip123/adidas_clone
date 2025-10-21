import { Module } from '@nestjs/common';
import { AddressesService } from './addresses.service';
import { AddressesController } from './addresses.controller';
import { ClientsModule } from '@nestjs/microservices';
import { USER_SERVICE } from 'src/config/rabbitmq-client.config';

@Module({
  imports: [ClientsModule.register([USER_SERVICE])],
  controllers: [AddressesController],
  providers: [AddressesService],
})
export class AddressesModule {}
