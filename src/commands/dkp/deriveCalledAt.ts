/**
 * Derives the wall-clock time a raid call's `/who` roll call was taken.
 *
 * Raid calls repeated against the same target render identically in the UI —
 * same raid name, same DKP, similar headcount — so the time is what tells one
 * apart from the next. `raid_calls.created_at` cannot serve: it records when an
 * officer pressed Submit, and a batch of logs pasted after the night ends would
 * cluster inside a minute. The `/who` text carries the real time.
 *
 * @module
 */

import { parseEqTimestamp } from './eqTimestamp.js';

/**
 * Returns `"HH:MM"` from the first `/who` line in a pasted log, or `null` when
 * the log is absent or contains no `/who` line.
 *
 * The time is extracted **as text and never parsed into a `Date`.** EQ log
 * timestamps carry no timezone, so `new Date("Thu Jun 25 21:48:29 2026")` is
 * interpreted in whichever zone the process runs in — UTC on Railway. Such a
 * value serializes to JSON with a `Z` it never earned, and a browser at another
 * offset renders the wrong hour. Since this string is bound for the client,
 * substring extraction is not a shortcut here; it is the requirement.
 */
export function deriveCalledAt(whoLog: string | null): string | null {
  if (!whoLog) return null;

  // A `/who` line opens with a bracketed timestamp and carries a second
  // bracket holding level and class ("[60 Sorcerer]" or "[ANONYMOUS]"). The
  // second bracket is what separates roster lines from chat and system lines,
  // which share the timestamp prefix. Same test as parseWhoLogs.
  const timestampRe = /^\[([^\]]+)\]/;
  const levelClassRe = /(?<=(?<!^)\[)[^\]]*(?=\])/;

  for (const rawLine of whoLog.split('\n')) {
    const line = rawLine.trim();
    if (line.length === 0) continue;

    const timestampMatch = line.match(timestampRe);
    if (!timestampMatch) continue;
    if (!levelClassRe.test(line)) continue;

    // Same matcher the attendance parser uses, so the two cannot disagree about
    // which stamps are readable. When they each decided independently, a call
    // could end up with attendees recorded but no time shown.
    const stamp = parseEqTimestamp(timestampMatch[1]);
    if (!stamp) continue;

    return stamp.clock;
  }

  return null;
}
