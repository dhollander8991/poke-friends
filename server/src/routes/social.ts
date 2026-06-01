import type { Request, Response } from 'express';
import { signToken } from '../auth/jwt.js';

/**
 * POST /auth/social — exchange a Google/Facebook token for our own JWT.
 *
 * The browser obtains the provider access token via the official SDK and sends it
 * here. We verify it by calling the provider's userinfo endpoint (so a forged
 * token is rejected), then mint a JWT keyed by a stable per-provider playerId so
 * the player's coins/stats persist across devices.
 */
interface SocialBody {
  provider?: 'google' | 'facebook';
  token?: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
}

interface VerifiedProfile { id: string; name: string; email?: string; avatarUrl?: string }

async function verifyGoogle(token: string): Promise<VerifiedProfile | null> {
  try {
    const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return null;
    const u = (await r.json()) as { sub?: string; name?: string; email?: string; picture?: string };
    if (!u.sub) return null;
    return { id: `g_${u.sub}`, name: u.name ?? 'Player', email: u.email, avatarUrl: u.picture };
  } catch {
    return null;
  }
}

async function verifyFacebook(token: string): Promise<VerifiedProfile | null> {
  try {
    const url = `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${encodeURIComponent(token)}`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const u = (await r.json()) as { id?: string; name?: string; email?: string; picture?: { data?: { url?: string } } };
    if (!u.id) return null;
    return { id: `f_${u.id}`, name: u.name ?? 'Player', email: u.email, avatarUrl: u.picture?.data?.url };
  } catch {
    return null;
  }
}

export async function handleSocialAuth(req: Request, res: Response) {
  const { provider, token } = req.body as SocialBody;
  if (!provider || !token) {
    res.status(400).json({ error: 'provider and token are required' });
    return;
  }

  const profile = provider === 'google' ? await verifyGoogle(token) : await verifyFacebook(token);
  if (!profile) {
    res.status(401).json({ error: 'Could not verify social token' });
    return;
  }

  const jwt = signToken({ playerId: profile.id, name: profile.name });
  res.json({
    token: jwt,
    playerId: profile.id,
    account: { provider, name: profile.name, email: profile.email, avatarUrl: profile.avatarUrl },
  });
}
