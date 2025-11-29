import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { RpcException } from '@nestjs/microservices';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) { }

  async getAddresses() {
    try {
      let addresses = await this.prisma.addresses.findMany();
      return {
        message: 'Lấy address thành công',
        data: addresses,
      };
    } catch (error) {
      console.error('Error fetching users:', error.message);

      return {
        message: 'Lỗi server',
        error: error.message,
      };
    }
  }

  async createAddresses(data: CreateAddressDto) {
    try {
      const address = await this.prisma.addresses.create({ data });

      return {
        message: 'Tạo address thành công',
        address,
      };
    } catch (error) {
      // Lỗi khóa ngoại: user_id không tồn tại
      if (error.code === 'P2003') {
        throw new RpcException({
          statusCode: 404,
          message: 'User không tồn tại',
        });
      }

      throw new RpcException({
        statusCode: 500,
        message: error.message || 'Lỗi hệ thống',
      });
    }
  }


  async updateAddresses(id: number, address: UpdateAddressDto) {
    try {
      let checkAddress = await this.prisma.addresses.findFirst({
        where: {
          id,
        },
      });
      if (!checkAddress)
        throw new RpcException({
          statusCode: 404,
          message: 'Address ko tồn tại',
        });
      let checkUser = await this.prisma.users.findFirst({
        where: {
          id: address.user_id,
        },
      });
      if (!checkUser)
        throw new RpcException({
          statusCode: 404,
          message: 'User ko tồn tại',
        });

      let addressResult = await this.prisma.addresses.update({
        data: { ...address },
        where: { id },
      });
      return addressResult;
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

  async deleteAddresses(id: number) {
    try {
      let checkAddress = await this.prisma.addresses.findFirst({
        where: {
          id,
        },
      });
      if (!checkAddress)
        throw new RpcException({
          statusCode: 404,
          message: 'Address ko tồn tại',
        });
      await this.prisma.addresses.delete({
        where: {
          id,
        },
      });
      return {
        message: 'Xoá address thành công',
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
