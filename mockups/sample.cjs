/* Average colour of small patches at normalized (x,y) points — to pull exact
 * hexes (felt, rail, buttons…) from a mockup. Usage: node sample.cjs <file> */
const sharp = require('sharp');
const file = process.argv[2];
const PTS = {
  bg_corner: [0.04, 0.5], header: [0.5, 0.06], felt: [0.5, 0.44], felt2: [0.62, 0.5],
  rail: [0.5, 0.27], gold_trim: [0.5, 0.30], pot_pill: [0.5, 0.41],
  namepill: [0.17, 0.31], avatar_ring: [0.5, 0.18],
  btn_fold: [0.24, 0.93], btn_check: [0.5, 0.93], btn_raise: [0.78, 0.93],
  card_white: [0.5, 0.47],
};
(async () => {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: ch } = info;
  const hex = (r, g, b) => '#' + [r, g, b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
  const patch = (nx, ny) => {
    const cx = Math.round(nx * W), cy = Math.round(ny * H), R = Math.round(W * 0.015);
    let r = 0, g = 0, b = 0, n = 0;
    for (let y = cy - R; y <= cy + R; y++) for (let x = cx - R; x <= cx + R; x++) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const i = (y * W + x) * ch; r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
    }
    return hex(r / n, g / n, b / n);
  };
  console.log('SAMPLES ' + file.split('/').pop());
  for (const [k, [x, y]] of Object.entries(PTS)) console.log(`  ${k.padEnd(12)} ${patch(x, y)}`);
})();
