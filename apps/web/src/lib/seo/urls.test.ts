// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { siteUrl } from '@/lib/site';
import { hreflangLinks, languageVersions, localizedUrl } from './urls';

describe('localised addresses', () => {
  it('serves Uzbek without a prefix and the other languages under theirs', () => {
    expect(localizedUrl('/catalog', 'uz')).toBe(`${siteUrl}/catalog`);
    expect(localizedUrl('/catalog', 'ru')).toBe(`${siteUrl}/ru/catalog`);
    expect(localizedUrl('/products/teran-8800', 'en')).toBe(`${siteUrl}/en/products/teran-8800`);
    expect(localizedUrl('/', 'uz')).toBe(`${siteUrl}/`);
    expect(localizedUrl('/', 'ru')).toBe(`${siteUrl}/ru`);
  });

  it('never uses a trailing slash or a doubled one', () => {
    for (const locale of ['uz', 'ru', 'en'] as const) {
      const url = localizedUrl('/tea/green-tea', locale);
      expect(url).not.toMatch(/\/$/);
      expect(new URL(url).pathname).not.toContain('//');
    }
  });
});

describe('language versions', () => {
  it('are every enabled language for pages written in each', () => {
    expect(languageVersions()).toEqual(['uz', 'ru', 'en']);
  });

  it('are only the languages an item has its own text in, in the site order', () => {
    expect(languageVersions(['en', 'uz'])).toEqual(['uz', 'en']);
    expect(languageVersions(['uz'])).toEqual(['uz']);
  });
});

describe('hreflang links', () => {
  it('list every version and x-default for the Uzbek one', () => {
    expect(hreflangLinks('/about', ['uz', 'ru', 'en'])).toEqual({
      uz: `${siteUrl}/about`,
      ru: `${siteUrl}/ru/about`,
      en: `${siteUrl}/en/about`,
      'x-default': `${siteUrl}/about`,
    });
  });

  it('keep the page number of a listing', () => {
    expect(hreflangLinks('/journal', ['uz', 'ru'], 'page=2')).toEqual({
      uz: `${siteUrl}/journal?page=2`,
      ru: `${siteUrl}/ru/journal?page=2`,
      'x-default': `${siteUrl}/journal?page=2`,
    });
  });

  it('are left out for a single version, and x-default needs the Uzbek one', () => {
    expect(hreflangLinks('/products/x', ['uz'])).toEqual({});
    expect(hreflangLinks('/products/x', ['ru', 'en'])).toEqual({
      ru: `${siteUrl}/ru/products/x`,
      en: `${siteUrl}/en/products/x`,
    });
  });
});
