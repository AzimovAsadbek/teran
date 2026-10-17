import { Loader2 } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';

/*
 * Buttons (docs/design/component-audit.md). One shape for every text button (a pill on the
 * storefront, 10 px in the admin area: --radius-button) and a circle for icon-only buttons.
 * Hierarchy comes from the variant, never from size alone:
 *   primary   main action of a view (forest)
 *   secondary second action, or main action on busy surfaces (outlined)
 *   accent    marketing call to action on dark or brand surfaces (gold)
 *   ghost     low-emphasis actions, toolbars
 *   link      inline action that reads as a link
 *   danger    destructive actions (delete, cancel order); danger-ghost when it is not the main action
 *   inverse / outline-inverse  on dark surfaces
 */

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'ghost'
  | 'link'
  | 'danger'
  | 'danger-ghost'
  | 'inverse'
  | 'outline-inverse'
  // Earlier names, kept so existing call sites keep their meaning.
  | 'gold'
  | 'light'
  | 'outline-light';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-fg-inverse shadow-xs hover:bg-brand-hover',
  secondary:
    'border border-brand/35 bg-surface/60 text-brand hover:border-brand hover:bg-brand/[0.04]',
  accent: 'bg-accent text-forest-950 shadow-xs hover:bg-accent-hover',
  ghost: 'text-brand hover:bg-brand/[0.06]',
  link: 'h-auto! px-0! text-brand underline decoration-brand/40 underline-offset-4 hover:decoration-brand',
  danger: 'bg-danger text-white shadow-xs hover:bg-danger/90',
  'danger-ghost': 'text-danger hover:bg-danger-soft',
  inverse: 'bg-ivory-50 text-forest-900 shadow-xs hover:bg-white',
  'outline-inverse':
    'border border-ivory-50/45 text-ivory-50 hover:border-ivory-50 hover:bg-ivory-50/10',
  gold: 'bg-accent text-forest-950 shadow-xs hover:bg-accent-hover',
  light: 'bg-ivory-50 text-forest-900 shadow-xs hover:bg-white',
  'outline-light':
    'border border-ivory-50/45 text-ivory-50 hover:border-ivory-50 hover:bg-ivory-50/10',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 gap-1.5 px-3.5 text-body-sm',
  md: 'h-11 gap-2 px-5 text-button',
  lg: 'h-13 gap-2 px-7 text-body',
};

const BASE =
  'inline-flex shrink-0 items-center justify-center rounded-button font-semibold whitespace-nowrap select-none ' +
  'transition-[background-color,border-color,color,box-shadow,translate] duration-150 ease-[var(--ease-standard)] ' +
  'active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 aria-busy:cursor-progress aria-busy:opacity-80';

export function buttonClasses(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className?: string,
): string {
  return cn(BASE, SIZES[size], VARIANTS[variant], className);
}

type ButtonProps = ComponentProps<'button'> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner, disables the button and marks it busy; the label stays for context. */
  loading?: boolean;
};

export function Button({
  variant,
  size,
  className,
  type = 'button',
  loading = false,
  disabled,
  children,
  onClick,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      // While loading the button stays focusable (a disabled button drops keyboard focus to the
      // page), but it is announced as unavailable and ignores further clicks and submits.
      disabled={disabled}
      aria-disabled={loading || undefined}
      aria-busy={loading || undefined}
      onClick={(event) => {
        if (loading) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
      className={buttonClasses(variant, size, className)}
      {...props}
    >
      {loading ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize };

export function ButtonLink({ variant, size, className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />;
}

export type IconButtonVariant = 'ghost' | 'outline' | 'solid' | 'inverse' | 'surface' | 'danger';
export type IconButtonSize = 'sm' | 'md' | 'lg';

const ICON_VARIANTS: Record<IconButtonVariant, string> = {
  ghost: 'text-fg hover:bg-brand/[0.06]',
  outline: 'border border-line-strong/60 bg-surface text-fg hover:border-brand',
  solid: 'bg-brand text-fg-inverse hover:bg-brand-hover',
  inverse: 'text-ivory-50 hover:bg-ivory-50/12',
  surface: 'bg-surface text-fg shadow-soft hover:bg-ivory-50',
  danger: 'text-danger hover:bg-danger-soft',
};

const ICON_SIZES: Record<IconButtonSize, string> = {
  sm: 'h-9 w-9 [&_svg]:h-4 [&_svg]:w-4',
  md: 'h-11 w-11 [&_svg]:h-5 [&_svg]:w-5',
  lg: 'h-12 w-12 [&_svg]:h-5 [&_svg]:w-5',
};

export function iconButtonClasses(
  variant: IconButtonVariant = 'ghost',
  size: IconButtonSize = 'md',
  className?: string,
): string {
  return cn(
    'inline-flex shrink-0 items-center justify-center rounded-full transition-[background-color,border-color,color,translate] duration-150 ease-[var(--ease-standard)]',
    'active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40',
    ICON_SIZES[size],
    ICON_VARIANTS[variant],
    className,
  );
}

type IconButtonProps = Omit<ComponentProps<'button'>, 'children' | 'aria-label'> & {
  /** Accessible name: icon-only buttons must always say what they do. */
  label: string;
  icon: ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  /** Small count shown on the icon (e.g. bag items); announced through `label`. */
  badge?: ReactNode;
  /** Increase to make the badge acknowledge a change with a brief pop (0: never). */
  badgeBump?: number;
};

export function IconButton({
  label,
  icon,
  variant,
  size,
  badge,
  badgeBump = 0,
  className,
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      // Position is left to the caller (e.g. `absolute` over an image) unless a badge needs an anchor.
      className={iconButtonClasses(variant, size, cn(badge ? 'relative' : undefined, className))}
      {...props}
    >
      {icon}
      {badge ? (
        // A new key restarts the pop animation; the first render never pops.
        <CountBadge key={badgeBump} bump={badgeBump > 0}>
          {badge}
        </CountBadge>
      ) : null}
    </button>
  );
}

/** Small numeric badge on an icon (bag count). Decorative: the parent's label carries the number. */
export function CountBadge({ children, bump = false }: { children: ReactNode; bump?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'absolute -top-0.5 -right-0.5 inline-flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-accent px-1 text-micro leading-none font-bold text-forest-950 figures ring-2 ring-canvas',
        bump && 'motion-safe:animate-badge-pop',
      )}
    >
      {children}
    </span>
  );
}
