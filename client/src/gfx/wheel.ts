/** The prize wheel face — colourful wedges with coin amounts and a bulb-lit rim. */
import type Phaser from 'phaser';
import { WHEEL_SEGMENTS } from '@texas-holdem/shared';
import { COL } from '../theme.js';
import { abbrev, rgba, lighten, darken } from '../core/format.js';
import { withCanvas, starPath } from './draw.js';

export const WHEEL_SIZE = 460;
export const WHEEL_R = 214;

type Ctx = CanvasRenderingContext2D;

function miniCoin(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = rgba(COL.coin);
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = rgba(COL.coinDark);
  ctx.stroke();
  starPath(ctx, x, y, 5, r * 0.55, r * 0.24);
  ctx.fillStyle = rgba(darken(COL.coin, 0.18));
  ctx.fill();
}

export function generateWheel(scene: Phaser.Scene): void {
  withCanvas(scene, 'wheel', WHEEL_SIZE, WHEEL_SIZE, (ctx, w) => {
    const c = w / 2;
    const R = WHEEL_R;
    const n = WHEEL_SEGMENTS.length;
    const seg = (Math.PI * 2) / n;
    const base = -Math.PI / 2 - seg / 2; // so wedge 0 is centred at the top

    ctx.translate(c, c);

    // wedges
    for (let i = 0; i < n; i++) {
      const a0 = base + i * seg;
      const a1 = a0 + seg;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, R, a0, a1);
      ctx.closePath();
      ctx.fillStyle = rgba(WHEEL_SEGMENTS[i].color);
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = rgba(COL.ink, 0.5);
      ctx.stroke();

      // label (coin + amount), reading from hub outward
      const mid = a0 + seg / 2;
      ctx.save();
      ctx.rotate(mid);
      ctx.translate(R * 0.62, 0);
      ctx.rotate(Math.PI / 2);
      miniCoin(ctx, 0, -16, 11);
      ctx.fillStyle = rgba(COL.cream);
      ctx.strokeStyle = rgba(COL.ink);
      ctx.lineWidth = 4;
      ctx.lineJoin = 'round';
      ctx.font = 'bold 26px "Arial Rounded MT Bold", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeText(abbrev(WHEEL_SEGMENTS[i].coins), 0, 12);
      ctx.fillText(abbrev(WHEEL_SEGMENTS[i].coins), 0, 12);
      ctx.restore();
    }

    // glossy dome
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.clip();
    const dome = ctx.createRadialGradient(-R * 0.3, -R * 0.4, 10, 0, 0, R);
    dome.addColorStop(0, 'rgba(255,255,255,0.28)');
    dome.addColorStop(0.5, 'rgba(255,255,255,0.05)');
    dome.addColorStop(1, 'rgba(0,0,0,0.18)');
    ctx.fillStyle = dome;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.fill();

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.translate(c, c);

    // gold rim
    ctx.beginPath();
    ctx.arc(0, 0, R + 6, 0, Math.PI * 2);
    ctx.lineWidth = 16;
    ctx.strokeStyle = rgba(COL.gold);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, R + 6, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = rgba(COL.goldDark);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, R + 14, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = rgba(COL.ink);
    ctx.stroke();

    // rim bulbs
    const bulbs = n * 2;
    for (let i = 0; i < bulbs; i++) {
      const a = (i / bulbs) * Math.PI * 2;
      const x = Math.cos(a) * (R + 6);
      const y = Math.sin(a) * (R + 6);
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = i % 2 ? rgba(COL.cream) : rgba(COL.red);
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = rgba(COL.ink);
      ctx.stroke();
    }
  });
}
