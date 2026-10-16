'use client';

import type {
  AssistantCriteria,
  AssistantMode,
  AssistantRecommendation,
  AssistantResponse,
  AssistantTurn,
} from '@teran/contracts';
import { ArrowRight, Loader2, RotateCcw, Send, Sparkles } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { ProductImage } from '@/components/catalog/product-image';
import { Button } from '@/components/ui/button';
import { Price } from '@/components/ui/price';
import { Link } from '@/i18n/navigation';
import { apiRequest } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { formatMoney } from '@/lib/format';

interface Exchange {
  id: number;
  question: string;
  answer: AssistantResponse | null;
  failed: 'rate_limited' | 'failed' | null;
}

const EXAMPLES = ['example1', 'example2', 'example3', 'example4'] as const;
/** The API accepts eight earlier turns; older ones are dropped first. */
const HISTORY_TURNS = 8;

/**
 * The product advisor's conversation. Every answer comes from the API, which searches the live
 * catalogue: products, prices, pictures and links are the store's own, and the reasons are
 * recorded facts. The conversation lives only in this page (nothing is stored); the advisor
 * recommends and links to products, ordering stays in the normal store.
 */
export function AssistantChat({ initialMode }: { initialMode: AssistantMode }) {
  const t = useTranslations('Assistant');
  const locale = useLocale();
  const inputId = useId();
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [text, setText] = useState('');
  const [pending, setPending] = useState(false);
  const [mode, setMode] = useState<AssistantMode>(initialMode);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const logRef = useRef<HTMLOListElement>(null);
  const counter = useRef(0);

  // Bring the newest answer into view (without moving focus from the input).
  useEffect(() => {
    const last = logRef.current?.lastElementChild;
    if (last instanceof HTMLElement) last.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
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
        body: { locale, message, history },
      });
      setMode(answer.mode);
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

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void ask(text);
  }

  const lastAnswer = [...exchanges].reverse().find((exchange) => exchange.answer)?.answer;

  return (
    <div className="mx-auto max-w-3xl">
      <p className="flex items-start gap-2 rounded-card border border-line bg-surface px-4 py-3 text-body-sm text-fg-muted">
        <Sparkles aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-accent-fg" />
        {mode === 'ai' ? t('modeAi') : t('modeBasic')}
      </p>

      {exchanges.length === 0 ? (
        <div className="mt-8">
          <p className="text-label text-fg">{t('examplesTitle')}</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {EXAMPLES.map((key) => (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => void ask(t(key))}
                  className="inline-flex min-h-10 items-center rounded-full border border-line-strong/45 bg-surface px-4 text-body-sm font-medium text-fg transition-colors hover:border-brand/60"
                >
                  {t(key)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ol ref={logRef} aria-live="polite" aria-busy={pending} className="mt-8 space-y-8">
        {exchanges.map((exchange) => (
          <li key={exchange.id} className="space-y-4">
            <div className="flex justify-end">
              <p className="max-w-[85%] rounded-[1.25rem] rounded-br-md bg-forest-900 px-4 py-2.5 text-body text-ivory-50">
                <span className="sr-only">{t('you')}: </span>
                {exchange.question}
              </p>
            </div>
            {exchange.answer ? (
              <Answer answer={exchange.answer} />
            ) : exchange.failed ? (
              <p
                role="alert"
                className="rounded-card bg-danger-soft px-4 py-3 text-body-sm font-medium text-danger"
              >
                {exchange.failed === 'rate_limited' ? t('rateLimited') : t('failed')}
              </p>
            ) : (
              <p className="flex items-center gap-2 text-body-sm text-fg-muted">
                <Loader2 aria-hidden className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                {t('thinking')}
              </p>
            )}
          </li>
        ))}
      </ol>

      <form
        onSubmit={onSubmit}
        className="sticky bottom-3 z-10 mt-8 rounded-panel border border-line bg-surface p-3 shadow-soft sm:p-4"
      >
        <label htmlFor={inputId} className="sr-only">
          {t('inputLabel')}
        </label>
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            id={inputId}
            name="message"
            rows={2}
            maxLength={500}
            value={text}
            placeholder={lastAnswer?.followUp ?? t('placeholder')}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                void ask(text);
              }
            }}
            className="min-h-12 flex-1 resize-none rounded-control border border-line-strong/50 bg-surface px-3 py-2.5 text-body text-fg placeholder:text-fg-subtle focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
          />
          <Button
            type="submit"
            loading={pending}
            disabled={text.trim().length < 2}
            className="shrink-0"
          >
            <Send aria-hidden className="h-4 w-4" />
            <span className="max-sm:sr-only">{t('send')}</span>
          </Button>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-caption text-fg-subtle">{t('privacyHint')}</p>
          {exchanges.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                setExchanges([]);
                inputRef.current?.focus();
              }}
              disabled={pending}
              className="inline-flex min-h-9 items-center gap-1.5 text-caption font-semibold text-forest-900 hover:underline disabled:opacity-50"
            >
              <RotateCcw aria-hidden className="h-3.5 w-3.5" />
              {t('startOver')}
            </button>
          ) : null}
        </div>
      </form>
      <p className="mt-6 text-caption text-fg-subtle">
        {t('disclaimer')}{' '}
        <Link
          href="/catalog"
          className="font-semibold text-forest-900 underline underline-offset-2"
        >
          {t('browseCatalog')}
        </Link>
      </p>
    </div>
  );
}

function Answer({ answer }: { answer: AssistantResponse }) {
  const t = useTranslations('Assistant');
  return (
    <div className="space-y-4">
      <p className="text-body text-fg">
        <span className="sr-only">{t('advisor')}: </span>
        {answer.message}
      </p>
      <Understood criteria={answer.criteria} />
      {answer.recommendations.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {answer.recommendations.map((recommendation) => (
            <li key={recommendation.product.id}>
              <RecommendationCard recommendation={recommendation} />
            </li>
          ))}
        </ul>
      ) : null}
      {answer.notes.length > 0 ? (
        <ul className="space-y-1 rounded-card bg-gold-50 px-4 py-3 text-body-sm text-fg-muted">
          {answer.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}
      {answer.followUp ? (
        <p className="text-body-sm font-medium text-forest-900">{answer.followUp}</p>
      ) : null}
    </div>
  );
}

/** What the advisor understood, as chips: the visitor sees exactly what was searched for. */
function Understood({ criteria }: { criteria: AssistantCriteria }) {
  const t = useTranslations('Assistant');
  const tc = useTranslations('Common');
  const tf = useTranslations('Catalog');
  const locale = useLocale();
  const money = (amount: number) => formatMoney(String(amount), locale, tc('currency.UZS'));
  const chips: string[] = [];
  if (criteria.category) chips.push(criteria.category.name);
  for (const format of criteria.formats) chips.push(tf(`formats.${format}`));
  if (criteria.minPrice !== null && criteria.maxPrice !== null) {
    chips.push(t('budgetRange', { min: money(criteria.minPrice), max: money(criteria.maxPrice) }));
  } else if (criteria.maxPrice !== null) {
    chips.push(t('budgetMax', { price: money(criteria.maxPrice) }));
  } else if (criteria.minPrice !== null) {
    chips.push(t('budgetMin', { price: money(criteria.minPrice) }));
  }
  for (const attribute of criteria.attributes) {
    chips.push(`${attribute.label}: ${attribute.values.map((value) => value.label).join(', ')}`);
  }
  if (criteria.gift) chips.push(t('gift'));
  if (criteria.query) chips.push(t('query', { query: criteria.query }));
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-caption font-semibold tracking-[0.08em] text-fg-subtle uppercase">
        {t('understood')}
      </span>
      {chips.map((chip) => (
        <span
          key={chip}
          className="inline-flex min-h-7 items-center rounded-full bg-sage-100 px-3 text-caption font-medium text-forest-900"
        >
          {chip}
        </span>
      ))}
    </div>
  );
}

function RecommendationCard({ recommendation }: { recommendation: AssistantRecommendation }) {
  const t = useTranslations('Assistant');
  const { product, reasons } = recommendation;
  return (
    <article className="group relative flex h-full gap-3 rounded-card border border-line bg-surface p-3 transition-colors hover:border-gold-400/70">
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-control bg-surface-muted sm:h-28 sm:w-28">
        <ProductImage image={product.image} name={product.name} sizes="112px" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="text-micro tracking-[0.12em] text-fg-subtle uppercase">
          {product.category.name}
        </p>
        <h3 className="mt-0.5 text-title-sm text-fg">
          <Link
            href={`/products/${product.slug}`}
            className="after:absolute after:inset-0 after:rounded-card focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-focus"
          >
            {product.name}
          </Link>
        </h3>
        <Price
          amount={product.priceFrom}
          compareAt={product.compareAtPriceFrom}
          from={product.variantCount > 1}
          className="mt-1 text-body-sm"
        />
        {reasons.length > 0 ? (
          <ul className="mt-2 space-y-0.5 text-caption text-fg-muted">
            {reasons.slice(0, 4).map((reason) => (
              <li key={reason} className="flex gap-1.5">
                <span aria-hidden className="text-accent-fg">
                  •
                </span>
                {reason}
              </li>
            ))}
          </ul>
        ) : null}
        <span className="mt-auto inline-flex items-center gap-1 pt-2 text-caption font-semibold text-forest-900">
          {t('viewProduct')}
          <ArrowRight
            aria-hidden
            className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5"
          />
        </span>
      </div>
    </article>
  );
}
