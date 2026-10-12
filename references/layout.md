# Diagramação (formatos, escala, composição)

## 1. Unidades e formatos

O motor mede em **unidades de design = px do formato de referência** e converte com `q(n)` para `cqw`, então a peça escala sozinha (600 px ou 3840 px).

| formato | unidades de design | como declarar |
|---|---|---|
| 16:9 | 3840 × 2160 (padrão) | nada |
| 9:16 | 1080 × 1920 | `format: [1080, 1920]` na cena |
| 1:1 | 1080 × 1080 | `format: [1080, 1080]` |

Cada cena tem seu formato (storyboard e player misturam formatos). Centro do quadro = `(CX, CY)`. Na página autônoma o mesmo vale: `--u = 100cqw / largura` e `1u = 1 px do design original`.

**Mesma peça em vários formatos**: não é só escalar. Refaça as **quebras de linha** (9:16: 4 linhas de título; 1:1: 3), mantenha o **mesmo estilo e tempos**, e escale tipografia/botão pela razão entre os formatos (ex.: o design 9:16 era ×1,21 o 1:1 em títulos e botão, mas o corpo de texto sobe ×1,5 para ler no celular). Reutilize os **mesmos ativos** (selo, botão, ícones) deslocados para as posições do design de cada formato.

## 2. Escala tipográfica de referência (fração da largura W)

| Papel | 16:9 (W=3840) | 9:16 / 1:1 (W=1080) |
|---|---|---|
| número-herói | 430–760 | 220–330 |
| palavra-herói | ≈ 620 | ≈ 200–260 |
| título | 190–250 | 78–95 |
| texto de apoio | 78–150 | 30–48 |
| rótulo de UI (caixa alta, tracking largo) | 30–46 | 18–24 |
| botão | 46–60 | 31–38 |

Regra: **um herói por peça** (um número, uma palavra ou um objeto) e no máximo uma legenda pequena. Texto sempre curto.

## 3. Arquétipos de composição

1. **Herói centrado com anéis**: número no centro, anel fino (r 640–830) e anel externo (r+190) a 7 % de opacidade, halo branco atrás, legenda 215–400 px abaixo. Câmera só com zoom suave do centro. (`ex01`.)
2. **Pilha título + apoio + botão** (peça de anúncio, 9:16 e 1:1): título em 3–4 linhas centralizadas (sans bold + uma palavra/linha em serifada itálica), texto de apoio em 2–3 linhas, botão logo abaixo; fundo é vídeo ou grid. Entradas em escada. (`svg-motion/page.template.html`, `ex04`.)
3. **Texto palavra a palavra + pan** (`ex02`): a palavra final fica no ponto em que a câmera **termina** o pan (x da palavra = `fx` final, centrada), na parte de cima/atrás dos elementos de dados.
4. **Conjunto de cards** (fileira): centros espaçados 700–1160, foco por zoom (1,4×, âncora `ay` acima do centro), os demais caem a 38 % de opacidade; texto explicativo no terço inferior. (`ex03`.)
5. **Régua/tempo**: faixa horizontal com marcas; o trecho de interesse recebe moldura; texto de apoio acima/abaixo.
6. **Lower third** (overlay): canto inferior esquerdo, margem 150 (16:9), card ≈ 1580×470; imagem à esquerda, texto à direita.
7. **Objeto-herói à esquerda, texto à direita**: âncora de tela `ax ≈ 1200`/`ay ≈ 800` para deixar a metade direita livre.

## 4. Camadas (ordem)

`bg` (canvas com dither, ou `<video id="bg">`) → grid/blobs (opcional) → `view` (câmera) → `grain`. Em página autônoma: bg → grid → grão → texto → botão (wipe) → ícone.
Dentro de `view`: **mundo** (anda com a câmera: halos → gráficos SVG → textos) e **HUD** (preso à tela: painel/pílula/texto → cursor por último). Elementos que mudam de foco somem antes de um zoom que não é mais sobre eles.

## 5. Safe areas e espaço negativo

- **9:16 (stories/reels/shorts)**: a interface da plataforma cobre o topo (≈ 250 px) e o rodapé (≈ 340–400 px) de 1920: mantenha texto e botão **dentro de y ≈ 250–1550**. (Valores típicos; confira na plataforma.)
- **Fundo em vídeo**: reserve a faixa onde o objeto-herói do vídeo está (casa, produto, rosto) livre de texto; o texto entra na área vazia (céu, parede).
- Se o editor escreve texto por cima depois, **deixe a área livre** (terço inferior, metade direita, canto superior esquerdo). Se ele disser que escreve, **tire** o texto da peça. Pergunte (ou assuma e avise) qual área ele quer livre.

## 6. Quando usar escuro e claro

- Escuro: números, dinheiro, ação, ritmo, peças com vídeo.
- Claro: estrutura, explicação e calma (partes de um método, régua de tempo).
- Uma versão unida usa **um só fundo**; o brilho vem de **uma borda** (`top` por padrão, `btm` quando há botão/texto embaixo).

## 7. Direção das entradas

- Textos: sobem de baixo, em escada, palavra a palavra quando a fala pede.
- Foto/ícone/botão: do lado onde estão (`dx ±70–110`).
- Cards: sobem de baixo (`dy 110`) com stagger de 0,22 s.
- Painel de canto: desce de cima (`dy −50`).
- Botão/pílula: abre em **wipe** da esquerda para a direita (ou do centro para os lados) + sobe um pouco.
- Números de herói: sobem de baixo, **centralizados**; sobem de novo (≈ 120) quando uma legenda entra embaixo.
- Valores que mudam: o antigo **sobe** e some, o novo vem **de baixo**.
