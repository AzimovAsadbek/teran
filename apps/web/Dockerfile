# syntax=docker/dockerfile:1

# TERAN storefront and administration UI — production image (Next.js standalone server).
# Build from the repository root, for example:
#   docker build -f apps/web/Dockerfile -t teran-web \
#     --build-arg NEXT_PUBLIC_SITE_URL=https://teran.example .
#
# NEXT_PUBLIC_* values, the API rewrites (API_INTERNAL_URL) and the media origin allowed by the
# content security policy (UPLOADS_ORIGIN) are compiled into the build, so changing them requires a
# rebuild. Secrets (API_INTERNAL_KEY, REVALIDATE_SECRET) are runtime environment variables and
# never enter the image.

ARG NODE_IMAGE=node:24.21.0-alpine3.24

# ── Build ─────────────────────────────────────────────────────────────────────────────────────
FROM ${NODE_IMAGE} AS build
ENV CI=true \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /repo
# Every workspace manifest is copied so the lockfile matches the workspace exactly; only the web
# app and the packages it depends on are installed.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/contracts/package.json packages/contracts/
COPY e2e/package.json e2e/
RUN --mount=type=cache,id=teran-pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir /pnpm/store --filter "@teran/web..."
COPY tsconfig.base.json ./
COPY packages/contracts packages/contracts
COPY apps/web apps/web

ARG API_INTERNAL_URL=http://api:4000
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_ENABLED_LOCALES=uz,ru,en
ARG NEXT_PUBLIC_DEMO_CONTENT=true
# auto (indexed only on a public https origin that is not a staging host), on or off (ADR-060).
ARG NEXT_PUBLIC_SEARCH_INDEXING=auto
ARG NEXT_PUBLIC_SHOW_PRICES=false
# Public address of the object storage (R2_PUBLIC_URL); empty when files stay in the API's volume.
ARG UPLOADS_ORIGIN=
RUN test -n "$NEXT_PUBLIC_SITE_URL" || { echo "Build argument NEXT_PUBLIC_SITE_URL is required." >&2; exit 1; }
ENV API_INTERNAL_URL=$API_INTERNAL_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_ENABLED_LOCALES=$NEXT_PUBLIC_ENABLED_LOCALES \
    NEXT_PUBLIC_DEMO_CONTENT=$NEXT_PUBLIC_DEMO_CONTENT \
    NEXT_PUBLIC_SEARCH_INDEXING=$NEXT_PUBLIC_SEARCH_INDEXING \
    NEXT_PUBLIC_SHOW_PRICES=$NEXT_PUBLIC_SHOW_PRICES \
    UPLOADS_ORIGIN=$UPLOADS_ORIGIN
RUN pnpm --filter @teran/contracts build && pnpm --filter @teran/web build

# ── Server ────────────────────────────────────────────────────────────────────────────────────
FROM ${NODE_IMAGE} AS runtime
ARG API_INTERNAL_URL=http://api:4000
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    API_INTERNAL_URL=$API_INTERNAL_URL
WORKDIR /app
# The standalone output holds the server and only the dependencies it traced. Next.js writes its
# prerender and image caches under .next, so the files belong to the unprivileged `node` user.
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /repo/apps/web/public ./apps/web/public
# Package managers are not needed at runtime. The image optimiser's folder is made here, owned by
# `node`, because the compose file keeps it on the `web-image-cache` volume and a new volume takes
# the owner of the folder it is mounted on (ADR-067).
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack /opt/yarn-* \
      /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /usr/local/bin/yarn \
      /usr/local/bin/yarnpkg \
    && mkdir -p apps/web/.next/cache/images \
    && chown -R node:node apps/web/.next/cache
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch(`http://127.0.0.1:${process.env.PORT}/api/health`).then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "apps/web/server.js"]
