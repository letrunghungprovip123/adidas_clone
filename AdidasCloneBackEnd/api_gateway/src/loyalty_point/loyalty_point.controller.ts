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
} from '@nestjs/common';
import { LoyaltyPointService } from './loyalty_point.service';
import { CreateLoyaltyPointDto } from './dto/create-loyalty_point.dto';
import { UpdateLoyaltyPointDto } from './dto/update-loyalty_point.dto';
import { ClientProxy } from '@nestjs/microservices';
import { RMQ_PATTERN_LOYALTY_POINT } from 'src/common/constants/rmq.pattern';
import { lastValueFrom } from 'rxjs';

@Controller('loyalty-point')
export class LoyaltyPointController {
  constructor(
    @Inject('USER_SERVICE') private readonly loyaltyPointService: ClientProxy,
  ) {}

  @Get('getLoyalty')
  async getLoyalty() {
    try {
      let result = await lastValueFrom(
        this.loyaltyPointService.send(
          { cmd: RMQ_PATTERN_LOYALTY_POINT.GET_LOYALTY },
          {},
        ),
      );
      return result;
    } catch (error) {
      console.error('Service error:', error);
      throw new InternalServerErrorException('User service failed');
    }
  }

  @Post('createLoyalty')
  async createLoyalty(@Body() data: any) {
    try {
      const result = await lastValueFrom(
        this.loyaltyPointService.send(
          { cmd: RMQ_PATTERN_LOYALTY_POINT.CREATE_LOYALTY },
          data,
        ),
      );
      return result;
    } catch (error) {
      console.error('Service error:', error);
      throw new InternalServerErrorException('User service failed');
    }
  }

  @Put('updateLoyalty/:id')
  async updateLoyalty(@Param('id') id: number, @Body() data: any) {
    try {
      const result = await lastValueFrom(
        this.loyaltyPointService.send(
          {
            cmd: RMQ_PATTERN_LOYALTY_POINT.UPDATE_LOYALTY,
          },
          { id, data },
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

  @Delete('deleteLoyalty/:id')
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
