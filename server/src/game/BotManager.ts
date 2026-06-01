import type { GameController } from './GameController.js';
import type { ActionPayload } from '@texas-holdem/shared';

const BOT_NAMES = ['Bot Alice', 'Bot Bob', 'Bot Carol', 'Bot Dave'];

export { BOT_NAMES };

export class BotManager {
  private intervals = new Map<string, NodeJS.Timeout>();

  startBots(roomCode: string, controller: GameController, botIds: string[]) {
    if (this.intervals.has(roomCode)) return;

    const interval = setInterval(() => {
      const state = controller.getState();
      if (state.phase === 'waiting' || state.phase === 'showdown') return;

      const activeId = state.activePlayerId;
      if (!activeId || !botIds.includes(activeId)) return;

      const me = state.players.find(p => p.id === activeId);
      if (!me) return;

      const toCall = state.currentBet - me.bet;
      let action: ActionPayload;

      if (toCall === 0) {
        const r = Math.random();
        if (r < 0.25 && me.chips > state.bigBlind) {
          action = { type: 'raise', amount: state.currentBet + state.bigBlind };
        } else {
          action = { type: 'check' };
        }
      } else {
        const r = Math.random();
        if (r < 0.22) {
          action = { type: 'fold' };
        } else if (r < 0.38 && me.chips > toCall + state.bigBlind) {
          action = { type: 'raise', amount: state.currentBet * 2 };
        } else {
          action = { type: 'call' };
        }
      }

      controller.applyAction(activeId, action);
    }, 2000);

    this.intervals.set(roomCode, interval);
  }

  stopBots(roomCode: string) {
    const iv = this.intervals.get(roomCode);
    if (iv) { clearInterval(iv); this.intervals.delete(roomCode); }
  }
}

export const botManager = new BotManager();
