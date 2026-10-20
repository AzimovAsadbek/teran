import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { ButtonLink } from './button';

type Action = { href: string; label: string };

/**
 * One way to say that a page has nothing to show (ADR-051): a missing page, the bag while orders
 * go by request, an order or a link that cannot be found, an error. A small label, the title in
 * TERAN's serif — larger than anything that follows it, so a row of products below never outranks
 * it — one sentence, then what to do: a primary pill and, where useful, a quieter second way.
 * Left on the page's margin, as every page opening.
 */
export function StateMessage({
  eyebrow,
  title,
  text,
  primary,
  secondary,
  headingLevel = 'h1',
  framed = true,
  className,
  children,
}: {
  eyebrow?: string;
  title: string;
  text?: ReactNode;
  /** A link, or a control of the page's own (a retry button). */
  primary: Action | ReactNode;
  secondary?: Action;
  headingLevel?: 'h1' | 'h2';
  /** In the page's container (false inside a page that already has one). */
  framed?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const Heading = headingLevel;
  return (
    <div className={cn(framed && 'container-page', 'py-14 sm:py-20 lg:py-24', className)}>
      <div className="max-w-[40rem]">
        {eyebrow ? (
          <p className="font-headline text-[0.9375rem] tracking-[0.14em] text-forest-900 uppercase">
            {eyebrow}
          </p>
        ) : null}
        <Heading
          className={cn(
            'font-heading text-[clamp(2.25rem,1.6rem+2.6vw,3.5rem)] leading-[1.05] text-balance text-fg',
            eyebrow && 'mt-3',
          )}
        >
          {title}
        </Heading>
        {text ? (
          <div className="mt-4 text-[1.125rem] leading-relaxed text-pretty text-fg-muted sm:text-[1.25rem]">
            {text}
          </div>
        ) : null}
        {children}
        <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4">
          {isAction(primary) ? (
            <ButtonLink href={primary.href} size="lg">
              {primary.label}
            </ButtonLink>
          ) : (
            primary
          )}
          {secondary ? (
            <Link
              href={secondary.href}
              className="inline-flex min-h-11 items-center text-[1rem] font-semibold text-forest-900 underline decoration-forest-900/35 underline-offset-[6px] hover:decoration-forest-900"
            >
              {secondary.label}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function isAction(value: Action | ReactNode): value is Action {
  return typeof value === 'object' && value !== null && 'href' in value && 'label' in value;
}
