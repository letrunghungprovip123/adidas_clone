// api-gateway/src/auth/dto/change-password.dto.ts
import { IsString, MinLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  current_password: string;

  new_password: string;
}
