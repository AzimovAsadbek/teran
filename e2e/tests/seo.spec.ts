import { expect, test, type APIRequestContext } from '@playwright/test';

/*
 * What search engines receive (docs/architecture/seo.md, ADR-060), read as they read it: the raw
 * HTML of the production build, requested as Googlebot, which gets every tag in <head> and real
 * status codes (htmlLimitedBots). The end-to-end stack is a demonstration build on localhost, so
 * it is never indexable: robots.txt keeps crawlers out and every response says noindex.
 */

const GOOGLEBOT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

const PUBLIC_PAGES = [
  '/en',
  '/en/catalog',
  '/en/tea',
  '/en/tea/green-tea',
  '/en/products/classic-green-tea',
  '/en/journal',
  '/en/about',
  '/en/wholesale',
  '/en/faq',
  '/en/contact',
  '/en/stores',
  '/en/tea-101',
  '/en/media',
];

interface Page {
  status: number;
  html: string;
  headers: Record<string, string>;
}

async function fetchPage(request: APIRequestContext, path: string): Promise<Page> {
  const response = await request.get(path, {
    headers: { 'User-Agent': GOOGLEBOT },
    maxRedirects: 0,
  });
  return { status: response.status(), html: await response.text(), headers: response.headers() };
}

const decode = (value: string) =>
  value
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

/** The <meta> and <link> tags of the head, each as its attributes. */
function headTags(html: string): Record<string, string>[] {
  const head = html.slice(0, html.indexOf('</head>'));
  return [...head.matchAll(/<(?:meta|link)\b([^>]*)>/g)].map((match) =>
    Object.fromEntries(
      [...(match[1] ?? '').matchAll(/([\w:-]+)="([^"]*)"/g)].map(([, name, value]) => [
        name!.toLowerCase(),
        decode(value!),
      ]),
    ),
  );
}

function seo(html: string) {
  const tags = headTags(html);
  const meta = (key: string) =>
    tags.find((tag) => tag.name === key || tag.property === key)?.content ?? null;
  return {
    title: decode(/<title>([^<]*)<\/title>/.exec(html)?.[1] ?? ''),
    description: meta('description'),
    robots: meta('robots'),
    ogUrl: meta('og:url'),
    ogLocale: meta('og:locale'),
    canonical: tags.find((tag) => tag.rel === 'canonical')?.href ?? null,
    alternates: Object.fromEntries(
      tags
        .filter((tag) => tag.rel === 'alternate' && tag.hreflang)
        .map((tag) => [tag.hreflang!, tag.href!]),
    ),
    jsonLd: [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(
      (match) => match[1]!,
    ),
  };
}

test.describe('search engines', () => {
  test('a demonstration build keeps crawlers out, on every response', async ({ request }) => {
    const robots = await request.get('/robots.txt');
    expect(robots.status()).toBe(200);
    const text = await robots.text();
    expect(text).toMatch(/User-Agent: \*\s+Disallow: \/\s*$/);
    expect(text).not.toContain('Sitemap:');
    for (const path of ['/robots.txt', '/en', '/brand/og-default.png', '/api/health']) {
      expect((await request.get(path)).headers()['x-robots-tag'], path).toBe('noindex, nofollow');
    }
    // The API's answers say so on any build.
    const api = await request.get('/api/v1/health/live');
    expect(api.headers()['x-robots-tag']).toBe('noindex, nofollow');
  });

  test('every public page names its canonical address and its language versions', async ({
    request,
    baseURL,
  }) => {
    const origin = new URL(baseURL!).origin;
    const titles = new Set<string>();
    const descriptions = new Set<string>();
    for (const path of PUBLIC_PAGES) {
      const page = await fetchPage(request, path);
      expect(page.status, path).toBe(200);
      const head = seo(page.html);
      const url = `${origin}${path}`;
      expect(head.canonical, path).toBe(url);
      expect(head.ogUrl, path).toBe(url);
      expect(head.ogLocale, path).toBe('en_US');
      const english = path.replace(/^\/en/, '');
      expect(head.alternates, path).toEqual({
        uz: `${origin}${english || ''}`,
        ru: `${origin}/ru${english}`,
        en: url,
        'x-default': `${origin}${english || ''}`,
      });
      // The demonstration build is not indexed, page by page as well.
      expect(head.robots, path).toBe('noindex, nofollow');
      expect(head.title, path).not.toBe('');
      expect(head.description, path).toBeTruthy();
      titles.add(head.title);
      descriptions.add(head.description!);
    }
    expect(titles.size).toBe(PUBLIC_PAGES.length);
    expect(descriptions.size).toBe(PUBLIC_PAGES.length);

    // Each language version lists the same versions (reciprocal hreflang).
    const russian = seo((await fetchPage(request, '/ru/tea/green-tea')).html);
    const english = seo((await fetchPage(request, '/en/tea/green-tea')).html);
    expect(russian.alternates).toEqual(english.alternates);
    expect(russian.canonical).toBe(`${origin}/ru/tea/green-tea`);
    expect(russian.ogLocale).toBe('ru_RU');
  });

  test('private, filtered and empty pages are not offered to search engines', async ({
    request,
  }) => {
    for (const path of [
      '/en/cart',
      '/en/checkout',
      '/en/account/login',
      '/en/search?q=tea',
      '/en/faq/search?q=tea',
      '/en/tea?sort=price_asc',
      '/en/catalog?format=TEA_BAGS',
      '/en/journal?page=999',
    ]) {
      const page = await fetchPage(request, path);
      expect(page.status, path).toBe(200);
      const head = seo(page.html);
      expect(head.robots, path).toMatch(/^noindex/);
      expect(head.canonical, path).toBeNull();
      expect(head.alternates, path).toEqual({});
    }
  });

  test('unknown and renamed addresses answer with real status codes', async ({ request }) => {
    expect((await fetchPage(request, '/en/products/does-not-exist')).status).toBe(404);
    expect((await fetchPage(request, '/en/no-such-page')).status).toBe(404);
    expect((await fetchPage(request, '/en/tea/no-such-kind')).status).toBe(404);
    const renamed = await fetchPage(request, '/en/products/teran-het8800');
    expect(renamed.status).toBe(308);
    expect(renamed.headers.location).toBe('/en/products/teran-8800');
    // One address per page: no trailing slash.
    const slash = await fetchPage(request, '/en/tea/');
    expect(slash.status).toBe(308);
    expect(slash.headers.location).toBe('/en/tea');
  });

  test('structured data describes what the pages show, and parses', async ({
    request,
    baseURL,
  }) => {
    const origin = new URL(baseURL!).origin;
    const home = seo((await fetchPage(request, '/en')).html);
    const graph = (JSON.parse(home.jsonLd[0]!) as { '@graph': Record<string, unknown>[] })[
      '@graph'
    ];
    expect(graph.map((node) => node['@type'])).toEqual(['OnlineStore', 'WebSite']);
    expect(graph[0]).toMatchObject({ '@id': `${origin}/#organization`, url: `${origin}/` });
    expect(JSON.stringify(graph)).not.toContain('availableLanguage');

    const productPage = await fetchPage(request, '/en/products/classic-green-tea');
    const product = seo(productPage.html);
    for (const block of product.jsonLd) expect(block).not.toMatch(/[<>]/);
    const blocks = product.jsonLd.map(
      (block) => JSON.parse(block) as Record<string, unknown> & { '@type': string },
    );
    const data = blocks.find((block) => block['@type'] === 'Product')!;
    const heading = /<h1[^>]*>(.*?)<\/h1>/s.exec(productPage.html)?.[1]?.replace(/<[^>]+>/g, '');
    expect(data).toMatchObject({ url: product.canonical, '@id': `${product.canonical}#product` });
    expect(heading).toContain(data.name as string);
    // A brand only for TERAN's own products; offers because this build shows prices.
    expect('brand' in data).toBe(/\bTERAN\b/i.test(data.name as string));
    const offers = data.offers as { priceCurrency: string; availability: string; url: string }[];
    expect(offers.length).toBeGreaterThan(0);
    for (const offer of offers) {
      expect(offer.priceCurrency).toBe('UZS');
      expect(offer.availability).toMatch(
        /^https:\/\/schema\.org\/(InStock|LimitedAvailability|OutOfStock)$/,
      );
      expect(offer.url.startsWith(`${product.canonical}?variant=`)).toBe(true);
    }
    for (const image of data.image as string[]) expect(image).toMatch(/^https?:\/\//);

    const trail = blocks.find((block) => block['@type'] === 'BreadcrumbList')?.itemListElement as {
      position: number;
      item?: string;
    }[];
    expect(trail.map((item) => item.position)).toEqual(trail.map((_, index) => index + 1));
    expect(trail[0]?.item).toBe(`${origin}/en`);
    expect(trail.at(-1)?.item).toBeUndefined();
  });

  test('the sitemap lists the canonical addresses of public pages, each with its versions', async ({
    request,
    baseURL,
  }) => {
    const origin = new URL(baseURL!).origin;
    const response = await request.get('/sitemap.xml');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('xml');
    const xml = await response.text();
    const entries = [...xml.matchAll(/<url>(.*?)<\/url>/gs)].map(([, body]) => ({
      loc: decode(/<loc>(.*?)<\/loc>/.exec(body!)?.[1] ?? ''),
      alternates: Object.fromEntries(
        [...body!.matchAll(/hreflang="([^"]+)"\s+href="([^"]+)"/g)].map(([, lang, href]) => [
          lang!,
          decode(href!),
        ]),
      ),
    }));
    expect(entries.length).toBeGreaterThan(50);
    const locs = entries.map((entry) => entry.loc);
    expect(new Set(locs).size).toBe(locs.length);
    for (const { loc, alternates } of entries) {
      expect(loc.startsWith(`${origin}/`), loc).toBe(true);
      const path = new URL(loc).pathname.replace(/^\/(?:ru|en)(?=\/|$)/, '') || '/';
      expect(path, loc).not.toMatch(
        /^\/(?:api|account|cart|checkout|orders|payments|search|admin|newsletter|faq\/search)\b/,
      );
      if (Object.keys(alternates).length > 0) {
        expect(Object.values(alternates), loc).toContain(loc);
        expect(alternates['x-default'], loc).toBe(alternates.uz);
      }
    }
    expect(locs).toContain(`${origin}/en/products/classic-green-tea`);

    // The sitemap's addresses are the pages' own canonical addresses.
    for (const path of ['/en/tea/green-tea', '/en/products/classic-green-tea', '/en/faq']) {
      const head = seo((await fetchPage(request, path)).html);
      expect(locs).toContain(head.canonical);
    }
  });
});
