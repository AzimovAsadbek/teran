import Image from 'next/image';
import { cn } from '@/lib/cn';
import emblem from '../../../public/brand/teran-emblem.png';
import fullLogo from '../../../public/brand/teran-logo.png';
import wordmark from '../../../public/brand/teran-wordmark.png';

/**
 * The supplied TERAN artwork (transparent cut-outs of the original logo file). It is designed
 * for light backgrounds; on dark surfaces place it on an ivory plate (see LogoPlate).
 */
export function Wordmark({
  className,
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={wordmark}
      alt="TERAN"
      priority={priority}
      sizes="(min-width: 1024px) 190px, 140px"
      className={cn('h-auto w-[140px] lg:w-[190px]', className)}
    />
  );
}

export function Emblem({ className, sizes = '64px' }: { className?: string; sizes?: string }) {
  return (
    <Image src={emblem} alt="" aria-hidden sizes={sizes} className={cn('h-auto', className)} />
  );
}

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
export function LogoPlate({ className }: { className?: string }) {
  return (
    <div className={cn('inline-flex rounded-2xl bg-ivory-50 px-6 py-5 shadow-soft', className)}>
      <StackedLogo className="w-40" sizes="160px" />
    </div>
  );
}
