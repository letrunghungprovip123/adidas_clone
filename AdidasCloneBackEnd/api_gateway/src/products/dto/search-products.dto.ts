// api-gateway/src/products/dto/search-products.dto.ts
import { IsString, IsOptional, IsInt, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchProductsDto {
  @IsString()
  q: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  limit?: number = 12;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  category_id?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  price_min?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  price_max?: number;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  gender?: string;
}
