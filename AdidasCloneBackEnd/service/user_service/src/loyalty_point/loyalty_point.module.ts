import { Module } from '@nestjs/common';
import { LoyaltyPointService } from './loyalty_point.service';
import { LoyaltyPointController } from './loyalty_point.controller';
import { Prisma } from '@prisma/client';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  controllers: [LoyaltyPointController],
  providers: [LoyaltyPointService],
  imports: [PrismaModule],
})
export class LoyaltyPointModule {}
