import type { PublicFilmDto, PublicSettingsDto, PublicVisualDto } from '@teran/contracts';

/**
 * The picture set for a place on the storefront in Admin → Settings (see FIXED_VISUAL_SLOTS and
 * listingBannerSlot in the contracts), or null when the place keeps TERAN's artwork.
 */
export function visualFor(
  settings: PublicSettingsDto | null | undefined,
  slot: string,
): PublicVisualDto | null {
  return settings?.visuals?.[slot] ?? null;
}

/** The CSS position of a film's focus point, for the film and for its poster alike. */
export function filmPosition(film: PublicFilmDto | null | undefined): string | undefined {
  return film ? `${film.focusX}% ${film.focusY}%` : undefined;
}

/**
 * The copy of a film to play in a frame (CSS px) on a screen of `density`: the narrowest that
 * fills the frame's device pixels (the film covers the frame, so one wider than the frame's shape
 * is drawn at its height), or the widest when none does. A copy within a tenth of what is needed
 * looks as sharp; the next one up would cost far more to download.
 */
export function filmSource(
  film: PublicFilmDto,
  frame: { width: number; height: number },
  density: number,
  widthLimit: number | null = null,
): string {
  if (film.sources.length === 0) return film.src;
  if (widthLimit !== null) {
    const affordable = film.sources.findLast((copy) => copy.width <= widthLimit);
    return (affordable ?? film.sources[0]!).src;
  }
  const aspect = film.width && film.height ? film.width / film.height : 16 / 9;
  const needed = Math.max(frame.width, frame.height * aspect) * density;
  const qualityCopies = film.sources.filter((copy) => copy.width > 640 || copy.src === film.src);
  const fits = qualityCopies.find((copy) => copy.width >= needed * 0.9);
  return (fits ?? qualityCopies.at(-1))?.src ?? film.src;
}
