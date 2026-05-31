/* ── Digital fractal tree — true 3D branching with Y-axis rotation ── */
(function () {
  const canvas = document.getElementById('tree-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  /* ── Config ── */
  const MAX_DEPTH = 7;
  const GROW_SECS = 5.5;
  const HOLD_SECS = 4;
  const FADE_SECS = 0.9;
  const FOV       = 680;
  const AUTO_ROT  = 0.0016; /* slow ambient drift */

  /* ── State ── */
  let branches = [], maxT = 1;
  let phase = 'growing', progress = 0, holdTimer = 0, alpha = 1;
  let rotY = 0, lastTs = null, prevScrollY = window.scrollY;
  let treeX = 0, treeY = 0;

  /* ── Theme colors (navy default) — white branches, blue buds ── */
  let TC = { trunk: [0xe8, 0xe8, 0xea], tip: [0x32, 0x82, 0xb8] };

  /* Precomputed color string per depth — avoids string alloc every frame */
  let colorCache = [];
  function buildColorCache() {
    colorCache = [];
    for (let d = 0; d <= MAX_DEPTH; d++) {
      const [r, g, b] = lerpRGB(TC.trunk, TC.tip, 1 - d / MAX_DEPTH);
      colorCache[d] = `rgb(${r},${g},${b})`;
    }
  }

  /* ── Helpers ── */
  function lerp(a, b, t) { return a + (b - a) * t; }
  function lerpRGB(a, b, t) {
    return [Math.round(lerp(a[0],b[0],t)), Math.round(lerp(a[1],b[1],t)), Math.round(lerp(a[2],b[2],t))];
  }
  function branchColor(depth) { return colorCache[depth] ?? '#fff'; }

  /* ── Resize — use getBoundingClientRect for real painted dimensions ── */
  function resize() {
    const rect = canvas.getBoundingClientRect();
    canvas.width  = Math.max(1, Math.round(rect.width));
    canvas.height = Math.max(1, Math.round(rect.height));
    /* On narrow screens centre the trunk; on wide screens offset right so
     * branches can peek behind the text block on the left.               */
    treeX = canvas.width < 500 ? canvas.width * 0.50 : canvas.width * 0.58;
    treeY = canvas.height;
  }

  /* ── 3D vector math ── */
  function dot(a, b) { return a[0]*b[0] + a[1]*b[1] + a[2]*b[2]; }

  function cross(a, b) {
    return [
      a[1]*b[2] - a[2]*b[1],
      a[2]*b[0] - a[0]*b[2],
      a[0]*b[1] - a[1]*b[0],
    ];
  }

  function normalize(v) {
    const len = Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
    return len > 1e-8 ? [v[0]/len, v[1]/len, v[2]/len] : [0, 1, 0];
  }

  /* Rodrigues' rotation — rotate vector v around unit axis k by angle θ */
  function rodrigues(v, k, theta) {
    const c = Math.cos(theta), s = Math.sin(theta), d = dot(v, k);
    const cr = cross(k, v);
    return [
      v[0]*c + cr[0]*s + k[0]*d*(1 - c),
      v[1]*c + cr[1]*s + k[1]*d*(1 - c),
      v[2]*c + cr[2]*s + k[2]*d*(1 - c),
    ];
  }

  /* Split one branch direction into two, spreading by `spread` radians
   * in a randomly oriented plane around the parent axis.
   * Each call gives a completely different 3D orientation, making the
   * tree genuinely volumetric rather than a flat projection. */
  function splitDirs(parentDir, spread) {
    /* Find any vector perpendicular to parentDir */
    const ref  = Math.abs(parentDir[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const perp = normalize(cross(parentDir, ref));
    /* Rotate perp by a random azimuth around parentDir to pick the split plane */
    const phi      = Math.random() * Math.PI * 2;
    const axis1    = normalize(rodrigues(perp, parentDir, phi));
    const axis2    = normalize(rodrigues(perp, parentDir, phi + Math.PI));
    /* Tilt parentDir by spread angle around each axis → two child directions */
    return [
      normalize(rodrigues(parentDir, axis1, spread)),
      normalize(rodrigues(parentDir, axis2, spread)),
    ];
  }

  /* ── Generate tree ──
   * Two-pass: first build geometry with cumulative path lengths,
   * then normalise distances → tStart/tEnd so the growth front
   * sweeps at constant speed through the actual 3D geometry.
   * No level-based steps, no delays — truly continuous.
   */
  function generate() {
    branches = [];
    const trunkLen = canvas.height * 0.20;

    /* Pass 1 — geometry + cumulative distance from root */
    function add(x1, y1, z1, dir, len, depth, distSoFar) {
      const x2   = x1 + dir[0] * len;
      const y2   = y1 + dir[1] * len;
      const z2   = z1 + dir[2] * len;
      const dEnd = distSoFar + len;

      branches.push({ x1, y1, z1, x2, y2, z2, depth, tStart: distSoFar, tEnd: dEnd });

      if (depth > 0) {
        const spread = 0.30 + Math.random() * 0.65;
        const [d1, d2] = splitDirs(dir, spread);
        const bias = 0.06;
        const ls1 = 0.45 + Math.random() * 0.45;
        const ls2 = 0.45 + Math.random() * 0.45;
        add(x2, y2, z2, normalize([d1[0], d1[1] + bias, d1[2]]), len * ls1, depth - 1, dEnd);
        add(x2, y2, z2, normalize([d2[0], d2[1] + bias, d2[2]]), len * ls2, depth - 1, dEnd);
      }
    }

    add(0, 0, 0, [0, 1, 0], trunkLen, MAX_DEPTH, 0);

    /* Pass 2 — normalise distances to 0-1 so progress maps directly */
    const maxDist = Math.max(...branches.map(b => b.tEnd));
    for (const b of branches) {
      b.tStart /= maxDist;
      b.tEnd   /= maxDist;
    }
    maxT = 1;
  }

  /* ── Y-axis rotation + perspective projection ──
   * World Y is UP; screen Y is DOWN, so we subtract wy from treeY.
   */
  function project(wx, wy, wz) {
    const cosY = Math.cos(rotY);
    const sinY = Math.sin(rotY);
    const rx   = wx * cosY + wz * sinY;
    const rz   = -wx * sinY + wz * cosY;
    const s    = FOV / Math.max(50, FOV + rz);
    return { sx: treeX + rx * s, sy: treeY - wy * s, s };
  }

  /* ── Draw ──
   * No shadowBlur — it's O(pixels) per call and kills scroll perf.
   * The branch colors on the dark bg already read as glowing.
   */
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    /* Vertical axis through the tree's origin */
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = '#3282b8';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 10]);
    ctx.beginPath();
    ctx.moveTo(treeX, 0);
    ctx.lineTo(treeX, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = alpha;

    const t = progress * maxT;

    for (const b of branches) {
      if (b.tStart >= t) continue;
      const p  = Math.min(1, (t - b.tStart) / (b.tEnd - b.tStart));
      const p1 = project(b.x1, b.y1, b.z1);
      const p2 = project(lerp(b.x1, b.x2, p), lerp(b.y1, b.y2, p), lerp(b.z1, b.z2, p));

      ctx.beginPath();
      ctx.moveTo(p1.sx, p1.sy);
      ctx.lineTo(p2.sx, p2.sy);
      ctx.strokeStyle = branchColor(b.depth);
      ctx.lineWidth   = Math.max(0.4, (b.depth / MAX_DEPTH) * 3.5 * p2.s);
      ctx.stroke();

      if (b.depth === 0 && p > 0) {
        /* Bud swells as the tip draws — eased so it starts tiny and settles */
        const bud = 2.2 * p2.s * (1 - Math.pow(1 - p, 3));
        ctx.beginPath();
        ctx.arc(p2.sx, p2.sy, Math.max(0.3, bud), 0, Math.PI * 2);
        ctx.fillStyle = colorCache[0];
        ctx.fill();
      }
    }

    ctx.restore();
  }

  /* ── Visibility — skip work when canvas is off-screen ── */
  let visible = true;
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
  }, { threshold: 0 }).observe(canvas.parentElement);

  /* ── Animation loop ── */
  let prevRotY = 0;
  function animate(ts) {
    requestAnimationFrame(animate);
    if (!visible) return;
    if (!lastTs) lastTs = ts;
    const dt = Math.min((ts - lastTs) / 1000, 0.05);
    lastTs = ts;

    const curScroll = window.scrollY;
    const scrollDelta = curScroll - prevScrollY;
    rotY += scrollDelta * 0.003 + AUTO_ROT;
    prevScrollY = curScroll;

    if (phase === 'growing') {
      progress += dt / GROW_SECS;
      if (progress >= 1) { progress = 1; phase = 'holding'; holdTimer = 0; }
    } else if (phase === 'holding') {
      holdTimer += dt;
      if (holdTimer >= HOLD_SECS) phase = 'fading';
      /* Skip redraw during hold unless the user scrolled (visible rotation change) */
      if (Math.abs(scrollDelta) < 1 && Math.abs(rotY - prevRotY) < 0.003) return;
    } else {
      alpha -= dt / FADE_SECS;
      if (alpha <= 0) {
        alpha = 1; progress = 0; phase = 'growing';
        generate();
      }
    }
    prevRotY = rotY;

    draw();
  }

  /* ── Init ── */
  buildColorCache();

  /* Defer resize + generate until after the first browser paint so
   * getBoundingClientRect() reflects the real laid-out dimensions. */
  requestAnimationFrame(() => {
    resize();
    generate();
    requestAnimationFrame(animate);
  });

  new ResizeObserver(() => {
    resize(); generate();
    progress = 0; phase = 'growing'; alpha = 1;
  }).observe(canvas.parentElement);
})();
