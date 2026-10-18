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
