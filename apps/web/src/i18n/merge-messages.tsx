'use client';

import { NextIntlClientProvider, useLocale, useMessages, useTimeZone } from 'next-intl';
import { useMemo, type ReactNode } from 'react';
import type { PickedMessages } from './messages';

/**
 * Adds messages to those of the enclosing provider. A nested NextIntlClientProvider replaces its
 * parent's messages instead of merging them, so the merge happens here and the server only sends
 * the additional messages. Namespaces are merged one level deep: a namespace the parent holds in
 * part ("Validation.invalid_email") keeps its entries when this provider adds more of it. The time
 * zone is passed on too: a provider rendered in the browser does not inherit the server's.
 */
export function MergeMessages({
  messages,
  children,
}: {
  messages: PickedMessages;
  children: ReactNode;
}) {
  const locale = useLocale();
  const timeZone = useTimeZone();
  const inherited = useMessages();
  const merged = useMemo(() => {
    const result: Record<string, object> = { ...inherited };
    for (const [namespace, entries] of Object.entries(messages)) {
      result[namespace] = { ...result[namespace], ...entries };
    }
    return result;
  }, [inherited, messages]);

  return (
    <NextIntlClientProvider locale={locale} timeZone={timeZone} messages={merged}>
      {children}
    </NextIntlClientProvider>
  );
}
