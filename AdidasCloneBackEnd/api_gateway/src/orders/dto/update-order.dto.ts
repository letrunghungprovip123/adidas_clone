// api-gateway/src/orders/dto/update-order-status.dto.ts
import { IsString, IsIn } from 'class-validator';

export class UpdateOrderStatusDto {
  @IsString()
  @IsIn([
    'pending',
    'processing',
    'in_transit',
    'shipped',
    'delivered',
    'cancelled',
  ])
  status: string;
}
