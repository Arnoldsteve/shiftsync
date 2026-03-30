import { Module } from '@nestjs/common';
import { SwapService } from './swap.service';
import { SwapRepository } from './repositories/swap.repository';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { CacheModule } from '../cache/cache.module';
import { ConflictModule } from '../conflict/conflict.module';
import { ComplianceModule } from '../compliance/compliance.module';

@Module({
  imports: [PrismaModule, AuditModule, CacheModule, ConflictModule, ComplianceModule],
  providers: [SwapService, SwapRepository],
  exports: [SwapService],
})
export class SwapModule {}
