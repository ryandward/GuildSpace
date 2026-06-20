# Raid-call unrecognized names: retain, ignore, assign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make rejected `/who` names persist on a raid call (re-derived live from the saved log), let officers ignore non-guild names with a reason, and let officers assign an unrecognized toon to an existing member from the call — auto-crediting that call's DKP.

**Architecture:** All branching logic lives in two pure, unit-tested functions (`deriveUnrecognized`, `planAssign`); Express endpoints are thin executors that load sets from Postgres, call the pure function, and apply the result. The only new persisted state is a `raid_call_dismissals` table. The client re-renders the unrecognized/ignored lists from the event-detail query, so nothing is held in ephemeral component state.

**Tech Stack:** TypeScript (ESM, `.js` import extensions), TypeORM + PostgreSQL, Express, React 19 + Vite + TanStack Query, Vitest (new) for the pure-function tests.

**Spec:** `docs/superpowers/specs/2026-06-19-raid-call-unrecognized-names-and-assign-design.md`

**Conventions to honor:**
- ESM: every relative import ends in `.js` even from `.ts` source.
- Migrations are idempotent (`CREATE TABLE IF NOT EXISTS`) and auto-run from `src/migrations/*.sql` in alphabetical order at startup (`src/index_web.ts:26-34`).
- User-facing error strings are plain language (no `:x:` prefixes, no internals).
- Client REST access goes through TanStack Query hooks + `authFetch`; never raw `fetch` + `useEffect`.
- Commit after each green step.

---

## Phase A — Retain + Ignore (idea #1)

Delivers: unrecognized names survive navigation/refresh, and officers can ignore non-guild names with an optional reason. Independently shippable.

---

### Task A1: Stand up Vitest

**Files:**
- Modify: `package.json` (root)
- Create: `vitest.config.ts` (root)
- Modify: `tsconfig.json` (root)
- Create: `src/commands/dkp/sanity.test.ts` (temporary, deleted in this task)

- [ ] **Step 1: Install Vitest (root, not client)**

Run from repo root:
```bash
npm install -D vitest
```
Expected: `package.json` gains `vitest` under `devDependencies`.

- [ ] **Step 2: Add test scripts to root `package.json`**

Replace the `"scripts"` block in `package.json` with:
```json
  "scripts": {
    "build": "npm run build:client && tsc",
    "build:client": "cd client && npm install && npm run build",
    "start": "node dist/index_web.js",
    "test": "vitest",
    "test:run": "vitest run"
  },
```

- [ ] **Step 3: Create `vitest.config.ts` (root)**

This config (a) only picks up `*.test.ts` under `src/`, and (b) teaches Vite to resolve the project's `.js` import specifiers to their real `.ts` files (our source uses `.js` extensions for ESM).
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    {
      name: 'resolve-js-to-ts',
      enforce: 'pre',
      async resolveId(source, importer) {
        if (importer && source.startsWith('.') && source.endsWith('.js')) {
          const resolved = await this.resolve(
            source.slice(0, -3) + '.ts',
            importer,
            { skipSelf: true },
          );
          if (resolved) return resolved;
        }
        return null;
      },
    },
  ],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
```

- [ ] **Step 4: Exclude test files from the production build**

In `tsconfig.json`, change the `exclude` line from:
```json
  "exclude": ["node_modules"]
```
to:
```json
  "exclude": ["node_modules", "src/**/*.test.ts"]
```

- [ ] **Step 5: Create a temporary sanity test to prove the runner works**

Create `src/commands/dkp/sanity.test.ts`:
```ts
import { describe, it, expect } from 'vitest';

describe('vitest', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 6: Run it**

Run: `npm run test:run`
Expected: PASS — 1 test passed.

- [ ] **Step 7: Delete the sanity test**

```bash
rm src/commands/dkp/sanity.test.ts
```

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vitest.config.ts tsconfig.json
git commit -m "chore: add Vitest for pure-function tests"
```

---

### Task A2: `deriveUnrecognized` (pure) — red → green

**Files:**
- Create: `src/commands/dkp/deriveUnrecognized.test.ts`
- Create: `src/commands/dkp/deriveUnrecognized.ts`

- [ ] **Step 1: Write the failing test**

Create `src/commands/dkp/deriveUnrecognized.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { deriveUnrecognized } from './deriveUnrecognized';

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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run`
Expected: FAIL — cannot resolve `./deriveUnrecognized` (module does not exist).

- [ ] **Step 3: Write the minimal implementation**

Create `src/commands/dkp/deriveUnrecognized.ts`:
```ts
/**
 * Re-derives the "unrecognized" names for a raid call from its saved /who log.
 *
 * A name is unrecognized when it appears in the log but is neither registered
 * in the census nor explicitly dismissed for this call. Pure and synchronous so
 * it can be unit-tested without a database; the caller supplies the lookup sets.
 *
 * @module
 */
import { parseWhoLogs } from './who_parser.js';

export interface UnrecognizedName {
  name: string;
  level: number | null;
  className: string | null;
}

export function deriveUnrecognized(
  whoLog: string | null,
  censusNames: Set<string>,
  dismissedNames: Set<string>,
): UnrecognizedName[] {
  if (!whoLog) return [];

  const seen = new Set<string>();
  const result: UnrecognizedName[] = [];

  for (const player of parseWhoLogs(whoLog)) {
    if (censusNames.has(player.name)) continue;
    if (dismissedNames.has(player.name)) continue;
    if (seen.has(player.name)) continue;
    seen.add(player.name);
    result.push({ name: player.name, level: player.level, className: player.className });
  }

  return result;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:run`
Expected: PASS — 9 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/commands/dkp/deriveUnrecognized.ts src/commands/dkp/deriveUnrecognized.test.ts
git commit -m "feat: deriveUnrecognized — live unrecognized-name derivation for raid calls"
```

---

### Task A3: Dismissals table + entity

**Files:**
- Create: `src/migrations/017_raid_call_dismissals.sql`
- Create: `src/entities/RaidCallDismissal.ts`

- [ ] **Step 1: Create the migration**

Create `src/migrations/017_raid_call_dismissals.sql`:
```sql
-- Records officer decisions to ignore an unrecognized /who name on a specific
-- call (e.g. a pug or other-guild player). One row per (call, name).
CREATE TABLE IF NOT EXISTS raid_call_dismissals (
  call_id       INTEGER NOT NULL REFERENCES raid_calls(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  reason        TEXT,
  dismissed_by  TEXT NOT NULL,
  dismissed_at  TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (call_id, name)
);
```

- [ ] **Step 2: Create the entity**

Create `src/entities/RaidCallDismissal.ts`:
```ts
import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('raid_call_dismissals', { schema: 'public' })
export class RaidCallDismissal {
  @PrimaryColumn('integer', { name: 'call_id' })
  callId: number;

  @PrimaryColumn('text', { name: 'name' })
  name: string;

  @Column('text', { name: 'reason', nullable: true })
  reason: string | null;

  @Column('text', { name: 'dismissed_by' })
  dismissedBy: string;

  @Column('timestamp', { name: 'dismissed_at', default: () => 'NOW()' })
  dismissedAt: Date;
}
```

- [ ] **Step 3: Verify the server still type-checks**

Run: `npx tsc -p tsconfig.json --noEmit`
Expected: no errors. (Entities are auto-discovered via the `dist/entities/*.js` glob in `src/app_data.ts`, so there is no registry array to update.)

- [ ] **Step 4: Commit**

```bash
git add src/migrations/017_raid_call_dismissals.sql src/entities/RaidCallDismissal.ts
git commit -m "feat: raid_call_dismissals table + entity"
```

---

### Task A4: Return `unrecognized` + `dismissed` from the event-detail endpoint

**Files:**
- Modify: `src/platform/web/server.ts` (imports near top; `GET /api/raids/events/:id`, lines ~1218 and ~1229-1256)
- Modify: `client/src/hooks/useEventDetailQuery.ts`

- [ ] **Step 1: Add server imports**

In `src/platform/web/server.ts`, after the line `import { Census } from '../../entities/Census.js';`, add:
```ts
import { RaidCallDismissal } from '../../entities/RaidCallDismissal.js';
import { deriveUnrecognized } from '../../commands/dkp/deriveUnrecognized.js';
```

- [ ] **Step 2: Load the census name set once per request**

In `GET /api/raids/events/:id`, replace this block (currently ~lines 1218-1226):
```ts
      const [gsUsers, dkpRows, allToons, lastRaidByName] = await Promise.all([
        AppDataSource.manager.find(GuildSpaceUser),
        AppDataSource.manager.find(Dkp),
        AppDataSource.manager.find(ActiveToons),
        fetchLastRaidByName(),
      ]);
      const gsUserMap = new Map(gsUsers.map(u => [u.discordId, u]));
      const dkpNameMap = new Map(dkpRows.map(d => [d.DiscordId, d.DiscordName]));
      const toonClassMap = new Map(allToons.map(t => [t.Name, t.CharacterClass]));
```
with:
```ts
      const [gsUsers, dkpRows, allToons, lastRaidByName, census] = await Promise.all([
        AppDataSource.manager.find(GuildSpaceUser),
        AppDataSource.manager.find(Dkp),
        AppDataSource.manager.find(ActiveToons),
        fetchLastRaidByName(),
        AppDataSource.manager.find(Census),
      ]);
      const gsUserMap = new Map(gsUsers.map(u => [u.discordId, u]));
      const dkpNameMap = new Map(dkpRows.map(d => [d.DiscordId, d.DiscordName]));
      const toonClassMap = new Map(allToons.map(t => [t.Name, t.CharacterClass]));
      const censusNameSet = new Set(census.filter(c => c.DiscordId).map(c => c.Name));
```

- [ ] **Step 3: Compute and return the lists per call**

In the same endpoint, inside `calls.map(async (call) => { ... })`, replace the `return { ... }` object (currently ~lines 1247-1256):
```ts
        return {
          id: call.id,
          raidName: call.raidName,
          modifier: call.modifier,
          recordedCount: attendees.length,
          rejectedCount: 0,
          createdBy: call.createdBy,
          createdAt: call.createdAt,
          attendees,
        };
```
with:
```ts
        const dismissalRows = await AppDataSource.manager.find(RaidCallDismissal, { where: { callId: call.id } });
        const dismissedNames = new Set(dismissalRows.map(d => d.name));
        const unrecognized = deriveUnrecognized(call.whoLog, censusNameSet, dismissedNames);

        return {
          id: call.id,
          raidName: call.raidName,
          modifier: call.modifier,
          recordedCount: attendees.length,
          rejectedCount: unrecognized.length,
          createdBy: call.createdBy,
          createdAt: call.createdAt,
          attendees,
          unrecognized,
          dismissed: dismissalRows.map(d => ({
            name: d.name,
            reason: d.reason,
            dismissedBy: d.dismissedBy,
            dismissedAt: d.dismissedAt,
          })),
        };
```

- [ ] **Step 4: Extend the client types**

In `client/src/hooks/useEventDetailQuery.ts`, add these interfaces above `CallDetail`:
```ts
export interface UnrecognizedName {
  name: string;
  level: number | null;
  className: string | null;
}

export interface DismissedName {
  name: string;
  reason: string | null;
  dismissedBy: string;
  dismissedAt: string;
}
```
and add two fields to the `CallDetail` interface (after `attendees: CallAttendee[];`):
```ts
  unrecognized: UnrecognizedName[];
  dismissed: DismissedName[];
```

- [ ] **Step 5: Verify both sides type-check**

Run: `npx tsc -p tsconfig.json --noEmit`
Expected: no errors.
Run: `cd client && npx tsc -b ; cd ..`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/platform/web/server.ts client/src/hooks/useEventDetailQuery.ts
git commit -m "feat: surface live unrecognized + dismissed names on the event-detail endpoint"
```

---

### Task A5: Ignore + undo endpoints

**Files:**
- Modify: `src/platform/web/server.ts` (add two routes after the existing `POST .../calls/:callId/add` handler, which ends ~line 1630)

- [ ] **Step 1: Add the dismiss and undo endpoints**

In `src/platform/web/server.ts`, immediately after the `POST '/api/raids/events/:id/calls/:callId/add'` handler closes (the `});` at ~line 1630), insert:
```ts
  // Ignore an unrecognized /who name on a call (officer-only)
  app.post('/api/raids/events/:id/calls/:callId/dismiss', async (req, res) => {
    const officer = await requireOfficer(req, res);
    if (!officer) return;
    try {
      const eventId = parseInt(req.params.id, 10);
      const callId = parseInt(req.params.callId, 10);
      const call = await AppDataSource.manager.findOne(RaidCall, { where: { id: callId, eventId } });
      if (!call) return res.status(404).json({ error: 'Call not found' });

      const { name, reason } = req.body;
      if (!name) return res.status(400).json({ error: 'name is required' });

      // Only names that are currently unrecognized on this call may be ignored.
      const census = await AppDataSource.manager.find(Census);
      const censusNameSet = new Set(census.filter(c => c.DiscordId).map(c => c.Name));
      const candidates = deriveUnrecognized(call.whoLog, censusNameSet, new Set());
      if (!candidates.some(c => c.name === name)) {
        return res.status(400).json({ error: 'That name is not an unrecognized name on this call' });
      }

      let dismissal = await AppDataSource.manager.findOne(RaidCallDismissal, { where: { callId, name } });
      if (!dismissal) {
        dismissal = new RaidCallDismissal();
        dismissal.callId = callId;
        dismissal.name = name;
      }
      dismissal.reason = (typeof reason === 'string' && reason.trim()) ? reason.trim() : null;
      dismissal.dismissedBy = officer.user.id;
      dismissal.dismissedAt = new Date();
      await AppDataSource.manager.save(dismissal);

      res.json({ ok: true });
    } catch (err) {
      console.error('Failed to ignore name:', err);
      res.status(500).json({ error: 'Failed to ignore name' });
    }
  });

  // Undo an ignore (officer-only)
  app.delete('/api/raids/events/:id/calls/:callId/dismiss/:name', async (req, res) => {
    const officer = await requireOfficer(req, res);
    if (!officer) return;
    try {
      const eventId = parseInt(req.params.id, 10);
      const callId = parseInt(req.params.callId, 10);
      const name = decodeURIComponent(req.params.name);
      const call = await AppDataSource.manager.findOne(RaidCall, { where: { id: callId, eventId } });
      if (!call) return res.status(404).json({ error: 'Call not found' });

      await AppDataSource.manager.delete(RaidCallDismissal, { callId, name });
      res.json({ ok: true });
    } catch (err) {
      console.error('Failed to restore name:', err);
      res.status(500).json({ error: 'Failed to restore name' });
    }
  });
```

- [ ] **Step 2: Verify the server type-checks**

Run: `npx tsc -p tsconfig.json --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/platform/web/server.ts
git commit -m "feat: ignore + undo endpoints for unrecognized raid-call names"
```

---

### Task A6: Client mutation hooks for ignore/undo

**Files:**
- Modify: `client/src/hooks/useRaidMutations.ts` (append two hooks)

- [ ] **Step 1: Append the hooks**

At the end of `client/src/hooks/useRaidMutations.ts`, add:
```ts
export function useDismissNameMutation(eventId: number) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ callId, name, reason }: { callId: number; name: string; reason?: string }) =>
      authFetch(token!, `/api/raids/events/${eventId}/calls/${callId}/dismiss`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, reason }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raidEvent', String(eventId)] });
    },
  });
}

export function useUndoDismissMutation(eventId: number) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ callId, name }: { callId: number; name: string }) =>
      authFetch(token!, `/api/raids/events/${eventId}/calls/${callId}/dismiss/${encodeURIComponent(name)}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raidEvent', String(eventId)] });
    },
  });
}
```

- [ ] **Step 2: Verify the client type-checks**

Run: `cd client && npx tsc -b ; cd ..`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/hooks/useRaidMutations.ts
git commit -m "feat: useDismissNameMutation + useUndoDismissMutation hooks"
```

---

### Task A7: Render the persistent unrecognized + ignored lists

**Files:**
- Create: `client/src/components/raids/UnrecognizedList.tsx`
- Modify: `client/src/components/raids/CallRow.tsx` (props + render)
- Modify: `client/src/pages/RaidEventPage.tsx` (wire mutations → callbacks)

> Note: this task references `AssignToonDialog`, which is created in Task B4. To keep Phase A independently shippable, Step 1 of this task includes a **temporary stub** for the Assign button; Task B4 replaces the stub with the real dialog.

- [ ] **Step 1: Create `UnrecognizedList.tsx` (with a temporary Assign stub)**

Create `client/src/components/raids/UnrecognizedList.tsx`:
```tsx
import { useState } from 'react';
import { Button, Text, Input } from '../../ui';
import type { CallDetail } from '../../hooks/useEventDetailQuery';

interface Props {
  call: CallDetail;
  isOfficer: boolean;
  isActive: boolean;
  eventId: number;
  onDismissName: (callId: number, name: string, reason?: string) => void;
  onUndoDismiss: (callId: number, name: string) => void;
}

export default function UnrecognizedList({
  call, isOfficer, isActive,
  onDismissName, onUndoDismiss,
}: Props) {
  const [ignoreName, setIgnoreName] = useState<string | null>(null);
  const [ignoreReason, setIgnoreReason] = useState('');

  if (call.unrecognized.length === 0 && call.dismissed.length === 0) return null;

  return (
    <div className="mt-1 flex flex-col gap-1">
      {call.unrecognized.length > 0 && (
        <div className="border border-yellow/40 px-1.5 py-1 bg-yellow/10 rounded-md">
          <Text variant="caption" className="text-yellow font-bold">
            {call.unrecognized.length} not in census (from /who):
          </Text>
          <div className="flex flex-col gap-0.5 mt-0.5">
            {call.unrecognized.map(u => (
              <div key={u.name} className="flex items-center gap-1 flex-wrap">
                <Text variant="caption" className="font-mono">
                  {u.name}{u.level != null ? ` — ${u.level} ${u.className ?? ''}`.trimEnd() : ''}
                </Text>
                {isOfficer && isActive && (
                  <div className="flex items-center gap-0.5">
                    <Button intent="ghost" size="xs" disabled title="Assign comes in Phase B">Assign</Button>
                    <Button
                      intent="ghost"
                      size="xs"
                      onClick={() => { setIgnoreName(u.name); setIgnoreReason(''); }}
                    >
                      Ignore
                    </Button>
                  </div>
                )}
                {ignoreName === u.name && (
                  <form
                    className="flex items-center gap-0.5 w-full mt-0.5"
                    onSubmit={(e) => {
                      e.preventDefault();
                      onDismissName(call.id, u.name, ignoreReason.trim() || undefined);
                      setIgnoreName(null);
                    }}
                  >
                    <Input
                      size="sm"
                      variant="surface"
                      type="text"
                      placeholder="Reason (optional)"
                      value={ignoreReason}
                      onChange={(e) => setIgnoreReason(e.target.value)}
                      className="flex-1 min-w-25"
                      autoFocus
                    />
                    <Button intent="ghost" size="xs" type="submit">Confirm</Button>
                    <Button intent="ghost" size="xs" type="button" onClick={() => setIgnoreName(null)}>Cancel</Button>
                  </form>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {call.dismissed.length > 0 && (
        <div className="px-1.5">
          <Text variant="caption" className="text-text-dim">Ignored on this call:</Text>
          <div className="flex flex-col gap-0.5 mt-0.5">
            {call.dismissed.map(d => (
              <div key={d.name} className="flex items-center gap-1 flex-wrap">
                <Text variant="caption" className="font-mono text-text-dim">
                  {d.name}{d.reason ? ` — "${d.reason}"` : ''}
                </Text>
                {isOfficer && isActive && (
                  <Button intent="ghost" size="xs" onClick={() => onUndoDismiss(call.id, d.name)}>undo</Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire `UnrecognizedList` into `CallRow`**

In `client/src/components/raids/CallRow.tsx`:

(a) Add the import after the other component imports (after line 8, `import { useToonSearchQuery } ...`):
```tsx
import UnrecognizedList from './UnrecognizedList';
```

(b) Add two props to the `Props` interface (after `onRemoveCharacter: (callId: number, name: string) => void;`):
```tsx
  onDismissName: (callId: number, name: string, reason?: string) => void;
  onUndoDismiss: (callId: number, name: string) => void;
```

(c) Destructure them in the component signature (add to the params object, next to `onAddCharacter, onRemoveCharacter,`):
```tsx
  onDismissName, onUndoDismiss,
```

(d) Render the list inside the `{expanded && (...)}` block, immediately after the attendees `</div>` block (after the block that ends at line ~162, before the `{/* Edit call form */}` comment):
```tsx
          <UnrecognizedList
            call={call}
            isOfficer={isOfficer}
            isActive={isActive}
            eventId={eventId}
            onDismissName={onDismissName}
            onUndoDismiss={onUndoDismiss}
          />
```

- [ ] **Step 3: Wire the mutations in `RaidEventPage`**

In `client/src/pages/RaidEventPage.tsx`:

(a) Extend the `useRaidMutations` import (line 10) to include the two new hooks:
```tsx
import { useAddCallMutation, useDeleteCallMutation, useEditCallMutation, useCloseEventMutation, useReopenEventMutation, useAddCharacterMutation, useRemoveCharacterMutation, useReorderCallsMutation, useDismissNameMutation, useUndoDismissMutation } from '../hooks/useRaidMutations';
```

(b) Instantiate them next to the other mutations (after line 30, `const reorderCalls = ...`):
```tsx
  const dismissName = useDismissNameMutation(Number(eventId));
  const undoDismiss = useUndoDismissMutation(Number(eventId));
```

(c) Pass two new callbacks to `<CallRow>` (inside the `.map`, after `onRemoveCharacter={...}` at line ~213):
```tsx
                          onDismissName={(callId, name, reason) => dismissName.mutate({ callId, name, reason })}
                          onUndoDismiss={(callId, name) => undoDismiss.mutate({ callId, name })}
```

- [ ] **Step 4: Verify the client builds**

Run: `cd client && npm run build ; cd ..`
Expected: build succeeds (no TS or Vite errors).

- [ ] **Step 5: Commit**

```bash
git add client/src/components/raids/UnrecognizedList.tsx client/src/components/raids/CallRow.tsx client/src/pages/RaidEventPage.tsx
git commit -m "feat: persistent unrecognized + ignored lists on raid calls"
```

---

### Task A8: Manual verification of Phase A

> No automated test framework covers the HTTP + Postgres path (the shared production DB makes integration harnessing heavy). Verify behavior by running the app against a dev database.

- [ ] **Step 1: Build and start**

Run: `npm run build && npm start`
Expected: server boots, logs `🔧 017_raid_call_dismissals.sql` among the migrations.

- [ ] **Step 2: Persistence check**

As an officer, open an active event, Add a Call with a `/who` log containing one name that is NOT in the census. Confirm the yellow "not in census" list shows the name. Navigate to `/raids` and back into the event (or refresh). **Expected:** the name still appears under "not in census" on that call (it no longer vanishes).

- [ ] **Step 3: Ignore + reason + undo**

Click **Ignore** on that name, type a reason, Confirm. **Expected:** the name moves to "Ignored on this call" showing the reason. Click **undo**. **Expected:** it returns to the "not in census" list.

- [ ] **Step 4: Closed-event read-only**

Close the event. **Expected:** both lists are still visible, but the Ignore/undo buttons are gone.

- [ ] **Step 5: Note results**

Record what you observed (pass/fail per step). If anything failed, stop and debug before Phase B.

---

## Phase B — Assign from the call (idea #2)

Delivers: an officer can assign an unrecognized toon to an existing member and auto-credit the call. Builds on Phase A's UI.

---

### Task B1: `planAssign` (pure) — red → green

**Files:**
- Create: `src/commands/dkp/planAssign.test.ts`
- Create: `src/commands/dkp/planAssign.ts`

- [ ] **Step 1: Write the failing test**

Create `src/commands/dkp/planAssign.test.ts`:
```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run`
Expected: FAIL — cannot resolve `./planAssign`.

- [ ] **Step 3: Write the minimal implementation**

Create `src/commands/dkp/planAssign.ts`:
```ts
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
  error?: 'not in this call' | 'already registered';
  status: string;
  awardDkp: boolean;
  dkpAmount: number;
  note?: string;
}

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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:run`
Expected: PASS — all `planAssign` tests pass (plus the existing `deriveUnrecognized` tests).

- [ ] **Step 5: Commit**

```bash
git add src/commands/dkp/planAssign.ts src/commands/dkp/planAssign.test.ts
git commit -m "feat: planAssign — pure decision logic for assigning unrecognized toons"
```

---

### Task B2: Extract the credit helper + add the assign endpoint

**Files:**
- Modify: `src/platform/web/server.ts` (add a `creditCharacterToCall` helper; refactor `POST .../add` to use it; add `POST .../assign`; add `planAssign` import)

- [ ] **Step 1: Add the `planAssign` import**

In `src/platform/web/server.ts`, after the `deriveUnrecognized` import added in Task A4, add:
```ts
import { planAssign } from '../../commands/dkp/planAssign.js';
```

- [ ] **Step 2: Add the shared credit helper**

In `src/platform/web/server.ts`, immediately before the `// ─── Raid Calls ──────` section comment (just above the `POST '/api/raids/events/:id/calls'` handler at ~line 1343), add this helper:
```ts
  /**
   * Creates an attendance row for a character on a call, awards the call's
   * DKP to the owner, and links the attendance to the call. Shared by the
   * manual "add character" endpoint and the assign-from-unrecognized endpoint.
   */
  async function creditCharacterToCall(call: RaidCall, characterName: string, discordId: string): Promise<void> {
    const attendance = new Attendance();
    attendance.Date = new Date();
    attendance.Raid = call.raidName;
    attendance.Name = characterName;
    attendance.DiscordId = discordId;
    attendance.Modifier = call.modifier.toString();
    const saved = await AppDataSource.manager.save(attendance);

    await AppDataSource.manager
      .createQueryBuilder()
      .update(Dkp)
      .set({ EarnedDkp: () => `earned_dkp + ${call.modifier}` })
      .where('discord_id = :discordId', { discordId })
      .execute();

    const link = new RaidCallAttendance();
    link.callId = call.id;
    link.attendanceId = saved.Id;
    await AppDataSource.manager.save(link);
  }
```

- [ ] **Step 3: Refactor `POST .../add` to use the helper**

In the `POST '/api/raids/events/:id/calls/:callId/add'` handler, replace the three blocks that create the attendance row, update DKP, and link to the call (currently ~lines 1602-1623):
```ts
      // Create attendance record
      const attendance = new Attendance();
      attendance.Date = new Date();
      attendance.Raid = call.raidName;
      attendance.Name = characterName;
      attendance.DiscordId = censusEntry.DiscordId;
      attendance.Modifier = call.modifier.toString();
      const saved = await AppDataSource.manager.save(attendance);

      // Update DKP
      await AppDataSource.manager
        .createQueryBuilder()
        .update(Dkp)
        .set({ EarnedDkp: () => `earned_dkp + ${call.modifier}` })
        .where('discord_id = :discordId', { discordId: censusEntry.DiscordId })
        .execute();

      // Link to call
      const link = new RaidCallAttendance();
      link.callId = callId;
      link.attendanceId = saved.Id;
      await AppDataSource.manager.save(link);
```
with:
```ts
      await creditCharacterToCall(call, characterName, censusEntry.DiscordId);
```

- [ ] **Step 4: Add the assign endpoint**

In `src/platform/web/server.ts`, immediately after the `DELETE '/api/raids/events/:id/calls/:callId/dismiss/:name'` handler added in Task A5, insert:
```ts
  // Assign an unrecognized /who name to an existing member (officer-only).
  // Creates the census row and, by default, credits the member for this call.
  app.post('/api/raids/events/:id/calls/:callId/assign', async (req, res) => {
    const officer = await requireOfficer(req, res);
    if (!officer) return;
    try {
      const eventId = parseInt(req.params.id, 10);
      const callId = parseInt(req.params.callId, 10);
      const call = await AppDataSource.manager.findOne(RaidCall, { where: { id: callId, eventId } });
      if (!call) return res.status(404).json({ error: 'Call not found' });

      const { name, discordId, status, level, characterClass, credit } = req.body;
      if (!name || !discordId || !status || level == null || !characterClass) {
        return res.status(400).json({ error: 'name, discordId, status, level, and characterClass are required' });
      }
      const lvl = Number(level);
      if (isNaN(lvl)) return res.status(400).json({ error: 'level must be a number' });

      // Target must be an existing member of the system.
      const targetDkp = await AppDataSource.manager.findOne(Dkp, { where: { DiscordId: discordId } });
      if (!targetDkp) return res.status(404).json({ error: 'That member is not in the system' });

      const census = await AppDataSource.manager.find(Census);
      const censusNames = new Set(census.filter(c => c.DiscordId).map(c => c.Name));
      const targetHasMain = census.some(c => c.DiscordId === discordId && c.Status === 'Main');

      // Discord IDs already credited on this call (avoid double-credit).
      const links = await AppDataSource.manager.find(RaidCallAttendance, { where: { callId } });
      const creditedIds = new Set<string>();
      if (links.length > 0) {
        const attIds = links.map(l => l.attendanceId);
        const rows = await AppDataSource.manager
          .createQueryBuilder()
          .select('a.discord_id', 'discordId')
          .from(Attendance, 'a')
          .where('a.id IN (:...attIds)', { attIds })
          .getRawMany() as { discordId: string }[];
        rows.forEach(r => creditedIds.add(r.discordId));
      }

      const plan = planAssign({
        name,
        whoLog: call.whoLog,
        censusNames,
        targetDiscordId: discordId,
        alreadyCreditedDiscordIds: creditedIds,
        callModifier: call.modifier,
        requestedStatus: status,
        targetHasMain,
        credit: credit !== false,
      });

      if (!plan.ok) {
        const msg = plan.error === 'already registered'
          ? 'That character is already registered'
          : 'That name is not on this call';
        return res.status(400).json({ error: msg });
      }

      const { declareOrUpdate, insertUser } = await import('../../commands/census/census_functions.js');
      await insertUser(discordId);
      // declareOrUpdate validates level + class and creates the census row.
      await declareOrUpdate(discordId, plan.status, name, lvl, characterClass);

      let credited = false;
      if (plan.awardDkp) {
        await creditCharacterToCall(call, name, discordId);
        credited = true;
      }

      res.json({ ok: true, name, discordId, status: plan.status, credited, note: plan.note });
    } catch (err) {
      if (err instanceof Error && err.message.startsWith(':x:')) {
        return res.status(400).json({ error: err.message.replace(/^:x:\s*/, '') });
      }
      console.error('Failed to assign character:', err);
      res.status(500).json({ error: 'Failed to assign character' });
    }
  });
```

- [ ] **Step 5: Verify the server type-checks**

Run: `npx tsc -p tsconfig.json --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/platform/web/server.ts
git commit -m "feat: assign-from-unrecognized endpoint + shared credit helper"
```

---

### Task B3: Client assign mutation hook

**Files:**
- Modify: `client/src/hooks/useRaidMutations.ts` (append a hook + params type)

- [ ] **Step 1: Append the hook**

At the end of `client/src/hooks/useRaidMutations.ts`, add:
```ts
export interface AssignToonParams {
  callId: number;
  name: string;
  discordId: string;
  status: string;
  level: number;
  characterClass: string;
  credit: boolean;
}

export function useAssignToonMutation(eventId: number) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ callId, ...body }: AssignToonParams) =>
      authFetch(token!, `/api/raids/events/${eventId}/calls/${callId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raidEvent', String(eventId)] });
      queryClient.invalidateQueries({ queryKey: ['roster'] });
    },
  });
}
```

- [ ] **Step 2: Verify the client type-checks**

Run: `cd client && npx tsc -b ; cd ..`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/hooks/useRaidMutations.ts
git commit -m "feat: useAssignToonMutation hook"
```

---

### Task B4: Assign dialog + wire it into the unrecognized list

**Files:**
- Create: `client/src/components/raids/AssignToonDialog.tsx`
- Modify: `client/src/components/raids/UnrecognizedList.tsx` (replace the Assign stub with the real dialog)

- [ ] **Step 1: Create `AssignToonDialog.tsx`**

Create `client/src/components/raids/AssignToonDialog.tsx`:
```tsx
import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Button, Text, Input, Select } from '../../ui';
import { useRosterQuery } from '../../hooks/useRosterQuery';
import { useAssignToonMutation } from '../../hooks/useRaidMutations';
import { ApiError } from '../../lib/api';

interface Props {
  eventId: number;
  callId: number;
  name: string;
  level: number | null;
  className: string | null;
  callModifier: number;
  onClose: () => void;
}

export default function AssignToonDialog({
  eventId, callId, name, level, className, callModifier, onClose,
}: Props) {
  const { data: roster } = useRosterQuery();
  const assign = useAssignToonMutation(eventId);

  const [search, setSearch] = useState('');
  const [discordId, setDiscordId] = useState<string | null>(null);
  const [status, setStatus] = useState('Alt');
  const [levelStr, setLevelStr] = useState(level != null ? String(level) : '');
  const [charClass, setCharClass] = useState('');
  const [credit, setCredit] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const classOptions = useMemo(
    () => Object.keys(roster?.classAbbreviations ?? {}).sort(),
    [roster],
  );

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return (roster?.members ?? [])
      .filter(m =>
        m.displayName.toLowerCase().includes(q) ||
        (m.mainName ? m.mainName.toLowerCase().includes(q) : false),
      )
      .slice(0, 8);
  }, [roster, search]);

  const selectedMember = roster?.members.find(m => m.discordId === discordId) ?? null;

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const lvl = Number(levelStr);
    if (!discordId) { setError('Pick a member to assign to'); return; }
    if (!charClass) { setError('Pick a class'); return; }
    if (isNaN(lvl) || lvl < 1 || lvl > 60) { setError('Level must be between 1 and 60'); return; }
    assign.mutate(
      { callId, name, discordId, status, level: lvl, characterClass: charClass, credit },
      {
        onSuccess: () => onClose(),
        onError: (err) => setError(err instanceof ApiError ? err.message : 'Failed to assign'),
      },
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-1 p-1.5 bg-surface-2 rounded-md border border-border mt-0.5 w-full">
      <Text variant="caption" className="font-bold">Assign “{name}” to a member</Text>

      {selectedMember ? (
        <div className="flex items-center gap-1">
          <Text variant="caption">Owner: <span className="font-bold">{selectedMember.displayName}</span></Text>
          <Button intent="ghost" size="xs" type="button" onClick={() => { setDiscordId(null); setSearch(''); }}>change</Button>
        </div>
      ) : (
        <div>
          <Input
            size="sm"
            variant="surface"
            type="text"
            placeholder="Search members…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
            autoFocus
          />
          {matches.length > 0 && (
            <div className="flex flex-col mt-0.5 max-h-25 overflow-y-auto border border-border rounded-md">
              {matches.map(m => (
                <button
                  key={m.discordId}
                  type="button"
                  className="text-left px-1 py-0.5 hover:bg-surface-3 bg-transparent border-none cursor-pointer"
                  onMouseDown={() => {
                    setDiscordId(m.discordId);
                    setStatus(m.mainName ? 'Alt' : 'Main');
                  }}
                >
                  <Text variant="caption">{m.displayName}{m.mainName ? ` (${m.mainName})` : ''}</Text>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-1">
        <Input
          size="sm"
          variant="surface"
          type="number"
          placeholder="Level"
          value={levelStr}
          onChange={(e) => setLevelStr(e.target.value)}
          className="w-14"
        />
        <Select size="sm" value={charClass} onChange={(e) => setCharClass(e.target.value)}>
          <option value="">{className ? `Class… (/who: ${className})` : 'Class…'}</option>
          {classOptions.map(c => <option key={c} value={c}>{c}</option>)}
        </Select>
      </div>

      <div className="flex items-center gap-1.5">
        {['Main', 'Alt', 'Bot'].map(s => (
          <label key={s} className="flex items-center gap-0.5 cursor-pointer">
            <input type="radio" name={`status-${callId}-${name}`} value={s} checked={status === s} onChange={() => setStatus(s)} />
            <Text variant="caption">{s}</Text>
          </label>
        ))}
      </div>

      <label className="flex items-center gap-0.5 cursor-pointer">
        <input type="checkbox" checked={credit} onChange={(e) => setCredit(e.target.checked)} />
        <Text variant="caption">Also credit this call (+{callModifier} DKP)</Text>
      </label>

      {error && <Text variant="error" className="text-micro">{error}</Text>}

      <div className="flex items-center gap-0.5">
        <Button intent="primary" size="xs" type="submit" disabled={assign.isPending}>
          {assign.isPending ? 'Assigning…' : 'Assign'}
        </Button>
        <Button intent="ghost" size="xs" type="button" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Replace the Assign stub in `UnrecognizedList.tsx`**

In `client/src/components/raids/UnrecognizedList.tsx`:

(a) Add the import at the top:
```tsx
import AssignToonDialog from './AssignToonDialog';
```

(b) Add `eventId` back to the destructured params and add assign state. Replace:
```tsx
export default function UnrecognizedList({
  call, isOfficer, isActive,
  onDismissName, onUndoDismiss,
}: Props) {
  const [ignoreName, setIgnoreName] = useState<string | null>(null);
  const [ignoreReason, setIgnoreReason] = useState('');
```
with:
```tsx
export default function UnrecognizedList({
  call, isOfficer, isActive, eventId,
  onDismissName, onUndoDismiss,
}: Props) {
  const [assignName, setAssignName] = useState<string | null>(null);
  const [ignoreName, setIgnoreName] = useState<string | null>(null);
  const [ignoreReason, setIgnoreReason] = useState('');

  const assignTarget = call.unrecognized.find(u => u.name === assignName) ?? null;
```

(c) Replace the disabled stub Assign button:
```tsx
                    <Button intent="ghost" size="xs" disabled title="Assign comes in Phase B">Assign</Button>
```
with:
```tsx
                    <Button
                      intent="primary"
                      size="xs"
                      onClick={() => { setAssignName(u.name); setIgnoreName(null); }}
                    >
                      Assign
                    </Button>
```

(d) Render the dialog under the unrecognized row when it is the assign target. Inside the `call.unrecognized.map(u => ( ... ))` block, after the `{ignoreName === u.name && (...)}` form, add:
```tsx
                {assignTarget?.name === u.name && (
                  <AssignToonDialog
                    eventId={eventId}
                    callId={call.id}
                    name={u.name}
                    level={u.level}
                    className={u.className}
                    callModifier={call.modifier}
                    onClose={() => setAssignName(null)}
                  />
                )}
```

- [ ] **Step 3: Verify the client builds**

Run: `cd client && npm run build ; cd ..`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/raids/AssignToonDialog.tsx client/src/components/raids/UnrecognizedList.tsx
git commit -m "feat: assign-toon dialog wired into the unrecognized list"
```

---

### Task B5: Manual verification of Phase B

- [ ] **Step 1: Build and start**

Run: `npm run build && npm start`
Expected: server boots cleanly.

- [ ] **Step 2: Assign + auto-credit**

On an active event with an unrecognized name, click **Assign**, search and pick an existing member, confirm the level is prefilled from `/who`, pick the base class, leave "Also credit this call" checked, and submit. **Expected:** a census row is created (the toon now appears for that member on the roster), the member's DKP increases by the call modifier, and the name leaves the "not in census" list.

- [ ] **Step 3: No double-credit**

Assign a second unrecognized name to the **same** member who was just credited on this call. **Expected:** the toon registers, but the member's DKP does not increase again (the response `note` explains the owner was already credited).

- [ ] **Step 4: First-toon-Main**

Assign a name to a member who has no Main yet (if available), with status left on Alt. **Expected:** the toon is created as Main.

- [ ] **Step 5: Invalid class is rejected cleanly**

Attempt an assign with no class selected. **Expected:** a plain-language error ("Pick a class"); nothing is written.

- [ ] **Step 6: Note results**

Record pass/fail per step.

---

## Notes for the implementer

- **Why two pure functions carry the tests:** they hold all the branching (parsing edge cases, census/dismissed exclusion, dedup, first-toon-Main, double-credit guard, credit toggle). Everything else is thin DB/HTTP/React wiring verified by `tsc`, the client build, and the manual checklists. This matches the spec's testing strategy.
- **`/who` reports titles, not base classes** (e.g. `[60 Warlock]` is a level-60 Necromancer). The unrecognized list shows the title as a hint, but `AssignToonDialog` requires the officer to pick the real base class from the dropdown; `declareOrUpdate` → `classMustExist` validates it server-side.
- **ESM imports:** every new relative import in `src/` uses a `.js` extension. Test files import without an extension (they are excluded from the build and Vitest resolves `.ts` directly).
- **Idempotency:** migration 017 uses `CREATE TABLE IF NOT EXISTS` and re-runs harmlessly on every startup.
