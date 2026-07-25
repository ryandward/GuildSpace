/**
 * Parses EverQuest `/who` log output into structured player records.
 *
 * Extracted from the `/attendance` command so both the terminal command
 * and the REST raid-call endpoint can share the same parsing logic.
 *
 * @module
 */

import { parseEqTimestamp } from './eqTimestamp.js';

export interface ParsedPlayer {
  /**
   * When the `/who` was taken. Null only when no line in the log carried a
   * readable stamp — a line with a bad stamp inherits the log's.
   */
  timestamp: Date | null;
  level: number | null;
  className: string | null;
  name: string;
  guild: string | null;
}

export function parseWhoLogs(logs: string): ParsedPlayer[] {
  const players: ParsedPlayer[] = [];
  const lines = logs.split('\n');

  // Regex patterns from Python code
  const timestampRe = /^\[([^\]]+)\]/;
  const levelClassRe = /(?<=(?<!^)\[)[^\]]*(?=\])/;
  const nameRe = /(?<=\] )[^[]+?(?=[ <(])/;
  const guildRe = /(?<=<)[^>]*(?=>)/;

  for (const rawLine of lines) {
    let line = rawLine.trim();

    if (line.length === 0) continue;

    // Clean up the line
    line = line.replace(/ AFK /g, '');
    line = line.replace(/ LFG/g, '');
    line = line.replace(/ <LINKDEAD>/g, '');

    // Parse timestamp
    const timestampMatch = line.match(timestampRe);
    if (!timestampMatch) continue;

    // A /who line must have a level/class bracket ([60 Warrior] or [ANONYMOUS]).
    // This is what distinguishes a roster line from chat/system lines — the
    // guild tag is optional because unguilded players have no <Guild> suffix.
    const levelClassMatch = line.match(levelClassRe);
    if (!levelClassMatch) continue;

    // An unreadable stamp is left unknown and resolved against the rest of the
    // log below. It must never become the current time: that silently dates an
    // old raid to today and corrupts everything read from attendance.date.
    const timestamp = parseEqTimestamp(timestampMatch[1])?.date ?? null;

    let level: number | null = null;
    let className: string | null = null;

    const parts = levelClassMatch[0].trim().split(' ');
    if (parts[0] === 'ANONYMOUS') {
      level = null;
      className = null;
    }
    else if (parts.length >= 2 && /^\d+$/.test(parts[0])) {
      level = parseInt(parts[0], 10);
      className = parts.slice(1).join(' ');
    }
    else {
      // Second bracket isn't a level/class — not a /who line, skip
      continue;
    }

    // Parse name
    const nameMatch = line.match(nameRe);
    if (!nameMatch) continue;
    const name = nameMatch[0].trim();

    // Parse guild
    const guildMatch = line.match(guildRe);
    const guild = guildMatch ? guildMatch[0] : null;

    players.push({
      timestamp,
      level,
      className,
      name,
      guild,
    });
  }

  // A /who is a single snapshot, so every line shares one instant. Lines whose
  // own stamp was unreadable take the log's. If no line carried one, the time
  // stays unknown rather than being invented.
  const logTimestamp = players.find(p => p.timestamp !== null)?.timestamp ?? null;
  if (logTimestamp) {
    for (const player of players) {
      if (player.timestamp === null) player.timestamp = logTimestamp;
    }
  }

  return players;
}
