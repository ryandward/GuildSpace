import { describe, it, expect } from 'vitest';
import { deriveCalledAt } from './deriveCalledAt.js';
import { parseWhoLogs } from './who_parser.js';

const WHO = (ts: string, rest = '[60 Sorcerer] Dinu (Skeleton) <Ex Astra>') => `[${ts}] ${rest}`;

describe('deriveCalledAt', () => {
  it('returns the wall-clock time of a /who line', () => {
    expect(deriveCalledAt(WHO('Thu Jun 25 21:48:29 2026'))).toBe('21:48');
  });

  it('returns the first line time when a paste has many lines', () => {
    const log = [
      WHO('Thu Jun 25 21:48:29 2026', '[60 Sorcerer] Dinu (Skeleton) <Ex Astra>'),
      WHO('Thu Jun 25 21:48:29 2026', '[60 High Priest] Thorrek (Halfling) <Ex Astra>'),
      WHO('Thu Jun 25 21:48:30 2026', '[60 Assassin] Azrora (Barbarian) <Ex Astra>'),
    ].join('\n');
    expect(deriveCalledAt(log)).toBe('21:48');
  });

  it('skips chat and system lines that have no level/class bracket', () => {
    const log = [
      '[Thu Jun 25 21:40:02 2026] Broms tells the guild, \'inc mini\'',
      '[Thu Jun 25 21:41:11 2026] You have entered Halls of Testing.',
      WHO('Thu Jun 25 21:48:29 2026'),
    ].join('\n');
    expect(deriveCalledAt(log)).toBe('21:48');
  });

  it('counts an ANONYMOUS line as a /who line', () => {
    expect(deriveCalledAt('[Thu Jun 25 22:05:00 2026] [ANONYMOUS] Korova (Skeleton)')).toBe('22:05');
  });

  it('pads a single-digit hour', () => {
    expect(deriveCalledAt(WHO('Fri Jun 26 9:05:00 2026'))).toBe('09:05');
  });

  it('keeps the log wall clock rather than converting it', () => {
    // The EQ log carries no timezone. 23:59 must stay 23:59 regardless of
    // where this runs — a Date round-trip would shift it.
    expect(deriveCalledAt(WHO('Thu Jun 25 23:59:59 2026'))).toBe('23:59');
    expect(deriveCalledAt(WHO('Thu Jun 25 00:03:00 2026'))).toBe('00:03');
  });

  it('returns a string, never a Date', () => {
    expect(typeof deriveCalledAt(WHO('Thu Jun 25 21:48:29 2026'))).toBe('string');
  });

  it('returns null for a null log', () => {
    expect(deriveCalledAt(null)).toBeNull();
  });

  it('returns null for an empty or whitespace log', () => {
    expect(deriveCalledAt('')).toBeNull();
    expect(deriveCalledAt('   \n  \n')).toBeNull();
  });

  it('returns null when no line is a /who line', () => {
    const log = [
      '[Thu Jun 25 21:40:02 2026] Broms tells the guild, \'inc mini\'',
      '[Thu Jun 25 21:41:11 2026] You have entered Halls of Testing.',
    ].join('\n');
    expect(deriveCalledAt(log)).toBeNull();
  });

  it('returns a time for any log parseWhoLogs records players from', () => {
    // The pairing that matters: a call with attendees must never render
    // without a time. deriveCalledAt applies the same timestamp and
    // level/class tests as the parser, so it cannot be the stricter of the two.
    const log = [
      '[Thu Jun 25 21:40:02 2026] Broms tells the guild, \'inc mini\'',
      WHO('Thu Jun 25 21:48:29 2026'),
      WHO('Thu Jun 25 21:48:29 2026', '[ANONYMOUS] Korova (Skeleton)'),
    ].join('\n');
    expect(parseWhoLogs(log).length).toBeGreaterThan(0);
    expect(deriveCalledAt(log)).toBe('21:48');
  });

  it('returns null rather than inventing a time when the stamp has no clock', () => {
    // parseWhoLogs substitutes `new Date()` for an unparseable stamp. That is
    // fine for ordering attendance but would render as a confident, wrong hour
    // on the call row, so deriveCalledAt declines instead.
    const line = '[no time here] [60 Sorcerer] Dinu (Skeleton)';
    expect(parseWhoLogs(line)).toHaveLength(1);
    expect(deriveCalledAt(line)).toBeNull();
  });
});
