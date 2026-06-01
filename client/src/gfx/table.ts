/** The poker table — a maroon-felt oval with a polished wood + gold rail. */
import type Phaser from 'phaser';
import { TABLE_RX, TABLE_RY, RAIL, BRAND, COL } from '../theme.js';
import { rgba, darken, lighten } from '../core/format.js';
import { withCanvas, dropShadow, clearShadow } from './draw.js';

type Ctx = CanvasRenderingContext2D;

function ellipse(ctx: Ctx, cx: number, cy: number, rx: number, ry: number): void {
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.closePath();
}

/** Curved title text along the top (or bottom) inner arc of the felt. */
function arcText(ctx: Ctx, text: string, cx: number, cy: number, rx: number, ry: number, top: boolean): void {
  ctx.save();
  ctx.fillStyle = rgba(COL.feltLine, 0.5);
  ctx.font = 'bold 26px "Arial Rounded MT Bold", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const spread = 0.9; // radians the text spans
  const start = top ? -Math.PI / 2 - spread / 2 : Math.PI / 2 + spread / 2;
  const step = spread / (text.length - 1);
  for (let i = 0; i < text.length; i++) {
    const a = top ? start + i * step : start - i * step;
    const x = cx + Math.cos(a) * rx;
    const y = cy + Math.sin(a) * ry;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(top ? a + Math.PI / 2 : a - Math.PI / 2);
    ctx.fillText(text[i], 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

export function generateTable(scene: Phaser.Scene): void {
  const w = TABLE_RX * 2 + 16, h = TABLE_RY * 2 + 24;
  withCanvas(scene, 'table', w, h, (ctx) => {
    const cx = w / 2, cy = (h - 8) / 2;
    const RX = TABLE_RX, RY = TABLE_RY;

    // ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ellipse(ctx, cx, cy + 12, RX, RY); ctx.fill();

    // ── wood rail ──
    dropShadow(ctx, 22, 12, 0.5);
    ellipse(ctx, cx, cy, RX, RY);
    const wood = ctx.createLinearGradient(0, cy - RY, 0, cy + RY);
    wood.addColorStop(0, rgba(COL.woodHi));
    wood.addColorStop(0.5, rgba(COL.wood));
    wood.addColorStop(1, rgba(COL.woodDark));
    ctx.fillStyle = wood;
    ctx.fill();
    clearShadow(ctx);

    // wood grain (subtle concentric)
    ctx.strokeStyle = rgba(COL.woodDark, 0.3);
    ctx.lineWidth = 1.5;
    for (let k = 1; k <= 3; k++) { ellipse(ctx, cx, cy, RX - k * 6, RY - k * 6); ctx.stroke(); }

    // gold trim band between rail and felt
    const gi = RAIL - 8;
    ellipse(ctx, cx, cy, RX - gi, RY - gi);
    ctx.lineWidth = 7; ctx.strokeStyle = rgba(COL.gold); ctx.stroke();
    ellipse(ctx, cx, cy, RX - gi, RY - gi);
    ctx.lineWidth = 2; ctx.strokeStyle = rgba(COL.goldHi); ctx.stroke();

    // rivets
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      const x = cx + Math.cos(a) * (RX - RAIL / 2);
      const y = cy + Math.sin(a) * (RY - RAIL / 2);
      ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = rgba(COL.goldHi); ctx.fill();
      ctx.lineWidth = 1.2; ctx.strokeStyle = rgba(COL.goldDark); ctx.stroke();
    }

    // ── felt ──
    const fRX = RX - RAIL, fRY = RY - RAIL;
    ctx.save();
    ellipse(ctx, cx, cy, fRX, fRY); ctx.clip();
    const felt = ctx.createRadialGradient(cx, cy - 20, 30, cx, cy, Math.max(fRX, fRY));
    felt.addColorStop(0, rgba(lighten(COL.felt, 0.12)));
    felt.addColorStop(0.65, rgba(COL.felt));
    felt.addColorStop(1, rgba(COL.feltEdge));
    ctx.fillStyle = felt;
    ctx.fillRect(0, 0, w, h);

    // betting line + scrollwork ring
    ellipse(ctx, cx, cy, fRX - 36, fRY - 36);
    ctx.lineWidth = 3; ctx.strokeStyle = rgba(COL.feltLine, 0.5); ctx.stroke();
    arcText(ctx, BRAND, cx, cy, fRX - 66, fRY - 66, true);
    arcText(ctx, BRAND, cx, cy, fRX - 66, fRY - 66, false);
    ctx.restore();

    // dark inner edge for depth
    ellipse(ctx, cx, cy, fRX, fRY);
    ctx.lineWidth = 6; ctx.strokeStyle = rgba(darken(COL.feltEdge, 0.2), 0.8); ctx.stroke();

    // outer ink outline
    ellipse(ctx, cx, cy, RX, RY);
    ctx.lineWidth = 3; ctx.strokeStyle = rgba(COL.ink, 0.6); ctx.stroke();
  });
}
