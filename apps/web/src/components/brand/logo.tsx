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
  eager = false,
  size = 'header',
  sizes,
}: {
  className?: string;
  /** Above the fold on every page: loaded at once, but without taking priority over the page's main picture. */
  eager?: boolean;
  /** `header`: 112 px; 144 px from 1280 px; 160 px from 1440 px. `compact`: 120 px (admin, checkout on phones). */
  size?: 'header' | 'compact';
  /** The drawn width, where `className` makes it wider or narrower than `size` (so it stays sharp). */
  sizes?: string;
}) {
  return (
    <Image
      src={wordmark}
      alt="TERAN"
      loading={eager ? 'eager' : undefined}
      sizes={
        sizes ??
        (size === 'compact'
          ? '120px'
          : '(min-width: 1440px) 160px, (min-width: 1280px) 144px, 112px')
      }
      className={cn(
        'h-auto',
        size === 'compact' ? 'w-[120px]' : 'w-[112px] xl:w-[144px] min-[90rem]:w-[160px]',
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
