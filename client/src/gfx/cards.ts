/** Cartoon playing cards — glossy rounded faces with hand-drawn suit pips. */
import type Phaser from 'phaser';
import { CARD_W, CARD_H, COL } from '../theme.js';
import { rgba } from '../core/format.js';
import { withCanvas, roundRectPath, glossRoundRect, dropShadow, clearShadow } from './draw.js';

type Ctx = CanvasRenderingContext2D;

export const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as const;
export type Suit = (typeof SUITS)[number];

const RED: Suit[] = ['hearts', 'diamonds'];

// ─── Suit pip paths (centred on cx,cy, scaled by s) ──────────────────────────
function suitPath(ctx: Ctx, suit: Suit, cx: number, cy: number, s: number): void {
  ctx.beginPath();
  if (suit === 'hearts') {
    ctx.moveTo(cx, cy + s * 0.34);
    ctx.bezierCurveTo(cx - s * 0.5, cy - s * 0.02, cx - s * 0.52, cy - s * 0.42, cx, cy - s * 0.16);
    ctx.bezierCurveTo(cx + s * 0.52, cy - s * 0.42, cx + s * 0.5, cy - s * 0.02, cx, cy + s * 0.34);
    ctx.closePath();
  } else if (suit === 'diamonds') {
    ctx.moveTo(cx, cy - s * 0.46);
    ctx.lineTo(cx + s * 0.36, cy);
    ctx.lineTo(cx, cy + s * 0.46);
    ctx.lineTo(cx - s * 0.36, cy);
    ctx.closePath();
  } else if (suit === 'spades') {
    ctx.moveTo(cx, cy - s * 0.46);
    ctx.bezierCurveTo(cx + s * 0.52, cy - s * 0.06, cx + s * 0.5, cy + s * 0.22, cx, cy + s * 0.12);
    ctx.bezierCurveTo(cx - s * 0.5, cy + s * 0.22, cx - s * 0.52, cy - s * 0.06, cx, cy - s * 0.46);
    ctx.closePath();
    // stem
    ctx.moveTo(cx - s * 0.2, cy + s * 0.46);
    ctx.lineTo(cx + s * 0.2, cy + s * 0.46);
    ctx.lineTo(cx + s * 0.06, cy + s * 0.08);
    ctx.lineTo(cx - s * 0.06, cy + s * 0.08);
    ctx.closePath();
  } else {
    // clubs — three lobes + stem
    const r = s * 0.21;
    ctx.arc(cx, cy - s * 0.16, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.moveTo(cx - s * 0.2 + r, cy + s * 0.06);
    ctx.arc(cx - s * 0.2, cy + s * 0.06, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.moveTo(cx + s * 0.2 + r, cy + s * 0.06);
    ctx.arc(cx + s * 0.2, cy + s * 0.06, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.moveTo(cx - s * 0.18, cy + s * 0.46);
    ctx.lineTo(cx + s * 0.18, cy + s * 0.46);
    ctx.lineTo(cx + s * 0.05, cy + s * 0.02);
    ctx.lineTo(cx - s * 0.05, cy + s * 0.02);
    ctx.closePath();
  }
}

function drawPip(ctx: Ctx, suit: Suit, cx: number, cy: number, s: number, color: number): void {
  suitPath(ctx, suit, cx, cy, s);
  ctx.fillStyle = rgba(color);
  ctx.fill();
}

function cardFaceBase(ctx: Ctx, w: number, h: number): void {
  dropShadow(ctx, 5, 3, 0.3);
  roundRectPath(ctx, 3, 2, w - 6, h - 6, 10);
  ctx.fillStyle = rgba(COL.cardWhite);
  ctx.fill();
  clearShadow(ctx);

  // inky outline
  roundRectPath(ctx, 3, 2, w - 6, h - 6, 10);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = rgba(COL.ink);
  ctx.stroke();
}

function genCard(scene: Phaser.Scene, rank: string, suit: Suit): void {
  const key = `card_${rank}_${suit}`;
  withCanvas(scene, key, CARD_W, CARD_H, (ctx, w, h) => {
    cardFaceBase(ctx, w, h);
    const color = RED.includes(suit) ? COL.cardRed : COL.cardBlack;

    // corner rank + mini pip (top-left)
    ctx.fillStyle = rgba(color);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${rank === '10' ? 17 : 20}px "Arial Rounded MT Bold", sans-serif`;
    ctx.fillText(rank, 13, 16);
    drawPip(ctx, suit, 13, 32, 12, color);

    // bottom-right mirrored
    ctx.save();
    ctx.translate(w - 13, h - 16);
    ctx.rotate(Math.PI);
    ctx.fillStyle = rgba(color);
    ctx.font = `bold ${rank === '10' ? 17 : 20}px "Arial Rounded MT Bold", sans-serif`;
    ctx.fillText(rank, 0, 0);
    drawPip(ctx, suit, 0, 16, 12, color);
    ctx.restore();

    // big centre pip with soft gloss
    drawPip(ctx, suit, w / 2, h / 2 + 4, 40, color);
    ctx.save();
    suitPath(ctx, suit, w / 2, h / 2 + 4, 40);
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(0, 0, w, h / 2 + 2);
    ctx.restore();

    glossRoundRect(ctx, 3, 2, w - 6, h - 6, 10, 0.25);
  });
}

function genCardBack(scene: Phaser.Scene): void {
  withCanvas(scene, 'card_back', CARD_W, CARD_H, (ctx, w, h) => {
    dropShadow(ctx, 5, 3, 0.3);
    roundRectPath(ctx, 3, 2, w - 6, h - 6, 10);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, rgba(COL.cardBackA));
    g.addColorStop(1, rgba(COL.cardBackB));
    ctx.fillStyle = g;
    ctx.fill();
    clearShadow(ctx);

    // inner panel
    ctx.save();
    roundRectPath(ctx, 8, 7, w - 16, h - 16, 7);
    ctx.clip();
    // argyle diamonds
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 2;
    for (let x = -h; x < w + h; x += 14) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + h, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x - h, h); ctx.stroke();
    }
    ctx.restore();

    // gold border
    roundRectPath(ctx, 7, 6, w - 14, h - 14, 8);
    ctx.lineWidth = 3;
    ctx.strokeStyle = rgba(COL.gold);
    ctx.stroke();

    // centre emblem
    ctx.save();
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 16, 0, Math.PI * 2);
    ctx.fillStyle = rgba(COL.gold);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = rgba(COL.goldDark);
    ctx.stroke();
    drawPip(ctx, 'spades', w / 2, h / 2 + 1, 20, COL.cardBackB);
    ctx.restore();

    // outline
    roundRectPath(ctx, 3, 2, w - 6, h - 6, 10);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = rgba(COL.ink);
    ctx.stroke();
  });
}

export function generateCards(scene: Phaser.Scene): void {
  genCardBack(scene);
  for (const suit of SUITS) for (const rank of RANKS) genCard(scene, rank, suit);
}
