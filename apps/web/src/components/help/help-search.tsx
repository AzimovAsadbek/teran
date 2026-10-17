'use client';

import { FileText, Search, X } from 'lucide-react';
import { Fragment, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { matchArticles, type HelpSearchEntry } from './match';

export type { HelpSearchEntry } from './match';

export interface HelpSearchLabels {
  placeholder: string;
  label: string;
  clear: string;
  /** "More results for “{query}”" and "No articles match “{query}”": raw, filled in here. */
  more: string;
  none: string;
  /** "Results: {count}", announced as the list changes. */
  count: string;
}

const SHOWN = 4;

/** The title with the query's words in bold, as the reference's results. */
function Highlighted({ text, query }: { text: string; query: string }) {
  const words = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (words.length === 0) return <>{text}</>;
  const parts = text.split(new RegExp(`(${words.join('|')})`, 'gi'));
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <strong key={index} className="font-semibold">
            {part}
          </strong>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </>
  );
}

/**
 * The help centre's search as the reference's: a white box (`hero`: 520 by 52 px with a soft
 * shadow, over the banner; `bar`: 240 by 32 px with a light edge, beside the breadcrumbs) that
 * outlines in teal while in use and opens its first four matching articles underneath, then a
 * link to all the results; Enter goes to the results page. Arrow keys move through the results
 * and Escape closes them.
 */
export function HelpSearch({
  entries,
  labels,
  action,
  variant,
  initialQuery = '',
}: {
  entries: readonly HelpSearchEntry[];
  labels: HelpSearchLabels;
  /** The results page, for the form (it also works before scripts load). */
  action: string;
  variant: 'hero' | 'bar';
  initialQuery?: string;
}) {
  const router = useRouter();
  const id = useId();
  const [query, setQuery] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const results = useMemo(() => matchArticles(entries, query), [entries, query]);
  const showing = open && query.trim().length >= 2;
  const hero = variant === 'hero';
  const fill = (template: string) => template.replace('{query}', query.trim());

  const links = () => [...(listRef.current?.querySelectorAll<HTMLAnchorElement>('a') ?? [])];
  function onInputKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') setOpen(false);
    if (event.key === 'ArrowDown' && showing) {
      event.preventDefault();
      links()[0]?.focus();
    }
  }
  function onListKey(event: KeyboardEvent<HTMLUListElement>) {
    const all = links();
    const at = all.indexOf(document.activeElement as HTMLAnchorElement);
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      all[Math.min(at + 1, all.length - 1)]?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (at <= 0) inputRef.current?.focus();
      else all[at - 1]?.focus();
    } else if (event.key === 'Escape') {
      setOpen(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div
      className={cn(
        'relative w-full',
        hero ? 'h-[3.25rem] max-w-[32.5rem]' : 'h-8 min-[48rem]:w-60',
      )}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <div
        className={cn(
          'absolute inset-x-0 top-0 z-20 rounded-[0.25rem] bg-white',
          hero
            ? 'shadow-[0_2px_4px_rgb(22_22_22_/_16%)] focus-within:ring-2 focus-within:ring-[#02b1af]'
            : 'border border-[#ddd] focus-within:border-[#02b1af]',
          !hero && showing && 'w-[min(25rem,calc(100vw-2rem))] min-[48rem]:left-auto',
        )}
      >
        <form
          role="search"
          action={action}
          method="get"
          onSubmit={(event) => {
            event.preventDefault();
            if (query.trim()) router.push({ pathname: '/faq/search', query: { q: query.trim() } });
          }}
          className={cn('flex items-center', hero ? 'h-[3.25rem] px-4' : 'h-[1.875rem] px-2')}
        >
          <Search
            aria-hidden
            className={cn('shrink-0 text-[#6a6a6a]', hero ? 'h-6 w-6' : 'h-5 w-5')}
            strokeWidth={1.75}
          />
          <label htmlFor={`${id}-input`} className="sr-only">
            {labels.label}
          </label>
          <input
            ref={inputRef}
            id={`${id}-input`}
            name="q"
            type="search"
            autoComplete="off"
            value={query}
            placeholder={labels.placeholder}
            aria-controls={showing ? `${id}-results` : undefined}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onInputKey}
            className={cn(
              'mx-2 min-w-0 flex-1 bg-transparent text-black outline-none placeholder:text-[#6a6a6a] [&::-webkit-search-cancel-button]:hidden',
              hero ? 'text-[1rem] leading-6' : 'text-[0.875rem] leading-5',
            )}
          />
          {query ? (
            <button
              type="button"
              aria-label={labels.clear}
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="-m-1 flex shrink-0 items-center justify-center p-1 text-black"
            >
              <X aria-hidden className={hero ? 'h-6 w-6' : 'h-4 w-4'} strokeWidth={2} />
            </button>
          ) : null}
        </form>
        {showing ? (
          <div id={`${id}-results`} className="pb-2">
            <p className="sr-only" aria-live="polite">
              {results.length === 0
                ? fill(labels.none)
                : labels.count.replace('{count}', String(results.length))}
            </p>
            {results.length === 0 ? (
              <p className="px-6 py-4 text-[0.875rem] leading-5 text-[#6a6a6a]">
                {fill(labels.none)}
              </p>
            ) : (
              <ul ref={listRef} onKeyDown={onListKey}>
                {results.slice(0, SHOWN).map((entry) => (
                  <li key={entry.href}>
                    <Link
                      href={entry.href}
                      onClick={() => setOpen(false)}
                      className="flex gap-3 px-6 py-3 outline-offset-[-2px] transition-colors duration-150 hover:bg-[#f9f9f9] focus-visible:bg-[#f9f9f9]"
                    >
                      <FileText
                        aria-hidden
                        className="mt-0.5 h-5 w-5 shrink-0 text-[#6a6a6a]"
                        strokeWidth={1.5}
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-[1rem] leading-6 text-[#161616]">
                          <Highlighted text={entry.title} query={query} />
                        </span>
                        <span className="block text-[0.8125rem] leading-5 text-[#6a6a6a]">
                          {entry.trail}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href={{ pathname: '/faq/search', query: { q: query.trim() } }}
                    onClick={() => setOpen(false)}
                    className="block px-6 pt-4 pb-3 text-center text-[1rem] leading-6 text-[#107e84] outline-offset-[-2px] hover:underline"
                  >
                    {fill(labels.more)}
                  </Link>
                </li>
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
