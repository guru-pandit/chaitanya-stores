# syntax=docker/dockerfile:1

# ---- deps: install once, reused by the builder stage ----
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- migrator: `prisma migrate deploy` only — no Next.js build, so it
# needs none of the NEXT_PUBLIC_* build args and can't fail because of them.
# Used by docker-compose.yml's `migrate` service.
FROM deps AS migrator
WORKDIR /app
COPY prisma ./prisma
COPY prisma.config.ts ./
ENTRYPOINT ["npx", "prisma", "migrate", "deploy"]

# ---- builder: compile the Next.js standalone server ----
FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1

# NEXT_PUBLIC_* vars are inlined into the client bundle at build time, not
# read at runtime — they must arrive as build args (see docker-compose.yml's
# `build.args`), not just as the web service's runtime `environment:`.
ARG NEXT_PUBLIC_BUSINESS_PHONE
ARG NEXT_PUBLIC_BUSINESS_WHATSAPP
ARG NEXT_PUBLIC_BUSINESS_EMAIL
ARG NEXT_PUBLIC_BUSINESS_ADDRESS
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_BUSINESS_PHONE=$NEXT_PUBLIC_BUSINESS_PHONE
ENV NEXT_PUBLIC_BUSINESS_WHATSAPP=$NEXT_PUBLIC_BUSINESS_WHATSAPP
ENV NEXT_PUBLIC_BUSINESS_EMAIL=$NEXT_PUBLIC_BUSINESS_EMAIL
ENV NEXT_PUBLIC_BUSINESS_ADDRESS=$NEXT_PUBLIC_BUSINESS_ADDRESS
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

# A real DATABASE_URL isn't required to build (no DB calls happen during
# `next build` for this app's page set), but Prisma's generated client needs
# the env var to exist so `prisma generate`/module init don't throw.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"

RUN npx prisma generate
RUN npm run build

# ---- runner: minimal production image, no build tooling or source ----
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Only what `output: "standalone"` needs at runtime — no node_modules tree,
# no source beyond what got bundled, no .env / build tooling.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# public/uploads is the mount target for the `uploads` named volume (see
# docker-compose.yml) — must exist and be writable by the non-root user
# *before* the volume is mounted over it, so first-run permissions are correct.
RUN mkdir -p ./public/uploads && chown -R nextjs:nodejs ./public/uploads

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
