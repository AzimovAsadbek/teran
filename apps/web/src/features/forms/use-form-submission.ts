'use client';

import { useTranslations } from 'next-intl';
import { useRef, useState, type RefObject } from 'react';
import { flushSync } from 'react-dom';
import type { z } from 'zod';
import { focusFirstInvalid } from '@/components/ui/field';
import { apiRequest } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { fieldErrorsFromApi, fieldErrorsFromZod, type FieldErrors } from '@/lib/forms';
import { useApiErrorMessage } from '@/lib/use-api-error-message';

type Request = string | ((data: unknown) => Promise<unknown>);
/**
 * The shared contract, or a loader for it: a form whose page should not carry the schemas (and
 * Zod) in its first bundle loads them on its first submission (ADR-067).
 */
type Schema = z.ZodType | (() => Promise<z.ZodType>);
type ContractLoader = () => Promise<z.ZodType>;

/** Contracts already loaded, by their loader (a stable, module-level function). */
const loadedContracts = new WeakMap<ContractLoader, z.ZodType>();

/**
 * Loads a form's contract ahead of its submission (the forms call it when they are first used), so
 * the submission validates at once, as with a contract in the bundle.
 */
export function prepareContract(load: ContractLoader): Promise<z.ZodType> {
  const ready = loadedContracts.get(load);
  if (ready) return Promise.resolve(ready);
  return load().then((contract) => {
    loadedContracts.set(load, contract);
    return contract;
  });
}

export interface FormSubmission {
  errors: FieldErrors;
  summary: string | null;
  apiErrorMessage: string | null;
  /** The failed request's error, for callers that explain some codes themselves. */
  apiError: ApiError | null;
  status: 'idle' | 'sending' | 'sent';
  /**
   * Validates `input` with the shared contract (plus `extraErrors`, e.g. a password confirmation),
   * then sends the parsed value: a path is POSTed, a function receives the parsed data. Resolves to
   * true when the request succeeded. A press while one is under way sends nothing; a contract that
   * cannot be loaded is reported as a connection failure, with every field kept.
   */
  submit: (
    schema: Schema,
    input: unknown,
    request: Request,
    extraErrors?: FieldErrors,
  ) => Promise<boolean>;
  reset: () => void;
  /**
   * The errors still worth showing for the form's current `input` (same shape as submitted): an
   * error disappears as soon as its field changes, instead of re-describing the new value.
   */
  errorsFor: (input: unknown) => FieldErrors;
}

/** The value at a field path ("variants.0.sku") of a submitted input. */
function valueAt(source: unknown, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (node, key) =>
        node !== null && typeof node === 'object'
          ? (node as Record<string, unknown>)[key]
          : undefined,
      source,
    );
}

/**
 * Submission flow shared by every form: client-side validation with the same Zod contract the API
 * uses, server issues mapped onto the same fields, an announced summary and focus on the first
 * invalid field. The caller owns the ref (attach it to the <form> or the element holding the fields).
 */
export function useFormSubmission(formRef: RefObject<HTMLElement | null>): FormSubmission {
  const tv = useTranslations('Validation');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [summary, setSummary] = useState<string | null>(null);
  const [apiError, setApiError] = useState<ApiError | null>(null);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [submitted, setSubmitted] = useState<unknown>(undefined);
  // Set at once, not on the next render: a second press while the contract loads or the request
  // runs sends nothing.
  const busy = useRef(false);
  const apiErrorMessage = useApiErrorMessage(apiError);

  function showErrors(next: FieldErrors) {
    setErrors(next);
    setSummary(tv('fixErrors'));
    focusFirstInvalid(formRef.current);
  }

  async function submit(
    schema: Schema,
    input: unknown,
    request: Request,
    extraErrors: FieldErrors = {},
  ): Promise<boolean> {
    if (busy.current) return false;
    busy.current = true;
    try {
      return await validateAndSend(schema, input, request, extraErrors);
    } finally {
      busy.current = false;
    }
  }

  async function validateAndSend(
    schema: Schema,
    input: unknown,
    request: Request,
    extraErrors: FieldErrors,
  ): Promise<boolean> {
    setApiError(null);
    setSubmitted(input);
    let contract = typeof schema === 'function' ? loadedContracts.get(schema) : schema;
    const late = !contract;
    if (!contract) {
      // Shown as sending only when loading takes a moment, so a quick load does not flash it.
      const pending = window.setTimeout(() => setStatus('sending'), 150);
      try {
        contract = await prepareContract(schema as ContractLoader);
      } catch {
        setStatus('idle');
        setApiError(new ApiError(0, null));
        return false;
      } finally {
        window.clearTimeout(pending);
      }
    }
    const parsed = contract.safeParse(input);
    const fieldErrors = {
      ...extraErrors,
      ...(parsed.success ? {} : fieldErrorsFromZod(parsed.error)),
    };
    if (!parsed.success || Object.keys(fieldErrors).length > 0) {
      const refuse = () => {
        setStatus('idle');
        showErrors(fieldErrors);
      };
      // After a contract that came late the press is over: commit at once, so the first invalid
      // field is marked when it is focused (the next frame), as on a press.
      if (late) flushSync(refuse);
      else refuse();
      return false;
    }
    setErrors({});
    setSummary(null);
    setStatus('sending');
    try {
      await (typeof request === 'string'
        ? apiRequest(request, { method: 'POST', body: parsed.data })
        : request(parsed.data));
      setStatus('sent');
      return true;
    } catch (caught) {
      const failure = caught instanceof ApiError ? caught : new ApiError(0, null);
      setStatus('idle');
      if (failure.code === 'VALIDATION_FAILED' && failure.body?.issues?.length) {
        showErrors(fieldErrorsFromApi(failure.body.issues));
      } else {
        setApiError(failure);
      }
      return false;
    }
  }

  function reset() {
    setErrors({});
    setSummary(null);
    setApiError(null);
    setStatus('idle');
  }

  function errorsFor(input: unknown): FieldErrors {
    return Object.fromEntries(
      Object.entries(errors).filter(
        ([path]) =>
          JSON.stringify(valueAt(submitted, path)) === JSON.stringify(valueAt(input, path)),
      ),
    );
  }

  return { errors, summary, apiErrorMessage, apiError, status, submit, reset, errorsFor };
}
