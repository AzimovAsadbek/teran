import { buildSearchText } from '@teran/contracts';

interface SearchableTranslation {
  name: string;
  shortDescription?: string | null;
  description?: string | null;
  ingredients?: string | null;
  tastingNotes?: string | null;
  origin?: string | null;
}

/** The `searchText` stored with every product translation (used by the seed and the admin alike). */
export function productSearchText(translation: SearchableTranslation): string {
  return buildSearchText([
    translation.name,
    translation.shortDescription,
    translation.description,
    translation.ingredients,
    translation.tastingNotes,
    translation.origin,
  ]);
}
