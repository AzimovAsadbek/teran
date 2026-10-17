/**
 * The largest font size at which a name's longest word still fits its box, so a long word gets
 * smaller instead of breaking inside: set as `--fit` on the text and used as
 * `text-[length:min(<usual size>,var(--fit))]` inside an `@container`. `letter` is the average
 * width of a letter in the font, in em (about 0.55 for the condensed capitals, 0.6 for the serif).
 */
export function fitWidth(text: string, letter: number): string {
  const longest = Math.max(1, ...text.split(/\s+/).map((word) => word.length));
  return `${(100 / (longest * letter)).toFixed(2)}cqi`;
}
