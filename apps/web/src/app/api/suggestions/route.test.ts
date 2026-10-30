import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getProductList } from '@/lib/data/catalog';
import { GET } from './route';

vi.mock('@/lib/data/catalog', () => ({ getProductList: vi.fn() }));
const list = vi.mocked(getProductList);

const ask = (query: string) => GET(new NextRequest(`http://localhost/api/suggestions${query}`));

describe('GET /api/suggestions', () => {
  afterEach(() => list.mockReset());

  it("answers the storefront's featured teas in the language asked for", async () => {
    list.mockResolvedValue({ items: [{ slug: 'teran-8009' }] } as never);

    const response = await ask('?locale=ru');

    expect(list).toHaveBeenCalledWith('ru', 'featured=true&pageSize=8&sort=featured');
    expect(await response.json()).toEqual({ items: [{ slug: 'teran-8009' }] });
  });

  it('falls back to the default language for one it does not know', async () => {
    list.mockResolvedValue({ items: [] } as never);

    await ask('?locale=xx');
    await ask('');

    expect(list.mock.calls.map(([locale]) => locale)).toEqual(['uz', 'uz']);
  });

  it('answers an empty list when the catalogue cannot be read', async () => {
    list.mockRejectedValue(new Error('API down'));

    const response = await ask('?locale=en');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ items: [] });
  });
});
