/**
 * Loads EverQuest item metadata from items.json at startup.
 * Cleans HTML artifacts from wiki-scraped statsblocks and
 * parses Class/Race restriction lines with whitelist filtering.
 */
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface ItemMetadata {
  iconId: number;
  classes: string[];
  races: string[];
  statsblock: string;
}

const VALID_CLASSES = new Set([
  'WAR', 'CLR', 'PAL', 'RNG', 'SHD', 'DRU',
  'MNK', 'BRD', 'ROG', 'SHM', 'NEC', 'WIZ',
  'MAG', 'ENC', 'BST', 'ALL', 'NONE',
]);

const VALID_RACES = new Set([
  'HUM', 'BAR', 'ERU', 'ELF', 'HIE', 'DEF',
  'HEF', 'DWF', 'TRL', 'OGR', 'HFL', 'GNM',
  'IKS', 'VAH', 'ALL', 'NONE',
]);

const ALL_CLASSES = [
  'WAR', 'CLR', 'PAL', 'RNG', 'SHD', 'DRU',
  'MNK', 'BRD', 'ROG', 'SHM', 'NEC', 'WIZ',
  'MAG', 'ENC', 'BST',
];

let itemMap: Map<string, ItemMetadata> | null = null;

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>?/g, ' ');
}

function parseTokens(line: string, whitelist: Set<string>): string[] {
  return line
    .split(/\s+/)
    .map(t => t.toUpperCase())
    .filter(t => whitelist.has(t));
}

function parseClassLine(raw: string): string[] {
  const cleaned = stripHtml(raw);
  // Handle "ALL except X Y Z" pattern
  const exceptMatch = cleaned.match(/ALL\s+except\s+(.*)/i);
  if (exceptMatch) {
    const excluded = new Set(parseTokens(exceptMatch[1], VALID_CLASSES));
    return ALL_CLASSES.filter(c => !excluded.has(c));
  }
  return parseTokens(cleaned, VALID_CLASSES);
}

function parseRaceLine(raw: string): string[] {
  const cleaned = stripHtml(raw);
  return parseTokens(cleaned, VALID_RACES);
}

function parseStatsblock(rawStatsblock: string): { classes: string[]; races: string[]; statsblock: string } {
  // Clean all HTML tags
  const cleaned = stripHtml(rawStatsblock).replace(/\s+/g, ' ').trim();
  // Re-split by newlines from original (after HTML removal)
  const lines = rawStatsblock
    .replace(/<[^>]*>?/g, ' ')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  let classes: string[] = [];
  let races: string[] = [];

  // Collect all class/race lines (may span multiple lines after HTML removal)
  let classRaw = '';
  let raceRaw = '';

  for (const line of lines) {
    if (/^Class:/i.test(line)) {
      classRaw = line.replace(/^Class:\s*/i, '');
    } else if (classRaw && !line.includes(':') && !line.match(/^(Race|Slot|Skill|Effect|WT|DMG|AC|STR|DEX|STA|AGI|WIS|INT|CHA|HP|MANA|SV|MAGIC|LORE|EXPENDABLE)/i)) {
      // Continuation of class line
      classRaw += ' ' + line;
    }
    if (/^Race:/i.test(line)) {
      raceRaw = line.replace(/^Race:\s*/i, '');
    }
  }

  if (classRaw) classes = parseClassLine(classRaw);
  if (raceRaw) races = parseRaceLine(raceRaw);

  // Build clean statsblock text
  const cleanedBlock = rawStatsblock
    .replace(/<[^>]*>?/g, '')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .join('\n');

  return { classes, races, statsblock: cleanedBlock };
}

export function loadItemMetadata(): void {
  const filePath = path.join(__dirname, '..', '..', 'src', 'data', 'items.json');
  const raw = fs.readFileSync(filePath, 'utf-8');
  const data: Record<string, { icon_id: number; statsblock: string }> = JSON.parse(raw);

  itemMap = new Map();
  for (const [name, entry] of Object.entries(data)) {
    const { classes, races, statsblock } = parseStatsblock(entry.statsblock);
    itemMap.set(name, {
      iconId: entry.icon_id,
      classes,
      races,
      statsblock,
    });
  }

  console.log(`📦 Loaded metadata for ${itemMap.size} items`);
}

export function getItemMetadata(name: string): ItemMetadata | undefined {
  return itemMap?.get(name);
}

export function getAllItemMetadata(): Map<string, ItemMetadata> | null {
  return itemMap;
}
