import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { UserModule } from './modules/user/user.module';
import { AuditModule } from './modules/audit/audit.module';
import { CacheModule } from './modules/cache/cache.module';
import { LockModule } from './modules/lock/lock.module';
import { ConflictModule } from './modules/conflict/conflict.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { ScheduleModule } from './modules/schedule/schedule.module';
import { SwapModule } from './modules/swap/swap.module';
import { OvertimeModule } from './modules/overtime/overtime.module';
import { FairnessModule } from './modules/fairness/fairness.module';
import { QueueModule } from './modules/queue/queue.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { CalloutModule } from './modules/callout/callout.module';

// Module imports will be added as we build services

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      envFilePath: ['.env.local', '.env'],
    }),

    // Logging with Pino
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          level: config.get('NODE_ENV') === 'production' ? 'info' : 'debug',
          transport:
            config.get('NODE_ENV') !== 'production'
              ? {
                  target: 'pino-pretty',
                  options: {
                    colorize: true,
                    singleLine: true,
                    translateTime: 'SYS:standard',
                    ignore: 'pid,hostname',
                  },
                }
              : undefined,
        },
      }),
    }),

    // Database
    PrismaModule,

    // Redis
    RedisModule,

    // Infrastructure modules
    AuditModule,
    CacheModule,
    LockModule,
    ConflictModule,
    ComplianceModule,

    // Feature modules
    UserModule,
    ScheduleModule,
    SwapModule,
    OvertimeModule,
    FairnessModule,
    QueueModule,
    RealtimeModule,
    CalloutModule,
    // ScheduleModule,
    // SwapModule,
    // OvertimeModule,
    // ComplianceModule,
    // FairnessModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
