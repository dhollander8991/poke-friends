import Phaser from 'phaser';
import { W, H, LANDSCAPE, BRAND, COL, css, gameText } from '../theme.js';
import { lighten, darken } from '../core/format.js';
import { CartoonButton } from '../ui/CartoonButton.js';
import { CoinCounter } from '../ui/CoinCounter.js';
import { addPanel, addCloseButton } from '../ui/Panel.js';
import { showToast } from '../ui/Toast.js';
import { SoundManager } from '../audio/SoundManager.js';
import { resolveAvatar } from '../gfx/avatars.js';
import {
  connect, getSocket, storedName, saveName, storedToken, storedRoomCode, storedPlayerId,
} from '../network/SocketManager.js';
import { ensureGuest, claimDailyBonus, getStoredTier, setStoredTier, wheelNextAt } from '../network/ApiClient.js';
import { getName, getAvatarKey, addCoins } from '../core/Wallet.js';

export class HomeScene extends Phaser.Scene {
  private status!: Phaser.GameObjects.Text;
  private avatarImg!: Phaser.GameObjects.Image;
  private nameText!: Phaser.GameObjects.Text;
  private spinBadge?: Phaser.GameObjects.Text;
  private overlay?: Phaser.GameObjects.Container;
  private overlayReady = false;

  constructor() { super('HomeScene'); }

  create() {
    this.add.image(W / 2, H / 2, 'backdrop_home');
    void ensureGuest(storedName());
    this.checkCheckoutReturn();

    this.buildTopBar();
    this.buildLogo();
    this.buildMenu();
    this.buildDecor();

    this.status = this.add.text(W / 2, H - 18, '', gameText(16, css(COL.cream))).setOrigin(0.5);
    this.wireSocket();
    this.time.addEvent({ delay: 1000, loop: true, callback: () => this.refreshSpinBadge() });
    // Returning from any overlay scene: refresh avatar/name and re-enable input.
    this.events.on('wake', () => this.onResume());
    this.events.on('resume', () => this.onResume());
    this.events.once('shutdown', () => { this.overlay?.destroy(); });
  }

  private onResume() {
    this.input.enabled = true;
    this.avatarImg.setTexture(resolveAvatar(this, getAvatarKey())).setDisplaySize(76, 76);
    this.nameText.setText(getName());
  }

  // ─── Top bar ─────────────────────────────────────────────────────────────────
  private buildTopBar() {
    this.avatarImg = this.add.image(56, 62, resolveAvatar(this, getAvatarKey())).setDisplaySize(76, 76);
    this.add.zone(56, 62, 80, 80).setInteractive({ useHandCursor: true }).on('pointerup', () => this.openSettings());

    this.nameText = this.add.text(104, 50, getName(), gameText(20, css(COL.cream), { strokeThickness: 4 })).setOrigin(0, 0.5);
    this.nameText.setInteractive({ useHandCursor: true }).on('pointerup', () => this.openSettings());
    this.add.text(104, 74, '⚙ profile & settings', gameText(12, css(COL.gold), { strokeThickness: 0, shadow: false })).setOrigin(0, 0.5).setAlpha(0.8);
    if (getStoredTier() === 'vip') this.add.image(160, 50, 'crown').setScale(0.7);

    new CoinCounter(this, { x: W - 130, y: 56, width: 210, plus: true, onPlus: () => this.openShop() });

    // settings gear (top-right, under coins)
    const gear = this.add.text(W - 30, 104, '⚙', gameText(28, css(COL.cream))).setOrigin(0.5);
    gear.setInteractive({ useHandCursor: true }).on('pointerup', () => this.openSettings());
  }

  private openSettings() { this.openOverlay('SettingsScene'); }

  // ─── Logo plaque ─────────────────────────────────────────────────────────────
  private buildLogo() {
    const cx = W / 2, cy = LANDSCAPE ? 168 : 246;
    const w = 540, h = LANDSCAPE ? 150 : 188;
    const fs = LANDSCAPE ? 58 : 72;
    const g = this.add.graphics();
    g.fillStyle(COL.black, 0.4); g.fillRoundedRect(cx - w / 2 + 4, cy - h / 2 + 8, w, h, 26);
    g.fillGradientStyle(lighten(COL.wood, 0.16), lighten(COL.wood, 0.16), darken(COL.wood, 0.2), darken(COL.wood, 0.2), 1);
    g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, 26);
    g.lineStyle(6, COL.gold, 1); g.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, 26);
    g.lineStyle(2, COL.goldHi, 1); g.strokeRoundedRect(cx - w / 2 + 6, cy - h / 2 + 6, w - 12, h - 12, 20);
    this.add.image(cx, cy - h / 2 + 2, 'crown').setScale(1.2);
    this.add.text(cx, cy + (LANDSCAPE ? 8 : 6), BRAND, gameText(fs, css(COL.gold), { strokeThickness: 9 })).setOrigin(0.5);
  }

  // ─── Menu ────────────────────────────────────────────────────────────────────
  private buildMenu() {
    const hasRejoin = !!(storedToken() && storedRoomCode());
    const items: { label: string; color: number; font?: number; tcol?: string; fn: () => void; big?: boolean }[] = [
      { label: '▶  PLAY NOW', color: COL.green, font: 40, fn: () => this.startDemo(), big: true },
      { label: '🎡  SPIN & WIN', color: COL.orange, tcol: css(COL.ink), fn: () => this.openWheel() },
      { label: '🛒  SHOP', color: COL.purple, fn: () => this.openShop() },
      { label: '🎁  DAILY BONUS', color: COL.blue, fn: () => this.claimBonus() },
      { label: '👥  PRIVATE TABLE', color: COL.red, fn: () => this.openPrivate() },
    ];
    if (hasRejoin) items.push({ label: `↩  REJOIN ${storedRoomCode()}`, color: COL.orangeDark, font: 24, fn: () => this.rejoinRoom() });

    if (LANDSCAPE) {
      // PLAY full-width, then the rest in a 2-column grid.
      // `top` clears the logo plaque (bottom ≈ y 243) with a comfortable gap.
      const top = 318;
      const play = new CartoonButton(this, { x: W / 2, y: top, width: 560, height: 90, label: items[0].label, color: items[0].color, fontSize: 38, onClick: items[0].fn });
      this.tweens.add({ targets: play, scaleX: 1.03, scaleY: 1.03, duration: 850, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      const rest = items.slice(1);
      const colX = [W / 2 - 150, W / 2 + 150];
      const rowY = [top + 110, top + 200, top + 290];
      rest.forEach((it, i) => {
        const x = colX[i % 2], y = rowY[Math.floor(i / 2)];
        const btn = new CartoonButton(this, { x, y, width: 290, height: 84, label: it.label, color: it.color, fontSize: it.font ?? 26, textColor: it.tcol, onClick: it.fn });
        if (it.label.includes('SPIN')) this.spinBadge = this.add.text(x + 120, y - 38, '', gameText(14, css(COL.cream), { stroke: css(COL.redDark), strokeThickness: 4 })).setOrigin(0.5).setDepth(5);
        void btn;
      });
    } else {
      const cx = W / 2;
      let y = 466;
      const play = new CartoonButton(this, { x: cx, y, width: 480, height: 100, label: items[0].label, color: items[0].color, fontSize: 42, onClick: items[0].fn });
      this.tweens.add({ targets: play, scaleX: 1.03, scaleY: 1.03, duration: 850, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      y += 114;
      for (const it of items.slice(1)) {
        const btn = new CartoonButton(this, { x: cx, y, width: 480, height: 92, label: it.label, color: it.color, fontSize: it.font ?? 34, textColor: it.tcol, onClick: it.fn });
        if (it.label.includes('SPIN')) this.spinBadge = this.add.text(cx + 200, y - 28, '', gameText(14, css(COL.cream), { stroke: css(COL.redDark), strokeThickness: 4 })).setOrigin(0.5).setDepth(5);
        void btn;
        y += 108;
      }
    }
    this.refreshSpinBadge();
  }

  private refreshSpinBadge() {
    if (!this.spinBadge) return;
    this.spinBadge.setText(wheelNextAt() - Date.now() <= 0 ? '★ FREE ★' : '');
  }

  private buildDecor() {
    if (LANDSCAPE) {
      for (let i = 0; i < 5; i++) this.add.image(58 + (i % 3) * 24, H - 56 - Math.floor(i / 3) * 20, 'coin').setDisplaySize(42, 42).setAngle(Phaser.Math.Between(-12, 12));
      this.add.image(W - 96, H - 56, 'card_A_spades').setAngle(-14).setScale(0.62);
      this.add.image(W - 60, H - 52, 'card_K_hearts').setAngle(10).setScale(0.62);
      return;
    }
    for (let i = 0; i < 6; i++) this.add.image(70 + (i % 3) * 26, H - 70 - Math.floor(i / 3) * 22, 'coin').setDisplaySize(46, 46).setAngle(Phaser.Math.Between(-12, 12));
    this.add.image(W - 110, H - 70, 'card_A_spades').setAngle(-14).setScale(0.7);
    this.add.image(W - 70, H - 64, 'card_K_hearts').setAngle(10).setScale(0.7);
  }

  // ─── Actions ────────────────────────────────────────────────────────────────
  private openWheel() { this.openOverlay('WheelScene'); }
  private openShop() { this.openOverlay('ShopScene'); }

  /**
   * Launch an overlay scene on top and disable this scene's input until it
   * closes. We disable input (rather than scene.pause) because pausing made
   * resume fragile — overlays would intermittently leave the menu unclickable.
   */
  private openOverlay(key: string) {
    if (this.scene.isActive(key)) return;
    SoundManager.play('click');
    this.input.enabled = false;
    this.scene.launch(key);
    this.scene.bringToTop(key);
    const target = this.scene.get(key);
    target.events.once('shutdown', () => { this.input.enabled = true; this.onResume(); });
  }

  private async claimBonus() {
    SoundManager.play('click');
    try {
      const { chips } = await claimDailyBonus();
      addCoins(chips); SoundManager.play('coin');
      showToast(this, `🎁  +${chips} coins!`, { color: COL.green, y: 150 });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Try later';
      showToast(this, msg.includes('already') ? '⏳ Come back tomorrow!' : msg, { color: COL.red, y: 150 });
    }
  }

  private openPrivate() {
    SoundManager.play('click');
    if (this.overlay) return;
    this.overlayReady = false;
    const c = this.add.container(0, 0).setDepth(100);
    const dim = this.add.graphics().fillStyle(COL.black, 0.6).fillRect(0, 0, W, H);
    dim.setInteractive(new Phaser.Geom.Rectangle(0, 0, W, H), Phaser.Geom.Rectangle.Contains);
    dim.on('pointerup', () => { if (this.overlayReady) this.closeOverlay(); });
    const bg = addPanel(this, W / 2, H / 2, 520, 360, COL.panel);
    const title = this.add.text(W / 2, H / 2 - 130, '👥 PRIVATE TABLE', gameText(28, css(COL.gold))).setOrigin(0.5);
    const create = new CartoonButton(this, { x: W / 2, y: H / 2 - 40, width: 420, height: 84, label: 'CREATE TABLE', color: COL.green, fontSize: 30, onClick: () => this.createRoom() });
    const join = new CartoonButton(this, { x: W / 2, y: H / 2 + 64, width: 420, height: 84, label: 'JOIN WITH CODE', color: COL.blue, fontSize: 30, onClick: () => this.joinRoom() });
    const close = addCloseButton(this, W / 2 + 240, H / 2 - 168, () => this.closeOverlay());
    c.add([dim, bg, title, create, join, close]);
    this.overlay = c;
    this.time.delayedCall(300, () => { this.overlayReady = true; });
  }

  private closeOverlay() { this.overlay?.destroy(); this.overlay = undefined; }

  private createRoom() {
    const name = this.requireName(); if (!name) return;
    const socket = connect();
    socket.once('room:created', () => { this.time.delayedCall(400, () => this.startGame()); });
    socket.emit('room:create', { playerName: name });
    this.setStatus('Creating table…', false);
  }

  private joinRoom() {
    const name = this.requireName(); if (!name) return;
    const code = (window.prompt('Enter 6-character table code') ?? '').trim().toUpperCase();
    if (code.length !== 6) { this.setStatus('Enter a 6-character code', true); return; }
    const socket = connect();
    socket.once('room:joined', () => { this.time.delayedCall(300, () => this.startGame()); });
    socket.once('room:spectating', () => { this.time.delayedCall(300, () => this.startGame()); });
    socket.emit('room:join', { roomCode: code, playerName: name });
    this.setStatus('Joining…', false);
  }

  private rejoinRoom() {
    const token = storedToken()!, code = storedRoomCode()!;
    const socket = connect();
    socket.once('room:joined', () => this.startGame());
    socket.once('room:error', (m) => this.setStatus(m, true));
    socket.emit('room:rejoin', { roomCode: code, token });
  }

  private startDemo() {
    const name = storedName() || 'Player'; saveName(name);
    const socket = connect();
    socket.once('room:created', () => { this.time.delayedCall(300, () => this.startGame()); });
    socket.emit('room:demo', { playerName: name });
    this.setStatus('Dealing you in…', false);
  }

  private startGame() {
    this.scene.start('GameScene', { playerId: storedPlayerId() ?? '', roomCode: storedRoomCode() ?? '' });
  }

  private requireName(): string | null {
    const name = storedName().trim();
    if (!name) { this.setStatus('Set your name first (tap it)', true); return null; }
    saveName(name); return name.slice(0, 16);
  }

  private wireSocket() {
    const socket = getSocket();
    const onErr = (m: string) => this.setStatus(m, true);
    socket.on('room:error', onErr);
    this.events.once('shutdown', () => socket.off('room:error', onErr));
  }

  private checkCheckoutReturn() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'success') {
      if (params.get('bundle') === 'vip_monthly') setStoredTier('vip');
      this.time.delayedCall(400, () => showToast(this, '🎉 Purchase complete!', { color: COL.green, y: 150 }));
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('checkout') === 'cancel') {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }

  private setStatus(msg: string, isError: boolean) { this.status?.setText(msg).setColor(isError ? css(COL.red) : css(COL.green)); }
}
