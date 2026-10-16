import type { AdminTelegramPostList, Locale } from '@teran/contracts';
import { Send } from 'lucide-react';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Pagination } from '@/components/catalog/pagination';
import { TelegramPostActions, TelegramPostState } from '@/components/admin/telegram-history';
import {
  AccessDenied,
  AdminPageHeader,
  Cell,
  EmptyState,
  Panel,
  table,
} from '@/components/admin/ui';
import { Notice } from '@/components/ui/notice';
import { Link } from '@/i18n/navigation';
import { adminGet, apiQuery, pageHref } from '@/lib/admin/server';
import { formatDateTime } from '@/lib/format';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Admin' });
  return { title: t('telegram.title') };
}

/**
 * Telegram announcements: how the channel is configured (off, dry run or live), and every post
 * with its delivery state, newest first. A failed post can be sent again from here or from its
 * item; a delivered post never is. Nothing is sent from this page except an explicit retry.
 */
export default async function AdminTelegramPage({
  searchParams,
}: PageProps<'/[locale]/admin/telegram'>) {
  const [params, locale, t] = await Promise.all([
    searchParams,
    getLocale(),
    getTranslations('Admin'),
  ]);
  const list = await adminGet<AdminTelegramPostList>(
    `/telegram/posts${apiQuery(params, ['page'], { pageSize: '25' })}`,
  );
  if (!list) return <AccessDenied />;
  const totalPages = Math.max(1, Math.ceil(list.total / list.pageSize));

  return (
    <>
      <AdminPageHeader title={t('telegram.title')} description={t('telegram.intro')} />
      <Panel className="mb-6">
        <div className="flex flex-wrap items-start gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-info-soft text-info">
            <Send aria-hidden className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-body font-semibold text-fg">
              {list.mode === 'live'
                ? t('telegram.modes.live', { channel: list.channel ?? '—' })
                : t(`telegram.modes.${list.mode}`)}
            </p>
            <p className="text-body-sm text-fg-muted">{t(`telegram.modeHelp.${list.mode}`)}</p>
          </div>
        </div>
      </Panel>
      {list.mode !== 'live' ? (
        <div className="mb-6">
          <Notice tone="info">{t('telegram.setupHint')}</Notice>
        </div>
      ) : null}
      {list.items.length === 0 ? (
        <EmptyState>{t('telegram.empty')}</EmptyState>
      ) : (
        <div className={table.wrapper}>
          <table className={table.table}>
            <thead>
              <tr>
                <th scope="col" className={table.th}>
                  {t('telegram.item')}
                </th>
                <th scope="col" className={table.th}>
                  {t('common.status')}
                </th>
                <th scope="col" className={table.th}>
                  {t('telegram.when')}
                </th>
                <th scope="col" className={table.th}>
                  <span className="sr-only">{t('common.actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.items.map((post) => {
                const href =
                  post.entityType === 'PRODUCT'
                    ? `/admin/products/${post.entityId}`
                    : `/admin/journal/${post.entityId}`;
                return (
                  <tr key={post.id} className={table.row}>
                    <Cell primary>
                      <span className="flex flex-col gap-0.5">
                        <span className="text-caption text-fg-subtle">
                          {t(`telegram.entities.${post.entityType}`)}
                        </span>
                        {post.entityTitle ? (
                          <Link href={href} className={table.rowLink}>
                            {post.entityTitle}
                          </Link>
                        ) : (
                          <span className="text-fg-muted">{t('telegram.deletedItem')}</span>
                        )}
                      </span>
                    </Cell>
                    <Cell label={t('common.status')}>
                      <TelegramPostState post={post} />
                    </Cell>
                    <Cell label={t('telegram.when')} className="whitespace-nowrap text-fg-muted">
                      {formatDateTime(post.sentAt ?? post.updatedAt, locale as Locale)}
                    </Cell>
                    <Cell className="md:text-right">
                      <TelegramPostActions post={post} />
                    </Cell>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Pagination
        page={list.page}
        totalPages={totalPages}
        hrefFor={(page) => pageHref('/admin/telegram', params, [], page)}
      />
    </>
  );
}
