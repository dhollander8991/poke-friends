import Phaser from 'phaser';
import { WHEEL_SEGMENTS, WHEEL_COOLDOWN_MS, pickWeightedSegment } from '@texas-holdem/shared';
import { COL, css, gameText } from '../theme.js';
import { CartoonButton } from '../ui/CartoonButton.js';
import { addCloseButton, frameOverlay, addDim, OW } from '../ui/Panel.js';
import { showToast } from '../ui/Toast.js';
import { SoundManager } from '../audio/SoundManager.js';
import { spinWheel, wheelNextAt, setWheelNextAt } from '../network/ApiClient.js';
import { addCoins } from '../core/Wallet.js';

const SEG = 360 / WHEEL_SEGMENTS.length;
const CX = OW / 2;   // overlays are authored in fixed 720×1280 design space
const CY = 590;

export class WheelScene extends Phaser.Scene {
  private wheel!: Phaser.GameObjects.Image;
  private countdown!: Phaser.GameObjects.Text;
  private spinBtn!: CartoonButton;
  private spinning = false;
  private ready = false;
  private lastTick = 0;
  private cdTimer?: Phaser.Time.TimerEvent;

  constructor() { super('WheelScene'); }

  create() {
    frameOverlay(this);
    addDim(this, () => { if (this.ready && !this.spinning) this.close(); });
    this.time.delayedCall(300, () => { this.ready = true; });

    this.add.text(CX, 120, '✦ DAILY BONUS ✦', gameText(30, css(COL.gold), { strokeThickness: 6 })).setOrigin(0.5);
    this.add.text(CX, 168, 'SPIN', gameText(56, css(COL.gold), { strokeThickness: 8 })).setOrigin(0.5);
    this.countdown = this.add.text(CX, 218, '', gameText(18, css(COL.cream))).setOrigin(0.5);
    addCloseButton(this, OW - 48, 56, () => { if (this.ready && !this.spinning) this.close(); });

    this.wheel = this.add.image(CX, CY, 'wheel').setScale(1.04);
    const r = (this.wheel.displayHeight / 2);
    this.add.image(CX, CY - r + 14, 'pointer').setScale(1.15);
    const hub = this.add.graphics();
    hub.fillStyle(COL.goldDark, 1); hub.fillCircle(CX, CY + 2, 46);
    hub.fillStyle(COL.gold, 1); hub.fillCircle(CX, CY, 44);
    hub.fillStyle(COL.white, 0.3); hub.fillEllipse(CX, CY - 14, 48, 20);
    hub.lineStyle(4, COL.ink, 0.9); hub.strokeCircle(CX, CY, 44);
    this.add.text(CX, CY, '▶', gameText(34, css(COL.ink), { strokeThickness: 0 })).setOrigin(0.5);

    this.spinBtn = new CartoonButton(this, { x: CX, y: 1150, width: 380, height: 104, label: 'SPIN!', color: COL.gold, fontSize: 44, textColor: css(COL.ink), onClick: () => void this.trySpin() });

    this.refresh();
    this.cdTimer = this.time.addEvent({ delay: 500, loop: true, callback: () => this.refresh() });
  }

  private remaining(): number { return Math.max(0, wheelNextAt() - Date.now()); }

  private refresh() {
    if (this.spinning) return;
    const rem = this.remaining();
    if (rem <= 0) {
      this.countdown.setText('● FREE SPIN READY ●').setColor(css(COL.green));
      this.spinBtn.setLabel('SPIN!').setEnabled(true);
    } else {
      const h = Math.floor(rem / 3600000), m = Math.floor((rem % 3600000) / 60000), s = Math.floor((rem % 60000) / 1000);
      const t = h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
      this.countdown.setText(`NEXT FREE SPIN  ${t}`).setColor(css(COL.cream));
      this.spinBtn.setLabel(t).setEnabled(false);
    }
  }

  private async trySpin() {
    if (this.spinning) return;
    if (this.remaining() > 0) { showToast(this, '⏳ Not ready yet!', { color: COL.red, y: 280 }); return; }
    this.spinning = true;
    SoundManager.play('click');

    let index: number;
    try {
      const res = await spinWheel();
      if (res.status === 'cooldown') {
        this.spinning = false; setWheelNextAt(Date.now() + res.nextInMs); this.refresh();
        showToast(this, '⏳ Come back later!', { color: COL.red, y: 280 }); return;
      }
      index = res.index;
    } catch {
      index = pickWeightedSegment(); setWheelNextAt(Date.now() + WHEEL_COOLDOWN_MS);
    }
    this.animateTo(index);
  }

  private animateTo(index: number) {
    const target = 360 * 5 - index * SEG + Phaser.Math.Between(-15, 15);
    this.lastTick = 0;
    this.tweens.add({
      targets: this.wheel, angle: target, duration: 4600, ease: 'Cubic.easeOut',
      onUpdate: () => { const b = Math.floor(this.wheel.angle / SEG); if (b !== this.lastTick) { this.lastTick = b; SoundManager.play('tick', 0.3); } },
      onComplete: () => this.award(index),
    });
  }

  private award(index: number) {
    const coins = WHEEL_SEGMENTS[index].coins;
    addCoins(coins); SoundManager.play('win', 0.7);
    this.spinning = false; this.refresh();

    this.add.particles(CX, CY, 'sparkle', {
      speed: { min: 180, max: 460 }, angle: { min: 0, max: 360 }, scale: { start: 1.1, end: 0 },
      lifespan: 1000, quantity: 40, emitting: false,
    }).explode(40);

    const popup = this.add.container(CX, CY).setDepth(50);
    const coinImg = this.add.image(-96, 0, 'coin').setDisplaySize(80, 80);
    const txt = this.add.text(-46, 0, `+${coins.toLocaleString()}`, gameText(52, css(COL.gold), { strokeThickness: 8 })).setOrigin(0, 0.5);
    popup.add([coinImg, txt]).setScale(0).setAlpha(0);
    this.tweens.add({ targets: popup, scale: 1, alpha: 1, y: CY - 40, duration: 400, ease: 'Back.Out' });
    this.tweens.add({ targets: popup, alpha: 0, y: CY - 120, delay: 1800, duration: 500, onComplete: () => popup.destroy() });

    showToast(this, coins >= 5000 ? '🎉 JACKPOT!' : '🪙 Nice win!', { color: COL.green, y: 300 });
  }

  private close() { this.cdTimer?.remove(); this.scene.stop(); }
}
