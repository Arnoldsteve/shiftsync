import { Controller, Get, Param, Query, UseGuards, Header, StreamableFile } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../user/guards/jwt-auth.guard';
import { PoliciesGuard } from '../user/casl/policies.guard';
import { CheckPolicies } from '../user/decorators/check-policies.decorator';
import { Action } from '../user/casl/types';
import { AuditQueryFilters } from './interfaces';
import { Readable } from 'stream';

@ApiTags('Audit')
@ApiBearerAuth()
@Controller('audit')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * Query audit logs - Admin
   * Requirements: 19.5, 20.1, 20.2
   */
  @Get()
  @CheckPolicies((ability) => ability.can(Action.Read, 'User'))
  @ApiOperation({ summary: 'Query audit logs with filters' })
  async queryAuditLogs(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('userId') userId?: string,
    @Query('entityType') entityType?: string,
    @Query('action') action?: string
  ) {
    const filters: AuditQueryFilters = {
      ...(startDate && { startDate: new Date(startDate) }),
      ...(endDate && { endDate: new Date(endDate) }),
      ...(userId && { userId }),
      ...(entityType && { entityType: entityType as any }),
      ...(action && { action: action as any }),
    };

    return this.auditService.queryAuditLog(filters);
  }

  /**
   * Verify audit record integrity - Admin
   * Requirements: 20.4, 20.5
   */
  @Get(':id/verify')
  @CheckPolicies((ability) => ability.can(Action.Read, 'User'))
  @ApiOperation({ summary: 'Verify audit record integrity' })
  async verifyIntegrity(@Param('id') recordId: string) {
    const isValid = await this.auditService.verifyIntegrity(recordId);

    return {
      recordId,
      isValid,
      message: isValid ? 'Audit record integrity verified' : 'Audit record has been tampered with',
    };
  }

  /**
   * Export audit logs as CSV - Admin only
   * Requirement: 9
   */
  @Get('export/csv')
  @CheckPolicies((ability) => ability.can(Action.Read, 'Audit'))
  @ApiOperation({ summary: 'Export audit logs as CSV' })
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="audit-logs.csv"')
  async exportAuditLogs(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('userId') userId?: string,
    @Query('entityType') entityType?: string,
    @Query('action') action?: string
  ): Promise<StreamableFile> {
    const filters: AuditQueryFilters = {
      ...(startDate && { startDate: new Date(startDate) }),
      ...(endDate && { endDate: new Date(endDate) }),
      ...(userId && { userId }),
      ...(entityType && { entityType: entityType as any }),
      ...(action && { action: action as any }),
    };

    const csvContent = await this.auditService.exportToCSV(filters);
    const stream = Readable.from([csvContent]);

    return new StreamableFile(stream);
  }
}
