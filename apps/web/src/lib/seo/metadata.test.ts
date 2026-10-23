// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { siteUrl } from '@/lib/site';
import { coverShareImage, DEFAULT_OG_IMAGE, pageMetadata } from './metadata';

const base = { title: 'Tea', description: 'Green teas.', href: '/tea', locale: 'ru' as const };

describe('page metadata', () => {
  it('states the canonical address of the page in its own language, and every version', () => {
    const metadata = pageMetadata(base);
    expect(metadata.title).toBe('Tea');
    expect(metadata.description).toBe('Green teas.');
    expect(metadata.alternates).toEqual({
      canonical: `${siteUrl}/ru/tea`,
      languages: {
        uz: `${siteUrl}/tea`,
        ru: `${siteUrl}/ru/tea`,
        en: `${siteUrl}/en/tea`,
        'x-default': `${siteUrl}/tea`,
      },
    });
    expect(metadata.robots).toBeUndefined();
    expect(metadata.openGraph).toMatchObject({
      title: 'Tea',
      url: `${siteUrl}/ru/tea`,
      locale: 'ru_RU',
      alternateLocale: ['uz_UZ', 'en_US'],
      images: [DEFAULT_OG_IMAGE],
    });
  });

  it('lists only the languages the item is written in', () => {
    const metadata = pageMetadata({ ...base, locales: ['uz', 'ru'] });
    expect(metadata.alternates?.languages).toEqual({
      uz: `${siteUrl}/tea`,
      ru: `${siteUrl}/ru/tea`,
      'x-default': `${siteUrl}/tea`,
    });
    expect(metadata.openGraph).toMatchObject({ alternateLocale: ['uz_UZ'] });
  });

  it('keeps a page that shows the Uzbek fallback text out of search results', () => {
    const metadata = pageMetadata({ ...base, locale: 'en', locales: ['uz', 'ru'] });
    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.alternates).toBeUndefined();
    expect(metadata.openGraph).not.toHaveProperty('alternateLocale');
  });

  it('gives a page with a single version a canonical address and no hreflang', () => {
    const metadata = pageMetadata({ ...base, locale: 'uz', locales: ['uz'] });
    expect(metadata.alternates).toEqual({ canonical: `${siteUrl}/tea` });
    expect(metadata.robots).toBeUndefined();
  });

  it('numbers the pages of a listing in their title and canonical address', () => {
    const second = pageMetadata({ ...base, pagination: { page: 2, label: 'Страница 2' } });
    expect(second.title).toBe('Tea — Страница 2');
    expect(second.alternates?.canonical).toBe(`${siteUrl}/ru/tea?page=2`);
    expect(second.alternates?.languages).toMatchObject({ en: `${siteUrl}/en/tea?page=2` });

    const first = pageMetadata({ ...base, pagination: { page: 1, label: 'Страница 1' } });
    expect(first.title).toBe('Tea');
    expect(first.alternates?.canonical).toBe(`${siteUrl}/ru/tea`);
  });

  it('does not add "— TERAN" to a title that names the brand already', () => {
    expect(pageMetadata({ ...base, title: 'Gallery — TERAN photos' }).title).toEqual({
      absolute: 'Gallery — TERAN photos',
    });
    expect(pageMetadata({ ...base, title: { absolute: 'TERAN' } }).title).toEqual({
      absolute: 'TERAN',
    });
    expect(pageMetadata({ ...base, title: 'Teranga' }).title).toBe('Teranga');
  });

  it('marks pages that are not for search engines, without a canonical of their own', () => {
    const metadata = pageMetadata({ ...base, noIndex: true });
    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.alternates).toBeUndefined();
  });

  it('keeps the layout description when the page has none', () => {
    expect(pageMetadata({ ...base, description: undefined })).not.toHaveProperty('description');
  });
});

describe('share pictures', () => {
  it('use the rendition closest to 1280 px with its real height', () => {
    const image = {
      src: '/uploads/products/x/abc',
      widths: [320, 640, 960, 1600],
      width: 2000,
      height: 1500,
      alt: 'Leaves',
      transparent: false,
    };
    expect(coverShareImage(image)).toEqual({
      url: '/uploads/products/x/abc/1600.webp',
      width: 1600,
      height: 1200,
      alt: 'Leaves',
    });
    expect(coverShareImage(null)).toBeUndefined();
  });
});
