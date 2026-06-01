# Poke'friends — Cartoon Multiplayer Poker (web + mobile)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Phaser](https://img.shields.io/badge/Phaser-3.80-orange)](https://phaser.io)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.7-010101?logo=socketdotio)](https://socket.io)
[![Stripe](https://img.shields.io/badge/Stripe-Payments-635BFF?logo=stripe&logoColor=white)](https://stripe.com)
[![Anthropic](https://img.shields.io/badge/Claude-AI_Assistant-D97757)](https://anthropic.com)
[![pnpm](https://img.shields.io/badge/pnpm-workspaces-F69220?logo=pnpm&logoColor=white)](https://pnpm.io)

A production-ready multiplayer Texas Hold'em poker game built with Phaser 3, Node.js, and Socket.IO. Real-time gameplay, AI odds analysis via Claude, Stripe-powered chip store, and a self-contained demo mode with AI bots.

**[🎮 Live Demo →](https://your-demo-url.com)**  *(replace with your deployment URL)*

---

## Features

| | |
|---|---|
| 🃏 Full poker rules | Blinds, multi-street betting, side pots, 9-hand rank evaluator |
| 🌐 Real-time multiplayer | Up to 9 players per table, reconnect after drop |
| 🤖 AI odds assistant | Claude `claude-sonnet-4-6` — win %, pot odds, fold/call/raise rec |
| 💰 Chip store | Stripe Checkout — 3 one-time bundles + VIP subscription ($4.99/mo) |
| 🎁 Daily bonus | 200 free chips every 24 hours |
| 🎰 Demo mode | Instant play with 4 server-side AI bots — no other players needed |
| 🔊 Sound effects | Synthesised via Howler.js + Web Audio — shuffle, clink, applause, swoosh |
| ✨ Animations | Card deal fly-in (Back.easeOut), chip slide to winner, glow ring on active player |
| 📜 Action history | Live sidebar — last 10 actions, colour-coded by type |
| 🔐 Auth | Stateless JWT — guest tokens, reconnect with session token |

---

## Architecture

```
texas-holdem/                     pnpm workspace monorepo
├── client/                       Phaser 3 + Vite + TypeScript  (port 5173)
│   ├── src/
│   │   ├── main.ts               Phaser.Game bootstrap (5 scenes)
│   │   ├── constants.ts          Canvas size, table geometry, palette
│   │   ├── audio/
│   │   │   └── SoundManager.ts   Howler.js + procedural WAV synthesis
│   │   ├── network/
│   │   │   ├── SocketManager.ts  Socket.IO client singleton
│   │   │   └── ApiClient.ts      REST wrapper (checkout, AI, daily bonus)
│   │   └── scenes/
│   │       ├── BootScene.ts      Programmatic card/chip texture generation
│   │       ├── LobbyScene.ts     Create / Join / Demo / Chip Store
│   │       ├── GameScene.ts      Table, seats, cards, action panel, AI, sidebar
│   │       ├── ResultScene.ts    Showdown overlay with card reveal + chip tween
│   │       └── ChipStoreScene.ts Phaser overlay — bundle cards, daily bonus
│   └── vite.config.ts
│
├── server/                       Node.js + Express + Socket.IO  (port 3001)
│   └── src/
│       ├── index.ts              Express app, Socket.IO server, route mounting
│       ├── config.ts             dotenv config with typed keys
│       ├── auth/
│       │   ├── jwt.ts            sign / verify JWT
│       │   └── middleware.ts     requireAuth Express middleware
│       ├── game/
│       │   ├── GameController.ts Hand lifecycle, timer, action history (EventEmitter)
│       │   ├── RoomManager.ts    Room CRUD, spectator support, creditChips
│       │   ├── BotManager.ts     AI bot logic — random valid actions every 2 s
│       │   └── roomManagerInstance.ts  Singleton export
│       ├── handlers/
│       │   └── socketHandlers.ts All socket event handlers, per-socket hole card privacy
│       ├── payments/
│       │   ├── chipBundles.ts    Bundle definitions + free-tier constants
│       │   └── stripeClient.ts   Stripe singleton
│       ├── routes/
│       │   ├── checkout.ts       POST /api/checkout
│       │   ├── webhooks.ts       POST /api/webhooks/stripe
│       │   ├── ai.ts             POST /api/ai/analyze  (JWT + rate limit)
│       │   └── dailyBonus.ts     POST /api/daily-bonus (JWT)
│       ├── session/
│       │   └── PlayerSession.ts  In-memory player state (chips, tier, stats)
│       └── store/
│           └── SessionStore.ts   Cross-room state — tier, pending chips, AI quotas
│
└── shared/                       Built to dist/, resolved directly by Vite in dev
    └── src/
        ├── index.ts
        ├── types.ts              All shared TypeScript types + Socket.IO event maps
        ├── deck.ts               52-card Deck with Fisher-Yates shuffle
        ├── handEvaluator.ts      9-rank hand evaluator, bestHandFromSeven
        ├── bettingEngine.ts      validateAction, applyAction, calculateSidePots
        ├── blindManager.ts       postBlinds, rotateDealer
        └── __tests__/
            └── handEvaluator.test.ts   22 Vitest tests covering all 9 ranks
```

**Key design choices:**
- Game logic lives *exclusively* on the server (`GameController`); the client is a pure renderer.
- Hole cards are filtered per-socket — each player only receives their own cards.
- `SessionStore` holds cross-room state (tier, pending chip credits, AI rate limits) so Stripe webhooks can credit chips even when a player isn't in a room.
- Bots are pure server-side: `BotManager` calls `controller.applyAction()` on a 2 s interval with random valid actions.

---

## How to Run Locally

**Prerequisites:** Node.js 20+, pnpm 9+

```bash
# 1. Clone and install all workspace deps
git clone https://github.com/your-username/texas-holdem.git
cd texas-holdem
pnpm install

# 2. Copy and configure environment
cp server/.env.example server/.env
# Open server/.env and fill in your keys (game runs without Stripe/Anthropic — features are disabled)

# 3. Start both dev servers concurrently
pnpm dev
# → client: http://localhost:5173
# → server: http://localhost:3001

# 4. Click "🎮 DEMO MODE" for instant solo play with AI bots
```

### Optional: Stripe local testing
```bash
# Install Stripe CLI (brew install stripe/stripe-cli/stripe)
stripe listen --forward-to localhost:3001/api/webhooks/stripe
# Paste the printed webhook secret into server/.env as STRIPE_WEBHOOK_SECRET
```

### All pnpm commands
```bash
pnpm dev          # start client (5173) + server (3001) concurrently
pnpm build        # shared → server → client production build
pnpm typecheck    # tsc --noEmit across all packages
pnpm test         # vitest — 22 unit tests for hand evaluator
pnpm lint         # eslint flat config
pnpm format       # prettier --write
```

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `3001` | Server HTTP port |
| `CLIENT_ORIGIN` | No | `http://localhost:5173` | CORS allowed origin |
| `JWT_SECRET` | **Yes (prod)** | dev fallback | Signing key ≥32 chars |
| `JWT_EXPIRY` | No | `7d` | Token lifetime (ms/s/m/h/d) |
| `SMALL_BLIND` | No | `50` | Small blind chips |
| `BIG_BLIND` | No | `100` | Big blind chips |
| `STARTING_CHIPS` | No | `500` | Free-tier starting chips |
| `ACTION_TIMEOUT_SECS` | No | `30` | Auto-fold countdown |
| `SHOWDOWN_DELAY_MS` | No | `5000` | Delay before next hand |
| `STRIPE_SECRET_KEY` | No | — | `sk_test_...` from Stripe dashboard |
| `STRIPE_WEBHOOK_SECRET` | No | — | `whsec_...` from Stripe CLI or dashboard |
| `ANTHROPIC_API_KEY` | No | — | `sk-ant-...` from console.anthropic.com |

---

## Chip Bundles

| Bundle | Chips | Price | Type |
|---|---|---|---|
| Starter Pack | 1,000 | $0.99 | One-time |
| High Roller | 5,000 | $3.99 | One-time |
| Whale Pack | 20,000 | $12.99 | One-time |
| VIP Monthly | 5,000/mo + VIP perks | $4.99/mo | Subscription |

**VIP perks:** Unlimited AI queries (free tier: 3 per session), VIP badge, custom avatar frame.  
**Daily Bonus:** 200 free chips, claimable once per 24 hours via the Chip Store.

---

## AI Odds Assistant

- Powered by Anthropic `claude-sonnet-4-6` (structured JSON output via `messages.parse`)
- Appears as "🤖 Ask AI" button during your turn
- Returns: win probability gauge, pot odds, fold/call/raise recommendation, reasoning, confidence level
- Rate limited: 1 request per 5 seconds per player
- Free tier: 3 queries per session — upgrade to VIP for unlimited

---

## License

MIT © 2026
