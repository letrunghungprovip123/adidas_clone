// product-service/src/categories/categories.controller.ts
import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { CategoriesService } from './categories.service';
import { RMQ_PATTERN_CATEGORIES } from '../common/constants/rmq.pattern';

@Controller()
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @MessagePattern({ cmd: RMQ_PATTERN_CATEGORIES.GET_ALL })
  async getAllCategories() {
    return this.categoriesService.getAllCategories();
  }
}
