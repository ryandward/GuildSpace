import { describe, it, expect } from 'vitest';
import { deriveCallTimestamp } from './deriveCallTimestamp.js';

const STAMP = 'Thu Jun 25 21:48:29 2026';
const SUBMITTED = new Date('Thu Jun 25 21:50:00 2026');
const WHO = (ts: string) => `[${ts}] [60 Sorcerer] Dinu (Skeleton) <Ex Astra>`;

describe('deriveCallTimestamp', () => {
  it('dates the row to when the /who was taken', () => {
    expect(deriveCallTimestamp(WHO(STAMP), SUBMITTED)).toEqual(new Date(STAMP));
  });

  it('reads past chat lines to find the roll call', () => {
    const log = [
      `[${STAMP}] Broms tells the guild, 'inc mini'`,
      WHO(STAMP),
    ].join('\n');
    expect(deriveCallTimestamp(log, SUBMITTED)).toEqual(new Date(STAMP));
  });

  it('falls back to when the call was submitted if the log carries no time', () => {
    expect(deriveCallTimestamp(WHO('no time here'), SUBMITTED)).toEqual(SUBMITTED);
  });

  it('falls back for a missing or empty log', () => {
    expect(deriveCallTimestamp(null, SUBMITTED)).toEqual(SUBMITTED);
    expect(deriveCallTimestamp('', SUBMITTED)).toEqual(SUBMITTED);
  });

  it('never dates the row to the moment the correction was made', () => {
    // An officer fixing up a raid the next morning must not stamp that member
    // with the next morning — it is wrong, and being the newest row it would
    // win MAX(attendance.date) and become their displayed "last raid".
    const before = Date.now();
    const result = deriveCallTimestamp(WHO(STAMP), SUBMITTED);
    const after = Date.now();
    const ms = result.getTime();
    expect(ms >= before && ms <= after).toBe(false);
  });
});
