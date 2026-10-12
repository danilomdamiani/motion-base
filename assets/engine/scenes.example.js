/* =====================================================================
   Cenas de exemplo do motor (copie para scenes.js e troque o conteúdo).
   Cada cena: SCENES.id = { n, file, title, kind, dur, format?, say, txt, beats, draw(t) }
     kind   : 'dark' | 'dark btm' | 'light'   (fundo; cores em TOKENS no lib.js; 'btm' = brilho vindo de baixo)
     format : [largura, altura] em unidades de design. Padrão [3840, 2160] (16:9). 9:16 → [1080,1920]; 1:1 → [1080,1080]
     draw   : função DETERMINÍSTICA de t (segundos) → { w, hud, cam }
              w = HTML do mundo (anda com a câmera) · hud = HTML preso à tela · cam = câmera (camK/cam3)
     beats  : [[t, 'câmera', 'o que acontece']] → viram os quadros do storyboard
   Medidas em unidades de design; q(n) converte para cqw. Centro do quadro = (CX, CY).
   ===================================================================== */
const PROJECT = {      // cabeçalho do storyboard
  eyebrow: 'Projeto · exemplo',
  title: 'Storyboard <i>&amp; instruções</i>',
  rules: [
    ['Formato', '3840 × 2160 · 30 fps · H.264. Outros formatos por cena (format).'],
    ['Movimento', 'Entradas: fade + blur vindo de um lado, easing soft (expo out). Câmera parada = parada.'],
    ['Uso', 'Cada quadro abaixo é a animação congelada nos "beats". Clique para abrir no player (espaço = play, ← → = quadro a quadro).']
  ]
};

/* ---------- ex01 · número-herói centrado com anel ---------- */
SCENES.ex01 = {
  n: 'ex01', file: 'ex01 Heroi', title: 'Número-herói com anel', kind: 'dark btm', dur: 4.6,
  say: '(fala de exemplo)', txt: '300 € · im Durchschnitt pro Tag',
  beats: [[.5, 'zoom suave do centro', 'O anel se desenha e o número conta.'], [1.8, 'segue o zoom', 'O número pousa; a legenda sobe.'], [4.0, 'quadro final', 'Tudo parado e completo.']],
  draw(t) {
    const cx = CX, cy = CY, rp = win(t, -.2, 1.8), R = 830, C = 2 * Math.PI * R, v = Math.round(300 * win(t, -.1, 1.4));
    let w = disc(cx, cy, 3000, HALO(win(t, -.6, .6)));
    w += geo(`<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="rgba(255,255,255,.26)" stroke-width="3" stroke-dasharray="${(C * rp).toFixed(0)} ${C.toFixed(0)}" transform="rotate(-90 ${cx} ${cy})"/><circle cx="${cx}" cy="${cy}" r="${R + 190}" fill="none" stroke="rgba(255,255,255,${(.1 * rp).toFixed(3)})" stroke-width="3"/>`);
    w += at(cx, cy - 20, big(`${v}&#8201;€`, 620, 'serif tglow tnum', 'color:var(--fg)'), inS(t, -.1, .9));
    w += at(cx, cy + 400, lab('im Durchschnitt pro Tag', 78), inS(t, 1.4, .8));
    return { w, cam: camK(t, [{ fx: cx, fy: cy, z: lerp(.92, 1.08, prog(t, 0, 4.6)) }]) };   // zoom lento e contínuo, sem giro
  }
};

/* ---------- ex02 · texto palavra a palavra + pan (cam3 gira só enquanto move) ---------- */
SCENES.ex02 = {
  n: 'ex02', file: 'ex02 Palavras e pan', title: 'Palavras e pan lateral', kind: 'dark', dur: 5.2,
  say: '(fala de exemplo)', txt: 'Ruhe bewahren',
  beats: [[.9, 'parada', 'As palavras entram no tempo da fala.'], [2.6, 'pan →', 'A câmera desliza até o ponto final do enquadramento.'], [4.9, 'câmera para', 'Quadro final parado.']],
  draw(t) {
    const line = (txt, y, size, a, cls) => at(1300, y, `<span class="${cls}" style="font-size:${q(size)};line-height:1.05">${words(t, txt, a, .22)}</span>`);
    let w = line('Ruhe bewahren,', 920, 280, .3, 'serif tglow') + line('wenn es zählt.', 1230, 280, 1.0, 'serif tglow');
    w += at(3200, 1080, big('Weiter', 520, 'serif tglow', 'font-style:italic'), inS(t, 2.9, .9, -160, 0, 40));   // x = fx final da câmera: fica centralizada no enquadramento final
    return { w, cam: cam3(t, [{ fx: 1500, fy: 1080, z: 1.15 }, [2.4, 4.8, { fx: 3200 }]]) };
  }
};

/* ---------- ex03 · modo claro: card + chip + texto sob o card ---------- */
SCENES.ex03 = {
  n: 'ex03', file: 'ex03 Card claro', title: 'Card no modo claro', kind: 'light', dur: 4.2,
  say: '(fala de exemplo)', txt: 'Teil 1 · Die erste Stunde',
  beats: [[.7, 'parada', 'O card sobe com fade + blur.'], [2.6, 'zoom no card', 'Zoom 1,4× com âncora acima do centro; o texto entra embaixo.']],
  draw(t) {
    const card = `<div style="position:relative;width:${q(1000)};height:${q(1100)};border-radius:${q(72)};background:#fff;box-shadow:0 ${q(30)} ${q(100)} rgba(20,30,50,.12),inset 0 0 0 ${q(2)} rgba(22,23,26,.08);display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:${q(120)} 0 ${q(130)}">
      ${chip('TEIL 1', 1.5)}<span class="serif" style="font-size:${q(112)};color:var(--ink)">Die erste Stunde</span></div>`;
    const w = at(CX, 1000, card, inS(t, .2, .9, 0, 110));
    const hud = `<div style="position:absolute;left:0;right:0;top:${q(1690)};text-align:center;${inS(t, 2.2, .8)}">${lab('die eigentliche Arbeit', 78, 'var(--ink-dim)')}</div>`;
    return { w, hud, cam: camK(t, [{ fx: CX, fy: 1000, z: 1 }, [1.8, 3.0, { z: 1.4, ay: 830 }]]) };
  }
};

/* ---------- ex04 · formato vertical 9:16 (format: [1080, 1920]) com botão que abre da cruz para a direita ---------- */
SCENES.ex04 = {
  n: 'ex04', file: 'ex04 Vertical', title: 'Vertical 9:16', kind: 'dark btm', format: [1080, 1920], dur: 5,
  say: '(fala de exemplo)', txt: 'Titel + Text + Button',
  beats: [[.5, 'parada', 'Linhas do título entram em escada.'], [1.6, 'parada', 'Texto e início do botão.'], [4.0, 'quadro final', 'Tudo parado.']],
  draw(t) {
    const L = (txt, y, a, cls, size, wt = 700) => at(540, y, `<span class="${cls}" style="font-size:${q(size)};font-weight:${wt};letter-spacing:-.02em">${txt}</span>`, inS(t, a, 1.2, 0, 34, 14));
    let w = L('Gute Planung', 640, .15, 'sans tnum', 94) + L('beginnt mit', 737, .25, 'sans', 94) + L('<i class="serif" style="font-weight:600;letter-spacing:0">einem Plan.</i>', 834, .35, 'serif', 94, 600);
    w += at(540, 1010, `<span class="sans" style="font-size:${q(44)};color:var(--fg-dim)">Ein kurzer Satz, der erklärt,<br>worum es geht.</span>`, inS(t, .85, 1, 0, 30, 12));
    // botão: pílula que abre (clip-path) com o easing 'io'
    const p = win(t, 1.4, 2.45, EASE.io), x0 = 270, wBtn = 540;
    w += at(540, 1230, `<div style="position:relative;width:${q(wBtn)};height:${q(110)};clip-path:inset(0 ${((1 - p) * 100).toFixed(2)}% 0 0 round ${q(55)});border-radius:${q(55)};background:var(--accent);box-shadow:0 ${q(6)} ${q(10)} rgba(0,0,0,.22),0 ${q(28)} ${q(60)} rgba(0,0,0,.28);display:flex;align-items:center;justify-content:center;font:600 ${q(38)} var(--font-text);color:var(--accent-ink)">Jetzt starten&#8201;&#8599;</div>`, p <= 0 ? 'opacity:0' : '');
    return { w, cam: camK(t, [{ fx: 540, fy: 960, z: 1 }]) };
  }
};

const ORDER = ['ex01', 'ex02', 'ex03', 'ex04'];
