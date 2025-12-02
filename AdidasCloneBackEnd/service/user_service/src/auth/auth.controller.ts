// user-service/src/auth/auth.controller.ts
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import { RMQ_PATTERN_AUTH } from '../common/constants/rmq.pattern';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @MessagePattern({ cmd: RMQ_PATTERN_AUTH.SIGNUP })
  async signup(@Payload() data: any) {
    return this.authService.signup(data);
  }

  @MessagePattern({ cmd: RMQ_PATTERN_AUTH.LOGIN })
  async login(@Payload() data: any) {
    return this.authService.login(data);
  }

  @MessagePattern({ cmd: RMQ_PATTERN_AUTH.CHANGE_PASSWORD })
  async changePassword(@Payload() data: any) {
    // console.log('data:', data);
    return this.authService.changePassword(data);
  }

  @MessagePattern({ cmd: RMQ_PATTERN_AUTH.GET_USER_BY_EMAIL })
  async getUserByEmail(@Payload() email: string) {
    return this.authService.getUserByEmail(email);
  }
  @MessagePattern({ cmd: RMQ_PATTERN_AUTH.SAVE_OTP })
  async saveOtp(@Payload() data: any) {
    return this.authService.saveOtp(data);
  }

  @MessagePattern({ cmd: RMQ_PATTERN_AUTH.VERIFY_OTP })
  async verifyOtp(@Payload() data: any) {
    return this.authService.verifyOtp(data);
  }

  @MessagePattern({ cmd: RMQ_PATTERN_AUTH.RESET_PASSWORD })
  async resetPassword(@Payload() data: any) {
    return this.authService.resetPassword(data);
  }

  @MessagePattern({ cmd: RMQ_PATTERN_AUTH.SOCIAL_LOGIN })
  async socialLogin(@Payload() data: any) {
    return this.authService.verifySocialLogin(data);
  }
}
