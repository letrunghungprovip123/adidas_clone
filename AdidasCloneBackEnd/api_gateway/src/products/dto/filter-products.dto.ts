import {
  IsOptional,
  IsString,
  IsNumber,
  IsIn,
  Min,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class FilterProductsDto {
  /** 🔹 Lọc theo thương hiệu */
  @IsOptional()
  @IsString({ message: 'brand phải là chuỗi ký tự hợp lệ' })
  brand?: string;

  /** 🔹 Lọc theo giới tính */
  @IsOptional()
  @IsIn(['Men', 'Women', 'Unisex'], {
    message: 'gender phải là 1 trong các giá trị: Men, Women, Unisex',
  })
  gender?: string;

  /** 🔹 Lọc theo khoảng giá tối thiểu */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'price_min phải là một số hợp lệ (vd: 1500000)' })
  @Min(0, { message: 'price_min phải lớn hơn hoặc bằng 0' })
  price_min?: number;

  /** 🔹 Lọc theo khoảng giá tối đa */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'price_max phải là một số hợp lệ (vd: 4000000)' })
  @Min(0, { message: 'price_max phải lớn hơn hoặc bằng 0' })
  price_max?: number;

  /** 🔹 Lọc theo kích cỡ (nhiều size cách nhau bằng dấu phẩy, ví dụ: "37,38,39") */
  @IsOptional()
  @IsString({ message: 'sizes phải là chuỗi ký tự (vd: "37,38,39")' })
  sizes?: string;

  /** 🔹 Lọc theo màu sắc */
  @IsOptional()
  @IsString({ message: 'colors phải là chuỗi ký tự (vd: "Đen,Trắng,Đỏ")' })
  colors?: string;

  /** 🔹 Lọc theo chất liệu */
  @IsOptional()
  @IsString({ message: 'materials phải là chuỗi ký tự (vd: "Mesh,Leather")' })
  materials?: string;

  /** 🔹 Lọc theo tình trạng hàng (true/false) */
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: 'in_stock phải là true hoặc false' })
  in_stock?: boolean;

  /** 🔹 Sắp xếp */
  @IsOptional()
  @IsIn(['price_asc', 'price_desc', 'newest', 'name'], {
    message:
      'sort phải là 1 trong các giá trị: price_asc, price_desc, newest, name',
  })
  sort?: 'price_asc' | 'price_desc' | 'newest' | 'name';
}
