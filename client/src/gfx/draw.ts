/**
 * draw.ts — low-level canvas primitives shared by every texture generator.
 *
 * Everything here works on a plain CanvasRenderingContext2D so the same chunky,
 * glossy, thick-outlined cartoon language is reused for cards, chips, buttons,
 * avatars, the table and the wheel.
 */
import type Phaser from 'phaser';
import { rgba } from '../core/format.js';

type Ctx = CanvasRenderingContext2D;

/** Create a Phaser canvas texture, draw into it, and upload it. No-op if it exists. */
export function withCanvas(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  draw: (ctx: Ctx, w: number, h: number) => void,
): void {
  if (scene.textures.exists(key)) return;
  const ct = scene.textures.createCanvas(key, w, h);
  if (!ct) return;
  const ctx = ct.context;
  ctx.clearRect(0, 0, w, h);
  draw(ctx, w, h);
  ct.refresh();
}

// ─── Paths ───────────────────────────────────────────────────────────────────
export function roundRectPath(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function circlePath(ctx: Ctx, cx: number, cy: number, r: number): void {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
}

/** Star polygon path (e.g. coin emblem, VIP badge). */
export function starPath(ctx: Ctx, cx: number, cy: number, spikes: number, outer: number, inner: number, rot = -Math.PI / 2): void {
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = rot + (i * Math.PI) / spikes;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
}

// ─── Gradients ───────────────────────────────────────────────────────────────
export function vGrad(ctx: Ctx, x: number, y: number, h: number, stops: [number, number][]): CanvasGradient {
  const g = ctx.createLinearGradient(x, y, x, y + h);
  for (const [pos, col] of stops) g.addColorStop(pos, rgba(col));
  return g;
}

export function radial(ctx: Ctx, cx: number, cy: number, r: number, stops: [number, string][]): CanvasGradient {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  for (const [pos, col] of stops) g.addColorStop(pos, col);
  return g;
}

// ─── Common decorations ──────────────────────────────────────────────────────

/** Thick dark cartoon outline around the current path's shape (call before fill). */
export function outlineRoundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, color: number, width: number): void {
  roundRectPath(ctx, x, y, w, h, r);
  ctx.lineWidth = width;
  ctx.strokeStyle = rgba(color);
  ctx.lineJoin = 'round';
  ctx.stroke();
}

/** Glossy top highlight inside a rounded rect — the wet plastic "juice". */
export function glossRoundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, alpha = 0.35): void {
  ctx.save();
  roundRectPath(ctx, x + 3, y + 3, w - 6, h * 0.5, r);
  ctx.clip();
  const g = ctx.createLinearGradient(0, y, 0, y + h * 0.55);
  g.addColorStop(0, `rgba(255,255,255,${alpha})`);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

/** Soft elliptical shine on a circle (chips, coins, avatars). */
export function shineEllipse(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, alpha = 0.4): void {
  ctx.save();
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function dropShadow(ctx: Ctx, blur = 8, dy = 4, alpha = 0.35): void {
  ctx.shadowColor = `rgba(0,0,0,${alpha})`;
  ctx.shadowBlur = blur;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = dy;
}

export function clearShadow(ctx: Ctx): void {
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}
