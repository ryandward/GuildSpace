const PHI = 1.618034;

// Mirrors @theme axioms: timing-base = 200ms, duration-slower = base × φ²
const TIMING_BASE = 200;
const DURATION_SLOWER = Math.round(TIMING_BASE * PHI * PHI); // ≈ 524ms

/**
 * Generate phi-scaled stagger delays with accelerating cascade.
 * Big gaps first (deliberate reveal), small gaps last (items pile in).
 * Gaps shrink by φ each step. Total always fits within duration-slower.
 */
export function phiStagger(count: number, windowMs = DURATION_SLOWER): number[] {
  if (count <= 1) return [0];

  // Gaps shrink: φ^(n-1), φ^(n-2), ..., φ, 1
  // So first gap is largest, last gap is smallest
  const gaps: number[] = [];
  for (let i = 0; i < count - 1; i++) {
    gaps.push(Math.pow(PHI, count - 2 - i));
  }

  // Accumulate into positions
  const raw: number[] = [0];
  for (let i = 0; i < gaps.length; i++) {
    raw.push(raw[i] + gaps[i]);
  }

  // Normalize so the last value = windowMs
  const max = raw[raw.length - 1];
  return raw.map(v => Math.round((v / max) * windowMs));
}
