'use client';

import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { IconButton } from './button';

const SIZES = {
  sm: 'w-[min(26rem,calc(100vw-2rem))]',
  md: 'w-[min(32rem,calc(100vw-2rem))]',
  lg: 'w-[min(44rem,calc(100vw-2rem))]',
} as const;

/**
 * Centred modal dialog on the native <dialog>: the browser traps focus, makes the page inert and
 * handles Esc; focus returns to the element that opened it. Put `autoFocus` on the field that
 * should receive focus first, otherwise the first focusable element does. While `dismissible` is
 * false (e.g. a request is running) Esc and backdrop clicks do nothing.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  closeLabel,
  size = 'md',
  dismissible = true,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  closeLabel: string;
  size?: keyof typeof SIZES;
  dismissible?: boolean;
  className?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      openerRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
      openerRef.current?.focus();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        if (dismissible) onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && dismissible) onClose();
      }}
      className={cn(
        'm-auto max-h-[min(46rem,calc(100dvh-2rem))] overflow-hidden rounded-panel bg-surface p-0 shadow-overlay',
        'backdrop:bg-forest-950/45 backdrop:backdrop-blur-[2px] open:animate-pop-in',
        SIZES[size],
        className,
      )}
    >
      <div className="flex max-h-[inherit] flex-col">
        <header className="flex items-start gap-3 px-6 pt-5 pb-1">
          <div className="min-w-0 flex-1 pt-1">
            <h2 id={titleId} className="text-display-sm text-forest-900">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-1.5 text-body-sm text-fg-muted">
                {description}
              </p>
            ) : null}
          </div>
          <IconButton
            label={closeLabel}
            icon={<X />}
            onClick={onClose}
            disabled={!dismissible}
            className="-mr-2"
          />
        </header>
        {children ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">{children}</div>
        ) : null}
        {footer ? (
          <footer className="flex flex-col-reverse gap-2 border-t border-line-subtle bg-surface-muted/50 px-6 py-4 sm:flex-row sm:justify-end">
            {footer}
          </footer>
        ) : null}
      </div>
    </dialog>
  );
}
