/** One article as the help-centre search knows it: where it is, its title, its category and text. */
export interface HelpSearchEntry {
  href: string;
  title: string;
  trail: string;
  text: string;
}

/** Lower case without accents or Uzbek apostrophes, so "oʻ", "o'" and "o" match alike. */
function fold(value: string): string {
  return value
    .toLocaleLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[ʻʼ'`’‘]/g, '');
}

/** Articles holding every word of the query, those with all of them in the title first. */
export function matchArticles(
  entries: readonly HelpSearchEntry[],
  query: string,
): HelpSearchEntry[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const scored = entries.flatMap((entry) => {
    const title = fold(entry.title);
    const all = `${title} ${fold(entry.text)}`;
    if (!words.every((word) => all.includes(word))) return [];
    return [{ entry, inTitle: words.every((word) => title.includes(word)) }];
  });
  return [...scored.filter((item) => item.inTitle), ...scored.filter((item) => !item.inTitle)].map(
    (item) => item.entry,
  );
}
