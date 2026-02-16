import { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ItemIcon from './ItemIcon';

interface ItemTooltipProps {
  name: string;
  iconId: number | null;
  statsblock: string | null;
  children: React.ReactNode;
}

export default function ItemTooltip({ name, iconId, statsblock, children }: ItemTooltipProps) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0, above: false });
  const triggerRef = useRef<HTMLSpanElement>(null);

  const show = useCallback(() => {
    if (!statsblock) return;
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const above = spaceBelow < 200;
    const x = Math.min(Math.max(rect.left, 8), window.innerWidth - 300);
    const y = above ? rect.top : rect.bottom;
    setPos({ x, y, above });
    setVisible(true);
  }, [statsblock]);

  const hide = useCallback(() => setVisible(false), []);

  if (!statsblock) return <>{children}</>;

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        className="contents"
      >
        {children}
      </span>
      {visible && createPortal(
        <div
          className="fixed z-tooltip pointer-events-none"
          style={{
            left: pos.x,
            top: pos.above ? undefined : pos.y + 4,
            bottom: pos.above ? window.innerHeight - pos.y + 4 : undefined,
          }}
        >
          <div className="bg-surface-3 border border-border rounded-md shadow-lg p-2 max-w-72">
            <div className="flex items-center gap-1.5 mb-1">
              <ItemIcon iconId={iconId} size={40} />
              <span className="text-accent font-semibold text-caption">{name}</span>
            </div>
            <pre className="font-mono text-micro text-text-secondary whitespace-pre-wrap m-0 leading-snug">{statsblock}</pre>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
