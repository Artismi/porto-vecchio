/* Porto Vecchio — [suolo] LA GERARCHIA DEI SUOLI: chi sta sopra e chi si interrompe al confine (città nuova e campagna).
   Il committente: «il suolo fa ancora cose strane»: una via scura che passa sopra il lastricato della piazza invece di fermarsi al
   bordo e riprendere dall'altra parte, il marciapiede rialzato in mezzo a una piazza, la tinta del marciapiede sotto il lastricato.
   Una regola sola, dall'alto in basso (il più alto vince, il più basso si interrompe al confine con un taglio netto):
     7 opera        scale, fontane (caselle STAIRS e FOUNT)
     6 pedonale     la piazza pedonale: le caselle PIAZZA attaccate a una piazza delle opere (W.pedonali: sagrato, piazzette, marina,
                    la piazza alta dell'Ottagono). Una via dei veicoli che la attraversa diventa un attraversamento lastricato (il suo
                    lastricato, niente asfalto, niente cordolo, niente segni); le vie dei veicoli la toccano solo di lato (test_pedonale)
     5 carreggiata  le vie dei veicoli (città, litoranee, strade): l'asfalto, il porfido, il travertino della loro epoca
     4 piazza       la piazza carrabile (le altre caselle PIAZZA: Piazza Grande, i piazzali, la Rocca): la carreggiata ci passa sopra
                    col suo cordolo; vicoli, sentieri e marciapiedi si fermano al suo bordo
     3 marciapiede  le lastre rialzate lungo le vie di città: passano davanti alla bocca dei vicoli
     2 vicolo       i basoli dei vicoli e delle vie pedonali
     1 sterrato     la terra battuta, i sentieri, i vialetti
     0 suolo        selciati, cortili, terra, erba: tutto il resto (sotto a tutti)
   Le vie (tratti lineari): un tratto la cui MEZZERIA sta su un suolo più alto della via si interrompe lì (taglio dritto, di traverso alla
   via) e riprende dopo; i vicoli e i sentieri, che stanno in basso, si fermano anche di lato contro le piazze e le opere. Il marciapiede
   non sale mai su una piazza o un'opera. Lo usano pavimenti.js (la mappa dei materiali del suolo), render.js (la tela del colore e i
   marciapiedi) e la prova src/test_suolo.js. ?vecchiosuolo: com'era (nessuna gerarchia). */
var Suolo = (function () {
  'use strict';
  let OFF = typeof location !== 'undefined' && /[?&]vecchiosuolo\b/.test(location.search);
  const R = { suolo: 0, sterrato: 1, vicolo: 2, marciapiede: 3, piazza: 4, carreggiata: 5, pedonale: 6, opera: 7 };
  const PASSO = .5;
  let CACHE = new WeakMap();
  const dentroPoly = (P, x, y) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
  // il rango della via: le vie dei veicoli sono carreggiata; i vicoli e le vie pedonali vicolo; le sterrate e i sentieri sterrato
  const rangoVia = rd => !rd ? R.suolo : rd.kind === 'sterrato' ? R.sterrato : rd.kind === 'vicolo' || rd.pedonale ? R.vicolo : R.carreggiata;
  // le caselle col loro rango (solo quelle sopra il suolo comune): opera, piazza pedonale, piazza carrabile
  function di(W) {
    if (!W || !W.grid) return null; let S = CACHE.get(W); if (S) return S;
    const T = W.T, TS = W.TS, GW = W.GW, GH = W.GH, g = W.grid, CL = new Uint8Array(GW * GH), OP = (W.pedonali || []).filter(o => o.tipo === 'piazza' || o.tipo === 'piazza_alta');
    for (let i = 0; i < GW * GH; i++) if (g[i] === T.STAIRS || g[i] === T.FOUNT) CL[i] = R.opera;
    // le piazze: le caselle PIAZZA a gruppi (vicine di lato); un gruppo che tocca una piazza delle opere è pedonale
    const seen = new Uint8Array(GW * GH);
    for (let i0 = 0; i0 < GW * GH; i0++) { if (g[i0] !== T.PIAZZA || seen[i0]) continue; const L = [i0], st = [i0]; seen[i0] = 1; let ped = false;
      while (st.length) { const j = st.pop(), x = j % GW, y = (j / GW) | 0, cx = (x + .5) * TS, cy = (y + .5) * TS;
        if (!ped) for (const o of OP) if (o.r !== undefined ? Math.hypot(cx - o.x, cy - o.y) < o.r : dentroPoly(o.poly, cx, cy)) { ped = true; break; }
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue; const k = ny * GW + nx; if (g[k] === T.PIAZZA && !seen[k]) { seen[k] = 1; st.push(k); L.push(k); } } }
      L.forEach(k => { CL[k] = ped ? R.pedonale : R.piazza; }); }
    const rango = (x, y) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); return tx < 0 || ty < 0 || tx >= GW || ty >= GH ? 0 : CL[ty * GW + tx]; };
    // i tagli di una via: gli intervalli [s0, s1] (metri lungo la via) dove la mezzeria sta su un suolo più alto della via
    const TAGLI = new WeakMap();
    function tagli(rd) {
      if (OFF || !rd || !rd.pts || rd.pts.length < 2) return []; let q = TAGLI.get(rd); if (q) return q; q = [];
      const P = rd.pts, rv = rangoVia(rd); let s = 0, a0 = null;
      for (let k = 0; k < P.length - 1; k++) { const [ax, ay] = P[k], [bx, by] = P[k + 1], L = Math.hypot(bx - ax, by - ay);
        for (let t = 0; t < L; t += PASSO) { const su = rango(ax + (bx - ax) * t / L, ay + (by - ay) * t / L) > rv;
          if (su && a0 === null) a0 = s + t; else if (!su && a0 !== null) { q.push([a0, s + t]); a0 = null; } }
        s += L; }
      if (a0 !== null) q.push([a0, s + 1]);
      // i buchi di meno di un metro fra due tagli si chiudono (niente coriandoli di via)
      const m = []; q.forEach(c => { const l = m[m.length - 1]; if (l && c[0] - l[1] < 1) l[1] = c[1]; else m.push(c.slice()); });
      TAGLI.set(rd, m); return m;
    }
    const tagliata = (rd, s) => { const q = tagli(rd); for (const c of q) if (s >= c[0] && s < c[1]) return true; return false; };
    // la via è disegnata nel punto (x, y), a s metri lungo la mezzeria?
    function via(rd, x, y, s) {
      if (OFF) return true; if (s !== undefined && tagliata(rd, s)) return false;
      const rv = rangoVia(rd); return rv >= R.carreggiata || rango(x, y) <= rv;   // i vicoli e i sentieri si fermano anche di lato
    }
    // il marciapiede rialzato può stare qui? Mai sulle piazze e sulle opere
    const marciapiede = (x, y) => OFF || rango(x, y) < R.piazza;
    // i pezzi disegnati di una via: le polilinee fra un taglio e l'altro (per la tela)
    function pezzi(rd) {
      const q = tagli(rd), P = rd.pts; if (!q.length) return [P]; const out = []; let cur = [], s = 0;
      const pt = (k, t, L) => [P[k][0] + (P[k + 1][0] - P[k][0]) * t / L, P[k][1] + (P[k + 1][1] - P[k][1]) * t / L];
      for (let k = 0; k < P.length - 1; k++) { const L = Math.hypot(P[k + 1][0] - P[k][0], P[k + 1][1] - P[k][1]) || 1e-6;
        // i confini dei tagli dentro questo segmento
        const cuts = [0]; q.forEach(c => c.forEach(e => { if (e > s && e < s + L) cuts.push(e - s); })); cuts.push(L); cuts.sort((a, b) => a - b);
        for (let j = 0; j < cuts.length - 1; j++) { const t0 = cuts[j], t1 = cuts[j + 1]; if (t1 - t0 < 1e-6) continue; const off = tagliata(rd, s + (t0 + t1) / 2);
          if (off) { if (cur.length > 1) out.push(cur); cur = []; continue; }
          if (!cur.length) cur.push(pt(k, t0, L)); cur.push(pt(k, t1, L)); } s += L; }
      if (cur.length > 1) out.push(cur); return out;
    }
    S = { R, CL, rango, rangoVia, tagli, tagliata, via, marciapiede, pezzi, TS, GW, GH };
    CACHE.set(W, S); return S;
  }
  // [suolo2] LE REGOLE DEL BORDO DELLA VIA (render.js le usa per costruire, src/test_suolo.js per contare; ?vecchiosuolo2: com'era).
  //  - LO SCIVOLO sta solo davanti a una zebra dipinta (render.js prende le zebre del piano di segnaletica.js, già sulla mezzeria vera e
  //    perpendicolari alla via), largo quanto le strisce più 20 cm per parte e raccordato col marciapiede in 1,2 m lungo la via; scende
  //    A FILO della strada (resta mezzo centimetro: la mesh c'è) e ha il colore delle lastre, senza la fascia chiara del cordolo né la canaletta
  //    scura (prima: scendeva all'82%, e mentre scendeva l'altezza passava per quella del cordolo e per quella della canaletta, e il colore
  //    che segue l'altezza dipingeva sul marciapiede rettangoli chiari e una chiazza tonda scura). Il rilievo lo dà la forma, non la tinta.
  //  - LE FONTANE: la vasca poggia sul lastricato; il terreno sotto non si buca (si bucava la casella intera e sotto si vedeva il mare: il
  //    quadrato d'acqua blu attorno alla vasca ottagonale) e la casella si dipinge come la piazza.
  let OFF2 = typeof location !== 'undefined' && /[?&]vecchiosuolo2\b/.test(location.search);
  const ss = (a, b, t) => { t = Math.max(0, Math.min(1, (t - a) / (b - a))); return t * t * (3 - 2 * t); };
  // quanto lo scivolo della zebra c (x, y al centro, ux, uy lungo la via, w la carreggiata, L la lunghezza delle bande) abbassa il punto (x, z): 0..1
  function scivolo(c, x, z) {
    const dx = x - c.x, dz = z - c.y, al = Math.abs(dx * c.ux + dz * c.uy), pe = Math.abs(-dx * c.uy + dz * c.ux), half = c.w / 2;
    if (OFF2) { if (pe < half - .5 || pe > half + 2.6) return 0; return (1 - ss(1.2, 1.9, al)) * (1 - ss(half + 1.1, half + 2.3, pe)); }
    if (pe < half - .5 || pe > half + 2.2) return 0; const a0 = (c.L || 2.6) / 2 + .2;
    return (1 - ss(a0, a0 + 1.2, al)) * (1 - ss(half + 1.2, half + 2.0, pe));
  }
  // l'altezza del marciapiede h dopo lo scivolo (low 0..1)
  const scivoloH = (h, low) => OFF2 ? h * (1 - .82 * low) : h <= .005 ? h : Math.max(.005, h * (1 - low));
  const bucoTerreno = (v, T) => OFF2 ? v === T.FOUNT || v === T.PIER : v === T.PIER;   // il terreno si buca sotto la casella? (il pontile sì: sotto c'è l'acqua)
  return { R, di, rangoVia, scivolo, scivoloH, bucoTerreno, vecchio: v => { OFF = !!v; CACHE = new WeakMap(); }, vecchio2: v => { OFF2 = !!v; }, get off() { return OFF; }, get off2() { return OFF2; } };   // vecchio(true): com'era, per la prova del prima; vecchio2(true): le regole del bordo di prima
})();
if (typeof window !== 'undefined') window.Suolo = Suolo;
if (typeof module !== 'undefined') module.exports = Suolo;
