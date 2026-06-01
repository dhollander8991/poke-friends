import type { Card, Rank, Suit } from './types.js';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export function createDeck(): Card[] {
  return SUITS.flatMap(suit => RANKS.map(rank => ({ suit, rank })));
}

export function shuffleDeck(deck: Card[]): Card[] {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

/** 52-card deck pre-shuffled with Fisher-Yates. Cards are dealt from the top (pop). */
export class Deck {
  private cards: Card[];

  constructor() {
    this.cards = shuffleDeck(createDeck());
  }

  deal(): Card {
    const card = this.cards.pop();
    if (!card) throw new Error('Deck exhausted');
    return card;
  }

  get remaining(): number {
    return this.cards.length;
  }
}
