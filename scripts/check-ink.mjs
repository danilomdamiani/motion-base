#!/usr/bin/env node
// Confere o HTML contra o design original: renderiza a página só com o texto (fundo preto) no instante t e mede a TINTA
// de cada faixa (banda) horizontal, comparando com os alvos que o svg-inspect.js imprimiu.
// uso: node check-ink.mjs --url "http://localhost:8770/peca/index.html" --size 1080x1920 --bands bands.json [--t 4.9] [--hide "css extra"] [--thr 140] [--words 14]
// bands.json = [{ "name":"L1", "y0":540, "y1":640, "x0":298.7, "x1":780.9 }, ...]   (x0/x1 = alvo; omita para só medir)
// A página precisa expor window.render(t) e a global raf (contrato do renderizador). Texto claro sobre fundo escuro: ajuste --thr (canal G > thr).
// Esconda o que não é texto com --hide (ex.: "#bgc,.grain,.layer{display:none}"). Sai: desvio dx0/dx1 em px por banda e as palavras (gap > --words px).
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const argv = process.argv, arg = (k, d) => { const i = argv.indexOf('--' + k); return i < 0 ? d : argv[i + 1]; };
const chrome = [arg('chrome'), process.env.CHROME_PATH, 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => typeof p === 'string' && fs.existsSync(p));
if (!chrome || !arg('url') || !arg('bands')) { console.error('uso: node check-ink.mjs --url <url> --size WxH --bands bands.json [--t 4.9] [--hide css] [--thr 140] [--words 14]'); process.exit(1); }
const [W, H] = arg('size', '1080x1920').split('x').map(Number), bands = JSON.parse(fs.readFileSync(arg('bands'), 'utf8'));
const browser = await puppeteer.launch({ executablePath: chrome, headless: 'new', defaultViewport: { width: W, height: H } });
const page = await browser.newPage();
page.on('pageerror', e => console.log('pageerror:', e.message));
await page.goto(arg('url'), { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready); await new Promise(r => setTimeout(r, 600));
await page.evaluate(() => { if (typeof raf !== 'undefined') cancelAnimationFrame(raf); });
await page.addStyleTag({ content: `html,body,#f{background:#000!important}${arg('hide', '')}` });
await page.evaluate(t => render(t), +arg('t', 4.9)); await new Promise(r => setTimeout(r, 250));
const b64 = await page.screenshot({ encoding: 'base64' });
const res = await page.evaluate(async (b64, bands, thr, gap) => {
  const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode();
  const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height).data, out = [];
  for (const b of bands) {
    let mnx = 1e9, mxx = -1, mny = 1e9, mxy = -1; const cols = new Array(c.width).fill(false);
    for (let y = b.y0; y < b.y1; y++) for (let xx = 0; xx < c.width; xx++) if (d[(y * c.width + xx) * 4 + 1] > thr) { cols[xx] = true; mnx = Math.min(mnx, xx); mxx = Math.max(mxx, xx); mny = Math.min(mny, y); mxy = Math.max(mxy, y); }
    const words = []; let s = null, last = -99; for (let xx = 0; xx < c.width; xx++) if (cols[xx]) { if (s === null || xx - last > gap) { if (s !== null) words.push([s, last]); s = xx; } last = xx; } if (s !== null) words.push([s, last]);
    out.push({ name: b.name, mnx, mxx, mny, mxy, words, x0: b.x0, x1: b.x1 });
  }
  return out;
}, b64, bands, +arg('thr', 140), +arg('words', 14));
for (const r of res) {
  const dev = r.x0 !== undefined ? ` (alvo ${r.x0}–${r.x1})  dx0=${(r.mnx - r.x0).toFixed(1)}  dx1=${(r.mxx - r.x1).toFixed(1)}` : '';
  console.log(`${r.name}: x ${r.mnx}–${r.mxx}${dev} | y ${r.mny}–${r.mxy} | palavras ${r.words.map(w => `[${w[0]}-${w[1]}]`).join(' ')}`);
}
await browser.close();
