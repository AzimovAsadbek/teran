'use client';

import Form from 'next/form';
import type { ReactNode } from 'react';

const APPLY_AT_ONCE = new Set(['checkbox', 'radio', 'date', 'month']);

/**
 * A list's filters as a GET form, so every filter is part of the URL: lists can be bookmarked
 * and shared, and the back button works. Choosing an option, a date or a checkbox applies it at
 * once (no extra click); the search box applies on Enter or with the button. Navigation stays
 * inside the app, so the menu and its counts do not reload.
 */
export function FilterFormShell({
  action,
  className,
  children,
}: {
  action: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Form
      action={action}
      role="search"
      className={className}
      onSubmit={(event) => {
        // Empty filters stay out of the address: /admin/orders?status=NEW, not ?q=&status=NEW.
        const empty = [...event.currentTarget.elements].filter(
          (field): field is HTMLInputElement | HTMLSelectElement =>
            (field instanceof HTMLInputElement || field instanceof HTMLSelectElement) &&
            field.name !== '' &&
            field.value === '' &&
            !field.disabled,
        );
        for (const field of empty) field.disabled = true;
        window.setTimeout(() => {
          for (const field of empty) field.disabled = false;
        });
      }}
      onChange={(event) => {
        const field = event.target;
        if (
          field instanceof HTMLSelectElement ||
          (field instanceof HTMLInputElement && APPLY_AT_ONCE.has(field.type))
        ) {
          event.currentTarget.requestSubmit();
        }
      }}
    >
      {children}
    </Form>
  );
}
