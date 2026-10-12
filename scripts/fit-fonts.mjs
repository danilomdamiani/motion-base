#!/usr/bin/env node
// Descobre tamanho e tracking de uma fonte para casar com um texto do design (largura/altura da TINTA medidas em svg-inspect.js).
// uso: node fit-fonts.mjs --specs specs.json [--css "https://fonts.googleapis.com/css2?family=Inter:wght@700&display=block"] [--chrome <exe>]
// specs.json = [{ "label":"título L1", "text":"15.000 CHF staatliche", "font":"700 {s}px Inter", "w":757.5, "h":59 }, ...]
//   font: shorthand CSS com {s} no lugar do tamanho (ex.: "italic 600 {s}px Newsreader")   w, h: largura e altura da tinta no design (h opcional)
// Saída por spec:  size(h) = tamanho que casa a ALTURA · ls = tracking (em em) para casar a largura nesse tamanho · size(w, ls=0) = tamanho que casa a largura sem tracking
// Leitura: se size(h) ≈ size(w, ls=0), a fonte é essa (ls ≈ 0). Se o ls sai grande (> ±0,06em) em vários textos, a fonte/peso está errada: teste outro peso/família.
// Dica: a altura da tinta só é confiável em linhas SEM descendentes/acentos; use a largura (w) como juiz principal.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const argv = process.argv, arg = (k, d) => { const i = argv.indexOf('--' + k); return i < 0 ? d : argv[i + 1]; };
const chromePaths = [arg('chrome'), process.env.CHROME_PATH, 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'];
const chrome = chromePaths.find(p => typeof p === 'string' && fs.existsSync(p));
if (!chrome || !arg('specs')) { console.error('uso: node fit-fonts.mjs --specs specs.json [--css <url>] [--chrome <exe>]'); process.exit(1); }
const specs = JSON.parse(fs.readFileSync(arg('specs'), 'utf8')), css = arg('css', null);
const browser = await puppeteer.launch({ executablePath: chrome, headless: 'new' });
const page = await browser.newPage();
await page.setContent(`<!doctype html><html><head>${css ? `<link rel="stylesheet" href="${css}">` : ''}</head><body></body></html>`, { waitUntil: 'networkidle0' });
const out = await page.evaluate(async (specs) => {
  const c = document.createElement('canvas').getContext('2d'), res = [];
  for (const s of specs) {
    await document.fonts.load(s.font.replace('{s}', '100'), s.text);
    const meas = (size, ls) => { c.font = s.font.replace('{s}', size); c.letterSpacing = ls + 'px'; const m = c.measureText(s.text); return { w: m.actualBoundingBoxLeft + m.actualBoundingBoxRight, h: m.actualBoundingBoxAscent + m.actualBoundingBoxDescent }; };
    let sh = null; if (s.h) { sh = 50; for (let i = 0; i < 30; i++) sh *= s.h / meas(sh, 0).h; }
    let s0 = 50; for (let i = 0; i < 30; i++) s0 *= s.w / meas(s0, 0).w;
    const base = sh || s0, ls = (s.w - meas(base, 0).w) / Math.max(1, s.text.length - 1);
    res.push(`${(s.label || s.text.slice(0, 22)).padEnd(26)} size(h)=${sh ? sh.toFixed(1) : '-'}  ls=${(ls / base).toFixed(3)}em  | size(w, ls=0)=${s0.toFixed(1)}`);
  }
  return res;
}, specs);
console.log(out.join('\n'));
await browser.close();
