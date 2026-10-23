// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { routing } from '@/i18n/routing';
import { defaultRobots, PRIVATE_PATHS, robotsRules } from './robots';

const origin = 'https://terantrade.uz';

describe('robots.txt', () => {
  it('lets crawlers read the public site, but not the API or private pages in any language', () => {
    const robots = robotsRules({ indexable: true }, origin);
    const rules = Array.isArray(robots.rules) ? robots.rules[0] : robots.rules;
    expect(rules).toMatchObject({ userAgent: '*', allow: '/' });
    const disallow = [rules?.disallow ?? []].flat();
    expect(disallow).toContain('/api/');
    for (const locale of routing.locales) {
      const prefix = locale === routing.defaultLocale ? '' : `/${locale}`;
      for (const path of PRIVATE_PATHS) expect(disallow).toContain(`${prefix}${path}`);
    }
    // Pages render with their styles, scripts and pictures: none of those are blocked.
    expect(disallow.some((path) => /^\/(?:_next|uploads|brand)/.test(path))).toBe(false);
    expect(robots.sitemap).toBe('https://terantrade.uz/sitemap.xml');
  });

  it('keeps every crawler out of a build that may not be indexed, and names no sitemap', () => {
    expect(robotsRules({ indexable: false, reason: 'staging-host' }, origin)).toEqual({
      rules: { userAgent: '*', disallow: '/' },
    });
  });

  it('covers the token pages and every kind of search result', () => {
    expect(PRIVATE_PATHS).toEqual(
      expect.arrayContaining(['/payments', '/orders', '/newsletter', '/search', '/faq/search']),
    );
  });
});

describe('the robots tag pages start from', () => {
  it('leaves the real shop indexable, with large image previews, and says nothing to contradict', () => {
    const robots = defaultRobots({ indexable: true });
    expect(robots).toEqual({ 'max-image-preview': 'large' });
    // A 404 or a private page adds its own noindex; nothing here says "index" against it.
    expect(robots).not.toHaveProperty('index');
    expect(robots).not.toHaveProperty('follow');
  });

  it('keeps every page of a build that may not be indexed out', () => {
    expect(defaultRobots({ indexable: false, reason: 'demo-content' })).toEqual({
      index: false,
      follow: false,
    });
  });
});
