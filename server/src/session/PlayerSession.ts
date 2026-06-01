export interface PlayerSession {
  /** Stable ID issued in JWT, survives reconnects. */
  playerId: string;
  /** Current socket connection ID — changes on reconnect. */
  socketId: string;
  name: string;
  chipStack: number;
  handsPlayed: number;
  handsWon: number;
  tier: 'free' | 'vip';
}
