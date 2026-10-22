'use client';

import { contactInquirySchema, type Locale } from '@teran/contracts';
import { Send, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { Wordmark } from '@/components/brand/logo';
import { Honeypot, honeypotValue } from '@/components/forms/form-success';
import { PREMIUM_COLLECTION_SLUG } from '@/content/brand';
import { deliveryPage } from '@/content/pages/delivery';
import { useFormSubmission } from '@/features/forms/use-form-submission';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { useMatches } from '@/lib/motion';
import { showPrices } from '@/lib/site';
import { useValidationMessage } from '@/lib/use-validation-message';
import type { ChatChannel } from './chat-types';

/** The quick answers the window offers, as chips under the conversation. */
const TOPICS = ['shipping', 'ordering', 'business'] as const;
type Topic = (typeof TOPICS)[number];

/** One turn of the conversation: a quick answer asked for, or a message sent to TERAN. */
type Turn =
  | { id: number; kind: 'topic'; topic: Topic }
  | { id: number; kind: 'message'; text: string; name: string };

const EMPTY = { name: '', phone: '', message: '' };

/** Frosted controls on the teal window. */
const CHIP =
  'inline-flex min-h-9 items-center rounded-full bg-white/60 px-4 text-[0.8125rem] leading-none font-semibold text-fg transition-colors duration-200 hover:bg-white/80';
const ROUND =
  'flex h-9 w-9 items-center justify-center rounded-full bg-white/60 text-fg transition-colors duration-200 hover:bg-white/80';
const FIELD =
  'h-10 w-full min-w-0 rounded-full bg-white/85 px-4 text-[0.9375rem] text-fg outline-none placeholder:text-black/60 focus-visible:ring-2 focus-visible:ring-white aria-invalid:ring-2 aria-invalid:ring-[#ffd2cc]';
const TERAN_BUBBLE =
  'max-w-[92%] self-start rounded-[1.25rem] rounded-bl-md bg-white/90 px-4 py-2.5 text-[0.9375rem] leading-snug text-fg';
const VISITOR_BUBBLE =
  'max-w-[85%] self-end rounded-[1.25rem] rounded-br-md bg-[#075e5d] px-4 py-2.5 text-[0.9375rem] leading-snug text-white';
const BUBBLE_LINK = 'font-semibold text-[#0b5a5e] underline underline-offset-2';

/**
 * TERAN's chat window (the whole screen on phones, a 384 px window in the corner from 640 px) on
 * the brand's teals: close at the top, TERAN's white wordmark, the conversation opening on a
 * greeting, chips for the quick answers (delivery, ordering, business — TERAN's own words, with
 * the way on), and a message to TERAN: a name, a phone and the question, sent as a contact
 * enquiry (the contact page's), answered by TERAN in person. No AI and no conversation kept
 * beyond the page (ADR-054). Escape closes it; it takes focus on opening. On a phone, where it is
 * the whole screen, it is modal: the page behind it is out of reach (inert) until it closes.
 */
export default function ChatPanel({
  open,
  channels,
  onClose,
}: {
  open: boolean;
  channels: ChatChannel[];
  onClose: () => void;
}) {
  const t = useTranslations('Chat');
  const tf = useTranslations('Forms');
  const locale = useLocale() as Locale;
  const message = useValidationMessage();
  const id = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const questionRef = useRef<HTMLTextAreaElement>(null);
  const logRef = useRef<HTMLOListElement>(null);
  const form = useFormSubmission(formRef);
  const [values, setValues] = useState(EMPTY);
  const [turns, setTurns] = useState<Turn[]>([]);
  const counter = useRef(0);
  // Below 640 px the window covers the screen.
  const whole = useMatches('(max-width: 39.99rem)') === true;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !whole || !dialog) return;
    let own: Element = dialog;
    while (own.parentElement && own.parentElement !== document.body) own = own.parentElement;
    const held = Array.from(document.body.children).filter(
      (element): element is HTMLElement =>
        element !== own && element instanceof HTMLElement && !element.inert,
    );
    for (const element of held) element.inert = true;
    return () => {
      for (const element of held) element.inert = false;
    };
  }, [open, whole]);

  useEffect(() => {
    if (!open) return;
    questionRef.current?.focus();
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    const last = logRef.current?.lastElementChild;
    if (last instanceof HTMLElement) last.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [turns]);

  const payload = { ...values, email: '', subject: t('subject'), locale };
  const live = form.errorsFor(payload);
  const error = (key: keyof typeof EMPTY) => message(live[key], values[key]) ?? undefined;
  const problem = error('name') ?? error('phone') ?? error('message') ?? form.apiErrorMessage;
  const set =
    (key: keyof typeof EMPTY) =>
    (event: { target: { value: string } }): void =>
      setValues((current) => ({ ...current, [key]: event.target.value }));

  function ask(topic: Topic) {
    setTurns((current) => [...current, { id: ++counter.current, kind: 'topic', topic }]);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const sent = await form.submit(
      contactInquirySchema,
      { ...payload, website: honeypotValue(event.currentTarget) },
      '/inquiries/contact',
    );
    if (!sent) return;
    const turn: Turn = {
      id: ++counter.current,
      kind: 'message',
      text: values.message.trim(),
      name: values.name.trim(),
    };
    setTurns((current) => [...current, turn]);
    setValues((current) => ({ ...current, message: '' }));
    form.reset();
  }

  // Enter sends, as in a chat; Shift+Enter starts a new line.
  function onQuestionKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    formRef.current?.requestSubmit();
  }

  const invalid = (key: keyof typeof EMPTY) => (error(key) ? true : undefined);
  const describedBy = (key: keyof typeof EMPTY) => (error(key) ? `${id}-problem` : undefined);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal={whole}
      aria-labelledby={`${id}-title`}
      hidden={!open}
      className="fixed inset-0 z-[61] flex flex-col overflow-hidden bg-[linear-gradient(180deg,#14a3a3_0%,#107e84_52%,#0b5a5e_100%)] text-fg sm:inset-auto sm:right-[2.1875rem] sm:bottom-[2.1875rem] sm:h-[min(40rem,calc(100dvh-4.375rem))] sm:w-96 sm:rounded-[2rem] sm:shadow-[0_12px_40px_rgb(0_0_0_/_22%)] print:hidden"
    >
      <h2 id={`${id}-title`} className="sr-only">
        {t('title')}
      </h2>
      <div className="flex justify-end px-4 pt-4">
        <button type="button" aria-label={t('close')} onClick={onClose} className={ROUND}>
          <X aria-hidden className="h-[1.125rem] w-[1.125rem]" strokeWidth={2} />
        </button>
      </div>
      <div className="flex justify-center">
        <Wordmark size="compact" sizes="160px" className="w-40! brightness-0 invert" />
      </div>

      <ol
        ref={logRef}
        aria-live="polite"
        className="mt-5 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-4 pb-3"
      >
        <li className="flex flex-col">
          <p className={TERAN_BUBBLE}>
            <span className="sr-only">{t('advisor')}: </span>
            {t('greeting')}
          </p>
        </li>
        {turns.map((turn) => (
          <li key={turn.id} className="flex flex-col gap-2">
            <p className={VISITOR_BUBBLE}>
              <span className="sr-only">{t('you')}: </span>
              {turn.kind === 'topic' ? t(turn.topic) : turn.text}
            </p>
            {turn.kind === 'topic' ? (
              <Answer topic={turn.topic} channels={channels} />
            ) : (
              <p className={TERAN_BUBBLE}>
                <span className="sr-only">{t('advisor')}: </span>
                {t('sent', { name: turn.name })}
              </p>
            )}
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap gap-2 px-4 pb-3">
        {TOPICS.map((topic) => (
          <button key={topic} type="button" onClick={() => ask(topic)} className={CHIP}>
            {t(topic)}
          </button>
        ))}
      </div>

      <form
        ref={formRef}
        method="post"
        onSubmit={onSubmit}
        noValidate
        className="mx-4 flex flex-col gap-2"
      >
        <div className="grid grid-cols-2 gap-2">
          <label htmlFor={`${id}-name`} className="sr-only">
            {tf('name')}
          </label>
          <input
            id={`${id}-name`}
            name="name"
            autoComplete="name"
            placeholder={tf('name')}
            value={values.name}
            onChange={set('name')}
            aria-invalid={invalid('name')}
            aria-describedby={describedBy('name')}
            className={FIELD}
          />
          <label htmlFor={`${id}-phone`} className="sr-only">
            {tf('phone')}
          </label>
          <input
            id={`${id}-phone`}
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+998 90 123 45 67"
            value={values.phone}
            onChange={set('phone')}
            aria-invalid={invalid('phone')}
            aria-describedby={describedBy('phone')}
            className={FIELD}
          />
        </div>
        <div className="flex items-end gap-1 rounded-[1.25rem] bg-white/85 py-1 pr-1 pl-4 focus-within:ring-2 focus-within:ring-white">
          <label htmlFor={`${id}-question`} className="sr-only">
            {t('inputLabel')}
          </label>
          <textarea
            ref={questionRef}
            id={`${id}-question`}
            name="message"
            rows={2}
            maxLength={1000}
            placeholder={t('placeholder')}
            value={values.message}
            onChange={set('message')}
            onKeyDown={onQuestionKey}
            aria-invalid={invalid('message')}
            aria-describedby={describedBy('message')}
            className="max-h-28 min-h-10 flex-1 resize-none bg-transparent py-2 text-[0.9375rem] leading-snug text-fg outline-none placeholder:text-black/60"
          />
          <button
            type="submit"
            aria-label={form.status === 'sending' ? tf('sending') : t('send')}
            aria-busy={form.status === 'sending' || undefined}
            className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0b5a5e] text-white transition-colors duration-200 hover:bg-[#075e5d] aria-busy:opacity-60"
          >
            <Send aria-hidden className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
        <Honeypot />
        {problem ? (
          <p
            id={`${id}-problem`}
            role="alert"
            className="px-2 text-[0.8125rem] font-semibold text-white"
          >
            {problem}
          </p>
        ) : null}
      </form>

      <p className="py-3 text-center text-[0.75rem]">
        <Link href="/privacy" className="text-white underline underline-offset-2" onClick={onClose}>
          {t('privacy')}
        </Link>
      </p>
    </div>
  );
}

/** A quick answer in TERAN's own words, with the way on (a page, the contacts). */
function Answer({ topic, channels }: { topic: Topic; channels: ChatChannel[] }) {
  const t = useTranslations('Chat');
  const tp = useTranslations('Product');
  const tc = useTranslations('Common');
  const locale = useLocale() as Locale;
  const delivery = deliveryPage[locale];
  const content: Record<Topic, { text: string; more: ReactNode }> = {
    shipping: {
      text: showPrices ? delivery.intro : delivery.byContact.intro,
      more: (
        <Link href="/delivery" className={BUBBLE_LINK}>
          {t('shippingMore')}
        </Link>
      ),
    },
    ordering: {
      text: t('orderingAnswer', { order: tp('orderNow') }),
      more: (
        <Link href={`/collections/${PREMIUM_COLLECTION_SLUG}`} className={BUBBLE_LINK}>
          {t('orderingLink')}
        </Link>
      ),
    },
    business: {
      text: t('businessAnswer'),
      more: (
        <Link href="/wholesale" className={BUBBLE_LINK}>
          {t('businessLink')}
        </Link>
      ),
    },
  };
  const { text, more } = content[topic];
  return (
    <div className={cn(TERAN_BUBBLE, 'flex flex-col gap-2 py-3')}>
      <p>
        <span className="sr-only">{t('advisor')}: </span>
        {text}
      </p>
      {topic === 'shipping' && channels.length > 0 ? (
        <>
          <p className="text-[0.8125rem] font-semibold">{t('contactUs')}</p>
          <ul className="flex flex-wrap gap-1.5">
            {channels.map((channel) => (
              <li key={channel.href}>
                <a
                  href={channel.href}
                  {...(channel.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  className="inline-flex min-h-8 items-center rounded-full bg-[#0b5a5e] px-3 text-[0.8125rem] font-semibold text-white hover:bg-[#075e5d]"
                >
                  {channel.label}
                  {channel.external ? (
                    <span className="sr-only"> ({tc('opensInNewTab')})</span>
                  ) : null}
                </a>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <p className="text-[0.875rem]">{more}</p>
    </div>
  );
}
