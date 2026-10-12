#!/usr/bin/env node
// Prints de uma página de peça em vários instantes + folha de contato (para conferir sem renderizar).
// Diferente do preview.mjs: abre por http://localhost (aceita ?query, <video>, fontes de rede) e deixa passar flags de URL (?ref=...).
// uso: node shots.mjs --url "http://localhost:8770/peca/index.html" --times 0.3,1,2,4.8 --size 1080x1920 --out pasta [--q "ref"] [--cols 4] [--video bg.mp4 --loop 5]
// A página precisa expor window.render(t) e raf (contrato do renderizador). Nomes: s_0.png, s_1.png... na ORDEM de --times.
import puppeteer from 'puppeteer-core';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
const argv = process.argv, arg = (k, d) => { const i = argv.indexOf('--' + k); return i < 0 ? d : argv[i + 1]; };
const chrome = [arg('chrome'), process.env.CHROME_PATH, 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => typeof p === 'string' && fs.existsSync(p));
if (!chrome || !arg('url') || !arg('out')) { console.error('uso: node shots.mjs --url <url> --times a,b,c --size WxH --out pasta [--q ref] [--cols N] [--video bg.mp4 --loop S]'); process.exit(1); }
const [W, H] = arg('size', '1080x1920').split('x').map(Number), times = arg('times', '0,1,2').split(',').map(Number), out = arg('out'), vid = arg('video', null), loop = +arg('loop', 0);
fs.mkdirSync(out, { recursive: true });
const url = arg('url') + (arg('url').includes('?') ? '&' : '?') + 't=0' + (arg('q') ? '&' + arg('q') : '');
const browser = await puppeteer.launch({ executablePath: chrome, headless: 'new', args: ['--hide-scrollbars', '--autoplay-policy=no-user-gesture-required'], defaultViewport: { width: W, height: H } });
const page = await browser.newPage();
page.on('pageerror', e => console.log('pageerror:', e.message));
await page.goto(url, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready); await new Promise(r => setTimeout(r, 600));
await page.evaluate(() => { if (typeof raf !== 'undefined') cancelAnimationFrame(raf); const b = document.getElementById('bg'); if (b && b.pause) b.pause(); });
if (vid) await page.evaluate(async src => { const v = document.getElementById('bg'); v.removeAttribute('loop'); v.src = src; await new Promise(r => { v.addEventListener('loadeddata', r, { once: true }); v.load(); }); }, pathToFileURL(path.resolve(vid)).href);
const files = [];
for (const [i, t] of times.entries()) {
  await page.evaluate(async (t, useVideo, loopS) => {
    render(t);
    if (useVideo) { const v = document.getElementById('bg'); await new Promise(r => { const d = () => { v.removeEventListener('seeked', d); r(); }; v.addEventListener('seeked', d); v.currentTime = (loopS ? t % loopS : t) + 1 / 240; setTimeout(d, 3000); }); }
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  }, t, !!vid, loop);
  const f = path.join(out, `s_${i}.png`); await page.screenshot({ path: f }); files.push(f);
}
await browser.close();
const cols = +arg('cols', Math.min(files.length, 4)), rows = Math.ceil(files.length / cols);
try { execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', '1', '-i', path.join(out, 's_%d.png'), '-vf', `scale=${Math.round(1800 / cols)}:-1,tile=${cols}x${rows}`, '-frames:v', '1', '-update', '1', path.join(out, 'sheet.png')]); console.log(`${files.length} prints + ${path.join(out, 'sheet.png')} (tempos: ${times.join(', ')})`); }
catch { console.log(`${files.length} prints em ${out} (folha de contato falhou: ffmpeg no PATH?)`); }
