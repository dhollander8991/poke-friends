import Phaser from 'phaser';
import { COL, css, gameText } from '../theme.js';
import { abbrev } from '../core/format.js';
import { CartoonButton } from '../ui/CartoonButton.js';
import { addPanel, addCloseButton, frameOverlay, addDim, OW, OH } from '../ui/Panel.js';
import { showToast } from '../ui/Toast.js';
import { SoundManager } from '../audio/SoundManager.js';
import { createCheckout, claimDailyBonus, setStoredTier, type BundleId } from '../network/ApiClient.js';
import { addCoins } from '../core/Wallet.js';

interface Bundle { id: BundleId; label: string; chips: number; price: string; color: number; vip?: boolean; }

const BUNDLES: Bundle[] = [
  { id: 'chips_1000', label: 'STARTER', chips: 1000, price: '$0.99', color: COL.blue },
  { id: 'chips_5000', label: 'HIGH ROLLER', chips: 5000, price: '$3.99', color: COL.purple },
  { id: 'chips_20000', label: 'WHALE', chips: 20000, price: '$12.99', color: COL.green },
  { id: 'vip_monthly', label: 'VIP', chips: 5000, price: '$4.99/mo', color: COL.gold, vip: true },
];

export class ShopScene extends Phaser.Scene {
  private ready = false;

  constructor() { super('ShopScene'); }

  create() {
    this.ready = false;
    frameOverlay(this);
    addDim(this, () => { if (this.ready) this.scene.stop(); });
    this.time.delayedCall(300, () => { this.ready = true; });

    const cx = OW / 2, cy = OH / 2;
    const pw = OW - 36, ph = OH - 160;
    addPanel(this, cx, cy, pw, ph, COL.panel);
    this.add.text(cx, cy - ph / 2 + 50, '🛒  COIN SHOP', gameText(40, css(COL.gold), { strokeThickness: 7 })).setOrigin(0.5);
    addCloseButton(this, cx + pw / 2 - 40, cy - ph / 2 + 42, () => this.scene.stop());

    const cardW = 300, cardH = 280, gap = 24;
    const x0 = cx - (cardW + gap) / 2, x1 = cx + (cardW + gap) / 2;
    const y0 = cy - ph / 2 + 250, y1 = y0 + cardH + gap;
    const pos = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]];
    BUNDLES.forEach((b, i) => this.makeCard(pos[i][0], pos[i][1], cardW, cardH, b));

    const dy = cy + ph / 2 - 70;
    this.add.text(cx, dy - 30, '🎁  Daily Bonus — 200 coins / 24h', gameText(20, css(COL.cream))).setOrigin(0.5);
    new CartoonButton(this, { x: cx, y: dy + 16, width: 300, height: 64, label: 'CLAIM', color: COL.green, fontSize: 26, onClick: () => this.claim() });
  }

  private makeCard(x: number, y: number, w: number, h: number, b: Bundle) {
    addPanel(this, x, y, w, h, b.color);
    if (b.vip) this.add.image(x, y - h / 2 + 6, 'crown').setScale(1.2);
    this.add.text(x, y - h / 2 + 50, b.label, gameText(24, css(COL.cream), { strokeThickness: 5 })).setOrigin(0.5);
    this.add.image(x, y - 28, 'coin').setDisplaySize(84, 84);
    this.add.text(x, y + 34, abbrev(b.chips), gameText(38, css(COL.gold), { strokeThickness: 6 })).setOrigin(0.5);
    if (b.vip) this.add.text(x, y + 66, '+ unlimited AI', gameText(14, css(COL.cream), { strokeThickness: 0, shadow: false })).setOrigin(0.5);
    new CartoonButton(this, { x, y: y + h / 2 - 40, width: w - 40, height: 62, label: b.price, color: b.vip ? COL.orange : COL.green, fontSize: 26, onClick: () => void this.buy(b) });
  }

  private async buy(b: Bundle) {
    SoundManager.play('click');
    showToast(this, 'Opening checkout…', { color: COL.blue, y: 120 });
    try {
      const url = await createCheckout(b.id);
      if (b.vip) setStoredTier('vip');
      window.location.href = url;
    } catch (e) {
      showToast(this, e instanceof Error ? e.message : 'Checkout unavailable', { color: COL.red, y: 120 });
    }
  }

  private async claim() {
    SoundManager.play('click');
    try {
      const { chips } = await claimDailyBonus();
      addCoins(chips); SoundManager.play('coin');
      showToast(this, `🎁 +${chips} coins!`, { color: COL.green, y: 120 });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Try later';
      showToast(this, msg.includes('already') ? '⏳ Come back tomorrow!' : msg, { color: COL.red, y: 120 });
    }
  }
}
