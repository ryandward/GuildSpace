import { Button, Select } from '../../ui';
import { text } from '../../ui/recipes';
import { getClassColorByAbbrev } from '../../lib/classColors';
import { RACE_LABELS } from '../../lib/raceLabels';

interface Props {
  availableClasses: string[];
  availableRaces: string[];
  classFilter: string | null;
  raceFilter: string | null;
  onClassFilter: (cls: string | null) => void;
  onRaceFilter: (race: string | null) => void;
}

export default function BankFilterPanel({
  availableClasses, availableRaces,
  classFilter, raceFilter,
  onClassFilter, onRaceFilter,
}: Props) {
  // Filter out ALL/NONE from button display — they're not useful as filters
  const classButtons = availableClasses.filter(c => c !== 'ALL' && c !== 'NONE');
  const raceOptions = availableRaces.filter(r => r !== 'ALL' && r !== 'NONE');

  if (classButtons.length === 0 && raceOptions.length === 0) return null;

  return (
    <div className="flex flex-wrap items-start gap-3 px-2 py-1.5 border-t border-border">
      {classButtons.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className={text({ variant: 'overline' })}>Class</span>
          <div className="flex flex-wrap gap-0.5">
            {classButtons.map(cls => {
              const active = classFilter === cls;
              const color = getClassColorByAbbrev(cls);
              return (
                <Button
                  key={cls}
                  intent="ghost"
                  size="sm"
                  className={active ? 'border-accent text-text' : ''}
                  onClick={() => onClassFilter(active ? null : cls)}
                >
                  <span
                    className="inline-block size-1 rounded-full mr-0.5"
                    style={{ background: color }}
                  />
                  {cls}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {raceOptions.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className={text({ variant: 'overline' })}>Race</span>
          <Select
            size="sm"
            variant="surface"
            value={raceFilter ?? ''}
            onChange={e => onRaceFilter(e.target.value || null)}
          >
            <option value="">All Races</option>
            {raceOptions.map(r => (
              <option key={r} value={r}>{RACE_LABELS[r] || r}</option>
            ))}
          </Select>
        </div>
      )}
    </div>
  );
}
