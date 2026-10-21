/* Porto Vecchio — [vievive] LE VIE VIVE (solo logica, nessuna grafica: la grafica è vievive_arte.js).
   Il committente, davanti alla Vittoria: «la strada è vuota: non c'è un'auto, un giornale, un filo d'erba, un bus alla fermata,
   nessuna di queste cose, solo 4 corsie vuote». Qui la strada si riempie secondo il suo rango, il suo quartiere e l'ora, senza
   coriandoli: ogni cosa ha un motivo per stare dove sta, e mai davanti a porte, vetrine e scale (chiarezza.js).
   Tutto si aggancia ai dati e non a coordinate fisse (rd.kind, rd.era, rd.w, rd.pennoni, W.sets, W.pezzi, b.shopFront, i posti),
   così regge la mappa compatta che si sta costruendo.
   - IL RANGO DELLE STRADE: 'asse' (la Vittoria: rd.pennoni o l'epoca E4), 'via' (le strade di città), 'via_minore' (vicoli larghi
     ≥ 4,5 m: la Rua, la Via della Marina), 'vicolo', 'extra' (le strade fuori città). Il profilo dice quante corsie ci stanno davvero
     (una via di 10 m ha due corsie, non quattro), da che parte si parcheggia (il lato lontano dalla camera, mai sull'asse: è pulito
     per ordine) e di quanto si sposta la carreggiata. Le corsie del traffico (G.LANES) si adattano al profilo: le auto non passano
     sopra quelle in sosta.
   - LA SOSTA: stalli lungo il cordolo delle vie (5 m l'uno), più fitti al Mercato e al piazzale della Stazione; mai nei vicoli, agli
     incroci, alle fermate, davanti a una porta, a una vetrina o a una scala. Sugli stalli le auto parcheggiate.
   - IL TRAFFICO PER ORA: auto, l'Ape, la Vespa e il Ciao sulle vie e sull'asse; sulle vie minori solo due ruote e Ape (le guida questo
     modulo, a passo d'uomo quando c'è gente); la volante della Tutela gira sempre, anche di notte. Il punto (07-09:30), il vuoto del
     pranzo, la passeggiata (17:30-20:30), la notte vuota.
   - LA LINEA 1: l'autobus va dalla Stazione alla Vittoria, al Mercato e alla Marina e torna. Le fermate (pali con la paletta, panchina o
     pensilina, l'orario) diventano i posti 'fermata' e 'pensilina' di posti.js: la gente aspetta alle ore giuste, l'autobus arriva,
     accosta, apre le porte, chi aspetta sale, qualcuno scende, chiude e riparte.
   - LE EDICOLE: al Mercato, alla Stazione, sull'asse e a metà della via più lunga; davanti la fila (il posto 'edicola'), accanto la
     locandina col titolo del giorno del giornale del regime. Le plance delle affissioni sulle vie, coi manifesti e il giornale clandestino
     (il «Disgelo») mezzo strappato; sulla Vittoria solo quelli del regime, e l'attacchino che ogni tanto ci prova (una scena).
   - IL SUOLO: erba nei giunti e al piede dei muri (fitta nel borgo e fra le baracche, quasi niente sull'asse), foglie sotto gli alberi,
     pozzanghere alle caditoie la mattina dopo la notte, il gatto sul gradino, il volantino caduto sotto la plancia: a gruppi, radi.
   - LE SCENE (eventi.js): la fila all'edicola, il carretto del venditore, i ragazzini col pallone, l'attacchino sulla Vittoria e chi
     raschia via il manifesto; il vigile urbano all'incrocio grande nelle ore di punta.
   Prova: node test_vievive.js */
var Vievive = (function () {
  'use strict';
  const G = typeof Game !== 'undefined' ? Game : require('./game.js');
  const CH = typeof Chiarezza !== 'undefined' ? Chiarezza : (typeof require !== 'undefined' ? require('./chiarezza.js') : null);
  const W = G.MAP.world, TS = G.TS, T = G.T;
  const ATTIVO = !!(W && W.sets && W.roads);   // solo la città nuova (?cittanuova)
  const PI = Math.PI, hyp = Math.hypot, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const hash = (x, y, s) => { let h = (Math.round(x) * 374761393 + Math.round(y) * 668265263 + (s || 0) * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  const tile = (x, y) => G.tileAt(Math.floor(x / TS), Math.floor(y / TS));
  const zonaCitta = (x, y) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); return tx >= 0 && ty >= 0 && tx < G.GW && ty < G.GH && W.zone && W.zone[ty * G.GW + tx] === W.Z.CITTA; };
  const ROADS = () => (W.roads || []).filter(rd => rd && rd.pts && rd.pts.length > 1);
  const angDiff = (a, b) => { let d = a - b; while (d > PI) d -= 2 * PI; while (d < -PI) d += 2 * PI; return d; };

  // ================= LE MISURE =================
  const CFG = {
    corsiaMin: 2.5,           // m: sotto, la via è a senso unico alternato (una corsia); 2,5 m è la corsia stretta delle vie di città
    sosta: 2.0,               // m: la striscia di sosta lungo il cordolo
    stallo: 5.0,              // m: la lunghezza di uno stallo
    viaMinore: 4.5,           // m: un vicolo da qui in su porta Ape e motorini (la Rua, la Marina)
    passoFermate: 150,        // m: fra due fermate della linea al massimo
    autobus: { vmax: 8.5, sosta: [7, 11], capolinea: [14, 20], porte: .9 },
    mezziPer100: { asse: 3.2, via: 2.4, via_minore: 1.6 },   // mezzi in giro ogni 100 m di strada, all'ora di punta
    sostaMax: 30,             // auto in sosta in tutta la città
  };
  // la quota dei mezzi in giro per ora (0..1): il punto del mattino, il vuoto del pranzo, la passeggiata, la notte vuota
  const FASCE = [[0, .05], [5.5, .12], [6.5, .45], [7, 1], [9.5, .7], [12.5, .3], [15.5, .6], [17.5, .9], [20.5, .35], [23, .05]];
  function quota(hr) { let q = FASCE[0][1]; for (const [h, v] of FASCE) if (hr >= h) q = v; return q; }
  const FASCIA = hr => hr >= 7 && hr < 9.5 ? 'punta' : hr >= 12.5 && hr < 15.5 ? 'pranzo' : hr >= 17.5 && hr < 20.5 ? 'passeggiata' : hr >= 23 || hr < 5.5 ? 'notte' : 'giorno';

  // ================= IL RANGO E IL PROFILO DELLE STRADE =================
  function inCitta(rd) { let c = 0; for (let k = 0; k < rd.pts.length; k += 3) if (zonaCitta(rd.pts[k][0], rd.pts[k][1])) c++; return c * 3 >= rd.pts.length * .5; }
  function rango(rd) {
    if (!rd || !rd.pts || rd.pts.length < 2 || rd.monte || rd.traccia || rd.vialetto || rd.sottopasso || rd.kind === 'sterrato') return 'nessuno';
    if (rd.kind === 'vicolo') return rd.w >= CFG.viaMinore ? 'via_minore' : 'vicolo';
    if (rd.kind !== 'citta' && !inCitta(rd)) return 'extra';
    if (rd.pennoni || rd.era === 'E4') return 'asse';
    return rd.kind === 'citta' ? 'via' : 'extra';
  }
  // il lato lontano dalla camera (che sta a sud-est e guarda a nord-ovest): +1 se è il lato della normale (-uy, ux)
  function latoLontano(rd) { const P = rd.pts, a = P[0], b = P[P.length - 1], L = hyp(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / L, ny = (b[0] - a[0]) / L; return nx + ny < 0 ? 1 : -1; }
  // il profilo: corsie, lati di sosta, larghezza della carreggiata, spostamento del suo asse, larghezza di una corsia, chi ci gira
  function profilo(rd) {
    if (rd.__vv) return rd.__vv;
    const r = rango(rd), w = rd.w; let corsie = 0, sosta = [], mezzi = [];
    if (r === 'asse') { corsie = 2; mezzi = ['auto', 'autobus', 'ape', 'due', 'volante']; }   // pulito per ordine: niente sosta
    else if (r === 'via') { corsie = w >= 2 * CFG.corsiaMin ? 2 : 1; const nS = w >= 2 * CFG.corsiaMin + 2 * CFG.sosta + 1 ? 2 : w >= 2 * CFG.corsiaMin + CFG.sosta ? 1 : 0; sosta = nS === 2 ? [-1, 1] : nS === 1 ? [latoLontano(rd)] : []; mezzi = ['auto', 'autobus', 'ape', 'due', 'furgone']; }
    else if (r === 'extra') { corsie = w >= 2 * CFG.corsiaMin ? 2 : 1; mezzi = ['auto']; }
    else if (r === 'via_minore') { corsie = 1; mezzi = ['ape', 'due']; }   // a senso unico alternato: si passa a turno
    const larg = w - sosta.length * CFG.sosta, shift = sosta.length === 1 ? -sosta[0] * CFG.sosta / 2 : 0;
    return (rd.__vv = { rango: r, corsie, sosta, larg, shift, corsia: corsie ? larg / corsie : 0, mezzi, mezzeria: corsie === 2 });
  }
  // la segnaletica che una via può portare (render.js): la mezzeria solo con due corsie, al centro della carreggiata; gli stalli sul lato della sosta
  function segnaletica(rd) { const P = profilo(rd); return { corsie: P.corsie, mezzeria: P.mezzeria, asse: P.shift, sosta: P.sosta.slice(), larg: P.larg }; }

  // ---------------- le linee ----------------
  function linea(pts) { const cum = [0]; for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + hyp(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1])); return { pts, cum, L: cum[cum.length - 1] }; }
  function lAt(Ln, s) {
    const P = Ln.pts, C = Ln.cum; s = clamp(s, 0, Ln.L); let lo = 0, hi = C.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (C[m] <= s) lo = m; else hi = m; }
    const a = P[lo], b = P[hi], t = (s - C[lo]) / ((C[hi] - C[lo]) || 1); return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, ang: Math.atan2(b[1] - a[1], b[0] - a[0]) };
  }
  function lNear(Ln, x, y) { let best = 1e9, bs = 0; const P = Ln.pts; for (let k = 0; k < P.length - 1; k++) { const ax = P[k][0], ay = P[k][1], dx = P[k + 1][0] - ax, dy = P[k + 1][1] - ay, L2 = dx * dx + dy * dy || 1e-9, t = clamp(((x - ax) * dx + (y - ay) * dy) / L2, 0, 1), d = hyp(ax + dx * t - x, ay + dy * t - y); if (d < best) { best = d; bs = Ln.cum[k] + t * Math.sqrt(L2); } } return { d: best, s: bs }; }
  function chaikin(P, n) { for (let it = 0; it < n; it++) { const Q = [P[0]]; for (let k = 0; k < P.length - 1; k++) { const a = P[k], b = P[k + 1]; Q.push([a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25], [a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75]); } Q.push(P[P.length - 1]); P = Q; } return P; }
  function ricampiona(P, passo) { const Ln = linea(P), out = []; for (let s = 0; s < Ln.L; s += passo) { const q = lAt(Ln, s); out.push([q.x, q.y]); } const e = P[P.length - 1]; out.push([e[0], e[1]]); return out; }
  const RDL = {}; const rdLinea = rd => RDL[rd.id] || (RDL[rd.id] = linea(rd.pts));
  const RDID = id => ROADS().find(r => r.id === id);

  // le corsie del traffico (G.LANES) seguono il profilo: carreggiata più stretta dove si parcheggia, asse spostato verso il lato libero
  function adattaCorsie() {
    if (!ATTIVO || !G.LANES || G.LANES.__vv) return; G.LANES.__vv = true;
    G.LANES.forEach(L => { const rd = RDID(L.id); if (!rd) return; const P = profilo(rd); if (!P.corsie || P.rango === 'via_minore') return;
      L.w0 = L.w; L.w = P.larg;
      if (Math.abs(P.shift) > .01) { const pts = L.pts.map((p, k) => { const a = L.pts[Math.max(0, k - 1)], b = L.pts[Math.min(L.pts.length - 1, k + 1)], l = hyp(b[0] - a[0], b[1] - a[1]) || 1; return [p[0] - (b[1] - a[1]) / l * P.shift, p[1] + (b[0] - a[0]) / l * P.shift]; });
        const cum = [0]; for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + hyp(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1])); L.pts = pts; L.cum = cum; L.L = cum[cum.length - 1]; } });
  }

  // ================= GLI INCROCI =================
  // dove due strade di rango si toccano (attraversamenti e innesti a T): servono alla sosta, ai giornali, al vigile
  let INC = null;
  function incroci() {
    if (INC) return INC; INC = [];
    const R = ROADS().filter(rd => { const r = rango(rd); return r === 'asse' || r === 'via' || r === 'via_minore' || r === 'vicolo' || r === 'extra'; });
    const add = (x, y, a, b) => { const q = INC.find(j => hyp(j.x - x, j.y - y) < 6); if (q) { if (!q.rds.includes(a)) q.rds.push(a); if (!q.rds.includes(b)) q.rds.push(b); return; } INC.push({ x, y, rds: [a, b] }); };
    for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) {
      const A = R[i], B = R[j], PA = A.pts, PB = B.pts;
      for (let a = 0; a < PA.length - 1; a++) for (let b = 0; b < PB.length - 1; b++) {
        const a1 = PA[a], a2 = PA[a + 1], b1 = PB[b], b2 = PB[b + 1], d1x = a2[0] - a1[0], d1y = a2[1] - a1[1], d2x = b2[0] - b1[0], d2y = b2[1] - b1[1], den = d1x * d2y - d1y * d2x; if (Math.abs(den) < 1e-9) continue;
        const t = ((b1[0] - a1[0]) * d2y - (b1[1] - a1[1]) * d2x) / den, u = ((b1[0] - a1[0]) * d1y - (b1[1] - a1[1]) * d1x) / den;
        if (t >= -.02 && t <= 1.02 && u >= -.02 && u <= 1.02) add(a1[0] + d1x * t, a1[1] + d1y * t, A, B);
      }
      // le teste che finiscono dentro l'altra strada
      [[A, B], [B, A]].forEach(([X, Y]) => [X.pts[0], X.pts[X.pts.length - 1]].forEach(e => { const q = lNear(rdLinea(Y), e[0], e[1]); if (q.d < Y.w / 2 + 2.5) { const p = lAt(rdLinea(Y), q.s); add(p.x, p.y, X, Y); } }));
    }
    INC.forEach(j => { j.peso = j.rds.reduce((s, rd) => s + ({ asse: 4, via: 3, extra: 2, via_minore: 1.5, vicolo: .5 })[rango(rd)] * rd.w, 0); j.r = Math.max(...j.rds.map(rd => rd.w)) / 2 + 2; j.grande = j.rds.filter(rd => rango(rd) === 'asse' || rango(rd) === 'via').length >= 2; });
    return INC;
  }
  const vicinoIncrocio = (x, y, pad) => incroci().some(j => hyp(j.x - x, j.y - y) < j.r + (pad || 0));

  // ================= I FRONTI (chiarezza.js) =================
  let FR = null;
  const fronti = () => FR || (FR = CH ? CH.fronti(G.BUILDINGS, TS, (tx, ty) => G.tileAt(tx, ty), T, G.GW, G.GH, W.pezzi) : null);
  const davanti = (x, y, pad) => !!(CH && fronti() && CH.davanti(fronti(), x, y, pad || 0));
  // la soglia: la fascia della porta vera e propria (larga quanto la porta più un passo, profonda prof m dal muro), per le cose basse
  // a terra (l'erba al piede del muro accanto a una porta non la chiude; sulla soglia sì)
  function soglia(x, y, prof, half) {
    const Fr = fronti(); if (!Fr || !Fr.cella) return null; const C = Fr.C, i0 = Math.floor(x / C), j0 = Math.floor(y / C);
    for (let i = i0 - 1; i <= i0 + 1; i++) for (let j = j0 - 1; j <= j0 + 1; j++) for (const q of Fr.cella.get(i * 8192 + j) || []) {
      if (q.tipo === 'scala') { if (hyp(x - q.x, y - q.z) < q.half) return q; continue; }
      const dx = x - q.x, dz = y - q.z, v = dx * q.nx + dz * q.nz, u = Math.abs(dx * -q.nz + dz * q.nx), h = q.tipo === 'porta' ? (half || 1.2) : q.half;
      if (v > -.5 && v < (prof || 1.6) && u < h) return q; }
    return null; }
  // dove si può stare a piedi e posare una cosa: percorribile, non carreggiata, non acqua
  const aPiedi = (x, y) => { const v = tile(x, y); return G.walkM(x, y) && v !== T.VIA && v !== T.WATER && v !== T.STAIRS; };
  const libero = (x, y, r) => aPiedi(x, y) && [[r, 0], [-r, 0], [0, r], [0, -r]].every(([a, b]) => aPiedi(x + a, y + b));
  // una striscia libera orientata: a metri lungo (ux, uy) e b metri di traverso, dal centro
  const fascia = (x, y, ux, uy, a, b) => aPiedi(x, y) && [[a, 0], [-a, 0], [0, b], [0, -b], [a, b], [-a, b], [a, -b], [-a, -b]].every(([p, q]) => aPiedi(x + ux * p - uy * q, y + uy * p + ux * q));

  // ================= GLI ANCORAGGI (i luoghi) =================
  // la Stazione (il pezzo), il Mercato (la scenografia), la Marina (la scenografia o il luogo), l'asse (la piazza d'adunata o il mezzo)
  function ancore() {
    const out = {}, sets = W.sets || [], pz = W.pezzi || [], PL = G.PLACES || {};
    const c = s => s.x !== undefined ? { x: s.x, y: s.y } : { x: (s.x0 + s.x1) / 2, y: (s.y0 + s.y1) / 2 };
    const st = pz.find(p => p.tipo === 'stazione'); if (st) out.stazione = { x: st.x, y: st.y, nome: 'Stazione' };
    else { const p = Object.values(PL).find(q => /stazione/i.test(q.name || '') && zonaCitta(q.x, q.y)); if (p) out.stazione = { x: p.x, y: p.y, nome: 'Stazione' }; }
    const mk = sets.find(s => s.k === 'mercato'); if (mk) out.mercato = Object.assign(c(mk), { nome: 'Mercato', r: mk.r || 14 });
    const asse = ROADS().find(rd => rango(rd) === 'asse');
    if (asse) { const ad = sets.find(s => s.k === 'adunata'), L = rdLinea(asse), q = ad ? lAt(L, lNear(L, c(ad).x, c(ad).y).s) : lAt(L, L.L * .35); out.asse = { x: q.x, y: q.y, nome: asse.name ? asse.name.replace(/^Via (della |del )?/, '') : 'Vittoria', rd: asse }; }
    const mar = [sets.find(s => s.k === 'marina'), PL.marina, PL.calata].filter(Boolean).map(c);
    if (mar.length) out.marina = Object.assign(mar, { nome: 'Marina' });
    return out;
  }

  // ================= LA LINEA 1: il percorso, le fermate =================
  let LIN = null;
  function lineaBus() {
    if (LIN) return LIN; LIN = { ok: false, fermate: [], giro: null, nodi: [] }; if (!ATTIVO || !G.LANES) return LIN;
    adattaCorsie();
    // il grafo: le corsie delle vie e dell'asse a passi di 4 m, legate dove le strade si incontrano
    const N = [];
    G.LANES.forEach((L, li) => { const rd = RDID(L.id); if (!rd) return; const r = rango(rd); if (r !== 'via' && r !== 'asse') return;
      const n = Math.max(2, Math.ceil(L.L / 4)); let prev = null;
      for (let k = 0; k <= n; k++) { const s = L.L * k / n, p = G.laneAt(L, s), q = { i: N.length, li, s, x: p.x, y: p.y, w: L.w, rd, adj: [] }; N.push(q); if (prev) { const d = hyp(q.x - prev.x, q.y - prev.y); q.adj.push([prev.i, d]); prev.adj.push([q.i, d]); } prev = q; } });
    for (let a = 0; a < N.length; a++) for (let b = a + 1; b < N.length; b++) { const A = N[a], B = N[b]; if (A.li === B.li) continue; const d = hyp(A.x - B.x, A.y - B.y); if (d < Math.max(A.w, B.w) / 2 + 2.5) { A.adj.push([b, d + 4]); B.adj.push([a, d + 4]); } }
    if (N.length < 4) return LIN;
    const snap = (x, y) => { let best = null, bd = 1e9; N.forEach(q => { const d = hyp(q.x - x, q.y - y); if (d < bd) { bd = d; best = q; } }); return { q: best, d: bd }; };
    const dijkstra = (a, b) => { const D = new Float64Array(N.length).fill(Infinity), P = new Int32Array(N.length).fill(-1), done = new Uint8Array(N.length); D[a] = 0;
      for (;;) { let u = -1, bd = Infinity; for (let i = 0; i < N.length; i++) if (!done[i] && D[i] < bd) { bd = D[i]; u = i; } if (u < 0 || u === b) break; done[u] = 1; for (const [v, c] of N[u].adj) if (D[u] + c < D[v]) { D[v] = D[u] + c; P[v] = u; } }
      if (!isFinite(D[b])) return null; const out = []; for (let v = b; v >= 0; v = P[v]) out.unshift(v); return out; };
    const A = ancore(), seq = [];
    const pick = (o, nome) => { if (!o) return; const L = Array.isArray(o) ? o : [o]; let best = null; L.forEach(p => { const s = snap(p.x, p.y); if (s.d < 60 && (!best || s.d < best.d)) best = { q: s.q, d: s.d, nome: o.nome || nome, p }; }); if (best && !seq.some(z => z.q === best.q)) seq.push(best); };
    pick(A.stazione, 'Stazione'); pick(A.asse, 'Vittoria'); pick(A.mercato, 'Mercato'); pick(A.marina, 'Marina');
    if (seq.length < 2) return LIN;
    let path = [seq[0].q.i]; seq[0].k = 0;
    for (let k = 1; k < seq.length; k++) { const p = dijkstra(path[path.length - 1], seq[k].q.i); if (!p) { seq.length = k; break; } path = path.concat(p.slice(1)); seq[k].k = path.length - 1; }
    if (path.length < 3) return LIN;
    // le fermate: gli ancoraggi, e in mezzo una ogni CFG.passoFermate m al massimo
    const cumC = [0]; for (let k = 1; k < path.length; k++) cumC.push(cumC[k - 1] + hyp(N[path[k]].x - N[path[k - 1]].x, N[path[k]].y - N[path[k - 1]].y));
    const stopK = seq.map(z => ({ k: z.k, nome: z.nome }));
    for (let i = 0; i < stopK.length - 1; i++) { const a = stopK[i], b = stopK[i + 1], gap = cumC[b.k] - cumC[a.k]; if (gap > CFG.passoFermate * 1.25) { const want = cumC[a.k] + gap / 2; let k = a.k; while (k < b.k && cumC[k] < want) k++; stopK.splice(i + 1, 0, { k, nome: (N[path[k]].rd.name || 'Via').replace(/^(Via|Corso|Viale)\s+/i, m => m) }); } }
    // il giro: l'andata a destra e il ritorno a destra (all'inverso), le inversioni a U ai capolinea e dove la linea torna indietro
    const giro = [], dirOf = (a, b) => { const dx = b.x - a.x, dy = b.y - a.y, l = hyp(dx, dy) || 1; return [dx / l, dy / l]; };
    const tratto = (ids) => { const out = []; for (let k = 0; k < ids.length; k++) { const q = N[ids[k]], pv = N[ids[Math.max(0, k - 1)]], nx = N[ids[Math.min(ids.length - 1, k + 1)]];
        const din = k ? dirOf(pv, q) : dirOf(q, nx), dout = k < ids.length - 1 ? dirOf(q, nx) : din, off = q.w / 4;
        if (k && k < ids.length - 1 && din[0] * dout[0] + din[1] * dout[1] < -.4) {   // l'inversione: mezzo giro sul lato sinistro, largo quanto la carreggiata
          const R = Math.max(off, q.w / 2 - 1.4); for (let a = 0; a <= 8; a++) { const t = a / 8 * PI, rx = -din[1], ry = din[0]; out.push([q.x + R * (Math.cos(t) * rx + Math.sin(t) * din[0]), q.y + R * (Math.cos(t) * ry + Math.sin(t) * din[1])]); } continue; }
        let dx = din[0] + dout[0], dy = din[1] + dout[1]; const l = hyp(dx, dy) || 1; dx /= l; dy /= l; out.push([q.x - dy * off, q.y + dx * off]); }
      return out; };
    const capo = (q, din) => { const R = Math.max(q.w / 4, q.w / 2 - 1.4), out = []; for (let a = 1; a < 8; a++) { const t = a / 8 * PI, rx = -din[1], ry = din[0]; out.push([q.x + R * (Math.cos(t) * rx + Math.sin(t) * din[0]), q.y + R * (Math.cos(t) * ry + Math.sin(t) * din[1])]); } return out; };
    // il ritorno non rifà gli speroni (dove l'andata entra in una via e torna indietro, come sull'asse): li ha già serviti l'andata
    const senzaSperoni = ids => { ids = ids.slice(); for (let guard = 0; guard < 20; guard++) { let cut = false;
        for (let k = 1; k < ids.length - 1 && !cut; k++) { const din = dirOf(N[ids[k - 1]], N[ids[k]]), dout = dirOf(N[ids[k]], N[ids[k + 1]]); if (din[0] * dout[0] + din[1] * dout[1] > -.4) continue;
          let j = 1; while (k - j >= 0 && k + j < ids.length && hyp(N[ids[k - j]].x - N[ids[k + j]].x, N[ids[k - j]].y - N[ids[k + j]].y) < 3) j++;
          if (k - j < 0 || k + j >= ids.length) continue; ids.splice(k - j + 1, 2 * j - 1); cut = true; }
        if (!cut) break; } return ids; };
    const ritIds = senzaSperoni(path.slice().reverse());
    const and = tratto(path), rit = tratto(ritIds), qe = N[path[path.length - 1]], q0 = N[path[0]];
    const pts = and.concat(capo(qe, dirOf(N[path[path.length - 2]], qe)), rit, capo(q0, dirOf(N[path[1]], q0)));
    const P = ricampiona(chaikin(pts, 2), 1);
    P.push([P[0][0], P[0][1]]);
    const Ln = linea(P); LIN.giro = Ln; LIN.nodi = path.map(i => ({ x: N[i].x, y: N[i].y, w: N[i].w }));
    // le curve: la velocità massima a ogni metro (accelerazione laterale ~1,6 m/s²)
    LIN.vcurva = P.map((p, k) => { const a = P[Math.max(0, k - 4)], b = P[Math.min(P.length - 1, k + 4)], a1 = Math.atan2(p[1] - a[1], p[0] - a[0]), a2 = Math.atan2(b[1] - p[1], b[0] - p[0]), da = Math.abs(angDiff(a2, a1)) || 1e-3, R = 4 / da; return clamp(Math.sqrt(1.6 * R), 2.2, CFG.autobus.vmax); });
    // le fermate sui due lati: il marciapiede accanto alla corsia, spostato fino a 12 m se davanti c'è una porta o una vetrina
    let nid = 0; const capi = new Set([0, stopK.length - 1]);
    stopK.forEach((S, si) => {
      const q = N[path[S.k]];
      [1, -1].forEach(verso => {   // 1: andata, -1: ritorno (sul suo percorso senza speroni)
        const ids = verso > 0 ? path : ritIds, k0 = verso > 0 ? S.k : ids.indexOf(path[S.k]); if (k0 < 0) return;
        const a = N[ids[Math.max(0, k0 - 1)]], b = N[ids[Math.min(ids.length - 1, k0 + 1)]];
        // il verso di marcia in quel punto: quello di chi arriva (vale anche dove la linea fa inversione)
        let [ux, uy] = k0 > 0 ? dirOf(a, q) : dirOf(q, b);
        const rx = -uy, ry = ux, half = (q.rd.w) / 2;   // a destra di chi va in quel verso (sulla strada vera, non sulla carreggiata spostata)
        const rdL = rdLinea(q.rd), sc = lNear(rdL, q.x, q.y).s;
        let got = null;
        for (const dS of [0, 4, -4, 8, -8, 12, -12, 16, -16, 20, -20, 24, -24]) { const c = lAt(rdL, clamp(sc + dS * verso, 2, rdL.L - 2)), sgn = (Math.cos(c.ang) * ux + Math.sin(c.ang) * uy) >= 0 ? 1 : -1, nx = -Math.sin(c.ang) * sgn, ny = Math.cos(c.ang) * sgn;
          for (const o of [.8, 1.3, 2.1, 2.9]) { const x = c.x + nx * (half + o), y = c.y + ny * (half + o), ux2 = Math.cos(c.ang), uy2 = Math.sin(c.ang); if (!fascia(x, y, ux2, uy2, 1.4, .35) || davanti(x, y, 1.2) || vicinoIncrocio(x, y, -2)) continue; got = { x, y, ang: Math.atan2(-ny, -nx), cx: c.x + nx * (half - 1.4), cy: c.y + ny * (half - 1.4), largo: fascia(x + nx * .9, y + ny * .9, ux2, uy2, 1.6, .7) }; break; }
          if (got) break; }
        if (!got) return;
        const sg = lNear(Ln, got.cx, got.cy);
        const nome = S.nome === 'Vittoria' && A.asse ? A.asse.nome : S.nome;
        const pl = lAt(Ln, sg.s);
        LIN.fermate.push({ id: 'vv_fermata_' + (nid++), nome, x: got.x, y: got.y, dir: got.ang, lx: got.cx - pl.x, ly: got.cy - pl.y, pensilina: got.largo && q.rd.era !== 'E4', capolinea: capi.has(si), verso, s: sg.s, sd: sg.d, rd: q.rd.id, zona: q.rd.era || '' });
      });
    });
    LIN.fermate.sort((a, b) => a.s - b.s);
    LIN.fermate = LIN.fermate.filter((f, i, A2) => f.sd < 4 && !A2.slice(0, i).some(g => hyp(g.x - f.x, g.y - f.y) < 8));
    LIN.nomi = stopK.map(z => z.nome); LIN.ok = LIN.fermate.length >= 2;
    LIN.orario = 'LINEA 1 · ' + LIN.nomi.join(' – ').toUpperCase() + '\nFERIALE 6.00 – 21.30 · OGNI 20 MINUTI\nFESTIVO OGNI 40 MINUTI · ULTIMA CORSA 21.30';
    return LIN;
  }
  function fermate() { return lineaBus().fermate; }

  // ================= LA SOSTA =================
  let STL = null;
  function stalli() {
    if (STL) return STL; STL = []; if (!ATTIVO) return STL;
    const L1 = lineaBus(), A = ancore(), mk = A.mercato, sz = A.stazione, ed = edicole();
    ROADS().forEach(rd => { const P = profilo(rd); if (P.rango !== 'via' || !P.sosta.length) return; const Ln = rdLinea(rd);
      P.sosta.forEach(sd => {
        for (let s = 7; s + CFG.stallo < Ln.L - 7; s += CFG.stallo) {
          const c = lAt(Ln, s + CFG.stallo / 2), nx = -Math.sin(c.ang) * sd, ny = Math.cos(c.ang) * sd, o = rd.w / 2 - CFG.sosta / 2, x = c.x + nx * o, y = c.y + ny * o;
          if (!zonaCitta(x, y) || vicinoIncrocio(x, y, 5)) continue;
          const v = tile(x, y); if (v === T.BLD || v === T.WATER || v === undefined) continue;
          // mai davanti a una porta, a una vetrina o a una scala (il punto del cordolo e le due teste dell'auto)
          const ux = Math.cos(c.ang), uy = Math.sin(c.ang); let fr = false;
          for (const o2 of [.4, 1.1, 1.8]) for (const a2 of [-2.7, -1.3, 0, 1.3, 2.7]) if (!fr && davanti(c.x + nx * (rd.w / 2 + o2) + ux * a2, c.y + ny * (rd.w / 2 + o2) + uy * a2, .2)) fr = true;
          if (fr) continue;
          if (L1.fermate.some(f => hyp(f.x - x, f.y - y) < 22) || ed.some(e => hyp(e.kx - x, e.ky - y) < 5)) continue;   // la fermata: l'autobus accosta nei 16 m prima e riparte nei 12 dopo
          if (L1.giro && lNear(L1.giro, x, y).d < 1.25 + .85 + .1) continue;   // mai sulla strada dell'autobus (in curva taglia gli angoli)
          const pz = (mk && hyp(mk.x - x, mk.y - y) < (mk.r || 14) + 34) ? 'mercato' : (sz && hyp(sz.x - x, sz.y - y) < 46) ? 'stazione' : 'via';
          STL.push({ x, y, ang: c.ang + (sd > 0 ? 0 : PI) * 0, rd: rd.id, sd, s, cx: c.x, cy: c.y, nx, ny, w: rd.w, dove: pz });
        } }); });
    return STL;
  }

  // ================= LE EDICOLE =================
  let EDI = null;
  function edicole() {
    if (EDI) return EDI; EDI = []; if (!ATTIVO) return EDI;
    const A = ancore(), vie = ROADS().filter(rd => rango(rd) === 'via').sort((a, b) => rdLinea(b).L - rdLinea(a).L), anc = [];
    if (A.mercato) anc.push({ x: A.mercato.x, y: A.mercato.y, r0: (A.mercato.r || 14) * .45, r1: (A.mercato.r || 14) + 14, nome: 'Mercato', piazza: true });
    if (A.stazione) anc.push({ x: A.stazione.x, y: A.stazione.y, r0: 6, r1: 26, nome: 'Stazione' });
    if (A.asse) { const L = rdLinea(A.asse.rd), q = lAt(L, Math.min(L.L - 10, lNear(L, A.asse.x, A.asse.y).s + 22)); anc.push({ x: q.x, y: q.y, r0: A.asse.rd.w / 2 + 1, r1: A.asse.rd.w / 2 + 8, nome: A.asse.nome }); }
    if (vie[0]) { const L = rdLinea(vie[0]), q = lAt(L, L.L / 2); anc.push({ x: q.x, y: q.y, r0: vie[0].w / 2 + 1, r1: vie[0].w / 2 + 9, nome: vie[0].name || 'Corso' }); }
    const VIA = (x, y) => tile(x, y) === T.VIA;
    anc.forEach(a => {
      if (EDI.some(e => hyp(e.kx - a.x, e.ky - a.y) < 50)) return;
      let best = null, bs = -1e9;
      for (let r = a.r0; r <= a.r1; r += 1) for (let k = 0; k < 24; k++) { const t = k / 24 * 2 * PI, x = Math.round((a.x + Math.cos(t) * r) * 2) / 2, y = Math.round((a.y + Math.sin(t) * r) * 2) / 2;
        if (!libero(x, y, 1.6) || davanti(x, y, 2) || vicinoIncrocio(x, y, 2)) continue;
        // il fronte del chiosco guarda la strada più vicina (in quattro direzioni); davanti ci sta la fila
        let dir = null, dd = 99; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([ox, oy]) => { for (let d = 2; d < 9; d += .5) if (VIA(x + ox * d, y + oy * d)) { if (d < dd) { dd = d; dir = [ox, oy]; } break; } });
        if (!dir && a.piazza) { const t2 = Math.atan2(a.y - y, a.x - x), q4 = Math.round(t2 / (PI / 2)) * PI / 2; dir = [Math.round(Math.cos(q4)), Math.round(Math.sin(q4))]; dd = 6; }   // in piazza il bancone guarda il centro
        if (!dir || dd < 3.4) continue; const qx = x + dir[0] * 2.1, qy = y + dir[1] * 2.1; if (!libero(qx, qy, .6)) continue;
        const sc = -Math.abs(r - (a.r0 + 2)) * .3 - dd * .4 + hash(x, y, 77) * .2; if (sc > bs) { bs = sc; best = { kx: x, ky: y, kang: Math.atan2(dir[1], dir[0]), x: qx, y: qy, dir: Math.atan2(-dir[1], -dir[0]), nome: a.nome }; } }
      if (best) EDI.push(best);
    });
    return EDI;
  }

  // ================= LE PLANCE DELLE AFFISSIONI, I GIORNALI =================
  // il titolo del giorno: il Corriere del Gelo (il regime) e il Disgelo (il clandestino, ciclostilato, attaccato di notte)
  const TITOLI = {
    corriere: ['RATE A TASSO ZERO PER OGNI FAMIGLIA', 'IL GARANTE INAUGURA IL NUOVO VIALE', 'RECORD DI CARBONE ALLA MINIERA', 'ORDINE E LAVORO: LA PARATA DI DOMENICA', 'ARRIVA LA NUOVA UTILITARIA DEL POPOLO', 'SVENTATO UN COVO DI SOVVERSIVI', 'IL CARBONE SCALDA L\'ISOLA'],
    disgelo: ['LA MINIERA CI MANGIA VIVI', 'CHI HA SPARITO I RAGAZZI DEL PORTO?', 'IL GHIACCIO SI ROMPE', 'NON FIRMATE LE CAMBIALI', 'SABATO CYPHER ALLA GRATA', 'RADIO LUNA 98.6 · ACCENDETE', 'IL 20% NON SI DIMENTICA'],
  };
  const titolo = (t, chi) => { const L = TITOLI[chi], d = Math.floor((t || 0) / 1440); return L[(d * (chi === 'corriere' ? 3 : 5) + 1) % L.length]; };
  let PLA = null;
  function plance() {
    if (PLA) return PLA; PLA = []; if (!ATTIVO) return PLA;
    const L1 = lineaBus(), ed = edicole(), st = stalli();
    ROADS().forEach(rd => { const P = profilo(rd); if (P.rango !== 'via' && P.rango !== 'asse') return; const Ln = rdLinea(rd), passo = P.rango === 'asse' ? 70 : 55;
      for (let s = 18 + hash(rd.w, Ln.L, 5) * 20; s < Ln.L - 12; s += passo) {
        const c = lAt(Ln, s); let got = null;
        for (const sd of [latoLontano(rd), -latoLontano(rd)]) { const nx = -Math.sin(c.ang) * sd, ny = Math.cos(c.ang) * sd;
          for (const o of [.45, 1.4, 2.2]) { const x = c.x + nx * (rd.w / 2 + o), y = c.y + ny * (rd.w / 2 + o);
            if (!fascia(x, y, Math.cos(c.ang), Math.sin(c.ang), 1.2, .25) || davanti(x, y, 1.8) || vicinoIncrocio(x, y, 4)) continue;
            if (L1.fermate.some(f => hyp(f.x - x, f.y - y) < 10) || ed.some(e => hyp(e.kx - x, e.ky - y) < 8) || PLA.some(p => hyp(p.x - x, p.y - y) < 30)) continue;
            got = { x, y, ang: c.ang, nx, ny, rd: rd.id, asse: P.rango === 'asse', era: rd.era || '' }; break; }
          if (got) break; }
        if (got) PLA.push(got);
      } });
    PLA.forEach((p, i) => { p.manifesti = p.asse ? ['regime', 'auto'] : [['regime', 'disgelo'], ['concerto', 'auto'], ['disgelo', 'elezioni'], ['auto', 'radio']][i % 4]; p.volantino = !p.asse && hash(p.x, p.y, 31) < .7; });
    return PLA;
  }

  // ================= IL SUOLO: erba, foglie, pozzanghere, gatti, volantini =================
  let SUO = null;
  // quanta erba nei giunti per epoca: il borgo e le baracche tanta, il regime niente (si strappa per ordine)
  const ERBA = { E0: .6, E1: .4, E2: .5, E3: .16, E4: .015, E5: .2, E6: .22, E7: .7 };
  function suolo() {
    if (SUO) return SUO; SUO = { erba: [], foglie: [], pozze: [], gatti: [], volantini: [] }; if (!ATTIVO) return SUO;
    // l'erba: al piede dei muri e nei giunti del cordolo, a ciuffi di 2-4; il passo segue l'epoca della strada
    ROADS().forEach((rd, ri) => { const r0 = rango(rd); if (r0 === 'nessuno' || r0 === 'extra') return; const Ln = rdLinea(rd), dens = ERBA[rd.era] !== undefined ? ERBA[rd.era] : .2;
      for (let s = 3; s < Ln.L - 3; s += 4.5) { const c = lAt(Ln, s);
        [-1, 1].forEach(sd => { const h = hash(ri * 13 + sd, s * 7, 41); if (h > dens) return; const nx = -Math.sin(c.ang) * sd, ny = Math.cos(c.ang) * sd;
          // il piede del muro: si cammina dal bordo della strada verso fuori fino al primo muro
          let wx = null, wy = null; for (let o = rd.w / 2; o < rd.w / 2 + 5; o += .25) { const x = c.x + nx * o, y = c.y + ny * o; if (tile(x, y) === T.BLD) { wx = c.x + nx * (o - .18); wy = c.y + ny * (o - .18); break; } }
          const kerb = r0 === 'via' || r0 === 'asse', at = wx !== null && hash(s, ri, 43) < .7 ? [wx, wy] : kerb ? [c.x + nx * (rd.w / 2 + .05), c.y + ny * (rd.w / 2 + .05)] : null; if (!at) return;
          if (soglia(at[0], at[1])) return; const n = 2 + Math.floor(hash(s, sd, 44) * 3), ux = Math.cos(c.ang), uy = Math.sin(c.ang);
          for (let k = 0; k < n; k++) { const a = (hash(k, s, 45) - .5) * 1.1, x = at[0] + ux * a - nx * hash(k, s, 46) * .12, y = at[1] + uy * a - ny * hash(k, s, 46) * .12; if (tile(x, y) === T.BLD || soglia(x, y)) continue; SUO.erba.push({ x, y, s: .55 + hash(k, s, 47) * .7, a: hash(k, s, 48) * 6.28, secca: hash(k, s, 49) < .35, era: rd.era || '', rd: rd.id }); } }); } });
    // le foglie sotto gli alberi dei filari (gli stessi di chiarezza.js e render.js), qualche foglia anche nel cordolo vicino
    if (CH) CH.strade(W.roads).forEach(V => { if (V.kind !== 'filare' || V.sp === 'palma') return; CH.filare(V.rd.pts, V.passo, V.off, V.inizio).forEach(t => { if (CH.davanti(fronti(), t.x, t.z)) return; if (!G.walkM(t.x, t.z)) return;
      const n = 5 + Math.floor(hash(t.x, t.z, 51) * 6); for (let k = 0; k < n; k++) { const a = hash(k, t.x, 52) * 6.28, r = .3 + Math.sqrt(hash(k, t.z, 53)) * 2.1, x = t.x + Math.cos(a) * r, y = t.z + Math.sin(a) * r; if (tile(x, y) === T.BLD || soglia(x, y)) continue; SUO.foglie.push({ x, y, a: hash(k, x, 54) * 6.28, c: Math.floor(hash(k, y, 55) * 4) }); } }); });
    // le pozzanghere: alle caditoie degli incroci, dove l'acqua della notte si ferma (una per incrocio, al cordolo)
    incroci().forEach((j, i) => { if (!zonaCitta(j.x, j.y) || hash(j.x, j.y, 61) > .7) return; const rd = j.rds.slice().sort((a, b) => b.w - a.w)[0], Ln = rdLinea(rd), q = lNear(Ln, j.x, j.y), sg = hash(i, 3, 62) < .5 ? 1 : -1;
      const c = lAt(Ln, clamp(q.s + sg * (j.r + 2.5), 0, Ln.L)), sd = hash(i, 4, 63) < .5 ? 1 : -1, nx = -Math.sin(c.ang) * sd, ny = Math.cos(c.ang) * sd, x = c.x + nx * (rd.w / 2 - .7), y = c.y + ny * (rd.w / 2 - .7);
      if (tile(x, y) === T.BLD) return; SUO.pozze.push({ x, y, a: c.ang, l: 1.4 + hash(i, 5, 64) * 1.6, w: .6 + hash(i, 6, 65) * .5 }); });
    // il gatto sul gradino: qualche portone di casa del borgo e della marina (il gradino è suo: davanti alla porta, sì)
    const B = G.BUILDINGS || []; let ng = 0;
    B.forEach((b, bi) => { if (ng >= 6 || !b.door || b.shopFront || !(b.era === 'E0' || b.era === 'E2') || hash(b.x, b.y, 71) > .05) return; const [dx, dy] = b.door, o = dx < b.x ? [-1, 0] : dx >= b.x + b.w ? [1, 0] : dy < b.y ? [0, -1] : [0, 1];
      const x = (dx + .5) * TS - o[0] * TS * .32, y = (dy + .5) * TS - o[1] * TS * .32; if (!G.walkM(x, y)) return; SUO.gatti.push({ x, y, a: Math.atan2(o[1], o[0]) + (hash(b.x, b.y, 72) - .5) * 1.4, c: Math.floor(hash(bi, 1, 73) * 4), dorme: hash(bi, 2, 74) < .4 }); ng++; });
    // il volantino caduto sotto la plancia
    plance().forEach(p => { if (!p.volantino) return; const n = 1 + Math.floor(hash(p.x, p.y, 81) * 2); for (let k = 0; k < n; k++) { const a = (hash(k, p.x, 82) - .5) * 1.6, x = p.x + Math.cos(p.ang) * a - p.nx * (.3 + hash(k, p.y, 83) * .5), y = p.y + Math.sin(p.ang) * a - p.ny * (.3 + hash(k, p.y, 83) * .5); if (soglia(x, y)) continue; SUO.volantini.push({ x, y, a: hash(k, x, 84) * 6.28, k: hash(k, y, 85) < .5 ? 'disgelo' : 'concerto' }); } });
    return SUO;
  }

  // ================= IL VIGILE ALL'INCROCIO =================
  function incrocioGrande() { const L = incroci().filter(j => j.grande && zonaCitta(j.x, j.y)).sort((a, b) => b.peso - a.peso); return L[0] || null; }

  // ================= IL TRAFFICO =================
  const COL = { auto: [['cinquecento', '#f3c6d4'], ['ritmo', '#b8302a'], ['giulia', '#2f4a3a'], ['cinquecento', '#6ab8c8'], ['ritmo', '#f2e2a0'], ['giulia', '#efe6d2'], ['ritmo', '#7fd0b0'], ['cinquecento', '#d86a4a'], ['ritmo', '#c8c8d0'], ['giulia', '#3a4a6a'], ['cinquecento', '#e8e4d6'], ['ritmo', '#8a2a2a']],
    asse: [['giulia', '#2a2a32'], ['ritmo', '#c8c8d0'], ['giulia', '#efe6d2'], ['cinquecento', '#e8e4d6'], ['ritmo', '#3a4a6a'], ['giulia', '#5a5a5e']],   // sull'asse le berline scure e chiare dei benpensanti
    ape: [['ape', '#9ab07a'], ['ape', '#7a9ab0'], ['ape', '#d8c070']], due: [['vespa', '#e8d9a8'], ['ciao', '#d8473f'], ['vespa', '#58b8a6'], ['ciao', '#3a6ab0'], ['vespa', '#e8e4d8'], ['ciao', '#e8b020']], furgone: [['furgone', '#d8d0c0'], ['furgone', '#e8e0d0']] };
  const LOOKS = [{ skin: '#e0b894', top: '#6a5a4a', bottom: '#2a2a33', hair: '#3a2a1a', hat: 'none', build: 1.05, extra: 'moustache' }, { skin: '#f0cfb2', top: '#a04a6a', bottom: '#2a2a33', hair: '#6a3a1a', hat: 'long', build: .9, extra: '' }, { skin: '#c99a76', top: '#3a5a7a', bottom: '#2a2a33', hair: '#111', hat: 'flat', hatCol: '#3a3a44', build: 1.1, extra: '' }, { skin: '#dcae88', top: '#e0d8c8', bottom: '#3a3a44', hair: '#888', hat: 'none', build: 1.0, extra: 'glasses' }, { skin: '#d8a982', top: '#2a3a2a', bottom: '#2a2a30', hair: '#2a1d14', hat: 'cap', hatCol: '#8a1f1f', build: 1, extra: '' }];
  const S = st => st.vv || (st.vv = { mezzi: [], bus: [], minori: [], sosta: [], affissi: [], palle: [], carretto: null, vigile: null, stats: { fermate: {}, corse: 0, saliti: 0, scesi: 0 }, hr: -1 });
  // le corsie minori (Rua, Via della Marina): la loro linea centrale, percorsa nei due versi a destra di un passo
  let MIN = null;
  const minori = () => MIN || (MIN = ROADS().filter(rd => profilo(rd).rango === 'via_minore' && zonaCitta(rd.pts[rd.pts.length >> 1][0], rd.pts[rd.pts.length >> 1][1])).map(rd => ({ rd, L: rdLinea(rd) })));
  function crea(st) {
    if (!ATTIVO) return; const V = S(st); adattaCorsie();
    // via il traffico di prima (popolo.js lo metteva per nome di strada): qui per rango e per ora
    st.vehicles = st.vehicles.filter(v => !v.cityTr);
    let i = 0; const mk = o => { const v = G.makeVehicle(st, Object.assign({ id: 'vv' + (i++), speed: 0 }, o)); st.vehicles.push(v); return v; };
    // le auto, l'Ape, i motorini e il furgone sulle corsie delle vie e dell'asse (G.LANES: li muove game.js)
    G.LANES.forEach((L, li) => { const rd = RDID(L.id); if (!rd) return; const P = profilo(rd); if (P.rango !== 'via' && P.rango !== 'asse') return;
      const n = Math.max(1, Math.round(L.L / 100 * CFG.mezziPer100[P.rango]));
      for (let k = 0; k < n; k++) { const dir = k % 2 ? -1 : 1, s = L.L * (.08 + .84 * (k + .5) / n), q = G.lanePos(L, s, dir), h = hash(li, k, 91);
        const fam = P.rango === 'asse' ? (h < .72 ? 'asse' : h < .86 ? 'due' : 'ape') : (h < .56 ? 'auto' : h < .72 ? 'due' : h < .86 ? 'ape' : 'furgone');
        const C = COL[fam][(li * 7 + k) % COL[fam].length];
        V.mezzi.push(mk({ kind: C[0], x: q.x, y: q.y, ang: q.ang, color: C[1], traffic: true, dir, lane: { i: li, s, dir }, speed: 4, vvTr: true, rango: P.rango, fam, driverLook: LOOKS[(li + k) % LOOKS.length] }).id); } });
    // la volante della Tutela: sempre in giro sull'asse, anche di notte (l'unica, a notte fonda)
    { const li = G.LANES.findIndex(L => { const rd = RDID(L.id); return rd && profilo(rd).rango === 'asse'; }); if (li >= 0) { const L = G.LANES[li], q = G.lanePos(L, L.L * .5, 1);
      V.mezzi.push(mk({ kind: 'polizia', x: q.x, y: q.y, ang: q.ang, color: '#6c7684', livrea: true, traffic: true, dir: 1, lane: { i: li, s: L.L * .5, dir: 1 }, speed: 4, vvTr: true, rango: 'asse', fam: 'volante', ronda: true, driverLook: { top: '#5c6672', skin: '#c99a76' } }).id); } }
    // sulle vie minori: Vespe, Ciao e Ape, guidati da qui (passo d'uomo, si fermano per la gente)
    minori().forEach((M, mi) => { const n = Math.max(1, Math.round(M.L.L / 100 * CFG.mezziPer100.via_minore));
      for (let k = 0; k < n; k++) { const verso = k % 2 ? -1 : 1, s = M.L.L * (.1 + .8 * (k + .5) / n), h = hash(mi, k, 93), C = h < .3 ? COL.ape[k % 3] : COL.due[(mi * 3 + k) % COL.due.length], q = posMinore(M, s, verso, C[0]);
        const v = mk({ kind: C[0], x: q.x, y: q.y, ang: q.ang, color: C[1], rider: 'npc', guida: 'minore', vvTr: true, rango: 'via_minore', fam: C[0] === 'ape' ? 'ape' : 'due', driverLook: LOOKS[(mi + k + 2) % LOOKS.length] });
        v.vvm = { m: mi, s, verso, wait: 0 }; V.minori.push(v.id); } });
    // l'autobus della linea 1: tre vetture sul giro, a distanze uguali
    const Lb = lineaBus(); if (Lb.ok) for (let k = 0; k < 3; k++) { const s = Lb.giro.L * k / 3, q = lAt(Lb.giro, s);
      const v = mk({ kind: 'autobus', x: q.x, y: q.y, ang: q.ang, color: '#e88a2a', rider: 'npc', guida: 'linea', vvTr: true, rango: 'via', fam: 'autobus', driverLook: { top: '#3a4a6a', skin: '#d8a982', hair: '#2a1d14' } });
      v.bus = { s, sosta: 0, servita: -1, linea: 1, n: k, porte: 0 }; V.bus.push(v.id); }
    // le auto in sosta sugli stalli: più fitte al Mercato e al piazzale della Stazione, mai più di CFG.sostaMax
    const SL = stalli().slice().sort((a, b) => hash(a.x, a.y, 95) - hash(b.x, b.y, 95)); let ns = 0;
    SL.forEach(q => { if (ns >= CFG.sostaMax) return; const p = q.dove === 'via' ? .42 : .8; if (hash(q.x, q.y, 96) > p) return;
      const C = hash(q.x, q.y, 97) < .12 ? COL.ape[ns % 3] : hash(q.x, q.y, 98) < .1 ? COL.furgone[ns % 2] : COL.auto[(ns * 5) % COL.auto.length]; if (C[0] === 'furgone' && q.dove === 'via') return;
      const ang = q.ang + (hash(q.x, q.y, 99) < .5 ? 0 : PI);   // in fila lungo il cordolo, nei due versi
      const v = mk({ kind: C[0], x: q.x, y: q.y, ang, color: C[1], sosta: q.dove }); q.v = v.id; V.sosta.push(v.id); ns++; });
    // il vigile urbano: all'incrocio grande nelle ore di punta (non entra nella vita del popolo: fa solo il vigile)
    const J = incrocioGrande(); if (J && G.makeNpc && G.PLACES) {
      G.PLACES.vv_incrocio = G.PLACES.vv_incrocio || { id: 'vv_incrocio', name: 'Incrocio', tx: Math.floor(J.x / TS), ty: Math.floor(J.y / TS), x: J.x, y: J.y };
      const n = G.makeNpc(st, { id: 'vv_vigile', name: 'Vigile urbano Melis', role: 'Vigile urbano: dirige il traffico all\'incrocio nelle ore di punta', tr: { cor: .5, loq: .6, avid: .2, legge: .9 }, sched: [[0, 'vv_incrocio']], hp: 80,
        look: { skin: '#d8a982', top: '#22304a', bottom: '#1c2438', uniform: '#22304a', hair: '#2a1d14', hat: 'police', hatCol: '#f2f0e8', build: 1.05, extra: 'belt,moustache' } });
      const angs = J.rds.filter(rd => rango(rd) === 'asse' || rango(rd) === 'via').slice(0, 2).map(rd => lAt(rdLinea(rd), lNear(rdLinea(rd), J.x, J.y).s).ang);
      n.first = 'Il vigile'; n.vigile = { x: J.x, y: J.y, angs: angs.length ? angs : [0, PI / 2] }; n.x = J.x; n.y = J.y; n.inside = true; st.npcs.push(n); V.vigile = n.id; }
    st.pop = st.pop || {}; st.pop.cityTr = V.mezzi.length + V.minori.length + V.bus.length;
    ora(st, true);
  }
  // sulle vie minori si tiene la destra di un passo; l'Ape un po' più al centro
  function posMinore(M, s, verso, kind) { const q = lAt(M.L, s), o = (kind === 'ape' ? .7 : 1.1) * (M.rd.w >= 5 ? 1 : .7), h = verso > 0 ? q.ang : q.ang + PI; return { x: q.x - Math.sin(h) * o, y: q.y + Math.cos(h) * o, ang: h }; }
  const hourOf = st => ((st.t / 60) % 24 + 24) % 24;
  // l'ora: quanti mezzi in giro (si nascondono e ricompaiono solo lontano dal giocatore, o sempre se si forza)
  function ora(st, forza) {
    const V = S(st), hr = hourOf(st), q = quota(hr), fa = FASCIA(hr), p = st.player, lontano = v => forza || hyp(v.x - p.x, v.y - p.y) > 60;
    let k = 0;
    V.mezzi.forEach(id => { const v = st.vehicles.find(z => z.id === id); if (!v || v.rider || v.wreck || v.stalled || !v.traffic) return;
      let want; if (v.fam === 'volante') want = true; else { let qq = q; if (v.fam === 'due' && fa === 'passeggiata') qq = 1; if (v.fam === 'furgone' && fa === 'punta') qq = 1; if (v.rango === 'asse' && fa === 'notte') qq = 0; want = ((k++ * 7) % 10) / 10 < qq - .001; }
      if (v.hidden !== !want) { if (lontano(v)) { v.hidden = !want; v.vvCambia = null; } else v.vvCambia = want ? 'accendi' : 'spegni'; } else v.vvCambia = null; });
    // il traffico dell'isola (game.js) quando passa in città: di notte anche lui sparisce (il coprifuoco)
    st.vehicles.forEach(v => { if (!v.traffic || v.vvTr || v.police || v.livrea || v.ronda || v.rider || !zonaCitta(v.x, v.y)) return; const want = fa !== 'notte'; if (v.hidden !== !want) { if (lontano(v)) { v.hidden = !want; v.vvCambia = null; } else v.vvCambia = want ? 'accendi' : 'spegni'; } });
    let j = 0; V.minori.forEach(id => { const v = st.vehicles.find(z => z.id === id); if (!v || v.rider !== 'npc' || !v.guida) return; let qq = q; if (fa === 'passeggiata') qq = 1; if (fa === 'pranzo') qq = .2; const want = ((j++ * 3) % 10) / 10 < qq - .001; if (v.hidden !== !want && lontano(v)) v.hidden = !want; });
    // l'autobus: tre vetture di giorno, una la sera, nessuna di notte (la vettura che finisce il servizio sparisce alla sua fermata)
    const nb = hr >= 6 && hr < 20.5 ? 3 : hr >= 20.5 && hr < 22.5 ? 1 : 0;
    V.bus.forEach((id, b) => { const v = st.vehicles.find(z => z.id === id); if (!v || !v.guida) return; const want = b < nb; if (v.hidden !== !want && (lontano(v) || !want && v.bus.sosta > 0)) v.hidden = !want; });
    V.hr = Math.floor(hr);
  }

  // ---------------- chi guida da qui: l'autobus e le vie minori ----------------
  // davanti c'è qualcuno? la distanza libera lungo la direzione (persone, giocatore, altri mezzi), entro la larghezza del mezzo
  function liberoDavanti(st, v, look, half, soloGente) {
    const fx = Math.cos(v.ang), fy = Math.sin(v.ang), K = G.VK[v.kind]; let best = look;
    // r: l'ingombro dell'ostacolo lungo la nostra direzione, rl: quello di traverso (per un'auto in sosta lungo il cordolo è mezza larghezza, non mezza lunghezza)
    const chk = (x, y, r, rl) => { const dx = x - v.x, dy = y - v.y, al = dx * fx + dy * fy, la = Math.abs(-dx * fy + dy * fx); if (al > K.len / 2 - .2 && al < K.len / 2 + look + r && la < half + (rl === undefined ? r : rl)) best = Math.min(best, al - K.len / 2 - r); };
    // la gente ferma solo chi guida se sta in carreggiata (chi aspetta sul marciapiede, anche quando il muso dell'autobus gira l'angolo, no);
    // sulle vie minori (senza marciapiede) tutti
    const inStrada = (x, y) => v.guida === 'minore' || tile(x, y) === T.VIA;
    if (!st.player.indoor && !(st.player.lv && st.player.lv.k === 'ug') && inStrada(st.player.x, st.player.y)) chk(st.player.x, st.player.y, .35);
    for (const n of st.npcs) { if (n.inside || n.dead || n.vigile || Math.abs(n.x - v.x) > look + 8 || Math.abs(n.y - v.y) > look + 8 || !inStrada(n.x, n.y)) continue; chk(n.x, n.y, .3); }
    for (const o of st.vehicles) { if (o === v || o.hidden || (soloGente && (o.traffic || o.guida)) || Math.abs(o.x - v.x) > look + 12 || Math.abs(o.y - v.y) > look + 12) continue; if (Math.cos(angDiff(o.ang, v.ang)) < -.3 && (o.traffic || o.guida)) { const dx = o.x - v.x, dy = o.y - v.y; if (Math.abs(-dx * fy + dy * fx) > half + .4) continue; } const KO = G.VK[o.kind] || { len: 3, wid: 1.6 }, c = Math.abs(Math.cos(angDiff(o.ang || 0, v.ang))), sn = Math.sqrt(Math.max(0, 1 - c * c)); chk(o.x, o.y, c * KO.len / 2 + sn * KO.wid / 2, sn * KO.len / 2 + c * KO.wid / 2 - .1); }
    return best;
  }
  // lo stesso, ma lungo il percorso dell'autobus (in curva e nell'inversione a U guarda dove andrà, non dritto davanti al muso):
  // gli ostacoli come capsule (un'auto in sosta lungo il cordolo è lunga e stretta), i punti del percorso a mezzo metro
  function liberoPercorso(st, v, L, s0, look, half, soloGente) {
    const K = G.VK[v.kind], ob = [], R = look + K.len, inStrada = (x, y) => tile(x, y) === T.VIA;
    if (!st.player.indoor && !(st.player.lv && st.player.lv.k === 'ug') && inStrada(st.player.x, st.player.y) && hyp(st.player.x - v.x, st.player.y - v.y) < R) ob.push([st.player.x, st.player.y, 0, 0, 0, .35]);
    for (const n of st.npcs) { if (n.inside || n.dead || n.vigile || Math.abs(n.x - v.x) > R || Math.abs(n.y - v.y) > R || !inStrada(n.x, n.y)) continue; ob.push([n.x, n.y, 0, 0, 0, .3]); }
    for (const o of st.vehicles) { if (o === v || o.hidden || (soloGente && (o.traffic || o.guida)) || Math.abs(o.x - v.x) > R + 6 || Math.abs(o.y - v.y) > R + 6) continue; const KO = G.VK[o.kind] || { len: 3, wid: 1.6 };
      if ((o.traffic || o.guida) && Math.cos(angDiff(o.ang, v.ang)) < -.3) { const fx = Math.cos(v.ang), fy = Math.sin(v.ang), dx = o.x - v.x, dy = o.y - v.y; if (Math.abs(-dx * fy + dy * fx) > half + .4) continue; }   // chi viene incontro sulla sua corsia
      ob.push([o.x, o.y, Math.cos(o.ang), Math.sin(o.ang), Math.max(0, KO.len / 2 - KO.wid / 2), KO.wid / 2]); }
    if (!ob.length) return look;
    for (let d = 0; d <= look; d += .5) { const q = lAt(L, (s0 + K.len / 2 + d) % L.L);
      for (const [x, y, ux, uy, hl, r] of ob) { const t = clamp((q.x - x) * ux + (q.y - y) * uy, -hl, hl); if (hyp(x + ux * t - q.x, y + uy * t - q.y) < half + r) return d; } }
    return look;
  }
  function muovi(st, v, x, y, ang, sp, dt) { v.vx = (x - v.x) / Math.max(dt, 1e-3); v.vy = (y - v.y) / Math.max(dt, 1e-3); if (hyp(v.vx, v.vy) > 30) { v.vx = Math.cos(ang) * sp; v.vy = Math.sin(ang) * sp; } v.x = x; v.y = y; v.ang = ang; v.speed = sp; v._spd = sp; v.w = 0; v.skid = 0; v.steer = 0;
    if (sp > 2.5 && G.runOver) { const vx = v.vx, vy = v.vy; try { G.runOver(st, v, 'traffic'); } catch (e) { } v.vx = vx; v.vy = vy; } }
  function stepBus(st, v, dt) {
    const Lb = lineaBus(), B = v.bus, L = Lb.giro, V = S(st);
    if (B.sosta > 0) {   // ferma: le porte, chi sale e chi scende
      B.sosta -= dt; const t0 = B.sosta0 - B.sosta;
      B.porte = t0 < CFG.autobus.porte ? t0 / CFG.autobus.porte : B.sosta < CFG.autobus.porte ? Math.max(0, B.sosta / CFG.autobus.porte) : 1; v.porte = B.porte;
      if (!B.fatto && t0 > CFG.autobus.porte + .5) { B.fatto = true; saliScendi(st, v, B.f); }
      v.speed = 0; v.vx = v.vy = 0; v._spd = 0; if (B.sosta <= 0) { B.sosta = 0; B.porte = 0; v.porte = 0; } return; }
    // la prossima fermata sul giro
    const fs = Lb.fermate; let nx = null, dn = 1e9; for (const f of fs) { let d = f.s - B.s; if (d < -.5) d += L.L; if (f.id === B.servita && d < 2) continue; if (d < dn) { dn = d; nx = f; } }
    const k = clamp(Math.round(B.s), 0, Lb.vcurva.length - 1), vc = Math.min(Lb.vcurva[k], Lb.vcurva[clamp(k + 6, 0, Lb.vcurva.length - 1)] + 1.5);
    // chi resta fermo più di 4 s perché un mezzo in corsa gli sbarra la strada (l'inversione a U, chi aspetta l'autobus che aspetta lui) si fa largo:
    // per 3 s guarda solo la gente e i mezzi fermi (in sosta, in doppia fila); i mezzi guidati dal computer si sfiorano senza danni (game.js)
    const forza = st.clock < (B.forza || 0), free = liberoPercorso(st, v, L, B.s, 10, 1.15, forza), vb = free < 9 ? Math.max(0, (free - 1.2) * 1.2) : 99, vs = nx ? Math.sqrt(2 * 1.1 * Math.max(0, dn)) + .3 : 99;
    const want = Math.min(CFG.autobus.vmax, vc, vb, vs), K = G.VK.autobus;
    v.speed = v.speed < want ? Math.min(want, v.speed + K.accel * dt) : Math.max(want, v.speed - 4 * dt);
    if (v.speed < .3 && free < 2) { v.stuck = (v.stuck || 0) + dt; B.blocco = (B.blocco || 0) + dt; if (v.stuck > 4) { v.stuck = 0; B.forza = st.clock + 3; if (st.clock > (v.honk || 0)) { v.honk = st.clock + 6; st.sfx.push({ k: 'honk', x: v.x, y: v.y }); } } } else { v.stuck = 0; if (v.speed > 2) B.blocco = 0; }
    if (B.blocco > 30 && free < 2 && hyp(v.x - st.player.x, v.y - st.player.y) > 4) { B.blocco = 0; B.fantasma = st.clock + 4; }   // bloccato da mezzo minuto (un mezzo in panne, una scena in mezzo alla via): passa, lento
    if (st.clock < (B.fantasma || 0)) { v.speed = Math.max(v.speed, 1.2); }
    const ds = Math.min(v.speed * dt, nx ? Math.max(0, dn) : 99); B.s += ds; if (B.s >= L.L) B.s -= L.L;
    if (nx && dn - ds < .25 && v.speed < 1.2) {   // arrivata: accosta, apre, sale e scende chi deve
      B.servita = nx.id; B.f = nx; B.fatto = false; const [a, b] = nx.capolinea ? CFG.autobus.capolinea : CFG.autobus.sosta; B.sosta = B.sosta0 = a + Math.random() * (b - a);
      V.stats.fermate[nx.id] = (V.stats.fermate[nx.id] || 0) + 1; if (nx.capolinea) V.stats.corse++; }
    const q = lAt(L, B.s), q2 = lAt(L, (B.s + 3) % L.L), ang = Math.atan2(q2.y - q.y, q2.x - q.x);
    // accosta: negli ultimi 16 m prima della fermata si sposta verso il cordolo, e dopo riprende la corsia in 12 m
    let ox = 0, oy = 0; const sm = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
    if (nx) { const k2 = sm(1 - dn / 16); ox += nx.lx * k2; oy += nx.ly * k2; }
    const fp = fs.find(f => f.id === B.servita); if (fp) { let dp = B.s - fp.s; if (dp < 0) dp += L.L; const k3 = sm(1 - dp / 12); if (fp !== nx) { ox += fp.lx * k3; oy += fp.ly * k3; } }
    muovi(st, v, q.x + ox, q.y + oy, v.ang + angDiff(ang, v.ang) * Math.min(1, dt * 6), v.speed, dt);
  }
  // alla fermata: chi aspetta sale (esce di scena: se ne va con l'autobus), qualcuno scende e va per la sua strada
  function saliScendi(st, v, f) {
    const V = S(st), PO = typeof Posti !== 'undefined' ? Posti : null, Po = typeof Popolo !== 'undefined' ? Popolo : null; if (!f) return;
    const door = { x: v.x + Math.cos(v.ang + PI / 2) * 1.8, y: v.y + Math.sin(v.ang + PI / 2) * 1.8 }, ok = G.walkM(door.x, door.y) ? door : { x: f.x, y: f.y };
    st.npcs.forEach(n => { const q = n.__posto; if (!q || !q.p || (q.p.vvf !== f.id && hyp(q.p.x - f.x, q.p.y - f.y) > 3) || !q.arrived) return;
      try { if (Po && Po.endPosto) Po.endPosto(st, n); } catch (e) { }
      n.x = ok.x; n.y = ok.y; n.inside = true; n.path = []; if (n.pop) { n.pop.goalSet = false; n.pop.near = false; if (n.pop.homeT) { n.x = n.pop.homeT.x; n.y = n.pop.homeT.y; } }
      V.stats.saliti++; });
    // scende qualcuno (di giorno): un abitante che era «lontano» arriva in città con l'autobus
    const hr = hourOf(st); if (hr < 6.5 || hr > 21.5 || hyp(v.x - st.player.x, v.y - st.player.y) > 70) return;
    const n0 = Math.floor(Math.random() * (f.capolinea ? 4 : 2.6)); let done = 0;
    for (const n of st.npcs) { if (done >= n0) break; const P = n.pop; if (!P || n.dead || n.cop || n.faction || n.__ev || n.__posto || P.emer || n.inVeh || n.room || (P.age || 30) < 12 || n.jailedUntil > st.t || (P.near && !n.inside) || Math.random() < .5) continue;
      n.x = ok.x + (Math.random() - .5) * .8; n.y = ok.y + (Math.random() - .5) * .8; n.inside = false; P.near = true; P.lod = 'vicino'; n.path = []; P.goalSet = false; n.action = { name: 'routine', scores: [], why: 'Scende dall\'autobus.', since: st.clock }; done++; V.stats.scesi++; }
  }
  function stepMinore(st, v, dt) {
    const M = minori()[v.vvm.m]; if (!M) return; const m = v.vvm, K = G.VK[v.kind];
    const free = liberoDavanti(st, v, 7, .7, st.clock < (m.forza || 0)), ped = free < 6, want = Math.min(ped ? Math.max(0, (free - .8) * 1.1) : 99, v.kind === 'ape' ? 4.2 : 5.2);   // a passo d'uomo dove c'è gente
    v.speed = v.speed < want ? Math.min(want, v.speed + K.accel * .5 * dt) : Math.max(want, v.speed - 6 * dt);
    if (v.speed < .2 && free < 1.5) { m.wait += dt; if (m.wait > 2.5 && st.clock > (v.honk || 0)) { v.honk = st.clock + 5; st.sfx.push({ k: 'honk', x: v.x, y: v.y }); } if (m.wait > 6) { m.wait = 0; m.forza = st.clock + 2.5; } } else m.wait = 0;
    m.s += v.speed * dt * m.verso; if (m.s > M.L.L - 2 || m.s < 2) { m.verso *= -1; m.s = clamp(m.s, 2, M.L.L - 2); }   // in fondo alla via si gira
    const q = posMinore(M, m.s, m.verso, v.kind); muovi(st, v, v.x + (q.x - v.x) * Math.min(1, dt * 5), v.y + (q.y - v.y) * Math.min(1, dt * 5), v.ang + angDiff(q.ang, v.ang) * Math.min(1, dt * 5), v.speed, dt);
  }

  // ---------------- il passo ----------------
  function step(st, dt) {
    if (!ATTIVO || !st.vv) return; const V = st.vv;
    if (Math.floor(hourOf(st)) !== V.hr || (V.oraT = (V.oraT || 0) + dt) > 4) { V.oraT = 0; ora(st, false); }
    // il mezzo in panne (urtato, girato di traverso: game.js lo ferma e il guidatore scende) dopo mezzo minuto lo portano via, se il giocatore non è lì
    if ((V.panT = (V.panT || 0) + dt) > 2) { V.panT = 0; for (const v of st.vehicles) { if (!v.vvTr || !v.stalled || v.rider || v.wreck || !v.lane) continue; v.vvPanne = (v.vvPanne || 0) + 2;
      if (v.vvPanne > 30 && hyp(v.x - st.player.x, v.y - st.player.y) > 30) { const L = G.LANES[v.lane.i]; if (!L) continue; const q = G.lanePos(L, v.lane.s, v.lane.dir); Object.assign(v, { stalled: false, traffic: true, hidden: true, speed: 0, _spd: 0, vx: 0, vy: 0, w: 0, x: q.x, y: q.y, ang: q.ang, vvPanne: 0, looseUntil: 0 }); } } }
    // vicino al giocatore un'auto entra o esce dal conto dell'ora solo in fondo alla via (svolta e sparisce dietro l'angolo, o ne arriva una)
    for (const v of st.vehicles) { if (!v.vvCambia || !v.traffic || !v.lane) continue; const L = G.LANES[v.lane.i]; if (!L) continue; if (v.lane.s < 5 || v.lane.s > L.L - 5) { v.hidden = v.vvCambia === 'spegni'; v.vvCambia = null; } }
    for (const v of st.vehicles) { if (!v.guida) continue;
      if (v.rider !== 'npc' || v.wreck || v.burning > 0) { v.guida = null; v.porte = 0; continue; }   // rubato, distrutto: non è più della linea
      if (v.hidden) continue;
      if (v.guida === 'linea') stepBus(st, v, dt); else if (v.guida === 'minore') stepMinore(st, v, dt); }
    // il vigile: in servizio alle ore di punta, all'incrocio
    const vg = V.vigile && G.byId(st, V.vigile); if (vg && !vg.dead) { const hr = hourOf(st), on = (hr >= 7.5 && hr < 9.5) || (hr >= 17.5 && hr < 19.5); if (on && vg.inside) { vg.inside = false; vg.x = vg.vigile.x; vg.y = vg.vigile.y; } else if (!on && !vg.inside && hyp(vg.x - st.player.x, vg.y - st.player.y) > 40) vg.inside = true; }
    // chi aspetta l'autobus aspetta finché non arriva (al massimo due ore e mezza di gioco): il riempimento di popolo.js lo lascerebbe andare prima
    if ((V.attT = (V.attT || 0) + dt) > 1) { V.attT = 0; for (const n of st.npcs) { const q = n.__posto; if (!q || !q.p || !q.p.vvf) continue; q.t00 = q.t00 || st.t; if (st.t > q.until - 6 && st.t - q.t00 < 150) q.until = st.t + 12; } }
    // gli affissi raschiati spariscono, le palle finite si tolgono
    V.affissi = V.affissi.filter(a => st.t - (a.raschiato || st.t) < 180); V.palle = V.palle.filter(b => st.clock < b.until);
    if (V.carretto && st.clock > V.carretto.until) V.carretto = null;
  }
  // per le foto (strumenti/galleria.js): la vita dell'ora subito al suo posto, un autobus alla fermata più vicina alla camera
  function rianima(st) {
    if (!ATTIVO) return; if (!st.vv) crea(st); ora(st, true); const V = st.vv, Lb = lineaBus(), p = st.player;
    if (Lb.ok) { const f = Lb.fermate.slice().sort((a, b) => hyp(a.x - p.x, a.y - p.y) - hyp(b.x - p.x, b.y - p.y))[0], v = st.vehicles.find(z => z.id === V.bus[0]);
      if (f && v && hyp(f.x - p.x, f.y - p.y) < 45 && !v.hidden) { v.bus.s = (f.s - 14 + Lb.giro.L) % Lb.giro.L; v.bus.sosta = 0; v.bus.servita = -1; const q = lAt(Lb.giro, v.bus.s); v.x = q.x; v.y = q.y; v.ang = q.ang; } }
  }

  // ================= LE SCENE (eventi.js) =================
  const SAY = (r, ...l) => ({ say: r, l });
  const vicinoAsse = (x, y, pad) => { const a = ROADS().find(rd => rango(rd) === 'asse'); return !!a && lNear(rdLinea(a), x, y).d < a.w / 2 + (pad || 8); };
  // il muro più vicino al posto (per l'affisso): dal punto si cammina nelle quattro direzioni fino al primo muro
  function muroVicino(x, y) { let best = null; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([ox, oy]) => { for (let d = .5; d < 5; d += .25) if (tile(x + ox * d, y + oy * d) === T.BLD) { if (!best || d < best.d) best = { d, x: x + ox * (d - .06), y: y + oy * (d - .06), nx: -ox, ny: -oy }; break; } }); return best; }
  const SCENE = [
    // la fila all'edicola la mattina: il giornale del regime, la schedina, le figurine
    { id: 'vv_fila_edicola', w: 3, posto: 'edicola', ora: [6.5, 11], roles: [{ id: 'a', f: 'adult|any' }, { id: 'b', near: 'a', r: 22 }, { id: 'c', near: 'a', r: 22, f: 'old|any' }], beats: [
      { all: [{ slot: 'a', i: 0, n: 3, sp: 1.3 }, { slot: 'b', i: 1, n: 3, sp: 1.3 }, { slot: 'c', i: 2, n: 3, sp: 1.2 }] }, { pose: 'b', p: 'orologio_su' }, { pose: 'c', p: 'aspetta' },
      SAY('a', 'Il Corriere del Gelo, grazie.', 'Il Corriere e le sigarette, le solite.', 'C\'è già lo sport?'), { wait: 2 }, { hand: 'a', id: 'giornale' }, { pose: 'a', p: 'legge_su' },
      SAY('b', 'Ancora le rate... ogni giorno le rate.', 'Che dice il Garante oggi?', 'Una schedina, per favore.'), { wait: 2.5 }, { pose: 'b' }, { hand: 'b', id: 'giornale' },
      SAY('c', 'E le figurine per il nipote, quelle dei calciatori.', 'Il settimanale, quello con la Carrà.', 'Ieri non è arrivato, il mio.'), { wait: 3 },
      { all: [{ go: 'a', to: 'away', sp: 1.4, d: 2, t: 10, soft: true }, { go: 'b', to: 'away', sp: 1.5, d: 2, t: 10, soft: true }] }, { wait: 2 }] },
    // il carretto del venditore: si ferma dove c'è gente, chiama, vende
    { id: 'vv_carretto', w: 2, posto: ['mercato', 'pensilina', 'angolo'], soft: true, ora: [7.5, 13], roles: [{ id: 'a', f: 'm|any' }, { id: 'b', near: 'a', r: 20 }], beats: [
      { fn: (st, sc) => { const a = sc.roles.a; S(st).carretto = { npc: a.id, x: a.x, y: a.y, until: st.clock + 95, merce: Math.random() < .5 ? 'frutta' : 'lupini' }; } },
      SAY('a', 'Pomodori! Pomodori di Sant\'Antioco!', 'Lupini e noccioline! Calde, calde!', 'Patate, cipolle, a mille lire il chilo!'), { pose: 'a', p: 'merce' }, { wait: 3 },
      { go: 'b', to: 'a', sp: 1.4, d: 1.3, t: 16 }, { look: 'a', at: 'b' }, SAY('b', 'Mi dia un chilo di quelle, belle mature.', 'Un cartoccio, per i ragazzi.', 'Quanto vengono oggi?'),
      { pose: 'a', p: 'porge', w: 1.6 }, { hand: 'b', id: 'verdura' }, { pay: ['b', 'a', 1] }, SAY('a', 'Grazie, signora, a domani!', 'Ecco, e una in più per il bambino.'), { pose: 'a', p: 'merce' }, { wait: 6 },
      SAY('a', 'Pomodori! Chi vuole pomodori!', 'Lupini! Lupini!'), { wait: 5 }] },
    // i ragazzini col pallone, sulla piazzetta, all'angolo, sul sagrato: due passaggi e la palla che scappa
    { id: 'vv_pallone', w: 2, posto: ['angolo', 'sagrato', 'panchina'], soft: true, ora: [[14.5, 19.5]], roles: [{ id: 'a', f: 'young' }, { id: 'b', near: 'a', f: 'young', r: 18 }], beats: [
      { all: [{ slot: 'a', i: 0, n: 2, sp: 1.6 }, { slot: 'b', i: 1, n: 2, sp: 1.6 }] }, { fn: (st, sc) => { S(st).palle.push({ a: sc.roles.a.id, b: sc.roles.b.id, t0: st.clock, until: st.clock + 40 }); } },
      SAY('a', 'Passala! Passala!', 'A me, a me!', 'Tiro alla Platini!'), { wander: 'a', r: 2.5, sp: 1.4 }, { wait: 6 }, SAY('b', 'Gooool!', 'Parata! Come Zoff!', 'Era fuori, era fuori!'), { wait: 6 },
      { p: .35, then: [SAY('folla', 'Ragazzi! Le finestre!', 'Andate a giocare al campetto!'), { flee: 'a', from: 'b', sp: 2.6 }, { flee: 'b', from: 'a', sp: 2.6 }], else: [{ wander: 'b', r: 2.5, sp: 1.4 }, { wait: 8 }] }] },
    // l'attacchino del Disgelo sulla Vittoria, e poi chi raschia via il foglio (l'asse è pulito per ordine)
    { id: 'vv_attacchino', w: 2, posto: ['angolo', 'vetrina', 'fermata'], postoF: q => vicinoAsse(q.x, q.y, 10), ora: [[6, 9], [19, 23]], roles: [{ id: 'a', f: 'young' }], beats: [
      { look: 'a', at: 'around' }, { pose: 'a', p: 'lavora', w: 3.2 }, { fn: (st, sc) => { const a = sc.roles.a, m = muroVicino(a.x, a.y); if (m) S(st).affissi.push({ x: m.x, y: m.y, nx: m.nx, ny: m.ny, t: st.t, titolo: titolo(st.t, 'disgelo') }); } },
      { pose: 'a' }, SAY('a', 'Leggete il Disgelo!', 'Il ghiaccio si rompe.', '...'), { flee: 'a', from: 'spot', sp: 2.6 }, { wait: 3 }] },
    { id: 'vv_raschia', w: 3, posto: ['angolo', 'vetrina', 'fermata'], postoF: q => vicinoAsse(q.x, q.y, 10), roles: [{ id: 'a', f: 'cop|old' }], beats: [
      { fn: (st, sc) => { const A = S(st).affissi.filter(a => !a.raschiato), a = sc.roles.a; let best = null, bd = 60; A.forEach(z => { const d = hyp(z.x - a.x, z.y - a.y); if (d < bd) { bd = d; best = z; } }); sc.vvAff = best; if (!best) sc.over = true; } },
      { fn: (st, sc) => { if (sc.vvAff) { sc.vvTo = { x: sc.vvAff.x + sc.vvAff.nx * .7, y: sc.vvAff.y + sc.vvAff.ny * .7 }; sc.spot = sc.vvTo; } } }, { go: 'a', to: 'spot', sp: 1.6, d: .6, t: 18 },
      SAY('a', 'Ancora questa porcheria.', 'Via, via. Ordine del Comune.', 'Sempre di notte, questi.'), { pose: 'a', p: 'raccoglie', w: 3 }, { fn: (st, sc) => { if (sc.vvAff) sc.vvAff.raschiato = st.t; } }, { pose: 'a' }, { wait: 2 }] },
  ];
  function registraScene() { if (typeof Eventi === 'undefined' || !Eventi.SCENE || Eventi.SCENE.__vv) return; Eventi.SCENE.__vv = true; SCENE.forEach(s => { if (!Eventi.SCENE.some(o => o.id === s.id)) Eventi.SCENE.push(s); }); }

  // ================= L'AGGANCIO =================
  function installa() {
    if (!ATTIVO || !G.HOOKS || G.HOOKS.__vievive) return; const H = G.HOOKS; H.__vievive = true;
    const c0 = H.create, s0 = H.step, t0 = H.think, m0 = H.move;
    H.create = st => { if (c0) c0(st); try { crea(st); } catch (e) { if (typeof console !== 'undefined') console.error('[vievive] crea', e); } };
    H.step = (st, dt) => { if (s0) s0(st, dt); try { step(st, dt); } catch (e) { if (!step.err) { step.err = 1; if (typeof console !== 'undefined') console.error('[vievive] step', e); } } };
    // il vigile fa solo il vigile: fermo all'incrocio, si gira verso le auto, il braccio teso
    H.think = (st, n) => n.vigile ? true : (t0 ? t0(st, n) : false);
    H.move = (st, n, dt, a) => { if (!n.vigile) return m0 ? m0(st, n, dt, a) : false; n.speedNow = 0; n.path = []; if (!n.inside) { const A = n.vigile.angs, ph = Math.floor(st.clock / 9) % (A.length * 2); n.face += angDiff(A[ph % A.length] + (ph >= A.length ? PI : 0), n.face) * Math.min(1, dt * 3); n.action = { name: 'routine', scores: [], why: 'Dirige il traffico all\'incrocio.', since: n.action ? n.action.since : st.clock }; } return true; };
    // la velocità delle auto per rango (game.js updateTraffic): l'asse largo un po' più svelto, le vie a 25 all'ora
    const k0 = H.corsa; H.corsa = (st, v, want) => { let w = k0 ? k0(st, v, want) : want; if (v.vvTr && w <= 10) w = Math.min(w, v.rango === 'asse' ? 8.5 : v.fam === 'ape' ? 5.5 : 7); return w; };
    // a fine via chi gira in città sceglie dove svoltare: resta in città (l'isola ha il suo traffico), sull'asse chi ci passa ci torna volentieri
    // L'asse è una via a fondo cieco (in fondo c'è il posto di blocco): chi ci gira fa su e giù, gira in fondo e torna; le corsie si toccano
    // solo in testa, e chi ne esce non ci rientrerebbe più. Chi la svolta la porterebbe fuori città fa inversione.
    const sv0 = H.svolta; H.svolta = (st, v, opts) => { if (!v.vvTr) return sv0 ? sv0(st, v, opts) : null;
      const Lr = v.lane, inv = { j: Lr.i, s: Lr.s, dir: -Lr.dir }, qui = RDID(G.LANES[Lr.i] && G.LANES[Lr.i].id);
      if (v.rango === 'asse' && qui && profilo(qui).rango === 'asse' && st.rng() < .85) return inv;
      const w = opts.map(o => { const rd = RDID(G.LANES[o.j] && G.LANES[o.j].id), r = rd ? profilo(rd).rango : 'extra'; return r === 'asse' ? (v.rango === 'asse' ? 5 : 1.2) : r === 'via' ? 2 : 0; });
      let tot = w.reduce((a, b) => a + b, 0); if (tot <= 0) return inv; let x = st.rng() * tot; for (let i = 0; i < opts.length; i++) { x -= w[i]; if (x <= 0 && w[i] > 0) return opts[i]; } return inv; };
    if (typeof Anim !== 'undefined' && Anim.npcMap) Anim.npcMap((st, n, s) => { if (n.vigile && !n.inside) { s.upper = 'indica'; } });
    registraScene();
  }
  // per le prove: mezzi e persone ogni 100 m di una strada (entro mezza larghezza + 4 m dal suo asse)
  function conta(st, rd) {
    const Ln = rdLinea(rd), pad = rd.w / 2 + 4, nearL = (x, y) => lNear(Ln, x, y).d < pad;
    const M = st.vehicles.filter(v => !v.hidden && !v.wreck && !(G.VK[v.kind] && G.VK[v.kind].boat) && nearL(v.x, v.y)), gente = st.npcs.filter(n => !n.inside && !n.dead && nearL(n.x, n.y)).length;
    const giro = M.filter(v => v.traffic || v.guida).length, pat = M.filter(v => (v.traffic || v.guida || v.rider === 'npc') && (v.police || v.livrea || v.ronda || v.military)).length;
    return { mezzi: M.length / Ln.L * 100, giro: giro / Ln.L * 100, pattuglie: pat / Ln.L * 100, sosta: (M.length - giro) / Ln.L * 100, gente: gente / Ln.L * 100, L: Ln.L };
  }

  if (ATTIVO) { adattaCorsie(); installa(); if (typeof Posti !== 'undefined' && Posti.reset) Posti.reset(); }
  return { ATTIVO, attivo: ATTIVO, CFG, FASCE, quota, FASCIA, rango, profilo, segnaletica, latoLontano, incroci, incrocioGrande, ancore, linea: lineaBus, fermate, stalli, edicole, plance, suolo, titolo, TITOLI, crea, ora, step, rianima, conta, SCENE, registraScene, davanti, rdLinea, lAt, lNear, S, minori, soglia, _: { liberoDavanti, liberoPercorso } };
})();
if (typeof module !== 'undefined') module.exports = Vievive;
