import type { ComponentProps } from 'react';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'gold' | 'ghost' | 'light' | 'outline-light';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-forest-900 text-ivory-50 hover:bg-forest-800 shadow-soft',
  secondary:
    'border border-forest-900/25 text-forest-900 hover:border-forest-900/60 hover:bg-forest-900/[0.04]',
  gold: 'bg-gold-500 text-forest-950 hover:bg-gold-400 shadow-soft',
  ghost: 'text-forest-900 hover:bg-forest-900/[0.06]',
  light: 'bg-ivory-50 text-forest-900 hover:bg-white shadow-soft',
  'outline-light':
    'border border-ivory-50/40 text-ivory-50 hover:border-ivory-50 hover:bg-ivory-50/10',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-xs',
  md: 'h-11 px-5 text-sm',
  lg: 'h-13 px-7 text-[0.95rem]',
};

export function buttonClasses(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className?: string,
): string {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-wide whitespace-nowrap',
    'transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-[var(--ease-soft)]',
    'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

type ButtonProps = ComponentProps<'button'> & { variant?: ButtonVariant; size?: ButtonSize };

export function Button({ variant, size, className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...props} />;
}

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize };

export function ButtonLink({ variant, size, className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />;
}
