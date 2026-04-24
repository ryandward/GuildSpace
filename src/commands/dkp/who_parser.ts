/**
 * Parses EverQuest `/who` log output into structured player records.
 *
 * Extracted from the `/attendance` command so both the terminal command
 * and the REST raid-call endpoint can share the same parsing logic.
 *
 * @module
 */

export interface ParsedPlayer {
  timestamp: Date;
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

    let timestamp: Date;
    try {
      // EQ format: "Thu May 25 22:10:50 2023"
      timestamp = new Date(timestampMatch[1]);
      if (isNaN(timestamp.getTime())) {
        timestamp = new Date();
      }
    }
    catch {
      timestamp = new Date();
    }

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

  return players;
}
