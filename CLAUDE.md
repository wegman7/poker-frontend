# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Poker Frontend

Next.js 15 (App Router) + React 19 + TypeScript client for a real-time multiplayer Texas Hold'em game. Renders the table, streams game state over a WebSocket, and sends player commands.

## Where This Sits

Three services in `poker-workspace/`:

- **poker-frontend** (this repo) — Next.js UI, Auth0 login, one WebSocket per room
- **poker-backend** — Django/Channels, validates the Auth0 JWT, fans state out to players over Redis channel groups, relays commands to the engine
- **poker-engine** — Go service, owns all game logic (state machine, pots, hand evaluation)

The frontend never talks to the engine directly. Everything goes through the backend WebSocket. See the sibling `CLAUDE.md` files in `../poker-backend` and `../poker-engine` for their internals.

## Commands

```bash
npm run dev     # dev server on :3000 (turbopack)
npm run build
npm start
npm run lint    # eslint, next/core-web-vitals + next/typescript
```

There is no test suite in this repo. Integration testing of game behavior lives in the backend (`../poker-backend/poker/test_websockets.py`) and the automated agents (`../poker-backend/agents/runner.py`), which drive the same WebSocket protocol this app uses.

For a full local stack you need Redis, the Go engine on `:8080`, and the Django backend on `:8000` running before `npm run dev` is useful.

## Environment

`.env.development` and `.env.production`. Only `NEXT_PUBLIC_*` vars reach the browser.

| Variable | Purpose |
|---|---|
| `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_SECRET` | Auth0 SDK server-side config |
| `APP_BASE_URL` | Origin used for Auth0 callback URLs |
| `NEXT_PUBLIC_BACKEND_URL` | WebSocket origin — `ws://localhost:8000` in dev, `wss://…` in prod |
| `NEXT_PUBLIC_AUTH0_API_IDENTIFIER` | JWT **audience**. Must match the backend's `AUTH0_API_IDENTIFIER` or the backend rejects the token |

## Auth

`src/middleware.ts` mounts `auth0.middleware` on every path except static assets, which is what serves the `/auth/login`, `/auth/logout`, and `/auth/callback` routes — there are no hand-written route handlers for them. `src/lib/auth0.ts` sets the `audience` so the issued access token is valid for the Django backend rather than just the Auth0 userinfo endpoint.

Client components use `useUser()` for identity and `getAccessToken()` to fetch the JWT right before opening the socket. `user.sub` (e.g. `auth0|66820bf8…`) is the player identity the engine echoes back in `Player.user` — that string comparison is how the client figures out which seat is its own.

## The Room Page

`src/app/room/[gameId]/page.tsx` is the whole game client — socket lifecycle, command senders, and layout. Everything else in that directory is a presentational component.

### Connection flow

Room IDs are client-generated: the home page links to `/room/${crypto.randomUUID()}?startEngine=true` for "Create Game" and `/room/${input}?startEngine=false` for "Join Game". No room record exists anywhere until the engine is started.

Socket URL: `${NEXT_PUBLIC_BACKEND_URL}/ws/playerconsumer/${gameId}?token=${accessToken}`

On open:

- `?startEngine=true` → wait 5s, send `startEngine`, wait 5s, send `join`. The sleeps are crude waits for the engine process to come up; `hasStartedEngineRef` makes this fire once per mount even across reconnects.
- otherwise → send `join` immediately with `seatId: -1` (engine picks the seat)

`?startEngine=true` also gates the "Start game" button, so only the room creator can start hands.

### Socket lifecycle invariants

Two guards exist because React strict mode and reconnects can leave more than one socket alive:

- Every handler begins with `if (socketRef.current !== socket) return;` — a stale socket must not write state belonging to the newer one.
- `unmountedRef` stops the reconnect loop after the effect cleanup runs.

Reconnect is 5 attempts at 3s, showing a "Connection Lost" overlay, then a "Unable to Reconnect" message and a redirect to `/`. Preserve these guards when touching the effect; dropping them reintroduces duplicate-join bugs.

### Protocol

Outbound is always one of two `channelCommand` values:

```jsonc
{ "channelCommand": "startEngine", "smallBlind": 1, "bigBlind": 2 }
{ "channelCommand": "makeEngineCommand", "engineCommand": "join", "seatId": -1 }
```

`engineCommand` is one of `join`, `leave`, `sitIn`, `sitOut`, `addChips`, `startGame`, `fold`, `check`, `call`, `bet`. The engine splits these into a **sit queue** (processed between hands) and a **game queue** (processed during a hand), so `sitIn`/`addChips` sent mid-hand take effect at the next hand boundary.

Inbound is the full game state on every engine tick, wrapped one level deep: `JSON.parse(event.data).event`. There are no deltas and no acks — **a rejected command produces no message at all**. Any logic that waits for a state change to confirm an action must retry on a timer, not assume a response is coming.

`State` and `Player` are declared in `page.tsx`; `Player` is exported and imported by `Seat.tsx`. If the engine's `serializeState.go` changes shape, these interfaces are the only place the client describes it.

Opponents' hole cards arrive from the backend as `["xx", "xx"]`. `Card.tsx` special-cases `rank + suit === 'xx'` and renders a blank card back.

### Command senders

All senders go through `sendSocketCommand(payload, logMessage)`, which no-ops unless the socket is connected. **Keep the payload object literals multi-line with one property per line** — they are written that way deliberately for diff readability.

### `mySeatId`

Resolved in an effect (not during render) by scanning `message.players` for `player.user === user.sub`, and only while it is still `null`. It never resets, so a player who leaves and rejoins in a different seat keeps a stale seat id until remount — a known rough edge, not an accident.

## Layout Model

The table is a fixed 4:3 box centered in the viewport (`max-h-[calc(100vw*3/4)] max-w-[calc(100vh*4/3)] aspect-[4/3]`). Every element inside is absolutely positioned with **percentage** offsets so the whole table scales as one unit.

Consequences worth knowing before editing UI:

- `Seat.tsx` holds three parallel lookup tables keyed by seat `0`–`8` — `seatPositions`, `cardsPositions`, `chipAreaPositions`. Moving a seat means updating all three.
- Font sizes use the `dynamic-text`, `dynamic-text-lg`, `dynamic-text-xl` classes in `globals.css` (viewport-relative `min(3vw…, 4vh…)`), **not** Tailwind's `text-*` scale. Tailwind's fixed rem sizes break the scaling.
- Poker chip visuals (`.poker-chip`, `.chip-ring`, `.chip-amount`) are hand-written CSS in `globals.css` using the same `min(vw, vh)` formula.
- `Chips.tsx` decomposes a chip amount into denominations of 0.25 / 1 / 5 / 25 and stacks them with a `-6%` per-chip y offset.
- `tailwind.config.ts` extends the grid to 10 rows × 12 columns (Tailwind caps at 12×12 by default). Nothing currently uses it, but that is why the config is non-trivial.

## Betting UI

`BetButtons.tsx` renders only when `players[mySeatId].spotlight` is true. `minBet = min(minRaise + currentBet, chips + chipsInPot)`; the amount resets to `minBet` whenever `minBet` changes, which is how a new betting round clears the previous slider value. The pot-fraction buttons use `collectedPot + pot` as the base when `currentBet === 0` and a raise-sizing formula otherwise.

## Deployment

```bash
./exec.sh   # buildx for linux/amd64, push to gcr.io/poker-451119/frontend:v1, run with .env.prod
```

Multi-stage Dockerfile (`node:18-alpine`), `npm start` on port 3000, deployed to Google Cloud Run.

## Known Issues

From `todo.txt` and observed in prod:

- `useUser` causes unexpected re-render behavior; the room re-renders more than it should, possibly from the socket effect
- Create game → join → refresh with no other activity leaves the client with no state, because the engine only broadcasts on change
- Cards render slowly in prod
- `BetButtons` occasionally appears for the wrong player during spotlight transitions
- `LoadingScreen.tsx` imports from `framer-motion`, but `package.json` declares `motion` (the v12 successor package). It resolves today only because `framer-motion` is present in `node_modules`; prefer `motion/react` in new code.

### `sharp` override

`package.json` pins `sharp` to `0.35.3` via `overrides`. This is deliberate and approved — do not remove it casually. `next@16` declares `sharp: ^0.34.5` as an optional dependency, and that entire range falls inside the vulnerable `<0.35.0` libvips window (CVE-2026-33327, CVE-2026-33328, CVE-2026-35590, CVE-2026-35591). The pin is safe only because `next/image` is never imported anywhere in `src/` — `sharp` is unreachable at runtime in this app. A future Next.js upgrade should revisit whether the pin is still needed, and anyone introducing `next/image` must re-evaluate it first.
