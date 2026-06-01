import type { Request, Response } from 'express';
import { WHEEL_COOLDOWN_MS } from '@texas-holdem/shared';
import { sessionStore } from '../store/SessionStore.js';
import { roomManager } from '../game/roomManagerInstance.js';
import type { AuthRequest } from '../auth/middleware.js';

/** POST /api/wheel/spin — server-authoritative free spin (cooldown gated). */
export function handleWheelSpin(req: Request, res: Response) {
  const { player } = req as AuthRequest;
  const { playerId } = player;

  const result = sessionStore.spinWheel(playerId);
  if (!result) {
    res.status(429).json({
      error: 'Wheel on cooldown',
      nextInMs: sessionStore.nextWheelMs(playerId),
    });
    return;
  }

  // Land the coins in-game now if seated, otherwise credit on next join.
  const credited = roomManager.creditChips(playerId, result.coins);
  if (!credited) sessionStore.addPendingChips(playerId, result.coins);

  res.json({ index: result.index, coins: result.coins, nextInMs: WHEEL_COOLDOWN_MS });
}
