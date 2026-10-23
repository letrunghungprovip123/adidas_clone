import 'reflect-metadata';
import { ConsoleLogger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { readPort } from '../../../libs/config/src';

async function bootstrap(): Promise<void> {
  // Internal HTTP listener is for liveness/readiness only in Phase 1.
  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger({ json: true })
  });
  app.enableShutdownHooks();
  await app.listen(readPort(process.env.PORT, 4107), '0.0.0.0');
}
void bootstrap();
