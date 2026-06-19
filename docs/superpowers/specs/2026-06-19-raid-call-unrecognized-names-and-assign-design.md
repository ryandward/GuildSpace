# Raid-call unrecognized names: retain, ignore, and assign

- **Date:** 2026-06-19
- **Status:** Design — awaiting review
- **Author:** Ryan David Ward (with Claude Code)

## Problem

Two pieces of user feedback, which are really one problem:

1. *"If a name is rejected from a call and you navigate away from it, that rejection will disappear forever. If it could be retained as a comment or something on the call that would be good."*
2. *"It would be cool if there was a way to assign a toon to someone's Discord/webpage account from this invalid toon call somehow. Current process is to go to Discord and use `/assign`, but there isn't an easy equivalent on the website."*

### Current behavior

When an officer pastes a `/who` log to record raid attendance:

- `POST /api/raids/events/:id/calls` calls `processWhoLog()` (`src/commands/dkp/attendance_processor.ts:33`). Each parsed name is looked up in the census; names with no census row (or no `DiscordId`) are returned as `rejected: [{name, reason: 'Not registered'}]`.
- The client stores that response in `lastResult` — component-local `useState` in `RaidEventPage.tsx:33` — and renders a yellow banner (`RaidEventPage.tsx:163–177`).
- On navigate-away or refresh, `lastResult` is cleared and the rejection list is **gone forever**. The raw `/who` text is preserved on the call (`raid_calls.who_log`), but the parsed rejection list is not. `GET /api/raids/events/:id` even hardcodes `rejectedCount: 0` (`server.ts:1252`) and declares a `rejected` array (`server.ts:1232`) that is never populated.
- The only way to fix a "Not registered" name is the Discord `/assign` command (officer-only); there is no web equivalent. Web character management is self-service only (`PUT /api/roster/:discordId/characters/:name`), and `declareOrUpdate()` blocks claiming a toon owned by someone else.

These connect: a name is rejected *because* it is not registered, and the fix for "not registered" is exactly `/assign`. So the home for a web assign action is the persisted rejection list on the call.

## Goals

- Rejected/unrecognized names persist on a call and survive navigation and refresh.
- Officers can resolve each unrecognized name two ways, in-place on the call:
  - **Assign** it to an existing member (registers the toon and credits them for this call).
  - **Ignore** it (hide it, with an optional reason) for genuine non-guild names.
- The displayed list stays accurate over time with no stale data.

## Non-goals

- No multi-guild / tenancy work.
- No creating brand-new member accounts from the web (assign targets existing members only; brand-new players still come in via Discord OAuth login or Discord `/assign`).
- No bulk assign/ignore in v1 (one name at a time).
- No changes to the Discord bot or the companion `POST /api/raids/push` endpoint.

## Decisions (locked)

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | How rejections are retained | **Live, self-healing** — re-derive from the saved `who_log` against the current census on every read | No stale data, no snapshot column; assigning a name makes it leave the list automatically |
| 2 | Credit on assign | **Auto-credit the call** | The name was in the `/who`, so they were there; one click resolves registration + DKP |
| 3 | Non-guild names | **Ignore + optional reason**, stored per call | Self-healing lists would otherwise nag forever on pugs / other-guild players; the reason is the "comment on the call" the user asked for |
| 4 | Assign target pool | **Existing members only** (the roster) | Covers the common case (a member's unregistered alt) without needing a Discord user picker |
| 5 | Ignore scope | **Per call** | Matches "a comment on the call"; revisit per-event if recurring-pug tedium shows up |
| 6 | Resolving on closed events | **Read-only when closed** — lists always visible, Assign/Ignore actions gated `isOfficer && isActive` | Consistent with existing "Add Call" gating; closed events keep a historical record (which already solves "disappears forever") |
| 7 | Test runner | **Vitest** | Client already uses Vite; one runner for `src/` + `client/`, ESM + TS native |

## Architecture overview

The only new persisted state is **dismissals** (ignored names). Everything else is derived from `raid_calls.who_log` + the current census, so it cannot drift.

All branching logic lives in two **pure functions** that are unit-tested red→green; the Express endpoints are thin executors that load sets from the DB, call the pure function, and apply the result.

```
GET event  ──► load census names + per-call dismissals
               └► deriveUnrecognized(who_log, censusNames, dismissedNames)  [pure]
                  └► per call: { unrecognized:[{name,level,class}], dismissed:[...] }

Assign     ──► load who_log + census + call attendees
               └► planAssign({...})  [pure]  → { ok, createCensus, awardDkp, dkpAmount, note }
                  └► execute: declareOrUpdate(...) + (if awardDkp) reuse manual-add credit logic

Ignore     ──► upsert raid_call_dismissals(call_id, name, reason, dismissed_by)
Undo       ──► delete  raid_call_dismissals row
```

## Data model

### Migration `017_raid_call_dismissals.sql`

Idempotent (the runner re-executes every migration on each startup):

```sql
CREATE TABLE IF NOT EXISTS raid_call_dismissals (
  call_id       integer     NOT NULL REFERENCES raid_calls(id) ON DELETE CASCADE,
  name          text        NOT NULL,
  reason        text,
  dismissed_by  text        NOT NULL,
  dismissed_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (call_id, name)
);
```

- `ON DELETE CASCADE`: deleting a call removes its dismissals (matches `RaidCallAttendance`).
- PK `(call_id, name)`: one dismissal per name per call; re-ignoring updates `reason`/`dismissed_by`/`dismissed_at` via upsert.

### Entity `src/entities/RaidCallDismissal.ts`

TypeORM entity mapping the table (mirrors the lean style of `RaidCall.ts`): `callId`, `name`, `reason`, `dismissedBy`, `dismissedAt`.

## Backend

### Pure seam 1 — `deriveUnrecognized` (new, in `src/commands/dkp/`)

```ts
interface UnrecognizedName { name: string; level: number | null; className: string | null; }

function deriveUnrecognized(
  whoLog: string,
  censusNames: Set<string>,    // census names that have a DiscordId
  dismissedNames: Set<string>, // names dismissed on this call
): UnrecognizedName[]
```

- Parses `whoLog` with the existing `parseWhoLogs()`.
- Drops names present in `censusNames` (matches `processWhoLog`'s "registered" test: a census row **with a DiscordId**).
- Drops names present in `dismissedNames`.
- De-duplicates by name (a name appearing twice in the log → one entry), keeping the parsed `level`/`className`.
- Returns the remainder, carrying `level`/`className` straight from the `/who` line so the assign form can prefill.

### `GET /api/raids/events/:id` changes (`server.ts:1204–1312`)

- Additionally load the full census name set (rows with a `DiscordId`) once per request, and load `RaidCallDismissal` rows for the event's calls.
- In the per-call mapping (currently `server.ts:1247–1256`), replace the unused `rejected`/`rejectedCount: 0` with:
  - `unrecognized: deriveUnrecognized(call.whoLog, censusNameSet, dismissedSetForCall)`
  - `dismissed: [{ name, reason, dismissedBy, dismissedAt }]` for that call
- Keep `recordedCount`; set `rejectedCount = unrecognized.length` (replacing the hardcoded `0`) so the existing field stays meaningful for any current consumer.

### Pure seam 2 — `planAssign` (new, in `src/commands/dkp/` or `src/commands/census/`)

```ts
interface AssignPlan {
  ok: boolean;
  error?: string;                                  // 'not in this call' | 'already registered'
  createCensus?: { name: string; level: number; characterClass: string; status: string; discordId: string };
  awardDkp: boolean;
  dkpAmount: number;
  note?: string;                                   // e.g. 'owner already credited on this call — no extra DKP'
}

function planAssign(input: {
  name: string;
  whoLog: string;
  censusNames: Set<string>;
  targetDiscordId: string;
  alreadyCreditedDiscordIds: Set<string>;          // discord_ids already in this call's attendance
  callModifier: number;
  requestedStatus: string;                         // 'Main' | 'Alt' | 'Bot'
  targetHasMain: boolean;
  level: number; characterClass: string;           // from the /who line (validated against parsed log)
}): AssignPlan
```

Rules:
- `name` must appear in `parseWhoLogs(whoLog)` → else `error: 'not in this call'`.
- `name` must not be in `censusNames` → else `error: 'already registered'`.
- Status: if `!targetHasMain` → force `'Main'` (mirrors Discord `/assign`); else use `requestedStatus` (default `'Alt'`).
- If `targetDiscordId ∈ alreadyCreditedDiscordIds` → `awardDkp: false` + explanatory `note` (the owner already has a toon credited on this call; we still register the new toon). Else `awardDkp: true`, `dkpAmount: callModifier`.

### `POST /api/raids/events/:id/calls/:callId/assign` (new, officer-only)

- Guard: `requireOfficer(req, res)` (`server.ts:600`).
- Body: `{ name, discordId, status, level, characterClass, credit }` (credit defaults true).
- Validate the target `discordId` is a known member (exists in `Dkp`/`Census`/`GuildSpaceUser`).
- Load `call.whoLog`, census name set, and the call's already-credited discord_ids; call `planAssign(...)`.
- If `!plan.ok` → `400` with `plan.error`.
- Execute `plan.createCensus` via `declareOrUpdate(discordId, status, name, level, characterClass)` (`src/commands/census/census_functions.ts`) — creates the census row and ensures a DKP entry.
- If `credit && plan.awardDkp`: reuse the manual-add credit logic (the body of `POST .../add`, `server.ts:1602–1623` — attendance row + `earned_dkp + modifier` + `RaidCallAttendance` link). Factor that block into a small shared helper so assign and add share one code path.
- Return the result incl. `plan.note` if present.

### `POST /api/raids/events/:id/calls/:callId/dismiss` (new, officer-only)

- Body: `{ name, reason? }`. Validate `name` is in the call's `who_log` and not in census. Upsert into `raid_call_dismissals` (`ON CONFLICT (call_id, name) DO UPDATE`).

### `DELETE /api/raids/events/:id/calls/:callId/dismiss/:name` (new, officer-only)

- Delete the dismissal row; the name reappears in `unrecognized` if still not in census.

## Frontend

### Data hooks (`client/src/hooks/`, TanStack Query, `useBioMutation` pattern)

- `useAssignToonMutation(eventId)` — `POST .../assign`; on success invalidate `['raidEvent', String(eventId)]` and `['roster']`.
- `useDismissNameMutation(eventId)` — `POST .../dismiss`; invalidate `['raidEvent', String(eventId)]`.
- `useUndoDismissMutation(eventId)` — `DELETE .../dismiss/:name`; invalidate `['raidEvent', String(eventId)]`.

These live alongside the existing mutations in `client/src/hooks/useRaidMutations.ts`, which already invalidate `['raidEvent', String(eventId)]` after every call change.

### UI

- **Per-call "Unrecognized in /who" section** in `client/src/components/raids/CallRow.tsx`, fed by the fetched `call.unrecognized` array — **no longer dependent on `lastResult`**, so it survives navigation/refresh. Each entry shows the name (+ level/class) and, when `isOfficer && isActive`, `[Assign ▾] [Ignore]`.
- **"Ignored on this call"** sub-list from `call.dismissed`: name, reason, who/when, and `[undo]` (officer + active).
- **`AssignToonDialog`** (new component): name fixed; `level`/`class` prefilled from the entry and editable; member picker filtered client-side from the already-loaded `useRosterQuery` data (no new search endpoint); status radio (Main/Alt/Bot); a "also credit this call (+N DKP)" checkbox showing `call.modifier`, default checked. Submit → `useAssignToonMutation`.
- **Ignore** uses a small inline reason prompt (optional text) → `useDismissNameMutation`.
- Keep the existing post-submit toast (`lastResult`) for instant feedback after adding a call; the persistent source of truth is now the fetched `unrecognized`/`dismissed` data.

## Permissions & state

- Lists (`unrecognized`, `dismissed`) are visible to anyone who can view the event.
- Assign / Ignore / Undo actions: officer-only on the server (`requireOfficer`), and the UI gates them on `isOfficer && isActive` (same as "Add Call", `RaidEventPage.tsx:52`). Closed events render the lists read-only — preserving the historical record.

## Testing strategy (red → green TDD, Vitest)

Set up Vitest at the repo root (one config covering `src/` and `client/`). Write each pure function test-first: a failing test, then the implementation that makes it pass. Tests must be **nontrivial** — real branches and edge cases, not smoke tests.

### `deriveUnrecognized` cases

- guilded `/who` line not in census → returned with parsed level/class
- **unguilded** line not in census → returned (guards the `beb29a2` regression)
- `AFK` / `LFG` / `<LINKDEAD>` flags stripped, name still matched
- `[ANONYMOUS]` line → returned with `level: null, className: null`
- name present in census set → excluded
- name present in dismissed set → excluded
- same name twice in the log → single entry
- pure chat/system noise lines → ignored
- empty log → `[]`

### `planAssign` cases

- name not in this call's `who_log` → `{ok:false, error:'not in this call'}`
- name already in census → `{ok:false, error:'already registered'}`
- target has no Main → status forced to `'Main'`
- target has a Main, requested `'Alt'` → status stays `'Alt'`
- target already credited on this call → `createCensus` set, `awardDkp:false`, `note` present
- normal case → `awardDkp:true`, `dkpAmount === callModifier`, level/class taken from the line

### Not unit-tested (documented manual verification)

The full HTTP + Postgres path (the shared production DB makes an integration harness heavy): see Verification. Dismiss/undo endpoints are thin CRUD — covered by manual verification plus, if cheap, a pure validation test.

## Build plan (two independently shippable phases)

**Phase A — Retain + Ignore (idea #1)**
1. Stand up Vitest (root config, `test` script).
2. `deriveUnrecognized` — red→green.
3. Migration `017` + `RaidCallDismissal` entity.
4. Wire `deriveUnrecognized` + dismissals into `GET /api/raids/events/:id`.
5. `dismiss` + `undo` endpoints.
6. Frontend: persistent "Unrecognized" section + "Ignored" list + ignore/undo hooks.
7. Manual verification of Phase A.

**Phase B — Assign from call (idea #2)**
1. `planAssign` — red→green.
2. Factor the manual-add credit block into a shared helper; add the `assign` endpoint.
3. Frontend: `AssignToonDialog` + `useAssignToonMutation`; wire `[Assign ▾]`.
4. Manual verification of Phase B.

## Edge cases

- **Owner already credited on this call** (assigning an alt of someone already present): register the toon, skip the extra DKP, surface `plan.note`. Mirrors the existing 409 dedup in `POST .../add` (`server.ts:1599`).
- **Name dismissed, then later registered elsewhere**: it won't appear as unrecognized (census check wins); the orphan dismissal row is harmless.
- **Census name matching** is exact, consistent with `processWhoLog` and `POST .../add`.
- **Migrations are idempotent** — `CREATE TABLE IF NOT EXISTS`; upsert via `ON CONFLICT`.

## Verification (manual, post-implementation)

1. Paste a `/who` with one known-unregistered name → navigate away and back → the name still shows under "Unrecognized." (Fixes idea #1.)
2. Assign that name to a member with credit on → census row created, that member's DKP increases by the call modifier, the name leaves the "Unrecognized" list. (Idea #2 + auto-credit.)
3. Assign an alt of a member already credited on the call → registers, no extra DKP, note shown.
4. Ignore a name with a reason → it moves to "Ignored on this call" with the reason; undo restores it.
5. Close the event → both lists remain visible, action buttons gone.

## Open items

None blocking. Defaults #5 (per-call ignore) and #6 (closed = read-only) are locked but easy to revisit if usage suggests otherwise.
