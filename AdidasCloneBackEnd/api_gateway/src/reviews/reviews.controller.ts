import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  ParseIntPipe,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { RMQ_PATTERN_REVIEWS } from '../common/constants/rmq.pattern';

@Controller('reviews')
export class ReviewsController {
  constructor(
    @Inject('PRODUCT_SERVICE')
    private readonly productServiceClient: ClientProxy,
  ) {}

  @Get()
  async getReviews() {
    try {
      const result = await lastValueFrom(
        this.productServiceClient.send(
          { cmd: RMQ_PATTERN_REVIEWS.GET_REVIEWS },
          {},
        ),
      );
      return result;
    } catch (error) {
      console.error('Service error:', error);
      throw new InternalServerErrorException('Product service failed');
    }
  }

  @Get(':id')
  async getReviewById(@Param('id', ParseIntPipe) id: number) {
    try {
      const result = await lastValueFrom(
        this.productServiceClient.send(
          { cmd: RMQ_PATTERN_REVIEWS.GET_REVIEW_ID },
          id,
        ),
      );
      return result;
    } catch (error) {
      const err = error?.statusCode
        ? error
        : error?.error?.statusCode
          ? error.error
          : null;

      if (err) {
        switch (err.statusCode) {
          case 400:
            throw new BadRequestException(err.message);
          case 404:
            throw new NotFoundException(err.message);
          default:
            throw new InternalServerErrorException(err.message);
        }
      }

      console.error('Unhandled microservice error:', error);
      throw new InternalServerErrorException('Product service failed');
    }
  }

  @Post()
  async createReview(@Body() review: any) {
    try {
      const result = await lastValueFrom(
        this.productServiceClient.send(
          { cmd: RMQ_PATTERN_REVIEWS.CREATE_REVIEW },
          review,
        ),
      );
      return result;
    } catch (error) {
      if (error && typeof error === 'object' && 'statusCode' in error) {
        switch (error.statusCode) {
          case 400:
            throw new BadRequestException(error.message);
          case 404:
            throw new NotFoundException(error.message);
          default:
            throw new InternalServerErrorException(error.message);
        }
      }
      throw new InternalServerErrorException('Product service failed');
    }
  }

  @Patch(':id')
  async updateReview(
    @Param('id', ParseIntPipe) id: number,
    @Body() review: any,
  ) {
    try {
      const result = await lastValueFrom(
        this.productServiceClient.send(
          { cmd: RMQ_PATTERN_REVIEWS.UPDATE_REVIEW },
          { id, ...review },
        ),
      );
      return result;
    } catch (error) {
      if (error && typeof error === 'object' && 'statusCode' in error) {
        switch (error.statusCode) {
          case 400:
            throw new BadRequestException(error.message);
          case 404:
            throw new NotFoundException(error.message);
          default:
            throw new InternalServerErrorException(error.message);
        }
      }
      throw new InternalServerErrorException('Product service failed');
    }
  }

  @Delete(':id')
  async deleteReview(@Param('id', ParseIntPipe) id: number) {
    try {
      const result = await lastValueFrom(
        this.productServiceClient.send(
          { cmd: RMQ_PATTERN_REVIEWS.DELETE_REVIEW },
          id,
        ),
      );
      return result;
    } catch (error) {
      if (error && typeof error === 'object' && 'statusCode' in error) {
        switch (error.statusCode) {
          case 400:
            throw new BadRequestException(error.message);
          case 404:
            throw new NotFoundException(error.message);
          default:
            throw new InternalServerErrorException(error.message);
        }
      }
      throw new InternalServerErrorException('Product service failed');
    }
  }
}
