// user-service/src/auth/auth.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RpcException } from '@nestjs/microservices';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import admin from './../config/firebase-admin.config';
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async signup(data: {
    email: string;
    password: string;
    name?: string;
    phone?: string;
    address?: string;
  }) {
    try {
      // Kiểm tra email đã tồn tại
      const existingUser = await this.prisma.users.findUnique({
        where: { email: data.email },
      });
      if (existingUser) {
        throw new RpcException({
          statusCode: 400,
          message: 'Email đã được sử dụng',
        });
      }

      // Băm mật khẩu
      const password_hash = await bcrypt.hash(data.password, 10);

      // Tạo người dùng
      const user = await this.prisma.users.create({
        data: {
          email: data.email,
          password_hash,
          name: data.name,
          phone: data.phone,
          address: data.address,
          created_at: new Date(),
        },
      });

      return {
        message: 'Đăng ký thành công',
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      };
    } catch (error) {
      console.error('Error registering user:', error.message);
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        statusCode: 500,
        message: error.message || 'Lỗi hệ thống',
      });
    }
  }

  async login(data: { email: string; password: string }) {
    try {
      // Tìm người dùng
      const user = await this.prisma.users.findUnique({
        where: { email: data.email },
      });
      if (!user) {
        throw new RpcException({
          statusCode: 404,
          message: 'Email hoặc mật khẩu không đúng',
        });
      }

      // Kiểm tra mật khẩu
      const isPasswordValid = await bcrypt.compare(
        data.password,
        user.password_hash,
      );
      if (!isPasswordValid) {
        throw new RpcException({
          statusCode: 400,
          message: 'Email hoặc mật khẩu không đúng',
        });
      }

      // Tạo JWT token
      const token = jwt.sign(
        { sub: user.id, email: user.email, role: user.is_admin },
        this.configService.get<string>('JWT_SECRET') || 'your_jwt_secret',
        { expiresIn: '200h' },
      );

      return {
        message: 'Đăng nhập thành công',
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          token,
        },
      };
    } catch (error) {
      console.error('Error logging in:', error.message);
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        statusCode: 500,
        message: error.message || 'Lỗi hệ thống',
      });
    }
  }

  async saveOtp(data: { email: string; otp: string; expires_at: Date }) {
    await this.prisma.users.update({
      where: { email: data.email },
      data: {
        otp_code: data.otp,
        otp_expires_at: data.expires_at,
      },
    });
    return { success: true };
  }
  async changePassword(data: {
    user_id: number;
    currentPassword: string;
    newPassword: string;
  }) {

    const user = await this.prisma.users.findUnique({
      where: { id: data.user_id },
    });

    if (!user)
      throw new RpcException({
        statusCode: 404,
        message: 'User not found',
      });

    const isMatch = await bcrypt.compare(
      data.currentPassword,
      user.password_hash,
    );

    if (!isMatch) {
      throw new RpcException({
        statusCode: 401,
        message: 'Mật khẩu hiện tại không đúng',
      });
    }

    const hashed = await bcrypt.hash(data.newPassword, 10);

    await this.prisma.users.update({
      where: { id: data.user_id },
      data: { password_hash: hashed },
    });

    return { message: 'Đổi mật khẩu thành công' };
  }

  async getUserByEmail(email: string) {
    const user = await this.prisma.users.findUnique({ where: { email } });
    return { data: user || null };
  }
  async verifyOtp(data: { email: string; otp: string }) {
    const user = await this.prisma.users.findUnique({
      where: { email: data.email },
    });

    if (!user)
      throw new RpcException({ statusCode: 404, message: 'User not found' });
    if (!user.otp_code || !user.otp_expires_at) {
      throw new RpcException({ statusCode: 400, message: 'Không có OTP' });
    }
    if (user.otp_expires_at < new Date()) {
      throw new RpcException({ statusCode: 400, message: 'OTP đã hết hạn' });
    }
    if (user.otp_code !== data.otp) {
      throw new RpcException({ statusCode: 400, message: 'OTP không đúng' });
    }

    return { valid: true };
  }

  // Hàm 2: Cập nhật mật khẩu (không kiểm tra OTP nữa)
  async resetPassword(data: { email: string; new_password: string }) {
    const user = await this.prisma.users.findUnique({
      where: { email: data.email },
    });

    if (!user)
      throw new RpcException({ statusCode: 404, message: 'User not found' });

    // Optional: Kiểm tra OTP còn tồn tại → đảm bảo đã verify
    if (!user.otp_code) {
      throw new RpcException({ statusCode: 400, message: 'Chưa xác minh OTP' });
    }
    const hashed = await bcrypt.hash(data.new_password, 10);

    await this.prisma.users.update({
      where: { email: data.email },
      data: {
        password_hash: hashed,
        otp_code: null,
        otp_expires_at: null,
      },
    });

    return { message: 'Đặt lại mật khẩu thành công' };
  }
  async verifySocialLogin(idToken: string) {
    // 1️⃣ Verify token với Firebase
    const decoded = await admin.auth().verifyIdToken(idToken);
    const { uid, email, name, picture, firebase } = decoded;
    const provider = firebase.sign_in_provider; // 'google.com' hoặc 'facebook.com'

    // 2️⃣ Tìm user trong DB
    let user = await this.prisma.users.findUnique({ where: { email } });

    // 3️⃣ Nếu chưa có → tạo mới
    if (!user) {
      user = await this.prisma.users.create({
        data: {
          email,
          name,
          password_hash: '',
          avatar_url: picture,
          social_id: uid,
          social_provider: provider.includes('google') ? 'google' : 'facebook',
          is_email_verified: true,
        },
      });
    }

    // 4️⃣ Tạo JWT của bạn
    const payload = { id: user.id, email: user.email, role: 'user' };
    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.is_admin },
      this.configService.get<string>('JWT_SECRET') || 'your_jwt_secret',
      { expiresIn: '200h' },
    );

    // 5️⃣ Trả về
    return {
      message: 'Đăng nhập thành công',
      data: { user, token },
    };
  }
}
