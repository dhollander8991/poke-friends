/**
 * Wallet — the player's persistent coin balance + identity (name, avatar).
 *
 * Coins are the casual-game currency: they tick up from the wheel, daily bonus
 * and shop, and carry into a table as your buy-in. This is the snappy client
 * mirror so menus always show a live, animatable number — Coin Master style.
 */

const KEY = 'poker_coins';
const KEY_AVATAR = 'poker_avatar';            // preset index (0..AVATAR_COUNT-1)
const KEY_AVATAR_CUSTOM = 'poker_avatar_custom'; // uploaded image as a data URL
const KEY_AVATAR_USE = 'poker_avatar_use';     // 'custom' | 'preset'
const KEY_NAME = 'poker_name';
const START = 2500;

type Listener = (coins: number) => void;
const listeners = new Set<Listener>();

export function getCoins(): number {
  const raw = localStorage.getItem(KEY);
  if (raw === null) {
    localStorage.setItem(KEY, String(START));
    return START;
  }
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : START;
}

export function setCoins(n: number): number {
  const v = Math.max(0, Math.round(n));
  localStorage.setItem(KEY, String(v));
  listeners.forEach((l) => l(v));
  return v;
}

export function addCoins(delta: number): number {
  return setCoins(getCoins() + delta);
}

export function spendCoins(amount: number): boolean {
  const cur = getCoins();
  if (cur < amount) return false;
  setCoins(cur - amount);
  return true;
}

/** Subscribe to balance changes; returns an unsubscribe fn. */
export function onCoins(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ─── Player name ─────────────────────────────────────────────────────────────
export function getName(): string {
  return localStorage.getItem(KEY_NAME) ?? 'Player';
}
export function setName(name: string): void {
  localStorage.setItem(KEY_NAME, name.trim().slice(0, 16) || 'Player');
}

// ─── Avatar selection (preset index OR uploaded custom image) ────────────────
export function getAvatarId(): number {
  const raw = localStorage.getItem(KEY_AVATAR);
  const n = raw === null ? hashName() : parseInt(raw, 10);
  return Number.isFinite(n) ? n : 0;
}

/** Select a built-in preset avatar. */
export function setAvatarId(id: number): void {
  localStorage.setItem(KEY_AVATAR, String(id));
  localStorage.setItem(KEY_AVATAR_USE, 'preset');
}

export function getCustomAvatar(): string | null {
  return localStorage.getItem(KEY_AVATAR_CUSTOM);
}

/** Store an uploaded image (data URL) and select it. */
export function setCustomAvatar(dataUrl: string): void {
  localStorage.setItem(KEY_AVATAR_CUSTOM, dataUrl);
  localStorage.setItem(KEY_AVATAR_USE, 'custom');
}

export function clearCustomAvatar(): void {
  localStorage.removeItem(KEY_AVATAR_CUSTOM);
  localStorage.setItem(KEY_AVATAR_USE, 'preset');
}

export function usingCustomAvatar(): boolean {
  return localStorage.getItem(KEY_AVATAR_USE) === 'custom' && !!getCustomAvatar();
}

/** The texture key the local player's avatar should render with. */
export function getAvatarKey(): string {
  return usingCustomAvatar() ? 'avatar_custom' : `avatar_${getAvatarId()}`;
}

/** Deterministic default avatar from the stored player name, so guests differ. */
function hashName(): number {
  const name = getName();
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return Math.abs(h) % 8;
}
