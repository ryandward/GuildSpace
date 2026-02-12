function classToPip(className: string): string {
  return 'pip-' + (className || '').toLowerCase().replace(/\s+/g, '-');
}

interface ClassChartProps {
  classCounts: Record<string, number>;
  levelBreakdown: Record<string, { max: number; total: number }>;
  classFilter: string | null;
  onClassFilterChange: (value: string | null) => void;
}

export function ClassChart({ classCounts, levelBreakdown, classFilter, onClassFilterChange }: ClassChartProps) {
  const sorted = Object.entries(classCounts).sort((a, b) => b[1] - a[1]);
  const maxCount = sorted[0]?.[1] || 1;

  return (
    <div className="class-chart">
      {sorted.map(([cls, count]) => {
        const pct = (count / maxCount) * 100;
        const lb = levelBreakdown[cls];
        const maxLvl = lb ? lb.max : 0;
        const isActive = classFilter === cls;
        const isDimmed = classFilter !== null && !isActive;

        return (
          <button
            key={cls}
            className={`class-chart-row${isActive ? ' active' : ''}${isDimmed ? ' dimmed' : ''}`}
            onClick={() => onClassFilterChange(isActive ? null : cls)}
          >
            <span className="class-chart-label">{cls}</span>
            <span className="class-chart-track">
              <span
                className={`class-chart-bar ${classToPip(cls)}`}
                style={{ width: `${pct}%` }}
              />
            </span>
            <span className="class-chart-count">{count}</span>
            <span className="class-chart-max">{maxLvl} @ 60</span>
          </button>
        );
      })}
    </div>
  );
}

interface StatusChartProps {
  statusCounts: Record<string, number>;
  total: number;
}

export function StatusChart({ statusCounts, total }: StatusChartProps) {
  const statuses = ['Main', 'Alt', 'Bot', 'Probationary'].filter(s => statusCounts[s]);

  return (
    <div className="status-chart">
      <div className="status-chart-bar">
        {statuses.map(s => (
          <span
            key={s}
            className={`status-chart-segment status-${s.toLowerCase()}`}
            style={{ flex: statusCounts[s] }}
            title={`${s}: ${statusCounts[s]}`}
          />
        ))}
      </div>
      <div className="status-chart-legend">
        {statuses.map(s => (
          <span key={s} className="status-chart-item">
            <span className={`status-dot-sm status-${s.toLowerCase()}`} />
            {s} <span className="status-chart-num">{statusCounts[s]}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

interface LevelChartProps {
  levelDist: { level60: number; sub60: number };
}

export function LevelChart({ levelDist }: LevelChartProps) {
  const total = levelDist.level60 + levelDist.sub60;
  const pct60 = total > 0 ? Math.round((levelDist.level60 / total) * 100) : 0;

  return (
    <div className="level-chart">
      <div className="level-chart-header">
        <span className="level-chart-title">Level 60</span>
        <span className="level-chart-pct">{pct60}%</span>
      </div>
      <div className="level-chart-track">
        <span className="level-chart-fill" style={{ width: `${pct60}%` }} />
      </div>
      <div className="level-chart-counts">
        <span>{levelDist.level60} max level</span>
        <span>{levelDist.sub60} leveling</span>
      </div>
    </div>
  );
}
