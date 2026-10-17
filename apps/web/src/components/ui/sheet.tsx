'use client';

import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { IconButton } from './button';

type Side = 'left' | 'right' | 'top';

/*
 * Each side states its own width (never a max-width override) so no utility can widen the panel.
 * Tailwind v4 moves panels with the `translate` property, which is what the transition animates.
 */
const PANEL: Record<Side, string> = {
  right:
    'ml-auto h-dvh w-[min(30rem,100vw)] translate-x-full open:translate-x-0 starting:open:translate-x-full',
  left: 'mr-auto h-dvh w-[min(26rem,100vw)] -translate-x-full open:translate-x-0 starting:open:-translate-x-full',
  top: 'mt-0 w-full -translate-y-3 opacity-0 open:translate-y-0 open:opacity-100 starting:open:-translate-y-3 starting:open:opacity-0',
};
/** The navigation drawer: most of a phone's width, leaving a strip of the page visible. */
const NARROW_LEFT =
  'mr-auto h-dvh w-[min(22.5rem,86vw)] -translate-x-full open:translate-x-0 starting:open:-translate-x-full';
/** A wider right-hand panel for editors with several columns of fields. */
const WIDE_RIGHT =
  'ml-auto h-dvh w-[min(60rem,100vw)] translate-x-full open:translate-x-0 starting:open:translate-x-full';

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
  /** Extra content in the header row, before the close button (e.g. an item count). */
  headerExtra?: ReactNode;
  /** No header row: the content provides its own close control (the title stays as the name). */
  bare?: boolean;
  /** Right-hand panel at up to 60rem instead of 30rem. */
  wide?: boolean;
  /** Left-hand panel at up to 22.5rem (86 % of a phone) instead of 26rem. */
  narrow?: boolean;
}

/**
 * Drawer on top of the native <dialog> element: top layer, inert background, Esc to close and
 * focus containment come from the browser. Focus returns to the opener. Used for the bag, the
 * mobile menu, filters, search and admin side panels.
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
  headerExtra,
  bare = false,
  wide = false,
  narrow = false,
}: SheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      const active = document.activeElement;
      // Focus returns here on close (nothing to return to if focus was on the page itself).
      openerRef.current = active instanceof HTMLElement && active !== document.body ? active : null;
      dialog.showModal();
      // As in Modal: a control marked data-autofocus (e.g. a form's first field) takes focus.
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
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
        'm-0 max-h-none max-w-none bg-transparent p-0 backdrop:bg-forest-950/45 backdrop:backdrop-blur-[2px]',
        'transition-[translate,opacity,overlay,display] duration-300 ease-[var(--ease-soft)] transition-discrete',
        side === 'right' && wide
          ? WIDE_RIGHT
          : side === 'left' && narrow
            ? NARROW_LEFT
            : PANEL[side],
      )}
    >
      <div
        className={cn(
          'flex h-full flex-col overflow-hidden bg-canvas text-fg shadow-overlay',
          side === 'top' ? 'max-h-[min(44rem,92dvh)] rounded-b-panel' : '',
          className,
        )}
      >
        {bare ? (
          <h2 id={titleId} className="sr-only">
            {title}
          </h2>
        ) : (
          <header className="flex items-center gap-3 border-b border-line px-5 py-3.5 sm:px-6">
            <h2
              id={titleId}
              className={cn(
                'min-w-0 flex-1 text-display-sm text-forest-900',
                hideTitle && 'sr-only',
              )}
            >
              {title}
            </h2>
            {headerExtra}
            <IconButton
              label={closeLabel}
              icon={<X />}
              onClick={onClose}
              className={cn('-mr-2', hideTitle && 'ml-auto')}
            />
          </header>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
        {footer ? (
          <div className="border-t border-line bg-surface px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
            {footer}
          </div>
        ) : null}
      </div>
    </dialog>
  );
}
