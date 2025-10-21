import { Injectable } from '@nestjs/common';
import { CreateLoyaltyPointDto } from './dto/create-loyalty_point.dto';
import { UpdateLoyaltyPointDto } from './dto/update-loyalty_point.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class LoyaltyPointService {
  constructor(private readonly prisma: PrismaService) {}

  async getLoyalty() {
    try {
      let result = await this.prisma.loyalty_points.findMany();
      return {
        message: 'Lấy loyalty point thành công',
        data: result,
      };
    } catch (error) {
      console.error('Error fetching users:', error.message);

      return {
        message: 'Lỗi server',
        error: error.message,
      };
    }
  }

  async createLoyalty(data: any) {
    try {
      console.log(data);
      let result = await this.prisma.loyalty_points.create({
        data,
      });
      return { message: 'Tạo loyalty point thành công', data: result };
    } catch (error) {
      return {
        message: 'Lỗi server',
        error: error.message,
      };
    }
  }

  async updateLoyalty(body: any) {
    try {
      const { id, data } = body;

      let checkID = await this.prisma.loyalty_points.findFirst({
        where: { id: parseInt(id) },
      });
      if (!checkID)
        throw new RpcException({
          statusCode: 404,
          message: 'Id loyalty ko tồn tại',
        });
      let checkUser = await this.prisma.users.findFirst({
        where: { id: data.user_id },
      });
      if (!checkUser)
        throw new RpcException({
          statusCode: 404,
          message: 'User ko tồn tại',
        });
      let result = await this.prisma.loyalty_points.update({
        data: { ...data },
        where: { id: parseInt(id) },
      });
      return {
        message: 'Update loyalty thành công',
        data: result,
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

  async deleteLoyalty(id: any) {
    try {
      let checkID = await this.prisma.loyalty_points.findFirst({
        where: { id: parseInt(id) },
      });
      if (!checkID)
        throw new RpcException({
          statusCode: 404,
          message: 'Id loyalty ko tồn tại',
        });
      await this.prisma.loyalty_points.delete({
        where: { id },
      });
      return { message: 'Xoá loyalty point thành công' };
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
