import { cn } from '@/lib/cn';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'animate-pulse rounded-xl bg-ivory-200/70 motion-reduce:animate-none',
        className,
      )}
    />
  );
}

/** Placeholder with the same footprint as a row of product cards (prevents layout shift). */
export function ProductGridSkeleton({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={cn('grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 xl:grid-cols-4', className)}
      aria-hidden
    >
      {Array.from({ length: count }, (_, index) => (
        <div key={index}>
          <Skeleton className="aspect-square rounded-[var(--radius-card)]" />
          <Skeleton className="mt-4 h-3 w-1/3" />
          <Skeleton className="mt-2 h-5 w-3/4" />
          <Skeleton className="mt-3 h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}
