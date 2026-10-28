'use client';

import { Fragment, useEffect, useState, type ReactNode } from 'react';

/**
 * A "new" form, empty each time it is opened (ADR-063). Next.js keeps a page visited before in
 * the document, hidden, with its state (cacheComponents), so the form would otherwise show what
 * was entered last time. Its effects are cleaned up when it is hidden: the form is put back
 * together then, and is empty when it is shown again.
 */
export function FreshEachVisit({ children }: { children: ReactNode }) {
  const [visit, setVisit] = useState(0);
  useEffect(() => () => setVisit((count) => count + 1), []);
  return <Fragment key={visit}>{children}</Fragment>;
}
