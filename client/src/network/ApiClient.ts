import type { Card } from '@texas-holdem/shared';

const SERVER = import.meta.env['VITE_SERVER_URL'] ?? 'http://localhost:3001';
const KEY_TOKEN = 'poker_token';
const KEY_PLAYER = 'poker_player_id';
const KEY_NAME = 'poker_name';
const KEY_TIER = 'poker_tier';
const KEY_AI_QUERIES = 'poker_ai_queries';
const KEY_WHEEL_NEXT = 'poker_wheel_next';

function token(): string | null { return localStorage.getItem(KEY_TOKEN); }

function authHeaders(): Record<string, string> {
  const t = token();
  return t
    ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${SERVER}${path}`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({ error: res.statusText }))) as { error: string };
    throw new Error(err.error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

// ── Guest identity (so wheel / daily / AI work from the menu) ───────────────

export async function ensureGuest(name: string): Promise<void> {
  localStorage.setItem(KEY_NAME, name);
  if (token()) return;
  try {
    const { playerId, token: t } = await post<{ playerId: string; token: string }>('/auth/guest', { name });
    localStorage.setItem(KEY_TOKEN, t);
    localStorage.setItem(KEY_PLAYER, playerId);
  } catch {
    // server offline — wheel/daily fall back to client-only crediting
  }
}

// ── Chip Store ──────────────────────────────────────────────────────────────

export type BundleId = 'chips_1000' | 'chips_5000' | 'chips_20000' | 'vip_monthly';

export async function createCheckout(bundleId: BundleId): Promise<string> {
  const { url } = await post<{ url: string }>('/api/checkout', { bundleId });
  return url;
}

// ── Daily Bonus ───────────────────────────────────────────────────────────

export async function claimDailyBonus(): Promise<{ chips: number; credited: boolean }> {
  return post('/api/daily-bonus', {});
}

// ── Spin Wheel ──────────────────────────────────────────────────────────────

export type SpinOutcome =
  | { status: 'ok'; index: number; coins: number; nextInMs: number }
  | { status: 'cooldown'; nextInMs: number };

export async function spinWheel(): Promise<SpinOutcome> {
  const res = await fetch(`${SERVER}/api/wheel/spin`, { method: 'POST', headers: authHeaders(), body: '{}' });
  if (res.status === 429) {
    const body = (await res.json().catch(() => ({}))) as { nextInMs?: number };
    const nextInMs = body.nextInMs ?? 0;
    localStorage.setItem(KEY_WHEEL_NEXT, String(Date.now() + nextInMs));
    return { status: 'cooldown', nextInMs };
  }
  if (!res.ok) throw new Error('spin failed');
  const body = (await res.json()) as { index: number; coins: number; nextInMs: number };
  localStorage.setItem(KEY_WHEEL_NEXT, String(Date.now() + body.nextInMs));
  return { status: 'ok', ...body };
}

export function wheelNextAt(): number {
  return parseInt(localStorage.getItem(KEY_WHEEL_NEXT) ?? '0', 10) || 0;
}

export function setWheelNextAt(ts: number): void {
  localStorage.setItem(KEY_WHEEL_NEXT, String(ts));
}

// ── AI Analysis ───────────────────────────────────────────────────────────

export interface AiAnalysis {
  winProbability: number;
  potOdds: string;
  recommendation: 'fold' | 'call' | 'raise';
  reasoning: string;
  confidence: 'low' | 'medium' | 'high';
  queriesRemaining: number;
}

export interface AiRequest {
  holeCards: Card[];
  communityCards: Card[];
  activePlayers: number;
  pot: number;
  currentBet: number;
}

export async function analyzeHand(req: AiRequest): Promise<AiAnalysis> {
  const result = await post<AiAnalysis>('/api/ai/analyze', req);
  setQueriesRemaining(result.queriesRemaining);
  return result;
}

// ── Local tier/query state (optimistic, synced from server responses) ─────

export function getStoredTier(): 'free' | 'vip' {
  return (localStorage.getItem(KEY_TIER) as 'free' | 'vip') ?? 'free';
}
export function setStoredTier(t: 'free' | 'vip') { localStorage.setItem(KEY_TIER, t); }
export function getQueriesRemaining(): number {
  const stored = localStorage.getItem(KEY_AI_QUERIES);
  if (stored === null) return 3;
  if (stored === 'vip') return Infinity;
  return parseInt(stored, 10);
}
export function setQueriesRemaining(n: number) {
  localStorage.setItem(KEY_AI_QUERIES, n === Infinity ? 'vip' : String(n));
}
