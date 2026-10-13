'use client';

import { INQUIRY_STATUSES, inquiryUpdateSchema, type InquiryStatus } from '@teran/contracts';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { ApiAlert, SubmitButton } from '@/components/account/auth-forms';
import { SelectField, TextAreaField } from '@/components/ui/field';
import { useFormSubmission } from '@/features/forms/use-form-submission';
import { useRouter } from '@/i18n/navigation';
import { apiRequest } from '@/lib/api/client';

/** Status and internal note of one inquiry (staff only). */
export function InquiryEditor({
  kind,
  id,
  status,
  internalNote,
}: {
  kind: 'contact' | 'wholesale';
  id: string;
  status: InquiryStatus;
  internalNote: string | null;
}) {
  const t = useTranslations('Admin');
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const form = useFormSubmission(formRef);
  const [value, setValue] = useState<string>(status);
  const [note, setNote] = useState(internalNote ?? '');

  return (
    <form
      ref={formRef}
      onSubmit={(event) => {
        event.preventDefault();
        void form
          .submit(inquiryUpdateSchema, { status: value, internalNote: note }, (data) =>
            apiRequest(`/admin/inquiries/${kind}/${id}`, { method: 'PATCH', body: data }),
          )
          .then((saved) => {
            if (saved) router.refresh();
          });
      }}
      className="mt-4 grid grid-cols-1 gap-3 border-t border-ivory-200 pt-4 sm:grid-cols-[12rem_minmax(0,1fr)_auto] sm:items-end"
    >
      <SelectField
        label={t('common.status')}
        name="status"
        required
        options={INQUIRY_STATUSES.map((option) => ({
          value: option,
          label: t(`inquiryStatus.${option}`),
        }))}
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <TextAreaField
        label={t('inquiries.internalNote')}
        name="internalNote"
        rows={1}
        maxLength={2000}
        hint={t('inquiries.internalNoteHint')}
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
      <div className="sm:pb-7">
        <SubmitButton
          sending={form.status === 'sending'}
          label={t('common.save')}
          sendingLabel={t('common.saving')}
          className=""
        />
      </div>
      <div className="sm:col-span-3">
        <ApiAlert message={form.apiErrorMessage} />
      </div>
    </form>
  );
}
