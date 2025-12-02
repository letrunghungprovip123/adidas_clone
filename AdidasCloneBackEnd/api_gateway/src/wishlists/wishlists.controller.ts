// api-gateway/src/wishlists/wishlists.controller.ts
import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { RMQ_PATTERN_WISHLISTS } from '../common/constants/rmq.pattern';
import { JwtAuthGuard } from '../strategy/jwt-auth.guard';
import { ParseIntPipe } from '@nestjs/common';

@Controller('favorites')
export class WishlistsController {
  constructor(
    @Inject('USER_SERVICE') private readonly userServiceClient: ClientProxy,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async addWishlist(
    @Request() req,
    @Body('product_id', ParseIntPipe) product_id: number,
  ) {
    try {
      const result = await lastValueFrom(
        this.userServiceClient.send(
          { cmd: RMQ_PATTERN_WISHLISTS.ADD_WISHLIST },
          { user_id: req.user.id, product_id },
        ),
      );
      return result;
    } catch (error) {
      console.error('Service error:', error);
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
      throw new InternalServerErrorException('User service failed');
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getWishlists(@Request() req) {
    try {
      const result = await lastValueFrom(
        this.userServiceClient.send(
          { cmd: RMQ_PATTERN_WISHLISTS.GET_WISHLISTS },
          req.user.id,
        ),
      );
      return result;
    } catch (error) {
      console.error('Service error:', error);
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
      throw new InternalServerErrorException('User service failed');
    }
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':product_id')
  async removeWishlist(
    @Request() req,
    @Param('product_id', ParseIntPipe) product_id: number,
  ) {
    try {
      const result = await lastValueFrom(
        this.userServiceClient.send(
          { cmd: RMQ_PATTERN_WISHLISTS.REMOVE_WISHLIST },
          { user_id: req.user.id, product_id },
        ),
      );
      return result;
    } catch (error) {
      console.error('Service error:', error);
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
      throw new InternalServerErrorException('User service failed');
    }
  }
}
