// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { LOCALES } from '@teran/contracts';
import { describe, expect, it } from 'vitest';

/*
 * One owner per kind of metadata (docs/architecture/seo.md): pages describe themselves through
 * pageMetadata (or say `noindex`), canonical and hreflang come only from lib/seo, and structured
 * data is written only by components/seo/json-ld.tsx.
 */

const SRC = join(process.cwd(), 'src');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

const files = sourceFiles(SRC).map((path) => ({
  path: relative(SRC, path),
  text: readFileSync(path, 'utf8'),
}));

describe('metadata ownership', () => {
  it('leaves canonical and hreflang links to lib/seo', () => {
    const owners = files
      .filter(({ text }) => /\balternates\s*:|\bcanonical\s*:/.test(text))
      .map(({ path }) => path);
    expect(owners.filter((path) => !path.startsWith('lib/seo/'))).toEqual([]);
  });

  it('writes structured data in one place only', () => {
    const writers = files
      .filter(({ text }) => text.includes('type="application/ld+json"'))
      .map(({ path }) => path);
    expect(writers).toEqual(['components/seo/json-ld.tsx']);
  });

  it('describes every storefront page through pageMetadata, or keeps it out of search results', () => {
    const pages = files.filter(
      ({ path }) =>
        path.startsWith('app/[locale]/') &&
        !path.startsWith('app/[locale]/admin') &&
        path.endsWith('page.tsx') &&
        /export (?:async )?function generateMetadata/.test(readFileSync(join(SRC, path), 'utf8')),
    );
    expect(pages.length).toBeGreaterThan(30);
    for (const { path, text } of pages) {
      const described =
        /\bpageMetadata\(|\blegalMetadata\(|\bcategoryMetadata\(|\bmediaKindMetadata\(/.test(text);
      const excluded = /robots:\s*{\s*index:\s*false/.test(text);
      expect(described || excluded, path).toBe(true);
    }
  });
});

describe('page titles and descriptions', () => {
  it('are unique within each language and translated into each', () => {
    const metaTexts = (locale: string) => {
      const messages = JSON.parse(
        readFileSync(join(process.cwd(), 'messages', `${locale}.json`), 'utf8'),
      ) as Record<string, unknown>;
      const found: Record<string, string> = {};
      const walk = (value: unknown, key: string) => {
        if (typeof value === 'string') {
          if (/meta(?:Title|Description)$/i.test(key) && !key.startsWith('Meta.')) {
            found[key] = value;
          }
        } else if (value && typeof value === 'object') {
          for (const [child, nested] of Object.entries(value)) {
            walk(nested, key ? `${key}.${child}` : child);
          }
        }
      };
      walk(messages, '');
      return found;
    };
    const byLocale = Object.fromEntries(LOCALES.map((locale) => [locale, metaTexts(locale)]));
    for (const locale of LOCALES) {
      const values = Object.values(byLocale[locale]!);
      expect(values.length).toBeGreaterThan(10);
      expect(new Set(values).size, locale).toBe(values.length);
    }
    for (const key of Object.keys(byLocale.uz!)) {
      // Brand names stay as they are; everything else is written in each language.
      if (/^TERAN\b[^a-z]*$/i.test(byLocale.uz![key]!)) continue;
      expect(byLocale.ru![key], key).not.toBe(byLocale.uz![key]);
      expect(byLocale.en![key], key).not.toBe(byLocale.uz![key]);
    }
  });
});
