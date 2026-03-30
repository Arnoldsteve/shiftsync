# ShiftSync Platform

Multi-location staff scheduling platform for restaurant groups operating across multiple time zones.

## Project Structure

```
shiftsync-platform/
├── apps/
│   ├── backend/          # NestJS API server
│   └── frontend/         # Next.js 15 web application
├── packages/
│   └── shared/           # Shared Zod validation schemas and types
├── turbo.json            # Turborepo configuration
├── package.json          # Root package.json with workspaces
└── tsconfig.json         # Base TypeScript configuration
```

## Tech Stack

### Backend

- NestJS with TypeScript
- Prisma ORM with PostgreSQL (Neon DB)
- Redis for caching, distributed locks, and job queues
- Socket.io for real-time updates
- BullMQ for background job processing
- BullBoard for job queue visualization
- Redlock for distributed locking
- Swagger/Scalar for API documentation
- Argon2 for password hashing
- Pino for structured logging

### Frontend

- Next.js 15 with App Router
- React Server Components
- TanStack Query (v5) for server state management
- TanStack Table for complex data tables
- Socket.io client for real-time updates
- Tailwind CSS for styling
- Shadcn UI for component library
- Sonner for toast notifications
- Lucide React for iconography

### Infrastructure

- Turborepo for monorepo management
- Docker for containerization
- Zod for shared validation schemas
- Vitest for unit and property-based testing
- Playwright for E2E testing
- fast-check for property-based testing

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- Docker and Docker Compose
- PostgreSQL 15+
- Redis 7+

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Copy environment variables:

```bash
cp .env.example .env
```

4. Start Docker services:

```bash
docker-compose up -d
```

5. Run database migrations:

```bash
cd apps/backend
npx prisma migrate dev
```

6. Start development servers:

```bash
npm run dev
```

## Development

### Available Scripts

- `npm run dev` - Start all apps in development mode
- `npm run build` - Build all apps for production
- `npm run test` - Run tests across all packages
- `npm run lint` - Lint all packages
- `npm run format` - Format code with Prettier
- `npm run clean` - Clean all build artifacts

### Project Commands

Each workspace (apps/backend, apps/frontend, packages/shared) has its own scripts that can be run individually.

## Architecture

The platform follows a modern three-tier architecture:

- **Frontend**: Next.js 15 with React Server Components and real-time updates
- **Backend**: NestJS with modular service architecture
- **Data Layer**: PostgreSQL for persistent storage, Redis for caching and distributed locking

Key architectural principles:

- Event-driven architecture for real-time updates
- Distributed locking for concurrent operation safety
- Background job processing for time-intensive operations
- Multi-timezone support with explicit timezone context
- Constraint validation engine for business rules and labor law compliance

## License

Proprietary - All rights reserved
