import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { ElasticsearchModule } from 'src/elasticsearch/elasticsearch.module';
import { AiModule } from 'src/ai/ai.module';
import { AiService } from 'src/ai/ai.service';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService, CloudinaryService, AiService],
  imports: [PrismaModule, CloudinaryModule, ElasticsearchModule, AiModule],
})
export class ProductsModule {}
