# Chat Widget & Action Log Feed — Design

**Date:** 2026-07-24
**Repos touched:** `poker-frontend` (majority), `poker-backend` (chat transport, sequence numbers)
**Repos untouched:** `poker-engine` — the event vocabulary it emits is already sufficient

## Problem

The engine emits a full hand narrative as `GameEvent`s, and the backend already accumulates them
per-room in `hand_log.py` and ships them to every client as `state.actionLog`. Nothing on the
frontend declares or renders that field, so the work is invisible. Separately, players have no way
to talk to each other.

Both are the same UI surface: a feed of what is happening at the table.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Presentation | One merged feed, chronologically interleaving actions and chat | Matches PokerStars/GG. One scroll position, and chat reads in the context of the hand it responds to |
| Scrollback | Client accumulates across hands, capped at 200 entries | `hand_log` resets on `handEnd`, so a per-hand-only feed would erase chat every hand and make conversation unusable |
| Speaker labels | Truncated Auth0 `sub` via the existing `formatDisplayName` | Consistent with what seats already display; zero new identity plumbing |
| Placement | Fixed panel docked to the viewport's left edge, overlaying the table | The 4:3 box has no free corners, and its sizing math is viewport-relative (see Layout constraint below) |
| Guardrails | 200-char cap and a 5-per-5s rate limit, both server-side | Chat is the first server-accepted free-form input in the app |

Explicitly **not** doing: seated-players-only chat (would require the backend to cache seating it
does not currently track), client-supplied nicknames (spoofable, and no help for the
engine-generated half of the feed), server-side chat history replay for late joiners.

## Protocol

### Inbound (new)

```jsonc
{ "channelCommand": "sendChat", "text": "nice hand" }
```

The client never sends a sender. `PlayerConsumer` stamps `scope['user'].get_user()`, so chat
identity is server-trusted exactly like every engine command.

### Outbound discrimination

Today `socket.onmessage` assumes every frame is game state (`JSON.parse(data).event`). With two
payload types that assumption has to become explicit. Both payloads carry a `kind`, set Python-side
so the Go engine needs no changes:

```jsonc
// state broadcast — EngineConsumer.send_state sets kind
{
  "type": "send.message",
  "event": { "kind": "state", "pot": 13, "actionLog": [...], "players": {...}, ... }
}

// chat broadcast — new
{
  "type": "chat.message",
  "event": { "kind": "chat", "user": "auth0|668…", "text": "nice hand", "timestamp": 1753… }
}
```

## Backend changes (`poker-backend`)

### `poker/chat.py` (new)

Validation and throttling live here, separate from the consumer, so they are unit-testable without
a live WebSocket.

- `validate_chat_text(text)` — returns `(cleaned_text, None)` on success or `(None, error_message)`
  on rejection; it never raises, so the consumer has one branch to write. It strips surrounding
  whitespace first, then rejects empty/whitespace-only text, then rejects text whose *stripped*
  length exceeds `MAX_CHAT_LENGTH = 200`. A non-string or missing `text` field is a rejection, not
  a crash.
- `RateLimiter` — per-connection deque of send timestamps. `CHAT_RATE_LIMIT = 5` messages per
  `CHAT_RATE_WINDOW = 5.0` seconds.

Rejection is **not** silent. It replies `{"error": "..."}` to that one connection. This departs
deliberately from the app's usual "a rejected command produces no message at all" convention:
engine commands are re-derivable from the next broadcast, but a dropped chat message is a thing the
player typed that would otherwise vanish with no explanation.

### `poker/consumers.py`

- `PlayerConsumer.handle_chat`, registered under `'sendChat'` in `command_handlers`. Validates,
  rate-limits, then `group_send`s with type `chat.message`.
- `PlayerConsumer.chat_message`, the channel-layer handler, which simply `send_json`s the payload.
  It does **not** route through `send_message` — there is no `deepcopy` and no card redaction,
  because there are no cards in a chat payload.
- `PlayerConsumer` instantiates one `RateLimiter` per connection in `connect`.
- `EngineConsumer.send_state` sets `event['kind'] = 'state'`.

### `poker/hand_log.py`

Add a per-room monotonic sequence counter. Each event is stamped with `seq` in `append()` *before*
being extended into the log, so a given event keeps the same `seq` across every snapshot that
contains it. The counter does not reset at hand boundaries even though the log does; `clear()`
pops it along with the log.

This is what makes client-side accumulation reliable. Every state broadcast carries the whole
current hand, so the client takes `seq > lastSeq` rather than trying to diff by list length (which
breaks at the hand boundary when the log resets to `[]`) or by timestamp (two clocks — see
Ordering below).

## Frontend changes (`poker-frontend`)

### New files in `src/app/room/[gameId]/`

**`feed.ts`** — types and pure accumulation. No React, no JSX; this is the logic-bearing core.

```ts
export type FeedEntry =
  | { kind: 'action'; seq: number; type: string; user?: string; amount?: number;
      allIn?: boolean; blind?: string; cards?: Card[]; board?: Card[];
      street: string; handNumber: number; timestamp: number }
  | { kind: 'chat'; id: number; user: string; text: string; timestamp: number }
  | { kind: 'system'; id: number; text: string };

export const MAX_FEED_ENTRIES = 200;
export function newActionEntries(actionLog: ActionLogEntry[], lastSeq: number): ActionEntry[];
export function appendEntries(feed: FeedEntry[], entries: FeedEntry[]): FeedEntry[];
```

`appendEntries` caps the result at `MAX_FEED_ENTRIES`, dropping from the front. Chat and system
entries carry a client-assigned monotonic `id` for React keys, since neither has a server `seq`.

**`formatFeed.tsx`** — pure switch mapping one entry to one React node.

**`FeedEntry.tsx`** — renders a single row.

**`Feed.tsx`** — the docked panel: collapse toggle, scroll container, chat input form.

### `useGameSocket.ts`

Gains `feed: FeedEntry[]` and `commands.sendChat(text)`.

Accumulation happens inside `socket.onmessage`, not in a `useEffect` keyed on `state`. It is an
event, not derived state, and doing it in an effect exposes it to strict-mode double-invocation.
A `lastSeqRef` tracks the high-water mark; the `seq` dedupe makes the operation idempotent
regardless.

Unrecognized frames — anything without a `kind` this client knows, including the bare
`{"error": ...}` from `handle_unknown_type` — are ignored rather than parsed as state.

New command sender follows the existing convention in this file: payload object literals stay
multi-line, one property per line.

### Rendering rules

| Event type | Renders as |
|---|---|
| `handStart` | separator — `── Hand #12 · blinds 1/2 ──` |
| `postBlind` | `66820bf8b posts small blind 1` |
| `dealHoleCards` | **only the viewer's own** — `You were dealt A♠ K♦` |
| `fold` | `66820bf8b folds` |
| `check` | `66820bf8b checks` |
| `call` | `66820bf8b calls 4` |
| `bet` | `66820bf8b bets 8` |
| `raise` | `66820bf8b raises to 6` |
| `dealStreet` | separator — `── Flop: A♠ 7♦ 2♣ ──`, street name from `entry.street` |
| `showdown` | `66820bf8b shows A♠ K♦ — Two Pair` |
| `win` | `66820bf8b wins 13` |
| `handEnd` | nothing — `handStart` already provides the boundary |
| unknown | skipped silently |

`call`, `bet`, and `raise` append ` (all in)` when `entry.allIn` is set.

Other players' `dealHoleCards` arrive redacted as `["xx", "xx"]` (the backend's existing
per-recipient masking in `send_message`), so rendering them would produce a row of noise per
opponent per hand. Only the viewer's own is shown. Skipping unknown types means a future engine
event cannot break the client.

`Amount` semantics come from the engine and are already documented on `GameEvent`: `bet`/`raise`
is the total in the pot for that street ("raises to X"), `call` is chips added, `postBlind`/`win`
are the actual amounts.

### Ordering

Entries append in **arrival order, not timestamp order**. Engine timestamps come from Go
(`time.Now().UnixMilli()`) and chat timestamps from Python; sorting across two unsynchronized
clocks would make the feed jitter.

### Shared display name

`formatDisplayName` currently lives inside `PlayerInfo.tsx`. Move it to a shared module and import
it in both `PlayerInfo.tsx` and the feed, rather than duplicating it.

### `types.ts`

Add `actionLog: ActionLogEntry[]` and `kind: 'state'` to `State`, plus the `ActionLogEntry`
interface mirroring the engine's `GameEvent` wire shape.

### Layout constraint

The panel is `fixed` to the viewport's left edge and **overlays** the table rather than reflowing
it. This is forced, not preferred: the table's `max-h-[calc(100vw*3/4)]` and
`max-w-[calc(100vh*4/3)]` constraints are computed against *viewport* units, so placing the table
inside a narrowed flex container would silently break its aspect ratio math.

The panel defaults open at ≥1024px and collapsed below, held in component state only.

Auto-scroll sticks to the bottom only when the user is already at the bottom, so scrolling back
through a hand does not get yanked away by the next engine tick.

The panel uses ordinary Tailwind sizing and text scale — it is a sibling of the table box, not a
child, so the `dynamic-text` / percentage-positioning system does not apply to it.

## Bug fixed incidentally

`handle_unknown_type` already replies `{"error": ...}` with no `event` key. The current
`socket.onmessage` does `JSON.parse(data).event` unconditionally, yielding `undefined`, calling
`setState(undefined)`, and stranding the client on `LoadingScreen` permanently. The `kind`
discrimination this design introduces makes such frames get ignored, so the bug disappears as a
direct consequence of the feature rather than as unrelated refactoring.

## Testing

### Backend — real tests, pure pytest, no running stack

`poker/test_chat.py`:
- `validate_chat_text` trims surrounding whitespace and returns `(cleaned, None)`
- rejects empty and whitespace-only text, returning `(None, message)`
- rejects text longer than 200 characters
- accepts text of exactly 200 characters
- accepts 200 characters padded with whitespace, since the cap applies after stripping
- rejects a missing or non-string `text` without raising
- `RateLimiter` allows 5 messages inside the window
- `RateLimiter` blocks the 6th
- `RateLimiter` recovers after the window elapses

`poker/test_hand_log.py`:
- `seq` is monotonic across successive `append` calls
- `seq` continues incrementing across the `handEnd` reset rather than restarting
- an event retains the same `seq` across every snapshot containing it
- `clear()` resets the counter along with the log

### Frontend — no automated tests

The frontend has no test suite (stated in its `CLAUDE.md`), and standing up Vitest or Jest on
Next 15 is a larger change than this feature. This is a deliberate, flagged gap: `newActionEntries`
dedupe ships verified only by hand. The logic is isolated in pure functions in `feed.ts`
specifically so tests are cheap to add later.

### Manual verification

Full stack (Redis, Go engine, Django backend, `npm run dev`), two browsers with different users:

1. Play a hand — actions appear in the feed as they happen, in order
2. Chat from both browsers — messages interleave with actions in the same stream
3. Privacy — browser A never sees browser B's `dealHoleCards`; both see showdown cards
4. Send 250 characters, then 10 messages rapidly — both rejections surface as system entries
5. Play through a hand boundary — scrollback survives, nothing duplicates, `seq` dedupe holds
6. Collapse and reopen the panel; confirm the table is unaffected underneath

## Out of scope

- Persisting chat (`hand_log.persist_hand` remains the unimplemented hook it is today)
- Chat history replay for players who join or refresh mid-session
- Private/whisper messages, emotes, moderation tooling
- Changing which players' hands are revealed at showdown — the engine currently emits a `showdown`
  event for every player still in the hand, and the feed reflects that as-is
