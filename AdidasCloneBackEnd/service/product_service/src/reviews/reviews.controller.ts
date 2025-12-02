// product-service/src/reviews/reviews.controller.ts
import {
  Controller,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ReviewsService } from './reviews.service';
import { RMQ_PATTERN_REVIEWS } from '../common/constants/rmq.pattern';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @MessagePattern({ cmd: RMQ_PATTERN_REVIEWS.GET_REVIEWS })
  async getReviews(@Payload() data: any) {
    const response = await this.reviewsService.getReviews();
    return response;
  }

  @MessagePattern({ cmd: RMQ_PATTERN_REVIEWS.GET_REVIEW_ID })
  async getReviewById(@Payload() id: any) {
    const response = await this.reviewsService.getReviewById(+id);
    if (!response) {
      throw new NotFoundException('Đánh giá không tồn tại');
    }
    return response;
  }

  @MessagePattern({ cmd: RMQ_PATTERN_REVIEWS.CREATE_REVIEW })
  async createReview(@Payload() data: any) {
    const response = await this.reviewsService.createReview(data);
    return response;
  }

  @MessagePattern({ cmd: RMQ_PATTERN_REVIEWS.UPDATE_REVIEW })
  async updateReview(@Payload() data: any) {
    const { id, ...review } = data;
    const response = await this.reviewsService.updateReview(+id, review);
    if (!response) {
      throw new NotFoundException('Đánh giá không tồn tại');
    }
    return response;
  }

  @MessagePattern({ cmd: RMQ_PATTERN_REVIEWS.DELETE_REVIEW })
  async deleteReview(@Payload() id: any) {
    const response = await this.reviewsService.deleteReview(+id);
    if (!response) {
      throw new NotFoundException('Đánh giá không tồn tại');
    }
    return { message: 'Xóa đánh giá thành công' };
  }
}
