import { cn } from '@/lib/cn';

/** Where a sparkle sits in its banner (percentages of the banner) and its size in pixels. */
export interface SparklePoint {
  x: string;
  y: string;
  size: number;
}

/** A scattering beside the words of a centred or right-hand banner. */
export const SPARKLES_HIGH: SparklePoint[] = [
  { x: '8%', y: '12%', size: 22 },
  { x: '31%', y: '57%', size: 20 },
  { x: '34%', y: '66%', size: 30 },
];

/**
 * The reference's four-point sparkles, scattered over banners and slides. Decorative only; they
 * do not move (the reference's are still too).
 */
export function Sparkles({
  points,
  className = 'text-ivory-50',
}: {
  points: SparklePoint[];
  className?: string;
}) {
  return (
    <span aria-hidden className={cn('pointer-events-none absolute inset-0', className)}>
      {points.map((point) => (
        <svg
          key={`${point.x}-${point.y}`}
          viewBox="0 0 24 24"
          width={point.size}
          height={point.size}
          fill="currentColor"
          className="absolute -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_0_6px_rgb(255_255_255_/_0.55)]"
          style={{ left: point.x, top: point.y }}
        >
          <path d="M12 0c.8 6.4 5.6 11.2 12 12-6.4.8-11.2 5.6-12 12-.8-6.4-5.6-11.2-12-12C6.4 11.2 11.2 6.4 12 0Z" />
        </svg>
      ))}
    </span>
  );
}
