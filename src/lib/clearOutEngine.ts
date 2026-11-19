/**
 * "The clear-out": a small real-time 3D scene drawn on a 2D canvas (no libraries).
 * Household items lift off a pick-up zone one by one, arc through the air and drop
 * into a skip. When the last one lands the zone lights up as "cleared", then the
 * scene resets and loops. Flat-shaded low-poly style, depth-sorted faces.
 */

type V3 = [number, number, number];
type RGB = [number, number, number];
type Poly = { p: V3[]; n: V3; c: RGB; inner?: RGB; bias?: number };

const rgb = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

// Face vertex order for a unit box (bottom face is never visible, so it is skipped).
const FACES: { i: number[]; n: V3 }[] = [
  { i: [4, 5, 6, 7], n: [0, 0, 1] },
  { i: [1, 0, 3, 2], n: [0, 0, -1] },
  { i: [5, 1, 2, 6], n: [1, 0, 0] },
  { i: [0, 4, 7, 3], n: [-1, 0, 0] },
  { i: [3, 7, 6, 2], n: [0, 1, 0] },
];

function box(cx: number, cy: number, cz: number, w: number, h: number, d: number, color: string, yaw = 0): Poly[] {
  const hx = w / 2, hy = h / 2, hz = d / 2;
  const cs = Math.cos(yaw), sn = Math.sin(yaw);
  const rot = (x: number, y: number, z: number): V3 => [cx + cs * x + sn * z, cy + y, cz - sn * x + cs * z];
  const v: V3[] = [
    rot(-hx, -hy, -hz), rot(hx, -hy, -hz), rot(hx, hy, -hz), rot(-hx, hy, -hz),
    rot(-hx, -hy, hz), rot(hx, -hy, hz), rot(hx, hy, hz), rot(-hx, hy, hz),
  ];
  const c = rgb(color);
  return FACES.map((f) => ({
    p: f.i.map((k) => v[k]),
    n: [cs * f.n[0] + sn * f.n[2], f.n[1], -sn * f.n[0] + cs * f.n[2]] as V3,
    c,
  }));
}

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a: V3): V3 => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeOutBack = (x: number) => 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2);
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

/** Double-sided quad for the skip walls: outer colour on the outside, inner colour inside. */
function wall(a: V3, b: V3, c: V3, d: V3, outer: string, inner: string, centre: V3, bias = 0): Poly {
  let n = norm(cross(sub(b, a), sub(d, a)));
  const mid: V3 = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2];
  if (dot(n, sub(mid, centre)) < 0) n = [-n[0], -n[1], -n[2]];
  return { p: [a, b, c, d], n, c: rgb(outer), inner: rgb(inner), bias };
}

// ---------- scene content ----------

type Item = { polys: Poly[]; home: [number, number]; yaw: number; land: [number, number, number]; r: number };

const sofa = (): Poly[] => [
  ...box(0, 0.3, 0, 2.2, 0.6, 1.0, '#8d9cb8'),
  ...box(0, 0.88, -0.38, 2.2, 0.76, 0.26, '#7b8aa8'),
  ...box(-1.0, 0.58, 0.04, 0.3, 0.76, 1.0, '#73829f'),
  ...box(1.0, 0.58, 0.04, 0.3, 0.76, 1.0, '#73829f'),
  ...box(-0.45, 0.68, 0.14, 0.88, 0.18, 0.7, '#a6b4cc'),
  ...box(0.45, 0.68, 0.14, 0.88, 0.18, 0.7, '#a6b4cc'),
];
const fridge = (): Poly[] => [
  ...box(0, 1.0, 0, 0.9, 2.0, 0.85, '#e6ecf5'),
  ...box(0, 1.35, 0.43, 0.9, 0.04, 0.03, '#94a3b8'),
  ...box(0.3, 1.65, 0.45, 0.06, 0.42, 0.05, '#64748b'),
  ...box(0.3, 0.95, 0.45, 0.06, 0.3, 0.05, '#64748b'),
];
const washer = (): Poly[] => [
  ...box(0, 0.55, 0, 0.85, 1.1, 0.8, '#f1f5f9'),
  ...box(0, 0.98, 0.38, 0.8, 0.1, 0.06, '#cbd5e1'),
  ...box(0, 0.5, 0.41, 0.52, 0.52, 0.06, '#334155'),
  ...box(0, 0.5, 0.45, 0.34, 0.34, 0.03, '#38bdf8'),
];
const mattress = (): Poly[] => [
  ...box(0, 0.2, 0, 2.0, 0.4, 1.2, '#e2e8f0'),
  ...box(0, 0.2, 0, 2.03, 0.34, 0.3, '#bae6fd'),
];
const cartons = (): Poly[] => [
  ...box(0, 0.35, 0, 0.9, 0.7, 0.8, '#d9a766'),
  ...box(0, 0.35, 0, 0.12, 0.72, 0.82, '#f1d7a8'),
  ...box(0.08, 0.95, 0.04, 0.7, 0.5, 0.6, '#cf9b57', 0.4),
];
const chair = (): Poly[] => [
  ...box(0, 0.55, 0, 0.72, 0.12, 0.72, '#f59e0b'),
  ...box(0, 1.05, -0.31, 0.72, 0.9, 0.1, '#fbbf24'),
  ...box(-0.28, 0.25, 0.28, 0.08, 0.5, 0.08, '#b45309'),
  ...box(0.28, 0.25, 0.28, 0.08, 0.5, 0.08, '#b45309'),
  ...box(-0.28, 0.25, -0.28, 0.08, 0.5, 0.08, '#b45309'),
  ...box(0.28, 0.25, -0.28, 0.08, 0.5, 0.08, '#b45309'),
];
const bag = (): Poly[] => [
  ...box(0, 0.3, 0, 0.8, 0.6, 0.72, '#4b5d78', 0.1),
  ...box(0, 0.74, 0, 0.56, 0.36, 0.52, '#586b8d', 0.5),
  ...box(0, 0.98, 0, 0.2, 0.16, 0.2, '#2b3a52', 0.8),
];

const ITEMS: Item[] = [
  { polys: fridge(), home: [-3.8, -2.1], yaw: 0.2, land: [-0.55, 0.15, -0.25], r: 0.7 },
  { polys: sofa(), home: [-2.4, -0.1], yaw: 0.12, land: [0.5, 0.5, 0.1], r: 1.3 },
  { polys: washer(), home: [-2.3, -2.2], yaw: -0.15, land: [0.3, 0.9, -0.2], r: 0.7 },
  { polys: mattress(), home: [-0.9, 1.9], yaw: -0.25, land: [-0.1, 1.15, 0.3], r: 1.2 },
  { polys: cartons(), home: [-3.8, 1.6], yaw: 0.3, land: [-0.6, 1.2, 0.35], r: 0.8 },
  { polys: chair(), home: [-2.7, 1.9], yaw: 0.5, land: [0.65, 1.5, -0.3], r: 0.6 },
  { polys: bag(), home: [-0.9, -1.1], yaw: 0, land: [0.0, 1.6, 0.0], r: 0.5 },
];

const SKIP_POS: V3 = [3.3, 0, -0.3];
const SKIP_SCALE_IN = 0.52; // items shrink a little as they go in so the skip looks well filled
const SKIP: Poly[] = (() => {
  const B: V3[] = [[-1.35, 0, -0.9], [1.35, 0, -0.9], [1.35, 0, 0.9], [-1.35, 0, 0.9]];
  const T: V3[] = [[-1.75, 1.6, -1.3], [1.75, 1.6, -1.3], [1.75, 1.6, 1.3], [-1.75, 1.6, 1.3]];
  const mid: V3 = [0, 0.8, 0];
  const out = '#0e8fd6', inn = '#0a2f55';
  const polys: Poly[] = [wall(B[0], B[1], T[1], T[0], out, inn, mid), wall(B[1], B[2], T[2], T[1], out, inn, mid), wall(B[2], B[3], T[3], T[2], out, inn, mid), wall(B[3], B[0], T[0], T[3], out, inn, mid)];
  polys.push({ p: [[-1.3, 0.12, -0.85], [1.3, 0.12, -0.85], [1.3, 0.12, 0.85], [-1.3, 0.12, 0.85]], n: [0, 1, 0], c: rgb(inn), inner: rgb('#072544') });
  // stripes + rim so it reads as a branded skip
  const at = (w: V3[], i: number, j: number, t: number): V3 => [lerp(w[i][0], w[j][0], t), 0, lerp(w[i][2], w[j][2], t)];
  const bandY = (p: V3, q: V3, y: number): V3 => { const t = y / 1.6; return [lerp(p[0], q[0], t), y, lerp(p[2], q[2], t)]; };
  ([[2, 3], [1, 2], [3, 0]] as [number, number][]).forEach(([i, j]) => {
    const p0 = bandY(at(B, i, j, 0.04), at(T, i, j, 0.04), 0.55), p1 = bandY(at(B, i, j, 0.96), at(T, i, j, 0.96), 0.55);
    const p2 = bandY(at(B, i, j, 0.96), at(T, i, j, 0.96), 0.92), p3 = bandY(at(B, i, j, 0.04), at(T, i, j, 0.04), 0.92);
    polys.push(wall(p0, p1, p2, p3, '#5eead4', '#5eead4', mid, 0.02));
  });
  return polys;
})();

const PLATFORM: Poly[] = box(0, -0.35, 0, 10.6, 0.7, 7.8, '#133a6b');
const CYCLE = 11.2;
const START = 1.1;
const GAP = 0.82;
const DUR = 1.25;
const FADE_OUT = 9.7;
const RESPAWN = 10.15;
const LIGHT = norm([-0.45, 0.85, 0.5]);

export type SceneOptions = {
  host: HTMLElement;
  reduced: boolean;
  interactive: boolean;
  onCount: (count: number, total: number) => void;
};

export function startClearOut(canvas: HTMLCanvasElement, opts: SceneOptions): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  let W = 0, H = 0, dpr = 1, raf = 0, visible = true, destroyed = false;
  let mx = 0, my = 0, smx = 0, smy = 0, lastCount = -1;
  const t0 = performance.now();
  let detach = () => {};

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, canvas.clientWidth);
    H = Math.max(1, canvas.clientHeight);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    if (opts.reduced) draw(0.4);
  };

  type Drawn = { pts: number[]; depth: number; fill: string; alpha: number };

  function draw(t: number) {
    if (!ctx) return;
    const cyc = t % CYCLE;
    smx += (mx - smx) * 0.06;
    smy += (my - smy) * 0.06;
    const yaw = -0.5 + smx * 0.22 + Math.sin(t * 0.3) * 0.09;
    const pitch = 0.74 + smy * 0.05;
    const D = 30;
    const F = Math.min(W / 12.4, H / 9.4) * D;
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const TARGET: V3 = [0.1, 0.5, 0];

    const view = (p: V3): V3 => {
      const x = p[0] - TARGET[0], y = p[1] - TARGET[1], z = p[2] - TARGET[2];
      const x1 = cy * x + sy * z, z1 = -sy * x + cy * z;
      return [x1, cp * y - sp * z1, sp * y + cp * z1];
    };
    const viewN = (n: V3): V3 => {
      const x1 = cy * n[0] + sy * n[2], z1 = -sy * n[0] + cy * n[2];
      return [x1, cp * n[1] - sp * z1, sp * n[1] + cp * z1];
    };
    const scr = (v: V3): [number, number] => { const d = D - v[2]; return [W / 2 + (F * v[0]) / d, H * 0.54 - (F * v[1]) / d]; };

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.lineJoin = 'round';

    const shade = (c: RGB, n: V3, k = 1) => {
      const l = Math.max(0, dot(n, LIGHT));
      const f = (0.5 + 0.62 * l) * k;
      return `rgb(${Math.min(255, Math.round(c[0] * f))},${Math.min(255, Math.round(c[1] * f))},${Math.min(255, Math.round(c[2] * f))})`;
    };

    const emit = (list: Drawn[], poly: Poly, tf: (p: V3) => V3, rotN: (n: V3) => V3, alpha: number) => {
      const wp = poly.p.map(tf);
      const wn = rotN(poly.n);
      const vp = wp.map(view);
      const vn = viewN(wn);
      const cx = (vp[0][0] + vp[2][0]) / 2, cyy = (vp[0][1] + vp[2][1]) / 2, cz = (vp[0][2] + vp[2][2]) / 2;
      const facing = vn[0] * cx + vn[1] * cyy + vn[2] * (cz - D) < 0;
      let color = poly.c;
      let nn = wn;
      if (!facing) {
        if (!poly.inner) return;
        color = poly.inner;
        nn = [-wn[0], -wn[1], -wn[2]];
      }
      const pts: number[] = [];
      let depth = 0;
      vp.forEach((v) => { const s = scr(v); pts.push(s[0], s[1]); depth += D - v[2]; });
      list.push({ pts, depth: depth / vp.length - (poly.bias ?? 0), fill: shade(color, nn, facing ? 1 : 0.85), alpha });
    };

    const paint = (list: Drawn[]) => {
      list.sort((a, b) => b.depth - a.depth);
      for (const d of list) {
        ctx.globalAlpha = d.alpha;
        ctx.fillStyle = d.fill;
        ctx.strokeStyle = d.fill;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(d.pts[0], d.pts[1]);
        for (let i = 2; i < d.pts.length; i += 2) ctx.lineTo(d.pts[i], d.pts[i + 1]);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    // ---- glow under the platform ----
    const gc = scr(view([0, -0.8, 0]));
    const glow = ctx.createRadialGradient(gc[0], gc[1], 0, gc[0], gc[1], F * 0.36);
    glow.addColorStop(0, 'rgba(14,165,233,0.42)');
    glow.addColorStop(0.5, 'rgba(14,165,233,0.14)');
    glow.addColorStop(1, 'rgba(14,165,233,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // ---- platform + floor markings ----
    const base: Drawn[] = [];
    const id = (p: V3) => p;
    PLATFORM.forEach((poly) => emit(base, poly, id, id, 1));
    paint(base);

    const floorPt = (x: number, z: number) => scr(view([x, 0, z]));
    ctx.strokeStyle = 'rgba(148,197,255,0.07)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let g = -5; g <= 5; g++) {
      const a = floorPt(g, -3.9), b = floorPt(g, 3.9);
      ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
    }
    for (let g = -4; g <= 4; g++) {
      const a = floorPt(-5.3, g), b = floorPt(5.3, g);
      ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
    }
    ctx.stroke();
    // neon edge
    ctx.beginPath();
    ([[-5.3, -3.9], [5.3, -3.9], [5.3, 3.9], [-5.3, 3.9]] as [number, number][]).forEach(([x, z], k) => { const c = floorPt(x, z); if (k) ctx.lineTo(c[0], c[1]); else ctx.moveTo(c[0], c[1]); });
    ctx.closePath();
    ctx.strokeStyle = 'rgba(94,234,212,0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // ---- per-item state ----
    const states = ITEMS.map((it, i) => {
      const start = START + i * GAP;
      const u = clamp01((cyc - start) / DUR);
      const e = easeInOut(u);
      let pos: V3 = [it.home[0], 0, it.home[1]];
      let yawI = it.yaw, scale = 1, alpha = 1;
      if (cyc >= start) {
        const lx = SKIP_POS[0] + it.land[0], lz = SKIP_POS[2] + it.land[2];
        pos = [lerp(it.home[0], lx, e), lerp(0, it.land[1] * 0.55 + 0.1, e) + 4 * 3.1 * u * (1 - u), lerp(it.home[1], lz, e)];
        yawI = it.yaw + e * (Math.PI * (i % 2 ? 1.1 : -0.9));
        scale = lerp(1, SKIP_SCALE_IN, e);
      }
      if (cyc >= FADE_OUT && cyc < RESPAWN) { scale = SKIP_SCALE_IN * (1 - easeInOut(clamp01((cyc - FADE_OUT) / 0.45))); alpha = 0; }
      if (cyc >= RESPAWN) {
        const k = clamp01((cyc - RESPAWN) / 0.6);
        pos = [it.home[0], 0, it.home[1]]; yawI = it.yaw; scale = easeOutBack(k); alpha = k;
      }
      return { pos, yawI, scale, alpha, u, start };
    });

    const landed = cyc >= FADE_OUT ? 0 : states.filter((s) => cyc >= s.start + DUR * 0.92).length;
    const clearedF = cyc >= FADE_OUT ? 0 : landed / ITEMS.length;
    if (landed !== lastCount) { lastCount = landed; opts.onCount(landed, ITEMS.length); }
    const dip = states.reduce((acc, s) => { const dt = cyc - (s.start + DUR); return acc + (dt > 0 && cyc < FADE_OUT ? Math.exp(-dt * 7) * 0.09 * Math.cos(dt * 10) : 0); }, 0);

    // ---- pick-up zone (dashed -> teal when cleared) ----
    const zone: [number, number][] = [[-4.7, -3.0], [0.2, -3.0], [0.2, 3.0], [-4.7, 3.0]];
    ctx.beginPath();
    zone.forEach(([x, z], k) => { const s = floorPt(x, z); if (k) ctx.lineTo(s[0], s[1]); else ctx.moveTo(s[0], s[1]); });
    ctx.closePath();
    ctx.fillStyle = `rgba(94,234,212,${(0.16 * clearedF).toFixed(3)})`;
    ctx.fill();
    ctx.setLineDash([7, 6]);
    ctx.strokeStyle = clearedF > 0.99 ? 'rgba(94,234,212,0.9)' : 'rgba(125,211,252,0.35)';
    ctx.lineWidth = clearedF > 0.99 ? 2 : 1.4;
    ctx.stroke();
    ctx.setLineDash([]);
    const tClear = START + (ITEMS.length - 1) * GAP + DUR;
    const dtc = cyc - tClear;
    if (dtc > 0 && dtc < 1.7) {
      const rr = dtc * 4.2;
      ctx.beginPath();
      for (let k = 0; k <= 48; k++) {
        const a = (k / 48) * Math.PI * 2;
        const pt = floorPt(-2.25 + Math.cos(a) * rr, Math.sin(a) * rr * 0.8);
        if (k) ctx.lineTo(pt[0], pt[1]); else ctx.moveTo(pt[0], pt[1]);
      }
      ctx.strokeStyle = `rgba(94,234,212,${(0.7 * (1 - dtc / 1.7)).toFixed(3)})`;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    // ---- shadows ----
    const addShadow = (x: number, z: number, y: number, r: number, a: number) => {
      const s = scr(view([x, 0, z]));
      const k = F / (D - view([x, 0, z])[2]);
      const rad = r * k * (1 + y * 0.12);
      ctx.save();
      ctx.translate(s[0], s[1]);
      ctx.scale(1, Math.max(0.3, sp));
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rad);
      const al = a / (1 + y * 0.5);
      g.addColorStop(0, `rgba(2,10,28,${al.toFixed(3)})`);
      g.addColorStop(1, 'rgba(2,10,28,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, rad, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    };
    ITEMS.forEach((it, i) => {
      const s = states[i];
      const atHome = cyc < s.start || cyc >= RESPAWN;
      if (atHome) addShadow(it.home[0], it.home[1], 0, it.r * 1.25, 0.5 * s.alpha);
      else if (s.u < 1) addShadow(s.pos[0], s.pos[2], s.pos[1], it.r * 1.1, 0.4);
    });
    addShadow(SKIP_POS[0], SKIP_POS[2], 0, 2.5, 0.55);

    // ---- items + skip, depth sorted together ----
    const list: Drawn[] = [];
    SKIP.forEach((poly) => emit(list, poly, (p) => [p[0] + SKIP_POS[0], p[1] + SKIP_POS[1] - dip, p[2] + SKIP_POS[2]], id, 1));
    ITEMS.forEach((it, i) => {
      const s = states[i];
      if (s.scale <= 0.02) return;
      const c = Math.cos(s.yawI), sn = Math.sin(s.yawI);
      const tf = (p: V3): V3 => { const x = p[0] * s.scale, y = p[1] * s.scale, z = p[2] * s.scale; return [s.pos[0] + c * x + sn * z, s.pos[1] + y, s.pos[2] - sn * x + c * z]; };
      const rn = (n: V3): V3 => [c * n[0] + sn * n[2], n[1], -sn * n[0] + c * n[2]];
      it.polys.forEach((poly) => emit(list, poly, tf, rn, 1));
    });
    paint(list);

    // ---- landing puffs + drifting dust (stateless, driven by time) ----
    const px = F / D;
    ITEMS.forEach((it, i) => {
      const dt = cyc - (states[i].start + DUR);
      if (dt <= 0 || dt >= 0.9 || cyc >= FADE_OUT) return;
      const life = 1 - dt / 0.9;
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * Math.PI * 2 + i * 1.3;
        const r = 0.35 + dt * 2.1;
        const sp2 = scr(view([SKIP_POS[0] + it.land[0] + Math.cos(a) * r * 0.9, 1.5 + dt * 1.7 - dt * dt * 1.4, SKIP_POS[2] + it.land[2] + Math.sin(a) * r * 0.6]));
        ctx.fillStyle = `rgba(190,245,255,${(life * 0.85).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(sp2[0], sp2[1], 0.06 * px * life + 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    for (let j = 0; j < 26; j++) {
      const fr = (n: number) => { const v = Math.sin(j * n) * 43758.5453; return v - Math.floor(v); };
      const y = (t * (0.28 + fr(7.1) * 0.25) + fr(3.3) * 5) % 4.6;
      const m = scr(view([(fr(1.7) - 0.5) * 10.4 + Math.sin(t * 0.4 + j) * 0.4, y + 0.2, (fr(5.9) - 0.5) * 7.4]));
      ctx.fillStyle = `rgba(165,225,255,${(Math.sin((Math.PI * y) / 4.6) * 0.5).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(m[0], m[1], 0.5 + fr(9.3) * 1.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // ---- soft success glow above the skip when cleared ----
    if (clearedF > 0.99) {
      const s = scr(view([SKIP_POS[0], 2.2, SKIP_POS[2]]));
      const pulse = 0.5 + 0.5 * Math.sin((cyc - 8) * 4);
      const g = ctx.createRadialGradient(s[0], s[1], 0, s[0], s[1], W * 0.28);
      g.addColorStop(0, `rgba(94,234,212,${(0.2 + 0.08 * pulse).toFixed(3)})`);
      g.addColorStop(1, 'rgba(94,234,212,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
  }

  const tick = (now: number) => {
    raf = 0;
    if (destroyed) return;
    if (visible) draw((now - t0) / 1000);
    raf = requestAnimationFrame(tick);
  };

  const onMove = (e: PointerEvent) => {
    const r = opts.host.getBoundingClientRect();
    mx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2));
    my = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2));
  };
  const onLeave = () => { mx = 0; my = 0; };

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
  io.observe(canvas);
  resize();

  if (opts.reduced) {
    draw(0.4);
  } else {
    raf = requestAnimationFrame(tick);
    if (opts.interactive) {
      const hero = opts.host.closest<HTMLElement>('.hero') ?? opts.host;
      hero.addEventListener('pointermove', onMove);
      hero.addEventListener('pointerleave', onLeave);
      detach = () => { hero.removeEventListener('pointermove', onMove); hero.removeEventListener('pointerleave', onLeave); };
    }
  }

  return () => {
    destroyed = true;
    if (raf) cancelAnimationFrame(raf);
    ro.disconnect();
    io.disconnect();
    detach();
  };
}
