# Mockups

Drop UI mockup images here (PNG/JPG) — one per screen is ideal, named by screen:

- `home.png` — main menu / lobby
- `table.png` — in-game poker table
- `wheel.png` — spin-the-wheel
- `shop.png` — coin shop
- `result.png` — showdown / win popup

Anything detailed and illustrated (character art, a logo) is best supplied as its
own transparent **PNG/SVG** in this folder — those get loaded as-is for a faithful
match, while panels, buttons, the table, cards, chips and the wheel are drawn
procedurally in `client/src/gfx/` to match the mockup.

The game canvas is currently **1280×720 (landscape)**. If the mockups are portrait
(phone), say so — the whole layout/canvas will switch to portrait.
