/** Full-screen warm casino backgrounds (portrait). */
import type Phaser from 'phaser';
import { W, H, COL } from '../theme.js';
import { rgba, lighten, darken } from '../core/format.js';
import { withCanvas } from './draw.js';

type Ctx = CanvasRenderingContext2D;

function bokeh(ctx: Ctx, seed: number, color: number): void {
  let s = seed;
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let i = 0; i < 30; i++) {
    const x = rnd() * W, y = rnd() * H, r = 16 + rnd() * 64;
    ctx.globalAlpha = 0.04 + rnd() * 0.07;
    ctx.fillStyle = rgba(color);
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function vignette(ctx: Ctx, strength = 0.5): void {
  const g = ctx.createRadialGradient(W / 2, H * 0.4, 140, W / 2, H / 2, H * 0.62);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

export function generateBackdrops(scene: Phaser.Scene): void {
  // ── table backdrop: warm casino interior ──
  withCanvas(scene, 'backdrop', W, H, (ctx) => {
    const g = ctx.createRadialGradient(W / 2, H * 0.4, 60, W / 2, H * 0.5, H * 0.7);
    g.addColorStop(0, rgba(COL.bgGlow));
    g.addColorStop(0.55, rgba(COL.bgTop));
    g.addColorStop(1, rgba(COL.bgBot));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    bokeh(ctx, 7, COL.goldHi);
    vignette(ctx, 0.55);
  });

  // ── home backdrop: rich wood / leather ──
  withCanvas(scene, 'backdrop_home', W, H, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, rgba(lighten(COL.wood, 0.1)));
    g.addColorStop(0.5, rgba(COL.wood));
    g.addColorStop(1, rgba(darken(COL.wood, 0.32)));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // vertical plank seams
    ctx.strokeStyle = rgba(COL.woodDark, 0.3); ctx.lineWidth = 2;
    for (let x = 90; x < W; x += 120) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    // warm top glow
    const gg = ctx.createRadialGradient(W / 2, -40, 40, W / 2, H * 0.28, W);
    gg.addColorStop(0, rgba(COL.bgGlow, 0.5)); gg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gg; ctx.fillRect(0, 0, W, H);
    bokeh(ctx, 19, COL.goldHi);
    vignette(ctx, 0.5);
  });
}
