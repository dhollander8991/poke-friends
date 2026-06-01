/** Cartoon poker chips + the chunky gold coin used for rewards. */
import type Phaser from 'phaser';
import { COL } from '../theme.js';
import { rgba, darken, lighten } from '../core/format.js';
import { withCanvas, circlePath, starPath, shineEllipse } from './draw.js';

type Ctx = CanvasRenderingContext2D;

function genChip(scene: Phaser.Scene, key: string, base: number): void {
  const size = 56;
  withCanvas(scene, key, size, size, (ctx, w) => {
    const c = w / 2;
    const r = c - 3;

    // soft ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(c, c + 3, r - 1, r - 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // outer ring (dark)
    circlePath(ctx, c, c, r);
    ctx.fillStyle = rgba(darken(base, 0.32));
    ctx.fill();

    // white edge dashes
    ctx.strokeStyle = rgba(COL.white);
    ctx.lineWidth = r * 0.34;
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      ctx.beginPath();
      ctx.arc(c, c, r - ctx.lineWidth / 2, a - 0.26, a + 0.26);
      ctx.stroke();
    }

    // body
    circlePath(ctx, c, c, r * 0.74);
    ctx.fillStyle = rgba(base);
    ctx.fill();

    // inner face
    circlePath(ctx, c, c, r * 0.5);
    ctx.fillStyle = rgba(lighten(base, 0.18));
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = rgba(darken(base, 0.2));
    ctx.stroke();

    // centre suit
    starPath(ctx, c, c, 4, r * 0.34, r * 0.14, 0);
    ctx.fillStyle = rgba(COL.white);
    ctx.fill();

    // gloss + outline
    shineEllipse(ctx, c, c - r * 0.34, r * 0.5, r * 0.24, 0.35);
    circlePath(ctx, c, c, r);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = rgba(COL.ink);
    ctx.stroke();
  });
}

/** Big glossy gold coin (wheel prizes, flying-coin FX, balance pills). */
function genCoin(scene: Phaser.Scene): void {
  const size = 110;
  withCanvas(scene, 'coin', size, size, (ctx, w) => {
    const c = w / 2;
    const r = c - 6;

    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(c, c + 4, r, r - 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // rim
    circlePath(ctx, c, c, r);
    ctx.fillStyle = rgba(COL.coinRim);
    ctx.fill();

    // notches on rim
    ctx.strokeStyle = rgba(COL.coinDark);
    ctx.lineWidth = 2;
    for (let i = 0; i < 28; i++) {
      const a = (i * Math.PI) / 14;
      ctx.beginPath();
      ctx.moveTo(c + Math.cos(a) * (r - 1), c + Math.sin(a) * (r - 1));
      ctx.lineTo(c + Math.cos(a) * (r - 6), c + Math.sin(a) * (r - 6));
      ctx.stroke();
    }

    // face
    circlePath(ctx, c, c, r * 0.82);
    const g = ctx.createRadialGradient(c, c - r * 0.3, r * 0.1, c, c, r * 0.82);
    g.addColorStop(0, rgba(lighten(COL.coin, 0.25)));
    g.addColorStop(1, rgba(COL.coin));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = rgba(COL.coinDark);
    ctx.stroke();

    // embossed star (shadow + face)
    starPath(ctx, c, c + 2, 5, r * 0.46, r * 0.2);
    ctx.fillStyle = rgba(darken(COL.coin, 0.22));
    ctx.fill();
    starPath(ctx, c, c - 1, 5, r * 0.46, r * 0.2);
    ctx.fillStyle = rgba(lighten(COL.coin, 0.35));
    ctx.fill();

    shineEllipse(ctx, c - r * 0.28, c - r * 0.4, r * 0.3, r * 0.16, 0.6);

    circlePath(ctx, c, c, r);
    ctx.lineWidth = 3;
    ctx.strokeStyle = rgba(COL.coinDark);
    ctx.stroke();
  });
}

export function generateChips(scene: Phaser.Scene): void {
  genChip(scene, 'chip', COL.blue);
  genChip(scene, 'chip_red', COL.red);
  genChip(scene, 'chip_green', COL.green);
  genChip(scene, 'chip_gold', COL.gold);
  genChip(scene, 'chip_purple', COL.purple);
  genCoin(scene);
}
