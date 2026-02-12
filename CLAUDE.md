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

### Frontend

`src/platform/web/public/index.html` — monolithic vanilla JS single-page app. Communicates via Socket.IO and renders command responses (embeds, buttons, modals, select menus) plus a real-time chat panel.

## Conventions

- Error messages shown to users should use plain language with no implementation details (see commit c271b73).
- All imports use `.js` extensions (ESM requirement even for TypeScript source files).
- SQL migrations in `src/migrations/` are numbered `001_`, `002_`, etc. and run in alphabetical order on startup.
