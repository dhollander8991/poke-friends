# Deploying Poke'friends

The app is two pieces with different hosting needs:

| Piece | What it is | Where it goes |
|---|---|---|
| **client/** | Static Vite/Phaser bundle | **Vercel** (CDN, free) |
| **server/** | Express + **Socket.IO**, holds live rooms in memory | **Render** (always-on container, free tier) |

> Why not all-Vercel? Vercel functions are serverless/short-lived and can't hold
> the persistent WebSocket connections + in-memory game state the server needs.
> So the always-on server runs on Render; the static client runs on Vercel.

Everything below assumes the repo is already on GitHub (see "Git" at the bottom).

---

## 1. Server → Render (do this first, you need its URL for the client)

1. Render dashboard → **New → Blueprint** → connect this GitHub repo.
   Render reads **`render.yaml`** and **`Dockerfile`** automatically.
2. It sets `JWT_SECRET` for you. Leave `CLIENT_ORIGIN` blank for now (set in step 3).
   Optionally fill `ANTHROPIC_API_KEY` (AI assistant), `STRIPE_SECRET_KEY` (shop).
3. Deploy. Copy the service URL, e.g. `https://pokefriends-server.onrender.com`.
4. Verify: open `https://pokefriends-server.onrender.com/health` → `{"ok":true,...}`.

> Free tier sleeps after ~15 min idle; first request then takes ~30s to wake.
> Fine for testing; upgrade to the $7 plan for always-on.

## 2. Client → Vercel

1. Vercel → **Add New → Project** → import this GitHub repo.
2. Vercel reads **`vercel.json`** (build command, output dir, SPA rewrite). Leave
   framework as "Other".
3. **Environment Variables** → add:
   - `VITE_SERVER_URL = https://pokefriends-server.onrender.com`  (your step‑1 URL)
   - *(optional)* `VITE_GOOGLE_CLIENT_ID`, `VITE_FACEBOOK_APP_ID`
4. Deploy. Copy the URL, e.g. `https://poke-friends.vercel.app`.

## 3. Close the CORS loop

Back in **Render → your service → Environment**, set:

```
CLIENT_ORIGIN = https://poke-friends.vercel.app
```

(Comma-separate if you have several, e.g. a custom domain too. The server also
auto-allows this project's `*.vercel.app` preview deploys.) Save → it redeploys.

Done — open the Vercel URL and play. Demo mode (PLAY NOW) needs no keys.

---

## Mobile app (optional, later)

The same web build wraps into iOS/Android via Capacitor — see `mobile/README.md`.
Point `VITE_SERVER_URL` at the Render URL before building the native app.

---

## Git (one-time)

```bash
# from repo root
git init && git add -A && git commit -m "Initial commit: Poke'friends"
git branch -M main
gh repo create poke-friends --private --source=. --remote=origin --push
# …or, without the gh CLI:
#   create an empty repo on github.com, then:
# git remote add origin git@github.com:<you>/poke-friends.git && git push -u origin main
```

## Local dev (unchanged)

```bash
pnpm install
pnpm dev      # client :5173  +  server :3001
```
