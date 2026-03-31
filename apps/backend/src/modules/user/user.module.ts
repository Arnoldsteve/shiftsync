import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserRepository } from './repositories/user.repository';
import { UserSkillRepository } from './repositories/user-skill.repository';
import { LocationCertificationRepository } from './repositories/location-certification.repository';
import { ManagerLocationRepository } from './repositories/manager-location.repository';
import { CaslAbilityFactory } from './casl/casl-ability.factory';
import { PoliciesGuard } from './casl/policies.guard';
import { PrismaModule } from '../../prisma/prisma.module';

/**
 * User Management Module
 *
 * Handles user CRUD operations, roles, skills, and certifications.
 * Separated from AuthModule for better separation of concerns.
 *
 * ⚡ PBAC: Permission-based access control with CASL
 * ⚡ Repository Pattern: Clean data access layer
 * ⚡ Location Authorization: Manager-specific location scoping
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
    CaslAbilityFactory,
    PoliciesGuard,
  ],
  exports: [UserService, CaslAbilityFactory, PoliciesGuard],
})
export class UserModule {}
