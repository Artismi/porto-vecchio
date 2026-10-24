/* Porto Vecchio — [pulizia] LE STRADE INTEGRE: il controllo delle vie della città nuova sui dati del mondo (W.roads, la griglia, le
   case coi lotti orientati, W.pezzi, W.nodi, W.sets, i luoghi). Non disegna niente e non entra nella build: lo usano
   strumenti/strade_integre.js (nel gioco vero, coi materiali del suolo e gli ostacoli) e la prova src/test_strade_integre.js.
   L'utente: «strade che si interrompono e cambiano materiale di netto, che passano sotto le case, case e altre cose che interrompono
   la strada». Qui, per ogni via di città, vicolo, strada e litoranea nella cornice:
   - capo_cieco   un capo della via che non arriva a niente: non tocca un'altra via, una piazza (W.nodi, W.sets, caselle PIAZZA), una
                  banchina, una scala, una porta, un luogo, un pezzo che si attraversa (porte, archi, sottopassi, scalinate), né esce
                  dalla cornice;
   - capi_staccati due capi di vie diverse a meno di 8 m che non si toccano (la via che si ferma e riparte poco più in là);
   - buco         lungo l'asse la griglia non è suolo da strada (VIA, COB, PIAZZA, WALK, STAIRS, QUAY, PIER, DIRT, GRAVEL) per 2 m o più;
   - sotto_casa   la carreggiata passa dentro una casa (il suo lotto orientato: cx, cy, lw, ld, rot della pianta, o le sue caselle BLD):
                  sull'asse, o le case ai due lati lasciano libera meno della larghezza della via meno 60 cm (o meno di 1,6 m);
   - sotto_pezzo  la carreggiata passa dentro la scatola piena di un pezzo grande ('B' di W.pezzi.imp) che non si attraversa
                  (portici, archi, sottopassi, porte e scalinate si attraversano: esclusi).
   - marciapiede  lungo una via di città il marciapiede (caselle WALK o banchina QUAY a 1 m o a 1,9 m dal ciglio) c'è e poi smette per 2 m o più senza un
                  incrocio, una piazza o una scala, o finisce contro un muro (la casella dopo è una casa);
   - scoglio      uno scoglio grande della costa (W.SEA.rocks, l'80% del raggio) sulla carreggiata o sul marciapiede (2 m oltre il ciglio).
   Ogni difetto: [tipo, x, y, via, lunghezza o distanza, contro]. analizza(W) → { conti, punti }. */
var StradeIntegre = (function () {
  'use strict';
  const CORNICE = [1202, 230, 1630, 472];
  const PASSA = new Set(['sottopasso', 'arco_sottopasso', 'arco_contrasto', 'portico', 'porta_terra', 'porta_monumentale', 'porta_acqua', 'ponte_arco', 'passaggio_livello', 'scalinata', 'gradone', 'binari']);
  const VIE = new Set(['citta', 'vicolo', 'strada', 'litoranea']);
  function analizza(W, o) {
    o = o || {}; const T = W.T, TS = W.TS, GW = W.GW, GH = W.GH, grid = W.grid, B = W.BUILDINGS || [], C = o.cornice || CORNICE;
    const inC = (x, y, m) => x >= C[0] - (m || 0) && x <= C[2] + (m || 0) && y >= C[1] - (m || 0) && y <= C[3] + (m || 0);
    const tile = (x, y) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); return tx < 0 || ty < 0 || tx >= GW || ty >= GH ? -1 : grid[ty * GW + tx]; };
    const bAt = (x, y) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); if (tx < 0 || ty < 0 || tx >= GW || ty >= GH || !W.bIndex) return -1; return W.bIndex[ty * GW + tx]; };
    const NOME = {}; Object.keys(T).forEach(k => NOME[T[k]] = k);
    const SUOLO = new Set(['VIA', 'COB', 'PIAZZA', 'WALK', 'STAIRS', 'QUAY', 'PIER', 'DIRT', 'GRAVEL'].map(k => T[k]).filter(v => v !== undefined));
    const R = (W.roads || []).filter(r => r && r.pts && r.pts.length > 1);
    const P = { capo_cieco: [], capi_staccati: [], buco: [], sotto_casa: [], sotto_pezzo: [], marciapiede: [], scoglio: [] };
    // le distanze da una via
    const dVia = (rd, x, y) => { let best = 1e9; const Q = rd.pts; for (let k = 0; k < Q.length - 1; k++) { const [ax, ay] = Q[k], [bx, by] = Q[k + 1], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2)); best = Math.min(best, Math.hypot(ax + dx * t - x, ay + dy * t - y)); } return best; };
    // i lotti orientati (la pianta): centro, misure, angolo; le botteghe con l'insegna render.js le disegna dritte
    const LT = B.map(b => ({ b, cx: b.cx !== undefined ? b.cx : (b.x + b.w / 2) * TS, cy: b.cy !== undefined ? b.cy : (b.y + b.h / 2) * TS, lw: b.lw !== undefined ? b.lw : b.w * TS, ld: b.ld !== undefined ? b.ld : b.h * TS, rot: b.sign || b.shop ? 0 : b.rot || 0 }));
    const LI = new Map(), lk = (i, j) => i * 4096 + j; LT.forEach(L => { const r = Math.hypot(L.lw, L.ld) / 2; for (let i = Math.floor((L.cx - r) / 8); i <= Math.floor((L.cx + r) / 8); i++) for (let j = Math.floor((L.cy - r) / 8); j <= Math.floor((L.cy + r) / 8); j++) { const k = lk(i, j); let a = LI.get(k); if (!a) LI.set(k, a = []); a.push(L); } });
    const inLotto = (x, y, m) => { for (const L of LI.get(lk(Math.floor(x / 8), Math.floor(y / 8))) || []) { if (L.b.pezzo) continue; const c = Math.cos(L.rot), s = Math.sin(L.rot), dx = x - L.cx, dy = y - L.cy, u = dx * c + dy * s, v = -dx * s + dy * c; if (Math.abs(u) < L.lw / 2 - m && Math.abs(v) < L.ld / 2 - m) return L.b; } return null; };
    // i pezzi grandi: le scatole piene che non si attraversano
    const PZ = []; (W.pezzi || []).forEach(p => { if (!p.imp || PASSA.has(p.tipo)) return; p.imp.forEach(r => { if (r[0] === 'B') PZ.push({ p, r }); }); });
    const inPezzo = (x, y) => { for (const { p, r } of PZ) { const c = Math.cos(p.rot || 0), s = Math.sin(p.rot || 0), dx = x - p.x, dy = y - p.y, lx = dx * c - dy * s, lz = dx * s + dy * c; if (lx > r[1] + .2 && lx < r[2] - .2 && lz > r[3] + .2 && lz < r[4] - .2) return p; } return null; };
    // le mete: piazze, insiemi, luoghi, porte, pezzi che si attraversano
    const inPoly = (P0, x, y) => { let c = false; for (let i = 0, j = P0.length - 1; i < P0.length; j = i++) { const [xi, yi] = P0[i], [xj, yj] = P0[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
    const NODI = (W.nodi || []).filter(n => n.poly), SETS = W.sets || [], LUOGHI = [].concat(Object.values(W.PLACES || {}), W.luoghi || []).filter(q => q && Number.isFinite(q.x) && Number.isFinite(q.y));
    const PZP = (W.pezzi || []).filter(p => PASSA.has(p.tipo) || /porta|scal|ponte|molo|darsena|banchina|scalo/.test(p.tipo));
    const meta = (x, y, ux, uy, w) => {
      if (!inC(x, y, -6)) return 'cornice';
      for (const n of NODI) if (inPoly(n.poly, x, y) || inPoly(n.poly, x + ux * 3, y + uy * 3)) return 'nodo';
      for (const s of SETS) { if (s.x0 !== undefined && x > s.x0 - 3 && x < s.x1 + 3 && y > s.y0 - 3 && y < s.y1 + 3) return 'set'; if (s.x !== undefined && Math.hypot(s.x - x, s.y - y) < (s.r || 6) + 3) return 'set'; }
      for (const d of [0, w / 2 + .5, w / 2 + 2]) { const v = tile(x + ux * d, y + uy * d); if (v === T.PIAZZA || v === T.QUAY || v === T.PIER || v === T.STAIRS || v === T.WATER) return 'suolo:' + NOME[v]; }
      for (const b of B) if (b.door && Math.hypot((b.door[0] + .5) * TS - x, (b.door[1] + .5) * TS - y) < w / 2 + 3) return 'porta';
      for (const q of LUOGHI) if (Math.hypot(q.x - x, q.y - y) < 8) return 'luogo';
      for (const p of PZP) if (Math.hypot(p.x - x, p.y - y) < 8 + (p.opz && (p.opz.L || p.opz.w) || 0) / 2) return 'pezzo:' + p.tipo;
      return null; };
    const VR = R.filter(rd => VIE.has(rd.kind) && rd.pts.some(([x, y]) => inC(x, y)));
    // 1. i capi
    const CAPI = [];
    VR.forEach(rd => { const Q = rd.pts; [[Q[0], Q[1]], [Q[Q.length - 1], Q[Q.length - 2]]].forEach(([E, F]) => { const L = Math.hypot(E[0] - F[0], E[1] - F[1]) || 1, ux = (E[0] - F[0]) / L, uy = (E[1] - F[1]) / L;
      const tocca = R.find(o2 => o2 !== rd && dVia(o2, E[0], E[1]) < (o2.w || 4) / 2 + (rd.w || 4) / 2 + 1);
      const m = tocca ? 'via:' + tocca.id : meta(E[0], E[1], ux, uy, rd.w || 4); CAPI.push({ rd, E, m });
      if (!m) P.capo_cieco.push(['capo_cieco', Math.round(E[0] * 10) / 10, Math.round(E[1] * 10) / 10, rd.id, rd.kind, 'niente']); }); });
    for (let i = 0; i < CAPI.length; i++) for (let j = i + 1; j < CAPI.length; j++) { const a = CAPI[i], b = CAPI[j]; if (a.rd === b.rd) continue; const d = Math.hypot(a.E[0] - b.E[0], a.E[1] - b.E[1]); if (d > 8 || d < .5) continue;
      if (dVia(a.rd, b.E[0], b.E[1]) < (a.rd.w || 4) / 2 + 1 || dVia(b.rd, a.E[0], a.E[1]) < (b.rd.w || 4) / 2 + 1) continue;
      P.capi_staccati.push(['capi_staccati', Math.round((a.E[0] + b.E[0]) * 5) / 10, Math.round((a.E[1] + b.E[1]) * 5) / 10, a.rd.id + '|' + b.rd.id, +d.toFixed(1), (a.m || '-') + '|' + (b.m || '-')]); }
    // 2. lungo la via: i buchi della griglia, le case e i pezzi sotto la carreggiata (a tratti: un difetto per tratto continuo)
    VR.forEach(rd => { const Q = rd.pts, hw = (rd.w || 4) / 2; let run = { buco: null, sotto_casa: null, sotto_pezzo: null };
      const chiudi = (t, x, y) => { const q = run[t]; if (!q) return; if (q.n >= (t === 'buco' ? 2 : 1)) P[t].push([t, q.x, q.y, rd.id, rd.kind, q.n + ' m', q.c]); run[t] = null; };
      const apri = (t, x, y, c) => { if (!run[t]) run[t] = { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, n: 0, c }; run[t].n++; };
      for (let k = 0; k < Q.length - 1; k++) { const [ax, ay] = Q[k], [bx, by] = Q[k + 1], L = Math.hypot(bx - ax, by - ay); if (L < 1e-3) continue; const ux = (bx - ax) / L, uy = (by - ay) / L, nx = -uy, ny = ux;
        for (let s = 0; s < L; s += 1) { const x = ax + ux * s, y = ay + uy * s; if (!inC(x, y)) { Object.keys(run).forEach(t => chiudi(t)); continue; }
          const v = tile(x, y); if (!SUOLO.has(v) && v !== T.BLD) apri('buco', x, y, NOME[v] || '?'); else chiudi('buco');
          // la larghezza libera della carreggiata: da ogni lato fin dove non c'è una casa (a passi di 25 cm)
          let casa = null, pz = null, lib = 0, asse = false; const dentro = (px, py) => { let c = inLotto(px, py, .05); if (!c && tile(px, py) === T.BLD) { const bi = bAt(px, py); if (bi >= 0 && B[bi] && !B[bi].pezzo) c = B[bi]; } return c; };
          for (const sg of [1, -1]) { let o2 = 0; for (; o2 <= hw; o2 += .25) { const c = dentro(x + nx * o2 * sg, y + ny * o2 * sg); if (c) { casa = casa || c; if (o2 === 0) asse = true; break; } } lib += Math.min(o2, hw); }
          for (const o2 of [0, hw - .3, -(hw - .3)]) pz = pz || inPezzo(x + nx * o2, y + ny * o2);
          if (casa && (asse || lib < Math.min(2 * hw, 2 * hw - .6) || lib < 1.6)) apri('sotto_casa', x, y, (casa.id || '?') + (asse ? ' (sull\'asse)' : ' (libera ' + lib.toFixed(1) + ' di ' + (2 * hw).toFixed(1) + ' m)')); else chiudi('sotto_casa');
          if (pz) apri('sotto_pezzo', x, y, pz.tipo); else chiudi('sotto_pezzo'); } }
      Object.keys(run).forEach(t => chiudi(t)); });
    // 3. i marciapiedi delle vie di città (le caselle WALK lungo i due lati): dove il marciapiede c'è e smette senza un incrocio, una
    // piazza, una porta o un passo carrabile, o finisce contro un muro (la casella dopo è una casa), per almeno 2 m
    VR.forEach(rd => { if (rd.kind !== 'citta') return; const Q = rd.pts, hw = (rd.w || 7) / 2;
      [1, -1].forEach(sg => { let prima = null, buco = null;
        const incrocio = (x, y) => R.some(o2 => o2 !== rd && dVia(o2, x, y) < (o2.w || 4) / 2 + hw + 2.5) || NODI.some(n => inPoly(n.poly, x, y));
        for (let k = 0; k < Q.length - 1; k++) { const [ax, ay] = Q[k], [bx, by] = Q[k + 1], L = Math.hypot(bx - ax, by - ay); if (L < 1e-3) continue; const ux = (bx - ax) / L, uy = (by - ay) / L, nx = -uy * sg, ny = ux * sg;
          for (let s2 = 0; s2 < L; s2 += 1) { const x = ax + ux * s2, y = ay + uy * s2; if (!inC(x, y)) { prima = null; buco = null; continue; }
            // [pianta] la via in diagonale: la casella a 1 m dal ciglio può avere il centro dentro la carreggiata; si guarda anche a 1,9 m e
            // vale la migliore. La banchina (QUAY, col muro sul mare) conta come marciapiede
            const MC = v0 => v0 === T.WALK || v0 === T.QUAY, v1 = tile(x + nx * (hw + 1), y + ny * (hw + 1)), v2 = tile(x + nx * (hw + 1.9), y + ny * (hw + 1.9)), c = MC(v1) || MC(v2), v = MC(v1) ? v1 : v2, px = x + nx * (hw + 1), py = y + ny * (hw + 1);
            if (c) { if (buco && buco.n >= 2 && !buco.inc) P.marciapiede.push(['marciapiede', buco.x, buco.y, rd.id, rd.kind, buco.n + ' m', buco.muro ? 'contro un muro' : 'interrotto (' + (NOME[buco.v] || '?') + ')']); buco = null; prima = true; continue; }
            if (prima) { if (!buco) buco = { x: Math.round(px * 10) / 10, y: Math.round(py * 10) / 10, n: 0, inc: false, muro: v === T.BLD, v }; buco.n++; if (incrocio(x, y) || v === T.PIAZZA || v === T.STAIRS) buco.inc = true; } } }
        }); });
    // 4. gli scogli grandi della costa (W.SEA.rocks) sulla carreggiata o sul marciapiede (2 m oltre il ciglio) di una via
    ((W.SEA && W.SEA.rocks) || []).forEach(q => { if (!inC(q.x, q.y) || !(q.r > .8)) return; for (const rd of VR) { const d = dVia(rd, q.x, q.y), hw = (rd.w || 4) / 2, dentro = hw + 2 - (d - q.r * .8);
        if (dentro > .3) { P.scoglio.push(['scoglio', Math.round(q.x * 10) / 10, Math.round(q.y * 10) / 10, rd.id, rd.kind, dentro.toFixed(1) + ' m dentro', q.id || 'r ' + q.r]); break; } } });
    const conti = {}; Object.keys(P).forEach(k => conti[k] = P[k].length);
    return { conti, punti: P, vie: VR.length };
  }
  const API = { analizza, CORNICE, PASSA };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  return API;
})();
