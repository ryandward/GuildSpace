/** EverQuest class → hex color mapping. Single source of truth. */
export const CLASS_COLORS: Record<string, string> = {
  'Cleric': '#f0c040',
  'Warrior': '#c79c6e',
  'Wizard': '#69ccf0',
  'Magician': '#69ccf0',
  'Enchanter': '#b490d0',
  'Necromancer': '#a330c9',
  'Shadow Knight': '#a330c9',
  'Rogue': '#fff569',
  'Ranger': '#abd473',
  'Druid': '#ff7d0a',
  'Monk': '#00ff96',
  'Bard': '#e6005c',
  'Paladin': '#f58cba',
  'Shaman': '#0070de',
  'Warlock': '#9482c9',
};

export function getClassColor(cls: string): string {
  return CLASS_COLORS[cls] || '#8888aa';
}

/**
 * Pick the most-recently-raided character's class from a list of characters.
 * Falls back to Main status, then first character.
 */
export function getMostRecentClass(
  characters: { class: string; lastRaidDate: string | null; status?: string }[]
): string | undefined {
  if (!characters.length) return undefined;
  let best: typeof characters[number] | null = null;
  for (const c of characters) {
    if (!c.lastRaidDate) continue;
    if (!best || !best.lastRaidDate || c.lastRaidDate > best.lastRaidDate) best = c;
  }
  return best?.class
    || characters.find(c => c.status === 'Main')?.class
    || characters[0]?.class;
}
