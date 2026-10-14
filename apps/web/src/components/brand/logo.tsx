import Image from 'next/image';
import { cn } from '@/lib/cn';
import emblem from '../../../public/brand/teran-emblem.png';
import fullLogo from '../../../public/brand/teran-logo.png';
import wordmark from '../../../public/brand/teran-wordmark.png';

/**
 * The TERAN logo exactly as printed on the packaging (flat TERAN green, gold steam and saucer, red
 * ®), cut out of the print files by scripts/packaging/build-packaging-assets.mjs. It is designed
 * for light backgrounds; on dark surfaces place it on an ivory plate (see LogoPlate).
 */
export function Wordmark({
  className,
  priority = false,
  size = 'header',
}: {
  className?: string;
  priority?: boolean;
  /** `header`: 132 px, 176 px from 1280 px. `compact`: 120 px (admin, checkout on phones). */
  size?: 'header' | 'compact';
}) {
  return (
    <Image
      src={wordmark}
      alt="TERAN"
      priority={priority}
      sizes={size === 'compact' ? '120px' : '(min-width: 1280px) 176px, 132px'}
      className={cn(
        'h-auto',
        size === 'compact' ? 'w-[120px]' : 'w-[132px] xl:w-[176px]',
        className,
      )}
    />
  );
}

export function Emblem({ className, sizes = '64px' }: { className?: string; sizes?: string }) {
  return (
    <Image src={emblem} alt="" aria-hidden sizes={sizes} className={cn('h-auto', className)} />
  );
}

/** Cup emblem above the wordmark. */
export function StackedLogo({
  className,
  sizes = '240px',
}: {
  className?: string;
  sizes?: string;
}) {
  return <Image src={fullLogo} alt="TERAN" sizes={sizes} className={cn('h-auto', className)} />;
}

/** The logo on an ivory plate, for dark surfaces such as the footer. */
export function LogoPlate({
  className,
  logoClassName = 'w-40',
}: {
  className?: string;
  /** Width of the logo inside the plate (the plate's padding comes from `className`). */
  logoClassName?: string;
}) {
  return (
    <div
      className={cn('inline-flex rounded-card bg-ivory-50 shadow-soft', className ?? 'px-6 py-5')}
    >
      <StackedLogo className={logoClassName} sizes="160px" />
    </div>
  );
}
