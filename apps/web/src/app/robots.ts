import type { MetadataRoute } from 'next';
import { robotsRules, searchIndexing } from '@/lib/seo';
import { siteUrl } from '@/lib/site';

/** robots.txt from this build's indexing decision (lib/seo/indexing.ts, ADR-060). */
export default function robots(): MetadataRoute.Robots {
  return robotsRules(searchIndexing, siteUrl);
}
