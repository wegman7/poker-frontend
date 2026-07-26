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
