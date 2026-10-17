import type { Locale } from '@teran/contracts';

/*
 * Long-form page copy (about, policies, help) lives in typed modules rather than the UI message
 * files: it is reviewed like code, never shipped to the browser bundle, and every locale has to
 * provide the same structure. Text in [square brackets] is information TERAN still has to confirm;
 * it is highlighted on the page and listed in docs/business-information-required.md.
 */

export type Block = string | { list: readonly string[] } | { note: string };

export interface Section {
  /** Stable anchor, the same in every locale (used by the table of contents). */
  id: string;
  heading: string;
  blocks: readonly Block[];
}

export interface LongFormContent {
  title: string;
  /** Search result title, used as it is (no "— TERAN"): the title with what the page is about. */
  metaTitle?: string;
  /** Meta description (≤ 160 characters). */
  description: string;
  intro?: string;
  sections: readonly Section[];
}

export interface QuestionGroup {
  id: string;
  heading: string;
  items: readonly { question: string; answer: readonly Block[] }[];
}

export type Localized<T> = Record<Locale, T>;
