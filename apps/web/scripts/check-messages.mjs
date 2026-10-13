// Verifies that every locale's messages have the same keys, ICU arguments and rich-text tags.
// Run: node scripts/check-messages.mjs (part of `pnpm lint`).
import { readFileSync } from 'node:fs';

const LOCALES = ['uz', 'ru', 'en'];
const REFERENCE = 'en';

function flatten(value, prefix = '', out = new Map()) {
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object') flatten(child, path, out);
    else out.set(path, String(child));
  }
  return out;
}

/** Argument names ({name}, {count, plural, …}) and rich-text tags (<terms>) used by a message. */
function signature(message) {
  const args = new Set();
  for (const match of message.matchAll(/\{\s*([A-Za-z_]\w*)\s*[,}]/g)) args.add(match[1]);
  const tags = new Set();
  for (const match of message.matchAll(/<\/?([A-Za-z]\w*)>/g)) tags.add(match[1]);
  return `args[${[...args].sort().join(',')}] tags[${[...tags].sort().join(',')}]`;
}

const messages = Object.fromEntries(
  LOCALES.map((locale) => [
    locale,
    flatten(
      JSON.parse(readFileSync(new URL(`../messages/${locale}.json`, import.meta.url), 'utf8')),
    ),
  ]),
);

const problems = [];
const reference = messages[REFERENCE];
for (const locale of LOCALES) {
  if (locale === REFERENCE) continue;
  const current = messages[locale];
  for (const key of reference.keys()) {
    if (!current.has(key)) problems.push(`${locale}: missing "${key}"`);
    else if (signature(current.get(key)) !== signature(reference.get(key))) {
      problems.push(
        `${locale}: "${key}" uses ${signature(current.get(key))}, ${REFERENCE} uses ${signature(reference.get(key))}`,
      );
    }
  }
  for (const key of current.keys()) {
    if (!reference.has(key)) problems.push(`${locale}: extra key "${key}" (not in ${REFERENCE})`);
  }
  for (const [key, value] of current) {
    if (value.trim() === '') problems.push(`${locale}: "${key}" is empty`);
  }
}

if (problems.length > 0) {
  console.error(`Message files are out of sync:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`Messages in sync: ${reference.size} keys × ${LOCALES.length} locales.`);
