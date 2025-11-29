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
  HttpException,
} from '@nestjs/common';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { RMQ_PATTERN_ADDRESS } from 'src/common/constants/rmq.pattern';
import { AddressDTO } from './dto/address.dto';

@Controller('addresses')
export class AddressesController {
  constructor(
    @Inject('USER_SERVICE') private readonly userServiceClient: ClientProxy,
  ) { }

  @Get('addresses')
  async getAddresses(): Promise<AddressDTO> {
    try {
      return await lastValueFrom(
        this.userServiceClient.send(
          { cmd: RMQ_PATTERN_ADDRESS.GET_ADDRESSES },
          {},
        ),
      );
    } catch (error) {
      console.error('RMQ error:', error);

      // Kiểm tra lỗi từ microservice (RpcException)
      if (error?.statusCode) {
        throw new HttpException(error.message, error.statusCode);
      }

      throw new InternalServerErrorException('Lỗi khi gọi user service');
    }
  }

  @Post('addresses')
  async createAddresses(@Body() dto: CreateAddressDto) {
    try {
      return await lastValueFrom(
        this.userServiceClient.send(
          { cmd: RMQ_PATTERN_ADDRESS.POST_ADDRESS },
          dto,
        ),
      );
    } catch (error) {
      if (error?.statusCode) {
        throw new HttpException(error.message, error.statusCode);
      }

      throw new InternalServerErrorException('User service failed');
    }
  }


  @Put('addresses/:id')
  async updateAddresses(
    @Param('id') id: number,
    @Body() dto: UpdateAddressDto,
  ) {
    try {
      return await lastValueFrom(
        this.userServiceClient.send(
          { cmd: RMQ_PATTERN_ADDRESS.UPDATE_ADDRESS },
          { id, dto },
        ),
      );
    } catch (error) {
      if (error?.statusCode) {
        throw new HttpException(error.message, error.statusCode);
      }

      throw new InternalServerErrorException('User service failed');
    }
  }


  @Delete('deleteAddresses/:id')
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
