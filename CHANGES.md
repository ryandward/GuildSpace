# GuildSpace Changelog

## 2026-02-13 (cont.) — Role Hierarchy, Bank, Roster Filters, Mobile Nav

Major platform maturation: role-based access control, guild bank inventory management, advanced roster filtering, and mobile bottom-tab navigation.

### Role Hierarchy (Officer / Admin / Owner)

**Migrations 005–007, 009:** Three-tier role system on `guildspace_users`:
- `is_officer` — can create raid events, add calls, import bank inventory
- `is_admin` — can promote/demote officers (implies officer)
- `is_owner` — can promote/demote admins (immutable top-tier, single user)
- `officer_since` / `admin_since` — timestamp tracking for role grants

**API:** `PATCH /api/roster/:discordId/role` (admin-gated). Guards: can't modify self, can't touch owner, only owner can change admin.

**Auth:** `/api/auth/me` now returns `isOfficer`, `isAdmin`, `isOwner`, `joinedAt`. `requireOfficer()` checks all three tiers. New `requireAdmin()` and `requireOwner()` helpers.

**UI:** MemberDetailPage shows role badges with timestamps and admin-gated toggle buttons.

### Guild Bank

**Migration 010:** `bank_import` table — tracks inventory file uploads with JSONB diff (added/removed/changed items).

**Entity:** `BankImport` — banker, uploadedBy, uploadedByName, itemCount, diff, createdAt.

**API endpoints:**
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/bank` | user | All bank items (trash-filtered, grouped by name) |
| POST | `/api/bank/import` | officer | Upload TSV inventory file, diff against previous |
| GET | `/api/bank/history` | user | Recent imports across all bankers |
| GET | `/api/bank/:banker/history` | user | Imports for specific banker |

**Pages:**
- `BankPage` — banker treemap, item search, banker filter, activity history, file import (officer)
- `BankerDetailPage` — single banker view with item list + import history

**Components:** `BankerTreemap` (squarified layout), `BankHistoryEntry` (expandable diff view).

### Roster Filtering & Refactors

**`useRosterFilters` hook (170 lines):** Comprehensive filter state machine:
- Class, search, level range [1–60], officer-only, status multi-select (Main/Alt/Bot/Probationary), activity window (30d/60d/90d/inactive)
- Sort by name/level/dkp/lastRaid with direction toggle
- Two-stage filtering: pre-class (for treemap stability) → post-class (for display)

**New components:**
- `RosterFilterPanel` — level range slider, officer toggle, status pills, activity dropdown
- `RosterHeader` — sortable column headers with direction indicators
- `CollapsibleCard` — extracted from RosterPage into reusable component
- `RangeSlider` — dual-thumb range input with debounce

**Refactors:**
- `RosterRow` now exports `selectFeatured()` for smart character selection (class-filter-aware)
- `RosterFilters` trimmed — ClassChart still there, StatusChart/LevelChart simplified
- Class colors extracted to `lib/classColors.ts` (single source of truth, 15 EQ classes)
- `lib/treemap.ts` — squarified treemap algorithm used by both class chart and banker treemap

### Mobile Navigation

- `BottomTabs` — fixed bottom nav (Roster, Raids, Bank, Terminal) visible only on mobile (`< 48rem`)
- Desktop keeps header nav, mobile gets both header + bottom tabs
- Pages now use `max-md:pb-14` for bottom tab clearance

### Infrastructure

- **Migration 008:** Seeds 5 raid templates (Halls of Testing Hourly, Belijor, Nelaarn, Ajorek, Yendilor)
- **`utils/timeAgo.ts`** — shared relative time formatter
- **`useToonSearchQuery`** — `GET /api/toons/search?q=` for character autocomplete
- **Server:** Shared helpers `fetchLastRaidByName()`, `pickMostRecentToon()` deduplicate roster/member/event queries
- **Server:** Online presence tracking via Socket.IO (`presenceUpdate` events)
- **Raid calls** now auto-save custom raid names as templates
- **Raid events** support reopen (`PATCH` with `status: 'active'`)
- **CallRow** enhanced with toon search autocomplete dropdown
- **AttendanceMatrix** enhanced with class-colored names, roster links, GuildSpace member dots

### Routes

| Path | Page |
|------|------|
| `/bank` | BankPage |
| `/bank/:banker` | BankerDetailPage |

---

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
