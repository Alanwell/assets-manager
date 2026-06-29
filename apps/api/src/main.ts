import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/http/api-exception.filter';
import { AppConfigService } from './config/app-config.service';
import { loadEnvironment } from './config/load-environment';

async function bootstrap(): Promise<void> {
  loadEnvironment();
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );
  const config = app.get(AppConfigService);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableCors({
    origin: config.corsOrigin.split(',').map((origin) => origin.trim()),
    credentials: true,
  });
  app.enableShutdownHooks();

  const openApiConfig = new DocumentBuilder()
    .setTitle('Asset Manager API')
    .setDescription('个人资产管理系统 API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, openApiConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(config.port, '0.0.0.0');
  Logger.log(
    `API listening on http://localhost:${config.port}/api`,
    'Bootstrap',
  );
}

void bootstrap();
