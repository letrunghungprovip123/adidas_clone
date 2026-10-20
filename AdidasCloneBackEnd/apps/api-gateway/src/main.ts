import 'reflect-metadata';
import { ConsoleLogger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { readCorsOrigins, readPort } from '../../../libs/config/src';
import { correlationMiddleware } from '../../../libs/observability/src/correlation.middleware';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger({ json: true })
  });
  app.use(helmet());
  app.use(correlationMiddleware);
  app.enableCors({ origin: readCorsOrigins(process.env.V2_ALLOWED_ORIGINS, process.env.NODE_ENV) });
  app.useGlobalPipes(new ValidationPipe({
    transform: true, whitelist: true, forbidNonWhitelisted: true
  }));
  const config = new DocumentBuilder()
    .setTitle('Adidas Clone V2 API')
    .setDescription('Phase 1 foundation: system + health only; no business endpoints')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: 'api/docs-json'
  });
  app.enableShutdownHooks();
  await app.listen(readPort(process.env.PORT, 4300), '0.0.0.0');
}
void bootstrap();
