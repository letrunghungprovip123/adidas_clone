// order-service/src/orders/orders.controller.ts
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { OrdersService } from './orders.service';
import { RMQ_PATTERN_ORDERS } from '../common/constants/rmq.pattern';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @MessagePattern({ cmd: RMQ_PATTERN_ORDERS.CREATE_ORDER })
  async createOrder(
    @Payload()
    data: {
      user_id: number;
      items: { product_variant_id: number; quantity: number; price?: number }[];
      total_amount: number;
      discount_code?: string;
      shipping_address_id: number;
      shipping_cost?: number;
      points_used?: number;
      guest_email?: string;
    },
  ) {
    return this.ordersService.createOrder(data);
  }

  @MessagePattern({ cmd: RMQ_PATTERN_ORDERS.GET_ORDERS })
  async getOrders(@Payload() data: { user_id: number }) {
    return this.ordersService.getOrders(data);
  }

  @MessagePattern({ cmd: RMQ_PATTERN_ORDERS.GET_ORDER_BY_ID })
  async getOrderById(@Payload() data: { user_id: number; order_id: number }) {
    return this.ordersService.getOrderById(data);
  }

  @MessagePattern({ cmd: RMQ_PATTERN_ORDERS.UPDATE_ORDER_STATUS })
  async updateOrderStatus(
    @Payload() data: { user_id: number; order_id: number; status: string },
  ) {
    return this.ordersService.updateOrderStatus(data);
  }
  @MessagePattern({ cmd: 'create_payment_intent' })
  async createPaymentIntent(@Payload() data) {
    return this.ordersService.createPaymentIntent(+data.amount);
  }

  @MessagePattern({ cmd: RMQ_PATTERN_ORDERS.GET_ALL_ORDER })
  async getAllOrder(@Payload() data: any) {
    return this.ordersService.getAllOrder();
  }

  @MessagePattern({ cmd: RMQ_PATTERN_ORDERS.GET_ALL_ORDER_ID })
  async getAllOrderId(@Payload() data: any) {
    return this.ordersService.getAllOrderId(+data);
  }

  @MessagePattern({ cmd: RMQ_PATTERN_ORDERS.GUEST_ORDER })
  async guestOrder(@Payload() data: any) {
    return this.ordersService.guestOrder(data)
  }
}
