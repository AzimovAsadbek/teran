import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const isDev = process.env.NODE_ENV === 'development';

/** Where the Next.js server reaches the NestJS API (server-to-server). */
const apiInternalUrl = process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:4000';

/**
 * Where /uploads addresses are read from: the API's /uploads by default, or the public address of
 * the object storage (Cloudflare R2) when the API keeps its files there. Build time only.
 */
const uploadsOrigin = (process.env.UPLOADS_ORIGIN || `${apiInternalUrl}/uploads`).replace(
  /\/$/,
  '',
);

/**
 * Where pictures and films are read from when they are not same-origin: the public address of the
 * object storage (Cloudflare R2, ADR-043; the API then hands out absolute addresses there). Films
 * are fetched whole by the page (connect-src) and masks are CSS images, so the bucket also allows
 * the site in its CORS rules.
 */
const mediaOrigin = /^https:\/\//.test(uploadsOrigin) ? new URL(uploadsOrigin).origin : null;
const media = mediaOrigin ? ` ${mediaOrigin}` : '';

/**
 * Header-based CSP (no nonces) so pages keep static prerendering. It allows one third-party
 * origin, for images only: the OpenStreetMap tiles of the store locator's map. It has to be
 * allowed site-wide because a page reached by an in-app link keeps the first page's policy.
 * Inline scripts are permitted because Next.js inlines its hydration data.
 * See docs/architecture/security.md for the trade-off.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://tile.openstreetmap.org${media}`,
  // Films play from the media origin (or /uploads); blob: lets the admin area play a chosen file
  // before uploading it, and the films fetched whole.
  `media-src 'self' blob:${media}`,
  "font-src 'self'",
  `connect-src 'self'${media}${isDev ? ' ws:' : ''}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  // Geolocation for this origin only: the store locator's "use my location" (the browser still
  // asks the visitor first). Site-wide for the same reason as the map tiles above.
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self), payment=(), usb=()',
  },
];

/**
 * Crawlers that get the page only once its metadata is settled (Next.js's own list, from
 * next/dist/shared/lib/router/utils/html-bots.js, plus Googlebot). For them an unknown product,
 * article, category or collection answers 404 and a renamed one 308, instead of a streamed page
 * that can only say so in its markup; visitors keep the streamed page.
 */
const HTML_LIMITED_BOTS =
  /Googlebot|[\w-]+-Google|Google-[\w-]+|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight/i;

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  htmlLimitedBots: HTML_LIMITED_BOTS,
  // The production image runs the standalone server (apps/web/Dockerfile).
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  transpilePackages: ['@teran/contracts'],
  experimental: {
    // Branded 404 for URLs outside the [locale] tree (our root layout lives under [locale]).
    globalNotFound: true,
    // On by default with Cache Components: every page view renders the route a second time and
    // inlines that copy into the HTML (about 95 KB more on the home page) so the browser can cache
    // it while hydrating. Visited pages stay mounted and links prefetch their App Shell anyway, so
    // the copy only cost bytes, server time and main-thread work on phones.
    cachedNavigations: false,
  },
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    // 60 for full-width photographs behind text (page headers), 75 (the default) for the rest.
    qualities: [60, 75],
    // Only local images are optimised by Next.js; uploaded product photos are pre-sized by the API.
    remotePatterns: [],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  async redirects() {
    // The two TERAN codes renamed to what their packs say (2026-10-17). The page itself also
    // follows any renamed slug through the API's redirects; answering these before rendering
    // spares a function call for links printed or shared under the old names.
    const renamed = [
      ['teran-het8800', 'teran-8800'],
      ['teran-std8009', 'teran-8009'],
    ];
    return renamed.flatMap(([from, to]) => [
      { source: `/products/${from}`, destination: `/products/${to}`, permanent: true },
      {
        source: `/:locale(ru|en)/products/${from}`,
        destination: `/:locale/products/${to}`,
        permanent: true,
      },
    ]);
  },
  async rewrites() {
    // Browser requests stay same-origin (first-party cookies, no CORS). In production the server's
    // Nginx routes /api/v1 and /uploads straight to the API (docs/deployment/production.md, §7);
    // these rewrites serve development and the end-to-end stack.
    return [
      { source: '/api/v1/:path*', destination: `${apiInternalUrl}/api/v1/:path*` },
      { source: '/uploads/:path*', destination: `${uploadsOrigin}/:path*` },
    ];
  },
};

// next-intl's experimental `messages.precompile` stays off: it ships a second copy of the
// translation runtime in another chunk (both load on every page), for a few kB of savings
// (docs/testing/qa-report.md).
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

export default withNextIntl(nextConfig);
