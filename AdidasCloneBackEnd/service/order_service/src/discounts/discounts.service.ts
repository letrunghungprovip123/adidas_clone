// order-service/src/discounts/discounts.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class DiscountsService {
  constructor(private readonly prisma: PrismaService) {}

  async applyDiscount(data: {
    user_id: number;
    code: string;
    order_amount: number;
  }) {
    try {
      // Kiểm tra user_id tồn tại
      const user = await this.prisma.users.findUnique({
        where: { id: data.user_id },
      });
      if (!user) {
        throw new RpcException({
          statusCode: 404,
          message: 'Người dùng không tồn tại',
        });
      }

      // Tìm mã giảm giá
      const discount = await this.prisma.discount_codes.findUnique({
        where: { code: data.code },
      });
      if (!discount) {
        throw new RpcException({
          statusCode: 404,
          message: 'Mã giảm giá không tồn tại',
        });
      }

      // Kiểm tra trạng thái mã
      if (!discount.is_active) {
        throw new RpcException({
          statusCode: 400,
          message: 'Mã giảm giá không hoạt động',
        });
      }

      // Kiểm tra xem người dùng đã sử dụng mã giảm giá này chưa
      const existingOrder = await this.prisma.orders.findFirst({
        where: {
          user_id: data.user_id,
          discount_code_id: discount.id,
        },
      });
      if (existingOrder) {
        throw new RpcException({
          statusCode: 400,
          message: 'Mã giảm giá này đã được bạn sử dụng',
        });
      }

      // Kiểm tra thời gian hợp lệ
      const now = new Date();
      if (discount.valid_from && now < new Date(discount.valid_from)) {
        throw new RpcException({
          statusCode: 400,
          message: 'Mã giảm giá chưa có hiệu lực',
        });
      }
      if (discount.valid_to && now > new Date(discount.valid_to)) {
        throw new RpcException({
          statusCode: 400,
          message: 'Mã giảm giá đã hết hạn',
        });
      }

      // Kiểm tra giới hạn sử dụng
      if (discount.usage_limit && discount.used_count >= discount.usage_limit) {
        throw new RpcException({
          statusCode: 400,
          message: 'Mã giảm giá đã đạt giới hạn sử dụng',
        });
      }

      // Kiểm tra giá trị đơn hàng tối thiểu
      if (
        discount.min_order_amount &&
        data.order_amount < discount.min_order_amount.toNumber()
      ) {
        throw new RpcException({
          statusCode: 400,
          message: `Đơn hàng phải có giá trị tối thiểu ${discount.min_order_amount.toNumber()}`,
        });
      }

      // Kiểm tra discount_type
      if (!['percent', 'fixed'].includes(discount.discount_type)) {
        throw new RpcException({
          statusCode: 400,
          message: 'Loại giảm giá không hợp lệ',
        });
      }

      // Tính giá trị giảm giá
      let discount_amount = 0;
      if (discount.discount_type === 'percent') {
        discount_amount = (data.order_amount * discount.value.toNumber()) / 100;
      } else if (discount.discount_type === 'fixed') {
        discount_amount = discount.value.toNumber();
      }

      // Cập nhật used_count
      await this.prisma.discount_codes.update({
        where: { code: data.code },
        data: { used_count: { increment: 1 } },
      });

      return {
        message: 'Áp dụng mã giảm giá thành công',
        data: {
          code: discount.code,
          discount_amount,
          discount_type: discount.discount_type,
          value: discount.value,
        },
      };
    } catch (error) {
      console.error('Error applying discount:', error.message);
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        statusCode: 500,
        message: error.message || 'Lỗi hệ thống',
      });
    }
  }

  async getDiscounts() {
    try {
      const now = new Date();
      const discounts = await this.prisma.discount_codes.findMany();

      return {
        message: 'Lấy danh sách mã giảm giá thành công',
        data: discounts,
      };
    } catch (error) {
      console.error('Error fetching discounts:', error.message);
      throw new RpcException({
        statusCode: 500,
        message: error.message || 'Lỗi hệ thống',
      });
    }
  }

  async getDiscountByCode(code: string) {
    try {
      const discount = await this.prisma.discount_codes.findUnique({
        where: { code },
      });
      if (!discount) {
        throw new RpcException({
          statusCode: 404,
          message: 'Mã giảm giá không tồn tại',
        });
      }

      // Kiểm tra trạng thái và thời gian hợp lệ
      if (!discount.is_active) {
        throw new RpcException({
          statusCode: 400,
          message: 'Mã giảm giá không hoạt động',
        });
      }
      const now = new Date();
      if (discount.valid_from && now < new Date(discount.valid_from)) {
        throw new RpcException({
          statusCode: 400,
          message: 'Mã giảm giá chưa có hiệu lực',
        });
      }
      if (discount.valid_to && now > new Date(discount.valid_to)) {
        throw new RpcException({
          statusCode: 400,
          message: 'Mã giảm giá đã hết hạn',
        });
      }

      return {
        message: 'Lấy thông tin mã giảm giá thành công',
        data: discount,
      };
    } catch (error) {
      console.error('Error fetching discount:', error.message);
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        statusCode: 500,
        message: error.message || 'Lỗi hệ thống',
      });
    }
  }

  async createDiscount(data: {
    code: string;
    description: string;
    discount_type: string;
    value: number;
    min_order_amount: number;
    usage_limit: number;
    valid_from: string;
    valid_to: string;
    is_active: boolean;
  }) {
    try {
      // Kiểm tra mã giảm giá đã tồn tại
      const existingDiscount = await this.prisma.discount_codes.findUnique({
        where: { code: data.code },
      });
      if (existingDiscount) {
        throw new RpcException({
          statusCode: 400,
          message: 'Mã giảm giá đã tồn tại',
        });
      }

      // Kiểm tra discount_type
      if (!['percent', 'fixed'].includes(data.discount_type)) {
        throw new RpcException({
          statusCode: 400,
          message: 'Loại giảm giá không hợp lệ, phải là "percent" hoặc "fixed"',
        });
      }

      const newDiscount = await this.prisma.discount_codes.create({
        data: {
          code: data.code,
          description: data.description,
          discount_type: data.discount_type,
          value: data.value,
          min_order_amount: data.min_order_amount,
          usage_limit: data.usage_limit,
          valid_from: new Date(data.valid_from),
          valid_to: new Date(data.valid_to),
          is_active: data.is_active,
          used_count: 0,
        },
      });

      return {
        message: 'Tạo mã giảm giá thành công',
        data: newDiscount,
      };
    } catch (error) {
      console.error('Error creating discount:', error.message);
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        statusCode: 500,
        message: error.message || 'Lỗi hệ thống',
      });
    }
  }

  async updateDiscount(data: {
    id: number;
    code: string;
    description?: string;
    discount_type?: string;
    value?: number;
    min_order_amount?: number;
    usage_limit?: number;
    valid_from?: string;
    valid_to?: string;
    is_active?: boolean;
  }) {
    try {
      const discount = await this.prisma.discount_codes.findUnique({
        where: { id: data.id },
      });
      if (!discount) {
        throw new RpcException({
          statusCode: 404,
          message: 'Mã giảm giá không tồn tại',
        });
      }

      // Kiểm tra discount_type nếu được cung cấp
      if (
        data.discount_type &&
        !['percent', 'fixed'].includes(data.discount_type)
      ) {
        throw new RpcException({
          statusCode: 400,
          message: 'Loại giảm giá không hợp lệ, phải là "percent" hoặc "fixed"',
        });
      }

      const updatedDiscount = await this.prisma.discount_codes.update({
        where: { id: data.id },
        data: {
          code: data.code,
          description: data.description,
          discount_type: data.discount_type,
          value: data.value,
          min_order_amount: data.min_order_amount,
          usage_limit: data.usage_limit,
          valid_from: data.valid_from ? new Date(data.valid_from) : undefined,
          valid_to: data.valid_to ? new Date(data.valid_to) : undefined,
          is_active: data.is_active,
        },
      });

      return {
        message: 'Cập nhật mã giảm giá thành công',
        data: updatedDiscount,
      };
    } catch (error) {
      console.error('Error updating discount:', error.message);
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        statusCode: 500,
        message: error.message || 'Lỗi hệ thống',
      });
    }
  }

  async deleteDiscount(id: number) {
    try {
      const discount = await this.prisma.discount_codes.findUnique({
        where: { id },
      });
      if (!discount) {
        throw new RpcException({
          statusCode: 404,
          message: 'Mã giảm giá không tồn tại',
        });
      }

      await this.prisma.discount_codes.delete({
        where: { id },
      });

      return {
        message: 'Xóa mã giảm giá thành công',
        data: null,
      };
    } catch (error) {
      console.error('Error deleting discount:', error.message);
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        statusCode: 500,
        message: error.message || 'Lỗi hệ thống',
      });
    }
  }
}
