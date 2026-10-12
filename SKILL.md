---
name: motion-base
description: Base genérica e reutilizável para criar vídeos de motion graphics em HTML (anúncios, intros, lower thirds, peças de UI) com animação suave, determinística e sem flicker, e renderizar em MP4/ProRes. Traz o motor de cenas (câmera, transições, storyboard, player), um template para transformar layouts SVG/Figma em animação (9:16, 1:1, 16:9, com vídeo de fundo ou grid e grão), o estilo de movimento (easing expo out, fade + blur, wipe de botão), anti-flicker, fundos sem banding e o pipeline de render (Chrome headless + ffmpeg) com ferramentas de conferência. Use sempre que o pedido for criar/animar/renderizar peça em HTML para vídeo, transformar um SVG/layout em vídeo animado, texto e botões animados com easing suave, lower third/overlay em alpha, diagnosticar texto tremendo ou banding, ou montar storyboard de peças. Não impõe cliente, marca nem identidade visual: cores e fontes são tokens.
---

# motion-base · motion graphics em HTML → vídeo

Skill **neutra** (sem cliente nem identidade visual): o que ela fixa é **como animar e como construir**; cores, fontes e textos são tokens que você troca por projeto. Funciona sozinha: traz o motor, os templates, os scripts de render e as ferramentas de conferência.

## Onde ler (nesta ordem)
1. Este arquivo (resumo operacional).
2. Conforme a tarefa:
   - easing, entradas, texto, câmera, cursor, transições, grid/grão, ritmo → `references/motion.md`
   - texto/linhas que tremem, banding de linhas finas, pulsação no MP4 → `references/anti-flicker.md`
   - tokens, fundos sem banding, grão, tipografia, sombras → `references/visual-base.md`
   - formatos (16:9, 9:16, 1:1), escala tipográfica, composições, safe areas → `references/layout.md`
   - botão, chip, card, anel/contador, selo, lower third, cursor → `references/components.md`
   - **layout pronto em SVG/Figma → animação** (inspecionar, fontes, linha de base, conferir) → `references/svg-to-motion.md`
   - montar projeto, tempos da fala, conferir, entregar, armadilhas → `references/workflow.md`
   - render, encoders, vídeo de fundo, verificação → `references/render.md`
3. Código: `assets/engine/` (motor de cenas + exemplos que rodam), `assets/svg-motion/page.template.html` (página autônoma design → animação), `assets/overlays/` (lower third em alpha), `scripts/` (render + ferramentas).

## 1. Estilo em uma página
- **Três easings, cada um com um papel**: `soft` = `cubic-bezier(.16,1,.3,1)` (entradas), `io` = `(.65,0,.35,1)` (wipes), `slow` = `(.529,-.008,0,1.005)` (câmera/transições). Nunca linear nem ease-in-out genérico; **sem scale bounce**.
- **Entradas = fade + blur vindo de um lado** (texto sobe de baixo, botão entra do lado), em escada (0,1–0,2 s). Blur só em entradas de elementos, nunca na câmera.
- **Anti-flicker é regra**: translate em pixels inteiros, blur some < 0,3 px, trava no estado final quando falta < 0,5 px, **sem `will-change`**, grid/linhas finas com traço largo + blur leve, encode sem B-frames quando há linhas finas. Confirme **no MP4** com `check-flicker.mjs`.
- **Câmera parada é parada** (sem órbita/deriva/shake/roll); gira só enquanto se move; zoom em escala log; o ponto final do zoom é o que fica centralizado.
- **Texto entra no tempo da fala**, palavra a palavra; completo e parado por ≥ 5–8 quadros antes de uma transição; **sem animação de saída** em overlays.
- **Valores mudam só em eventos** (`swap`): o antigo sobe e some, o novo vem de baixo.
- **Fundos sem banding**: dither TPDF antes de quantizar, brilhos como textura neutra, perfis sem quina; **grão suave** (cinza contínuo, `overlay`, opacidade ≈ .14, movendo), nunca pontinhos duros.
- **Sombras leves** em duas camadas (curta + larga); sem stroke nem glow em painéis.
- **Pouco texto, um herói por peça**, espaço negativo onde o editor escreve; texto no idioma da fala.
- **Tokens** (`--accent`, fontes, `TOKENS` do fundo) em um lugar só: a mesma construção serve a qualquer identidade.

## 2. Fluxo de trabalho
1. **Entender o ponto de partida** (`workflow.md §1`): layout SVG pronto → `svg-motion`; peça nova com câmera/cenas → `engine`; overlay transparente → `overlays`.
2. **SVG → HTML**: `scripts/svg-inspect.cjs` (linhas, bases, palavras, imagens) → `fit-fonts.mjs` (tamanho/tracking) → página do template (`data-base` por linha) → `check-ink.mjs` e `?ref=` contra o original, **nos dois formatos**.
3. **Motor de cenas**: copie `assets/engine/`, troque os tokens, escreva `scenes.js` (`draw(t)` determinística) e confira em `storyboard.html`/`player.html` (espaço = play, ← → = quadro).
4. **Conferir sem renderizar**: `scripts/shots.mjs` (instantes escolhidos + folha de contato) ou `preview.mjs`. Olhe início, meio das transições, **texto completo**, final.
5. **Renderizar só quando pedirem**: `scripts/render.mjs` (1080×1920/1080×1080 a 30 fps, `x264_nob` ou `x264_10hq`; overlays `--mode alpha --dedupe`).
6. **Verificar o arquivo**: `ffprobe -count_frames`, 3–4 quadros, `check-flicker.mjs` no texto parado e `--mode lines` no grid. Diga o que **não** foi verificado (tempo real, abrir no editor).
7. **Entrega**: não sobrescreva arquivos em uso sem a pessoa dizer (pasta/sufixo de versão); liste números inventados.

## 3. Checklist antes de entregar
- [ ] Texto curto, no idioma da fala, sincronizado; redação própria avisada.
- [ ] Entradas fade + blur com os easings certos; sem bounce; câmera parada está parada.
- [ ] Texto parado estável no **MP4** (amplitude ≤ 0,05 px); linhas finas sem pulsar.
- [ ] Texto casa com o design original (≤ 3 px por lado) em todos os formatos.
- [ ] Fundo sem banding (teste de 16 bits); grão suave, não áspero; sombras leves.
- [ ] Espaço negativo preservado; safe areas do formato respeitadas.
- [ ] Arquivo verificado (`ffprobe`, quadros); versão nova sem sobrescrever; o que não foi verificado dito.

## 4. Requisitos
Node 18+, `ffmpeg` no PATH, Chrome ou Edge; `cd scripts && npm install` (puppeteer-core). Fontes: instaladas ou pelo `<link>` das páginas (Google Fonts exige internet no render). Detalhes e comandos: `README.md` e `references/render.md`.
