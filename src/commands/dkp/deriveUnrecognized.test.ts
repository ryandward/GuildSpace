import { describe, it, expect } from 'vitest';
import { deriveUnrecognized } from './deriveUnrecognized.js';

const TS = '[Thu May 25 22:10:50 2023]';

describe('deriveUnrecognized', () => {
  it('returns a guilded /who name that is not in the census, with level + class', () => {
    const log = `${TS} [60 Warrior] Azrosaurus (Iksar) <Ex Astra>`;
    expect(deriveUnrecognized(log, new Set(), new Set())).toEqual([
      { name: 'Azrosaurus', level: 60, className: 'Warrior' },
    ]);
  });

  it('returns an unguilded /who name (no <Guild> tag)', () => {
    const log = `${TS} [60 Warrior] Soloman (Human)`;
    expect(deriveUnrecognized(log, new Set(), new Set())).toEqual([
      { name: 'Soloman', level: 60, className: 'Warrior' },
    ]);
  });

  it('excludes names already in the census', () => {
    const log = `${TS} [60 Cleric] Healz (Human) <Ex Astra>`;
    expect(deriveUnrecognized(log, new Set(['Healz']), new Set())).toEqual([]);
  });

  it('excludes names that have been dismissed', () => {
    const log = `${TS} [55 Rogue] Sneaky (Halfling)`;
    expect(deriveUnrecognized(log, new Set(), new Set(['Sneaky']))).toEqual([]);
  });

  it('returns an ANONYMOUS player with null level/class', () => {
    const log = `${TS} [ANONYMOUS] Ghost (Gnome)`;
    expect(deriveUnrecognized(log, new Set(), new Set())).toEqual([
      { name: 'Ghost', level: null, className: null },
    ]);
  });

  it('parses the name even when an LFG flag is present', () => {
    const log = `${TS} [60 Cleric] Lfgguy (Human) <Ex Astra> LFG`;
    expect(deriveUnrecognized(log, new Set(), new Set())).toEqual([
      { name: 'Lfgguy', level: 60, className: 'Cleric' },
    ]);
  });

  it('de-duplicates a name that appears twice', () => {
    const log = `${TS} [60 Monk] Twice (Iksar)\n${TS} [60 Monk] Twice (Iksar)`;
    expect(deriveUnrecognized(log, new Set(), new Set())).toEqual([
      { name: 'Twice', level: 60, className: 'Monk' },
    ]);
  });

  it('ignores chat/system lines that are not /who roster lines', () => {
    const log = `${TS} Soandso says, 'hello'\nrandom noise line`;
    expect(deriveUnrecognized(log, new Set(), new Set())).toEqual([]);
  });

  it('returns [] for null or empty logs', () => {
    expect(deriveUnrecognized(null, new Set(), new Set())).toEqual([]);
    expect(deriveUnrecognized('', new Set(), new Set())).toEqual([]);
  });
});
