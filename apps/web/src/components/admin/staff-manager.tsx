'use client';

import { staffCreateSchema, type AdminStaffMember, type Locale } from '@teran/contracts';
import { Plus } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRef, useState, type FormEvent } from 'react';
import { ApiAlert, SubmitButton } from '@/components/account/auth-forms';
import { FormErrorSummary, SelectField, TextField } from '@/components/ui/field';
import { Sheet } from '@/components/ui/sheet';
import { useFormSubmission } from '@/features/forms/use-form-submission';
import { useRouter } from '@/i18n/navigation';
import { apiRequest } from '@/lib/api/client';
import { formatDateTime } from '@/lib/format';
import { useValidationMessage } from '@/lib/use-validation-message';
import { table } from './ui';
import { useAdminAction } from './use-admin-action';

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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await form.submit(staffCreateSchema, values, '/admin/staff');
    if (saved) {
      router.refresh();
      onDone();
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-4 px-5 py-4">
      <FormErrorSummary message={form.summary} />
      <TextField
        label={t('staff.email')}
        name="email"
        type="email"
        autoComplete="off"
        required
        value={values.email}
        onChange={set('email')}
        error={message(form.errors.email, values.email)}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label={t('staff.firstName')}
          name="firstName"
          required
          value={values.firstName}
          onChange={set('firstName')}
          error={message(form.errors.firstName, values.firstName)}
        />
        <TextField
          label={t('staff.lastName')}
          name="lastName"
          value={values.lastName}
          onChange={set('lastName')}
          error={message(form.errors.lastName, values.lastName)}
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
        error={message(form.errors.password, values.password)}
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

/** Staff accounts: roles and access (administrators only; self-demotion is refused by the API). */
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

  const update = (
    member: AdminStaffMember,
    patch: Partial<Pick<AdminStaffMember, 'role' | 'isActive'>>,
  ) =>
    void action.run(() =>
      apiRequest(`/admin/staff/${member.id}`, {
        method: 'PATCH',
        body: { role: patch.role ?? member.role, isActive: patch.isActive ?? member.isActive },
      }),
    );

  return (
    <>
      <div className="mb-5 flex justify-end">
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-forest-900 px-5 text-sm font-semibold text-ivory-50 hover:bg-forest-800"
        >
          <Plus aria-hidden className="h-4 w-4" />
          {t('staff.newStaff')}
        </button>
      </div>
      {action.error ? (
        <p
          role="alert"
          className="mb-4 rounded-xl bg-danger-100 px-4 py-3 text-sm font-medium text-danger-700"
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
                  <td className={table.td}>
                    <span className="font-semibold">
                      {[member.firstName, member.lastName].filter(Boolean).join(' ')}
                      {self ? (
                        <span className="ml-1 font-normal text-ink-500">({t('staff.you')})</span>
                      ) : null}
                    </span>
                    <span className="block text-xs text-ink-500">{member.email}</span>
                  </td>
                  <td className={table.td}>{t(`roles.${member.role}`)}</td>
                  <td className={`${table.td} whitespace-nowrap`}>
                    {member.lastLoginAt
                      ? formatDateTime(member.lastLoginAt, locale)
                      : t('staff.never')}
                  </td>
                  <td className={table.td}>
                    {member.isActive ? t('common.active') : t('common.inactive')}
                  </td>
                  <td className={`${table.td} text-right`}>
                    {self ? null : (
                      <span className="inline-flex flex-wrap justify-end gap-1">
                        <button
                          type="button"
                          disabled={action.pending}
                          onClick={() =>
                            update(member, { role: member.role === 'ADMIN' ? 'MANAGER' : 'ADMIN' })
                          }
                          className="h-9 rounded-full px-3 text-sm font-semibold text-forest-900 hover:bg-ivory-100 disabled:opacity-50"
                        >
                          {member.role === 'ADMIN' ? t('staff.makeManager') : t('staff.makeAdmin')}
                        </button>
                        <button
                          type="button"
                          disabled={action.pending}
                          onClick={() => update(member, { isActive: !member.isActive })}
                          className={
                            member.isActive
                              ? 'h-9 rounded-full px-3 text-sm font-semibold text-danger-700 hover:bg-danger-100 disabled:opacity-50'
                              : 'h-9 rounded-full px-3 text-sm font-semibold text-leaf-600 hover:bg-leaf-100 disabled:opacity-50'
                          }
                        >
                          {member.isActive ? t('staff.deactivate') : t('staff.activate')}
                        </button>
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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
