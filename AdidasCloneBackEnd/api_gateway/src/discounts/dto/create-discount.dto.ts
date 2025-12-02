import {
  IsString,
  IsNumber,
  IsInt,
  IsDateString,
  IsBoolean,
  IsIn,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDiscountDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsIn(['percent', 'fixed'])
  @IsNotEmpty()
  discount_type: string;

  // ✅ Convert "25" → 25 nếu transform bật
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  value: number;

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  min_order_amount: number;

  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  usage_limit: number;

  @IsDateString()
  @IsNotEmpty()
  valid_from: string;

  @IsDateString()
  @IsNotEmpty()
  valid_to: string;

  @IsBoolean()
  @Type(() => Boolean)
  is_active: boolean;
}
