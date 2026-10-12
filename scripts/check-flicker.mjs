#!/usr/bin/env node
// Detecta flicker no VÍDEO FINAL (não só nos quadros): texto que treme de posição ou linhas finas que pulsam quadro sim, quadro não.
// uso: node check-flicker.mjs --video saida.mp4 --crop W:H:X:Y [--mode text|lines] [--from 40] [--to 120] [--thr 170] [--dark]
//   --mode text  (padrão): centro de massa vertical dos pixels CLAROS (> thr) na área; use --dark para texto escuro sobre fundo claro (< thr).
//                          Texto parado deve variar ≈ 0,00–0,05 px. Ciclo de 3 quadros = 3 processos de render com raster diferente; de 2 = alternância P/B.
//   --mode lines : pico do filtro passa-alta das colunas (linhas verticais finas, ex.: grid andando). Reporta variação % e alternância (autocorrelação lag-1 < 0 = pulsa).
//   --from/--to : intervalo de quadros (escolha só o trecho PARADO para texto; para o grid, qualquer trecho)
// Requer ffmpeg no PATH. A área (--crop) deve conter só o elemento (sem vídeo de fundo com movimento forte).
import { execFileSync } from 'node:child_process';
const argv = process.argv, arg = (k, d) => { const i = argv.indexOf('--' + k); return i < 0 ? d : argv[i + 1]; }, has = k => argv.includes('--' + k);
if (!arg('video') || !arg('crop')) { console.error('uso: node check-flicker.mjs --video f.mp4 --crop W:H:X:Y [--mode text|lines] [--from N --to N] [--thr 170] [--dark]'); process.exit(1); }
const [cw, ch, cx, cy] = arg('crop').split(':').map(Number), mode = arg('mode', 'text'), thr = +arg('thr', 170), dark = has('dark');
let raw;
try { raw = execFileSync('ffmpeg', ['-v', 'error', '-i', arg('video'), '-vf', `crop=${cw}:${ch}:${cx}:${cy},format=gray`, '-f', 'rawvideo', '-'], { maxBuffer: 1 << 30, stdio: ['ignore', 'pipe', 'pipe'] }); }
catch (e) { console.error('ffmpeg falhou (o arquivo existe? ffmpeg no PATH? --crop dentro do quadro?):', String(e.stderr || e.message).split('\n')[0]); process.exit(1); }
const N = raw.length / (cw * ch), from = +arg('from', 0), to = Math.min(N, +arg('to', N));
const vals = [];
for (let f = from; f < to; f++) {
  const o = f * cw * ch;
  if (mode === 'text') {
    let s = 0, m = 0;
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) { const v = raw[o + y * cw + x], w = dark ? Math.max(0, thr - v) : Math.max(0, v - thr); s += w * y; m += w; }
    vals.push(m > 200 ? s / m : NaN);
  } else {
    const col = new Float32Array(cw); for (let x = 0; x < cw; x++) { let s = 0; for (let y = 0; y < ch; y++) s += raw[o + y * cw + x]; col[x] = s / ch; }
    let pk = 0; for (let x = 2; x < cw - 2; x++) pk = Math.max(pk, col[x] * 2 - col[x - 2] - col[x + 2]); vals.push(pk);
  }
}
const v = vals.filter(Number.isFinite); if (!v.length) { console.log('nada encontrado na área (ajuste --crop/--thr)'); process.exit(0); }
const mean = v.reduce((a, b) => a + b, 0) / v.length, mn = Math.min(...v), mx = Math.max(...v);
const sd = Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / v.length);
let ac = 0, den = 0; for (let i = 1; i < v.length; i++) { ac += (v[i] - mean) * (v[i - 1] - mean); } for (const x of v) den += (x - mean) ** 2; ac = den ? ac / den : 0;
console.log(`quadros ${from}–${to - 1}  (${v.length} válidos)`);
if (mode === 'text') {
  let flips = 0; for (let i = 2; i < v.length; i++) { const a = v[i - 1] - v[i - 2], b = v[i] - v[i - 1]; if (a * b < 0 && Math.abs(b) > .05) flips++; }
  console.log(`centro vertical: média ${mean.toFixed(2)} px · min–max ${mn.toFixed(2)}–${mx.toFixed(2)} (amplitude ${(mx - mn).toFixed(2)} px) · desvio ${sd.toFixed(3)} · inversões de sentido ${flips}`);
  console.log((mx - mn) < .1 && flips < 3 ? 'OK: texto estável' : '⚠ texto se mexe (amplitude > 0,1 px ou muitas inversões): veja a causa em references/anti-flicker.md');
} else {
  const pct = (mx - mn) / mean * 100;
  console.log(`pico: média ${mean.toFixed(1)} · variação ${pct.toFixed(0)}% · autocorrelação lag-1 ${ac.toFixed(2)} (negativa = pulsa quadro sim/quadro não)`);
  console.log(pct < 12 && ac > -.5 ? 'OK: linhas estáveis' : '⚠ linhas pulsam: alargue o traço + blur leve (sem passo ≈ 0,5 px/quadro) e codifique sem B-frames (--enc x264_nob)');
}
console.log('primeiros valores:', v.slice(0, 16).map(x => x.toFixed(2)).join(' '));
