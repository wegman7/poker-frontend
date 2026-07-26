# Chat Widget & Action Log Feed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a docked side panel showing one merged, chronological feed of engine action-log entries and player chat, with a chat input.

**Architecture:** The Go engine already emits a full hand narrative and the Django backend already accumulates it per-room in `hand_log.py` and ships it as `state.actionLog` — no engine changes. The backend gains a `sendChat` command (server-stamped sender, validated, rate-limited) and stamps a monotonic `seq` on each log event. The frontend discriminates the two inbound payload types by a new `kind` field, accumulates a capped feed client-side using `seq` to dedupe, and renders it in a fixed panel.

**Tech Stack:** Django 4.2 + Channels 4.1 (backend, `unittest.TestCase` + `IsolatedAsyncioTestCase` under pytest 8.1), Next.js 15 + React 19 + TypeScript + Tailwind (frontend, no test suite).

**Spec:** `poker-frontend/docs/superpowers/specs/2026-07-24-chat-and-action-log-design.md`

## Global Constraints

- Two separate git repos. `poker-backend` and `poker-frontend` are siblings under `poker-workspace/` and are committed independently. Never try to commit across both.
- **Commit message style differs per repo.** `poker-backend` uses conventional prefixes (`feat:`, `chore:`, `fix:`). `poker-frontend` uses plain imperative subjects with no prefix (e.g. "Extract the WebSocket lifecycle into useGameSocket"). Match the repo you are in.
- `MAX_CHAT_LENGTH = 200`, `CHAT_RATE_LIMIT = 5`, `CHAT_RATE_WINDOW = 5.0` seconds. Exact values.
- `MAX_FEED_ENTRIES = 200`.
- The engine (`poker-engine`) is **not modified by any task in this plan**.
- Frontend payload object literals passed to `sendSocketCommand` stay multi-line, one property per line — an existing deliberate convention in `useGameSocket.ts`.
- Frontend font sizing inside the 4:3 table box uses the `dynamic-text` / `dynamic-text-lg` / `dynamic-text-xl` classes, never Tailwind's `text-*` scale. **The feed panel is exempt** — it is a sibling of the table box, not a child, and uses ordinary Tailwind sizing.
- Backend tests run from `poker-backend/` with the venv: `.venv/bin/python -m pytest`. Tasks 1 and 2 need no running services. Task 3's tests need the full stack (Redis + Go engine + Django) and `export $(cat .env | xargs)` first.
- Frontend has no test runner. Its verification is `npm run lint` and `npx tsc --noEmit`.

---

## File Structure

### `poker-backend`

| File | Responsibility |
|---|---|
| `poker/hand_log.py` | **Modify** — add per-room monotonic `seq` stamping |
| `poker/test_hand_log.py` | **Modify** — add `seq` tests to the existing `TestHandLog` class |
| `poker/chat.py` | **Create** — `validate_chat_text` and `RateLimiter`. Pure, no Django, no I/O |
| `poker/test_chat_validation.py` | **Create** — pure unit tests for `chat.py`, no running stack |
| `poker/consumers.py` | **Modify** — `sendChat` handler, `chat.message` channel handler, `kind` on state |
| `poker/test_chat.py` | **Create** — live-stack integration tests, following `test_action_log.py` |

### `poker-frontend` — all under `src/app/room/[gameId]/`

| File | Responsibility |
|---|---|
| `types.ts` | **Modify** — add `ActionLogEntry`, add `kind` and `actionLog` to `State` |
| `feed.ts` | **Create** — feed entry types + pure accumulation. No React, no JSX |
| `displayName.ts` | **Create** — `formatDisplayName`, extracted from `PlayerInfo.tsx` |
| `PlayerInfo.tsx` | **Modify** — import `formatDisplayName` instead of defining it |
| `formatFeed.tsx` | **Create** — pure mapping of one action entry to one React node |
| `FeedEntry.tsx` | **Create** — renders a single feed row |
| `Feed.tsx` | **Create** — the docked panel: collapse toggle, scroll container, chat form |
| `useGameSocket.ts` | **Modify** — payload discrimination, feed accumulation, `sendChat` |
| `RoomClient.tsx` | **Modify** — render `<Feed>` outside the transformed table box |

---

## Task 1: Sequence numbers on hand-log events

Client-side feed accumulation needs a stable per-event identity. Length-diffing breaks at the hand boundary (the log resets to `[]`) and timestamp-diffing is unreliable (engine timestamps come from Go, chat from Python). A per-room monotonic counter that does **not** reset when the log does solves both.

**Files:**
- Modify: `poker-backend/poker/hand_log.py`
- Test: `poker-backend/poker/test_hand_log.py` (exists — add to the existing `TestHandLog` class)

**Interfaces:**
- Consumes: nothing
- Produces: every dict returned by `hand_log.append(room, events)` carries an `int` key `seq`, unique and increasing within a room, never reset by the `handEnd` rollover, reset only by `hand_log.clear(room)`.

- [ ] **Step 1: Write the failing tests**

Append to the `TestHandLog` class in `poker-backend/poker/test_hand_log.py`. Note `setUp` already calls `hand_log.clear` for both rooms, which will reset the new counter too.

```python
    def test_seq_is_monotonic_across_appends(self):
        hand_log.append('room-a', [{'type': 'handStart'}, {'type': 'postBlind'}])
        log = hand_log.append('room-a', [{'type': 'fold'}])
        self.assertEqual([e['seq'] for e in log], [1, 2, 3])

    def test_seq_continues_across_hand_end_reset(self):
        with patch.object(hand_log, 'persist_hand'):
            hand_log.append('room-a', [{'type': 'handStart'}, {'type': 'handEnd'}])
        log = hand_log.append('room-a', [{'type': 'handStart'}])
        self.assertEqual(hand_log.current('room-a'), log)
        self.assertEqual([e['seq'] for e in log], [3])

    def test_event_keeps_same_seq_across_snapshots(self):
        first = hand_log.append('room-a', [{'type': 'handStart'}])
        seq_before = first[0]['seq']
        second = hand_log.append('room-a', [{'type': 'fold'}])
        self.assertEqual(second[0]['seq'], seq_before)

    def test_clear_resets_the_seq_counter(self):
        hand_log.append('room-a', [{'type': 'handStart'}])
        hand_log.clear('room-a')
        log = hand_log.append('room-a', [{'type': 'handStart'}])
        self.assertEqual(log[0]['seq'], 1)

    def test_seq_counters_are_isolated_per_room(self):
        hand_log.append('room-a', [{'type': 'handStart'}, {'type': 'fold'}])
        log_b = hand_log.append('room-b', [{'type': 'handStart'}])
        self.assertEqual(log_b[0]['seq'], 1)
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
cd poker-backend && .venv/bin/python -m pytest poker/test_hand_log.py -v
```

Expected: the five new tests FAIL with `KeyError: 'seq'`. The five pre-existing tests still PASS.

- [ ] **Step 3: Implement the counter**

In `poker-backend/poker/hand_log.py`, add the module-level dict next to `_current_hands`:

```python
# room_name -> ordered list of engine event dicts for the hand in progress
_current_hands = {}

# room_name -> monotonically increasing event counter. Deliberately NOT reset
# when a hand ends, so clients can dedupe accumulated events by seq even though
# _current_hands rolls over on every handEnd.
_seq_counters = {}
```

Replace the body of `append` with:

```python
def append(room_name, events):
    """Feed engine event deltas into the room's current-hand log.

    Each new event is stamped with a per-room monotonic ``seq`` before being
    added, so an event keeps the same seq in every snapshot that contains it.

    Returns a snapshot of the accumulated log including the new events. When
    the delta contains a handEnd event, the completed hand is handed to
    persist_hand and the room's log resets for the next hand.
    """
    log = _current_hands.setdefault(room_name, [])
    seq = _seq_counters.get(room_name, 0)
    for event in events:
        seq += 1
        event['seq'] = seq
    _seq_counters[room_name] = seq
    log.extend(events)
    snapshot = list(log)
    if any(event.get('type') == 'handEnd' for event in events):
        persist_hand(room_name, snapshot)
        _current_hands[room_name] = []
    return snapshot
```

And update `clear`:

```python
def clear(room_name):
    _current_hands.pop(room_name, None)
    _seq_counters.pop(room_name, None)
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
cd poker-backend && .venv/bin/python -m pytest poker/test_hand_log.py -v
```

Expected: all 10 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd poker-backend
git add poker/hand_log.py poker/test_hand_log.py
git commit -m "feat: stamp monotonic seq on hand log events"
```

---

## Task 2: Chat validation and rate limiting

These live in their own module rather than inside the consumer so they can be tested without a WebSocket, a channel layer, or Redis.

**Files:**
- Create: `poker-backend/poker/chat.py`
- Test: `poker-backend/poker/test_chat_validation.py`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `MAX_CHAT_LENGTH = 200`, `CHAT_RATE_LIMIT = 5`, `CHAT_RATE_WINDOW = 5.0`
  - `validate_chat_text(text) -> tuple[str | None, str | None]` — returns `(cleaned, None)` on success or `(None, error_message)` on rejection. Never raises.
  - `RateLimiter(limit=CHAT_RATE_LIMIT, window=CHAT_RATE_WINDOW, clock=time.monotonic)` with `allow() -> bool`. `allow()` records the send when it returns `True` and records nothing when it returns `False`.

- [ ] **Step 1: Write the failing tests**

Create `poker-backend/poker/test_chat_validation.py`:

```python
from unittest import TestCase

from poker import chat


class TestValidateChatText(TestCase):
    def test_strips_surrounding_whitespace(self):
        cleaned, error = chat.validate_chat_text('  nice hand  ')
        self.assertEqual(cleaned, 'nice hand')
        self.assertIsNone(error)

    def test_rejects_empty_text(self):
        cleaned, error = chat.validate_chat_text('')
        self.assertIsNone(cleaned)
        self.assertTrue(error)

    def test_rejects_whitespace_only_text(self):
        cleaned, error = chat.validate_chat_text('   \n\t  ')
        self.assertIsNone(cleaned)
        self.assertTrue(error)

    def test_accepts_text_of_exactly_max_length(self):
        cleaned, error = chat.validate_chat_text('a' * chat.MAX_CHAT_LENGTH)
        self.assertEqual(cleaned, 'a' * chat.MAX_CHAT_LENGTH)
        self.assertIsNone(error)

    def test_rejects_text_over_max_length(self):
        cleaned, error = chat.validate_chat_text('a' * (chat.MAX_CHAT_LENGTH + 1))
        self.assertIsNone(cleaned)
        self.assertTrue(error)

    def test_cap_applies_after_stripping(self):
        padded = '  ' + 'a' * chat.MAX_CHAT_LENGTH + '  '
        cleaned, error = chat.validate_chat_text(padded)
        self.assertEqual(cleaned, 'a' * chat.MAX_CHAT_LENGTH)
        self.assertIsNone(error)

    def test_rejects_non_string_without_raising(self):
        for value in (None, 42, {'text': 'hi'}, ['hi']):
            cleaned, error = chat.validate_chat_text(value)
            self.assertIsNone(cleaned)
            self.assertTrue(error)


class FakeClock:
    """Hand-advanced clock so the window test needs no real sleeping."""

    def __init__(self):
        self.now = 0.0

    def __call__(self):
        return self.now

    def advance(self, seconds):
        self.now += seconds


class TestRateLimiter(TestCase):
    def setUp(self):
        self.clock = FakeClock()
        self.limiter = chat.RateLimiter(clock=self.clock)

    def test_allows_up_to_the_limit_inside_the_window(self):
        for _ in range(chat.CHAT_RATE_LIMIT):
            self.assertTrue(self.limiter.allow())

    def test_blocks_the_message_after_the_limit(self):
        for _ in range(chat.CHAT_RATE_LIMIT):
            self.limiter.allow()
        self.assertFalse(self.limiter.allow())

    def test_blocked_attempts_do_not_extend_the_window(self):
        for _ in range(chat.CHAT_RATE_LIMIT):
            self.limiter.allow()
        self.clock.advance(chat.CHAT_RATE_WINDOW / 2)
        self.assertFalse(self.limiter.allow())
        self.clock.advance(chat.CHAT_RATE_WINDOW / 2)
        self.assertTrue(self.limiter.allow())

    def test_recovers_after_the_window_elapses(self):
        for _ in range(chat.CHAT_RATE_LIMIT):
            self.limiter.allow()
        self.assertFalse(self.limiter.allow())
        self.clock.advance(chat.CHAT_RATE_WINDOW)
        for _ in range(chat.CHAT_RATE_LIMIT):
            self.assertTrue(self.limiter.allow())

    def test_limiters_are_independent(self):
        other = chat.RateLimiter(clock=self.clock)
        for _ in range(chat.CHAT_RATE_LIMIT):
            self.limiter.allow()
        self.assertFalse(self.limiter.allow())
        self.assertTrue(other.allow())
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
cd poker-backend && .venv/bin/python -m pytest poker/test_chat_validation.py -v
```

Expected: collection error — `ImportError: cannot import name 'chat' from 'poker'`.

- [ ] **Step 3: Implement `chat.py`**

Create `poker-backend/poker/chat.py`:

```python
"""Validation and throttling for player chat.

Kept free of Django and I/O so it can be unit tested without a WebSocket,
a channel layer, or Redis.
"""

import time
from collections import deque

MAX_CHAT_LENGTH = 200
CHAT_RATE_LIMIT = 5
CHAT_RATE_WINDOW = 5.0


def validate_chat_text(text):
    """Clean and check one chat message.

    Returns (cleaned_text, None) on success or (None, error_message) on
    rejection. Never raises — the caller has exactly one branch to write.
    The length cap is applied to the stripped text.
    """
    if not isinstance(text, str):
        return None, 'Chat message must be text.'
    cleaned = text.strip()
    if not cleaned:
        return None, 'Chat message cannot be empty.'
    if len(cleaned) > MAX_CHAT_LENGTH:
        return None, f'Chat message cannot exceed {MAX_CHAT_LENGTH} characters.'
    return cleaned, None


class RateLimiter:
    """Sliding-window throttle. One instance per connection.

    The clock is injectable so tests can advance it instead of sleeping.
    """

    def __init__(self, limit=CHAT_RATE_LIMIT, window=CHAT_RATE_WINDOW, clock=time.monotonic):
        self._limit = limit
        self._window = window
        self._clock = clock
        self._sends = deque()

    def allow(self):
        """Return True and record the send, or return False and record nothing."""
        now = self._clock()
        while self._sends and now - self._sends[0] >= self._window:
            self._sends.popleft()
        if len(self._sends) >= self._limit:
            return False
        self._sends.append(now)
        return True
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
cd poker-backend && .venv/bin/python -m pytest poker/test_chat_validation.py -v
```

Expected: all 12 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd poker-backend
git add poker/chat.py poker/test_chat_validation.py
git commit -m "feat: add chat text validation and per-connection rate limiting"
```

---

## Task 3: Wire chat into the consumers

**Files:**
- Modify: `poker-backend/poker/consumers.py`
- Test: `poker-backend/poker/test_chat.py`

**Interfaces:**
- Consumes: `chat.validate_chat_text`, `chat.RateLimiter` (Task 2)
- Produces the wire contract the frontend depends on:
  - Inbound: `{"channelCommand": "sendChat", "text": "..."}`
  - Chat broadcast: `{"type": "chat.message", "event": {"kind": "chat", "user": "<sub>", "text": "...", "timestamp": <ms int>}}`
  - State broadcast gains `event.kind == "state"`
  - Rejection: `{"error": "..."}` sent to the offending connection only, with no `event` key

**Note on the test:** chat needs no engine and no game, so unlike `test_action_log.py` these tests only connect two sockets and exchange messages. They still need Redis and Django running because they exercise the real channel layer.

- [ ] **Step 1: Write the failing tests**

Create `poker-backend/poker/test_chat.py`:

```python
import asyncio
import json
import os
import uuid
import websockets

from dotenv import load_dotenv
from unittest import IsolatedAsyncioTestCase

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '.env'))

from app.util.auth0_util import get_user_token

password = os.getenv('PASSWORD')
user1_token = get_user_token('user1@gmail.com', password)
user2_token = get_user_token('user2@gmail.com', password)


class TestChat(IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        random_room_name = uuid.uuid4()
        uri = f'ws://localhost:8000/ws/playerconsumer/{random_room_name}'
        self.websocket_user1 = await websockets.connect(uri + f'?token={user1_token}', close_timeout=100)
        self.websocket_user2 = await websockets.connect(uri + f'?token={user2_token}', close_timeout=100)

    async def asyncTearDown(self):
        await self.websocket_user1.close()
        await self.websocket_user2.close()

    async def _drain(self, websocket, seconds=0.6):
        """Collect every frame arriving on a socket for a fixed window."""
        received = []

        async def collect():
            try:
                while True:
                    received.append(json.loads(await websocket.recv()))
            except asyncio.CancelledError:
                pass

        task = asyncio.create_task(collect())
        await asyncio.sleep(seconds)
        task.cancel()
        await asyncio.gather(task, return_exceptions=True)
        return received

    def _chats(self, frames):
        return [f['event'] for f in frames if f.get('event', {}).get('kind') == 'chat']

    def _errors(self, frames):
        return [f['error'] for f in frames if 'error' in f]

    async def _send_chat(self, websocket, text, **extra):
        payload = {'channelCommand': 'sendChat', 'text': text}
        payload.update(extra)
        await websocket.send(json.dumps(payload))

    # --- Tests ---

    async def test_chat_reaches_every_player_in_the_room(self):
        listener = asyncio.create_task(self._drain(self.websocket_user2))
        await asyncio.sleep(0.1)
        await self._send_chat(self.websocket_user1, 'nice hand')
        chats = self._chats(await listener)

        assert len(chats) == 1, f"Expected exactly one chat frame, got {chats}"
        assert chats[0]['text'] == 'nice hand', f"Bad text: {chats[0]}"
        assert chats[0]['kind'] == 'chat', f"Bad kind: {chats[0]}"
        assert isinstance(chats[0]['timestamp'], int), f"Bad timestamp: {chats[0]}"

    async def test_sender_is_server_stamped_and_client_cannot_spoof_it(self):
        listener = asyncio.create_task(self._drain(self.websocket_user2))
        await asyncio.sleep(0.1)
        await self._send_chat(self.websocket_user1, 'hello', user='auth0|spoofed')
        chats = self._chats(await listener)

        assert len(chats) == 1, f"Expected exactly one chat frame, got {chats}"
        assert chats[0]['user'] != 'auth0|spoofed', f"Client spoofed the sender: {chats[0]}"
        assert chats[0]['user'].startswith('auth0|'), f"Bad sender: {chats[0]}"

    async def test_two_senders_are_distinguished(self):
        listener = asyncio.create_task(self._drain(self.websocket_user1, seconds=1.0))
        await asyncio.sleep(0.1)
        await self._send_chat(self.websocket_user1, 'from one')
        await asyncio.sleep(0.1)
        await self._send_chat(self.websocket_user2, 'from two')
        chats = self._chats(await listener)

        by_text = {c['text']: c['user'] for c in chats}
        assert set(by_text) == {'from one', 'from two'}, f"Missing messages: {chats}"
        assert by_text['from one'] != by_text['from two'], f"Senders collapsed: {chats}"

    async def test_oversize_message_is_rejected_and_not_broadcast(self):
        listener = asyncio.create_task(self._drain(self.websocket_user2))
        sender = asyncio.create_task(self._drain(self.websocket_user1))
        await asyncio.sleep(0.1)
        await self._send_chat(self.websocket_user1, 'a' * 201)

        assert self._chats(await listener) == [], "Oversize message was broadcast"
        assert self._errors(await sender), "Sender got no error for an oversize message"

    async def test_empty_message_is_rejected_and_not_broadcast(self):
        listener = asyncio.create_task(self._drain(self.websocket_user2))
        await asyncio.sleep(0.1)
        await self._send_chat(self.websocket_user1, '   ')

        assert self._chats(await listener) == [], "Empty message was broadcast"

    async def test_rate_limit_caps_a_burst_and_errors_the_excess(self):
        listener = asyncio.create_task(self._drain(self.websocket_user2, seconds=1.2))
        sender = asyncio.create_task(self._drain(self.websocket_user1, seconds=1.2))
        await asyncio.sleep(0.1)
        for i in range(8):
            await self._send_chat(self.websocket_user1, f'flood {i}')

        chats = self._chats(await listener)
        errors = self._errors(await sender)
        assert len(chats) == 5, f"Expected 5 messages through the limiter, got {len(chats)}"
        assert len(errors) == 3, f"Expected 3 rate-limit errors, got {len(errors)}"

    async def test_rate_limit_is_per_connection(self):
        listener = asyncio.create_task(self._drain(self.websocket_user2, seconds=1.2))
        await asyncio.sleep(0.1)
        for i in range(6):
            await self._send_chat(self.websocket_user1, f'flood {i}')
        await self._send_chat(self.websocket_user2, 'unaffected')

        texts = [c['text'] for c in self._chats(await listener)]
        assert 'unaffected' in texts, f"A second connection was throttled by the first: {texts}"

    async def test_state_broadcasts_are_tagged_as_state(self):
        listener = asyncio.create_task(self._drain(self.websocket_user1, seconds=1.5))
        await asyncio.sleep(0.1)
        await self.websocket_user1.send(json.dumps({
            'channelCommand': 'startEngine',
            'smallBlind': 1,
            'bigBlind': 2,
        }))
        await asyncio.sleep(0.7)
        await self.websocket_user1.send(json.dumps({
            'channelCommand': 'makeEngineCommand',
            'engineCommand': 'join',
            'seatId': 1,
        }))
        frames = await listener

        states = [f['event'] for f in frames
                  if f.get('event', {}).get('channelCommand') == 'sendState']
        assert states, "No state broadcast received"
        assert all(s.get('kind') == 'state' for s in states), \
            f"State broadcast missing kind: {states[0]}"

        await self.websocket_user1.send(json.dumps({
            'channelCommand': 'makeEngineCommand',
            'engineCommand': 'stopEngine',
        }))
```

- [ ] **Step 2: Start the stack, then run the tests to verify they fail**

In three terminals:

```bash
# Redis
redis-server

# Go engine
cd poker-engine && go run ./cmd/app -env=dev

# Django
cd poker-backend && source .venv/bin/activate && \
  DJANGO_SETTINGS_MODULE=app.settings.dev python manage.py runserver
```

Then:

```bash
cd poker-backend && export $(cat .env | xargs) && \
  .venv/bin/python -m pytest -s poker/test_chat.py -v
```

Expected: all 8 tests FAIL. The chat tests get no chat frames because `sendChat` falls through to `handle_unknown_type`; `test_state_broadcasts_are_tagged_as_state` fails on the missing `kind`.

- [ ] **Step 3: Implement the consumer changes**

In `poker-backend/poker/consumers.py`, extend the import at the top:

```python
from poker import chat, hand_log
```

In `PlayerConsumer.connect`, give each connection its own limiter. Add the line before `await self.accept()`:

```python
    async def connect(self):
        self.room_name = self.scope["url_route"]["kwargs"]["room_name"]
        PlayerConsumer._player_count[self.room_name] = PlayerConsumer._player_count.get(self.room_name, 0) + 1
        await self.channel_layer.group_add(self.room_name, self.channel_name)
        logger.info(f"Connecting user {self.scope['user'].get_user()} to room {self.room_name}...")
        self.chat_limiter = chat.RateLimiter()
        await self.accept()
```

Add both handlers to `PlayerConsumer`, next to `send_message`:

```python
    async def handle_chat(self, event):
        cleaned, error = chat.validate_chat_text(event.get('text'))
        if error:
            await self.send_json({'error': error})
            return
        if not self.chat_limiter.allow():
            await self.send_json({'error': 'You are sending messages too quickly.'})
            return
        await self.channel_layer.group_send(
            self.room_name,
            {
                "type": "chat.message",
                'event': {
                    'kind': 'chat',
                    'user': self.scope['user'].get_user(),
                    'text': cleaned,
                    'timestamp': int(time.time() * 1000),
                },
            }
        )

    async def chat_message(self, event):
        # Deliberately not routed through send_message: a chat payload has no
        # cards, so it needs neither the deepcopy nor the per-recipient masking.
        await self.send_json(event)
```

Register the command in `PlayerConsumer.command_handlers`:

```python
    @property
    def command_handlers(self):
        return {
            'sendMessageChannel': self.send_message_channel,
            'sendMessageGroup': self.send_message_group,
            'startEngine': self.start_engine,
            'makeEngineCommand': self.make_engine_command,
            'stopEngine': self.stop_engine,
            'sendChat': self.handle_chat
        }
```

In `EngineConsumer.send_state`, tag the payload so the client can discriminate it from chat. Add the `kind` line after the `actionLog` line:

```python
    async def send_state(self, event):
        EngineConsumer._last_state_at[self.room_name] = time.time()
        player_room = self.room_name.replace('-engine', '')
        engine_events = event.pop('events', None) or []
        event['actionLog'] = hand_log.append(player_room, engine_events)
        event['kind'] = 'state'
        await self.channel_layer.group_send(
            player_room,
            {
                "type": "send.message",
                "message": "broadcasting state...",
                'event': event
            }
        )
```

`time` and `hand_log` are already imported in this file; only `chat` is new.

- [ ] **Step 4: Run the tests to verify they pass**

```bash
cd poker-backend && export $(cat .env | xargs) && \
  .venv/bin/python -m pytest -s poker/test_chat.py -v
```

Expected: all 8 tests PASS.

- [ ] **Step 5: Run the existing backend tests to confirm nothing regressed**

```bash
cd poker-backend && export $(cat .env | xargs) && \
  .venv/bin/python -m pytest -s poker/test_action_log.py poker/test_hand_log.py \
  poker/test_chat_validation.py -v
```

Expected: all PASS. `test_action_log.py` asserts on `channelCommand`, not on the payload's full key set, so the added `kind` does not disturb it.

- [ ] **Step 6: Commit**

```bash
cd poker-backend
git add poker/consumers.py poker/test_chat.py
git commit -m "feat: broadcast player chat and tag state payloads with kind"
```

---

## Task 4: Frontend types and pure feed accumulation

No React in this task. `feed.ts` is the logic-bearing core of the frontend work, kept pure so it is verifiable by inspection now and cheap to unit test if the repo ever grows a test runner.

**Files:**
- Modify: `poker-frontend/src/app/room/[gameId]/types.ts`
- Create: `poker-frontend/src/app/room/[gameId]/feed.ts`

**Interfaces:**
- Consumes: the wire contract from Task 3
- Produces:
  - `ActionLogEntry` (from `types.ts`)
  - `FeedEntry = ActionEntry | ChatEntry | SystemEntry` where `ActionEntry = { kind: 'action'; entry: ActionLogEntry }`, `ChatEntry = { kind: 'chat'; id: number; user: string; text: string; timestamp: number }`, `SystemEntry = { kind: 'system'; id: number; text: string }`
  - `MAX_FEED_ENTRIES = 200`
  - `newActionEntries(actionLog: ActionLogEntry[] | null | undefined, lastSeq: number): ActionEntry[]`
  - `appendEntries(feed: FeedEntry[], entries: FeedEntry[]): FeedEntry[]`

The action entry **wraps** the raw log entry under `.entry` rather than spreading it, so an engine field can never collide with `kind` or `id`.

- [ ] **Step 1: Extend `types.ts`**

Replace the contents of `poker-frontend/src/app/room/[gameId]/types.ts`:

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

export interface ActionLogSeat {
  user: string;
  seatId: number;
  chips: number;
  dealer: boolean;
  sittingOut: boolean;
}

/** One entry in the hand narrative. Mirrors the engine's GameEvent wire shape,
 *  plus the `seq` the backend stamps in hand_log.py.
 *
 *  Amount semantics, per the engine: bet/raise is the total in the pot for the
 *  street ("raises to X"), call is chips added, postBlind/win are the actual
 *  amounts posted or won. */
export interface ActionLogEntry {
  seq: number;
  type: string;
  handNumber: number;
  street: string;
  timestamp: number;
  user?: string;
  amount?: number;
  allIn?: boolean;
  blind?: string;
  cards?: Card[];
  board?: Card[];
  seats?: ActionLogSeat[];
  smallBlind?: number;
  bigBlind?: number;
  handRank?: string;
}

export interface State {
  kind: 'state';
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
  actionLog: ActionLogEntry[] | null;
}

export interface ChatPayload {
  kind: 'chat';
  user: string;
  text: string;
  timestamp: number;
}
```

- [ ] **Step 2: Create `feed.ts`**

Create `poker-frontend/src/app/room/[gameId]/feed.ts`:

```ts
import type { ActionLogEntry } from './types';

export interface ActionEntry {
  kind: 'action';
  entry: ActionLogEntry;
}

export interface ChatEntry {
  kind: 'chat';
  id: number;
  user: string;
  text: string;
  timestamp: number;
}

export interface SystemEntry {
  kind: 'system';
  id: number;
  text: string;
}

export type FeedEntry = ActionEntry | ChatEntry | SystemEntry;

export const MAX_FEED_ENTRIES = 200;

/**
 * Pick the action-log entries this client has not seen yet.
 *
 * Every state broadcast carries the whole current hand, so entries are
 * deduped by the backend's monotonic `seq` rather than by list position —
 * position breaks at the hand boundary, where the log resets to [].
 *
 * If the highest seq in the log is BELOW lastSeq, the backend's counter
 * restarted (the engine process was restarted, which clears the room's log
 * and counter). Treat that as a fresh log instead of filtering everything out.
 */
export function newActionEntries(
  actionLog: ActionLogEntry[] | null | undefined,
  lastSeq: number
): ActionEntry[] {
  if (!actionLog || actionLog.length === 0) return [];
  const highestSeq = actionLog[actionLog.length - 1].seq;
  const effectiveLastSeq = highestSeq < lastSeq ? 0 : lastSeq;
  return actionLog
    .filter((entry) => entry.seq > effectiveLastSeq)
    .map((entry) => ({ kind: 'action', entry }));
}

/** Append to the feed, dropping the oldest entries past MAX_FEED_ENTRIES. */
export function appendEntries(feed: FeedEntry[], entries: FeedEntry[]): FeedEntry[] {
  if (entries.length === 0) return feed;
  const next = [...feed, ...entries];
  if (next.length <= MAX_FEED_ENTRIES) return next;
  return next.slice(next.length - MAX_FEED_ENTRIES);
}
```

- [ ] **Step 3: Verify it typechecks and lints**

```bash
cd poker-frontend && npx tsc --noEmit && npm run lint
```

Expected: no errors from `types.ts` or `feed.ts`. `RoomClient.tsx` and `useGameSocket.ts` are untouched here and still compile, because every field added to `State` is one they simply do not read yet.

- [ ] **Step 4: Commit**

```bash
cd poker-frontend
git add src/app/room/\[gameId\]/types.ts src/app/room/\[gameId\]/feed.ts
git commit -m "Add action log types and pure feed accumulation"
```

---

## Task 5: Feed rendering

**Files:**
- Create: `poker-frontend/src/app/room/[gameId]/displayName.ts`
- Create: `poker-frontend/src/app/room/[gameId]/formatFeed.tsx`
- Create: `poker-frontend/src/app/room/[gameId]/FeedEntry.tsx`
- Modify: `poker-frontend/src/app/room/[gameId]/PlayerInfo.tsx`

**Interfaces:**
- Consumes: `FeedEntry`, `ActionEntry` (Task 4); `ActionLogEntry`, `Card` (Task 4)
- Produces:
  - `formatDisplayName(sub: string): string` from `./displayName`
  - `formatActionEntry(entry: ActionLogEntry, myUser: string | undefined): ReactNode | null` — `null` means "render nothing for this event"
  - `isSeparator(entry: ActionLogEntry): boolean`
  - default-exported `FeedEntry` component taking `{ entry: FeedEntryType; myUser: string | undefined }`

- [ ] **Step 1: Extract `formatDisplayName`**

Create `poker-frontend/src/app/room/[gameId]/displayName.ts`:

```ts
/** Strip the Auth0 provider prefix and truncate the opaque ID. */
export const formatDisplayName = (sub: string) => {
  const sep = sub.indexOf('|');
  const id = sep >= 0 ? sub.slice(sep + 1) : sub;
  return id.slice(0, 10);
};
```

Replace the top of `poker-frontend/src/app/room/[gameId]/PlayerInfo.tsx` — delete the local definition and import it instead:

```tsx
import { formatDisplayName } from './displayName';

const PlayerInfo = ({ position, name, chips, spotlight }: { position: string, name: string, chips: number, spotlight: boolean }) => {
```

The rest of `PlayerInfo.tsx` is unchanged.

- [ ] **Step 2: Create `formatFeed.tsx`**

Create `poker-frontend/src/app/room/[gameId]/formatFeed.tsx`:

```tsx
import type { ReactNode } from 'react';

import type { ActionLogEntry, Card } from './types';
import { formatDisplayName } from './displayName';

// Same four-colour deck the table uses in Card.tsx, retuned for a dark panel.
const SUIT_GLYPHS: { [key: string]: string } = {
  h: '♥',
  d: '♦',
  c: '♣',
  s: '♠',
};

const SUIT_COLORS: { [key: string]: string } = {
  h: 'text-red-400',
  d: 'text-blue-400',
  c: 'text-green-400',
  s: 'text-gray-100',
};

/** Chip amounts arrive as float64. Render 100 as "100" and 1.50 as "1.5". */
const formatChips = (amount: number | undefined) =>
  amount === undefined ? '' : String(Number(amount.toFixed(2)));

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const FeedCards = ({ cards }: { cards: Card[] }) => (
  <span className="font-mono">
    {cards.map((card, index) => {
      if (card === 'xx') {
        return <span key={index} className="text-gray-500">?? </span>;
      }
      const rank = card.slice(0, -1);
      const suit = card.slice(-1);
      return (
        <span key={index} className={SUIT_COLORS[suit] ?? 'text-gray-100'}>
          {rank}{SUIT_GLYPHS[suit] ?? suit}{' '}
        </span>
      );
    })}
  </span>
);

/** Hand and street boundaries render as centred rules rather than log lines. */
export const isSeparator = (entry: ActionLogEntry) =>
  entry.type === 'handStart' || entry.type === 'dealStreet';

/**
 * Render one action-log entry. Returns null for entries that should not
 * appear at all — including unknown types, so a new engine event can never
 * break the client.
 */
export function formatActionEntry(
  entry: ActionLogEntry,
  myUser: string | undefined
): ReactNode | null {
  const who = entry.user ? formatDisplayName(entry.user) : '';
  const allIn = entry.allIn ? ' (all in)' : '';

  switch (entry.type) {
    case 'handStart':
      return `Hand #${entry.handNumber} · blinds ${formatChips(entry.smallBlind)}/${formatChips(entry.bigBlind)}`;

    case 'postBlind':
      return `${who} posts ${entry.blind} blind ${formatChips(entry.amount)}`;

    case 'dealHoleCards':
      // Other players' cards arrive masked as ["xx","xx"]; rendering a row of
      // "?? ??" per opponent per hand would be pure noise.
      if (!myUser || entry.user !== myUser || !entry.cards) return null;
      return <>You were dealt <FeedCards cards={entry.cards} /></>;

    case 'fold':
      return `${who} folds`;

    case 'check':
      return `${who} checks`;

    case 'call':
      return `${who} calls ${formatChips(entry.amount)}${allIn}`;

    case 'bet':
      return `${who} bets ${formatChips(entry.amount)}${allIn}`;

    case 'raise':
      return `${who} raises to ${formatChips(entry.amount)}${allIn}`;

    case 'dealStreet':
      return <>{capitalize(entry.street)}: <FeedCards cards={entry.cards ?? []} /></>;

    case 'showdown':
      return (
        <>
          {who} shows <FeedCards cards={entry.cards ?? []} />
          {entry.handRank ? `— ${entry.handRank}` : ''}
        </>
      );

    case 'win':
      return `${who} wins ${formatChips(entry.amount)}`;

    // handStart already provides the boundary, so handEnd renders nothing.
    case 'handEnd':
      return null;

    default:
      return null;
  }
}
```

- [ ] **Step 3: Create `FeedEntry.tsx`**

Create `poker-frontend/src/app/room/[gameId]/FeedEntry.tsx`:

```tsx
import type { FeedEntry as FeedEntryType } from './feed';
import { formatDisplayName } from './displayName';
import { formatActionEntry, isSeparator } from './formatFeed';

const FeedEntry = ({ entry, myUser }: { entry: FeedEntryType, myUser: string | undefined }) => {
  if (entry.kind === 'chat') {
    const isMine = myUser !== undefined && entry.user === myUser;
    return (
      <div className="px-3 py-0.5 break-words">
        <span className={isMine ? 'text-emerald-400' : 'text-sky-400'}>
          {formatDisplayName(entry.user)}
        </span>
        <span className="text-gray-400">: </span>
        <span className="text-gray-100">{entry.text}</span>
      </div>
    );
  }

  if (entry.kind === 'system') {
    return (
      <div className="px-3 py-0.5 text-amber-400 italic break-words">
        {entry.text}
      </div>
    );
  }

  const content = formatActionEntry(entry.entry, myUser);
  if (content === null) return null;

  if (isSeparator(entry.entry)) {
    return (
      <div className="px-3 py-1 mt-1 flex items-center gap-2 text-gray-400">
        <span className="h-px flex-1 bg-gray-700" />
        <span className="whitespace-nowrap">{content}</span>
        <span className="h-px flex-1 bg-gray-700" />
      </div>
    );
  }

  return <div className="px-3 py-0.5 text-gray-300 break-words">{content}</div>;
};

export default FeedEntry;
```

- [ ] **Step 4: Verify it typechecks and lints**

```bash
cd poker-frontend && npx tsc --noEmit && npm run lint
```

Expected: no errors. `PlayerInfo.tsx` compiles against the extracted helper.

- [ ] **Step 5: Commit**

```bash
cd poker-frontend
git add src/app/room/\[gameId\]/displayName.ts src/app/room/\[gameId\]/formatFeed.tsx \
        src/app/room/\[gameId\]/FeedEntry.tsx src/app/room/\[gameId\]/PlayerInfo.tsx
git commit -m "Render action log entries and chat messages"
```

---

## Task 6: The docked feed panel

**Files:**
- Create: `poker-frontend/src/app/room/[gameId]/Feed.tsx`

**Interfaces:**
- Consumes: `FeedEntry` type (Task 4), `FeedEntry` component (Task 5)
- Produces: default-exported `Feed` component taking `{ feed: FeedEntryType[]; myUser: string | undefined; sendChat: (text: string) => void }`

Two details that are easy to get wrong and hard to notice:

1. **The open/closed default is set in an effect, not in `useState`.** `window` does not exist during server rendering, so reading `window.innerWidth` in the initial state would either crash the server render or produce a hydration mismatch. Initial state is `false`; an effect widens it on the client.
2. **Auto-scroll only fires when the user is already at the bottom.** The engine broadcasts on every tick, so an unconditional `scrollTop = scrollHeight` would yank the view back down the instant a user scrolls up to read.

- [ ] **Step 1: Create `Feed.tsx`**

Create `poker-frontend/src/app/room/[gameId]/Feed.tsx`:

```tsx
'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';

import type { FeedEntry as FeedEntryType } from './feed';
import FeedEntry from './FeedEntry';

const MAX_CHAT_LENGTH = 200;
const WIDE_VIEWPORT_PX = 1024;
const AT_BOTTOM_SLACK_PX = 24;

const Feed = ({ feed, myUser, sendChat }: {
  feed: FeedEntryType[],
  myUser: string | undefined,
  sendChat: (text: string) => void,
}) => {
  const [open, setOpen] = useState<boolean>(false);
  const [draft, setDraft] = useState<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef<boolean>(true);

  // Deferred to an effect: window is unavailable during the server render.
  useEffect(() => {
    setOpen(window.innerWidth >= WIDE_VIEWPORT_PX);
  }, []);

  useEffect(() => {
    const element = scrollRef.current;
    if (element && atBottomRef.current) {
      element.scrollTop = element.scrollHeight;
    }
  }, [feed, open]);

  const handleScroll = () => {
    const element = scrollRef.current;
    if (!element) return;
    atBottomRef.current =
      element.scrollHeight - element.scrollTop - element.clientHeight < AT_BOTTOM_SLACK_PX;
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    sendChat(text);
    setDraft('');
  };

  if (!open) {
    return (
      <button
        className="fixed left-0 top-1/2 -translate-y-1/2 z-40 bg-gray-800 text-gray-200 text-sm px-2 py-4 rounded-r-lg opacity-70 hover:opacity-100 transition-opacity"
        onClick={() => setOpen(true)}
        aria-label="Open chat and hand log"
      >
        💬
      </button>
    );
  }

  return (
    <div className="fixed left-0 top-0 z-40 h-full w-72 flex flex-col bg-gray-900/95 border-r border-gray-700 text-sm">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
        <span className="text-gray-300 font-semibold">Table feed</span>
        <button
          className="text-gray-400 hover:text-gray-100 transition-colors px-2"
          onClick={() => setOpen(false)}
          aria-label="Close chat and hand log"
        >
          ✕
        </button>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto py-2"
      >
        {feed.map((entry) => (
          <FeedEntry
            key={entry.kind === 'action' ? `action-${entry.entry.seq}` : `${entry.kind}-${entry.id}`}
            entry={entry}
            myUser={myUser}
          />
        ))}
      </div>

      <form onSubmit={submit} className="flex gap-2 p-2 border-t border-gray-700">
        <input
          className="flex-1 min-w-0 bg-gray-800 text-gray-100 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-gray-500"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={MAX_CHAT_LENGTH}
          placeholder="Type a message…"
          aria-label="Chat message"
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-500 text-white rounded px-3 transition-colors"
        >
          →
        </button>
      </form>
    </div>
  );
};

export default Feed;
```

- [ ] **Step 2: Verify it typechecks and lints**

```bash
cd poker-frontend && npx tsc --noEmit && npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd poker-frontend
git add src/app/room/\[gameId\]/Feed.tsx
git commit -m "Add the docked table feed panel"
```

---

## Task 7: Wire the feed into the socket and the room

**Files:**
- Modify: `poker-frontend/src/app/room/[gameId]/useGameSocket.ts`
- Modify: `poker-frontend/src/app/room/[gameId]/RoomClient.tsx`

**Interfaces:**
- Consumes: `newActionEntries`, `appendEntries`, `FeedEntry` (Task 4); `Feed` component (Task 6)
- Produces: `GameSocket.feed: FeedEntry[]` and `GameCommands.sendChat: (text: string) => void`

**The critical layout detail:** `RoomClient`'s root div carries `transform -translate-x-1/2 -translate-y-1/2`. A transformed ancestor becomes the containing block for `position: fixed` descendants, so a `fixed` panel rendered *inside* that div would position itself against the table box rather than the viewport. `<Feed>` must be a **sibling** of that div, inside a fragment.

- [ ] **Step 1: Add feed state and discrimination to `useGameSocket.ts`**

Add to the imports at the top of `poker-frontend/src/app/room/[gameId]/useGameSocket.ts`:

```ts
import type { State } from './types';
import { appendEntries, newActionEntries, type FeedEntry } from './feed';
```

Extend the two exported interfaces:

```ts
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
  sendChat: (text: string) => void;
}

export interface GameSocket {
  state: State | undefined;
  feed: FeedEntry[];
  isConnected: boolean;
  reconnectAttempt: number;
  connectionFailed: boolean;
  maxReconnects: number;
  commands: GameCommands;
}
```

Add the new state and refs alongside the existing ones, after `const [state, setState] = useState<State>();`:

```ts
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const lastSeqRef = useRef(0);
  const nextEntryIdRef = useRef(0);
```

Replace `socket.onmessage` entirely:

```ts
      socket.onmessage = (event) => {
        if (socketRef.current !== socket) return;
        const parsed = JSON.parse(event.data);
        const payload = parsed?.event;

        if (payload?.kind === 'chat') {
          setFeed((current) => appendEntries(current, [{
            kind: 'chat',
            id: nextEntryIdRef.current++,
            user: payload.user,
            text: payload.text,
            timestamp: payload.timestamp,
          }]));
          return;
        }

        // Rejections (bad command, oversize chat, rate limit) arrive with no
        // `event` key at all. Before discrimination existed these fell through
        // and blew away game state with undefined.
        if (typeof parsed?.error === 'string') {
          setFeed((current) => appendEntries(current, [{
            kind: 'system',
            id: nextEntryIdRef.current++,
            text: parsed.error,
          }]));
          return;
        }

        if (payload?.kind !== 'state') return;

        const nextState: State = payload;
        console.log('Received: state', nextState);

        // Accumulated here rather than in an effect on `state`: this is an
        // event, not derived state. The seq dedupe makes it idempotent.
        const actions = newActionEntries(nextState.actionLog, lastSeqRef.current);
        if (actions.length > 0) {
          lastSeqRef.current = actions[actions.length - 1].entry.seq;
          setFeed((current) => appendEntries(current, actions));
        }

        setState(nextState);
      };
```

Add the new sender to the `commands` object, after `bet` (payload literal stays multi-line per the file's convention):

```ts
    sendChat: (text: string) => {
      sendSocketCommand(
        {
          channelCommand: 'sendChat',
          text
        },
        'Sending chat'
      );
    },
```

Add `feed` to the returned object:

```ts
  return {
    state,
    feed,
    isConnected,
    reconnectAttempt,
    connectionFailed,
    maxReconnects: MAX_RECONNECTS,
    commands,
  };
```

- [ ] **Step 2: Render the panel from `RoomClient.tsx`**

In `poker-frontend/src/app/room/[gameId]/RoomClient.tsx`, add the import:

```tsx
import Feed from './Feed';
```

Destructure `feed` from the hook:

```tsx
  const {
    state,
    feed,
    isConnected,
    reconnectAttempt,
    connectionFailed,
    maxReconnects,
    commands,
  } = useGameSocket(params.gameId as string, shouldStartEngine);
```

Wrap the returned JSX in a fragment and put `<Feed>` **outside** the transformed table div. Change the opening of the return from:

```tsx
  return (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full max-h-[calc(100vw*3/4)] max-w-[calc(100vh*4/3)] aspect-[4/3]">
```

to:

```tsx
  return (
    <>
      {/* Outside the table div on purpose: that div is `transform`ed, which
          would make a `fixed` child position against it instead of the viewport. */}
      <Feed feed={feed} myUser={user.sub} sendChat={commands.sendChat} />
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full max-h-[calc(100vw*3/4)] max-w-[calc(100vh*4/3)] aspect-[4/3]">
```

and close the fragment at the end of the return, after that div's closing tag:

```tsx
      </div>
    </>
  );
}
```

The existing early returns (`isLoading`, `error`, `!user`, `!state`) are unchanged. `user.sub` is safe to pass unguarded because the `!user` early return precedes this.

- [ ] **Step 3: Verify it typechecks, lints, and builds**

```bash
cd poker-frontend && npx tsc --noEmit && npm run lint && npm run build
```

Expected: all three succeed. The build catches server-render problems that `tsc` alone would not.

- [ ] **Step 4: Commit**

```bash
cd poker-frontend
git add src/app/room/\[gameId\]/useGameSocket.ts src/app/room/\[gameId\]/RoomClient.tsx
git commit -m "Wire the table feed into the game socket and room"
```

---

## Task 8: Full-stack manual verification

The frontend has no automated tests, so this task is the only end-to-end check that the feature works in a browser. Do not skip it, and do not report the feature complete before every box below is ticked.

**Files:** none — verification only.

- [ ] **Step 1: Start the full stack**

Four terminals:

```bash
redis-server
```
```bash
cd poker-engine && go run ./cmd/app -env=dev
```
```bash
cd poker-backend && source .venv/bin/activate && \
  DJANGO_SETTINGS_MODULE=app.settings.dev python manage.py runserver
```
```bash
cd poker-frontend && npm run dev
```

- [ ] **Step 2: Open two browsers as two different users**

Use a normal window and a private window so the Auth0 sessions do not share cookies. Log in as `user1@gmail.com` and `user2@gmail.com`. From browser 1, create a game; copy the room ID; join it from browser 2. Sit both players in with chips and start the game.

- [ ] **Step 3: Verify the action log**

Play one hand to completion. Confirm in both browsers:
- A `── Hand #1 · blinds 1/2 ──` separator appears
- Both blind posts appear with the right amounts
- Each player's own `You were dealt …` line appears, showing real cards
- Fold / check / call / bet / raise lines appear as they happen, with correct amounts
- A `── Flop: … ──` separator appears with three cards, and turn/river with one each
- A `wins …` line closes the hand
- No `handEnd` line is rendered

- [ ] **Step 4: Verify chat**

Send messages from both browsers. Confirm each arrives in both feeds, interleaved in place among the action lines, with your own name in a different colour from your opponent's.

- [ ] **Step 5: Verify hole-card privacy**

This is the check that matters most. In browser 1, confirm you **never** see browser 2's `You were dealt` line or any `?? ??` row for the opponent. Play a hand to showdown and confirm both players' cards **do** appear in the `shows … — <hand rank>` lines.

- [ ] **Step 6: Verify the guardrails**

- Paste 250 characters into the chat box. The input stops you at 200 (`maxLength`), so the server cap is unreachable through the UI — that path is already covered by `test_oversize_message_is_rejected_and_not_broadcast` in Task 3. Just confirm the input truncates.
- Rate limit: type `1`, Enter, `2`, Enter … through `8` as fast as you can. Confirm the first 5 appear as chat lines and the last 3 appear as amber system lines reading "You are sending messages too quickly." Wait 5 seconds, send another, and confirm it goes through again.
- Press Enter on an empty input. Confirm nothing is sent and no system line appears — `Feed.tsx` drops it client-side before it reaches the socket.

- [ ] **Step 7: Verify accumulation across hands**

Play two full hands without refreshing. Confirm the first hand's entries are still in the scrollback above the second hand's separator, and that **no entry is duplicated** — this is the `seq` dedupe working against the fact that every engine tick rebroadcasts the whole current hand.

- [ ] **Step 8: Verify scroll and collapse behaviour**

- Scroll up mid-hand while action is ongoing; confirm the view does **not** get yanked to the bottom on the next tick.
- Scroll back to the bottom; confirm auto-scroll resumes.
- Collapse the panel with ✕, confirm the 💬 button appears and the table underneath is unaffected. Reopen it.
- Narrow the window below 1024px and reload; confirm the panel starts collapsed.

- [ ] **Step 9: Commit any fixes**

If any step above required a fix, commit it in the appropriate repo with a message describing the defect, then re-run the affected verification steps.

---

## Self-Review Notes

Checked against `docs/superpowers/specs/2026-07-24-chat-and-action-log-design.md`:

- **Spec deviation — test file naming.** The spec said "create `poker/test_hand_log.py`". That file already exists with five passing tests, so Task 1 extends it instead. The spec's `poker/test_chat.py` is split in two: `test_chat_validation.py` for pure unit tests (Task 2, no stack) and `test_chat.py` for live-stack integration tests (Task 3), matching how this repo already separates `test_hand_log.py` from `test_action_log.py`.
- **Spec refinement — `FeedEntry` shape.** The spec sketched action entries as a flat spread of `ActionLogEntry` fields. The plan wraps the raw entry under `.entry` instead, so an engine field can never collide with `kind` or `id`. Behaviour is identical.
- **Addition not in the spec — engine-restart recovery.** `newActionEntries` resets its high-water mark when the log's highest `seq` falls below `lastSeq`. Without this, restarting the Go engine (which clears the room's log and counter) would leave the client silently filtering out every subsequent entry.
- **Addition not in the spec — the `transform`/`fixed` constraint.** Called out in Task 7. The spec specified a viewport-fixed panel without noting that `RoomClient`'s root is transformed, which would have silently broken the positioning.
- Every other spec section maps to a task: protocol → Task 3; `chat.py` → Task 2; `hand_log` seq → Task 1; `types.ts`/`feed.ts` → Task 4; rendering rules table → Task 5; layout constraint and auto-scroll → Task 6; ordering, discrimination, and the `handle_unknown_type` bug → Task 7; the full manual verification list → Task 8.
