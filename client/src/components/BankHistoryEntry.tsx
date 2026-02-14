import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { BankImportRecord } from '../hooks/useBankerHistory';
import { text } from '../ui/recipes';
import { timeAgo } from '../utils/timeAgo';

export default function BankHistoryEntry({ record, showBanker, onSquash }: { record: BankImportRecord; showBanker?: boolean; onSquash?: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const { added, removed, changed } = record.diff;
  const hasChanges = added.length > 0 || removed.length > 0 || changed.length > 0;

  return (
    <div className="border-b border-border last:border-b-0">
      <div
        className="w-full flex items-center gap-1.5 py-1.5 px-2 text-left hover:bg-surface-2 transition-colors duration-fast"
        role={hasChanges ? 'button' : undefined}
        tabIndex={hasChanges ? 0 : undefined}
        onClick={() => hasChanges && setExpanded(!expanded)}
        style={{ cursor: hasChanges ? 'pointer' : 'default' }}
      >
        {hasChanges && (
          <span
            className="collapse-chevron text-text-dim text-caption shrink-0"
            data-expanded={expanded}
          >
            ›
          </span>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-text font-body text-caption truncate">
            <span className="font-semibold">{record.uploadedByName}</span>
            {' updated '}
            {showBanker ? (
              <Link
                to={`/bank/${encodeURIComponent(record.banker)}`}
                className="no-underline font-semibold text-text-secondary hover:text-accent transition-colors duration-fast"
                onClick={(e) => e.stopPropagation()}
              >
                {record.banker}
              </Link>
            ) : (
              <span className="font-semibold">{record.banker}</span>
            )}
            {hasChanges && (
              <>
                {' '}
                {added.length > 0 && <span className="text-green font-semibold">[+{added.length}]</span>}
                {removed.length > 0 && <span className="text-red font-semibold">[-{removed.length}]</span>}
                {changed.length > 0 && <span className="text-text-dim font-semibold">[{changed.length}]</span>}
              </>
            )}
            {!hasChanges && <span className={text({ variant: 'caption' })}> (no changes)</span>}
          </div>
          <span className={text({ variant: 'caption' })}>{timeAgo(record.createdAt)}</span>
        </div>
        {onSquash && (
          <button
            className="shrink-0 bg-transparent border border-border rounded px-1 py-0.5 text-caption text-text-dim cursor-pointer hover:bg-surface-2 hover:text-text transition-colors duration-fast"
            title="Squash with previous import"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm('Squash this import with the previous one? The two entries will be merged into a single net diff.')) {
                onSquash(record.id);
              }
            }}
          >
            Squash
          </button>
        )}
      </div>
      {hasChanges && (
        <div className="collapse-container" data-expanded={expanded}>
          <div className="collapse-inner">
            <div className="px-2 pb-1.5 pt-0.5 ml-3 border-l border-border-subtle flex flex-col gap-px">
              {added.map(item => (
                <div key={item.name} className="text-caption font-body text-green truncate">
                  +{item.quantity} {item.name}
                </div>
              ))}
              {removed.map(item => (
                <div key={item.name} className="text-caption font-body text-red truncate">
                  -{item.quantity} {item.name}
                </div>
              ))}
              {changed.map(item => (
                <div key={item.name} className="text-caption font-body text-text-dim truncate">
                  {item.name}: {item.oldQuantity} → {item.newQuantity}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
