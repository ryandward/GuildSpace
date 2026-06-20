import { describe, it, expect } from 'vitest';
import { planAssign } from './planAssign';

const TS = '[Thu May 25 22:10:50 2023]';
const LOG = `${TS} [60 Warrior] Azrosaurus (Iksar) <Ex Astra>`;

function base(overrides = {}) {
  return {
    name: 'Azrosaurus',
    whoLog: LOG,
    censusNames: new Set<string>(),
    targetDiscordId: 'user-1',
    alreadyCreditedDiscordIds: new Set<string>(),
    callModifier: 5,
    requestedStatus: 'Alt',
    targetHasMain: true,
    credit: true,
    ...overrides,
  };
}

describe('planAssign', () => {
  it('rejects a name that is not in this call\'s /who log', () => {
    const plan = planAssign(base({ name: 'Nobody' }));
    expect(plan.ok).toBe(false);
    expect(plan.error).toBe('not in this call');
  });

  it('rejects a name that is already in the census', () => {
    const plan = planAssign(base({ censusNames: new Set(['Azrosaurus']) }));
    expect(plan.ok).toBe(false);
    expect(plan.error).toBe('already registered');
  });

  it('forces the first toon of a member with no Main to Main', () => {
    const plan = planAssign(base({ targetHasMain: false, requestedStatus: 'Alt' }));
    expect(plan.ok).toBe(true);
    expect(plan.status).toBe('Main');
  });

  it('keeps the requested status when the member already has a Main', () => {
    const plan = planAssign(base({ targetHasMain: true, requestedStatus: 'Alt' }));
    expect(plan.status).toBe('Alt');
  });

  it('registers without extra DKP when the owner is already credited on this call', () => {
    const plan = planAssign(base({ alreadyCreditedDiscordIds: new Set(['user-1']) }));
    expect(plan.ok).toBe(true);
    expect(plan.awardDkp).toBe(false);
    expect(plan.note).toMatch(/already credited/i);
  });

  it('awards the call modifier in the normal case', () => {
    const plan = planAssign(base());
    expect(plan.ok).toBe(true);
    expect(plan.awardDkp).toBe(true);
    expect(plan.dkpAmount).toBe(5);
  });

  it('does not award DKP when credit is false', () => {
    const plan = planAssign(base({ credit: false }));
    expect(plan.ok).toBe(true);
    expect(plan.awardDkp).toBe(false);
    expect(plan.dkpAmount).toBe(0);
  });
});
