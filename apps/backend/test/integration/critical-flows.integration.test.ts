/**
 * Critical User Flows Integration Tests
 *
 * Tests comprehensive end-to-end workflows:
 * 1. Manager creates shift and assigns staff (full validation chain)
 * 2. Staff requests swap, manager approves (atomic transaction)
 * 3. Staff reports callout, manager finds replacement (real-time updates)
 * 4. Admin views fairness analytics (background job processing)
 * 5. Rest period enforcement across timezone boundaries
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getTestPrismaClient,
  cleanDatabase,
  seedBasicData,
  getTestRedisClient,
  cleanRedis,
} from '../helpers';
import { ScheduleService } from '../../src/modules/schedule/schedule.service';
import { SwapService } from '../../src/modules/swap/swap.service';
import { CalloutService } from '../../src/modules/callout/callout.service';
import { FairnessService } from '../../src/modules/fairness/fairness.service';
import { ComplianceService } from '../../src/modules/compliance/compliance.service';
import { Test, TestingModule } from '@nestjs/testing';
import { ScheduleModule } from '../../src/modules/schedule/schedule.module';
import { SwapModule } from '../../src/modules/swap/swap.module';
import { CalloutModule } from 