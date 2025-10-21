import { Module } from '@nestjs/common';
import { AddressesService } from './addresses.service';
import { AddressesController } from './addresses.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  controllers: [AddressesController],
  providers: [AddressesService],
  imports: [PrismaModule],
})
export class AddressesModule {}
