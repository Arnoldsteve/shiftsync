# ------------------------------------------------------------------------------
# STAGE 1: Build & Flatten (The Compiler)
# ------------------------------------------------------------------------------
FROM node:22-slim AS builder

# Install pnpm 10 explicitly
RUN npm install -g pnpm@10.15.1
RUN pnpm config set supportedArchitectures --json '{"os": ["linux"], "cpu": ["x64"]}'

WORKDIR /app

# Copy Monorepo root configs
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json ./
COPY packages/shared ./packages/shared
COPY apps/backend ./apps/backend

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Build everything
RUN pnpm --filter @shiftsync/shared build
RUN pnpm --filter @shiftsync/backend build

# THE MAGIC: Extract only the backend and its REAL physical files (no links)
# Using --legacy to bypass pnpm 10 workspace injection rules
RUN pnpm deploy --filter=@shiftsync/backend --prod --legacy /app/out

# ------------------------------------------------------------------------------
# STAGE 2: Production Runtime (The Secure Vault)
# ------------------------------------------------------------------------------
FROM node:22-slim AS runner

# 1. Install System Security & OpenSSL
RUN apt-get update && apt-get install -y openssl ca-certificates libasound2 libgbm1 libnss3 libatk-bridge2.0-0 libgtk-3-0 libx11-xcb1 libxss1 && rm -rf /var/lib/apt/lists/*

# 2. THE SECRET SAUCE: Install Prisma globally in the final image
# This ensures 'prisma' is a real command that can see Docker environment variables.
RUN npm install -g prisma@7.6.0

WORKDIR /app
ENV NODE_ENV=production

# 3. Copy the flattened production dependencies from builder
COPY --from=builder /app/out/node_modules ./node_modules
COPY --from=builder /app/out/package.json ./package.json

# 4. Copy the built code and schema
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/prisma ./prisma

EXPOSE 3001

# 5. STARTUP: Use the global prisma to migrate, then start the app
# Using '--schema' ensures Prisma doesn't get lost in the monorepo folders.
CMD prisma migrate deploy --schema ./prisma/schema.prisma && no