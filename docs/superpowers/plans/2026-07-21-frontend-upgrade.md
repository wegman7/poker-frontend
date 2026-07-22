# Frontend Upgrade and Hygiene Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade `poker-frontend` through Next.js 16 and Auth0 SDK 4.25, clear all critical/high security advisories, fix six Next.js/React/Auth0 correctness defects, and extract the WebSocket lifecycle from the 347-line room page into a hook.

**Architecture:** Five sequential tasks on branch `frontend-upgrade-and-hygiene`, each ending green and committed separately so `git bisect` can isolate a regression. Riskiest change (the `middleware`→`proxy` rename) is isolated in its own revertable commit.

**Tech Stack:** Next.js 16 (App Router), React 19.2, TypeScript 5.9, Tailwind CSS 3.4, `@auth0/nextjs-auth0` 4.25, `motion` 12.42.

**Spec:** `docs/superpowers/specs/2026-07-21-frontend-upgrade-design.md`

## Global Constraints

- Repo root: `/Users/challenger/prog/poker-frontend` (reachable as `poker-workspace/poker-frontend`, a symlink).
- Branch: `frontend-upgrade-and-hygiene`. Already created. Do not merge to `main`.
- **This repo has no test suite, and adding one is deliberately out of scope** (user decision). Do not write tests. Do not add Vitest/Jest. The per-task verification cycle is `npm run build`, `npm run lint`, `npx tsc --noEmit`.
- **A green build does not mean the game works.** Automated checks are necessary, not sufficient. The manual smoke test in Task 6 is a blocking completion criterion.
- Tailwind stays on 3.x. TypeScript stays on 5.x. ESLint stays on 9.x. Do not upgrade these.
- Do not touch `poker-backend` or `poker-engine`.
- Do not attempt the three deferred `todo.txt` prod bugs (slow cards, wrong-player BetButtons, refresh-loses-state).
- Command payload object literals keep multi-line, one-property-per-line formatting.
- Commit messages end with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

## Deviations from the spec

The spec's commit table listed four commits. This plan uses five tasks. Two refinements, both preserving the spec's stated intent (bisectability, isolating risk):

1. **The lint script change moves from phase 2 into Task 1.** `next lint` is removed in Next 16, so `npm run lint` breaks the instant Next is upgraded. Leaving the script fix in a later commit would make Task 1 unverifiable. The spec permits this — phase 1 allows "edits the bumps force," and this is forced.
2. **Spec phase 3 splits into Tasks 3 and 4.** Auth0 provider work and React correctness fixes are independently reviewable; a reviewer could reasonably accept one and reject the other.

---

### Task 1: Dependency upgrade

**Files:**
- Modify: `package.json` (dependencies, devDependencies, `lint` script)
- Modify: `package-lock.json` (generated)

**Interfaces:**
- Consumes: nothing
- Produces: Next.js 16 toolchain for all later tasks

- [ ] **Step 1: Record the baseline before touching anything**

```bash
cd /Users/challenger/prog/poker-frontend
git branch --show-current   # must print: frontend-upgrade-and-hygiene
npm run build 2>&1 | tail -20
npm run lint 2>&1 | tail -20
npm audit 2>&1 | tail -5
```

Expected: build succeeds, lint succeeds, audit reports `15 vulnerabilities (2 low, 4 moderate, 8 high, 1 critical)`. Save this output — it is the comparison point. If the build already fails on `main`, stop and report; do not proceed on a broken baseline.

- [ ] **Step 2: Upgrade runtime dependencies**

```bash
npm install \
  next@16.2.11 \
  react@19.2.8 \
  react-dom@19.2.8 \
  @auth0/nextjs-auth0@4.25.0 \
  motion@12.42.2
```

- [ ] **Step 3: Upgrade dev dependencies and remove dead ones**

`@emotion/react` and `@emotion/styled` have zero references in `src/` (verified: leftovers from commit `7f8777f` "remove material ui").

```bash
npm install -D \
  eslint-config-next@16.2.11 \
  typescript@5.9.3 \
  eslint@9.39.5 \
  @types/node@22 \
  @types/react@19.2.17 \
  @types/react-dom@19.2.3 \
  @eslint/eslintrc@3.3.6 \
  tailwindcss@3.4.19 \
  postcss@8.5.21

npm uninstall @emotion/react @emotion/styled
```

`@types/node` goes to 22.x to match the Node 22 runtime set in Task 2 — not the latest 26.x, which describes a runtime this project does not use.

- [ ] **Step 4: Fix the lint script**

`next lint` is removed in Next.js 16. Edit `package.json`, changing only the `lint` line:

```json
"lint": "eslint ."
```

Leave `dev`, `build`, and `start` alone for now — Task 2 handles those.

- [ ] **Step 5: Clear the stale build cache**

A major Next upgrade leaves incompatible artifacts behind.

```bash
rm -rf .next
```

- [ ] **Step 6: Verify the build**

```bash
npm run build 2>&1 | tail -30
```

Expected: PASS.

If it fails with a Turbopack/webpack config conflict: `next.config.ts` in this repo is an empty config object, so a conflict means a plugin injected one. Report the error rather than guessing.

- [ ] **Step 7: Verify lint and types**

```bash
npm run lint 2>&1 | tail -30
npx tsc --noEmit 2>&1 | tail -30
```

Expected: both PASS.

If lint fails because `eslint-config-next@16` rejects the `FlatCompat` shim in `eslint.config.mjs`, replace that file with the direct flat config:

```js
import js from "@eslint/js";
import next from "@next/eslint-plugin-next";
import tseslint from "typescript-eslint";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { "@next/next": next },
    rules: {
      ...next.configs.recommended.rules,
      ...next.configs["core-web-vitals"].rules,
    },
  },
];
```

Only do this if the existing config actually errors. Installing `typescript-eslint` is acceptable if this path is taken.

- [ ] **Step 8: Confirm the security advisories are cleared**

```bash
npm audit 2>&1 | tail -10
```

Expected: **zero critical and zero high**. Moderate/low may remain — note them, do not chase them. If any critical or high survives, report which package before continuing.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json eslint.config.mjs
git commit -m "$(cat <<'EOF'
Upgrade dependencies through Next.js 16

next 15.1.4 -> 16.2.11, react 19.0.0 -> 19.2.8, @auth0/nextjs-auth0
4.0.2 -> 4.25.0, plus toolchain. Clears 1 critical and 8 high
advisories, all rooted in Next.js 15.1.4.

Removes @emotion/react and @emotion/styled, unused since the
material-ui removal in 7f8777f.

Replaces `next lint` with the ESLint CLI; the command is removed
in Next 16.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Next.js 16 conventions

**Files:**
- Rename: `src/middleware.ts` → `src/proxy.ts`
- Modify: `package.json` (`dev` script)
- Modify: `Dockerfile` (both `FROM` lines)

**Interfaces:**
- Consumes: Next.js 16 from Task 1
- Produces: nothing consumed by later tasks

**Risk note:** Auth0's v4 docs specify `middleware.ts`. The `auth0.middleware(request)` call is filename-agnostic so the rename should be inert, but this is unverified. Next 16 still supports `middleware.ts`, so if auth breaks, revert **this commit alone**.

- [ ] **Step 1: Rename the file with git**

```bash
cd /Users/challenger/prog/poker-frontend
git mv src/middleware.ts src/proxy.ts
```

- [ ] **Step 2: Rename the exported function**

Replace the full contents of `src/proxy.ts`:

```ts
import type { NextRequest } from "next/server"

import { auth0 } from "@/lib/auth0"

export async function proxy(request: NextRequest) {
  return await auth0.middleware(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
}
```

Only the function name changes. The `auth0.middleware` call and the matcher are identical — `auth0.middleware` is an SDK method name, not the Next convention, and must **not** be renamed.

- [ ] **Step 3: Drop the redundant Turbopack flag**

Turbopack is the default in Next 16. In `package.json`:

```json
"dev": "next dev",
```

- [ ] **Step 4: Move the Docker image to Node 22**

Node 18 is EOL and Next 16 requires Node 20.9+. In `Dockerfile`, both stages:

```dockerfile
FROM node:22-alpine AS builder
```

```dockerfile
FROM node:22-alpine
```

- [ ] **Step 5: Verify**

```bash
rm -rf .next
npm run build 2>&1 | tail -30
npm run lint 2>&1 | tail -20
npx tsc --noEmit 2>&1 | tail -20
```

Expected: all three PASS, with no warning about a deprecated `middleware` convention.

- [ ] **Step 6: Verify the Docker build still resolves**

```bash
docker build -t poker-frontend:upgrade-check . 2>&1 | tail -20
```

Expected: build succeeds. If Docker is unavailable in this environment, **say so explicitly in the report** rather than marking the step done.

- [ ] **Step 7: Commit**

```bash
git add src/proxy.ts package.json Dockerfile
git commit -m "$(cat <<'EOF'
Adopt Next.js 16 conventions

Renames middleware.ts to proxy.ts and the exported middleware
function to proxy; the middleware filename is deprecated in Next 16.
The auth0.middleware() call is an SDK method and is unchanged.

Drops the redundant --turbopack flag (default in 16) and moves the
Docker base image to node:22-alpine, since Node 18 is EOL and Next 16
requires 20.9+.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Auth0Provider, metadata, error boundary

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/app/error.tsx`

**Interfaces:**
- Consumes: `@auth0/nextjs-auth0` 4.25.0 from Task 1
- Produces: a seeded SWR cache, so `useUser()` in any client component resolves from context instead of fetching `/auth/profile`

**Why:** `Auth0Provider` wraps children in `SWRConfig` and its `user` prop pre-populates the cache. Without it, every `useUser()` is an unseeded SWR hook issuing its own fetch. This is the leading hypothesis for two `todo.txt` items ("useUser is causing weird behavior", "why are there so many rerenders inside room?").

Verified signatures — do not deviate:
- `import { Auth0Provider } from "@auth0/nextjs-auth0"` (root entry, same as `useUser`)
- `Auth0ProviderProps = { user?: User; children: React.ReactNode; profileRoute?: string }`
- `auth0.getSession(): Promise<SessionData | null>`, and `SessionData.user: User`

- [ ] **Step 1: Wrap the root layout in Auth0Provider**

Replace the full contents of `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Auth0Provider } from "@auth0/nextjs-auth0";

import { auth0 } from "@/lib/auth0";
import "./globals.css";

export const metadata: Metadata = {
  title: "Poker",
  description: "Real-time multiplayer Texas Hold'em",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth0.getSession();

  return (
    <html lang="en">
      <body className="bg-gray-900 text-white">
        <Auth0Provider user={session?.user}>
          {children}
        </Auth0Provider>
      </body>
    </html>
  );
}
```

The layout stays a **server** component — do not add `'use client'`. `session?.user` is `User | undefined`, which matches the optional `user?: User` prop.

- [ ] **Step 2: Add a route-level error boundary**

Create `src/app/error.tsx`:

```tsx
'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col justify-center items-center text-white gap-4">
      <h2 className="text-2xl font-bold">Something went wrong</h2>
      <p className="text-gray-400">{error.message}</p>
      <button
        className="bg-blue-600 py-2 px-6 rounded-md hover:bg-blue-500"
        onClick={reset}
      >
        Try again
      </button>
    </div>
  );
}
```

An `error.tsx` must be a client component — that is a Next.js requirement, not a style choice.

- [ ] **Step 3: Verify**

```bash
npm run build 2>&1 | tail -30
npm run lint 2>&1 | tail -20
npx tsc --noEmit 2>&1 | tail -20
```

Expected: all PASS. A type error on `user={session?.user}` means the SDK version is wrong — recheck Task 1 installed 4.25.0.

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx src/app/error.tsx
git commit -m "$(cat <<'EOF'
Seed the Auth0 SWR cache from the server session

The root layout now fetches the session server-side and passes the
user to Auth0Provider, which pre-populates the SWR cache. Previously
every useUser() call was an unseeded SWR hook fetching /auth/profile
independently — the likely cause of the useUser and re-render items
in todo.txt.

Also adds page metadata and a route-level error boundary.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: React correctness fixes

**Files:**
- Create: `src/app/room/[gameId]/RoomClient.tsx` (receives the current `page.tsx` body)
- Modify: `src/app/room/[gameId]/page.tsx` (becomes a Suspense wrapper)
- Modify: `src/app/page.tsx` (room ID generation)
- Modify: `src/app/components/LoadingScreen.tsx` (import path)

**Interfaces:**
- Consumes: nothing from Task 3
- Produces: `RoomClient.tsx` — the file Task 5 refactors. `page.tsx` is final after this task and Task 5 does not touch it again.

- [ ] **Step 1: Move the room component into RoomClient.tsx**

```bash
cd /Users/challenger/prog/poker-frontend
git mv "src/app/room/[gameId]/page.tsx" "src/app/room/[gameId]/RoomClient.tsx"
```

In `RoomClient.tsx`, rename the component. Change:

```tsx
export default function Room() {
```

to:

```tsx
export default function RoomClient() {
```

Keep `'use client'` at the top. Everything else in the file is unchanged in this step.

- [ ] **Step 2: Create the Suspense boundary**

`useSearchParams()` requires a `<Suspense>` boundary above it. Create `src/app/room/[gameId]/page.tsx`:

```tsx
import { Suspense } from 'react';

import LoadingScreen from '@/app/components/LoadingScreen';
import RoomClient from './RoomClient';

export default function RoomPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <RoomClient />
    </Suspense>
  );
}
```

- [ ] **Step 3: Update the import in Seat.tsx**

`Seat.tsx` imports the `Player` type from the old path. In `src/app/room/[gameId]/Seat.tsx`, change:

```tsx
import { Player } from "./page";
```

to:

```tsx
import { Player } from "./RoomClient";
```

This is temporary — Task 5 moves it to `./types`.

- [ ] **Step 4: Fix the socket effect dependency**

The effect currently lists the `searchParams` **object**, whose identity can change and retrigger the entire connect cycle. Depend on the extracted primitive instead.

In `RoomClient.tsx`, immediately after the `useSearchParams()` call, add:

```tsx
const shouldStartEngine = searchParams.get('startEngine') === 'true';
```

Then replace all three uses. In the socket effect:

```tsx
        if (shouldStartEngine && !hasStartedEngineRef.current) {
          hasStartedEngineRef.current = true;
          startEngineAndJoin(1, 2);
        } else {
          join();
        }
```

The effect's dependency array:

```tsx
  }, [params.gameId, shouldStartEngine]);
```

And the "Start game" button condition in the JSX:

```tsx
      {shouldStartEngine && message.gameStopped && (
```

A string compares by value, so identity churn no longer retriggers the socket.

- [ ] **Step 5: Move randomUUID out of render**

`src/app/page.tsx` calls `crypto.randomUUID()` inside a `Link` `href`, so it runs on every render and yields a different room ID each time. Replace the "Create Game" `<button>` block:

```tsx
            <button
              className="bg-blue-600 text-white py-3 px-6 sm:py-4 sm:px-8 md:py-5 md:px-10 rounded-md hover:bg-blue-500 text-lg sm:text-xl md:text-2xl font-semibold transition-all"
              onClick={() => router.push(`/room/${crypto.randomUUID()}?startEngine=true`)}
            >
              Create Game
            </button>
```

`src/app/page.tsx` does not currently import from `next/navigation`. Add the import alongside the existing `next/link` import:

```tsx
import { useRouter } from 'next/navigation';
```

and add the hook inside `Home()`, alongside the existing `useState`:

```tsx
  const router = useRouter();
```

Leave the "Join Game" `<Link>` as it is — its href is derived from typed input, not generated.

- [ ] **Step 6: Fix the motion import**

`src/app/components/LoadingScreen.tsx` imports from `framer-motion`, which is not a declared dependency and resolves only transitively. Change line 1:

```tsx
import { motion } from "motion/react";
```

- [ ] **Step 7: Verify**

```bash
npm run build 2>&1 | tail -30
npm run lint 2>&1 | tail -20
npx tsc --noEmit 2>&1 | tail -20
```

Expected: all PASS. Confirm the build output shows no "missing Suspense boundary with useSearchParams" error.

- [ ] **Step 8: Commit**

```bash
git add "src/app/room/[gameId]/page.tsx" "src/app/room/[gameId]/RoomClient.tsx" "src/app/room/[gameId]/Seat.tsx" src/app/page.tsx src/app/components/LoadingScreen.tsx
git commit -m "$(cat <<'EOF'
Fix Suspense, effect deps, render-time UUID, motion import

Splits the room route so useSearchParams sits under a Suspense
boundary. The socket effect now depends on the extracted
startEngine string rather than the searchParams object, whose
identity churn could retrigger the whole connect cycle.

Moves crypto.randomUUID() out of a Link href, where it produced a
new room ID on every render, into an onClick.

Imports motion from motion/react; framer-motion was never a declared
dependency and resolved only transitively.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Extract the socket hook

**Files:**
- Create: `src/app/room/[gameId]/types.ts`
- Create: `src/app/room/[gameId]/useGameSocket.ts`
- Modify: `src/app/room/[gameId]/RoomClient.tsx` (down to ~120 lines from 347)
- Modify: `src/app/room/[gameId]/Seat.tsx` (import path)

**Interfaces:**
- Consumes: `RoomClient.tsx` as left by Task 4
- Produces: `useGameSocket(gameId: string, shouldStartEngine: boolean): GameSocket`

**Critical:** the two lifecycle guards move **verbatim**. They encode race conditions that are not obvious from reading the code cold. Relocating them is safe; rewriting them is not.

1. Every socket handler opens with `if (socketRef.current !== socket) return;` so a stale socket cannot write state belonging to a newer one.
2. `unmountedRef` stops the reconnect loop after effect cleanup.

- [ ] **Step 1: Extract the shared types**

Create `src/app/room/[gameId]/types.ts`:

```ts
export type Card = string;

export interface Player {
  seatId: number;
  user: string;
  sittingOut: boolean;
  chips: number;
  chipsInPot: number;
  timeBank: number;
  holeCards: Card[] | null;
  spotlight: boolean;
  dealer: boolean;
}

export interface State {
  channelCommand: string;
  bigBlind: number;
  timebankTotal: number;
  pot: number;
  collectedPot: number;
  currentBet: number;
  minRaise: number;
  communityCards: Card[] | null;
  players: { [seatNumber: string]: Player };
  gameStopped: boolean;
}
```

- [ ] **Step 2: Point Seat.tsx at the new types module**

In `src/app/room/[gameId]/Seat.tsx`:

```tsx
import { Player } from "./types";
```

- [ ] **Step 3: Create the hook**

Create `src/app/room/[gameId]/useGameSocket.ts`:

```ts
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAccessToken } from '@auth0/nextjs-auth0';

import type { State } from './types';

const MAX_RECONNECTS = 5;
const RECONNECT_DELAY_MS = 3000;
const FAILED_REDIRECT_DELAY_MS = 3000;

export interface GameCommands {
  startGame: () => void;
  addChips: (chips: number) => void;
  sitIn: () => void;
  sitOut: () => void;
  leave: () => void;
  fold: () => void;
  check: () => void;
  call: () => void;
  bet: (chips: number) => void;
}

export interface GameSocket {
  state: State | undefined;
  isConnected: boolean;
  reconnectAttempt: number;
  connectionFailed: boolean;
  maxReconnects: number;
  commands: GameCommands;
}

export function useGameSocket(gameId: string, shouldStartEngine: boolean): GameSocket {
  const router = useRouter();
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const hasStartedEngineRef = useRef(false);
  const unmountedRef = useRef(false);

  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [reconnectAttempt, setReconnectAttempt] = useState<number>(0);
  const [connectionFailed, setConnectionFailed] = useState<boolean>(false);
  const [state, setState] = useState<State>();

  useEffect(() => {
    unmountedRef.current = false;

    const join = () => {
      if (socketRef.current?.readyState !== WebSocket.OPEN) return;
      socketRef.current.send(JSON.stringify({
        channelCommand: 'makeEngineCommand',
        engineCommand: 'join',
        seatId: -1,
      }));
      console.log('Joining game');
    };

    const startEngineAndJoin = async (sb: number, bb: number) => {
      await new Promise(r => setTimeout(r, 5000));
      if (socketRef.current?.readyState !== WebSocket.OPEN) return;
      socketRef.current.send(JSON.stringify({
        channelCommand: 'startEngine',
        smallBlind: sb,
        bigBlind: bb,
      }));
      console.log('Starting engine');
      await new Promise(r => setTimeout(r, 5000));
      join();
    };

    const connect = async () => {
      if (unmountedRef.current) return;
      const token = await getAccessToken();
      const socket = new WebSocket(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/ws/playerconsumer/${gameId}?token=${token}`
      );
      socketRef.current = socket;

      socket.onopen = () => {
        // If a newer connect() ran after this one, socketRef.current will point
        // to the newer socket. Bail out and let the newer socket's onopen handle it.
        if (socketRef.current !== socket) { socket.close(); return; }
        setIsConnected(true);
        setReconnectAttempt(0);
        setConnectionFailed(false);
        reconnectCountRef.current = 0;
        console.log('WebSocket connected');

        if (shouldStartEngine && !hasStartedEngineRef.current) {
          hasStartedEngineRef.current = true;
          startEngineAndJoin(1, 2);
        } else {
          join();
        }
      };

      socket.onmessage = (event) => {
        if (socketRef.current !== socket) return;
        const nextState: State = JSON.parse(event.data).event;
        console.log('Received: state', nextState);
        setState(nextState);
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      socket.onclose = () => {
        if (socketRef.current !== socket) return;
        setIsConnected(false);
        console.log('WebSocket disconnected');
        if (unmountedRef.current) return;
        if (reconnectCountRef.current < MAX_RECONNECTS) {
          reconnectCountRef.current++;
          setReconnectAttempt(reconnectCountRef.current);
          setTimeout(connect, RECONNECT_DELAY_MS);
        } else {
          setConnectionFailed(true);
          setTimeout(() => router.push('/'), FAILED_REDIRECT_DELAY_MS);
        }
      };
    };

    connect();

    return () => {
      unmountedRef.current = true;
      socketRef.current?.close();
    };
  }, [gameId, shouldStartEngine, router]);

  const sendSocketCommand = (payload: object, logMessage: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.send(JSON.stringify(payload));
      console.log(logMessage);
    }
  };

  const commands: GameCommands = {
    startGame: () => {
      sendSocketCommand(
        {
          channelCommand: 'makeEngineCommand',
          engineCommand: 'startGame'
        },
        'Starting game'
      );
    },
    addChips: (chips: number) => {
      sendSocketCommand(
        {
          channelCommand: 'makeEngineCommand',
          engineCommand: 'addChips',
          chips
        },
        'Adding chips'
      );
    },
    sitIn: () => {
      sendSocketCommand(
        {
          channelCommand: 'makeEngineCommand',
          engineCommand: 'sitIn',
        },
        'Sitting in'
      );
    },
    sitOut: () => {
      sendSocketCommand(
        {
          channelCommand: 'makeEngineCommand',
          engineCommand: 'sitOut',
        },
        'Sitting out'
      );
    },
    leave: () => {
      sendSocketCommand(
        {
          channelCommand: 'makeEngineCommand',
          engineCommand: 'leave'
        },
        'Leaving game'
      );
      router.push('/');
    },
    fold: () => {
      sendSocketCommand(
        {
          channelCommand: 'makeEngineCommand',
          engineCommand: 'fold'
        },
        'Folding'
      );
    },
    check: () => {
      sendSocketCommand(
        {
          channelCommand: 'makeEngineCommand',
          engineCommand: 'check'
        },
        'Checking'
      );
    },
    call: () => {
      sendSocketCommand(
        {
          channelCommand: 'makeEngineCommand',
          engineCommand: 'call'
        },
        'Calling'
      );
    },
    bet: (chips: number) => {
      sendSocketCommand(
        {
          channelCommand: 'makeEngineCommand',
          engineCommand: 'bet',
          chips: chips
        },
        'Betting'
      );
    },
  };

  return {
    state,
    isConnected,
    reconnectAttempt,
    connectionFailed,
    maxReconnects: MAX_RECONNECTS,
    commands,
  };
}
```

`maxReconnects` is returned so the disconnection overlay can display "attempt N of M" without `RoomClient` re-declaring the constant.

- [ ] **Step 4: Reduce RoomClient to layout**

Replace the full contents of `src/app/room/[gameId]/RoomClient.tsx`:

```tsx
'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useUser } from '@auth0/nextjs-auth0';
import { useEffect, useState } from 'react';

import Cards from './Cards';
import Chips from './Chips';
import Seat from './Seat';
import BetButtons from './BetButtons';
import SitButtons from './SitButtons';
import LoadingScreen from '@/app/components/LoadingScreen';
import { useGameSocket } from './useGameSocket';

const cardsPositions: string = 'left-[50%] top-[35%]';

const chipAreaSize: string = 'w-[16%] h-[5%]';
const chipAreaPositions: string = 'left-[50%] top-[50%]';

export default function RoomClient() {
  const { user, error, isLoading } = useUser();
  const params = useParams();
  const searchParams = useSearchParams();
  const shouldStartEngine = searchParams.get('startEngine') === 'true';

  const {
    state,
    isConnected,
    reconnectAttempt,
    connectionFailed,
    maxReconnects,
    commands,
  } = useGameSocket(params.gameId as string, shouldStartEngine);

  const [mySeatId, setMySeatId] = useState<number | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Find seat in an effect, not during render
  useEffect(() => {
    if (!state || !user || mySeatId !== null) return;
    for (const [seatId, player] of Object.entries(state.players)) {
      if (player.user === user.sub) {
        setMySeatId(Number(seatId));
        break;
      }
    }
  }, [state, user, mySeatId]);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>{error.message}</div>;
  if (!user) return <div>Please login to access this page.</div>;
  if (!state) return <LoadingScreen />;

  return (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full max-h-[calc(100vw*3/4)] max-w-[calc(100vh*4/3)] aspect-[4/3]">
      <button
        className="absolute top-[2%] left-[86%] text-white dynamic-text opacity-60 hover:opacity-100 transition-opacity"
        onClick={() => {
          navigator.clipboard.writeText(params.gameId as string);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? 'Copied!' : 'Copy room ID'}
      </button>
      <div className="absolute top-[45%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[80%] h-[60%] bg-green-800 rounded-[50%_50%_50%_50%]" />
      <Cards position={cardsPositions} cards={state.communityCards} />
      <Chips size={chipAreaSize} position={chipAreaPositions} amount={state.collectedPot} dealer={false} />
      {[...Array(9)].map((_, index) => (
        <Seat key={index} seatId={index} player={state.players[index]} />
      ))}
      {mySeatId !== null && (
        <>
          <SitButtons
            addChips={commands.addChips}
            sitIn={commands.sitIn}
            sitOut={commands.sitOut}
            leave={commands.leave}
            sittingOut={state.players[mySeatId].sittingOut}
          />
          {state.players[mySeatId].spotlight && (
            <BetButtons
              fold={commands.fold}
              check={commands.check}
              call={commands.call}
              bet={commands.bet}
              pot={state.pot}
              collectedPot={state.collectedPot}
              currentBet={state.currentBet}
              minRaise={state.minRaise}
              chips={state.players[mySeatId].chips}
              chipsInPot={state.players[mySeatId].chipsInPot}
            />
          )}
        </>
      )}
      {shouldStartEngine && state.gameStopped && (
        <div className="absolute w-[40%] left-1/2 top-[25%] transform -translate-x-1/2 -translate-y-1/2 text-white rounded-lg text-center">
          <button
            className="bg-blue-600 w-[full] py-[5%] px-[5%] rounded-md hover:bg-blue-500 dynamic-text-lg"
            onClick={commands.startGame}
          >
            Start game
          </button>
        </div>
      )}

      {(!isConnected || connectionFailed) && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-8 text-white text-center max-w-sm w-full mx-4">
            {connectionFailed ? (
              <>
                <p className="text-xl font-bold mb-2">Unable to Reconnect</p>
                <p className="text-gray-300">Returning you to the home page...</p>
              </>
            ) : (
              <>
                <p className="text-xl font-bold mb-2">Connection Lost</p>
                <p className="text-gray-300">
                  Reconnecting... (attempt {reconnectAttempt} of {maxReconnects})
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

The `message` state variable is renamed `state` throughout. `Player` and `State` no longer live here — `Seat.tsx` imports from `./types` as of Step 2.

- [ ] **Step 5: Confirm the line count dropped**

```bash
wc -l "src/app/room/[gameId]/RoomClient.tsx" "src/app/room/[gameId]/useGameSocket.ts" "src/app/room/[gameId]/types.ts"
```

Expected: `RoomClient.tsx` around 120 lines, down from 347.

- [ ] **Step 6: Verify**

```bash
rm -rf .next
npm run build 2>&1 | tail -30
npm run lint 2>&1 | tail -20
npx tsc --noEmit 2>&1 | tail -20
```

Expected: all PASS. A "Player is not exported from ./RoomClient" error means Step 2 was skipped.

- [ ] **Step 7: Commit**

```bash
git add "src/app/room/[gameId]/"
git commit -m "$(cat <<'EOF'
Extract the WebSocket lifecycle into useGameSocket

Moves connection, reconnection, both lifecycle guards, and the
command senders out of the room component. RoomClient drops from
347 lines to roughly 120 and now handles layout only. State and
Player move to types.ts.

The stale-socket identity guard and the unmount guard are moved
verbatim, not rewritten; they encode races that are not obvious
from reading the code cold.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Verification

**Files:** none — this task changes no code.

**Interfaces:**
- Consumes: everything from Tasks 1–5
- Produces: a truthful completion report

**This task is blocking.** Tasks 1–5 passing their builds does **not** mean the game works. The Auth0 provider change and the socket extraction can each break gameplay while compiling perfectly.

- [ ] **Step 1: Full automated sweep**

```bash
cd /Users/challenger/prog/poker-frontend
rm -rf .next
npm run build 2>&1 | tail -20
npm run lint 2>&1 | tail -20
npx tsc --noEmit 2>&1 | tail -20
npm audit 2>&1 | tail -10
```

Expected: build, lint, and tsc PASS; audit reports zero critical and zero high.

- [ ] **Step 2: Review the complete diff**

```bash
git diff main...HEAD --stat
git diff main...HEAD
```

Read every changed line. Confirm both socket guards survived the move to `useGameSocket.ts` intact.

- [ ] **Step 3: Start the backing services**

The room is unusable without Redis, the Go engine on `:8080`, and Django on `:8000`. The workspace root has `run-servers.sh`:

```bash
cat /Users/challenger/prog/poker-workspace/run-servers.sh
```

Read it first, then start the services as it prescribes. If they cannot be started in this environment, **stop and report that** — do not mark the remaining steps done.

- [ ] **Step 4: Manual smoke test**

Run `npm run dev` and work through the list. Record the actual result of each — not an assumption.

1. Log in via Auth0; redirect returns to an authenticated home page
2. Create Game; engine starts and the room is joined
3. A second browser session joins by room ID
4. Start a hand; cards deal, bet buttons appear only on spotlight
5. Play a hand to completion; pot awards and a new hand starts
6. Kill the backend mid-hand; the reconnect overlay appears and recovers
7. Log out; session clears

Step 6 specifically exercises the guards moved in Task 5. Step 1 specifically exercises the `proxy.ts` rename from Task 2 — if login fails, revert Task 2's commit alone and retest before investigating anything else.

- [ ] **Step 5: Report**

State plainly which checks ran and what they returned. Any smoke-test step not executed is reported as **not executed** — never as passing. If the manual pass could not run at all, the work is reported as "builds clean, gameplay unverified," not as complete.

---

## Rollback

Each task is one commit, so any layer can be reverted alone:

```bash
git log --oneline main..HEAD
git revert <sha>
```

Most likely candidate: Task 2's `proxy.ts` rename, if Auth0 login breaks. Next 16 still supports `middleware.ts`, so reverting that single commit restores the documented Auth0 setup while keeping every other improvement.
