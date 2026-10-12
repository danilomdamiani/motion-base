# motion-base

Base reutilizável para **criar vídeos de motion graphics em HTML** e renderizar em MP4/ProRes (Chrome headless + ffmpeg): anúncios em 9:16/1:1/16:9, intros, lower thirds, peças de UI. Animação suave (fade + blur, expo out), determinística e **sem flicker**. Não tem cliente nem identidade visual: cores e fontes são tokens que você troca.

É uma *skill* do Claude Code (`SKILL.md`), mas tudo funciona também sem o Claude: os templates e os scripts são HTML/JS/Node comuns.

## Instalar
1. Copie a pasta `motion-base/` para `~/.claude/skills/` (todos os projetos) ou para `<projeto>/.claude/skills/` (só aquele projeto).
2. `cd motion-base/scripts && npm install`
3. Requisitos: **Node 18+**, **ffmpeg** no PATH, **Chrome ou Edge** (ou `CHROME_PATH`). Fontes: instaladas ou pelo `<link>` do Google Fonts (precisa de internet no render).

No Claude Code, peça normalmente ("anima esse SVG", "faz um lower third em alpha", "renderiza em 1080×1920"); a skill é carregada pela descrição.

## Começo rápido (sem o Claude)
```bash
# 1) servidor local (as páginas usam fontes e ?t=)
python -m http.server 8770

# 2) abrir um dos templates no navegador
#    http://localhost:8770/motion-base/assets/svg-motion/page.template.html          (design → animação, 9:16)
#    http://localhost:8770/motion-base/assets/engine/page-template.html              (motor de cenas; copie scenes.example.js → scenes.js e merged.example.js → merged.js)
#    ?t=2.5 congela um instante

# 3) prints em instantes escolhidos + folha de contato
node scripts/shots.mjs --url http://localhost:8770/motion-base/assets/svg-motion/page.template.html --times 0.4,1,2,4.8 --size 1080x1920 --out prev

# 4) renderizar
node scripts/render.mjs --html assets/svg-motion/page.template.html --out saida.mp4 --width 1080 --height 1920 --fps 30 --enc x264_nob
```

## O que tem
| Pasta | Conteúdo |
|---|---|
| `SKILL.md` | resumo operacional e checklist |
| `references/` | `motion` (estilo de animação), `anti-flicker`, `visual-base` (tokens, fundos, grão, tipografia, sombras), `layout` (formatos, escala, safe areas), `components`, `svg-to-motion`, `workflow`, `render` |
| `assets/engine/` | motor de cenas: câmera (`camK`/`cam3`), transições (`seq`/`TR`), entradas (`inS`, `words`, `swap`, `counter`), fundo com dither, brilhos sem banding, storyboard e player, 4 exemplos que rodam (16:9, claro, palavras + pan, vertical 9:16) |
| `assets/svg-motion/page.template.html` | página autônoma para transformar um layout (SVG/Figma) em animação: texto por linha de base, botão com wipe, grid andando, grão suave, fundo em canvas ou vídeo |
| `assets/overlays/lower-third.template.html` | lower third em alpha (só entrada) |
| `scripts/` | `render.mjs`, `preview.mjs`, `shots.mjs`; `svg-inspect.cjs` (linhas/palavras/bases do SVG), `fit-fonts.mjs` (tamanho/tracking), `check-ink.mjs` (HTML × design), `check-flicker.mjs` (flicker no MP4) |

## Personalizar para um projeto
- **Cores e fontes**: `assets/engine/lib.css` (`:root`) e `TOKENS` em `lib.js`; na página autônoma, `:root` e `CFG.bg`.
- **Formato**: `format: [1080, 1920]` na cena (motor) ou a proporção do `#f` e `--u` (página autônoma).
- **Texto e tempos**: `data-base` (linha de base), `data-a` (início) e `data-d` (duração) por linha; `CFG.wipe` para o botão.
- **Grão**: opacidade no CSS (`.grain`) e `GRAIN_FPS`/`grain_fps` (0 = parado).

## Ferramentas de conferência (resumo)
- `svg-inspect.cjs design.svg pasta --json`: lista os elementos, extrai imagens, mede linhas e palavras de texto e grava `ref-text.svg`.
- `fit-fonts.mjs --specs specs.json --css <url>`: acha tamanho e tracking que casam com a largura/altura da tinta.
- `check-ink.mjs --url … --bands bands.json`: mede a tinta do HTML contra o design (esperado ≤ 3 px por lado).
- `check-flicker.mjs --video f.mp4 --crop W:H:X:Y [--mode lines]`: mede tremor de texto e pulsação de linhas finas no vídeo final.

## Licença
Defina a licença antes de publicar (o autor decide). As fontes citadas nos templates (Inter, Newsreader) são do Google Fonts (SIL OFL).
