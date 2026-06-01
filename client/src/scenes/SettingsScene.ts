import Phaser from 'phaser';
import { COL, css, gameText, AVATAR_COUNT } from '../theme.js';
import { CartoonButton } from '../ui/CartoonButton.js';
import { addPanel, addCloseButton, frameOverlay, addDim, OW, OH } from '../ui/Panel.js';
import { showToast } from '../ui/Toast.js';
import { SoundManager } from '../audio/SoundManager.js';
import { loadCustomAvatar, resolveAvatar } from '../gfx/avatars.js';
import { ensureGuest } from '../network/ApiClient.js';
import { getAccount, isConfigured, signInWith, signOut, type Provider } from '../network/social.js';
import {
  getName, setName, getAvatarId, setAvatarId, getAvatarKey,
  setCustomAvatar, clearCustomAvatar, usingCustomAvatar,
} from '../core/Wallet.js';

/** Settings + player profile: avatar (preset/upload), name, sound, account. */
export class SettingsScene extends Phaser.Scene {
  private ready = false;
  private preview!: Phaser.GameObjects.Image;
  private nameText!: Phaser.GameObjects.Text;
  private tiles: { id: number; img: Phaser.GameObjects.Image; ring: Phaser.GameObjects.Graphics }[] = [];
  private customRing!: Phaser.GameObjects.Graphics;
  private accountText!: Phaser.GameObjects.Text;
  private fileInput?: HTMLInputElement;

  constructor() { super('SettingsScene'); }

  create() {
    frameOverlay(this);
    addDim(this, () => { if (this.ready) this.close(); });

    addPanel(this, OW / 2, OH / 2, OW - 28, OH - 80, COL.panel);
    this.add.text(OW / 2, 92, '⚙  SETTINGS', gameText(40, css(COL.gold), { strokeThickness: 7 })).setOrigin(0.5);
    addCloseButton(this, OW - 56, 78, () => this.close());

    this.buildProfile();
    this.buildAvatarGrid();
    this.buildSound();
    this.buildAccount();

    this.time.delayedCall(300, () => { this.ready = true; });
    this.events.once('shutdown', () => this.cleanup());
  }

  // ─── Profile (avatar preview + name) ─────────────────────────────────────────
  private buildProfile() {
    const y = 188;
    this.preview = this.add.image(150, y, resolveAvatar(this, getAvatarKey())).setDisplaySize(120, 120);

    this.add.text(244, y - 30, 'PLAYER NAME', gameText(14, css(COL.gold), { strokeThickness: 0, shadow: false })).setOrigin(0, 0.5);
    this.nameText = this.add.text(244, y - 2, getName(), gameText(30, css(COL.cream), { strokeThickness: 4 })).setOrigin(0, 0.5);
    new CartoonButton(this, { x: 360, y: y + 42, width: 220, height: 56, label: '✎  RENAME', color: COL.blue, fontSize: 22, onClick: () => this.rename() });
  }

  private rename() {
    const v = window.prompt('Choose a name (max 16 chars)', getName());
    if (v && v.trim()) {
      setName(v); this.nameText.setText(getName());
      void ensureGuest(getName());
      SoundManager.play('click');
    }
  }

  // ─── Avatar grid ─────────────────────────────────────────────────────────────
  private buildAvatarGrid() {
    const top = 300;
    this.add.text(OW / 2, top, 'CHOOSE AVATAR', gameText(22, css(COL.gold), { strokeThickness: 5 })).setOrigin(0.5);

    const cols = 4, size = 116, gapX = 24, gapY = 26;
    const gridW = cols * size + (cols - 1) * gapX;
    const x0 = OW / 2 - gridW / 2 + size / 2;
    const y0 = top + 70;

    for (let i = 0; i < AVATAR_COUNT; i++) {
      const col = i % cols, row = Math.floor(i / cols);
      const x = x0 + col * (size + gapX), y = y0 + row * (size + gapY);
      const ring = this.add.graphics();
      const img = this.add.image(x, y, `avatar_${i}`).setDisplaySize(96, 96);
      const zone = this.add.zone(x, y, size, size).setInteractive({ useHandCursor: true });
      zone.on('pointerup', () => this.pickPreset(i));
      this.tiles.push({ id: i, img, ring });
    }

    // upload / custom tile (row 3)
    const cy = y0 + 2 * (size + gapY);
    this.customRing = this.add.graphics();
    const customImg = this.add.image(x0, cy, this.textures.exists('avatar_custom') ? 'avatar_custom' : 'avatar_empty').setDisplaySize(96, 96).setName('customTile');
    const cz = this.add.zone(x0, cy, size, size).setInteractive({ useHandCursor: true });
    cz.on('pointerup', () => { if (this.textures.exists('avatar_custom')) this.pickCustom(); else this.upload(); });
    void customImg;

    new CartoonButton(this, { x: x0 + size + gapX + 130, y: cy - 22, width: 250, height: 60, label: '📷  UPLOAD PHOTO', color: COL.green, fontSize: 22, onClick: () => this.upload() });
    new CartoonButton(this, { x: x0 + size + gapX + 130, y: cy + 46, width: 250, height: 50, label: 'Remove photo', color: COL.redDark, fontSize: 18, onClick: () => this.removeCustom() });

    this.refreshSelection();
  }

  private pickPreset(i: number) { setAvatarId(i); SoundManager.play('click'); this.afterAvatarChange(); }
  private pickCustom() { setCustomAvatar(localStorage.getItem('poker_avatar_custom') ?? ''); SoundManager.play('click'); this.afterAvatarChange(); }

  private removeCustom() {
    clearCustomAvatar();
    if (this.textures.exists('avatar_custom')) this.textures.remove('avatar_custom');
    const tile = this.children.getByName('customTile') as Phaser.GameObjects.Image | null;
    tile?.setTexture('avatar_empty').setDisplaySize(96, 96);
    this.afterAvatarChange();
  }

  private upload() {
    if (!this.fileInput) {
      const el = document.createElement('input');
      el.type = 'file'; el.accept = 'image/*'; el.style.display = 'none';
      el.addEventListener('change', () => {
        const file = el.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => this.downscaleAndUse(String(reader.result));
        reader.readAsDataURL(file);
        el.value = '';
      });
      document.body.appendChild(el);
      this.fileInput = el;
    }
    this.fileInput.click();
  }

  /** Shrink the uploaded image to <=256px so it fits comfortably in localStorage. */
  private downscaleAndUse(dataUrl: string) {
    const img = new Image();
    img.onload = () => {
      const max = 256;
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const cw = Math.round(img.width * s), ch = Math.round(img.height * s);
      const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
      cv.getContext('2d')!.drawImage(img, 0, 0, cw, ch);
      const small = cv.toDataURL('image/jpeg', 0.85);
      setCustomAvatar(small);
      loadCustomAvatar(this, small, () => {
        const tile = this.children.getByName('customTile') as Phaser.GameObjects.Image | null;
        tile?.setTexture('avatar_custom').setDisplaySize(96, 96);
        this.afterAvatarChange();
        showToast(this, '✅ Photo updated!', { color: COL.green, y: 150 });
      });
    };
    img.src = dataUrl;
  }

  private afterAvatarChange() {
    this.preview.setTexture(resolveAvatar(this, getAvatarKey())).setDisplaySize(120, 120);
    this.refreshSelection();
  }

  private refreshSelection() {
    const useCustom = usingCustomAvatar();
    const sel = getAvatarId();
    for (const t of this.tiles) {
      t.ring.clear();
      if (!useCustom && t.id === sel) {
        t.ring.lineStyle(5, COL.gold, 1).strokeRoundedRect(t.img.x - 56, t.img.y - 56, 112, 112, 18);
      }
    }
    this.customRing.clear();
    if (useCustom) {
      const tile = this.children.getByName('customTile') as Phaser.GameObjects.Image | null;
      if (tile) this.customRing.lineStyle(5, COL.gold, 1).strokeRoundedRect(tile.x - 56, tile.y - 56, 112, 112, 18);
    }
  }

  // ─── Sound ───────────────────────────────────────────────────────────────────
  private buildSound() {
    const y = 760;
    this.add.text(OW / 2 - 150, y, '🔊  Sound', gameText(24, css(COL.cream))).setOrigin(0, 0.5);
    const btn = new CartoonButton(this, {
      x: OW / 2 + 150, y, width: 150, height: 56,
      label: SoundManager.isMuted ? 'OFF' : 'ON', color: SoundManager.isMuted ? COL.redDark : COL.green, fontSize: 22,
      onClick: () => {
        const muted = SoundManager.toggleMute();
        btn.setLabel(muted ? 'OFF' : 'ON');
      },
    });
  }

  // ─── Account / social login ──────────────────────────────────────────────────
  private buildAccount() {
    const y = 858;
    this.add.text(OW / 2, y, 'ACCOUNT', gameText(22, css(COL.gold), { strokeThickness: 5 })).setOrigin(0.5);
    this.accountText = this.add.text(OW / 2, y + 36, '', gameText(16, css(COL.cream), { strokeThickness: 0, shadow: false })).setOrigin(0.5);

    new CartoonButton(this, { x: OW / 2 - 130, y: y + 108, width: 250, height: 70, label: 'Google', color: 0xffffff, textColor: css(COL.ink), fontSize: 24, icon: 'g_logo', onClick: () => this.login('google') });
    new CartoonButton(this, { x: OW / 2 + 130, y: y + 108, width: 250, height: 70, label: 'Facebook', color: 0x1877f2, fontSize: 24, onClick: () => this.login('facebook') });
    new CartoonButton(this, { x: OW / 2, y: y + 192, width: 300, height: 56, label: 'SIGN OUT', color: COL.redDark, fontSize: 22, onClick: () => this.doSignOut() });

    this.refreshAccount();
  }

  private refreshAccount() {
    const acc = getAccount();
    this.accountText.setText(acc ? `Signed in as ${acc.name} (${acc.provider})` : 'Playing as guest — sign in to save progress');
  }

  private async login(provider: Provider) {
    SoundManager.play('click');
    if (!isConfigured(provider)) {
      const env = provider === 'google' ? 'VITE_GOOGLE_CLIENT_ID' : 'VITE_FACEBOOK_APP_ID';
      showToast(this, `Set ${env} to enable ${provider}`, { color: COL.orange, y: 150, duration: 3200 });
      return;
    }
    try {
      const acc = await signInWith(provider);
      this.nameText.setText(getName());
      this.refreshAccount();
      showToast(this, `👋 Welcome, ${acc.name}!`, { color: COL.green, y: 150 });
    } catch (e) {
      showToast(this, e instanceof Error ? e.message : 'Sign-in failed', { color: COL.red, y: 150 });
    }
  }

  private doSignOut() {
    signOut(); SoundManager.play('click'); this.refreshAccount();
    showToast(this, 'Signed out', { color: COL.cream, y: 150 });
  }

  private cleanup() { this.fileInput?.remove(); this.fileInput = undefined; }
  private close() { this.scene.stop(); }
}
