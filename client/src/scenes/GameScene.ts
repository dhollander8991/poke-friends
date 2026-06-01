import Phaser from 'phaser';
import type { GameState } from '@texas-holdem/shared';
import { getSocket } from '../network/SocketManager.js';
import {
  W, H, LANDSCAPE, LAYOUT, TABLE_CX, TABLE_CY, SEAT_RX, SEAT_RY, SEAT_ANGLES_DEG,
  CARD_W, CARD_H, HOLE_W, HOLE_H, AVATAR_R, COL, css, gameText,
} from '../theme.js';
import { commas, abbrev, lighten, darken } from '../core/format.js';
import { CartoonButton } from '../ui/CartoonButton.js';
import { addPanel, addCloseButton } from '../ui/Panel.js';
import { resolveAvatar } from '../gfx/avatars.js';
import { getAvatarKey } from '../core/Wallet.js';
import { SoundManager } from '../audio/SoundManager.js';
import {
  analyzeHand, getQueriesRemaining, getStoredTier, type AiAnalysis,
} from '../network/ApiClient.js';

const MAX_SEATS = 9;
const COMMUNITY = 5;
const ACTION_TIMEOUT = 30;

interface SceneData { playerId: string; roomCode: string; }

interface Seat {
  x: number; y: number; nx: number; ny: number; local: boolean;
  glow: Phaser.GameObjects.Image;
  timer: Phaser.GameObjects.Graphics;
  avatar: Phaser.GameObjects.Image;
  cards: [Phaser.GameObjects.Image, Phaser.GameObjects.Image];
  nameText: Phaser.GameObjects.Text;
  chipsText: Phaser.GameObjects.Text;
  betChip: Phaser.GameObjects.Image;
  betText: Phaser.GameObjects.Text;
  dealer: Phaser.GameObjects.Image;
  stamp: Phaser.GameObjects.Text;
}

export class GameScene extends Phaser.Scene {
  private myId = '';
  private roomCode = '';
  private myIdx = -1;
  private state!: GameState;

  private seats: Seat[] = [];
  private community: Phaser.GameObjects.Image[] = [];
  private potText!: Phaser.GameObjects.Text;
  private phaseText!: Phaser.GameObjects.Text;
  private balanceText!: Phaser.GameObjects.Text;

  private panel!: Phaser.GameObjects.Container;
  private foldBtn!: CartoonButton;
  private callBtn!: CartoonButton;
  private raiseBtn!: CartoonButton;
  private sliderTrack!: Phaser.GameObjects.Graphics;
  private sliderThumb!: Phaser.GameObjects.Container;
  private raiseAmount = 0; private raiseMin = 0; private raiseMax = 0;
  private sliderMinX = LAYOUT.sliderMinX; private sliderMaxX = LAYOUT.sliderMaxX;

  private startBtn?: CartoonButton;
  private waitText!: Phaser.GameObjects.Text;

  private aiBtn!: CartoonButton;
  private aiPanel!: Phaser.GameObjects.Container;
  private aiReady = false;
  private aiLoading = false;

  private menu?: Phaser.GameObjects.Container;

  private prevPhase = 'waiting';
  private prevPot = 0;
  private prevHist = 0;
  private dealing = false;
  private glowTween?: Phaser.Tweens.Tween;

  constructor() { super('GameScene'); }

  init(data: SceneData) { this.myId = data.playerId; this.roomCode = data.roomCode; }

  create() {
    this.add.image(W / 2, H / 2, 'backdrop');
    this.add.image(TABLE_CX, TABLE_CY, 'table');

    this.createCommunity();
    this.createPot();
    this.createSeats();
    this.createBottomHud();
    this.createActionPanel();
    this.createAiButton();
    this.createHeader();
    this.createWaiting();
    this.setupSocket();
  }

  // ─── Header ─────────────────────────────────────────────────────────────────
  private iconButton(x: number, y: number, glyph: string, onClick: () => void) {
    const c = this.add.container(x, y).setDepth(20);
    const g = this.add.graphics();
    const s = 28;
    g.fillStyle(COL.black, 0.3); g.fillRoundedRect(-s + 2, -s + 4, s * 2, s * 2, 14);
    g.fillGradientStyle(lighten(COL.wood, 0.2), lighten(COL.wood, 0.2), COL.woodDark, COL.woodDark, 1);
    g.fillRoundedRect(-s, -s, s * 2, s * 2, 14);
    g.lineStyle(3, COL.gold, 1); g.strokeRoundedRect(-s, -s, s * 2, s * 2, 14);
    const t = this.add.text(0, 0, glyph, gameText(26, css(COL.cream), { strokeThickness: 0 })).setOrigin(0.5);
    c.add([g, t]).setSize(s * 2, s * 2).setInteractive({
      hitArea: new Phaser.Geom.Rectangle(-s, -s, s * 2, s * 2), hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true,
    });
    c.on('pointerup', () => { this.tweens.add({ targets: c, scale: 1.12, duration: 80, yoyo: true }); onClick(); });
    return c;
  }

  private createHeader() {
    this.iconButton(50, 48, '⚙', () => this.openMenu());

    const g = this.add.graphics();
    g.fillStyle(COL.black, 0.32); g.fillRoundedRect(W / 2 - 150, 18, 300, 58, 16);
    g.lineStyle(2, COL.gold, 0.8); g.strokeRoundedRect(W / 2 - 150, 18, 300, 58, 16);
    this.phaseText = this.add.text(W / 2, 38, '', gameText(20, css(COL.cream), { strokeThickness: 4 })).setOrigin(0.5);
    this.add.text(W / 2 - 92, 62, 'LVL 12', gameText(13, css(COL.gold), { strokeThickness: 0, shadow: false })).setOrigin(0, 0.5);
    const xp = this.add.graphics();
    xp.fillStyle(COL.black, 0.5); xp.fillRoundedRect(W / 2 - 36, 57, 130, 10, 5);
    xp.fillStyle(COL.gold, 1); xp.fillRoundedRect(W / 2 - 36, 57, 90, 10, 5);

    // room-code chip (top-right)
    const cg = this.add.graphics();
    cg.fillStyle(COL.black, 0.32); cg.fillRoundedRect(W - 188, 26, 160, 40, 20);
    cg.lineStyle(2, COL.gold, 0.7); cg.strokeRoundedRect(W - 188, 26, 160, 40, 20);
    this.add.text(W - 108, 46, `TABLE ${this.roomCode}`, gameText(15, css(COL.cream))).setOrigin(0.5);
  }

  // in-game menu popup (replaces the old dead gear/leave)
  private openMenu() {
    if (this.menu) return;
    SoundManager.play('click');
    const c = this.add.container(0, 0).setDepth(80);
    const dim = this.add.graphics().fillStyle(COL.black, 0.6).fillRect(0, 0, W, H);
    dim.setInteractive(new Phaser.Geom.Rectangle(0, 0, W, H), Phaser.Geom.Rectangle.Contains);
    dim.on('pointerup', () => this.closeMenu());
    const bg = addPanel(this, W / 2, H / 2, 460, 360, COL.panel);
    const title = this.add.text(W / 2, H / 2 - 128, '⚙ MENU', gameText(34, css(COL.gold))).setOrigin(0.5);
    const sound = new CartoonButton(this, {
      x: W / 2, y: H / 2 - 50, width: 380, height: 74, fontSize: 26,
      label: SoundManager.isMuted ? '🔇  SOUND: OFF' : '🔊  SOUND: ON', color: COL.blue,
      onClick: () => { const m = SoundManager.toggleMute(); sound.setLabel(m ? '🔇  SOUND: OFF' : '🔊  SOUND: ON'); },
    });
    const resume = new CartoonButton(this, { x: W / 2, y: H / 2 + 40, width: 380, height: 74, label: '▶  RESUME', color: COL.green, fontSize: 26, onClick: () => this.closeMenu() });
    const leave = new CartoonButton(this, { x: W / 2, y: H / 2 + 130, width: 380, height: 74, label: '🚪  LEAVE TABLE', color: COL.red, fontSize: 26, onClick: () => this.leave() });
    const close = addCloseButton(this, W / 2 + 210, H / 2 - 160, () => this.closeMenu());
    c.add([dim, bg, title, sound, resume, leave, close]);
    this.menu = c;
  }

  private closeMenu() { this.menu?.destroy(); this.menu = undefined; }

  private createWaiting() {
    this.waitText = this.add.text(TABLE_CX, TABLE_CY - 60, '', gameText(26, css(COL.cream))).setOrigin(0.5).setVisible(false);
    this.startBtn = new CartoonButton(this, {
      x: TABLE_CX, y: TABLE_CY, width: 260, height: 80, label: '▶ START', color: COL.green, fontSize: 32,
      onClick: () => getSocket().emit('game:start'),
    });
    this.startBtn.setVisible(false);
  }

  // ─── Community cards ────────────────────────────────────────────────────────
  private createCommunity() {
    const gap = 8;
    const totalW = COMMUNITY * CARD_W + (COMMUNITY - 1) * gap;
    const startX = TABLE_CX - totalW / 2 + CARD_W / 2;
    const labels = ['', 'FLOP', '', 'TURN', 'RIVER'];
    for (let i = 0; i < COMMUNITY; i++) {
      const x = startX + i * (CARD_W + gap);
      const slot = this.add.graphics();
      slot.fillStyle(COL.black, 0.2);
      slot.fillRoundedRect(x - CARD_W / 2, TABLE_CY - CARD_H / 2, CARD_W, CARD_H, 8);
      if (labels[i]) this.add.text(x, TABLE_CY - CARD_H / 2 - 16, labels[i], gameText(13, css(COL.gold), { strokeThickness: 3 })).setOrigin(0.5);
      const img = this.add.image(x, TABLE_CY, 'card_back').setDisplaySize(CARD_W, CARD_H).setVisible(false);
      this.community.push(img);
    }
  }

  private createPot() {
    const y = LAYOUT.potY;
    const g = this.add.graphics();
    g.fillStyle(COL.black, 0.4); g.fillRoundedRect(TABLE_CX - 92, y - 22, 184, 44, 22);
    g.lineStyle(3, COL.gold, 1); g.strokeRoundedRect(TABLE_CX - 92, y - 22, 184, 44, 22);
    this.add.image(TABLE_CX - 66, y, 'coin').setDisplaySize(30, 30);
    this.add.text(TABLE_CX - 46, y - 11, 'POT', gameText(11, css(COL.gold), { strokeThickness: 0, shadow: false })).setOrigin(0, 0.5);
    this.potText = this.add.text(TABLE_CX - 46, y + 5, '0', gameText(20, css(COL.cream), { strokeThickness: 4 })).setOrigin(0, 0.5);
  }

  // ─── Seats ──────────────────────────────────────────────────────────────────
  private createSeats() {
    for (let i = 0; i < MAX_SEATS; i++) {
      const deg = SEAT_ANGLES_DEG[i] ?? 90;
      const rad = (deg * Math.PI) / 180;
      const x = TABLE_CX + SEAT_RX * Math.cos(rad);
      const y = TABLE_CY + SEAT_RY * Math.sin(rad);
      const dx = x - TABLE_CX, dy = y - TABLE_CY;
      const len = Math.hypot(dx, dy) || 1;
      const nx = dx / len, ny = dy / len;
      const local = i === 0;

      const glow = this.add.image(x, y, 'glow').setTint(COL.gold).setBlendMode(Phaser.BlendModes.ADD)
        .setDisplaySize(AVATAR_R * 3.6, AVATAR_R * 3.6).setVisible(false);
      const timer = this.add.graphics();
      const avatar = this.add.image(x, y, 'avatar_empty').setDisplaySize(AVATAR_R * 2, AVATAR_R * 2).setAlpha(0.6);

      // Hero's hole cards sit below the avatar; in landscape there isn't room
      // for the name/chips below too, so the hero's labels go ABOVE the avatar.
      const heroAbove = local && LANDSCAPE;
      const nameY = heroAbove ? y - AVATAR_R - 40 : y + AVATAR_R + 9;
      const chipsY = heroAbove ? y - AVATAR_R - 22 : y + AVATAR_R + 26;
      const nameText = this.add.text(x, nameY, '', gameText(14, css(COL.cream), { strokeThickness: 3 })).setOrigin(0.5).setVisible(false);
      const chipsText = this.add.text(x, chipsY, '', gameText(13, css(COL.gold), { strokeThickness: 3 })).setOrigin(0.5).setVisible(false);

      // hero cards sit at a fixed HUD spot; opponents' tuck behind their avatar
      const cw = local ? HOLE_W : CARD_W * 0.6, ch = local ? HOLE_H : CARD_H * 0.6;
      const cardY = local ? LAYOUT.heroCardsY : y - ny * 6 - 14;
      const cardX = local ? TABLE_CX : x;
      const cards: [Phaser.GameObjects.Image, Phaser.GameObjects.Image] = [
        this.add.image(cardX - cw * 0.55, cardY, 'card_back').setDisplaySize(cw, ch).setAngle(local ? -8 : -6).setVisible(false),
        this.add.image(cardX + cw * 0.55, cardY, 'card_back').setDisplaySize(cw, ch).setAngle(local ? 8 : 6).setVisible(false),
      ];
      if (local) cards.forEach((cd) => cd.setDepth(6));

      const bx = x - nx * 52, by = y - ny * 52;
      const betChip = this.add.image(bx - 13, by, 'chip').setDisplaySize(24, 24).setVisible(false);
      const betText = this.add.text(bx + 3, by, '', gameText(14, css(COL.cream))).setOrigin(0, 0.5).setVisible(false);

      const dealer = this.add.image(x + nx * 22 + 24, y + ny * 22, 'dealer_btn').setScale(0.78).setVisible(false);
      const stamp = this.add.text(x, y, '', gameText(15, css(COL.cream), { strokeThickness: 4 })).setOrigin(0.5).setVisible(false);

      this.seats.push({ x, y, nx, ny, local, glow, timer, avatar, cards, nameText, chipsText, betChip, betText, dealer, stamp });
    }
  }

  // ─── Bottom HUD (your balance) ───────────────────────────────────────────────
  private createBottomHud() {
    const x = LAYOUT.hudX, y = LAYOUT.hudY, w = LAYOUT.hudW;
    const g = this.add.graphics();
    g.fillStyle(COL.black, 0.4); g.fillRoundedRect(x - w / 2, y - 24, w, 48, 24);
    g.lineStyle(3, COL.gold, 1); g.strokeRoundedRect(x - w / 2, y - 24, w, 48, 24);
    this.add.image(x - w / 2 + 32, y, 'coin').setDisplaySize(34, 34);
    this.balanceText = this.add.text(x - w / 2 + 54, y, '0', gameText(22, css(COL.cream), { strokeThickness: 4 })).setOrigin(0, 0.5);
  }

  // ─── Action panel ───────────────────────────────────────────────────────────
  private createActionPanel() {
    addPanel(this, LAYOUT.panelCx, LAYOUT.panelY, LAYOUT.panelW, LAYOUT.panelH, COL.panel).setDepth(8);

    const { btnW: bw, btnH: bh, btnY: by, btnFont: bf } = LAYOUT;
    this.foldBtn = new CartoonButton(this, { x: LAYOUT.foldX, y: by, width: bw, height: bh, label: 'FOLD', color: COL.red, fontSize: bf, onClick: () => this.sendAction('fold') });
    this.callBtn = new CartoonButton(this, { x: LAYOUT.callX, y: by, width: bw, height: bh, label: 'CALL', color: COL.green, fontSize: bf, onClick: () => this.sendAction('call') });
    this.raiseBtn = new CartoonButton(this, { x: LAYOUT.raiseX, y: by, width: bw, height: bh, label: 'RAISE', color: COL.orange, fontSize: bf, textColor: css(COL.ink), onClick: () => this.sendAction('raise') });

    const sy = LAYOUT.sliderY;
    this.sliderTrack = this.add.graphics();
    this.sliderThumb = this.add.container(this.sliderMinX, sy);
    const tg = this.add.graphics();
    tg.fillStyle(darken(COL.gold, 0.3), 1); tg.fillCircle(0, 2, 18);
    tg.fillStyle(COL.gold, 1); tg.fillCircle(0, 0, 17);
    tg.fillStyle(COL.white, 0.3); tg.fillEllipse(0, -6, 20, 9);
    tg.lineStyle(3, COL.ink, 0.9); tg.strokeCircle(0, 0, 17);
    this.sliderThumb.add(tg);
    this.sliderThumb.setSize(40, 40).setInteractive({
      hitArea: new Phaser.Geom.Rectangle(-20, -20, 40, 40), hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true, draggable: true,
    });
    this.input.setDraggable(this.sliderThumb);
    this.sliderThumb.on('drag', (_p: unknown, dx: number) => {
      const cl = Phaser.Math.Clamp(dx, this.sliderMinX, this.sliderMaxX);
      this.sliderThumb.x = cl;
      const t = (cl - this.sliderMinX) / (this.sliderMaxX - this.sliderMinX);
      this.raiseAmount = Math.round(this.raiseMin + t * (this.raiseMax - this.raiseMin));
      this.drawSlider();
      this.raiseBtn.setLabel(`RAISE ${abbrev(this.raiseAmount)}`);
    });
    this.drawSlider();

    this.panel = this.add.container(0, 0, [this.foldBtn, this.callBtn, this.raiseBtn, this.sliderTrack, this.sliderThumb]).setDepth(9);
    this.panel.setVisible(false);
  }

  private drawSlider() {
    const y = LAYOUT.sliderY;
    this.sliderTrack.clear();
    this.sliderTrack.fillStyle(COL.ink, 0.6); this.sliderTrack.fillRoundedRect(this.sliderMinX, y - 6, this.sliderMaxX - this.sliderMinX, 12, 6);
    const filled = this.sliderThumb.x - this.sliderMinX;
    if (filled > 0) { this.sliderTrack.fillStyle(COL.gold, 1); this.sliderTrack.fillRoundedRect(this.sliderMinX, y - 6, filled, 12, 6); }
  }

  // ─── Socket ─────────────────────────────────────────────────────────────────
  private setupSocket() {
    const socket = getSocket();
    const onState = (s: GameState) => this.render(s);
    const onTimer = ({ secondsLeft }: { secondsLeft: number }) => this.updateTimer(secondsLeft);
    socket.on('game:state', onState);
    socket.on('game:timer', onTimer);
    this.events.once('shutdown', () => { socket.off('game:state', onState); socket.off('game:timer', onTimer); });
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  private render(s: GameState) {
    this.state = s;
    this.myIdx = s.players.findIndex(p => p.id === this.myId);

    if (this.prevPhase === 'waiting' && s.phase === 'preflop') this.animateDeal(s);
    if (this.prevPhase !== 'showdown' && s.phase === 'showdown' && s.winners.length) {
      this.animateChips(s);
      this.time.delayedCall(150, () => SoundManager.play('applause', 0.6));
    }
    if (s.pot > this.prevPot && s.phase !== 'showdown') SoundManager.play('chip', 0.4);
    if (s.actionHistory.length > this.prevHist) {
      const latest = s.actionHistory[s.actionHistory.length - 1];
      if (latest && latest.playerName !== 'Dealer') this.showActionBubble(latest.playerName, latest.description);
      if (latest?.description === 'folded') SoundManager.play('fold', 0.4);
    }
    this.prevPhase = s.phase; this.prevPot = s.pot; this.prevHist = s.actionHistory.length;

    this.updatePot(s);
    this.updateCommunity(s);
    this.updateSeats(s);
    this.updatePanel(s);
    this.updateWaiting(s);

    if (s.phase === 'showdown' && s.winners.length) {
      if (!this.scene.isActive('ResultScene')) this.scene.launch('ResultScene', { state: s, myPlayerId: this.myId });
    } else if (this.scene.isActive('ResultScene')) {
      this.scene.stop('ResultScene');
    }
  }

  private updateWaiting(s: GameState) {
    const waiting = s.phase === 'waiting';
    this.waitText.setVisible(waiting);
    const amHost = this.myIdx === 0;
    const canStart = waiting && s.players.length >= 2;
    if (waiting) this.waitText.setText(s.players.length < 2 ? 'Waiting for players…' : 'Ready to play!');
    this.startBtn?.setVisible(canStart && amHost);
  }

  private updatePot(s: GameState) {
    this.potText.setText(commas(s.pot));
    const me = s.players.find(p => p.id === this.myId);
    this.balanceText.setText(commas(me?.chips ?? 0));
    this.phaseText.setText(`NL HOLD'EM  $${s.smallBlind}/$${s.bigBlind}`);
  }

  private updateCommunity(s: GameState) {
    for (let i = 0; i < COMMUNITY; i++) {
      const card = s.communityCards[i];
      if (card) this.community[i].setTexture(`card_${card.rank}_${card.suit}`).setVisible(true);
      else this.community[i].setVisible(false);
    }
  }

  private seatIndexFor(playerIdx: number, n: number): number {
    return this.myIdx >= 0 ? (playerIdx - this.myIdx + n) % n : playerIdx;
  }

  private updateSeats(s: GameState) {
    const n = s.players.length;
    for (const st of this.seats) {
      st.avatar.setTexture('avatar_empty').setDisplaySize(AVATAR_R * 2, AVATAR_R * 2).setAlpha(0.6);
      st.nameText.setVisible(false); st.chipsText.setVisible(false);
      st.betChip.setVisible(false); st.betText.setVisible(false);
      st.dealer.setVisible(false); st.stamp.setVisible(false);
      st.cards[0].setVisible(false); st.cards[1].setVisible(false);
      st.glow.setVisible(false); st.timer.clear();
    }
    this.glowTween?.stop();

    for (let i = 0; i < n; i++) {
      const p = s.players[i];
      const seatIdx = this.seatIndexFor(i, n);
      const st = this.seats[seatIdx];
      if (!st) continue;
      const isMe = p.id === this.myId;
      const isActive = p.id === s.activePlayerId;

      const key = isMe ? resolveAvatar(this, getAvatarKey()) : `avatar_${this.avatarFor(p.id)}`;
      const size = st.local ? AVATAR_R * 2.2 : AVATAR_R * 2;
      st.avatar.setTexture(key).setDisplaySize(size, size).setAlpha(p.isFolded ? 0.45 : 1);

      st.nameText.setText(isMe ? 'You' : p.name).setVisible(true).setColor(isMe ? css(COL.gold) : css(COL.cream));
      st.chipsText.setText(abbrev(p.chips)).setVisible(true);

      if (p.bet > 0) { st.betChip.setVisible(true); st.betText.setText(commas(p.bet)).setVisible(true); }

      const dealerSeat = this.seatIndexFor(s.dealerIndex, n);
      st.dealer.setVisible(seatIdx === dealerSeat);

      const hasCards = p.holeCards.length === 2;
      const reveal = s.phase === 'showdown';
      if (hasCards && (!p.isFolded || reveal)) {
        const showFace = isMe || reveal;
        const [c0, c1] = p.holeCards;
        st.cards[0].setTexture(showFace && c0 ? `card_${c0.rank}_${c0.suit}` : 'card_back').setVisible(true).setAlpha(p.isFolded ? 0.45 : 1);
        st.cards[1].setTexture(showFace && c1 ? `card_${c1.rank}_${c1.suit}` : 'card_back').setVisible(true).setAlpha(p.isFolded ? 0.45 : 1);
      }

      if (p.isFolded) st.stamp.setText('FOLD').setColor(css(COL.cream)).setVisible(true).setAlpha(0.85);
      else if (p.isAllIn) st.stamp.setText('ALL IN').setColor(css(COL.orange)).setVisible(true).setAlpha(1);

      if (isActive && !p.isFolded && s.phase !== 'showdown' && s.phase !== 'waiting') {
        st.glow.setVisible(true);
        this.glowTween = this.tweens.add({ targets: st.glow, alpha: { from: 0.9, to: 0.3 }, scale: { from: st.glow.scale, to: st.glow.scale * 1.1 }, duration: 650, yoyo: true, repeat: -1 });
      }
    }
  }

  private avatarFor(id: string): number {
    let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
    return Math.abs(h) % 8;
  }

  // ─── Timer ring ─────────────────────────────────────────────────────────────
  private updateTimer(secondsLeft: number) {
    if (!this.state) return;
    const n = this.state.players.length;
    const pidx = this.state.players.findIndex(p => p.id === this.state.activePlayerId);
    if (pidx === -1) return;
    const st = this.seats[this.seatIndexFor(pidx, n)];
    if (!st) return;
    const p = Phaser.Math.Clamp(secondsLeft / ACTION_TIMEOUT, 0, 1);
    const color = p > 0.5 ? COL.green : p > 0.25 ? COL.orange : COL.red;
    const r = st.local ? AVATAR_R * 1.1 + 6 : AVATAR_R + 6;
    st.timer.clear();
    st.timer.lineStyle(6, COL.ink, 0.4); st.timer.strokeCircle(st.x, st.y, r);
    st.timer.lineStyle(6, color, 1);
    st.timer.beginPath();
    st.timer.arc(st.x, st.y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p, false);
    st.timer.strokePath();
  }

  // ─── Action panel update ────────────────────────────────────────────────────
  private updatePanel(s: GameState) {
    const me = s.players.find(p => p.id === this.myId);
    const live = !['waiting', 'showdown', 'dealing'].includes(s.phase);
    const myTurn = s.activePlayerId === this.myId && live;
    // The AI assistant can analyse your hand throughout a live hand, not just on
    // your exact turn — show it whenever you're holding live cards.
    const inHand = !!me && me.holeCards.length === 2 && !me.isFolded && live;

    this.panel.setVisible(myTurn);
    this.aiBtn.setVisible(inHand);
    if (!inHand && this.aiPanel?.visible) this.hideAi();
    if (!myTurn || !me) return;

    const toCall = s.currentBet - me.bet;
    this.callBtn.setLabel(toCall <= 0 ? 'CHECK' : `CALL ${abbrev(toCall)}`);

    this.raiseMin = Math.min(me.chips, s.currentBet + s.bigBlind);
    this.raiseMax = me.chips;
    this.raiseAmount = this.raiseMin;
    this.sliderThumb.x = this.sliderMinX;
    this.drawSlider();
    this.raiseBtn.setLabel(`RAISE ${abbrev(this.raiseAmount)}`).setEnabled(this.raiseMax > s.currentBet);
  }

  private sendAction(type: 'fold' | 'check' | 'call' | 'raise') {
    SoundManager.play('click');
    const socket = getSocket();
    if (type === 'raise') { socket.emit('game:action', { type, amount: this.raiseAmount }); return; }
    if (type === 'call') {
      const me = this.state?.players.find(p => p.id === this.myId);
      const canCheck = me ? me.bet >= this.state.currentBet : false;
      socket.emit('game:action', { type: canCheck ? 'check' : 'call' });
      return;
    }
    socket.emit('game:action', { type });
  }

  // ─── Action bubble ──────────────────────────────────────────────────────────
  private showActionBubble(playerName: string, desc: string) {
    if (!this.state) return;
    const pidx = this.state.players.findIndex(p => p.name === playerName);
    if (pidx === -1) return;
    const st = this.seats[this.seatIndexFor(pidx, this.state.players.length)];
    if (!st) return;
    const color = desc.startsWith('raised') || desc.startsWith('went all') ? COL.orange
      : desc === 'folded' ? COL.red : desc.startsWith('called') ? COL.blue : COL.green;
    const c = this.add.container(st.x, st.y - AVATAR_R - 22).setDepth(40);
    const label = this.add.text(0, 0, desc.toUpperCase(), gameText(14, css(COL.cream), { strokeThickness: 3 })).setOrigin(0.5);
    const bw = label.width + 24;
    const g = this.add.graphics();
    g.fillStyle(color, 1); g.fillRoundedRect(-bw / 2, -15, bw, 30, 12);
    g.lineStyle(2.5, COL.ink, 0.9); g.strokeRoundedRect(-bw / 2, -15, bw, 30, 12);
    c.add([g, label]);
    c.setScale(0);
    this.tweens.add({ targets: c, scale: 1, duration: 220, ease: 'Back.Out' });
    this.tweens.add({ targets: c, alpha: 0, y: c.y - 22, delay: 1300, duration: 350, onComplete: () => c.destroy() });
  }

  // ─── Animations ─────────────────────────────────────────────────────────────
  private animateDeal(s: GameState) {
    if (this.dealing) return;
    this.dealing = true;
    SoundManager.play('deal', 0.5);
    const n = s.players.length; let k = 0;
    s.players.forEach((_, pi) => {
      const st = this.seats[this.seatIndexFor(pi, n)];
      if (!st) return;
      for (let cd = 0; cd < 2; cd++) {
        const fly = this.add.image(TABLE_CX, TABLE_CY, 'card_back').setDisplaySize(HOLE_W * 0.6, HOLE_H * 0.6).setDepth(30);
        this.tweens.add({ targets: fly, x: st.cards[cd].x, y: st.cards[cd].y, duration: 300, delay: k * 60, ease: 'Cubic.Out', onComplete: () => fly.destroy() });
        k++;
      }
    });
    this.time.delayedCall(k * 60 + 380, () => { this.dealing = false; });
  }

  private animateChips(s: GameState) {
    const n = s.players.length;
    s.winners.forEach((w, wi) => {
      const pidx = s.players.findIndex(p => p.id === w.playerId);
      if (pidx === -1) return;
      const st = this.seats[this.seatIndexFor(pidx, n)];
      if (!st) return;
      for (let cd = 0; cd < 6; cd++) {
        const coin = this.add.image(TABLE_CX + Phaser.Math.Between(-26, 26), TABLE_CY - 30, 'coin').setDisplaySize(26, 26).setDepth(25);
        this.tweens.add({ targets: coin, x: st.x, y: st.y, duration: 600, delay: wi * 100 + cd * 45, ease: 'Cubic.InOut', onComplete: () => { SoundManager.play('coin', 0.35); coin.destroy(); } });
      }
    });
  }

  // ─── AI assistant ───────────────────────────────────────────────────────────
  private createAiButton() {
    this.aiBtn = new CartoonButton(this, {
      x: LAYOUT.aiX, y: LAYOUT.aiY, width: LAYOUT.aiW, height: 64,
      label: '🤖 ASK AI', color: COL.purple, fontSize: 22, onClick: () => void this.askAi(),
    });
    this.aiBtn.setVisible(false);
    this.aiPanel = this.add.container(0, 0).setVisible(false).setDepth(60);
  }

  private async askAi() {
    if (this.aiLoading) return;
    const tier = getStoredTier();
    if (tier !== 'vip' && getQueriesRemaining() <= 0) { this.buildAi(p => this.upgradeMsg(p)); return; }
    const me = this.state?.players.find(p => p.id === this.myId);
    if (!me || me.holeCards.length < 2) return;
    this.aiLoading = true;
    this.buildAi(p => p.add(this.add.text(0, 0, '🤖 Analyzing…', gameText(20, css(COL.cream))).setOrigin(0.5)));
    try {
      const r = await analyzeHand({ holeCards: me.holeCards, communityCards: this.state.communityCards, activePlayers: this.state.players.filter(p => !p.isFolded).length, pot: this.state.pot, currentBet: this.state.currentBet });
      this.buildAi(p => this.aiResult(p, r));
    } catch (e) {
      this.buildAi(p => p.add(this.add.text(0, 0, `⚠️ ${e instanceof Error ? e.message : 'AI failed'}`, gameText(16, css(COL.red), { strokeThickness: 0 })).setOrigin(0.5).setWordWrapWidth(360)));
    } finally { this.aiLoading = false; }
  }

  private aiResult(panel: Phaser.GameObjects.Container, r: AiAnalysis) {
    const recColor = r.recommendation === 'raise' ? COL.green : r.recommendation === 'call' ? COL.blue : COL.red;
    const ring = this.add.graphics();
    ring.lineStyle(12, COL.ink, 0.5); ring.strokeCircle(0, -70, 42);
    ring.lineStyle(12, r.winProbability > 0.55 ? COL.green : r.winProbability > 0.35 ? COL.orange : COL.red, 1);
    ring.beginPath(); ring.arc(0, -70, 42, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * r.winProbability); ring.strokePath();
    panel.add(ring);
    panel.add(this.add.text(0, -74, `${Math.round(r.winProbability * 100)}%`, gameText(22, css(COL.cream))).setOrigin(0.5));
    panel.add(this.add.text(0, -44, 'WIN', gameText(12, css(COL.cream), { strokeThickness: 0 })).setOrigin(0.5));
    const badge = this.add.graphics();
    badge.fillStyle(recColor, 1); badge.fillRoundedRect(-100, 0, 200, 48, 12); badge.lineStyle(3, COL.ink, 0.9); badge.strokeRoundedRect(-100, 0, 200, 48, 12);
    panel.add(badge);
    panel.add(this.add.text(0, 24, r.recommendation.toUpperCase(), gameText(26, css(COL.cream))).setOrigin(0.5));
    panel.add(this.add.text(0, 64, `Pot odds ${r.potOdds} · ${r.confidence}`, gameText(14, css(COL.cream), { strokeThickness: 0 })).setOrigin(0.5));
    const reason = this.add.text(0, 96, r.reasoning, gameText(15, css(COL.cream), { strokeThickness: 0, shadow: false })).setOrigin(0.5, 0).setWordWrapWidth(420).setAlign('center');
    const wrapped = reason.getWrappedText();
    if (wrapped.length > 3) {
      const clipped = wrapped.slice(0, 3);
      clipped[2] = clipped[2].replace(/\s+\S*$/, '') + '…';
      reason.setText(clipped.join('\n'));
    }
    panel.add(reason);
  }

  private upgradeMsg(panel: Phaser.GameObjects.Container) {
    panel.add(this.add.text(0, -20, '🔒 Free AI limit reached', gameText(20, css(COL.gold))).setOrigin(0.5));
    panel.add(this.add.text(0, 20, 'Upgrade to VIP in the Shop\nfor unlimited hand analysis.', gameText(15, css(COL.cream), { strokeThickness: 0, shadow: false })).setOrigin(0.5).setAlign('center'));
  }

  private buildAi(populate: (p: Phaser.GameObjects.Container) => void) {
    this.aiPanel.removeAll(true);
    this.aiPanel.setVisible(true);
    this.aiReady = false;
    this.time.delayedCall(300, () => { this.aiReady = true; });
    const cx = W / 2, cy = H / 2, pw = Math.min(W - 60, 520), ph = 380;
    const overlay = this.add.graphics().fillStyle(COL.black, 0.6).fillRect(0, 0, W, H);
    overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, W, H), Phaser.Geom.Rectangle.Contains).on('pointerup', () => { if (this.aiReady) this.hideAi(); });
    const bg = addPanel(this, cx, cy, pw, ph, COL.panel);
    const title = this.add.text(cx, cy - ph / 2 + 30, '🤖 AI ODDS ASSISTANT', gameText(20, css(COL.gold))).setOrigin(0.5);
    const inner = this.add.container(cx, cy);
    populate(inner);
    const close = addCloseButton(this, cx + pw / 2 - 30, cy - ph / 2 + 28, () => this.hideAi());
    this.aiPanel.add([overlay, bg, title, inner, close]);
  }

  private hideAi() { this.aiPanel.setVisible(false); this.aiPanel.removeAll(true); }

  private leave() {
    SoundManager.play('click');
    getSocket().emit('room:leave');
    this.scene.start('HomeScene');
  }
}
