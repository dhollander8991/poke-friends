/**
 * social.ts — optional Google / Facebook sign-in.
 *
 * Works when the relevant client ID is configured at build time
 * (`VITE_GOOGLE_CLIENT_ID`, `VITE_FACEBOOK_APP_ID`). When it isn't, `signInWith`
 * throws a friendly error so the UI can tell the player how to enable it. The
 * browser obtains the provider token via the official SDK; the server
 * (`POST /auth/social`) verifies it and returns our own JWT + a stable playerId,
 * so coins/stats persist across devices once signed in.
 */
const SERVER = import.meta.env['VITE_SERVER_URL'] ?? 'http://localhost:3001';
const GOOGLE_CLIENT_ID = import.meta.env['VITE_GOOGLE_CLIENT_ID'] as string | undefined;
const FACEBOOK_APP_ID = import.meta.env['VITE_FACEBOOK_APP_ID'] as string | undefined;

const KEY_ACCOUNT = 'poker_account';
const KEY_TOKEN = 'poker_token';
const KEY_PLAYER = 'poker_player_id';
const KEY_NAME = 'poker_name';

export type Provider = 'google' | 'facebook';
export interface Account {
  provider: Provider;
  name: string;
  email?: string;
  avatarUrl?: string;
}

export function getAccount(): Account | null {
  try { return JSON.parse(localStorage.getItem(KEY_ACCOUNT) ?? 'null') as Account | null; }
  catch { return null; }
}

export function isConfigured(p: Provider): boolean {
  return p === 'google' ? !!GOOGLE_CLIENT_ID : !!FACEBOOK_APP_ID;
}

export function signOut(): void {
  [KEY_ACCOUNT, KEY_TOKEN, KEY_PLAYER].forEach((k) => localStorage.removeItem(k));
}

/** Run the provider SDK flow, exchange the token with our server, persist session. */
export async function signInWith(provider: Provider): Promise<Account> {
  const profile = provider === 'google' ? await googleProfile() : await facebookProfile();

  const res = await fetch(`${SERVER}/auth/social`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, ...profile }),
  });
  if (!res.ok) throw new Error('Sign-in failed on server');
  const data = (await res.json()) as { token: string; playerId: string; account: Account };

  localStorage.setItem(KEY_TOKEN, data.token);
  localStorage.setItem(KEY_PLAYER, data.playerId);
  localStorage.setItem(KEY_ACCOUNT, JSON.stringify(data.account));
  localStorage.setItem(KEY_NAME, data.account.name.slice(0, 16));
  return data.account;
}

// ─── Google Identity Services ────────────────────────────────────────────────
interface GoogleProfile { token: string; name: string; email?: string; avatarUrl?: string }

async function googleProfile(): Promise<GoogleProfile> {
  if (!GOOGLE_CLIENT_ID) throw new Error('Google sign-in not configured (set VITE_GOOGLE_CLIENT_ID)');
  await loadScript('https://accounts.google.com/gsi/client');
  const google = (window as unknown as { google?: any }).google;
  if (!google?.accounts?.oauth2) throw new Error('Google SDK failed to load');

  const accessToken = await new Promise<string>((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'profile email',
      callback: (r: { access_token?: string }) => r.access_token ? resolve(r.access_token) : reject(new Error('No access token')),
      error_callback: () => reject(new Error('Google sign-in cancelled')),
    });
    client.requestAccessToken();
  });

  const info = await (await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })).json() as { name?: string; email?: string; picture?: string };

  return { token: accessToken, name: info.name ?? 'Player', email: info.email, avatarUrl: info.picture };
}

// ─── Facebook Login ──────────────────────────────────────────────────────────
interface FbProfile { token: string; name: string; email?: string; avatarUrl?: string }

async function facebookProfile(): Promise<FbProfile> {
  if (!FACEBOOK_APP_ID) throw new Error('Facebook sign-in not configured (set VITE_FACEBOOK_APP_ID)');
  await loadScript('https://connect.facebook.net/en_US/sdk.js');
  const FB = (window as unknown as { FB?: any }).FB;
  if (!FB) throw new Error('Facebook SDK failed to load');
  FB.init({ appId: FACEBOOK_APP_ID, version: 'v19.0', cookie: true, xfbml: false });

  const token = await new Promise<string>((resolve, reject) => {
    FB.login((r: { authResponse?: { accessToken: string } }) => {
      r.authResponse ? resolve(r.authResponse.accessToken) : reject(new Error('Facebook sign-in cancelled'));
    }, { scope: 'public_profile,email' });
  });

  const me = await new Promise<{ name?: string; email?: string; picture?: { data?: { url?: string } } }>((resolve) => {
    FB.api('/me', { fields: 'name,email,picture' }, (r: any) => resolve(r));
  });

  return { token, name: me.name ?? 'Player', email: me.email, avatarUrl: me.picture?.data?.url };
}

// ─── helper ──────────────────────────────────────────────────────────────────
const loaded = new Set<string>();
function loadScript(src: string): Promise<void> {
  if (loaded.has(src)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src; s.async = true; s.defer = true;
    s.onload = () => { loaded.add(src); resolve(); };
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}
