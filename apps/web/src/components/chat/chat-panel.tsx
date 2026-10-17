'use client';

import type { AssistantResponse, AssistantTurn, Locale } from '@teran/contracts';
import { Loader2, Send, ShoppingCart, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Wordmark } from '@/components/brand/logo';
import { ProductImage } from '@/components/catalog/product-image';
import { deliveryPage } from '@/content/pages/delivery';
import { Link } from '@/i18n/navigation';
import { apiRequest } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { cn } from '@/lib/cn';
import { showPrices } from '@/lib/site';
import type { ChatChannel } from './chat-types';

/** One question and what came back: the advisor's answer, the delivery answer, or a failure. */
interface Exchange {
  id: number;
  question: string;
  answer: AssistantResponse | null;
  shipping?: boolean;
  failed: 'rate_limited' | 'failed' | null;
}

/** The last conversation, kept in this browser only (the reference's "See last conversation"). */
const STORAGE_KEY = 'teran-chat';
const KEPT_EXCHANGES = 10;
/** The API accepts eight earlier turns; older ones are dropped first. */
const HISTORY_TURNS = 8;

/** The reference's frosted controls on the teal window. */
const CHIP =
  'inline-flex min-h-8 items-center rounded-full bg-white/55 px-3.5 text-[0.8125rem] leading-none font-semibold text-fg transition-colors duration-200 hover:bg-white/70';
const ROUND =
  'flex h-8 w-8 items-center justify-center rounded-full bg-white/55 text-fg transition-colors duration-200 hover:bg-white/70';

function readSaved(): Exchange[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed)
      ? (parsed as Exchange[]).filter((item) => item.answer || item.shipping)
      : [];
  } catch {
    return [];
  }
}

/**
 * The chat window, on the reference's model: a teal window (the whole screen on phones) with the
 * bag, the customer's orders and close at the top, TERAN's white wordmark, the conversation, quick
 * replies (delivery; the last conversation when there is one), the question field, and the AI
 * notice and privacy links. Questions go to TERAN's product advisor, which answers from the live
 * catalogue; the delivery reply and the contacts are TERAN's own. Escape closes it.
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
  const locale = useLocale() as Locale;
  const titleId = useId();
  const inputId = useId();
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  // Only ever rendered in the browser (loaded on demand), so storage can be read at once.
  const [saved] = useState<Exchange[]>(readSaved);
  const [text, setText] = useState('');
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLOListElement>(null);
  const counter = useRef(0);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    const last = logRef.current?.lastElementChild;
    if (last instanceof HTMLElement) last.scrollIntoView({ block: 'end', behavior: 'smooth' });
    const kept = exchanges.filter((exchange) => exchange.answer || exchange.shipping);
    if (kept.length === 0) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(kept.slice(-KEPT_EXCHANGES)));
    } catch {
      // Storage may be unavailable (private windows): the conversation simply is not kept.
    }
  }, [exchanges]);

  async function ask(question: string) {
    const message = question.trim();
    if (message.length < 2 || pending) return;
    const history: AssistantTurn[] = exchanges
      .flatMap((exchange): AssistantTurn[] =>
        exchange.answer
          ? [
              { role: 'user', text: exchange.question.slice(0, 1000) },
              { role: 'assistant', text: exchange.answer.message.slice(0, 1000) },
            ]
          : [],
      )
      .slice(-HISTORY_TURNS);
    const id = ++counter.current;
    setExchanges((current) => [...current, { id, question: message, answer: null, failed: null }]);
    setText('');
    setPending(true);
    try {
      const answer = await apiRequest<AssistantResponse>('/assistant/recommend', {
        method: 'POST',
        body: { locale, message, history, prices: showPrices },
      });
      setExchanges((current) =>
        current.map((exchange) => (exchange.id === id ? { ...exchange, answer } : exchange)),
      );
    } catch (caught) {
      const failed =
        caught instanceof ApiError && caught.status === 429 ? 'rate_limited' : 'failed';
      setExchanges((current) =>
        current.map((exchange) => (exchange.id === id ? { ...exchange, failed } : exchange)),
      );
    } finally {
      setPending(false);
    }
  }

  function askShipping() {
    const id = ++counter.current;
    setExchanges((current) => [
      ...current,
      { id, question: t('shipping'), answer: null, shipping: true, failed: null },
    ]);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void ask(text);
  }

  const delivery = deliveryPage[locale];
  const shippingText = showPrices ? delivery.intro : delivery.byContact.intro;
  const empty = exchanges.length === 0;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      hidden={!open}
      className="chat-window fixed inset-0 z-[61] flex flex-col overflow-hidden bg-[linear-gradient(180deg,#00d0cc_0%,#03b3b0_45%,#087a79_100%)] text-fg sm:inset-auto sm:right-[2.1875rem] sm:bottom-[2.1875rem] sm:h-[min(42.5rem,calc(100dvh-4.375rem))] sm:w-96 sm:rounded-[2rem] sm:shadow-[0_12px_40px_rgb(0_0_0_/_22%)] print:hidden"
    >
      <h2 id={titleId} className="sr-only">
        {t('title')}
      </h2>
      <div className="flex items-center justify-end gap-2 px-4 pt-4">
        <Link href="/cart" aria-label={t('cart')} className={ROUND} onClick={onClose}>
          <ShoppingCart aria-hidden className="h-[1.125rem] w-[1.125rem]" strokeWidth={2} />
        </Link>
        <Link href="/account/orders" className={CHIP} onClick={onClose}>
          {t('orders')}
        </Link>
        <button type="button" aria-label={t('close')} onClick={onClose} className={ROUND}>
          <X aria-hidden className="h-[1.125rem] w-[1.125rem]" strokeWidth={2} />
        </button>
      </div>

      <div
        className={cn(
          'flex justify-center transition-[margin] duration-300',
          empty ? 'mt-7' : 'mt-2',
        )}
      >
        <Wordmark size="compact" className={cn('brightness-0 invert', empty ? 'w-60!' : 'w-28!')} />
      </div>

      <ol
        ref={logRef}
        aria-live="polite"
        aria-busy={pending}
        className="mt-4 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-4 pb-3"
      >
        {exchanges.map((exchange) => (
          <li key={exchange.id} className="flex flex-col gap-2">
            <p className="max-w-[85%] self-end rounded-[1.25rem] rounded-br-md bg-[#075e5d] px-4 py-2.5 text-[0.9375rem] leading-snug text-white">
              <span className="sr-only">{t('you')}: </span>
              {exchange.question}
            </p>
            {exchange.shipping ? (
              <ShippingAnswer text={shippingText} channels={channels} />
            ) : exchange.answer ? (
              <AdvisorAnswer answer={exchange.answer} />
            ) : exchange.failed ? (
              <p
                role="alert"
                className="max-w-[90%] rounded-[1.25rem] rounded-bl-md bg-white/90 px-4 py-2.5 text-[0.875rem] font-medium text-danger"
              >
                {exchange.failed === 'rate_limited' ? t('rateLimited') : t('failed')}
              </p>
            ) : (
              <p className="flex items-center gap-2 self-start rounded-[1.25rem] rounded-bl-md bg-white/85 px-4 py-2.5 text-[0.875rem] text-fg">
                <Loader2 aria-hidden className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                {t('thinking')}
              </p>
            )}
          </li>
        ))}
      </ol>

      {notice ? (
        <p className="mx-4 mb-3 rounded-[1rem] bg-white/90 px-4 py-3 text-[0.8125rem] leading-snug text-fg">
          {t('noticeText')}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2 px-5 pb-3">
        <button type="button" onClick={askShipping} className={cn(CHIP, 'min-h-9 px-4')}>
          {t('shipping')}
        </button>
        {empty && saved.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              counter.current = Math.max(0, ...saved.map((exchange) => exchange.id));
              setExchanges(saved);
            }}
            className={cn(CHIP, 'min-h-9 px-4')}
          >
            {t('lastConversation')}
          </button>
        ) : null}
      </div>

      <form
        onSubmit={onSubmit}
        className="mx-4 flex items-center gap-1 rounded-[1.5rem] bg-white/65 py-1 pr-1.5 pl-4 shadow-[0_2px_8px_rgb(0_0_0_/_8%)]"
      >
        <label htmlFor={inputId} className="sr-only">
          {t('inputLabel')}
        </label>
        <input
          ref={inputRef}
          id={inputId}
          name="message"
          autoComplete="off"
          maxLength={500}
          value={text}
          placeholder={t('placeholder')}
          onChange={(event) => setText(event.target.value)}
          className="h-10 min-w-0 flex-1 bg-transparent text-[0.9375rem] text-fg outline-none placeholder:text-black/55"
        />
        <button
          type="submit"
          aria-label={t('send')}
          disabled={pending || text.trim().length < 2}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-fg transition-opacity duration-200 disabled:opacity-40"
        >
          <Send aria-hidden className="h-[1.125rem] w-[1.125rem]" strokeWidth={2} />
        </button>
      </form>

      <p className="flex items-center justify-center gap-1.5 py-3 text-[0.75rem] text-white">
        <button
          type="button"
          aria-expanded={notice}
          onClick={() => setNotice((value) => !value)}
          className="underline underline-offset-2"
        >
          {t('notice')}
        </button>
        <span aria-hidden>•</span>
        <Link href="/privacy" className="underline underline-offset-2" onClick={onClose}>
          {t('privacy')}
        </Link>
      </p>
    </div>
  );
}

function AdvisorAnswer({ answer }: { answer: AssistantResponse }) {
  const t = useTranslations('Chat');
  return (
    <div className="flex max-w-[92%] flex-col gap-2 self-start">
      <p className="rounded-[1.25rem] rounded-bl-md bg-white/90 px-4 py-2.5 text-[0.9375rem] leading-snug text-fg">
        <span className="sr-only">{t('advisor')}: </span>
        {answer.message}
      </p>
      {answer.recommendations.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {answer.recommendations.slice(0, 4).map(({ product }) => (
            <li key={product.id}>
              <Link
                href={`/products/${product.slug}`}
                className="flex items-center gap-3 rounded-[1rem] bg-white px-2 py-2 pr-3 text-fg shadow-[0_1px_3px_rgb(0_0_0_/_10%)] hover:underline"
              >
                <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[0.625rem] bg-surface-muted">
                  <ProductImage image={product.image} name={product.name} sizes="48px" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.75rem] text-fg-muted italic">
                    {product.category.name}
                  </span>
                  <span className="block truncate text-[0.875rem] font-bold">{product.name}</span>
                </span>
                <span className="text-[0.8125rem] font-semibold text-forest-800">
                  {t('viewProduct')}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      {answer.followUp ? (
        <p className="rounded-[1.25rem] rounded-bl-md bg-white/90 px-4 py-2.5 text-[0.875rem] leading-snug text-fg">
          {answer.followUp}
        </p>
      ) : null}
    </div>
  );
}

function ShippingAnswer({ text, channels }: { text: string; channels: ChatChannel[] }) {
  const t = useTranslations('Chat');
  return (
    <div className="flex max-w-[92%] flex-col gap-2 self-start rounded-[1.25rem] rounded-bl-md bg-white/90 px-4 py-3 text-[0.9375rem] leading-snug text-fg">
      <p>
        <span className="sr-only">{t('advisor')}: </span>
        {text}
      </p>
      {channels.length > 0 ? (
        <>
          <p className="text-[0.8125rem] font-semibold">{t('contactUs')}</p>
          <ul className="flex flex-wrap gap-1.5">
            {channels.map((channel) => (
              <li key={channel.href}>
                <a
                  href={channel.href}
                  {...(channel.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  className="inline-flex min-h-8 items-center rounded-full bg-forest-900 px-3 text-[0.8125rem] font-semibold text-white hover:bg-forest-800"
                >
                  {channel.label}
                </a>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <Link
        href="/delivery"
        className="self-start text-[0.875rem] font-semibold text-forest-800 underline underline-offset-2"
      >
        {t('shippingMore')}
      </Link>
    </div>
  );
}
