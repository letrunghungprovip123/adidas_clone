// api-gateway/src/auth/dto/reset-password.dto.ts
import { IsString, IsEmail, MinLength, Matches } from 'class-validator';

export class VerifyOtpDto {
  @IsEmail()
  email: string;

  @IsString()
  otp: string;

}
