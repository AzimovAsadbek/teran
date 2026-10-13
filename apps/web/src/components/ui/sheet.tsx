'use client';

import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Side = 'left' | 'right' | 'top';

const PANEL: Record<Side, string> = {
  right: 'ml-auto h-dvh max-h-dvh w-full max-w-[28rem] translate-x-full open:translate-x-0',
  left: 'mr-auto h-dvh max-h-dvh w-[min(24rem,100%)] -translate-x-full open:translate-x-0',
  top: 'mx-auto mt-0 w-full max-w-3xl -translate-y-4 opacity-0 open:translate-y-0 open:opacity-100 sm:mt-20 sm:rounded-[var(--radius-panel)]',
};

interface SheetProps {
  open: boolean;
  onClose: () => void;
  side: Side;
  /** Accessible name of the dialog (rendered as its visible heading). */
  title: ReactNode;
  closeLabel: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  /** Hide the visible title (it is still used as the accessible name). */
  hideTitle?: boolean;
}

/**
 * Modal side sheet on top of the native <dialog> element: top layer, inert background,
 * Esc to close and focus containment come from the browser. Focus returns to the opener.
 */
export function Sheet({
  open,
  onClose,
  side,
  title,
  closeLabel,
  children,
  footer,
  className,
  hideTitle = false,
}: SheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      openerRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={() => {
        onClose();
        openerRef.current?.focus();
      }}
      onClick={(event) => {
        // A click on the backdrop targets the <dialog> element itself.
        if (event.target === event.currentTarget) onClose();
      }}
      className={cn(
        'm-0 max-w-none bg-transparent p-0 backdrop:backdrop-blur-[2px]',
        'transition-[transform,opacity,overlay,display] duration-300 ease-[var(--ease-soft)] transition-discrete',
        'starting:open:translate-x-0',
        PANEL[side],
        side === 'right' ? 'starting:open:translate-x-full' : '',
        side === 'left' ? 'starting:open:-translate-x-full' : '',
        side === 'top' ? 'starting:open:-translate-y-4 starting:open:opacity-0' : '',
      )}
    >
      <div
        className={cn(
          'flex h-full flex-col overflow-hidden bg-ivory-50 text-ink-900 shadow-lift',
          side === 'top' ? 'max-h-[85dvh] sm:rounded-[var(--radius-panel)]' : '',
          className,
        )}
      >
        <header className="glass flex items-center justify-between gap-4 border-x-0 border-t-0 px-5 py-4">
          <h2
            id={titleId}
            className={cn('text-display-md text-[1.6rem] text-forest-900', hideTitle && 'sr-only')}
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto inline-flex h-11 w-11 items-center justify-center rounded-full text-forest-900 transition-colors hover:bg-forest-900/[0.06]"
            aria-label={closeLabel}
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
        {footer ? (
          <div className="border-t border-ivory-200 bg-ivory-50 px-5 py-4">{footer}</div>
        ) : null}
      </div>
    </dialog>
  );
}
