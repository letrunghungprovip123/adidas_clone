// product-service/src/cloudinary/cloudinary.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import {
  v2 as cloudinary,
  UploadApiResponse,
  UploadApiErrorResponse,
} from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  async uploadImage(data: {
    buffer: string;
    originalname: string;
    mimetype: string;
  }): Promise<UploadApiResponse | UploadApiErrorResponse> {
    if (!data.buffer || !data.originalname || !data.mimetype) {
      throw new BadRequestException('Dữ liệu không hợp lệ');
    }

    // Kiểm tra mimetype
    if (!data.mimetype.match(/image\/(jpg|jpeg|png|gif)/)) {
      throw new BadRequestException(
        'Chỉ hỗ trợ file ảnh (jpg, jpeg, png, gif)',
      );
    }

    let buffer: Buffer;
    try {
      buffer = Buffer.from(data.buffer, 'base64');
    } catch (error) {
      throw new BadRequestException('Không thể chuyển base64 thành Buffer');
    }

    // Chuẩn hóa public_id để tránh ký tự đặc biệt
    const publicId = data.originalname
      .split('.')[0]
      .replace(/[^a-zA-Z0-9-_]/g, '-') // Thay ký tự đặc biệt bằng dấu gạch ngang
      .toLowerCase();

    return new Promise<any>((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          folder: 'product_images',
          resource_type: 'image', // Ép resource_type là image
          public_id: publicId, // Sử dụng public_id đã chuẩn hóa
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        },
      );

      Readable.from(buffer).pipe(upload);
    });
  }
}
