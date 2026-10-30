import { hasLocale } from 'next-intl';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from '@/i18n/routing';
import { getProductList } from '@/lib/data/catalog';

/**
 * TERAN's featured teas for the missing page's row (components/home/not-found-suggestions.tsx),
 * in the language asked for: the storefront's own cached list, prices removed as on every page
 * while they are hidden. Public data only; nothing is written.
 */
export async function GET(request: NextRequest): Promise<Response> {
  const asked = request.nextUrl.searchParams.get('locale');
  const locale = hasLocale(routing.locales, asked) ? asked : routing.defaultLocale;
  const list = await getProductList(locale, 'featured=true&pageSize=8&sort=featured').catch(
    () => null,
  );
  return NextResponse.json({ items: list?.items ?? [] });
}
