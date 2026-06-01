# Texas Hold'em — Architecture Decisions

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend renderer | **Phaser 3** (not 4) | Stable API; Phaser 4 is still alpha with breaking changes |
| Real-time comms | **Socket.IO** | WS with fallbacks, built-in room/namespace support |
| Auth | **JWT** | Stateless tokens; fits distributed Node.js deployment |
| Payments | **Stripe** | Industry standard; first-class Node SDK |
| AI odds assistant | **`claude-sonnet-4-6`** | Best reasoning-to-cost ratio for real-time poker advice; structured-output JSON (`messages.parse`) |
| Primary DB | **PostgreSQL** | Relational model suits player/hand/ledger schema |
| Cache / pub-sub | **Redis** | Session store, leaderboard sorted sets, Socket.IO adapter |
| Package manager | **pnpm workspaces** | Efficient hoisting, symlinked workspace deps |

## Monorepo Layout

```
texas-holdem/
├── client/     # Phaser 3 + Vite + TypeScript  (port 5173)
├── server/     # Node.js + Express + Socket.IO  (port 3001)
└── shared/     # Shared types + game logic      (built to dist/)
```

Shared package name: `@texas-holdem/shared`

### Client structure (cartoon redesign — "POKER ROYALE")

The client is a fully self-generated cartoon poker game (Coin Master / Zynga style),
rebuilt **pixel-faithfully to the mockups in `mockups/`**: a **PORTRAIT** phone UI
(canvas **720×1280**, `Phaser.Scale.FIT`) with a warm casino look — maroon felt **oval**
table, wood+gold rail, round portrait avatars in gold rings, and big colored action
buttons (FOLD red / CALL green / CHECK blue / RAISE gold). All palette/geometry live in
`theme.ts` (`COL`, sampled from the mockups). **No image files**; every texture is drawn
procedurally at boot. `mockups/SPEC.md` is the source-of-truth design spec; `mockups/analyze.cjs`
+ `sample.cjs` read mockups/screenshots as text (palette / ASCII / point samples) for QA.

```
client/src/
├── theme.ts            # single source of truth: palette (COL), layout, fonts, gameText()
├── core/               # format.ts (abbrev/commas/colour math) · Wallet.ts (coin balance)
├── gfx/                # procedural texture factory (canvas → Phaser textures)
│   ├── draw.ts         # canvas primitives (roundRect, gloss, gradients, star…)
│   ├── table.ts cards.ts chips.ts avatars.ts wheel.ts backdrop.ts ui.ts
│   └── index.ts        # buildArt(scene) → ordered ArtStep[] (drives boot progress)
├── ui/                 # CartoonButton · CoinCounter · Panel · Toast (reusable widgets)
├── network/            # SocketManager · ApiClient (REST: guest auth, wheel, daily, AI)
├── audio/SoundManager.ts  # procedural WAV SFX (click, coin, win, tick, shuffle…)
└── scenes/             # Boot → Home → Game · overlays: Wheel / Shop / Settings / Result
```

- Brand name lives in `theme.ts` `BRAND` ("POKE'FRIENDS").
- **Orientation**: `theme.ts` picks `LANDSCAPE` from window aspect at load → canvas is **720×1280 (portrait)** on phones or **1280×760 (landscape)** on desktop. All table/home positions read from `theme.ts` `LAYOUT` (per-orientation) so scenes never hard-code coords. Overlay scenes (Wheel/Shop/Settings/Result) are authored in a fixed **720×1280 design space** (`OW`/`OH` from `ui/Panel.ts`) and `frameOverlay(scene)` zooms the scene camera to fit + centre (portrait → zoom 1, identical). Use `addDim()` for the dismiss backdrop so it covers the letterbox.
- In-game **⚙ menu** (top-left of the table) opens Sound/Resume/Leave. The old gear that only toggled mute with no visible change is gone. The **🤖 ASK AI** assistant is a labelled button shown whenever you hold live cards (not only on your exact turn).
- **Overlays** (Wheel/Shop/Settings) are launched on top via `HomeScene.openOverlay()`, which **disables the parent scene's input** (not `scene.pause`) and re-enables it on the overlay's `shutdown`. Each overlay ignores its dismiss tap for the first 300ms (`ready` guard) so the pointer-release that opened it can't instantly close it. Don't reintroduce pause/resume here — it caused stuck/unclickable menu buttons.
- **Avatars**: presets `avatar_0..7` generated at boot; a player can upload a photo → stored as a downscaled data URL in `localStorage` and turned into `avatar_custom` via `gfx/avatars.ts#loadCustomAvatar`. Use `Wallet.getAvatarKey()` + `resolveAvatar(scene, key)` (falls back to a preset if the custom texture isn't loaded yet).
- **Social login** (optional): `network/social.ts` (Google Identity Services / Facebook SDK) → server `POST /auth/social` verifies the token via the provider's userinfo endpoint and returns our JWT keyed by a stable `g_<sub>`/`f_<id>` playerId. Enabled only when `VITE_GOOGLE_CLIENT_ID` / `VITE_FACEBOOK_APP_ID` are set (see `client/.env.example`).
- **Mobile app**: Capacitor wraps `client/dist` (`capacitor.config.ts`, `mobile/README.md`, `pnpm cap:sync|cap:ios|cap:android`). Phaser is WebGL, so Capacitor (web wrapper) is used rather than React Native (which would require a full rewrite).

## Dev Workflow

```bash
pnpm install        # install all workspace deps
pnpm dev            # start client (5173) + server (3001) concurrently
pnpm build          # build shared → server → client in order
pnpm typecheck      # tsc --noEmit across all packages
pnpm lint           # eslint flat config
pnpm format         # prettier --write
```

Vite resolves `@texas-holdem/shared` directly to `shared/src/index.ts` during development so no build step is required for the shared package **on the client**. The **server** imports the built `shared/dist`, so run `pnpm --filter @texas-holdem/shared build` after editing `shared/` (it's also the first step of `pnpm build`).

## Key Conventions

- Server uses `tsx watch` in dev; compiles to `dist/` for production.
- ESLint flat config (`eslint.config.mjs`) + Prettier enforced at root.
- All Socket.IO event types are defined in `shared/src/types.ts` (`ServerToClientEvents`, `ClientToServerEvents`).
- Game logic lives exclusively in `server/src/game/GameController.ts` (hand lifecycle, betting, side pots, showdown); the client is a pure renderer. `GameRoom.ts`/`roomHandlers.ts` are empty stubs.
- Hole cards are filtered **per socket** in `handlers/socketHandlers.ts#buildState` — each player only receives their own cards (opponents’ are revealed only at showdown).
- **Art**: all visuals are generated in `gfx/` and registered in `BootScene` via `buildArt()`. Add a new texture by writing a generator that uses `withCanvas()` and listing it in `gfx/index.ts`. Colours come from `theme.ts` `COL`; never hard-code hex in scenes.
- **Currency**: `core/Wallet.ts` is the client coin balance shown in the menu (localStorage, `onCoins()` pub/sub). Server-authoritative rewards (wheel, daily bonus, Stripe) credit `SessionStore` pending chips that drain into the table on join — the menu wallet mirrors them for instant feedback.
- **Spin wheel**: wedges + cooldown live in `shared/src/rewards.ts` so client and server agree. The server (`POST /api/wheel/spin`) decides the winning index; `WheelScene` animates the wheel to land on it (falls back to a local weighted pick when offline).
- `room:create/join/demo` reuse the JWT `playerId` (`socket.data.jwt`) when present, so coins earned in the menu carry into the game.
