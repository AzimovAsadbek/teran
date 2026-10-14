import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type NoticeTone = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

const TONES: Record<NoticeTone, { box: string; icon: ReactNode }> = {
  info: { box: 'border-forest-700/15 bg-info-soft text-forest-900', icon: <Info aria-hidden /> },
  success: {
    box: 'border-success/20 bg-success-soft text-success',
    icon: <CircleCheck aria-hidden />,
  },
  warning: {
    box: 'border-gold-600/25 bg-warning-soft text-warning',
    icon: <TriangleAlert aria-hidden />,
  },
  danger: { box: 'border-danger/25 bg-danger-soft text-danger', icon: <CircleAlert aria-hidden /> },
  neutral: { box: 'border-line bg-surface-muted text-fg-muted', icon: <Info aria-hidden /> },
};

/**
 * Inline message (informational, success, warning or error). Pass `role="alert"` or `status`
 * only when the message appears in response to an action and must be announced.
 */
export function Notice({
  tone = 'info',
  title,
  children,
  role,
  compact = false,
  className,
}: {
  tone?: NoticeTone;
  title?: ReactNode;
  children?: ReactNode;
  role?: 'alert' | 'status' | 'note';
  compact?: boolean;
  className?: string;
}) {
  const { box, icon } = TONES[tone];
  return (
    <div
      role={role}
      className={cn(
        'flex items-start gap-3 rounded-control border',
        compact ? 'px-3.5 py-2.5 text-helper' : 'px-4 py-3.5 text-body-sm',
        box,
        className,
      )}
    >
      <span className={cn('mt-0.5 shrink-0 [&_svg]:h-4 [&_svg]:w-4')}>{icon}</span>
      <div className="min-w-0">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={title ? 'mt-0.5' : undefined}>{children}</div> : null}
      </div>
    </div>
  );
}
