import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Inject,
  InternalServerErrorException,
  Put,
  BadRequestException,
  NotFoundException,
  UseGuards,
  Request,
} from '@nestjs/common';
import { LoyaltyPointService } from './loyalty_point.service';
import { CreateLoyaltyPointDto } from './dto/create-loyalty_point.dto';
import { UpdateLoyaltyPointDto } from './dto/update-loyalty_point.dto';
import { ClientProxy } from '@nestjs/microservices';
import { RMQ_PATTERN_LOYALTY_POINT } from 'src/common/constants/rmq.pattern';
import { lastValueFrom } from 'rxjs';
import { JwtAuthGuard } from 'src/strategy/jwt-auth.guard';

@Controller('loyalty-point')
export class LoyaltyPointController {
  constructor(
    @Inject('USER_SERVICE') private readonly loyaltyPointService: ClientProxy,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMyLoyalty(@Request() req) {
    try {
      const userId = req.user.id;
      const result = await lastValueFrom(
        this.loyaltyPointService.send(
          { cmd: RMQ_PATTERN_LOYALTY_POINT.GET_LOYALTY },
          { user_id: userId }, // gửi user_id đến service
        ),
      );
      return result;
    } catch (error) {
      console.error('Service error:', error);
      throw new InternalServerErrorException('User service failed');
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async createLoyalty(@Body() body: any, @Request() req) {
    try {
      const result = await lastValueFrom(
        this.loyaltyPointService.send(
          { cmd: RMQ_PATTERN_LOYALTY_POINT.CREATE_LOYALTY },
          { user_id: req.user.id, body },
        ),
      );
      return result;
    } catch (error) {
      console.error('Service error:', error);
      throw new InternalServerErrorException('User service failed');
    }
  }

  @UseGuards(JwtAuthGuard)
  @Patch()
  async updateMyLoyalty(@Body() body: any, @Request() req) {
    try {
      const userId = req.user.id;
      const result = await lastValueFrom(
        this.loyaltyPointService.send(
          { cmd: RMQ_PATTERN_LOYALTY_POINT.UPDATE_LOYALTY },
          { user_id: userId, data: body },
        ),
      );
      return result;
    } catch (error) {
      console.error('Service error:', error);
      if (error && typeof error === 'object' && error.statusCode) {
        switch (error.statusCode) {
          case 400:
            throw new BadRequestException(error.message);
          case 404:
            throw new NotFoundException(error.message);
          default:
            throw new InternalServerErrorException(error.message);
        }
      }
      throw new InternalServerErrorException('User service failed');
    }
  }

  @Delete()
  async deleteLoyalty(@Param('id') id: number) {
    try {
      const result = await lastValueFrom(
        this.loyaltyPointService.send(
          { cmd: RMQ_PATTERN_LOYALTY_POINT.DELETE_LOYALTY },
          id,
        ),
      );
      return result;
    } catch (error) {
      if (error && typeof error === 'object' && error.statusCode) {
        switch (error.statusCode) {
          case 400:
            throw new BadRequestException(error.message);
          case 404:
            throw new NotFoundException(error.message);
          // các trường hợp khác nếu cần
          default:
            throw new InternalServerErrorException(error.message);
        }
      }

      throw new InternalServerErrorException('User service failed');
    }
  }
}
