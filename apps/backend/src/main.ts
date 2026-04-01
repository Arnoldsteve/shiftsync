import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { BullBoardAdminGuard } from './modules/queue/guards/bull-board-admin.guard';
import { QueueService } from './modules/queue/queue.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

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

  // Set global API prefix
  app.setGlobalPrefix('api');

  // Protect BullBoard UI with Admin authentication
  const jwtService = app.get(JwtService);
  const configService = app.get(ConfigService);
  const bullBoardGuard = new BullBoardAdminGuard(jwtService, configService);

  // Apply authentication middleware to BullBoard route
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.use('/admin/queues', async (req: any, res: any, next: any) => {
    try {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => req,
          getResponse: () => res,
        }),
      } as any;

      const canActivate = await bullBoardGuard.canActivate(mockContext);
      if (canActivate) {
        next();
      } else {
        res.status(403).json({ message: 'Access denied. Admin role required.' });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unauthorized';
      res.status(401).json({ message: errorMessage });
    }
  });

  // Scalar API documentation
  const config = new DocumentBuilder()
    .setTitle('ShiftSync API')
    .setDescription(
      'Multi-location staff scheduling platform API with real-time updates, constraint validation, and fairness analytics'
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth'
    )
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management')
    .addTag('Schedule', 'Shift scheduling')
    .addTag('Swaps', 'Shift swap workflow')
    .addTag('Overtime', 'Overtime tracking')
    .addTag('Fairness', 'Fairness analytics')
    .addTag('Callouts', 'Callout management')
    .addTag('Configuration', 'Location configuration')
    .addTag('Audit', 'Audit logs')
    .addTag('Job Queue', 'Background job monitoring')
    .addTag('CSV Import/Export', 'Schedule import and export')
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

  // Schedule recurring drop request expiration job
  const queueService = app.get(QueueService);
  await queueService.scheduleDropRequestExpiration();
  logger.log('✅ Drop request expiration job scheduled (runs every 15 minutes)');
}

bootstrap();
