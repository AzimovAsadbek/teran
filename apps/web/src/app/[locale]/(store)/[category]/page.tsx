import type { Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import * as rootParams from 'next/root-params';
import { CategoryPage, categoryMetadata } from '@/components/catalog/category-page';

/** A top-level category ("/tea", "/gift-sets"). Static pages with the same name take precedence. */
export async function generateMetadata({
  params,
  searchParams,
}: PageProps<'/[locale]/[category]'>): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const { category } = await params;
  return categoryMetadata(locale, category, await searchParams);
}

export default function TopLevelCategoryPage({
  params,
  searchParams,
}: PageProps<'/[locale]/[category]'>) {
  return (
    <CategoryPage path={params.then(({ category }) => category)} searchParams={searchParams} />
  );
}
