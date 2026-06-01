/** A juicy, bevelled cartoon button — the workhorse control across every scene. */
import Phaser from 'phaser';
import { COL, css, gameText } from '../theme.js';
import { lighten, darken } from '../core/format.js';

export interface ButtonOpts {
  x: number;
  y: number;
  width?: number;
  height?: number;
  label: string;
  color?: number;
  textColor?: string;
  fontSize?: number;
  icon?: string; // texture key drawn left of the label
  iconScale?: number;
  onClick?: () => void;
}

export class CartoonButton extends Phaser.GameObjects.Container {
  private g: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private icon?: Phaser.GameObjects.Image;
  private bw: number;
  private bh: number;
  private baseColor: number;
  private enabled = true;
  private pressed = false;
  private hover = false;
  private onClick?: () => void;

  constructor(scene: Phaser.Scene, opts: ButtonOpts) {
    super(scene, opts.x, opts.y);
    this.bw = opts.width ?? 240;
    this.bh = opts.height ?? 64;
    this.baseColor = opts.color ?? COL.green;
    this.onClick = opts.onClick;

    this.g = scene.add.graphics();
    this.add(this.g);

    const fs = opts.fontSize ?? Math.round(this.bh * 0.4);
    this.label = scene.add
      .text(0, -2, opts.label, gameText(fs, opts.textColor ?? css(COL.cream)))
      .setOrigin(0.5);
    this.add(this.label);

    if (opts.icon) {
      this.icon = scene.add.image(0, 0, opts.icon).setScale(opts.iconScale ?? 1);
      this.add(this.icon);
    }

    this.render();
    this.layoutContent();

    this.setSize(this.bw, this.bh);
    this.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(-this.bw / 2, -this.bh / 2, this.bw, this.bh),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });
    this.on('pointerover', () => { this.hover = true; this.render(); });
    this.on('pointerout', () => { this.hover = false; this.pressed = false; this.render(); this.layoutContent(); });
    this.on('pointerdown', () => { if (!this.enabled) return; this.pressed = true; this.render(); this.layoutContent(); });
    this.on('pointerup', () => {
      if (!this.enabled) return;
      const wasPressed = this.pressed;
      this.pressed = false;
      this.render();
      this.layoutContent();
      if (wasPressed) {
        this.scene.tweens.add({ targets: this, scaleX: 1.06, scaleY: 1.06, duration: 80, yoyo: true });
        this.onClick?.();
      }
    });

    scene.add.existing(this);
  }

  private render(): void {
    const w = this.bw, h = this.bh;
    const r = Math.min(18, h / 2);
    const base = this.enabled ? this.baseColor : 0x6a6a7a;
    const lip = this.pressed ? 2 : 6;   // dark lip peeking at the bottom = the 3D depth
    const topH = h - lip;
    const g = this.g;
    g.clear();

    // 3D base (dark) — full height; only the bottom `lip` px stay visible
    g.fillStyle(darken(base, 0.4), 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, r);

    // top face (gradient) sits on top, leaving the lip exposed below it
    const top = this.hover && this.enabled ? lighten(base, 0.34) : lighten(base, 0.22);
    g.fillGradientStyle(top, top, base, base, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, topH, r);

    // gloss highlight on the upper portion of the face
    g.fillStyle(COL.white, this.enabled ? 0.2 : 0.08);
    g.fillRoundedRect(-w / 2 + 5, -h / 2 + 4, w - 10, topH * 0.42, r - 5);

    // single ink outline around the whole button
    g.lineStyle(3, COL.ink, 0.9);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
  }

  private layoutContent(): void {
    const lip = this.pressed ? 2 : 6;
    const cy = -lip / 2; // vertical centre of the visible top face (moves down 2px when pressed)
    const iconW = this.icon ? this.icon.displayWidth + 10 : 0;
    this.label.y = cy;
    if (this.icon) {
      this.icon.y = cy;
      this.icon.x = -this.label.width / 2 - 6;
      this.label.x = iconW / 2;
    } else {
      this.label.x = 0;
    }
  }

  setLabel(text: string): this {
    this.label.setText(text);
    this.layoutContent();
    return this;
  }

  setEnabled(on: boolean): this {
    this.enabled = on;
    this.setAlpha(on ? 1 : 0.8);
    this.render();
    return this;
  }
}
