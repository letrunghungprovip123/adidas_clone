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
  BadRequestException,
  NotFoundException,
  Put,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { RMQ_PATTERN_ADDRESS } from 'src/common/constants/rmq.pattern';
import { AddressDTO } from './dto/address.dto';
import { JwtAuthGuard } from 'src/strategy/jwt-auth.guard';

@Controller('addresses')
export class AddressesController {
  constructor(
    @Inject('USER_SERVICE') private readonly userServiceClient: ClientProxy,
  ) {}

  @Get('getAddresses')
  async getAddresses(): Promise<AddressDTO> {
    try {
      const addressResult = await lastValueFrom(
        this.userServiceClient.send(
          { cmd: RMQ_PATTERN_ADDRESS.GET_ADDRESSES },
          {},
        ),
      );
      return addressResult;
    } catch (error) {
      console.error('Service error:', error);
      throw new InternalServerErrorException('User service failed');
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('byId')
  async getAddressesByUserId(@Request() req: any) {
    try {
      const userId = req.user.id; // LẤY TỪ JWT TOKEN

      const result = await lastValueFrom(
        this.userServiceClient.send(
          { cmd: RMQ_PATTERN_ADDRESS.GET_BY_USER_ID },
          { userId },
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
          default:
            throw new InternalServerErrorException(error.message);
        }
      }
      throw new InternalServerErrorException('User service failed');
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async createAddresses(@Body() address: CreateAddressDto, @Request() req) {
    try {
      console.log('Đã vào');
      const addressResult = await lastValueFrom(
        this.userServiceClient.send(
          { cmd: RMQ_PATTERN_ADDRESS.POST_ADDRESS },
          { address, userId: req.user.id },
        ),
      );
      return addressResult;
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

  @Patch(':id')
  async updateAddresses(
    @Param('id') id: number,
    @Body() address: UpdateAddressDto,
  ) {
    try {
      let addressResult = await lastValueFrom(
        this.userServiceClient.send(
          { cmd: RMQ_PATTERN_ADDRESS.UPDATE_ADDRESS },
          { id, address },
        ),
      );
      return addressResult;
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

  @Delete(':id')
  async deleteAddresses(@Param('id') id: number) {
    try {
      let result = await lastValueFrom(
        this.userServiceClient.send(
          { cmd: RMQ_PATTERN_ADDRESS.DELETE_ADDRESS },
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
