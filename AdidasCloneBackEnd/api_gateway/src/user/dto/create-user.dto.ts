export class CreateUserDto {
  email: string;
  password_hash: string;
  name?: string;
  avatarUrl?: string;
  phone?: string;
  address?: string;
  is_email_verified?: boolean;
  is_admin?: boolean;
  created_at?: Date;

  // Related entities - usually omitted or handled separately in DTOs
  // You can define them if needed or remove them
  addresses?: any[];
  cart_items?: any[];
  loyalty_points?: any[];
  notifications?: any[];
  orders?: any[];
  reviews?: any[];
  wishlists?: any[];
}

