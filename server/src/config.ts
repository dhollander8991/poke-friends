import 'dotenv/config';

function requireEnv(key: string, fallback?: string): string {
  const val = process.env[key] ?? fallback;
  if (val === undefined) throw new Error(`Missing required env var: ${key}`);
  return val;
}

/** Comma-separated allow-list → array (e.g. prod URL + preview URLs). */
const clientOrigins = (process.env.CLIENT_ORIGIN ?? 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export const config = {
  port: parseInt(process.env.PORT ?? '3001', 10),
  clientOrigin: clientOrigins[0],
  clientOrigins,
  jwtSecret: requireEnv('JWT_SECRET', process.env.NODE_ENV === 'production' ? undefined : 'dev-secret-change-in-prod'),
  jwtExpiry: (process.env.JWT_EXPIRY ?? '7d') as string,
  smallBlind: parseInt(process.env.SMALL_BLIND ?? '50', 10),
  bigBlind: parseInt(process.env.BIG_BLIND ?? '100', 10),
  startingChips: parseInt(process.env.STARTING_CHIPS ?? '1000', 10),
  actionTimeoutSecs: parseInt(process.env.ACTION_TIMEOUT_SECS ?? '30', 10),
  showdownDelayMs: parseInt(process.env.SHOWDOWN_DELAY_MS ?? '5000', 10),
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
} as const;
