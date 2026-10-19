import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiException } from '../common/errors/api-exception.js';
import { areaOfAddress, GeocodeService, shorterAddress } from './geocode.service.js';

const ADDRESS = 'Namangan viloyati, Namangan shahri, Dashtbogʻ MFY, Turaqoʻrgʻon koʻchasi, 200-uy';

function answer(places: unknown, status = 200) {
  return new Response(JSON.stringify(places), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** The service without the one-second pause between requests. */
function service(): GeocodeService {
  return Object.assign(new GeocodeService(), { spacingMs: 0 });
}

describe('address forms', () => {
  it('drops the house and the neighbourhood council', () => {
    expect(shorterAddress(ADDRESS)).toBe(
      'Namangan viloyati, Namangan shahri, Turaqoʻrgʻon koʻchasi',
    );
    expect(shorterAddress('г. Наманган, махалля Даштбог, ул. Туракурган, д. 200')).toBe(
      'г. Наманган, ул. Туракурган',
    );
  });

  it('keeps the region and city', () => {
    expect(areaOfAddress(ADDRESS)).toBe('Namangan viloyati, Namangan shahri');
    expect(areaOfAddress('Turaqoʻrgʻon koʻchasi 200')).toBe('');
  });
});

describe('GeocodeService', () => {
  const fetchMock = vi.fn<typeof fetch>();
  beforeEach(() => vi.stubGlobal('fetch', fetchMock));
  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('asks Nominatim within Uzbekistan, in the language given, and names the site', async () => {
    fetchMock.mockResolvedValueOnce(
      answer([{ display_name: 'Namangan, Oʻzbekiston', lat: '40.9983', lon: '71.6726' }]),
    );
    const found = await service().find('Namangan', 'ru');
    expect(found).toEqual({
      query: 'Namangan',
      results: [{ label: 'Namangan, Oʻzbekiston', latitude: 40.9983, longitude: 71.6726 }],
    });
    const [url, init] = fetchMock.mock.calls[0]!;
    const params = new URL(url instanceof Request ? url.url : url).searchParams;
    expect(params.get('q')).toBe('Namangan');
    expect(params.get('countrycodes')).toBe('uz');
    expect(params.get('accept-language')).toBe('ru');
    expect(new Headers(init?.headers).get('User-Agent')).toMatch(/terantrade\.uz/);
  });

  it('tries the shorter forms of an address that finds nothing, and remembers answers', async () => {
    fetchMock
      .mockResolvedValueOnce(answer([]))
      .mockResolvedValueOnce(answer([]))
      .mockResolvedValueOnce(
        answer([
          { display_name: 'Namangan', lat: '40.99', lon: '71.66' },
          { display_name: 'broken', lat: 'x', lon: '71' },
        ]),
      );
    const geocoder = service();
    const found = await geocoder.find(ADDRESS, 'uz');
    expect(found.query).toBe('Namangan viloyati, Namangan shahri');
    expect(found.results).toEqual([{ label: 'Namangan', latitude: 40.99, longitude: 71.66 }]);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    await geocoder.find(ADDRESS, 'uz');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('answers 503 when the map search fails', async () => {
    fetchMock.mockResolvedValueOnce(answer({ error: 'busy' }, 429));
    await expect(service().find('Toshkent', 'uz')).rejects.toBeInstanceOf(ApiException);
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
    await expect(service().find('Samarqand', 'uz')).rejects.toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
    });
  });
});
