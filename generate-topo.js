/**
 * generate-topo.js
 * Run once:  node generate-topo.js
 * Outputs:   topo.svg  — a 1440×1440 square tile of topographic contour lines.
 *
 * The height field uses only integer multiples of 2π for the y-frequency so
 * field(x, 0) === field(x, 1) exactly → the tile loops seamlessly vertically.
 */

const fs   = require('fs');
const path = require('path');

const W      = 1440;   // tile width  (px)
const H      = 7200;   // tile height (px) — 5× width so seam is barely ever seen
const STEP   = 9;      // marching-squares grid cell size — smaller = smoother lines
const LEVELS = 18;     // more bands per feature = visible concentric rings = reads as topo
const MAJOR  = 5;      // every Nth level is heavier ("index contour")
const TAU    = 2 * Math.PI;

// ── Height field ──────────────────────────────────────────────────────────────
// Domain-warped field: warp only x (not y) so the tile stays seamlessly
// periodic vertically. Medium base frequencies give clear hill/ridge shapes;
// the warp distorts them organically so they don't look like a grid.
function field(nx, ny) {
  // X warp — integer × TAU for ny keeps tile seamless
  const wpx = nx
    + Math.sin(nx * 2.5 + ny * TAU * 2 + 0.7) * 0.26
    + Math.sin(nx * 4.1 - ny * TAU * 3 + 1.9) * 0.12;

  return (
    Math.sin(wpx * 10.4 + ny * TAU * 4 + 0.4)  * 1.00 +   // primary hills
    Math.sin(wpx *  7.8 - ny * TAU * 4 + 2.3)  * 0.70 +   // secondary
    Math.sin(wpx * 15.6 + ny * TAU * 6 + 1.6)  * 0.35 +   // mid detail
    Math.sin(wpx * 12.3 - ny * TAU * 5 + 0.8)  * 0.22     // fine detail
  );
}

// ── Sample grid ───────────────────────────────────────────────────────────────
const cols = Math.ceil(W / STEP) + 2;
const rows = Math.ceil(H / STEP) + 2;
const g    = new Float32Array(cols * rows);
let lo = Infinity, hi = -Infinity;

for (let r = 0; r < rows; r++) {
  for (let c = 0; c < cols; c++) {
    // Map pixel coords directly to [0,1] so ny=1.0 is hit exactly at y=H,
    // guaranteeing the bottom of the tile matches the top of the next repeat.
    const v = field(c * STEP / W, r * STEP / H);
    g[r * cols + c] = v;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
}
const range = hi - lo;

// ── Marching squares → SVG path data ─────────────────────────────────────────
const parts = [];

for (let li = 1; li < LEVELS; li++) {
  const level   = lo + (li / LEVELS) * range;
  const isMajor = li % MAJOR === 0;
  const opacity = isMajor ? 0.22 : 0.07;
  const lw      = isMajor ? 1.0  : 0.55;

  let d = '';

  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const x   = c * STEP, y = r * STEP;
      const v00 = g[r * cols + c];
      const v10 = g[r * cols + c + 1];
      const v01 = g[(r + 1) * cols + c];
      const v11 = g[(r + 1) * cols + c + 1];

      const idx = (v00 >= level ? 8 : 0) |
                  (v10 >= level ? 4 : 0) |
                  (v11 >= level ? 2 : 0) |
                  (v01 >= level ? 1 : 0);
      if (idx === 0 || idx === 15) continue;

      const ti = (va, vb) => (level - va) / (vb - va);
      const top   = [x + ti(v00, v10) * STEP, y                       ];
      const right = [x + STEP,                 y + ti(v10, v11) * STEP ];
      const bot   = [x + ti(v01, v11) * STEP,  y + STEP                ];
      const left  = [x,                         y + ti(v00, v01) * STEP ];

      const fmt   = (n) => Math.round(n * 10) / 10;
      const seg   = (a, b) =>
        `M${fmt(a[0])},${fmt(a[1])}L${fmt(b[0])},${fmt(b[1])}`;

      const table = [
        null,
        () => seg(left, bot),
        () => seg(bot, right),
        () => seg(left, right),
        () => seg(top, right),
        () => seg(left, top) + seg(bot, right),  // ambiguous — two segs
        () => seg(top, bot),
        () => seg(left, top),
        () => seg(left, top),
        () => seg(top, bot),
        () => seg(top, right) + seg(left, bot),  // ambiguous
        () => seg(top, right),
        () => seg(left, right),
        () => seg(bot, right),
        () => seg(left, bot),
        null,
      ];

      const fn = table[idx];
      if (fn) d += fn();
    }
  }

  if (d) {
    parts.push(
      `<path d="${d}" stroke="rgba(50,130,184,${opacity})" stroke-width="${lw}" fill="none" stroke-linecap="round"/>`
    );
  }
}

// ── Write SVG ─────────────────────────────────────────────────────────────────
const svg = [
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`,
  ...parts,
  '</svg>',
].join('\n');

const outPath = path.join(__dirname, 'topo.svg');
fs.writeFileSync(outPath, svg, 'utf8');

const kb = (fs.statSync(outPath).size / 1024).toFixed(1);
console.log(`✓  topo.svg  ${kb} KB`);
