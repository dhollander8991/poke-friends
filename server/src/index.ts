import { config } from './config.js'; // dotenv loaded here first
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import type { ClientToServerEvents, ServerToClientEvents } from '@texas-holdem/shared';
import { signToken, verifyToken } from './auth/jwt.js';
import { requireAuth } from './auth/middleware.js';
import { registerSocketHandlers } from './handlers/socketHandlers.js';
import { handleCheckout } from './routes/checkout.js';
import { handleStripeWebhook } from './routes/webhooks.js';
import { handleAiAnalyze } from './routes/ai.js';
import { handleDailyBonus } from './routes/dailyBonus.js';
import { handleWheelSpin } from './routes/wheel.js';
import { handleSocialAuth } from './routes/social.js';

const app = express();

// ─── CORS ────────────────────────────────────────────────────────────────────
// Client and server live on different origins in production (Vercel ↔ Render),
// so REST routes need CORS headers too — not just Socket.IO. In dev we allow any
// localhost port; in prod we allow the configured CLIENT_ORIGIN list (+ Vercel
// preview deploys for the same project). No extra dependency — done by hand.
const isProd = process.env['NODE_ENV'] === 'production';
const allowList = new Set(config.clientOrigins);

function originAllowed(origin: string | undefined): boolean {
  if (!origin) return true; // same-origin / curl / native app
  if (!isProd && /^http:\/\/localhost:\d+$/.test(origin)) return true;
  if (allowList.has(origin)) return true;
  // allow this project's Vercel preview URLs, e.g. https://poke-friends-*.vercel.app
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin) &&
      config.clientOrigins.some((o) => o.endsWith('.vercel.app'))) return true;
  return false;
}

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (originAllowed(origin) && origin) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  if (req.method === 'OPTIONS') { res.sendStatus(204); return; }
  next();
});

// ─── Stripe webhook MUST use raw body before the global JSON parser ─────────
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);

// ─── Global JSON parser for all other routes ────────────────────────────────
app.use(express.json());

const httpServer = createServer(app);

const corsOrigin = (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) =>
  cb(null, originAllowed(origin));

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// ─── JWT middleware (Socket.IO) ────────────────────────────────────────────
io.use((socket, next) => {
  const token = socket.handshake.auth['token'] as string | undefined;
  if (token) {
    const payload = verifyToken(token);
    if (payload) socket.data['jwt'] = payload;
  }
  next();
});

// ─── REST endpoints ────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.post('/auth/guest', (req, res) => {
  const body = req.body as Record<string, unknown>;
  const name = body['name'];
  if (typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'name is required' });
    return;
  }
  const playerId = uuidv4();
  const token = signToken({ playerId, name: name.trim() });
  res.json({ playerId, token });
});

// ── Social login (Google / Facebook) ───────────────────────────────────────
app.post('/auth/social', handleSocialAuth);

// ── Monetization ──────────────────────────────────────────────────────────
app.post('/api/checkout',    requireAuth, handleCheckout);
app.post('/api/daily-bonus', requireAuth, handleDailyBonus);
app.post('/api/wheel/spin',  requireAuth, handleWheelSpin);

// ── AI assistant ──────────────────────────────────────────────────────────
app.post('/api/ai/analyze', requireAuth, handleAiAnalyze);

// ─── Socket.IO connection ──────────────────────────────────────────────────
io.on('connection', socket => {
  console.log(`[socket] connected: ${socket.id}`);
  registerSocketHandlers(io, socket);
  socket.on('disconnect', reason => {
    console.log(`[socket] disconnected: ${socket.id} — ${reason}`);
  });
});

// Bind 0.0.0.0 so it's reachable inside containers (Render/Railway/Docker).
httpServer.listen(config.port, '0.0.0.0', () => {
  console.log(`Server listening on :${config.port} (origins: ${config.clientOrigins.join(', ')})`);
});
