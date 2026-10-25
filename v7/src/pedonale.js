/* Porto Vecchio — [pedonale] IL CONTROLLO DELLE OPERE PEDONALI CONTRO LE STRADE DEI VEICOLI (solo logica: non entra nella build; lo usano
   src/test_pedonale.js e chi vuole l'elenco: node -e "require('./src/pedonale.js')" non basta, serve il mondo, vedi la prova).
   Il committente, davanti alla Piazza dell'Ottagono: «il modello del muro e le scale non ha le collisioni, e la strada passa dove è stata
   costruita la zona pedonale». Qui, per ogni via dove passano i veicoli (le corsie del traffico, W.lanes, e le vie minori di Ape e
   motorini: vicoli larghi ≥ 4,5 m), contro le opere pedonali del mondo (W.pedonali, le fa world_cittanuova.js: scalinate, le scale dei
   gradoni, i muraglioni e la piazza alta che reggono, le fontane, i sottopassi pedonali, le piazzette lastricate):
   - sotto     la carreggiata (l'asse e i due margini, a passi di mezzo metro) dentro l'impronta di un'opera;
   - capo      un capo della via (dove nascono e spariscono le auto) a meno di 3 m da un'opera: l'auto «esce dal muro»;
   - suolo     la carreggiata su caselle che non sono da veicoli: FOUNT o STAIRS, o il lastricato PIAZZA di una piazza pedonale;
   - corsia    un tratto di corsia del traffico (W.lanes) su una via pedonale o fuori dalle vie dei veicoli.
   luoghi(W) → [{ via, opera, tipo, x, y, n }]: un luogo per coppia via-opera (i punti dello stesso luogo si contano in n). */
var Pedonale = (function () {
  'use strict';
  const PASSO = .5;
  // le vie dei veicoli: quelle che hanno una corsia del traffico, più le vie minori (Ape, motorini) di vievive.js
  function veicolare(rd, W) {
    if (!rd || !rd.pts || rd.pts.length < 2 || rd.pedonale) return false;
    if (rd.kind === 'sterrato') return false;
    if (rd.kind === 'vicolo') return rd.w >= 4.5 && !(rd.monte || rd.traccia || rd.vialetto || rd.sottopasso);   // le vie minori di vievive.js
    return true;   // le vie con la corsia del traffico (anche le strade del monte)
  }
  const dentroPoly = (P, x, y) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
  function dentro(o, x, y, m) {
    m = m || 0;
    if (o.r !== undefined) return Math.hypot(x - o.x, y - o.y) < o.r + m;
    if (!m) return dentroPoly(o.poly, x, y);
    if (dentroPoly(o.poly, x, y)) return true;
    const P = o.poly; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [ax, ay] = P[j], [bx, by] = P[i], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2)); if (Math.hypot(ax + dx * t - x, ay + dy * t - y) < m) return true; }
    return false;
  }
  function luoghi(W, opz) {
    opz = opz || {}; const T = W.T, TS = W.TS, GW = W.GW, GH = W.GH, grid = W.grid, OP = W.pedonali || [], out = new Map();
    const tile = (x, y) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); return tx < 0 || ty < 0 || tx >= GW || ty >= GH ? -1 : grid[ty * GW + tx]; };
    const NOME = {}; Object.keys(T).forEach(k => NOME[T[k]] = k);
    const piazzaPed = OP.filter(o => o.tipo === 'piazza' || o.tipo === 'piazza_alta');
    const segna = (rd, o, tipo, x, y) => { const k = rd.id + '|' + (o ? o.id : tipo); const q = out.get(k); if (q) { q.n++; return; } out.set(k, { via: rd.id, kind: rd.kind, opera: o ? o.id : tipo, nome: o ? o.nome : '', tipo, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, n: 1 }); };
    const R = (W.roads || []).filter(rd => veicolare(rd, W));
    R.forEach(rd => { const P = rd.pts, hw = (rd.w || 4) / 2;
      // i capi
      [P[0], P[P.length - 1]].forEach(E => { for (const o of OP) if (o.muro || o.tipo === 'scala' || o.tipo === 'scalinata' || o.tipo === 'piazza_alta') if (dentro(o, E[0], E[1], 3)) segna(rd, o, 'capo', E[0], E[1]); });
      for (let k = 0; k < P.length - 1; k++) { const [ax, ay] = P[k], [bx, by] = P[k + 1], L = Math.hypot(bx - ax, by - ay); if (L < 1e-3) continue; const ux = (bx - ax) / L, uy = (by - ay) / L, nx = -uy, ny = ux;
        for (let s = 0; s < L; s += PASSO) for (const o2 of [0, hw - .4, -(hw - .4)]) { const x = ax + ux * s + nx * o2, y = ay + uy * s + ny * o2;
          for (const o of OP) if (o.tipo !== 'piazza' && dentro(o, x, y)) segna(rd, o, 'sotto', x, y);
          const v = tile(x, y); if (v === T.FOUNT || v === T.STAIRS) segna(rd, null, 'suolo:' + NOME[v], x, y);
          else if (v === T.PIAZZA) for (const o of piazzaPed) if (dentro(o, x, y)) segna(rd, o, 'suolo', x, y); } } });
    // le corsie del traffico: solo sulle vie dei veicoli
    const ok = new Set(R.map(rd => rd.id)); (W.lanes || []).forEach(l => { if (!ok.has(l.id)) segna({ id: l.id, kind: 'corsia' }, null, 'corsia', l.pts[0][0], l.pts[0][1]); });
    return [...out.values()];
  }
  return { luoghi, veicolare, dentro };
})();
if (typeof module !== 'undefined') module.exports = Pedonale;
