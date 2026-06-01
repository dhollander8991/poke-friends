import Phaser from 'phaser';
import { W, H, BRAND, COL, css, gameText } from '../theme.js';
import { buildArt } from '../gfx/index.js';
import { loadCustomAvatar } from '../gfx/avatars.js';
import { getCustomAvatar } from '../core/Wallet.js';
import { SoundManager } from '../audio/SoundManager.js';

export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  create() {
    // simple gradient backdrop (real textures don't exist yet)
    const bg = this.add.graphics();
    bg.fillGradientStyle(COL.bgTop, COL.bgTop, COL.bgBot, COL.bgBot, 1);
    bg.fillRect(0, 0, W, H);

    this.add.text(W / 2, H / 2 - 96, BRAND, gameText(64, css(COL.gold), { strokeThickness: 8 }))
      .setOrigin(0.5);
    this.add.text(W / 2, H / 2 - 44, 'PLAY POKER WITH FRIENDS', gameText(20, css(COL.cream)))
      .setOrigin(0.5);

    const barW = 440, barX = W / 2 - barW / 2, barY = H / 2 + 30;
    const track = this.add.graphics();
    track.fillStyle(COL.black, 0.35); track.fillRoundedRect(barX, barY, barW, 26, 13);
    track.lineStyle(3, COL.ink, 0.8); track.strokeRoundedRect(barX, barY, barW, 26, 13);

    const fill = this.add.graphics();
    const label = this.add.text(W / 2, barY + 52, 'Shuffling…', gameText(18, css(COL.cream))).setOrigin(0.5);

    const drawBar = (p: number) => {
      fill.clear();
      const w = Math.max(0, Math.min(1, p)) * (barW - 8);
      if (w > 0) {
        fill.fillStyle(COL.gold, 1); fill.fillRoundedRect(barX + 4, barY + 4, w, 18, 9);
        fill.fillStyle(COL.white, 0.3); fill.fillRoundedRect(barX + 4, barY + 4, w, 7, 9);
      }
    };

    const steps = buildArt(this);
    let i = 0;
    const tick = () => {
      if (i < steps.length) {
        label.setText(steps[i].label);
        steps[i].run();
        i++;
        drawBar(i / steps.length);
        this.time.delayedCall(16, tick);
      } else {
        SoundManager.init();
        const custom = getCustomAvatar();
        if (custom) loadCustomAvatar(this, custom);
        label.setText('Ready!');
        this.time.delayedCall(250, () => this.scene.start('HomeScene'));
      }
    };
    drawBar(0);
    this.time.delayedCall(60, tick);
  }
}
