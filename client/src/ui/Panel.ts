/** Cartoon panel + close-button helpers used by dialog-style scenes. */
import Phaser from 'phaser';
import { W, H, COL, css, gameText } from '../theme.js';
import { lighten, darken } from '../core/format.js';

/**
 * Overlay "design space". Popup scenes (Wheel/Shop/Settings/Result) are always
 * authored in this fixed 720×1280 portrait box via `OW`/`OH`, then `frameOverlay`
 * zooms the scene camera so the whole box fits the real canvas (centred, with
 * letterbox on the sides in landscape). Portrait → zoom 1 (pixel-identical).
 */
export const OW = 720;
export const OH = 1280;

export function frameOverlay(scene: Phaser.Scene): void {
  const k = Math.min(W / OW, H / OH);
  const cam = scene.cameras.main;
  cam.setZoom(k);
  cam.centerOn(OW / 2, OH / 2);
  cam.transparent = true;
  cam.setBackgroundColor('rgba(0,0,0,0)');
}

/** Full-bleed dark dim that covers the visible world even when the camera is zoomed out. */
export function addDim(scene: Phaser.Scene, onTap?: () => void): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics().fillStyle(COL.black, 0.78).fillRect(-OW, -OH, OW * 3, OH * 3);
  g.setInteractive(new Phaser.Geom.Rectangle(-OW, -OH, OW * 3, OH * 3), Phaser.Geom.Rectangle.Contains);
  if (onTap) g.on('pointerup', onTap);
  return g;
}

/** A rounded, bevelled, gold-trimmed panel centred at (x,y). Returns the graphics. */
export function addPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  color: number = COL.panel,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  const r = 26;
  const left = x - w / 2;
  const top = y - h / 2;

  g.fillStyle(COL.black, 0.4);
  g.fillRoundedRect(left + 4, top + 10, w, h, r);

  g.fillGradientStyle(lighten(color, 0.18), lighten(color, 0.18), darken(color, 0.12), darken(color, 0.12), 1);
  g.fillRoundedRect(left, top, w, h, r);

  // top gloss
  g.fillStyle(COL.white, 0.08);
  g.fillRoundedRect(left + 6, top + 6, w - 12, h * 0.34, r - 6);

  // gold trim + ink outline
  g.lineStyle(5, COL.gold, 1);
  g.strokeRoundedRect(left, top, w, h, r);
  g.lineStyle(2, COL.ink, 0.6);
  g.strokeRoundedRect(left - 2, top - 2, w + 4, h + 4, r + 2);

  return g;
}

/** A round red ✕ button. Returns the interactive container. */
export function addCloseButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  onClose: () => void,
): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  const draw = (hover: boolean) => {
    g.clear();
    g.fillStyle(COL.black, 0.3);
    g.fillCircle(0, 3, 19);
    g.fillStyle(darken(COL.red, 0.3), 1);
    g.fillCircle(0, 1, 19);
    g.fillStyle(hover ? lighten(COL.red, 0.2) : COL.red, 1);
    g.fillCircle(0, -1, 18);
    g.fillStyle(COL.white, 0.25);
    g.fillEllipse(0, -7, 22, 10);
    g.lineStyle(3, COL.ink, 0.9);
    g.strokeCircle(0, -1, 18);
  };
  draw(false);
  const x2 = scene.add.text(0, -2, '✕', gameText(20, css(COL.cream))).setOrigin(0.5);
  c.add([g, x2]);
  c.setSize(44, 44).setInteractive({
    hitArea: new Phaser.Geom.Rectangle(-22, -22, 44, 44),
    hitAreaCallback: Phaser.Geom.Rectangle.Contains,
    useHandCursor: true,
  });
  c.on('pointerover', () => draw(true));
  c.on('pointerout', () => draw(false));
  c.on('pointerup', () => { scene.tweens.add({ targets: c, scaleX: 1.15, scaleY: 1.15, duration: 80, yoyo: true }); onClose(); });
  return c;
}

/** A small pill chip used as a section header / title ribbon. */
export function addTitleChip(scene: Phaser.Scene, x: number, y: number, text: string, color: number = COL.gold): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const label = scene.add.text(0, 0, text, gameText(26, css(COL.ink), { strokeThickness: 0, shadow: false })).setOrigin(0.5);
  const w = label.width + 56;
  const h = 48;
  const g = scene.add.graphics();
  g.fillStyle(COL.black, 0.3);
  g.fillRoundedRect(-w / 2 + 2, -h / 2 + 5, w, h, h / 2);
  g.fillGradientStyle(lighten(color, 0.25), lighten(color, 0.25), color, color, 1);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
  g.fillStyle(COL.white, 0.25);
  g.fillRoundedRect(-w / 2 + 6, -h / 2 + 5, w - 12, h * 0.4, h / 2 - 6);
  g.lineStyle(3, COL.ink, 0.9);
  g.strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
  c.add([g, label]);
  return c;
}
