const PLASTIC = 1.32471795724474602596;
const INV_PLASTIC = 1 / PLASTIC;
const INV_PLASTIC_SQ = 1 / PLASTIC ** 2;

/**
 * R2 quasi-random phase distribution.
 * Distributes (phase1, phase2) pairs across [0,1)^2 with
 * minimal discrepancy — no clumping, no gaps, regardless of N.
 */
export function r2Phase(index: number, seed = 0.5): [number, number] {
  return [
    (seed + INV_PLASTIC * (index + 1)) % 1,
    (seed + INV_PLASTIC_SQ * (index + 1)) % 1,
  ];
}

/**
 * 1D golden ratio phase (R1 sequence).
 * Successive values are spaced by 1/phi ~ 0.618.
 */
export function goldenPhase(index: number, seed = 0.5): number {
  return (seed + INV_PLASTIC * (index + 1)) % 1;
}
