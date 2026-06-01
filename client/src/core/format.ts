/** Number / colour formatting helpers shared across scenes. */

/** 1234 -> "1,234"; small helper kept for readability. */
export function commas(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

/** 1500 -> "1.5K", 2_400_000 -> "2.4M" — the casual-game coin style. */
export function abbrev(n: number): string {
  const abs = Math.abs(n);
  if (abs < 1000) return String(Math.round(n));
  if (abs < 1_000_000) return trim(n / 1000) + 'K';
  if (abs < 1_000_000_000) return trim(n / 1_000_000) + 'M';
  return trim(n / 1_000_000_000) + 'B';
}

function trim(v: number): string {
  // one decimal, but drop a trailing ".0"
  const s = v.toFixed(1);
  return s.endsWith('.0') ? s.slice(0, -2) : s;
}

/** Blend two 0xRRGGBB colours; t=0 -> a, t=1 -> b. */
export function mix(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

/** Lighten toward white by amount 0..1. */
export function lighten(c: number, amt: number): number {
  return mix(c, 0xffffff, amt);
}

/** Darken toward black by amount 0..1. */
export function darken(c: number, amt: number): number {
  return mix(c, 0x000000, amt);
}

/** '#rrggbb' / 'rgba()' helper for canvas contexts. */
export function rgba(c: number, a = 1): string {
  const r = (c >> 16) & 0xff, g = (c >> 8) & 0xff, b = c & 0xff;
  return `rgba(${r},${g},${b},${a})`;
}
