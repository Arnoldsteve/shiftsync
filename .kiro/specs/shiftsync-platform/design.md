# Design Document: ShiftSync Platform

## Overview

ShiftSync is a distributed, multi-location staff scheduling platform built to handle complex scheduling constraints across multiple time zones. The system provides real-time schedule management, automated constraint validation, shift swap workflows, overtime tracking, and fairness analytics for restaurant groups.

The platform follows a modern three-tier architecture:

- **Frontend**: Next.js 15 with React Server Components and real-time updates
- **Backend**: NestJS with modular service architecture
- **Data Layer**: PostgreSQL for persistent storage, Redis for caching and distributed locking

Key architectural principles:

- **Event-driven architecture** for real-time updates using Socket.io
- **Distributed locking** with Redlock for concurrent operation safety
- **Background job processing** with BullMQ for time-intensive operations
- **Multi-timezone support** with explicit timezone context throughout the system
- **Constraint validation engine** for enforcing business rules and labor law compliance

## Architecture

### System Components

```mermaid
graph TB
    subgraph "Client Layer"
        WebApp[Next.js 15 Web App]
    end

    subgraph "API Gateway"
        NestJS[NestJS API Server]
        WS[Socket.io WebSocket Server]
    end

    subgraph "Service Layer"
        UserSvc[User Service]
        ScheduleSvc[Schedule Service]
        SwapSvc[Swap Service]
        OvertimeSvc[Overtime Service]
        ComplianceSvc[Compliance Service]
        FairnessSvc[Fairness Service]
        AuditSvc[Audit Service]
    end
```

    subgraph "Infrastructure Layer"
        ConflictDetector[Conflict Detector]
        LockManager[Distributed Lock Manager]
        JobQueue[BullMQ Job Queue]
        CacheManager[Cache Manager]
    end

    subgraph "Data Layer"
        PostgreSQL[(PostgreSQL + Prisma)]
        Redis[(Redis)]
    end

    WebApp -->|HTTP/REST| NestJS
    WebApp -->|WebSocket| WS
    NestJS --> UserSvc
    NestJS --> ScheduleSvc
    NestJS --> SwapSvc
    NestJS --> OvertimeSvc
    NestJS --> ComplianceSvc
    NestJS --> FairnessSvc
    NestJS --> AuditSvc

    ScheduleSvc --> ConflictDetector
    ScheduleSvc --> ComplianceSvc
    SwapSvc --> ConflictDetector
    ConflictDetector --> LockManager

    FairnessSvc --> JobQueue
    OvertimeSvc --> JobQueue

    UserSvc --> PostgreSQL
    ScheduleSvc --> PostgreSQL
    SwapSvc --> PostgreSQL
    OvertimeSvc --> PostgreSQL
    AuditSvc --> PostgreSQL

    LockManager --> Redis
    CacheManager --> Redis
    JobQueue --> Redis

    WS -.->|Broadcasts| WebApp

```

```

### Technology Stack

**Frontend:**

- Next.js 15 with App Router
- React Server Components for initial page loads
- Socket.io client for real-time updates
- TanStack Query (v5) for server state management
- TanStack Table for complex data tables with sorting/filtering
- Tailwind CSS for styling
- Shadcn UI for component library
- Sonner for toast notifications
- Lucide React for iconography

**Backend:**

- NestJS framework with TypeScript
- Prisma ORM for database access
- Socket.io for WebSocket communication
- Passport.js with JWT strategy for authentication
- BullMQ for background job processing
- BullBoard for job queue visualization
- Redlock for distributed locking
- Swagger/Scalar for API documentation
- Pino for structured logging
- Argon2 for password hashing

**Data Storage:**

- PostgreSQL 15+ (Neon DB) for relational data
- Redis 7+ (Redis Cloud) for caching, distributed locks, and job queues

**Infrastructure & Tooling:**

- Turborepo for monorepo management
- Docker for containerization
- Node.js 20+ runtime
- Zod for shared validation schemas
- Vitest for unit and property-based testing
- Playwright for E2E testing
- fast-check for property-based testing

### Communication Patterns

1. **Synchronous REST API**: Standard CRUD operations, authentication, queries
2. **WebSocket (Socket.io)**: Real-time updates for schedule changes, conflict notifications, job completion
3. **Background Jobs**: Long-running analytics, bulk operations, scheduled tasks, drop request expiration
4. **Database Transactions**: Atomic operations for critical state changes
5. **Distributed Locks**: Serialization of concurrent operations on shared resources
6. **Event-Driven Notifications**: Triggered notifications for shift assignments, swap requests, schedule publishing, overtime warnings

### New Feature Integration

The following new features integrate with the existing architecture:

**Staff Availability (Req 31):**

- Availability windows and exceptions stored in User Management System
- Validation integrated into Scheduling Engine constraint checking
- Availability changes trigger notifications to managers

**Schedule Publishing (Req 32):**

- Published status tracked on Shift model
- Visibility filtering in Schedule Service based on user role
- Cutoff time enforcement prevents late unpublishing
- Publishing triggers bulk notifications to staff

**Drop Requests (Req 33-34):**

- New DropRequest model parallel to SwapRequest
- Auto-expiration handled by background job
- Available shifts query combines unassigned shifts and drop requests
- Pickup flow validates constraints like regular assignments

**Request Limits (Req 35):**

- Pending count tracked across swap and drop requests
- Configurable per location in LocationConfig
- Enforced at request creation time

**Swap Cancellation (Req 36-37):**

- Shift edits trigger cascading cancellation
- Staff can self-cancel pending requests
- Cancellation decrements pending count and triggers notifications

**Notification System (Req 38):**

- Persistent notification storage with read/unread status
- User preferences for in-app and email (simulated)
- Event-driven triggers throughout the system
- Notification history queryable by user

**Enhanced Compliance (Req 39):**

- Graduated warnings vs hard errors
- 8-hour and 6-day warnings allow assignment
- 12-hour and 7-day require override or block
- 35-hour proximity warnings for overtime

**Alternative Suggestions (Req 40):**

- Generated on constraint violation
- Filtered by qualifications and constraints
- Ranked by current hours for fairness
- Limited to top 5 suggestions

**Desired Hours (Req 41):**

- Stored on User model
- Compared to actual hours in Fairness Analyzer
- Under/over-scheduled identification
- Displayed in fairness reports

**Headcount Tracking (Req 42):**

- Required headcount stored on Shift model
- Multiple assignments allowed up to headcount
- Filled vs required tracked and displayed
- Fully filled shifts removed from available listings

## Components and Interfaces

### User Service

Manages user accounts, authentication, roles, skills, and location certifications.

**Responsibilities:**

- User CRUD operations
- Role-based access control (RBAC)
- Skill and certification management
- Password hashing and verification
- JWT token generation and validation

**Key Methods:**

```typescript
interface UserService {
  createUser(data: CreateUserDto): Promise<User>;
  assignRole(userId: string, role: Role, locationIds?: string[]): Promise<User>;
  addSkill(userId: string, skillId: string): Promise<void>;
  addLocationCertification(userId: string, locationId: string): Promise<void>;
  authenticate(email: string, password: string): Promise<{ token: string; user: User }>;
  validateToken(token: string): Promise<User>;
  getUsersByLocation(locationId: string): Promise<User[]>;

  // Requirement 31: Availability management
  setAvailabilityWindow(
    userId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string
  ): Promise<void>;
  removeAvailabilityWindow(windowId: string): Promise<void>;
  addAvailabilityException(
    userId: string,
    date: Date,
    startTime?: string,
    endTime?: string
  ): Promise<void>;
  getAvailability(
    userId: string
  ): Promise<{ windows: AvailabilityWindow[]; exceptions: AvailabilityException[] }>;

  // Requirement 41: Desired hours tracking
  setDesiredWeeklyHours(userId: string, hours: number): Promise<void>;
  getDesiredWeeklyHours(userId: string): Promise<number | null>;
}
```

### Schedule Service

Handles shift creation, assignment, and validation with constraint checking.

**Responsibilities:**

- Shift CRUD operations
- Staff assignment to shifts
- Multi-timezone shift display
- Overnight shift handling
- Integration with Conflict Detector and Compliance Monitor

**Key Methods:**

```typescript
interface ScheduleService {
  createShift(data: CreateShiftDto, managerId: string): Promise<Shift>;
  assignStaff(shiftId: string, staffId: string, managerId: string): Promise<Assignment>;
  unassignStaff(assignmentId: string, managerId: string): Promise<void>;
  getSchedule(
    locationId: string,
    startDate: Date,
    endDate: Date,
    timezone: string
  ): Promise<Shift[]>;
  getStaffSchedule(staffId: string, startDate: Date, endDate: Date): Promise<Shift[]>;

  // Requirement 32: Schedule publishing
  publishSchedule(locationId: string, weekStart: Date, managerId: string): Promise<void>;
  unpublishSchedule(locationId: string, weekStart: Date, managerId: string): Promise<void>;

  // Requirement 34: Shift pickup
  getAvailableShifts(staffId: string): Promise<Shift[]>;
  pickupShift(shiftId: string, staffId: string): Promise<Assignment>;

  // Requirement 40: Alternative staff suggestions
  getAlternativeStaff(shiftId: string, excludeStaffId?: string): Promise<StaffSuggestion[]>;

  // Requirement 42: Headcount tracking
  getShiftHeadcountStatus(shiftId: string): Promise<{ filled: number; required: number }>;
}
```

### Conflict Detector

Prevents double-booking and manages concurrent scheduling operations.

**Responsibilities:**

- Overlap detection across all locations
- Distributed locking for concurrent operations
- UTC conversion for cross-timezone comparison
- Conflict notification via WebSocket

**Key Methods:**

```typescript
interface ConflictDetector {
  checkOverlap(
    staffId: string,
    shiftStart: Date,
    shiftEnd: Date,
    excludeShiftId?: string
  ): Promise<Shift | null>;
  acquireLock(staffId: string, timeoutMs: number): Promise<Lock>;
  releaseLock(lock: Lock): Promise<void>;
  withLock<T>(staffId: string, operation: () => Promise<T>): Promise<T>;
}
```

**Locking Strategy:**

- Use Redlock algorithm with Redis for distributed locks
- Lock key format: `lock:staff:{staffId}`
- Default lock timeout: 5 seconds
- Automatic lock expiration to prevent deadlocks
- Retry logic with exponential backoff (max 3 attempts)

### Compliance Monitor

Enforces labor law requirements and business constraints.

**Responsibilities:**

- Rest period validation (10-hour minimum)
- Daily hour limit enforcement
- Weekly hour limit enforcement (40 hours)
- Consecutive days limit enforcement
- Per-location configuration support

**Key Methods:**

```typescript
interface ComplianceMonitor {
  validateRestPeriod(
    staffId: string,
    newShiftStart: Date,
    newShiftEnd: Date
  ): Promise<ValidationResult>;
  validateDailyLimit(
    staffId: string,
    shiftStart: Date,
    shiftEnd: Date,
    locationId: string
  ): Promise<ValidationResult>;
  validateWeeklyLimit(
    staffId: string,
    shiftStart: Date,
    shiftEnd: Date,
    locationId: string
  ): Promise<ValidationResult>;
  validateConsecutiveDays(
    staffId: string,
    shiftDate: Date,
    locationId: string
  ): Promise<ValidationResult>;
  validateAll(staffId: string, shift: ShiftData): Promise<ValidationResult[]>;

  // Requirement 31: Availability validation
  validateAvailability(
    staffId: string,
    shiftStart: Date,
    shiftEnd: Date
  ): Promise<ValidationResult>;

  // Requirement 39: Enhanced compliance warnings
  validateWithGraduation(
    staffId: string,
    shift: ShiftData,
    allowOverride?: boolean
  ): Promise<{ errors: ValidationResult[]; warnings: ValidationResult[] }>;
}
```

### Swap Workflow Manager

Manages shift swap requests and approval workflows.

**Responsibilities:**

- Swap request creation and validation
- Manager approval/rejection workflow
- Atomic assignment updates
- Notification to involved parties

**Key Methods:**

```typescript
interface SwapService {
  createSwapRequest(
    requestorId: string,
    shiftId: string,
    targetStaffId: string
  ): Promise<SwapRequest>;
  approveSwap(swapRequestId: string, managerId: string): Promise<void>;
  rejectSwap(swapRequestId: string, managerId: string, reason: string): Promise<void>;
  getPendingSwaps(managerId: string): Promise<SwapRequest[]>;
  getSwapsByStaff(staffId: string): Promise<SwapRequest[]>;

  // Requirement 33: Drop requests
  createDropRequest(requestorId: string, shiftId: string): Promise<DropRequest>;
  expireDropRequests(): Promise<void>; // Background job

  // Requirement 35: Request limits
  getPendingRequestCount(staffId: string): Promise<number>;

  // Requirement 37: Swap cancellation by requestor
  cancelSwapRequest(swapRequestId: string, requestorId: string): Promise<void>;
}
```

### Overtime Tracker

Calculates and tracks overtime hours for staff members.

**Responsibilities:**

- Rolling 7-day hour calculation
- Overtime flagging (hours > 40)
- Weekly reports generation
- Overtime warnings for new assignments

**Key Methods:**

```typescript
interface OvertimeService {
  calculateHours(staffId: string, startDate: Date, endDate: Date): Promise<HoursSummary>;
  getOvertimeReport(locationId: string, weekStart: Date): Promise<OvertimeReport[]>;
  checkOvertimeWarning(staffId: string, newShift: ShiftData): Promise<OvertimeWarning | null>;
  generatePayPeriodReport(startDate: Date, endDate: Date): Promise<void>; // Background job
}
```

### Fairness Analyzer

Calculates and reports on equitable shift distribution.

**Responsibilities:**

- Hour distribution statistics
- Premium shift tracking
- Deviation identification
- Visual analytics generation (background job)

**Key Methods:**

```typescript
interface FairnessService {
  calculateHourDistribution(
    locationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<HourDistribution>;
  calculatePremiumShiftDistribution(
    locationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<PremiumShiftDistribution>;
  identifyOutliers(distribution: HourDistribution): Promise<StaffOutlier[]>;
  generateFairnessReport(locationId: string, startDate: Date, endDate: Date): Promise<void>; // Background job

  // Requirement 41: Desired hours tracking
  compareActualToDesiredHours(
    locationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<DesiredHoursComparison[]>;
  identifyUnderScheduled(comparison: DesiredHoursComparison[]): Promise<StaffOutlier[]>;
  identifyOverScheduled(comparison: DesiredHoursComparison[]): Promise<StaffOutlier[]>;
}
```

### Audit Logger

Records all system changes with immutable audit trail.

**Responsibilities:**

- Append-only audit record storage
- Cryptographic hash generation for integrity
- Searchable audit query interface
- Audit record verification

**Key Methods:**

```typescript
interface AuditService {
  logShiftChange(action: AuditAction, shiftId: string, userId: string, changes: any): Promise<void>;
  logAssignmentChange(
    action: AuditAction,
    assignmentId: string,
    userId: string,
    changes: any
  ): Promise<void>;
  logSwapAction(
    action: AuditAction,
    swapRequestId: string,
    userId: string,
    decision?: string
  ): Promise<void>;
  logUserChange(
    action: AuditAction,
    targetUserId: string,
    actorUserId: string,
    changes: any
  ): Promise<void>;
  queryAuditLog(filters: AuditQueryFilters): Promise<AuditRecord[]>;
  verifyIntegrity(recordId: string): Promise<boolean>;
}
```

### Notification Service

Manages persistent notifications and user notification preferences.

**Responsibilities:**

- Notification creation and storage
- Read/unread status tracking
- Notification history management
- User notification preferences
- Triggered notifications for system events

**Key Methods:**

```typescript
interface NotificationService {
  // Requirement 38: Notification system
  createNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    metadata?: any
  ): Promise<Notification>;

  getNotifications(userId: string, includeRead?: boolean): Promise<Notification[]>;
  markAsRead(notificationId: string): Promise<void>;
  markAllAsRead(userId: string): Promise<void>;

  setNotificationPreferences(
    userId: string,
    inAppEnabled: boolean,
    emailEnabled: boolean
  ): Promise<void>;

  getNotificationPreferences(userId: string): Promise<NotificationPreference>;

  // Event-triggered notifications
  notifyShiftAssignment(staffId: string, shiftId: string): Promise<void>;
  notifyShiftModification(staffId: string, shiftId: string): Promise<void>;
  notifySwapRequest(
    requestorId: string,
    targetStaffId: string,
    managerId: string,
    swapRequestId: string
  ): Promise<void>;
  notifySchedulePublished(staffIds: string[], weekStart: Date): Promise<void>;
  notifyOvertimeApproaching(staffId: string, managerId: string, hours: number): Promise<void>;
  notifyAvailabilityChange(staffId: string, managerIds: string[]): Promise<void>;
}
```

### Real-Time Sync Service

Manages WebSocket connections and broadcasts updates.

**Responsibilities:**

- WebSocket connection management
- Room-based subscriptions (by location, user)
- Event broadcasting for schedule changes
- Connection cleanup on disconnect

**Key Events:**

```typescript
// Server -> Client events
interface ServerEvents {
  'shift:created': (shift: Shift) => void;
  'shift:updated': (shift: Shift) => void;
  'shift:deleted': (shiftId: string) => void;
  'shift:published': (locationId: string, weekStart: Date) => void; // Requirement 32
  'assignment:changed': (assignment: Assignment) => void;
  'swap:created': (swapRequest: SwapRequest) => void;
  'swap:updated': (swapRequest: SwapRequest) => void;
  'swap:cancelled': (swapRequestId: string, reason: string) => void; // Requirement 36, 37
  'drop:created': (dropRequest: DropRequest) => void; // Requirement 33
  'drop:claimed': (dropRequestId: string, staffId: string) => void; // Requirement 34
  'drop:expired': (dropRequestId: string) => void; // Requirement 33
  'conflict:detected': (conflict: ConflictNotification) => void;
  'job:completed': (jobId: string, result: any) => void;
  'callout:reported': (callout: CalloutNotification) => void;
  'notification:new': (notification: Notification) => void; // Requirement 38
}

// Client -> Server events
interface ClientEvents {
  'subscribe:location': (locationId: string) => void;
  'subscribe:staff': (staffId: string) => void;
  'unsubscribe:location': (locationId: string) => void;
  'unsubscribe:staff': (staffId: string) => void;
}
```

### Cache Manager

Manages Redis caching with TTL and invalidation strategies.

**Responsibilities:**

- Frequently accessed data caching
- Cache invalidation on updates
- TTL management
- Cache warming for common queries

**Caching Strategy:**

- User data: 15 minutes TTL
- Schedule data: 5 minutes TTL
- Configuration data: 1 hour TTL
- Invalidate on write operations
- Cache key format: `{entity}:{id}` or `{entity}:query:{hash}`

### Background Job Queue

Processes time-intensive operations asynchronously using BullMQ.

**Job Types:**

- `fairness-report`: Generate fairness analytics for a date range
- `overtime-report`: Calculate overtime for multiple pay periods
- `schedule-import`: Parse and validate CSV schedule imports
- `cache-warm`: Pre-populate cache for upcoming schedules
- `drop-request-expiration`: Expire unclaimed drop requests 24 hours before shift start (Requirement 33)
- `notification-digest`: Send batched notification emails (Requirement 38)

**Job Configuration:**

```typescript
interface JobConfig {
  attempts: 3;
  backoff: {
    type: 'exponential';
    delay: 2000;
  };
  removeOnComplete: 100; // Keep last 100 completed jobs
  removeOnFail: 500; // Keep last 500 failed jobs
}
```

## Data Models

### Database Schema (Prisma)

```prisma
// User and Authentication
model User {
  id                String   @id @default(uuid())
  email             String   @unique
  passwordHash      String
  role              Role
  firstName         String
  lastName          String
  desiredWeeklyHours Float?  // Requirement 41: Desired hours tracking
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  skills            UserSkill[]
  certifications    LocationCertification[]
  assignments       Assignment[]
  swapRequestsFrom  SwapRequest[] @relation("RequestorSwaps")
  swapRequestsTo    SwapRequest[] @relation("TargetSwaps")
  managerLocations  ManagerLocation[]
  auditLogs         AuditLog[]
  callouts          Callout[]
  availabilityWindows AvailabilityWindow[]  // Requirement 31: Staff availability
  availabilityExceptions AvailabilityException[]  // Requirement 31: One-off exceptions
  notifications     Notification[]  // Requirement 38: Notification system
  notificationPreferences NotificationPreference?  // Requirement 38: User preferences

  @@index([email])
  @@index([role])
}
```

enum Role {
ADMIN
MANAGER
STAFF
}

model Skill {
id String @id @default(uuid())
name String @unique
description String?
createdAt DateTime @default(now())

users UserSkill[]
shifts ShiftSkill[]

@@index([name])
}

model UserSkill {
id String @id @default(uuid())
userId String
skillId String
assignedAt DateTime @default(now())
assignedBy String

user User @relation(fields: [userId], references: [id], onDelete: Cascade)
skill Skill @relation(fields: [skillId], references: [id], onDelete: Cascade)

@@unique([userId, skillId])
@@index([userId])
@@index([skillId])
}

model Location {
id String @id @default(uuid())
name String
timezone String // IANA timezone identifier (e.g., "America/New_York")
address String?
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

shifts Shift[]
certifications LocationCertification[]
managers ManagerLocation[]
config LocationConfig?

@@index([name])
}

model LocationCertification {
id String @id @default(uuid())
userId String
locationId String
certifiedAt DateTime @default(now())
certifiedBy String

user User @relation(fields: [userId], references: [id], onDelete: Cascade)
location Location @relation(fields: [locationId], references: [id], onDelete: Cascade)

@@unique([userId, locationId])
@@index([userId])
@@index([locationId])
}

model ManagerLocation {
id String @id @default(uuid())
managerId String
locationId String
assignedAt DateTime @default(now())

manager User @relation(fields: [managerId], references: [id], onDelete: Cascade)
location Location @relation(fields: [locationId], references: [id], onDelete: Cascade)

@@unique([managerId, locationId])
@@index([managerId])
@@index([locationId])
}

// Scheduling
model Shift {
id String @id @default(uuid())
locationId String
startTime DateTime // Stored in UTC, displayed in location timezone
endTime DateTime // Stored in UTC, displayed in location timezone
requiredHeadcount Int @default(1) // Requirement 42: Headcount tracking
isPublished Boolean @default(false) // Requirement 32: Schedule publishing
publishedAt DateTime? // Requirement 32: Track when published
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
createdBy String

location Location @relation(fields: [locationId], references: [id], onDelete: Cascade)
skills ShiftSkill[]
assignments Assignment[]
swapRequests SwapRequest[]
callouts Callout[]
dropRequests DropRequest[] // Requirement 33: Drop requests

@@index([locationId])
@@index([startTime])
@@index([endTime])
@@index([locationId, startTime, endTime])
@@index([isPublished])
}

model ShiftSkill {
id String @id @default(uuid())
shiftId String
skillId String

shift Shift @relation(fields: [shiftId], references: [id], onDelete: Cascade)
skill Skill @relation(fields: [skillId], references: [id], onDelete: Cascade)

@@unique([shiftId, skillId])
@@index([shiftId])
@@index([skillId])
}

model Assignment {
id String @id @default(uuid())
shiftId String
staffId String
assignedAt DateTime @default(now())
assignedBy String
version Int @default(1) // Optimistic locking

shift Shift @relation(fields: [shiftId], references: [id], onDelete: Cascade)
staff User @relation(fields: [staffId], references: [id], onDelete: Cascade)

@@unique([shiftId, staffId]) // Requirement 42: Allow multiple staff per shift, but prevent duplicate assignments
@@index([staffId])
@@index([shiftId])
@@index([shiftId, staffId])
}

// Swap Workflow
model SwapRequest {
id String @id @default(uuid())
shiftId String
requestorId String
targetStaffId String
status SwapStatus @default(PENDING)
createdAt DateTime @default(now())
reviewedAt DateTime?
reviewedBy String?
rejectionReason String?

shift Shift @relation(fields: [shiftId], references: [id], onDelete: Cascade)
requestor User @relation("RequestorSwaps", fields: [requestorId], references: [id], onDelete: Cascade)
targetStaff User @relation("TargetSwaps", fields: [targetStaffId], references: [id], onDelete: Cascade)

@@index([shiftId])
@@index([requestorId])
@@index([targetStaffId])
@@index([status])
}

enum SwapStatus {
PENDING
APPROVED
REJECTED
CANCELLED // Requirement 36, 37: Swap cancellation
}

// Callouts
model Callout {
id String @id @default(uuid())
shiftId String
staffId String
reason String?
reportedAt DateTime @default(now())

shift Shift @relation(fields: [shiftId], references: [id], onDelete: Cascade)
staff User @relation(fields: [staffId], references: [id], onDelete: Cascade)

@@index([shiftId])
@@index([staffId])
@@index([reportedAt])
}

// Requirement 33: Drop Requests
model DropRequest {
id String @id @default(uuid())
shiftId String
requestorId String
status DropStatus @default(PENDING)
createdAt DateTime @default(now())
expiresAt DateTime // 24 hours before shift start
claimedBy String?
claimedAt DateTime?

shift Shift @relation(fields: [shiftId], references: [id], onDelete: Cascade)

@@index([shiftId])
@@index([requestorId])
@@index([status])
@@index([expiresAt])
}

enum DropStatus {
PENDING
CLAIMED
EXPIRED
CANCELLED
}

// Requirement 31: Staff Availability Windows
model AvailabilityWindow {
id String @id @default(uuid())
userId String
dayOfWeek Int // 0 = Sunday, 6 = Saturday
startTime String // HH:MM format (e.g., "09:00")
endTime String // HH:MM format (e.g., "17:00")
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

user User @relation(fields: [userId], references: [id], onDelete: Cascade)

@@index([userId])
@@index([dayOfWeek])
}

// Requirement 31: One-off Availability Exceptions
model AvailabilityException {
id String @id @default(uuid())
userId String
date DateTime // Specific date for exception
startTime String? // If null, unavailable all day
endTime String? // If null, unavailable all day
createdAt DateTime @default(now())

user User @relation(fields: [userId], references: [id], onDelete: Cascade)

@@index([userId])
@@index([date])
}

// Requirement 38: Notification System
model Notification {
id String @id @default(uuid())
userId String
type String // "SHIFT_ASSIGNED", "SHIFT_MODIFIED", "SWAP_REQUEST", etc.
title String
message String
isRead Boolean @default(false)
createdAt DateTime @default(now())
metadata Json? // Additional context (shift ID, swap request ID, etc.)

user User @relation(fields: [userId], references: [id], onDelete: Cascade)

@@index([userId])
@@index([isRead])
@@index([createdAt])
@@index([userId, isRead])
}

// Requirement 38: Notification Preferences
model NotificationPreference {
id String @id @default(uuid())
userId String @unique
inAppEnabled Boolean @default(true)
emailEnabled Boolean @default(false) // Email simulation
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

user User @relation(fields: [userId], references: [id], onDelete: Cascade)

@@index([userId])
}

// Configuration
model LocationConfig {
id String @id @default(uuid())
locationId String @unique
dailyLimitEnabled Boolean @default(false)
dailyLimitHours Float?
weeklyLimitEnabled Boolean @default(true)
weeklyLimitHours Float @default(40)
consecutiveDaysEnabled Boolean @default(false)
consecutiveDaysLimit Int?
schedulePublishCutoffHours Int @default(48) // Requirement 32: Unpublish cutoff
maxPendingRequests Int @default(3) // Requirement 35: Request limits

location Location @relation(fields: [locationId], references: [id], onDelete: Cascade)
premiumShiftCriteria PremiumShiftCriteria[]

@@index([locationId])
}

model PremiumShiftCriteria {
id String @id @default(uuid())
configId String
criteriaType String // "DAY_OF_WEEK", "TIME_OF_DAY", "HOLIDAY"
criteriaValue String // JSON string with criteria details

config LocationConfig @relation(fields: [configId], references: [id], onDelete: Cascade)

@@index([configId])
}

// Audit Trail
model AuditLog {
id String @id @default(uuid())
action String // "CREATE", "UPDATE", "DELETE", "APPROVE", "REJECT"
entityType String // "SHIFT", "ASSIGNMENT", "SWAP_REQUEST", "USER"
entityId String
userId String
timestamp DateTime @default(now())
previousState Json?
newState Json?
hash String // SHA-256 hash of record for integrity verification

user User @relation(fields: [userId], references: [id])

@@index([entityType, entityId])
@@index([userId])
@@index([timestamp])
@@index([action])
}

```

### Key Design Decisions

**Timezone Handling:**
- All timestamps stored in UTC in the database
- Location timezone stored as IANA identifier (e.g., "America/New_York")
- Conversion to local timezone happens at the service layer for display
- Comparisons always done in UTC to avoid DST issues

**Optimistic Locking:**
- Assignment table includes version field
- Increment version on each update
- Detect concurrent modifications by checking version mismatch

**Audit Trail Integrity:**
- Each audit record includes SHA-256 hash of its contents
- Hash computed from: action + entityType + entityId + userId + timestamp + states
- Verification function recomputes hash and compares with stored value

**Distributed Locking:**
- Redlock algorithm with single Redis instance (can scale to multiple)
- Lock keys: `lock:staff:{staffId}`
- Default TTL: 5 seconds
- Automatic expiration prevents deadlocks

**Availability Windows (Requirement 31):**
- Recurring windows stored with day of week (0-6) and time strings (HH:MM format)
- One-off exceptions stored with specific date and optional time range
- Validation happens at assignment time, not at window creation
- Past assignments unaffected by availability changes

**Schedule Publishing (Requirement 32):**
- Published status tracked per shift, not per week (allows partial publishing)
- Cutoff time configurable per location (default 48 hours)
- Staff queries filtered by published status at database level for performance
- Publishing triggers bulk notification creation

**Drop Requests vs Swap Requests (Requirement 33):**
- Separate DropRequest model (not nullable targetStaffId on SwapRequest)
- Clearer semantics and simpler queries
- Drop requests auto-expire via scheduled background job
- Both count toward pending request limit

**Headcount Model (Requirement 42):**
- Changed Assignment unique constraint from `[shiftId]` to `[shiftId, staffId]`
- Allows multiple staff per shift while preventing duplicate assignments
- Headcount validation happens at assignment time
- Filled count computed dynamically from assignment count
```

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: User Creation Assigns Exactly One Role

_For any_ user creation request, the created user should have exactly one role assigned (Admin, Manager, or Staff).

**Validates: Requirements 1.2**

### Property 2: Manager Role Requires Location Authorization

_For any_ user assigned the Manager role, the system should reject the assignment if no authorized locations are specified.

**Validates: Requirements 1.3**

### Property 3: Resource Access Requires Appropriate Permissions

_For any_ resource access attempt, the system should verify that the user's role has permission to access that resource type.

**Validates: Requirements 1.5**

### Property 4: Skill Assignment Records Timestamp

_For any_ skill assignment to a staff user, querying the user's skills should return the assigned skill with a timestamp.

**Validates: Requirements 2.3**

### Property 5: Certification Assignment Records Timestamp

_For any_ location certification assignment to a staff user, querying the user's certifications should return the certification with a timestamp.

**Validates: Requirements 2.4**

### Property 6: Manager Location Authorization Scope

_For any_ manager user, querying staff skills and certifications should only return data for staff at the manager's authorized locations.

**Validates: Requirements 2.5**

### Property 7: Shift Creation Requires All Fields

_For any_ shift creation attempt missing start time, end time, location, or required skills, the system should reject the creation.

**Validates: Requirements 3.1**

### Property 8: Shift End Time After Start Time

_For any_ shift creation attempt where end time is not after start time, the system should reject the creation.

**Validates: Requirements 3.2**

### Property 9: Shift Timezone Context Preservation

_For any_ created shift, retrieving the shift should return times in the timezone context of the shift's location.

**Validates: Requirements 3.4**

### Property 10: Manager Shift Creation Authorization

_For any_ shift creation attempt by a manager, the system should reject creation for locations not in the manager's authorized locations.

**Validates: Requirements 3.5**

### Property 11: Staff Assignment Requires Skills

_For any_ staff assignment to a shift, the system should reject the assignment if the staff user does not possess all required skills for that shift.

**Validates: Requirements 4.1**

### Property 12: Staff Assignment Requires Location Certification

_For any_ staff assignment to a shift, the system should reject the assignment if the staff user does not have certification for the shift's location.

**Validates: Requirements 4.2**

### Property 13: No Overlapping Shift Assignments

_For any_ staff assignment to a shift, the system should reject the assignment if the staff user is already assigned to a shift that overlaps in time (across all locations).

**Validates: Requirements 4.3, 5.1**

### Property 14: Rest Period Enforcement

_For any_ staff assignment to a shift, the system should reject the assignment if the time gap between the new shift and any adjacent shift (before or after) is less than 10 hours.

**Validates: Requirements 4.4, 6.3, 6.5**

### Property 15: Swap Request Requires Valid Fields

_For any_ swap request creation, the system should reject the request if the shift to swap or target staff user is not specified.

**Validates: Requirements 7.1**

### Property 16: Swap Requestor Must Be Assigned

_For any_ swap request creation, the system should reject the request if the requesting staff user is not assigned to the specified shift.

**Validates: Requirements 7.2**

### Property 17: Swap Target Must Have Required Skills

_For any_ swap request creation, the system should reject the request if the target staff user does not possess all required skills for the shift.

**Validates: Requirements 7.3**

### Property 18: Swap Target Must Have Location Certification

_For any_ swap request creation, the system should reject the request if the target staff user does not have certification for the shift's location.

**Validates: Requirements 7.4**

### Property 19: Swap Request Initial Status

_For any_ successfully created swap request, the request status should be set to "pending".

**Validates: Requirements 7.5**

### Property 20: Swap Approval Re-validates Constraints

_For any_ swap approval attempt, the system should reject the swap if the target staff user would violate any scheduling constraints (skills, certification, overlap, rest period).

**Validates: Requirements 8.2**

### Property 21: Swap Approval Atomic Assignment Update

_For any_ approved swap request, both the original assignment removal and new assignment creation should complete together or neither should occur.

**Validates: Requirements 8.4**

### Property 22: Swap Actions Create Audit Logs

_For any_ swap request approval or rejection, an audit log entry should be created recording the decision, timestamp, and manager user.

**Validates: Requirements 8.5**

### Property 23: Overtime Calculation Matches Shift Hours

_For any_ staff user and 7-day period, the calculated total hours should equal the sum of all assigned shift durations in that period.

**Validates: Requirements 9.1**

### Property 24: Overtime Flagging Above 40 Hours

_For any_ staff user with total hours exceeding 40 in a 7-day period, the excess hours should be flagged as overtime.

**Validates: Requirements 9.3**

### Property 25: Overtime Warning Generation

_For any_ shift assignment that would cause a staff user to exceed 40 hours in a 7-day period, the system should generate an overtime warning with the projected overtime amount.

**Validates: Requirements 9.5**

### Property 26: Weekly Limit Enforcement When Enabled

_For any_ shift assignment attempt when weekly limit enforcement is enabled for the location, the system should reject assignments that would exceed 40 hours in any rolling 7-day period.

**Validates: Requirements 10.1**

### Property 27: Daily Limit Enforcement When Enabled

_For any_ shift assignment attempt when daily limit enforcement is enabled for the location, the system should reject assignments that would exceed the configured daily limit in any rolling 24-hour period.

**Validates: Requirements 11.1**

### Property 28: Daily Limit Not Enforced When Unconfigured

_For any_ location without a configured daily limit, shift assignments should not be rejected for daily limit violations.

**Validates: Requirements 11.5**

### Property 29: Consecutive Days Limit Enforcement When Enabled

_For any_ shift assignment attempt when consecutive days limit enforcement is enabled for the location, the system should reject assignments that would exceed the configured consecutive days limit.

**Validates: Requirements 12.1**

### Property 30: Consecutive Days Counter Reset

_For any_ staff user with a calendar day containing no shifts, the consecutive days counter should reset to zero for subsequent shift assignments.

**Validates: Requirements 12.3**

### Property 31: Consecutive Days Not Enforced When Unconfigured

_For any_ location without a configured consecutive days limit, shift assignments should not be rejected for consecutive days violations.

**Validates: Requirements 12.5**

### Property 32: Fairness Hour Calculation Matches Shifts

_For any_ staff user and date range, the fairness analyzer's calculated total hours should equal the sum of all assigned shift durations in that range.

**Validates: Requirements 13.1**

### Property 33: Fairness Mean Calculation

_For any_ location and date range, the calculated mean hours should equal the sum of all staff hours divided by the count of staff users.

**Validates: Requirements 13.2**

### Property 34: Fairness Outlier Identification

_For any_ staff user whose scheduled hours deviate more than one standard deviation from the mean, the fairness analyzer should identify them as an outlier.

**Validates: Requirements 13.3**

### Property 35: Premium Shift Identification

_For any_ shift matching the configured premium shift criteria (day of week, time of day, holidays), the system should classify it as a premium shift.

**Validates: Requirements 14.1**

### Property 36: Premium Shift Count Accuracy

_For any_ staff user and date range, the calculated premium shift count should equal the actual number of premium shifts assigned to that user.

**Validates: Requirements 14.2**

### Property 37: Premium Shift Percentage Calculation

_For any_ staff user with assigned shifts, the calculated premium shift percentage should equal (premium_shift_count / total_shift_count) × 100.

**Validates: Requirements 14.3**

### Property 38: Premium Shift Outlier Identification

_For any_ staff user whose premium shift percentage deviates significantly from the mean, the fairness analyzer should identify them as receiving disproportionate premium shift assignments.

**Validates: Requirements 14.4**

### Property 39: Real-Time Shift Change Broadcast

_For any_ shift creation, modification, or deletion, the system should broadcast the change to all connected clients subscribed to the affected schedule.

**Validates: Requirements 15.1**

### Property 40: Real-Time Assignment Change Broadcast

_For any_ staff assignment change, the system should broadcast the change to the affected staff user's connected clients.

**Validates: Requirements 15.2**

### Property 41: Client Subscription Authorization

_For any_ client connection, the system should only subscribe the client to updates for schedules the authenticated user has permission to view.

**Validates: Requirements 15.4**

### Property 42: Conflict Notification Broadcast

_For any_ detected scheduling conflict during concurrent operations, the system should notify all affected managers via real-time broadcast.

**Validates: Requirements 16.4**

### Property 43: Shift Display in Location Timezone

_For any_ shift retrieved for display, the shift times should be converted to and displayed in the timezone context of the shift's location.

**Validates: Requirements 17.1**

### Property 44: Timezone Context Update on Location Switch

_For any_ manager switching between location views, all displayed shift times should update to reflect the new location's timezone context.

**Validates: Requirements 17.5**

### Property 45: Audit Log for Shift Changes

_For any_ shift creation, modification, or deletion, an audit log entry should be created with timestamp, user, and affected entities.

**Validates: Requirements 19.1**

### Property 46: Audit Log for Assignment Changes

_For any_ staff assignment change, an audit log entry should be created recording the previous state, new state, timestamp, and user.

**Validates: Requirements 19.2**

### Property 47: Audit Log for User Changes

_For any_ user account change (role, skill, certification), an audit log entry should be created recording the change details, timestamp, and actor.

**Validates: Requirements 19.4**

### Property 48: Audit Record Immutability

_For any_ existing audit record, attempts to modify or delete the record should be rejected by the system.

**Validates: Requirements 20.2**

### Property 49: Audit Record Hash Generation

_For any_ created audit record, the record should include a cryptographic hash of its contents.

**Validates: Requirements 20.3**

### Property 50: Audit Record Integrity Verification

_For any_ audit record, verifying its integrity by recomputing the hash should confirm the record has not been tampered with (round-trip property).

**Validates: Requirements 20.5**

### Property 51: Available Staff Count Accuracy

_For any_ location, the displayed count of available staff should equal the actual number of staff users with required skills and certifications for that location.

**Validates: Requirements 21.3**

### Property 52: Upcoming Shifts Time Window

_For any_ query for upcoming shifts in the next 24 hours, all returned shifts should have start times within 24 hours from the current time.

**Validates: Requirements 21.4**

### Property 53: Callout Dashboard Update

_For any_ reported callout, the dashboard should immediately reflect the shift as uncovered.

**Validates: Requirements 21.5**

### Property 54: Callout Requires Shift Specification

_For any_ callout report attempt without an affected shift specified, the system should reject the callout.

**Validates: Requirements 22.1**

### Property 55: Callout Manager Notification

_For any_ reported callout, all managers authorized for the shift's location should receive immediate notification.

**Validates: Requirements 22.2**

### Property 56: Callout Marks Shift Uncovered

_For any_ reported callout, the affected shift should be marked as uncovered in the system.

**Validates: Requirements 22.3**

### Property 57: Callout Audit Logging

_For any_ reported callout, an audit log entry should be created with timestamp and reason.

**Validates: Requirements 22.4**

### Property 58: Coverage Gap Staff Qualification

_For any_ uncovered shift, all identified available staff should possess the required skills and location certification for that shift.

**Validates: Requirements 23.1**

### Property 59: Coverage Gap Constraint Filtering

_For any_ uncovered shift, all identified available staff should not violate scheduling constraints if assigned to that shift.

**Validates: Requirements 23.2**

### Property 60: Coverage Gap Staff Ranking

_For any_ uncovered shift, the list of available staff should be ranked in ascending order by current hour totals.

**Validates: Requirements 23.3**

### Property 61: Coverage Gap Notification

_For any_ coverage gap occurrence, notifications should be sent to the manager and all identified available staff users.

**Validates: Requirements 23.4**

### Property 62: Fairness Report Background Job Queuing

_For any_ fairness analytics report generation request, the operation should be queued as a background job.

**Validates: Requirements 24.2**

### Property 63: Overtime Report Background Job Queuing

_For any_ overtime calculation for multiple pay periods, the operation should be queued as a background job.

**Validates: Requirements 24.3**

### Property 64: Background Job Completion Notification

_For any_ completed background job, the requesting user should receive notification via real-time sync.

**Validates: Requirements 24.4**

### Property 65: Transaction Rollback on Failure

_For any_ failed database transaction, no partial state changes should persist in the database.

**Validates: Requirements 26.4**

### Property 66: Configuration Validation

_For any_ configuration change attempt with invalid values, the system should reject the change before applying it.

**Validates: Requirements 27.4**

### Property 67: Configuration Change Audit Logging

_For any_ configuration change, an audit log entry should be created recording previous values, new values, timestamp, and admin user.

**Validates: Requirements 27.5**

### Property 68: CSV Parsing According to Schema

_For any_ uploaded CSV file, the system should parse the file according to the defined CSV schema structure.

**Validates: Requirements 28.1**

### Property 69: CSV Required Fields Validation

_For any_ CSV file missing required fields, the system should reject the import with descriptive error messages.

**Validates: Requirements 28.2**

### Property 70: CSV Import-Export Round Trip

_For any_ valid schedule data, importing a CSV, then exporting, then importing again should produce equivalent shift records (round-trip property).

**Validates: Requirements 28.5**

### Property 71: API Authentication Requirement

_For any_ API endpoint except health checks, unauthenticated requests should be rejected.

**Validates: Requirements 30.1**

### Property 72: JWT Token Expiration Time

_For any_ successful authentication, the issued JWT token should have an expiration time of 24 hours from issuance.

**Validates: Requirements 30.2**

### Property 73: Expired Token Rejection

_For any_ API request with an expired JWT token, the system should reject the request and require re-authentication.

**Validates: Requirements 30.3**

### Property 74: Unauthorized Action Forbidden Response

_For any_ user attempting an action they are not authorized to perform, the system should return a 403 Forbidden error with a descriptive message.

**Validates: Requirements 30.5**

### Property 75: Availability Window Round Trip

_For any_ staff user and availability window data, setting an availability window then retrieving the user's availability should return the same window data.

**Validates: Requirements 31.1**

### Property 76: Availability Exception Round Trip

_For any_ staff user and availability exception data, adding an exception then retrieving the user's availability should return the same exception data.

**Validates: Requirements 31.2**

### Property 77: Shift Assignment Respects Availability

_For any_ staff assignment to a shift, the system should reject the assignment if the shift falls outside the staff user's availability windows.

**Validates: Requirements 31.3**

### Property 78: Availability Changes Affect Future Shifts Only

_For any_ staff user with existing shift assignments, modifying their availability windows should not affect those existing assignments.

**Validates: Requirements 31.5**

### Property 79: Schedule Publishing Marks All Shifts

_For any_ week's schedule at a location, publishing the schedule should mark all shifts in that week as published.

**Validates: Requirements 32.1**

### Property 80: Published Shifts Visible to Staff

_For any_ staff user, querying their schedule should return only published shifts, while manager queries should return all shifts.

**Validates: Requirements 32.2, 32.3**

### Property 81: Unpublish Cutoff Enforcement

_For any_ schedule unpublish attempt, the system should allow unpublishing before the cutoff time and reject unpublishing within the cutoff window.

**Validates: Requirements 32.4**

### Property 82: Drop Request Without Target Staff

_For any_ drop request creation, the system should allow creation without specifying a target staff user.

**Validates: Requirements 33.1**

### Property 83: Drop Request Makes Shift Available

_For any_ drop request creation, the shift should appear in the available shifts listing for qualified staff.

**Validates: Requirements 33.2**

### Property 84: Drop Request Auto-Expiration

_For any_ drop request created more than 24 hours before shift start, the request should automatically expire 24 hours before the shift if unclaimed.

**Validates: Requirements 33.3**

### Property 85: Drop Requests Count Toward Pending Limit

_For any_ staff user, the pending request count should include both swap requests and drop requests.

**Validates: Requirements 33.4, 35.2**

### Property 86: Drop Request Expiration Restores Assignment

_For any_ expired drop request, the original staff assignment should be restored.

**Validates: Requirements 33.5**

### Property 87: Available Shifts Include Drop Requests

_For any_ staff user querying available shifts, the results should include both unassigned shifts and shifts from drop requests.

**Validates: Requirements 34.1**

### Property 88: Available Shifts Filtered by Qualifications

_For any_ staff user querying available shifts, all returned shifts should require only skills and certifications that the staff user possesses.

**Validates: Requirements 34.2**

### Property 89: Shift Pickup Validates Constraints

_For any_ staff user picking up an available shift, the system should validate all scheduling constraints and reject pickup if any constraint is violated.

**Validates: Requirements 34.3**

### Property 90: Successful Pickup Assigns and Removes from Available

_For any_ successful shift pickup, the staff user should be assigned to the shift and the shift should be removed from available listings.

**Validates: Requirements 34.4**

### Property 91: Pending Request Limit Enforcement

_For any_ staff user with 3 pending requests (swap + drop), attempting to create another request should be rejected.

**Validates: Requirements 35.1**

### Property 92: Request Status Change Decrements Count

_For any_ swap or drop request that is approved, rejected, or expired, the staff user's pending request count should decrease by one.

**Validates: Requirements 35.4**

### Property 93: Pending Request Limit Configuration

_For any_ location, admins should be able to configure the pending request limit, and the system should enforce that configured limit.

**Validates: Requirements 35.5**

### Property 94: Shift Edit Cancels Pending Swaps

_For any_ shift with pending swap requests, editing the shift should automatically cancel all pending swap requests for that shift.

**Validates: Requirements 36.1**

### Property 95: Swap Cancellation Notifications

_For any_ swap request cancelled due to shift edit, notifications should be created for the requestor and target staff user.

**Validates: Requirements 36.2**

### Property 96: Swap Cancellation Audit Log

_For any_ swap request cancelled due to shift edit, an audit log entry should be created with the reason "shift edited by manager".

**Validates: Requirements 36.3**

### Property 97: Swap Cancellation Decrements Count

_For any_ cancelled swap request, the requestor's pending request count should decrease by one.

**Validates: Requirements 36.5, 37.5**

### Property 98: Staff Can Cancel Own Pending Swaps

_For any_ staff user with a pending swap request, the staff user should be able to cancel their own request before manager approval.

**Validates: Requirements 37.1**

### Property 99: Swap Cancellation Updates Status

_For any_ swap request cancelled by the requestor, the request status should be updated to "cancelled".

**Validates: Requirements 37.2**

### Property 100: Requestor Cancellation Notifications

_For any_ swap request cancelled by the requestor, notifications should be created for the target staff user and the manager.

**Validates: Requirements 37.3**

### Property 101: Requestor Cancellation Audit Log

_For any_ swap request cancelled by the requestor, an audit log entry should be created with timestamp and requestor.

**Validates: Requirements 37.4**

### Property 102: Notification Persistence with Status

_For any_ created notification, the notification should persist in the database with read/unread status.

**Validates: Requirements 38.1**

### Property 103: Notification Preferences Round Trip

_For any_ user notification preferences, setting preferences then retrieving them should return the same preference values.

**Validates: Requirements 38.2**

### Property 104: Notification History Completeness

_For any_ user, querying notification history should return all notifications created for that user.

**Validates: Requirements 38.3**

### Property 105: Shift Assignment Creates Notification

_For any_ staff assignment to a shift, a notification should be created for that staff user.

**Validates: Requirements 38.4**

### Property 106: Shift Modification Creates Notification

_For any_ shift modification or deletion, a notification should be created for the assigned staff user.

**Validates: Requirements 38.5**

### Property 107: Swap Request Creates Notifications

_For any_ swap request creation, approval, or rejection, notifications should be created for the requestor, target staff user, and manager.

**Validates: Requirements 38.6**

### Property 108: Schedule Publishing Creates Notifications

_For any_ schedule publication, notifications should be created for all staff users with shifts in that schedule.

**Validates: Requirements 38.7**

### Property 109: Overtime Approaching Creates Notifications

_For any_ staff user reaching 35 or more hours in a 7-day period, notifications should be created for that staff user and their manager.

**Validates: Requirements 38.8**

### Property 110: Availability Change Creates Notifications

_For any_ staff user modifying their availability, notifications should be created for all managers at their authorized locations.

**Validates: Requirements 38.9**

### Property 111: Eight Hour Day Warning Without Block

_For any_ shift assignment resulting in exactly 8 hours worked in a day, the system should generate a warning notification but allow the assignment.

**Validates: Requirements 39.1**

### Property 112: Twelve Hour Day Hard Block

_For any_ shift assignment resulting in more than 12 hours worked in a day, the system should block the assignment with a hard error.

**Validates: Requirements 39.2**

### Property 113: Six Consecutive Days Warning

_For any_ staff user who has worked 6 consecutive days, assigning a shift on the next day should generate a warning but allow the assignment.

**Validates: Requirements 39.3**

### Property 114: Seven Consecutive Days Requires Override

_For any_ staff user who has worked 7 consecutive days, assigning a shift on the next day should require manager override with documented reason.

**Validates: Requirements 39.4**

### Property 115: Thirty-Five Hour Proximity Warning

_For any_ staff user with 35 or more hours in a 7-day period, the system should generate a warning notification indicating proximity to the 40-hour limit.

**Validates: Requirements 39.5**

### Property 116: Constraint Violation Provides Alternatives

_For any_ shift assignment rejected due to constraint violation, the system should identify and return alternative staff users who meet all requirements.

**Validates: Requirements 40.1**

### Property 117: Alternative Staff Meet Requirements

_For any_ alternative staff suggestion, the suggested staff user should possess all required skills, location certification, and availability for the shift.

**Validates: Requirements 40.2**

### Property 118: Alternative Staff Pass Constraint Validation

_For any_ alternative staff suggestion, assigning that staff user to the shift should not violate any scheduling constraints.

**Validates: Requirements 40.3**

### Property 119: Alternative Staff Ranked by Hours

_For any_ list of alternative staff suggestions, the staff users should be ranked in ascending order by current hour totals.

**Validates: Requirements 40.4**

### Property 120: Alternative Staff Limited to Five

_For any_ alternative staff suggestion list, at most 5 staff users should be returned.

**Validates: Requirements 40.5**

### Property 121: Desired Weekly Hours Round Trip

_For any_ staff user and desired hours value, setting desired weekly hours then retrieving them should return the same value.

**Validates: Requirements 41.1**

### Property 122: Actual vs Desired Hours Comparison Accuracy

_For any_ staff user with desired hours set, the fairness analyzer's comparison should accurately reflect the difference between actual scheduled hours and desired hours.

**Validates: Requirements 41.2**

### Property 123: Under-Scheduled Staff Identification

_For any_ staff user whose actual hours are significantly below desired hours, the fairness analyzer should identify them as under-scheduled.

**Validates: Requirements 41.3**

### Property 124: Over-Scheduled Staff Identification

_For any_ staff user whose actual hours are significantly above desired hours, the fairness analyzer should identify them as over-scheduled.

**Validates: Requirements 41.4**

### Property 125: Fairness Report Includes Desired Hours

_For any_ fairness analytics report, the report should display both desired hours and actual hours for each staff user.

**Validates: Requirements 41.5**

### Property 126: Shift Headcount Storage and Retrieval

_For any_ shift created with a specified headcount, retrieving the shift should return the same headcount value.

**Validates: Requirements 42.1**

### Property 127: Multiple Assignments Up to Headcount

_For any_ shift with required headcount N, the system should allow up to N staff assignments and reject the (N+1)th assignment.

**Validates: Requirements 42.2**

### Property 128: Filled Headcount Matches Assignments

_For any_ shift, the filled headcount should equal the actual number of staff assignments for that shift.

**Validates: Requirements 42.3**

### Property 129: Partially Filled Shift Status

_For any_ shift with filled headcount less than required headcount, the shift should be displayed as partially covered.

**Validates: Requirements 42.4**

### Property 130: Fully Filled Shift Removed from Available

_For any_ shift where filled headcount equals required headcount, the shift should be marked as fully covered and removed from available shift listings.

**Validates: Requirements 42.5**

## Error Handling

### Validation Errors

All validation failures should return structured error responses with:

- HTTP status code (400 for client errors, 403 for authorization, 409 for conflicts)
- Error code (machine-readable identifier)
- Error message (human-readable description)
- Field-specific errors (for form validation)
- Conflicting entity details (for overlap/conflict errors)

Example error response:

```typescript
{
  statusCode: 409,
  errorCode: "SHIFT_OVERLAP",
  message: "Staff member is already assigned to an overlapping shift",
  details: {
    staffId: "uuid",
    conflictingShift: {
      id: "uuid",
      startTime: "2024-01-15T09:00:00Z",
      endTime: "2024-01-15T17:00:00Z",
      location: "Downtown Location"
    }
  }
}
```

### Constraint Violation Errors

When scheduling constraints are violated, the error response should include:

- Which constraint was violated (rest period, daily limit, weekly limit, consecutive days)
- Current values (e.g., current hours worked)
- Limit values (e.g., maximum allowed hours)
- Suggested actions (e.g., "Remove another shift to make room")

### Distributed Lock Errors

When distributed locks cannot be acquired:

- Return 503 Service Unavailable with retry-after header
- Include error code "LOCK_TIMEOUT"
- Suggest client retry with exponential backoff

### Database Transaction Errors

When database transactions fail:

- Automatically roll back all changes
- Log the error with full context
- Return 500 Internal Server Error to client
- Do not expose internal database details to client

### Authentication/Authorization Errors

- 401 Unauthorized: Missing or invalid authentication token
- 403 Forbidden: Valid authentication but insufficient permissions
- Include WWW-Authenticate header for 401 responses
- Include clear permission requirements in 403 responses

### WebSocket Error Handling

- Automatic reconnection with exponential backoff (1s, 2s, 4s, 8s, max 30s)
- Client-side queue for messages sent during disconnection
- Server-side state reconciliation on reconnection
- Graceful degradation: show "offline" indicator but allow local operations

### Background Job Errors

- Retry failed jobs up to 3 times with exponential backoff
- After 3 failures, mark job as "failed" and notify user
- Store error details with each failed attempt
- Provide admin interface to manually retry failed jobs
- Log all job failures with full stack traces

## Testing Strategy

### Dual Testing Approach

The testing strategy employs both unit testing and property-based testing as complementary approaches:

**Unit Tests:**

- Verify specific examples and edge cases
- Test integration points between components
- Validate error conditions and error messages
- Test specific business scenarios (e.g., "overnight shift spanning midnight")
- Focus on concrete, deterministic test cases

**Property-Based Tests:**

- Verify universal properties across all inputs
- Generate random test data (shifts, users, assignments)
- Run minimum 100 iterations per property test
- Validate invariants that should always hold
- Catch edge cases that manual test writing might miss

Together, these approaches provide comprehensive coverage: unit tests catch concrete bugs in specific scenarios, while property tests verify general correctness across the input space.

### Property-Based Testing Configuration

**Library Selection:**

- TypeScript/JavaScript: fast-check
- Reason: Mature library with excellent TypeScript support, built-in generators for common types, shrinking support for minimal failing examples

**Test Configuration:**

```typescript
import fc from 'fast-check'

// Minimum 100 iterations per property test
fc.assert(
  fc.property(/* generators */, (/* inputs */) => {
    // Property assertion
  }),
  { numRuns: 100 }
)
```

**Property Test Tagging:**

Each property-based test must reference its corresponding design document property using a comment tag:

```typescript
// Feature: shiftsync-platform, Property 13: No Overlapping Shift Assignments
test('staff cannot be assigned to overlapping shifts', () => {
  fc.assert(
    fc.property(
      arbitraryStaff(),
      arbitraryShift(),
      arbitraryOverlappingShift(),
      async (staff, shift1, shift2) => {
        await assignStaffToShift(staff.id, shift1.id);
        const result = await assignStaffToShift(staff.id, shift2.id);
        expect(result.success).toBe(false);
        expect(result.errorCode).toBe('SHIFT_OVERLAP');
      }
    ),
    { numRuns: 100 }
  );
});
```

### Custom Generators

Property-based tests require custom generators for domain entities:

```typescript
// User generators
const arbitraryStaff = () =>
  fc.record({
    id: fc.uuid(),
    role: fc.constant('STAFF'),
    skills: fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
    certifications: fc.array(fc.uuid(), { minLength: 1, maxLength: 3 }),
  });

const arbitraryManager = () =>
  fc.record({
    id: fc.uuid(),
    role: fc.constant('MANAGER'),
    authorizedLocations: fc.array(fc.uuid(), { minLength: 1, maxLength: 4 }),
  });

// Shift generators
const arbitraryShift = () =>
  fc
    .record({
      id: fc.uuid(),
      locationId: fc.uuid(),
      startTime: fc.date({
        min: new Date('2024-01-01'),
        max: new Date('2024-12-31'),
      }),
      endTime: fc.date({
        min: new Date('2024-01-01'),
        max: new Date('2024-12-31'),
      }),
      requiredSkills: fc.array(fc.uuid(), { minLength: 1, maxLength: 3 }),
    })
    .filter((shift) => shift.endTime > shift.startTime);

const arbitraryOverlappingShift = (existingShift) =>
  fc.record({
    id: fc.uuid(),
    locationId: fc.uuid(),
    startTime: fc.date({
      min: new Date(existingShift.startTime.getTime() - 3600000),
      max: new Date(existingShift.endTime.getTime() - 1),
    }),
    endTime: fc.date({
      min: new Date(existingShift.startTime.getTime() + 1),
      max: new Date(existingShift.endTime.getTime() + 3600000),
    }),
    requiredSkills: fc.array(fc.uuid(), { minLength: 1, maxLength: 3 }),
  });
```

### Unit Testing Strategy

**Test Organization:**

- One test file per service/component
- Group related tests using describe blocks
- Use descriptive test names that explain the scenario
- Follow AAA pattern: Arrange, Act, Assert

**Key Unit Test Areas:**

1. **Validation Logic:**
   - Test each validation rule with valid and invalid inputs
   - Test edge cases (e.g., exactly 40 hours, exactly 10-hour rest period)
   - Test boundary conditions (midnight crossings, timezone boundaries)

2. **Business Logic:**
   - Test overtime calculations with various shift combinations
   - Test fairness metrics with different distribution patterns
   - Test premium shift identification with various criteria

3. **Integration Points:**
   - Test service interactions (e.g., ScheduleService → ComplianceMonitor)
   - Test database transactions and rollback behavior
   - Test WebSocket event broadcasting

4. **Error Handling:**
   - Test error responses for each validation failure
   - Test transaction rollback on errors
   - Test graceful degradation when Redis is unavailable

**Example Unit Test:**

```typescript
describe('ScheduleService', () => {
  describe('assignStaff', () => {
    it('should reject assignment when staff lacks required skill', async () => {
      const staff = await createStaff({ skills: ['cooking'] });
      const shift = await createShift({ requiredSkills: ['bartending'] });

      const result = await scheduleService.assignStaff(shift.id, staff.id, managerId);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('MISSING_REQUIRED_SKILL');
      expect(result.details.missingSkills).toContain('bartending');
    });
  });
});
```

### Integration Testing

**Database Integration:**

- Use test database with Prisma migrations
- Reset database state between tests
- Test complex queries and transactions
- Verify optimistic locking behavior

**Redis Integration:**

- Use separate Redis database for tests (e.g., db 1)
- Test distributed locking with Redlock
- Test cache invalidation strategies
- Test job queue processing with BullMQ

**WebSocket Integration:**

- Test client connection and subscription
- Test event broadcasting to correct clients
- Test reconnection behavior
- Test authorization for subscriptions

### End-to-End Testing

**Critical User Flows:**

1. Manager creates shift and assigns staff
2. Staff requests shift swap, manager approves
3. Staff reports callout, manager finds replacement
4. Admin views fairness analytics across locations
5. System enforces rest period across timezone boundaries

**E2E Test Environment:**

- Full stack: Next.js frontend + NestJS backend + PostgreSQL + Redis
- Seed database with realistic test data
- Use Playwright for browser automation
- Test real-time updates across multiple browser instances

### Performance Testing

**Load Testing Scenarios:**

- 10 concurrent managers creating shifts
- 100 concurrent WebSocket connections
- Background job processing under load
- Database query performance with large datasets

**Performance Targets:**

- API response time: < 200ms for 95th percentile
- WebSocket message latency: < 100ms
- Background job processing: < 30s for fairness reports
- Database queries: < 50ms for indexed lookups

### Test Data Management

**Test Data Builders:**

```typescript
class StaffBuilder {
  private staff: Partial<Staff> = {};

  withSkills(skills: string[]) {
    this.staff.skills = skills;
    return this;
  }

  withCertifications(locationIds: string[]) {
    this.staff.certifications = locationIds;
    return this;
  }

  build(): Staff {
    return {
      id: uuid(),
      role: 'STAFF',
      skills: [],
      certifications: [],
      ...this.staff,
    };
  }
}
```

**Database Seeding:**

- Seed script for development environment
- Realistic data: 4 locations, 50 staff, 200 shifts per week
- Cover edge cases: overnight shifts, multi-timezone scenarios
- Include historical data for analytics testing
