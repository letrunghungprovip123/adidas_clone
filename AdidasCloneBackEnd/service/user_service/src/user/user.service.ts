import { HttpStatus, Injectable, Res } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { PrismaService } from 'src/prisma/prisma.service';
import { Response } from 'express';
import { UserDTO } from './dto/user.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}
  async handleDemo(
    data: any,
  ): Promise<
    { message: string; data: UserDTO[] } | { message: string; error: string }
  > {
    try {
      const users = await this.prisma.users.findMany();

      return {
        message: 'Lấy user thành công',
        data: users,
      };
    } catch (error) {
      console.error('Error fetching users:', error.message);

      return {
        message: 'Lỗi server',
        error: error.message,
      };
    }
  }

  async getUserID(id: number) {
    try {
      let checkUser = await this.prisma.users.findFirst({
        where: { id },
      });
      if (!checkUser)
        throw new RpcException({ statusCode: 404, message: 'User ko tồn tại' });
      return {
        message: 'Lấy user thành công',
        data: checkUser,
      };
    } catch (error) {
      console.error('Error:', error);
      // Nếu error đã là RpcException chứa statusCode, giữ nguyên
      if (error instanceof RpcException) {
        throw error;
      }
      // Mặc định lỗi server
      throw new RpcException({
        statusCode: 500,
        message: error.message || 'Lỗi hệ thống',
      });
    }
  }
  async createUser(
    data: CreateUserDto,
  ): Promise<
    { message: string; data: UserDTO } | { message: string; error: string }
  > {
    try {
      console.log('data nèe', data);
      const {
        email,
        password_hash,
        name,
        avatar_url,
        phone,
        address,
        is_email_verified,
        is_admin,
        created_at,
      } = data;
      console.log(email);
      const user = await this.prisma.users.create({
        data: {
          email,
          password_hash,
          name,
          avatar_url,
          phone,
          address,
          is_email_verified,
          is_admin,
          created_at: created_at ? new Date(created_at) : undefined,
        },
      });
      return {
        message: 'Tạo user thành công',
        data: user,
      };
    } catch (error) {
      console.error('Error fetching users:', error.message);

      return {
        message: 'Lỗi server',
        error: error.message,
      };
    }
  }

  async updateUser(
    user: CreateUserDto,
    id: number,
  ): Promise<
    { message: string; data: UserDTO } | { message: string; error: string }
  > {
    try {
      let checkUser = await this.prisma.users.findFirst({
        where: { id: id },
      });
      if (!checkUser)
        throw new RpcException({ statusCode: 404, message: 'User ko tồn tại' });
      let updateUser = await this.prisma.users.update({
        data: { ...user },
        where: { id: id },
      });
      return {
        message: 'update user thành công',
        data: updateUser,
      };
    } catch (error) {
      console.error('Error:', error);
      // Nếu error đã là RpcException chứa statusCode, giữ nguyên
      if (error instanceof RpcException) {
        throw error;
      }
      // Mặc định lỗi server
      throw new RpcException({
        statusCode: 500,
        message: error.message || 'Lỗi hệ thống',
      });
    }
  }

  async deleteUser(id: number) {
    console.log(id);
    try {
      let checkUser = await this.prisma.users.findFirst({
        where: { id: id },
      });
      if (!checkUser)
        throw new RpcException({
          statusCode: 404,
          message: 'User ko tồn tại',
        });
      await this.prisma.users.delete({
        where: { id: id },
      });
      return { message: 'Xoá user thành công' };
    } catch (error) {
      console.error('Error:', error);
      // Nếu error đã là RpcException chứa statusCode, giữ nguyên
      if (error instanceof RpcException) {
        throw error;
      }
      // Mặc định lỗi server
      throw new RpcException({
        statusCode: 500,
        message: error.message || 'Lỗi hệ thống',
      });
    }
  }
}
