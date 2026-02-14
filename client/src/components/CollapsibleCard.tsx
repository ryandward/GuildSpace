import { Card } from '../ui';
import { text } from '../ui/recipes';
import { cx } from 'class-variance-authority';

export default function CollapsibleCard({ id, title, count, collapsedPanels, onToggle, children }: {
  id: string;
  title: string;
  count?: number;
  collapsedPanels: Set<string>;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}) {
  const collapsed = collapsedPanels.has(id);
  return (
    <Card>
      <button
        className="w-full flex items-center gap-1 py-1 px-2 min-h-6 bg-transparent border-none cursor-pointer text-left hover:bg-surface-2 transition-colors duration-fast"
        onClick={() => onToggle(id)}
      >
        <span
          className="collapse-chevron text-text-dim text-caption"
          data-expanded={!collapsed}
        >
          ›
        </span>
        <span className={text({ variant: 'overline' })}>{title}</span>
        {count != null && (
          <span className={cx(text({ variant: 'body' }), 'font-bold ml-auto')}>{count}</span>
        )}
      </button>
      <div className="collapse-container" data-expanded={!collapsed}>
        <div className="collapse-inner">
          {children}
        </div>
      </div>
    </Card>
  );
}
