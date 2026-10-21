// [incroci] Il controllo degli incroci e dei capi delle strade, sulla pianta del progetto e sul mondo del gioco.
// Il committente: «le strade non si incrociano e fondono in modo realistico, a volte continuano con un tondo» e «alcune vie finiscono
// in vicoli ciechi perché continuano oltre l'incrocio ma non finiscono da nessuna parte». Quindi, per ogni strada:
//   - ogni CAPO o sta su un'altra strada (incrocio a T o a Y), o dentro un nodo (piazza, piazzetta, spianata), o ha una CHIUSURA
//     dichiarata nei dati (capi: [{ tipo, perche }, ...]): muro, scala, arco, porta, mare (banchina), affaccio, corte, luogo,
//     fuori (esce dalla cornice). Mai un tondo;
//   - ogni INCROCIO ha angoli veri: fra due bracci vicini almeno 40° (la T sta fra 60° e 120°, la Y fra 40° e 60°);
//   - nessun MOZZICONE: il tratto dall'ultimo incrocio alla fine, se non finisce su un nodo, deve avere in fondo la sua chiusura
//     con un perché (un luogo, una porta, una scala, un arco, un affaccio) ed essere lungo almeno 6 m (sotto è il moncone di
//     una strada che ha passato l'incrocio e si è fermata);
//   - il CORDOLO continuo: ogni angolo fra due bracci ha il suo smusso (lo calcola qui: lo disegnano la pianta e il gioco).
// Uso:  const I = require('./incroci.js'); const r = I.controlla(strade, nodi);
//   strade: [{ id, nome, w, livello, pts: [[x, y], ...], capi: [chiusura0|null, chiusura1|null] }]
//   nodi:   [{ nome, poly: [[x, y], ...] } | { nome, x, y, r }]
//   r: { incroci: [{ x, y, bracci: [{ id, ux, uy, w }], tipo: 'T'|'Y'|'X'|'L', minAng }], capi: [...], errori: [testo], smussi: [[[x, y] ×3]] }
// node strumenti/incroci.js  → controlla il mondo del gioco (città nuova) nella cornice della città e stampa il resoconto.
(function (root) {
  const CHIUSURE = { muro: 1, scala: 1, arco: 1, porta: 1, mare: 1, affaccio: 1, corte: 1, luogo: 1, fuori: 1 };   // fuori: la strada esce dalla cornice della città (verso l'entroterra)
  const hyp = Math.hypot, DEG = 180 / Math.PI;
  const lunghezze = P => { const s = [0]; for (let k = 1; k < P.length; k++) s.push(s[k - 1] + hyp(P[k][0] - P[k - 1][0], P[k][1] - P[k - 1][1])); return s; };
  // il punto più vicino di una polilinea: distanza, ascissa, tangente
  function vicino(P, S, x, y) {
    let best = { d: 1e9, s: 0, tx: 1, ty: 0 };
    for (let k = 0; k < P.length - 1; k++) { const ax = P[k][0], ay = P[k][1], dx = P[k + 1][0] - ax, dy = P[k + 1][1] - ay, L2 = dx * dx + dy * dy || 1e-9, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2)), d = hyp(ax + dx * t - x, ay + dy * t - y);
      if (d < best.d) { const L = Math.sqrt(L2); best = { d, s: S[k] + t * L, tx: dx / L, ty: dy / L }; } }
    return best;
  }
  const dentro = (n, x, y, pad) => {
    if (n.r !== undefined) return hyp(x - n.x, y - n.y) <= n.r + (pad || 0);
    const P = n.poly; let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; }
    if (c || !pad) return c;
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [ax, ay] = P[j], [bx, by] = P[i], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1e-9, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2)); if (hyp(ax + dx * t - x, ay + dy * t - y) <= pad) return true; }
    return false;
  };
  // il punto della polilinea all'ascissa s
  function a(P, S, s) { s = Math.max(0, Math.min(S[S.length - 1], s)); let k = 0; while (k < P.length - 2 && S[k + 1] < s) k++; const t = (s - S[k]) / ((S[k + 1] - S[k]) || 1); return [P[k][0] + (P[k + 1][0] - P[k][0]) * t, P[k][1] + (P[k + 1][1] - P[k][1]) * t]; }

  function controlla(strade, nodi, opz) {
    opz = opz || {};
    const tolW = opz.tol === undefined ? .8 : opz.tol, MINANG = opz.minAng || 40, MOZ = opz.moncone || 6;
    const R = strade.filter(r => r.pts && r.pts.length >= 2).map(r => Object.assign({}, r, { S: lunghezze(r.pts) }));
    const errori = [], incroci = [], capi = [];
    const segni = R.map(() => []);   // le ascisse degli incroci su ogni strada
    const addJ = (x, y) => { let J = incroci.find(j => hyp(j.x - x, j.y - y) < 3); if (!J) { J = { x, y, bracci: [] }; incroci.push(J); } return J; };
    const braccio = (J, ri, s) => {   // i bracci della strada ri che escono dal punto di ascissa s
      const r = R[ri], tot = r.S[r.S.length - 1];
      [-1, 1].forEach(sg => { const s1 = s + sg * Math.min(6, Math.max(2.5, r.w)); if (s1 < -.01 || s1 > tot + .01 || (sg < 0 && s < .5) || (sg > 0 && s > tot - .5)) return;
        const q = a(r.pts, r.S, s1), dx = q[0] - J.x, dy = q[1] - J.y, L = hyp(dx, dy); if (L < .3) return; const ux = dx / L, uy = dy / L;
        if (J.bracci.some(b => b.id === r.id && b.ux * ux + b.uy * uy > .9)) return; J.bracci.push({ id: r.id, ux, uy, w: r.w }); });
    };
    // 1) i capi: su un'altra strada (T, Y), dentro un nodo, o chiusi
    R.forEach((r, ri) => [0, 1].forEach(e => {
      const p = e ? r.pts[r.pts.length - 1] : r.pts[0], s = e ? r.S[r.S.length - 1] : 0, capo = { id: r.id, nome: r.nome, e, x: p[0], y: p[1] };
      const nodo = (nodi || []).find(n => dentro(n, p[0], p[1], .5));
      if (nodo) { capo.k = 'nodo'; capo.su = nodo.nome; capi.push(capo); segni[ri].push(s); return; }
      let host = null; R.forEach((o, oi) => { if (oi === ri) return; const v = vicino(o.pts, o.S, p[0], p[1]); if (v.d <= o.w / 2 + tolW && (!host || v.d < host.v.d)) host = { oi, v }; });
      if (host) { const J = addJ(p[0], p[1]); braccio(J, ri, s); braccio(J, host.oi, host.v.s); segni[ri].push(s); segni[host.oi].push(host.v.s);
        capo.k = 'incrocio'; capo.su = R[host.oi].id; capi.push(capo); return; }
      const c = r.capi && r.capi[e];
      if (c && CHIUSURE[c.tipo] && c.perche) { capo.k = 'chiuso'; capo.tipo = c.tipo; capo.perche = c.perche; capi.push(capo); return; }
      capo.k = 'aperto'; capi.push(capo);
      errori.push(`${r.nome || r.id}: il capo ${e ? 'finale' : 'iniziale'} (${p[0].toFixed(0)},${p[1].toFixed(0)}) non sta su una strada né su un nodo e non ha una chiusura${c ? ' valida (' + c.tipo + ', ' + (c.perche || 'senza perché') + ')' : ''}`);
    }));
    // 2) gli incroci a croce: due strade che si tagliano in mezzo
    for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) { const A = R[i], B = R[j];
      for (let k = 0; k < A.pts.length - 1; k++) for (let q = 0; q < B.pts.length - 1; q++) {
        const a1 = A.pts[k], a2 = A.pts[k + 1], b1 = B.pts[q], b2 = B.pts[q + 1], d1x = a2[0] - a1[0], d1y = a2[1] - a1[1], d2x = b2[0] - b1[0], d2y = b2[1] - b1[1], den = d1x * d2y - d1y * d2x;
        if (Math.abs(den) < 1e-9) continue; const t = ((b1[0] - a1[0]) * d2y - (b1[1] - a1[1]) * d2x) / den, u = ((b1[0] - a1[0]) * d1y - (b1[1] - a1[1]) * d1x) / den;
        if (t < 0 || t > 1 || u < 0 || u > 1) continue;
        const x = a1[0] + d1x * t, y = a1[1] + d1y * t, sa = A.S[k] + t * hyp(d1x, d1y), sb = B.S[q] + u * hyp(d2x, d2y);
        const J = addJ(x, y); braccio(J, i, sa); braccio(J, j, sb); segni[i].push(sa); segni[j].push(sb); } }
    // 3) gli angoli: fra due bracci vicini almeno MINANG gradi; il tipo dell'incrocio
    incroci.forEach(J => {
      const A = J.bracci.slice().sort((p, q) => Math.atan2(p.uy, p.ux) - Math.atan2(q.uy, q.ux)); J.bracci = A;
      let mn = 360; const ang = [];
      for (let i = 0; i < A.length; i++) { const p = A[i], q = A[(i + 1) % A.length]; let d = (Math.atan2(q.uy, q.ux) - Math.atan2(p.uy, p.ux)) * DEG; while (d <= 0) d += 360; if (A.length > 1) { ang.push(d); mn = Math.min(mn, d); } }
      J.minAng = A.length > 1 ? mn : 0; J.angoli = ang;
      J.tipo = A.length >= 4 ? 'X' : A.length === 3 ? (mn < 60 ? 'Y' : 'T') : 'L';
      if (A.length >= 2 && mn < MINANG) errori.push(`incrocio a ${J.x.toFixed(0)},${J.y.toFixed(0)} (${[...new Set(A.map(b => b.id))].join(' · ')}): angolo di ${mn.toFixed(0)}°, sotto i ${MINANG}° (un cuneo, non un incrocio)`);
    });
    // le strade che attraversano un nodo (la Vittoria nella piazza d'adunata, il passo delle baracche nel lotto del fuoco) lo toccano lì
    R.forEach((r, ri) => (nodi || []).forEach(n => { for (let k = 1; k < r.pts.length - 1; k++) if (dentro(n, r.pts[k][0], r.pts[k][1])) { segni[ri].push(r.S[k]); break; } }));
    // 4) i mozziconi: dall'ultimo incrocio alla fine
    R.forEach((r, ri) => { const tot = r.S[r.S.length - 1], ss = segni[ri];
      [0, 1].forEach(e => { const c = capi.find(q => q.id === r.id && q.e === e); if (!c || c.k !== 'chiuso') return;
        const sEnd = e ? tot : 0, interni = ss.filter(s => Math.abs(s - sEnd) > .5), d = interni.length ? Math.min(...interni.map(s => Math.abs(s - sEnd))) : tot;
        c.coda = d; if (interni.length && d < MOZ) errori.push(`${r.nome || r.id}: moncone di ${d.toFixed(1)} m oltre l'incrocio verso ${c.tipo} (${c.x.toFixed(0)},${c.y.toFixed(0)}): si accorcia fino all'incrocio`); });
      if (!ss.length) errori.push(`${r.nome || r.id}: non tocca nessuna strada né nodo`); });
    // 5) il cordolo continuo: lo smusso di ogni angolo fra due bracci vicini (il triangolo fra lo spigolo dei due bordi e i due
    //    punti di tangenza, raggio 2 m sui vicoli, 3 m sulle vie): la pianta e il gioco lo riempiono di carreggiata, il cordolo lo gira
    const smussi = [];
    incroci.forEach(J => { const A = J.bracci; if (A.length < 2) return;
      for (let i = 0; i < A.length; i++) { const p = A[i], q = A[(i + 1) % A.length]; if (A.length === 2 && i === 1) break;
        let th = Math.atan2(q.uy, q.ux) - Math.atan2(p.uy, p.ux); while (th <= 0) th += 2 * Math.PI; if (th > Math.PI * .95) continue;
        let nax = -p.uy, nay = p.ux; if (nax * q.ux + nay * q.uy < 0) { nax = -nax; nay = -nay; } let nbx = -q.uy, nby = q.ux; if (nbx * p.ux + nby * p.uy < 0) { nbx = -nbx; nby = -nby; }
        const pax = J.x + nax * p.w / 2, pay = J.y + nay * p.w / 2, pbx = J.x + nbx * q.w / 2, pby = J.y + nby * q.w / 2, den = p.ux * q.uy - p.uy * q.ux; if (Math.abs(den) < .05) continue;
        const t = ((pbx - pax) * q.uy - (pby - pay) * q.ux) / den, cx = pax + p.ux * t, cy = pay + p.uy * t, Rr = Math.min(p.w, q.w) >= 5 ? 3 : 1.6, d = Math.min(6, Rr / Math.tan(th / 2));
        smussi.push([[cx, cy], [cx + p.ux * d, cy + p.uy * d], [cx + q.ux * d, cy + q.uy * d]]); } });
    const conti = { strade: R.length, incroci: incroci.length, T: incroci.filter(j => j.tipo === 'T').length, Y: incroci.filter(j => j.tipo === 'Y').length, X: incroci.filter(j => j.tipo === 'X').length,
      capi: capi.length, suNodo: capi.filter(c => c.k === 'nodo').length, suStrada: capi.filter(c => c.k === 'incrocio').length, chiusi: capi.filter(c => c.k === 'chiuso').length, aperti: capi.filter(c => c.k === 'aperto').length,
      perTipo: capi.filter(c => c.k === 'chiuso').reduce((o, c) => (o[c.tipo] = (o[c.tipo] || 0) + 1, o), {}), errori: errori.length };
    return { incroci, capi, errori, smussi, conti };
  }

  // il mondo del gioco (coordinate finali): le strade di città nella cornice, i nodi dalle scenografie (W.sets) e dalle piazze
  function dalMondo(W, cornice) {
    const [x0, y0, x1, y1] = cornice || [1222, 250, 1610, 450], inC = ([x, y]) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
    const strade = (W.roads || []).filter(r => r.pts && r.pts.length >= 2 && r.kind !== 'sterrato' && r.pts.some(inC) && !r.vialetto)
      .map(r => ({ id: r.id, nome: r.name, w: r.w, livello: r.kind, pts: r.pts, capi: r.capi || [null, null] }));
    const nodi = [];
    (W.sets || []).forEach(q => { if (q.r !== undefined && q.x !== undefined) nodi.push({ nome: q.k, x: q.x, y: q.y, r: q.r });
      else if (q.x0 !== undefined && q.y0 !== undefined) nodi.push({ nome: q.k, poly: [[q.x0, q.y0], [q.x1, q.y0], [q.x1, q.y1], [q.x0, q.y1]] }); });
    (W.nodi || []).forEach(n => nodi.push(n));
    return { strade, nodi };
  }
  const API = { controlla, dalMondo, CHIUSURE };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.Incroci = API;

  if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
    const path = require('path'), log = console.log, warn = console.warn; console.log = () => {}; console.warn = () => {};
    const W = require(path.join(__dirname, '..', 'src', 'world_cittanuova.js')); console.log = log; console.warn = warn;
    const { strade, nodi } = dalMondo(W), r = controlla(strade, nodi);
    console.log('incroci e capi (gioco):', JSON.stringify(r.conti));
    r.errori.slice(0, +(process.env.N || 60)).forEach(e => console.log('  ✗ ' + e)); if (r.errori.length > (+(process.env.N || 60))) console.log('  … e altri', r.errori.length - (+(process.env.N || 60)));
  }
})(typeof window !== 'undefined' ? window : this);
