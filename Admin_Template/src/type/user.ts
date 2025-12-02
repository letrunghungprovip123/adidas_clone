export interface User {
  email: string;
  password_hash: string;
  name?: string;
  avatarUrl?: string;
  phone?: string;
  address?: string;
  is_email_verified?: boolean;
  is_admin?: boolean;
  created_at?: Date;
}
