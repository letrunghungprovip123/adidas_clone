// product-service/src/reviews/reviews.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async getReviews() {
    try {
      const reviews = await this.prisma.reviews.findMany({
        include: {
          users: true, // Bao gồm thông tin user nếu cần
          products: true, // Bao gồm thông tin product nếu cần
        },
      });
      return {
        message: 'Lấy danh sách đánh giá thành công',
        data: reviews,
      };
    } catch (error) {
      console.error('Error fetching reviews:', error.message);
      return {
        message: 'Lỗi server',
        error: error.message,
      };
    }
  }

  async getReviewById(id: number) {
    try {
      const review = await this.prisma.reviews.findMany({
        where: { product_id: id },
        include: {
          users: true, // Bao gồm thông tin user nếu cần
          products: true, // Bao gồm thông tin product nếu cần
        },
      });
      if (!review) {
        throw new RpcException({
          statusCode: 404,
          message: 'Đánh giá không tồn tại',
        });
      }
      return {
        message: 'Lấy đánh giá thành công',
        data: review,
      };
    } catch (error) {
      console.error('Error:', error);
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        statusCode: 500,
        message: error.message || 'Lỗi hệ thống',
      });
    }
  }

  async createReview(data: {
    user_id: number;
    product_id: number;
    rating: number;
    comment?: string;
  }) {
    try {
      // Kiểm tra ràng buộc
      if (!data.user_id || !data.product_id) {
        throw new RpcException({
          statusCode: 400,
          message: 'user_id và product_id là bắt buộc',
        });
      }
      if (data.rating < 1 || data.rating > 5) {
        throw new RpcException({
          statusCode: 400,
          message: 'Rating phải từ 1 đến 5',
        });
      }

      // Kiểm tra user_id và product_id tồn tại (tùy chọn)
      const user = await this.prisma.users.findFirst({
        where: { id: data.user_id },
      });
      const product = await this.prisma.products.findFirst({
        where: { id: data.product_id },
      });
      if (!user || !product) {
        throw new RpcException({
          statusCode: 400,
          message: 'user_id hoặc product_id không hợp lệ',
        });
      }

      const review = await this.prisma.reviews.create({
        data: {
          user_id: data.user_id,
          product_id: data.product_id,
          rating: data.rating,
          comment: data.comment,
          created_at: new Date(),
        },
      });
      return {
        message: 'Tạo đánh giá thành công',
        data: review,
      };
    } catch (error) {
      console.error('Error creating review:', error.message);
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        statusCode: 500,
        message: error.message || 'Lỗi hệ thống',
      });
    }
  }

  async updateReview(
    id: number,
    data: {
      user_id?: number;
      product_id?: number;
      rating?: number;
      comment?: string;
    },
  ) {
    try {
      // Kiểm tra đánh giá tồn tại
      const checkId = await this.prisma.reviews.findFirst({
        where: { id },
      });
      if (!checkId) {
        throw new RpcException({
          statusCode: 404,
          message: 'Đánh giá không tồn tại',
        });
      }

      // Kiểm tra ràng buộc rating
      if (data.rating && (data.rating < 1 || data.rating > 5)) {
        throw new RpcException({
          statusCode: 400,
          message: 'Rating phải từ 1 đến 5',
        });
      }

      // Kiểm tra user_id và product_id nếu có (tùy chọn)
      if (data.user_id) {
        const user = await this.prisma.users.findFirst({
          where: { id: data.user_id },
        });
        if (!user) {
          throw new RpcException({
            statusCode: 400,
            message: 'user_id không hợp lệ',
          });
        }
      }
      if (data.product_id) {
        const product = await this.prisma.products.findFirst({
          where: { id: data.product_id },
        });
        if (!product) {
          throw new RpcException({
            statusCode: 400,
            message: 'product_id không hợp lệ',
          });
        }
      }

      const result = await this.prisma.reviews.update({
        where: { id },
        data: {
          ...data,
          updated_at: new Date(),
        },
      });
      return {
        message: 'Cập nhật đánh giá thành công',
        data: result,
      };
    } catch (error) {
      console.error('Error:', error);
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        statusCode: 500,
        message: error.message || 'Lỗi hệ thống',
      });
    }
  }

  async deleteReview(id: number) {
    try {
      const checkId = await this.prisma.reviews.findFirst({
        where: { id },
      });
      if (!checkId) {
        throw new RpcException({
          statusCode: 404,
          message: 'Đánh giá không tồn tại',
        });
      }
      await this.prisma.reviews.delete({
        where: { id },
      });
      return {
        message: 'Xóa đánh giá thành công',
      };
    } catch (error) {
      console.error('Error:', error);
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
