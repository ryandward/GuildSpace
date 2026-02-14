/* ── Squarified Treemap Algorithm ────────────────────────── */

export interface TreemapNode {
  label: string;
  value: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

function worstRatio(areas: number[], total: number, side: number): number {
  const len = total / side;
  let worst = 0;
  for (const a of areas) {
    const s = a / len;
    const r = Math.max(len / s, s / len);
    if (r > worst) worst = r;
  }
  return worst;
}

function layoutStrip(
  items: { label: string; value: number; area: number }[],
  x: number, y: number, w: number, h: number
): TreemapNode[] {
  if (items.length === 0) return [];
  if (items.length === 1) {
    return [{ label: items[0].label, value: items[0].value, x, y, w, h }];
  }

  // Lay strips horizontally: cells flow left-to-right, rows stack top-to-bottom.
  // This prevents tall skinny columns in wide containers.
  const shortSide = w;
  const strip = [items[0]];
  let stripTotal = items[0].area;

  for (let i = 1; i < items.length; i++) {
    const nextAreas = strip.map(s => s.area).concat(items[i].area);
    const nextTotal = stripTotal + items[i].area;
    if (worstRatio(nextAreas, nextTotal, shortSide) <= worstRatio(strip.map(s => s.area), stripTotal, shortSide)) {
      strip.push(items[i]);
      stripTotal = nextTotal;
    } else break;
  }

  const thickness = stripTotal / shortSide;
  const results: TreemapNode[] = [];
  let pos = 0;

  for (const item of strip) {
    const span = item.area / thickness;
    results.push({ label: item.label, value: item.value, x: x + pos, y, w: span, h: thickness });
    pos += span;
  }

  const rest = items.slice(strip.length);
  if (rest.length === 0) return results;

  return [...results, ...layoutStrip(rest, x, y + thickness, w, h - thickness)];
}

export function computeTreemap(
  items: { label: string; value: number }[],
  x: number, y: number, w: number, h: number
): TreemapNode[] {
  if (items.length === 0 || w <= 0 || h <= 0) return [];
  const total = items.reduce((s, i) => s + i.value, 0);
  if (total === 0) return [];
  const area = w * h;
  const scaled = items
    .map(i => ({ ...i, area: (i.value / total) * area }))
    .sort((a, b) => b.area - a.area);
  return layoutStrip(scaled, x, y, w, h);
}

// Virtual space matches CSS aspect-ratio: 2/1
export const VW = 1000;
export const VH = 500;
