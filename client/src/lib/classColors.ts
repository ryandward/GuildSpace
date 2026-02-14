/** EverQuest class → hex color mapping. Single source of truth. */
export const CLASS_COLORS: Record<string, string> = {
  'Cleric': '#f0c040',
  'Warrior': '#d4ad80',
  'Wizard': '#69ccf0',
  'Magician': '#40b8b0',
  'Enchanter': '#b490d0',
  'Necromancer': '#bf50e0',
  'Shadow Knight': '#9545d0',
  'Rogue': '#d4e040',
  'Ranger': '#abd473',
  'Druid': '#ff7d0a',
  'Monk': '#00ff96',
  'Bard': '#f03070',
  'Paladin': '#f58cba',
  'Shaman': '#2890f0',
};

export function getClassColor(cls: string): string {
  return CLASS_COLORS[cls] || '#8888aa';
}

/** Look up shortest alias for a class from server-provided abbreviations. */
export function getClassShort(cls: string, abbreviations?: Record<string, string>): string {
  return abbreviations?.[cls]?.toUpperCase() || cls;
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
