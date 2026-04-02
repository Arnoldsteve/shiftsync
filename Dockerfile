# ------------------------------------------------------------------------------
# STAGE 1: Build & Flatten (The Compiler)
# ------------------------------------------------------------------------------
FROM node:22-slim AS builder

# 1. Setup pnpm
RUN npm install -g pnpm@10.15.1
RUN pnpm config set supportedArchitectures --json '{"os": ["linux"], "cpu": ["x64"]}'

WORKDIR /app

# 2. Copy Monorepo root configs (The "Brain")
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json ./

# 3. Copy only the folders needed for the backend build
COPY packages/shared ./packages/shared
COPY apps/backend ./apps/backend

# 4. Install ALL dependencies
RUN pnpm install --frozen-lockfile

# 5. Generate Prisma Client (Relative to root)
WORKDIR /app/apps/backend
RUN npx prisma generate

# 6. Build the packages in order
WORKDIR /app
RUN pnpm --filter @shiftsync/shared build
RUN pnpm --filter @shiftsync/backend build

# 7. THE PRO MOVE: Extract the production bundle
# This pulls only the backend and its REAL physical files into /app/out
RUN pnpm deploy --filter=@shiftsync/backend --prod --legacy /app/out

# ------------------------------------------------------------------------------
# STAGE 2: Production Runtime (The Lean Vault)
# ------------------------------------------------------------------------------
FROM node:22-slim AS runner

# 1. Install System Security & OpenSSL
RUN apt-get update && apt-get install -y openssl ca-certificates libasound2 libgbm1 libnss3 libatk-bridge2.0-0 libgtk-3-0 libx11-xcb1 libxss1 && rm -rf /var/lib/apt/lists/*

# 2. Install Prisma CLI globally so migrations work 100%
RUN npm install -g prisma@7.6.0

WORKDIR /app
ENV NODE_ENV=production

# 3. Copy the flattened production dependencies
COPY --from=builder /app/out/node_modules ./node_modules
COPY --from=builder /app/out/package.json ./package.json

# 4. Copy the built code and schema from the original locations
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/prisma ./prisma

EXPOSE 3001

# 5. STARTUP: Run migrations THEN start the app
CMD prisma migrate deploy --schema ./prisma/schema.prisma && node dist/main.js