# ------------------------------------------------------------------------------
# STAGE 1: Build & Flatten
# ------------------------------------------------------------------------------
FROM node:22-slim AS builder
RUN npm install -g pnpm@8.15.5
RUN pnpm config set supportedArchitectures --json '{"os": ["linux"], "cpu": ["x64"]}'
WORKDIR /app

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json ./
COPY packages/shared ./packages/shared
COPY apps/backend ./apps/backend

# Install dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma Client BEFORE building (needed for TypeScript compilation)
WORKDIR /app/apps/backend
RUN npx prisma generate

# Build packages
WORKDIR /app
RUN pnpm --filter @shiftsync/shared build
RUN pnpm --filter @shiftsync/backend build

# Flatten the monorepo for production
RUN pnpm deploy --filter=@shiftsync/backend --prod /app/out

# Generate Prisma Client AGAIN in the flattened output (for runtime)
WORKDIR /app/out
COPY apps/backend/prisma ./prisma
COPY apps/backend/prisma.config.ts ./prisma.config.ts
RUN npx prisma generate

# ------------------------------------------------------------------------------
# STAGE 2: Production Runtime
# ------------------------------------------------------------------------------
FROM node:22-slim AS runner

# Install OpenSSL (required for Prisma)
RUN apt-get update && \
    apt-get install -y openssl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production

# Copy production dependencies and built code
COPY --from=builder /app/out/node_modules ./node_modules
COPY --from=builder /app/out/package.json ./package.json
COPY --from=builder /app/apps/backend/dist ./dist

EXPOSE 3001

# Start the application (no migrations needed - using shared DB)
CMD ["node", "dist/main.js"]