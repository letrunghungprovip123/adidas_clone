import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { UserDTO } from './dto/user.dto';
import { RMQ_PATTERN_USER } from 'src/common/constants/rmq.pattern';

@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {}
  @MessagePattern({ cmd: 'demo_key' })
  async getDemo(
    @Payload() data: any,
  ): Promise<{ message: string; data: UserDTO } | { message: string }> {
    const response = await this.userService.handleDemo(data);
    return response;
  }

  @MessagePattern({cmd :RMQ_PATTERN_USER.GET_USER_ID })
  async getUserID(@Payload() id : any){
    const response = await this.userService.getUserID(+id)
    return response;
  }

  @MessagePattern({ cmd: RMQ_PATTERN_USER.POST_USER })
  async createUser(
    @Payload() data: CreateUserDto,
  ): Promise<{ message: string; data: UserDTO } | { message: string }> {
    console.log({ ...data });
    const response = await this.userService.createUser({ ...data });
    return response;
  }

  @MessagePattern({ cmd: RMQ_PATTERN_USER.UPDATE_USER })
  async updateUser(
    @Payload() data,
  ): Promise<{ message: string; data: UserDTO } | { message: string }> {
    const { user, id } = data;
    const response = await this.userService.updateUser(user, +id);
    return response;
  }

  @MessagePattern({ cmd: RMQ_PATTERN_USER.DELETE_USER })
  async deleteUser(@Payload() data) {
    const reponse = await this.userService.deleteUser(+data);
    return reponse;
  }
}
