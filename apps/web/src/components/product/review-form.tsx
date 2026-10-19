'use client';

import { REVIEW_COMMENT_MAX, type Locale, type MyReviewDto } from '@teran/contracts';
import { useLocale, useTranslations } from 'next-intl';
import { useId, useRef, useState, type FormEvent } from 'react';
import { Stars } from '@/components/catalog/stars';
import { Button } from '@/components/ui/button';
import { TextAreaField } from '@/components/ui/field';
import { useRouter } from '@/i18n/navigation';
import { apiRequest } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import { useApiErrorMessage } from '@/lib/use-api-error-message';

const STAR =
  'M12 2.6l2.83 5.94 6.53.79-4.8 4.5 1.22 6.47L12 17.15l-5.78 3.15 1.22-6.47-4.8-4.5 6.53-.79z';

/** Five radio buttons drawn as stars: the stars up to the one pointed at or chosen light up. */
function StarInput({
  value,
  onChange,
  invalid,
  describedBy,
}: {
  value: number;
  onChange: (value: number) => void;
  invalid: boolean;
  describedBy?: string;
}) {
  const t = useTranslations('Product');
  const name = useId();
  const [pointed, setPointed] = useState(0);
  const lit = pointed || value;
  return (
    <fieldset aria-describedby={describedBy} aria-invalid={invalid || undefined}>
      <legend className="text-body-sm font-semibold text-fg">{t('reviews.yourRating')}</legend>
      <div className="mt-2 flex gap-1" onPointerLeave={() => setPointed(0)}>
        {[1, 2, 3, 4, 5].map((star) => (
          <label key={star} className="cursor-pointer" onPointerEnter={() => setPointed(star)}>
            <input
              type="radio"
              name={name}
              value={star}
              checked={value === star}
              onChange={() => onChange(star)}
              className="peer sr-only"
            />
            <svg
              viewBox="0 0 24 24"
              aria-hidden
              className={cn(
                'h-9 w-9 rounded-md transition-[color,scale] duration-150 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus motion-safe:hover:scale-110',
                star <= lit ? 'text-[#f0a020]' : 'text-[#e4dccb]',
              )}
            >
              <path d={STAR} fill="currentColor" />
            </svg>
            <span className="sr-only">{t('reviews.star', { count: star })}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * A signed-in customer's rating of the product (ADR-042): five stars and an optional comment,
 * saved at once; then their review with "edit" and "delete". The page's list catches up when the
 * storefront's catalogue cache is refreshed a moment later, so their own review shows here.
 */
export function ReviewForm({ slug, initial }: { slug: string; initial: MyReviewDto | null }) {
  const t = useTranslations('Product');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [mine, setMine] = useState(initial);
  const [editing, setEditing] = useState(initial === null);
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [comment, setComment] = useState(initial?.comment ?? '');
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [missing, setMissing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const hintId = useId();
  const errorMessage = useApiErrorMessage(error);
  const path = `/catalog/products/${encodeURIComponent(slug)}/reviews/mine`;

  async function save(event: FormEvent) {
    event.preventDefault();
    if (rating < 1) {
      setMissing(true);
      formRef.current?.querySelector<HTMLInputElement>('input[type="radio"]')?.focus();
      return;
    }
    setBusy('save');
    setError(null);
    try {
      const saved = await apiRequest<MyReviewDto>(`${path}?locale=${locale}`, {
        method: 'PUT',
        body: { rating, comment: comment.trim() || null },
      });
      setMine(saved);
      setEditing(false);
      setNotice(t('reviews.thanks'));
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError(0, null));
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!window.confirm(t('reviews.deleteConfirm'))) return;
    setBusy('delete');
    setError(null);
    try {
      await apiRequest<void>(path, { method: 'DELETE' });
      setMine(null);
      setRating(0);
      setComment('');
      setEditing(true);
      setNotice(t('reviews.deleted'));
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError(0, null));
    } finally {
      setBusy(null);
    }
  }

  if (mine && !editing) {
    return (
      <div className="rounded-tile bg-surface-muted p-5">
        <p role="status" className="text-body-sm font-semibold text-leaf-700">
          {notice ?? t('reviews.yours')}
        </p>
        <p className="mt-3 flex items-center gap-2">
          <Stars value={mine.rating} className="text-[1.25rem]" />
          <span className="sr-only">{t('reviews.starsOutOf', { count: mine.rating })}</span>
          <time dateTime={mine.updatedAt} className="text-body-sm text-fg-subtle">
            {formatDate(mine.updatedAt, locale)}
          </time>
        </p>
        {mine.comment ? (
          <p className="mt-2 text-body whitespace-pre-line text-fg-muted">{mine.comment}</p>
        ) : null}
        {mine.status === 'HIDDEN' ? (
          <p className="mt-3 text-body-sm text-fg-subtle">{t('reviews.hidden')}</p>
        ) : null}
        {errorMessage ? (
          <p role="alert" className="mt-3 text-body-sm text-danger">
            {errorMessage}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setNotice(null);
              setEditing(true);
            }}
          >
            {t('reviews.edit')}
          </Button>
          <Button variant="danger-ghost" size="sm" loading={busy === 'delete'} onClick={remove}>
            {t('reviews.delete')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={save} noValidate className="rounded-tile bg-surface-muted p-5">
      <p className="font-heading text-[1.25rem] leading-tight text-fg">{t('reviews.formTitle')}</p>
      {notice ? (
        <p role="status" className="mt-2 text-body-sm text-fg-muted">
          {notice}
        </p>
      ) : null}
      <div className="mt-4">
        <StarInput
          value={rating}
          onChange={(value) => {
            setRating(value);
            setMissing(false);
          }}
          invalid={missing}
          describedBy={missing ? hintId : undefined}
        />
        {missing ? (
          <p id={hintId} role="alert" className="mt-2 text-body-sm text-danger">
            {t('reviews.chooseRating')}
          </p>
        ) : null}
      </div>
      <TextAreaField
        label={t('reviews.comment')}
        hint={t('reviews.commentHint')}
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        maxLength={REVIEW_COMMENT_MAX}
        rows={4}
        className="mt-5"
      />
      {errorMessage ? (
        <p role="alert" className="mt-3 text-body-sm text-danger">
          {errorMessage}
        </p>
      ) : null}
      <div className="mt-5 flex flex-wrap gap-2">
        <Button type="submit" loading={busy === 'save'}>
          {mine ? t('reviews.update') : t('reviews.submit')}
        </Button>
        {mine ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setRating(mine.rating);
              setComment(mine.comment ?? '');
              setMissing(false);
              setEditing(false);
            }}
          >
            {t('reviews.cancel')}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
