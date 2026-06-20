/**
 * Re-derives the "unrecognized" names for a raid call from its saved /who log.
 *
 * A name is unrecognized when it appears in the log but is neither registered
 * in the census nor explicitly dismissed for this call. Pure and synchronous so
 * it can be unit-tested without a database; the caller supplies the lookup sets.
 *
 * @module
 */
import { parseWhoLogs } from './who_parser.js';

export interface UnrecognizedName {
  name: string;
  level: number | null;
  className: string | null;
}

export function deriveUnrecognized(
  whoLog: string | null,
  censusNames: Set<string>,
  dismissedNames: Set<string>,
): UnrecognizedName[] {
  if (!whoLog) return [];

  const seen = new Set<string>();
  const result: UnrecognizedName[] = [];

  for (const player of parseWhoLogs(whoLog)) {
    if (censusNames.has(player.name)) continue;
    if (dismissedNames.has(player.name)) continue;
    if (seen.has(player.name)) continue;
    seen.add(player.name);
    result.push({ name: player.name, level: player.level, className: player.className });
  }

  return result;
}
