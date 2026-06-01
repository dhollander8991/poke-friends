/* Analyze mockups WITHOUT needing to view them: prints dimensions, a dominant
 * colour palette, and low-res luminance + hue ASCII maps so the structure/layout
 * can be read as text. Usage: node mockups/analyze.cjs <file...> */
const sharp = require('sharp');

const LUM = ' .:-=+*#%@'; // dark -> light
function hueLetter(r, g, b) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2 / 255;
  if (max - min < 24) return l > 0.8 ? 'W' : l > 0.55 ? 'w' : l > 0.28 ? 'k' : 'K'; // grey ramp
  let h;
  const d = max - min;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60; if (h < 0) h += 360;
  if (h < 20 || h >= 330) return 'R';
  if (h < 45) return 'O';
  if (h < 70) return 'Y';
  if (h < 160) return 'G';
  if (h < 200) return 'C';
  if (h < 255) return 'B';
  if (h < 290) return 'P';
  return 'M';
}
const hex = (r, g, b) => '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');

(async () => {
  for (const file of process.argv.slice(2)) {
    const meta = await sharp(file).metadata();
    const COLS = parseInt(process.env.COLS || '76', 10);
    const ROWS = Math.max(8, Math.round(COLS * (meta.height / meta.width) * 0.5));
    const { data, info } = await sharp(file).resize(COLS, ROWS, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const ch = info.channels;

    // palette via coarse 4-bit-per-channel quantization
    const buckets = new Map();
    for (let i = 0; i < data.length; i += ch) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
      const e = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0 };
      e.n++; e.r += r; e.g += g; e.b += b; buckets.set(key, e);
    }
    const total = COLS * ROWS;
    const pal = [...buckets.values()].map(e => ({ pct: e.n / total, hex: hex(Math.round(e.r / e.n), Math.round(e.g / e.n), Math.round(e.b / e.n)) }))
      .sort((a, b) => b.pct - a.pct).slice(0, 12);

    console.log('\n========================================================');
    console.log(`FILE: ${file.split('/').pop()}`);
    console.log(`SIZE: ${meta.width}x${meta.height}  (grid ${COLS}x${ROWS})`);
    console.log('PALETTE: ' + pal.map(p => `${p.hex}:${(p.pct * 100).toFixed(0)}%`).join('  '));
    console.log('--- LUMINANCE (dark→light: " .:-=+*#%@") ---');
    let lum = '', hue = '';
    for (let y = 0; y < ROWS; y++) {
      let lrow = '', hrow = '';
      for (let x = 0; x < COLS; x++) {
        const i = (y * COLS + x) * ch;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const l = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        lrow += LUM[Math.min(LUM.length - 1, Math.floor(l * LUM.length))];
        hrow += hueLetter(r, g, b);
      }
      lum += lrow + '\n'; hue += hrow + '\n';
    }
    console.log(lum);
    if (!process.env.NOHUE) {
      console.log('--- HUE MAP (R O Y G C B P M=magenta, W/w/k/K=grey ramp) ---');
      console.log(hue);
    }
  }
})();
