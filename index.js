/* ── Digital fractal tree — true 3D branching with Y-axis rotation ── */
(function () {
  const canvas = document.getElementById('tree-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  /* ── Config ── */
  const MAX_DEPTH = 7;
  const GROW_SECS = 5.5;
  const HOLD_SECS = 1.5;  /* pause after full growth before seed drops */
  const FADE_SECS = 0.9;
  const FOV       = 680;
  const AUTO_ROT     = 0.0016; /* slow ambient drift */
  const PLANTED_SECS = 1.2;   /* pause after seed lands before next tree sprouts */

  /* ── State machine ────────────────────────────────────────────────────────
   *  growing  alpha 0→1, progress 0→1
   *  holding  alpha=1; pause then seed falls
   *  fading   alpha 1→0; seed sits on ground
   *  planted  alpha=0; brief pause before next cycle
   * ─────────────────────────────────────────────────────────────────────── */
  let branches = [];
  let phase    = 'growing';
  let progress = 0;
  let alpha    = 0;
  let holdTimer    = 0;
  let plantedTimer = 0;
  let rotY = 0, lastTs = null, prevScrollY = window.scrollY;
  let treeX = 0, treeY = 0;
  let homeTrunkX = 0;
  let seed       = null;      /* { x, y, startY, vx, vy } */
  let nextTrunkX = null;

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
    homeTrunkX = canvas.width < 500 ? canvas.width * 0.50 : canvas.width * 0.58;
    treeX = homeTrunkX;
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
  /* Pick a random tip branch from the upper half of the canopy, drop seed from there */
  function spawnSeed() {
    const midScreen = treeY * 0.55;   /* only tips above this y qualify */
    const tips = branches
      .filter(b => b.depth === 0)
      .map(b  => ({ b, p: project(b.x2, b.y2, b.z2) }))
      .filter(({ p }) => p.sy < midScreen);  /* upper portion only */

    const pick = tips.length
      ? tips[Math.floor(Math.random() * tips.length)].p
      : { sx: treeX, sy: treeY * 0.3 };

    seed = { x: pick.sx, y: pick.sy, startY: pick.sy, vx: (Math.random() - 0.5) * 20, vy: -8 };
  }

  function generate() {
    /* If a seed landed, grow the next tree from that spot */
    if (nextTrunkX !== null) {
      treeX = Math.max(80, Math.min(canvas.width - 80, nextTrunkX));
      nextTrunkX = null;
    }
    branches = [];
    /* On short canvases (mobile) use a taller trunk so the tree fills the space */
    const trunkLen = canvas.height * (canvas.height < 400 ? 0.32 : 0.20);

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

    for (const b of branches) {
      if (b.tStart >= progress) continue;
      const p  = Math.min(1, (progress - b.tStart) / (b.tEnd - b.tStart));
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

    /* ── Seed / acorn ── */
    if (seed) {
      const isLanded = seed.y >= treeY - 1;

      /* During growing phase, fade seed out as the new tree emerges (progress 0 → 0.3) */
      let seedAlpha = 1.0;
      if (phase === 'growing') {
        seedAlpha = Math.max(0, 1 - progress / 0.3);
        if (seedAlpha <= 0) { seed = null; }
      }

      if (seed) {
      ctx.save();
      ctx.globalAlpha = seedAlpha;

      const fallT = isLanded ? 1 : Math.max(0, (seed.y - seed.startY) / Math.max(1, treeY - seed.startY));
      const seedR = isLanded ? 2.5 : 1.8 + fallT * 2.2;
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(seed.x, seed.y - (isLanded ? 2 : 0), seedR, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      } /* end inner if (seed) */
    }
  } /* end draw() */

  /* ── Visibility — skip work when canvas is off-screen ── */
  let visible = true;
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
  }, { threshold: 0 }).observe(canvas.parentElement);

  /* ── Animation loop ──────────────────────────────────────────────────────
   * growing → holding (pause, then seed falls while tree visible)
   *         → fading (seed on ground, tree dissolves)
   *         → planted (brief pause) → growing …
   * ─────────────────────────────────────────────────────────────────────── */
  function animate(ts) {
    requestAnimationFrame(animate);
    if (!visible) return;
    if (!lastTs) lastTs = ts;
    const dt = Math.min((ts - lastTs) / 1000, 0.05);
    lastTs = ts;

    const curScroll  = window.scrollY;
    const scrollDelta = curScroll - prevScrollY;
    rotY += scrollDelta * 0.003 + AUTO_ROT;
    prevScrollY = curScroll;

    if (phase === 'growing') {
      /* ── alpha: 0 → 1, progress: 0 → 1 ── */
      alpha    = Math.min(1, alpha + dt / 0.6);
      progress = Math.min(1, progress + dt / GROW_SECS);
      if (progress >= 1) {
        alpha = 1;
        phase = 'holding';
        holdTimer = 0;
      }

    } else if (phase === 'holding') {
      /* ── alpha stays 1; brief pause, then seed falls ── */
      if (!seed) {
        holdTimer += dt;
        if (holdTimer >= HOLD_SECS) spawnSeed();
      } else {
        seed.vy += 140 * dt;
        const hPull  = (homeTrunkX - seed.x) * 1.8;
        const hNoise = (Math.random() - 0.5) * 60;
        seed.vx += (hPull + hNoise) * dt;
        seed.vx  *= 0.94;
        seed.x   += seed.vx * dt;
        seed.y   += seed.vy * dt;

        if (seed.y >= treeY) {
          seed.y     = treeY;
          nextTrunkX = seed.x;
          phase      = 'fading';
        }
      }

    } else if (phase === 'fading') {
      /* ── alpha: 1 → 0; seed sits on the ground ── */
      alpha = Math.max(0, alpha - dt / FADE_SECS);
      if (alpha <= 0) {
        alpha        = 0;
        plantedTimer = 0;
        phase        = 'planted';
      }

    } else if (phase === 'planted') {
      /* ── alpha stays 0; seed rests briefly ── */
      plantedTimer += dt;
      if (plantedTimer >= PLANTED_SECS) {
        progress = 0;
        alpha    = 0;
        generate();
        phase = 'growing';
        /* seed intentionally kept alive — draw() fades it as the tree grows in */
      }
    }

    draw();
  }

  /* ── Init ── */
  buildColorCache();

  requestAnimationFrame(() => {
    resize();
    generate();
    requestAnimationFrame(animate);
  });

  new ResizeObserver(() => {
    resize();
    generate();
    /* Only reset when in a stable state; let active transitions finish. */
    if (phase === 'growing' || phase === 'holding') {
      seed     = null;
      progress = 0;
      alpha    = 0;
      phase    = 'growing';
    }
  }).observe(canvas.parentElement);
})();
