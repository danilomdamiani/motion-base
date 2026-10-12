/* Versões unidas: cenas vizinhas com o MESMO fundo viram uma peça só (copie para merged.js).
   parts = [{ id, at, cap }]  at = segundo em que a cena começa; cap = teto do tempo local.
   tr    = [{ a, b, type }]   transição entre a parte i e a i+1 (type: right | push | pull | dive); a cena que entra
                              precisa aceitar tempo local negativo (esconder tudo antes de t = 0).
   Duração = soma exata das falas coladas em corte seco. Escuro e claro não se misturam na mesma peça unida. */
SCENES.EX = seq({
  n: 'EX', file: 'EX Exemplo unido', title: 'ex01 → ex02', dur: 9.0, src: '(exemplo)',
  parts: [{ id: 'ex01', at: 0 }, { id: 'ex02', at: 4.0 }],
  tr: [{ a: 3.6, b: 4.8, type: 'right' }]
});
const MERGED = ['EX'];
