import { IsString, IsNumber } from 'class-validator';

export class ApplyDiscountDto {
  @IsString()
  code: string;

  @IsNumber()
  order_amount: number;
}
