export class CreateUserDto {
  email: string;
  password_hash: string;
  name?: string;
  avatar_url?: string;
  phone?: string;
  address?: string;
  is_email_verified?: boolean;
  is_admin?: boolean;
  created_at?: Date;

  // Related entities - usually omitted or handled separately in DTOs
  // You can define them if needed or remove them
}
