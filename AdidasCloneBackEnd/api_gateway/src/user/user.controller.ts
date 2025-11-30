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
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { RMQ_PATTERN_USER } from 'src/common/constants/rmq.pattern';

@Controller('user')
export class UserController {
  constructor(
    @Inject('USER_SERVICE') private readonly userServiceClient: ClientProxy,
  ) { }

  @Get('getUsers')
  async getUser() {
    try {
      return await lastValueFrom<any>(
        this.userServiceClient.send(
          { cmd: 'demo_key' },
          { message: 'Gửi request tới thành công' }
        )
      );
    } catch (error) {
      console.error('User service error:', error);
      throw new InternalServerErrorException('User service failed');
    }
  }

  @Get('getUserId/:id')
  async getUserId(@Param('id', ParseIntPipe) id: number) {
    try {
      return await lastValueFrom(
        this.userServiceClient.send(
          { cmd: RMQ_PATTERN_USER.GET_USER_ID },
          id
        )
      );
    } catch (error: any) {
      const map = {
        400: BadRequestException,
        404: NotFoundException,
      };

      if (error?.statusCode && map[error.statusCode]) {
        throw new map[error.statusCode](error.message);
      }

      throw new InternalServerErrorException('User service failed');
    }
  }


  @Post('addUser')
  async addUser(@Body() user: CreateUserDto) {
    try {
      return await lastValueFrom<any>(
        this.userServiceClient.send(
          { cmd: RMQ_PATTERN_USER.POST_USER },
          user
        )
      );
    } catch (error) {
      console.error('User service error:', error);
      throw new InternalServerErrorException('User service failed');
    }
  }


  @Put('updateUser/:id')
  async updateUser(
    @Body() user: UpdateUserDto,
    @Param('id', ParseIntPipe) id: number,
  ) {
    try {
      return await lastValueFrom(
        this.userServiceClient.send(
          { cmd: RMQ_PATTERN_USER.UPDATE_USER },
          { user, id }
        )
      );
    } catch (error: any) {
      const map = {
        400: BadRequestException,
        404: NotFoundException,
      };

      if (error?.statusCode && map[error.statusCode]) {
        throw new map[error.statusCode](error.message);
      }

      throw new InternalServerErrorException('User service failed');
    }
  }


  @Delete('deleteUser/:id')
  async deleteUser(@Param('id', ParseIntPipe) id: number) {
    try {
      return await lastValueFrom(
        this.userServiceClient.send(
          { cmd: RMQ_PATTERN_USER.DELETE_USER },
          id
        )
      );
    } catch (error: any) {
      const map = {
        400: BadRequestException,
        404: NotFoundException,
      };

      if (error?.statusCode && map[error.statusCode]) {
        throw new map[error.statusCode](error.message);
      }

      throw new InternalServerErrorException('User service failed');
    }
  }

}
