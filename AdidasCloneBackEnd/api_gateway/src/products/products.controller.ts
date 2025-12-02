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
  UseInterceptors,
  UploadedFile,
  Query,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ClientProxy } from '@nestjs/microservices';
import { buffer, lastValueFrom } from 'rxjs';
import { RMQ_PATTERN_PRODUCTS } from 'src/common/constants/rmq.pattern';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilterProductsDto } from './dto/filter-products.dto';
import { SearchProductsDto } from './dto/search-products.dto';
import { GetProductsByCategoryDto } from './dto/get-by-category.dto';

@Controller('products')
export class ProductsController {
  constructor(
    @Inject('PRODUCT_SERVICE')
    private readonly productServiceClient: ClientProxy,
  ) {}

  @Get()
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

  @Post()
  async createProduct(@Body() product: any) {
    try {
      console.log(product);
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

  @Post('product-variant')
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

  @Delete('/:id')
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

  @Patch('product-variant/:id')
  async updateProductVariant(
    @Body() body: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    try {
      const result = await lastValueFrom(
        this.productServiceClient.send(
          { cmd: RMQ_PATTERN_PRODUCTS.UPDATE_PRODUCT_VARIANT },
          { body, id },
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

  @Patch('/:id')
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
  @Post('/product-image')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // Giới hạn 5MB
      fileFilter: (req, file, cb) => {
        // Chỉ chấp nhận các định dạng ảnh
        if (!file.mimetype.match(/image\/(jpg|jpeg|png|gif)/)) {
          return cb(
            new BadRequestException(
              'Chỉ hỗ trợ file ảnh (jpg, jpeg, png, gif)',
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    try {
      if (!file || !file.buffer) {
        throw new BadRequestException('Không tìm thấy file hoặc buffer');
      }

      // Kiểm tra xem file.buffer có phải là Buffer không
      if (!(file.buffer instanceof Buffer)) {
        throw new BadRequestException('file.buffer không phải là Buffer');
      }
      const payload = {
        buffer: file.buffer.toString('base64'),
        originalname: file.originalname,
        mimetype: file.mimetype,
      };
      const result = await lastValueFrom(
        this.productServiceClient.send(
          { cmd: RMQ_PATTERN_PRODUCTS.ADD_PRODUCT_IMAGE },
          { payload, body },
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

  @Post('/ai-suggest')
  async aiSuggest(@Body() promt: any) {
    try {
      const result = await lastValueFrom(
        this.productServiceClient.send(
          {
            cmd: RMQ_PATTERN_PRODUCTS.AI_SUGGESTION,
          },
          promt,
        ),
      );
      return result;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('/filter')
  async getFilterProducts(@Query() query: FilterProductsDto) {
    try {
      const result = await lastValueFrom(
        this.productServiceClient.send(
          { cmd: RMQ_PATTERN_PRODUCTS.GET_PAGINATED },
          query,
        ),
      );
      return result;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('/search')
  async searchProducts(@Query() query: SearchProductsDto) {
    try {
      const result = await lastValueFrom(
        this.productServiceClient.send(
          { cmd: RMQ_PATTERN_PRODUCTS.SEARCH },
          query,
        ),
      );
      return result;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
  @Get('category/:categoryId')
  async getProductsByCategory(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Query() query: GetProductsByCategoryDto,
  ) {
    try {
      const result = await lastValueFrom(
        this.productServiceClient.send(
          { cmd: RMQ_PATTERN_PRODUCTS.GET_BY_CATEGORY },
          { categoryId, ...query },
        ),
      );
      return result;
    } catch (error) {
      throw new BadRequestException(error.message || 'Lỗi lấy sản phẩm');
    }
  }
  @Get(':id')
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
}
