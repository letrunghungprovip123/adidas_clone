import { Module } from '@nestjs/common';
import { ElasticsearchModule as NestElasticsearchModule } from '@nestjs/elasticsearch';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    NestElasticsearchModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        node:
          configService.get<string>('ELASTICSEARCH_NODE') ||
          'http://elasticsearch:9200',
      }),
    }),
  ],
  exports: [NestElasticsearchModule],
})
export class ElasticsearchModule {}
