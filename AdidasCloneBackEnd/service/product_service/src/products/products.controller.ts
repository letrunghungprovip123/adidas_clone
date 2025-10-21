import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RMQ_PATTERN_PRODUCTS } from 'src/common/constants/rmq.pattern';
import { response } from 'express';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @MessagePattern({ cmd: RMQ_PATTERN_PRODUCTS.GET_PRODUCT })
  async getProducts(@Payload() data: any) {
    const response = await this.productsService.getProducts();
    return response;
  }

  @MessagePattern({ cmd: RMQ_PATTERN_PRODUCTS.GET_PRODUCT_ID })
  async getProductID(@Payload() id: any) {
    const response = await this.productsService.getProductID(+id);
    return response;
  }

  @MessagePattern({ cmd: RMQ_PATTERN_PRODUCTS.CREATE_PRODUCT })
  async createProduct(@Payload() data: any) {
    const response = await this.productsService.createProduct(data);
    return response;
  }

  @MessagePattern({ cmd: RMQ_PATTERN_PRODUCTS.UPDATE_PRODUCT })
  async updateProduct(@Payload() data: any) {
    const { id, product } = data;
    const response = await this.productsService.updateProduct(+id, product);
    return response;
  }

  @MessagePattern({ cmd: RMQ_PATTERN_PRODUCTS.DELETE_PRODUCT })
  async deleteProduct(@Payload() id: any) {
    const response = await this.productsService.createProduct(+id);
    return response;
  }


  @MessagePattern({cmd : RMQ_PATTERN_PRODUCTS.CREATE_PRODUCT_VARIANT})
  async createProductVariant(@Payload() data : any){
    const response = await this.productsService.createProductVariant(data)
    return response
  }
}
