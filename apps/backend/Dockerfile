# ------------------------------------------------------------------------------
# STAGE 1: Build Machine
# ------------------------------------------------------------------------------
FROM node:22-slim AS builder

# 1. Setup pnpm
RUN npm install -g pnpm@10.15.1
RUN pnpm config set supportedArchitectures --json '{"os": ["linux"], "cpu": ["x64"]}'

WORKDIR /app

# 2. Copy root configuration files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json ./

# 3. Copy all project folders (Shared + Backend)
COPY packages/shared ./packages/shared
COPY apps/backend ./apps/backend

# 4. Install ALL dependencies
RUN pnpm install --frozen-lockfile

# 5. GENERATE PRISMA (Crucial: Run it from the root for the whole workspace)
# This ensures the types are visible to both 'shared' and 'backend'
RUN pnpm --filter @shiftsync/backend exec prisma generate --schema=apps/backend/prisma/schema.prisma

# 6. BUILD everything in the correct order
RUN pnpm --filter @shiftsync/shared build
RUN pnpm --filter @shiftsync/backend build

# 7. FLATTEN: Extract the backend and its REAL physical files
RUN pnpm deploy --filter=@shiftsync/backend --prod --legacy /app/out

# ------------------------------------------------------------------------------
# STAGE 2: Production Runtime
# ------------------------------------------------------------------------------
FROM node:22-slim AS runner

# Install System Security & OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl ca-certificates libasound2 libgbm1 libnss3 libatk-bridge2.0-0 libgtk-3-0 libx11-xcb1 libxss1 && rm -rf /var/lib/apt/lists/*

# Install Prisma CLI globally so migrations always work
RUN npm install -g prisma@7.6.0

WORKDIR /app
ENV NODE_ENV=production

# Copy the flattened production dependencies
COPY --from=builder /app/out/node_modules ./node_modules
COPY --from=builder /app/out/package.json ./package.json

# Copy the built code and schema
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/prisma ./prisma

EXPOSE 3001

# STARTUP: Run migrations THEN start the app
CMD prisma migrate deploy --schema ./prisma/schema.prisma && node dist/main.js