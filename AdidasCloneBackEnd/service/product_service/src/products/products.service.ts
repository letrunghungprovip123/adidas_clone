import { Injectable } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async getProducts() {
    try {
      const products = await this.prisma.products.findMany({
        include: {
          product_images: true,
          product_variants: true,
        },
      });
      return {
        message: 'Lấy products thành công',
        data: products,
      };
    } catch (error) {
      console.error('Error fetching users:', error.message);

      return {
        message: 'Lỗi server',
        error: error.message,
      };
    }
  }

  async getProductID(id: any) {
    try {
      const product = await this.prisma.products.findFirst({
        where: { id },
      });
      if (!product)
        throw new RpcException({
          statusCode: 404,
          message: 'Product ko tồn tại',
        });
      return {
        message: 'Lấy product thành công',
        data: product,
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

  async createProduct(data: any) {
    try {
      const product = await this.prisma.products.create({
        data,
      });
      return {
        message: 'Tạo products thành công',
        data: product,
      };
    } catch (error) {
      console.error('Error fetching users:', error.message);

      return {
        message: 'Lỗi server',
        error: error.message,
      };
    }
  }

  async updateProduct(id: number, product: any) {
    try {
      let checkId = await this.prisma.products.findFirst({
        where: {
          id,
        },
      });
      if (!checkId)
        throw new RpcException({
          statusCode: 404,
          message: 'Product ko tồn tại',
        });
      const result = await this.prisma.products.update({
        data: { ...product },
        where: { id },
      });
      return {
        message: 'Update products thành công',
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

  async deleteProduct(id: number) {
    try {
      let checkId = await this.prisma.products.findFirst({
        where: {
          id: id,
        },
      });
      if (!checkId)
        throw new RpcException({
          statusCode: 404,
          message: 'Product ko tồn tại',
        });
      await this.prisma.products.delete({
        where: { id },
      });
      return {
        message: 'Xoá products thành công',
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

  async createProductVariant(data: any) {
    try {
      let checkProduct = await this.prisma.products.findFirst({
        where: { id: data.product_id },
      });
      if (!checkProduct)
        throw new RpcException({
          statusCode: 404,
          message: 'Product ko tồn tại',
        });

      let result = await this.prisma.product_variants.create({
        data,
      });
      return {
        message: 'Thêm products_variant thành công',
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
}
