// api-gateway/src/categories/categories.controller.ts
import { Controller, Get, BadRequestException, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { RMQ_PATTERN_CATEGORIES } from '../common/constants/rmq.pattern';

@Controller('categories')
export class CategoriesController {
  constructor(
    @Inject('PRODUCT_SERVICE')
    private readonly productServiceClient: ClientProxy,
  ) {}

  @Get()
  async getAllCategories() {
    try {
      const result = await lastValueFrom(
        this.productServiceClient.send(
          { cmd: RMQ_PATTERN_CATEGORIES.GET_ALL },
          {},
        ),
      );
      return result;
    } catch (error) {
      throw new BadRequestException(error.message || 'Lỗi lấy danh mục');
    }
  }
}
