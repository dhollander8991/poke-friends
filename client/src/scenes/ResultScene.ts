import Phaser from 'phaser';
import type { GameState } from '@texas-holdem/shared';
import { COL, css, gameText } from '../theme.js';
import { commas } from '../core/format.js';
import { addPanel, frameOverlay, addDim, OW, OH } from '../ui/Panel.js';
import { resolveAvatar } from '../gfx/avatars.js';
import { getAvatarKey } from '../core/Wallet.js';
import { SoundManager } from '../audio/SoundManager.js';

interface SceneData { state: GameState; myPlayerId: string; }

export class ResultScene extends Phaser.Scene {
  constructor() { super('ResultScene'); }

  create(data: SceneData) {
    const { state, myPlayerId } = data;
    if (!state || state.winners.length === 0) { this.time.delayedCall(800, () => this.scene.stop()); return; }

    frameOverlay(this);
    addDim(this, () => this.scene.stop());

    const iWon = state.winners.some(w => w.playerId === myPlayerId);
    const cx = OW / 2;
    const rows = state.winners.length;
    const ph = 150 + rows * 78;
    const cy = OH / 2;
    addPanel(this, cx, cy, 560, ph, iWon ? 0x2a6a3a : COL.panel);

    this.add.text(cx, cy - ph / 2 + 44, iWon ? '🏆 YOU WIN!' : '🏆 SHOWDOWN', gameText(46, css(COL.gold), { strokeThickness: 8 })).setOrigin(0.5);

    let ry = cy - ph / 2 + 110;
    for (const w of state.winners) {
      const player = state.players.find(p => p.id === w.playerId);
      const name = player?.name ?? 'Winner';
      const isMe = w.playerId === myPlayerId;
      const avKey = isMe ? resolveAvatar(this, getAvatarKey()) : `avatar_${this.avatarFor(w.playerId)}`;

      this.add.image(cx - 210, ry, avKey).setDisplaySize(64, 64);
      this.add.text(cx - 165, ry - 14, name, gameText(22, isMe ? css(COL.gold) : css(COL.cream))).setOrigin(0, 0.5);
      this.add.text(cx - 165, ry + 14, w.handName, gameText(15, css(COL.cream), { strokeThickness: 0, shadow: false })).setOrigin(0, 0.5);

      const coin = this.add.image(cx + 120, ry, 'coin').setDisplaySize(40, 40);
      const amt = this.add.text(cx + 146, ry, `+${commas(w.amount)}`, gameText(28, css(COL.green), { strokeThickness: 6 })).setOrigin(0, 0.5);
      this.tweens.add({ targets: coin, scaleX: { from: 0, to: coin.scaleX }, scaleY: { from: 0, to: coin.scaleY }, duration: 400, delay: 250, ease: 'Back.Out' });
      this.tweens.add({ targets: amt, scale: { from: 0, to: 1 }, duration: 400, delay: 250, ease: 'Back.Out' });
      ry += 78;
    }

    this.add.text(cx, cy + ph / 2 - 26, 'tap to continue', gameText(14, css(COL.cream), { strokeThickness: 0 })).setOrigin(0.5).setAlpha(0.7);

    if (iWon) {
      SoundManager.play('win', 0.7);
      this.add.particles(cx, cy - ph / 2, 'sparkle', { x: { min: -260, max: 260 }, speedY: { min: 120, max: 320 }, speedX: { min: -60, max: 60 }, scale: { start: 1, end: 0 }, lifespan: 1400, quantity: 3, frequency: 60, tint: [COL.gold, COL.green, COL.blue] });
    }

    this.time.delayedCall(5200, () => this.scene.isActive() && this.scene.stop());
  }

  private avatarFor(id: string): number {
    let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
    return Math.abs(h) % 8;
  }
}
