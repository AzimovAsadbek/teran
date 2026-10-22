'use client';

import type { AssistantReplyDto, AssistantTurn, Locale } from '@teran/contracts';
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
import { PREMIUM_COLLECTION_SLUG } from '@/content/brand';
import { deliveryPage } from '@/content/pages/delivery';
import { Link } from '@/i18n/navigation';
import { apiRequest } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { cn } from '@/lib/cn';
import { useMatches } from '@/lib/motion';
import { showPrices } from '@/lib/site';
import { AssistantAnswer } from './assistant-answer';
import type { ChatChannel } from './chat-types';

/** The quick answers the window offers, as chips under the conversation. */
const TOPICS = ['shipping', 'ordering', 'business'] as const;
type Topic = (typeof TOPICS)[number];
/** The questions the assistant's chips ask: choosing a tea first, where it shows products. */
const PROMPTS = ['choose', ...TOPICS] as const;
/** The earlier turns that go with a question to the assistant (the API takes ten). */
const HISTORY = 10;

/**
 * One turn of the conversation: a quick answer asked for, the ways to reach TERAN asked for, a
 * question to the assistant, its answer, or a question it could not answer.
 */
type Turn =
  | { id: number; kind: 'topic'; topic: Topic }
  | { id: number; kind: 'contact' }
  | { id: number; kind: 'question'; text: string }
  | { id: number; kind: 'answer'; answer: AssistantReplyDto }
  | { id: number; kind: 'failure'; reason: 'unavailable' | 'limited' };
/** A turn before it has its number. */
type NewTurn = Turn extends infer Each ? (Each extends Turn ? Omit<Each, 'id'> : never) : never;

/** Frosted controls on the teal window. */
const CHIP =
  'inline-flex min-h-9 shrink-0 items-center rounded-full bg-white/60 px-4 text-[0.8125rem] leading-none font-semibold whitespace-nowrap text-fg transition-colors duration-200 hover:bg-white/80 disabled:opacity-60';
const ROUND =
  'flex h-9 w-9 items-center justify-center rounded-full bg-white/60 text-fg transition-colors duration-200 hover:bg-white/80';
const TERAN_BUBBLE =
  'max-w-[92%] self-start rounded-[1.25rem] rounded-bl-md bg-white/90 px-4 py-2.5 text-[0.9375rem] leading-snug text-fg';
const VISITOR_BUBBLE =
  'max-w-[85%] self-end rounded-[1.25rem] rounded-br-md bg-[#075e5d] px-4 py-2.5 text-[0.9375rem] leading-snug text-white';
const BUBBLE_LINK = 'font-semibold text-[#0b5a5e] underline underline-offset-2';
const CHANNEL =
  'inline-flex min-h-8 items-center rounded-full bg-[#0b5a5e] px-3 text-[0.8125rem] font-semibold text-white transition-colors duration-200 hover:bg-[#075e5d]';

/**
 * TERAN's chat window (the whole screen on phones, a 384 px window in the corner from 640 px) on
 * the brand's teals: close at the top, TERAN's white wordmark, the conversation opening on a
 * greeting, chips for the quick answers (delivery, ordering, business — TERAN's own words, with
 * the way on), and TERAN's messengers and phones, with the contact page, at the foot (ADR-054).
 * The window asks for no name or phone number (the owner's word of 2026-10-23): a visitor reaches
 * TERAN through its own channels.
 *
 * Where TERAN has switched its AI assistant on (Admin → Settings, with a Gemini key on the
 * server, ADR-055), the window opens on the assistant instead: a question box, chips that ask it
 * the usual questions, and answers with the products and pages they name; a chip and any answer
 * that fails give the ways to reach TERAN. The conversation lives in the page only (the earlier
 * turns go with each question). Escape closes the window; it takes focus on opening. On a phone,
 * where it is the whole screen, it is modal: the page behind it is out of reach (inert) until it
 * closes.
 */
export default function ChatPanel({
  open,
  channels,
  assistant,
  onClose,
}: {
  open: boolean;
  channels: ChatChannel[];
  /** The AI assistant answers (switched on, with a key). */
  assistant: boolean;
  onClose: () => void;
}) {
  const t = useTranslations('Chat');
  const locale = useLocale() as Locale;
  const id = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLOListElement>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const counter = useRef(0);
  // The assistant was switched off since the page loaded (its answer said so).
  const [assistantGone, setAssistantGone] = useState(false);
  const ai = assistant && !assistantGone;
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
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
    // The question box where the assistant answers; otherwise the window itself.
    const box = dialogRef.current?.querySelector('textarea');
    (box ?? dialogRef.current)?.focus();
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    const last = logRef.current?.lastElementChild;
    if (last instanceof HTMLElement) last.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [turns, pending]);

  const add = (turn: NewTurn) =>
    setTurns((current) => [...current, { ...turn, id: ++counter.current }]);

  /** Following a product or a page: on a phone the window covers it, so it closes. */
  const onFollow = () => {
    if (whole) onClose();
  };

  async function askAssistant(text: string) {
    const question = text.trim();
    if (question.length < 2 || pending) return;
    const history = turns
      .flatMap((turn): AssistantTurn[] =>
        turn.kind === 'question'
          ? [{ role: 'user', text: turn.text }]
          : turn.kind === 'answer'
            ? [{ role: 'assistant', text: turn.answer.reply }]
            : [],
      )
      .slice(-HISTORY);
    add({ kind: 'question', text: question });
    setDraft('');
    setPending(true);
    try {
      const answer = await apiRequest<AssistantReplyDto>('/assistant/chat', {
        method: 'POST',
        body: { locale, message: question, history, prices: showPrices },
      });
      add({ kind: 'answer', answer });
    } catch (error) {
      const apiError = error instanceof ApiError ? error : null;
      if (apiError?.code === 'FEATURE_DISABLED') setAssistantGone(true);
      add({ kind: 'failure', reason: apiError?.status === 429 ? 'limited' : 'unavailable' });
    } finally {
      setPending(false);
    }
  }

  function onAsk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void askAssistant(draft);
  }

  // Enter sends, as in a chat; Shift+Enter starts a new line.
  function onAskKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    void askAssistant(draft);
  }

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal={whole}
      aria-labelledby={`${id}-title`}
      hidden={!open}
      tabIndex={-1}
      className="fixed inset-0 z-[61] flex flex-col overflow-hidden bg-[linear-gradient(180deg,#14a3a3_0%,#107e84_52%,#0b5a5e_100%)] text-fg outline-none sm:inset-auto sm:right-[2.1875rem] sm:bottom-[2.1875rem] sm:h-[min(40rem,calc(100dvh-4.375rem))] sm:w-96 sm:rounded-[2rem] sm:shadow-[0_12px_40px_rgb(0_0_0_/_22%)] print:hidden"
    >
      <h2 id={`${id}-title`} className="sr-only">
        {t('title')}
      </h2>
      <div className="flex justify-end px-4 pt-4">
        <button type="button" aria-label={t('close')} onClick={onClose} className={ROUND}>
          <X aria-hidden className="h-[1.125rem] w-[1.125rem]" strokeWidth={2} />
        </button>
      </div>
      {/* On a short screen the conversation needs the room more than the wordmark does. */}
      <div className="flex justify-center [@media(max-height:34rem)]:hidden">
        <Wordmark size="compact" sizes="160px" className="w-40! brightness-0 invert" />
      </div>

      <ol
        ref={logRef}
        aria-live="polite"
        className="mt-5 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-4 pb-3 [@media(max-height:34rem)]:mt-1"
      >
        <li className="flex flex-col">
          <p className={TERAN_BUBBLE}>
            <span className="sr-only">{t('advisor')}: </span>
            {ai ? t('greetingAi') : t('greeting')}
          </p>
        </li>
        {turns.map((turn) => (
          <li key={turn.id} className="flex flex-col gap-2">
            {turn.kind === 'answer' ? (
              <AssistantAnswer answer={turn.answer} onFollow={onFollow} bubble={TERAN_BUBBLE} />
            ) : turn.kind === 'failure' ? (
              <div className={cn(TERAN_BUBBLE, 'flex flex-col gap-2 py-3')}>
                <p>
                  <span className="sr-only">{t('advisor')}: </span>
                  {t(turn.reason)}
                </p>
                <Channels channels={channels} onFollow={onFollow} />
              </div>
            ) : (
              <>
                <p className={VISITOR_BUBBLE}>
                  <span className="sr-only">{t('you')}: </span>
                  {turn.kind === 'topic'
                    ? t(turn.topic)
                    : turn.kind === 'contact'
                      ? t('writeToTeran')
                      : turn.text}
                </p>
                {turn.kind === 'topic' ? (
                  <Answer topic={turn.topic} channels={channels} onFollow={onFollow} />
                ) : turn.kind === 'contact' ? (
                  <div className={cn(TERAN_BUBBLE, 'flex flex-col gap-2 py-3')}>
                    <p>
                      <span className="sr-only">{t('advisor')}: </span>
                      {t('contactUs')}
                    </p>
                    <Channels channels={channels} onFollow={onFollow} />
                  </div>
                ) : null}
              </>
            )}
          </li>
        ))}
        {pending ? (
          <li className="flex flex-col gap-1.5">
            <p className={cn(TERAN_BUBBLE, 'flex items-center gap-1.5 py-3.5')}>
              <span className="sr-only">{t('thinking')}</span>
              {[0, 1, 2].map((dot) => (
                <span
                  key={dot}
                  aria-hidden
                  className="h-2 w-2 animate-pulse rounded-full bg-[#107e84] motion-reduce:animate-none"
                  style={{ animationDelay: `${dot * 180}ms` }}
                />
              ))}
            </p>
            {/* Shown once the wait is long (Gemini sometimes takes tens of seconds). */}
            <p
              aria-hidden
              className="animate-fade-in px-1 text-[0.8125rem] leading-snug text-white [animation-delay:8s]"
            >
              {t('slow')}
            </p>
          </li>
        ) : null}
      </ol>

      {/* One row that scrolls sideways, so the conversation keeps its room on short screens. */}
      <div className="flex gap-2 overflow-x-auto overscroll-x-contain px-4 pb-3 [scrollbar-width:none]">
        {ai ? (
          <>
            {PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                disabled={pending}
                onClick={() => void askAssistant(t(`prompts.${prompt}`))}
                className={CHIP}
              >
                {prompt === 'choose' ? t('choose') : t(prompt)}
              </button>
            ))}
            <button type="button" onClick={() => add({ kind: 'contact' })} className={CHIP}>
              {t('writeToTeran')}
            </button>
          </>
        ) : (
          TOPICS.map((topic) => (
            <button
              key={topic}
              type="button"
              onClick={() => add({ kind: 'topic', topic })}
              className={CHIP}
            >
              {t(topic)}
            </button>
          ))
        )}
      </div>

      {ai ? (
        <form onSubmit={onAsk} className="mx-4">
          <div className="flex items-end gap-1 rounded-[1.25rem] bg-white/85 py-1 pr-1 pl-4 focus-within:ring-2 focus-within:ring-white">
            <label htmlFor={`${id}-ask`} className="sr-only">
              {t('inputLabel')}
            </label>
            <textarea
              id={`${id}-ask`}
              name="question"
              rows={2}
              maxLength={500}
              placeholder={t('placeholder')}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={onAskKey}
              className="max-h-28 min-h-10 flex-1 resize-none bg-transparent py-2 text-[0.9375rem] leading-snug text-fg outline-none placeholder:text-black/60"
            />
            <button
              type="submit"
              aria-label={pending ? t('thinking') : t('send')}
              aria-busy={pending || undefined}
              disabled={draft.trim().length < 2 && !pending}
              className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0b5a5e] text-white transition-colors duration-200 hover:bg-[#075e5d] disabled:opacity-50 aria-busy:opacity-60"
            >
              <Send aria-hidden className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </form>
      ) : (
        <div className="mx-4 flex flex-col gap-2 rounded-[1.25rem] bg-white/85 px-4 py-3">
          <p className="text-[0.8125rem] font-semibold">{t('contactUs')}</p>
          <Channels channels={channels} onFollow={onFollow} />
        </div>
      )}

      <p className="px-6 py-3 text-center text-[0.75rem] leading-snug text-white">
        {ai ? <span className="text-white/85">{t('aiNote')} </span> : null}
        <Link href="/privacy" className="text-white underline underline-offset-2" onClick={onClose}>
          {t('privacy')}
        </Link>
      </p>
    </div>
  );
}

/** TERAN's messengers and phones (Admin → Settings), and its contact page. */
function Channels({ channels, onFollow }: { channels: ChatChannel[]; onFollow: () => void }) {
  const t = useTranslations('Chat');
  const tc = useTranslations('Common');
  return (
    <ul className="flex flex-wrap gap-1.5">
      {channels.map((channel) => (
        <li key={channel.href}>
          <a
            href={channel.href}
            {...(channel.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            className={CHANNEL}
          >
            {channel.label}
            {channel.external ? <span className="sr-only"> ({tc('opensInNewTab')})</span> : null}
          </a>
        </li>
      ))}
      <li>
        <Link href="/contact" onClick={onFollow} className={CHANNEL}>
          {t('contactPage')}
        </Link>
      </li>
    </ul>
  );
}

/** A quick answer in TERAN's own words, with the way on (a page, the contacts). */
function Answer({
  topic,
  channels,
  onFollow,
}: {
  topic: Topic;
  channels: ChatChannel[];
  onFollow: () => void;
}) {
  const t = useTranslations('Chat');
  const tp = useTranslations('Product');
  const locale = useLocale() as Locale;
  const delivery = deliveryPage[locale];
  const content: Record<Topic, { text: string; more: ReactNode }> = {
    shipping: {
      text: showPrices ? delivery.intro : delivery.byContact.intro,
      more: (
        <Link href="/delivery" onClick={onFollow} className={BUBBLE_LINK}>
          {t('shippingMore')}
        </Link>
      ),
    },
    ordering: {
      text: t('orderingAnswer', { order: tp('orderNow') }),
      more: (
        <Link
          href={`/collections/${PREMIUM_COLLECTION_SLUG}`}
          onClick={onFollow}
          className={BUBBLE_LINK}
        >
          {t('orderingLink')}
        </Link>
      ),
    },
    business: {
      text: t('businessAnswer'),
      more: (
        <Link href="/wholesale" onClick={onFollow} className={BUBBLE_LINK}>
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
      {topic === 'shipping' ? (
        <>
          <p className="text-[0.8125rem] font-semibold">{t('contactUs')}</p>
          <Channels channels={channels} onFollow={onFollow} />
        </>
      ) : null}
      <p className="text-[0.875rem]">{more}</p>
    </div>
  );
}
