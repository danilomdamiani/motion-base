# Fluxo de trabalho (do pedido ao arquivo entregue)

A renderização está em `render.md` (scripts em `scripts/`). Aqui: como montar o projeto, conferir, entregar e não quebrar nada.

## 1. Escolha o ponto de partida

| Você tem… | Use |
|---|---|
| um layout pronto (SVG/Figma) para virar vídeo, em um ou mais formatos | `assets/svg-motion/page.template.html` + `references/svg-to-motion.md` |
| uma peça a construir do zero, com câmera, cenas, transições, várias peças e storyboard | motor de cenas `assets/engine/` |
| um overlay com transparência (lower third, selo, barra de título…) | `assets/overlays/*.template.html` (página autônoma, `--mode alpha`) |

## 2. Projeto novo (motor de cenas)
1. Pasta de trabalho (ex.: `<projeto>/motion/`); copie de `assets/engine/`: `lib.css`, `lib.js`, `player.html`, `storyboard.html`, `page-template.html`; `scenes.example.js` → `scenes.js`; `merged.example.js` → `merged.js` (apague as cenas de exemplo que não usar, mas **mantenha `const ORDER` e `const MERGED`**: storyboard e player leem os dois). Opcional: `launch.json` → `<projeto>/.claude/launch.json` (servidor `storyboards`, porta 8765).
2. Uma página `.html` por peça a partir de `page-template.html` (troque `<title>` e o id em `boot('id')`). `boot()` define `window.DUR`, `window.render(t)` e um loop de preview cancelável na global `raf`; `?t=2.5` congela um instante.
3. Tokens do projeto: `lib.css` (`:root`) e `TOKENS` no `lib.js`; fontes pelo `<link>` das páginas.
4. Conferir: `http://localhost:8765/storyboard.html` e `…/player.html?s=ex01` (espaço = play/pausa, ← → = quadro a quadro, PageUp/PageDown = peça anterior/seguinte).

Anatomia de uma peça em `scenes.js`:
```js
SCENES.id = {
  n: '01', file: '01 nome do arquivo', title: '…', kind: 'dark btm', dur: 7.8, format: [1080, 1920],   // format opcional
  say: '„fala no idioma do vídeo“', txt: 'texto que aparece na tela',
  beats: [[t, 'câmera', 'o que acontece'], …],     // viram os quadros do storyboard
  draw(t) { …; return { w: geo(g) /*mundo*/, hud: '…' /*tela*/, cam: camK(t, [...]) }; }
};
```
- Adicione o id em `ORDER`; peças unidas em `merged.js` com `seq({ … })`, ids em `MERGED`. Edições numa cena valem para a peça avulsa **e** para as unidas.
- **Fatias** de uma peça mestra: uma função (`cards(t)`) e `SCENES.x.draw = t => cards(t + offset)`.
- `at(x, y, html, style, cls)` posiciona pelo **centro** (`l` esquerda, `r` direita). `geo()` é um SVG do tamanho do formato sobre o mundo.
- Overlays em alpha são páginas **autônomas** (sem `lib.js`): `html,body{background:transparent}`, `#f` com `container-type:inline-size`, mesma matemática (`q`, `bezier`, `win`, `inS`), `window.DUR`, `window.render`, `raf`.

## 3. Storyboard primeiro, animar depois
Para peças novas: entregue **instruções + quadros congelados** (`beats`) e espere aprovação; um storyboard aprovado vira modelo para os outros. Se pedirem ajustes em lista, execute **todos, na ordem, e responda por item**; uma correção de cada vez quando o pedido for isolado.

## 4. Tempos a partir da fala (vídeo com narração)
1. Procure as palavras na transcrição palavra a palavra (`HH:MM:SS,mmm`); vale a **gravação**, não o roteiro.
2. Início bruto da peça (`src`) e `t_local = tempo_bruto − início_bruto`; em versões unidas `t_unido = at_da_cena + t_local`.
3. Texto palavra a palavra: anote o instante de cada palavra e passe para `words()`/`inS`.
```powershell
$c = Get-Content transcript.srt -Encoding UTF8
for ($k=0; $k -lt $c.Count; $k++) { if ($c[$k] -match '^(\d\d):(\d\d):(\d\d)[,.](\d+) --> ') {
  $s = [int]$matches[2]*60 + [int]$matches[3] + [double]("0." + $matches[4])
  if ($s -ge 473 -and $s -le 485) { '{0:N1}s {1}' -f $s, $c[$k+1] } } }
```
Mensagens podem vir **ditadas por voz** (palavras trocadas): na dúvida siga o padrão provável e **diga a suposição**.

## 5. Conferir sem renderizar
- `node scripts/shots.mjs --url http://localhost:8770/peca/index.html --times 0.3,1,2,4.8 --size 1080x1920 --out prev` (aceita `?query`, `<video>`, `--q ref`). Ou `scripts/preview.mjs` (file://, motor de cenas).
- Olhe: início, **meio das transições**, **instante do texto completo**, o último quadro; procure texto cortado, sobreposição, câmera cortando conteúdo, espaço vazio, elemento que devia estar centralizado fora do centro.
- SVG → HTML: `check-ink.mjs` contra o original e `?ref=` (ver `svg-to-motion.md §5`).
- **Banding**: teste de 16 bits reduzido e contraste exagerado (`visual-base.md §3`). Alpha: `alphaextract,format=gray`.
- **Flicker**: no **MP4** com `check-flicker.mjs` (`anti-flicker.md`).
- Diga sempre o que **não** foi verificado: ver em tempo real, abrir no editor de vídeo.

## 6. Entrega e versões
- **Não sobrescreva** arquivos que a pessoa pode estar usando: pasta/sufixo novo por versão (`_v2`, `_v3`), a menos que ela diga para sobrescrever (e então sobrescreva sem perguntar de novo); **confirme a pasta de saída** se não foi dita. Cuidado: ela pode ter **renomeado** os arquivos entregues (liste a pasta antes de procurar a versão anterior).
- Padrão: fullscreen H.264 (`x264_10hq` 10 bits para degradês escuros; `x264_nob` 8 bits para linhas finas), **30 fps** (60 só se pedirem); overlays `--mode alpha` (ProRes 4444) com `--dedupe`. Resolução: a do formato (ex.: 1080×1920) ou 1440p/4K quando pedirem.
- Nome do arquivo = nome do HTML.
- Depois de renderizar: `ffprobe -count_frames` (resolução, fps, `nb_read_frames = dur × fps`, `pix_fmt`), extraia 3–4 quadros, rode `check-flicker.mjs` nos elementos parados; em alpha componha sobre uma cor (`overlay=format=auto`).
- **Só renderize quando pedirem** ("renderiza"); com "não renderiza ainda", mostre quadros e espere. Lotes longos em segundo plano com log (um `.ps1` que roda os `node render.mjs` em sequência). Se interromperem, pare os `node` e **recomece** o arquivo interrompido (o MP4 parcial existe no disco).
- Resuma por arquivo: duração, quadros, codec/pix_fmt, tamanho, o que foi verificado; liste os **números inventados** (valores, preços, porcentagens) para confirmar com o cliente.

## 7. Armadilhas (já aconteceram)
- **Edições em lote com PowerShell**: `foreach ($p in @(@('a','b')))` **achata** o array; `.Replace($p[0], $p[1])` pode corromper o arquivo todo. Use a ferramenta **Edit** ou um **script Node escrito com Write** (com checagem `if (!s.includes(a)) throw …`) e **backup** antes de edições grandes. Strings com `"`, crases e `${}` entre aspas duplas **interpolam** (`"${GLOWBG('x')}"` vira vazio e a edição passa despercebida): use aspas simples e confira com Grep.
- PowerShell: não nomeie funções `R`, `T`, `E` (`r` = `Invoke-History`); case-insensitive (`L_v5.png` = `l_v5.png`); caminhos com acento/espaço entre aspas; `Start-Process pwsh -File` pode falhar em silêncio (rode em segundo plano pela ferramenta e confira o log); `Remove-Item` em caminhos com `(`/`+` pode ser bloqueado (use `-LiteralPath` ou `node -e "fs.unlinkSync(...)"`); `Select-String -SimpleMatch $k -Quiet` sem `-Pattern` trata `$k` como caminho.
- `mix-blend-mode` no pai isola o filho: camadas de blend/ruído precisam ser **irmãs**.
- `<img>` recriada por `innerHTML` a cada quadro pode piscar em branco: crie a imagem uma vez e mova o nó.
- `mask-image` recorta `box-shadow` fora da caixa: ponha o brilho num contêiner maior (`inset: −420px`).
- Comandos longos (≈ 50 s de peça leva 4–5 min a 1440p30): `run_in_background`/timeout alto e acompanhe o log.
- Medir brilho em gráfico de teste: `format=gray16le` (não `gray`) e **calibre o offset** com a média real do recorte; offset errado dá imagem toda preta e parece bug.
- Preview de apps só mostra `file://` como snapshot (sem `<video>`): teste por `http://localhost` (`python -m http.server`).

## 8. Como a pessoa costuma pedir (princípios)
- Aprovação: **premium, suave, leve, calmo**. Crítica forte: **"cara de IA"** (degradês e brilhos genéricos demais) → formas simples, cor sólida e viva, glow levíssimo.
- "Está flickando / bugado": medir no MP4 (`anti-flicker.md`), não só olhar quadros.
- Ela vê os quadros no navegador e os vídeos no editor de vídeo: diga o que não foi verificado.
