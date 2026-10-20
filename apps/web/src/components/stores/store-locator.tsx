'use client';

import { STORE_KINDS, type PublicStoreDto, type StoreKind } from '@teran/contracts';
import {
  ChevronDown,
  Clock,
  LoaderCircle,
  LocateFixed,
  MapPin,
  Phone,
  Search,
  X,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { imageSources } from '@/lib/navigation';
import { StoreMap } from './store-map';

/*
 * The store locator on the reference's (its Storepoint widget): a white panel with a search row
 * across the top (the search field with "use my location", the radius, the kind filter), the
 * stores on the left and the map on the right; on phones the search, the map, then the list.
 * TERAN's stores come from Admin → Store addresses; the search matches their names and
 * addresses, and once the visitor shares their location the list keeps the stores within the
 * radius, nearest first. Nothing is invented when there are none. With a single store there is
 * nothing to search: the panel shows that store, chosen on the map, with its details and the ways
 * to get there (Google Maps directions, Yandex Maps), on phones its card above the map.
 */

const RADII = [5, 10, 25, 50, 100] as const;
const TEAL = '#107e84';
/** The reference's tag colours: mint for the first kind, then its green, then a warm yellow. */
const KIND_COLOURS: Record<StoreKind, string> = {
  SHOP: 'bg-[#b5e3d8]',
  DEALER: 'bg-[#b7dd79]',
  WHOLESALE: 'bg-[#f6d58e]',
};
const PANEL =
  'absolute top-full left-0 z-20 rounded-[0.3125rem] bg-white py-2 shadow-[0_3px_10px_rgb(0_0_0_/_10%),0_-2px_3px_rgb(0_0_0_/_1%)]';

interface Position {
  latitude: number;
  longitude: number;
}

/** Lower case without accents or the Uzbek apostrophes, so "Oʻzbekiston" matches "ozbekiston". */
function fold(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[ʻʼ'‘’`]/g, '')
    .toLowerCase();
}

/** Kilometres between two places on the globe. */
function distanceKm(from: Position, to: Position): number {
  const rad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = rad(to.latitude - from.latitude);
  const dLng = rad(to.longitude - from.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(from.latitude)) * Math.cos(rad(to.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/**
 * Opening hours as the reference's two columns: each line split before its first figure ("Du–Ju
 * 9:00–18:00" → "Du–Ju" | "9:00–18:00"); a line without one ("Yakshanba — dam olish") spans both.
 */
function hoursRows(hours: string): { day: string; time: string | null }[] {
  return hours
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = /^(\D+?)[\s:]+(\d.*)$/.exec(line);
      return match?.[1] && match[2]
        ? { day: match[1].replace(/[:\s]+$/, ''), time: match[2] }
        : { day: line, time: null };
    });
}

/**
 * One of the search row's menus (the radius, the kinds): the reference's grey target with a
 * chevron opening a white panel under it. A disclosure with native inputs inside; Escape, a
 * click elsewhere or focus moving on closes it.
 */
function Menu({
  label,
  ariaLabel,
  open,
  onOpenChange,
  children,
  className,
  targetClassName,
  panelClassName,
}: {
  label: ReactNode;
  /** The target's name when its text alone says too little ("25 km"). */
  ariaLabel?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  className?: string;
  targetClassName?: string;
  panelClassName?: string;
}) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) onOpenChange(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open, onOpenChange]);

  return (
    <div
      ref={rootRef}
      className={cn('relative', className)}
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || !open) return;
        event.stopPropagation();
        onOpenChange(false);
        targetRef.current?.focus();
      }}
      onBlur={(event) => {
        const next = event.relatedTarget as Node | null;
        if (open && next && !event.currentTarget.contains(next)) onOpenChange(false);
      }}
    >
      <button
        ref={targetRef}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-label={ariaLabel}
        onClick={() => onOpenChange(!open)}
        className={cn(
          'flex h-11 w-full items-center justify-between gap-2.5 rounded-[0.3125rem] px-3 py-[0.3125rem] text-[1rem] font-medium whitespace-nowrap text-black',
          targetClassName,
        )}
      >
        {label}
        <ChevronDown
          aria-hidden
          className={cn('h-4 w-4 shrink-0 transition-transform', open && 'rotate-180')}
          strokeWidth={2}
        />
      </button>
      <div id={id} hidden={!open} className={cn(PANEL, panelClassName)}>
        {children}
      </div>
    </div>
  );
}

function StoreCard({
  store,
  selected,
  distance,
  onSelect,
  prominent = false,
}: {
  store: PublicStoreDto;
  selected: boolean;
  distance: number | null;
  onSelect: () => void;
  /** The only store: larger type and no list behaviour around it. */
  prominent?: boolean;
}) {
  const t = useTranslations('Stores');
  const tc = useTranslations('Common');
  const locale = useLocale();
  const addressId = useId();
  const picture = store.image ? imageSources(store.image, 640) : null;
  const rows = store.hours ? hoursRows(store.hours) : [];
  const km = new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: 'kilometer',
    maximumFractionDigits: 1,
  });
  const icon = 'mt-0.5 h-4 w-4 shrink-0 text-[#107e84]';

  return (
    <li
      data-store={store.id}
      aria-current={selected ? 'true' : undefined}
      className={cn(
        'border-b border-black/10 transition-colors',
        prominent ? 'p-6 min-[61.875rem]:p-8' : 'p-5',
        // The chosen store: the reference's teal bar on the left over the pointed-at shade.
        selected && !prominent
          ? 'bg-black/[0.02] shadow-[inset_4px_0_0_#107e84]'
          : 'bg-white hover:bg-black/[0.02]',
        prominent && 'border-b-0 hover:bg-white',
      )}
    >
      {picture && store.image && prominent ? (
        // eslint-disable-next-line @next/next/no-img-element -- pre-sized upload
        <img
          src={picture.src}
          srcSet={picture.srcSet}
          sizes="(min-width: 90rem) 36rem, (min-width: 61.875rem) 40vw, 92vw"
          width={store.image.width}
          height={store.image.height}
          alt={store.image.alt}
          loading="lazy"
          decoding="async"
          className="mb-5 aspect-[16/9] w-full rounded-[0.5rem] object-cover"
        />
      ) : null}
      <div className="flex justify-between gap-5">
        <div
          className={cn(
            'flex min-w-0 flex-1 flex-col font-medium',
            prominent
              ? 'gap-3.5 text-[1rem] leading-[1.45rem]'
              : 'gap-2.5 text-[0.875rem] leading-[1.15rem] min-[61.875rem]:max-w-[16rem]',
          )}
        >
          {store.kinds.length > 0 ? (
            <div>
              <p className="sr-only">{t('kindsGroup')}</p>
              <ul className="flex flex-wrap gap-1">
                {store.kinds.map((kind) => (
                  <li
                    key={kind}
                    className={cn(
                      'rounded-full px-2.5 pt-[0.3125rem] pb-0.5 text-[0.75rem] leading-3 font-semibold text-[#2f3a36]',
                      KIND_COLOURS[kind],
                    )}
                  >
                    {t(`kind.${kind}`)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <h2
            className={cn(
              'font-semibold text-black',
              prominent
                ? 'font-heading text-[1.75rem] leading-[2.1rem] [--display-weight:600]'
                : 'text-[1.125rem] leading-6',
            )}
          >
            <button
              type="button"
              onClick={onSelect}
              aria-describedby={addressId}
              className="text-left hover:underline hover:underline-offset-4"
            >
              {store.name}
            </button>
          </h2>
          {distance !== null ? (
            <p className="-mt-1 text-[0.75rem] text-black/70">
              {t('distance', { distance: km.format(distance) })}
            </p>
          ) : null}
          <p className="flex gap-2.5">
            <MapPin aria-hidden className={icon} />
            <span id={addressId} className="font-normal whitespace-pre-line text-black">
              {store.address}
            </span>
          </p>
          {rows.length > 0 ? (
            <div className="flex gap-2.5">
              <Clock aria-hidden className={icon} />
              <dl className="flex flex-col gap-1">
                {rows.map((row, index) =>
                  row.time ? (
                    <div key={index} className="flex gap-[0.3125rem]">
                      <dt className="w-[5.625rem] shrink-0 text-[#444]">{row.day}</dt>
                      <dd className="text-black">{row.time}</dd>
                    </div>
                  ) : (
                    <div key={index}>
                      <dt className="sr-only">{t('hours')}</dt>
                      <dd className="text-black">{row.day}</dd>
                    </div>
                  ),
                )}
              </dl>
            </div>
          ) : null}
          {store.phone ? (
            <p className="flex items-center gap-2.5">
              <Phone aria-hidden className={cn(icon, 'mt-0')} />
              <a
                href={`tel:${store.phone.replace(/[^\d+]/g, '')}`}
                className="py-0.5 font-semibold text-[#107e84] underline-offset-2 hover:underline"
              >
                {store.phone}
              </a>
            </p>
          ) : null}
          <p className="flex flex-wrap gap-2 pt-1">
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}`}
              target="_blank"
              rel="nofollow noopener noreferrer"
              className="rounded-[3.125rem] px-5 pt-2.5 pb-1.5 text-[1rem] leading-[1.05rem] font-medium text-white transition-shadow hover:shadow-[inset_0_0_50px_rgb(0_0_0_/_20%)]"
              style={{ backgroundColor: TEAL }}
            >
              {t('directions')}
              <span className="sr-only">
                {' '}
                — {store.name} ({tc('opensInNewTab')})
              </span>
            </a>
            <a
              href={`https://yandex.uz/maps/?pt=${store.longitude},${store.latitude}&z=17&l=map`}
              target="_blank"
              rel="nofollow noopener noreferrer"
              className="rounded-[3.125rem] border border-[#107e84] px-5 pt-[0.5625rem] pb-[0.3125rem] text-[1rem] leading-[1.05rem] font-medium text-[#107e84] transition-colors hover:bg-[#107e84]/[0.06]"
            >
              {t('yandex')}
              <span className="sr-only">
                {' '}
                — {store.name} ({tc('opensInNewTab')})
              </span>
            </a>
          </p>
        </div>
        {picture && store.image && !prominent ? (
          <div className="w-[40%] shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element -- pre-sized upload */}
            <img
              src={picture.src}
              srcSet={picture.srcSet}
              sizes="(min-width: 90rem) 13.5rem, (min-width: 61.875rem) 15vw, 40vw"
              width={store.image.width}
              height={store.image.height}
              alt={store.image.alt}
              loading="lazy"
              decoding="async"
              className="aspect-[201/149] w-full rounded-[0.3125rem] object-cover"
            />
          </div>
        ) : null}
      </div>
    </li>
  );
}

export function StoreLocator({ stores }: { stores: PublicStoreDto[] | null }) {
  const t = useTranslations('Stores');
  const locale = useLocale();
  const searchId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [radius, setRadius] = useState<number>(25);
  const [kinds, setKinds] = useState<StoreKind[]>([]);
  const [here, setHere] = useState<Position | null>(null);
  const [locating, setLocating] = useState<'idle' | 'busy' | 'denied' | 'failed'>('idle');
  // The only store starts chosen (its bubble open on the map).
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    stores?.length === 1 ? (stores[0]?.id ?? null) : null,
  );
  const [menu, setMenu] = useState<'radius' | 'kinds' | null>(null);

  const all = useMemo(() => stores ?? [], [stores]);
  // With one store there is nothing to search or filter.
  const single = all.length === 1;
  const present = STORE_KINDS.filter((kind) => all.some((store) => store.kinds.includes(kind)));
  const km = new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: 'kilometer',
    maximumFractionDigits: 0,
  });

  const shown = useMemo(() => {
    const terms = fold(query).split(/\s+/).filter(Boolean);
    const list = all
      .filter((store) => {
        const text = fold(`${store.name} ${store.address}`);
        return terms.every((term) => text.includes(term));
      })
      .filter((store) => kinds.length === 0 || store.kinds.some((kind) => kinds.includes(kind)))
      .map((store) => ({ store, distance: here ? distanceKm(here, store) : null }));
    if (!here) return list;
    return list
      .filter((item) => (item.distance ?? 0) <= radius)
      .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
  }, [all, here, kinds, query, radius]);

  const selected = shown.find((item) => item.store.id === selectedId)?.store ?? null;
  const filtered = query.trim() !== '' || kinds.length > 0 || here !== null;

  function locate() {
    if (!('geolocation' in navigator)) {
      setLocating('failed');
      return;
    }
    setLocating('busy');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setHere({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setLocating('idle');
      },
      (error) => setLocating(error.code === error.PERMISSION_DENIED ? 'denied' : 'failed'),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }

  function reset() {
    setQuery('');
    setKinds([]);
    setHere(null);
    setLocating('idle');
  }

  /** A pin chosen on the map: its store comes into view in the list when the list scrolls. */
  function selectFromMap(id: string | null) {
    setSelectedId(id);
    if (!id) return;
    requestAnimationFrame(() => {
      const list = listRef.current;
      const item = list?.querySelector<HTMLElement>(`[data-store="${id}"]`);
      if (!list || !item || list.scrollHeight <= list.clientHeight) return;
      const top = item.getBoundingClientRect().top - list.getBoundingClientRect().top;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      list.scrollTo({ top: list.scrollTop + top, behavior: reduce ? 'auto' : 'smooth' });
    });
  }

  let status: string;
  if (stores === null) status = t('unavailable');
  else status = t('found', { count: shown.length });

  // No stores entered yet: no search, radius or map with nothing on them — a calm card with the
  // ways to ask where to buy, as the bag's state while ordering goes by request.
  if (stores !== null && all.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-line px-6 py-10 sm:px-10 sm:py-12">
        <h2 className="font-heading text-[1.75rem] leading-tight text-balance text-fg sm:text-[2.25rem]">
          {t('emptyTitle')}
        </h2>
        <p className="mt-3 max-w-[36rem] text-[1.0625rem] leading-relaxed text-pretty text-fg-muted">
          {t('emptyText')}
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-x-7 gap-y-4">
          <Link
            href="/contact"
            className="pill-hover inline-flex h-12 items-center rounded-full bg-forest-900 px-7 text-[1rem] font-semibold text-ivory-50"
          >
            {t('emptyContact')}
          </Link>
          <Link
            href="/wholesale"
            className="inline-flex min-h-11 items-center text-[1rem] font-semibold text-forest-900 underline decoration-forest-900/35 underline-offset-[6px] hover:decoration-forest-900"
          >
            {t('emptyWholesale')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-[0.3125rem] border border-black/10 bg-white text-black shadow-[0_0_10px_rgb(0_0_0_/_3%)] min-[61.875rem]:grid min-[61.875rem]:grid-cols-[2fr_3fr]',
        single
          ? 'min-[61.875rem]:min-h-[32rem] min-[61.875rem]:grid-rows-[minmax(0,1fr)]'
          : 'min-[61.875rem]:h-[37.5rem] min-[61.875rem]:grid-rows-[auto_minmax(0,1fr)]',
      )}
    >
      <p role="status" className="sr-only">
        {status}
      </p>

      {/* The search row (not for a single store). */}
      <div
        hidden={single}
        className="relative z-10 order-1 border-b border-black/10 p-[0.3125rem] min-[61.875rem]:col-span-2 min-[61.875rem]:px-5 min-[61.875rem]:py-4"
      >
        <div className="flex flex-col gap-2.5 min-[61.875rem]:flex-row min-[61.875rem]:flex-wrap">
          <div className="flex flex-col rounded-[0.3125rem] bg-black/[0.03] min-[61.875rem]:flex-row">
            <div className="flex h-11 items-center rounded-[0.3125rem] has-[input:focus]:outline-2 has-[input:focus]:-outline-offset-2 has-[input:focus]:outline-[#107e84] min-[61.875rem]:w-[16.9375rem]">
              <label htmlFor={searchId} className="sr-only">
                {t('searchLabel')}
              </label>
              <Search
                aria-hidden
                className="mx-[0.9375rem] h-3.5 w-3.5 shrink-0 text-[#444]"
                strokeWidth={2.5}
              />
              <input
                id={searchId}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={here ? t('nearYou') : t('searchPlaceholder')}
                autoComplete="off"
                enterKeyHint="search"
                className="h-full min-w-0 flex-1 appearance-none bg-transparent pr-1 text-[1rem] font-medium text-black outline-none placeholder:text-[#757575] [&::-webkit-search-cancel-button]:hidden"
              />
              {query !== '' || here ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setHere(null);
                    setLocating('idle');
                  }}
                  aria-label={t('clearSearch')}
                  className="flex h-11 w-9 shrink-0 items-center justify-center text-[#444] hover:text-black"
                >
                  <X aria-hidden className="h-4 w-4" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={locate}
                aria-label={t('locate')}
                aria-pressed={here !== null}
                disabled={locating === 'busy'}
                className={cn(
                  'mr-1.5 flex h-11 w-9 shrink-0 items-center justify-center hover:text-black',
                  here ? 'text-[#107e84]' : 'text-[#444]',
                )}
              >
                {locating === 'busy' ? (
                  <LoaderCircle aria-hidden className="h-[1.125rem] w-[1.125rem] animate-spin" />
                ) : (
                  <LocateFixed aria-hidden className="h-[1.125rem] w-[1.125rem]" />
                )}
              </button>
            </div>
            <span
              aria-hidden
              className="mx-3 h-px bg-black/10 min-[61.875rem]:mx-0 min-[61.875rem]:my-2 min-[61.875rem]:h-auto min-[61.875rem]:w-0.5 min-[61.875rem]:bg-white"
            />
            <Menu
              label={km.format(radius)}
              ariaLabel={t('radiusTarget', { distance: km.format(radius) })}
              open={menu === 'radius'}
              onOpenChange={(open) => setMenu(open ? 'radius' : null)}
              className="min-[61.875rem]:w-[5.3125rem]"
              panelClassName="w-full min-[61.875rem]:w-[4.875rem]"
            >
              <fieldset>
                <legend className="sr-only">{t('radius')}</legend>
                {RADII.map((value) => (
                  <label
                    key={value}
                    className="flex h-10 cursor-pointer items-center px-4 text-[0.9375rem] font-medium whitespace-nowrap hover:bg-black/[0.03] has-checked:text-[#107e84] has-[:focus-visible]:bg-black/[0.05] has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-[#107e84]"
                  >
                    <input
                      type="radio"
                      name={`${searchId}-radius`}
                      value={value}
                      checked={radius === value}
                      onChange={() => setRadius(value)}
                      // A click picks and closes; the arrow keys only move the choice.
                      onClick={(event) => {
                        if (event.detail > 0) setMenu(null);
                      }}
                      className="sr-only"
                    />
                    {km.format(value)}
                  </label>
                ))}
              </fieldset>
            </Menu>
          </div>
          {present.length > 1 ? (
            <Menu
              label={kinds.length > 0 ? t('filterCount', { count: kinds.length }) : t('filter')}
              open={menu === 'kinds'}
              onOpenChange={(open) => setMenu(open ? 'kinds' : null)}
              targetClassName="bg-black/[0.03]"
              panelClassName="min-w-full"
            >
              <fieldset>
                <legend className="sr-only">{t('filter')}</legend>
                {present.map((kind) => (
                  <label
                    key={kind}
                    className="flex h-10 cursor-pointer items-center gap-2.5 px-4 text-[0.9375rem] font-medium whitespace-nowrap hover:bg-black/[0.03]"
                  >
                    <input
                      type="checkbox"
                      checked={kinds.includes(kind)}
                      onChange={(event) =>
                        setKinds((current) =>
                          event.target.checked
                            ? STORE_KINDS.filter((k) => k === kind || current.includes(k))
                            : current.filter((k) => k !== kind),
                        )
                      }
                      className="h-[0.9375rem] w-[0.9375rem] accent-[#107e84]"
                    />
                    {t(`kind.${kind}`)}
                  </label>
                ))}
              </fieldset>
            </Menu>
          ) : null}
        </div>
        {locating === 'denied' || locating === 'failed' ? (
          <p role="alert" className="px-1 pt-2 text-[0.875rem] text-[#b3261e]">
            {locating === 'denied' ? t('locateDenied') : t('locateFailed')}
          </p>
        ) : null}
      </div>

      {/* The stores. */}
      <div
        ref={listRef}
        role="region"
        aria-label={t('results')}
        className={cn(
          'min-[61.875rem]:order-none min-[61.875rem]:col-start-1 min-[61.875rem]:overflow-y-auto',
          // A single store's card comes before the map on phones; beside it, it stands in the
          // middle of the panel's height.
          single
            ? 'order-1 min-[61.875rem]:row-start-1 min-[61.875rem]:flex min-[61.875rem]:items-center [&>ul]:w-full'
            : 'order-3 min-[61.875rem]:row-start-2',
        )}
      >
        {stores === null ? (
          <div className="p-5 text-[0.9375rem]">{t('unavailable')}</div>
        ) : shown.length === 0 ? (
          <div className="flex flex-col items-start gap-3 p-5">
            <p className="text-[0.9375rem] leading-[1.4rem]">
              {here ? t('noneNear', { distance: km.format(radius) }) : t('noMatches')}
            </p>
            {filtered ? (
              <button
                type="button"
                onClick={reset}
                className="text-[0.9375rem] font-medium text-[#107e84] underline underline-offset-4"
              >
                {t('reset')}
              </button>
            ) : null}
          </div>
        ) : (
          <ul>
            {shown.map(({ store, distance }) => (
              <StoreCard
                key={store.id}
                store={store}
                distance={distance}
                selected={store.id === selectedId}
                onSelect={() => setSelectedId(store.id)}
                prominent={single}
              />
            ))}
          </ul>
        )}
      </div>

      {/* The map. */}
      <div
        className={cn(
          'order-2 border-black/10 min-[61.875rem]:order-none min-[61.875rem]:col-start-2 min-[61.875rem]:h-auto',
          single
            ? 'h-[20rem] border-t min-[61.875rem]:row-start-1 min-[61.875rem]:border-t-0 min-[61.875rem]:border-l'
            : 'h-[15.8125rem] border-b min-[61.875rem]:row-start-2 min-[61.875rem]:border-b-0',
        )}
      >
        <StoreMap
          points={shown.map(({ store }) => store)}
          selectedId={selected?.id ?? null}
          onSelect={selectFromMap}
          user={here}
          popup={selected ? { title: selected.name, text: selected.address } : null}
          labels={{
            region: t('map'),
            zoomIn: t('zoomIn'),
            zoomOut: t('zoomOut'),
            attribution: t('attribution'),
            close: t('close'),
          }}
        />
      </div>
    </div>
  );
}
