# --------------------------------------------------------
# STAGE 1: The Build Machine
# --------------------------------------------------------
FROM node:22-slim AS builder
RUN corepack enable && corepack prepare pnpm@10.15.1 --activate

WORKDIR /app

# Copy the Root monorepo files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy the shared package and the backend app
COPY packages/shared ./packages/shared
COPY apps/backend ./apps/backend

# Install ALL dependencies (pnpm handles the workspace links automatically)
RUN pnpm install --frozen-lockfile

# Generate Prisma Client
WORKDIR /app/apps/backend
RUN npx prisma generate

# Build the shared package first, then the backend
WORKDIR /app
RUN pnpm --filter shared build
RUN pnpm --filter backend build

# Use pnpm deploy to extract only the backend and its production dependencies
# This fixes the monorepo "symlink" problem for Docker
RUN pnpm deploy --filter=backend --prod --legacy /app/out

# --------------------------------------------------------
# STAGE 2: The Production Runtime
# --------------------------------------------------------
FROM node:22-slim AS runner

# Install OpenSSL for Prisma/Postgres
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

# 1. Copy the clean production code from the deploy folder
COPY --from=builder /app/out/node_modules ./node_modules
COPY --from=builder /app/out/package.json ./package.json

# 2. Copy the built dist from the builder (Turbo/Nest path)
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/prisma ./prisma

EXPOSE 3001

# The command runs migrations THEN starts the app
CMD npx prisma migrate deploy && node dist/main.js