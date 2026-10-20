import { ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';

/**
 * Where to read on at the end of a page (About, Tea 101, an article): a line each, as two or three
 * quiet tiles, never the products again.
 */
export function FurtherLinks({
  label,
  links,
  frame = 'container-page',
}: {
  label: string;
  links: { href: string; label: string; text: string }[];
  /** The width it keeps: the page's container, or the frame of the page it ends (an article's). */
  frame?: string;
}) {
  return (
    <nav aria-label={label} className={cn(frame, 'py-14 lg:py-20')}>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:gap-5">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="group flex h-full items-start justify-between gap-6 rounded-[1.5rem] border border-line px-6 py-6 transition-colors duration-200 hover:border-forest-900 sm:px-8 sm:py-7"
            >
              <span>
                <span className="block font-heading text-[1.625rem] leading-tight text-fg sm:text-[2rem]">
                  {link.label}
                </span>
                <span className="mt-2 block max-w-[30rem] text-[1rem] leading-relaxed text-pretty text-fg-muted">
                  {link.text}
                </span>
              </span>
              <ArrowRight
                aria-hidden
                className="mt-2 h-6 w-6 shrink-0 text-forest-900 transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover:translate-x-1"
              />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
