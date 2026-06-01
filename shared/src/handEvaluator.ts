import type { Card, Rank } from './types.js';

const RANK_VALUE: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, '10': 10, J: 11, Q: 12, K: 13, A: 14,
};

export interface HandResult {
  rank: number; // 1 (high card) – 9 (royal flush)
  name: string;
  tiebreakers: number[];
  cards: Card[]; // the 5 cards that make up this hand
}

/** Evaluate exactly 5 cards and return the best hand classification. */
export function evaluateHand(cards: Card[]): HandResult {
  const sorted = [...cards].sort((a, b) => RANK_VALUE[b.rank] - RANK_VALUE[a.rank]);
  const values = sorted.map(c => RANK_VALUE[c.rank]);
  const suits = sorted.map(c => c.suit);

  const isFlush = suits.every(s => s === suits[0]);
  const isStraight = checkStraight(values);
  const counts = getCounts(values);
  const groups = Object.values(counts).sort((a, b) => b - a);

  const h = (rank: number, name: string, tiebreakers: number[]): HandResult =>
    ({ rank, name, tiebreakers, cards });

  if (isFlush && isStraight) {
    const isRoyal = values[0] === 14 && values[1] === 13;
    return h(9, isRoyal ? 'Royal Flush' : 'Straight Flush', values);
  }
  if (groups[0] === 4) return h(8, 'Four of a Kind', groupedValues(counts, values));
  if (groups[0] === 3 && groups[1] === 2) return h(7, 'Full House', groupedValues(counts, values));
  if (isFlush) return h(6, 'Flush', values);
  if (isStraight) return h(5, 'Straight', values);
  if (groups[0] === 3) return h(4, 'Three of a Kind', groupedValues(counts, values));
  if (groups[0] === 2 && groups[1] === 2) return h(3, 'Two Pair', groupedValues(counts, values));
  if (groups[0] === 2) return h(2, 'One Pair', groupedValues(counts, values));
  return h(1, 'High Card', values);
}

/** Select the best 5-card hand from 5–7 cards (tries all C(n,5) combos). */
export function bestHandFromSeven(cards: Card[]): HandResult {
  let best: HandResult | null = null;
  for (let i = 0; i < cards.length - 1; i++) {
    for (let j = i + 1; j < cards.length; j++) {
      const five = cards.filter((_, idx) => idx !== i && idx !== j);
      const result = evaluateHand(five);
      if (!best || compareHands(result, best) > 0) best = result;
    }
  }
  return best!;
}

export function compareHands(a: HandResult, b: HandResult): number {
  if (a.rank !== b.rank) return a.rank - b.rank;
  for (let i = 0; i < Math.min(a.tiebreakers.length, b.tiebreakers.length); i++) {
    if (a.tiebreakers[i] !== b.tiebreakers[i]) return a.tiebreakers[i] - b.tiebreakers[i];
  }
  return 0;
}

function checkStraight(values: number[]): boolean {
  for (let i = 1; i < values.length; i++) {
    if (values[i - 1] - values[i] !== 1) {
      // Ace-low wheel: A-2-3-4-5 (sorted as 14,5,4,3,2)
      return values[0] === 14 && values[1] === 5 && values[2] === 4 && values[3] === 3 && values[4] === 2;
    }
  }
  return true;
}

function getCounts(values: number[]): Record<number, number> {
  return values.reduce<Record<number, number>>((acc, v) => {
    acc[v] = (acc[v] ?? 0) + 1;
    return acc;
  }, {});
}

function groupedValues(counts: Record<number, number>, values: number[]): number[] {
  return [...values].sort((a, b) => counts[b] - counts[a] || b - a);
}
