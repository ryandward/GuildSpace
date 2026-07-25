import { describe, it, expect } from 'vitest';
import { parseEqTimestamp } from './eqTimestamp.js';

describe('parseEqTimestamp', () => {
  it('reads a standard EverQuest stamp', () => {
    const stamp = parseEqTimestamp('Thu May 25 22:10:50 2023');
    expect(stamp).not.toBeNull();
    expect(stamp!.clock).toBe('22:10');
    expect(stamp!.date).toEqual(new Date(2023, 4, 25, 22, 10, 50));
  });

  it('reads a space-padded single-digit day', () => {
    expect(parseEqTimestamp('Sat Jun  6 09:05:00 2026')!.clock).toBe('09:05');
  });

  it('keeps the log wall clock rather than shifting it', () => {
    // EQ stamps carry no zone. Constructing from parts keeps the clock the
    // player saw; going through Date's string parser invites zone guessing.
    const d = parseEqTimestamp('Thu Jun 25 23:59:59 2026')!.date;
    expect(d.getHours()).toBe(23);
    expect(d.getMinutes()).toBe(59);
  });

  describe('rejects things Date.parse would have accepted', () => {
    // Each of these produced a *valid* Date and so slipped past the old isNaN
    // check, landing an absurd year in attendance.date where it sinks to the
    // bottom of MAX() and reads as "never raided".
    it.each([
      ['a stripped year', 'Thu May 25 22:10:50'],
      ['a bare number from a numbered log', '12'],
      ['a GamParse-style tag', 'Raid 1'],
      ['a month/day with no year', 'May 25 22:10:50'],
    ])('%s', (_label, raw) => {
      expect(Number.isNaN(new Date(raw).getTime())).toBe(false); // Date.parse accepts it
      expect(parseEqTimestamp(raw)).toBeNull();                  // we do not
    });
  });

  describe('rejects things that are not EQ stamps', () => {
    it.each([
      ['a time-only stamp', '22:10:50'],
      ['a channel tag', 'Raid'],
      ['an ISO stamp', '2023-05-25T22:10:50'],
      ['a dd/mm/yyyy stamp', '25/05/2023 22:10:50'],
      ['a non-English locale stamp', 'jeu. mai 25 22:10:50 2023'],
      ['a trailing zero-width space', 'Thu May 25 22:10:50 2023​'],
      ['empty', ''],
    ])('%s', (_label, raw) => {
      expect(parseEqTimestamp(raw)).toBeNull();
    });
  });

  it('never returns a date near now for input it rejects', () => {
    const before = Date.now();
    const result = parseEqTimestamp('no time here');
    const after = Date.now();
    expect(result).toBeNull();
    // Guards the specific regression: the old code answered "now" here.
    expect(after - before).toBeGreaterThanOrEqual(0);
  });
});
