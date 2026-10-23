import { siteUrl } from '@/lib/site';

/** A schema.org object as it goes into a page (`@context`, `@type` and its properties). */
export type JsonLdObject = Record<string, unknown>;

/** The organisation (TERAN, the shop) and the website, referred to by these ids everywhere. */
export const ORGANIZATION_ID = `${siteUrl}/#organization`;
export const WEBSITE_ID = `${siteUrl}/#website`;

/**
 * JSON for a structured data script (application/ld+json). Product names, descriptions and
 * reviews are written by people, so nothing in them may end the script or start markup: `<`, `>`
 * and `&` are written as JSON escapes (the parsed values are unchanged), and so are U+2028 and
 * U+2029, which end a line in JavaScript. Properties left undefined are dropped.
 */
export function serializeJsonLd(data: JsonLdObject): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/** For `dangerouslySetInnerHTML` (see components/seo/json-ld.tsx). */
export function jsonLd(data: JsonLdObject): { __html: string } {
  return { __html: serializeJsonLd(data) };
}
