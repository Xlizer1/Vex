# Vex

The custom Discord bot for **The Vertex** — a CS2-focused community server.

Vex handles everything on the server: member onboarding, role management, moderation, audit logging, CS2 stats, and a frag-based economy.

---

## Features

### Onboarding
- Auto-assigns the **Edge** role on join
- Posts a welcome message to the welcome channel
- Tracks every member in a PostgreSQL database

### CS2 Utilities
- `/linksteam` — Link a Steam account (URL, Steam64 ID, or vanity name)
- `/stats [user]` — Fetch CS2 stats from Leetify (ratings, Premier rank, FACEIT level, HS%, win rate, recent matches)
- `/rank <tier>` — Self-assign a CS2 Premier rating role (7 tiers)

### Economy — Frags
- Passive earning: 5 frags per message (60s cooldown), 5 frags per active voice minute
- `/balance [user]` — Check frag balance
- `/daily` — Claim 500 frags every 24 hours
- `/give <user> <amount>` — Transfer frags to another member
- `/flip <amount> [user]` — Solo coin flip or challenge another member

### Moderation
- `/warn`, `/mute`, `/kick`, `/ban` — All actions stored in DB, DM the target, and log to #mod-logs
- `/infractions <user>` — Paginated infraction history
- All mod actions also mirrored to #audit-logs

### Logging
Mirrors the following to #audit-logs:
- Member join / leave
- Message edits (before & after)
- Message deletions
- Voice channel join / leave / move (with forced action attribution)

### Role Panels
- `/setup-ranks` — Create CS2 Premier rating roles and post a button panel
- `/setup-faceit` — Create FACEIT level roles (1–10) and post a button panel

---

## Tech Stack

| Layer        | Choice                     |
|--------------|----------------------------|
| Runtime      | Bun                        |
| Language     | TypeScript (strict)        |
| Bot framework| Sapphire Framework v5      |
| Discord lib  | discord.js v14             |
| Database     | PostgreSQL + Drizzle ORM   |
| CS2 stats    | Leetify API                |
| Steam        | Steam Web API              |

---

## Setup

### 1. Install dependencies

```bash
bun install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

| Variable               | Required | Description                                      |
|------------------------|----------|--------------------------------------------------|
| `DISCORD_TOKEN`        | ✅       | Bot token from Discord Developer Portal          |
| `CLIENT_ID`            |          | Bot application ID                               |
| `GUILD_ID`             |          | Your server ID (for dev command registration)    |
| `WELCOME_CHANNEL_ID`   | ✅       | Channel to send welcome messages                 |
| `EDGE_ROLE_ID`         | ✅       | Role assigned to all new members                 |
| `MOD_LOG_CHANNEL_ID`   |          | Channel for moderation logs                      |
| `AUDIT_LOG_CHANNEL_ID` |          | Channel for audit logs                           |
| `RANKS_CHANNEL_ID`     |          | Channel for rank panels                          |
| `DATABASE_URL`         | ✅       | PostgreSQL connection string                     |
| `STEAM_API_KEY`        |          | Steam Web API key (for vanity URL resolution)    |
| `LEETIFY_API_KEY`      |          | Leetify API key (for CS2 stats)                  |

### 3. Run database migrations

```bash
bunx drizzle-kit generate
psql $DATABASE_URL -f drizzle/<migration>.sql
```

### 4. Start the bot

```bash
bun run src/index.ts
```

---

## Project Structure

```
src/
  commands/             # Slash commands (cs2/, economy/, mod/)
  services/             # Business logic (FragService, ModerationService, ...)
  repositories/         # Database access (UserRepository, InfractionRepository)
  listeners/            # Discord event listeners
  interaction-handlers/ # Button interaction handlers
  lib/                  # Utilities (config, formatters, parseDuration, ...)
  db/                   # Drizzle schema and client
  constants.ts          # All shared constants
  errors.ts             # Typed error classes
  index.ts              # Entry point
```

---

## License

Copyright © 2025 xlizer. All rights reserved.

This software is proprietary. Unauthorized copying, modification, distribution, or commercial use of this code, in whole or in part, is strictly prohibited.
