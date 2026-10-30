import { getMessages } from 'next-intl/server';
import type { ReactNode } from 'react';
import { MergeMessages } from './merge-messages';
import { pickMessages, type MessagePick, type Messages } from './messages';

/**
 * Gives the client components below it the messages they read beyond the layout's set (for
 * example a form's labels), so only the pages that render them carry those messages.
 */
export async function ClientMessages({
  pick,
  children,
}: {
  pick: readonly MessagePick[];
  children: ReactNode;
}) {
  const messages = (await getMessages()) as Messages;
  return <MergeMessages messages={pickMessages(messages, pick)}>{children}</MergeMessages>;
}
