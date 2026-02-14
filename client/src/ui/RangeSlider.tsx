import { useCallback, useRef } from 'react';

interface Props {
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
}

export default function RangeSlider({ min, max, value, onChange }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const range = max - min || 1;
  const loPercent = ((value[0] - min) / range) * 100;
  const hiPercent = ((value[1] - min) / range) * 100;

  const handleLow = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = Number(e.target.value);
      onChange([Math.min(v, value[1]), value[1]]);
    },
    [value, onChange],
  );

  const handleHigh = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = Number(e.target.value);
      onChange([value[0], Math.max(v, value[0])]);
    },
    [value, onChange],
  );

  return (
    <div className="range-slider relative flex items-center h-5 w-full min-w-20">
      {/* Track background */}
      <div ref={trackRef} className="absolute inset-x-0 h-1 rounded-full bg-surface-2" />
      {/* Active range highlight */}
      <div
        className="absolute h-1 rounded-full bg-accent"
        style={{ left: `${loPercent}%`, right: `${100 - hiPercent}%` }}
      />
      {/* Low thumb */}
      <input
        type="range"
        min={min}
        max={max}
        value={value[0]}
        onChange={handleLow}
        className="range-thumb absolute inset-x-0 appearance-none bg-transparent pointer-events-none"
      />
      {/* High thumb */}
      <input
        type="range"
        min={min}
        max={max}
        value={value[1]}
        onChange={handleHigh}
        className="range-thumb absolute inset-x-0 appearance-none bg-transparent pointer-events-none"
      />
    </div>
  );
}
