#!/usr/bin/env node
/* Porto Vecchio — banco/parti_node.js: la prova delle PARTI ELEMENTARI in Node (src/unico_parti.js, la T.9 di commedia/MONDO_PIENO.md).
   Per ogni tipo (barricata, baracca, rampa, catapulta, carretto, torre, palco, ponte, zattera) 200 strutture generate con semi diversi:
   - LE REGOLE: nessuna compenetrazione fra due parti (scatole orientate, tolleranza 12 mm, i soli giunti ammessi), ogni parte poggia (il
     grafo dei contatti fino a terra), niente sottoterra; l'ordine di posa è montabile (ogni prefisso del piano sta su da solo);
   - LA FUNZIONE: la misura riconosce la cosa (la rampa ha 8-35°, il riparo copre, la catapulta tira, la zattera galleggia...);
   - LA VARIAZIONE: le strutture non sono tutte uguali (quante forme diverse);
   - I FALLIMENTI VERI: la versione «folle» (rampa troppo ripida, leva corta, zattera di lamiera) non passa la misura;
   - LA MISURA È DELLA FORMA: una rampa costruita a mano (non dal generatore) è riconosciuta; tolto l'appoggio, la portata scende;
   - IL TELEFONO: ≤ 40 parti; il tempo per generare, validare e misurare.
   Uso: node banco/parti_node.js   (esce con 1 se un caso fallisce) */
'use strict';
global.location = { search: '?commedia' };
const UP = require('../src/unico_parti.js');
let fail = 0, nOk = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (c) nOk++; else fail++; };
const N = 200;
for (const tipo of Object.keys(UP.TIPI)) {
  const T = UP.TIPI[tipo]; let valide = 0, funz = 0, montabili = 0, maxP = 0; const forme = new Set(); const t0 = Date.now();
  for (let s = 0; s < N; s++) {
    const o = { w: 5 + (s % 4), lato: s % 2 ? 1 : -1, gap: .8 + (s % 5) * .4, altezza: tipo === 'torre' ? 2 + (s % 3) * .5 : undefined };
    const P = UP.progetta(tipo, 'prova|' + s, o); if (!P) continue;
    const V = UP.valida(P.parti); if (V.ok) valide++; if (P.funziona.ok) funz++; maxP = Math.max(maxP, P.parti.length);
    // ogni prefisso del piano (l'ordine di posa) sta su da solo
    let mont = true; for (let k = 1; k < P.parti.length && mont; k++) { const W = UP.valida(P.parti.slice(0, k)); if (W.appese.some(i => !W.instabili.includes(i))) mont = false; } if (mont) montabili++;
    forme.add(P.parti.map(p => p[0]).sort().join(',') + '|' + Math.round(P.misure.altezza * 5));
  }
  const ms = ((Date.now() - t0) / N).toFixed(1);
  ok(valide === N && montabili === N && funz >= N * .97 && maxP <= 40 && forme.size >= 4, `${tipo}: ${valide}/${N} pulite, ${montabili} montabili in ordine, ${funz} funzionano (${T.eff}), ${forme.size} forme diverse, al più ${maxP} parti, ${ms} ms l'una`);
}
// i fallimenti veri: la versione folle non passa la misura
for (const tipo of ['rampa', 'catapulta', 'zattera']) {
  let no = 0, pul = 0; const perche = new Set();
  for (let s = 0; s < 40; s++) { const P = UP.progetta(tipo, 'folle|' + s, { folle: true }); if (!P) continue; if (UP.valida(P.parti).ok) pul++; if (!P.funziona.ok) { no++; perche.add(P.funziona.perche); } }
  ok(no >= 36 && pul === 40, `${tipo} folle: ${no}/40 non funzionano (${[...perche].join('; ')}), sempre pulite`);
}
// la misura è della forma: una rampa a mano (due casse e un'asse) è una rampa; senza le casse non lo è più
{
  const th = 16 * Math.PI / 180, B = [];
  B.push(['asse', Math.cos(th) - Math.sin(th) * .015, 0, Math.sin(th) + Math.cos(th) * .015 + .002, 0, th, 0, 0, 0]);
  B.push(['asse', Math.cos(th) - Math.sin(th) * .015, .21, Math.sin(th) + Math.cos(th) * .015 + .002, 0, th, 0, 0, 0]);
  B.push(['asse', Math.cos(th) - Math.sin(th) * .015, .42, Math.sin(th) + Math.cos(th) * .015 + .002, 0, th, 0, 0, 0]);
  B.push(['asse', Math.cos(th) - Math.sin(th) * .015, .63, Math.sin(th) + Math.cos(th) * .015 + .002, 0, th, 0, 0, 0]);
  const hs = .3, a = hs / Math.tan(th) + .012; B.push(['bancale', a + .4, .31, .073, Math.PI / 2, 0, 0, 0, 0], ['bancale', a + .4, .31, .219, Math.PI / 2, 0, 0, 0, 0]);
  const V = UP.valida(B), M = UP.misura(B), S = UP.soddisfa('rampa', M);
  ok(V.ok && S.ok && Math.abs(M.rampa.ang - 16) < .5, `una rampa fatta a mano: ${V.ok ? 'pulita' : JSON.stringify(V.sovr)}, ${M.rampa && M.rampa.ang}°, alta ${M.rampa && M.rampa.h} m, larga ${M.rampa && M.rampa.larg} m: ${S.ok ? 'è una rampa' : S.perche}`);
  const B2 = B.slice(0, 4), M2 = UP.misura(B2), V2 = UP.valida(B2);
  ok(!V2.ok && V2.appese.length === 4, `tolte le pile, le assi non poggiano più su niente (${V2.appese.length} appese)`);
  const B3 = B.concat([['asse', .8, .3, .5, 0, 0, 0, 0, 0]]), V3 = UP.valida(B3);
  ok(V3.sovr.length > 0, `un'asse messa dentro le altre è una compenetrazione (${V3.sovr.length} coppie)`);
}
// la catapulta: la leva lunga tira avanti, la corta all'indietro (stessa ricetta, misure diverse)
{ const a = UP.progetta('catapulta', 'x', {}), b = UP.progetta('catapulta', 'x', { folle: true });
  ok(a.misure.lancio && !a.misure.lancio.indietro && a.misure.lancio.gittata >= 5 && b.misure.lancio && b.misure.lancio.indietro, `la catapulta: bracci ${a.misure.lancio.bracci} → ${a.misure.lancio.gittata} m; la leva corta (${b.misure.lancio.bracci}) tira all'indietro`); }
// la zattera: il galleggiamento dalle parti (fusti sì, lamiera no)
{ const a = UP.progetta('zattera', 'x', {}), b = UP.progetta('zattera', 'x', { folle: true });
  ok(a.misure.galleggia > 200 && b.misure.galleggia < 80, `la zattera di fusti porta ${Math.round(a.misure.galleggia)} kg; quella di lamiere e travi ${Math.round(b.misure.galleggia)} kg`); }
console.log(`\n${nOk} ok, ${fail} NO`);
process.exit(fail ? 1 : 0);
