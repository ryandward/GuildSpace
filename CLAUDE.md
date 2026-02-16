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

GuildSpace originated as a Discord bot: `~/Git/Project-1999-Typescript-Discord` (remote: https://github.com/ryandward/Project-1999-Typescript-Discord). The Discord bot is still running in production and **shares the same Railway Postgres database**.

The web platform has moved past the command-porting phase. The Discord slash command system (platform shim, `commands_web/`, command execution over WebSocket) has been removed. All data mutations now flow through dedicated REST endpoints. Shared business logic (database helpers, validators) in `src/commands/` is still imported by the Discord bot and by REST endpoint handlers.

## Architecture

GuildSpace is a web-based guild management platform for EverQuest guilds, replacing a Discord bot with an Express + Socket.IO server. It manages character census, DKP (Dragon Kill Points), raid attendance, and guild bank.

### Entry Point & Startup Sequence

`src/index_web.ts` → loads env, initializes TypeORM, runs SQL migrations from `src/migrations/` in alphabetical order, then starts the Express/Socket.IO server.

### Server (`src/platform/web/server.ts`)

- **REST endpoints**: OAuth flow (`/api/auth/*`), roster (`/api/roster`, `/api/roster/:id`), character management (`PUT/DELETE /api/roster/:id/characters/:name`), raids (`/api/raids/*`), bank (`/api/bank/*`), profile (`/api/profile/*`), chat channels (`/api/chat/channels`), toon search (`/api/toons/*`)
- **WebSocket events** (Socket.IO): `auth`, `chatMessage`, `requestChannelHistory`, presence tracking
- **Static files**: served from `client/dist`
- **Auth**: Discord OAuth2 → signed JWT-style tokens

Shared database helpers and validators live in `src/commands/census/census_functions.ts` (e.g., `toonMustExist()`, `classMustExist()`, `suggestActiveToons()`).

### Entities (`src/entities/`)

TypeORM entities mapping to PostgreSQL tables/views. Key entities: `Census`, `Dkp`, `Attendance`, `Items`, `Bank`, `Raids`, `GuildSpaceUser`, `ChatMessage`. TypeORM uses decorators (`experimentalDecorators` and `emitDecoratorMetadata` are enabled in tsconfig).

### Frontend (`client/`)

React 19 + TypeScript SPA built with Vite. Located in `client/` with its own `package.json`. Key libraries: React Router, Socket.IO client, Tailwind CSS v4, class-variance-authority.

**Contexts:**
- `AuthContext` — Discord OAuth token management, user setup flow. Not managed by TanStack Query.
- `SocketContext` — Socket.IO connection, real-time events (chat messages, presence). Exposes `sendChat`, `switchChannel`, connection state, and online presence.

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

**What stays outside TanStack Query:** Auth flows (token bootstrap in AuthContext), Socket.IO real-time events (chat messages, presence).

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
