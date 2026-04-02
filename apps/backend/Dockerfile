# ------------------------------------------------------------------------------
# STAGE 1: The Build Machine (Monorepo Compiler)
# ------------------------------------------------------------------------------
FROM node:22-slim AS builder

# 1. Enable pnpm 10
RUN corepack enable && corepack prepare pnpm@10.15.1 --activate

WORKDIR /app

# 2. THE CRITICAL FIX: Copy the Root monorepo configuration files
# These are required by 'tsc' and 'turbo' to build the sub-packages correctly.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json ./

# 3. Copy the folders needed for the build
COPY packages/shared ./packages/shared
COPY apps/backend ./apps/backend

# 4. Install all dependencies (pnpm handles the workspace linking)
RUN pnpm install --frozen-lockfile

# 5. Generate Prisma Client inside the backend folder
WORKDIR /app/apps/backend
RUN npx prisma generate

# 6. Build the shared package first, then the backend
WORKDIR /app
RUN pnpm --filter shared build
RUN pnpm --filter backend build

# 7. THE PRO MOVE: Extract the production bundle
# Using --legacy for pnpm v10 compatibility to ensure sharp binaries stay linked.
RUN pnpm deploy --filter=backend --prod /app/outout

# ------------------------------------------------------------------------------
# STAGE 2: The Production Runtime (Lean & Secure)
# ------------------------------------------------------------------------------
FROM node:22-slim AS runner

# 1. Install System Dependencies for:
# - Prisma/Postgres (openssl)
# - Puppeteer/Receipts (libasound2, etc.)
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
ENV PORT=3001

# 2. Copy the clean production node_modules and package.json
COPY --from=builder /app/out/node_modules ./node_modules
COPY --from=builder /app/out/package.json ./package.json

# 3. Copy the built code and prisma schema from the builder root
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/prisma ./prisma

# 4. Open the door
EXPOSE 3001

# 5. THE ENTERPRISE BOOT: Run migrations THEN start the app
# This ensures your Database is always in sync with your latest code.
CMD npx prisma migrate deploy && node dist/main.js