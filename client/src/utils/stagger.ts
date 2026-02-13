const PHI = 1.618034;

// Mirrors @theme axioms: timing-base = 200ms, duration-slower = base × φ²
const TIMING_BASE = 200;
const DURATION_SLOWER = Math.round(TIMING_BASE * PHI * PHI); // ≈ 524ms

/**
 * Generate phi-scaled stagger delays for N items, normalized to duration-slower.
 * Gaps between items follow the golden ratio (each gap ~1.618x the previous),
 * but the total duration is always φ² × timing-base regardless of count.
 */
export function phiStagger(count: number, windowMs = DURATION_SLOWER): number[] {
  if (count <= 1) return [0];

  // Raw phi-scaled positions: 0, 1, φ+1, φ²+φ+1, ...
  const raw: number[] = [0];
  for (let i = 1; i < count; i++) {
    raw.push(raw[i - 1] + Math.pow(PHI, i - 1));
  }

  // Normalize so the last value = windowMs
  const max = raw[raw.length - 1];
  return raw.map(v => Math.round((v / max) * windowMs));
}
