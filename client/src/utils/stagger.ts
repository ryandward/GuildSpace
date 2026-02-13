/**
 * Generate linear stagger delays for N items, capped to a total window.
 * All items appear within `windowMs` regardless of count.
 */
export function phiStagger(count: number, windowMs = 120): number[] {
  if (count <= 1) return [0];
  return Array.from({ length: count }, (_, i) =>
    Math.round((i / (count - 1)) * windowMs)
  );
}
