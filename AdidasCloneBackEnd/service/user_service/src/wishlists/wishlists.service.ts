// user-service/src/wishlists/wishlists.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class WishlistsService {
  constructor(private readonly prisma: PrismaService) {}

  async addWishlist(data: { user_id: number; product_id: number }) {
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

      // Kiểm tra product_id tồn tại
      const product = await this.prisma.products.findUnique({
        where: { id: data.product_id },
      });
      if (!product) {
        throw new RpcException({
          statusCode: 404,
          message: 'Sản phẩm không tồn tại',
        });
      }

      // Kiểm tra xem sản phẩm đã có trong danh sách yêu thích chưa
      const existingWishlist = await this.prisma.wishlists.findUnique({
        where: {
          user_id_product_id: {
            user_id: data.user_id,
            product_id: data.product_id,
          },
        },
      });
      if (existingWishlist) {
        throw new RpcException({
          statusCode: 400,
          message: 'Sản phẩm đã có trong danh sách yêu thích',
        });
      }

      const wishlist = await this.prisma.wishlists.create({
        data: {
          user_id: data.user_id,
          product_id: data.product_id,
          created_at: new Date(),
        },
        include: { products: true }, // Join để trả về thông tin sản phẩm
      });

      return {
        message: 'Thêm sản phẩm vào danh sách yêu thích thành công',
        data: wishlist,
      };
    } catch (error) {
      console.error('Error adding wishlist:', error.message);
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        statusCode: 500,
        message: error.message || 'Lỗi hệ thống',
      });
    }
  }

  async getWishlists(user_id: number) {
    try {
      // Kiểm tra user_id tồn tại
      const user = await this.prisma.users.findUnique({
        where: { id: user_id },
      });
      if (!user) {
        throw new RpcException({
          statusCode: 404,
          message: 'Người dùng không tồn tại',
        });
      }

      const wishlists = await this.prisma.wishlists.findMany({
        where: { user_id },
        include: {
          products: {
            include: {
              product_images: true, // include bảng product_images liên kết với product
            },
          },
        },
      });
      return {
        message: 'Lấy danh sách yêu thích thành công',
        data: wishlists,
      };
    } catch (error) {
      console.error('Error fetching wishlists:', error.message);
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        statusCode: 500,
        message: error.message || 'Lỗi hệ thống',
      });
    }
  }

  async removeWishlist(data: { user_id: number; product_id: number }) {
    try {
      // Kiểm tra wishlist tồn tại
      const wishlist = await this.prisma.wishlists.findUnique({
        where: {
          user_id_product_id: {
            user_id: data.user_id,
            product_id: data.product_id,
          },
        },
      });
      if (!wishlist) {
        throw new RpcException({
          statusCode: 404,
          message: 'Sản phẩm không có trong danh sách yêu thích',
        });
      }

      await this.prisma.wishlists.delete({
        where: {
          user_id_product_id: {
            user_id: data.user_id,
            product_id: data.product_id,
          },
        },
      });

      return {
        message: 'Xóa sản phẩm khỏi danh sách yêu thích thành công',
        data: null,
      };
    } catch (error) {
      console.error('Error removing wishlist:', error.message);
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
