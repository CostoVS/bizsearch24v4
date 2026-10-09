# Stage 1: Install dependencies only when needed
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Optimize npm for network resilience and prevent ECONNRESET timeouts on cloud VPS
RUN npm config set fetch-retries 5 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retry-maxtimeout 120000 \
    && npm config set fetch-timeout 300000 \
    && npm config set maxsockets 5

# Install dependencies based on package-lock.json
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

# Stage 2: Rebuild the source code only when needed
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Disable Next.js telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# Stage 3: Production image, copy all the files and run next
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache and persistent storage
RUN mkdir -p .next .data data && chown -R nextjs:nodejs .next .data data && chmod -R 777 .data data

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NODE_OPTIONS="--max-old-space-size=1536"

# Automatically pre-warm the in-memory O(1) ad index immediately on container start so even the first request after `docker compose up --build -d web` is 0ms
CMD ["sh", "-c", "(sleep 2 && wget -qO- 'http://127.0.0.1:3000/api/storage?statsOnly=true' >/dev/null 2>&1 && wget -qO- 'http://127.0.0.1:3000/api/storage?freeOnly=true&includeFeatured=true&page=1&pageSize=12' >/dev/null 2>&1 && wget -qO- 'http://127.0.0.1:3000/api/storage?page=1&pageSize=24' >/dev/null 2>&1) & exec node server.js"]
