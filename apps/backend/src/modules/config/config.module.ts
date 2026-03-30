import { Module } from '@nestjs/common';
import { ConfigService } from './config.service';
import { ConfigRepository } from './repositories/config.repository';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [PrismaModule, AuditModule, CacheModule],
  providers: [ConfigService, ConfigRepository],
  exports: [ConfigService],
})
export class ConfigModule {}
