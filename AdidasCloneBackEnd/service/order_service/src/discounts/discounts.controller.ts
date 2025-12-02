// order-service/src/discounts/discounts.controller.ts
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { DiscountsService } from './discounts.service';
import { RMQ_PATTERN_DISCOUNTS } from '../common/constants/rmq.pattern';

@Controller('discounts')
export class DiscountsController {
  constructor(private readonly discountsService: DiscountsService) {}

  @MessagePattern({ cmd: RMQ_PATTERN_DISCOUNTS.APPLY_DISCOUNT })
  async applyDiscount(
    @Payload() data: { user_id: number; code: string; order_amount: number },
  ) {
    return this.discountsService.applyDiscount(data);
  }

  @MessagePattern({ cmd: RMQ_PATTERN_DISCOUNTS.GET_DISCOUNTS })
  async getDiscounts() {
    return this.discountsService.getDiscounts();
  }

  @MessagePattern({ cmd: RMQ_PATTERN_DISCOUNTS.GET_DISCOUNT_BY_CODE })
  async getDiscountByCode(@Payload() code: string) {
    return this.discountsService.getDiscountByCode(code);
  }

  @MessagePattern({ cmd: RMQ_PATTERN_DISCOUNTS.CREATE_DISCOUNT })
  async createDiscount(
    @Payload()
    data: {
      code: string;
      description: string;
      discount_type: string;
      value: number;
      min_order_amount: number;
      usage_limit: number;
      valid_from: string;
      valid_to: string;
      is_active: boolean;
    },
  ) {
    return this.discountsService.createDiscount(data);
  }

  @MessagePattern({ cmd: RMQ_PATTERN_DISCOUNTS.UPDATE_DISCOUNT })
  async updateDiscount(
    @Payload()
    data: {
      id: number;
      code: string;
      description?: string;
      discount_type?: string;
      value?: number;
      min_order_amount?: number;
      usage_limit?: number;
      valid_from?: string;
      valid_to?: string;
      is_active?: boolean;
    },
  ) {
    return this.discountsService.updateDiscount(data);
  }

  @MessagePattern({ cmd: RMQ_PATTERN_DISCOUNTS.DELETE_DISCOUNT })
  async deleteDiscount(@Payload() id: number) {
    return this.discountsService.deleteDiscount(+id);
  }
}
