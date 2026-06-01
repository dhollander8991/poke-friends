/**
 * Spin-the-wheel reward table — shared so the client renders exactly the wedges
 * the server can award (the server decides the outcome, the client animates to it).
 */

export interface WheelSegment {
  /** Coins awarded when the pointer lands here. */
  coins: number;
  /** Relative probability weight (need not sum to anything in particular). */
  weight: number;
  /** Wedge colour as 0xRRGGBB (kept here so client + server agree on layout). */
  color: number;
}

/** 8 wedges, clockwise from the top (index 0 is under the pointer at rest). */
export const WHEEL_SEGMENTS: WheelSegment[] = [
  { coins: 500, weight: 24, color: 0x4aa8ff },
  { coins: 1500, weight: 14, color: 0x4cc95a },
  { coins: 750, weight: 20, color: 0xff9f3a },
  { coins: 3000, weight: 9, color: 0xb766ff },
  { coins: 1000, weight: 18, color: 0xff6f91 },
  { coins: 10000, weight: 2, color: 0xffcc33 }, // jackpot
  { coins: 600, weight: 22, color: 0x2dd0c8 },
  { coins: 2000, weight: 11, color: 0xff5a5a },
];

/** One free spin per this window. */
export const WHEEL_COOLDOWN_MS = 60 * 60 * 1000;

/** Pick a wedge index using the weights. `rand` lets the server inject its RNG. */
export function pickWeightedSegment(rand: () => number = Math.random): number {
  const total = WHEEL_SEGMENTS.reduce((s, seg) => s + seg.weight, 0);
  let roll = rand() * total;
  for (let i = 0; i < WHEEL_SEGMENTS.length; i++) {
    roll -= WHEEL_SEGMENTS[i].weight;
    if (roll < 0) return i;
  }
  return WHEEL_SEGMENTS.length - 1;
}
