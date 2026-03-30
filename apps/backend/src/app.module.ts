import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { UserModule } from './modules/user/user.module';

// Module imports will be added as we build services
// import { ScheduleModule } from './modules/schedule/schedule.module';
// import { SwapModule } from './modules/swap/swap.module';
// import { OvertimeModule } from './modules/overtime/overtime.module';
// import { ComplianceModule } from './modules/compliance/compliance.module';
// import { FairnessModule } from './modules/fairness/fairness.module';
// import { AuditModule } from './modules/audit/audit.module';

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

    // Feature modules
    UserModule,
    // ScheduleModule,
    // SwapModule,
    // OvertimeModule,
    // ComplianceModule,
    // FairnessModule,
    // AuditModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
