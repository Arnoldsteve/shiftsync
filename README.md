# ShiftSync Platform

**Multi-location staff scheduling platform for Coastal Eats restaurant group**

ShiftSync solves critical operational challenges in multi-location restaurant management: coverage gaps, overtime cost control, and equitable shift distribution. Built with enterprise-grade architecture to handle high-concurrency scheduling operations across multiple time zones.

## Live Environment

| Service           | URL                                           | Description             |
| ----------------- | --------------------------------------------- | ----------------------- |
| Frontend          | `https://shiftsync-frontend-three.vercel.app` | Next.js web application |
| Backend API       | `https://54.229.164.183.sslip.io`             | NestJS REST API         |
| API Documentation | `https://54.229.164.183.sslip.io/api/docs`    | Scalar API reference    |
| WebSocket         | `wss://54.229.164.183.sslip.io`               | Real-time updates       |

## Demo Credentials

| Role    | Email                          | Password      | Access                           |
| ------- | ------------------------------ | ------------- | -------------------------------- |
| Admin   | admin@coastaleats.com          | Admin123!@#   | Full system access               |
| Manager | john.manager@coastaleats.com   | Manager123!@# | Midtown & Downtown locations     |
| Staff   | alex.bartender@coastaleats.com | Staff123!@#   | Personal schedule & shift pickup |

## Tech Stack - Senior Standard

### Frontend

- **Next.js 15** - App Router with React Server Components
- **TanStack Query v5** - Server state management with optimistic updates
- **Socket.io Client** - Real-time event streaming
- **Tailwind CSS + Shadcn UI** - Component library with accessibility
- **Zod** - Runtime validation with shared schemas

### Backend

- **NestJS** - Modular architecture with dependency injection
- **Prisma ORM v7** - Type-safe database access with PostgreSQL
- **Redis Cloud** - Distributed locking (Redlock) and job queues (BullMQ)
- **Socket.io** - WebSocket gateway for real-time updates
- **Argon2** - Password hashing (OWASP recommended)
- **CASL** - Permission-Based Access Control (PBAC)
- **Pino** - Structured logging

### Infrastructure

- **Neon PostgreSQL** - Serverless Postgres with connection pooling
- **Redis Cloud** - Managed Redis for caching and queues
- **Turborepo** - Monorepo build orchestration
- **Docker** - Multi-stage builds for production
- **Vitest + fast-check** - Unit and property-based testing

## Core Architecture Features

### 1. Constraint Engine - 5 Hard Blocks

The scheduling engine enforces strict validation rules to prevent invalid assignments:

1. **10-Hour Rest Period** - Staff must have 10 hours between shift end and next shift start
2. **12-Hour Daily Limit** - No staff member can work more than 12 hours in a 24-hour period (hard block)
3. **Double-Booking Prevention** - Conflict detection prevents overlapping shift assignments
4. **Skill Requirements** - Staff must possess all required skills for the shift
5. **Location Certification** - Staff must be certified for the restaurant location

### 2. High-Capacity Concurrency Control

- **Redis Redlock** - Distributed locking prevents race conditions when multiple managers assign staff simultaneously
- **Optimistic Locking** - Version-based conflict detection for assignment updates
- **Transaction Isolation** - Prisma transactions ensure atomic operations

### 3. Background Task Processing

- **BullMQ Job Queues** - Asynchronous processing for:
  - Notification fan-out (shift offers to 50+ staff members)
  - Drop request expiration checks (every 15 minutes)
  - Fairness report generation (hour distribution analytics)
  - Overtime report generation (multi-week calculations)
- **Rate Limiting** - Protects database connection pool from overwhelming concurrent jobs

### 4. Granular Security - PBAC with CASL

- **Role-Based Permissions** - Admin, Manager, Staff roles with distinct capabilities
- **Location-Based Authorization** - Managers can only manage staff at their authorized locations
- **Action-Level Control** - Fine-grained permissions (Create, Read, Update, Delete, Manage)
- **Frontend + Backend Enforcement** - Permissions validated on both layers

### 5. Real-Time Updates - Socket.io

- **Instant Conflict Notifications** - Staff notified immediately when assigned to conflicting shifts
- **Dashboard Live Updates** - On-duty staff list updates as shifts start/end
- **Schedule Publishing Events** - Staff see published schedules without page refresh
- **Swap Request Status** - Real-time updates when swaps are approved/rejected

## Project Structure

```
shiftsync-platform/
├── apps/
│   ├── backend/          # NestJS API server
│   │   ├── src/
│   │   │   ├── modules/  # Feature modules (auth, schedule, compliance, etc.)
│   │   │   ├── prisma/   # Database client service
│   │   │   └── main.ts   # Application entry point
│   │   └── prisma/       # Schema and migrations
│   └── frontend/         # Next.js 15 web application
│       ├── app/          # App Router pages
│       ├── components/   # React components
│       ├── hooks/        # Custom React hooks
│       └── services/     # API client services
├── packages/
│   ├── shared/           # Shared Zod schemas and types
│   └── ui/               # Shared UI component library
└── turbo.json            # Turborepo configuration
```

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 8+
- Docker and Docker Compose (for local development)
- PostgreSQL 15+ (or Neon account)
- Redis 7+ (or Redis Cloud account)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/Arnoldsteve/shiftsync.git
cd shiftsync
```

2. Install dependencies:

```bash
pnpm install
```

3. Set up environment variables:

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.local.example apps/frontend/.env.local
```

4. Configure your `.env` files with:
   - `DATABASE_URL` - Neon PostgreSQL connection string
   - `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` - Redis Cloud credentials
   - `JWT_SECRET` - Random secret for JWT signing

5. Run database migrations:

```bash
cd apps/backend
npx prisma migrate deploy
npx prisma db seed
```

6. Start development servers:

```bash
pnpm run dev
```

The frontend will be available at `http://localhost:3000` and the backend at `http://localhost:3001`.

## Development

### Available Scripts

- `pnpm run dev` - Start all apps in development mode
- `pnpm run build` - Build all apps for production
- `pnpm run test` - Run tests across all packages
- `pnpm run lint` - Lint all packages

### Testing

- **Unit Tests** - `pnpm test` in any package
- **Property-Based Tests** - Using fast-check for constraint validation
- **Integration Tests** - API endpoint testing with Vitest

## Deployment

### Backend (AWS EC2)

- Docker image built via GitHub Actions
- Pushed to Amazon ECR
- Deployed to EC2 instance
- Environment variables configured in AWS

### Frontend (Vercel)

- Connected to GitHub repository
- Automatic deployments on push to main
- Environment variables configured in Vercel dashboard

## Key Features Implemented

- ✅ Multi-location scheduling with timezone support
- ✅ Constraint-based assignment validation
- ✅ Real-time conflict notifications
- ✅ Shift swap workflow with two-step approval
- ✅ Drop request system with 24-hour expiration
- ✅ Staff availability management
- ✅ Graduated compliance warnings (8h/12h daily, 6/7 consecutive days)
- ✅ Alternative staff suggestions
- ✅ Fairness analytics and overtime tracking
- ✅ Audit log with CSV export
- ✅ Role-based access control with location authorization
- ✅ Schedule publishing with draft/published states
- ✅ On-duty now dashboard

## License

Proprietary - All rights reserved
