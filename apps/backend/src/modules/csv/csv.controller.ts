import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CsvService } from './csv.service';
import { JwtAuthGuard } from '../user/guards/jwt-auth.guard';
import { PoliciesGuard } from '../user/casl/policies.guard';
import { CheckPolicies } from '../user/decorators/check-policies.decorator';
import { Action } from '../user/casl/types';

@ApiTags('CSV Import/Export')
@ApiBearerAuth()
@Controller('api')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class CsvController {
  constructor(private readonly csvService: CsvService) {}

  /**
   * Import schedule from CSV - Manager
   * Requirements: 28.1, 28.2, 28.3
   */
  @Post('import/csv')
  @CheckPolicies((ability) => ability.can(Action.Create, 'User'))
  @ApiOperation({ summary: 'Import schedule from CSV' })
  async importSchedule(@Body() data: { csvContent: string }) {
    const result = this.csvService.parseCsv(data.csvContent);

    if (!result.success) {
      return {
        success: false,
        errors: result.errors,
        message: 'CSV parsing failed with errors',
      };
    }

    return {
      success: true,
      data: result.data,
      message: `Successfully parsed ${result.data.length} rows`,
    };
  }

  /**
   * Export schedule to CSV - Manager
   * Requirements: 28.4
   */
  @Get('export/csv')
  @CheckPolicies((ability) => ability.can(Action.Read, 'User'))
  @ApiOperation({ summary: 'Export schedule to CSV' })
  async exportSchedule(
    @Query('locationId') locationId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const csvContent = await this.csvService.exportScheduleToCsv(
      locationId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );

    return {
      csvContent,
      filename: `schedule-export-${new Date().toISOString().split('T')[0]}.csv`,
    };
  }
}
