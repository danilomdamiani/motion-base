# Base visual (sem identidade de marca)

A skill não impõe cores nem fontes. Ela impõe **como** o visual é construído: poucos tokens, fundos sem banding, textura suave, tipografia em dois papéis, sombras leves. Troque os tokens e o resto continua valendo.

## 1. Tokens (um lugar só)

- **CSS** (`assets/engine/lib.css`, `:root`): `--font-display`, `--font-text`, `--fg`, `--fg-dim`, `--ink`, `--ink-dim`, `--accent`, `--accent-ink`.
- **JS** (`lib.js`, `TOKENS`): RGB 0–255 do fundo escuro (`a` centro mais claro → `b` borda escura, `glow`, `glowA`) e do claro (`base`, `white`, `glow`, `glowA`). O fundo é pintado em canvas, então **cor de fundo muda aqui**, não só no CSS.
- Página autônoma (`svg-motion/page.template.html`): `:root` e `CFG.bg`.
- Uma única cor de destaque (`--accent`) para rótulos, chip, botão. Verde/vermelho só para resultado positivo/negativo, se o projeto tiver.
- Texto no escuro: `--fg` (branco) e secundário `rgba(255,255,255,.55–.76)`; no claro: `--ink` e `rgba(ink,.5–.7)`.

## 2. Fundos (escuro e claro)

`kind: 'dark'` (radial `a → b` + brilho de uma borda, em cima por padrão, `'dark btm'` embaixo) e `kind: 'light'` (base clara + brilho branco embaixo + brilho de cor em cima + grade fina fixa opcional, `nogrid: true` desliga). **Não misture escuro e claro numa mesma peça unida.** Use escuro para números/ação/ritmo e claro para explicação/calma.

## 3. Banding: o defeito mais caro de degradês longos e escuros

- **Dither TPDF antes de quantizar** (`paintBg`): calcula o fundo em ponto flutuante, soma ruído triangular (±`DITHER_AMP` = 1,7 níveis) e só então arredonda para 8 bits, na resolução real do quadro. Ruído colocado **depois** do degradê já arredondado não corrige: a média local continua em degraus e o banding volta quando o vídeo é comprimido.
- **Brilhos grandes viram textura com dither no alfa** (`glowTex` → `HALO`, `GLOWBG`): degradê CSS vira camada de 8 bits com degraus de 1/255. Texturas de brilho em alpha são **brancas/neutras (R=G=B)**: o Chrome guarda cor pré-multiplicada em 8 bits e, com alfa baixo, cor com tom quantiza o matiz em degraus (anéis de croma). O tom vem do fundo (canvas) e de elementos opacos.
- **Perfis sem quina**: nada de `rgba() 0%, rgba() 46%, transparente 100%` (quina no meio e borda dura no fim = anel visível). Use `cone(t, p)`/`SOFT(rgb, a0, p)`: `(1−t)^p` com centro arredondado e fim com inclinação zero. `p ≈ 1,5` ≈ degradê de 3 pontos; `p` maior = mais concentrado. Vale para halos, flashes, vinhetas.
- **Teste** (sempre que mexer em fundo/brilho): quadro reduzido 4× em 16 bits com contraste exagerado: `ffmpeg -i quadro.png -vf "crop=...,format=gray16le,scale=W/4:H/4:flags=area,lutyuv=y='clip((val-OFF)*9,0,65535)',scale=...:flags=neighbor,format=gray" out.png` com `OFF ≈ 257 × (nível médio − 10)`. Degraus aparecem como contornos; um fundo bom sai liso. Compare com a versão anterior lado a lado.
- Saída: H.264 **10 bits** (`x264_10hq`) quando o fundo é escuro com degradê; 8 bits (`x264_nob`) quando a prioridade é estabilidade de linhas finas (ver `anti-flicker.md`).
- Overlays em alpha: **sem glow no arquivo** (o editor põe no editor de vídeo); glow em alfa baixo faz banding e matiz errado (alfa de 8 bits).

## 4. Grão (textura)

Ruído **cinza contínuo e suave**, `mix-blend-mode: overlay` (média neutra: não clareia nem escurece), opacidade **0,10–0,16** (claro: 0,10), `feTurbulence` baseFrequency ≈ 0,7 + `feGaussianBlur` σ ≈ 0,45, movendo 12–24×/s. Dá acabamento sem cara de filtro; **não corrige banding**. Camada **irmã** do que usa blend (um `mix-blend-mode` no pai isola o filho). Fica atrás do texto.

## 5. Tipografia

| Papel | Variável | Uso |
|---|---|---|
| display | `--font-display` (serifada de contraste médio funciona bem) | títulos, números grandes, palavra-herói, destaque em itálico |
| text | `--font-text` (grotesca neutra, com eixo óptico se possível) | corpo, UI, rótulos, botões |

- Peso: títulos 600–700 (tracking −0,02em), corpo 300–400, botão/UI 500–600. Rótulos pequenos em caixa alta: 500, `letter-spacing .2–.34em`, cor de destaque.
- Números: `tabular-nums`; formate pelo **idioma do vídeo** (`Intl.NumberFormat`); espaço fino antes de moeda/% (`&#8201;`); negativo com `&minus;`.
- Itálico serifado dentro de um título sans (palavra de destaque) é um recurso forte: mesmo tamanho nominal, peso 600.
- Fontes: use **instaladas** ou carregue por `<link>` (Google Fonts, `display=block`); o renderizador espera `document.fonts.ready`. Para render offline, embuta `@font-face` em base64.
- `background-clip:text` com `letter-spacing` negativo corta o último glifo (ex.: `%`): use padding.
- Palavras longas (alemão, por exemplo) quebram feio: confira em vários instantes.
- Texto na tela: **curto**, no idioma da fala; avise quando a redação for sua.

## 6. Sombras (leves)

- Botões e cards: **duas camadas**: uma curta (`0 6 5 rgba(0,0,0,.22)`) que destaca do fundo e uma larga e suave (`0 28 60 rgba(0,0,0,.25)`), ambas em unidades de design. O conjunto lê como "leve" e não como "caixa pesada".
- Selos/imagens com transparência: `filter: drop-shadow(0 7 9 rgba(0,0,0,.22))` na própria `<img>` (o wrapper recebe a animação).
- Painéis de UI sobre escuro: preenchimento translúcido, sem stroke e sem glow.
- Lower thirds/overlays em alpha: sem drop shadow e sem glow externo.
- `drop-shadow` por item (barras, pontos, partículas) em grande quantidade deixa o render lento: um por **grupo**.

## 7. Legibilidade sobre vídeo de fundo

- O fundo em vídeo é a verdade da cor: confira o texto nos instantes mais claros e mais escuros do vídeo (início e fim).
- Texto escuro sobre céu/claro, branco sobre escuro; se o vídeo muda de claro para escuro, escolha o tom pelo trecho em que o texto está **completo**.
- Sem vinheta escura sobre vídeo; se precisar de apoio, um gradiente muito leve (alfa ≤ 0,14) só atrás do texto.
