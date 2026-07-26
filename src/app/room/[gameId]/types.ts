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
