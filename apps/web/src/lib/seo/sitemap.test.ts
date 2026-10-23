// @vitest-environment node
import { LOCALES, type SitemapEntriesDto } from '@teran/contracts';
import { describe, expect, it } from 'vitest';
import { helpCentre } from '@/content/pages/faq';
import { siteUrl } from '@/lib/site';
import { PRIVATE_PATHS } from './robots';
import { buildSitemap, sitemapEntries } from './sitemap';

const data: SitemapEntriesDto = {
  products: [
    { slug: 'teran-8800', updatedAt: '2026-10-20T10:00:00.000Z', locales: ['uz', 'ru', 'en'] },
    { slug: 'glass-teapot', updatedAt: '2026-10-21T10:00:00.000Z', locales: ['uz'] },
  ],
  categories: [
    {
      slug: 'green-tea',
      path: 'tea/green-tea',
      updatedAt: '2026-10-18T10:00:00.000Z',
      locales: ['uz', 'en'],
    },
  ],
  collections: [
    { slug: 'premium', updatedAt: '2026-10-17T10:00:00.000Z', locales: ['uz', 'ru', 'en'] },
  ],
  articles: [{ slug: 'brewing', updatedAt: '2026-10-16T10:00:00.000Z', locales: ['uz', 'ru'] }],
};

const urls = (sitemap: ReturnType<typeof buildSitemap>) => sitemap.map((entry) => entry.url);

describe('sitemap', () => {
  const sitemap = buildSitemap({ pages: ['/', '/about'], data });

  it('lists every language version of the pages written in each', () => {
    expect(urls(sitemap)).toEqual(
      expect.arrayContaining([
        `${siteUrl}/`,
        `${siteUrl}/ru`,
        `${siteUrl}/en`,
        `${siteUrl}/about`,
        `${siteUrl}/ru/about`,
        `${siteUrl}/en/about`,
      ]),
    );
  });

  it('lists catalogue and journal pages only in the languages they are written in', () => {
    expect(urls(sitemap).filter((url) => url.includes('green-tea'))).toEqual([
      `${siteUrl}/tea/green-tea`,
      `${siteUrl}/en/tea/green-tea`,
    ]);
    expect(urls(sitemap).filter((url) => url.includes('glass-teapot'))).toEqual([
      `${siteUrl}/products/glass-teapot`,
    ]);
    expect(urls(sitemap).filter((url) => url.includes('/journal/'))).toEqual([
      `${siteUrl}/journal/brewing`,
      `${siteUrl}/ru/journal/brewing`,
    ]);
  });

  it('gives every version the same, reciprocal set of alternates', () => {
    const versions = sitemap.filter((entry) => entry.url.includes('/journal/brewing'));
    const expected = {
      uz: `${siteUrl}/journal/brewing`,
      ru: `${siteUrl}/ru/journal/brewing`,
      'x-default': `${siteUrl}/journal/brewing`,
    };
    for (const entry of versions) {
      expect(entry.alternates?.languages).toEqual(expected);
      expect(Object.values(expected)).toContain(entry.url);
    }
    // A page in a single language needs no alternates.
    const teapot = sitemap.find((entry) => entry.url.endsWith('/products/glass-teapot'));
    expect(teapot).not.toHaveProperty('alternates');
  });

  it('dates the catalogue entries by their last change', () => {
    const product = sitemap.find((entry) => entry.url === `${siteUrl}/ru/products/teran-8800`);
    expect(product?.lastModified).toBe('2026-10-20T10:00:00.000Z');
  });

  it('holds only unique, absolute addresses of this site, none of them private', () => {
    const all = urls(sitemap);
    expect(new Set(all).size).toBe(all.length);
    for (const url of all) {
      expect(url.startsWith(`${siteUrl}/`)).toBe(true);
      const path = new URL(url).pathname.replace(/^\/(?:ru|en)(?=\/|$)/, '') || '/';
      expect(path).not.toContain('?');
      expect(PRIVATE_PATHS.some((prefix) => path.startsWith(prefix))).toBe(false);
      expect(path.startsWith('/api')).toBe(false);
    }
  });

  it('keeps the pages written in every language when the API cannot be read', () => {
    expect(urls(buildSitemap({ pages: ['/'], data: null }))).toEqual([
      `${siteUrl}/`,
      `${siteUrl}/ru`,
      `${siteUrl}/en`,
    ]);
  });

  it('writes an entry per version for a single page', () => {
    expect(sitemapEntries('/faq', { locales: ['uz', 'ru'] }).map((entry) => entry.url)).toEqual([
      `${siteUrl}/faq`,
      `${siteUrl}/ru/faq`,
    ]);
  });
});

describe('help centre addresses', () => {
  it('are the same in every language, so each language version exists', () => {
    const addresses = (locale: (typeof LOCALES)[number], byContact: boolean) =>
      helpCentre(locale, byContact).flatMap((category) =>
        category.articles.map((article) => `${category.id}/${article.slug}`),
      );
    for (const byContact of [false, true]) {
      const english = addresses('en', byContact);
      expect(english.length).toBeGreaterThan(0);
      for (const locale of LOCALES) expect(addresses(locale, byContact)).toEqual(english);
    }
  });
});
