'use client';

import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/lib/cn';

/*
 * Labelled form controls. Each control is wired to its hint and error with aria-describedby, marks
 * itself aria-invalid when it has an error, and shows "optional" on fields that are not required
 * (rather than asterisks on required ones). Errors are text, never colour alone.
 */

const CONTROL =
  'w-full rounded-2xl border bg-white px-4 text-base text-ink-900 outline-none transition-colors placeholder:text-ink-500 focus:border-forest-700 focus:ring-2 focus:ring-forest-700/15 disabled:bg-ivory-100';

function controlClasses(invalid: boolean, extra?: string): string {
  return cn(CONTROL, invalid ? 'border-danger-700' : 'border-sage-500', extra);
}

interface FieldChromeProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
}

function useFieldIds(error: string | undefined, hint: ReactNode) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return { id, hintId, errorId, describedBy };
}

function Label({
  htmlFor,
  required,
  children,
}: {
  htmlFor: string;
  required?: boolean;
  children: ReactNode;
}) {
  const t = useTranslations('Common');
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-forest-900">
      {children}
      {required ? null : <span className="ml-1.5 font-normal text-ink-500">({t('optional')})</span>}
    </label>
  );
}

function HintAndError({
  hint,
  hintId,
  error,
  errorId,
}: {
  hint?: ReactNode;
  hintId?: string;
  error?: string;
  errorId?: string;
}) {
  return (
    <>
      {hint ? (
        <p id={hintId} className="mt-1.5 text-sm text-ink-500">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="mt-1.5 text-sm font-medium text-danger-700">
          {error}
        </p>
      ) : null}
    </>
  );
}

export function TextField({
  label,
  hint,
  error,
  required,
  className,
  ...input
}: FieldChromeProps & Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'id'>) {
  const { id, hintId, errorId, describedBy } = useFieldIds(error, hint);
  return (
    <div className={className}>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      <input
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={controlClasses(Boolean(error), 'h-12')}
        {...input}
      />
      <HintAndError hint={hint} hintId={hintId} error={error} errorId={errorId} />
    </div>
  );
}

export function TextAreaField({
  label,
  hint,
  error,
  required,
  className,
  ...textarea
}: FieldChromeProps & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className' | 'id'>) {
  const { id, hintId, errorId, describedBy } = useFieldIds(error, hint);
  return (
    <div className={className}>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      <textarea
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        rows={4}
        className={controlClasses(Boolean(error), 'min-h-28 py-3 leading-relaxed')}
        {...textarea}
      />
      <HintAndError hint={hint} hintId={hintId} error={error} errorId={errorId} />
    </div>
  );
}

export function SelectField({
  label,
  hint,
  error,
  required,
  className,
  placeholder,
  options,
  ...select
}: FieldChromeProps &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className' | 'id'> & {
    placeholder?: string;
    options: readonly { value: string; label: string }[];
  }) {
  const { id, hintId, errorId, describedBy } = useFieldIds(error, hint);
  return (
    <div className={className}>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      <div className="relative">
        <select
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={controlClasses(Boolean(error), 'h-12 appearance-none pr-11')}
          {...select}
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-4 h-4 w-4 -translate-y-1/2 text-ink-500"
        />
      </div>
      <HintAndError hint={hint} hintId={hintId} error={error} errorId={errorId} />
    </div>
  );
}

export function CheckboxField({
  label,
  error,
  className,
  ...input
}: { label: ReactNode; error?: string; className?: string } & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'className' | 'id' | 'type'
>) {
  const id = useId();
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={className}>
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className="mt-0.5 h-5 w-5 shrink-0 rounded border-sage-500 accent-forest-900"
          {...input}
        />
        <label htmlFor={id} className="text-sm leading-relaxed text-ink-700">
          {label}
        </label>
      </div>
      {error ? (
        <p id={errorId} className="mt-1.5 pl-8 text-sm font-medium text-danger-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Announced summary shown above a form after a failed submit; focus moves to the first field. */
export function FormErrorSummary({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-2xl bg-danger-100 px-4 py-3 text-sm font-medium text-danger-700"
    >
      {message}
    </p>
  );
}

/** Moves focus to the first invalid control inside `form` (after React has rendered the errors). */
export function focusFirstInvalid(form: HTMLFormElement | null): void {
  requestAnimationFrame(() => {
    const target = form?.querySelector<HTMLElement>('[aria-invalid="true"]');
    target?.focus();
  });
}
