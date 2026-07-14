# ─── Base ──────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
RUN npm install --ignore-scripts

# ─── Development ───────────────────────────────────────────────────────────────
FROM base AS development
COPY . .
RUN npx prisma generate
EXPOSE 3001
CMD ["npm", "run", "start:dev"]

# ─── Builder ───────────────────────────────────────────────────────────────────
# Keeps full (dev) dependencies — also used directly for one-off tasks like
# `npm run prisma:seed` (ts-node) that the pruned production image can't run.
FROM base AS builder
COPY . .
RUN npx prisma generate
RUN npm run build

# ─── Production ────────────────────────────────────────────────────────────────
FROM node:22-alpine AS production
WORKDIR /app
RUN apk add --no-cache openssl && \
    addgroup --system --gid 1001 nestjs && \
    adduser --system --uid 1001 nestjs

COPY --from=builder --chown=nestjs:nestjs /app/dist ./dist
COPY --from=builder --chown=nestjs:nestjs /app/prisma ./prisma
COPY --chown=nestjs:nestjs package*.json ./
RUN npm install --omit=dev --ignore-scripts && npx prisma generate && chown -R nestjs:nestjs node_modules

ENV NODE_ENV=production
USER nestjs
EXPOSE 3001

# Run migrations then start
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main"]
