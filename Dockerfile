# ------------------------------------------------------------------------------
# STAGE 1: Build & Flatten
# ------------------------------------------------------------------------------
FROM node:22-slim AS builder
RUN npm install -g pnpm@8.15.5
RUN pnpm config set supportedArchitectures --json '{"os": ["linux"], "cpu": ["x64"]}'
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json ./
COPY packages/shared ./packages/shared
COPY apps/backend ./apps/backend

RUN pnpm install --frozen-lockfile
WORKDIR /app/apps/backend
RUN npx prisma generate

WORKDIR /app
RUN pnpm --filter @shiftsync/shared build
RUN pnpm --filter @shiftsync/backend build

# Flatten the monorepo - this keeps the Prisma binary in /app/out/node_modules/.bin/prisma
RUN pnpm deploy --filter=@shiftsync/backend --prod /app/out

# ------------------------------------------------------------------------------
# STAGE 2: Production Runtime
# ------------------------------------------------------------------------------
FROM node:22-slim AS runner
RUN apt-get update && apt-get install -y openssl ca-certificates libasound2 libgbm1 libnss3 libatk-bridge2.0-0 libgtk-3-0 libx11-xcb1 libxss1 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production

# 1. Copy everything from the flattened output
COPY --from=builder /app/out/node_modules ./node_modules
COPY --from=builder /app/out/package.json ./package.json
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/prisma ./prisma

EXPOSE 3001

# 2. THE ULTIMATE FIX: 
# We use the DIRECT path to the prisma binary. 
# This prevents 'npx' from trying to download it again.
# We use 'sh -c' to make sure the environment variables are mapped correctly.
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy --schema ./prisma/schema.prisma && node dist/main.js"]