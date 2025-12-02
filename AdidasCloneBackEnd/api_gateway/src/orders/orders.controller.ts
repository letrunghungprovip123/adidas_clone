// api-gateway/src/orders/orders.controller.ts
import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { RMQ_PATTERN_ORDERS } from '../common/constants/rmq.pattern';
import { JwtAuthGuard } from '../strategy/jwt-auth.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order.dto';
import { AdminGuard } from 'src/strategy/admin.guard';
import { EmailService } from 'src/email/email.service';
@Controller('orders')
export class OrdersController {
  constructor(
    @Inject('ORDER_SERVICE') private readonly orderServiceClient: ClientProxy,
    private readonly emailService: EmailService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async createOrder(@Request() req, @Body() data: CreateOrderDto) {
    try {
      const result = await lastValueFrom(
        this.orderServiceClient.send(
          { cmd: RMQ_PATTERN_ORDERS.CREATE_ORDER },
          { user_id: req.user.id, ...data },
        ),
      );

      if (result.data) {
        this.emailService.sendMailOrderSuccess(result.email, result.data);
      }
      return result;
    } catch (error) {
      console.error('Service error:', error);
      if (error && typeof error === 'object' && 'statusCode' in error) {
        switch (error.statusCode) {
          case 400:
            throw new BadRequestException(error.message);
          case 404:
            throw new NotFoundException(error.message);
          default:
            throw new InternalServerErrorException(error.message);
        }
      }
      throw new InternalServerErrorException('Order service failed');
    }
  }

  @Post('guest-checkout')
  async guestCheckout(@Body() body: any) {
    try {
      const result = await lastValueFrom(
        this.orderServiceClient.send(
          { cmd: RMQ_PATTERN_ORDERS.GUEST_ORDER },
          body,
        ),
      );
      return result;
    } catch (error) {
      console.error('Service error:', error);
      if (error && typeof error === 'object' && 'statusCode' in error) {
        switch (error.statusCode) {
          case 400:
            throw new BadRequestException(error.message);
          case 404:
            throw new NotFoundException(error.message);
          default:
            throw new InternalServerErrorException(error.message);
        }
      }
      throw new InternalServerErrorException('Order service failed');
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getOrders(@Request() req) {
    try {
      const result = await lastValueFrom(
        this.orderServiceClient.send(
          { cmd: RMQ_PATTERN_ORDERS.GET_ORDERS },
          { user_id: req.user.id },
        ),
      );
      return result;
    } catch (error) {
      console.error('Service error:', error);
      if (error && typeof error === 'object' && 'statusCode' in error) {
        switch (error.statusCode) {
          case 400:
            throw new BadRequestException(error.message);
          case 404:
            throw new NotFoundException(error.message);
          default:
            throw new InternalServerErrorException(error.message);
        }
      }
      throw new InternalServerErrorException('Order service failed');
    }
  }
  // @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('/all-orders')
  async getAllOrder() {
    try {
      const result = await lastValueFrom(
        this.orderServiceClient.send(
          { cmd: RMQ_PATTERN_ORDERS.GET_ALL_ORDER },
          {},
        ),
      );
      return result;
    } catch (error) {
      console.error('Service error:', error);
      if (error && typeof error === 'object' && 'statusCode' in error) {
        switch (error.statusCode) {
          case 400:
            throw new BadRequestException(error.message);
          case 404:
            throw new NotFoundException(error.message);
          default:
            throw new InternalServerErrorException(error.message);
        }
      }
      throw new InternalServerErrorException('Order service failed');
    }
  }

  // @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('/all-orders/:id')
  async getAllOrderId(@Param('id') id: number) {
    try {
      const result = await lastValueFrom(
        this.orderServiceClient.send(
          { cmd: RMQ_PATTERN_ORDERS.GET_ALL_ORDER_ID },
          id,
        ),
      );
      return result;
    } catch (error) {
      console.error('Service error:', error);
      if (error && typeof error === 'object' && 'statusCode' in error) {
        switch (error.statusCode) {
          case 400:
            throw new BadRequestException(error.message);
          case 404:
            throw new NotFoundException(error.message);
          default:
            throw new InternalServerErrorException(error.message);
        }
      }
      throw new InternalServerErrorException('Order service failed');
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getOrderById(@Request() req, @Param('id') id: string) {
    try {
      const result = await lastValueFrom(
        this.orderServiceClient.send(
          { cmd: RMQ_PATTERN_ORDERS.GET_ORDER_BY_ID },
          { user_id: req.user.id, order_id: parseInt(id) },
        ),
      );
      return result;
    } catch (error) {
      console.error('Service error:', error);
      if (error && typeof error === 'object' && 'statusCode' in error) {
        switch (error.statusCode) {
          case 400:
            throw new BadRequestException(error.message);
          case 404:
            throw new NotFoundException(error.message);
          default:
            throw new InternalServerErrorException(error.message);
        }
      }
      throw new InternalServerErrorException('Order service failed');
    }
  }

  // @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch('/:id/status')
  async updateOrderStatus(
    @Request() req,
    @Param('id') id: string,
    @Body() data: UpdateOrderStatusDto,
  ) {
    try {
      console.log(id);
      const result = await lastValueFrom(
        this.orderServiceClient.send(
          { cmd: RMQ_PATTERN_ORDERS.UPDATE_ORDER_STATUS },
          { user_id: 19, order_id: parseInt(id), status: data.status },
        ),
      );
      return result;
    } catch (error) {
      console.error('Service error:', error);
      if (error && typeof error === 'object' && 'statusCode' in error) {
        switch (error.statusCode) {
          case 400:
            throw new BadRequestException(error.message);
          case 404:
            throw new NotFoundException(error.message);
          default:
            throw new InternalServerErrorException(error.message);
        }
      }
      throw new InternalServerErrorException('Order service failed');
    }
  }
  @Post('/paymentIntent')
  async createPayment(@Body() amount: number) {
    try {
      const result = await lastValueFrom(
        this.orderServiceClient.send({ cmd: 'create_payment_intent' }, amount),
      );
      return result;
    } catch (error) {
      throw new BadRequestException(error.message || 'Tạo thanh toán thất bại');
    }
  }
}
