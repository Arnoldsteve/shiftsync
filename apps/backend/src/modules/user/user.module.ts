import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserRepository } from './repositories/user.repository';
import { UserSkillRepository } from './repositories/user-skill.repository';
import { LocationCertificationRepository } from './repositories/location-certification.repository';
import { ManagerLocationRepository } from './repositories/manager-location.repository';
import { AvailabilityWindowRepository } from './repositories/availability-window.repository';
import { AvailabilityExceptionRepository } from './repositories/availability-exception.repository';
import { CaslAbilityFactory } from './casl/casl-ability.factory';
import { PoliciesGuard } from './casl/policies.guard';
import { PrismaModule } from '../../prisma/prisma.module';

/**
 * User Management Module
 *
 * Handles user CRUD operations, roles, skills, certifications, and availability.
 * Separated from AuthModule for better separation of concerns.
 *
 * ⚡ PBAC: Permission-based access control with CASL
 * ⚡ Repository Pattern: Clean data access layer
 * ⚡ Location Authorization: Manager-specific location scoping
 * ⚡ Availability Management: Staff availability windows and exceptions (Req 31)
 * ⚡ Desired Hours Tracking: Staff desired weekly hours (Req 41)
 */
@Module({
  imports: [PrismaModule],
  controllers: [UserController],
  providers: [
    UserService,
    UserRepository,
    UserSkillRepository,
    LocationCertificationRepository,
    ManagerLocationRepository,
    AvailabilityWindowRepository,
    AvailabilityExceptionRepository,
    CaslAbilityFactory,
    PoliciesGuard,
  ],
  exports: [UserService, CaslAbilityFactory, PoliciesGuard],
})
export class UserModule {}
