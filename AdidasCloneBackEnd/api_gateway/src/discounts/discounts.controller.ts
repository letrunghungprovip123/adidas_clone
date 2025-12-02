// api-gateway/src/discounts/discounts.controller.ts
import {
  Controller,
  Post,
  Get,
  Delete,
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
import { RMQ_PATTERN_DISCOUNTS } from '../common/constants/rmq.pattern';
import { JwtAuthGuard } from '../strategy/jwt-auth.guard';
import { AdminGuard } from '../strategy/admin.guard';
import { ApplyDiscountDto } from './dto/apply-discount.dto';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';

@Controller('discounts')
export class DiscountsController {
  constructor(
    @Inject('ORDER_SERVICE') private readonly orderServiceClient: ClientProxy,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('apply')
  async applyDiscount(@Request() req, @Body() data: ApplyDiscountDto) {
    try {
      const result = await lastValueFrom(
        this.orderServiceClient.send(
          { cmd: RMQ_PATTERN_DISCOUNTS.APPLY_DISCOUNT },
          { user_id: req.user.id, ...data },
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

  // @UseGuards(JwtAuthGuard)
  @Get()
  async getDiscounts() {
    try {
      const result = await lastValueFrom(
        this.orderServiceClient.send(
          { cmd: RMQ_PATTERN_DISCOUNTS.GET_DISCOUNTS },
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

  // @UseGuards(JwtAuthGuard)
  @Get(':code')
  async getDiscountByCode(@Param('code') code: string) {
    try {
      const result = await lastValueFrom(
        this.orderServiceClient.send(
          { cmd: RMQ_PATTERN_DISCOUNTS.GET_DISCOUNT_BY_CODE },
          code,
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
  @Post()
  async createDiscount(@Body() data: CreateDiscountDto) {
    try {
      const result = await lastValueFrom(
        this.orderServiceClient.send(
          { cmd: RMQ_PATTERN_DISCOUNTS.CREATE_DISCOUNT },
          data,
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
  @Patch(':id')
  async updateDiscount(
    @Param('id') id : number,
    @Body() data: UpdateDiscountDto,
  ) {
    try {
      const result = await lastValueFrom(
        this.orderServiceClient.send(
          { cmd: RMQ_PATTERN_DISCOUNTS.UPDATE_DISCOUNT },
          { id, ...data },
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
  @Delete(':id')
  async deleteDiscount(@Param('id') id: number) {
    try {
      const result = await lastValueFrom(
        this.orderServiceClient.send(
          { cmd: RMQ_PATTERN_DISCOUNTS.DELETE_DISCOUNT },
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
}
