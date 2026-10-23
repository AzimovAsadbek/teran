/*
 * Whether search engines may index this build of the storefront (ADR-060). One decision, made when
 * the site is built, for the robots meta tag (app/[locale]/layout.tsx), robots.txt (app/robots.ts)
 * and the X-Robots-Tag header (next.config.ts). Only the real shop on its own public address is
 * indexed:
 *
 * - a build with demonstration content (NEXT_PUBLIC_DEMO_CONTENT, ADR-012) never is;
 * - NEXT_PUBLIC_SEARCH_INDEXING=off keeps any build out (a staging or preview copy);
 * - the public origin (NEXT_PUBLIC_SITE_URL) must be https on a public host name: never localhost,
 *   an IP address or a reserved name (.localhost, .local, .test, .example, .invalid, .internal);
 * - a staging-like host (its first label staging, dev, preview, test, qa, uat, sandbox or demo) or
 *   a hosting platform's own address (*.vercel.app and the like) stays out unless
 *   NEXT_PUBLIC_SEARCH_INDEXING=on states that it is the real shop.
 *
 * This file imports nothing, so next.config.ts can load it as it is.
 */

/** NEXT_PUBLIC_SEARCH_INDEXING: decide from the origin (`auto`, the default), or force it. */
export type SearchIndexingSetting = 'auto' | 'on' | 'off';

export type NotIndexedReason =
  'demo-content' | 'switched-off' | 'invalid-setting' | 'local-origin' | 'staging-host';

export type IndexingDecision = { indexable: true } | { indexable: false; reason: NotIndexedReason };

export interface IndexingInput {
  /** NEXT_PUBLIC_SITE_URL as built. */
  siteUrl: string | undefined;
  /** NEXT_PUBLIC_DEMO_CONTENT as built (anything but "false" means demonstration content). */
  demoContent: string | undefined;
  /** NEXT_PUBLIC_SEARCH_INDEXING as built. */
  setting: string | undefined;
}

const RESERVED_SUFFIXES = [
  '.localhost',
  '.local',
  '.test',
  '.example',
  '.invalid',
  '.internal',
  '.home.arpa',
];

/** First labels that name a copy of a site rather than the site: "staging.terantrade.uz". */
const STAGING_LABEL =
  /^(?:staging|stage|dev|develop|development|preview|test|testing|qa|uat|sandbox|demo)(?:-?\d+)?$/;

/** Hosting platforms' own addresses, where previews and copies live. */
const PLATFORM_SUFFIXES = [
  '.vercel.app',
  '.netlify.app',
  '.pages.dev',
  '.workers.dev',
  '.onrender.com',
  '.herokuapp.com',
  '.github.io',
  '.ngrok.io',
  '.ngrok-free.app',
  '.trycloudflare.com',
];

/** The setting as written, or null when it is none of `auto`, `on`, `off` (or empty). */
export function parseIndexingSetting(value: string | undefined): SearchIndexingSetting | null {
  const setting = (value ?? '').trim().toLowerCase();
  if (setting === '' || setting === 'auto') return 'auto';
  return setting === 'on' || setting === 'off' ? setting : null;
}

/** The origin's host name when it is https on a public name, else null. */
function publicHost(siteUrl: string | undefined): string | null {
  let url: URL;
  try {
    url = new URL(siteUrl ?? '');
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  // "localhost" and other one-label intranet names, IPv4 and IPv6 addresses.
  if (!host.includes('.') || /^[\d.]+$/.test(host) || host.startsWith('[')) return null;
  return RESERVED_SUFFIXES.some((suffix) => host.endsWith(suffix)) ? null : host;
}

function isStagingHost(host: string): boolean {
  const [first = '', ...rest] = host.split('.');
  // Only a subdomain's label counts: "dev.uz" itself could be a shop's own name.
  return (
    (rest.length >= 2 && STAGING_LABEL.test(first)) ||
    PLATFORM_SUFFIXES.some((suffix) => host.endsWith(suffix))
  );
}

/** Applies the rules above; a setting that is not understood keeps the build out. */
export function decideIndexing({ siteUrl, demoContent, setting }: IndexingInput): IndexingDecision {
  if (demoContent !== 'false') return { indexable: false, reason: 'demo-content' };
  const parsed = parseIndexingSetting(setting);
  if (parsed === null) return { indexable: false, reason: 'invalid-setting' };
  if (parsed === 'off') return { indexable: false, reason: 'switched-off' };
  const host = publicHost(siteUrl);
  if (host === null) return { indexable: false, reason: 'local-origin' };
  if (parsed === 'auto' && isStagingHost(host)) return { indexable: false, reason: 'staging-host' };
  return { indexable: true };
}

/**
 * This build's decision. The variables are read one by one, as `process.env.NEXT_PUBLIC_…`, so
 * Next.js writes their values into the build: the production server runs without them.
 */
export const searchIndexing: IndexingDecision = decideIndexing({
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
  demoContent: process.env.NEXT_PUBLIC_DEMO_CONTENT,
  setting: process.env.NEXT_PUBLIC_SEARCH_INDEXING,
});
