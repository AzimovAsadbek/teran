import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider, useTranslations } from 'next-intl';
import { describe, expect, it } from 'vitest';
import uz from '../../messages/uz.json';
import { MergeMessages } from './merge-messages';
import { pickMessages } from './messages';

describe('pickMessages', () => {
  it('picks whole namespaces and single entries', () => {
    expect(pickMessages(uz, ['Common', 'Validation.invalid_email'])).toEqual({
      Common: uz.Common,
      Validation: { invalid_email: uz.Validation.invalid_email },
    });
  });

  it('keeps a whole namespace when an entry of it is picked as well', () => {
    expect(pickMessages(uz, ['Validation', 'Validation.required']).Validation).toEqual(
      uz.Validation,
    );
    expect(pickMessages(uz, ['Validation.required', 'Validation']).Validation).toEqual(
      uz.Validation,
    );
  });
});

function Labels() {
  const common = useTranslations('Common');
  const validation = useTranslations('Validation');
  const forms = useTranslations('Forms');
  return (
    <p>{[common('close'), validation('invalid_email'), validation('required'), forms('send')]}</p>
  );
}

describe('MergeMessages', () => {
  it('adds messages to the enclosing provider instead of replacing them', () => {
    render(
      <NextIntlClientProvider
        locale="uz"
        messages={pickMessages(uz, ['Common', 'Validation.invalid_email'])}
      >
        <MergeMessages messages={pickMessages(uz, ['Validation', 'Forms'])}>
          <Labels />
        </MergeMessages>
      </NextIntlClientProvider>,
    );
    expect(screen.getByRole('paragraph')).toHaveTextContent(
      [uz.Common.close, uz.Validation.invalid_email, uz.Validation.required, uz.Forms.send].join(
        '',
      ),
    );
  });

  it('keeps the entries of a namespace the enclosing provider holds in full', () => {
    render(
      <NextIntlClientProvider
        locale="uz"
        messages={pickMessages(uz, ['Common', 'Validation', 'Forms'])}
      >
        <MergeMessages messages={pickMessages(uz, ['Validation.invalid_email'])}>
          <Labels />
        </MergeMessages>
      </NextIntlClientProvider>,
    );
    expect(screen.getByRole('paragraph')).toHaveTextContent(uz.Validation.required);
  });
});
