import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { ConfigModule } from '@nestjs/config';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { ReviewsModule } from './reviews/reviews.module';
import { ElasticsearchModule } from './elasticsearch/elasticsearch.module';
import { CategoriesModule } from './categories/categories.module';
import { AiService } from './ai/ai.service';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    PrismaModule,
    ProductsModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    CloudinaryModule,
    ReviewsModule,
    ElasticsearchModule,
    CategoriesModule,
    AiModule,
  ],
  controllers: [AppController],
  providers: [AppService, AiService],
})
export class AppModule {}
