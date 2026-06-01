/**
 * theme.ts — single source of truth for look & layout.
 *
 * Poke'friends is a cartoon poker game. It supports BOTH orientations:
 *  • phones / narrow windows  → PORTRAIT  720×1280
 *  • laptops / wide windows   → LANDSCAPE 1280×760
 * The orientation is decided once at load from the window aspect ratio. Every
 * scene reads positions from `LAYOUT` (below) so the two layouts share code.
 * Everything is drawn procedurally (no image files).
 */
import type Phaser from 'phaser';

// ─── Brand ───────────────────────────────────────────────────────────────────
export const BRAND = "POKE'FRIENDS";

// ─── Orientation ─────────────────────────────────────────────────────────────
export const LANDSCAPE =
  typeof window !== 'undefined' && window.innerWidth > window.innerHeight * 1.15;

// ─── Canvas ──────────────────────────────────────────────────────────────────
export const W = LANDSCAPE ? 1280 : 720;
export const H = LANDSCAPE ? 760 : 1280;

// ─── Table geometry (ellipse) ────────────────────────────────────────────────
export const TABLE_CX = W / 2;
export const TABLE_CY = LANDSCAPE ? 312 : 468;
export const TABLE_RX = LANDSCAPE ? 540 : 338;
export const TABLE_RY = LANDSCAPE ? 232 : 360;
export const RAIL = 30;

// Seat ellipse — avatars sit on the felt just inside the rail.
export const SEAT_RX = TABLE_RX - (LANDSCAPE ? 54 : 52);
export const SEAT_RY = TABLE_RY - (LANDSCAPE ? 26 : 60);

// 9 seats; index 0 is the local player at the bottom. Fill ORDER alternates
// around the table (top-left, top-right, sides, corners…) so small player
// counts stay balanced instead of clustering on one side.
export const SEAT_ANGLES_DEG = LANDSCAPE
  ? [90, 250, 290, 215, 325, 180, 0, 150, 30]
  : [90, 250, 290, 210, 330, 165, 15, 140, 40];

// ─── Cards ───────────────────────────────────────────────────────────────────
export const CARD_W = 62;
export const CARD_H = 87;
export const HOLE_W = LANDSCAPE ? 64 : 76;
export const HOLE_H = LANDSCAPE ? 90 : 106;

// ─── Avatars ─────────────────────────────────────────────────────────────────
export const AVATAR_R = 38;
export const AVATAR_COUNT = 8;

/**
 * Named screen positions for the table HUD + action bar. Defined per orientation
 * so GameScene never hard-codes a coordinate.
 */
export const LAYOUT = LANDSCAPE
  ? {
      potY: 214,
      hudX: 245, hudY: 56, hudW: 270,
      heroCardsY: 616,
      panelCx: W / 2, panelY: 708, panelW: 860, panelH: 104,
      sliderY: 672, sliderMinX: W / 2 - 200, sliderMaxX: W / 2 + 200,
      btnY: 720, btnW: 220, btnH: 60, btnFont: 26,
      foldX: W / 2 - 250, callX: W / 2, raiseX: W / 2 + 250,
      aiX: 110, aiY: 720, aiW: 150,
    }
  : {
      potY: 372,
      hudX: TABLE_CX, hudY: 884, hudW: 300,
      heroCardsY: 686,
      panelCx: W / 2, panelY: 1150, panelW: W - 24, panelH: 280,
      sliderY: 1098, sliderMinX: 150, sliderMaxX: 570,
      btnY: 1196, btnW: 212, btnH: 86, btnFont: 30,
      foldX: 126, callX: 360, raiseX: 594,
      aiX: W / 2, aiY: 1040, aiW: 220,
    };

// ─── Warm "Poke'friends" palette ─────────────────────────────────────────────
export const COL = {
  bgTop: 0x6e2f17, bgBot: 0x24100a, bgGlow: 0x9a542a,
  felt: 0x7c2330, feltDark: 0x5a1622, feltEdge: 0x3a0c14, feltLine: 0xcaa45a,
  wood: 0x6f3a1b, woodHi: 0x9a5a2c, woodDark: 0x44230f,
  gold: 0xe8b24a, goldHi: 0xffe39a, goldDark: 0xa6731d,
  coin: 0xf2c64a, coinRim: 0xc8901a, coinDark: 0x8a5a12,
  green: 0x52a23f, greenDark: 0x2c6622,
  red: 0xc62a2b, redDark: 0x7e1417,
  blue: 0x2f74c4, blueDark: 0x1a4d88,
  purple: 0x8a45c2, purpleDark: 0x5a2a88,
  orange: 0xe0982f, orangeDark: 0xa86414,
  cream: 0xfff3df, ink: 0x2a1206, inkSoft: 0x4a2a16,
  cardWhite: 0xfbf6ec, cardRed: 0xc62a2b, cardBlack: 0x2a2233,
  cardBackA: 0x2f6fb0, cardBackB: 0x1a3f78,
  panel: 0x4a2412, panelHi: 0x6a3a1e, panelEdge: 0x2e1509,
  white: 0xffffff, black: 0x000000,
} as const;

/** '#rrggbb' string from a 0xRRGGBB number. */
export function css(n: number): string {
  return `#${(n & 0xffffff).toString(16).padStart(6, '0')}`;
}

// ─── Fonts ───────────────────────────────────────────────────────────────────
export const FONT = '"Arial Rounded MT Bold", "Trebuchet MS", "Segoe UI", system-ui, sans-serif';

/** Cartoon text style: thick dark outline + soft drop shadow. */
export function gameText(
  size: number,
  fill: string = css(COL.cream),
  opts: { stroke?: string; strokeThickness?: number; shadow?: boolean } = {},
): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: FONT,
    fontSize: `${size}px`,
    color: fill,
    fontStyle: 'bold',
    stroke: opts.stroke ?? css(COL.ink),
    strokeThickness: opts.strokeThickness ?? Math.max(3, Math.round(size / 6)),
    shadow: opts.shadow === false
      ? undefined
      : { offsetX: 0, offsetY: 2, color: 'rgba(0,0,0,0.4)', blur: 4, fill: true },
  };
}
