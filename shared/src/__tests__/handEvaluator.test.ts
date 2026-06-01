import { describe, it, expect } from 'vitest';
import { evaluateHand, bestHandFromSeven, compareHands } from '../handEvaluator.js';
import type { Card } from '../types.js';

function c(rank: Card['rank'], suit: Card['suit']): Card {
  return { rank, suit };
}

// ---------------------------------------------------------------------------
// evaluateHand — all 9 hand ranks
// ---------------------------------------------------------------------------

describe('evaluateHand', () => {
  describe('rank 1 — High Card', () => {
    it('recognises high card', () => {
      const hand = [c('A', 'spades'), c('K', 'hearts'), c('Q', 'diamonds'), c('9', 'clubs'), c('7', 'spades')];
      const result = evaluateHand(hand);
      expect(result.rank).toBe(1);
      expect(result.name).toBe('High Card');
    });
  });

  describe('rank 2 — One Pair', () => {
    it('recognises one pair', () => {
      const hand = [c('A', 'spades'), c('A', 'hearts'), c('K', 'diamonds'), c('Q', 'clubs'), c('J', 'spades')];
      const result = evaluateHand(hand);
      expect(result.rank).toBe(2);
      expect(result.name).toBe('One Pair');
    });
  });

  describe('rank 3 — Two Pair', () => {
    it('recognises two pair', () => {
      const hand = [c('A', 'spades'), c('A', 'hearts'), c('K', 'diamonds'), c('K', 'clubs'), c('Q', 'spades')];
      const result = evaluateHand(hand);
      expect(result.rank).toBe(3);
      expect(result.name).toBe('Two Pair');
    });
  });

  describe('rank 4 — Three of a Kind', () => {
    it('recognises three of a kind', () => {
      const hand = [c('A', 'spades'), c('A', 'hearts'), c('A', 'diamonds'), c('K', 'clubs'), c('Q', 'spades')];
      const result = evaluateHand(hand);
      expect(result.rank).toBe(4);
      expect(result.name).toBe('Three of a Kind');
    });
  });

  describe('rank 5 — Straight', () => {
    it('recognises a broadway straight (T-A)', () => {
      const hand = [c('A', 'spades'), c('K', 'hearts'), c('Q', 'diamonds'), c('J', 'clubs'), c('10', 'spades')];
      // This is also a royal flush check — but mixed suits, so plain straight
      const result = evaluateHand(hand);
      expect(result.rank).toBe(5);
      expect(result.name).toBe('Straight');
    });

    it('recognises a mid straight', () => {
      const hand = [c('9', 'spades'), c('8', 'hearts'), c('7', 'diamonds'), c('6', 'clubs'), c('5', 'spades')];
      const result = evaluateHand(hand);
      expect(result.rank).toBe(5);
      expect(result.name).toBe('Straight');
    });

    it('recognises the wheel (A-2-3-4-5)', () => {
      const hand = [c('A', 'clubs'), c('2', 'hearts'), c('3', 'diamonds'), c('4', 'clubs'), c('5', 'spades')];
      const result = evaluateHand(hand);
      expect(result.rank).toBe(5);
      expect(result.name).toBe('Straight');
    });
  });

  describe('rank 6 — Flush', () => {
    it('recognises a flush', () => {
      const hand = [c('A', 'spades'), c('K', 'spades'), c('Q', 'spades'), c('J', 'spades'), c('9', 'spades')];
      const result = evaluateHand(hand);
      expect(result.rank).toBe(6);
      expect(result.name).toBe('Flush');
    });
  });

  describe('rank 7 — Full House', () => {
    it('recognises a full house', () => {
      const hand = [c('A', 'spades'), c('A', 'hearts'), c('A', 'diamonds'), c('K', 'clubs'), c('K', 'spades')];
      const result = evaluateHand(hand);
      expect(result.rank).toBe(7);
      expect(result.name).toBe('Full House');
    });
  });

  describe('rank 8 — Four of a Kind', () => {
    it('recognises four of a kind', () => {
      const hand = [c('A', 'spades'), c('A', 'hearts'), c('A', 'diamonds'), c('A', 'clubs'), c('K', 'spades')];
      const result = evaluateHand(hand);
      expect(result.rank).toBe(8);
      expect(result.name).toBe('Four of a Kind');
    });
  });

  describe('rank 9 — Straight Flush / Royal Flush', () => {
    it('recognises a straight flush', () => {
      const hand = [c('9', 'spades'), c('8', 'spades'), c('7', 'spades'), c('6', 'spades'), c('5', 'spades')];
      const result = evaluateHand(hand);
      expect(result.rank).toBe(9);
      expect(result.name).toBe('Straight Flush');
    });

    it('recognises a royal flush', () => {
      const hand = [c('A', 'hearts'), c('K', 'hearts'), c('Q', 'hearts'), c('J', 'hearts'), c('10', 'hearts')];
      const result = evaluateHand(hand);
      expect(result.rank).toBe(9);
      expect(result.name).toBe('Royal Flush');
    });

    it('royal flush outranks a lower straight flush via tiebreakers', () => {
      const royal = evaluateHand([c('A', 'clubs'), c('K', 'clubs'), c('Q', 'clubs'), c('J', 'clubs'), c('10', 'clubs')]);
      const lower = evaluateHand([c('9', 'clubs'), c('8', 'clubs'), c('7', 'clubs'), c('6', 'clubs'), c('5', 'clubs')]);
      expect(compareHands(royal, lower)).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // cards field
  // ---------------------------------------------------------------------------

  it('always returns exactly 5 cards', () => {
    const hand = [c('A', 'spades'), c('A', 'hearts'), c('K', 'diamonds'), c('Q', 'clubs'), c('J', 'spades')];
    const result = evaluateHand(hand);
    expect(result.cards).toHaveLength(5);
  });

  it('returned cards match the input cards', () => {
    const hand = [c('7', 'hearts'), c('7', 'clubs'), c('3', 'diamonds'), c('3', 'spades'), c('A', 'hearts')];
    const result = evaluateHand(hand);
    expect(result.cards).toEqual(expect.arrayContaining(hand));
  });
});

// ---------------------------------------------------------------------------
// compareHands
// ---------------------------------------------------------------------------

describe('compareHands', () => {
  it('higher rank wins', () => {
    const flush = evaluateHand([c('A', 'spades'), c('K', 'spades'), c('Q', 'spades'), c('J', 'spades'), c('9', 'spades')]);
    const straight = evaluateHand([c('9', 'hearts'), c('8', 'clubs'), c('7', 'diamonds'), c('6', 'spades'), c('5', 'hearts')]);
    expect(compareHands(flush, straight)).toBeGreaterThan(0);
  });

  it('same rank uses tiebreakers', () => {
    const highAce = evaluateHand([c('A', 'spades'), c('K', 'hearts'), c('Q', 'diamonds'), c('9', 'clubs'), c('7', 'spades')]);
    const highKing = evaluateHand([c('K', 'spades'), c('Q', 'hearts'), c('J', 'diamonds'), c('9', 'clubs'), c('8', 'spades')]);
    expect(compareHands(highAce, highKing)).toBeGreaterThan(0);
  });

  it('identical hands tie', () => {
    const a = evaluateHand([c('A', 'spades'), c('A', 'hearts'), c('K', 'diamonds'), c('Q', 'clubs'), c('J', 'spades')]);
    const b = evaluateHand([c('A', 'diamonds'), c('A', 'clubs'), c('K', 'spades'), c('Q', 'hearts'), c('J', 'clubs')]);
    expect(compareHands(a, b)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// bestHandFromSeven
// ---------------------------------------------------------------------------

describe('bestHandFromSeven', () => {
  it('picks four-of-a-kind from 7 cards', () => {
    const cards = [
      c('A', 'spades'), c('A', 'hearts'), c('A', 'diamonds'), c('A', 'clubs'),
      c('K', 'spades'), c('Q', 'hearts'), c('2', 'diamonds'),
    ];
    const result = bestHandFromSeven(cards);
    expect(result.rank).toBe(8);
    expect(result.name).toBe('Four of a Kind');
    expect(result.cards).toHaveLength(5);
  });

  it('finds the best hand when multiple strong hands exist', () => {
    // Two pair + flush draw → flush wins
    const cards = [
      c('A', 'spades'), c('K', 'spades'), c('Q', 'spades'), c('J', 'spades'), c('9', 'spades'),
      c('9', 'hearts'), c('9', 'diamonds'),
    ];
    const result = bestHandFromSeven(cards);
    // A-high flush vs three 9s — flush (rank 6) < three-of-a-kind is rank 4... wait
    // Actually three-9s = rank 4, flush = rank 6 → flush wins
    expect(result.rank).toBe(6);
    expect(result.name).toBe('Flush');
  });

  it('selects a straight flush from 7 mixed cards', () => {
    const cards = [
      c('9', 'clubs'), c('8', 'clubs'), c('7', 'clubs'), c('6', 'clubs'), c('5', 'clubs'),
      c('A', 'hearts'), c('K', 'diamonds'),
    ];
    const result = bestHandFromSeven(cards);
    expect(result.rank).toBe(9);
    expect(result.name).toBe('Straight Flush');
  });

  it('uses exactly 5 cards in the result', () => {
    const cards = [
      c('2', 'hearts'), c('7', 'spades'), c('K', 'diamonds'), c('J', 'clubs'), c('10', 'hearts'),
      c('3', 'spades'), c('8', 'clubs'),
    ];
    const result = bestHandFromSeven(cards);
    expect(result.cards).toHaveLength(5);
  });
});
