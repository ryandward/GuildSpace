/**
 * Decides what assigning an unrecognized /who name to a member should do:
 * whether it is valid, what census status to use, and whether to credit DKP
 * for the call. Pure and synchronous so the decision logic is unit-tested
 * without a database; the caller supplies the lookup sets and executes the plan.
 *
 * @module
 */
import { parseWhoLogs } from './who_parser.js';

export interface AssignPlanInput {
  name: string;
  whoLog: string | null;
  censusNames: Set<string>;
  targetDiscordId: string;
  alreadyCreditedDiscordIds: Set<string>;
  callModifier: number;
  requestedStatus: string;
  targetHasMain: boolean;
  credit: boolean;
}

export interface AssignPlan {
  ok: boolean;
  error?: 'not in this call' | 'already registered' | 'invalid status';
  status: string;
  awardDkp: boolean;
  dkpAmount: number;
  note?: string;
}

const ALLOWED_STATUS = new Set(['Main', 'Alt', 'Bot']);

export function planAssign(input: AssignPlanInput): AssignPlan {
  const {
    name, whoLog, censusNames, targetDiscordId, alreadyCreditedDiscordIds,
    callModifier, requestedStatus, targetHasMain, credit,
  } = input;

  const namesInLog = new Set(parseWhoLogs(whoLog ?? '').map(p => p.name));
  if (!namesInLog.has(name)) {
    return { ok: false, error: 'not in this call', status: requestedStatus, awardDkp: false, dkpAmount: 0 };
  }
  if (censusNames.has(name)) {
    return { ok: false, error: 'already registered', status: requestedStatus, awardDkp: false, dkpAmount: 0 };
  }
  if (!ALLOWED_STATUS.has(requestedStatus)) {
    return { ok: false, error: 'invalid status', status: requestedStatus, awardDkp: false, dkpAmount: 0 };
  }

  // A member's first toon must be their Main (mirrors the Discord /assign command).
  const status = targetHasMain ? requestedStatus : 'Main';

  // Never double-credit a member who already has a toon recorded on this call.
  if (credit && alreadyCreditedDiscordIds.has(targetDiscordId)) {
    return {
      ok: true,
      status,
      awardDkp: false,
      dkpAmount: 0,
      note: 'Owner already credited on this call — registered without extra DKP.',
    };
  }

  return {
    ok: true,
    status,
    awardDkp: credit,
    dkpAmount: credit ? callModifier : 0,
  };
}
