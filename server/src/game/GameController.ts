import { EventEmitter } from 'events';
import {
  Deck,
  BettingEngine,
  BlindManager,
  bestHandFromSeven,
  compareHands,
  type PlayerState,
  type Card,
  type GamePhase,
  type ActionPayload,
  type WinnerInfo,
  type SidePot,
  type Player,
  type ActionHistoryEntry,
} from '@texas-holdem/shared';
import { config } from '../config.js';

export interface ControllerState {
  phase: GamePhase;
  players: PlayerState[];
  communityCards: Card[];
  pot: number;
  sidePots: SidePot[];
  currentBet: number;
  activePlayerId: string | null;
  dealerIndex: number;
  smallBlindIndex: number;
  bigBlindIndex: number;
  smallBlind: number;
  bigBlind: number;
  winners: WinnerInfo[];
  secondsLeft: number;
  actionHistory: ActionHistoryEntry[];
}

/** Convert internal PlayerState to the shared Player type for emission. */
export function toPlayer(
  p: PlayerState,
  idx: number,
  dealerIdx: number,
  sbIdx: number,
  bbIdx: number,
): Player {
  return {
    id: p.id,
    name: p.name,
    chips: p.chips,
    holeCards: p.holeCards,
    bet: p.bet,
    totalBet: p.totalBet,
    isActive: p.isConnected && !p.folded,
    isFolded: p.folded,
    isAllIn: p.isAllIn,
    isDealer: idx === dealerIdx,
    isSmallBlind: idx === sbIdx,
    isBigBlind: idx === bbIdx,
    isConnected: p.isConnected,
  };
}

export class GameController extends EventEmitter {
  private players: PlayerState[] = [];
  private deck!: Deck;
  private communityCards: Card[] = [];
  private pot = 0;
  private sidePots: SidePot[] = [];
  private currentBet = 0;
  private phase: GamePhase = 'waiting';
  private dealerIndex = 0;
  private smallBlindIndex = 0;
  private bigBlindIndex = 0;
  private activePlayerIdx = -1;
  private winners: WinnerInfo[] = [];
  private timerInterval: NodeJS.Timeout | null = null;
  private secondsLeft = 0;
  private actionHistory: ActionHistoryEntry[] = [];

  // actionsThisStreet[playerId] = number of times they've voluntarily acted this street.
  // Correctly handles the BB option preflop: BB's posted blind is not counted.
  private actionsThisStreet = new Map<string, number>();

  private readonly betting = new BettingEngine();
  private readonly blinds: BlindManager;

  readonly smallBlind: number;
  readonly bigBlind: number;

  constructor(smallBlind = config.smallBlind, bigBlind = config.bigBlind) {
    super();
    this.smallBlind = smallBlind;
    this.bigBlind = bigBlind;
    this.blinds = new BlindManager(smallBlind, bigBlind);
  }

  // ─── Player management ────────────────────────────────────────────────────

  addPlayer(id: string, name: string, chips = config.startingChips): PlayerState {
    if (this.players.length >= 9) throw new Error('Table is full');
    const player: PlayerState = {
      id,
      name,
      chips,
      holeCards: [],
      bet: 0,
      totalBet: 0,
      folded: false,
      isAllIn: false,
      isConnected: true,
    };
    this.players.push(player);
    return player;
  }

  removePlayer(id: string) {
    const idx = this.players.findIndex(p => p.id === id);
    if (idx === -1) return;

    if (this.phase !== 'waiting' && this.phase !== 'showdown') {
      // Treat as an immediate fold so the hand can continue
      const p = this.players[idx];
      p.folded = true;
      p.isConnected = false;
      if (idx === this.activePlayerIdx) {
        this.clearTimer();
        this.advance();
      } else {
        this.emit('stateChanged');
      }
    } else {
      this.players.splice(idx, 1);
      if (this.dealerIndex >= this.players.length && this.players.length > 0) {
        this.dealerIndex = 0;
      }
    }
  }

  setConnected(id: string, connected: boolean) {
    const p = this.players.find(p => p.id === id);
    if (p) {
      p.isConnected = connected;
      this.emit('stateChanged');
    }
  }

  getPlayer(id: string): PlayerState | undefined {
    return this.players.find(p => p.id === id);
  }

  canStart(): boolean {
    return this.players.length >= 2 && this.phase === 'waiting';
  }

  // ─── Hand lifecycle ───────────────────────────────────────────────────────

  startHand() {
    if (!this.canStart()) return;

    this.deck = new Deck();
    this.communityCards = [];
    this.pot = 0;
    this.sidePots = [];
    this.currentBet = 0;
    this.phase = 'preflop';
    this.winners = [];
    this.actionsThisStreet.clear();
    this.actionHistory = [];

    // Deal hole cards and reset per-hand state
    this.players = this.players.map(p => ({
      ...p,
      holeCards: [this.deck.deal(), this.deck.deal()],
      bet: 0,
      totalBet: 0,
      folded: false,
      isAllIn: false,
    }));

    // Post blinds
    const br = this.blinds.postBlinds(this.players, this.dealerIndex);
    this.players = br.players;
    this.pot = br.pot;
    this.currentBet = br.currentBet;
    this.smallBlindIndex = br.smallBlindIndex;
    this.bigBlindIndex = br.bigBlindIndex;
    this.activePlayerIdx = br.activePlayerIndex;

    // Log blind posts
    const sb = this.players[br.smallBlindIndex];
    const bb = this.players[br.bigBlindIndex];
    if (sb) this.pushHistory(sb.name, `posted small blind $${this.smallBlind}`);
    if (bb) this.pushHistory(bb.name, `posted big blind $${this.bigBlind}`);

    // BB's posted blind is passive — do NOT pre-count it as an action.
    // actionsThisStreet is intentionally left empty here.

    this.startTimer();
    this.emit('stateChanged');
  }

  applyAction(playerId: string, action: ActionPayload): boolean {
    if (this.phase === 'waiting' || this.phase === 'showdown' || this.phase === 'dealing') {
      return false;
    }

    const player = this.players[this.activePlayerIdx];
    if (!player || player.id !== playerId) return false;

    const validation = this.betting.validateAction(player, action, this.currentBet, this.bigBlind);
    if (!validation.valid) return false;

    this.clearTimer();

    const result = this.betting.applyAction(
      this.players,
      this.pot,
      this.currentBet,
      this.activePlayerIdx,
      action,
    );
    this.players = result.players;
    this.pot = result.pot;
    this.currentBet = result.currentBet;

    // Log the action in history
    const actor = this.players[this.activePlayerIdx];
    if (actor) {
      let desc = '';
      switch (action.type) {
        case 'fold':  desc = 'folded'; break;
        case 'check': desc = 'checked'; break;
        case 'call':  desc = `called $${this.currentBet}`; break;
        case 'raise': desc = `raised to $${action.amount ?? this.currentBet * 2}`; break;
        case 'all-in':desc = `went all-in ($${actor.chips + actor.bet})`; break;
      }
      this.pushHistory(actor.name, desc);
    }

    // Count this as an explicit action for the BB-option check
    const prev = this.actionsThisStreet.get(playerId) ?? 0;
    this.actionsThisStreet.set(playerId, prev + 1);

    // If this was a raise, reset other players' action counts so they must act again
    if (result.lastRaiserIndex !== -1) {
      for (const p of this.players) {
        if (p.id !== playerId && !p.folded && !p.isAllIn) {
          this.actionsThisStreet.set(p.id, 0);
        }
      }
    }

    this.advance();
    return true;
  }

  // ─── Internal hand progression ────────────────────────────────────────────

  private advance() {
    const nonFolded = this.players.filter(p => !p.folded);

    if (nonFolded.length === 1) {
      this.endHand();
      return;
    }

    const canAct = nonFolded.filter(p => !p.isAllIn);

    if (canAct.length === 0) {
      this.runOutBoard();
      return;
    }

    // Betting round ends when every actionable player has acted at least once AND matched the bet.
    // The actionsThisStreet map correctly prevents the BB from being skipped on preflop.
    const allBetsMatch = canAct.every(p => p.bet === this.currentBet);
    const allActed = canAct.every(p => (this.actionsThisStreet.get(p.id) ?? 0) > 0);

    if (allBetsMatch && allActed) {
      this.nextStreet();
      return;
    }

    const nextIdx = this.findNextActionable(this.activePlayerIdx);
    this.activePlayerIdx = nextIdx;
    this.startTimer();
    this.emit('stateChanged');
  }

  private findNextActionable(fromIdx: number): number {
    const count = this.players.length;
    let next = (fromIdx + 1) % count;
    for (let i = 0; i < count; i++) {
      const p = this.players[next];
      if (!p.folded && !p.isAllIn) return next;
      next = (next + 1) % count;
    }
    return fromIdx;
  }

  private nextStreet() {
    const streets: GamePhase[] = ['preflop', 'flop', 'turn', 'river'];
    const idx = streets.indexOf(this.phase as (typeof streets)[number]);

    if (idx === streets.length - 1) {
      this.endHand();
      return;
    }

    this.phase = streets[idx + 1];

    if (this.phase === 'flop') {
      this.communityCards.push(this.deck.deal(), this.deck.deal(), this.deck.deal());
    } else {
      this.communityCards.push(this.deck.deal());
    }
    this.pushHistory('Dealer', `${this.phase} dealt`);

    // Reset bets and action counts for the new street
    this.players = this.players.map(p => ({ ...p, bet: 0 }));
    this.currentBet = 0;
    this.actionsThisStreet.clear();

    const canAct = this.players.filter(p => !p.folded && !p.isAllIn);
    if (canAct.length === 0) {
      this.runOutBoard();
      return;
    }

    // First to act postflop: first non-folded, non-all-in player left of dealer
    const firstIdx = this.findNextActionable(this.dealerIndex);
    this.activePlayerIdx = firstIdx;

    this.startTimer();
    this.emit('stateChanged');
  }

  private runOutBoard() {
    // Deal remaining community cards with no further betting
    if (this.communityCards.length === 0) {
      this.communityCards.push(this.deck.deal(), this.deck.deal(), this.deck.deal());
    }
    if (this.communityCards.length === 3) {
      this.communityCards.push(this.deck.deal());
    }
    if (this.communityCards.length === 4) {
      this.communityCards.push(this.deck.deal());
    }
    this.emit('stateChanged');
    this.endHand();
  }

  private endHand() {
    this.clearTimer();
    this.phase = 'showdown';
    this.sidePots = this.betting.calculateSidePots(this.players);
    this.winners = this.determineWinners();

    for (const w of this.winners) {
      const p = this.players.find(p => p.id === w.playerId);
      if (p) p.chips += w.amount;
    }

    this.emit('stateChanged');
    this.emit('handComplete', this.winners);

    setTimeout(() => {
      // Remove players who busted out
      this.players = this.players.filter(p => p.chips > 0);

      if (this.players.filter(p => p.isConnected).length >= 2) {
        this.dealerIndex = this.blinds.rotateDealer(this.dealerIndex, this.players.length);
        this.phase = 'waiting';
        this.startHand();
      } else {
        this.phase = 'waiting';
        this.emit('stateChanged');
      }
    }, config.showdownDelayMs);
  }

  private determineWinners(): WinnerInfo[] {
    const contenders = this.players.filter(p => !p.folded);

    if (contenders.length === 1) {
      return [{ playerId: contenders[0].id, amount: this.pot, handName: 'Last Standing' }];
    }

    const evaluated = contenders.map(p => ({
      player: p,
      hand: bestHandFromSeven([...p.holeCards, ...this.communityCards]),
    }));

    // No side pots — simple split
    if (this.sidePots.length === 0) {
      evaluated.sort((a, b) => compareHands(b.hand, a.hand));
      const best = evaluated[0].hand;
      const winners = evaluated.filter(e => compareHands(e.hand, best) === 0);
      const share = Math.floor(this.pot / winners.length);
      return winners.map(w => ({ playerId: w.player.id, amount: share, handName: w.hand.name }));
    }

    // Award each side pot to the best eligible hand
    const totals = new Map<string, { amount: number; handName: string }>();
    for (const pot of this.sidePots) {
      const eligible = evaluated.filter(e => pot.eligiblePlayerIds.includes(e.player.id));
      if (eligible.length === 0) continue;
      eligible.sort((a, b) => compareHands(b.hand, a.hand));
      const best = eligible[0].hand;
      const potWinners = eligible.filter(e => compareHands(e.hand, best) === 0);
      const share = Math.floor(pot.amount / potWinners.length);
      for (const w of potWinners) {
        const prev = totals.get(w.player.id);
        totals.set(w.player.id, {
          amount: (prev?.amount ?? 0) + share,
          handName: w.hand.name,
        });
      }
    }

    return [...totals.entries()].map(([playerId, { amount, handName }]) => ({
      playerId,
      amount,
      handName,
    }));
  }

  // ─── Action history ───────────────────────────────────────────────────────

  private pushHistory(playerName: string, description: string) {
    this.actionHistory.push({ playerName, description, timestamp: Date.now() });
    if (this.actionHistory.length > 10) this.actionHistory.shift();
  }

  // ─── Timer ────────────────────────────────────────────────────────────────

  private startTimer() {
    this.clearTimer();
    this.secondsLeft = config.actionTimeoutSecs;
    this.emit('timer', this.secondsLeft);

    this.timerInterval = setInterval(() => {
      this.secondsLeft = Math.max(0, this.secondsLeft - 1);
      this.emit('timer', this.secondsLeft);

      if (this.secondsLeft === 0) {
        this.clearTimer();
        const player = this.players[this.activePlayerIdx];
        if (player && !player.folded && !player.isAllIn) {
          this.applyAction(player.id, { type: 'fold' });
        }
      }
    }, 1000);
  }

  private clearTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.secondsLeft = 0;
  }

  // ─── State snapshot ───────────────────────────────────────────────────────

  getState(): ControllerState {
    return {
      phase: this.phase,
      players: this.players,
      communityCards: this.communityCards,
      pot: this.pot,
      sidePots: this.sidePots,
      currentBet: this.currentBet,
      activePlayerId:
        this.activePlayerIdx >= 0 ? (this.players[this.activePlayerIdx]?.id ?? null) : null,
      dealerIndex: this.dealerIndex,
      smallBlindIndex: this.smallBlindIndex,
      bigBlindIndex: this.bigBlindIndex,
      smallBlind: this.smallBlind,
      bigBlind: this.bigBlind,
      winners: this.winners,
      secondsLeft: this.secondsLeft,
      actionHistory: this.actionHistory,
    };
  }

  get playerCount(): number {
    return this.players.length;
  }
}
