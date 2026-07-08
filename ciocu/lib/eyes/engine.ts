// Framework-agnostic eye engine. Builds the two-eye SVG face into a container element and
// runs its own rAF loop. Ported from anime-eye-research/prototype (v4 "liquid-eye").
// Renderer-agnostic by design (research doc 04): React just mounts/unmounts it.

import { PRESETS, type Preset, type Routine, type StateName } from "./presets";

const NS = "http://www.w3.org/2000/svg";
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

const el = (n: string, a: Record<string, string | number> = {}): SVGElement => {
  const e = document.createElementNS(NS, n);
  for (const k in a) e.setAttribute(k, String(a[k]));
  return e as SVGElement;
};

// layout (viewBox units, 1600x900)
// CY raised well above the prototype's 486 so the eyes sit in the upper part of their region,
// leaving clear air above the (separate) caption band beneath them.
const CX = 800, CY = 400, GAP = 196;
const HALFW = 152, HALFH = 216, K = 0.72;
const MAXGX = 48, MAXGY = 40;
const PR = HALFW * 0.52, PY = HALFH * 0.08;

const DEFS = `
  <radialGradient id="bg" cx="50%" cy="42%" r="75%">
    <stop offset="0%" stop-color="#0d131d"/><stop offset="60%" stop-color="#080b12"/><stop offset="100%" stop-color="#04060a"/>
  </radialGradient>
  <radialGradient id="iris" cx="50%" cy="70%" r="80%">
    <stop offset="0%" stop-color="#f6ffff"/><stop offset="28%" stop-color="#b3f5ff"/><stop offset="60%" stop-color="#49d7f2"/><stop offset="85%" stop-color="#178fb8"/><stop offset="100%" stop-color="#0a4257"/>
  </radialGradient>
  <linearGradient id="irisTop" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#04203a" stop-opacity=".6"/><stop offset="45%" stop-color="#04203a" stop-opacity="0"/>
  </linearGradient>
  <radialGradient id="pupilG" cx="50%" cy="36%" r="68%">
    <stop offset="0%" stop-color="#0e4256"/><stop offset="42%" stop-color="#052734"/><stop offset="78%" stop-color="#02141d"/><stop offset="100%" stop-color="#010b12"/>
  </radialGradient>
  <radialGradient id="rim" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="#f4ffff"/><stop offset="55%" stop-color="#b8f8ff"/><stop offset="100%" stop-color="#b8f8ff" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="sheen" x1="0" y1="0" x2="0.7" y2="1">
    <stop offset="0%" stop-color="#ffffff" stop-opacity=".5"/><stop offset="45%" stop-color="#ffffff" stop-opacity="0"/>
  </linearGradient>
  <filter id="soft" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="5"/></filter>
  <filter id="bloom" x="-90%" y="-90%" width="280%" height="280%"><feGaussianBlur stdDeviation="20"/></filter>
  <filter id="spark" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="1.4"/></filter>
`;

interface SparkP { ang: number; rad: number; rrad: number; dr: number; spd: number; ph: number; drift: number }
interface BokP { ang: number; rad: number; rrad: number; spd: number; ph: number }

interface Eye {
  side: "L" | "R"; sign: number; g: SVGElement; clipPath: SVGElement; bloom: SVGElement;
  body: SVGElement; limbal: SVGElement; rim: SVGElement; pupil: SVGElement; refl: SVGElement;
  cat1: SVGElement; cat1b: SVGElement; cat2: SVGElement; star: SVGElement; sheen: SVGElement;
  topShade: SVGElement; ring1: SVGElement; ring2: SVGElement;
  sparks: (SVGElement & { _p: SparkP })[]; bok: SVGElement & { _p: BokP };
}

export interface EyeEngineHandle {
  setState: (name: StateName) => void;
  /** 0..1 live voice level (VAD) — brightens the glow while she's receiving you. */
  setVoiceLevel: (v: number) => void;
  destroy: () => void;
}

function starPath(cx: number, cy: number, R: number, r: number): string {
  const p: string[] = [];
  for (let i = 0; i < 8; i++) {
    const ang = (Math.PI / 4) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? R : r;
    p.push(`${(cx + Math.cos(ang) * rad).toFixed(1)} ${(cy + Math.sin(ang) * rad).toFixed(1)}`);
  }
  return "M" + p.join(" L") + " Z";
}

function eyePath(w: number, topH: number, botH: number): string {
  const kt = topH * K, kb = botH * K, kw = w * K;
  return (
    `M 0 ${-topH}` +
    ` C ${kw} ${-topH} ${w} ${-kt} ${w} 0` +
    ` C ${w} ${kb} ${kw} ${botH} 0 ${botH}` +
    ` C ${-kw} ${botH} ${-w} ${kb} ${-w} 0` +
    ` C ${-w} ${-kt} ${-kw} ${-topH} 0 ${-topH} Z`
  );
}

export function createEyeEngine(container: HTMLElement): EyeEngineHandle {
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 1600 900");
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.setAttribute("aria-label", "Ciocu's eyes");
  svg.setAttribute("role", "img");
  svg.style.width = "100%";
  svg.style.height = "100%";
  svg.style.display = "block";
  // No opaque background rect: the page-level CSS radial shows through, so there is never a
  // visible 16:9 seam when the SVG is letterboxed inside the eye region.
  svg.innerHTML = `<defs>${DEFS}</defs>` + `<g id="eyes"></g>`;
  container.appendChild(svg);

  const eyesG = svg.querySelector("#eyes") as SVGGElement;
  eyesG.style.transition = "filter 600ms ease";
  eyesG.style.willChange = "filter";

  function buildEye(side: "L" | "R"): Eye {
    const sign = side === "L" ? -1 : 1;
    const g = el("g", { class: "eye" });
    const clipId = "clip" + side;
    const clip = el("clipPath", { id: clipId });
    const clipPath = el("path", {});
    clip.appendChild(clipPath);
    g.appendChild(clip);

    const bloom = el("path", { fill: "#37e6ff", filter: "url(#bloom)", opacity: ".55" });
    const body = el("path", { fill: "url(#iris)" });
    const inner = el("g", { "clip-path": `url(#${clipId})` });

    const topShade = el("ellipse", { cx: 0, cy: -HALFH * 0.5, rx: HALFW * 1.15, ry: HALFH * 0.72, fill: "url(#irisTop)" });
    const ring1 = el("ellipse", { cx: 0, cy: 6, rx: HALFW * 0.66, ry: HALFH * 0.66, fill: "none", stroke: "#eafcff", "stroke-width": 2, opacity: ".07" });
    const ring2 = el("ellipse", { cx: 0, cy: 10, rx: HALFW * 0.42, ry: HALFH * 0.42, fill: "none", stroke: "#eafcff", "stroke-width": 2, opacity: ".05" });
    const rim = el("ellipse", { cx: 0, cy: HALFH * 0.5, rx: HALFW * 0.7, ry: HALFH * 0.22, fill: "url(#rim)", filter: "url(#soft)", opacity: ".9" });
    const pupil = el("ellipse", { cx: 0, cy: PY, rx: PR, ry: PR, fill: "url(#pupilG)" });
    const refl = el("ellipse", { cx: 0, cy: PY + PR * 0.5, rx: PR * 0.58, ry: PR * 0.3, fill: "#9df7ff", opacity: ".22", filter: "url(#soft)" });
    const c1x = -sign * PR * 0.32, c1y = PY - PR * 0.42;
    const cat1 = el("ellipse", { cx: c1x, cy: c1y, rx: PR * 0.42, ry: PR * 0.5, fill: "#ffffff", transform: `rotate(${sign * 14} ${c1x} ${c1y})`, opacity: ".99" });
    const cat1b = el("ellipse", { cx: c1x, cy: c1y, rx: PR * 0.42, ry: PR * 0.5, fill: "#ffffff", filter: "url(#spark)", opacity: ".5", transform: `rotate(${sign * 14} ${c1x} ${c1y})` });
    const cat2 = el("circle", { cx: sign * PR * 0.34, cy: PY + PR * 0.44, r: PR * 0.16, fill: "#ffffff", opacity: ".92" });
    const star = el("path", { d: starPath(-sign * HALFW * 0.34, -HALFH * 0.4, 13, 5), fill: "#ffffff", opacity: ".85", filter: "url(#spark)" });
    const sheen = el("ellipse", { cx: -sign * 20, cy: -HALFH * 0.5, rx: HALFW * 0.7, ry: HALFH * 0.32, fill: "url(#sheen)", opacity: ".5" });

    const sparks: (SVGElement & { _p: SparkP })[] = [];
    for (let i = 0; i < 7; i++) {
      const s = el("circle", { r: rnd(1.6, 4.2), fill: "#f6ffff", filter: "url(#spark)" }) as SVGElement & { _p: SparkP };
      s._p = { ang: rnd(0, Math.PI * 2), rad: rnd(HALFW * 0.28, HALFW * 0.82), rrad: rnd(HALFH * 0.28, HALFH * 0.78), dr: rnd(2, 7), spd: rnd(0.5, 1.5), ph: rnd(0, 6.28), drift: rnd(0.2, 0.6) * (Math.random() < 0.5 ? -1 : 1) };
      sparks.push(s);
    }
    const bok = el("circle", { r: rnd(10, 16), fill: "#bff6ff", filter: "url(#bloom)", opacity: ".25" }) as SVGElement & { _p: BokP };
    bok._p = { ang: rnd(0, 6.28), rad: HALFW * 0.5, rrad: HALFH * 0.5, spd: 0.4, ph: rnd(0, 6.28) };

    inner.append(topShade, ring1, ring2, rim, pupil, refl, sheen, bok, cat2, cat1b, cat1, star, ...sparks);
    const limbal = el("path", { fill: "none", stroke: "#063b4a", "stroke-width": 7, opacity: ".55" });

    g.append(bloom, body, inner, limbal);
    eyesG.appendChild(g);
    return { side, sign, g, clipPath, bloom, body, limbal, rim, pupil, refl, cat1, cat1b, cat2, star, sheen, topShade, ring1, ring2, sparks, bok };
  }

  const eyeL = buildEye("L"), eyeR = buildEye("R");

  // animation state
  let cur: Preset = JSON.parse(JSON.stringify(PRESETS.neutral));
  let tgt: Preset = PRESETS.neutral;
  const curGaze = { x: 0, y: 0 }, mouse = { x: 0, y: 0 };
  let mouseActive = false, mouseT = 0;
  const sacc = { x: 0, y: 0 }; let saccTgt = { x: 0, y: 0 }, nextSacc = 0;
  const micro = { x: 0, y: 0 }; let microTgt = { x: 0, y: 0 }, nextMicro = 0;
  const head = { x: 0, y: 0 }; let headTgt = { x: 0, y: 0 }, nextHead = 0;
  const blink = [1, 1]; const blinkTgt = [1, 1]; let nextBlink = 1.2, blinkPhase = 0;
  const dyn = { nodY: 0, converge: 0, swoon: 0 };
  interface Transient { t: number; d: number; f: (p: number) => void; end?: () => void; loop?: boolean }
  const transients: Transient[] = [];
  let pulseOn = false;
  let voiceLevel = 0, voiceTarget = 0; // VAD glow (set from the gated mic)
  let gtStore = 0;
  const t0 = performance.now();
  let raf = 0;

  function runRoutine(kind: Routine) {
    pulseOn = false;
    const now = (performance.now() - t0) / 1000;
    if (kind === "nod") transients.push({ t: now, d: 0.9, f: (p) => { dyn.nodY = Math.sin(p * Math.PI * 2) * 34 * (1 - p * 0.4); } });
    else if (kind === "bounce") transients.push({ t: now, d: 0.6, f: (p) => { dyn.nodY = -Math.sin(p * Math.PI) * 22 * (1 - p); } });
    else if (kind === "pop") { blinkTgt[0] = blinkTgt[1] = 1.12; transients.push({ t: now, d: 0.35, f: () => {}, end: () => { blinkTgt[0] = blinkTgt[1] = 1; } }); }
    else if (kind === "swoon") transients.push({ t: now, d: 2.2, loop: true, f: (p) => { dyn.swoon = Math.sin(p * Math.PI * 2) * 10; } });
    else if (kind === "wink") { blinkTgt[1] = 0.05; transients.push({ t: now, d: 0.42, f: () => {}, end: () => { blinkTgt[1] = 1; } }); }
    else if (kind === "converge") transients.push({ t: now, d: 0.6, f: (p) => { dyn.converge = p * 14; } });
    else if (kind === "pulse") pulseOn = true;
  }

  function setState(name: StateName) {
    if (!PRESETS[name]) return;
    tgt = PRESETS[name];
    eyesG.style.filter = `hue-rotate(${tgt.hue}deg) saturate(${tgt.sat})`;
    dyn.converge = 0; dyn.swoon = 0;
    if (tgt.enter) runRoutine(tgt.enter);
  }

  function renderEye(E: Eye, t: number, glow: number) {
    const cx = CX + E.sign * GAP;
    const jit = cur.jitter ? Math.sin(t * 22 + E.sign) * cur.jitter + rnd(-0.3, 0.3) * cur.jitter : 0;
    const cy = CY + dyn.nodY + dyn.swoon + jit;
    const b = blink[E.side === "L" ? 0 : 1];

    const topH = Math.max(6, HALFH * cur.open * cur.topBend * b);
    let botH = HALFH * cur.open * cur.botBend * b;
    if (botH >= 0) botH = Math.max(6, botH); else botH = Math.min(-4, botH);
    const w = HALFW * (0.94 + 0.06 * cur.open);

    const d = eyePath(w, topH, botH);
    E.body.setAttribute("d", d);
    E.clipPath.setAttribute("d", d);
    E.limbal.setAttribute("d", d);
    E.bloom.setAttribute("d", d);
    E.bloom.setAttribute("opacity", String(clamp(0.35 * glow, 0, 0.9)));

    const shadeY = (topH / (HALFH * 0.94)).toFixed(3);
    E.topShade.setAttribute("transform", `scale(1 ${shadeY})`);

    const tilt = cur.tilt * (E.side === "L" ? 1 : -1);
    E.g.setAttribute("transform", `translate(${cx} ${cy}) rotate(${tilt})`);

    const gx = curGaze.x * MAXGX, gy = curGaze.y * MAXGY;
    const conv = dyn.converge * (E.side === "L" ? 1 : -1);
    const px = gx + conv, py = gy;
    E.pupil.setAttribute("transform", `translate(${px} ${py}) scale(${cur.pupil})`);
    E.refl.setAttribute("transform", `translate(${px} ${py}) scale(${cur.pupil})`);
    E.rim.setAttribute("transform", `translate(${gx * 0.5} ${gy * 0.5})`);
    E.ring1.setAttribute("transform", `translate(${gx * 0.15} ${gy * 0.15})`);
    E.ring2.setAttribute("transform", `translate(${gx * 0.25} ${gy * 0.25})`);
    const c1x = -E.sign * PR * 0.32, c1y = PY - PR * 0.42, c1rot = E.sign * 14;
    E.cat1.setAttribute("transform", `translate(${px * 0.9} ${py * 0.9}) rotate(${c1rot} ${c1x} ${c1y})`);
    E.cat1b.setAttribute("transform", `translate(${px * 0.9} ${py * 0.9}) rotate(${c1rot} ${c1x} ${c1y})`);
    E.cat2.setAttribute("transform", `translate(${px * 0.86} ${py * 0.86})`);
    E.sheen.setAttribute("transform", `translate(${gx * 0.1} ${gy * 0.1}) scale(1 ${shadeY})`);
    const sx = -E.sign * HALFW * 0.34, sy = -HALFH * 0.4;
    E.star.setAttribute("transform", `translate(${gx * 0.3} ${gy * 0.3}) rotate(${(t * 26) % 360} ${sx} ${sy})`);
    E.star.setAttribute("opacity", String((0.35 + 0.5 * Math.abs(Math.sin(t * 1.3 + E.sign))) * clamp(b, 0, 1)));

    for (const s of E.sparks) {
      const p = s._p;
      const a = p.ang + t * p.drift * 0.4;
      const dx = Math.cos(a) * p.rad + Math.cos(t * p.spd + p.ph) * p.dr + gx * 0.2;
      const dy = Math.sin(a) * p.rrad + Math.sin(t * p.spd + p.ph) * p.dr + gy * 0.2;
      s.setAttribute("cx", String(dx)); s.setAttribute("cy", String(dy));
      s.setAttribute("opacity", String((0.28 + 0.72 * Math.abs(Math.sin(t * p.spd * 1.7 + p.ph))) * clamp(b, 0, 1)));
    }
    const bp = E.bok._p;
    E.bok.setAttribute("cx", String(Math.cos(t * bp.spd + bp.ph) * bp.rad * 0.6 + gx * 0.15));
    E.bok.setAttribute("cy", String(Math.sin(t * bp.spd + bp.ph) * bp.rrad * 0.6 + gy * 0.15));

    E.rim.setAttribute("opacity", String(clamp(0.5 * glow, 0, 1)));
    E.limbal.setAttribute("opacity", "0.55");
  }

  let last = 0;
  function frame(now: number) {
    const t = (now - t0) / 1000;
    last = now;

    const s = tgt.speed;
    for (const k of ["open", "topBend", "botBend", "tilt", "pupil", "glow", "gtilt", "jitter"] as const)
      cur[k] = lerp(cur[k], tgt[k], s);
    cur.gaze.x = lerp(cur.gaze.x, tgt.gaze.x, s);
    cur.gaze.y = lerp(cur.gaze.y, tgt.gaze.y, s);

    let gx = cur.gaze.x, gy = cur.gaze.y;
    if (now / 1000 > nextMicro) { microTgt = { x: rnd(-0.05, 0.05), y: rnd(-0.02, 0.02) }; nextMicro = now / 1000 + rnd(0.4, 1.3); }
    micro.x = lerp(micro.x, microTgt.x, 0.18); micro.y = lerp(micro.y, microTgt.y, 0.18);
    const tremorX = Math.sin(t * 6.7) * 0.006 + Math.sin(t * 10.9) * 0.004;
    if (tgt.mode === "wander") {
      gx += Math.sin(t * 0.7) * 0.5; gy += Math.sin(t * 0.53) * 0.35 - 0.15;
    } else if (tgt.mode === "lock") {
      gx += micro.x * 0.7 + tremorX; gy += micro.y * 0.7;
      if (mouseActive) { gx += mouse.x * 0.35; gy += mouse.y * 0.3; }
    } else {
      if (now / 1000 > nextSacc) { saccTgt = { x: rnd(-0.14, 0.14), y: rnd(-0.12, 0.12) }; nextSacc = now / 1000 + rnd(1.8, 5); }
      sacc.x = lerp(sacc.x, saccTgt.x, 0.03); sacc.y = lerp(sacc.y, saccTgt.y, 0.03);
      if (mouseActive && now - mouseT < 2500) { gx += mouse.x * 0.7 + micro.x * 0.6 + tremorX; gy += mouse.y * 0.6 + micro.y * 0.6; }
      else { gx += sacc.x + micro.x + tremorX; gy += sacc.y + micro.y; }
    }
    curGaze.x = lerp(curGaze.x, clamp(gx, -1, 1), 0.15);
    curGaze.y = lerp(curGaze.y, clamp(gy, -1, 1), 0.15);

    if (t > nextBlink) { blinkPhase = t; nextBlink = t + rnd(2.6, 6.2) * tgt.blinkS; }
    const bp = t - blinkPhase;
    let bshape = 1;
    const closeT = 0.09, openT = 0.16 * tgt.blinkS;
    if (bp < closeT) bshape = 1 - bp / closeT;
    else if (bp < closeT + openT) bshape = (bp - closeT) / openT;
    else bshape = 1;
    bshape = clamp(bshape, 0.04, 1);
    for (let e = 0; e < 2; e++) blink[e] = lerp(blink[e], Math.min(blinkTgt[e], bshape), 0.5);

    dyn.nodY = lerp(dyn.nodY, 0, 0.06);
    for (let i = transients.length - 1; i >= 0; i--) {
      const tr = transients[i];
      let p = (t - tr.t) / tr.d;
      if (p >= 1) { if (tr.loop) { tr.t = t; p = 0; } else { tr.end?.(); transients.splice(i, 1); continue; } }
      tr.f(clamp(p, 0, 1));
    }

    const breathe = 1 + Math.sin(t * 1.6) * 0.06;
    let glow = cur.glow * breathe;
    if (pulseOn) glow *= 1 + Math.abs(Math.sin(t * 3.4)) * 0.18;
    voiceLevel = lerp(voiceLevel, voiceTarget, 0.3);
    if (voiceLevel > 0.001) glow *= 1 + voiceLevel * 0.5;

    renderEye(eyeL, t, glow);
    renderEye(eyeR, t, glow);

    if (t > nextHead) { headTgt = { x: rnd(-1, 1) * 30, y: rnd(-1, 1) * 2 }; nextHead = t + rnd(2.4, 5.5); }
    head.x = lerp(head.x, headTgt.x, 0.025); head.y = lerp(head.y, headTgt.y, 0.025);
    const swayX = head.x + Math.sin(t * 0.55) * 34, swayY = head.y + Math.sin(t * 0.4) * 1.2;
    gtStore = lerp(gtStore, cur.gtilt, 0.12);
    eyesG.setAttribute("transform", `translate(${swayX.toFixed(2)} ${swayY.toFixed(2)}) rotate(${gtStore} ${CX} ${CY})`);

    raf = requestAnimationFrame(frame);
  }

  function onPointerMove(e: PointerEvent) {
    const r = container.getBoundingClientRect();
    mouse.x = clamp((e.clientX - (r.left + r.width / 2)) / (r.width / 2), -1, 1);
    mouse.y = clamp((e.clientY - (r.top + r.height / 2)) / (r.height / 2), -1, 1);
    mouseActive = true; mouseT = performance.now();
  }
  window.addEventListener("pointermove", onPointerMove);

  setState("neutral");
  raf = requestAnimationFrame(frame);
  void last;

  return {
    setState,
    setVoiceLevel(v: number) {
      voiceTarget = clamp(v, 0, 1);
    },
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointerMove);
      svg.remove();
    },
  };
}
