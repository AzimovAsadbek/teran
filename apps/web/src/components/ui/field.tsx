'use client';

import { Check, CircleAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  useEffect,
  useId,
  useRef,
  type ChangeEvent,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/lib/cn';
import {
  inputClasses,
  selectClasses,
  SelectChevron,
  textareaClasses,
  type ControlSize,
} from './controls';

/*
 * Labelled form controls (docs/design/component-audit.md). Each control is wired to its hint and
 * error with aria-describedby, marks itself aria-invalid when it has an error, and shows
 * "optional" on fields that are not required (rather than asterisks on required ones). Labels are
 * always visible; placeholders only give examples. Errors carry an icon and text, never colour
 * alone. Native elements are kept for selects, checkboxes and radios (keyboard, screen readers and
 * mobile pickers work as people expect); only their appearance is customised.
 */

// Class helpers live in ./controls (no client directive) so server components can call them too.
export {
  inputClasses,
  radioDotClasses,
  SelectChevron,
  selectClasses,
  textareaClasses,
  type ControlSize,
} from './controls';

interface FieldChromeProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
  size?: ControlSize;
}

/**
 * Text typed or autofilled before the page became interactive is in the element but not in the
 * form's state, because a controlled field only learns about input through onChange. Once
 * hydrated, the field hands such a value to onChange, so what people see is what gets sent.
 */
function useEarlyInput<E extends HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
  value: unknown,
  onChange: ((event: ChangeEvent<E>) => void) | undefined,
) {
  const ref = useRef<E>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || !onChange || value === undefined || element.value === String(value)) return;
    onChange({ target: element, currentTarget: element } as ChangeEvent<E>);
    // Runs once, right after hydration; later input arrives through onChange as usual.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return ref;
}

function useFieldIds(error: string | undefined, hint: ReactNode) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return { id, hintId, errorId, describedBy };
}

export function FieldLabel({
  htmlFor,
  required,
  children,
  className,
}: {
  htmlFor: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const t = useTranslations('Common');
  return (
    <label htmlFor={htmlFor} className={cn('mb-2 block text-label text-fg', className)}>
      {children}
      {required ? null : <span className="font-normal text-fg-subtle"> ({t('optional')})</span>}
    </label>
  );
}

export function FieldHint({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} className="mt-1.5 text-helper text-fg-subtle">
      {children}
    </p>
  );
}

export function FieldError({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-helper font-medium text-danger">
      <CircleAlert aria-hidden className="mt-px h-4 w-4 shrink-0" />
      <span>{children}</span>
    </p>
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
      {hint ? <FieldHint id={hintId}>{hint}</FieldHint> : null}
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </>
  );
}

export function TextField({
  label,
  hint,
  error,
  required,
  className,
  size = 'md',
  ...input
}: FieldChromeProps & Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'id' | 'size'>) {
  const { id, hintId, errorId, describedBy } = useFieldIds(error, hint);
  const ref = useEarlyInput(input.value, input.onChange);
  return (
    <div className={className}>
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      <input
        ref={ref}
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={inputClasses({ invalid: Boolean(error), size })}
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
  const ref = useEarlyInput(textarea.value, textarea.onChange);
  return (
    <div className={className}>
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      <textarea
        ref={ref}
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        rows={4}
        className={textareaClasses({ invalid: Boolean(error) })}
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
  size = 'md',
  ...select
}: FieldChromeProps &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className' | 'id' | 'size'> & {
    placeholder?: string;
    options: readonly { value: string; label: string; disabled?: boolean }[];
  }) {
  const { id, hintId, errorId, describedBy } = useFieldIds(error, hint);
  const ref = useEarlyInput(select.value, select.onChange);
  return (
    <div className={className}>
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      <div className="relative">
        <select
          ref={ref}
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={selectClasses({ invalid: Boolean(error), size })}
          {...select}
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <SelectChevron />
      </div>
      <HintAndError hint={hint} hintId={hintId} error={error} errorId={errorId} />
    </div>
  );
}

/**
 * A native checkbox drawn to match the controls. The input stays the real, focusable element; the
 * tick is decoration on top of it.
 */
export function Checkbox({
  className,
  invalid = false,
  ...input
}: { className?: string; invalid?: boolean } & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'className' | 'type'
>) {
  return (
    <span className={cn('relative inline-flex h-5 w-5 shrink-0', className)}>
      <input
        type="checkbox"
        aria-invalid={invalid || undefined}
        className={cn(
          'peer h-5 w-5 cursor-pointer appearance-none rounded-sm border bg-surface transition-colors duration-150',
          'checked:border-brand checked:bg-brand hover:not-checked:border-fg-subtle checked:hover:bg-brand-hover',
          'disabled:cursor-not-allowed disabled:opacity-50',
          invalid ? 'border-danger' : 'border-line-strong',
        )}
        {...input}
      />
      <Check
        aria-hidden
        strokeWidth={3}
        className="pointer-events-none absolute inset-0 m-auto h-3.5 w-3.5 text-fg-inverse opacity-0 transition-opacity duration-150 peer-checked:opacity-100"
      />
    </span>
  );
}

export function CheckboxField({
  label,
  hint,
  error,
  className,
  ...input
}: { label: ReactNode; hint?: ReactNode; error?: string; className?: string } & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'className' | 'id' | 'type'
>) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={className}>
      <div className="flex items-start gap-3">
        <Checkbox
          id={id}
          invalid={Boolean(error)}
          aria-describedby={describedBy}
          className="mt-0.5"
          {...input}
        />
        <label htmlFor={id} className="cursor-pointer text-body-sm text-fg-muted">
          {label}
        </label>
      </div>
      {hint || error ? (
        <div className="pl-8">
          <HintAndError hint={hint} hintId={hintId} error={error} errorId={errorId} />
        </div>
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
      className="flex items-start gap-2.5 rounded-control border border-danger/25 bg-danger-soft px-4 py-3 text-body-sm font-medium text-danger"
    >
      <CircleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </p>
  );
}

/** Moves focus to the first invalid control inside `container` (after React has rendered the errors). */
export function focusFirstInvalid(container: HTMLElement | null): void {
  requestAnimationFrame(() => {
    const target = container?.querySelector<HTMLElement>('[aria-invalid="true"]');
    target?.focus();
  });
}
