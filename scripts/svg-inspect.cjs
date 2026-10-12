#!/usr/bin/env node
// Inspeciona um SVG exportado do Figma (texto convertido em curvas) e devolve o que falta para refazer o layout em HTML:
//   - tamanho, lista de elementos (ordem de desenho, preenchimento, filtro, bbox)
//   - imagens embutidas (base64) salvas em <pasta>/imageN.png|jpg
//   - para cada caminho "de texto" (muitos subcaminhos): LINHAS com extensão da tinta (x0–x1, y0–y1), linha de base e PALAVRAS
//     → alvos para fit-fonts.mjs (tamanho/tracking) e check-ink.mjs (conferir o HTML contra o original)
// uso: node svg-inspect.cjs arquivo.svg [pasta-de-saida] [--gap 0.3] [--json]
const fs = require('fs'), path = require('path');
const argv = process.argv.slice(2), flag = k => argv.includes('--' + k), val = (k, d) => { const i = argv.indexOf('--' + k); return i < 0 ? d : argv[i + 1]; };
const pos = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--') && ['gap'].includes(argv[i - 1].slice(2))));
const file = pos[0], outDir = pos[1] || path.join(path.dirname(file || '.'), 'svg-assets');
if (!file) { console.error('uso: node svg-inspect.cjs arquivo.svg [pasta] [--gap 0.3] [--json]'); process.exit(1); }
const GAP = +val('gap', 0.3);
const src = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const root = /<svg[^>]*>/.exec(src)[0];
const W = +(/width="([\d.]+)"/.exec(root) || [])[1], H = +(/height="([\d.]+)"/.exec(root) || [])[1];
console.log(`SVG ${W}×${H}  (${(src.length / 1e6).toFixed(1)} MB)`);

// ---- imagens embutidas ----
fs.mkdirSync(outDir, { recursive: true });
for (const m of src.matchAll(/<image id="([^"]+)"[^>]*?width="(\d+)" height="(\d+)"[^>]*?href="data:image\/(\w+);base64,([^"]+)"/g)) {
  const f = path.join(outDir, `${m[1].replace(/_\d+_\d+$/, '')}.${m[4] === 'jpeg' ? 'jpg' : m[4]}`);
  fs.writeFileSync(f, Buffer.from(m[5], 'base64')); console.log(`imagem ${m[1]} ${m[2]}×${m[3]} → ${f}`);
}

// ---- bbox de caminhos (comandos absolutos do Figma; curvas pelos pontos de controle: aproximado, ok para medir texto) ----
function subpaths(d) {
  const t = d.match(/[MLHVCSQTAZmlhvcsqtaz]|-?\d*\.?\d+(?:e-?\d+)?/g) || []; let j = 0, cmd, cx = 0, cy = 0, sx = 0, sy = 0; const subs = []; let cur = null;
  const n = () => parseFloat(t[j++]), add = (x, y) => { cur.x0 = Math.min(cur.x0, x); cur.x1 = Math.max(cur.x1, x); cur.y0 = Math.min(cur.y0, y); cur.y1 = Math.max(cur.y1, y); };
  while (j < t.length) {
    if (/[A-Za-z]/.test(t[j])) cmd = t[j++];
    const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase();
    if (C === 'M') { let x = n(), y = n(); if (rel) { x += cx; y += cy; } cx = sx = x; cy = sy = y; cur = { x0: cx, x1: cx, y0: cy, y1: cy }; subs.push(cur); cmd = rel ? 'l' : 'L'; }
    else if (C === 'L') { let x = n(), y = n(); if (rel) { x += cx; y += cy; } cx = x; cy = y; add(cx, cy); }
    else if (C === 'H') { let x = n(); if (rel) x += cx; cx = x; add(cx, cy); }
    else if (C === 'V') { let y = n(); if (rel) y += cy; cy = y; add(cx, cy); }
    else if (C === 'C') { const a = [n(), n(), n(), n(), n(), n()]; if (rel) for (let k = 0; k < 6; k += 2) { a[k] += cx; a[k + 1] += cy; } add(a[0], a[1]); add(a[2], a[3]); add(a[4], a[5]); cx = a[4]; cy = a[5]; }
    else if (C === 'S' || C === 'Q') { const a = [n(), n(), n(), n()]; if (rel) for (let k = 0; k < 4; k += 2) { a[k] += cx; a[k + 1] += cy; } add(a[0], a[1]); add(a[2], a[3]); cx = a[2]; cy = a[3]; }
    else if (C === 'T') { let x = n(), y = n(); if (rel) { x += cx; y += cy; } cx = x; cy = y; add(cx, cy); }
    else if (C === 'A') { n(); n(); n(); n(); n(); let x = n(), y = n(); if (rel) { x += cx; y += cy; } cx = x; cy = y; add(cx, cy); }
    else if (C === 'Z') { cx = sx; cy = sy; } else j++;
  }
  return subs;
}
const union = s => ({ x0: Math.min(...s.map(q => q.x0)), x1: Math.max(...s.map(q => q.x1)), y0: Math.min(...s.map(q => q.y0)), y1: Math.max(...s.map(q => q.y1)) });
const f1 = v => (+v).toFixed(1);

// ---- elementos de desenho na ordem (sem <defs>) ----
const body = src.replace(/<defs>[\s\S]*<\/defs>/, '');
const nodes = [...body.matchAll(/<(path|rect|ellipse|circle|image|g)\b([^>]*?)(\/?)>/g)];
const attr = (a, k) => (new RegExp(`\\b${k}="([^"]*)"`).exec(a) || [])[1];
const report = { size: [W, H], items: [], text: [] }, refTags = [];
console.log('\nelementos (ordem de desenho):');
let idx = 0;
for (const m of nodes) {
  const tag = m[1], a = m[2]; let line = `${String(idx).padStart(2)} <${tag}>`;
  const fill = attr(a, 'fill'), stroke = attr(a, 'stroke'), flt = attr(a, 'filter'), op = attr(a, 'opacity');
  if (fill) line += ` fill=${fill}`; if (stroke) line += ` stroke=${stroke}`; if (op) line += ` opacity=${op}`; if (flt) line += ` filter=${flt}`;
  const d = attr(a, 'd'); let info = {};
  if (tag === 'path' && d) { const s = subpaths(d), u = union(s); info = { n: s.length, ...u, d, subs: s }; line += `  ${s.length} subcaminho(s)  x ${f1(u.x0)}–${f1(u.x1)}  y ${f1(u.y0)}–${f1(u.y1)}`; }
  else if (tag === 'rect') line += `  x=${attr(a, 'x') || 0} y=${attr(a, 'y') || 0} ${attr(a, 'width')}×${attr(a, 'height')}`;
  else if (tag === 'ellipse') line += `  c=(${attr(a, 'cx')},${attr(a, 'cy')}) r=(${attr(a, 'rx')},${attr(a, 'ry')})`;
  console.log(line); report.items.push({ i: idx, tag, fill, stroke, filter: flt, ...(info.n ? { n: info.n, x0: info.x0, x1: info.x1, y0: info.y0, y1: info.y1 } : {}) });
  if (info.n >= 8 && fill && !/url\(#pattern/.test(fill)) { analyzeText(idx, info.subs); refTags.push(m[0].replace(/fill="[^"]*"/, 'fill="#ff2a2a"').replace(/ opacity="[^"]*"/, '')); }
  idx++;
}

// ---- linhas e palavras de um caminho de texto ----
function analyzeText(i, subs) {
  // descarta pingos/acentos e pontuação ao medir altura típica; agrupa por centro vertical
  const hs = subs.map(q => q.y1 - q.y0).sort((a, b) => a - b), medH = hs[Math.floor(hs.length * .6)] || 1;
  const body = subs.filter(q => q.y1 - q.y0 > medH * .35).sort((a, b) => (a.y0 + a.y1) / 2 - (b.y0 + b.y1) / 2);
  // linhas = grupos de glifos separados por saltos verticais grandes entre centros ordenados (a entrelinha é muito maior que a dispersão dentro da linha)
  const lines = []; let cur = null;
  for (const q of body) { const c = (q.y0 + q.y1) / 2; if (!cur || c - cur.last > medH * .8) { cur = { g: [], last: c }; lines.push(cur); } cur.g.push(q); cur.last = c; }
  for (const L of lines) L.cy = L.g.reduce((s, z) => s + (z.y0 + z.y1) / 2, 0) / L.g.length;
  console.log(`   └ caminho ${i}: ${lines.length} linha(s) de texto (altura típica de glifo ${f1(medH)})`);
  // pingos, acentos e pontuação entram na linha de centro mais próximo
  const assigned = lines.map(() => []);
  for (const q of subs) { const c = (q.y0 + q.y1) / 2; let bi = 0, bd = 1e9; lines.forEach((L, k) => { const dd = Math.abs(c - L.cy); if (dd < bd) { bd = dd; bi = k; } }); assigned[bi].push(q); }
  lines.forEach((L, k) => {
    const all = assigned[k].sort((a, b) => a.x0 - b.x0), u = union(all);    // linha de base: moda dos fundos (y1) dos glifos grandes (sem descendentes: a maioria termina na base ou 1–2 px abaixo por overshoot)
    const bots = {}; L.g.forEach(q => { const b = Math.round(q.y1); bots[b] = (bots[b] || 0) + 1; });
    const modeBase = +Object.entries(bots).sort((a, b) => b[1] - a[1])[0][0];
    const words = []; let w = null, mx = -1e9; for (const q of all) { if (!w || q.x0 - mx > medH * GAP) { w = { x0: q.x0, x1: q.x1 }; words.push(w); } else w.x1 = Math.max(w.x1, q.x1); mx = Math.max(mx, q.x1); }
    console.log(`     L${k + 1}: tinta x ${f1(u.x0)}–${f1(u.x1)} (larg ${f1(u.x1 - u.x0)}, centro ${f1((u.x0 + u.x1) / 2)})  y ${f1(u.y0)}–${f1(u.y1)}  base≈${modeBase} (overshoot: base real ~1–2 px acima se a moda for de letras redondas)`);
    console.log(`          palavras: ${words.map(z => `[${Math.round(z.x0)}–${Math.round(z.x1)}]`).join(' ')}`);
    report.text.push({ path: i, line: k + 1, x0: u.x0, x1: u.x1, y0: u.y0, y1: u.y1, base: modeBase, words: words.map(z => [z.x0, z.x1]) });
  });
}
if (refTags.length) { const rf = path.join(outDir, 'ref-text.svg'); fs.writeFileSync(rf, `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${refTags.join('')}</svg>`); console.log('\nreferência de texto (vermelho) para ?ref= →', rf); }
if (flag('json')) { const f = path.join(outDir, 'inspect.json'); fs.writeFileSync(f, JSON.stringify(report, null, 1)); console.log('\njson →', f); }
