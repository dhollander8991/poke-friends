import type { PlayerState, ActionPayload, SidePot } from './types.js';

export interface ActionValidation {
  valid: boolean;
  reason?: string;
}

export interface ApplyActionResult {
  players: PlayerState[];
  pot: number;
  currentBet: number;
  /** Index of the last player to raise; -1 if unchanged. */
  lastRaiserIndex: number;
}

export class BettingEngine {
  /**
   * Check whether a player's proposed action is legal given the current bet.
   * bigBlind is used to enforce the minimum raise size.
   */
  validateAction(
    player: PlayerState,
    action: ActionPayload,
    currentBet: number,
    bigBlind: number,
  ): ActionValidation {
    if (player.folded) return { valid: false, reason: 'Player has folded' };
    if (player.isAllIn) return { valid: false, reason: 'Player is already all-in' };

    switch (action.type) {
      case 'fold':
        return { valid: true };

      case 'check':
        if (player.bet < currentBet)
          return { valid: false, reason: 'Cannot check with an outstanding bet; call or fold' };
        return { valid: true };

      case 'call':
        if (player.bet >= currentBet)
          return { valid: false, reason: 'No bet to call; use check' };
        return { valid: true };

      case 'raise': {
        const minRaiseTotal = currentBet + bigBlind;
        const raiseTotal = action.amount ?? 0;
        // Allow going all-in for less than the minimum raise
        const isAllIn = raiseTotal === player.chips + player.bet;
        if (!isAllIn && raiseTotal < minRaiseTotal)
          return { valid: false, reason: `Minimum raise to ${minRaiseTotal}` };
        if (raiseTotal <= currentBet)
          return { valid: false, reason: 'Raise must exceed current bet' };
        return { valid: true };
      }

      case 'all-in':
        return { valid: true };

      default:
        return { valid: false, reason: 'Unknown action type' };
    }
  }

  /**
   * Apply an action to an immutable copy of the player array.
   * Returns updated players, pot, currentBet, and lastRaiserIndex (-1 = no change).
   */
  applyAction(
    players: PlayerState[],
    pot: number,
    currentBet: number,
    activePlayerIndex: number,
    action: ActionPayload,
  ): ApplyActionResult {
    const updated = players.map(p => ({ ...p }));
    const player = updated[activePlayerIndex];
    let newPot = pot;
    let newCurrentBet = currentBet;
    let lastRaiserIndex = -1;

    const deduct = (amount: number) => {
      const actual = Math.min(amount, player.chips);
      player.chips -= actual;
      player.bet += actual;
      player.totalBet += actual;
      newPot += actual;
      if (player.chips === 0) player.isAllIn = true;
      return actual;
    };

    switch (action.type) {
      case 'fold':
        player.folded = true;
        break;

      case 'check':
        break;

      case 'call':
        deduct(currentBet - player.bet);
        break;

      case 'raise': {
        const raiseTotal = action.amount ?? currentBet * 2;
        deduct(raiseTotal - player.bet);
        newCurrentBet = player.bet;
        lastRaiserIndex = activePlayerIndex;
        break;
      }

      case 'all-in':
        deduct(player.chips);
        if (player.bet > newCurrentBet) {
          newCurrentBet = player.bet;
          lastRaiserIndex = activePlayerIndex;
        }
        break;
    }

    return { players: updated, pot: newPot, currentBet: newCurrentBet, lastRaiserIndex };
  }

  /**
   * Split the total pot into main pot and side pots for all-in scenarios.
   *
   * Algorithm: for each unique totalBet level (sorted ascending) every player
   * who contributed at least that much pays (level − prevLevel) into that layer.
   * Only non-folded players who contributed ≥ the layer cap are eligible to win it.
   */
  calculateSidePots(players: PlayerState[]): SidePot[] {
    const totalPot = players.reduce((sum, p) => sum + p.totalBet, 0);
    if (totalPot === 0) return [];

    const levels = [
      ...new Set(players.map(p => p.totalBet).filter(t => t > 0)),
    ].sort((a, b) => a - b);

    const pots: SidePot[] = [];
    let prev = 0;

    for (const level of levels) {
      const contributors = players.filter(p => p.totalBet >= level).length;
      const amount = (level - prev) * contributors;
      const eligiblePlayerIds = players
        .filter(p => !p.folded && p.totalBet >= level)
        .map(p => p.id);

      if (amount > 0) {
        pots.push({ amount, eligiblePlayerIds });
      }
      prev = level;
    }

    return pots;
  }
}
