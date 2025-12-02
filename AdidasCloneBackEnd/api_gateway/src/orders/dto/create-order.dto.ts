// api-gateway/src/orders/dto/create-order.dto.ts
import { Type } from 'class-transformer';
import {
  IsNumber,
  IsString,
  IsOptional,
  IsInt,
  IsEmail,
  IsArray,
  ValidateNested,
} from 'class-validator';

class OrderItemDto {
  @IsInt()
  product_variant_id: number;

  @IsInt()
  quantity: number;

  @IsOptional()
  @IsNumber()
  price: number;
}
export class CreateOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsString()
  @IsOptional()
  discount_code?: string;

  @IsInt()
  shipping_address_id: number;

  @IsNumber()
  @IsOptional()
  shipping_cost?: number;

  @IsInt()
  @IsOptional()
  points_used?: number;

  @IsEmail()
  @IsOptional()
  guest_email?: string;
}
