/* ── Squarified Treemap (d3-hierarchy) ───────────────────── */

import { hierarchy, treemap, treemapSquarify, type HierarchyRectangularNode } from 'd3-hierarchy';

export interface TreemapNode {
  label: string;
  value: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Datum {
  label: string;
  value: number;
  children?: Datum[];
}

export function computeTreemap(
  items: { label: string; value: number }[],
  x: number, y: number, w: number, h: number
): TreemapNode[] {
  if (items.length === 0 || w <= 0 || h <= 0) return [];
  const total = items.reduce((s, i) => s + i.value, 0);
  if (total === 0) return [];

  const root = hierarchy<Datum>({ label: '', value: 0, children: items })
    .sum(d => d.value)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  const layout = treemap<Datum>()
    .size([w, h])
    .tile(treemapSquarify)
    .padding(0);

  const positioned = layout(root) as HierarchyRectangularNode<Datum>;

  return positioned.leaves().map(leaf => ({
    label: leaf.data.label,
    value: leaf.data.value,
    x: x + leaf.x0,
    y: y + leaf.y0,
    w: leaf.x1 - leaf.x0,
    h: leaf.y1 - leaf.y0,
  }));
}

// Virtual space matches CSS aspect-ratio: 2/1
export const VW = 1000;
export const VH = 500;
