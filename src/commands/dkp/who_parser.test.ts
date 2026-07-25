import { describe, it, expect } from 'vitest';
import { parseWhoLogs } from './who_parser.js';

const STAMP = 'Thu Jun 25 21:48:29 2026';
const WHO = (ts: string, rest: string) => `[${ts}] ${rest}`;

const DINU = '[60 Sorcerer] Dinu (Skeleton) <Ex Astra>';
const THORREK = '[60 High Priest] Thorrek (Halfling) <Ex Astra>';
const AZRORA = '[60 Assassin] Azrora (Barbarian) <Ex Astra>';

describe('parseWhoLogs', () => {
  it('parses name, level, class and guild from a roster line', () => {
    expect(parseWhoLogs(WHO(STAMP, DINU))).toEqual([
      { timestamp: new Date(STAMP), level: 60, className: 'Sorcerer', name: 'Dinu', guild: 'Ex Astra' },
    ]);
  });

  it('reads the timestamp of every line', () => {
    const log = [WHO(STAMP, DINU), WHO(STAMP, THORREK)].join('\n');
    const stamps = parseWhoLogs(log).map(p => p.timestamp);
    expect(stamps).toEqual([new Date(STAMP), new Date(STAMP)]);
  });

  describe('a line whose stamp will not parse', () => {
    // A /who is a single snapshot: every line shares one instant. Treating the
    // timestamp as per-line is what used to force the parser to invent one.
    const log = [
      WHO(STAMP, DINU),
      WHO('no time here', THORREK),
      WHO(STAMP, AZRORA),
    ].join('\n');

    it('is still recorded as a player', () => {
      expect(parseWhoLogs(log).map(p => p.name)).toEqual(['Dinu', 'Thorrek', 'Azrora']);
    });

    it('inherits the time of the log it came in', () => {
      expect(parseWhoLogs(log)[1].timestamp).toEqual(new Date(STAMP));
    });

    it('never claims the raid happened now', () => {
      const before = Date.now();
      const stamp = parseWhoLogs(log)[1].timestamp;
      const after = Date.now();
      // The old behaviour substituted `new Date()`, silently dating a month-old
      // raid to today and corrupting every "last raid" reading downstream.
      expect(stamp).not.toBeNull();
      const ms = stamp!.getTime();
      expect(ms >= before && ms <= after).toBe(false);
    });
  });

  describe('a log where no line carries a readable stamp', () => {
    const log = [WHO('no time here', DINU), WHO('still nothing', THORREK)].join('\n');

    it('still records the players', () => {
      expect(parseWhoLogs(log).map(p => p.name)).toEqual(['Dinu', 'Thorrek']);
    });

    it('reports the time as unknown rather than inventing one', () => {
      expect(parseWhoLogs(log).map(p => p.timestamp)).toEqual([null, null]);
    });
  });

  it('skips chat and system lines that carry no level/class bracket', () => {
    const log = [
      `[${STAMP}] Broms tells the guild, 'inc mini'`,
      WHO(STAMP, DINU),
    ].join('\n');
    expect(parseWhoLogs(log).map(p => p.name)).toEqual(['Dinu']);
  });

  it('returns nothing for an empty log', () => {
    expect(parseWhoLogs('')).toEqual([]);
    expect(parseWhoLogs('   \n \n')).toEqual([]);
  });
});
