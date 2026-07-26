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
