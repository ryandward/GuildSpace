import { useMemo } from 'react';
import { text, progressTrack } from '../../ui/recipes';
import { cx } from 'class-variance-authority';
import { getClassColor } from '../../lib/classColors';

/* ── Squarified Treemap Algorithm ────────────────────────── */

interface TreemapNode {
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

function computeTreemap(
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
const VW = 1000;
const VH = 500;

/* ── ClassChart (Treemap) ────────────────────────────────── */

interface ClassChartProps {
  classCounts: Record<string, number>;
  levelBreakdown: Record<string, { max: number; total: number }>;
  classFilter: string | null;
  onClassFilterChange: (value: string | null) => void;
}

export function ClassChart({ classCounts, levelBreakdown, classFilter, onClassFilterChange }: ClassChartProps) {
  const items = useMemo(() =>
    Object.entries(classCounts)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value),
    [classCounts]
  );

  const nodes = useMemo(() =>
    computeTreemap(items, 0, 0, VW, VH),
    [items]
  );

  return (
    <div className="relative w-full aspect-treemap overflow-hidden border border-border max-md:aspect-treemap-mobile" role="img" aria-label="Class composition">
      {nodes.map((node) => {
        const color = getClassColor(node.label);
        const lb = levelBreakdown[node.label];
        const maxLvl = lb ? lb.max : 0;
        const isActive = classFilter === node.label;
        const isDimmed = classFilter !== null && !isActive;

        return (
          <button
            key={node.label}
            className={`treemap-cell${isActive ? ' active' : ''}${isDimmed ? ' dimmed' : ''}`}
            style={{
              left: `${(node.x / VW) * 100}%`,
              top: `${(node.y / VH) * 100}%`,
              width: `${(node.w / VW) * 100}%`,
              height: `${(node.h / VH) * 100}%`,
              '--cell-color': color,
            } as React.CSSProperties}
            onClick={() => onClassFilterChange(isActive ? null : node.label)}
            title={`${node.label}: ${node.value} characters (${maxLvl} at 60)`}
          >
            <span className="treemap-label">{node.label}</span>
            <span className="treemap-count">{node.value}</span>
          </button>
        );
      })}
      <div className="treemap-texture" />
    </div>
  );
}

/* ── StatusChart ─────────────────────────────────────────── */

interface StatusChartProps {
  statusCounts: Record<string, number>;
  total: number;
}

export function StatusChart({ statusCounts, total }: StatusChartProps) {
  const statuses = ['Main', 'Alt', 'Bot', 'Probationary'].filter(s => statusCounts[s]);

  return (
    <div className="flex-1 py-1.5 px-2 border-r border-border last:border-r-0 max-md:border-r-0 max-md:border-b max-md:border-border max-md:last:border-b-0">
      <div className="flex justify-between items-baseline mb-1">
        <span className={text({ variant: 'overline' })}>STATUS</span>
        <span className={cx(text({ variant: 'body' }), 'font-bold')}>{total}</span>
      </div>
      <div className={cx(progressTrack(), 'mb-1')}>
        {statuses.map(s => (
          <span
            key={s}
            className={`readout-seg status-${s.toLowerCase()}`}
            style={{ flex: statusCounts[s] }}
            title={`${s}: ${statusCounts[s]}`}
          />
        ))}
      </div>
      <div className={cx(text({ variant: 'label' }), 'flex flex-wrap gap-x-1.5 gap-y-0.5')}>
        {statuses.map(s => (
          <span key={s} className="flex items-center gap-0.5">
            <span className={`readout-dot w-1 h-1 rounded-full shrink-0 status-${s.toLowerCase()}`} />
            {s} {statusCounts[s]}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── LevelChart ──────────────────────────────────────────── */

interface LevelChartProps {
  levelDist: { level60: number; sub60: number };
}

export function LevelChart({ levelDist }: LevelChartProps) {
  const total = levelDist.level60 + levelDist.sub60;
  const pct = total > 0 ? Math.round((levelDist.level60 / total) * 100) : 0;

  return (
    <div className="flex-1 py-1.5 px-2 border-r border-border last:border-r-0 max-md:border-r-0 max-md:border-b max-md:border-border max-md:last:border-b-0">
      <div className="flex justify-between items-baseline mb-1">
        <span className={text({ variant: 'overline' })}>LVL 60</span>
        <span className={cx(text({ variant: 'body' }), 'font-bold text-green')}>{pct}%</span>
      </div>
      <div className={cx(progressTrack(), 'mb-1')}>
        <span className="h-full bg-green transition-all duration-slow" style={{ width: `${pct}%` }} />
      </div>
      <div className={cx(text({ variant: 'label' }), 'flex flex-wrap gap-x-1.5 gap-y-0.5')}>
        <span className="flex items-center gap-0.5">{levelDist.level60} max</span>
        <span className="flex items-center gap-0.5">{levelDist.sub60} leveling</span>
      </div>
    </div>
  );
}
