# Movimento (o "jeito de animar")

Código vivo: `assets/engine/lib.js` (motor de cenas) e `assets/svg-motion/page.template.html` (página autônoma). Toda animação é uma função **determinística** de `t`: o mesmo `t` dá sempre o mesmo quadro. O renderizador chama `render(t)` quadro a quadro.

## 1. Easing: três curvas, cada uma com um papel

| nome | curva | uso |
|---|---|---|
| `EASE.soft` (padrão) | `cubic-bezier(0.16, 1, 0.3, 1)` (expo out) | entradas de texto, UI, botões: arranque vivo, pouso longo e macio |
| `EASE.io` | `cubic-bezier(0.65, 0, 0.35, 1)` | revelações que atravessam o quadro (pílula/wipe, linhas que se desenham) |
| `EASE.slow` | `cubic-bezier(0.529, -0.008, 0, 1.005)` | câmera e transições entre cenas: arranque lento, pouso longo |

Nada de `linear` nem `ease-in-out` genérico (exceção: deriva constante de fundo, como um grid andando). Sem bounce nem overshoot: **nunca escala com mola**.

## 2. Entradas: fade + blur vindo de um lado

```js
inS(t, a, d = .9, dx = 0, dy = 60, bl = 22)   // devolve o style da entrada; '' quando termina
```
- Sempre **fade + blur + deslocamento curto**, vindo do lado de onde o elemento "vem": texto sobe de baixo (`dy 34–70`), botão/foto entram do lado (`dx ±70–110`), cards sobem de baixo (`dy ≈ 110`), painel de canto desce de cima.
- Duração 0,9–1,4 s para textos grandes; 0,7–1,0 s para UI. Blur inicial 14–26 px (em unidades de design). **Stagger** de 0,1–0,2 s entre linhas/itens (em escada, sem pressa).
- Blur **só nas entradas de elementos**, nunca na câmera (blur de movimento fica para a pós).
- Elementos inline (palavras) precisam de `display:inline-block` para o `transform` valer.
- Aberturas: `clip-path: inset(0 X% 0 0 round R)` ou, melhor para atravessar o quadro, **wipe com borda macia** (`mask-image: linear-gradient(90deg,#000 a%,transparent b%)`, degradê de ≈ 150 px) em volta do botão inteiro (pílula + rótulo + seta), com `EASE.io`.
- Sequência de botão (referência): ícone/cruz entra (fade + blur + escala .78→1) → pílula abre em wipe → rótulo entra da esquerda (`dx −14`, blur 8) → seta assenta (`dx −16, dy 16`).

## 3. Anti-flicker (obrigatório, leia `anti-flicker.md`)

O fim do easing é uma cauda de **frações de pixel**; o texto pula de pixel em pixel e, em render paralelo, cada processo rasteriza com uma fase diferente (tremor de ±1 px num ciclo de N quadros). Por isso `inS`/`apply`:
1. translate em **pixels inteiros de tela** (`Math.round`);
2. blur some abaixo de **0,3 px**;
3. quando falta **menos de 0,5 px**, trava no estado final (`transform: none`, sem filter);
4. **sem `will-change`** e sem camadas compostas persistentes em texto.

## 4. Texto escrevendo

- **Palavra a palavra, no tempo da fala**: cada palavra tem seu instante `a` (da transcrição); duração 0,9 s (ou 1,5 s com o easing soft para palavras lentas), `dy 46`, blur 20. `words(t, 'texto', a|[instantes], passo)`.
- **Letra a letra** só em palavra-chave curta: passo 0,035 s, cada letra 0,32 s (`dy 44`, blur 16). A palavra fica **completa e parada por ≥ 5–8 quadros** antes de uma transição (o editor precisa de um quadro para congelar).
- Layout estável: renderize todas as palavras desde o início com `opacity:0` (já faz `words()`): o texto centralizado não "pula" a cada palavra nova.
- Linhas de título entram em escada (0,10–0,14 s) e o texto de apoio depois, quando o título já pousou.

## 5. Números e valores

- Contador: `counter(t, a, b, final)` com o easing da peça + `font-variant-numeric: tabular-nums`.
- **Valor que muda por evento** (clique, troca de etapa): o antigo sobe e some, o novo vem de baixo (`swap(t, a, antigo, novo)`), 0,75 s, mesmo `grid-area` (o layout não pula). Em UI, valores mudam **só em eventos**, não continuamente.
- Formate no **idioma do vídeo** (`nf('de-DE')`, `nf('pt-BR', {style:'currency', currency:'BRL'})`).

## 6. Câmera (motor de cenas)

`camK(t, keys)`: `keys[0]` é a câmera inicial `{fx, fy, z, ax, ay}` (`fx,fy` = ponto do mundo; `ax,ay` = onde esse ponto cai na tela, padrão o centro; `z` = zoom em escala **log**); cada `[a, b, alvo]` leva a câmera ao alvo durante `[a, b]` com `EASE.slow`.
`cam3` = `camK` + giro 3D **proporcional à velocidade** (yaw no pan horizontal, pitch no vertical, sem roll). **Parada = zero.**

- **Câmera parada é parada**: nada de órbita, deriva, shake ou `sin(t)`. O editor corta e emenda trechos; qualquer micro-movimento atrapalha.
- Sem roll, sem blur de movimento.
- Mover só quando algo acontece (início da fala, entrada de um elemento); depois **ficar parado**.
- O ponto final de um zoom/pan (`fx,fy`) é o **centro do que deve ficar centralizado na tela**.
- Abertura variada (zoom-out, zoom-in saindo do centro, pan lateral); não abra tudo igual.
- Zoom em elemento-chave: ≈ 1,4× em card, 1,8–2× no trecho de ação, até ≈ 3× em objeto-herói.

## 7. Cursor humano (demonstrações de UI)

`curPos(t, [[t,x,y], …])` + `cursorEl(x, y, dark, press)`: coordenadas de **tela** por keyframes; cada perna usa `EASE.slow`; pernas com o mesmo ponto = pausa; arco leve (`x += 0.4·46·sin(πp)`, `y −= 46·sin(πp)`). **Um movimento de cada vez**, pausas entre eles, sem tremor, poucos cliques (1–3). No clique: escala −13 % em 0,29 s, o botão acende, o valor troca em +0,12 s. Seta clara com contorno escuro no fundo escuro e o inverso no claro.

## 8. Fundos que se mexem: grid e grão

- **Grid andando**: só as linhas perpendiculares ao movimento andam; use `período = uma célula` e `DUR` = tempo de uma célula para o **loop fechar sem emenda**; velocidade constante e baixa (≈ 14 px/s a 1080 px de largura). Recalcule o `d` do path por quadro e mantenha o **degradê de esmaecer** parado (gradient em `userSpaceOnUse` num path que não sofre `transform`).
- **Traço fino que anda pisca** (nítido/borrado quadro sim, quadro não, com passo ≈ 0,5 px): use traço **mais largo (≈ 2 px) + blur leve (σ ≈ 0,9)** com a mesma energia de brilho.
- **Grão**: ruído **cinza contínuo e suave**, mistura `overlay` (média neutra), opacidade **0,10–0,16**, desfoque leve (σ ≈ 0,45), mudando 12–24×/s. Nada de pontinhos brancos duros (parece filtro barato e pesa o arquivo). Fica **atrás** do texto.

## 9. Transições entre cenas (`seq` + `TR`)

`seq({ parts: [{ id, at, cap? }], tr: [{ a, b, type }] })` une cenas do mesmo fundo. Na janela `[a, b]` (≈ 1,2 s) as duas cenas dividem **um** movimento, com `EASE.slow`:

| tipo | cena que sai | cena que entra |
|---|---|---|
| `right` | desliza −104cqw, some entre .3 e .8 | entra de +104cqw com fade (.05–.55) |
| `push` (mergulho) | `scale 1 → 3.6`, some entre .3 e .7 | `scale .28 → 1`, aparece entre .25 e .65 |
| `pull` (recuo) | `scale 1 → .28` | `scale 3.6 → 1` |
| `dive` | só a saída do `push` | a própria cena traz o zoom in |

A cena que entra aceita **tempo local negativo** (esconder tudo antes de `t = 0`). Combine o sentido do movimento (zoom in com zoom in).

## 10. Ritmo e tempo

- Peças fullscreen **curtas** (4–10 s); divida o que passar disso.
- Sincronize com a fala: `t_local = tempo_bruto − início_bruto`; câmera e elementos reagem **na** palavra-chave (± 0,1 s), não antes. Se o texto precisa estar completo antes de uma transição, antecipe a entrada.
- Entre o fim da animação e o corte/transição deixe um **respiro parado** (≥ 0,25 s) e um quadro limpo.
- **Sem animação de saída** em overlays e lower thirds.
- Peça em loop (preview): `DUR` do vídeo de fundo = período do grid, senão o loop dá um "tranco".

## 11. Performance

- DOM reconstruído por quadro é aceitável (motor de cenas); evite `filter: drop-shadow` **por elemento** em grande número (um por grupo).
- Blur grande em muitos elementos simultâneos pesa: mantenha blur só nas entradas.
- Overlays em alpha: use `--dedupe` (partes paradas são puladas).
- Grão animado aumenta o arquivo (ruído não comprime): opacidade baixa ajuda; `grain_fps = 0` congela.
