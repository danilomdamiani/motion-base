# Anti-flicker: texto e linhas que "tremem" no vídeo final

Sintoma: texto parado que sobe/desce ±1 px, ou linhas finas que piscam, **só no MP4** (o quadro isolado parece perfeito). São quatro causas independentes; todas já aconteceram. Diagnóstico com `scripts/check-flicker.mjs` (mede o vídeo final).

## 1. Cauda do easing (frações de pixel)
Easings de saída longa (expo out) gastam o último pixel em centenas de ms: o texto "pula" de pixel em pixel, de forma irregular.
**Correção** (em `inS`/`apply`): translate em pixels **inteiros de tela**; blur desligado abaixo de 0,3 px; quando o que falta é < 0,5 px, trava no estado final (`transform:none`, `filter:none`).

## 2. Camadas compostas + render paralelo (ciclo de N quadros)
`will-change: transform/opacity/filter` (ou um elemento que já teve `transform` fracionário) vira camada composta que **lembra a rasterização anterior**. Com `--workers 3`, cada processo do Chrome renderiza 1 a cada 3 quadros com uma "fase" de raster diferente: o texto parado oscila ~0,8 px num **ciclo de 3 quadros** (ciclo = nº de workers).
**Correção**: nada de `will-change` em texto; desfaça o transform no estado final (`none`); translates inteiros (item 1) tornam as fases idênticas.
Teste: `check-flicker.mjs --mode text` num trecho parado; amplitude deve ser ≤ 0,05 px e sem inversões.

## 3. Linhas finas que andam (nítido/borrado alternando)
Uma linha de 1 px andando ≈ 0,5 px por quadro fica centrada no pixel (nítida) num quadro e entre dois pixels (borrada) no seguinte: **pisca a 15 Hz**. Vale para grid, réguas, bordas animadas.
**Correção**: traço **mais largo (≈ 2 px) + `feGaussianBlur` σ ≈ 0,9**, com a mesma energia de brilho (`stroke-opacity` ∝ 1/largura, ×1,3 para compensar o pico menor). Alternativas: passo de 1 px/quadro inteiro, ou velocidade bem menor.
Teste: `check-flicker.mjs --mode lines` (variação do pico < 12 %, autocorrelação lag-1 > −0,5).

## 4. Codificação H.264 (alternância P/B)
Linhas fracas e de baixo contraste são suavizadas mais nos quadros B que nos P: o brilho pulsa quadro sim, quadro não (período 2) mesmo com a fonte estável.
**Correção**: `render.mjs --enc x264_nob` (8 bits, `-bf 0`, CRF 16, preset slow). Não adianta baixar o CRF sem tirar os B-frames, e só aumenta o arquivo.
Para degradês escuros em 10 bits use `x264_10hq` (tem B-frames; verifique os dois: banding vs pulsação).

## Receita de verificação
1. `shots.mjs` em 3–4 instantes (olho): início, meio, texto completo, final.
2. Renderize um trecho curto (`--limit 90`) com o encoder final.
3. `check-flicker.mjs --video ... --crop W:H:X:Y --from <primeiro quadro parado> --to <fim>` para cada elemento (título, corpo, botão) e `--mode lines` para grid/réguas.
4. Mexeu em fonte, easing, grão ou encoder? Repita: os quatro defeitos reaparecem por regressão.

## Medições de referência (1080 px de largura)
- Texto parado bom: amplitude 0,00–0,02 px. Ruim: 0,5–0,8 px (ciclo de 3 = workers).
- Grid bom: variação do pico 3–8 %. Ruim: 16 % com alternância 51/46/51/44.
