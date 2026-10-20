import { MessageSquare } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';

/** The header row of an option card: a 20 px teal icon, the title, 16 px of room. */
export const OPTION_HEADER = 'flex w-full items-center gap-[0.7rem] p-4 text-left text-[#121212]';
export const OPTION_HEADING = 'flex-1 text-[1rem] font-semibold';
export const OPTION_ICON = 'h-5 w-5 shrink-0 text-[#107e84]';
/** The cards' small text and their teal links (the reference's phone number). */
export const OPTION_SMALL = 'text-[0.875rem] leading-[1.4rem] font-medium text-[#121212]/80';
export const OPTION_LINK =
  'block w-fit text-[1rem] leading-[1.6rem] font-semibold text-[#107e84] transition-[color,text-decoration-color] duration-[125ms] ease-in-out hover:underline';

/** One of the reference's option cards: a header row over a rule, then its lines. */
export function OptionCard({ header, children }: { header: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-[0.75rem] border border-[#121212]/10">
      {header}
      <div className="border-t border-[#121212]/10" />
      <div className="flex flex-col gap-2 p-4">{children}</div>
    </div>
  );
}

/**
 * An option card whose header row leads to another page (the help centre's card leads to the
 * contact page): it greys slightly while pointed at, with a chevron at the end.
 */
export function LinkCard({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: ReactNode;
}) {
  return (
    <OptionCard
      header={
        <h2>
          <Link
            href={href}
            className={`${OPTION_HEADER} rounded-t-[0.75rem] transition-[background-color] duration-150 ease-[ease] hover:bg-[#121212]/5`}
          >
            <MessageSquare aria-hidden className={OPTION_ICON} strokeWidth={1.5} />
            <span className={`${OPTION_HEADING} leading-[1.0625rem]`}>{title}</span>
            <svg
              aria-hidden
              viewBox="0 0 8 12"
              className="h-3 w-2 shrink-0 text-[#121212]/80"
              fill="none"
            >
              <path
                d="m1.5 1 5 5-5 5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </h2>
      }
    >
      {children}
    </OptionCard>
  );
}
