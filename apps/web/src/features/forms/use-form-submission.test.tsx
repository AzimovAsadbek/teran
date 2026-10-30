import { contactInquirySchema } from '@teran/contracts';
import { act, cleanup, renderHook } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { useFormSubmission } from './use-form-submission';

vi.mock('@/lib/api/client', () => ({ apiRequest: vi.fn() }));
const post = vi.mocked(apiRequest);

const messages = {
  Validation: { fixErrors: 'Fix the fields marked below.' },
  Errors: { network: 'No connection.', generic: 'Something went wrong.' },
};
const wrapper = ({ children }: { children: ReactNode }) => (
  <NextIntlClientProvider locale="en" messages={messages} onError={() => {}}>
    {children}
  </NextIntlClientProvider>
);
const VALID = {
  name: 'Aziz',
  email: 'aziz@example.com',
  phone: '',
  subject: 'Wholesale',
  message: 'Do you deliver to Namangan?',
  locale: 'en',
  website: '',
};
/** The contract as the forms give it: loaded on the first submission. */
const lazyContract = () => Promise.resolve(contactInquirySchema);

function hook() {
  const form = { current: document.createElement('form') };
  return renderHook(() => useFormSubmission(form), { wrapper });
}

describe('useFormSubmission with a contract loaded on submission', () => {
  afterEach(() => {
    cleanup();
    post.mockReset();
  });

  it('loads the contract, then sends the parsed value once', async () => {
    post.mockResolvedValue({});
    const { result } = hook();

    let sent = false;
    await act(async () => {
      sent = await result.current.submit(lazyContract, VALID, '/inquiries/contact');
    });

    expect(sent).toBe(true);
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith('/inquiries/contact', {
      method: 'POST',
      body: expect.objectContaining({ name: 'Aziz', email: 'aziz@example.com' }),
    });
    expect(result.current.status).toBe('sent');
  });

  it('refuses an invalid value with the contract’s codes and sends nothing', async () => {
    const { result } = hook();

    await act(async () => {
      await result.current.submit(lazyContract, { ...VALID, email: 'not-an-email' }, '/x');
    });

    expect(post).not.toHaveBeenCalled();
    expect(result.current.status).toBe('idle');
    // The code each field's message is looked up by (useValidationMessage), in any language.
    expect(result.current.errors.email?.message).toBe('invalid_email');
    expect(result.current.summary).toBe('Fix the fields marked below.');
  });

  it('sends once when pressed twice before the first press settles', async () => {
    let finish!: () => void;
    post.mockReturnValue(new Promise((resolve) => (finish = () => resolve({}))));
    const { result } = hook();

    let first!: Promise<boolean>;
    let second!: Promise<boolean>;
    act(() => {
      first = result.current.submit(lazyContract, VALID, '/inquiries/contact');
      second = result.current.submit(lazyContract, VALID, '/inquiries/contact');
    });
    expect(await second).toBe(false);
    expect(result.current.status).toBe('sending');
    await act(async () => {
      finish();
      expect(await first).toBe(true);
    });

    expect(post).toHaveBeenCalledTimes(1);
  });

  it('reports a contract that cannot be loaded as a connection failure', async () => {
    const { result } = hook();

    let sent = true;
    await act(async () => {
      sent = await result.current.submit(
        () => Promise.reject(new Error('Loading chunk failed')),
        VALID,
        '/inquiries/contact',
      );
    });

    expect(sent).toBe(false);
    expect(post).not.toHaveBeenCalled();
    expect(result.current.status).toBe('idle');
    expect(result.current.apiErrorMessage).toBe('No connection.');
  });

  it("takes the server's verdict on a value the browser accepted", async () => {
    post.mockRejectedValue(
      new ApiError(400, {
        statusCode: 400,
        code: 'VALIDATION_FAILED',
        message: 'Validation failed',
        issues: [{ path: 'phone', code: 'invalid_phone', message: 'invalid_phone' }],
      } as never),
    );
    const { result } = hook();

    await act(async () => {
      await result.current.submit(lazyContract, VALID, '/inquiries/contact');
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.errors.phone).toBeDefined();
  });
});
