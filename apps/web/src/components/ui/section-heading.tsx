import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';

/**
 * Section header used across the storefront: optional eyebrow, serif heading, short description
 * and an optional "see all" link aligned to the heading on wide screens.
 */
export function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  action,
  align = 'start',
  as: Heading = 'h2',
  inverse = false,
  className,
}: {
  id?: string;
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: { href: string; label: string };
  align?: 'start' | 'center';
  as?: 'h1' | 'h2' | 'h3';
  inverse?: boolean;
  className?: string;
}) {
  const centred = align === 'center';
  return (
    <div
      className={cn(
        'flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between',
        centred && 'items-center text-center sm:flex-col sm:items-center',
        className,
      )}
    >
      <div className={cn('max-w-2xl', centred && 'mx-auto')}>
        {eyebrow ? (
          <p
            className={cn(
              'mb-3 text-eyebrow',
              inverse ? 'text-accent-on-inverse' : 'text-accent-fg',
            )}
          >
            {eyebrow}
          </p>
        ) : null}
        <Heading
          id={id}
          className={cn('text-display-md', inverse ? 'text-fg-inverse' : 'text-forest-900')}
        >
          {title}
        </Heading>
        {description ? (
          <p
            className={cn(
              'mt-3 text-body-lg',
              inverse ? 'text-ivory-100/85' : 'text-fg-muted',
              centred && 'mx-auto',
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
      {action ? (
        <Link
          href={action.href}
          className={cn(
            'group inline-flex shrink-0 items-center gap-2 text-button underline-offset-4 hover:underline',
            inverse ? 'text-accent-on-inverse' : 'text-brand',
          )}
        >
          {action.label}
          <ArrowRight
            aria-hidden
            className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
          />
        </Link>
      ) : null}
    </div>
  );
}
