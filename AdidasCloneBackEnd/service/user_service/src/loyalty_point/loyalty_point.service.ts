import { Injectable } from '@nestjs/common';
import { CreateLoyaltyPointDto } from './dto/create-loyalty_point.dto';
import { UpdateLoyaltyPointDto } from './dto/update-loyalty_point.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class LoyaltyPointService {
  constructor(private readonly prisma: PrismaService) {}

  async getLoyalty(user_id: number) {
    try {
      const loyalty = await this.prisma.loyalty_points.findMany({
        where: { user_id },
      });
      if (!loyalty)
        throw new RpcException({
          statusCode: 404,
          message: 'Loyalty point của user không tồn tại',
        });
      return { message: 'Lấy loyalty point thành công', data: loyalty };
    } catch (error) {
      return {
        message: 'Lỗi server',
        error: error.message,
      };
    }
  }

  async createLoyalty(userId: any, body: any) {
    try {
      let checkUser = await this.prisma.users.findFirst({
        where: { id: userId },
      });
      if (!checkUser)
        throw new RpcException({
          statusCode: 400,
          message: 'User ko tồn tại',
        });
      let result = await this.prisma.loyalty_points.create({
        data: { user_id: userId, points: body.points },
      });
      return { message: 'Tạo loyalty point thành công', data: result };
    } catch (error) {
      return {
        message: 'Lỗi server',
        error: error.message,
      };
    }
  }

  async updateLoyalty({ user_id, data }: { user_id: number; data: any }) {
    try {
      const loyalty = await this.prisma.loyalty_points.findFirst({
        where: { user_id },
      });
      if (!loyalty)
        throw new RpcException({
          statusCode: 404,
          message: 'Loyalty point của user không tồn tại',
        });

      const updated = await this.prisma.loyalty_points.update({
        where: { id: loyalty.id },
        data: { ...data },
      });
      return { message: 'Update loyalty thành công', data: updated };
    } catch (error) {
      return {
        message: 'Lỗi server',
        error: error.message,
      };
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
