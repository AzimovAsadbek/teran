import type { SalesDay } from '@teran/contracts';
import { getLocale, getTranslations } from 'next-intl/server';
import { cn } from '@/lib/cn';
import { formatMoney } from '@/lib/format';

/**
 * Daily order value as bars with a value scale, the best day spelled out and the day's figures on
 * hover; the same numbers are in a table for screen readers.
 */
export async function SalesChart({ days }: { days: SalesDay[] }) {
  const [locale, t, tc] = await Promise.all([
    getLocale(),
    getTranslations('Admin'),
    getTranslations('Common'),
  ]);
  const currency = tc('currency.UZS');
  const money = (amount: string | number) => formatMoney(String(amount), locale, currency);
  const values = days.map((day) => Number(day.revenue));
  const max = Math.max(...values, 0);
  const peak = days[values.indexOf(max)];
  const dayLabel = (date: string) =>
    new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
      new Date(`${date}T00:00:00Z`),
    );

  return (
    <figure>
      {max === 0 || !peak ? (
        <p className="text-body-sm text-fg-subtle">{t('dashboard.chartEmpty')}</p>
      ) : (
        <>
          <p className="mb-4 text-body-sm text-fg-muted">
            {t('dashboard.chartPeak', { date: dayLabel(peak.date), amount: money(peak.revenue) })}
          </p>
          <div aria-hidden className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3">
            <div className="flex h-48 flex-col justify-between text-right text-caption text-fg-subtle tabular-nums">
              <span className="-translate-y-1/2">{money(Math.round(max))}</span>
              <span>{money(Math.round(max / 2))}</span>
              <span className="translate-y-1/2">0</span>
            </div>
            <div className="relative h-48 border-b border-line">
              <span className="absolute inset-x-0 top-0 border-t border-dashed border-line" />
              <span className="absolute inset-x-0 top-1/2 border-t border-dashed border-line" />
              <ol
                className="relative grid h-full items-end gap-[3px]"
                style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
              >
                {days.map((day, index) => {
                  const value = values[index] ?? 0;
                  return (
                    <li key={day.date} className="group relative flex h-full items-end">
                      <span
                        className="block w-full rounded-t-[3px] bg-forest-700 transition-colors group-hover:bg-gold-600"
                        style={{
                          height: `${(value / max) * 100}%`,
                          minHeight: value > 0 ? 2 : 0,
                        }}
                      />
                      <span
                        className={cn(
                          'pointer-events-none absolute bottom-full z-10 mb-2 hidden rounded-control bg-surface-inverse px-2.5 py-1.5 text-caption whitespace-nowrap text-fg-inverse shadow-overlay group-hover:block',
                          index < 4
                            ? 'left-0'
                            : index > days.length - 5
                              ? 'right-0'
                              : 'left-1/2 -translate-x-1/2',
                        )}
                      >
                        <span className="font-semibold">{dayLabel(day.date)}</span> ·{' '}
                        {money(day.revenue)} · {t('dashboard.chartOrders', { count: day.orders })}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
            <span />
            {/* Date labels sit under their own bar (every week, and the last day). */}
            <ol
              className="mt-1.5 grid text-caption whitespace-nowrap text-fg-subtle"
              style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
            >
              {days.map((day, index) => {
                const last = index === days.length - 1;
                if (!last && (index % 7 !== 0 || index > days.length - 5)) return null;
                return (
                  <li
                    key={day.date}
                    className={cn(
                      'row-start-1',
                      index === 0
                        ? 'justify-self-start'
                        : last
                          ? 'justify-self-end'
                          : 'justify-self-center',
                    )}
                    style={{ gridColumnStart: index + 1 }}
                  >
                    {dayLabel(day.date)}
                  </li>
                );
              })}
            </ol>
          </div>
        </>
      )}
      <figcaption className="sr-only">{t('dashboard.salesChart')}</figcaption>
      <table className="sr-only">
        <caption>{t('dashboard.salesChart')}</caption>
        <thead>
          <tr>
            <th scope="col">{t('orders.date')}</th>
            <th scope="col">{t('nav.orders')}</th>
            <th scope="col">{t('dashboard.revenue')}</th>
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
            <tr key={day.date}>
              <td>{dayLabel(day.date)}</td>
              <td>{day.orders}</td>
              <td>{money(day.revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
