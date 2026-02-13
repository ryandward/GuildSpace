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
