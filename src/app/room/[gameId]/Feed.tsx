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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
