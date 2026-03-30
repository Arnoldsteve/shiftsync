import { SetMetadata } from '@nestjs/common';
import { PolicyHandler } from '../casl/policy-handler.interface';
import { CHECK_POLICIES_KEY } from '../casl/policies.guard';

export const CheckPolicies = (...handlers: PolicyHandler[]) =>
  SetMetadata(CHECK_POLICIES_KEY, handlers);
