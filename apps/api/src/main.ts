import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/api-exception.filter';
import { RequestIdInterceptor } from './common/request-id.interceptor';
import { StructuredLogger } from './common/structured-logger.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true, rawBody: true });
  const config = app.get(ConfigService);
  const logger = app.get(StructuredLogger);
  app.useLogger(logger);
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cookieParser());
  app.enableCors({
    origin: config.getOrThrow<string>('CORS_ORIGINS').split(',').map((value) => value.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new ApiExceptionFilter(config.get('NODE_ENV') === 'production', logger));
  app.useGlobalInterceptors(app.get(RequestIdInterceptor));

  if (config.get('NODE_ENV') !== 'production' || config.get('SWAGGER_ENABLED') === 'true') {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('Burujan Commerce API').setVersion('1').addCookieAuth('access_token').build(),
    );
    SwaggerModule.setup('api/docs', app, document);
  }
  await app.listen(config.get<number>('API_PORT', 4000));
}

void bootstrap();
