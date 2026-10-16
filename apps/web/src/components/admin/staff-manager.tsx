'use client';

import { staffCreateSchema, type AdminStaffMember, type Locale } from '@teran/contracts';
import { Plus } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRef, useState, type FormEvent } from 'react';
import { ApiAlert, SubmitButton } from '@/components/account/auth-forms';
import { FormErrorSummary, SelectField, TextField } from '@/components/ui/field';
import { Notice } from '@/components/ui/notice';
import { Sheet } from '@/components/ui/sheet';
import { useFormSubmission } from '@/features/forms/use-form-submission';
import { useRouter } from '@/i18n/navigation';
import { apiRequest } from '@/lib/api/client';
import { formatDateTime } from '@/lib/format';
import { useValidationMessage } from '@/lib/use-validation-message';
import { Cell, table } from './table';
import { ConfirmDialog } from './confirm-dialog';
import { notify } from './toast';
import { useAdminAction } from './use-admin-action';
import { buttonClasses } from '@/components/ui/button';

function NewStaffForm({ onDone }: { onDone: () => void }) {
  const t = useTranslations('Admin');
  const router = useRouter();
  const message = useValidationMessage();
  const formRef = useRef<HTMLFormElement>(null);
  const form = useFormSubmission(formRef);
  const [values, setValues] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'MANAGER',
    password: '',
  });
  const set = (key: keyof typeof values) => (event: { target: { value: string } }) =>
    setValues((current) => ({ ...current, [key]: event.target.value }));
  const visible = form.errorsFor(values);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await form.submit(staffCreateSchema, values, '/admin/staff');
    if (saved) {
      notify(t('staff.saved'));
      router.refresh();
      onDone();
    }
  }

  return (
    <form
      method="post"
      ref={formRef}
      onSubmit={onSubmit}
      noValidate
      className="space-y-4 px-5 py-4"
    >
      <FormErrorSummary message={Object.keys(visible).length > 0 ? form.summary : null} />
      <TextField
        label={t('staff.email')}
        name="email"
        type="email"
        autoComplete="off"
        required
        value={values.email}
        onChange={set('email')}
        error={message(visible.email, values.email)}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label={t('staff.firstName')}
          name="firstName"
          required
          value={values.firstName}
          onChange={set('firstName')}
          error={message(visible.firstName, values.firstName)}
        />
        <TextField
          label={t('staff.lastName')}
          name="lastName"
          value={values.lastName}
          onChange={set('lastName')}
          error={message(visible.lastName, values.lastName)}
        />
      </div>
      <SelectField
        label={t('staff.role')}
        name="role"
        required
        options={(['MANAGER', 'ADMIN'] as const).map((role) => ({
          value: role,
          label: t(`roles.${role}`),
        }))}
        value={values.role}
        onChange={set('role')}
      />
      <TextField
        label={t('staff.password')}
        name="password"
        type="password"
        autoComplete="new-password"
        required
        hint={t('staff.passwordHint')}
        value={values.password}
        onChange={set('password')}
        error={message(visible.password, values.password)}
      />
      <ApiAlert message={form.apiErrorMessage} />
      <SubmitButton
        sending={form.status === 'sending'}
        label={t('common.create')}
        sendingLabel={t('common.saving')}
      />
    </form>
  );
}

type Change = 'makeAdmin' | 'makeManager' | 'deactivate' | 'activate';

const CHANGE_TEXT = {
  makeAdmin: {
    title: 'staff.confirmMakeAdmin',
    text: 'staff.confirmMakeAdminText',
    button: 'staff.makeAdmin',
  },
  makeManager: {
    title: 'staff.confirmMakeManager',
    text: 'staff.confirmMakeManagerText',
    button: 'staff.makeManager',
  },
  deactivate: {
    title: 'staff.confirmDeactivate',
    text: 'staff.confirmDeactivateText',
    button: 'staff.deactivate',
  },
  activate: {
    title: 'staff.confirmActivate',
    text: 'staff.confirmActivateText',
    button: 'staff.activate',
  },
} as const;

/**
 * Staff accounts: roles and access (administrators only; self-demotion is refused by the API).
 * Every change of role or access is confirmed first and says what it means.
 */
export function StaffManager({
  staff,
  currentUserId,
}: {
  staff: AdminStaffMember[];
  currentUserId: string;
}) {
  const t = useTranslations('Admin');
  const tc = useTranslations('Common');
  const locale = useLocale() as Locale;
  const action = useAdminAction();
  const [creating, setCreating] = useState(false);
  const [pending, setPending] = useState<{ member: AdminStaffMember; change: Change } | null>(null);
  const fullName = (member: AdminStaffMember) =>
    [member.firstName, member.lastName].filter(Boolean).join(' ') || member.email;

  async function apply() {
    if (!pending) return;
    const { member, change } = pending;
    const ok = await action.run(() =>
      apiRequest(`/admin/staff/${member.id}`, {
        method: 'PATCH',
        body: {
          role:
            change === 'makeAdmin' ? 'ADMIN' : change === 'makeManager' ? 'MANAGER' : member.role,
          isActive:
            change === 'activate' ? true : change === 'deactivate' ? false : member.isActive,
        },
      }),
    );
    if (ok) {
      setPending(null);
      notify(t('staff.saved'));
    }
  }

  const text = pending ? CHANGE_TEXT[pending.change] : null;

  return (
    <>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <Notice tone="info" className="max-w-2xl">
          {t('staff.roleHelp')}
        </Notice>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className={buttonClasses('primary')}
        >
          <Plus aria-hidden className="h-4 w-4" />
          {t('staff.newStaff')}
        </button>
      </div>
      {action.error && pending === null ? (
        <p
          role="alert"
          className="mb-4 rounded-control bg-danger-soft px-4 py-3 text-body-sm font-medium text-danger"
        >
          {action.error}
        </p>
      ) : null}
      <div className={table.wrapper}>
        <table className={table.table}>
          <thead>
            <tr>
              <th scope="col" className={table.th}>
                {t('staff.name')}
              </th>
              <th scope="col" className={table.th}>
                {t('staff.role')}
              </th>
              <th scope="col" className={table.th}>
                {t('staff.lastLogin')}
              </th>
              <th scope="col" className={table.th}>
                {t('common.status')}
              </th>
              <th scope="col" className={`${table.th} text-right`}>
                {t('common.actions')}
              </th>
            </tr>
          </thead>
          <tbody>
            {staff.map((member) => {
              const self = member.id === currentUserId;
              return (
                <tr key={member.id}>
                  <Cell primary>
                    <span className="font-semibold">
                      {[member.firstName, member.lastName].filter(Boolean).join(' ')}
                      {self ? (
                        <span className="ml-1 font-normal text-fg-subtle">({t('staff.you')})</span>
                      ) : null}
                    </span>
                    <span className="block text-xs break-all text-fg-subtle">{member.email}</span>
                  </Cell>
                  <Cell label={t('staff.role')}>{t(`roles.${member.role}`)}</Cell>
                  <Cell label={t('staff.lastLogin')} className="whitespace-nowrap">
                    {member.lastLoginAt
                      ? formatDateTime(member.lastLoginAt, locale)
                      : t('staff.never')}
                  </Cell>
                  <Cell label={t('common.status')}>
                    <span
                      className={member.isActive ? 'font-semibold text-success' : 'text-fg-subtle'}
                    >
                      {member.isActive ? t('common.active') : t('common.inactive')}
                    </span>
                  </Cell>
                  <Cell className="text-right max-md:justify-end">
                    {self ? null : (
                      <span className="inline-flex flex-wrap justify-end gap-1">
                        <button
                          type="button"
                          disabled={action.pending}
                          onClick={() =>
                            setPending({
                              member,
                              change: member.role === 'ADMIN' ? 'makeManager' : 'makeAdmin',
                            })
                          }
                          className={buttonClasses('ghost', 'sm')}
                        >
                          {member.role === 'ADMIN' ? t('staff.makeManager') : t('staff.makeAdmin')}
                        </button>
                        <button
                          type="button"
                          disabled={action.pending}
                          onClick={() =>
                            setPending({
                              member,
                              change: member.isActive ? 'deactivate' : 'activate',
                            })
                          }
                          className={buttonClasses(
                            member.isActive ? 'danger-ghost' : 'ghost',
                            'sm',
                          )}
                        >
                          {member.isActive ? t('staff.deactivate') : t('staff.activate')}
                        </button>
                      </span>
                    )}
                  </Cell>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ConfirmDialog
        open={pending !== null}
        title={pending && text ? t(text.title, { name: fullName(pending.member) }) : ''}
        description={text ? t(text.text) : undefined}
        confirmLabel={text ? t(text.button) : ''}
        cancelLabel={t('orders.notNow')}
        tone={pending?.change === 'deactivate' ? 'danger' : 'primary'}
        pending={action.pending}
        error={pending ? action.error : null}
        onClose={() => {
          setPending(null);
          action.clearError();
        }}
        onConfirm={() => void apply()}
      />
      <Sheet
        open={creating}
        onClose={() => setCreating(false)}
        side="right"
        title={t('staff.newStaff')}
        closeLabel={tc('close')}
      >
        {creating ? <NewStaffForm onDone={() => setCreating(false)} /> : null}
      </Sheet>
    </>
  );
}
