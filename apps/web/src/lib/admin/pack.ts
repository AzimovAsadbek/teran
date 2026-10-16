/** A pack size as staff read it: "100 g", "× 20" or "2 g × 20". */
export function packLabel(pack: { weightGrams: number | null; unitCount: number | null }): string {
  return [
    pack.weightGrams ? `${pack.weightGrams} g` : null,
    pack.unitCount ? `× ${pack.unitCount}` : null,
  ]
    .filter(Boolean)
    .join(' ');
}
