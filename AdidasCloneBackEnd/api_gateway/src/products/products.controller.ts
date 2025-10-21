import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Inject,
  InternalServerErrorException,
  Put,
  BadRequestException,
  NotFoundException,
  ParseIntPipe,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { RMQ_PATTERN_PRODUCTS } from 'src/common/constants/rmq.pattern';

@Controller('products')
export class ProductsController {
  constructor(
    @Inject('PRODUCT_SERVICE')
    private readonly productServiceClient: ClientProxy,
  ) {}

  @Get('getProducts')
  async getProducts() {
    try {
      const result = await lastValueFrom(
        this.productServiceClient.send(
          { cmd: RMQ_PATTERN_PRODUCTS.GET_PRODUCT },
          {},
        ),
      );
      return result;
    } catch (error) {
      console.error('Service error:', error);
      throw new InternalServerErrorException('User service failed');
    }
  }

  @Get('getProductId/:id')
  async getProductID(@Param('id', ParseIntPipe) id: any) {
    try {
      const result = await lastValueFrom(
        this.productServiceClient.send(
          { cmd: RMQ_PATTERN_PRODUCTS.GET_PRODUCT_ID },
          id,
        ),
      );
      return result;
    } catch (error) {
      if (error && typeof error === 'object' && error.statusCode) {
        switch (error.statusCode) {
          case 400:
            throw new BadRequestException(error.message);
          case 404:
            throw new NotFoundException(error.message);
          // các trường hợp khác nếu cần
          default:
            throw new InternalServerErrorException(error.message);
        }
      }

      throw new InternalServerErrorException('User service failed');
    }
  }

  @Post('createProduct')
  async createProduct(@Body() product: any) {
    try {
      const result = await lastValueFrom(
        this.productServiceClient.send(
          { cmd: RMQ_PATTERN_PRODUCTS.CREATE_PRODUCT },
          product,
        ),
      );
      return result;
    } catch (error) {
      console.error('Service error:', error);
      throw new InternalServerErrorException('User service failed');
    }
  }

  @Post('createProductVariant')
  async createProductVariant(@Body() body: any) {
    try {
      const result = await lastValueFrom(
        this.productServiceClient.send(
          { cmd: RMQ_PATTERN_PRODUCTS.CREATE_PRODUCT_VARIANT },
          body,
        ),
      );
      return result;
    } catch (error) {
      if (error && typeof error === 'object' && error.statusCode) {
        switch (error.statusCode) {
          case 400:
            throw new BadRequestException(error.message);
          case 404:
            throw new NotFoundException(error.message);
          // các trường hợp khác nếu cần
          default:
            throw new InternalServerErrorException(error.message);
        }
      }

      throw new InternalServerErrorException('User service failed');
    }
  }

  @Put('updateProduct/:id')
  async updateProduct(
    @Param('id', ParseIntPipe) id: number,
    @Body() product: any,
  ) {
    try {
      const result = await lastValueFrom(
        this.productServiceClient.send(
          { cmd: RMQ_PATTERN_PRODUCTS.UPDATE_PRODUCT },
          { id, product },
        ),
      );
      return result;
    } catch (error) {
      if (error && typeof error === 'object' && error.statusCode) {
        switch (error.statusCode) {
          case 400:
            throw new BadRequestException(error.message);
          case 404:
            throw new NotFoundException(error.message);
          // các trường hợp khác nếu cần
          default:
            throw new InternalServerErrorException(error.message);
        }
      }

      throw new InternalServerErrorException('User service failed');
    }
  }

  @Delete('deleteProduct/:id')
  async deleteProduct(@Param('id', ParseIntPipe) id: number) {
    try {
      const result = await lastValueFrom(
        this.productServiceClient.send(
          { cmd: RMQ_PATTERN_PRODUCTS.DELETE_PRODUCT },
          id,
        ),
      );
      return result;
    } catch (error) {
      if (error && typeof error === 'object' && error.statusCode) {
        switch (error.statusCode) {
          case 400:
            throw new BadRequestException(error.message);
          case 404:
            throw new NotFoundException(error.message);
          // các trường hợp khác nếu cần
          default:
            throw new InternalServerErrorException(error.message);
        }
      }

      throw new InternalServerErrorException('User service failed');
    }
  }
}
