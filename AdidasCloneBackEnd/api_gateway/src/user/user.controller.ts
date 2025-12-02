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
  ParseIntPipe,
  BadRequestException,
  NotFoundException,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { RMQ_PATTERN_USER } from 'src/common/constants/rmq.pattern';
import { JwtAuthGuard } from 'src/strategy/jwt-auth.guard';

@Controller('users')
export class UserController {
  constructor(
    @Inject('USER_SERVICE') private readonly userServiceClient: ClientProxy,
  ) {}

  @Get()
  async getUser() {
    try {
      const userResult = await lastValueFrom(
        this.userServiceClient.send(
          { cmd: 'demo_key' },
          {
            message: 'Gửi request tới thành công',
          },
        ),
      );
      return userResult;
    } catch (error) {
      console.error('Service error:', error);
      throw new InternalServerErrorException('User service failed');
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('/getById')
  async getUserId(@Request() req) {
    try {
      const result = await lastValueFrom(
        this.userServiceClient.send(
          { cmd: RMQ_PATTERN_USER.GET_USER_ID },
          req.user.id,
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

  @Post()
  async addUser(@Body() user: CreateUserDto) {
    try {
      const result = await lastValueFrom(
        this.userServiceClient.send({ cmd: RMQ_PATTERN_USER.POST_USER }, user),
      );
      return result;
    } catch (error) {
      console.error('Service error:', error);
      throw new InternalServerErrorException('User service failed');
    }
  }

  @Patch(':id')
  async updateUser(
    @Body() user: UpdateUserDto,
    @Param('id', ParseIntPipe) id: number,
  ) {
    try {
      const result = await lastValueFrom(
        this.userServiceClient.send(
          { cmd: RMQ_PATTERN_USER.UPDATE_USER },
          { user, id },
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

  @Delete(':id')
  async deleteUser(@Param('id', ParseIntPipe) id: number) {
    try {
      const result = await lastValueFrom(
        this.userServiceClient.send({ cmd: RMQ_PATTERN_USER.DELETE_USER }, id),
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
