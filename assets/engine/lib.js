/* =====================================================================
   motion-base · motor de cenas (HTML determinístico → vídeo)
   Cada cena: SCENES[id] = { dur, kind, format?, draw(t) → { cam, w, hud } }
   draw(t) é determinística: o mesmo t dá sempre o mesmo quadro (o renderizador chama render(t) quadro a quadro).
   Medidas em "unidades de design" = px do formato de referência (padrão 3840 × 2160); q(n) converte para cqw,
   então a peça escala sozinha para 640 px ou 3840 px. Outro formato: format:[1080,1920] na cena (9:16), [1080,1080] (1:1).
   Câmera sem blur de movimento e sem deriva: parada = parada (o editor emenda trechos).
   ===================================================================== */
var raf = 0;
const SCENES = {};

/* ---------- formato e unidades ---------- */
const FORMAT = { w: 3840, h: 2160 };          // unidades de design da cena que está sendo desenhada
let CX = 1920, CY = 1080, PX = 1;             // centro do quadro; PX = pixels de tela por unidade de design (para travar no pixel)
const q = n => (n / (FORMAT.w / 100)).toFixed(3) + 'cqw';
function setFormat(w, h) { FORMAT.w = w; FORMAT.h = h; CX = w / 2; CY = h / 2; }

/* ---------- matemática e easing ---------- */
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = x => Math.min(1, Math.max(0, x));
const prog = (t, a, b) => clamp((t - a) / (b - a));
function bezier(x1, y1, x2, y2) {            // = cubic-bezier() do CSS
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = s => ((ax * s + bx) * s + cx) * s, Y = s => ((ay * s + by) * s + cy) * s;
  return p => { if (p <= 0) return 0; if (p >= 1) return 1; let lo = 0, hi = 1, s = p; for (let i = 0; i < 40; i++) { s = (lo + hi) / 2; X(s) < p ? lo = s : hi = s; } return Y(s); };
}
/* três curvas, cada uma com um papel — nada de linear nem ease-in-out genérico */
const EASE = {
  soft: bezier(0.16, 1, 0.3, 1),               // expo out: entradas de texto/UI (padrão). Arranque vivo, pouso longo e macio
  io:   bezier(0.65, 0, 0.35, 1),              // revelações (pílula, wipe): entra e assenta
  slow: bezier(0.529, -0.008, 0, 1.005)        // câmera e transições: arranque lento, pouso longo
};
const ease = EASE.soft;                        // easing padrão das entradas
const win = (t, a, b, e = ease) => e(prog(t, a, b));
const wcam = (t, a, b) => EASE.slow(prog(t, a, b));   // janela com o easing da câmera

/* ---------- entradas: fade + blur vindo de um lado (sem scale bounce) ----------
   ANTI-FLICKER: a cauda do easing são frações de pixel que fazem o texto pular de pixel em pixel (e, em render
   paralelo, cada processo rasteriza com uma fase diferente). Por isso: deslocamento em pixels INTEIROS de tela,
   blur some abaixo de 0,3 px e, quando falta menos de 0,5 px, trava no estado final (devolve '' = sem transform). */
const snap = v => Math.round(v * PX) / PX;
function inS(t, a, d = .9, dx = 0, dy = 60, bl = 22, sc = 1) {
  let p = win(t, a, a + d); if (p <= 0) return 'opacity:0;';
  const amp = Math.max(Math.abs(dx), Math.abs(dy), bl) * PX;
  if (p >= 1 || (amp > 0 && (1 - p) * amp < .5)) return '';
  const b = (1 - p) * bl * PX;
  return `opacity:${Math.min(1, p * 1.5).toFixed(3)};transform:translate(${q(snap((1 - p) * dx))},${q(snap((1 - p) * dy))})${sc === 1 ? '' : ` scale(${lerp(sc, 1, p).toFixed(4)})`};${b > .3 ? `filter:blur(${q((1 - p) * bl)});` : ''}`;
}
/* texto palavra a palavra: cada palavra é inline-block (para o transform valer) e todas existem desde o início com
   opacity 0, então o texto centralizado não "pula" a cada palavra nova. times = instantes de cada palavra (ou passo fixo) */
function words(t, txt, a, step = .12, o = {}) {
  const { d = .9, dy = 46, bl = 20, dx = 0, hl = {}, cls = '' } = o;
  return txt.split(' ').map((w, i) => {
    const at = Array.isArray(a) ? a[i] : a + i * step;
    return `<span class="${cls}" style="display:inline-block;${inS(t, at, d, dx, dy, bl)}${hl[i] ? hl[i] : ''}">${w}</span>`;
  }).join(' ');
}
/* valor que muda por evento: o antigo sobe e some, o novo vem de baixo (mesmo grid-area: o layout não pula) */
function swap(t, a, oldH, newH, d = .75, dy = 56, bl = 18) {
  const p = win(t, a, a + d), amp = Math.max(dy, bl) * PX;
  if (p >= 1 || (p > 0 && (1 - p) * amp < .5)) return `<span style="display:grid"><span style="grid-area:1/1">${newH}</span></span>`;
  const o = `opacity:${(1 - clamp(p * 2)).toFixed(3)};transform:translateY(${q(snap(-p * dy))});${p * bl * PX > .3 ? `filter:blur(${q(p * bl)});` : ''}`;
  const n = `opacity:${clamp(p * 1.5).toFixed(3)};transform:translateY(${q(snap((1 - p) * dy))});${(1 - p) * bl * PX > .3 ? `filter:blur(${q((1 - p) * bl)});` : ''}`;
  return `<span style="display:grid"><span style="grid-area:1/1;${p >= 1 ? 'visibility:hidden' : o}">${oldH}</span><span style="grid-area:1/1;${p <= 0 ? 'opacity:0' : n}">${newH}</span></span>`;
}
const counter = (t, a, b, final, dec = 0) => +(final * win(t, a, b)).toFixed(dec);   // contador com o easing da peça (use tabular-nums)
const nf = (loc = 'pt-BR', o = {}) => n => new Intl.NumberFormat(loc, o).format(n);   // formate no IDIOMA do vídeo

/* ---------- posicionamento ---------- */
const at = (x, y, html = '', st = '', cls = '') => `<div class="at ${cls}" style="left:${q(x)};top:${q(y)};${st}">${html}</div>`;   // pelo CENTRO; cls 'l' = esquerda, 'r' = direita
const disc = (x, y, d, st) => at(x, y, '', `width:${q(d)};height:${q(d)};border-radius:50%;${st}`);
const geo = inner => `<svg class="geo" viewBox="0 0 ${FORMAT.w} ${FORMAT.h}">${inner}</svg>`;
const pol = (cx, cy, r, deg) => { const a = deg * Math.PI / 180; return [cx + r * Math.sin(a), cy - r * Math.cos(a)]; };
const arc = (cx, cy, r, a0, a1) => { const [x0, y0] = pol(cx, cy, r, a0), [x1, y1] = pol(cx, cy, r, a1); return `M${x0.toFixed(1)} ${y0.toFixed(1)}A${r} ${r} 0 ${(a1 - a0) > 180 ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`; };
const chip = (t, s = 1) => `<span class="chip" style="font-size:${q(42 * s)};height:${q(112 * s)};padding:0 ${q(44 * s)};border-radius:${q(12 * s)}">${t}</span>`;
const lab = (txt, size, col = 'var(--fg-dim)', wt = 300) => `<span class="sans" style="font-size:${q(size)};font-weight:${wt};color:${col}">${txt}</span>`;
const big = (txt, size, cls = 'serif tglow', st = '') => `<span class="${cls}" style="font-size:${q(size)};line-height:1;${st}">${txt}</span>`;

/* ---------- brilhos sem banding ---------- */
/* perfil macio: (1−t)^p, centro arredondado e fim com inclinação zero (degradê de 3 pontos tem quina no meio e borda dura = anel visível) */
const cone = (t, p) => { if (t >= 1) return 0; const e = .06, tt = (Math.hypot(t, e) - e) / (Math.hypot(1, e) - e); return Math.pow(1 - tt, p); };
const SOFT = (rgb, a0, p = 1.5, n = 24) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n; return `rgba(${rgb},${(a0 * cone(t, p)).toFixed(4)}) ${(t * 100).toFixed(2)}%`; }).join(',');
/* brilhos grandes como TEXTURA com dither no canal alfa (um degradê CSS vira camada de 8 bits com degraus de 1/255 = banding).
   BRANCO/NEUTRO de propósito (R=G=B): o Chrome guarda cor pré-multiplicada em 8 bits e, com alfa baixo, cor com tom quantiza o
   matiz em degraus (anéis de croma). O tom vem do fundo (canvas, ponto flutuante) e de elementos opacos. */
const _hash = (x, y, s) => { let h = Math.imul(x + 1, 0x27d4eb2d) ^ Math.imul(y + 1, 0x165667b1) ^ Math.imul(s + 1, 0x9e3779b1); h = Math.imul(h ^ h >>> 15, 0x85ebca6b); h = Math.imul(h ^ h >>> 13, 0xc2b2ae35); return (h ^ h >>> 16) >>> 0; };
const _tpdf = (x, y, s) => { const h = _hash(x, y, s); return (h & 0xffff) / 65536 - (h >>> 16) / 65536; };
const DITHER_AMP = 1.7;   // níveis de pico (TPDF); 1 = mínimo teórico, mais vira grão fino
function glowTex(name, rgb, a0, p, N = 1024) {
  const cv = document.createElement('canvas'); cv.width = cv.height = N; const ctx = cv.getContext('2d'), im = ctx.createImageData(N, N), d = im.data, [R, G, B] = rgb.split(',').map(Number);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const o = (y * N + x) * 4, a = 255 * a0 * cone(Math.hypot(x + .5 - N / 2, y + .5 - N / 2) / (N / 2), p);
    d[o] = R; d[o + 1] = G; d[o + 2] = B; d[o + 3] = Math.max(0, Math.min(255, Math.floor(a + .5 + DITHER_AMP * _tpdf(x, y, 7))));
  }
  ctx.putImageData(im, 0, 0);
  document.documentElement.style.setProperty('--g-' + name, `url(${cv.toDataURL('image/png')})`);
}
glowTex('halo', '255,255,255', .40, 1.5);
const GLOWBG = n => `background:var(--g-${n}) center/100% 100% no-repeat`;
const HALO = a => `${GLOWBG('halo')};opacity:${Math.min(1, a * .22 / .40).toFixed(4)}`;

/* ---------- câmera ----------
   keys = [ camInicial, [a, b, {campos}], ... ]; fx,fy = ponto do mundo; ax,ay = onde esse ponto cai na tela (padrão: centro); z = zoom (log). */
function camK(t, keys) {
  let c = Object.assign({ fx: CX, fy: CY, z: 1, ax: CX, ay: CY }, keys[0]);
  for (let i = 1; i < keys.length; i++) {
    const [a, b, k] = keys[i], p = wcam(t, a, b); if (p <= 0) break; const n = Object.assign({}, c, k);
    c = { fx: lerp(c.fx, n.fx, p), fy: lerp(c.fy, n.fy, p), ax: lerp(c.ax, n.ax, p), ay: lerp(c.ay, n.ay, p), z: Math.exp(lerp(Math.log(c.z), Math.log(n.z), p)) };
  }
  return c;
}
/* câmera "de After": gira (yaw/pitch, sem roll) PROPORCIONAL À VELOCIDADE; parada = zero. Sem órbita, deriva ou shake. */
function cam3(t, keys) {
  const c = camK(t, keys), e = 1 / 60, a = camK(t - e, keys), b = camK(t + e, keys), cl = (x, m) => Math.max(-m, Math.min(m, x));
  const k = FORMAT.w / 3840;   // velocidades em unidades de 4K
  const vx = ((b.fx - a.fx) / (2 * e) * c.z - (b.ax - a.ax) / (2 * e)) / k, vy = ((b.fy - a.fy) / (2 * e) * c.z - (b.ay - a.ay) / (2 * e)) / k;
  c.ry = cl(vx / 230, 22); c.rx = cl(-vy / 260, 15);
  return c;
}

/* ---------- cursor humano (coordenadas de TELA, por keyframes [t, x, y]; pernas com o mesmo ponto = pausa) ---------- */
const curPos = (t, CUR) => { for (let i = 0; i < CUR.length - 1; i++) { const a = CUR[i], b = CUR[i + 1];
  if (t <= b[0]) { const p = win(t, a[0], b[0], EASE.slow), arc = (a[1] === b[1] && a[2] === b[2]) ? 0 : Math.sin(Math.PI * p) * 46;
    return [lerp(a[1], b[1], p) + arc * .4, lerp(a[2], b[2], p) - arc]; } } const l = CUR[CUR.length - 1]; return [l[1], l[2]]; };
const cursorEl = (x, y, dark = true, press = 0) => `<svg viewBox="0 0 36 55" style="position:absolute;left:${q(x)};top:${q(y)};width:${q(36 * 1.9)};height:${q(55 * 1.9)};transform:scale(${(1 - .13 * press).toFixed(3)});transform-origin:0 0;overflow:visible;filter:drop-shadow(0 ${q(6)} ${q(14)} rgba(0,0,0,${dark ? .6 : .28}))"><path d="M0 0L0 44L11 34L20 55L29 51L20 31L36 31Z" fill="${dark ? '#fff' : '#141413'}" stroke="${dark ? '#0d0d0d' : '#fff'}" stroke-width="2"/></svg>`;

/* ---------- aleatório determinístico ---------- */
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ---------- fundo: calculado em ponto flutuante e quantizado com dither TPDF ----------
   Degradê CSS + ruído por cima não resolve banding (o degradê já saiu em degraus). Aqui o ruído entra ANTES do arredondamento.
   Troque as cores do projeto em TOKENS (RGB 0-255). kind: 'dark' | 'light' (+ 'btm' = brilho vindo de baixo). */
const TOKENS = {
  dark:  { a: [52, 55, 62], b: [11, 12, 14], glow: [170, 185, 210], glowA: .5 },
  light: { base: [240, 240, 237], white: [255, 255, 255], glow: [190, 200, 218], glowA: .38 }
};
function paintBg(root) {
  const host = root.querySelector('.bg'); if (!host) return;
  const W = Math.round(root.clientWidth * (window.devicePixelRatio || 1)), H = Math.round(W * FORMAT.h / FORMAT.w);
  if (W < 8) return;
  let cv = host.querySelector('canvas'); if (!cv) { cv = document.createElement('canvas'); cv.className = 'bgc'; host.insertBefore(cv, host.firstChild); }
  if (cv.width === W && cv.height === H && cv.dataset.k === root.className) return;
  cv.width = W; cv.height = H; cv.dataset.k = root.className;
  const ctx = cv.getContext('2d'), img = ctx.createImageData(W, H), d = img.data;
  const dark = root.classList.contains('dark'), btm = root.classList.contains('btm'), T = TOKENS;
  const el = (px, py, cx, cy, rx, ry) => Math.hypot((px - cx) / rx, (py - cy) / ry);
  for (let y = 0; y < H; y++) {
    const py = (y + .5) / H;
    for (let x = 0; x < W; x++) {
      const px = (x + .5) / W, o = (y * W + x) * 4; let r, g, b;
      if (dark) {
        const tb = Math.min(1, el(px, py, .687, 1.537, 1.15, 1.5)), D = T.dark;
        const gl = D.glowA * cone(btm ? el(px, py, .5, 1.1, .44, .44) : el(px, py, .5, -.08, .36, .46), 1.5);
        r = lerp(D.a[0], D.b[0], tb) + D.glow[0] * gl; g = lerp(D.a[1], D.b[1], tb) + D.glow[1] * gl; b = lerp(D.a[2], D.b[2], tb) + D.glow[2] * gl;
      } else {
        const L = T.light, wh = cone(el(px, py, .5, 1.16, .7, .55) / .7, 1.3), go = L.glowA * cone(el(px, py, .5, -.1, .44, .5), 1.6);
        r = lerp(L.base[0], L.white[0], wh); g = lerp(L.base[1], L.white[1], wh); b = lerp(L.base[2], L.white[2], wh);
        r += (L.glow[0] - r) * go; g += (L.glow[1] - g) * go; b += (L.glow[2] - b) * go;
      }
      d[o] = Math.max(0, Math.min(255, Math.floor(r + .5 + DITHER_AMP * _tpdf(x, y, 1))));
      d[o + 1] = Math.max(0, Math.min(255, Math.floor(g + .5 + DITHER_AMP * _tpdf(x, y, 2))));
      d[o + 2] = Math.max(0, Math.min(255, Math.floor(b + .5 + DITHER_AMP * _tpdf(x, y, 3))));
      d[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

/* ---------- montagem ---------- */
const GRAIN_FPS = 24;   // o grão (ruído suave) muda GRAIN_FPS vezes por segundo; 0 = parado
function mount(root, id) {
  const S = SCENES[id], fmt = S.format || [3840, 2160];
  const useFormat = () => { setFormat(fmt[0], fmt[1]); PX = root.clientWidth * (window.devicePixelRatio || 1) / fmt[0]; };
  useFormat();
  root.className = 'frame ' + S.kind + (S.nogrid ? ' nogrid' : '');
  root.style.setProperty('--fw', fmt[0]); root.style.setProperty('--fh', fmt[1]);
  root.innerHTML = `<div class="bg"></div><div class="view"></div><div class="grain"></div>`;
  paintBg(root);
  const view = root.querySelector('.view'), grain = root.querySelector('.grain');
  const lay = d => { const c = Object.assign({ fx: CX, fy: CY, z: 1, ax: CX, ay: CY }, d.cam);
    return `<div class="lay" style="${d.st || ''}"><div class="rig" style="transform:rotateX(${(c.rx || 0).toFixed(3)}deg) rotateY(${(c.ry || 0).toFixed(3)}deg) rotateZ(${(c.rz || 0).toFixed(3)}deg)"><div class="world" style="transform:translate(${q(c.ax - c.fx * c.z)},${q(c.ay - c.fy * c.z)}) scale(${c.z.toFixed(5)})">${d.w}</div></div><div class="hud">${d.hud || ''}</div></div>`; };
  return t => {
    useFormat(); paintBg(root); t = Math.min(S.dur, Math.max(0, t));
    if (GRAIN_FPS > 0) { const n = Math.floor(t * GRAIN_FPS), h = _hash(n, 3, 5); grain.style.backgroundPosition = `${(h & 0xffff) / 655.36}% ${(h >>> 16) / 655.36}%`; }
    const d = S.draw(t); view.innerHTML = (d.layers || [d]).map(lay).join('');
  };
}

/* ---------- sequência: várias cenas no mesmo fundo, numa peça só ----------
   parts = [{ id, at, cap }]  (at = segundo em que a cena começa; cap = teto do tempo local)
   tr    = [{ a, b, type }]   (transição entre a parte i e a i+1). Na janela as duas cenas dividem UM movimento. */
const lz = (a, b, p) => Math.exp(lerp(Math.log(a), Math.log(b), p)).toFixed(5);
const TR = {
  right: p => [`transform:translateX(${(-p * 104).toFixed(3)}cqw);opacity:${(1 - prog(p, .3, .8)).toFixed(3)}`, `transform:translateX(${((1 - p) * 104).toFixed(3)}cqw);opacity:${prog(p, .05, .55).toFixed(3)}`],   // pan reto; a cena que entra faz fade in (nada aparece de repente)
  push: p => [`transform:scale(${lz(1, 3.6, p)});opacity:${(1 - prog(p, .3, .7)).toFixed(3)}`, `transform:scale(${lz(.28, 1, p)});opacity:${prog(p, .25, .65).toFixed(3)}`],
  dive: p => [TR.push(p)[0], ''],     // só a saída do push; a cena que entra traz o próprio zoom in (d.st)
  pull: p => [`transform:scale(${lz(1, .28, p)});opacity:${(1 - prog(p, .3, .7)).toFixed(3)}`, `transform:scale(${lz(3.6, 1, p)});opacity:${prog(p, .25, .65).toFixed(3)}`]
};
function seq(def) {
  def.kind = SCENES[def.parts[0].id].kind; def.format = SCENES[def.parts[0].id].format;
  def.draw = t => {
    const P = def.parts; let i = 0; while (i < P.length - 1 && t >= def.tr[i].b) i++;
    const L = (k, st) => { const p = P[k], d = SCENES[p.id].draw(Math.min(t - p.at, p.cap ?? 1e9)); d.st = (d.st || '') + st; return d; };
    const x = def.tr[i];
    if (x && t > x.a) { const [so, si] = TR[x.type](EASE.slow(prog(t, x.a, x.b))); return { layers: [L(i, so), L(i + 1, si)] }; }
    return { layers: [L(i, '')] };
  };
  return def;
}

/* ---------- página de cena: contrato do renderizador (window.DUR, window.render, raf cancelável) ----------
   ?t=2.5 congela um instante (para prints e conferência) */
function boot(id) {
  const r = mount(document.getElementById('f'), id), S = SCENES[id];
  window.DUR = S.dur; window.render = r;
  const at = new URLSearchParams(location.search).get('t');
  document.fonts.ready.then(() => {
    if (at !== null) { r(+at); return; }
    const t0 = performance.now(); (function loop() { const t = ((performance.now() - t0) / 1000) % (window.DUR + .8); r(Math.min(t, window.DUR)); raf = requestAnimationFrame(loop); })();
  });
}
