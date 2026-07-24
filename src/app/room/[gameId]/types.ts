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
