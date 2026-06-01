# Mockup Rebuild Spec (read this first)

Goal: rebuild the poker client **pixel-faithfully** to the mockups in this folder.
Everything is procedural (`client/src/gfx/`, `theme.ts`) — no image files except possibly
avatar headshots (see note). Orientation is **PORTRAIT mobile** (mockups are phone UIs).
Suggested canvas: **W=720, H=1280** (9:16), `Phaser.Scale.FIT`.

Tools staged in `mockups/`:
- `node mockups/analyze.cjs <file>` → palette + luminance/hue ASCII maps (read a screen as text).
  Env: `COLS=40 NOHUE=1` for a compact version.
- `node mockups/sample.cjs <file>` → average hex at named points (felt/rail/buttons…).
- `.thumbs/` has downscaled copies (m1=storyboard, m2=2e1cb351, m3=588cfbe8, m4=ebcecbdb, m5=ff2e76cb).

## Files
- `2e1cb351…png` — **standalone TABLE** (warm). The most detailed single screen.
- `588cfbe8…png` — **"TITAN POKER"** 3-up: Active Gameplay · Main Menu · Spin Wheel.
- `ebcecbdb…png` & `ff2e76cb…png` — **"POKER ROYALE"** 3-up: Table · Main Menu · Spin Wheel (premium gold).
- `A_professional_storyboard…png` — 6336×2688, 4×2 grid of 8 frames (combined storyboard). View with analyze.cjs or crop into 8.

## DESIGN DIRECTION — confirm with the user
Two directions are present. **Ask which to follow** (or blend):
- **TITAN POKER** — warm brown wood, *colored candy* menu buttons (red/blue/gold/green/purple), red ribbon logo.
- **POKER ROYALE** — premium, ornate, casino-hall background, **all-gold** pill buttons, fancy gold fortune wheel. (Richest look.)
Both share: portrait, maroon/red felt oval table, wood+gold rail, round avatar portraits, gold trim everywhere.

## SCREENS

### Table (from 2e1cb351 — warm)
- Header: left hamburger (gold-bordered rounded-square icon button); center title "NL HOLD'EM $100/$200" with "LVL 12" + a gold XP progress bar under it; right settings gear (same button style).
- Table: horizontal **oval**, **deep maroon/red felt** (~#7a2230 with darker vignette), thick **wood rail** (~#6e3a1c) + **gold inner trim** (~#e8b24a) + subtle "POKER ROYALE/title" arc text on felt.
- Seats: round **portrait avatars** with a **warm gold ring** (#caa46a), name + chips as plain text below (e.g. "John 4,50K"). ~8 opponents around the oval + **You** bottom-center. Small round **dealer button "D"**.
- Center: **POT** value in a gold-stroked rounded pill; 5 community cards (white rounded) with **FLOP / TURN** labels above; chip stacks beside pot.
- Bottom: "Balance: 124,500 Gold Coins" pill; a **chip-denomination selector** (row of colored chips with ◀ ▶ arrows); then the action row.
- Action buttons (big, beveled, thick gold/ink outline): **FOLD red #a41116**, **CALL <amt> green #5b995a** (or CHECK **blue #1b5da7**), **RAISE gold #d99a3a** with a **bet slider** ("2400 … 10K").

### Main Menu (TITAN POKER / POKER ROYALE)
- Top bar: profile avatar + name + **coin balance** ("$1,500,400") + **gem** count ("320") with green "+".
- Big carved **logo** (wood plaque, gold letters): "TITAN POKER" or "POKER ROYALE".
- Vertical stack of large pill buttons:
  - TITAN: PLAY NOW (red) · TOURNAMENTS (blue) · DAILY SPIN (gold, "1" badge) · SHOP (green) · FRIENDS (purple).
  - ROYALE: PLAY NOW ("$20k Buy-in") · TOURNAMENTS · SIT & GO · PROFILE · SETTINGS — all **gold**.
- Decorations: gold coin piles + fanned cards (A♠ A♥ K) at the bottom.

### Spin Wheel
- Banner "DAILY BONUS SPIN" with stars; "NEXT FREE SPIN 14:32:01" countdown.
- Top: coin balance + gems.
- **Segmented fortune wheel**: wedges show coin/gem amounts (50, 100, 10K, 50K, 250K, 2.5M, 5M, 10M, MYSTERY, trophy, lightning). Pointer at top. Gold rim with bulbs.
  - TITAN wheel: flat candy colors. ROYALE wheel: ornate gold frame, perspective, center hub with ▶, on a stand, casino-hall bg + hanging lamps.
- Big button: TITAN "« SPIN »" (red) / ROYALE "SPIN!" (gold).

### Shop (referenced by menu; design from same language)
Grid of coin packages (coin pile art + amount + price), gold framing.

## EXACT COLOUR SAMPLES (avg hex at points; re-run sample.cjs for more)
TABLE 2e1cb351:  bg #5b210f · header #643f2d · rail #715347 · avatar_ring #ca8c6f ·
  FOLD #a41116 · CALL/CHECK #1b5da7(blue) / #5b995a(green) · RAISE ~#d99a3a(gold) · namepill #815c4b
TITAN 588cfbe8:  bg #241410 · logo/header gold #895e29 · felt #864f59 · CHECK #667b37(olive-green) · btns vary
ROYALE ebcecbdb: bg navy #181c27 · rail gold #986f57 · felt #6f2e21 · buttons all dark-gold; card backs blue #6c98ae
ROYALE ff2e76cb: very gold — header #835529 · rail #80542e · pot #c49e53 · lots of #9b6f3b/#b68943 gold

## NOTE on avatars
The mockup avatars are **photoreal human headshots** in gold rings. Procedural reproduction
will be **stylized cartoon portraits** in matching gold rings (closest faithful option without
image assets). If the user wants true headshots, they should drop a set of portrait PNGs in
`client/public/avatars/` and we load them.

## Build/verify (this environment)
Do NOT `node node_modules/.bin/tsc` (broken shim → false pass). Use `pnpm --filter client build`
/ `pnpm --filter <pkg> typecheck`. Server imports `shared/dist` → build shared first.
