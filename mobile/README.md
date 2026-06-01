# Poke'friends — Mobile App

The game already runs great in mobile browsers (responsive portrait layout). To
ship it to the **App Store / Play Store** we wrap the exact same web build in a
native shell with **[Capacitor](https://capacitorjs.com/)**.

## Why Capacitor (not React Native)?

The game is a **Phaser 3 / WebGL** canvas app. React Native renders native views,
not a WebGL canvas, so going RN would mean **rewriting the entire game** in a
different engine. Capacitor instead packages the built web app (`client/dist`)
into a native WebView container, so:

- 100% of the game code is reused — one codebase for web, iOS and Android.
- Native APIs (push, in-app purchase, haptics, share) are available via plugins.
- Releases stay in sync with the web version automatically.

## One-time setup

```bash
# 1. install deps (adds the Capacitor packages declared in package.json)
pnpm install

# 2. build the web client and add the native platforms
pnpm --filter client build
npx cap add ios        # needs Xcode (macOS)
npx cap add android    # needs Android Studio + JDK
```

`capacitor.config.ts` (repo root) already sets the app id `com.pokefriends.app`,
name `Poke'friends`, and `webDir: client/dist`.

> Point the app at your deployed server: set `VITE_SERVER_URL=https://your-server`
> in `client/.env` **before** building, so the bundled app talks to production.

## Daily workflow

```bash
pnpm cap:sync       # rebuild client + copy into native projects
pnpm cap:ios        # open Xcode  → Run on simulator/device
pnpm cap:android    # open Android Studio → Run
```

### Live reload (optional)

```bash
# serve the dev build on your LAN, then point the native app at it
CAP_SERVER_URL=http://<your-computer-LAN-ip>:5173 pnpm cap:sync
pnpm --filter client dev -- --host
```

## Recommended native plugins (later)

| Need | Plugin |
|---|---|
| Splash / status bar | `@capacitor/splash-screen`, `@capacitor/status-bar` |
| Haptics on actions | `@capacitor/haptics` |
| Invite friends | `@capacitor/share` |
| Push notifications | `@capacitor/push-notifications` |
| Real-money IAP | `@capacitor-community/in-app-purchases` (replaces Stripe in stores) |
| Native Google/FB login | `@codetrix-studio/capacitor-google-auth`, `@capacitor-community/facebook-login` |

The current web Google/Facebook login (`client/src/network/social.ts`) works in
the WebView too; swap to the native plugins later for a smoother UX.
