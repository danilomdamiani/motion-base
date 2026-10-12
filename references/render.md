# Render: HTML → vídeo (local)

O vídeo sai de capturar `render(t)` quadro a quadro com o Chrome sem janela e juntar no ffmpeg. Exato, repetível e sem depender do desempenho do navegador. Scripts em `scripts/` (`render.mjs`, `preview.mjs`, `shots.mjs`, mais as ferramentas de conferência).

## Requisitos e instalação (1× por máquina)
- Node 18+, `ffmpeg` no PATH, Chrome ou Edge (ou `--chrome <exe>` / variável `CHROME_PATH`).
- `cd scripts && npm install` (instala `puppeteer-core`).
- Afinar workers: `node scripts/render.mjs --html peca.html --bench` → melhor `--workers` (mais instâncias nem sempre é melhor; padrão = threads/3).

## Contrato mínimo da página
- `window.DUR` (segundos) e `window.render(t)` **determinística**.
- Contêiner `#f`; fundo em vídeo opcional: `<video id="bg" muted playsinline>`.
- Loop de preview que dá para parar: id do `requestAnimationFrame` na global `raf` (o render faz `cancelAnimationFrame(raf)`).
- `document.fonts.ready` antes de começar; fontes instaladas, de rede ou embutidas.
- Medidas em `cqw`/`--u` (`container-type:inline-size` no `#f`): a cena escala sozinha. Páginas em px para 1920×1080: `--dsf 2`.
- Animações só em CSS: `window.render = t => document.getAnimations().forEach(a => { a.pause(); a.currentTime = t*1000 })` (nesse caso `--dedupe` não serve).

## Comandos
```bash
node scripts/preview.mjs --html peca.html --times 0.4,1.5,3,5 --out prev [--alpha] [--video bg.mp4 --loop 10]   # sem renderizar
node scripts/render.mjs  --html peca.html --out saida.mp4 --width 1080 --height 1920 --fps 30 --enc x264_nob
node scripts/render.mjs  --html peca.html --out saida.mov --mode alpha --dedupe                                    # ProRes 4444 com alpha
node scripts/render.mjs  --html peca.html --out saida.mov --enc prores                                             # ProRes 422 HQ
```

## Encoders (`--enc`)
| nome | o que é | quando |
|---|---|---|
| `x264_10hq` (padrão) | H.264 10 bits, CRF 10, `tune grain`, 4:2:0 | fundos escuros com degradê (anti-banding). Se o editor não abrir 10 bits, use `prores` |
| `x264_nob` | H.264 8 bits, preset slow, CRF 16, **sem B-frames** | linhas finas/grid/texto parado (sem pulsação P/B); entrega leve (≈ 10–20 MB / 5 s em 1080×1920) |
| `x264` | H.264 8 bits, preset medium, CRF 14 | rascunho bom |
| `prores`, `prores_lt` | ProRes 422 HQ / LT | abre em qualquer editor |
| `--mode alpha` | ProRes 4444 com canal alpha (`.mov`) | overlays transparentes (H.264 não guarda alpha) |

Opções úteis: `--width/--height/--fps` · `--workers N` · `--dsf 2` · `--query render` (acrescenta `?render` à URL) · `--jpeg 97` (**só rascunho**: apaga o grão e causa banding) · `--dedupe` · `--limit N` (testes) · `--cpu` · `--chrome <exe>` · `--bench`.

## Fundo em vídeo capturado junto (zoom/parallax/vídeo de fundo)
1. `node scripts/render.mjs --make-intra fundo.mp4 fundo-intra.mp4` (all-intra: seek exato e rápido; só para render).
2. `--video --bg fundo-intra.mp4 --loop <duração do fundo em s>`: o script busca o quadro `t mod loop` a cada captura (a página precisa ter `<video id="bg">`).
3. Fundo curto numa cena longa: se já faz loop use `--loop`; senão crie versão vai-e-volta.
4. Confira o fundo: `ffprobe` (profile, pix_fmt, color_range/space) e `signalstats` (YMIN/YMAX: preto em 16 e máximo < 235 = faixa limitada lida certo como bt709).

## Qualidade
- **Capture PNG** (padrão). Tags de cor bt709/tv na saída; não troque a matriz no meio do caminho.
- Fonte 8 bits com pouco grão (H.264 Main) já tem banding próprio em degradês muito escuros: o render não corrige.
- Gradiente de texto (`background-clip:text`) com `letter-spacing` negativo corta o último glifo.

## Velocidade (referência: 6 núcleos + GTX 1060)
4K60 ≈ 3–5 fps de captura; 1080×1920 ≈ 10–16 fps com 3 workers. `--dedupe` pula quadros com DOM idêntico (5–70 %; não rende com vídeo de fundo ou grão animado). O gargalo é captura/rasterização, não o encode. O script mata os processos do Chrome ao final.

## Verificar o arquivo (não pule)
```bash
ffprobe -select_streams v:0 -count_frames -show_entries stream=codec_name,profile,pix_fmt,width,height,r_frame_rate,nb_read_frames,duration -of csv=p=0 arq.mp4
ffmpeg -ss 2.5 -i arq.mp4 -frames:v 1 -update 1 q.png      # início, meio, fim
node scripts/check-flicker.mjs --video arq.mp4 --crop W:H:X:Y --from N --to N            # texto parado
node scripts/check-flicker.mjs --video arq.mp4 --crop W:H:X:Y --mode lines               # grid/linhas finas
```
`nb_read_frames` = `DUR × fps`. Em alpha componha sobre uma cor e confira que só o elemento aparece. Diga ao usuário o que foi e o que **não** foi verificado.

## Armadilhas
- Disco: cópias all-intra, ProRes 4444 e PNG temporários são grandes (um lower third de 14 s em 4444 ≈ 1,3 GB).
- `ffmpeg vstack/hstack` exigem `inputs=N` correto (N ≥ 2) e `-frames:v 1 -update 1` para PNG único.
- ProRes não toca em navegador: gere um H.264 à parte para pré-visualizar.
- Nomes de função em PowerShell: não use `R`, `T`, `E`. Caminhos com acento/espaço sempre entre aspas.
