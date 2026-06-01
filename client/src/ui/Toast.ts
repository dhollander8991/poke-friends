/** Lightweight floating toast pill for transient messages. */
import Phaser from 'phaser';
import { W, COL, css, gameText } from '../theme.js';
import { lighten, darken } from '../core/format.js';

export function showToast(
  scene: Phaser.Scene,
  text: string,
  opts: { y?: number; color?: number; duration?: number } = {},
): void {
  const y = opts.y ?? 120;
  const color = opts.color ?? COL.panel;
  const c = scene.add.container(W / 2, y).setDepth(9999);

  const label = scene.add.text(0, 0, text, gameText(20, css(COL.cream))).setOrigin(0.5);
  const w = label.width + 56;
  const h = 52;
  const g = scene.add.graphics();
  g.fillStyle(COL.black, 0.35); g.fillRoundedRect(-w / 2 + 2, -h / 2 + 4, w, h, h / 2);
  g.fillGradientStyle(lighten(color, 0.2), lighten(color, 0.2), darken(color, 0.15), darken(color, 0.15), 1);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
  g.lineStyle(3, COL.gold, 1); g.strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
  c.add([g, label]);

  c.setScale(0.6).setAlpha(0);
  scene.tweens.add({ targets: c, scale: 1, alpha: 1, y: y + 10, duration: 260, ease: 'Back.Out' });
  scene.tweens.add({
    targets: c,
    alpha: 0,
    y: y - 20,
    delay: opts.duration ?? 2200,
    duration: 350,
    ease: 'Quad.In',
    onComplete: () => c.destroy(),
  });
}
