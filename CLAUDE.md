# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run

```bash
npm run build    # tsc — compiles src/ → dist/
npm start        # node dist/index_web.js
```

No test framework or linter is configured. The project uses ESM (`"type": "module"` in package.json).

## Environment

Requires a `.env` file (see `.env.example`) with PostgreSQL credentials (`PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `POSTGRES_DB`), `PORT`, and Discord OAuth vars (`DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI`). Hosted on Railway.

## Lineage

GuildSpace is being ported from a Discord bot: `~/Git/Project-1999-Typescript-Discord` (remote: https://github.com/ryandward/Project-1999-Typescript-Discord). The Discord bot is still running in production and **shares the same Railway Postgres database**.

We are "building down" — starting from a working Discord bot with real data and real users, and converting commands one at a time to run on the web platform. The shim (`src/platform/shim.ts`) reimplements the discord.js API surface so that commands can be ported with minimal changes.

**To port a new command:**
1. Copy the command file from the Discord bot source into `src/commands_web/<category>/`.
2. Swap the import from `'discord.js'` to `'../../platform/shim.js'` (adjust relative path as needed).
3. Fix any Discord-specific APIs that don't exist in the shim yet (`guild.members`, `guild.roles`, `interaction.channel`, etc.) — either extend the shim or work around them.
4. Commands are auto-discovered from `commands_web/` subfolders at startup; no registration step needed.

Shared business logic (database helpers, validators) stays in `src/commands/` and is imported by both the Discord bot and web commands.

## Architecture

GuildSpace is a web-based guild management platform for EverQuest guilds, replacing a Discord bot with an Express + Socket.IO server. It manages character census, DKP (Dragon Kill Points), raid attendance, and guild bank.

### Platform Abstraction Layer

Commands were originally written for discord.js. Instead of rewriting them, a **platform shim** (`src/platform/shim.ts`) re-exports platform-agnostic versions of discord.js classes (`SlashCommandBuilder` → `PlatformCommandBuilder`, `EmbedBuilder` → `PlatformEmbed`, etc.). Commands import from the shim, not discord.js directly. The core types live in `src/platform/types.ts`.

When adding or modifying commands, always import builders and types from `../platform/shim.js` (or appropriate relative path to shim), never from discord.js.

### Entry Point & Startup Sequence

`src/index_web.ts` → loads env, initializes TypeORM, runs SQL migrations from `src/migrations/` in alphabetical order, dynamically discovers and loads all command modules from `src/commands_web/`, then starts the Express/Socket.IO server.

### Server (`src/platform/web/server.ts`)

- **REST endpoints**: OAuth flow (`/api/auth/*`), command registry (`/api/commands`), autocomplete (`/api/commands/:name/autocomplete`)
- **WebSocket events** (Socket.IO): `auth`, `executeCommand`, `submitModal`, `componentInteraction`, `chatMessage`
- **Static files**: served from `src/platform/web/public/`
- **Auth**: Discord OAuth2 → signed JWT-style tokens

### Commands (`src/commands_web/`)

Each command module exports `data` (a `SlashCommandBuilder`) and `execute(interaction)`. Optionally exports `autocomplete` and `handleModal`. Commands are organized into:
- `census/` — character management (main, alt, bot, claim, toons, whois, ding, change, drop)
- `dkp/` — DKP balance and raid attendance
- `utility/` — ping

Shared database helpers and validators live in `src/commands/census/census_functions.ts` (e.g., `toonMustExist()`, `classMustExist()`, `suggestActiveToons()`).

### Entities (`src/entities/`)

TypeORM entities mapping to PostgreSQL tables/views. Key entities: `Census`, `Dkp`, `Attendance`, `Items`, `Bank`, `Raids`, `GuildSpaceUser`, `ChatMessage`. TypeORM uses decorators (`experimentalDecorators` and `emitDecoratorMetadata` are enabled in tsconfig).

### Frontend (`client/`)

React 19 + TypeScript SPA built with Vite. Located in `client/` with its own `package.json`. Key libraries: React Router, Socket.IO client, Tailwind CSS v4, class-variance-authority.

**Contexts:**
- `AuthContext` — Discord OAuth token management, user setup flow. Not managed by TanStack Query.
- `SocketContext` — Socket.IO connection, real-time events (chat, command replies, modals). Exposes `commands` (sourced from `useCommandsQuery`), `executeCommand`, `sendChat`, etc.

**Data Fetching (TanStack Query):**

All REST data fetching uses `@tanstack/react-query`. The `QueryClientProvider` wraps the app in `main.tsx`. Defaults: `staleTime: 2min`, `gcTime: 10min`, `retry: 1`, `refetchOnWindowFocus: true`.

- `lib/queryClient.ts` — singleton `QueryClient` with defaults
- `lib/api.ts` — `authFetch<T>(token, url, init?)` helper that adds Bearer header and throws `ApiError` on failure

Custom hooks in `hooks/`:

| Hook | Query Key | Endpoint | staleTime | Notes |
|---|---|---|---|---|
| `useRosterQuery` | `['roster']` | `GET /api/roster` | 2 min | Shared by AppShell (classMap) and RosterPage |
| `useMemberQuery(id)` | `['roster', id]` | `GET /api/roster/:id` | 1 min | Member detail page |
| `useBioMutation(id)` | — | `POST /api/profile/bio` | — | Optimistic cache update + invalidation |
| `useCommandsQuery(enabled)` | `['commands']` | `GET /api/commands` | 10 min | No auth header; consumed by SocketContext |
| `useMyToonsQuery(enabled)` | `['toons', 'mine']` | `GET /api/toons/mine` | 30 sec | CommandForm prefill for create commands |

Autocomplete requests use `queryClient.fetchQuery` with key `['autocomplete', cmd, opt, value]` (10s stale, 30s gc).

**What stays outside TanStack Query:** Auth flows (token bootstrap in AuthContext), Socket.IO real-time events (chat messages, command responses, modals).

## Command Port Status

The Discord bot has 30 commands. 12 have been ported to GuildSpace.

### Ported
- **Census (9):** main, alt, bot, claim, change, ding, drop, toons, whois
- **DKP (2):** dkp, attendance (most complex — modal + /who log parsing)
- **Utility (1):** ping

### Not Yet Ported

**Census (3):**
- `assign` — officer: create & assign character to any user (ManageGuild)
- `reassign` — officer: update existing character owner/status/class/level (ManageGuild)
- `promote` — elevate Probationary → Member (Discord roles + channel post)

**Bank (4):**
- `expense` — record guild bank platinum withdrawal (ManageGuild)
- `income` — record guild bank platinum deposit (ManageGuild)
- `plat` — view/adjust guild platinum balance
- `find` — search bank items with request button (buttons, select menu, collector, channel notification)

**Utility (11):**
- `account` — view/update shared account credentials (officer gated)
- `add` / `remove` — self-assign/remove roles (Discord role system)
- `browse` — browse shared bot characters + login (select menu, button collector)
- `create_role` / `roles` — manage self-assignable roles (Discord role creation)
- `delete_shared_toon` — remove shared toon entry (officer gated)
- `help` — list all commands
- `listaccounts` — DM officer with all shared accounts (needs rethinking for web)
- `login` — retrieve shared account credentials (role hierarchy gating)
- `note` — add/clear notes on shared character (officer gated)
- `permissions` — show Discord permission flags (Discord-specific, may not need porting)

### Shim Gaps

These Discord APIs are used by unported commands but not yet implemented in `src/platform/shim.ts`:
- **`guild.members` / `guild.roles`** — needed by promote, assign, add, remove, create_role, roles
- **Role hierarchy checks** — needed by login, account, browse
- **Channel-specific posting** (bank-request channel, general channel) — needed by find, promote
- **DM sending** — needed by listaccounts
- **MessageComponent collectors** (button/select with timeout) — needed by find, browse

### API Surface

Currently there are **no data-access REST endpoints** — all data flows through command execution over WebSocket. The Discord bot has zero REST endpoints either. To open GuildSpace up for third-party API consumers, dedicated endpoints (e.g. `GET /api/census`, `GET /api/dkp/:user`, `GET /api/bank/search`) would need to be built separate from the command system.

## Role Hierarchy

Four-tier role hierarchy: **Member → Officer → Admin → Owner**.

- **Server**: `GuildSpaceUser.roleFlags(user)` is the single source of truth. It computes a `role` field (`'owner' | 'admin' | 'officer' | 'member'`) and cascading boolean flags (`isOfficer`, `isAdmin`, `isOwner`). All API responses spread `...GuildSpaceUser.roleFlags(gsUser)`. Access guards use `hasOfficerAccess` / `hasAdminAccess` getters on the entity.
- **Client**: `lib/roles.ts` owns presentation only — `ROLE_COLOR`, `ROLE_LABEL`, `roleSince()`, `isBadgeRole()`. Components read `data.role` directly from the API response. Never re-derive the hierarchy on the client.
- **"Member" is implicit**: everyone on the roster gets `role: 'member'` by default. This assumption breaks with multi-guild tenancy — membership will need to become an explicit relationship on a `guild_members` join table, and `role` will move from a computed property to a stored column per guild.

## Conventions

- Error messages shown to users should use plain language with no implementation details (see commit c271b73).
- All imports use `.js` extensions (ESM requirement even for TypeScript source files).
- SQL migrations in `src/migrations/` are numbered `001_`, `002_`, etc. and run in alphabetical order on startup.
- All REST data fetching in the client uses TanStack Query hooks — never raw `useState` + `useEffect` + `fetch()`. New data endpoints should get a custom hook in `client/src/hooks/` using `authFetch` from `client/src/lib/api.ts`.
