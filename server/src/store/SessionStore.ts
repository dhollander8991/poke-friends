import {
  DAILY_BONUS_CHIPS, DAILY_BONUS_MS,
  FREE_AI_QUERIES, AI_RATE_LIMIT_MS,
} from '../payments/chipBundles.js';
import { WHEEL_SEGMENTS, WHEEL_COOLDOWN_MS, pickWeightedSegment } from '@texas-holdem/shared';

class SessionStore {
  private tiers         = new Map<string, 'free' | 'vip'>();
  private dailyBonus    = new Map<string, number>(); // playerId → last claim ms
  private pendingChips  = new Map<string, number>(); // playerId → chips to credit on next join
  private aiLastReq     = new Map<string, number>(); // playerId → last request ms
  private aiQueriesUsed = new Map<string, number>(); // playerId → count this server session
  private wheelSpin     = new Map<string, number>(); // playerId → last free spin ms

  // ── Tier ────────────────────────────────────────────────────────────────

  getTier(playerId: string): 'free' | 'vip' {
    return this.tiers.get(playerId) ?? 'free';
  }

  setTier(playerId: string, tier: 'free' | 'vip') {
    this.tiers.set(playerId, tier);
  }

  // ── Chip credits ─────────────────────────────────────────────────────────

  addPendingChips(playerId: string, chips: number) {
    this.pendingChips.set(playerId, (this.pendingChips.get(playerId) ?? 0) + chips);
  }

  drainPendingChips(playerId: string): number {
    const chips = this.pendingChips.get(playerId) ?? 0;
    this.pendingChips.delete(playerId);
    return chips;
  }

  // ── Daily bonus ───────────────────────────────────────────────────────────

  canClaimDailyBonus(playerId: string): boolean {
    const last = this.dailyBonus.get(playerId);
    return !last || Date.now() - last >= DAILY_BONUS_MS;
  }

  claimDailyBonus(playerId: string): number | null {
    if (!this.canClaimDailyBonus(playerId)) return null;
    this.dailyBonus.set(playerId, Date.now());
    return DAILY_BONUS_CHIPS;
  }

  nextDailyBonusMs(playerId: string): number | null {
    const last = this.dailyBonus.get(playerId);
    if (!last) return null;
    return last + DAILY_BONUS_MS;
  }

  // ── Spin wheel ──────────────────────────────────────────────────────────

  /** ms until the next free spin is available (0 = available now). */
  nextWheelMs(playerId: string): number {
    const last = this.wheelSpin.get(playerId);
    if (!last) return 0;
    return Math.max(0, last + WHEEL_COOLDOWN_MS - Date.now());
  }

  /** Spin if off cooldown. Returns the winning wedge index + coins, or null. */
  spinWheel(playerId: string): { index: number; coins: number } | null {
    if (this.nextWheelMs(playerId) > 0) return null;
    this.wheelSpin.set(playerId, Date.now());
    const index = pickWeightedSegment();
    return { index, coins: WHEEL_SEGMENTS[index].coins };
  }

  // ── AI rate limiting ──────────────────────────────────────────────────────

  canQueryAi(playerId: string): { allowed: boolean; reason?: string } {
    const now = Date.now();
    const last = this.aiLastReq.get(playerId);
    if (last && now - last < AI_RATE_LIMIT_MS) {
      return { allowed: false, reason: 'Rate limit: wait 5 seconds between requests' };
    }

    const tier = this.getTier(playerId);
    if (tier === 'free') {
      const used = this.aiQueriesUsed.get(playerId) ?? 0;
      if (used >= FREE_AI_QUERIES) {
        return { allowed: false, reason: 'Free tier limit reached. Upgrade to VIP for unlimited queries.' };
      }
    }

    return { allowed: true };
  }

  recordAiQuery(playerId: string) {
    this.aiLastReq.set(playerId, Date.now());
    const used = this.aiQueriesUsed.get(playerId) ?? 0;
    this.aiQueriesUsed.set(playerId, used + 1);
  }

  aiQueriesRemaining(playerId: string): number {
    if (this.getTier(playerId) === 'vip') return Infinity;
    return FREE_AI_QUERIES - (this.aiQueriesUsed.get(playerId) ?? 0);
  }
}

export const sessionStore = new SessionStore();
