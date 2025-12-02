// api-gateway/src/products/dto/get-by-category.dto.ts
import { IsInt, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class GetProductsByCategoryDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 12;
}
