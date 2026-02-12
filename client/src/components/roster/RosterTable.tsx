import { useState } from 'react';
import RosterRow, { type RosterMember } from './RosterRow';

type SortKey = 'name' | 'class' | 'level' | 'dkp' | 'chars';

interface RosterTableProps {
  members: RosterMember[];
  classFilter?: string | null;
}

export default function RosterTable({ members, classFilter }: RosterTableProps) {
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

  function getFeatured(m: RosterMember) {
    if (classFilter) return m.characters.find(c => c.class === classFilter) || m.characters[0];
    return m.characters.find(c => c.status === 'Main') || m.characters[0];
  }

  const sorted = [...members].sort((a, b) => {
    let cmp = 0;
    const fa = getFeatured(a);
    const fb = getFeatured(b);
    switch (sortKey) {
      case 'name':
        cmp = (fa?.name || '').localeCompare(fb?.name || '');
        break;
      case 'class':
        cmp = (fa?.class || '').localeCompare(fb?.class || '');
        break;
      case 'level':
        cmp = (fa?.level || 0) - (fb?.level || 0);
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
        <RosterRow key={m.discordId} member={m} classFilter={classFilter} />
      ))}
    </div>
  );
}
