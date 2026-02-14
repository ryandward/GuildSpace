import { useCallback, useRef, useState, useEffect } from 'react';

interface Props {
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  /** Debounce delay in ms (default 150) */
  debounce?: number;
}

export default function RangeSlider({ min, max, value, onChange, debounce = 150 }: Props) {
  // Local state drives the visual thumb position. Parent value only syncs in
  // when the user is NOT dragging AND no debounce timer is pending.
  const [local, setLocal] = useState<[number, number]>(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragging = useRef(false);

  // Sync from parent only when idle (not dragging, no pending timer)
  useEffect(() => {
    if (!dragging.current && !timerRef.current) setLocal(value);
  }, [value]);

  const emit = useCallback(
    (next: [number, number]) => {
      setLocal(next);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        onChange(next);
      }, debounce);
    },
    [onChange, debounce],
  );

  // Track which thumb was last touched for z-index stacking
  const [lastTouched, setLastTouched] = useState<'lo' | 'hi'>('hi');

  const handleLow = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = Number(e.target.value);
      emit([Math.min(v, local[1]), local[1]]);
    },
    [local, emit],
  );

  const handleHigh = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = Number(e.target.value);
      emit([local[0], Math.max(v, local[0])]);
    },
    [local, emit],
  );

  const onDragStart = useCallback(() => { dragging.current = true; }, []);
  const onDragEnd = useCallback(() => {
    dragging.current = false;
    // Flush any pending debounce immediately on release
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      onChange(local);
    }
  }, [local, onChange]);

  const range = max - min || 1;
  const loPercent = ((local[0] - min) / range) * 100;
  const hiPercent = ((local[1] - min) / range) * 100;

  return (
    <div className="range-slider relative flex items-center h-5 w-full min-w-20">
      {/* Track background */}
      <div className="absolute inset-x-0 h-1 rounded-full bg-surface-2" />
      {/* Active range highlight */}
      <div
        className="absolute h-1 rounded-full bg-accent transition-[left,right] duration-fast"
        style={{ left: `${loPercent}%`, right: `${100 - hiPercent}%` }}
      />
      {/* Low thumb */}
      <input
        type="range"
        min={min}
        max={max}
        value={local[0]}
        onChange={handleLow}
        onPointerDown={() => { onDragStart(); setLastTouched('lo'); }}
        onPointerUp={onDragEnd}
        className="range-thumb absolute inset-x-0 appearance-none bg-transparent pointer-events-none"
        style={{ zIndex: lastTouched === 'lo' ? 2 : 1 }}
      />
      {/* High thumb */}
      <input
        type="range"
        min={min}
        max={max}
        value={local[1]}
        onChange={handleHigh}
        onPointerDown={() => { onDragStart(); setLastTouched('hi'); }}
        onPointerUp={onDragEnd}
        className="range-thumb absolute inset-x-0 appearance-none bg-transparent pointer-events-none"
        style={{ zIndex: lastTouched === 'hi' ? 2 : 1 }}
      />
    </div>
  );
}
