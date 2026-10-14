import type { SalesDay } from '@teran/contracts';
import { getLocale, getTranslations } from 'next-intl/server';
import { formatMoney } from '@/lib/format';

const WIDTH = 720;
const HEIGHT = 200;
const PADDING_BOTTOM = 24;

/** Daily order value as an SVG bar chart, with the same figures in a table for screen readers. */
export async function SalesChart({ days }: { days: SalesDay[] }) {
  const [locale, t, tc] = await Promise.all([
    getLocale(),
    getTranslations('Admin'),
    getTranslations('Common'),
  ]);
  const currency = tc('currency.UZS');
  const values = days.map((day) => Number(day.revenue));
  const max = Math.max(...values, 1);
  const barWidth = WIDTH / days.length;
  const plotHeight = HEIGHT - PADDING_BOTTOM;
  const dayLabel = (date: string) =>
    new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
      new Date(`${date}T00:00:00Z`),
    );

  return (
    <figure>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-52 w-full" aria-hidden>
        {[0.25, 0.5, 0.75, 1].map((fraction) => (
          <line
            key={fraction}
            x1={0}
            x2={WIDTH}
            y1={plotHeight - plotHeight * fraction}
            y2={plotHeight - plotHeight * fraction}
            className="stroke-line"
            strokeWidth={1}
          />
        ))}
        {days.map((day, index) => {
          const value = values[index] ?? 0;
          const height = (value / max) * (plotHeight - 8);
          return (
            <g key={day.date}>
              <rect
                x={index * barWidth + 3}
                y={plotHeight - height}
                width={barWidth - 6}
                height={Math.max(height, value > 0 ? 2 : 0)}
                rx={3}
                className="fill-forest-700"
              >
                <title>{`${dayLabel(day.date)}: ${formatMoney(day.revenue, locale, currency)}`}</title>
              </rect>
              {index % 5 === 0 ? (
                <text
                  x={index * barWidth + barWidth / 2}
                  y={HEIGHT - 6}
                  textAnchor="middle"
                  className="fill-ink-500 text-[11px]"
                >
                  {dayLabel(day.date)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
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
              <td>{formatMoney(day.revenue, locale, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
