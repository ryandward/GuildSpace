import { useMemo } from 'react';
import { text, progressTrack } from '../../ui/recipes';
import { cx } from 'class-variance-authority';
import { getClassColor } from '../../lib/classColors';
import { computeTreemap, VW, VH } from '../../lib/treemap';

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
