import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { LoyaltyPointService } from './loyalty_point.service';
import { CreateLoyaltyPointDto } from './dto/create-loyalty_point.dto';
import { UpdateLoyaltyPointDto } from './dto/update-loyalty_point.dto';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RMQ_PATTERN_LOYALTY_POINT } from 'src/common/constants/rmq.pattern';

@Controller('loyalty-point')
export class LoyaltyPointController {
  constructor(private readonly loyaltyPointService: LoyaltyPointService) {}

  @MessagePattern({ cmd: RMQ_PATTERN_LOYALTY_POINT.GET_LOYALTY })
  async getLoyalty(@Payload() data: any) {
    const { user_id } = data;
    const response = await this.loyaltyPointService.getLoyalty(+user_id);
    return response;
  }

  @MessagePattern({ cmd: RMQ_PATTERN_LOYALTY_POINT.CREATE_LOYALTY })
  async createLoyalty(@Payload() data: any) {
    const { user_id, body } = data;
    const response = await this.loyaltyPointService.createLoyalty(
      user_id,
      body,
    );
    return response;
  }

  @MessagePattern({ cmd: RMQ_PATTERN_LOYALTY_POINT.UPDATE_LOYALTY })
  async updateLoyalty(@Payload() data: any) {
    const { user_id, body } = data;
    return await this.loyaltyPointService.updateLoyalty({
      user_id,
      data: body,
    });
  }

  @MessagePattern({ cmd: RMQ_PATTERN_LOYALTY_POINT.DELETE_LOYALTY })
  async deleteLoyalty(@Payload() data: any) {
    const response = await this.loyaltyPointService.deleteLoyalty(+data);
    return response;
  }
}
