'use client';

import type { AssistantLink, AssistantReplyDto, Locale } from '@teran/contracts';
import { ArrowUpRight, ChevronRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { ProductImage } from '@/components/catalog/product-image';
import { Link } from '@/i18n/navigation';
import { formatMoney, packLabel } from '@/lib/format';
import { showPrices } from '@/lib/site';

/** Where each page an answer points to lives. */
const PAGE_HREF: Record<AssistantLink, string> = {
  catalog: '/catalog',
  delivery: '/delivery',
  contact: '/contact',
  wholesale: '/wholesale',
  about: '/about',
  faq: '/faq',
  stores: '/stores',
  tea101: '/tea-101',
  returns: '/returns',
  journal: '/journal',
};

const LINK_CHIP =
  'inline-flex min-h-8 items-center gap-1 rounded-full bg-[#0b5a5e] px-3 text-[0.8125rem] font-semibold text-white transition-colors duration-200 hover:bg-[#075e5d]';

/**
 * An answer of the AI assistant in the chat (ADR-055): its words as a TERAN bubble, then the
 * products it names as small cards (picture, name, category and pack — or price where the store
 * shows prices) and the categories and pages it points to as dark pills. Following one closes the
 * window on phones (`onFollow`), where it covers the page.
 */
export function AssistantAnswer({
  answer,
  onFollow,
  bubble,
}: {
  answer: AssistantReplyDto;
  onFollow: () => void;
  /** The TERAN bubble's classes (chat-panel). */
  bubble: string;
}) {
  const t = useTranslations('Chat');
  const tp = useTranslations('Product');
  const tc = useTranslations('Common');
  const locale = useLocale() as Locale;
  const paragraphs = answer.reply.split(/\n{2,}/);
  const links = [
    ...answer.categories.map((category) => ({ href: `/${category.path}`, label: category.name })),
    ...answer.links.map((link) => ({ href: PAGE_HREF[link], label: t(`pages.${link}`) })),
  ];

  return (
    <>
      <div className={`${bubble} flex flex-col gap-2 py-3`}>
        <span className="sr-only">{t('advisor')}: </span>
        {paragraphs.map((paragraph, index) => (
          <p key={index} className="whitespace-pre-line">
            {paragraph}
          </p>
        ))}
      </div>
      {answer.products.length > 0 ? (
        <ul aria-label={t('productsLabel')} className="flex flex-col gap-1.5 self-stretch">
          {answer.products.map((product) => {
            const soldOut = product.stockLevel === 'out_of_stock';
            const pack = product.defaultVariant
              ? showPrices
                ? formatMoney(product.defaultVariant.price, locale, tc('currency.UZS'))
                : packLabel(product.defaultVariant, product.format, locale, (key, values) =>
                    tp(`units.${key}`, values),
                  )
              : null;
            return (
              <li key={product.id}>
                <Link
                  href={`/products/${product.slug}`}
                  onClick={onFollow}
                  className="group flex items-center gap-3 rounded-[1.125rem] bg-white p-1.5 pr-3 text-fg shadow-[0_1px_3px_rgb(0_0_0_/_12%)] transition-[background-color,translate] duration-200 hover:bg-ivory-50 active:translate-y-px"
                >
                  <span className="h-14 w-14 shrink-0 overflow-hidden rounded-[0.875rem] bg-ivory-100">
                    <ProductImage image={product.image} name={product.name} sizes="56px" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.9375rem] leading-snug font-semibold">
                      {product.name}
                    </span>
                    <span className="block truncate text-[0.8125rem] leading-snug text-fg-muted">
                      {[product.category.name, soldOut ? t('outOfStock') : pack]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                  <ChevronRight
                    aria-hidden
                    className="h-4 w-4 shrink-0 text-fg-subtle transition-transform duration-200 group-hover:translate-x-0.5"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
      {links.length > 0 ? (
        <ul aria-label={t('linksLabel')} className="flex flex-wrap gap-1.5">
          {links.map((link) => (
            <li key={link.href}>
              <Link href={link.href} onClick={onFollow} className={LINK_CHIP}>
                {link.label}
                <ArrowUpRight aria-hidden className="h-3.5 w-3.5" strokeWidth={2.25} />
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
