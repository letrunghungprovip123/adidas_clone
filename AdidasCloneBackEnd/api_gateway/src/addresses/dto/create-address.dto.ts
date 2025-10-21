export class CreateAddressDto {
  user_id?: number; // optional nếu có thể null
  receiver_name?: string;
  phone?: string;
  address_line?: string;
  city?: string;
  district?: string;
  is_default?: boolean;
}
