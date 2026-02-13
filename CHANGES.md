# GuildSpace Changelog

## 2026-02-13 — Live Raid Attendance Page

Full-stack feature: visual raid attendance tracking with session grouping, replacing the terminal-only `/attendance` command flow.

### Backend

**Migration `004_raid_events.sql`**
- `raid_events` — groups multiple DKP calls into a raid night session (active/closed lifecycle)
- `raid_calls` — individual /who snapshots within an event, with DKP modifier and audit log
- `raid_call_attendance` — links calls to attendance rows (enables undo/delete)
- `guildspace_users.is_officer` — boolean flag for gating write operations
- `guildspace_users.api_key` — personal API key for future companion app auth

**Shared logic extraction**
- `src/commands/dkp/who_parser.ts` — `parseWhoLogs()` extracted from attendance command
- `src/commands/dkp/attendance_processor.ts` — `processWhoLog()` handles census cross-ref + DKP award
- Existing `/attendance` terminal command updated to use shared modules (no behavior change)

**New entities:** `RaidEvent`, `RaidCall`, `RaidCallAttendance`; `GuildSpaceUser` gains `isOfficer` + `apiKey`.

**12 REST endpoints:**

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/raids/templates` | user | Raid types for dropdown |
| GET | `/api/raids/events` | user | List events with call/member counts |
| POST | `/api/raids/events` | officer | Create event |
| GET | `/api/raids/events/:id` | user | Full detail + attendance matrix |
| PATCH | `/api/raids/events/:id` | officer | Close or rename event |
| POST | `/api/raids/events/:id/calls` | officer | Add call (processes /who, awards DKP) |
| DELETE | `/api/raids/events/:id/calls/:callId` | officer | Undo call (reverses DKP) |
| POST | `.../calls/:callId/add` | officer | Manual add character |
| DELETE | `.../calls/:callId/remove` | officer | Remove character |
| POST | `/api/raids/push` | api-key | Companion app push endpoint |
| POST | `/api/profile/api-key` | officer | Generate personal API key |
| GET | `/api/auth/me` | user | Now includes `isOfficer` |

### Frontend

**Pages**
- `RaidsPage` — event list with create form (officer-gated)
- `RaidEventPage` — working surface: calls list, add-call form, attendance matrix

**Components** (`client/src/components/raids/`)
- `EventCard` — summary card with green pulse dot for active events
- `CallRow` — expandable call detail with attendee badges, add/remove, delete with confirmation
- `AddCallForm` — raid template dropdown + manual entry + /who paste textarea
- `AttendanceMatrix` — per-call dot columns on desktop, calls/total ratio on mobile

**Hooks** (`client/src/hooks/`)
- `useEventsQuery` — `['raidEvents']`, 30s stale
- `useEventDetailQuery` — `['raidEvent', id]`, 15s stale
- `useRaidTemplatesQuery` — `['raidTemplates']`, 10min stale
- `useRaidMutations` — create event, close event, add/delete call, add/remove character

**Other changes**
- `AuthContext.User` gains `isOfficer?: boolean`
- "Raids" nav link added between Roster and Terminal
- Routes: `/raids` and `/raids/:eventId`
- All mutations invalidate relevant queries including `['roster']` (DKP totals)

### Seeding Officers

Officers must be seeded via direct SQL until an admin UI exists:

```sql
UPDATE guildspace_users SET is_officer = true WHERE discord_id IN ('your_id_here');
```

### Phase 2 (future)

Desktop companion app (Tauri) that watches `eqlog_*.txt` and auto-pushes /who blocks to `POST /api/raids/push`. The push endpoint and API key system are already in place.
