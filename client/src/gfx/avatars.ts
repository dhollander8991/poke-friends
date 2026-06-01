/** Procedural cartoon portrait avatars — head-and-shoulders in a gold ring. */
import type Phaser from 'phaser';
import { AVATAR_COUNT, COL } from '../theme.js';
import { rgba, darken, lighten } from '../core/format.js';
import { withCanvas, circlePath, starPath } from './draw.js';

type Ctx = CanvasRenderingContext2D;

interface Spec {
  skin: number;
  hair: number;
  shirt: number;
  style: 'short' | 'spiky' | 'bun' | 'long' | 'bald' | 'cap';
  acc: 'none' | 'glasses' | 'shades' | 'mustache' | 'crown' | 'beard';
  accColor?: number;
}

const SPECS: Spec[] = [
  { skin: 0xffcd94, hair: 0x5a3a22, shirt: 0x3a6ea8, style: 'short', acc: 'glasses' },
  { skin: 0xf2b98c, hair: 0x2a2a3a, shirt: 0x9a3030, style: 'spiky', acc: 'none' },
  { skin: 0xffd9b3, hair: 0x8a4a2a, shirt: 0x6a3a8a, style: 'long', acc: 'none' },
  { skin: 0xc78a52, hair: 0x1a1a22, shirt: 0x2f7d52, style: 'bun', acc: 'none' },
  { skin: 0xffcd94, hair: 0x3a2a18, shirt: 0x2a2a38, style: 'bald', acc: 'shades', accColor: 0x222233 },
  { skin: 0x8a5a36, hair: 0x111118, shirt: 0xc88a2a, style: 'short', acc: 'beard' },
  { skin: 0xffd9b3, hair: 0xc98a2a, shirt: 0x7a4a24, style: 'cap', acc: 'mustache', accColor: 0xc62a2b },
  { skin: 0xf2b98c, hair: 0xd8c020, shirt: 0xb83a5a, style: 'long', acc: 'crown' },
];

function drawFace(ctx: Ctx, c: number, spec: Spec, hy: number): void {
  const headR = 30;

  // back hair / volume
  if (spec.style !== 'bald' && spec.style !== 'cap') {
    ctx.fillStyle = rgba(spec.hair);
    ctx.beginPath();
    ctx.arc(c, hy - 4, headR + (spec.style === 'long' ? 8 : 4), 0, Math.PI * 2);
    ctx.fill();
  }
  if (spec.style === 'long') {
    ctx.fillStyle = rgba(spec.hair);
    ctx.beginPath();
    ctx.ellipse(c - headR - 2, hy + 6, 9, 22, 0, 0, Math.PI * 2);
    ctx.ellipse(c + headR + 2, hy + 6, 9, 22, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // head
  circlePath(ctx, c, hy, headR);
  const skin = ctx.createLinearGradient(0, hy - headR, 0, hy + headR);
  skin.addColorStop(0, rgba(lighten(spec.skin, 0.12)));
  skin.addColorStop(1, rgba(darken(spec.skin, 0.1)));
  ctx.fillStyle = skin;
  ctx.fill();

  // ears
  ctx.fillStyle = rgba(spec.skin);
  for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(c + sx * headR, hy + 2, 5, 0, Math.PI * 2); ctx.fill(); }

  // fringe (front hair)
  if (spec.style !== 'bald' && spec.style !== 'cap') {
    ctx.save();
    circlePath(ctx, c, hy, headR); ctx.clip();
    ctx.fillStyle = rgba(spec.hair);
    ctx.fillRect(c - headR, hy - headR, headR * 2, headR * 0.78);
    ctx.beginPath();
    ctx.moveTo(c - headR, hy - 4);
    ctx.quadraticCurveTo(c - headR / 2, hy + 4, c, hy - 4);
    ctx.quadraticCurveTo(c + headR / 2, hy + 4, c + headR, hy - 4);
    ctx.lineTo(c + headR, hy - headR); ctx.lineTo(c - headR, hy - headR); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  if (spec.style === 'spiky') {
    ctx.fillStyle = rgba(spec.hair);
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(c + i * 11 - 7, hy - headR + 6);
      ctx.lineTo(c + i * 11, hy - headR - 9);
      ctx.lineTo(c + i * 11 + 7, hy - headR + 6);
      ctx.closePath(); ctx.fill();
    }
  }
  if (spec.style === 'bun') {
    ctx.fillStyle = rgba(spec.hair);
    ctx.beginPath(); ctx.arc(c, hy - headR - 3, 10, 0, Math.PI * 2); ctx.fill();
  }
  if (spec.style === 'bald') {
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath(); ctx.ellipse(c - 8, hy - 16, 8, 5, -0.5, 0, Math.PI * 2); ctx.fill();
  }
  if (spec.style === 'cap') {
    const cap = spec.accColor ?? COL.red;
    ctx.fillStyle = rgba(cap);
    ctx.beginPath(); ctx.arc(c, hy - 6, headR - 1, Math.PI, Math.PI * 2); ctx.fill();
    ctx.fillRect(c - 2, hy - 12, headR + 8, 7);
  }

  // eyes
  const ey = hy - 1;
  for (const sx of [-1, 1]) {
    ctx.fillStyle = rgba(COL.white);
    ctx.beginPath(); ctx.ellipse(c + sx * 11, ey, 6, 7.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = rgba(COL.ink);
    ctx.beginPath(); ctx.arc(c + sx * 11 + 1, ey + 1, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = rgba(COL.white);
    ctx.beginPath(); ctx.arc(c + sx * 11 + 2, ey, 1.2, 0, Math.PI * 2); ctx.fill();
  }
  // brows
  ctx.strokeStyle = rgba(darken(spec.hair, 0.1)); ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  for (const sx of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(c + sx * 11 - 5, ey - 10); ctx.lineTo(c + sx * 11 + 5, ey - 11); ctx.stroke();
  }
  // cheeks
  ctx.fillStyle = rgba(COL.red, 0.2);
  for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(c + sx * 17, hy + 9, 5, 0, Math.PI * 2); ctx.fill(); }
  // smile
  ctx.strokeStyle = rgba(COL.ink); ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(c, hy + 8, 10, 0.18 * Math.PI, 0.82 * Math.PI); ctx.stroke();

  // accessories
  if (spec.acc === 'glasses') {
    ctx.strokeStyle = rgba(COL.ink); ctx.lineWidth = 2;
    for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(c + sx * 11, ey, 9, 0, Math.PI * 2); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(c - 2, ey); ctx.lineTo(c + 2, ey); ctx.stroke();
  } else if (spec.acc === 'shades') {
    ctx.fillStyle = rgba(spec.accColor ?? COL.ink);
    for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(c + sx * 11, ey, 9, 7, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillRect(c - 4, ey - 2, 8, 3);
  } else if (spec.acc === 'mustache') {
    ctx.fillStyle = rgba(spec.accColor ?? darken(spec.hair, 0.1));
    ctx.beginPath();
    ctx.moveTo(c, hy + 5);
    ctx.quadraticCurveTo(c - 12, hy + 2, c - 14, hy + 9);
    ctx.quadraticCurveTo(c - 8, hy + 7, c, hy + 7);
    ctx.quadraticCurveTo(c + 8, hy + 7, c + 14, hy + 9);
    ctx.quadraticCurveTo(c + 12, hy + 2, c, hy + 5);
    ctx.fill();
  } else if (spec.acc === 'beard') {
    ctx.fillStyle = rgba(spec.hair); ctx.save();
    circlePath(ctx, c, hy, headR); ctx.clip();
    ctx.beginPath(); ctx.arc(c, hy + 6, headR, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.lineTo(c - headR, hy + headR); ctx.lineTo(c + headR, hy + headR); ctx.fill(); ctx.restore();
  } else if (spec.acc === 'crown') {
    ctx.fillStyle = rgba(COL.gold);
    ctx.beginPath();
    ctx.moveTo(c - 16, hy - headR + 2); ctx.lineTo(c - 16, hy - headR - 12); ctx.lineTo(c - 8, hy - headR - 2);
    ctx.lineTo(c, hy - headR - 16); ctx.lineTo(c + 8, hy - headR - 2); ctx.lineTo(c + 16, hy - headR - 12);
    ctx.lineTo(c + 16, hy - headR + 2); ctx.closePath(); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = rgba(COL.coinDark); ctx.stroke();
  }
}

function genAvatar(scene: Phaser.Scene, i: number): void {
  const spec = SPECS[i % SPECS.length];
  withCanvas(scene, `avatar_${i}`, 104, 104, (ctx, w) => {
    const c = w / 2;
    const R = 47;

    // portrait background (neutral dark)
    ctx.save();
    circlePath(ctx, c, c, R); ctx.clip();
    const bg = ctx.createRadialGradient(c, c - 16, 10, c, c, R);
    bg.addColorStop(0, rgba(0x4a4250));
    bg.addColorStop(1, rgba(0x241c28));
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, w);

    // shoulders (shirt)
    ctx.fillStyle = rgba(spec.shirt);
    ctx.beginPath(); ctx.ellipse(c, c + R * 0.92, R * 0.92, R * 0.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = rgba(lighten(spec.shirt, 0.12));
    ctx.beginPath(); ctx.ellipse(c, c + R * 0.86, R * 0.5, R * 0.34, 0, 0, Math.PI * 2); ctx.fill();

    drawFace(ctx, c, spec, c - 8);
    ctx.restore();

    // polished gold ring frame
    circlePath(ctx, c, c, R); ctx.lineWidth = 5; ctx.strokeStyle = rgba(COL.gold); ctx.stroke();
    circlePath(ctx, c, c, R - 2.5); ctx.lineWidth = 1.5; ctx.strokeStyle = rgba(COL.goldHi); ctx.stroke();
    circlePath(ctx, c, c, R + 2); ctx.lineWidth = 2; ctx.strokeStyle = rgba(COL.ink); ctx.stroke();
  });
}

function genEmptySeat(scene: Phaser.Scene): void {
  withCanvas(scene, 'avatar_empty', 104, 104, (ctx, w) => {
    const c = w / 2, R = 47;
    circlePath(ctx, c, c, R);
    ctx.fillStyle = 'rgba(20,10,6,0.5)'; ctx.fill();
    ctx.setLineDash([7, 7]); ctx.lineWidth = 3; ctx.strokeStyle = rgba(COL.gold, 0.5);
    circlePath(ctx, c, c, R - 3); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = rgba(COL.gold, 0.6); ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(c, c - 12); ctx.lineTo(c, c + 12); ctx.moveTo(c - 12, c); ctx.lineTo(c + 12, c); ctx.stroke();
  });
}

function genDealerButton(scene: Phaser.Scene): void {
  withCanvas(scene, 'dealer_btn', 40, 40, (ctx, w) => {
    const c = w / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.arc(c, c + 2, 16, 0, Math.PI * 2); ctx.fill();
    circlePath(ctx, c, c, 16); ctx.fillStyle = rgba(COL.white); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = rgba(COL.gold); ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = rgba(COL.ink); circlePath(ctx, c, c, 16); ctx.stroke();
    ctx.fillStyle = rgba(COL.ink); ctx.font = 'bold 18px "Arial Rounded MT Bold", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('D', c, c + 1);
  });
}

function genCrownBadge(scene: Phaser.Scene): void {
  withCanvas(scene, 'crown', 48, 40, (ctx, w, h) => {
    ctx.fillStyle = rgba(COL.gold);
    ctx.beginPath();
    ctx.moveTo(6, h - 8); ctx.lineTo(6, 14); ctx.lineTo(w / 2 - 8, h - 18); ctx.lineTo(w / 2, 6);
    ctx.lineTo(w / 2 + 8, h - 18); ctx.lineTo(w - 6, 14); ctx.lineTo(w - 6, h - 8); ctx.closePath(); ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = rgba(COL.coinDark); ctx.stroke();
    for (const x of [6, w / 2, w - 6]) { starPath(ctx, x, x === w / 2 ? 6 : 14, 4, 4, 1.6); ctx.fillStyle = rgba(COL.goldHi); ctx.fill(); }
  });
}

export function generateAvatars(scene: Phaser.Scene): void {
  for (let i = 0; i < AVATAR_COUNT; i++) genAvatar(scene, i);
  genEmptySeat(scene);
  genDealerButton(scene);
  genCrownBadge(scene);
}

/**
 * Build/refresh the `avatar_custom` texture from an uploaded image (data URL):
 * the photo is cover-fit into a circle and framed with the same gold ring as the
 * presets. Async (waits for the image to decode); calls `onDone` when ready.
 */
export function loadCustomAvatar(scene: Phaser.Scene, dataUrl: string, onDone?: () => void): void {
  const img = new Image();
  img.onload = () => {
    if (scene.textures.exists('avatar_custom')) scene.textures.remove('avatar_custom');
    const ct = scene.textures.createCanvas('avatar_custom', 104, 104);
    if (!ct) { onDone?.(); return; }
    const ctx = ct.context;
    const c = 52, R = 47;
    ctx.clearRect(0, 0, 104, 104);
    ctx.save();
    circlePath(ctx, c, c, R - 1);
    ctx.clip();
    // cover-fit the image into the circle
    const s = Math.max((R * 2) / img.width, (R * 2) / img.height);
    const dw = img.width * s, dh = img.height * s;
    ctx.drawImage(img, c - dw / 2, c - dh / 2, dw, dh);
    ctx.restore();
    // gold ring frame to match presets
    circlePath(ctx, c, c, R); ctx.lineWidth = 5; ctx.strokeStyle = rgba(COL.gold); ctx.stroke();
    circlePath(ctx, c, c, R - 2.5); ctx.lineWidth = 1.5; ctx.strokeStyle = rgba(COL.goldHi); ctx.stroke();
    circlePath(ctx, c, c, R + 2); ctx.lineWidth = 2; ctx.strokeStyle = rgba(COL.ink); ctx.stroke();
    ct.refresh();
    onDone?.();
  };
  img.onerror = () => onDone?.();
  img.src = dataUrl;
}

/** Resolve a texture key, falling back to a preset if it isn't loaded yet. */
export function resolveAvatar(scene: Phaser.Scene, key: string): string {
  return scene.textures.exists(key) ? key : 'avatar_0';
}
