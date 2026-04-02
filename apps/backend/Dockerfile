# ------------------------------------------------------------------------------
# STAGE 1: The Build Machine (Monorepo Compiler)
# --------------------------------------------------------
FROM node:22-slim AS builder

# 1. Setup pnpm
RUN corepack enable && corepack prepare pnpm@10.15.1 --activate

WORKDIR /app

# 2. Copy Monorepo config files (Necessary for TypeScript & Turbo)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json ./

# 3. Copy the Shared package and Backend app
COPY packages/shared ./packages/shared
COPY apps/backend ./apps/backend

# 4. Install ALL dependencies (frozen-lockfile ensures no changes)
RUN pnpm install --frozen-lockfile

# 5. Generate Prisma Client
WORKDIR /app/apps/backend
RUN npx prisma generate

# 6. Build the shared code first, then the backend
WORKDIR /app
RUN pnpm --filter @shiftsync/shared build
RUN pnpm --filter @shiftsync/backend build

# ------------------------------------------------------------------------------
# STAGE 2: The Production Runtime (GradeHub Style)
# ------------------------------------------------------------------------------
FROM node:22-slim AS runner

# 1. Install System Dependencies (For Prisma, PostgreSQL, and Puppeteer Receipts)
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    libasound2 \
    libgbm1 \
    libnss3 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libx11-xcb1 \
    libxss1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production

# 2. THE GRADEHUB FIX: Copy everything directly to avoid broken symlinks
# This includes the root node_modules so Prisma CLI is always available
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/package.json ./package.json
COPY --from=builder /app/apps/backend/prisma ./prisma
# Copy the built shared package as well
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

# 3. Open the port
EXPOSE 3001

# 4. STARTUP: Run migrations THEN start the app
# We use the local prisma from node_modules
CMD npx prisma migrate deploy && node dist/main.js