import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const isDev = process.env.NODE_ENV === 'development';

/** Where the Next.js server reaches the NestJS API (server-to-server). */
const apiInternalUrl = process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:4000';

/**
 * Where product images are served from: the API's /uploads by default, or the Vercel Blob store
 * when the API keeps its images there. Either way the browser sees same-origin /uploads URLs.
 */
const uploadsOrigin = (process.env.UPLOADS_ORIGIN ?? `${apiInternalUrl}/uploads`).replace(
  /\/$/,
  '',
);

/**
 * Header-based CSP (no nonces) so pages keep static prerendering. It allows no third-party
 * origins at all; inline scripts are permitted because Next.js inlines its hydration data.
 * See docs/architecture/security.md for the trade-off.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  // Films play from /uploads; blob: lets the admin area play a chosen file before uploading it.
  "media-src 'self' blob:",
  "font-src 'self'",
  `connect-src 'self'${isDev ? ' ws:' : ''}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ');

/**
 * On Vercel the admin area uploads films straight to Vercel Blob (its upload API is on
 * vercel.com), so large files never pass through a function; only admin pages may connect there.
 */
const adminContentSecurityPolicy = contentSecurityPolicy.replace(
  "connect-src 'self'",
  "connect-src 'self' https://vercel.com https://*.blob.vercel-storage.com",
);

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Self-hosted images run the standalone server; Vercel builds its own output.
  output: process.env.VERCEL ? undefined : 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  transpilePackages: ['@teran/contracts'],
  experimental: {
    // Branded 404 for URLs outside the [locale] tree (our root layout lives under [locale]).
    globalNotFound: true,
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
    // Only local images are optimised by Next.js; uploaded product photos are pre-sized by the API.
    remotePatterns: [],
  },
  async headers() {
    const adminHeaders = [{ key: 'Content-Security-Policy', value: adminContentSecurityPolicy }];
    return [
      { source: '/:path*', headers: securityHeaders },
      // Later rules override earlier ones for the same header.
      ...(process.env.VERCEL
        ? [
            { source: '/admin/:path*', headers: adminHeaders },
            { source: '/:locale(ru|en)/admin/:path*', headers: adminHeaders },
          ]
        : []),
    ];
  },
  async rewrites() {
    // Browser requests stay same-origin (first-party cookies, no CORS). In production a reverse
    // proxy can route these paths straight to the API instead.
    return [
      { source: '/api/v1/:path*', destination: `${apiInternalUrl}/api/v1/:path*` },
      { source: '/uploads/:path*', destination: `${uploadsOrigin}/:path*` },
    ];
  },
};

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

export default withNextIntl(nextConfig);
