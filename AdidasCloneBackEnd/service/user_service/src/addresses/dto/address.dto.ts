export class AddressDTO {
  id?: number;
  user_id?: number;
  receiver_name?: string;
  phone?: string;
  address_line?: string;
  city?: string;
  district?: string;
  is_default?: boolean;
  created_at?: Date;
}
