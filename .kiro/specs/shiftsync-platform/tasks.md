# Implementation Plan: ShiftSync Platform

## Overview

This implementation plan breaks down the ShiftSync platform into incremental, testable steps. The platform is a distributed multi-location staff scheduling system with real-time updates, constraint validation, and fairness analytics. The implementation follows a bottom-up approach: infrastructure setup, data layer, core services, business logic, real-time features, frontend, and finally integration.

The tech stack includes:

- Backend: NestJS with TypeScript, Prisma ORM, Socket.io, BullMQ, BullBoard, Swagger/Scalar, Argon2
- Frontend: Next.js 15 with App Router, TanStack Query, TanStack Table, Sonner, Shadcn UI
- Data: PostgreSQL 15+ (Neon DB), Redis 7+ (Redis Cloud)
- Infrastructure: Turborepo, Docker, Redlock, Zod
- Testing: Vitest, Playwright, fast-check

Each task builds on previous work, with checkpoints to validate progress. Property-based tests are marked optional (\*) but recommended for catching edge cases.

## Tasks

- [x] 1. Project setup and infrastructure foundation
  - [x] 1.1 Initialize monorepo structure with Turborepo
    - Install and configure Turborepo for monorepo management
    - Create root package.json with workspaces for backend, frontend, and shared packages
    - Create shared package for Zod validation schemas (contract-first development)
    - Set up TypeScript configuration with strict mode and path aliases
    - Configure ESLint and Prettier for consistent code style
    - Configure Turborepo pipeline for build, test, and lint tasks
    - Create .gitignore and .env.example files
    - _Requirements: Foundation for all subsequent work_

  - [x] 1.2 Set up Docker development environment
    - Create docker-compose.yml with PostgreSQL 15, Redis 7, and development containers
    - Configure PostgreSQL with appropriate extensions and initial database
    - Configure Redis with persistence and appropriate memory limits
    - Create Dockerfile for backend service with multi-stage build
    - Add npm scripts for docker operations (up, down, logs)
    - _Requirements: 25.3, 26.1_

  - [x] 1.3 Initialize NestJS backend application
    - Create NestJS application in backend workspace
    - Set up module structure for services (user, schedule, swap, overtime, compliance, fairness, audit)
    - Configure environment variable loading with validation using Zod schemas
    - Set up health check endpoint
    - Add Pino logging configuration with structured logging
    - Install and configure Swagger/Scalar for API documentation
    - Configure Argon2 for password hashing (replace bcrypt references)
    - _Requirements: 30.1_

  - [x] 1.4 Configure Prisma ORM with PostgreSQL
    - Install Prisma and initialize with PostgreSQL provider
    - Create complete Prisma schema from design document (all models, relations, indexes)
    - Generate Prisma Client and configure in NestJS
    - Create initial migration and apply to development database
    - Set up Prisma connection pooling and query logging
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 3.1, 4.1, 7.1, 8.1, 9.1, 19.1, 21.1, 22.1, 27.1_

  - [x] 1.5 Set up Redis integration with connection management
    - Install ioredis and configure Redis client with connection pooling
    - Create Redis module in NestJS with health checks
    - Implement connection retry logic with exponential backoff
    - Configure Redis for caching, distributed locks, and job queues (separate logical databases)
    - Add Redis connection error handling and graceful degradation
    - _Requirements: 16.1, 16.5, 25.4, 29.2_

- [x] 2. Implement data models and database layer
  - [x] 2.1 Create Prisma models for user management
    - Implement User, Role, Skill, UserSkill, Location, LocationCertification, ManagerLocation models
    - Add all required indexes for query optimization
    - Implement unique constraints for data integrity
    - Add cascade delete rules for referential integrity
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 2.2 Create Prisma models for scheduling
    - Implement Shift, ShiftSkill, Assignment models with timezone support
    - Add indexes for common query patterns (location, time range, staff)
    - Implement optimistic locking with version field on Assignment
    - Add UTC timestamp storage with timezone context preservation
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 17.1, 17.2, 18.1_

  - [x] 2.3 Create Prisma models for swap workflow and callouts
    - Implement SwapRequest model with status enum and approval tracking
    - Implement Callout model with shift and staff references
    - Add indexes for filtering by status and date
    - _Requirements: 7.1, 7.5, 8.1, 22.1, 22.3_

  - [x] 2.4 Create Prisma models for configuration and audit
    - Implement LocationConfig and PremiumShiftCriteria models
    - Implement AuditLog model with hash field for integrity verification
    - Add indexes for audit log queries (entity type, user, timestamp, action)
    - Configure append-only behavior for audit logs
    - _Requirements: 10.1, 11.1, 12.1, 14.1, 19.1, 19.2, 19.3, 19.4, 20.1, 20.3, 27.1, 27.2, 27.3_

  - [x] 2.5 Run database migrations and verify schema
    - Generate and apply all Prisma migrations
    - Verify all tables, indexes, and constraints created correctly
    - Seed development database with test data (4 locations, skills, users)
    - Test database connection and basic CRUD operations
    - _Requirements: Foundation for all data operations_

  - [x] 2.6 Create Prisma models for new features (Requirements 31-42)
    - [x] 2.6.1 Add AvailabilityWindow and AvailabilityException models
      - Implement AvailabilityWindow with userId, dayOfWeek, startTime, endTime
      - Implement AvailabilityException with userId, date, startTime, endTime
      - Add indexes for userId and date/dayOfWeek lookups
      - _Requirements: 31.1, 31.2_
    - [x] 2.6.2 Add schedule publishing fields to Shift model
      - Add isPublished Boolean field (default false)
      - Add publishedAt DateTime field (nullable)
      - Add index for isPublished for filtering queries
      - _Requirements: 32.1, 32.2_
    - [x] 2.6.3 Add DropRequest model
      - Implement DropRequest with shiftId, requestorId, status, expiresAt, claimedBy, claimedAt
      - Add DropStatus enum (PENDING, CLAIMED, EXPIRED, CANCELLED)
      - Add indexes for shiftId, requestorId, status, expiresAt
      - _Requirements: 33.1, 33.2, 33.3_
    - [x] 2.6.4 Add CANCELLED status to SwapStatus enum
      - Update SwapStatus enum to include CANCELLED
      - _Requirements: 36.1, 37.1_
    - [x] 2.6.5 Add Notification and NotificationPreference models
      - Implement Notification with userId, type, title, message, isRead, metadata
      - Implement NotificationPreference with userId, inAppEnabled, emailEnabled
      - Add indexes for userId, isRead, createdAt
      - _Requirements: 38.1, 38.2, 38.3_
    - [x] 2.6.6 Add compliance configuration fields to LocationConfig
      - Add schedulePublishCutoffHours Int field (default 48)
      - Add maxPendingRequests Int field (default 3)
      - _Requirements: 32.4, 35.1_
    - [x] 2.6.7 Add desiredWeeklyHours to User model
      - Add desiredWeeklyHours Float field (nullable)
      - _Requirements: 41.1_
    - [x] 2.6.8 Add requiredHeadcount to Shift model
      - Add requiredHeadcount Int field (default 1)
      - Update Assignment unique constraint from [shiftId] to [shiftId, staffId]
      - _Requirements: 42.1, 42.2_
    - [x] 2.6.9 Generate and apply migration for new features
      - Generate Prisma migration for all new models and fields
      - Apply migration to development database
      - Verify all new tables, fields, and indexes created correctly
      - Update seed scripts to include sample availability windows and notifications
      - _Requirements: 31-42_

- [x] 3. Checkpoint - Database layer complete
  - Ensure all migrations applied successfully, Prisma Client generates without errors, and test data seeded correctly. Ask the user if questions arise.

- [x] 4. Implement User Service with authentication
  - [x] 4.1 Create User Service with CRUD operations
    - Implement createUser with password hashing using Argon2
    - Implement role assignment with location authorization for managers
    - Implement getUsersByLocation with role-based filtering
    - Implement skill and certification assignment methods
    - Add input validation using Zod schemas from shared package
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]\* 4.2 Write property test for user creation
    - **Property 1: User Creation Assigns Exactly One Role**
    - **Validates: Requirements 1.2**

  - [ ]\* 4.3 Write property test for manager role authorization
    - **Property 2: Manager Role Requires Location Authorization**
    - **Validates: Requirements 1.3**

  - [x] 4.4 Implement JWT authentication with Passport.js
    - Set up Passport JWT strategy with secret key from environment
    - Implement authenticate method returning JWT token and user
    - Implement validateToken method for JWT verification
    - Configure JWT expiration to 24 hours
    - Add authentication guards for protected routes
    - _Requirements: 30.1, 30.2, 30.3, 30.4_

  - [ ]\* 4.5 Write property test for JWT token expiration
    - **Property 72: JWT Token Expiration Time**
    - **Validates: Requirements 30.2**

  - [x] 4.6 Implement role-based authorization guards
    - Create RolesGuard decorator for endpoint protection
    - Implement permission checking for resource access
    - Add location-scoped authorization for managers
    - Return 403 Forbidden for unauthorized actions with descriptive messages
    - _Requirements: 1.5, 30.5_

  - [ ]\* 4.7 Write property test for resource access permissions
    - **Property 3: Resource Access Requires Appropriate Permissions**
    - **Validates: Requirements 1.5**

  - [ ]\* 4.8 Write unit tests for User Service
    - Test password hashing and verification
    - Test role assignment validation
    - Test skill and certification assignment with timestamps
    - Test getUsersByLocation filtering

  - [x] 4.9 Implement availability management methods (Requirement 31)
    - Implement setAvailabilityWindow to create recurring weekly availability
    - Implement removeAvailabilityWindow to delete availability window
    - Implement addAvailabilityException for one-off unavailability
    - Implement getAvailability to retrieve windows and exceptions
    - Validate time format (HH:MM) and day of week (0-6)
    - _Requirements: 31.1, 31.2, 31.5_

  - [ ]\* 4.10 Write property test for availability window round trip
    - **Property 75: Availability Window Round Trip**
    - **Validates: Requirements 31.1**

  - [ ]\* 4.11 Write property test for availability exception round trip
    - **Property 76: Availability Exception Round Trip**
    - **Validates: Requirements 31.2**

  - [x] 4.12 Implement desired hours tracking (Requirement 41)
    - Implement setDesiredWeeklyHours to set staff desired hours
    - Implement getDesiredWeeklyHours to retrieve desired hours
    - Validate hours value (positive number)
    - _Requirements: 41.1_

  - [ ]\* 4.13 Write property test for desired hours round trip
    - **Property 121: Desired Hours Round Trip**
    - **Validates: Requirements 41.1**

  - [ ]\* 4.14 Write unit tests for availability and desired hours
    - Test availability window creation and retrieval
    - Test availability exception creation
    - Test desired hours setting and retrieval
    - Test validation for invalid time formats and values

- [x] 5. Implement Audit Logger service
  - [x] 5.1 Create Audit Service with logging methods
    - Implement logShiftChange, logAssignmentChange, logSwapAction, logUserChange methods
    - Generate SHA-256 hash for each audit record (action + entityType + entityId + userId + timestamp + states)
    - Store audit records with hash in append-only fashion
    - Implement queryAuditLog with filtering by date, user, entity type, action
    - Implement verifyIntegrity method to recompute and compare hashes
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 20.1, 20.2, 20.3, 20.4, 20.5_

  - [ ]\* 5.2 Write property test for audit record immutability
    - **Property 48: Audit Record Immutability**
    - **Validates: Requirements 20.2**

  - [ ]\* 5.3 Write property test for audit record hash generation
    - **Property 49: Audit Record Hash Generation**
    - **Validates: Requirements 20.3**

  - [ ]\* 5.4 Write property test for audit integrity verification
    - **Property 50: Audit Record Integrity Verification (round-trip)**
    - **Validates: Requirements 20.5**

  - [ ]\* 5.5 Write unit tests for Audit Service
    - Test audit log creation for each entity type
    - Test queryAuditLog filtering
    - Test hash generation consistency
    - Test integrity verification with tampered records

- [x] 6. Implement Cache Manager with Redis
  - [x] 6.1 Create Cache Manager service
    - Implement get, set, delete methods with TTL support
    - Configure TTL values: user data (15 min), schedule data (5 min), config (1 hour)
    - Implement cache key generation: `{entity}:{id}` or `{entity}:query:{hash}`
    - Add cache invalidation on write operations
    - Implement graceful degradation when Redis unavailable (log error, continue without cache)
    - _Requirements: 25.4, 25.5, 29.2_

  - [ ]\* 6.2 Write unit tests for Cache Manager
    - Test cache set and get with TTL expiration
    - Test cache invalidation
    - Test graceful degradation when Redis connection fails
    - Test cache key generation consistency

- [x] 7. Implement Distributed Lock Manager with Redlock
  - [x] 7.1 Create Lock Manager service using Redlock
    - Install and configure redlock library with Redis client
    - Implement acquireLock with 5-second default timeout
    - Implement releaseLock with error handling
    - Implement withLock helper for automatic lock acquisition and release
    - Add retry logic with exponential backoff (max 3 attempts, 3-second timeout)
    - Use lock key format: `lock:staff:{staffId}`
    - _Requirements: 5.4, 5.5, 16.1, 16.2, 16.3, 16.5, 26.3, 29.5_

  - [ ]\* 7.2 Write unit tests for Lock Manager
    - Test lock acquisition and release
    - Test lock timeout and automatic expiration
    - Test concurrent lock attempts with retry logic
    - Test withLock helper for automatic cleanup
    - Test lock release failure handling

- [x] 8. Implement Conflict Detector service
  - [x] 8.1 Create Conflict Detector with overlap checking
    - Implement checkOverlap method to find overlapping shifts for a staff member
    - Convert all shift times to UTC for cross-timezone comparison
    - Query database for shifts with time range overlap (startTime < newEnd AND endTime > newStart)
    - Integrate with Lock Manager for concurrent operation serialization
    - Return conflicting shift details when overlap detected
    - _Requirements: 4.3, 5.1, 5.2, 5.3, 16.1, 16.2, 17.3_

  - [ ]\* 8.2 Write property test for overlap detection
    - **Property 13: No Overlapping Shift Assignments**
    - **Validates: Requirements 4.3, 5.1**

  - [ ]\* 8.3 Write unit tests for Conflict Detector
    - Test overlap detection with same-timezone shifts
    - Test overlap detection with cross-timezone shifts
    - Test no overlap for adjacent shifts
    - Test overnight shift overlap detection
    - Test excludeShiftId parameter for swap scenarios

- [x] 9. Checkpoint - Core infrastructure services complete
  - Ensure User Service, Audit Logger, Cache Manager, Lock Manager, and Conflict Detector are working correctly. Run all tests. Ask the user if questions arise.

- [ ] 10. Implement Compliance Monitor service
  - [x] 10.1 Create Compliance Monitor with rest period validation
    - Implement validateRestPeriod to check 10-hour minimum gap before and after new shift
    - Convert shift times to UTC for accurate comparison across timezones
    - Query for adjacent shifts (previous and next) for the staff member
    - Return validation result with pass/fail and violation details
    - _Requirements: 4.4, 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]\* 10.2 Write property test for rest period enforcement
    - **Property 14: Rest Period Enforcement**
    - **Validates: Requirements 4.4, 6.3, 6.5**

  - [x] 10.3 Implement daily limit validation
    - Implement validateDailyLimit to check configured daily hour limit
    - Use rolling 24-hour window from shift start time
    - Query location config for daily limit settings
    - Skip validation if daily limit not configured for location
    - Handle overnight shifts by counting hours in the 24-hour period where shift starts
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [ ]\* 10.4 Write property test for daily limit enforcement
    - **Property 27: Daily Limit Enforcement When Enabled**
    - **Validates: Requirements 11.1**

  - [ ]\* 10.5 Write property test for daily limit not enforced when unconfigured
    - **Property 28: Daily Limit Not Enforced When Unconfigured**
    - **Validates: Requirements 11.5**

  - [x] 10.6 Implement weekly limit validation
    - Implement validateWeeklyLimit to check 40-hour weekly limit
    - Use rolling 7-day window from shift start date
    - Query location config for weekly limit settings (default enabled, 40 hours)
    - Calculate total hours including the new shift
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ]\* 10.7 Write property test for weekly limit enforcement
    - **Property 26: Weekly Limit Enforcement When Enabled**
    - **Validates: Requirements 10.1**

  - [x] 10.8 Implement consecutive days limit validation
    - Implement validateConsecutiveDays to check configured consecutive days limit
    - Count calendar days in staff user's primary location timezone
    - Reset counter when a calendar day has no shifts
    - Query location config for consecutive days settings
    - Skip validation if consecutive days limit not configured for location
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

  - [ ]\* 10.9 Write property test for consecutive days enforcement
    - **Property 29: Consecutive Days Limit Enforcement When Enabled**
    - **Validates: Requirements 12.1**

  - [ ]\* 10.10 Write property test for consecutive days counter reset
    - **Property 30: Consecutive Days Counter Reset**
    - **Validates: Requirements 12.3**

  - [ ]\* 10.11 Write property test for consecutive days not enforced when unconfigured
    - **Property 31: Consecutive Days Not Enforced When Unconfigured**
    - **Validates: Requirements 12.5**

  - [x] 10.12 Implement validateAll method combining all checks
    - Call all validation methods (rest period, daily, weekly, consecutive days)
    - Return array of validation results
    - Short-circuit on first failure for performance
    - _Requirements: 4.5_

  - [x] 10.13 Implement availability validation (Requirement 31)
    - Implement validateAvailability to check shift falls within staff availability windows
    - Check recurring weekly windows by day of week and time
    - Check one-off exceptions for specific dates
    - Return validation result with pass/fail and violation details
    - _Requirements: 31.3, 31.4_

  - [ ]\* 10.14 Write property test for shift assignment respects availability
    - **Property 77: Shift Assignment Respects Availability**
    - **Validates: Requirements 31.3**

  - [ ]\* 10.15 Write property test for availability changes affect future shifts only
    - **Property 78: Availability Changes Affect Future Shifts Only**
    - **Validates: Requirements 31.5**

  - [x] 10.16 Implement enhanced compliance warnings (Requirement 39)
    - Implement validateWithGraduation method returning errors and warnings separately
    - 8-hour day: warning only, allow assignment
    - 12-hour day: hard error, block assignment
    - 6 consecutive days: warning only, allow assignment
    - 7 consecutive days: require override with documented reason
    - 35+ hours in 7 days: warning for overtime proximity
    - _Requirements: 39.1, 39.2, 39.3, 39.4, 39.5_

  - [ ]\* 10.17 Write property test for eight hour day warning
    - **Property 111: Eight Hour Day Warning Without Block**
    - **Validates: Requirements 39.1**

  - [ ]\* 10.18 Write property test for twelve hour day hard block
    - **Property 112: Twelve Hour Day Hard Block**
    - **Validates: Requirements 39.2**

  - [ ]\* 10.19 Write property test for six consecutive days warning
    - **Property 113: Six Consecutive Days Warning**
    - **Validates: Requirements 39.3**

  - [ ]\* 10.20 Write property test for seven consecutive days override
    - **Property 114: Seven Consecutive Days Requires Override**
    - **Validates: Requirements 39.4**

  - [ ]\* 10.21 Write property test for thirty-five hour proximity warning
    - **Property 115: Thirty-Five Hour Proximity Warning**
    - **Validates: Requirements 39.5**

  - [ ]\* 10.22 Write unit tests for enhanced compliance
    - Test graduated warnings for 8-hour and 6-day scenarios
    - Test hard blocks for 12-hour and 7-day scenarios
    - Test overtime proximity warnings
    - Test override mechanism for 7-day scenario

  - [ ]\* 10.13 Write unit tests for Compliance Monitor
    - Test rest period validation with various shift gaps
    - Test daily limit with overnight shifts
    - Test weekly limit with rolling window
    - Test consecutive days with timezone boundaries
    - Test validateAll with multiple violations

- [ ] 11. Implement Schedule Service with shift management
  - [x] 11.1 Create Schedule Service with shift CRUD operations
    - Implement createShift with validation (end time after start time, required fields)
    - Store shift times in UTC with location timezone context
    - Support overnight shift creation (spans midnight)
    - Validate manager authorization for location
    - Integrate with Audit Logger for shift creation
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 18.1_

  - [ ]\* 11.2 Write property test for shift creation validation
    - **Property 7: Shift Creation Requires All Fields**
    - **Validates: Requirements 3.1**

  - [ ]\* 11.3 Write property test for shift end time validation
    - **Property 8: Shift End Time After Start Time**
    - **Validates: Requirements 3.2**

  - [ ]\* 11.4 Write property test for shift timezone context
    - **Property 9: Shift Timezone Context Preservation**
    - **Validates: Requirements 3.4**

  - [ ]\* 11.5 Write property test for manager shift creation authorization
    - **Property 10: Manager Shift Creation Authorization**
    - **Validates: Requirements 3.5**

  - [x] 11.6 Implement staff assignment with constraint validation
    - Implement assignStaff method with skill and certification checks
    - Verify staff has all required skills for shift
    - Verify staff has location certification
    - Use Conflict Detector with distributed lock to check for overlaps
    - Use Compliance Monitor to validate all constraints
    - Create Assignment record with optimistic locking (version field)
    - Integrate with Audit Logger for assignment changes
    - Invalidate cache for affected staff and schedule
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 26.1, 26.2, 26.3_

  - [ ]\* 11.7 Write property test for staff assignment skill requirement
    - **Property 11: Staff Assignment Requires Skills**
    - **Validates: Requirements 4.1**

  - [ ]\* 11.8 Write property test for staff assignment certification requirement
    - **Property 12: Staff Assignment Requires Location Certification**
    - **Validates: Requirements 4.2**

  - [x] 11.9 Implement unassignStaff method
    - Remove assignment record with optimistic locking check
    - Integrate with Audit Logger for assignment removal
    - Invalidate cache for affected staff and schedule
    - _Requirements: 8.4, 26.1_

  - [x] 11.10 Implement schedule query methods
    - Implement getSchedule to retrieve shifts for location and date range
    - Convert shift times to location timezone for display
    - Implement getStaffSchedule to retrieve shifts for staff member
    - Add pagination support for large result sets
    - Use cache for frequently accessed schedules
    - _Requirements: 17.1, 17.4, 25.4_

  - [ ]\* 11.11 Write property test for shift display in location timezone
    - **Property 43: Shift Display in Location Timezone**
    - **Validates: Requirements 17.1**

  - [ ]\* 11.12 Write unit tests for Schedule Service
    - Test shift creation with overnight shifts
    - Test staff assignment with all validation scenarios
    - Test unassignStaff with optimistic locking
    - Test getSchedule with timezone conversion
    - Test cache invalidation on updates

  - [x] 11.13 Implement schedule publishing (Requirement 32)
    - Implement publishSchedule to mark all shifts in a week as published
    - Implement unpublishSchedule with cutoff time enforcement
    - Filter staff queries to show only published shifts
    - Managers see all shifts regardless of published status
    - Integrate with Notification Service to notify staff on publishing
    - _Requirements: 32.1, 32.2, 32.3, 32.4, 32.5_

  - [ ]\* 11.14 Write property test for schedule publishing marks all shifts
    - **Property 79: Schedule Publishing Marks All Shifts**
    - **Validates: Requirements 32.1**

  - [ ]\* 11.15 Write property test for published shifts visible to staff
    - **Property 80: Published Shifts Visible to Staff**
    - **Validates: Requirements 32.2, 32.3**

  - [ ]\* 11.16 Write property test for unpublish cutoff enforcement
    - **Property 81: Unpublish Cutoff Enforcement**
    - **Validates: Requirements 32.4**

  - [x] 11.17 Implement shift pickup (Requirement 34)
    - Implement getAvailableShifts to show unassigned shifts and drop requests
    - Filter by staff qualifications (skills, certifications)
    - Filter by staff availability windows
    - Implement pickupShift with full constraint validation
    - Remove shift from available listings on successful pickup
    - _Requirements: 34.1, 34.2, 34.3, 34.4_

  - [ ]\* 11.18 Write property test for available shifts include drop requests
    - **Property 87: Available Shifts Include Drop Requests**
    - **Validates: Requirements 34.1**

  - [ ]\* 11.19 Write property test for available shifts filtered by qualifications
    - **Property 88: Available Shifts Filtered by Qualifications**
    - **Validates: Requirements 34.2**

  - [ ]\* 11.20 Write property test for shift pickup validates constraints
    - **Property 89: Shift Pickup Validates Constraints**
    - **Validates: Requirements 34.3**

  - [ ]\* 11.21 Write property test for successful pickup assigns and removes
    - **Property 90: Successful Pickup Assigns and Removes from Available**
    - **Validates: Requirements 34.4**

  - [x] 11.22 Implement alternative staff suggestions (Requirement 40)
    - Implement getAlternativeStaff for constraint violation scenarios
    - Verify candidates have required skills, certifications, and availability
    - Validate candidates would not violate scheduling constraints
    - Rank candidates by current hour totals (ascending)
    - Return top 5 suggestions with hours and availability status
    - _Requirements: 40.1, 40.2, 40.3, 40.4, 40.5_

  - [ ]\* 11.23 Write property test for constraint violation provides alternatives
    - **Property 116: Constraint Violation Provides Alternatives**
    - **Validates: Requirements 40.1**

  - [ ]\* 11.24 Write property test for alternative staff meet requirements
    - **Property 117: Alternative Staff Meet Requirements**
    - **Validates: Requirements 40.2**

  - [ ]\* 11.25 Write property test for alternative staff pass validation
    - **Property 118: Alternative Staff Pass Constraint Validation**
    - **Validates: Requirements 40.3**

  - [ ]\* 11.26 Write property test for alternative staff ranked by hours
    - **Property 119: Alternative Staff Ranked by Hours**
    - **Validates: Requirements 40.4**

  - [ ]\* 11.27 Write property test for alternative staff limited to five
    - **Property 120: Alternative Staff Limited to Five**
    - **Validates: Requirements 40.5**

  - [x] 11.28 Implement headcount tracking (Requirement 42)
    - Implement getShiftHeadcountStatus to return filled vs required headcount
    - Validate assignments don't exceed required headcount
    - Mark shifts as fully covered when headcount reached
    - Remove fully covered shifts from available listings
    - Display partially covered status for unfilled headcount
    - _Requirements: 42.1, 42.2, 42.3, 42.4, 42.5_

  - [ ]\* 11.29 Write property test for shift headcount storage and retrieval
    - **Property 126: Shift Headcount Storage and Retrieval**
    - **Validates: Requirements 42.1**

  - [ ]\* 11.30 Write property test for multiple assignments up to headcount
    - **Property 127: Multiple Assignments Up to Headcount**
    - **Validates: Requirements 42.2**

  - [ ]\* 11.31 Write property test for filled headcount matches assignments
    - **Property 128: Filled Headcount Matches Assignments**
    - **Validates: Requirements 42.3**

  - [ ]\* 11.32 Write property test for partially filled shift status
    - **Property 129: Partially Filled Shift Status**
    - **Validates: Requirements 42.4**

  - [ ]\* 11.33 Write property test for fully filled shift removed
    - **Property 130: Fully Filled Shift Removed from Available**
    - **Validates: Requirements 42.5**

  - [ ]\* 11.34 Write unit tests for new Schedule Service features
    - Test schedule publishing and unpublishing
    - Test shift pickup with constraint validation
    - Test alternative staff suggestions ranking
    - Test headcount tracking and validation

- [x] 12. Checkpoint - Schedule Service complete
  - Ensure Schedule Service creates shifts, assigns staff with full validation, and handles timezones correctly. Run all tests. Ask the user if questions arise.

- [ ] 13. Implement Swap Workflow Manager service
  - [x] 13.1 Create Swap Service with request creation
    - Implement createSwapRequest with validation
    - Verify requestor is assigned to the specified shift
    - Verify target staff has required skills for shift
    - Verify target staff has location certification
    - Set initial status to "pending"
    - Integrate with Audit Logger for swap request creation
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ]\* 13.2 Write property test for swap request validation
    - **Property 15: Swap Request Requires Valid Fields**
    - **Validates: Requirements 7.1**

  - [ ]\* 13.3 Write property test for swap requestor assignment
    - **Property 16: Swap Requestor Must Be Assigned**
    - **Validates: Requirements 7.2**

  - [ ]\* 13.4 Write property test for swap target skills
    - **Property 17: Swap Target Must Have Required Skills**
    - **Validates: Requirements 7.3**

  - [ ]\* 13.5 Write property test for swap target certification
    - **Property 18: Swap Target Must Have Location Certification**
    - **Validates: Requirements 7.4**

  - [ ]\* 13.6 Write property test for swap request initial status
    - **Property 19: Swap Request Initial Status**
    - **Validates: Requirements 7.5**

  - [x] 13.7 Implement swap approval workflow
    - Implement approveSwap method with re-validation
    - Re-validate all scheduling constraints for target staff (skills, certification, overlap, rest period)
    - Use database transaction for atomic assignment update
    - Remove original assignment and create new assignment in single transaction
    - Use Conflict Detector with distributed lock during approval
    - Integrate with Audit Logger for approval decision
    - Invalidate cache for both staff members and schedule
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 26.1, 26.2, 26.3, 26.4_

  - [ ]\* 13.8 Write property test for swap approval re-validation
    - **Property 20: Swap Approval Re-validates Constraints**
    - **Validates: Requirements 8.2**

  - [ ]\* 13.9 Write property test for swap approval atomic update
    - **Property 21: Swap Approval Atomic Assignment Update**
    - **Validates: Requirements 8.4**

  - [x] 13.10 Implement swap rejection workflow
    - Implement rejectSwap method with reason parameter
    - Update swap request status to "rejected"
    - Store rejection reason
    - Integrate with Audit Logger for rejection decision
    - _Requirements: 8.5_

  - [ ]\* 13.11 Write property test for swap actions audit logging
    - **Property 22: Swap Actions Create Audit Logs**
    - **Validates: Requirements 8.5**

  - [x] 13.12 Implement swap query methods
    - Implement getPendingSwaps for manager view
    - Implement getSwapsByStaff for staff view
    - Filter by location authorization for managers
    - _Requirements: 8.1_

  - [ ]\* 13.13 Write unit tests for Swap Service
    - Test swap request creation with validation failures
    - Test swap approval with constraint violations
    - Test swap approval transaction rollback on failure
    - Test swap rejection with reason storage
    - Test getPendingSwaps filtering

  - [x] 13.14 Implement drop requests (Requirement 33)
    - Implement createDropRequest without target staff specification
    - Mark shift as available for pickup by any qualified staff
    - Set expiration time to 24 hours before shift start
    - Implement expireDropRequests background job to auto-expire unclaimed requests
    - Notify requestor on expiration and restore original assignment
    - Include drop requests in pending request count
    - _Requirements: 33.1, 33.2, 33.3, 33.4, 33.5_

  - [ ]\* 13.15 Write property test for drop request without target staff
    - **Property 82: Drop Request Without Target Staff**
    - **Validates: Requirements 33.1**

  - [ ]\* 13.16 Write property test for drop request makes shift available
    - **Property 83: Drop Request Makes Shift Available**
    - **Validates: Requirements 33.2**

  - [ ]\* 13.17 Write property test for drop request auto-expiration
    - **Property 84: Drop Request Auto-Expiration**
    - **Validates: Requirements 33.3**

  - [ ]\* 13.18 Write property test for drop requests count toward limit
    - **Property 85: Drop Requests Count Toward Pending Limit**
    - **Validates: Requirements 33.4, 35.2**

  - [ ]\* 13.19 Write property test for drop request expiration restores assignment
    - **Property 86: Drop Request Expiration Restores Assignment**
    - **Validates: Requirements 33.5**

  - [x] 13.20 Implement request limits (Requirement 35)
    - Implement getPendingRequestCount including swap and drop requests
    - Enforce maximum pending requests (configurable per location, default 3)
    - Reject new requests when at limit with descriptive error
    - Decrement count when requests are approved, rejected, expired, or cancelled
    - _Requirements: 35.1, 35.2, 35.3, 35.4, 35.5_

  - [ ]\* 13.21 Write property test for pending request limit enforcement
    - **Property 91: Pending Request Limit Enforcement**
    - **Validates: Requirements 35.1**

  - [ ]\* 13.22 Write property test for request status change decrements count
    - **Property 92: Request Status Change Decrements Count**
    - **Validates: Requirements 35.4**

  - [ ]\* 13.23 Write property test for pending request limit configuration
    - **Property 93: Pending Request Limit Configuration**
    - **Validates: Requirements 35.5**

  - [x] 13.24 Implement swap cancellation on shift edit (Requirement 36)
    - Detect pending swap requests when shift is edited
    - Automatically cancel all pending swaps for that shift
    - Notify requestor and target staff of cancellation
    - Log cancellation with reason "shift edited by manager"
    - Decrement pending request count for affected staff
    - _Requirements: 36.1, 36.2, 36.3, 36.4, 36.5_

  - [ ]\* 13.25 Write property test for shift edit cancels pending swaps
    - **Property 94: Shift Edit Cancels Pending Swaps**
    - **Validates: Requirements 36.1**

  - [ ]\* 13.26 Write property test for swap cancellation notifications
    - **Property 95: Swap Cancellation Notifications**
    - **Validates: Requirements 36.2**

  - [ ]\* 13.27 Write property test for swap cancellation audit log
    - **Property 96: Swap Cancellation Audit Log**
    - **Validates: Requirements 36.3**

  - [ ]\* 13.28 Write property test for swap cancellation decrements count
    - **Property 97: Swap Cancellation Decrements Count**
    - **Validates: Requirements 36.5, 37.5**

  - [x] 13.29 Implement swap cancellation by requestor (Requirement 37)
    - Implement cancelSwapRequest allowing staff to cancel own pending swaps
    - Update request status to "cancelled"
    - Notify target staff and manager of cancellation
    - Log cancellation with timestamp and requestor
    - Decrement requestor's pending request count
    - _Requirements: 37.1, 37.2, 37.3, 37.4, 37.5_

  - [ ]\* 13.30 Write property test for staff can cancel own pending swaps
    - **Property 98: Staff Can Cancel Own Pending Swaps**
    - **Validates: Requirements 37.1**

  - [ ]\* 13.31 Write property test for swap cancellation updates status
    - **Property 99: Swap Cancellation Updates Status**
    - **Validates: Requirements 37.2**

  - [ ]\* 13.32 Write property test for requestor cancellation notifications
    - **Property 100: Requestor Cancellation Notifications**
    - **Validates: Requirements 37.3**

  - [ ]\* 13.33 Write property test for requestor cancellation audit log
    - **Property 101: Requestor Cancellation Audit Log**
    - **Validates: Requirements 37.4**

  - [ ]\* 13.34 Write unit tests for drop requests and cancellations
    - Test drop request creation and expiration
    - Test request limit enforcement
    - Test swap cancellation on shift edit
    - Test swap cancellation by requestor
    - Test pending count updates

- [ ] 14. Implement Overtime Tracker service
  - [x] 14.1 Create Overtime Service with hour calculation
    - Implement calculateHours for staff member and date range
    - Sum all assigned shift durations in the period
    - Use rolling 7-day window for overtime calculation
    - Return regular hours and overtime hours (excess over 40)
    - _Requirements: 9.1, 9.2, 9.3_

  - [ ]\* 14.2 Write property test for overtime calculation
    - **Property 23: Overtime Calculation Matches Shift Hours**
    - **Validates: Requirements 9.1**

  - [ ]\* 14.3 Write property test for overtime flagging
    - **Property 24: Overtime Flagging Above 40 Hours**
    - **Validates: Requirements 9.3**

  - [x] 14.4 Implement overtime warning for new assignments
    - Implement checkOvertimeWarning to calculate projected overtime
    - Calculate current hours in 7-day window from new shift start
    - Add new shift hours to current total
    - Return warning if total exceeds 40 hours with projected overtime amount
    - _Requirements: 9.5_

  - [ ]\* 14.5 Write property test for overtime warning generation
    - **Property 25: Overtime Warning Generation**
    - **Validates: Requirements 9.5**

  - [x] 14.6 Implement overtime reporting
    - Implement getOvertimeReport for location and week
    - Return report with regular and overtime hours for each staff member
    - Implement generatePayPeriodReport as background job (placeholder for now)
    - _Requirements: 9.4_

  - [ ]\* 14.7 Write unit tests for Overtime Service
    - Test calculateHours with various shift combinations
    - Test overtime flagging at exactly 40 hours
    - Test checkOvertimeWarning with edge cases
    - Test getOvertimeReport aggregation

- [ ] 15. Implement Fairness Analyzer service
  - [x] 15.1 Create Fairness Service with hour distribution calculation
    - Implement calculateHourDistribution for location and date range
    - Calculate total hours for each staff member
    - Calculate mean and standard deviation across all staff
    - Identify outliers (staff with hours > 1 standard deviation from mean)
    - Return distribution data with statistics
    - _Requirements: 13.1, 13.2, 13.3_

  - [ ]\* 15.2 Write property test for fairness hour calculation
    - **Property 32: Fairness Hour Calculation Matches Shifts**
    - **Validates: Requirements 13.1**

  - [ ]\* 15.3 Write property test for fairness mean calculation
    - **Property 33: Fairness Mean Calculation**
    - **Validates: Requirements 13.2**

  - [ ]\* 15.4 Write property test for fairness outlier identification
    - **Property 34: Fairness Outlier Identification**
    - **Validates: Requirements 13.3**

  - [x] 15.5 Implement premium shift distribution calculation
    - Implement calculatePremiumShiftDistribution for location and date range
    - Query location config for premium shift criteria (day of week, time of day, holidays)
    - Identify premium shifts based on criteria
    - Calculate premium shift count and percentage for each staff member
    - Identify outliers with disproportionate premium shift assignments
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

  - [ ]\* 15.6 Write property test for premium shift identification
    - **Property 35: Premium Shift Identification**
    - **Validates: Requirements 14.1**

  - [ ]\* 15.7 Write property test for premium shift count accuracy
    - **Property 36: Premium Shift Count Accuracy**
    - **Validates: Requirements 14.2**

  - [ ]\* 15.8 Write property test for premium shift percentage calculation
    - **Property 37: Premium Shift Percentage Calculation**
    - **Validates: Requirements 14.3**

  - [ ]\* 15.9 Write property test for premium shift outlier identification
    - **Property 38: Premium Shift Outlier Identification**
    - **Validates: Requirements 14.4**

  - [x] 15.10 Implement fairness report generation
    - Implement generateFairnessReport as background job (placeholder for now)
    - Combine hour distribution and premium shift distribution
    - _Requirements: 13.4, 13.5_

  - [ ]\* 15.11 Write unit tests for Fairness Service
    - Test hour distribution with various scenarios
    - Test premium shift identification with different criteria
    - Test outlier detection at boundary conditions
    - Test percentage calculations with edge cases

  - [ ] 15.12 Implement desired hours comparison (Requirement 41)
    - Implement compareActualToDesiredHours for location and date range
    - Calculate actual scheduled hours for each staff user
    - Compare to desired weekly hours (if set)
    - Identify under-scheduled staff (actual significantly below desired)
    - Identify over-scheduled staff (actual significantly above desired)
    - Include desired vs actual hours in fairness reports
    - _Requirements: 41.2, 41.3, 41.4, 41.5_

  - [ ]\* 15.13 Write property test for actual vs desired hours comparison
    - **Property 122: Actual vs Desired Hours Comparison Accuracy**
    - **Validates: Requirements 41.2**

  - [ ]\* 15.14 Write property test for under-scheduled identification
    - **Property 123: Under-Scheduled Staff Identification**
    - **Validates: Requirements 41.3**

  - [ ]\* 15.15 Write property test for over-scheduled identification
    - **Property 124: Over-Scheduled Staff Identification**
    - **Validates: Requirements 41.4**

  - [ ]\* 15.16 Write property test for fairness report includes desired hours
    - **Property 125: Fairness Report Includes Desired Hours**
    - **Validates: Requirements 41.5**

  - [ ]\* 15.17 Write unit tests for desired hours comparison
    - Test comparison with various actual vs desired scenarios
    - Test under-scheduled identification
    - Test over-scheduled identification
    - Test fairness report with desired hours display

- [x] 16. Checkpoint - Business logic services complete
  - Ensure Swap Service, Overtime Tracker, and Fairness Analyzer are working correctly. Run all tests. Ask the user if questions arise.

- [ ] 17. Implement Background Job Queue with BullMQ
  - [ ] 17.1 Set up BullMQ with Redis and BullBoard
    - Install BullMQ and configure with Redis connection
    - Install and configure BullBoard for job queue visualization
    - Create job queue module in NestJS
    - Configure job options (3 attempts, exponential backoff, retention limits)
    - Set up job processors for different job types
    - Mount BullBoard UI at /admin/queues endpoint (Admin only)
    - _Requirements: 24.1, 24.5, 29.4_

  - [ ] 17.1a Implement drop request expiration job (Requirement 33)
    - Create job processor for "drop-request-expiration" job type
    - Schedule job to run periodically (e.g., every 15 minutes)
    - Query for drop requests with expiresAt < now and status PENDING
    - Update status to EXPIRED
    - Restore original staff assignment
    - Notify requestor of expiration
    - _Requirements: 33.3, 33.5_

  - [x] 17.2 Implement fairness report background job
    - Create job processor for "fairness-report" job type
    - Accept location ID, start date, end date as job data
    - Call Fairness Service methods to generate report
    - Store report results in database or cache
    - Emit job completion event for real-time notification
    - _Requirements: 24.2_

  - [ ]\* 17.3 Write property test for fairness report job queuing
    - **Property 62: Fairness Report Background Job Queuing**
    - **Validates: Requirements 24.2**

  - [x] 17.4 Implement overtime report background job
    - Create job processor for "overtime-report" job type
    - Accept multiple pay periods as job data
    - Call Overtime Service methods to calculate overtime
    - Store report results in database or cache
    - Emit job completion event for real-time notification
    - _Requirements: 24.3_

  - [ ]\* 17.5 Write property test for overtime report job queuing
    - **Property 63: Overtime Report Background Job Queuing**
    - **Validates: Requirements 24.3**

  - [x] 17.6 Implement job status tracking
    - Create endpoints to query job status (queued, processing, completed, failed)
    - Store job metadata for user tracking
    - Implement admin interface to view and retry failed jobs
    - _Requirements: 24.5_

  - [ ]\* 17.7 Write unit tests for job queue
    - Test job creation and queuing
    - Test job processing and completion
    - Test job retry on failure
    - Test job status tracking

- [ ] 18. Implement Real-Time Sync with Socket.io
  - [x] 18.1 Set up Socket.io server with NestJS
    - Install Socket.io and configure WebSocket gateway
    - Set up JWT authentication for WebSocket connections
    - Implement connection and disconnection handlers
    - Configure CORS for WebSocket connections
    - _Requirements: 15.3, 30.1_

  - [x] 18.2 Implement room-based subscriptions
    - Implement subscribe:location and subscribe:staff client events
    - Verify user authorization before subscribing to rooms
    - Join client to appropriate Socket.io rooms
    - Implement unsubscribe events and cleanup on disconnect
    - _Requirements: 15.4, 15.5_

  - [ ]\* 18.3 Write property test for client subscription authorization
    - **Property 41: Client Subscription Authorization**
    - **Validates: Requirements 15.4**

  - [x] 18.4 Implement server-to-client event broadcasting
    - Implement shift:created, shift:updated, shift:deleted events
    - Implement assignment:changed event
    - Implement swap:created, swap:updated events
    - Implement conflict:detected event
    - Implement job:completed event
    - Implement callout:reported event
    - Broadcast events to appropriate rooms (location-based, staff-based)
    - _Requirements: 15.1, 15.2, 16.4, 22.2, 24.4_

  - [ ] 18.4a Implement new real-time events (Requirements 32-38)
    - Implement shift:published event for schedule publishing
    - Implement swap:cancelled event for swap cancellations
    - Implement drop:created event for drop request creation
    - Implement drop:claimed event for shift pickup
    - Implement drop:expired event for drop request expiration
    - Implement notification:new event for notification system
    - Broadcast events to appropriate rooms
    - _Requirements: 32.1, 33.2, 33.3, 34.4, 36.2, 37.3, 38.4_

  - [ ]\* 18.5 Write property test for real-time shift change broadcast
    - **Property 39: Real-Time Shift Change Broadcast**
    - **Validates: Requirements 15.1**

  - [ ]\* 18.6 Write property test for real-time assignment change broadcast
    - **Property 40: Real-Time Assignment Change Broadcast**
    - **Validates: Requirements 15.2**

  - [ ]\* 18.7 Write property test for conflict notification broadcast
    - **Property 42: Conflict Notification Broadcast**
    - **Validates: Requirements 16.4**

  - [x] 18.8 Integrate real-time events with services
    - Add event emission to Schedule Service (shift and assignment changes)
    - Add event emission to Swap Service (swap request updates)
    - Add event emission to Conflict Detector (conflict detection)
    - Add event emission to job queue (job completion)
    - Add event emission to callout reporting
    - _Requirements: 15.1, 15.2, 16.4, 22.2, 24.4_

  - [ ]\* 18.9 Write unit tests for real-time sync
    - Test WebSocket authentication
    - Test room subscription and authorization
    - Test event broadcasting to correct rooms
    - Test connection cleanup on disconnect

- [ ] 19. Implement Callout Management
  - [x] 19.1 Create callout reporting functionality
    - Implement reportCallout method requiring shift specification
    - Mark shift as uncovered in database
    - Integrate with Audit Logger for callout recording
    - Emit callout:reported event via real-time sync
    - Notify all managers authorized for shift's location
    - _Requirements: 22.1, 22.2, 22.3, 22.4_

  - [ ]\* 19.2 Write property test for callout shift requirement
    - **Property 54: Callout Requires Shift Specification**
    - **Validates: Requirements 22.1**

  - [ ]\* 19.3 Write property test for callout manager notification
    - **Property 55: Callout Manager Notification**
    - **Validates: Requirements 22.2**

  - [ ]\* 19.4 Write property test for callout marks shift uncovered
    - **Property 56: Callout Marks Shift Uncovered**
    - **Validates: Requirements 22.3**

  - [ ]\* 19.5 Write property test for callout audit logging
    - **Property 57: Callout Audit Logging**
    - **Validates: Requirements 22.4**

  - [x] 19.2 Implement coverage gap analysis
    - Implement findAvailableStaff for uncovered shift
    - Filter staff by required skills and location certification
    - Filter out staff who would violate scheduling constraints
    - Rank available staff by current hour totals (ascending)
    - Return ranked list of available staff
    - _Requirements: 23.1, 23.2, 23.3_

  - [ ]\* 19.7 Write property test for coverage gap staff qualification
    - **Property 58: Coverage Gap Staff Qualification**
    - **Validates: Requirements 23.1**

  - [ ]\* 19.8 Write property test for coverage gap constraint filtering
    - **Property 59: Coverage Gap Constraint Filtering**
    - **Validates: Requirements 23.2**

  - [ ]\* 19.9 Write property test for coverage gap staff ranking
    - **Property 60: Coverage Gap Staff Ranking**
    - **Validates: Requirements 23.3**

  - [x] 19.10 Implement coverage gap notifications
    - Send notifications to manager and all available staff
    - Include shift details and available staff list in manager notification
    - Implement sendShiftOffer method for direct offers to specific staff
    - _Requirements: 23.4, 23.5_

  - [ ]\* 19.11 Write property test for coverage gap notification
    - **Property 61: Coverage Gap Notification**
    - **Validates: Requirements 23.4**

  - [x] 19.12 Implement central workforce visibility dashboard data
    - Implement getCurrentCoverage for all locations
    - Highlight uncovered shifts
    - Calculate available staff count per location
    - Implement getUpcomingShifts for next 24 hours across all locations
    - Update dashboard data on callout reporting
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5_

  - [ ]\* 19.13 Write property test for available staff count accuracy
    - **Property 51: Available Staff Count Accuracy**
    - **Validates: Requirements 21.3**

  - [ ]\* 19.14 Write property test for upcoming shifts time window
    - **Property 52: Upcoming Shifts Time Window**
    - **Validates: Requirements 21.4**

  - [ ]\* 19.15 Write property test for callout dashboard update
    - **Property 53: Callout Dashboard Update**
    - **Validates: Requirements 21.5**

  - [ ]\* 19.16 Write unit tests for callout management
    - Test callout reporting with audit logging
    - Test findAvailableStaff filtering and ranking
    - Test coverage gap notifications
    - Test dashboard data updates

- [x] 20. Checkpoint - Real-time and callout features complete
  - Ensure background jobs, WebSocket communication, and callout management are working correctly. Run all tests. Ask the user if questions arise.

- [ ] 20a. Implement Notification Service (Requirement 38)
  - [ ] 20a.1 Create Notification Service with CRUD operations
    - Implement createNotification with userId, type, title, message, metadata
    - Implement getNotifications with optional includeRead filter
    - Implement markAsRead for single notification
    - Implement markAllAsRead for user
    - Store notifications with read/unread status
    - _Requirements: 38.1, 38.3_

  - [ ]\* 20a.2 Write property test for notification persistence with status
    - **Property 102: Notification Persistence with Status**
    - **Validates: Requirements 38.1**

  - [ ]\* 20a.3 Write property test for notification history completeness
    - **Property 104: Notification History Completeness**
    - **Validates: Requirements 38.3**

  - [ ] 20a.4 Implement notification preferences
    - Implement setNotificationPreferences with inAppEnabled, emailEnabled
    - Implement getNotificationPreferences
    - Default: in-app enabled, email disabled
    - _Requirements: 38.2_

  - [ ]\* 20a.5 Write property test for notification preferences round trip
    - **Property 103: Notification Preferences Round Trip**
    - **Validates: Requirements 38.2**

  - [ ] 20a.6 Implement event-triggered notifications
    - Implement notifyShiftAssignment for staff assignments
    - Implement notifyShiftModification for shift changes
    - Implement notifySwapRequest for swap creation, approval, rejection
    - Implement notifySchedulePublished for bulk staff notification
    - Implement notifyOvertimeApproaching for 35+ hour warnings
    - Implement notifyAvailabilityChange for manager notifications
    - Integrate with real-time sync to emit notification:new events
    - _Requirements: 38.4, 38.5, 38.6, 38.7, 38.8, 38.9_

  - [ ]\* 20a.7 Write property test for shift assignment creates notification
    - **Property 105: Shift Assignment Creates Notification**
    - **Validates: Requirements 38.4**

  - [ ]\* 20a.8 Write property test for shift modification creates notification
    - **Property 106: Shift Modification Creates Notification**
    - **Validates: Requirements 38.5**

  - [ ]\* 20a.9 Write property test for swap request creates notifications
    - **Property 107: Swap Request Creates Notifications**
    - **Validates: Requirements 38.6**

  - [ ]\* 20a.10 Write property test for schedule publishing creates notifications
    - **Property 108: Schedule Publishing Creates Notifications**
    - **Validates: Requirements 38.7**

  - [ ]\* 20a.11 Write property test for overtime approaching creates notifications
    - **Property 109: Overtime Approaching Creates Notifications**
    - **Validates: Requirements 38.8**

  - [ ]\* 20a.12 Write property test for availability change creates notifications
    - **Property 110: Availability Change Creates Notifications**
    - **Validates: Requirements 38.9**

  - [ ]\* 20a.13 Write unit tests for Notification Service
    - Test notification creation and retrieval
    - Test read/unread status management
    - Test notification preferences
    - Test event-triggered notifications
    - Test real-time notification broadcasting

- [ ] 21. Implement Configuration Management
  - [x] 21.1 Create configuration service
    - Implement methods to get and update location configuration
    - Support daily limit, weekly limit, consecutive days limit configuration
    - Support premium shift criteria configuration
    - Support timezone configuration per location
    - Validate configuration values before saving
    - Integrate with Audit Logger for configuration changes
    - Invalidate cache on configuration updates
    - _Requirements: 27.1, 27.2, 27.3, 27.4, 27.5_

  - [ ]\* 21.2 Write property test for configuration validation
    - **Property 66: Configuration Validation**
    - **Validates: Requirements 27.4**

  - [ ]\* 21.3 Write property test for configuration change audit logging
    - **Property 67: Configuration Change Audit Logging**
    - **Validates: Requirements 27.5**

  - [ ]\* 21.4 Write unit tests for configuration service
    - Test configuration CRUD operations
    - Test validation with invalid values
    - Test audit logging on changes
    - Test cache invalidation

- [ ] 22. Implement CSV Schedule Import/Export
  - [x] 22.1 Create CSV parser for schedule import
    - Define CSV schema (shift ID, location, start time, end time, staff ID, skills)
    - Implement CSV parsing with validation
    - Validate all required fields present
    - Return descriptive errors for invalid rows
    - _Requirements: 28.1, 28.2, 28.3_

  - [ ]\* 22.2 Write property test for CSV parsing according to schema
    - **Property 68: CSV Parsing According to Schema**
    - **Validates: Requirements 28.1**

  - [ ]\* 22.3 Write property test for CSV required fields validation
    - **Property 69: CSV Required Fields Validation**
    - **Validates: Requirements 28.2**

  - [x] 22.4 Implement CSV export functionality
    - Format schedule data according to CSV schema
    - Include all required fields
    - Support date range filtering
    - _Requirements: 28.4_

  - [ ]\* 22.5 Write property test for CSV import-export round trip
    - **Property 70: CSV Import-Export Round Trip**
    - **Validates: Requirements 28.5**

  - [ ]\* 22.6 Write unit tests for CSV import/export
    - Test CSV parsing with valid data
    - Test CSV parsing with invalid data
    - Test CSV export formatting
    - Test round-trip consistency

- [ ] 23. Implement REST API endpoints
  - [ ] 23.1 Create User Management API endpoints
    - POST /api/users - Create user (Admin only)
    - POST /api/auth/login - Authenticate user
    - GET /api/users/:id - Get user details
    - PUT /api/users/:id/role - Assign role (Admin only)
    - POST /api/users/:id/skills - Add skill (Manager/Admin)
    - POST /api/users/:id/certifications - Add certification (Manager/Admin)
    - GET /api/locations/:id/users - Get users by location (Manager/Admin)
    - Add authentication and authorization guards
    - Add input validation with Zod schemas from shared package
    - Document all endpoints with Swagger/Scalar decorators
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 30.1, 30.4, 30.5_

  - [ ] 23.1a Create Availability and Desired Hours API endpoints (Requirements 31, 41)
    - POST /api/users/:id/availability/windows - Set availability window (Staff)
    - DELETE /api/users/:id/availability/windows/:windowId - Remove availability window (Staff)
    - POST /api/users/:id/availability/exceptions - Add availability exception (Staff)
    - GET /api/users/:id/availability - Get availability windows and exceptions (Staff/Manager)
    - PUT /api/users/:id/desired-hours - Set desired weekly hours (Staff)
    - GET /api/users/:id/desired-hours - Get desired weekly hours (Staff/Manager)
    - Add authentication and authorization guards
    - Add input validation with Zod schemas
    - _Requirements: 31.1, 31.2, 31.5, 41.1_

  - [ ]\* 23.2 Write property test for API authentication requirement
    - **Property 71: API Authentication Requirement**
    - **Validates: Requirements 30.1**

  - [ ]\* 23.3 Write property test for expired token rejection
    - **Property 73: Expired Token Rejection**
    - **Validates: Requirements 30.3**

  - [ ]\* 23.4 Write property test for unauthorized action response
    - **Property 74: Unauthorized Action Forbidden Response**
    - **Validates: Requirements 30.5**

  - [x] 23.5 Create Schedule Management API endpoints
    - POST /api/shifts - Create shift (Manager)
    - GET /api/shifts - Get shifts by location and date range
    - GET /api/staff/:id/shifts - Get staff schedule
    - POST /api/shifts/:id/assign - Assign staff to shift (Manager)
    - DELETE /api/assignments/:id - Unassign staff (Manager)
    - Add authentication and authorization guards
    - Add input validation with Zod schemas from shared package
    - Return structured error responses for validation failures
    - Document all endpoints with Swagger/Scalar decorators
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 17.1, 17.5_

  - [ ] 23.5a Create Schedule Publishing and Pickup API endpoints (Requirements 32, 34, 40, 42)
    - POST /api/schedules/:locationId/publish - Publish week's schedule (Manager)
    - POST /api/schedules/:locationId/unpublish - Unpublish schedule (Manager)
    - GET /api/shifts/available - Get available shifts for staff (Staff)
    - POST /api/shifts/:id/pickup - Pick up available shift (Staff)
    - GET /api/shifts/:id/alternatives - Get alternative staff suggestions (Manager)
    - GET /api/shifts/:id/headcount - Get shift headcount status (Manager)
    - Add authentication and authorization guards
    - Add input validation with Zod schemas
    - _Requirements: 32.1, 32.4, 34.1, 34.3, 40.1, 42.3_

  - [x] 23.6 Create Swap Workflow API endpoints
    - POST /api/swaps - Create swap request (Staff)
    - GET /api/swaps/pending - Get pending swaps (Manager)
    - GET /api/staff/:id/swaps - Get swaps by staff (Staff)
    - PUT /api/swaps/:id/approve - Approve swap (Manager)
    - PUT /api/swaps/:id/reject - Reject swap (Manager)
    - Add authentication and authorization guards
    - Add input validation with DTOs
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ] 23.6a Create Drop Request and Cancellation API endpoints (Requirements 33, 35, 37)
    - POST /api/drops - Create drop request (Staff)
    - GET /api/staff/:id/drops - Get drop requests by staff (Staff)
    - DELETE /api/swaps/:id/cancel - Cancel swap request (Staff)
    - GET /api/staff/:id/pending-count - Get pending request count (Staff)
    - Add authentication and authorization guards
    - Add input validation with DTOs
    - _Requirements: 33.1, 35.1, 37.1_

  - [x] 23.7 Create Overtime and Fairness API endpoints
    - GET /api/overtime/:staffId - Calculate overtime for staff
    - GET /api/overtime/report/:locationId - Get overtime report for location
    - GET /api/fairness/:locationId/hours - Get hour distribution
    - GET /api/fairness/:locationId/premium - Get premium shift distribution
    - POST /api/fairness/:locationId/report - Generate fairness report (background job)
    - Add authentication and authorization guards
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 13.1, 13.2, 13.3, 13.4, 13.5, 14.1, 14.2, 14.3, 14.4, 24.2, 24.3_

  - [ ] 23.7a Create Desired Hours Fairness API endpoints (Requirement 41)
    - GET /api/fairness/:locationId/desired-hours - Get desired vs actual hours comparison
    - GET /api/fairness/:locationId/under-scheduled - Get under-scheduled staff
    - GET /api/fairness/:locationId/over-scheduled - Get over-scheduled staff
    - Add authentication and authorization guards
    - _Requirements: 41.2, 41.3, 41.4_

  - [x] 23.8 Create Callout and Coverage API endpoints
    - POST /api/callouts - Report callout (Staff)
    - GET /api/dashboard/coverage - Get current coverage for all locations (Manager/Admin)
    - GET /api/dashboard/upcoming - Get upcoming shifts in next 24 hours (Manager/Admin)
    - GET /api/shifts/:id/available-staff - Find available staff for uncovered shift (Manager)
    - POST /api/shifts/:id/offer - Send shift offer to specific staff (Manager)
    - Add authentication and authorization guards
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 22.1, 22.2, 22.3, 22.4, 23.1, 23.2, 23.3, 23.4, 23.5_

  - [x] 23.9 Create Configuration and Audit API endpoints
    - GET /api/locations/:id/config - Get location configuration (Manager/Admin)
    - PUT /api/locations/:id/config - Update location configuration (Admin)
    - GET /api/audit - Query audit logs (Admin)
    - GET /api/audit/:id/verify - Verify audit record integrity (Admin)
    - POST /api/import/csv - Import schedule from CSV (Manager)
    - GET /api/export/csv - Export schedule to CSV (Manager)
    - Add authentication and authorization guards
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 20.1, 20.2, 20.3, 20.4, 20.5, 27.1, 27.2, 27.3, 27.4, 27.5, 28.1, 28.2, 28.3, 28.4, 28.5_

  - [x] 23.10 Create Job Queue API endpoints
    - GET /api/jobs - Get job status list (Admin)
    - GET /api/jobs/:id - Get specific job status
    - POST /api/jobs/:id/retry - Retry failed job (Admin)
    - Add authentication and authorization guards
    - _Requirements: 24.5_

  - [ ] 23.10a Create Notification API endpoints (Requirement 38)
    - GET /api/notifications - Get notifications for current user (Staff/Manager/Admin)
    - PUT /api/notifications/:id/read - Mark notification as read
    - PUT /api/notifications/read-all - Mark all notifications as read
    - GET /api/notifications/preferences - Get notification preferences
    - PUT /api/notifications/preferences - Set notification preferences
    - Add authentication and authorization guards
    - _Requirements: 38.1, 38.2, 38.3_

  - [ ]\* 23.11 Write integration tests for API endpoints
    - Test authentication and authorization for all endpoints
    - Test input validation and error responses
    - Test successful operations with database verification
    - Test concurrent operations with distributed locking

- [x] 24. Checkpoint - Backend API complete
  - Ensure all REST API endpoints are working correctly with authentication, authorization, and validation. Run all tests. Ask the user if questions arise.

- [x] 25. Initialize Next.js 15 frontend application
  - [x] 25.1 Create Next.js application with App Router
    - Initialize Next.js 15 in frontend workspace
    - Configure TypeScript with strict mode
    - Set up Tailwind CSS for styling
    - Install and configure Shadcn UI component library
    - Install Sonner for toast notifications
    - Install Lucide React for iconography
    - Configure environment variables for API URL and WebSocket URL
    - Import Zod schemas from shared package for client-side validation
    - Create basic layout with navigation
    - _Requirements: Foundation for frontend_

  - [x] 25.2 Set up authentication context and API client
    - Create authentication context with JWT token management
    - Implement login and logout functionality
    - Create API client with axios including JWT token injection
    - Implement token refresh logic
    - Create protected route wrapper component
    - _Requirements: 30.1, 30.2, 30.3_

  - [x] 25.3 Set up TanStack Query and TanStack Table
    - Install and configure TanStack Query (v5) for server state management
    - Create query client with default options
    - Set up query keys for different resources
    - Implement optimistic updates for mutations
    - Install TanStack Table for complex data tables (fairness analytics, overtime reports)
    - _Requirements: 25.5_

  - [x] 25.4 Set up Socket.io client for real-time updates
    - Install Socket.io client
    - Create WebSocket context with connection management
    - Implement JWT authentication for WebSocket connection
    - Implement automatic reconnection with exponential backoff
    - Create hooks for subscribing to real-time events
    - _Requirements: 15.3, 29.3_

  - [ ]\* 25.5 Write unit tests for authentication and API client
    - Test JWT token storage and retrieval
    - Test API client token injection
    - Test protected route access control
    - Test WebSocket authentication

- [ ] 26. Implement frontend user management features
  - [x] 26.1 Create login page
    - Build login form with email and password fields
    - Implement form validation
    - Call authentication API and store JWT token
    - Redirect to dashboard on successful login
    - Display error messages for failed login
    - _Requirements: 30.1, 30.2_

  - [x] 26.2 Create user management pages (Admin)
    - Build user list page with filtering
    - Build user creation form with role selection
    - Build skill and certification assignment interface
    - Implement manager location authorization interface
    - Display success/error messages
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]\* 26.3 Write unit tests for user management components
    - Test login form validation and submission
    - Test user creation form
    - Test role assignment interface
    - Test error handling and display

  - [-] 26.4 Create availability management interface (Requirement 31)
    - Build availability windows form with day of week and time range
    - Build availability exceptions form with date and time range
    - Display current availability windows and exceptions
    - Implement add/remove functionality for windows
    - Show validation errors for invalid time formats
    - _Requirements: 31.1, 31.2, 31.5_

  - [ ] 26.5 Create desired hours interface (Requirement 41)
    - Build desired weekly hours input field
    - Display current desired hours value
    - Show validation for positive numbers
    - _Requirements: 41.1_

  - [ ]\* 26.6 Write unit tests for availability and desired hours components
    - Test availability window form validation
    - Test availability exception creation
    - Test desired hours input validation

- [ ] 27. Implement frontend schedule management features
  - [x] 27.1 Create schedule calendar view
    - Build calendar component displaying shifts by location
    - Implement date range navigation (week/month view)
    - Display shift times in location timezone with timezone indicator
    - Color-code shifts by status (assigned, uncovered)
    - Implement shift detail modal on click
    - _Requirements: 17.1, 17.4, 21.1, 21.2_

  - [x] 27.2 Create shift creation form (Manager)
    - Build form with location, start time, end time, required skills
    - Implement timezone-aware date/time pickers
    - Support overnight shift creation
    - Validate end time after start time
    - Display validation errors from API
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 18.1_

  - [x] 27.3 Create staff assignment interface (Manager)
    - Build staff selection dropdown filtered by skills and certifications
    - Display validation errors (missing skills, overlap, rest period violations)
    - Show overtime warning if assignment would create overtime
    - Implement optimistic UI updates
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 9.5_

  - [x] 27.4 Implement real-time schedule updates
    - Subscribe to location-specific WebSocket rooms
    - Update calendar view on shift:created, shift:updated, shift:deleted events
    - Update calendar view on assignment:changed events
    - Display toast notifications using Sonner for changes
    - Handle conflict:detected events with visual indicators
    - _Requirements: 15.1, 15.2, 16.4_

  - [ ]\* 27.5 Write unit tests for schedule components
    - Test calendar rendering with shifts
    - Test shift creation form validation
    - Test staff assignment interface
    - Test real-time update handling

  - [ ] 27.6 Create schedule publishing interface (Requirement 32)
    - Build publish/unpublish buttons for week view
    - Show published status indicator on shifts
    - Display cutoff time warning for unpublish attempts
    - Filter staff view to show only published shifts
    - Show all shifts to managers regardless of published status
    - _Requirements: 32.1, 32.2, 32.3, 32.4_

  - [ ] 27.7 Create available shifts and pickup interface (Requirement 34)
    - Build available shifts list for staff
    - Display shift details (location, time, skills required)
    - Filter by staff qualifications automatically
    - Implement pickup button with constraint validation
    - Show validation errors if pickup fails
    - Remove shift from list on successful pickup
    - _Requirements: 34.1, 34.2, 34.3, 34.4_

  - [ ] 27.8 Create alternative staff suggestions interface (Requirement 40)
    - Display alternative staff list on constraint violation
    - Show staff current hours and availability status
    - Rank staff by hours (ascending)
    - Limit display to top 5 suggestions
    - Implement quick assign button for alternatives
    - _Requirements: 40.1, 40.2, 40.3, 40.4, 40.5_

  - [ ] 27.9 Create headcount tracking interface (Requirement 42)
    - Add headcount input field to shift creation form
    - Display filled vs required headcount on shifts
    - Show partially covered indicator for unfilled headcount
    - Show fully covered indicator when headcount reached
    - Allow multiple staff assignments up to headcount
    - _Requirements: 42.1, 42.2, 42.3, 42.4, 42.5_

  - [ ] 27.10 Implement enhanced compliance warnings display (Requirement 39)
    - Display graduated warnings (8-hour, 6-day) with yellow indicator
    - Display hard errors (12-hour, 7-day) with red indicator
    - Show override option for 7-day scenario with reason input
    - Display 35+ hour proximity warnings
    - Differentiate warnings from errors in UI
    - _Requirements: 39.1, 39.2, 39.3, 39.4, 39.5_

  - [ ]\* 27.11 Write unit tests for new schedule features
    - Test schedule publishing interface
    - Test available shifts and pickup
    - Test alternative staff suggestions display
    - Test headcount tracking interface
    - Test enhanced compliance warnings

- [ ] 28. Implement frontend swap workflow features
  - [x] 28.1 Create swap request interface (Staff)
    - Build swap request form with shift selection and target staff selection
    - Display validation errors (missing skills, certification)
    - Show list of staff's own shifts available for swapping
    - Display swap request status (pending, approved, rejected)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 28.2 Create swap approval interface (Manager)
    - Build pending swaps list with filtering
    - Display swap details (original assignment, proposed assignment, validation results)
    - Implement approve and reject actions with reason input for rejection
    - Show validation errors if constraints violated
    - Update list on swap:updated events via WebSocket
    - _Requirements: 8.1, 8.2, 8.3, 8.5_

  - [x] 28.3 Implement real-time swap notifications
    - Subscribe to staff-specific WebSocket rooms
    - Display notifications on swap:created and swap:updated events
    - Show toast notifications using Sonner for swap approvals and rejections
    - _Requirements: 7.5, 8.5_

  - [ ]\* 28.4 Write unit tests for swap components
    - Test swap request form validation
    - Test swap approval interface
    - Test real-time notification handling

  - [ ] 28.5 Create drop request interface (Requirement 33)
    - Build drop request form without target staff selection
    - Display staff's own shifts available for dropping
    - Show expiration time (24 hours before shift)
    - Display drop request status (pending, claimed, expired)
    - Show notification on expiration
    - _Requirements: 33.1, 33.2, 33.3, 33.5_

  - [ ] 28.6 Create request limits display (Requirement 35)
    - Display pending request count (swap + drop)
    - Show limit indicator (e.g., "2/3 pending requests")
    - Disable request buttons when at limit
    - Show error message when limit reached
    - _Requirements: 35.1, 35.2, 35.3_

  - [ ] 28.7 Create swap cancellation interface (Requirement 37)
    - Add cancel button to pending swap requests
    - Show confirmation dialog for cancellation
    - Display cancellation notification to target staff
    - Update pending count on cancellation
    - _Requirements: 37.1, 37.2, 37.3_

  - [ ]\* 28.8 Write unit tests for drop and cancellation components
    - Test drop request form
    - Test request limits display
    - Test swap cancellation interface

- [ ] 29. Implement frontend overtime and fairness features
  - [x] 29.1 Create overtime dashboard
    - Build overtime summary view for location
    - Display staff list with regular and overtime hours
    - Implement date range filtering (week, pay period)
    - Show visual indicators for staff with overtime
    - Export overtime report to CSV
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 29.2 Create fairness analytics dashboard
    - Build hour distribution chart showing mean and outliers
    - Build premium shift distribution chart
    - Use TanStack Table for staff list with complex sorting/filtering by hours, deviations, premium shifts
    - Implement date range filtering
    - Show visual indicators for outliers
    - Trigger background job for detailed report generation
    - Display job status and results when complete
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 14.1, 14.2, 14.3, 14.4, 24.2, 24.4_

  - [ ]\* 29.3 Write unit tests for overtime and fairness components
    - Test overtime dashboard rendering
    - Test fairness analytics charts
    - Test date range filtering
    - Test background job status display

  - [ ] 29.4 Add desired hours to fairness dashboard (Requirement 41)
    - Display desired vs actual hours comparison table
    - Show under-scheduled staff with indicator
    - Show over-scheduled staff with indicator
    - Add desired hours column to fairness analytics
    - Highlight significant deviations
    - _Requirements: 41.2, 41.3, 41.4, 41.5_

  - [ ]\* 29.5 Write unit tests for desired hours fairness display
    - Test desired vs actual hours comparison
    - Test under-scheduled identification display
    - Test over-scheduled identification display

- [x] 30. Implement frontend callout and coverage features
  - [x] 30.1 Create callout reporting interface (Staff)
    - Build callout form with shift selection and reason input
    - Display staff's upcoming shifts
    - Show confirmation message on successful callout
    - _Requirements: 22.1, 22.4_

  - [x] 30.2 Create central workforce visibility dashboard (Manager/Admin)
    - Build dashboard showing current coverage for all locations
    - Highlight uncovered shifts with visual indicators
    - Display available staff count per location
    - Show upcoming shifts in next 24 hours
    - Update dashboard on callout:reported events via WebSocket
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 22.2, 22.3_

  - [x] 30.3 Create coverage gap resolution interface (Manager)
    - Build available staff list for uncovered shift
    - Display staff ranked by current hours
    - Show staff skills and certifications
    - Implement direct shift offer functionality
    - Display constraint violations for unavailable staff
    - _Requirements: 23.1, 23.2, 23.3, 23.4, 23.5_

  - [x] 30.4 Implement real-time callout notifications
    - Subscribe to location-specific WebSocket rooms
    - Display toast notifications using Sonner on callout:reported events
    - Update dashboard and coverage views in real-time
    - _Requirements: 22.2, 22.3_

  - [ ]\* 30.5 Write unit tests for callout and coverage components
    - Test callout form submission
    - Test dashboard rendering and updates
    - Test available staff list and ranking
    - Test real-time notification handling

- [ ] 30a. Implement frontend notification center (Requirement 38)
  - [ ] 30a.1 Create notification center UI
    - Build notification bell icon with unread count badge
    - Build notification dropdown/panel with list of notifications
    - Display notification title, message, and timestamp
    - Show read/unread status with visual indicator
    - Implement mark as read on click
    - Implement mark all as read button
    - _Requirements: 38.1, 38.3_

  - [ ] 30a.2 Create notification preferences interface
    - Build preferences form with in-app and email toggles
    - Display current preference values
    - Save preferences on change
    - _Requirements: 38.2_

  - [ ] 30a.3 Implement real-time notification updates
    - Subscribe to notification:new events via WebSocket
    - Display toast notification using Sonner for new notifications
    - Update notification center in real-time
    - Update unread count badge
    - Play notification sound (optional)
    - _Requirements: 38.4, 38.5, 38.6, 38.7, 38.8, 38.9_

  - [ ]\* 30a.4 Write unit tests for notification center
    - Test notification list rendering
    - Test read/unread status updates
    - Test notification preferences
    - Test real-time notification updates

- [x] 31. Implement frontend configuration and audit features
  - [x] 31.1 Create location configuration interface (Admin)
    - Build configuration form for daily, weekly, consecutive days limits
    - Build premium shift criteria configuration interface
    - Display current configuration values
    - Validate configuration values before submission
    - Show success/error messages
    - _Requirements: 27.1, 27.2, 27.3, 27.4_

  - [x] 31.2 Create audit log viewer (Admin)
    - Build audit log list with filtering by date, user, entity type, action
    - Display audit record details (timestamp, user, previous/new state)
    - Implement pagination for large result sets
    - Add audit record integrity verification button
    - Display verification results
    - _Requirements: 19.5, 20.5_

  - [x] 31.3 Create CSV import/export interface (Manager)
    - Build CSV upload form with file selection
    - Display parsing errors with row numbers
    - Show import success summary
    - Implement CSV export with date range filtering
    - _Requirements: 28.1, 28.2, 28.3, 28.4_

  - [ ]\* 31.4 Write unit tests for configuration and audit components
    - Test configuration form validation
    - Test audit log filtering and display
    - Test CSV import error handling
    - Test CSV export functionality

- [x] 32. Implement frontend job queue monitoring
  - [x] 32.1 Create job status dashboard (Admin)
    - Build job list showing queued, processing, completed, failed jobs
    - Display job details (type, data, status, error messages)
    - Implement job retry functionality for failed jobs
    - Subscribe to job:completed events via WebSocket
    - Update job list in real-time
    - _Requirements: 24.4, 24.5_

  - [ ]\* 32.2 Write unit tests for job monitoring components
    - Test job list rendering
    - Test job retry functionality
    - Test real-time job status updates

- [x] 33. Checkpoint - Frontend features complete
  - Ensure all frontend pages and components are working correctly with real-time updates. Test user flows end-to-end. Ask the user if questions arise.

- [ ] 34. Set up property-based testing infrastructure
  - [ ] 34.1 Install and configure fast-check
    - Install fast-check library
    - Configure test runner (Jest) for property-based tests
    - Set minimum 100 iterations per property test
    - Create test utilities for custom generators
    - _Requirements: Testing strategy_

  - [ ] 34.2 Create custom generators for domain entities
    - Implement arbitraryStaff generator (with skills, certifications)
    - Implement arbitraryManager generator (with authorized locations)
    - Implement arbitraryShift generator (with timezone, skills)
    - Implement arbitraryOverlappingShift generator
    - Implement arbitrarySwapRequest generator
    - Implement arbitraryUser generator for various roles
    - _Requirements: Testing strategy_

  - [ ] 34.3 Create test data builders
    - Implement StaffBuilder with fluent interface
    - Implement ShiftBuilder with fluent interface
    - Implement LocationBuilder with fluent interface
    - Implement test database seeding utilities
    - _Requirements: Testing strategy_

  - [ ]\* 34.4 Write unit tests for generators and builders
    - Test generator output validity
    - Test builder fluent interface
    - Test test data seeding

- [ ] 35. Implement remaining property-based tests
  - [ ] 35.1 Implement property tests for skill and certification management
    - **Property 4: Skill Assignment Records Timestamp**
    - **Property 5: Certification Assignment Records Timestamp**
    - **Property 6: Manager Location Authorization Scope**
    - _Requirements: 2.3, 2.4, 2.5_

  - [ ] 35.2 Implement property tests for timezone handling
    - **Property 44: Timezone Context Update on Location Switch**
    - _Requirements: 17.5_

  - [ ] 35.3 Implement property tests for overnight shifts
    - Test overnight shift creation and validation
    - Test overnight shift overlap detection
    - Test overnight shift rest period calculation
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_

  - [ ] 35.4 Implement property tests for audit logging
    - **Property 45: Audit Log for Shift Changes**
    - **Property 46: Audit Log for Assignment Changes**
    - **Property 47: Audit Log for User Changes**
    - _Requirements: 19.1, 19.2, 19.4_

  - [ ] 35.5 Implement property tests for background jobs
    - **Property 64: Background Job Completion Notification**
    - _Requirements: 24.4_

  - [ ] 35.6 Implement property tests for transaction handling
    - **Property 65: Transaction Rollback on Failure**
    - _Requirements: 26.4_

  - [ ]\* 35.7 Run all property-based tests and verify coverage
    - Execute all property tests with 100 iterations
    - Verify all 74 properties are tested
    - Review any failing tests and fix issues
    - Document any edge cases discovered

- [ ] 36. Implement comprehensive integration tests
  - [ ] 36.1 Set up integration test environment
    - Configure test database with migrations
    - Configure test Redis instance
    - Create test data seeding scripts
    - Set up test cleanup between tests
    - _Requirements: Testing strategy_

  - [ ] 36.2 Write integration tests for critical user flows
    - Test manager creates shift and assigns staff (full validation chain)
    - Test staff requests swap, manager approves (atomic transaction)
    - Test staff reports callout, manager finds replacement (real-time updates)
    - Test admin views fairness analytics (background job processing)
    - Test rest period enforcement across timezone boundaries
    - _Requirements: Testing strategy_

  - [ ] 36.3 Write integration tests for concurrent operations
    - Test multiple managers assigning same staff concurrently (distributed locking)
    - Test concurrent swap approvals (optimistic locking)
    - Test concurrent shift creation at same location
    - _Requirements: 16.1, 16.2, 16.3, 25.1, 26.5_

  - [ ] 36.4 Write integration tests for error handling
    - Test database transaction rollback on errors
    - Test Redis connection failure graceful degradation
    - Test WebSocket reconnection behavior
    - Test background job retry on failure
    - _Requirements: 26.4, 29.1, 29.2, 29.3, 29.4_

  - [ ]\* 36.5 Write integration tests for WebSocket communication
    - Test client connection and authentication
    - Test room subscription and authorization
    - Test event broadcasting to correct clients
    - Test connection cleanup on disconnect
    - _Requirements: 15.3, 15.4, 15.5_

- [ ] 37. Checkpoint - Testing infrastructure complete
  - Ensure all property-based tests and integration tests are passing. Review test coverage. Ask the user if questions arise.

- [ ] 38. Performance optimization and monitoring
  - [ ] 38.1 Implement database query optimization
    - Review and optimize slow queries using EXPLAIN
    - Add missing indexes identified during testing
    - Implement query result caching for frequently accessed data
    - Configure Prisma connection pooling for optimal performance
    - _Requirements: 25.3, 25.4_

  - [ ] 38.2 Implement API response time monitoring
    - Add request timing middleware to NestJS
    - Log slow requests (> 200ms) with query details
    - Implement health check endpoint with database and Redis status
    - _Requirements: 25.1_

  - [ ] 38.3 Optimize WebSocket performance
    - Implement connection pooling for Socket.io
    - Optimize room subscription logic
    - Add message batching for high-frequency updates
    - Monitor WebSocket message latency
    - _Requirements: 25.2_

  - [ ] 38.4 Implement cache warming strategies
    - Pre-populate cache for upcoming schedules
    - Implement background job for cache warming
    - Configure cache TTL based on data access patterns
    - _Requirements: 25.5_

  - [ ]\* 38.5 Conduct performance testing
    - Test 10 concurrent managers creating shifts
    - Test 100 concurrent WebSocket connections
    - Test background job processing under load
    - Verify API response times meet targets (< 200ms p95)
    - _Requirements: 25.1, 25.2_

- [ ] 39. Error handling and resilience improvements
  - [ ] 39.1 Implement comprehensive error responses
    - Standardize error response format across all endpoints
    - Include error codes, messages, and field-specific errors
    - Add conflicting entity details for overlap/conflict errors
    - Include suggested actions for constraint violations
    - _Requirements: Error handling strategy_

  - [ ] 39.2 Implement retry logic with exponential backoff
    - Add database connection retry (3 attempts, exponential backoff)
    - Add distributed lock retry (3 attempts, 3-second timeout)
    - Add background job retry (3 attempts, exponential backoff)
    - _Requirements: 29.1, 29.4_

  - [ ] 39.3 Implement graceful degradation
    - Handle Redis unavailability (continue without cache)
    - Handle WebSocket disconnection (show offline indicator)
    - Handle background job failures (notify user, allow retry)
    - _Requirements: 29.2, 29.3, 29.4_

  - [ ] 39.4 Implement client-side error handling
    - Add error boundaries for React components
    - Implement toast notifications for errors
    - Add retry buttons for failed operations
    - Display user-friendly error messages
    - _Requirements: Error handling strategy_

  - [ ]\* 39.5 Test error handling scenarios
    - Test database connection failures
    - Test Redis connection failures
    - Test WebSocket disconnection and reconnection
    - Test background job failures and retries
    - Test API error responses

- [ ] 40. Security hardening
  - [ ] 40.1 Implement rate limiting
    - Add rate limiting middleware to API endpoints
    - Configure different limits for different endpoint types
    - Return 429 Too Many Requests with retry-after header
    - _Requirements: Security best practices_

  - [ ] 40.2 Implement input sanitization
    - Add input sanitization for all user inputs
    - Prevent SQL injection with parameterized queries (Prisma)
    - Prevent XSS attacks with output encoding
    - Validate and sanitize file uploads (CSV)
    - _Requirements: Security best practices_

  - [ ] 40.3 Implement CORS configuration
    - Configure CORS for API endpoints
    - Configure CORS for WebSocket connections
    - Whitelist allowed origins from environment variables
    - _Requirements: Security best practices_

  - [ ] 40.4 Implement security headers
    - Add helmet middleware for security headers
    - Configure CSP, HSTS, X-Frame-Options
    - Disable X-Powered-By header
    - _Requirements: Security best practices_

  - [ ]\* 40.5 Conduct security testing
    - Test authentication and authorization for all endpoints
    - Test rate limiting effectiveness
    - Test input validation and sanitization
    - Review security headers

- [ ] 41. Deployment preparation
  - [ ] 41.1 Create production Docker configuration
    - Create production Dockerfile with multi-stage build
    - Optimize image size (remove dev dependencies, use alpine base)
    - Create docker-compose.yml for production deployment
    - Configure environment variable management
    - _Requirements: Deployment_

  - [ ] 41.2 Set up database migration strategy
    - Create migration scripts for production deployment
    - Document rollback procedures
    - Test migrations on staging environment
    - _Requirements: Deployment_

  - [ ] 41.3 Configure logging and monitoring
    - Set up structured logging with log levels
    - Configure log aggregation (stdout for container logs)
    - Add application metrics (request count, response time, error rate)
    - Configure health check endpoints
    - _Requirements: Deployment_

  - [ ] 41.4 Create deployment documentation
    - Document environment variables and configuration
    - Document deployment steps and procedures
    - Document backup and restore procedures
    - Document monitoring and alerting setup
    - _Requirements: Deployment_

  - [ ] 41.5 Set up CI/CD pipeline configuration
    - Create GitHub Actions or similar CI/CD configuration
    - Configure automated testing on pull requests
    - Configure automated deployment to staging
    - Configure manual approval for production deployment
    - _Requirements: Deployment_

- [ ] 42. Final integration and end-to-end testing
  - [ ] 42.1 Set up end-to-end testing with Playwright
    - Install and configure Playwright
    - Create test fixtures for authentication and data seeding
    - Set up test environment with full stack
    - _Requirements: Testing strategy_

  - [ ] 42.2 Write end-to-end tests for evaluation scenarios
    - Test "Sunday Night Chaos" scenario: Staff callout at 6pm for 7pm shift, find coverage
    - Test "Overtime Trap" scenario: Manager building schedule with 52-hour week detection
    - Test "Timezone Tangle" scenario: Staff certified at Pacific and Eastern locations with availability
    - Test "Simultaneous Assignment" scenario: Two managers assigning same bartender concurrently
    - Test "Fairness Complaint" scenario: Verify Saturday night shift distribution
    - Test "Regret Swap" scenario: Staff changes mind on pending swap before manager approval
    - _Requirements: Testing strategy, Evaluation scenarios_

  - [ ] 42.3 Write end-to-end tests for critical flows
    - Test complete shift creation and assignment flow
    - Test complete swap request and approval flow
    - Test complete callout and coverage resolution flow
    - Test real-time updates across multiple browser instances
    - Test timezone handling across different locations
    - _Requirements: Testing strategy_

  - [ ] 42.4 Conduct user acceptance testing
    - Test all user roles (Admin, Manager, Staff)
    - Test all major features with realistic data
    - Verify real-time updates work correctly
    - Verify timezone handling is accurate
    - Verify error messages are clear and helpful
    - _Requirements: Testing strategy_

  - [ ] 42.5 Performance testing under realistic load
    - Seed database with realistic data (4 locations, 50 staff, 200 shifts/week)
    - Test with multiple concurrent users
    - Monitor database query performance
    - Monitor WebSocket connection stability
    - Monitor background job processing
    - _Requirements: 25.1, 25.2_

  - [ ]\* 42.6 Fix any issues discovered during testing
    - Address any bugs found during E2E testing
    - Optimize any performance bottlenecks
    - Improve any unclear error messages
    - Enhance any usability issues

- [ ] 43. Final checkpoint - System complete and ready for deployment
  - Ensure all features are working correctly, all tests are passing, and the system is ready for deployment. Review deployment documentation. Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation and provide opportunities for user feedback
- Property tests validate universal correctness properties across the input space
- Unit tests validate specific examples and edge cases
- Integration tests validate component interactions and end-to-end flows
- The implementation follows a bottom-up approach: infrastructure → data layer → services → API → frontend
- Real-time features are integrated throughout the implementation
- Security and performance are addressed continuously, not just at the end
- The task list is designed for incremental progress with working software at each checkpoint
