'use client';

import type { Locale, StoreGeocodeDto } from '@teran/contracts';
import { LoaderCircle, MapPin, Search } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { StoreMap } from '@/components/stores/store-map';
import { Button } from '@/components/ui/button';
import { inputClasses } from '@/components/ui/controls';
import { apiRequest } from '@/lib/api/client';

/** Degrees to six decimals (about 10 cm), as map services copy them. */
const round = (value: number) => Math.round(value * 1e6) / 1e6;

/**
 * Where a store stands, for Admin → Store addresses: the storefront's map, on which a click puts
 * the store's pin (drag to move around, +/− to zoom), and a search over OpenStreetMap that opens
 * the map on the address (or, failing that, its town) so the exact spot can be clicked. The
 * coordinates field beside it stays the way to type or paste a place.
 */
export function LocationPicker({
  name,
  latitude,
  longitude,
  address,
  onChange,
}: {
  name: string;
  latitude: number;
  longitude: number;
  /** The Uzbek address, searched for unless the field is edited. */
  address: string;
  onChange: (latitude: number, longitude: number) => void;
}) {
  const t = useTranslations('Admin');
  const locale = useLocale() as Locale;
  const searchId = useId();
  const [query, setQuery] = useState<string | null>(null);
  const [search, setSearch] = useState<
    { status: 'idle' | 'busy' | 'failed' } | { status: 'done'; found: StoreGeocodeDto }
  >({ status: 'idle' });
  // A place typed into the coordinates field or found by the search is brought into view (the map
  // frames its pin anew when the pin's id changes); one clicked on the map keeps the view.
  const [framed, setFramed] = useState(0);
  const [clicked, setClicked] = useState<string | null>(null);
  const located = Number.isFinite(latitude) && Number.isFinite(longitude);
  const place = located ? `${latitude},${longitude}` : '';
  const [shown, setShown] = useState(place);
  if (place !== shown) {
    setShown(place);
    if (place !== clicked) setFramed((current) => current + 1);
  }
  const text = query ?? address;
  const pin = `pin-${framed}`;

  async function find() {
    if (text.trim().length < 2) return;
    setSearch({ status: 'busy' });
    try {
      const found = await apiRequest<StoreGeocodeDto>(
        `/admin/settings/stores/geocode?${new URLSearchParams({ q: text.trim(), locale })}`,
      );
      setSearch({ status: 'done', found });
    } catch {
      setSearch({ status: 'failed' });
    }
  }

  return (
    <div className="space-y-3">
      <div className="h-72 overflow-hidden rounded-control border border-line sm:h-80">
        <StoreMap
          points={located ? [{ id: pin, name, latitude, longitude }] : []}
          selectedId={located ? pin : null}
          onSelect={() => {}}
          user={null}
          popup={null}
          onPick={(at) => {
            const [lat, lng] = [round(at.latitude), round(at.longitude)];
            setClicked(`${lat},${lng}`);
            onChange(lat, lng);
          }}
          labels={{
            region: t('stores.mapRegion'),
            zoomIn: t('stores.zoomIn'),
            zoomOut: t('stores.zoomOut'),
            attribution: t('stores.attribution'),
            close: t('stores.close'),
          }}
        />
      </div>
      <p className="flex items-start gap-2 text-body-sm text-fg-subtle">
        <MapPin aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
        {located ? t('stores.mapHint') : t('stores.mapHintEmpty')}
      </p>

      <div>
        <label htmlFor={searchId} className="mb-1.5 block text-label text-fg">
          {t('stores.findLabel')}
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id={searchId}
            type="search"
            value={text}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              // Enter searches here instead of sending the whole form.
              if (event.key !== 'Enter') return;
              event.preventDefault();
              void find();
            }}
            placeholder={t('stores.findPlaceholder')}
            maxLength={200}
            autoComplete="off"
            className={inputClasses({ size: 'md', className: 'min-w-0 flex-1' })}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => void find()}
            disabled={search.status === 'busy' || text.trim().length < 2}
          >
            {search.status === 'busy' ? (
              <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" />
            ) : (
              <Search aria-hidden className="h-4 w-4" />
            )}
            {search.status === 'busy' ? t('stores.finding') : t('stores.find')}
          </Button>
        </div>
      </div>

      <div aria-live="polite">
        {search.status === 'failed' ? (
          <p className="text-body-sm text-danger">{t('stores.findFailed')}</p>
        ) : search.status === 'done' && search.found.results.length === 0 ? (
          <p className="text-body-sm text-fg-subtle">{t('stores.notFound')}</p>
        ) : search.status === 'done' ? (
          <div className="space-y-2">
            <p className="text-body-sm text-fg-subtle">
              {t('stores.foundBy', { query: search.found.query })}
            </p>
            <ul className="divide-y divide-line overflow-hidden rounded-control border border-line">
              {search.found.results.map((result) => (
                <li key={`${result.latitude},${result.longitude}`}>
                  <button
                    type="button"
                    onClick={() => onChange(round(result.latitude), round(result.longitude))}
                    className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-body-sm text-fg hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-none"
                  >
                    <MapPin aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle" />
                    {result.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
