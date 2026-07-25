# Raid call times and event comments

Status: Design — awaiting review
Date: 2026-07-25

## Problem

Officers run several identical raid calls in one night (six "HoT minis"). The
collapsed call row renders three fields — raid name, DKP, recorded count
(`CallRow.tsx:137-139`) — and on a repeated target none of them vary:

```
⠿ 1. › Halls of Testing Hourly      [5 DKP] [28 recorded]
⠿ 2. › Halls of Testing Hourly      [5 DKP] [28 recorded]
⠿ 3. › Halls of Testing Hourly      [5 DKP] [26 recorded]
```

The rows are indistinguishable to a reader. They are *not* indistinguishable in
the database — each has its own `id`, `sort_order`, `created_at`, and `who_log`.
The render discards data it already has.

Renaming is not the fix. `raid_calls.raid_name` is a foreign key by value: it
upserts into `raids` (the template dropdown) at `server.ts:1407-1413` and is
copied into `attendance.raid`, which DKP history groups on. Typing "HoT Mini 1"
/ "HoT Mini 2" would permanently spam the template list and fragment attendance
history.

Two features, weighted very differently.

## Part 1 — Call times

The primary fix. Show when each roll call happened.

### Timestamp source

Use the timestamp embedded in the pasted `/who` text, not `raid_calls.created_at`.

`created_at` records when an officer clicked Submit. If anyone submits several
calls in a batch after the night ends, all six cluster inside a minute and
distinguish nothing. The `/who` timestamp records when the roll call actually
happened and is immune to when it was submitted.

### `deriveCalledAt`

New pure module `src/commands/dkp/deriveCalledAt.ts`:

```ts
deriveCalledAt(whoLog: string | null): string | null   // → "21:48"
```

Extracts `HH:MM` **as text** from the first parseable `/who` line's
`[Thu Jun 25 21:48:29 2026]` bracket.

**It must never construct a `Date`.** EQ log timestamps carry no timezone.
`new Date("Thu Jun 25 21:48:29 2026")` parses in the *runtime's* zone — UTC on
Railway — so the value would serialize as `21:48Z`, and a browser in US Eastern
would render `17:48`. EQ logs are already 24-hour, so `HH:MM` passes through as
a substring with no parse, no conversion, and nothing to shift.

This is load-bearing. A `string` return looks like careless stringly-typing, and
the obvious cleanup — return a `Date` — reintroduces the bug.

`who_parser.ts:51` already does `new Date(timestampMatch[1])`, but that is *not*
a live bug: `attendance.date` is `timestamp without time zone`, so parsing as
server-local and storing as naive preserves the wall clock. The hazard appears
only when such a `Date` is serialized to JSON — it gains a `Z` it never earned —
and formatted in a browser at a different offset. `deriveCalledAt` exists on
exactly that path, which is why it must never produce a `Date` in the first
place.

Returns `null` when `who_log` is absent or has no parseable line. The row then
renders no time. No fallback to `created_at` — that is a UTC server timestamp
and would print a confidently wrong hour.

### Server

`GET /api/raids/events/:id` already re-parses every call's `who_log` on every
read via `deriveUnrecognized(call.whoLog, …)` (`server.ts:1254`). Add
`calledAt: deriveCalledAt(call.whoLog)` to the object returned from that same
loop (`server.ts:1258-1275`).

No migration. No column. No new endpoint.

### Client

- `useEventDetailQuery.ts` — add `calledAt: string | null` to the call type.
- `CallRow.tsx` — render it between the raid name and the DKP badge, as
  `Text variant="caption"` in `text-text-dim`. Omit the element entirely when
  `null`.

```
⠿ 1. › Halls of Testing Hourly  21:48  [5 DKP] [28 recorded]
⠿ 2. › Halls of Testing Hourly  22:31  [5 DKP] [28 recorded]
⠿ 3. › Halls of Testing Hourly  23:15  [5 DKP] [26 recorded]
```

24-hour, matching the log format. Absolute, not relative — the design system
convention is relative (`utils/timeAgo.ts`), but relative fails here: "2h ago /
2h ago / 1h ago" doesn't separate calls, and it drifts while being read.

## Part 2 — Event comments

Secondary, and expected to see little use. The design constraint is that it
costs nothing to the majority of page views where nobody has commented.

### Schema

`src/migrations/018_raid_event_comments.sql`:

```sql
CREATE TABLE IF NOT EXISTS raid_event_comments (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES raid_events(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_raid_event_comments_event
  ON raid_event_comments (event_id, created_at ASC);
```

Column-for-column the `chat_messages` shape, with the cascading-FK-to-parent
convention `raid_calls`, `raid_call_attendance`, and `raid_call_dismissals`
already follow. `display_name` is a denormalized snapshot at write time, as in
`chat_messages` and `bank_import` — display names are mutable and there is no
author-hydration helper.

Entity: `src/entities/RaidEventComment.ts`.

### Endpoints

| Method | Path | Access |
|---|---|---|
| GET | `/api/raids/events/:id/comments` | any authenticated user |
| POST | `/api/raids/events/:id/comments` | any registered user |
| DELETE | `/api/raids/events/:id/comments/:commentId` | author or officer |

POST validates in the order `POST /api/profile/bio` uses (`server.ts:1003-1024`):
`typeof content !== 'string'` → 400; empty after trim → 400; `length > 300` →
400; no `GuildSpaceUser` row for the token's discord ID → 404. A valid signed
token alone is not enough — `getUser` returns a user with `needsSetup: true`
when no row exists.

Extract the content check as a pure `validateComment(content)` so it is testable
without a database.

DELETE permits `comment.userId === user.id || gsUser.hasOfficerAccess`. Delete
only; no edit. Nothing in the codebase carries an `edited_at`.

### Closed events

Comments are **not** gated on `event.status === 'active'`. The 7/20 use case
("I was on Gigabroms for calls 2-3") happens the morning after, once the event
is closed.

No wider rule is claimed, because there isn't one. Five endpoints enforce the
check — add-call (`:1393`), reorder (`:1463`), dismiss (`:1664`), un-dismiss
(`:1706`), assign (`:1727`) — and four do not: edit-call (`:1491`), delete-call
(`:1564`), add-character (`:1617`), remove-character (`:1819`). Tracing them
shows the split is not a design:

- `4a345cc` built the feature and gave add-call a check.
- `4583d20` fixed route ordering and gave reorder one.
- `75ab5f2` ("harden assign endpoint per review") retrofitted dismiss,
  un-dismiss and assign together — *"Reject dismiss/undo/assign on closed
  events server-side"*.

That commit's diff covers only the endpoints on the branch then under review.
The four without a check are older code that was never examined for it. The
check exists where a reviewer looked.

### Client

- `hooks/useEventCommentsQuery.ts` — key `['raidEventComments', eventId]`,
  staleTime 30s, `enabled: !!token && !!eventId`.
- `hooks/useEventCommentMutations.ts` — post and delete, both invalidating
  `['raidEventComments', eventId]`. No `['roster']` invalidation; comments do
  not move DKP.
- `components/raids/EventComments.tsx` — mounted in `RaidEventPage.tsx` below
  the attendance card.

Empty state is a dashed-border button reading "Add a comment...", the pattern
`MemberDetailPage.tsx:198-204` already uses for an unwritten bio. Renders
nothing until the query settles, so a commentless event never flashes a list.
With comments, a `COMMENTS (n)` card listing author, time, and body, with a
composer beneath.

Author names link to `/roster/:discordId`, as `MessageList.tsx:56-64` does.
Bodies render as JSX text children with `whitespace-pre-wrap break-words` —
React escapes them. No markdown, no autolinking, consistent with chat and bio.

## Testing

Two pure seams, tested red→green under the existing root Vitest config
(`vitest.config.ts`, `include: ['src/**/*.test.ts']`), colocated, `.js` imports,
matching `deriveUnrecognized.test.ts`:

- `deriveCalledAt.test.ts` — normal log; multi-line log with one timestamp;
  log containing chat and system lines before the first `/who` line; `null`
  input; empty string; malformed bracket; a log whose only lines are
  unparseable. Asserts a `"HH:MM"` string or `null`, never a `Date`.
- `validateComment.test.ts` — non-string; empty; whitespace-only; exactly 300;
  301; a 300-character string containing newlines.

The client half is untested. There is no client test runner — root Vitest's
`include` does not match `client/`, and `client/package.json` has no test
tooling. Standing that up is out of scope here.

## Task-list items

Not design decisions; recorded so they are not lost.

- Add `/api/raids/events/:id/comments` to the demo interception in
  `lib/demoData.ts` (returning `[]`).
- Update `CLAUDE.md`: it states "No test framework or linter is configured,"
  which is stale — Vitest is committed and green.

## Adjacent bugs, fixed on this branch

Both surfaced while tracing the above. Neither is part of the feature.

**Closed-event DKP mutation.** Edit-call (`:1491`) applied DKP deltas and
rewrote `attendance.modifier`, delete-call (`:1564`) subtracted DKP and deleted
attendance rows, and add-character (`:1617`) / remove-character (`:1819`)
credited and debited — all on closed events, none checking status. Same class of
gap `75ab5f2` closed for assign. All four now carry the same guard. Officers who
need to correct a closed event reopen it first; the UI already has the button
(`RaidEventPage.tsx:119-128`).

**Demo mode reporting a write rejection on a read.**
`demoData.getDemoResponse` returns `null` for two different situations — "this
write is blocked" and "I have no canned response for this read" — and `authFetch`
could not tell them apart, so both threw
`ApiError(403, 'Log in to make changes')`. A demo visitor loading a page with an
unhandled GET was told to log in to make a change they had not attempted.
`authFetch` now branches on method: GET → `404 'Not available in the demo'`,
everything else → the existing 403.
