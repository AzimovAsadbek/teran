/*
 * Link addresses and codes made from names, so staff do not have to type them: "Yashil choy"
 * becomes "yashil-choy", "Жасминовый чай" becomes "zhasminovyy-chay".
 */

const CYRILLIC: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'yo',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'kh',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'shch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
  ў: 'o',
  қ: 'q',
  ғ: 'g',
  ҳ: 'h',
};

/** Lower-case Latin letters, digits and single hyphens, at most `maxLength` characters. */
export function slugify(text: string, maxLength = 80): string {
  const latin = Array.from(text.toLowerCase(), (char) => CYRILLIC[char] ?? char)
    .join('')
    // Uzbek oʻ, gʻ and the apostrophe sign (ʻ ʼ ' ’ `) carry no letter of their own.
    .replace(/[ʻʼ'’`‘]/g, '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '');
  const slug = latin.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (slug.length <= maxLength) return slug;
  const cut = slug.slice(0, maxLength);
  return cut.includes('-') ? cut.slice(0, cut.lastIndexOf('-')) : cut;
}

/**
 * A pack code from the product name and its size, e.g. "TRN-JASMIN-GREEN-100": up to three words
 * of six letters, upper case, made unique against `taken` with a number at the end.
 */
export function suggestSku(name: string, size: string, taken: ReadonlySet<string>): string {
  const words = slugify(name)
    .split('-')
    .filter(Boolean)
    .slice(0, 3)
    .map((word) => word.slice(0, 6).toUpperCase());
  const base = ['TRN', ...words, size.trim().replace(/\D/g, '')].filter(Boolean).join('-');
  let candidate = base.slice(0, 40).replace(/-+$/, '');
  for (let suffix = 2; taken.has(candidate); suffix += 1) {
    candidate = `${base.slice(0, 36).replace(/-+$/, '')}-${suffix}`;
  }
  return candidate;
}
