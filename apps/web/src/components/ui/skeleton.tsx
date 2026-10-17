import { cn } from '@/lib/cn';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'animate-pulse rounded-sm bg-surface-sunken/60 motion-reduce:animate-none',
        className,
      )}
    />
  );
}

/** Placeholder with the same footprint as a product card. */
export function ProductCardSkeleton() {
  return (
    <div aria-hidden className="overflow-hidden rounded-[0.5rem] bg-surface shadow-card">
      <Skeleton className="aspect-square rounded-none rounded-t-[0.75rem]" />
      <div className="flex flex-col gap-1 p-2">
        <Skeleton className="my-1 h-4 w-1/3" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="my-1 h-4 w-1/2" />
      </div>
    </div>
  );
}

/** Placeholder with the same footprint as a grid of product cards (prevents layout shift). */
export function ProductGridSkeleton({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={cn('grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4', className)}
      aria-hidden
    >
      {Array.from({ length: count }, (_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}
