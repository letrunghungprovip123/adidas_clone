// product-service/src/categories/categories.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllCategories() {
    const categories = await this.prisma.categories.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
      },
      orderBy: { name: 'asc' },
    });

    return {
      message: 'Lấy danh sách danh mục thành công',
      data: categories,
    };
  }
}
