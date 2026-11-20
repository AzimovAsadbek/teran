'use client';

import { Pause, Play } from 'lucide-react';
import { useEffect } from 'react';
import { cn } from '@/lib/cn';
import { setMotionPaused, useFilmsAllowed, useMotionPaused } from '@/lib/motion';

/**
 * Pauses every film on the storefront, or lets them move again (lib/motion): a link-like switch
 * in the footer, the one way to stop the films and the moving ribbons (they have no buttons of
 * their own, the owner's choice; WCAG 2.2.2). The same control lets a visitor enable motion
 * when the operating system defaults to reduced motion.
 */
export function MotionToggle({
  labels,
  className,
}: {
  labels: { pause: string; play: string };
  className?: string;
}) {
  const allowed = useFilmsAllowed();
  const paused = useMotionPaused();
  // The page's own moving parts (the ribbons on the home and wholesale pages) follow the switch
  // through this attribute (globals.css).
  useEffect(() => {
    document.documentElement.toggleAttribute('data-motion-paused', paused);
  }, [paused]);
  const stopped = !allowed || paused;
  const Icon = stopped ? Play : Pause;
  return (
    <button
      type="button"
      onClick={() => setMotionPaused(!stopped)}
      aria-pressed={stopped}
      className={cn(
        'inline-flex items-center gap-1.5 text-[0.875rem] leading-[1.3125rem] font-medium hover:underline hover:underline-offset-[3px] min-[61.875rem]:text-[0.84375rem]',
        className,
      )}
    >
      <Icon aria-hidden className="h-3.5 w-3.5 fill-current" />
      {stopped ? labels.play : labels.pause}
    </button>
  );
}
