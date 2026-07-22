# Frontend Upgrade and Hygiene Pass

**Date:** 2026-07-21
**Repo:** `poker-frontend`
**Branch:** `frontend-upgrade-and-hygiene`

## Goal

Bring the frontend to current dependency versions, clear the outstanding security
advisories, and fix a set of Next.js/React/Auth0 correctness problems. Extract the
WebSocket lifecycle from the room page into a hook so the file becomes reviewable.

Explicitly out of scope: Tailwind 4, TypeScript 7, ESLint 10, and three prod bugs in
`todo.txt` that likely originate in the engine or backend.

## Motivating Findings

Audit of the repo on 2026-07-21.

### Security

`npm audit` reports 15 vulnerabilities: 1 critical, 8 high, 4 moderate, 2 low. The
critical is Next.js 15.1.4 itself — dev-server origin verification information
exposure, cache-poisoning DoS, and image-optimization content injection. Upgrading
Next clears it.

`.env*` is gitignored and no env file appears in git history. Auth0 secrets are not
exposed. No action needed.

### Dependencies

`@emotion/react` and `@emotion/styled` have zero references in `src/`. They are
leftovers from commit `7f8777f` "remove material ui".

`src/app/components/LoadingScreen.tsx` imports from `framer-motion`, which is not a
declared dependency. It resolves only because `motion@12` depends on it transitively.
A resolution change would break the build.

The Dockerfile builds on `node:18-alpine`. Node 18 is end-of-life, and Next.js 16
requires Node 20.9 or newer.

### Auth0

The installed SDK is 4.0.2; current is 4.25.0. All intervening releases are semver
minors, so breaking risk is low.

The root layout does not render `<Auth0Provider>`. Reading
`node_modules/@auth0/nextjs-auth0/dist/client/providers/auth0-provider.d.ts` and the
v4.25.0 source confirms the provider wraps children in `SWRConfig` and its optional
`user` prop pre-populates the SWR cache for the profile route. Without the provider,
every `useUser()` call is an unseeded SWR hook that fetches `/auth/profile`
independently.

This is the leading hypothesis for two `todo.txt` entries: "useUser is causing weird
behavior" and "why are there so many rerenders inside room?"

### Next.js and React

- `useSearchParams()` is called with no `<Suspense>` boundary above it.
- The socket effect in `src/app/room/[gameId]/page.tsx` lists the `searchParams`
  object in its dependency array. Identity churn there can retrigger the whole
  connect cycle.
- `src/app/page.tsx` evaluates `crypto.randomUUID()` during render, inside a `Link`
  `href`. Every render produces a different room ID.
- No `metadata` export, no `error.tsx`, no error boundary.
- `src/app/room/[gameId]/page.tsx` is 347 lines mixing socket lifecycle, command
  senders, and layout.

### Next.js 16 migration surface

Smaller than usual for this app:

- **Not affected** by the async-params breaking change. The app reads route data via
  the `useParams()` and `useSearchParams()` client hooks, not the `params` prop.
- **Already** on ESLint flat config (`eslint.config.mjs`).
- Requires: `middleware.ts` → `proxy.ts`, `next lint` → ESLint CLI, Node 20.9+.

## Design

### Commit sequence

Five commits on `frontend-upgrade-and-hygiene`, each ending with a green build and
lint. Upgrading and refactoring in a single commit would make an Auth0 regression
indistinguishable from a hook-extraction bug; separate commits keep `git bisect`
useful.

| # | Commit | Contents |
|---|---|---|
| 0 | baseline | Record current build/lint output; no source changes |
| 1 | deps | Version bumps, drop `@emotion/*`; no source edits beyond what the bumps force |
| 2 | next-16 | `middleware.ts`→`proxy.ts`, lint script, Dockerfile Node 22, drop `--turbopack` |
| 3 | auth0+react | Provider, Suspense, dep array, randomUUID, motion import, metadata, error.tsx |
| 4 | refactor | Extract `useGameSocket` and `types.ts` |

### Phase 1 — dependencies

| Package | From | To |
|---|---|---|
| `next` | 15.1.4 | 16.2.11 |
| `react`, `react-dom` | 19.0.0 | 19.2.8 |
| `@auth0/nextjs-auth0` | 4.0.2 | 4.25.0 |
| `eslint-config-next` | 15.1.4 | 16.2.11 |
| `typescript` | 5.7.3 | 5.9.3 |
| `eslint` | 9.18.0 | 9.39.5 |
| `motion` | 12.0.6 | 12.42.2 |
| `tailwindcss` | 3.4.17 | 3.4.19 |
| `postcss` | 8.4.49 | 8.5.21 |
| `@types/node` | 20.17.12 | 22.x |
| `@types/react` | 19.0.4 | 19.2.17 |
| `@types/react-dom` | 19.0.2 | 19.2.3 |
| `@eslint/eslintrc` | 3.2.0 | 3.3.6 |

Removed: `@emotion/react`, `@emotion/styled`.

`@types/node` tracks the Node major it describes, so it moves to 22.x to match the
Node 22 runtime introduced in phase 2 — not to 26.x, which would describe a runtime
this project does not use.

Deliberately held back: `tailwindcss` at 3.x (4.x is a CSS-first rewrite that would
force migrating `tailwind.config.ts` and revalidating the hand-written chip and
`dynamic-text` CSS), `typescript` at 5.x, `eslint` at 9.x.

Exit criterion: `npm audit` reports no critical or high vulnerabilities.

### Phase 2 — Next.js 16

**Middleware rename.** `src/middleware.ts` becomes `src/proxy.ts`, with the exported
function renamed `middleware` → `proxy`. The `auth0.middleware(request)` call inside
is unchanged, as is the `config.matcher`.

Risk: Auth0's v4 documentation specifies `middleware.ts`. The SDK call is
filename-agnostic so the rename should be inert, but this is unverified. Mitigation:
Next.js 16 still supports the `middleware.ts` name, so if login, logout, or callback
misbehaves after the rename, revert this one change and keep the rest of the phase.
The `proxy` convention is Node-runtime only; this app does not use the edge runtime,
so that restriction does not apply.

**Lint.** `next lint` is removed in Next 16. The `lint` script becomes a direct
ESLint CLI invocation. `eslint-config-next` 16 defaults to flat config, which the
repo already uses.

**Turbopack.** Default in 16. Drop the `--turbopack` flag from the `dev` script.

**Dockerfile.** Both stages move from `node:18-alpine` to `node:22-alpine`.

### Phase 3 — Auth0 and React fixes

**Auth0Provider.** `src/app/layout.tsx` stays a server component. It calls
`auth0.getSession()`, and wraps `children` in `<Auth0Provider user={session?.user}>`.
Client components then read the user from a pre-seeded SWR cache instead of each
issuing its own `/auth/profile` fetch.

Confirmed signature (v4.25.0):

```ts
export type Auth0ProviderProps = {
  user?: User;
  children: React.ReactNode;
  profileRoute?: string;
}
```

**Suspense.** `useSearchParams()` requires a `<Suspense>` boundary above it. The room
route splits into two files: `page.tsx` becomes a thin server component rendering
`<Suspense>` around a new `RoomClient.tsx`, which is the `'use client'` component
holding the game UI. All existing room code moves into `RoomClient.tsx` in this phase
unchanged; phase 4 is what actually reduces it.

**Socket effect dependencies.** Replace the `searchParams` object in the dependency
array with the extracted primitive:

```ts
const shouldStartEngine = searchParams.get('startEngine') === 'true';
// effect depends on [params.gameId, shouldStartEngine]
```

A string compares by value, so identity churn no longer retriggers the connect cycle.

**Room ID generation.** In `src/app/page.tsx`, "Create Game" becomes a button with an
`onClick` that calls `crypto.randomUUID()` and then `router.push()`, moving the call
out of render. "Join Game" keeps its `Link`.

**Motion import.** `LoadingScreen.tsx` imports from `motion/react` rather than the
undeclared `framer-motion`.

**Metadata and errors.** Add a `metadata` export to the root layout (title,
description). Add `src/app/error.tsx` as a route-level error boundary.

### Phase 4 — extraction

Three files in `src/app/room/[gameId]/`:

**`types.ts`** — the `State` and `Player` interfaces, currently declared in `page.tsx`
and imported from there by `Seat.tsx`.

**`useGameSocket.ts`** — a hook owning connection, reconnection, both lifecycle
guards, and the command senders. Returns:

```ts
{
  state: State | undefined;
  isConnected: boolean;
  reconnectAttempt: number;
  connectionFailed: boolean;
  commands: {
    startGame, addChips, sitIn, sitOut, leave, fold, check, call, bet
  };
}
```

**`RoomClient.tsx`** — consumes the hook and renders layout only, roughly 120 lines
down from the original 347. `page.tsx` is untouched in this phase; it is already the
thin Suspense wrapper created in phase 3.

The two lifecycle guards move verbatim, not rewritten:

1. Every socket handler opens with `if (socketRef.current !== socket) return;` so a
   stale socket cannot write state belonging to a newer one.
2. `unmountedRef` stops the reconnect loop after effect cleanup.

These encode race conditions that are not obvious from reading the code cold.
Relocating them is safe; rewriting them is not.

Command payload object literals keep their multi-line, one-property-per-line
formatting.

## Verification

The repo has no test suite. `build`, `lint`, and `tsc --noEmit` prove the code
compiles and is clean; they prove nothing about whether the game still works. The
Auth0 provider change and the socket extraction can each break gameplay while
building perfectly.

**Automated — blocking:**

- `npm run build` passes
- `npm run lint` passes
- `npx tsc --noEmit` passes
- `npm audit` reports no critical or high vulnerabilities
- Every changed file read back and reviewed

**Manual — requires the full stack (Redis, Go engine on `:8080`, Django on `:8000`):**

1. Log in via Auth0; confirm redirect back and authenticated home page
2. Create Game; confirm engine starts and the room is joined
3. Second browser session joins by room ID
4. Start a hand; confirm cards deal, bet buttons appear only on spotlight
5. Play a hand to completion; confirm pot awards and a new hand starts
6. Kill the backend mid-hand; confirm the reconnect overlay and its recovery
7. Log out; confirm session clears

Automated checks passing is **not** sufficient to call this done. Completion requires
the manual pass, either driven here against a running stack via
`poker-workspace/run-servers.sh`, or by the user against the checklist above. Any
step not executed is reported as not executed.

## Risks

| Risk | Mitigation |
|---|---|
| Auth0 4.0.2→4.25.0 spans 25 minors | All semver minor; manual auth flow test in verification |
| `proxy.ts` rename breaks Auth0 middleware | Next 16 still supports `middleware.ts`; revert that single change |
| Provider change alters auth data flow | Isolated in its own commit; auth flow tested manually |
| Hook extraction disturbs socket races | Guards moved verbatim; reconnect explicitly tested |
| No tests to catch gameplay regressions | Manual smoke test is a blocking completion criterion |

## Deferred

Not in this pass, listed so they are not lost:

- Tailwind 4, TypeScript 7, ESLint 10
- `todo.txt`: cards load slowly in prod
- `todo.txt`: BetButtons occasionally shows for the wrong player during spotlight
  transitions — likely a transient engine broadcast
- `todo.txt`: create → join → refresh sends no state; the backend's own todo already
  carries "fix state broadcast on player connect"
- `mySeatId` never resets, so leaving and rejoining a different seat keeps a stale
  seat ID until remount
- No test suite
