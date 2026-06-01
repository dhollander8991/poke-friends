/** Animated coin-balance pill that count-ups when the wallet changes. */
import Phaser from 'phaser';
import { COL, css, gameText } from '../theme.js';
import { lighten, darken, commas } from '../core/format.js';
import { getCoins, onCoins } from '../core/Wallet.js';

export interface CoinCounterOpts {
  x: number;
  y: number;
  width?: number;
  plus?: boolean;
  onPlus?: () => void;
}

export class CoinCounter extends Phaser.GameObjects.Container {
  private label: Phaser.GameObjects.Text;
  private coin: Phaser.GameObjects.Image;
  private displayed: number;
  private unsub: () => void;

  constructor(scene: Phaser.Scene, opts: CoinCounterOpts) {
    super(scene, opts.x, opts.y);
    const w = opts.width ?? 200;
    const h = 52;
    this.displayed = getCoins();

    const g = scene.add.graphics();
    g.fillStyle(COL.black, 0.35);
    g.fillRoundedRect(-w / 2 + 2, -h / 2 + 4, w, h, h / 2);
    g.fillGradientStyle(lighten(COL.panel, 0.1), lighten(COL.panel, 0.1), darken(COL.panel, 0.2), darken(COL.panel, 0.2), 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    g.lineStyle(3, COL.gold, 1);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    this.add(g);

    this.coin = scene.add.image(-w / 2 + 6, 0, 'coin').setDisplaySize(46, 46);
    this.add(this.coin);

    this.label = scene.add
      .text(-w / 2 + 36, -1, commas(this.displayed), gameText(24, css(COL.cream)))
      .setOrigin(0, 0.5);
    this.add(this.label);

    if (opts.plus) {
      const px = w / 2 - 4;
      const pg = scene.add.graphics();
      pg.fillStyle(darken(COL.green, 0.3), 1); pg.fillCircle(px, 2, 18);
      pg.fillStyle(COL.green, 1); pg.fillCircle(px, 0, 17);
      pg.fillStyle(COL.white, 0.25); pg.fillEllipse(px, -6, 20, 9);
      pg.lineStyle(3, COL.ink, 0.9); pg.strokeCircle(px, 0, 17);
      const plus = scene.add.text(px, -2, '+', gameText(28, css(COL.cream))).setOrigin(0.5);
      this.add([pg, plus]);
      const zone = scene.add.zone(px, 0, 40, 40).setInteractive({ useHandCursor: true });
      zone.on('pointerup', () => { scene.tweens.add({ targets: plus, scale: 1.3, duration: 90, yoyo: true }); opts.onPlus?.(); });
      this.add(zone);
    }

    this.unsub = onCoins((v) => this.animateTo(v));
    this.once('destroy', () => this.unsub());
    scene.add.existing(this);
  }

  private animateTo(target: number): void {
    this.scene.tweens.add({ targets: this.coin, scale: this.coin.scale * 1.25, duration: 140, yoyo: true });
    const ref = { v: this.displayed };
    this.scene.tweens.add({
      targets: ref,
      v: target,
      duration: 600,
      ease: 'Cubic.Out',
      onUpdate: () => this.label.setText(commas(Math.round(ref.v))),
      onComplete: () => { this.displayed = target; this.label.setText(commas(target)); },
    });
  }
}
