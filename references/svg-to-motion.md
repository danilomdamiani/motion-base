# Do design (SVG/Figma) à animação em HTML

Fluxo usado em peças de anúncio (9:16, 1:1, 16:9) em que o designer entrega **um SVG por formato** (texto convertido em curvas, botões com sombras, às vezes uma imagem de fundo) e o vídeo é a mesma peça **animada**, com o fundo trocado por um MP4 (ou por cinza + grão + grid).

## 1. Inspecionar o SVG
```bash
node scripts/svg-inspect.cjs design_9-16.svg assets-9-16 --json
```
Saída: tamanho, **lista de elementos na ordem de desenho** (fundo, luzes borradas, grid, texto, botão…), imagens embutidas extraídas (`image0.png`: foto de fundo; `image1.png`: selo), `ref-text.svg` (só o texto do design, em vermelho: serve para `?ref=` na conferência) e para cada caminho de texto as **linhas**: extensão da tinta (x0–x1, y0–y1), **linha de base** (`base≈`) e **palavras**. Esses números são o gabarito de tudo que vem depois. (Só abrir o SVG no navegador pode travar: filtros de ruído/blur + imagens de 16 MB.)

Entenda o que é o quê: texto = caminhos brancos/pretos com 30+ subcaminhos; botão = forma preenchida + brilho radial + borda em degradê dentro de um `<g filter>` (sombras); cruz/ícone = forma + realce; fundo = rect/imagem + elipses borradas; grid = um path com traço em degradê radial.

## 2. O que fica em SVG e o que vira HTML
- **HTML**: todo texto (título, corpo, rótulo do botão) e o botão como elemento. É o que se anima linha a linha.
- **SVG inline** (copiado do original): ícones/cruz, setas, a forma exata do botão e seus filtros de sombra (`<defs>` num `<svg width=0 height=0>` escondido; gradientes referenciados de outros SVGs funcionam). Mantenha as coordenadas originais (`viewBox` = tamanho do design) para não converter nada. **Lembre `fill="none"` na raiz** do SVG inline: o Figma deixa `fill="none"` herdado e sem isso o path com `stroke` vira uma forma preta.
- **Fundo**: o que o design tinha vira vídeo (`<video id="bg">`), ou, sem vídeo: degradê em canvas com dither + grão + (opcional) luzes borradas e grid.

## 3. Descobrir fontes, tamanhos e tracking
1. Veja o texto renderizado (Chrome headless: `--screenshot` do SVG só com os paths de texto) e identifique a família. Candidatas comuns: grotesca neutra com eixo óptico (Inter), serifada itálica de contraste médio (Newsreader). **Teste pesos**: um peso errado dá tracking absurdo no fit.
2. `fit-fonts.mjs` com larguras/alturas de tinta do `svg-inspect`:
   ```bash
   node scripts/fit-fonts.mjs --specs specs.json --css "https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,700&family=Newsreader:ital,opsz,wght@1,6..72,600&display=block"
   ```
   Se `size(h)` ≈ `size(w, ls=0)` e o `ls` fica em ±0,03em, achou. O peso da serifada itálica costuma ser mais alto do que parece (600). Use **linhas puras** (uma fonte só, sem acentos/descendentes) para a altura.
3. Linhas **mistas** (sans + serifada): meça cada palavra no original; ajuste `word-spacing` da linha e o `letter-spacing` de uma palavra curta se ela sai estreita (ex.: `für` +0,03em). Kerning ligado costuma casar melhor com o original do Figma.
4. Relação entre formatos: em geral o 9:16 é o 1:1 ×1,21 em títulos/botão, mas o **corpo** muda de tamanho independente; ajuste cada formato.

## 4. Posicionar pela linha de base
Cada linha é um `div.t` com `data-base="<y da linha de base no design>"`. O JS (`place()`) mede a fonte já carregada com um `span` inline-block de altura 0 (`offsetTop` não sofre `transform`) e ajusta `top`. Assim trocar fonte/tamanho não desloca a linha. A moda dos fundos (`y1`) que o `svg-inspect` imprime inclui o overshoot de letras redondas: a linha de base real fica ~1–2 px acima (≈ `y1 − 0,017 × tamanho`).

## 5. Conferir contra o original (obrigatório)
```bash
node scripts/check-ink.mjs --url http://localhost:8770/peca/index.html --size 1080x1920 --bands bands.json \
     --hide ".stage>.layer,#pill,#arrow,#cross{display:none}"
```
Mede a tinta de cada banda (esquerda/direita/topo/base) e as palavras; desvio de ≤ 3 px por lado é bom. E visualmente: `index.html?ref=assets-9-16/ref-text.svg` (caminho do arquivo que o `svg-inspect` gerou) sobrepõe o texto original em vermelho semitransparente. Faça ambos nos **dois formatos**.

## 6. Animar
Use `assets/svg-motion/page.template.html`: `fx` (entradas em escada: título 0,10–0,14 s entre linhas, corpo depois, botão por último), `apply()` com **anti-flicker**, wipe do botão, grid e grão. Tempos de referência (5 s): título .15→.45 · corpo .85→1.05 · selo 1.3 · ícone 1.65 · pílula 1.75 (1,05 s) · rótulo 2.0 · seta 2.4; tudo pousa por ≈ 3,4 s e segura parado até o fim. **Não redesenhe a animação por formato**: mude só o que o layout exige (nº de linhas).

## 7. Vídeo de fundo no lugar da imagem do design
- Cubra o quadro (`object-fit: cover`) e **escolha o recorte vertical** para o objeto-herói cair onde estava na imagem do design (ex.: vídeo 9:16 em um quadro 1:1: `top: −530u`, altura 1920u, para a casa ficar na metade de baixo).
- Confira o primeiro e o último quadro: a câmera do vídeo se mexe e o texto tem que ficar legível nos dois.
- Renderize com `--video --bg fundo-intra.mp4 --loop <duração do fundo>` (o `<video id="bg">` precisa existir).
- Sem vídeo: `bg` em canvas com dither + grid + grão (o template já faz).

## 8. Armadilhas
- Abrir o SVG original no navegador/preview pode **não terminar de renderizar** (filtros pesados): trabalhe pelas peças extraídas.
- Sombras do Figma são `filter` com 4–5 estágios; para um botão "leve" acrescente um estágio **curto** (dy 6, σ 5, α .22) antes dos originais.
- `feTurbulence` do Figma (grão do design) é binário e áspero; troque pelo grão suave (`visual-base.md §4`).
- Fontes de rede precisam de internet no render; offline, instale ou embuta.
- `mix-blend-mode` isola o filho: o grão precisa ser **irmão** das camadas que ele mistura.
- Nunca confie só no quadro isolado: verifique o MP4 com `check-flicker.mjs` (`anti-flicker.md`).
