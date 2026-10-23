import { jsonLd, type JsonLdObject } from '@/lib/seo';

/** Structured data for search engines, serialised so no text in it can end the script tag. */
export function JsonLd({ data }: { data: JsonLdObject }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(data)} />;
}
