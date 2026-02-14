import { useMemo } from 'react';
import { computeTreemap, VW, VH } from '../../lib/treemap';
import type { BankItem } from '../../hooks/useBankQuery';

/* ── Deterministic color palette for banker names ──────── */

const BANKER_PALETTE = [
  '#f0c040', '#69ccf0', '#abd473', '#f03070', '#b490d0',
  '#40b8b0', '#ff7d0a', '#d4ad80', '#bf50e0', '#f58cba',
  '#2890f0', '#fff569', '#9545d0', '#00ff96', '#a898d8',
  '#e06040', '#60d0a0', '#d08090',
];

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function getBankerColor(name: string): string {
  if (name === 'Other') return '#8888aa';
  return BANKER_PALETTE[hashName(name) % BANKER_PALETTE.length];
}

/* ── Long-tail threshold: group tiny bankers into "Other" ─ */

const LONG_TAIL_THRESHOLD = 0.02; // 2% of total items

interface BankerTreemapProps {
  data: BankItem[];
  bankerFilter: string | null;
  onBankerFilter: (banker: string | null) => void;
}

export default function BankerTreemap({ data, bankerFilter, onBankerFilter }: BankerTreemapProps) {
  const items = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of data) {
      for (const slot of item.slots) {
        counts.set(slot.banker, (counts.get(slot.banker) || 0) + slot.quantity);
      }
    }

    const total = Array.from(counts.values()).reduce((s, v) => s + v, 0);
    const threshold = total * LONG_TAIL_THRESHOLD;

    const result: { label: string; value: number }[] = [];
    let otherTotal = 0;

    for (const [banker, count] of counts) {
      if (count < threshold) {
        otherTotal += count;
      } else {
        result.push({ label: banker, value: count });
      }
    }

    if (otherTotal > 0) {
      result.push({ label: 'Other', value: otherTotal });
    }

    return result.sort((a, b) => b.value - a.value);
  }, [data]);

  const nodes = useMemo(() =>
    computeTreemap(items, 0, 0, VW, VH),
    [items]
  );

  if (nodes.length === 0) return null;

  return (
    <div className="relative w-full aspect-treemap overflow-hidden border border-border max-md:aspect-treemap-mobile" role="img" aria-label="Banker distribution">
      {nodes.map((node) => {
        const color = getBankerColor(node.label);
        const isOther = node.label === 'Other';
        const isActive = bankerFilter === node.label;
        const isDimmed = bankerFilter !== null && !isActive;

        return (
          <button
            key={node.label}
            className={`treemap-cell${isActive ? ' active' : ''}${isDimmed ? ' dimmed' : ''}${isOther ? ' cursor-default' : ''}`}
            style={{
              left: `${(node.x / VW) * 100}%`,
              top: `${(node.y / VH) * 100}%`,
              width: `${(node.w / VW) * 100}%`,
              height: `${(node.h / VH) * 100}%`,
              '--cell-color': color,
            } as React.CSSProperties}
            onClick={() => {
              if (isOther) return;
              onBankerFilter(isActive ? null : node.label);
            }}
            title={`${node.label}: ${node.value} items`}
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
