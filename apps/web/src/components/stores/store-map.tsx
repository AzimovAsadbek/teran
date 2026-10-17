'use client';

import { Minus, Plus, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { cn } from '@/lib/cn';

/*
 * A small map of OpenStreetMap tiles for the store locator, written here rather than added as a
 * library: Web Mercator tiles (256 px) placed around a centre, dragged with the pointer (on touch
 * screens a swipe that starts sideways moves the map, one that starts upright scrolls the page),
 * zoomed with its buttons or a double click (or the wheel with Ctrl/⌘, so the page still scrolls),
 * the stores as teal pins grouped into numbered circles where they crowd, as the reference's map.
 * The tiles come from tile.openstreetmap.org (allowed in next.config.ts), with the attribution
 * OpenStreetMap asks for. The list beside it carries everything the map shows.
 *
 * Everything on the map is placed from the middle of its frame (`left: calc(50% + …px)`), so the
 * server can render the first tiles before the map is measured: they are fetched with the page,
 * not after its scripts, and nothing moves once the real size is known. On a zoom the tiles that
 * were showing stay underneath, scaled, until the new ones arrive, rather than a blank frame.
 */

const TILE = 256;
const MIN_ZOOM = 3;
const MAX_ZOOM = 18;
/** Uzbekistan, when there is nothing to show. */
const COUNTRY = { lat: 41.4, lng: 64.6, zoom: 5 };
/** The smallest map the page draws (a phone's): what the first, unmeasured render covers. */
const FIRST_BOX = { width: 360, height: 260 };

/** A spot on the map, `dx`/`dy` pixels from the middle of its frame. */
function fromMiddle(dx: number, dy: number) {
  return { left: `calc(50% + ${Math.round(dx)}px)`, top: `calc(50% + ${Math.round(dy)}px)` };
}

export interface MapPoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

interface Point {
  x: number;
  y: number;
}

function project(lat: number, lng: number, zoom: number): Point {
  const size = TILE * 2 ** zoom;
  const sin = Math.min(Math.max(Math.sin((lat * Math.PI) / 180), -0.9999), 0.9999);
  return {
    x: ((lng + 180) / 360) * size,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * size,
  };
}

function unproject(point: Point, zoom: number): { lat: number; lng: number } {
  const size = TILE * 2 ** zoom;
  const n = Math.PI - (2 * Math.PI * point.y) / size;
  return {
    lat: (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))),
    lng: (point.x / size) * 360 - 180,
  };
}

interface View {
  lat: number;
  lng: number;
  zoom: number;
}

interface Tile {
  key: string;
  src: string;
  /** The tile's top left corner on the world map at its zoom, in pixels. */
  x: number;
  y: number;
}

/** The tiles that cover a frame of `box` around the view's centre. */
function tilesFor(view: View, box: { width: number; height: number }): Tile[] {
  const centre = project(view.lat, view.lng, view.zoom);
  const count = 2 ** view.zoom;
  const list: Tile[] = [];
  const startX = Math.floor((centre.x - box.width / 2) / TILE);
  const endX = Math.floor((centre.x + box.width / 2) / TILE);
  const startY = Math.max(0, Math.floor((centre.y - box.height / 2) / TILE));
  const endY = Math.min(count - 1, Math.floor((centre.y + box.height / 2) / TILE));
  for (let x = startX; x <= endX; x++) {
    for (let y = startY; y <= endY; y++) {
      const wrapped = ((x % count) + count) % count;
      list.push({
        key: `${view.zoom}/${x}/${y}`,
        src: `https://tile.openstreetmap.org/${view.zoom}/${wrapped}/${y}.png`,
        x: x * TILE,
        y: y * TILE,
      });
    }
  }
  return list;
}

/** How many zoom levels apart the kept tiles may be (8× larger or smaller) and still help. */
const BACKDROP_LEVELS = 3;

/** The zoom and centre that show every point, with room around them. */
function fit(points: readonly MapPoint[], width: number, height: number): View {
  if (points.length === 0 || width === 0) return COUNTRY;
  if (points.length === 1) {
    const [only] = points;
    return { lat: only?.latitude ?? COUNTRY.lat, lng: only?.longitude ?? COUNTRY.lng, zoom: 14 };
  }
  for (let zoom = 15; zoom >= MIN_ZOOM; zoom--) {
    const projected = points.map((point) => project(point.latitude, point.longitude, zoom));
    const xs = projected.map((p) => p.x);
    const ys = projected.map((p) => p.y);
    const spanX = Math.max(...xs) - Math.min(...xs);
    const spanY = Math.max(...ys) - Math.min(...ys);
    if (spanX <= width - 120 && spanY <= height - 120) {
      const centre = unproject(
        { x: (Math.max(...xs) + Math.min(...xs)) / 2, y: (Math.max(...ys) + Math.min(...ys)) / 2 },
        zoom,
      );
      return { ...centre, zoom };
    }
  }
  return COUNTRY;
}

/** The reference's map pin, in TERAN's teal with a white heart. */
function Pin({ selected }: { selected: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 36 46"
      className={cn(
        'drop-shadow-[0_2px_3px_rgb(0_0_0_/_30%)] transition-transform duration-200',
        selected ? 'h-12 w-[2.35rem]' : 'h-10 w-[1.95rem]',
      )}
    >
      <path
        d="M18 1.5C9 1.5 1.8 8.6 1.8 17.5c0 11.2 13.7 25 15.1 26.4a1.6 1.6 0 0 0 2.2 0c1.4-1.4 15.1-15.2 15.1-26.4C34.2 8.6 27 1.5 18 1.5Z"
        fill={selected ? '#0b5a5e' : '#107e84'}
        stroke="#fff"
        strokeWidth="1.6"
      />
      <circle cx="18" cy="17.5" r="6" fill="#fff" />
    </svg>
  );
}

export function StoreMap({
  points,
  selectedId,
  onSelect,
  user,
  popup,
  labels,
}: {
  points: readonly MapPoint[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  user: { latitude: number; longitude: number } | null;
  /** What the chosen store's bubble says (its name and address), as the reference's info window. */
  popup: { title: string; text: string } | null;
  labels: { region: string; zoomIn: string; zoomOut: string; attribution: string; close: string };
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  // The frame's size once measured (null on the server and before the first measurement).
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [view, setView] = useState<View>(COUNTRY);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const box = size ?? FIRST_BOX;
  // The tiles drawn since the page started (keys), and the view a zoom left with those of its
  // tiles that had been drawn: they stay underneath until the new zoom's tiles are all drawn.
  const [arrived, setArrived] = useState<ReadonlySet<string>>(() => new Set());
  const [backdrop, setBackdrop] = useState<{ view: View; keys: ReadonlySet<string> } | null>(
    null,
  );
  const arrive = (key: string) =>
    setArrived((current) => (current.has(key) ? current : new Set(current).add(key)));

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize((current) =>
        current && current.width === width && current.height === height
          ? current
          : { width, height },
      );
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  // Frame the stores (and the visitor, once located) whenever what is shown changes, or the map's
  // size does noticeably; a store chosen in the list comes to the middle. Both adjust the view
  // while rendering, as React advises for state that follows props.
  const sizeKey = size ? `${Math.round(size.width / 100)}x${Math.round(size.height / 100)}` : '';
  const frameKey = `${points.map((point) => point.id).join(',')}|${user ? `${user.latitude},${user.longitude}` : ''}|${sizeKey}`;
  const [framed, setFramed] = useState<string | null>(null);
  if (frameKey !== framed) {
    setFramed(frameKey);
    const around = user ? [...points, { id: 'you', name: '', ...user }] : points;
    setView(fit(around, box.width, box.height));
  }
  const [centred, setCentred] = useState<string | null>(null);
  if (selectedId !== centred) {
    setCentred(selectedId);
    const point = points.find((candidate) => candidate.id === selectedId);
    if (point) {
      setView((current) => ({
        lat: point.latitude,
        lng: point.longitude,
        zoom: Math.max(current.zoom, 13),
      }));
    }
  }

  const centre = project(view.lat, view.lng, view.zoom);

  // The tiles under the frame (a phone's frame until it is measured).
  const tiles = useMemo(() => tilesFor(view, box), [view, box]);
  // While some are still on their way, the previous zoom's drawn tiles, scaled to this zoom.
  const underScale = backdrop ? 2 ** (view.zoom - backdrop.view.zoom) : 1;
  const under =
    backdrop &&
    backdrop.view.zoom !== view.zoom &&
    Math.abs(view.zoom - backdrop.view.zoom) <= BACKDROP_LEVELS &&
    tiles.some((tile) => !arrived.has(tile.key))
      ? tilesFor(backdrop.view, box).filter((tile) => backdrop.keys.has(tile.key))
      : [];

  // Pins, grouped where they would overlap (as the reference's numbered circles), from the middle.
  const groups = useMemo(() => {
    const placed = points.map((point) => {
      const p = project(point.latitude, point.longitude, view.zoom);
      return { point, x: p.x - centre.x, y: p.y - centre.y };
    });
    const result: { x: number; y: number; members: typeof placed }[] = [];
    for (const item of placed) {
      const near = result.find((group) => Math.hypot(group.x - item.x, group.y - item.y) < 40);
      if (near) {
        near.members.push(item);
        near.x = near.members.reduce((sum, m) => sum + m.x, 0) / near.members.length;
        near.y = near.members.reduce((sum, m) => sum + m.y, 0) / near.members.length;
      } else {
        result.push({ x: item.x, y: item.y, members: [item] });
      }
    }
    return result;
  }, [centre.x, centre.y, points, view.zoom]);

  /** Zooms in or out, keeping `anchor` (pixels from the middle) over the same place. */
  const zoomAt = useCallback(
    (to: number, anchor: Point = { x: 0, y: 0 }) => {
      const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, to));
      if (zoom === view.zoom) return;
      // The tiles drawn now stay underneath until the new zoom's arrive; with none drawn yet (a
      // second zoom in quick succession), the earlier ones stay.
      const drawn = new Set(
        [...(frameRef.current?.querySelectorAll<HTMLImageElement>('img[data-tile]') ?? [])]
          .filter((img) => img.complete && img.naturalWidth > 0)
          .map((img) => img.dataset.tile ?? ''),
      );
      setBackdrop((current) => (drawn.size > 0 || !current ? { view, keys: drawn } : current));
      setView((current) => {
        const before = project(current.lat, current.lng, current.zoom);
        const world = { x: before.x + anchor.x, y: before.y + anchor.y };
        const scale = 2 ** (zoom - current.zoom);
        return {
          ...unproject({ x: world.x * scale - anchor.x, y: world.y * scale - anchor.y }, zoom),
          zoom,
        };
      });
    },
    [view],
  );

  /** A pointer's place as pixels from the middle of the frame. */
  const fromPointer = (clientX: number, clientY: number): Point => {
    const frame = frameRef.current?.getBoundingClientRect();
    if (!frame) return { x: 0, y: 0 };
    return { x: clientX - frame.left - frame.width / 2, y: clientY - frame.top - frame.height / 2 };
  };

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const onWheel = (event: WheelEvent) => {
      // The page keeps scrolling; with Ctrl or ⌘ the wheel zooms the map.
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const rect = frame.getBoundingClientRect();
      zoomAt(view.zoom + (event.deltaY < 0 ? 1 : -1), {
        x: event.clientX - rect.left - rect.width / 2,
        y: event.clientY - rect.top - rect.height / 2,
      });
    };
    frame.addEventListener('wheel', onWheel, { passive: false });
    return () => frame.removeEventListener('wheel', onWheel);
  }, [view.zoom, zoomAt]);

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest('button, a')) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY };
  }
  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const last = drag.current;
    if (!last) return;
    const dx = event.clientX - last.x;
    const dy = event.clientY - last.y;
    drag.current = { x: event.clientX, y: event.clientY };
    setView((current) => {
      const p = project(current.lat, current.lng, current.zoom);
      return { ...unproject({ x: p.x - dx, y: p.y - dy }, current.zoom), zoom: current.zoom };
    });
  }
  function onPointerUp() {
    drag.current = null;
  }

  const userPoint = user ? project(user.latitude, user.longitude, view.zoom) : null;
  const chosen = groups.find(
    (group) => group.members.length === 1 && group.members[0]?.point.id === selectedId,
  );

  return (
    <div
      ref={frameRef}
      role="region"
      aria-label={labels.region}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={(event) => {
        if ((event.target as HTMLElement).closest('button, a')) return;
        zoomAt(view.zoom + 1, fromPointer(event.clientX, event.clientY));
      }}
      className="relative h-full w-full cursor-grab touch-pan-y overflow-hidden bg-[#e5e3df] select-none active:cursor-grabbing"
    >
      <div aria-hidden className="absolute inset-0">
        {under.map((tile) => (
          // eslint-disable-next-line @next/next/no-img-element -- map tiles, not page pictures
          <img
            key={`under:${tile.key}`}
            src={tile.src}
            alt=""
            width={TILE * underScale}
            height={TILE * underScale}
            draggable={false}
            decoding="async"
            className="absolute max-w-none"
            style={fromMiddle(tile.x * underScale - centre.x, tile.y * underScale - centre.y)}
          />
        ))}
        {tiles.map((tile) => (
          // eslint-disable-next-line @next/next/no-img-element -- map tiles, not page pictures
          <img
            key={tile.key}
            data-tile={tile.key}
            src={tile.src}
            alt=""
            width={TILE}
            height={TILE}
            draggable={false}
            decoding="async"
            // The first tiles are part of the page's first paint.
            fetchPriority="high"
            onLoad={() => arrive(tile.key)}
            onError={() => arrive(tile.key)}
            className="absolute max-w-none"
            style={fromMiddle(tile.x - centre.x, tile.y - centre.y)}
          />
        ))}
      </div>
      {userPoint ? (
        <span
          aria-hidden
          className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#1a73e8] shadow-[0_0_0_6px_rgb(26_115_232_/_20%)]"
          style={fromMiddle(userPoint.x - centre.x, userPoint.y - centre.y)}
        />
      ) : null}
      {groups.map((group) =>
        group.members.length > 1 ? (
          <button
            key={group.members.map((m) => m.point.id).join(',')}
            type="button"
            tabIndex={-1}
            aria-hidden
            onClick={() => zoomAt(view.zoom + 2, { x: group.x, y: group.y })}
            className="absolute flex h-[2.875rem] w-[2.875rem] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#107e84] text-[0.9375rem] font-semibold text-white shadow-[0_0_0_5px_rgb(16_126_132_/_30%)]"
            style={fromMiddle(group.x, group.y)}
          >
            {group.members.length}
          </button>
        ) : (
          <button
            key={group.members[0]?.point.id}
            type="button"
            tabIndex={-1}
            aria-hidden
            onClick={() => onSelect(group.members[0]?.point.id ?? null)}
            className={cn(
              'absolute -translate-x-1/2 -translate-y-full',
              group.members[0]?.point.id === selectedId && 'z-[1]',
            )}
            style={fromMiddle(group.x, group.y)}
          >
            <Pin selected={group.members[0]?.point.id === selectedId} />
          </button>
        ),
      )}
      {chosen && popup ? (
        // The chosen store's bubble, as the reference's info window; the list says the same.
        <div
          aria-hidden
          className="absolute z-[2] w-max max-w-[15rem] -translate-x-1/2 -translate-y-full rounded-lg bg-white py-3 pr-8 pl-3.5 text-left shadow-[0_2px_7px_1px_rgb(0_0_0_/_30%)] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-x-8 after:border-t-8 after:border-x-transparent after:border-t-white after:content-['']"
          style={fromMiddle(chosen.x, chosen.y - 56)}
        >
          <p className="text-[0.875rem] leading-[1.125rem] font-semibold text-black">
            {popup.title}
          </p>
          <p className="mt-1 text-[0.8125rem] leading-[1.0625rem] whitespace-pre-line text-[#444]">
            {popup.text}
          </p>
          <button
            type="button"
            tabIndex={-1}
            aria-label={labels.close}
            onClick={() => onSelect(null)}
            className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center text-[#666] hover:text-black"
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        </div>
      ) : null}
      {/* The reference's zoom controls: white squares at the top right. */}
      <div className="absolute top-2.5 right-2.5 flex flex-col overflow-hidden rounded-[0.125rem] bg-white shadow-[0_1px_4px_-1px_rgb(0_0_0_/_30%)]">
        <button
          type="button"
          aria-label={labels.zoomIn}
          onClick={() => zoomAt(view.zoom + 1)}
          className="flex h-10 w-10 items-center justify-center text-[#666] hover:text-black"
        >
          <Plus aria-hidden className="h-5 w-5" strokeWidth={2.5} />
        </button>
        <span aria-hidden className="mx-1.5 h-px bg-[#e6e6e6]" />
        <button
          type="button"
          aria-label={labels.zoomOut}
          onClick={() => zoomAt(view.zoom - 1)}
          className="flex h-10 w-10 items-center justify-center text-[#666] hover:text-black"
        >
          <Minus aria-hidden className="h-5 w-5" strokeWidth={2.5} />
        </button>
      </div>
      <p className="absolute right-0 bottom-0 bg-white/80 px-1.5 text-[0.6875rem] leading-4 text-[#333]">
        ©{' '}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          {labels.attribution}
        </a>
      </p>
    </div>
  );
}
