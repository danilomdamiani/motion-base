# Componentes reutilizáveis

Medidas em **unidades de design** (4K = 3840×2160; vertical/quadrado = 1080 de largura): escale pelo formato (`layout.md §1`). Código de apoio em `assets/engine/lib.js`; exemplos que rodam em `assets/engine/scenes.example.js` e `assets/svg-motion/page.template.html`.

## 1. Chip
`chip('TEIL 1', 1.5)`: fonte 42·s, altura 112·s, padding 44·s, raio 12·s, fundo `--accent` com brilho leve no topo, texto `--accent-ink`. Use como etiqueta de etapa/categoria.

## 2. Botão / pílula (CTA)
- Forma: pílula, ou **paralelogramo** (`clip-path: polygon(7% 0,100% 0,96% 100%,0 100%)`) para dar velocidade. Altura 98–120 (1080 de largura), texto 31–38.
- Sombra em **duas camadas** (curta + larga): `drop-shadow(0 6 5 rgba(0,0,0,.22)) drop-shadow(0 30 34 rgba(0,0,0,.25))`.
- Entrada (referência, `page.template.html`): ícone entra com fade + blur + escala .78→1 → pílula, rótulo e seta abrem juntos num **wipe** de borda macia (150 px) com `EASE.io` em ≈ 1,05 s → rótulo entra da esquerda (`dx −14`, blur 8) → seta assenta (`dx −16, dy 16`).
- Rótulo misto (palavra em serifada itálica + resto em sans) funciona bem: `<span class="jz">Jetzt</span> Förderung berechnen`.

## 3. Card claro
Branco, raio 72 (em 1000×1100), sombra quente suave `0 30 100 rgba(…,.12)` + contorno de 2 px a 8 %; coluna: chip / ícone grande (stroke fino, viewBox 24, traço 1,2–1,3) / título display 112. Foco: câmera `z 1.4`, âncora `ay` acima do centro, os outros cards a 38 %. Texto embaixo no HUD (terço inferior), palavras no tempo da fala; o anterior some (fade + blur para cima) quando a câmera vai ao próximo.

## 4. Anel + número-herói
Círculo `r 640–830` com traço 3–6 que **se desenha** por `stroke-dasharray`, anel externo `r+190` a 7–10 %, halo branco (`HALO`) atrás. Número display 430–760 entra **centralizado**, conta com `counter()` e sobe ~120 quando a legenda entra embaixo. Arco de progresso: `arc()` + `stroke-linecap: round`.

## 5. Selo / imagem com transparência
`<div class="badge fx"><img></div>`: o wrapper anima (fade + blur + `dy 22` + escala .96→1) e o `<img>` leva `filter: drop-shadow(0 7 9 rgba(0,0,0,.22))`. Não anime o `filter` da própria imagem (conflita com o blur).

## 6. Rótulo pequeno (label)
`.label`: caixa alta, `letter-spacing .26em`, peso 500, cor `--accent`, 30–46 (4K) / 18–24 (1080). Dois rótulos + número formam um "painel de valores".

## 7. Painel de valores (dois números lado a lado)
Duas colunas empilhadas (rótulo em cima, número embaixo) separadas por um fio vertical em degradê que some nas pontas; raio = altura/2; `min-width` por coluna para o layout não pular; valores mudam **só em eventos** com `swap()`.

## 8. Cursor
`cursorEl` + `curPos` (ver `motion.md §7`). Usado em demonstrações de interface: entra reto até o alvo, para, clica uma vez (escala −13 %, o botão acende, o valor troca em +0,12 s), some junto com o painel quando o foco muda.

## 9. Grid de fundo
Linhas finas (traço 2 px + blur σ .9, `stroke-opacity ≈ .46`, `opacity .2`) com esmaecimento radial para o centro; verticais **andam** uma célula por `DUR`. Veja `page.template.html` (`drawGrid`) e `anti-flicker.md §3`.

## 10. Lower third (overlay em alpha)
`assets/overlays/lower-third.template.html`: página autônoma, fundo transparente, `__TITLE__`/`__SUBTITLE__`. Barra de destaque desenha-se, título e subtítulo sobem em escada, **só entrada** (sem saída), sem glow nem drop shadow. Renderize com `--mode alpha --dedupe` (ProRes 4444 `.mov`). Margem 150 (16:9), canto inferior esquerdo.

## 11. Lista (itens com marcador)
Marcadores quadradinhos na cor de destaque, itens em escada (0,15 s), corpo leve (300–400); muito espaço negativo, nada de caixas pesadas.
