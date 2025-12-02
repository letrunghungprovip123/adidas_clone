import {
  IsString,
  IsOptional,
  IsNumber,
  IsInt,
  IsDateString,
  IsBoolean,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateDiscountDto {
  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsIn(['percent', 'fixed'])
  @IsOptional()
  discount_type?: string;

  // ✅ Tự động convert từ string -> number khi transform bật
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  value?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  min_order_amount?: number;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  usage_limit?: number;

  @IsDateString()
  @IsOptional()
  valid_from?: string;

  @IsDateString()
  @IsOptional()
  valid_to?: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
