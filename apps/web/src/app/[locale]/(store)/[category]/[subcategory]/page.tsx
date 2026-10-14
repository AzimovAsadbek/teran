import type { Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import * as rootParams from 'next/root-params';
import { CategoryPage, categoryMetadata } from '@/components/catalog/category-page';

/** A subcategory ("/tea/green-tea"). */
export async function generateMetadata({
  params,
  searchParams,
}: PageProps<'/[locale]/[category]/[subcategory]'>): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const { category, subcategory } = await params;
  return categoryMetadata(locale, `${category}/${subcategory}`, await searchParams);
}

export default function SubcategoryPage({
  params,
  searchParams,
}: PageProps<'/[locale]/[category]/[subcategory]'>) {
  return (
    <CategoryPage
      path={params.then(({ category, subcategory }) => `${category}/${subcategory}`)}
      searchParams={searchParams}
    />
  );
}
