export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export type PlayerAction = 'fold' | 'check' | 'call' | 'raise' | 'all-in';
export type BettingRound = 'preflop' | 'flop' | 'turn' | 'river';
export type GamePhase = 'waiting' | 'dealing' | BettingRound | 'showdown';

/** Canonical shared player state used by BettingEngine and BlindManager. */
export interface PlayerState {
  id: string;
  name: string;
  chips: number;
  holeCards: Card[];
  bet: number;
  totalBet: number;
  folded: boolean;
  isAllIn: boolean;
  isConnected: boolean;
}

/** A pot (main or side) with the set of players eligible to win it. */
export interface SidePot {
  amount: number;
  eligiblePlayerIds: string[];
}

export interface Player {
  id: string;
  name: string;
  chips: number;
  holeCards: Card[];
  bet: number;
  totalBet: number;
  isActive: boolean;
  isFolded: boolean;
  isAllIn: boolean;
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  isConnected: boolean;
}

/** One line in the live action sidebar. */
export interface ActionHistoryEntry {
  playerName: string;
  description: string; // e.g. "raised to $400", "folded", "called $100"
  timestamp: number;
}

export interface GameState {
  roomId: string;
  roomCode: string;
  phase: GamePhase;
  players: Player[];
  communityCards: Card[];
  pot: number;
  sidePots: SidePot[];
  currentBet: number;
  activePlayerId: string | null;
  dealerIndex: number;
  smallBlind: number;
  bigBlind: number;
  winners: WinnerInfo[];
  secondsLeft: number;
  actionHistory: ActionHistoryEntry[];
}

export interface WinnerInfo {
  playerId: string;
  amount: number;
  handName: string;
}

export interface ServerToClientEvents {
  'game:state': (state: GameState) => void;
  'game:action': (action: ActionPayload) => void;
  'game:timer': (payload: { secondsLeft: number }) => void;
  'room:joined': (payload: { roomId: string; roomCode: string; playerId: string; token: string }) => void;
  'room:created': (payload: { roomCode: string; playerId: string; token: string }) => void;
  'room:spectating': (payload: { roomCode: string }) => void;
  'room:error': (message: string) => void;
  'player:joined': (player: Pick<Player, 'id' | 'name' | 'chips'>) => void;
  'player:left': (playerId: string) => void;
  'chat:message': (msg: ChatMessage) => void;
}

export interface ClientToServerEvents {
  'room:create': (payload: { playerName: string }) => void;
  'room:join': (payload: { roomCode: string; playerName: string }) => void;
  'room:rejoin': (payload: { roomCode: string; token: string }) => void;
  'room:leave': () => void;
  'room:demo': (payload: { playerName: string }) => void;
  'game:start': () => void;
  'game:action': (action: ActionPayload) => void;
  'chat:message': (text: string) => void;
}

export interface ActionPayload {
  type: PlayerAction;
  amount?: number;
}

export interface ChatMessage {
  playerId: string;
  playerName: string;
  text: string;
  timestamp: number;
}
