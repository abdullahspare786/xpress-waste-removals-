/**
 * "The clear-out", premium edition: a real-time ray-marched 3D scene (WebGL2, no libraries).
 * Same story as the 2D scene in clearOutEngine.ts - items lift off a pick-up zone, arc through
 * the air and drop into a skip - but rendered with soft shadows, ambient occlusion, glossy
 * reflections and physically-flavoured materials on a floating dark plinth.
 *
 * startClearOutGL() returns null when WebGL2 is unavailable so the caller can fall back to the
 * 2D engine. A shader compile/link failure is reported through opts.onFail.
 */
import type { SceneOptions } from './clearOutEngine';

export type GLSceneOptions = SceneOptions & { onFail: () => void };

const N = 7;
const CYCLE = 11.2;
const START = 1.1;
const GAP = 0.82;
const DUR = 1.25;
const FADE_OUT = 9.7;
const RESPAWN = 10.15;
const SKIP_X = 3.3;
const SKIP_Z = -0.3;
const SKIP_SCALE_IN = 0.52;
const CAM_D = 24;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeOutBack = (x: number) => 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2);

// fridge, sofa, washer, mattress, cartons, chair, bag
const ITEMS: { home: [number, number]; yaw: number; land: [number, number, number] }[] = [
  { home: [-3.8, -2.1], yaw: 0.2, land: [-0.55, 0.15, -0.25] },
  { home: [-2.4, -0.1], yaw: 0.12, land: [0.5, 0.5, 0.1] },
  { home: [-2.3, -2.2], yaw: -0.15, land: [0.3, 0.9, -0.2] },
  { home: [-0.9, 1.9], yaw: -0.25, land: [-0.1, 1.15, 0.3] },
  { home: [-3.8, 1.6], yaw: 0.3, land: [-0.6, 1.2, 0.35] },
  { home: [-2.7, 1.9], yaw: 0.5, land: [0.65, 1.5, -0.3] },
  { home: [-0.9, -1.1], yaw: 0, land: [0.0, 1.6, 0.0] },
];

const VERT = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
precision highp int;
out vec4 outColor;

uniform vec2 uRes;
uniform float uF;
uniform vec3 uCamPos, uCamR, uCamU, uCamB;
uniform float uCleared, uPulse, uDip;
uniform vec4 uA[7];   // item position xyz, yaw
uniform vec4 uB[7];   // item scale, tilt

const vec3 KEY = vec3(-0.4151, 0.7841, 0.4613);
const vec3 RIM = vec3(0.6, 0.35, -0.72);
const vec3 SKIP_POS = vec3(3.3, 0.0, -0.3);
const vec2 BS[7] = vec2[7](vec2(1.0,1.2), vec2(0.6,1.35), vec2(0.55,0.75), vec2(0.2,1.2), vec2(0.65,0.85), vec2(0.75,0.8), vec2(0.5,0.65));
const vec2 PAD_C = vec2(-2.35, -0.15);
const vec2 PAD_H = vec2(1.95, 2.3);

mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float sdBox(vec3 p, vec3 b) { vec3 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0); }
float sdRBox(vec3 p, vec3 b, float r) { return sdBox(p, b - r) - r; }
float smin(float a, float b, float k) { float h = max(k - abs(a - b), 0.0) / k; return min(a, b) - h * h * k * 0.25; }

float itemD(int k, vec3 q, out float prt) {
  prt = 0.0;
  if (k == 0) {            // fridge
    float b = sdRBox(q - vec3(0.0, 1.0, 0.0), vec3(0.45, 1.0, 0.425), 0.05);
    float h = min(sdBox(q - vec3(0.3, 1.65, 0.46), vec3(0.03, 0.21, 0.03)), sdBox(q - vec3(0.3, 0.95, 0.46), vec3(0.03, 0.15, 0.03)));
    if (h < b) prt = 1.0;
    return min(b, h);
  }
  if (k == 1) {            // sofa
    vec3 s = vec3(abs(q.x), q.y, q.z);
    float base = sdRBox(q - vec3(0.0, 0.3, 0.0), vec3(1.1, 0.3, 0.5), 0.08);
    float back = sdRBox(q - vec3(0.0, 0.88, -0.38), vec3(1.1, 0.38, 0.13), 0.07);
    float arm = sdRBox(s - vec3(1.0, 0.58, 0.04), vec3(0.15, 0.38, 0.5), 0.07);
    float cu = sdRBox(s - vec3(0.45, 0.68, 0.14), vec3(0.44, 0.09, 0.35), 0.06);
    float d = min(min(base, back), arm);
    if (cu < d) prt = 1.0;
    return min(d, cu);
  }
  if (k == 2) {            // washing machine
    float b = sdRBox(q - vec3(0.0, 0.55, 0.0), vec3(0.425, 0.55, 0.4), 0.04);
    vec2 w = vec2(length(q.xy - vec2(0.0, 0.5)) - 0.27, abs(q.z - 0.4) - 0.03);
    float dr = min(max(w.x, w.y), 0.0) + length(max(w, 0.0));
    if (dr < b) prt = 1.0;
    return min(b, dr);
  }
  if (k == 3) {            // mattress
    return sdRBox(q - vec3(0.0, 0.2, 0.0), vec3(1.0, 0.2, 0.6), 0.12);
  }
  if (k == 4) {            // cartons
    float lo = sdRBox(q - vec3(0.0, 0.35, 0.0), vec3(0.45, 0.35, 0.4), 0.02);
    vec3 u = q - vec3(0.08, 0.95, 0.04);
    u.xz = rot(0.4) * u.xz;
    float up = sdRBox(u, vec3(0.35, 0.25, 0.3), 0.02);
    if (up < lo) prt = 1.0;
    return min(lo, up);
  }
  if (k == 5) {            // chair
    float seat = sdRBox(q - vec3(0.0, 0.55, 0.0), vec3(0.36, 0.06, 0.36), 0.025);
    float back = sdRBox(q - vec3(0.0, 1.05, -0.31), vec3(0.36, 0.45, 0.05), 0.03);
    float leg = sdBox(vec3(abs(q.x), q.y, abs(q.z)) - vec3(0.28, 0.25, 0.28), vec3(0.04, 0.25, 0.04));
    float d = min(seat, back);
    if (leg < d) prt = 1.0;
    return min(d, leg);
  }
  // bin bag
  float blob = smin(sdRBox(q - vec3(0.0, 0.3, 0.0), vec3(0.4, 0.3, 0.36), 0.2), sdRBox(q - vec3(0.0, 0.74, 0.0), vec3(0.28, 0.18, 0.26), 0.12), 0.15);
  return smin(blob, length(q - vec3(0.0, 0.98, 0.0)) - 0.1, 0.1);
}

vec3 itemLocal(int i, vec3 p, out float sc) {
  vec4 a = uA[i]; vec4 b = uB[i];
  sc = max(b.x, 0.0001);
  vec3 q = (p - a.xyz) / sc;
  float cy = BS[i].x;
  q.y -= cy;
  q.xz = rot(a.w) * q.xz;
  q.yz = rot(b.y) * q.yz;
  q.y += cy;
  return q;
}

float skipD(vec3 p) {
  float h = 1.6;
  float t = clamp(p.y / h, 0.0, 1.0);
  float sx = mix(1.35, 1.75, t), sz = mix(0.9, 1.3, t);
  vec2 e = vec2(abs(p.x) - sx, abs(p.z) - sz);
  float dxz = (length(max(e + 0.08, 0.0)) + min(max(e.x, e.y) + 0.08, 0.0) - 0.08) * 0.95;
  float outer = max(dxz, max(-p.y, p.y - h));
  float inner = max(max(e.x + 0.1, e.y + 0.1) * 0.95, -(p.y - 0.16));
  float d = max(outer, -inner);
  return d + 0.012 * sin(p.y * 18.0) * smoothstep(-0.12, -0.02, outer);
}

vec2 map(vec3 p) {
  vec2 res = vec2(sdRBox(p - vec3(0.0, -0.35, 0.0), vec3(5.4, 0.35, 3.4), 0.1), 50.0);
  vec3 sp = p - SKIP_POS; sp.y += uDip;
  float sk = skipD(sp);
  if (sk < res.x) res = vec2(sk, 40.0);
  for (int i = 0; i < 7; i++) {
    float sc = uB[i].x;
    if (sc < 0.02) continue;
    vec3 c = uA[i].xyz + vec3(0.0, BS[i].x * sc, 0.0);
    float db = length(p - c) - BS[i].y * sc;
    float d; float prt = 0.0;
    if (db > 0.3 * sc) { d = db; }
    else { float s2; vec3 q = itemLocal(i, p, s2); d = itemD(i, q, prt) * sc; }
    if (d < res.x) res = vec2(d, float(i * 4) + prt);
  }
  return res;
}

vec3 calcNormal(vec3 p) {
  vec2 e = vec2(1.0, -1.0) * 0.003;
  return normalize(e.xyy * map(p + e.xyy).x + e.yyx * map(p + e.yyx).x + e.yxy * map(p + e.yxy).x + e.xxx * map(p + e.xxx).x);
}

float calcAO(vec3 p, vec3 n) {
  float o = 0.0, s = 1.0;
  for (int i = 1; i <= 4; i++) {
    float h = 0.09 * float(i);
    o += (h - map(p + n * h).x) * s;
    s *= 0.7;
  }
  return clamp(1.0 - 1.5 * o, 0.0, 1.0);
}

float calcShadow(vec3 ro, vec3 rd) {
  float res = 1.0, t = 0.05;
  for (int i = 0; i < 22; i++) {
    float h = map(ro + rd * t).x;
    res = min(res, 9.0 * h / t);
    t += clamp(h, 0.06, 0.55);
    if (res < 0.003 || t > 10.0) break;
  }
  res = clamp(res, 0.0, 1.0);
  return res * res * (3.0 - 2.0 * res);
}

vec3 envMap(vec3 d, float rough) {
  vec3 c = mix(vec3(0.035, 0.08, 0.16), vec3(0.13, 0.26, 0.48), smoothstep(0.0, 0.95, d.y));
  c = mix(c, vec3(0.015, 0.04, 0.09), smoothstep(0.0, 0.5, -d.y));
  float ex = mix(140.0, 7.0, rough);
  c += vec3(1.0, 0.93, 0.82) * pow(max(dot(d, KEY), 0.0), ex) * mix(7.0, 1.0, rough);
  c += vec3(0.30, 0.95, 0.82) * pow(max(dot(d, RIM), 0.0), ex * 0.5) * mix(3.0, 0.7, rough);
  return c;
}

struct Mat { vec3 alb; float rough; float metal; vec3 emis; };

float padSD(vec2 xz) {
  vec2 qd = abs(xz - PAD_C) - PAD_H + 0.3;
  return length(max(qd, 0.0)) + min(max(qd.x, qd.y), 0.0) - 0.3;
}

Mat getMat(float id, vec3 p, vec3 n) {
  Mat m; m.alb = vec3(0.5); m.rough = 0.6; m.metal = 0.0; m.emis = vec3(0.0);
  if (id < 39.0) {
    int i = int(id * 0.25 + 0.01);
    int prt = int(id - float(i) * 4.0 + 0.5);
    float sc; vec3 q = itemLocal(i, p, sc);
    if (i == 0) {
      if (prt == 1) { m.alb = vec3(0.16, 0.18, 0.22); m.rough = 0.3; m.metal = 0.9; }
      else {
        m.alb = vec3(0.42, 0.47, 0.54); m.rough = 0.32; m.metal = 0.85;
        if (abs(q.y - 1.35) < 0.012 && q.z > 0.3) m.alb *= 0.4;
      }
    } else if (i == 1) {
      m.alb = prt == 1 ? vec3(0.09, 0.14, 0.26) : vec3(0.05, 0.08, 0.16); m.rough = 0.88;
    } else if (i == 2) {
      m.alb = vec3(0.60, 0.64, 0.70); m.rough = 0.22; m.metal = 0.05;
      if (q.y > 0.97 && q.z > 0.2) m.alb = vec3(0.45, 0.50, 0.58);
      float dd = length(q.xy - vec2(0.0, 0.5));
      if (prt == 1) {
        m.alb = vec3(0.35, 0.40, 0.47); m.rough = 0.25; m.metal = 0.9;
        if (dd < 0.2) { m.alb = vec3(0.01, 0.03, 0.06); m.rough = 0.04; m.metal = 0.0; }
      }
    } else if (i == 3) {
      m.alb = vec3(0.36, 0.35, 0.33); m.rough = 0.92;
      if (abs(q.y - 0.2) < 0.016) m.alb = vec3(0.08, 0.14, 0.26);
    } else if (i == 4) {
      m.alb = prt == 1 ? vec3(0.26, 0.15, 0.07) : vec3(0.31, 0.19, 0.09); m.rough = 0.85;
      if (abs(q.x) < 0.05 && q.y > 0.5) m.alb = vec3(0.46, 0.36, 0.24);
    } else if (i == 5) {
      m.alb = prt == 1 ? vec3(0.03, 0.04, 0.06) : vec3(0.26, 0.15, 0.07); m.rough = prt == 1 ? 0.35 : 0.55;
      m.metal = prt == 1 ? 0.7 : 0.0;
    } else {
      m.alb = vec3(0.025, 0.04, 0.075); m.rough = 0.22;
    }
    return m;
  }
  if (id < 45.0) {
    vec3 sp = p - SKIP_POS; sp.y += uDip;
    float t = clamp(sp.y / 1.6, 0.0, 1.0);
    float sx = mix(1.35, 1.75, t), sz = mix(0.9, 1.3, t);
    if (abs(sp.x) < sx - 0.07 && abs(sp.z) < sz - 0.07 && sp.y > 0.12) {
      m.alb = vec3(0.006, 0.02, 0.045); m.rough = 0.8;
    } else {
      m.alb = vec3(0.016, 0.075, 0.16); m.rough = 0.4; m.metal = 0.45;
      if (n.y < 0.5 && sp.y > 0.55 && sp.y < 0.92) {
        m.alb = vec3(0.07, 0.36, 0.33); m.rough = 0.32; m.metal = 0.3;
        m.emis = vec3(0.28, 0.95, 0.80) * (0.03 + 0.55 * uCleared);
      }
    }
    return m;
  }
  // plinth
  if (n.y > 0.9) {
    m.alb = vec3(0.004, 0.011, 0.028); m.rough = 0.12; m.metal = 0.3;
    m.emis += vec3(0.025, 0.06, 0.11) * exp(-dot(p.xz - vec2(0.3, 0.0), (p.xz - vec2(0.3, 0.0)) * vec2(0.06, 0.1)));
    vec2 g = abs(fract(p.xz * 0.5 + 0.25) - 0.5);
    m.emis += vec3(0.25, 0.55, 0.85) * smoothstep(0.012, 0.0, min(g.x, g.y)) * 0.02;
    float sd = padSD(p.xz);
    vec2 pc = p.xz - PAD_C;
    float s = (abs(pc.x) / PAD_H.x > abs(pc.y) / PAD_H.y) ? pc.y : pc.x;
    float dash = mix(step(0.35, fract(s * 2.4)), 1.0, uCleared);
    float line = smoothstep(0.04, 0.0, abs(sd));
    vec3 lc = mix(vec3(0.22, 0.74, 0.97), vec3(0.37, 0.95, 0.84), uCleared);
    m.emis += lc * line * dash * mix(0.55, 2.0, uCleared);
    m.emis += vec3(0.30, 0.95, 0.80) * uCleared * (smoothstep(0.0, -1.6, sd) * 0.05 + exp(-abs(sd) * 4.0) * 0.12);
    float wave = exp(-pow((sd + 0.3 - uPulse * 3.2) * 2.4, 2.0)) * (1.0 - uPulse) * step(0.001, uPulse);
    m.emis += vec3(0.37, 0.95, 0.84) * wave * 0.45;
    float edge = min(5.4 - abs(p.x), 3.4 - abs(p.z));
    m.emis += vec3(0.30, 0.90, 0.80) * smoothstep(0.07, 0.0, edge) * 0.45;
  } else {
    m.alb = vec3(0.012, 0.03, 0.06); m.rough = 0.3; m.metal = 0.35;
  }
  return m;
}

vec3 lighting(vec3 p, vec3 n, vec3 rd, Mat m, float ao, float sh) {
  vec3 v = -rd;
  float nv = max(dot(n, v), 0.0);
  float ndl = max(dot(n, KEY), 0.0);
  vec3 f0 = mix(vec3(0.04), m.alb, m.metal);
  vec3 fres = f0 + (1.0 - f0) * pow(1.0 - nv, 5.0) * (1.0 - m.rough * 0.75);
  vec3 diff = m.alb * (1.0 - m.metal);
  vec3 hemi = mix(vec3(0.13, 0.11, 0.10), vec3(0.17, 0.27, 0.46), smoothstep(-0.4, 0.8, n.y));
  vec3 col = diff * (vec3(1.0, 0.95, 0.88) * 2.2 * ndl * sh + hemi * ao * 0.95 + vec3(0.18, 0.85, 0.75) * max(dot(n, RIM), 0.0) * 0.5 * ao);
  vec3 r = reflect(rd, n);
  col += envMap(r, m.rough) * fres * mix(0.35, 1.0, ao) * mix(0.55, 1.0, sh);
  vec3 h = normalize(KEY + v);
  col += vec3(1.0, 0.95, 0.9) * pow(max(dot(n, h), 0.0), mix(320.0, 16.0, m.rough)) * mix(7.0, 0.7, m.rough) * sh * ndl * max(fres.g, 0.06);
  col += m.emis;
  return col;
}

vec3 lite(vec3 p, float id, vec3 rd) {
  vec3 n = calcNormal(p);
  Mat m = getMat(id, p, n);
  return lighting(p, n, rd, m, 0.85, 0.8);
}

vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }

vec4 backdrop(vec3 ro, vec3 rd) {
  if (rd.y > -0.0001) return vec4(0.0);
  float tt = (-1.1 - ro.y) / rd.y;
  vec3 pg = ro + rd * tt;
  float r = length((pg.xz - vec2(0.2, 0.0)) * vec2(0.82, 1.1));
  float sh = 0.55 * exp(-pow(r / 4.4, 2.0));
  float gl = 0.14 * exp(-pow(r / 6.2, 2.0)) * (0.6 + 0.8 * uCleared);
  return vec4(vec3(0.10, 0.72, 0.66) * gl, clamp(sh + gl, 0.0, 1.0));
}

void main() {
  vec2 fc = gl_FragCoord.xy;
  float sx = (fc.x - uRes.x * 0.5) / uF;
  float sy = (fc.y - uRes.y * 0.46) / uF;
  vec3 rd = normalize(uCamR * sx + uCamU * sy - uCamB);
  vec3 ro = uCamPos;

  vec3 bmin = vec3(-5.6, -0.8, -3.6), bmax = vec3(5.6, 6.5, 3.6);
  vec3 inv = 1.0 / rd;
  vec3 t0 = (bmin - ro) * inv, t1 = (bmax - ro) * inv;
  vec3 tmn = min(t0, t1), tmx = max(t0, t1);
  float tn = max(max(tmn.x, tmn.y), tmn.z), tf = min(min(tmx.x, tmx.y), tmx.z);
  vec4 bg = backdrop(ro, rd);
  if (tf <= max(tn, 0.0)) { outColor = bg; return; }

  float t = max(tn, 0.0);
  vec2 h = vec2(1e3, -1.0);
  bool hit = false;
  for (int i = 0; i < 110; i++) {
    h = map(ro + rd * t);
    if (h.x < 0.0005 * t) { hit = true; break; }
    t += h.x * 0.9;
    if (t > tf) break;
  }
  if (!hit) { outColor = bg; return; }

  vec3 p = ro + rd * t;
  vec3 n = calcNormal(p);
  Mat m = getMat(h.y, p, n);
  float ao = calcAO(p, n);
  float sh = calcShadow(p + n * 0.02, KEY);
  vec3 col = lighting(p, n, rd, m, ao, sh);

  if (h.y > 49.0 && n.y > 0.9) {
    vec3 rr = reflect(rd, n);
    vec3 o2 = p + n * 0.02;
    float t2 = 0.02; vec2 h2 = vec2(1e3, -1.0); bool hit2 = false;
    for (int i = 0; i < 44; i++) {
      h2 = map(o2 + rr * t2);
      if (h2.x < 0.002 + 0.0008 * t2) { hit2 = true; break; }
      t2 += h2.x;
      if (t2 > 14.0) break;
    }
    vec3 rc = hit2 ? lite(o2 + rr * t2, h2.y, rr) * exp(-t2 * 0.09) : envMap(rr, 0.35) * 0.25;
    float fr = 0.3 + 0.6 * pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
    col = mix(col, rc, fr);
  }

  col = aces(col * 0.95);
  col = pow(col, vec3(1.0 / 2.2));
  col += (hash12(fc) - 0.5) / 255.0;
  outColor = vec4(col, 1.0);
}`;

export function startClearOutGL(canvas: HTMLCanvasElement, opts: GLSceneOptions): (() => void) | null {
  const ctx = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance' });
  if (!ctx) return null;
  const gl: WebGL2RenderingContext = ctx;

  let prog: WebGLProgram | null = null;
  let loc: Record<string, WebGLUniformLocation | null> = {};
  let ready = false, failed = false, raf = 0, visible = true, lost = false;
  let W = 1, H = 1, scale = 1;
  let mx = 0, my = 0, smx = 0, smy = 0, lastCount = -1;
  let detach = () => {};
  const t0 = performance.now();
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const maxScale = Math.min(window.devicePixelRatio || 1, coarse ? 1.25 : 1.6);
  scale = maxScale;
  let acc = 0, frames = 0, last = 0;
  const ext = gl.getExtension('KHR_parallel_shader_compile') as { COMPLETION_STATUS_KHR: number } | null;
  const aBuf = new Float32Array(N * 4);
  const bBuf = new Float32Array(N * 4);

  const fail = () => {
    if (failed) return;
    failed = true;
    if (raf) cancelAnimationFrame(raf);
    opts.onFail();
  };

  const UNIFORMS = ['uRes', 'uF', 'uCamPos', 'uCamR', 'uCamU', 'uCamB', 'uCleared', 'uPulse', 'uDip', 'uA', 'uB'];

  const build = () => {
    const mk = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      return sh;
    };
    prog = gl.createProgram()!;
    gl.attachShader(prog, mk(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, mk(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    ready = false;
  };

  const checkReady = () => {
    if (ready || failed || !prog) return ready;
    if (ext && !gl.getProgramParameter(prog, ext.COMPLETION_STATUS_KHR)) return false;
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { fail(); return false; }
    loc = {};
    UNIFORMS.forEach((n) => { loc[n] = gl.getUniformLocation(prog!, n); });
    gl.useProgram(prog);
    gl.clearColor(0, 0, 0, 0);
    ready = true;
    return true;
  };

  const resize = () => {
    W = Math.max(1, canvas.clientWidth);
    H = Math.max(1, canvas.clientHeight);
    canvas.width = Math.max(2, Math.round(W * scale));
    canvas.height = Math.max(2, Math.round(H * scale));
    gl.viewport(0, 0, canvas.width, canvas.height);
    if (opts.reduced && ready) draw(0.4);
  };

  function draw(t: number) {
    if (!ready || lost) return;
    const cyc = t % CYCLE;
    smx += (mx - smx) * 0.06;
    smy += (my - smy) * 0.06;
    const yaw = -0.5 + smx * 0.28 + Math.sin(t * 0.3) * 0.1;
    const pitch = 0.68 + smy * 0.06;
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const Rv = [cy, 0, sy], Uv = [sp * sy, cp, -sp * cy], Bv = [-cp * sy, sp, cp * cy];
    const T = [0.1, 0.5, 0];
    const F = Math.min(W / 12.2, H / 8.8) * CAM_D * (canvas.width / W);

    let landed = 0, dip = 0;
    for (let i = 0; i < N; i++) {
      const it = ITEMS[i];
      const start = START + i * GAP;
      const u = clamp01((cyc - start) / DUR);
      const e = easeInOut(u);
      let x = it.home[0], y = 0, z = it.home[1], yw = it.yaw, sc = 1, tilt = 0;
      if (cyc >= start) {
        const lx = SKIP_X + it.land[0], lz = SKIP_Z + it.land[2];
        x = lerp(it.home[0], lx, e);
        z = lerp(it.home[1], lz, e);
        y = lerp(0, it.land[1] * 0.55 + 0.1, e) + 4 * 3.1 * u * (1 - u);
        yw = it.yaw + e * (Math.PI * (i % 2 ? 1.1 : -0.9));
        sc = lerp(1, SKIP_SCALE_IN, e);
        tilt = 0.5 * Math.sin(Math.PI * u) * (i % 2 ? 1 : -1);
      }
      if (cyc >= FADE_OUT && cyc < RESPAWN) sc = SKIP_SCALE_IN * (1 - easeInOut(clamp01((cyc - FADE_OUT) / 0.45)));
      if (cyc >= RESPAWN) {
        const k = clamp01((cyc - RESPAWN) / 0.6);
        x = it.home[0]; y = 0; z = it.home[1]; yw = it.yaw; sc = easeOutBack(k); tilt = 0;
      }
      aBuf.set([x, y, z, yw], i * 4);
      bBuf.set([sc, tilt, 0, 0], i * 4);
      if (cyc < FADE_OUT && cyc >= start + DUR * 0.92) landed++;
      const dt = cyc - (start + DUR);
      if (dt > 0 && cyc < FADE_OUT) dip += Math.exp(-dt * 7) * 0.09 * Math.cos(dt * 10);
    }
    if (landed !== lastCount) { lastCount = landed; opts.onCount(landed, N); }
    const tClear = START + (N - 1) * GAP + DUR;
    const cleared = cyc >= FADE_OUT ? 1 - easeInOut(clamp01((cyc - FADE_OUT) / 0.4)) : easeInOut(clamp01((cyc - (tClear - 0.15)) / 0.5));
    const pulse = cyc >= tClear && cyc < FADE_OUT ? clamp01((cyc - tClear) / 1.5) : 0;

    gl.uniform2f(loc.uRes, canvas.width, canvas.height);
    gl.uniform1f(loc.uF, F);
    gl.uniform3f(loc.uCamPos, T[0] + CAM_D * Bv[0], T[1] + CAM_D * Bv[1], T[2] + CAM_D * Bv[2]);
    gl.uniform3f(loc.uCamR, Rv[0], Rv[1], Rv[2]);
    gl.uniform3f(loc.uCamU, Uv[0], Uv[1], Uv[2]);
    gl.uniform3f(loc.uCamB, Bv[0], Bv[1], Bv[2]);
    gl.uniform1f(loc.uCleared, cleared);
    gl.uniform1f(loc.uPulse, pulse);
    gl.uniform1f(loc.uDip, dip);
    gl.uniform4fv(loc.uA, aBuf);
    gl.uniform4fv(loc.uB, bBuf);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  // Adaptive resolution: keep the frame rate smooth on weaker GPUs.
  const adapt = (dt: number) => {
    acc += dt; frames++;
    if (frames < 24) return;
    const avg = acc / frames;
    acc = 0; frames = 0;
    let next = scale;
    if (avg > 30 && scale > 0.5) next = Math.max(0.5, scale * 0.82);
    else if (avg < 17 && scale < maxScale) next = Math.min(maxScale, scale * 1.12);
    if (Math.abs(next - scale) > 0.01) { scale = next; resize(); }
  };

  const tick = () => {
    raf = requestAnimationFrame(tick);
    if (!visible || lost || failed) return;
    if (!checkReady()) return;
    const now = performance.now();
    if (last) adapt(Math.min(now - last, 100));
    last = now;
    draw((now - t0) / 1000);
  };

  const onMove = (e: PointerEvent) => {
    const r = opts.host.getBoundingClientRect();
    mx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2));
    my = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2));
  };
  const onLeave = () => { mx = 0; my = 0; };
  const onLost = (e: Event) => { e.preventDefault(); lost = true; };
  const onRestored = () => { lost = false; build(); resize(); };
  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('webglcontextrestored', onRestored);

  build();

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
  io.observe(canvas);
  resize();

  if (opts.reduced) {
    const wait = () => { if (checkReady()) { draw(0.4); } else if (!failed) raf = requestAnimationFrame(wait); };
    wait();
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
    if (raf) cancelAnimationFrame(raf);
    ro.disconnect();
    io.disconnect();
    detach();
    canvas.removeEventListener('webglcontextlost', onLost);
    canvas.removeEventListener('webglcontextrestored', onRestored);
    if (prog) gl.deleteProgram(prog);
  };
}
