/** Small reusable FX textures: soft glow, sparkle star, wheel pointer. */
import type Phaser from 'phaser';
import { COL } from '../theme.js';
import { rgba } from '../core/format.js';
import { withCanvas, starPath } from './draw.js';

/** Soft white radial — tint it for active-seat rings, win bursts, button halos. */
function genGlow(scene: Phaser.Scene): void {
  withCanvas(scene, 'glow', 128, 128, (ctx, w) => {
    const c = w / 2;
    const g = ctx.createRadialGradient(c, c, 0, c, c, c);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.6)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, w);
  });
}

/** 4-point sparkle for particle bursts (win, spin, purchase). */
function genSparkle(scene: Phaser.Scene): void {
  withCanvas(scene, 'sparkle', 32, 32, (ctx, w) => {
    const c = w / 2;
    starPath(ctx, c, c, 4, c - 2, 3);
    const g = ctx.createRadialGradient(c, c, 0, c, c, c);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.6, rgba(COL.goldHi));
    g.addColorStop(1, 'rgba(255,210,80,0)');
    ctx.fillStyle = g;
    ctx.fill();
  });
}

/** Downward pointer that sits above the wheel. */
function genPointer(scene: Phaser.Scene): void {
  withCanvas(scene, 'pointer', 56, 64, (ctx, w) => {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.moveTo(w / 2, 58);
    ctx.lineTo(8, 8);
    ctx.lineTo(w - 8, 8);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(w / 2, 52);
    ctx.lineTo(10, 6);
    ctx.lineTo(w - 10, 6);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, 0, 0, 52);
    g.addColorStop(0, rgba(COL.red));
    g.addColorStop(1, rgba(COL.redDark));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = rgba(COL.ink);
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(w / 2, 16, 7, 0, Math.PI * 2);
    ctx.fillStyle = rgba(COL.goldHi);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = rgba(COL.ink);
    ctx.stroke();
  });
}

/** Blue gem (secondary currency in the mockups' top bars). */
function genGem(scene: Phaser.Scene): void {
  withCanvas(scene, 'gem', 44, 44, (ctx, w) => {
    const c = w / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(c, c + 3, 16, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(c, c - 15); ctx.lineTo(c + 16, c - 4); ctx.lineTo(c + 10, c + 15);
    ctx.lineTo(c - 10, c + 15); ctx.lineTo(c - 16, c - 4); ctx.closePath();
    const g = ctx.createLinearGradient(c, c - 15, c, c + 15);
    g.addColorStop(0, rgba(0x9fe8ff)); g.addColorStop(1, rgba(0x2f8fd0));
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = rgba(0x123a5a); ctx.lineJoin = 'round'; ctx.stroke();
    // facets
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(c - 16, c - 4); ctx.lineTo(c, c - 1); ctx.lineTo(c + 16, c - 4); ctx.moveTo(c, c - 1); ctx.lineTo(c, c + 15); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.moveTo(c - 6, c - 9); ctx.lineTo(c - 1, c - 8); ctx.lineTo(c - 4, c - 2); ctx.closePath(); ctx.fill();
  });
}

/** Simple Google "G" badge for the social-login button. */
function genGoogleLogo(scene: Phaser.Scene): void {
  withCanvas(scene, 'g_logo', 40, 40, (ctx, w) => {
    const c = w / 2;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(c, c, 18, 0, Math.PI * 2); ctx.fill();
    ctx.font = 'bold 26px "Arial", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#4285F4'; ctx.fillText('G', c, c + 1);
  });
}

export function generateUiFx(scene: Phaser.Scene): void {
  genGlow(scene);
  genSparkle(scene);
  genPointer(scene);
  genGem(scene);
  genGoogleLogo(scene);
}
