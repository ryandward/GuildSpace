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

    // Skip lines without guild tags (unless ANONYMOUS)
    if ((!line.includes('<') || !line.includes('>')) && !line.includes('ANONYMOUS')) {
      continue;
    }

    // Clean up the line
    line = line.replace(/ AFK /g, '');
    line = line.replace(/ LFG/g, '');
    line = line.replace(/ <LINKDEAD>/g, '');

    // Parse timestamp
    const timestampMatch = line.match(timestampRe);
    if (!timestampMatch) continue;

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

    // Parse level/class - looking for [60 High Priest] or [ANONYMOUS]
    const levelClassMatch = line.match(levelClassRe);
    let level: number | null = null;
    let className: string | null = null;

    if (levelClassMatch) {
      const parts = levelClassMatch[0].trim().split(' ');
      if (parts[0] === 'ANONYMOUS') {
        level = null;
        className = null;
      }
      else if (parts.length >= 2) {
        level = parseInt(parts[0], 10) || null;
        className = parts.slice(1).join(' ');
      }
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
