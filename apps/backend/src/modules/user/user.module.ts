import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { UserService } from './user.service';
import { AuthService } from './auth.service';
import { UserController } from './user.controller';
import { UserRepository } from './repositories/user.repository';
import { UserSkillRepository } from './repositories/user-skill.repository';
import { LocationCertificationRepository } from './repositories/location-certification.repository';
import { ManagerLocationRepository } from './repositories/manager-location.repository';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CaslAbilityFactory } from './casl/casl-ability.factory';
import { PoliciesGuard } from './casl/policies.guard';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRES_IN', '24h'),
        },
      }),
    }),
  ],
  controllers: [UserController],
  providers: [
    UserService,
    AuthService,
    UserRepository,
    UserSkillRepository,
    LocationCertificationRepository,
    ManagerLocationRepository,
    JwtStrategy,
    JwtAuthGuard,
    CaslAbilityFactory,
    PoliciesGuard,
  ],
  exports: [UserService, AuthService, JwtAuthGuard, PoliciesGuard, CaslAbilityFactory],
})
export class UserModule {}
