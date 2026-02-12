function classToPip(className: string): string {
  return 'pip-' + (className || '').toLowerCase().replace(/\s+/g, '-');
}

interface ClassMosaicProps {
  classCounts: Record<string, number>;
  levelBreakdown: Record<string, { maxLevel: number; total: number }>;
  classFilter: string | null;
  onClassFilterChange: (value: string | null) => void;
}

export default function ClassMosaic({
  classCounts,
  levelBreakdown,
  classFilter,
  onClassFilterChange,
}: ClassMosaicProps) {
  const sorted = Object.entries(classCounts).sort((a, b) => b[1] - a[1]);
  const max = sorted[0]?.[1] || 1;

  return (
    <div className="class-mosaic">
      {sorted.map(([cls, count]) => {
        const lb = levelBreakdown[cls];
        const maxPct = lb ? Math.round((lb.maxLevel / lb.total) * 100) : 0;
        const isActive = classFilter === cls;
        const isDimmed = classFilter !== null && !isActive;

        return (
          <button
            key={cls}
            className={`mosaic-block ${classToPip(cls)}${isActive ? ' active' : ''}${isDimmed ? ' dimmed' : ''}`}
            style={{ flex: count }}
            onClick={() => onClassFilterChange(isActive ? null : cls)}
          >
            <span className="mosaic-name">{cls}</span>
            <span className="mosaic-count">{count}</span>
            {lb && lb.total > 0 && (
              <span className="mosaic-levels">
                <span className="mosaic-level-bar">
                  <span className="mosaic-level-fill" style={{ width: `${maxPct}%` }} />
                </span>
                <span className="mosaic-level-label">{lb.maxLevel} @ 60</span>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
