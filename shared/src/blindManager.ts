import type { PlayerState } from './types.js';

export interface PostBlindsResult {
  players: PlayerState[];
  pot: number;
  currentBet: number;
  smallBlindIndex: number;
  bigBlindIndex: number;
  /** Index of the first player to act preflop (left of big blind). */
  activePlayerIndex: number;
}

export class BlindManager {
  constructor(
    readonly smallBlind: number,
    readonly bigBlind: number,
  ) {}

  /**
   * Force-post small and big blinds for the two players left of the dealer.
   * Returns an immutable copy of the player array with updated chip/bet counts.
   */
  postBlinds(players: PlayerState[], dealerIndex: number): PostBlindsResult {
    const count = players.length;
    const sbIdx = (dealerIndex + 1) % count;
    const bbIdx = (dealerIndex + 2) % count;

    const updated = players.map(p => ({ ...p }));
    let pot = 0;

    const post = (idx: number, amount: number) => {
      const p = updated[idx];
      const actual = Math.min(amount, p.chips);
      p.chips -= actual;
      p.bet += actual;
      p.totalBet += actual;
      pot += actual;
      if (p.chips === 0) p.isAllIn = true;
    };

    post(sbIdx, this.smallBlind);
    post(bbIdx, this.bigBlind);

    return {
      players: updated,
      pot,
      currentBet: this.bigBlind,
      smallBlindIndex: sbIdx,
      bigBlindIndex: bbIdx,
      activePlayerIndex: (bbIdx + 1) % count,
    };
  }

  /** Advance the dealer button by one seat, skipping no seats. */
  rotateDealer(dealerIndex: number, playerCount: number): number {
    return (dealerIndex + 1) % playerCount;
  }
}
