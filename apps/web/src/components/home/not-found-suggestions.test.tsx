import type { ProductSummaryDto } from '@teran/contracts';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NotFoundSuggestions } from './not-found-suggestions';

vi.mock('@/components/home/product-rail', () => ({
  ProductRail: ({ tabs }: { tabs: { label: string; products: ProductSummaryDto[] }[] }) => (
    <section aria-label={tabs[0]!.label}>
      {tabs[0]!.products.map((product) => (
        <p key={product.slug}>{product.slug}</p>
      ))}
    </section>
  ),
}));

function show() {
  return render(
    <NextIntlClientProvider locale="ru" messages={{}}>
      <NotFoundSuggestions
        fallback={<p>loading</p>}
        label="Discover"
        cta="Shop all"
        labels={{ tabList: 'Tabs', previous: 'Previous', next: 'Next' }}
      />
    </NextIntlClientProvider>,
  );
}

describe('NotFoundSuggestions', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("holds the row's place, then shows the featured teas in the page's language", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        Response.json({ items: [{ slug: 'teran-8009' }, { slug: 'teran-8800' }] }),
      );
    vi.stubGlobal('fetch', fetch);

    show();

    expect(screen.getByText('loading')).toBeTruthy();
    await waitFor(() => expect(screen.getByRole('region', { name: 'Discover' })).toBeTruthy());
    expect(screen.getByText('teran-8800')).toBeTruthy();
    expect(screen.queryByText('loading')).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]![0]).toBe('/api/suggestions?locale=ru');
  });

  it('shows nothing when the request fails or finds no teas', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    const failed = show();
    await waitFor(() => expect(failed.container.innerHTML).toBe(''));
    cleanup();

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ items: [] })));
    const empty = show();
    await waitFor(() => expect(empty.container.innerHTML).toBe(''));
  });
});
