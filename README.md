<p align="center">
  <img src="assets/logo.svg" alt="GuildSpace" width="120">
</p>

<h1 align="center">GuildSpace</h1>
<p align="center"><strong>A place for guilds.</strong></p>

---

Your guild gets a home on the web. Not a chat server. A website.

A guild page with your roster, your history, your loot tables. Player pages with character profiles, raid attendance, DKP. A bulletin board, a bank ledger, a raid calendar. Real pages you can browse and link to.

Chat is here too. But chat is just one thing on the page, not the whole page.

**Ex Astra** is the first guild on the platform.

## Lineage

GuildSpace originated as a production Discord bot ([Project-1999-Typescript-Discord](https://github.com/ryandward/Project-1999-Typescript-Discord)) that manages an active EverQuest guild. Both the bot and the web platform share the same Railway Postgres database — real users, real data. The web platform has moved past the command-porting phase; all data access and mutations now use dedicated REST endpoints and native UI.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Client (React 19 + Vite 6 + Tailwind v4)                    │
│                                                              │
│  ┌─────────┐ ┌───────┐ ┌──────┐ ┌───────┐ ┌──────┐          │
│  │ Roster  │ │ Raids │ │ Bank │ │ Chat  │ │Login │          │
│  └─────────┘ └───────┘ └──────┘ └───────┘ └──────┘          │
└──────────────────────────────┬───────────────────────────────┘
                               │ REST + Socket.IO (chat)
┌──────────────────────────────┴───────────────────────────────┐
│  Server (Express + Socket.IO, TypeScript)                    │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  REST API (auth, roster, characters, raids, bank, chat) │ │
│  └────────────────────────────┬────────────────────────────┘ │
│  ┌────────────────────────────┴────────────────────────────┐ │
│  │  TypeORM Entities → PostgreSQL (Railway)                │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### Data flow

- **Pages** (roster, raids, bank) fetch data via REST endpoints using TanStack Query hooks
- **Chat** uses Socket.IO for real-time messaging and presence
- **Mutations** (character management, raid calls, bank imports) go through REST endpoints with role-based access guards

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 6, Tailwind CSS v4, CVA recipes |
| Backend | Express, Socket.IO, TypeScript (ESM) |
| Database | PostgreSQL via TypeORM |
| Auth | Discord OAuth2 → HMAC tokens |
| Hosting | Railway |
| Fonts | Syne (display), Nunito Sans (body), JetBrains Mono (code) |

## Project structure

```
├── client/                     # React frontend
│   └── src/
│       ├── components/         # App components (roster, raids, bank, chat)
│       ├── ui/                 # Design system (Button, Card, Input, Text, Badge)
│       ├── pages/              # LoginPage, SetupPage, RosterPage, RaidsPage, BankPage
│       ├── layouts/            # AppShell (chat layout)
│       ├── hooks/              # TanStack Query hooks (useRosterQuery, useMemberQuery, etc.)
│       ├── context/            # AuthContext, SocketContext
│       ├── lib/                # Utilities (classColors, treemap, roles, api, demoData)
│       └── index.css           # Design tokens (@theme axioms)
├── src/                        # Express backend
│   ├── platform/
│   │   └── web/server.ts       # Express + Socket.IO server (REST API + chat)
│   ├── commands/               # Shared business logic (used by Discord bot too)
│   ├── entities/               # TypeORM entities (Census, Dkp, Attendance, Bank, etc.)
│   └── migrations/             # SQL migrations (001_, 002_, ...)
├── CLAUDE.md                   # Development guidelines
└── DESIGN.md                   # Design system principles
```

## REST API

All data access and mutations flow through dedicated REST endpoints:

| Area | Endpoints |
|------|-----------|
| **Auth** | `GET /api/auth/discord`, `GET /api/auth/discord/callback`, `GET /api/auth/me`, `POST /api/auth/set-name`, `POST /api/auth/logout` |
| **Roster** | `GET /api/roster`, `GET /api/roster/:id`, `GET /api/roster/class-stats`, `PATCH /api/roster/:id/role` |
| **Characters** | `PUT /api/roster/:id/characters/:name`, `DELETE /api/roster/:id/characters/:name` |
| **Raids** | `GET/POST /api/raids/events`, `GET/PATCH /api/raids/events/:id`, `POST /api/raids/events/:id/calls`, `POST /api/raids/push` |
| **Bank** | `GET /api/bank`, `POST /api/bank/import`, `GET /api/bank/history` |
| **Profile** | `POST /api/profile/bio`, `POST /api/profile/api-key` |
| **Chat** | `GET/POST/DELETE /api/chat/channels` |
| **Toons** | `GET /api/toons/mine`, `GET /api/toons/search` |
| **Templates** | `GET/POST/PATCH/DELETE /api/raids/templates` |

Officer/admin/owner guards are enforced server-side. Character management supports self-service and rank-based access for managing other members.

## Data model

The database stores everything an EverQuest guild needs to operate:

- **Census** — character registry (name, class, level, status: Main/Alt/Bot/Dropped)
- **DKP** — Dragon Kill Points ledger (earned vs. spent per player)
- **Attendance** — raid attendance records (character + raid event)
- **Items** — loot award history (who won what, for how much DKP)
- **Bank** — guild bank inventory (banker, location, item, quantity)
- **Raids** — raid definitions and DKP modifiers
- **GuildSpaceUser** — Discord identity → display name mapping
- **ChatMessage** — real-time chat messages

## Roster page

The roster page is the centerpiece of GuildSpace — browse the full guild census at a glance.

The centerpiece is a **squarified treemap** showing guild class composition at a glance, Kibana-style. Each cell is sized proportionally to the number of characters of that class. Click a cell to filter the roster table below it. The treemap uses:

- **Squarified layout algorithm** — optimizes aspect ratios so cells stay readable at any count
- **R₂ phase distribution** — ambient glow pulses on active cells are staggered using quasi-random sequences so they never synchronize
- **φ³ animation timing** — pulse duration derived from the golden ratio, making near-sync between any two cells take the longest possible time
- **OKLCH class colors** — perceptually uniform so no class visually dominates

Alongside the treemap, status and level breakdowns show Main/Alt/Bot distribution and the percentage of characters at max level.

## Design system

The frontend design system is mathematically derived from a small set of axioms. Every value traces to a named constant, perceptual threshold, or mathematical derivation — nothing is arbitrary.

**Axioms** (defined in `client/src/index.css`):

| Token | Value | Basis |
|-------|-------|-------|
| `--base-size` | `1rem` (16px) | Browser default, WCAG SC 1.4.4 |
| `--type-ratio` | `1.25` | Major third (modular scale) |
| `--space-unit` | `0.5rem` (8px) | Universal grid constant (Material, Carbon, Ant) |
| `--phi` | `1.618034` | Golden ratio — timing, stagger, animation |
| `--lum-bg` | `0.14` | OKLCH base lightness (dark, not crushed) |
| `--lum-step` | `0.035` | Perceptual elevation increment (Weber fraction) |
| `--surface-hue` | `55` | Warm amber direction in OKLCH |
| `--accent-hue` | `85` | Warm gold accent |

**Derived systems**:
- **Type scale**: `base × ratio^n` — nano through hero, 8 stops
- **Spacing**: multiples of 8px grid
- **Color surfaces**: OKLCH with perceptually uniform elevation steps
- **Timing**: φ-scaled durations (76ms → 524ms), never integer-related
- **Opacity**: Weber-Fechner geometric scale (equal perceptual steps)
- **Border radius**: derived from `--space-unit`

Change one axiom, everything downstream recalculates. See [DESIGN.md](DESIGN.md) for the full derivation with citations.

## Development

### Prerequisites

- Node.js
- PostgreSQL (or Railway database credentials)
- Discord application (for OAuth)

### Environment

Copy `.env.example` to `.env` and fill in your credentials:

```
PGHOST=...
PGPORT=...
PGUSER=...
PGPASSWORD=...
POSTGRES_DB=...
PORT=3000
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...
DISCORD_REDIRECT_URI=...
```

### Build and run

```bash
npm run build    # Compiles client/ (Vite) and src/ (tsc) → dist/
npm start        # node dist/index_web.js
```

For frontend development with hot reload:

```bash
cd client && npm run dev    # Vite dev server on :5173, proxies to :3000
```

## License

ISC
