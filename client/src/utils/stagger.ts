const PHI = 1.618034;

/**
 * Generate phi-scaled stagger delays for N items.
 * Produces organic deceleration: 0, 30, 79, 157, 284ms
 * instead of linear 0, 30, 60, 90, 120ms.
 */
export function phiStagger(count: number, baseMs = 15): number[] {
  return Array.from({ length: count }, (_, i) =>
    i === 0 ? 0 : Math.round(baseMs * (Math.pow(PHI, i) - 1) / (PHI - 1))
  );
}
