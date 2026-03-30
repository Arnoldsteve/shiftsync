import { Module } from '@nestjs/common';
import { SwapService } from './swap.service';
import { SwapController } from './swap.controller';
import { SwapRepository } from './repositories/swap.repository';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { CacheModule } from '../cache/cache.module';
import { ConflictModule } from '../conflict/conflict.module';
import { ComplianceModule } from '../compliance/compliance.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    CacheModule,
    ConflictModule,
    ComplianceModule,
    RealtimeModule,
  ],
  controllers: [SwapController],
  providers: [SwapService, SwapRepository],
  exports: [SwapService],
})
export class SwapModule {}
