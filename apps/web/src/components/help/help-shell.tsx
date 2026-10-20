'use client';

import { ChevronsLeft } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';

export interface HelpNavCategory {
  id: string;
  heading: string;
  href: string;
  articles: readonly { href: string; title: string }[];
}

/** The teal "list" mark that opens the help centre's article list. */
function ListMark({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 16 10" className={className} fill="currentColor">
      {[1, 5, 9].map((y) => (
        <g key={y}>
          <circle cx="1.3" cy={y} r="0.9" />
          <rect x="4" y={y - 0.75} width="12" height="1.5" rx="0.75" />
        </g>
      ))}
    </svg>
  );
}

/** A caret that points down while its category is open. */
function Caret({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 10 6"
      className={cn('h-1.5 w-2.5 transition-transform duration-200', !open && '-rotate-90')}
      fill="currentColor"
    >
      <path d="M0 0h10L5 6z" />
    </svg>
  );
}

/**
 * The frame of the help centre's inner pages (all articles, a group, an answer, search), in a
 * 1200 px column: from 768 px a teal list mark at the left opens the list of questions (308 px:
 * "All articles" with a button to fold it away, then each group, the current one open on its
 * questions and lit in pale teal, under a teal rule); the page sits to its right.
 */
export function HelpShell({
  categories,
  current,
  labels,
  children,
}: {
  categories: readonly HelpNavCategory[];
  /** The address of the page shown (a category or an article), to mark it in the list. */
  current?: string;
  labels: { open: string; close: string; sidebar: string; allArticles: string };
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const currentCategory = categories.find(
    (category) =>
      category.href === current || category.articles.some((article) => article.href === current),
  );
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(
    () => new Set(currentCategory ? [currentCategory.id] : []),
  );

  return (
    <div className="mx-auto flex w-full max-w-[75rem] px-4 pb-14 min-[48rem]:px-6 min-[78rem]:px-0">
      <div className="hidden shrink-0 min-[48rem]:block">
        {open ? (
          <nav aria-label={labels.sidebar} className="w-[19.25rem] pt-6 pr-2">
            <div className="flex items-center justify-between pl-0">
              <p className="font-heading text-[1.25rem] leading-7 text-fg">{labels.allArticles}</p>
              <button
                type="button"
                aria-label={labels.close}
                aria-expanded
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center text-forest-900"
              >
                <ChevronsLeft aria-hidden className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>
            <ul className="mt-6 border-l-2 border-forest-900 pl-[0.5625rem]">
              {categories.map((category) => {
                const isOpen = expanded.has(category.id);
                const here = category.id === currentCategory?.id;
                return (
                  <li key={category.id}>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        aria-label={category.heading}
                        onClick={() =>
                          setExpanded((previous) => {
                            const next = new Set(previous);
                            if (next.has(category.id)) next.delete(category.id);
                            else next.add(category.id);
                            return next;
                          })
                        }
                        className="flex h-10 w-4 shrink-0 items-center justify-center text-fg-subtle"
                      >
                        <Caret open={isOpen} />
                      </button>
                      <Link
                        href={category.href}
                        aria-current={category.href === current ? 'page' : undefined}
                        className={cn(
                          'flex-1 rounded-[0.25rem] px-2 py-2 text-[1rem] leading-6 font-semibold text-fg hover:underline',
                          here && 'bg-jade-100',
                        )}
                      >
                        {category.heading}
                      </Link>
                    </div>
                    {isOpen ? (
                      <ul className="pb-2 pl-6">
                        {category.articles.map((article) => (
                          <li key={article.href}>
                            <Link
                              href={article.href}
                              aria-current={article.href === current ? 'page' : undefined}
                              className={cn(
                                'block rounded-[0.25rem] px-2 py-2 text-[1rem] leading-6 text-fg hover:underline',
                                article.href === current && 'bg-jade-100 font-semibold',
                              )}
                            >
                              {article.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </nav>
        ) : (
          <button
            type="button"
            aria-label={labels.open}
            aria-expanded={false}
            onClick={() => setOpen(true)}
            className="mx-1 mt-6 flex h-11 w-11 items-center justify-center text-forest-900"
          >
            <ListMark className="h-[0.625rem] w-4" />
          </button>
        )}
      </div>
      <div className="min-w-0 flex-1 min-[48rem]:p-6">{children}</div>
    </div>
  );
}
