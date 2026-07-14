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
FROM base AS builder
COPY . .
RUN npx prisma generate
RUN npm run build
RUN npm prune --omit=dev

# ─── Production ────────────────────────────────────────────────────────────────
FROM node:22-alpine AS production
WORKDIR /app
RUN apk add --no-cache openssl && \
    addgroup --system --gid 1001 nestjs && \
    adduser --system --uid 1001 nestjs

COPY --from=builder --chown=nestjs:nestjs /app/dist ./dist
COPY --from=builder --chown=nestjs:nestjs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nestjs /app/prisma ./prisma
COPY --chown=nestjs:nestjs package*.json ./

ENV NODE_ENV=production
USER nestjs
EXPOSE 3001

# Run migrations then start
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main"]
