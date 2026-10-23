import 'reflect-metadata';
import { ConsoleLogger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { readPort } from '../../../libs/config/src';
import { correlationMiddleware } from '../../../libs/observability/src/correlation.middleware';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger({ json: true })
  });
  app.use(helmet());
  app.use(correlationMiddleware);
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true
  }));
  app.enableShutdownHooks();
  await app.listen(readPort(process.env.PORT, 4101), '0.0.0.0');
}
void bootstrap().catch(error => {
  console.error('Identity bootstrap failure: ' + (error instanceof Error ? error.message : 'error'));
  process.exit(1);
});
