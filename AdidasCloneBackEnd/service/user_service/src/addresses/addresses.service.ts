import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { RpcException } from '@nestjs/microservices';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

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

  async createAddresses(data: any) {
    try {
      console.log(data);
      let { address, userId } = data;
      let checkUser = await this.prisma.users.findFirst({
        where: {
          id: userId,
        },
      });
      if (!checkUser)
        throw new RpcException({ statusCode: 404, message: 'User ko tồn tại' });

      let addresses = await this.prisma.addresses.create({
        data: {
          user_id: userId,
          phone: address.phone,
          receiver_name: address.receiver_name,
          address_line: address.address_line,
          city: address.city,
          district: address.district,
          is_default: address.is_default || false,
        },
      });
      return {
        message: 'Tạo address thành công',
        address: addresses,
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
  async getAddressesByUserId(userId: number) {
    // Kiểm tra user tồn tại
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new RpcException({
        statusCode: 404,
        message: 'Người dùng không tồn tại',
      });
    }

    const addresses = await this.prisma.addresses.findMany({
      where: { user_id: userId },
      orderBy: { is_default: 'desc' }, // mặc định lên đầu
    });

    return {
      message: 'Lấy địa chỉ thành công',
      data: addresses,
    };
  }
}
