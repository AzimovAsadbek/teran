import { Briefcase } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';

/**
 * The way in for businesses where a buyer may be one (ADR-051): one line and the request form's
 * link — under a product's order button, and under the gift sets, where a company buying gifts
 * lands (TERAN sells mostly to hotels, cafés, shops and distributors; no terms are stated, none
 * are published). `href` may name the kind of business, so the form opens on it.
 */
export function BusinessLine({
  text,
  cta,
  href = '/wholesale#request',
  className,
}: {
  text: string;
  cta: string;
  href?: string;
  className?: string;
}) {
  return (
    <p
      className={cn(
        'flex items-start gap-2.5 rounded-[1rem] bg-jade-100 px-4 py-3 text-[0.9375rem] leading-6 text-teal-ink',
        className,
      )}
    >
      <Briefcase aria-hidden className="mt-1 h-4 w-4 shrink-0" />
      <span>
        {text}{' '}
        <Link
          href={href}
          className="font-semibold underline decoration-teal-ink/40 underline-offset-4 hover:decoration-teal-ink"
        >
          {cta}
        </Link>
      </span>
    </p>
  );
}
