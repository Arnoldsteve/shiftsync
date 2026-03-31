import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Use Pino logger
  app.useLogger(app.get(Logger));

  // Enable CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // Scalar API documentation
  const config = new DocumentBuilder()
    .setTitle('ShiftSync API')
    .setDescription('Multi-location staff scheduling platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management')
    .addTag('shifts', 'Shift scheduling')
    .addTag('swaps', 'Shift swap workflow')
    .addTag('overtime', 'Overtime tracking')
    .addTag('fairness', 'Fairness analytics')
    .addTag('callouts', 'Callout management')
    .addTag('config', 'Configuration')
    .addTag('audit', 'Audit logs')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Use Scalar for API documentation UI
  const { apiReference } = await import('@scalar/nestjs-api-reference');

  app.use(
    '/api/docs',
    apiReference({
      spec: {
        content: document,
      },
      theme: 'purple',
      layout: 'modern',
      darkMode: false,
      showSidebar: true,
    })
  );

  const port = process.env.API_PORT || 3001;
  await app.listen(port);

  const logger = app.get(Logger);
  logger.log(`🚀 ShiftSync API running on http://localhost:${port}`);
  logger.log(`📚 API Documentation (Scalar) available at http://localhost:${port}/api/docs`);
}

bootstrap();
