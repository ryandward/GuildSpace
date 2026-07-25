/**
 * Picks the date an attendance row created for a raid call should carry.
 *
 * @module
 */

import { parseWhoLogs } from './who_parser.js';

/**
 * Returns when the call's `/who` was taken, falling back to when the call was
 * submitted if the log carries no readable time.
 *
 * Rows added to a call after the fact — a manual add, or assigning a name the
 * census did not recognise — belong to the moment the raid happened, not the
 * moment the correction was made. Stamping the correction time backdates
 * nothing and actively misreports: being the newest row for that character, it
 * wins `MAX(attendance.date)` and becomes their displayed "last raid".
 */
export function deriveCallTimestamp(whoLog: string | null, submittedAt: Date): Date {
  return parseWhoLogs(whoLog ?? '')[0]?.timestamp ?? submittedAt;
}
