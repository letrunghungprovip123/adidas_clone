// api-gateway/src/auth/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  UseGuards,
  Patch,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { RMQ_PATTERN_AUTH } from '../common/constants/rmq.pattern';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { EmailService } from 'src/email/email.service';
import { JwtAuthGuard } from 'src/strategy/jwt-auth.guard';
import { ChangePasswordDto } from './dto/change-pass.dto';
import { ForgotPasswordDto } from './dto/forgot-pass.dto';
import { VerifyOtpDto } from './dto/reset-pass.dto';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject('USER_SERVICE') private readonly userServiceClient: ClientProxy,
    private readonly emailService: EmailService,
  ) {}

  @Post('signup')
  async signup(
    @Body()
    user: SignupDto,
  ) {
    try {
      const result = await lastValueFrom(
        this.userServiceClient.send({ cmd: RMQ_PATTERN_AUTH.SIGNUP }, user),
      );
      return result;
    } catch (error) {
      console.error('Service error:', error);
      if (error && typeof error === 'object' && 'statusCode' in error) {
        switch (error.statusCode) {
          case 400:
            throw new BadRequestException(error.message);
          case 404:
            throw new NotFoundException(error.message);
          default:
            throw new InternalServerErrorException(error.message);
        }
      }
      throw new InternalServerErrorException('User service failed');
    }
  }

  @Post('login')
  async login(@Body() credentials: LoginDto) {
    try {
      const result = await lastValueFrom(
        this.userServiceClient.send(
          { cmd: RMQ_PATTERN_AUTH.LOGIN },
          credentials,
        ),
      );
      return result;
    } catch (error) {
      console.error('Service error:', error);
      if (error && typeof error === 'object' && 'statusCode' in error) {
        switch (error.statusCode) {
          case 400:
            throw new BadRequestException(error.message);
          case 404:
            throw new NotFoundException(error.message);
          default:
            throw new InternalServerErrorException(error.message);
        }
      }
      throw new InternalServerErrorException('User service failed');
    }
  }
  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  async changePassword(@Request() req, @Body() data: ChangePasswordDto) {
    try {
      // console.log(data);
      const result = await lastValueFrom(
        this.userServiceClient.send(
          { cmd: RMQ_PATTERN_AUTH.CHANGE_PASSWORD },
          { user_id: req.user.id, ...data },
        ),
      );
      return result;
    } catch (error) {
      if (error.statusCode === 400)
        throw new BadRequestException(error.message);
      if (error.statusCode === 401)
        throw new UnauthorizedException(error.message);
      throw error;
    }
  }

  @Post('forgot-password')
  async forgotPassword(@Body() { email }: ForgotPasswordDto) {
    try {
      const userResult = await lastValueFrom(
        this.userServiceClient.send(
          { cmd: RMQ_PATTERN_AUTH.GET_USER_BY_EMAIL },
          email,
        ),
      );
      if (!userResult.data) {
        throw new BadRequestException('Email không tồn tại');
      }

      // Tạo OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 phút
      console.log(userResult);

      // Lưu OTP vào DB
      await lastValueFrom(
        this.userServiceClient.send(
          { cmd: RMQ_PATTERN_AUTH.SAVE_OTP },
          { email, otp, expires_at: expiresAt },
        ),
      );

      // Gửi email
      await this.emailService.sendOTPEmail(email, otp);

      return { message: 'Đã gửi mã OTP đến email' };
    } catch (error) {
      throw new BadRequestException('Gửi email thất bại');
    }
  }

  @Post('verify-otp')
  async verifyOtp(@Body() data: VerifyOtpDto) {
    try {
      const result = await lastValueFrom(
        this.userServiceClient.send({ cmd: RMQ_PATTERN_AUTH.VERIFY_OTP }, data),
      );
      return result; // { valid: true }
    } catch (error) {
      if (error.statusCode === 400)
        throw new BadRequestException(error.message);
      throw error;
    }
  }

  // Cập nhật reset-password: chỉ nhận email + new_password (OTP đã valid ở bước trước)
  @Post('reset-password')
  async resetPassword(@Body() data: { email: string; new_password: string }) {
    try {
      const result = await lastValueFrom(
        this.userServiceClient.send(
          { cmd: RMQ_PATTERN_AUTH.RESET_PASSWORD },
          data,
        ),
      );
      return result;
    } catch (error) {
      if (error.statusCode === 400)
        throw new BadRequestException(error.message);
      throw error;
    }
  }

  @Post('social-login')
  async socalLogin(@Body('idToken') idToken: string) {
    try {
      const result = await lastValueFrom(
        this.userServiceClient.send(
          { cmd: RMQ_PATTERN_AUTH.SOCIAL_LOGIN },
          idToken,
        ),
      );
      return result;
    } catch (error) {
      if (error.statusCode === 400)
        throw new BadRequestException(error.message);
      throw error;
    }
  }
}
