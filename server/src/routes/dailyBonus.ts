import type { Request, Response } from 'express';
import { sessionStore } from '../store/SessionStore.js';
import { roomManager } from '../game/roomManagerInstance.js';
import type { AuthRequest } from '../auth/middleware.js';

export function handleDailyBonus(req: Request, res: Response) {
  const { player } = req as AuthRequest;
  const { playerId } = player;

  const amount = sessionStore.claimDailyBonus(playerId);
  if (amount === null) {
    const nextMs = sessionStore.nextDailyBonusMs(playerId);
    res.status(429).json({
      error: 'Daily bonus already claimed',
      nextAvailableAt: nextMs,
    });
    return;
  }

  const credited = roomManager.creditChips(playerId, amount);
  if (!credited) {
    sessionStore.addPendingChips(playerId, amount);
  }

  res.json({ chips: amount, credited });
}
