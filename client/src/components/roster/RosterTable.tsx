import { useState } from 'react';
import RosterRow, { type RosterMember } from './RosterRow';

type SortKey = 'name' | 'class' | 'level' | 'dkp' | 'chars';

interface RosterTableProps {
  members: RosterMember[];
}

export default function RosterTable({ members }: RosterTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortAsc, setSortAsc] = useState(true);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(a => !a);
    } else {
      setSortKey(key);
      setSortAsc(key === 'name' || key === 'class');
    }
  }

  const sorted = [...members].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case 'name':
        cmp = (a.mainName || '').localeCompare(b.mainName || '');
        break;
      case 'class':
        cmp = (a.mainClass || '').localeCompare(b.mainClass || '');
        break;
      case 'level':
        cmp = (a.mainLevel || 0) - (b.mainLevel || 0);
        break;
      case 'dkp':
        cmp = (a.earnedDkp - a.spentDkp) - (b.earnedDkp - b.spentDkp);
        break;
      case 'chars':
        cmp = a.characters.length - b.characters.length;
        break;
    }
    return sortAsc ? cmp : -cmp;
  });

  function sortIndicator(key: SortKey) {
    if (sortKey !== key) return '';
    return sortAsc ? ' \u25B4' : ' \u25BE';
  }

  return (
    <div className="roster-table">
      <div className="roster-table-header">
        <div className="roster-th roster-th-pip" />
        <div className="roster-th roster-th-name" onClick={() => handleSort('name')}>
          Name{sortIndicator('name')}
        </div>
        <div className="roster-th roster-th-level" onClick={() => handleSort('level')}>
          Lvl{sortIndicator('level')}
        </div>
        <div className="roster-th roster-th-chars" onClick={() => handleSort('chars')}>
          Chars{sortIndicator('chars')}
        </div>
        <div className="roster-th roster-th-dkp" onClick={() => handleSort('dkp')}>
          DKP{sortIndicator('dkp')}
        </div>
        <div className="roster-th roster-th-expand" />
      </div>
      {sorted.map(m => (
        <RosterRow key={m.discordId} member={m} />
      ))}
    </div>
  );
}
