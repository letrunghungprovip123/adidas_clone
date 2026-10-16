import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
  app.enableCors({ origin: process.env.FRONTEND_ORIGIN?.split(',') ?? ['http://localhost:3001', 'http://localhost:3002'] });
  await app.listen(Number(process.env.PORT ?? 3100));
}
bootstrap();
