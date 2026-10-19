import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import type { Locale, StoreGeocodeDto } from '@teran/contracts';
import { ApiException } from '../common/errors/api-exception.js';

/**
 * Finds an address on the map for Admin → Store addresses, with OpenStreetMap's geocoder
 * (Nominatim). Its usage policy asks for an identifying User-Agent, at most one request a second
 * and remembered answers, which this keeps; the admin area looks addresses up by hand, one button
 * press at a time (the policy forbids autocomplete).
 *
 * Uzbek addresses carry parts geocoders rarely know (the house, "200-uy"; the neighbourhood
 * council, "Dashtbogʻ MFY"), so an address that finds nothing is tried again without them, then
 * by its region and city alone: the map then at least opens on the right town.
 */
const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'TERAN store admin (+https://terantrade.uz)';
const TIMEOUT_MS = 8_000;
const CACHE_LIMIT = 200;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type Results = StoreGeocodeDto['results'];

/** The house ("200-uy", "uy 200", "д. 5", "kv. 12") as a whole part of the address. */
const HOUSE = /^(\d+\s*[-–]?\s*(uy|xonadon|dom|д\.?|kv\.?|кв\.?)|(uy|dom|д\.|kv\.|кв\.)\s*\d+)$/i;
/** A neighbourhood council ("Dashtbogʻ MFY", "махалля Даштбог"). */
const COUNCIL = /(^|\s)(MFY|МФЙ|МСГ)(\s|$)|mahalla|махалля/i;
/** A region, city or district ("Namangan viloyati", "Namangan shahri", "г. Наманган"). */
const AREA = /viloyat|shahr|tuman|област|город|г\.|район|region|city|district/i;

function parts(query: string): string[] {
  return query
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

/** The address without its house and neighbourhood council. */
export function shorterAddress(query: string): string {
  return parts(query)
    .filter((part) => !HOUSE.test(part) && !COUNCIL.test(part))
    .join(', ');
}

/** The address's region and city alone (empty when it names neither). */
export function areaOfAddress(query: string): string {
  return parts(query)
    .filter((part) => AREA.test(part) && !COUNCIL.test(part))
    .join(', ');
}

function unavailable(): ApiException {
  return new ApiException(
    HttpStatus.SERVICE_UNAVAILABLE,
    'SERVICE_UNAVAILABLE',
    'The map search is not available right now',
  );
}

@Injectable()
export class GeocodeService {
  private readonly logger = new Logger(GeocodeService.name);
  private readonly cache = new Map<string, { at: number; results: Results }>();
  private last = 0;
  /** The pause between two requests to Nominatim (its policy: one a second). */
  protected spacingMs = 1_000;

  async find(query: string, locale: Locale): Promise<StoreGeocodeDto> {
    const attempts = [
      ...new Set([query.trim(), shorterAddress(query), areaOfAddress(query)]),
    ].filter((text) => text.length >= 2);
    for (const attempt of attempts) {
      const results = await this.search(attempt, locale);
      if (results.length > 0) return { query: attempt, results };
    }
    return { query: query.trim(), results: [] };
  }

  private async search(query: string, locale: Locale): Promise<Results> {
    const key = `${locale}|${query.toLowerCase()}`;
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.results;

    const wait = this.last + this.spacingMs - Date.now();
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    this.last = Date.now();
    const url = new URL(NOMINATIM);
    url.search = new URLSearchParams({
      q: query,
      format: 'jsonv2',
      limit: '5',
      countrycodes: 'uz',
      'accept-language': locale,
    }).toString();
    let response: Response;
    try {
      response = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      this.logger.warn(`Map search unreachable: ${(error as Error).name}`);
      throw unavailable();
    }
    if (!response.ok) {
      this.logger.warn(`Map search answered HTTP ${response.status}`);
      throw unavailable();
    }
    const places: unknown = await response.json().catch(() => []);
    const results: Results = (Array.isArray(places) ? places : [])
      .flatMap((place: { display_name?: unknown; lat?: unknown; lon?: unknown }) => {
        const latitude = Number(place.lat);
        const longitude = Number(place.lon);
        return typeof place.display_name === 'string' &&
          Number.isFinite(latitude) &&
          Number.isFinite(longitude)
          ? [{ label: place.display_name, latitude, longitude }]
          : [];
      })
      .slice(0, 5);

    if (this.cache.size >= CACHE_LIMIT) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    this.cache.set(key, { at: Date.now(), results });
    return results;
  }
}
