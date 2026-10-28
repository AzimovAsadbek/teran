# syntax=docker/dockerfile:1

# TERAN API — production images. Build from the repository root, for example:
#   docker build -f apps/api/Dockerfile --target runtime -t teran-api .
#
# Targets
#   runtime  The API server: compiled code and production dependencies only, runs as `node`.
#   tools    One-off jobs against the database. Runs `prisma migrate deploy` by default; also
#            loads the demonstration catalogue (`prisma db seed`, refused in production unless
#            ALLOW_DEMO_SEED=true) and creates administrators (`node dist/cli/create-admin.js`).

ARG NODE_IMAGE=node:24.21.0-alpine3.24

# ── Workspace manifests and pnpm (version pinned by "packageManager" in package.json) ──────────
FROM ${NODE_IMAGE} AS base
ENV CI=true \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /repo
# Every workspace manifest is copied so the lockfile matches the workspace exactly; only the API
# and the packages it depends on are installed.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/contracts/package.json packages/contracts/
COPY e2e/package.json e2e/

# ── Build: all dependencies, Prisma client generation and compilation ─────────────────────────
FROM base AS build
# Prisma's schema engine (used by `prisma migrate`) links against OpenSSL.
RUN apk add --no-cache openssl
RUN --mount=type=cache,id=teran-pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir /pnpm/store --filter "@teran/api..."
COPY tsconfig.base.json ./
COPY packages/contracts packages/contracts
COPY apps/api apps/api
# The demo seed's gallery shows the storefront's packaging artwork (prisma/seed/media.ts).
COPY apps/web/public/brand/art apps/web/public/brand/art
RUN pnpm --filter @teran/contracts build && pnpm --filter @teran/api build

# ── Production dependencies only ──────────────────────────────────────────────────────────────
FROM base AS prod-deps
RUN --mount=type=cache,id=teran-pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod --store-dir /pnpm/store --filter "@teran/api..."

# ── One-off database jobs (migrations, demo seed, admin CLI) ──────────────────────────────────
FROM build AS tools
ENV NODE_ENV=production \
    UPLOADS_DIR=/data/uploads \
    CHECKPOINT_DISABLE=1 \
    PATH=/repo/apps/api/node_modules/.bin:$PATH
RUN mkdir -p /data/uploads && chown node:node /data/uploads
USER node
WORKDIR /repo/apps/api
CMD ["prisma", "migrate", "deploy"]

# ── API server ─────────────────────────────────────────────────────────────────────────────────
FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4000 \
    UPLOADS_DIR=/data/uploads
WORKDIR /app
# ffmpeg and ffprobe make films from iPhones (QuickTime .MOV, HEVC) into MP4s that every browser
# plays (ADR-062). Alpine's own package, signed like the base image; this layer stays cached.
RUN apk add --no-cache ffmpeg
# Code and dependencies stay owned by root, so the server cannot modify them. The pnpm layout
# (node_modules/.pnpm plus per-package symlinks) is kept as installed.
COPY --from=prod-deps /repo/node_modules ./node_modules
COPY --from=prod-deps /repo/packages/contracts/node_modules ./packages/contracts/node_modules
COPY --from=prod-deps /repo/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /repo/packages/contracts/package.json ./packages/contracts/
COPY --from=build /repo/packages/contracts/dist ./packages/contracts/dist
COPY --from=build /repo/apps/api/package.json ./apps/api/
COPY --from=build /repo/apps/api/dist ./apps/api/dist
# Package managers are not needed at runtime. Uploaded images and films are the only files the
# server writes (films are made ready in /data/uploads/.processing); mount a persistent volume at
# /data/uploads.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack /opt/yarn-* \
      /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /usr/local/bin/yarn \
      /usr/local/bin/yarnpkg \
    && mkdir -p /data/uploads && chown node:node /data/uploads
USER node
WORKDIR /app/apps/api
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD ["node", "-e", "fetch(`http://127.0.0.1:${process.env.PORT}/api/v1/health/ready`).then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "dist/main.js"]
