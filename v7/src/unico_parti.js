/* [unico] unico_parti.js: COSTRUIRE CON LE PARTI ELEMENTARI (progetto: commedia/MONDO_PIENO.md §8 e appendice T.8).
   Dietro ?commedia. Spento il flag: UnicoParti = { ON: false } e nient'altro.

   Solo logica (gira anche in Node, per le prove): le PARTI, le REGOLE DI MONTAGGIO, le MISURE e le RICETTE che generano.
   - LE PARTI (13 + lo striscione): asse, bancale, lamiera, trave, tubo, ruota, corda, molla, cassa, pneumatico, porta, telo, fusto. Ognuna
     ha misure vere [L, D, H] (L lungo l'asse x della parte, D di traverso, H in alto), peso, materiale da raccattare (la roba del catalogo),
     portata, volume (galleggia se il volume pesa più della parte), e le proprietà che le misure leggono (piano, impermeabile, elastico...).
   - UNA STRUTTURA è un elenco di parti posate: [k, cx, cy, cz, yaw, pitch, roll, exL, exD] nel sistema della struttura (x l'asse della
     struttura, y di traverso, z in alto; cx, cy, cz il CENTRO della parte), girate con R = Rz(yaw)·Ry(-pitch)·Rx(roll): il pitch alza la
     punta +x, il roll alza il fianco +y. exL/exD: la parte tagliata a misura (le assi, le travi, i tubi, il telo, lo striscione, la molla).
   - LE REGOLE (UP.valida): nessuna compenetrazione fra due parti (scatole orientate, SAT a 15 assi, tolleranza 12 mm; i soli giunti
     ammessi sono il mozzo della ruota sull'asse e la molla che tira la leva, e la corda che lega); ogni parte poggia a terra o su
     un'altra (il grafo dei contatti fino a terra, mai appesa a una più alta, tranne lo striscione legato); niente sottoterra; il
     baricentro dentro la base (il margine).
   - LE MISURE (UP.misura): la funzione non è un modello, è una misura della forma: altezza, piano più alto, rampa (pendenza, lunghezza,
     larghezza, quota del bordo, continuità, portata con gli appoggi), copertura (l'area impermeabile sopra 1,8 m), luce (il tratto di
     piano senza niente sotto: il ponte), galleggiamento (volume × 1000 − peso), rotolamento (ruote su un asse sotto un piano), lancio
     (una leva su un fulcro, i bracci, l'energia delle molle: la gittata, o «tira all'indietro» con la leva corta), chiusura (quanto
     della via chiude), stabilità. UP.soddisfa(effetto, misure, o) dice se la forma fa quello che si voleva, e perché no.
   - LE RICETTE (UP.GEN): piccoli generatori che montano le parti per arrivare alle misure chieste, con variazione (un seme), non
     modelli fissi: rampa, catapulta, carretto, torre (e palco), riparo (la baracca), ponte, sbarramento (la barricata), zattera.
   - IL POSTO (UP.sito): cerca un posto libero e abbastanza piano attorno al punto chiesto: fuori dalle case (Ingombri, con aria), sopra
     il suolo giusto, lontano dai mezzi, dalle barche, dagli altri cantieri, dalle porte, dalla roba di strada che il disegno conosce
     (UP.ostacoli, messo da unico_parti_vivo.js), lasciando il passaggio sulla via (3 m, o il varco della barricata); se non va sposta,
     gira, prova un'altra via; se niente va, null (e chi chiedeva rinuncia). La barricata e il presidio stanno di traverso su un tratto
     dritto della via, a UP.CFG_INCROCIO m (8) almeno da ogni incrocio e zebra (UP.incroci: dai dati delle vie), capi compresi; dalla bocca di un vicolo 1,5 m.
   Il disegno, i corpi (le collisioni), la rampa che fa saltare, la catapulta che tira, il carretto che si spinge, la zattera che galleggia
   e i crolli stanno in unico_parti_vivo.js. Il gruppo, la mente, i verbi e i fatti stanno in unico_costruire.js. */
var UnicoParti = (function () {
  'use strict';
  const Q = typeof location !== 'undefined' ? location.search || '' : '';
  const ON = /[?&]commedia\b/.test(Q);
  const UP = { ON };
  if (typeof module !== 'undefined' && module.exports) module.exports = UP;
  if (!ON) return UP;
  const G = typeof Game !== 'undefined' ? Game : null;
  const IG = () => (typeof Ingombri !== 'undefined' && Ingombri ? Ingombri : null);
  const hyp = Math.hypot, PI = Math.PI, D2R = PI / 180, cl = (x, a, b) => Math.max(a, Math.min(b, x));
  const r3 = x => Math.round(x * 1000) / 1000, r2 = x => Math.round(x * 100) / 100;
  const hashS = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0) / 4294967296; };
  // un generatore deterministico da una stringa (mulberry32)
  function rngDi(s) { let a = Math.floor(hashS(String(s)) * 4294967296) >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  UP.rngDi = rngDi; UP.hashS = hashS;

  // ======================= LE PARTI =======================
  // d: [L, D, H] in metri; kg; rob: la roba del catalogo che serve (si raccatta); portata (kg che regge in mezzo, appoggiata ai capi);
  // vol: m³ che sposta in acqua (galleggia se vol·1000 > kg); cut: quale misura si taglia (0 = L, 2 = H)
  const P = (n, d, kg, rob, o) => Object.assign({ n, d, kg, rob, portata: 0, vol: 0 }, o);
  const PARTI = UP.PARTI = {
    asse: P('asse', [2, .2, .03], 4, 'assi', { mat: 'legno', piano: 1, lungo: 1, portata: 90, vol: .012, cut: 0 }),
    bancale: P('bancale', [1.2, .8, .144], 20, 'assi', { mat: 'legno', piano: 1, portata: 450, vol: .04 }),
    lamiera: P('lamiera', [2, 1, .04], 12, 'lamiera', { mat: 'zinco', piano: 1, imp: 1, portata: 60, vol: .0015, rumore: 1 }),
    trave: P('trave', [2.4, .12, .12], 10, 'travi', { mat: 'legno', lungo: 1, portata: 350, vol: .035, cut: 0 }),
    tubo: P('tubo', [3, .06, .06], 6, 'tubi', { mat: 'zinco', lungo: 1, portata: 220, vol: .008, cut: 0 }),
    ruota: P('ruota', [.6, .12, .6], 8, 'pneumatico', { mat: 'gomma', rotola: 1, vol: .03 }),
    corda: P('corda', [.36, .36, .1], 1, 'corda', { mat: 'tela', giunto: 1 }),
    molla: P('molla', [.3, .3, .5], 1, 'ricambi', { mat: 'zinco', elastico: 1, E: 900, cut: 2 }),
    cassa: P('cassa', [.6, .6, .6], 5, 'casse', { mat: 'legno', piano: 1, portata: 180, vol: .12 }),
    pneumatico: P('pneumatico', [.64, .64, .2], 8, 'pneumatico', { mat: 'gomma', vol: .05 }),
    porta: P('porta', [2, .9, .045], 15, 'mobile_rotto', { mat: 'vernice', piano: 1, portata: 600, vol: .081 }),
    telo: P('telo', [3, 3, .01], 2, 'telo', { mat: 'tela', imp: 1, molle: 1, vol: .002, cut: 0 }),
    fusto: P('fusto', [.6, .6, .9], 15, 'tanica_vuota', { mat: 'vernice', portata: 400, vol: .25, rumore: 1 }),
    striscione: P('striscione', [2.4, .02, .32], 1, 'telo', { mat: 'tela', decoro: 1, cut: 0 }),
    // [presidio] lo striscione lungo fra due pali (la scritta alta sopra la via) e la roba di casa che la gente porta in strada
    scritta: P('scritta', [5, .02, .7], 2, 'telo', { mat: 'tela', decoro: 1, cut: 0 }),
    sedia: P('sedia', [.45, .45, .86], 4, 'sedia', { mat: 'legno', siede: 1 }),
    tavolo: P('tavolo', [.8, .8, .75], 10, 'tavolo', { mat: 'legno', piano: 1, portata: 60 }),
    vaso: P('vaso', [.42, .42, .7], 12, 'tanica_vuota', { mat: 'vernice' }),
  };
  UP.ARREDI = ['sedia', 'tavolo', 'vaso'];
  UP.ELEMENTARI = Object.keys(PARTI).filter(k => k !== 'striscione' && k !== 'scritta' && !UP.ARREDI.includes(k));
  UP.GIUNTI = { chiodo: { forza: 1 }, corda: { forza: .45 }, filo: { forza: .7 } };
  const dimDi = p => { const D = PARTI[p[0]].d, c = PARTI[p[0]].cut; const d = D.slice(); if (p[7]) d[c === 2 ? 2 : 0] = p[7]; if (p[8]) d[1] = p[8]; return d; };
  UP.dimDi = dimDi;

  // ======================= LA GEOMETRIA: rotazioni, scatole orientate, SAT =======================
  // R = Rz(yaw)·Ry(-pitch)·Rx(roll): le colonne sono le immagini degli assi X (L), Y (D), Z (H) della parte
  function rotM(yaw, pitch, roll) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll);
    const rz = v => [cy * v[0] - sy * v[1], sy * v[0] + cy * v[1], v[2]];
    const ry = v => [cp * v[0] - sp * v[2], v[1], sp * v[0] + cp * v[2]];   // Ry(-pitch): X → (cp, 0, sp)
    const rx = v => [v[0], cr * v[1] - sr * v[2], sr * v[1] + cr * v[2]];
    return [rz(ry(rx([1, 0, 0]))), rz(ry(rx([0, 1, 0]))), rz(ry(rx([0, 0, 1])))];
  }
  UP.rotM = rotM;
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  function obb(p) { const d = dimDi(p), A = rotM(p[4] || 0, p[5] || 0, p[6] || 0); return { c: [p[1], p[2], p[3]], A, h: [d[0] / 2, d[1] / 2, d[2] / 2], k: p[0] }; }
  UP.obb = obb;
  const est = (o, u) => Math.abs(dot(o.A[0], u)) * o.h[0] + Math.abs(dot(o.A[1], u)) * o.h[1] + Math.abs(dot(o.A[2], u)) * o.h[2];   // mezza estensione lungo u
  const zMin = o => o.c[2] - est(o, [0, 0, 1]), zMax = o => o.c[2] + est(o, [0, 0, 1]);
  UP.zMin = zMin; UP.zMax = zMax;
  function angoli(o) { const P8 = []; for (const a of [-1, 1]) for (const b of [-1, 1]) for (const c of [-1, 1]) P8.push([0, 1, 2].map(i => o.c[i] + a * o.h[0] * o.A[0][i] + b * o.h[1] * o.A[1][i] + c * o.h[2] * o.A[2][i])); return P8; }
  UP.angoli = angoli;
  // quanto si compenetrano due scatole orientate (0 se separate): il minimo delle sovrapposizioni sui 15 assi
  function pen3(X, Y, m) {
    m = m || 0; const ax = [X.A[0], X.A[1], X.A[2], Y.A[0], Y.A[1], Y.A[2]];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { const c = cross(X.A[i], Y.A[j]), L = Math.hypot(c[0], c[1], c[2]); if (L > 1e-6) ax.push([c[0] / L, c[1] / L, c[2] / L]); }
    const d = [Y.c[0] - X.c[0], Y.c[1] - X.c[1], Y.c[2] - X.c[2]]; let best = Infinity;
    for (const u of ax) { const o = est(X, u) + est(Y, u) + 2 * m - Math.abs(dot(d, u)); if (o <= 0) return 0; if (o < best) best = o; }
    return best;
  }
  UP.pen3 = pen3;
  // l'impronta in pianta (nel sistema della struttura): [x0, y0, x1, y1]
  function impronta(parti, solo) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    parti.forEach((p, i) => { if (solo && !solo(p, i)) return; for (const q of angoli(obb(p))) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); } });
    return [x0, y0, x1, y1];
  }
  UP.impronta = impronta;
  // il rettangolo in pianta di una parte (asse u, mezze misure) nel sistema della struttura: per i corpi
  function pianta(p) { const o = obb(p), u = [o.A[0][0], o.A[0][1]], Lu = Math.hypot(u[0], u[1]); let ax = Lu > .2 ? [u[0] / Lu, u[1] / Lu] : [o.A[1][0], o.A[1][1]]; const La = Math.hypot(ax[0], ax[1]) || 1; ax = [ax[0] / La, ax[1] / La];
    const e = v => est(o, [v[0], v[1], 0]); return { cx: o.c[0], cy: o.c[1], ux: ax[0], uy: ax[1], hu: e(ax), hv: e([-ax[1], ax[0]]), z0: zMin(o), z1: zMax(o) }; }
  UP.pianta = pianta;

  // ======================= LE REGOLE DI MONTAGGIO =======================
  const TOLL = .012, CONTATTO = .025;
  // le coppie che possono toccarsi dentro (i giunti): il mozzo della ruota sull'asse; la molla che tira la leva; la corda
  function giunto(a, b) {
    const ka = a.k, kb = b.k;
    if (ka === 'corda' || kb === 'corda') return 1;
    if ((ka === 'ruota' && (kb === 'tubo' || kb === 'trave')) || (kb === 'ruota' && (ka === 'tubo' || ka === 'trave'))) { const w = ka === 'ruota' ? a : b, x = ka === 'ruota' ? b : a; const d = [w.c[0] - x.c[0], w.c[1] - x.c[1], w.c[2] - x.c[2]], t = dot(d, x.A[0]), off = Math.hypot(d[0] - t * x.A[0][0], d[1] - t * x.A[0][1], d[2] - t * x.A[0][2]); return off < .06 && Math.abs(dot(w.A[1], x.A[0])) > .95 ? 1 : 0; }
    if ((ka === 'pneumatico' && (kb === 'trave' || kb === 'tubo')) || (kb === 'pneumatico' && (ka === 'trave' || ka === 'tubo'))) { const g = ka === 'pneumatico' ? a : b, x = ka === 'pneumatico' ? b : a; return Math.abs(x.A[0][2]) > .98 && Math.hypot(g.c[0] - x.c[0], g.c[1] - x.c[1]) < .05 ? 1 : 0; }   // il palo infilato nei copertoni
    if (ka === 'molla' || kb === 'molla') return .07;
    return 0;
  }
  function valida(parti) {
    const O = parti.map(obb), n = O.length, err = [], sovr = [], cont = O.map(() => []);
    O.forEach((o, i) => { if (zMin(o) < -.006) err.push('sottoterra:' + i); });
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const a = O[i], b = O[j]; if (Math.abs(a.c[0] - b.c[0]) > 4.5 || Math.abs(a.c[1] - b.c[1]) > 4.5 || Math.abs(a.c[2] - b.c[2]) > 4.5) continue;
      const g = giunto(a, b), p = pen3(a, b);
      if (p > TOLL && !(g === 1 || (g && p <= g))) sovr.push([i, j, r3(p)]);
      if (p > 0 || pen3(a, b, CONTATTO / 2) > 0) { cont[i].push(j); cont[j].push(i); }
    }
    // sostenute: dal suolo per il grafo dei contatti, mai da una parte che parte più in alto (tranne lo striscione, legato)
    const zm = O.map(zMin), su = O.map((o, i) => zm[i] <= .015), coda = []; su.forEach((s, i) => { if (s) coda.push(i); });
    while (coda.length) { const i = coda.shift(); for (const j of cont[i]) if (!su[j] && (zm[i] <= zm[j] + .05 || PARTI[O[j].k].decoro)) { su[j] = true; coda.push(j); } }
    const appese = []; su.forEach((s, i) => { if (!s) appese.push(i); });
    // le parti inclinate (o in piedi) stanno su con due appoggi: il suolo, una parte sotto (o accanto, inchiodata di testa), una faccia
    // intera su una parte inclinata come lei (il copertone sulla leva); quelle dritte in piedi anche se qualcosa le carica da sopra.
    // Le assi affiancate non si reggono fra loro: una rampa senza pile cade
    // i pannelli: le parti inclinate uguali, complanari e a contatto (affiancate o di testa) sono un pezzo solo, inchiodato
    const T = O.map(tiltN), cop = (i, j) => { const o = O[i], q = O[j]; if (o.k !== q.k || T[i] < 5 * D2R || T[j] < 5 * D2R || Math.abs(dot(o.A[2], q.A[2])) < .998) return false; const d = [q.c[0] - o.c[0], q.c[1] - o.c[1], q.c[2] - o.c[2]]; return Math.abs(dot(d, o.A[2])) < .02; };
    const pad = O.map((o, i) => i), radice = i => { while (pad[i] !== i) i = pad[i] = pad[pad[i]]; return i; };
    for (let i = 0; i < n; i++) for (const j of cont[i]) if (j > i && cop(i, j)) pad[radice(i)] = radice(j);
    const gruppi = {}; O.forEach((o, i) => { if (T[i] >= 5 * D2R && !PARTI[o.k].decoro && !PARTI[o.k].giunto && !PARTI[o.k].elastico && !appese.includes(i)) (gruppi[radice(i)] = gruppi[radice(i)] || []).push(i); });
    const instabili = [];
    for (const r in gruppi) {
      const M = gruppi[r], dentro = new Set(M), reg = new Set(); let terra = 0, piatto = 0;
      for (const i of M) {
        const o = O[i]; if (zm[i] <= .015) terra = 1;
        for (const j of cont[i]) {
          if (dentro.has(j)) continue; const q = O[j], Pq = PARTI[q.k]; if (Pq.decoro || Pq.giunto) continue;
          const d = [q.c[0] - o.c[0], q.c[1] - o.c[1], q.c[2] - o.c[2]];
          if (Math.abs(dot(o.A[2], q.A[2])) > .998 && dot(d, o.A[2]) < -(o.h[2] + q.h[2]) * .5) { piatto = 1; continue; }   // di piatto su una parte inclinata come lei
          if (zMax(q) <= zMax(o) + .05 || zm[j] < zm[i] - .05 || (T[i] > 80 * D2R && zm[i] <= .015)) reg.add(j);   // ci si appoggia (non sta sopra), o è inchiodata a chi parte più in basso (il palo); in piedi: anche chi la carica
        }
      }
      if (terra + reg.size + 2 * piatto < 2) M.forEach(i => instabili.push(i));
    }
    instabili.forEach(i => appese.push(i));
    return { ok: !err.length && !sovr.length && !appese.length, err, sovr, appese, instabili, contatti: cont };
  }
  UP.valida = valida;

  // ======================= LE MISURE (dalla forma, comunque sia fatta) =======================
  const tiltN = o => Math.acos(cl(o.A[2][2], -1, 1));   // la faccia larga (asse H) quanto è inclinata dall'orizzontale
  function misura(parti, o) {
    o = o || {};
    const O = parti.map(obb), V = o.valida || valida(parti), M = { n: parti.length, kg: 0, altezza: 0 };
    O.forEach(b => { M.kg += PARTI[b.k].kg; M.altezza = Math.max(M.altezza, zMax(b)); });
    M.kg = r2(M.kg); M.altezza = r2(M.altezza);
    // il piano più alto: la faccia di sopra di una parte piana e quasi orizzontale
    M.piano = 0; M.pianoA = 0; O.forEach(b => { if (PARTI[b.k].piano && tiltN(b) < 5 * D2R) { const z = zMax(b); if (z > M.piano + .02) { M.piano = r2(z); M.pianoA = r2(4 * b.h[0] * b.h[1]); } else if (z > M.piano - .02) M.pianoA = r2(M.pianoA + 4 * b.h[0] * b.h[1]); } });
    M.rampa = rampa(parti, O, V);
    M.copre = copertura(O);
    M.luce = luce(O);
    // galleggiamento: il volume che spinge (le parti che galleggiano) contro il peso di tutto
    let spinta = 0; O.forEach(b => { spinta += PARTI[b.k].vol * 1000; }); M.galleggia = r2(spinta - M.kg); M.spinta = r2(spinta);
    M.rotola = rotola(O, V);
    M.lancio = lancio(parti, O, V);
    M.chiude = chiude(O);
    M.passa = passa(O);
    M.stabile = stabilita(O);
    M.portata = portata(O, V, M);
    return M;
  }
  UP.misura = misura;
  // la rampa: le parti piane inclinate 5-45° con la stessa salita; la più grande delle famiglie
  function rampa(parti, O, V) {
    const fam = [];
    O.forEach((b, i) => {
      if (!PARTI[b.k].piano) return; const t = tiltN(b); if (t < 5 * D2R || t > 45 * D2R) return;
      const hx = -b.A[2][0], hy = -b.A[2][1], L = Math.hypot(hx, hy); if (L < 1e-6) return; const u = [hx / L, hy / L];
      let f = fam.find(F => Math.abs(F.t - t) < 4 * D2R && F.u[0] * u[0] + F.u[1] * u[1] > Math.cos(10 * D2R)); if (!f) fam.push(f = { t, u, ii: [], area: 0 });
      f.ii.push(i); f.area += 4 * b.h[0] * b.h[1];
    });
    if (!fam.length) return null;
    fam.sort((a, b) => b.area - a.area); const F = fam[0], u = F.u, w = [-u[1], u[0]];
    // la superficie: lungo la salita (s) e di traverso (q), con le quote di sopra
    let s0 = Infinity, s1 = -Infinity, zlo = Infinity, zhi = -Infinity; const lat = [], lon = [];
    for (const i of F.ii) { const P8 = angoli(O[i]); let a0 = Infinity, a1 = -Infinity, q0 = Infinity, q1 = -Infinity; for (const q of P8) { const s = q[0] * u[0] + q[1] * u[1], t = q[0] * w[0] + q[1] * w[1]; a0 = Math.min(a0, s); a1 = Math.max(a1, s); q0 = Math.min(q0, t); q1 = Math.max(q1, t); zhi = Math.max(zhi, q[2]); }
      // la quota di sopra al capo basso: il punto di sopra più basso
      zlo = Math.min(zlo, topBasso(O[i], u));
      s0 = Math.min(s0, a0); s1 = Math.max(s1, a1); lat.push([q0, q1]); lon.push([a0, a1, q0, q1, i]); }
    const unisci = (L, g) => { const S = L.slice().sort((a, b) => a[0] - b[0]), out = []; for (const x of S) { const l = out[out.length - 1]; if (l && x[0] <= l[1] + g) l[1] = Math.max(l[1], x[1]); else out.push([x[0], x[1]]); } return out; };
    const bande = unisci(lat, .06); let banda = bande[0]; for (const b of bande) if (b[1] - b[0] > banda[1] - banda[0]) banda = b;
    const lungo = unisci(lon.filter(x => x[3] > banda[0] + .05 && x[2] < banda[1] - .05).map(x => [x[0], x[1]]), .06);
    const cont = lungo.length === 1;
    // la portata: a ogni sezione la somma delle parti che la coprono; gli appoggi sotto (contatti con parti non della rampa) ogni quanto
    const dentro = new Set(F.ii); let minP = Infinity;
    for (let s = s0 + .1; s < s1 - .05; s += .25) { let pp = 0; for (const x of lon) if (s >= x[0] && s <= x[1]) pp += PARTI[O[x[4]].k].portata; minP = Math.min(minP, pp); }
    // gli appoggi come intervalli lungo la salita (da terra al capo basso, poi le pile che toccano il piano): la luce più lunga fra due
    const app = [[s0, s0 + .15]]; for (const i of F.ii) for (const j of V.contatti[i]) if (!dentro.has(j)) { const b = O[j], s = b.c[0] * u[0] + b.c[1] * u[1], e = est(b, [u[0], u[1], 0]); app.push([s - e, s + e]); }
    const AP = unisci(app, 0); let passo = 0; for (let k = 1; k < AP.length; k++) passo = Math.max(passo, AP[k][0] - AP[k - 1][1]); passo = Math.max(passo, 2 * (s1 - AP[AP.length - 1][1]));
    const port = isFinite(minP) ? minP * (passo > 1.3 ? 1.3 / passo : 1) : 0;
    const ang = F.t / D2R, R = { ang: r2(ang), u: [r3(u[0]), r3(u[1])], s0: r2(s0), s1: r2(s1), lun: r2((s1 - s0) / Math.cos(F.t)), corsa: r2(s1 - s0), larg: r2(banda[1] - banda[0]), q0: r2(banda[0]), q1: r2(banda[1]),
      zlo: r2(zlo), h: r2(zhi), continua: cont, passo: r2(passo), portata: Math.round(port), parti: F.ii.slice() };
    R.ok = cont && R.zlo <= .12 && ang >= 8 && ang <= 35 && R.h >= .35 && R.larg >= .7;
    return R;
  }
  function topBasso(o, u) { const P8 = angoli(o).map(q => [q[0] * u[0] + q[1] * u[1], q[2]]); P8.sort((a, b) => a[0] - b[0]); const sMin = P8[0][0]; let z = -Infinity; for (const q of P8) if (q[0] < sMin + .08) z = Math.max(z, q[1]); return z; }
  // la copertura: l'area in pianta delle parti impermeabili sopra 1,7 m (una griglia di 10 cm)
  function copertura(O) {
    const C = O.filter(b => PARTI[b.k].imp && zMin(b) >= 1.7); if (!C.length) return 0;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; C.forEach(b => angoli(b).forEach(q => { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }));
    let n = 0; for (let x = x0 + .05; x < x1; x += .1) for (let y = y0 + .05; y < y1; y += .1) if (C.some(b => dentroPianta(b, x, y))) n++;
    return r2(n * .01);
  }
  function dentroPianta(b, x, y) {   // il punto (x, y) cade nella proiezione in pianta della scatola (approssimata col rettangolo dei due assi più orizzontali)
    const d = [x - b.c[0], y - b.c[1]]; for (let i = 0; i < 3; i++) { const a = b.A[i], L = Math.hypot(a[0], a[1]); if (L < .3) continue; const e = est(b, [a[0] / L, a[1] / L, 0]); if (Math.abs((d[0] * a[0] + d[1] * a[1]) / L) > e) return false; } return true;
  }
  // la luce: lungo l'asse x della struttura, il tratto più lungo di piano (alto almeno 15 cm) senza niente sotto
  function luce(O) {
    const piani = O.filter(b => PARTI[b.k].piano && tiltN(b) < 5 * D2R && zMin(b) >= .15); if (!piani.length) return 0;
    let x0 = Infinity, x1 = -Infinity; piani.forEach(b => angoli(b).forEach(q => { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); }));
    let best = 0, run = 0, buco = 0;
    for (let x = x0 + .025; x < x1; x += .05) {
      const sopra = piani.filter(b => dentroPianta(b, x, b.c[1])); if (!sopra.length) { buco += .05; if (buco > .15) run = 0; else run += .05; continue; } buco = 0;
      const zb = Math.min(...sopra.map(zMin)), y = sopra[0].c[1];
      const sotto = O.some(b => !sopra.includes(b) && zMin(b) <= .02 && zMax(b) <= zb + .03 && dentroPianta(b, x, y));   // una colonna da terra
      if (sotto) run = 0; else { run += .05; best = Math.max(best, run); }
    }
    return r2(best);
  }
  // il rotolamento: ruote che toccano terra, infilate su un asse (tubo o trave) parallelo ai loro mozzi, con un piano sopra
  function rotola(O, V) {
    const W = O.map((b, i) => [b, i]).filter(x => x[0].k === 'ruota'); if (!W.length) return { ruote: 0, assi: 0, ok: false };
    const assi = new Set(); let su = 0;
    for (const [w, i] of W) { if (zMin(w) > .02) continue; for (const j of V.contatti[i]) { const a = O[j]; if ((a.k === 'tubo' || a.k === 'trave') && giunto(w, a) === 1) { assi.add(j); su++; break; } } }
    const piano = [...assi].some(j => V.contatti[j].some(k => PARTI[O[k].k].piano && zMin(O[k]) >= zMax(O[j]) - .03));
    const altri = O.filter(b => b.k !== 'ruota' && zMin(b) <= .015).length;   // le gambe a terra (il carretto con la gamba sta fermo, si alza per spingerlo)
    return { ruote: su, assi: assi.size, piano, gambe: altri, ok: su >= 2 && piano };
  }
  // il lancio: una leva (tubo o trave inclinata 10-50°) che poggia su un fulcro in un punto interno; il braccio lungo giù col carico,
  // il corto su con le molle che lo tirano (o un contrappeso sopra): la gittata con la velocità finta della molla
  function lancio(parti, O, V) {
    let best = null;
    O.forEach((b, i) => {
      if (b.k !== 'tubo' && b.k !== 'trave') return; const t = Math.asin(cl(Math.abs(b.A[0][2]), 0, 1)); if (t < 10 * D2R || t > 50 * D2R) return;
      const sgn = b.A[0][2] >= 0 ? 1 : -1, ax = b.A[0].map(v => v * sgn), Lh = b.h[0];   // ax punta verso il capo alto
      for (const j of V.contatti[i]) {
        const f = O[j]; if (f.k === 'molla' || f.k === 'corda' || zMin(f) >= b.c[2]) continue;
        const dz = zMax(f), s = (dz - b.c[2]) / ax[2]; if (Math.abs(s) > Lh * .8) continue;   // dove la leva passa alla quota del fulcro
        const a = Lh + s, bb = Lh - s;   // a: il braccio verso il basso (col carico), bb: quello su (con la molla)
        let E = 0, mCarico = 0, ic = -1;
        for (const k of V.contatti[i]) { const q = O[k]; const sk = dot([q.c[0] - b.c[0], q.c[1] - b.c[1], q.c[2] - b.c[2]], ax);
          if (PARTI[q.k].elastico && sk > s) E += PARTI[q.k].E;
          else if (k !== j && sk < s - .2 && zMin(q) > zMin(b) && q.k !== 'corda') { mCarico += PARTI[q.k].kg; ic = k; }
          else if (k !== j && sk > s + .2 && zMin(q) >= zMax(b) - .05 && !PARTI[q.k].elastico && q.k !== 'corda') E += PARTI[q.k].kg * 9.8 * 2 * bb * Math.sin(t); }
        if (!E || !mCarico) continue;
        const rap = a / bb, mEff = mCarico + PARTI[b.k].kg / 3, v0 = Math.sqrt(2 * E * .6 / mEff) * cl(rap, 0, 3) / 2, indietro = rap < 1.15;
        const gitt = indietro ? -cl(1.5 + v0 * .2, 1.5, 3) : v0 * v0 / 9.8;
        const R = { leva: i, fulcro: j, carico: ic, bracci: [r2(a), r2(bb)], rap: r2(rap), E: Math.round(E), v0: r2(v0), gittata: r2(gitt), indietro, ang: r2(t / D2R),
          perno: [r3(b.c[0] + ax[0] * s), r3(b.c[1] + ax[1] * s), r3(dz)], dir: [r3(-ax[0]), r3(-ax[1])] };
        R.ok = !indietro && gitt >= 5; if (!best || R.gittata > best.gittata) best = R;
      }
    });
    return best;
  }
  // la chiusura: quanto chiudono, lungo x, le parti alte almeno 0,7 m (la barricata); gli intervalli liberi fra loro
  function chiude(O) {
    const L = O.filter(b => zMax(b) >= .7 && zMin(b) <= .3 && !PARTI[b.k].decoro).map(b => { let a0 = Infinity, a1 = -Infinity; angoli(b).forEach(q => { a0 = Math.min(a0, q[0]); a1 = Math.max(a1, q[0]); }); return [a0, a1]; });
    if (!L.length) return { larg: 0, x0: 0, x1: 0 }; L.sort((a, b) => a[0] - b[0]);
    const U = []; for (const x of L) { const l = U[U.length - 1]; if (l && x[0] <= l[1] + .12) l[1] = Math.max(l[1], x[1]); else U.push(x.slice()); }
    let larg = 0; U.forEach(u => { larg += u[1] - u[0]; });
    return { larg: r2(larg), x0: r2(U[0][0]), x1: r2(U[U.length - 1][1]), pezzi: U.length };
  }
  // [presidio] il passaggio: lungo x, il tratto libero più largo fra le parti che un'auto urta (sotto i 2 m, niente decori)
  function passa(O) {
    const L = O.filter(b => zMin(b) < 2 && !PARTI[b.k].decoro).map(b => { let a0 = Infinity, a1 = -Infinity; angoli(b).forEach(q => { a0 = Math.min(a0, q[0]); a1 = Math.max(a1, q[0]); }); return [a0, a1]; }).sort((a, b) => a[0] - b[0]);
    let best = 0, fin = L.length ? L[0][1] : 0; for (const x of L) { if (x[0] > fin) best = Math.max(best, x[0] - fin); fin = Math.max(fin, x[1]); }
    return r2(best);
  }
  // la stabilità: il baricentro (pesi delle parti) dentro la base d'appoggio (l'inviluppo dei punti a terra), col margine
  function stabilita(O) {
    let m = 0, gx = 0, gy = 0, gz = 0; const base = [];
    O.forEach(b => { const k = PARTI[b.k].kg; m += k; gx += b.c[0] * k; gy += b.c[1] * k; gz += b.c[2] * k; if (zMin(b) <= .015) angoli(b).forEach(q => { if (q[2] <= .03) base.push([q[0], q[1]]); }); });
    if (!m || base.length < 3) return { ok: false, margine: -1 };
    gx /= m; gy /= m; gz /= m; const H = inviluppo(base); let mg = Infinity;
    for (let i = 0; i < H.length; i++) { const a = H[i], b = H[(i + 1) % H.length], ex = b[0] - a[0], ey = b[1] - a[1], L = Math.hypot(ex, ey) || 1; mg = Math.min(mg, ((gx - a[0]) * ey - (gy - a[1]) * ex) / L * -1); }
    return { ok: mg >= .05, margine: r2(mg), g: [r2(gx), r2(gy), r2(gz)] };
  }
  function inviluppo(P) {   // l'inviluppo convesso (catena monotona), in senso antiorario
    const S = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], hi = []; for (const p of S) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (let i = S.length - 1; i >= 0; i--) { const p = S[i]; while (hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); }
    hi.pop(); lo.pop(); return lo.concat(hi);
  }
  // la portata del piano più alto: le parti sotto che lo reggono (i pali dritti, le pile), dimezzata senza i controventi se è alto
  function portata(O, V, M) {
    if (!M.piano) return 0; const top = O.map((b, i) => [b, i]).filter(x => PARTI[x[0].k].piano && tiltN(x[0]) < 5 * D2R && Math.abs(zMax(x[0]) - M.piano) < .03);
    let pp = 0, sotto = new Set(); top.forEach(([b, i]) => { pp += PARTI[b.k].portata; V.contatti[i].forEach(j => { if (zMax(O[j]) <= zMin(b) + .03) sotto.add(j); }); });
    let reg = 0; sotto.forEach(j => { reg += PARTI[O[j].k].portata || 50; });
    const contro = O.filter(b => { const t = Math.asin(cl(Math.abs(b.A[0][2]), 0, 1)); return PARTI[b.k].lungo && t > 20 * D2R && t < 70 * D2R; }).length;
    const k = M.piano > 1.5 && contro < 2 ? .35 : 1;
    return Math.round(Math.min(pp, reg * k));
  }
  // la forma fa quello che si voleva? (effetto, misure, o: { altezza, gap, w }) → { ok, perche }
  const EFF = UP.EFFETTI = {
    rampa: (M) => !M.rampa ? 'non c\'è un piano inclinato' : !M.rampa.continua ? 'il piano ha un buco' : M.rampa.zlo > .12 ? 'non parte da terra' : M.rampa.ang < 8 ? 'troppo piatta' : M.rampa.ang > 35 ? 'troppo ripida' : M.rampa.h < .35 ? 'troppo bassa' : M.rampa.larg < .7 ? 'troppo stretta' : '',
    presidio: (M) => M.passa < 3 ? 'chiude la via (passano ' + M.passa + ' m)' : M.altezza < 2.5 ? 'lo striscione è basso' : '',
    sbarramento: (M, o) => M.chiude.larg < Math.max(1.8, (((o && o.w) || 6) - 1.8) * .72) ? 'non chiude la via' : M.altezza < .8 ? 'troppo bassa' : '',
    riparo: (M) => M.copre < 2.5 ? 'copre poco (' + M.copre + ' m²)' : '',
    torre: (M, o) => M.piano < Math.max(1.8, ((o && o.altezza) || 3) * .75) ? 'troppo bassa' : !M.stabile.ok ? 'non sta in piedi' : M.portata < 80 ? 'non regge una persona' : '',
    palco: (M) => M.piano < .4 || M.piano > 1.5 ? 'non è un palco' : M.pianoA < 1.8 ? 'troppo piccolo' : M.portata < 160 ? 'non regge' : '',
    ponte: (M, o) => M.luce < ((o && o.gap) || 1.5) ? 'non arriva di là' : '',
    zattera: (M) => M.galleggia < 80 ? 'affonda (porta ' + Math.round(M.galleggia) + ' kg)' : '',
    carretto: (M) => !M.rotola.ok ? 'non ha ruote su un asse' : '',
    catapulta: (M) => !M.lancio ? 'non c\'è una leva' : M.lancio.indietro ? 'la leva è corta: tira all\'indietro' : M.lancio.gittata < 5 ? 'tira troppo corto' : '',
  };
  UP.soddisfa = (eff, M, o) => { const f = EFF[eff]; if (!f) return { ok: true, perche: '' }; const p = f(M, o); return { ok: !p, perche: p }; };

  // ======================= LE RICETTE (generatori: montano le parti per arrivare alle misure) =======================
  // ognuna: (rnd, o) → { parti: [...], meta } nel sistema della struttura; o: { altezza, w (la via), lato, larg (lo spazio di traverso),
  // gap (il ponte), folle (sbaglia apposta: rampa troppo ripida, leva corta, zattera di lamiera), mezzo ('auto'|'motorino') }
  function costruttore() {
    const L = [];
    const put = (k, cx, cy, cz, yaw, pitch, roll, exL, exD) => { L.push([k, r3(cx), r3(cy), r3(cz), r3(yaw || 0), r3(pitch || 0), r3(roll || 0), exL ? r3(exL) : 0, exD ? r3(exD) : 0]); return L.length - 1; };
    // posa: il piede a quota z0 (la mezza altezza della scatola girata)
    const posa = (k, cx, cy, z0, yaw, pitch, roll, exL, exD) => { const t = [k, 0, 0, 0, yaw || 0, pitch || 0, roll || 0, exL || 0, exD || 0], ez = est(obb(t), [0, 0, 1]); return put(k, cx, cy, z0 + ez + .002, yaw, pitch, roll, exL, exD); };
    return { L, put, posa };
  }
  const scegli = (r, L) => L[Math.floor(r() * L.length) % L.length];
  const tra = (r, a, b) => a + (b - a) * r();
  // le pile d'appoggio (dal basso): [altezza, profondità lungo x, larghezza, pezzi]; i bancali di traverso (yaw 90°)
  const PILE = [[.6, .6, .6, ['cassa']], [.9, .6, .6, ['fusto']], [1.2, .6, .6, ['cassa', 'cassa']], [1.044, .8, 1.2, ['fusto', 'bancale']]];
  for (let n = 1; n <= 6; n++) PILE.push([r3(n * .146), .8, 1.2, Array(n).fill('bancale')]);
  PILE.sort((a, b) => a[0] - b[0]);
  // posa una pila centrata in (xc, yc) dal piede z0; yb: il bancale girato (PI/2: lungo y, profondo 0,8 in x); restituisce la quota di sopra
  function pila(B, P, xc, yc, z0, yb) {
    let z = z0;
    for (const k of P[3]) { const t = B.posa(k, xc, yc, z, k === 'bancale' ? yb || 0 : 0); z = zMax(obb(B.L[t])); }
    return z;
  }
  const GEN = UP.GEN = {};
  // LA RAMPA: un piano di porte, assi o lamiere lungo 2 m per tratto, inclinato θ, che parte da terra; sotto, le pile al punto giusto
  // (il bordo vicino della pila tocca il piano: davanti alla pila c'è aria a cuneo, mai dentro); l'ultima regge il bordo alto
  GEN.rampa = (r, o) => {
    const B = costruttore(), hT = cl((o && o.altezza) || tra(r, .8, 1.15), .5, 1.4), folle = o && o.folle;
    let th = (folle ? tra(r, 36, 42) : tra(r, 14, 22)) * D2R;
    const deck = o && o.mezzo === 'auto' ? scegli(r, ['porta', 'porta', 'asse']) : scegli(r, ['porta', 'porta', 'asse', 'asse', 'lamiera']);
    const k = folle ? 1 : cl(Math.round(hT / (2 * Math.sin(th))), 1, 3); if (folle) th = Math.asin(cl(tra(r, 1.2, 1.4) / 2, .5, .72)); else th = cl(Math.asin(cl(hT / (2 * k), .05, .95)), 9 * D2R, 26 * D2R);
    const t = PARTI[deck].d[2], nl = deck === 'porta' ? 2 : deck === 'lamiera' ? 2 : Math.round(tra(r, 8, 10)), wl = PARTI[deck].d[1], gap = deck === 'asse' ? .004 : .02, W = nl * wl + (nl - 1) * gap;
    const st = Math.sin(th), ct = Math.cos(th), nx = -st, nz = ct;
    for (let j = 0; j < k; j++) for (let i = 0; i < nl; i++) { const l = 2 * j + 1, ux = l * ct, uz = l * st; B.put(deck, ux + nx * t / 2, -W / 2 + wl / 2 + i * (wl + gap), uz + nz * t / 2 + .002, 0, th, 0); }
    const xEnd = 2 * k * ct, hEnd = 2 * k * st;   // il capo alto del piano, di sotto
    // gli appoggi: dal basso verso l'alto; la pila tocca il piano col bordo vicino (x0 = h/tanθ), davanti a lei aria a cuneo; fra due
    // appoggi al più ~1,2 m; l'ultimo, il più alto che ci sta, regge il capo alto
    const tT = Math.tan(th), cabe = P => P[2] <= W + .4, aDi = P => P[0] / tT + .012;
    let xPrev = .4, nApp = 0;
    for (let g = 0; g < 8; g++) {
      const C = PILE.filter(P => cabe(P) && aDi(P) >= xPrev + (nApp ? .05 : 0) && aDi(P) + P[1] <= xEnd - .02); if (!C.length) break;
      const top = C.reduce((m, P) => (P[0] > m[0] ? P : m), C[0]); let P = top;
      if (aDi(top) - xPrev > 1.05) { const mid = C.filter(Q => aDi(Q) >= xPrev + .25 && aDi(Q) <= xPrev + .95); if (mid.length) P = mid.reduce((m, Q) => (aDi(Q) > aDi(m) ? Q : m), mid[0]); }
      const a = aDi(P), xc = a + P[1] / 2;
      if (P[2] >= 1.2) pila(B, P, xc, 0, 0, PI / 2); else { const yy = cl(W / 2 - .32, .2, 1); pila(B, P, xc, -yy, 0); pila(B, P, xc, yy, 0); }
      nApp++; xPrev = a + P[1] + .03; if (P === top) break;
    }
    // a ricentrare: l'origine al centro dell'impronta, l'asse +x è la salita
    const F = impronta(B.L), dx = -(F[0] + F[2]) / 2; B.L.forEach(p => { p[1] = r3(p[1] + dx); });
    return { parti: B.L, meta: { x0: r3(dx), sale: [1, 0], deck, th: r2(th / D2R), k } };
  };
  // LA CATAPULTA: due travi a terra, il fulcro (una cassa o un fusto) fra loro, la leva (trave o tubo) appoggiata al bordo del fulcro col
  // braccio lungo a terra e il copertone sopra (il carico), la molla che tira giù il braccio corto. La leva corta (folle) tira indietro
  GEN.catapulta = (r, o) => {
    const B = costruttore(), folle = o && o.folle, hf = tra(r, .62, .85), hw = .06;
    const lk = scegli(r, ['trave', 'tubo']), Ll = lk === 'tubo' ? tra(r, 2.6, 3) : 2.4, t = PARTI[lk].d[2], rap = folle ? tra(r, .75, 1.05) : tra(r, 1.9, 2.4);
    const a = Ll * rap / (1 + rap), phi = Math.asin(cl(hf / a, .05, .8)), ct = Math.cos(phi), st = Math.sin(phi);
    const xf = 0, Px = xf - hw, gx = Px - a * ct;   // il perno allo spigolo del palo-fulcro, il capo basso a terra
    // le travi di base: dal fulcro verso il capo alto (lontane dal carico)
    const yb = .38, xb0 = xf - hw - .25, xb1 = Math.max(xf + hw + .6, Px + (Ll - a) * ct + .3), lb = Math.min(2.4, xb1 - xb0);
    B.posa('trave', xb0 + lb / 2, -yb, 0, 0, 0, 0, lb); B.posa('trave', xb0 + lb / 2, yb, 0, 0, 0, 0, lb);
    B.put('trave', xf, 0, hf / 2 + .001, 0, PI / 2, 0, hf);   // il fulcro: un palo dritto
    const lc = Ll / 2, ux = gx + lc * ct, uz = lc * st; B.put(lk, ux - st * t / 2, 0, uz + ct * t / 2 + .002, 0, phi, 0, Ll);
    // il carico: il copertone sul braccio lungo, inclinato come la leva
    const lb2 = .5; B.put('pneumatico', gx + lb2 * ct - st * (t + .1), 0, lb2 * st + ct * (t + .1) + .004, 0, phi, 0);
    // la molla sotto il braccio corto, in piedi fra le travi, tirata fino alla leva
    const ls = Ll - .2, xs = gx + ls * ct, zu = ls * st - .15 * Math.tan(phi) - .006; if (zu > .25 && xs - .15 > xf + hw + .02) B.put('molla', xs, 0, zu / 2 + .001, 0, 0, 0, zu);
    // la corda arrotolata a terra accanto, e un copertone di scorta (le munizioni)
    B.posa('corda', xb0 + .3, yb + .4, 0); B.posa('pneumatico', gx + .25, .95, 0);
    const F = impronta(B.L), dx = -(F[0] + F[2]) / 2; B.L.forEach(p => { p[1] = r3(p[1] + dx); });
    return { parti: B.L, meta: { tira: [-1, 0], leva: lk, rap: r2(rap) } };
  };
  // IL CARRETTO: un bancale sugli assi (tubi tagliati), le ruote infilate ai capi; o un asse solo, la gamba e le stanghe (la carriola)
  GEN.carretto = (r, o) => {
    const B = costruttore(), quattro = r() < .6, R0 = .3, yw = .4 + .06 + .025;
    const assi = quattro ? [-.4, .4] : [.25];
    for (const x of assi) { B.put('tubo', x, 0, R0, PI / 2, 0, 0, 2 * yw + .04); B.put('ruota', x, -yw, R0, 0, 0, 0); B.put('ruota', x, yw, R0, 0, 0, 0); }
    const zp = R0 + .03; B.posa('bancale', 0, 0, zp);
    const top = zp + .144 + .004;
    if (!quattro) { B.put('trave', -.5, 0, zp / 2, 0, PI / 2, 0, zp - .002); B.posa('asse', -.75, -.3, top, 0, 0, 0, 1.3); B.posa('asse', -.75, .3, top, 0, 0, 0, 1.3); }
    if (r() < .7) B.posa(scegli(r, ['cassa', 'fusto']), quattro ? 0 : .27, 0, top);
    const F = impronta(B.L), dx = -(F[0] + F[2]) / 2; B.L.forEach(p => { p[1] = r3(p[1] + dx); });
    return { parti: B.L, meta: { rotola: [1, 0] } };
  };
  // LA TORRE: quattro pali dritti (travi o tubi) agli angoli di un bancale in cima, i controventi sui fianchi lunghi (fuori dai pali),
  // la scala a pioli su un lato corto. Bassa (palco): bancali affiancati sulle casse
  GEN.torre = (r, o) => {
    const B = costruttore(), hT = cl((o && o.altezza) || 3, .6, 3.4);
    if (hT < 1.5) {   // il palco: bancali affiancati su casse, fusti o pile di bancali; uno scalino davanti
      const n = scegli(r, [2, 3, 3, 4]), sk = scegli(r, ['cassa', 'cassa', 'fusto', 'pila']), zs = sk === 'cassa' ? .6 : sk === 'fusto' ? .9 : .438;
      for (let i = 0; i < n; i++) { const y = (i - (n - 1) / 2) * .82; if (sk === 'pila') pila(B, PILE.find(Q => Q[3].length === 3 && Q[3][0] === 'bancale'), 0, y, 0, 0); else for (const x of [-.3, .3]) B.posa(sk, x, y, 0); B.posa('bancale', 0, y, zs + .004); }
      if (r() < .7) B.posa(zs > .7 ? 'cassa' : 'pneumatico', -.6 - (zs > .7 ? .32 : .34), 0, 0);   // lo scalino
      return { parti: B.L, meta: { palco: true } };
    }
    const pk = hT > 2.55 ? 'tubo' : scegli(r, ['trave', 'trave', 'tubo']), H = cl(hT - .15, 1.6, pk === 'tubo' ? 3 : 2.4), ph = PARTI[pk].d[1] / 2, px = .6 - ph, py = .4 - ph;
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) B.put(pk, sx * px, sy * py, H / 2 + .002, 0, PI / 2, 0, H);
    B.put('bancale', 0, 0, H + .004 + .072, 0, 0, 0);
    // i controventi: a zig zag sui due fianchi lunghi, nel piano appena fuori dai pali
    // due per fianco, uno sopra l'altro con 3 cm d'aria (la larghezza dell'asse conta nell'altezza)
    const yc = py + ph + .016, dx = 2 * px - .12, h1 = (H - .22) / 4; let ang = Math.atan2(2 * h1, dx);
    for (let it = 0; it < 4; it++) ang = Math.atan2(Math.max(.1, 2 * (h1 - .1 * Math.cos(ang))), dx);
    const Ld = dx / Math.cos(ang) - .2 * Math.tan(ang) * 0;
    if (Ld <= 2) for (const sy of [-1, 1]) for (let s = 0; s < 2; s++) { const z = .12 + h1 + s * (2 * h1 + .03), sg = s % 2 ? -1 : 1; B.put('asse', 0, sy * yc, z, 0, sg * ang, PI / 2, Ld); }
    // la scala a pioli sul lato +x
    const sx = r() < .5 ? 1 : -1, xr = sx * (px + ph + .016); for (let z = .3; z < H - .15; z += .38) B.put('asse', xr, 0, z, PI / 2, 0, PI / 2, .8);
    // ai piedi: un copertone o una cassa dall'altra parte (le cose che si lasciano lì)
    if (r() < .6) B.posa(scegli(r, ['pneumatico', 'cassa', 'fusto']), -sx * (px + ph + .5), 0, 0);
    return { parti: B.L, meta: { scala: [sx, 0], H } };
  };
  GEN.palco = (r, o) => GEN.torre(r, Object.assign({}, o, { altezza: (o && o.altezza) || 1 }));
  // IL RIPARO (la baracca): quattro pali, le pareti di lamiera fuori dai pali (dietro e sui fianchi), la porta davanti a sinistra, il
  // tetto di lamiere o di telo appoggiato alle teste dei pali (davanti più alto), lo striscione appeso al tetto, dentro una cassa
  GEN.riparo = (r, o) => {
    const B = costruttore(), nx = (o && o.larg && o.larg < 3.6) ? 2 : (r() < .5 ? 2 : 3), ny = 2, Lx = nx - .12, Ly = ny - .12, Hf = tra(r, 2.3, 2.4), Hb = 2.1;
    const telo = r() < .3;
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) { const H = sy < 0 ? Hf : Hb; B.put('trave', sx * Lx / 2, sy * Ly / 2, H / 2 + .002, 0, PI / 2, 0, H); }
    for (let i = 0; i < nx; i++) B.put('lamiera', -nx / 2 + .5 + i, Ly / 2 + .08, 1.012, PI / 2, PI / 2, 0);
    for (const sx of [-1, 1]) for (let j = 0; j < ny; j++) B.put('lamiera', sx * (Lx / 2 + .08), -ny / 2 + .5 + j, 1.012, 0, PI / 2, 0);
    B.put('porta', -nx / 2 + .45, -(Ly / 2 + .084), 1.012, PI / 2, PI / 2, 0);
    if (nx === 3) B.put('bancale', -nx / 2 + .9 + .4 + .02, -(Ly / 2 + .134), .612, PI / 2, PI / 2, 0);
    // gli arcarecci: due tubi sulle teste dei pali (davanti e dietro, verso dentro); il tetto ci appoggia sopra (le lamiere di mezzo non
    // toccano i pali: senza arcarecci cadrebbero). La retta di sotto del tetto passa per le loro cime: tanφ = (Hf − Hb)/(yb − yf)
    const ya = -Ly / 2, yd = Ly / 2 - .03, La = Math.min(3, nx + .1); B.put('tubo', 0, ya, Hf + .03 + .002, 0, 0, 0, La); B.put('tubo', 0, yd, Hb + .03 + .002, 0, 0, 0, La);
    const phi = Math.atan((Hf - Hb) / (yd - ya)), zu = y => Hf + .062 - (y - ya) * Math.tan(phi), yc = -.06, nrm = [0, Math.sin(phi), Math.cos(phi)];
    if (telo) B.put('telo', 0, yc + nrm[1] * .005, zu(yc) + nrm[2] * .005 + .002, -PI / 2, phi, 0, 2.02, nx + .1);
    else for (let i = 0; i < nx; i++) B.put('lamiera', -nx / 2 + .5 + i, yc + nrm[1] * .02, zu(yc) + nrm[2] * .02 + .002, -PI / 2, phi, 0);
    // lo striscione davanti, appeso al bordo del tetto, sopra la porta
    const yb = yc - Math.cos(phi) + .03, zt = zu(yb - .01) - .014; B.put('striscione', 0, yb, zt - .16, PI, 0, 0, Math.min(2.4, nx - .2));
    if (r() < .8) B.posa('cassa', Lx / 2 - .42, Ly / 2 - .42, 0);
    if (r() < .5) B.posa('pneumatico', -Lx / 2 + .45, Ly / 2 - .45, 0);
    return { parti: B.L, meta: { davanti: [0, -1], porta: [-nx / 2 + .45, -(Ly / 2 + .08)] } };
  };
  // LO SBARRAMENTO (la barricata): attraverso la via (x di traverso), i pannelli di taglio (porte, lamiere, bancali) appoggiati indietro
  // contro una fila di pile (il bordo dietro tocca lo spigolo della pila), i copertoni davanti, due pali dietro con lo striscione.
  // Il varco (o.varco m) resta libero dal lato o.lato: da x1 = w/2 − varco a w/2 (girato col lato)
  GEN.sbarramento = (r, o) => {
    const B = costruttore(), w = (o && o.w) || 6, varco = (o && o.varco) || 1.8, lato = ((o && o.lato) || 1) * (o && o.gira ? -1 : 1);
    const x0 = -w / 2 + .25, x1 = w / 2 - varco - .25, span = x1 - x0;
    const al = tra(r, 9, 15) * D2R, PAN = { porta: [2, .9], lamiera: [2, 1], bancale: [1.2, .8] };
    // i pannelli: riempire lo spazio con larghezze a caso (2 m o 1,2 m), poi centrarli
    const seq = []; let rest = span;
    while (rest >= 1.2) { const k = rest >= 2.04 ? scegli(r, ['porta', 'lamiera', 'bancale', 'porta']) : 'bancale'; seq.push(k); rest -= PAN[k][0] + .04; }
    if (!seq.length) seq.push('bancale');
    let tot = seq.reduce((a, k) => a + PAN[k][0], 0) + (seq.length - 1) * .04, x = x0 + (span - tot) / 2;
    const yS = .05, PSUP = PILE.filter(P => P[0] >= .4 && P[0] <= .75);
    let yMaxDietro = yS, yMinDavanti = 0;
    for (const k of seq) {
      const [Wp, Dp] = PAN[k], Hp = PARTI[k].d[2], xc = x + Wp / 2;
      // le pile dietro: una per pannello (due sotto i pannelli da 2 m), alte meno del pannello
      const hmax = Dp * Math.cos(al) - .08, P = scegli(r, PSUP.filter(Q => Q[0] <= hmax).concat(PSUP.filter(Q => Q[0] <= hmax).length ? [] : [PILE[0]]));
      const hs = P[0], cz = Dp / 2 * Math.cos(al) + Hp / 2 * Math.sin(al) + .003;
      // il bordo dietro passa per lo spigolo (yS, hs): (yS − cy)·cosα − (hs − cz)·sinα = Hp/2
      const cy2 = yS - (Hp / 2 + (hs - cz) * Math.sin(al)) / Math.cos(al);
      B.put(k, xc, cy2 - .004, cz, 0, 0, PI / 2 - al);
      const xs = Wp >= 2 && P[2] <= .9 ? [xc - Wp / 4, xc + Wp / 4] : [xc];
      for (const xx of xs) { const yc = yS + P[1] / 2 + .004; pila(B, P, xx, yc, 0, 0); yMaxDietro = Math.max(yMaxDietro, yS + P[1] + .004); }
      const yFront = cy2 - .004 - (Dp / 2 * Math.sin(al) + Hp / 2 * Math.cos(al)); yMinDavanti = Math.min(yMinDavanti, yFront);
      // i copertoni davanti, a pila di uno o due, sotto metà dei pannelli
      if (r() < .55) { const n = r() < .5 ? 1 : 2; for (let j = 0; j < n; j++) B.posa('pneumatico', xc + (r() - .5) * .2, yFront - .34, j * .202); }
      x += Wp + .04;
    }
    // i due pali dietro le pile e lo striscione fra loro, sopra tutto
    const xL = x0 + (span - tot) / 2, yp = yMaxDietro + .34, bw = Math.min(2.4, tot - .3), xm = xL + tot / 2, xa = xm - bw / 2 - .06, xb = xm + bw / 2 + .06;
    for (const xx of [xa, xb]) { B.put('trave', xx, yp, 1.1 + .002, 0, PI / 2, 0, 2.2); B.posa('pneumatico', xx, yp, 0); B.posa('pneumatico', xx, yp, .202); }   // i pali piantati nei copertoni
    B.put('striscione', xm, yp - .07, 1.75, PI, 0, 0, bw);   // la scritta si legge dal davanti
    // lo specchio (il varco dall'altra parte): x → −x; M·Rz(ψ)Ry(−p)Rx(r)·M = Rz(−ψ)Ry(p)Rx(r)
    if (lato < 0) B.L.forEach(p => { p[1] = r3(-p[1]); p[4] = r3(-p[4]); p[5] = r3(-p[5]); });
    let vc = [r3((w / 2 - varco) * lato), r3(w / 2 * lato)];
    // girata (il davanti dall'altra parte della via): mezzo giro attorno alla verticale, il varco torna dal lato chiesto
    if (o && o.gira) { B.L.forEach(p => { p[1] = r3(-p[1]); p[2] = r3(-p[2]); p[4] = r3(p[4] + PI); }); vc = vc.map(v => -v); }
    return { parti: B.L, meta: { varco: vc, w, lato: lato * (o && o.gira ? -1 : 1), gira: !!(o && o.gira) } };
  };
  // [presidio] IL PRESIDIO (la via nostra): non chiude, abita. Attraverso la via (x di traverso, y lungo la via) due pali piantati nei
  // copertoni ai bordi e la scritta alta fra loro (sotto 2,2 m passa un furgone); in basso solo ai lati, in due fasce larghe 1,1-1,8 m:
  // la panca di bancali, la cassa, i copertoni (i fondatori), poi il tavolo, le sedie, i vasi, il fusto per cucinare (la gente). In
  // mezzo almeno 3,2 m liberi: le auto passano piano. meta.base: quanti pezzi mettono i fondatori (gli altri li porta la comunità)
  GEN.presidio = (r, o) => {
    const B = costruttore(), W = Math.max((o && o.w) || 7, 5.6), band = cl((W - 3.4) / 2, 1.1, 1.8), xi = W / 2 - band, xe = W / 2 - .12, xm = xi + band / 2;
    const sw = r() < .5 ? 1 : -1, bancoY = -tra(r, 1.1, 1.4);
    for (const s of [-1, 1]) { const xp = s * (xe - .32); B.posa('pneumatico', xp, 0, 0); B.posa('pneumatico', xp, 0, .202); B.put('tubo', xp, 0, 1.502, 0, PI / 2, 0, 3); }
    // il salotto (un lato): la panca di due bancali; il tavolo con le sedie (dopo). La cucina (l'altro): la cassa, i copertoni, il fusto
    const A = sw, Z = -sw;
    B.posa('bancale', A * xm, bancoY, 0, PI / 2); B.posa('bancale', A * xm, bancoY, .146, PI / 2);
    B.posa('cassa', Z * (xi + .38), 1.25, 0);
    const gomme = r() < .6; if (gomme) { B.posa('pneumatico', Z * (xe - .34), -1.3, 0); if (r() < .5) B.posa('pneumatico', Z * (xe - .34), -1.3, .202); }
    const xp = xe - .32 - .034; B.put('scritta', 0, 0, 2.55, PI, 0, 0, 2 * xp);
    const base = B.L.length;
    // la comunità: il tavolo e le sedie attorno (lungo la via), le sedie della cucina che guardano la strada, i vasi agli angoli
    const ty = tra(r, 1.35, 1.6); B.posa('tavolo', A * xm, ty, 0);
    B.posa('sedia', A * xm, ty - .66, 0, 0); B.posa('sedia', A * xm, ty + .66, 0, PI);
    B.posa('sedia', Z * (xi + .3), 1.95 + .02, 0, Z * PI / 2);
    if (r() < .7) B.posa('sedia', Z * (xi + .3), .6, 0, Z * PI / 2);
    if (!gomme || r() < .4) B.posa('fusto', Z * (xe - .36), gomme ? -2.1 : -1.3, 0); else B.posa('sedia', Z * (xi + .3), -.62, 0, Z * PI / 2);
    B.posa('vaso', A * (xe - .24), bancoY - .95, 0); if (r() < .6) B.posa('vaso', Z * (xe - .24), 2.05, 0);
    return { parti: B.L, meta: { base, w: W, varco: [r3(-xi), r3(xi)] } };
  };
  // IL PONTE: due pile basse sulle rive, il piano (una o due porte, o due travi con le assi di traverso) che le scavalca
  GEN.ponte = (r, o) => {
    const B = costruttore(), gap = cl((o && o.gap) || 1.6, .6, 2.5), xs = gap / 2 + .45, n = scegli(r, [1, 2]);
    const P = PILE.find(Q => Q[3].length === 2 && Q[3][0] === 'bancale'); let top = 0; for (const s of [-1, 1]) top = pila(B, P, s * xs, 0, 0, PI / 2);
    const need = 2 * (xs - .4 + .2);   // il piano poggia almeno 20 cm su ogni pila
    if (need <= 2) { for (let i = 0; i < n; i++) B.posa('porta', 0, n === 1 ? 0 : (i - .5) * .92, top, 0, 0, 0); }
    else { const lk = need <= 2.3 ? 'trave' : 'tubo', Ls = Math.min(need + .2, lk === 'trave' ? 2.4 : 3); for (const y of [-.35, .35]) B.posa(lk, 0, y, top, 0, 0, 0, Ls);
      const zt = top + PARTI[lk].d[2] + .002; for (let x = -Ls / 2 + .11; x <= Ls / 2 - .1; x += .215) B.posa('asse', x, 0, zt, PI / 2, 0, 0, .95); }
    return { parti: B.L, meta: { gap, attraversa: [1, 0] } };
  };
  // LA ZATTERA: i fusti coricati (o i copertoni), il piano di porte o di bancali sopra, la corda che lega. La folle: lamiere e casse
  GEN.zattera = (r, o) => {
    const B = costruttore(), folle = o && o.folle;
    if (folle) { for (const y of [-.51, .51]) B.posa('lamiera', 0, y, 0); for (const x of [-.6, .6]) B.posa('trave', x, 0, .042, PI / 2, 0, 0, 2.1); B.posa('corda', .6, 0, .042 + .124); return { parti: B.L, meta: { folle: true } }; }
    const nf = scegli(r, [2, 3]), deck = scegli(r, ['porta', 'bancale']);
    for (let i = 0; i < nf; i++) for (const y of [-.46, .46]) B.put('fusto', (i - (nf - 1) / 2) * .62, y, .3 + .002, 0, 0, PI / 2);
    const top = .6 + .006;
    if (deck === 'porta') { for (const y of [-.46, .46]) B.posa('porta', 0, y, top, 0, 0, 0, 0); }
    else { const nb = nf === 3 ? 2 : 1; for (let i = 0; i < nb; i++) for (const y of [-.41, .41]) B.posa('bancale', nb === 1 ? 0 : (i - .5) * 1.22, y, top); }
    B.posa('corda', 0, 0, top + PARTI[deck].d[2] + .004);
    return { parti: B.L, meta: { galleggia: true } };
  };
  // il tipo del cantiere (le parole di unico_costruire.js) → la ricetta e l'effetto misurato
  const TIPI = UP.TIPI = { barricata: { gen: 'sbarramento', eff: 'sbarramento' }, baracca: { gen: 'riparo', eff: 'riparo' }, rampa: { gen: 'rampa', eff: 'rampa' }, catapulta: { gen: 'catapulta', eff: 'catapulta' },
    carretto: { gen: 'carretto', eff: 'carretto' }, presidio: { gen: 'presidio', eff: 'presidio' }, torre: { gen: 'torre', eff: 'torre' }, palco: { gen: 'palco', eff: 'palco' }, ponte: { gen: 'ponte', eff: 'ponte' }, zattera: { gen: 'zattera', eff: 'zattera' } };
  UP.ALIAS = { sbarramento: 'barricata', riparo: 'baracca', casa: 'baracca', via_nostra: 'presidio' };
  // genera e misura: prova più semi finché la forma passa le regole e (se non folle) fa quello che deve; ordina i pezzi per la posa
  function progetta(tipo, seme, o) {
    const T = TIPI[tipo]; if (!T) return null; o = o || {};
    let ult = null;
    for (let k = 0; k < 8; k++) {
      const r = rngDi(seme + '|' + k), g = GEN[T.gen](r, o), V = valida(g.parti);
      if (!V.ok) { ult = ult || { g, V }; continue; }
      const M = misura(g.parti, { valida: V }), S = UP.soddisfa(T.eff, M, o);
      if (!S.ok && !o.folle && k < 7) { ult = { g, V, M, S }; continue; }
      const nb = g.meta && g.meta.base; g.parti = nb ? ordina(g.parti.slice(0, nb)).concat(ordina(g.parti.slice(nb))) : ordina(g.parti); const V2 = valida(g.parti), M2 = misura(g.parti, { valida: V2 });
      return { parti: g.parti, meta: g.meta, misure: M2, funziona: UP.soddisfa(T.eff, M2, o), prova: k };
    }
    return ult && ult.V && ult.V.ok && !(ult.g.meta && ult.g.meta.base) ? { parti: ordina(ult.g.parti), meta: ult.g.meta, misure: ult.M, funziona: ult.S, prova: 8 } : null;
  }
  UP.progetta = progetta;
  // l'ordine di posa: prima chi sta più in basso (il piede), a parità chi tocca terra; lo striscione e la corda in fondo
  function ordina(parti) {
    const O = parti.map((p, i) => [p, zMin(obb(p)), i]);
    O.sort((a, b) => (PARTI[a[0][0]].decoro ? 1 : 0) - (PARTI[b[0][0]].decoro ? 1 : 0) || a[1] - b[1] || a[2] - b[2]);
    return O.map(x => x[0]);
  }
  UP.ordina = ordina;

  // ======================= IL POSTO (libero, piano, coi passaggi) =======================
  // la quota del suolo: nel browser quella del disegno (unico_parti_vivo.js la mette), in Node dai vertici della mappa
  UP.quota = (x, y) => { if (!G || !G.MAP || !G.MAP.vh) return 0; const TS = G.TS, fx = x / TS, fz = y / TS, i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, VW = G.MAP.VW, vh = G.MAP.vh;
    const V = (a, b) => vh[Math.max(0, Math.min(G.GH, b)) * VW + Math.max(0, Math.min(G.GW, a))] || 0; return V(i, j) * (1 - u) * (1 - v) + V(i + 1, j) * u * (1 - v) + V(i, j + 1) * (1 - u) * v + V(i + 1, j + 1) * u * v; };
  UP.ostacoli = null;   // (x, y, r) → [{ x, y, hx, hy, z0, z1, tag }] la roba di strada che conosce il disegno (lampioni, panchine, bidoni)
  UP.WL = -.45;   // il pelo dell'acqua
  // dal sistema della struttura al mondo
  const aMondo = (S, lx, ly) => ({ x: S.x + Math.cos(S.a) * lx - Math.sin(S.a) * ly, y: S.y + Math.sin(S.a) * lx + Math.cos(S.a) * ly });
  UP.aMondo = aMondo;
  const daMondo = (S, x, y) => { const dx = x - S.x, dy = y - S.y, c = Math.cos(S.a), s = Math.sin(S.a); return { x: dx * c + dy * s, y: -dx * s + dy * c }; };
  UP.daMondo = daMondo;
  // il rettangolo dell'impronta nel mondo (per Ingombri: cx, cz, a, hu, hv)
  function rettMondo(S, F, m) { const c = aMondo(S, (F[0] + F[2]) / 2, (F[1] + F[3]) / 2); return { cx: c.x, cz: c.y, a: S.a, hu: (F[2] - F[0]) / 2 + (m || 0), hv: (F[3] - F[1]) / 2 + (m || 0) }; }
  UP.rettMondo = rettMondo;
  // due rettangoli orientati in pianta si toccano? (SAT 2D)
  function sat2(A, B) {
    const ax = [[Math.cos(A.a), Math.sin(A.a)], [-Math.sin(A.a), Math.cos(A.a)], [Math.cos(B.a), Math.sin(B.a)], [-Math.sin(B.a), Math.cos(B.a)]];
    const ext = (R, u) => R.hu * Math.abs(Math.cos(R.a) * u[0] + Math.sin(R.a) * u[1]) + R.hv * Math.abs(-Math.sin(R.a) * u[0] + Math.cos(R.a) * u[1]);
    let best = Infinity; for (const u of ax) { const d = Math.abs((B.cx - A.cx) * u[0] + (B.cz - A.cz) * u[1]), o = ext(A, u) + ext(B, u) - d; if (o <= 0) return 0; best = Math.min(best, o); } return best;
  }
  UP.sat2 = sat2;
  const T_ = () => G.T;
  const SUOLI = {   // le caselle ammesse sotto l'impronta
    strada: () => new Set([T_().VIA, T_().COB, T_().PIAZZA]), piazza: () => new Set([T_().VIA, T_().COB, T_().PIAZZA, T_().QUAY, T_().GRAVEL, T_().DIRT].filter(v => v !== undefined)),
    acqua: () => new Set([T_().WATER]),
    via: () => new Set([T_().VIA, T_().COB, T_().PIAZZA, T_().WALK].filter(v => v !== undefined)),   // [presidio] la via da un muro all'altro: carreggiata e marciapiedi
  };
  const tile = (x, y) => G.tileAt(Math.floor(x / G.TS), Math.floor(y / G.TS));
  // i mezzi e le barche come rettangoli
  function mezzi(st, x, y, R) {
    const out = [], VK = G.VK || {};
    for (const v of (st && st.vehicles) || []) { if (v.hidden || v.gone || Math.abs(v.x - x) > R || Math.abs(v.y - y) > R) continue; const K = VK[v.kind] || {}; out.push({ cx: v.x, cz: v.y, a: v.ang || 0, hu: (K.len || 4.2) / 2, hv: (K.wid || 1.8) / 2, v }); }
    const SEA = typeof World !== 'undefined' && World.SEA ? World.SEA : null;
    if (SEA && SEA.moorings) for (const m of SEA.moorings) { if (Math.abs(m.x - x) > R || Math.abs(m.y - y) > R) continue; out.push({ cx: m.x, cz: m.y, a: m.ang || 0, hu: (m.len || 5) / 2, hv: (m.len || 5) * .2, barca: 1 }); }
    return out;
  }
  UP.mezzi = mezzi;
  // controlla un posto: S = { x, y, a, rd, w }, F = impronta locale; o = { suolo, altri (i rettangoli degli altri cantieri), passaggio,
  // corridoi: [[lx0, ly0, lx1, ly1]] (zone che devono restare libere: la rincorsa e l'atterraggio della rampa), salta: un mezzo da non contare }
  function controlla(st, S, F, o) {
    const R = rettMondo(S, F, 0), Ig = IG(), perche = [];
    if (Ig && Ig.casa(G, R, .3)) return 'casa';
    const ok = SUOLI[o.suolo || 'strada'](); if (o.ponte) ok.add(G.T.WATER); const c = Math.cos(S.a), s = Math.sin(S.a); let q0 = Infinity, q1 = -Infinity;
    for (let lx = F[0]; lx <= F[2] + 1e-6; lx += Math.max(.25, (F[2] - F[0]) / Math.ceil((F[2] - F[0]) / .5))) for (let ly = F[1]; ly <= F[3] + 1e-6; ly += Math.max(.25, (F[3] - F[1]) / Math.ceil((F[3] - F[1]) / .5))) {
      const x = S.x + c * lx - s * ly, y = S.y + s * lx + c * ly; if (!ok.has(tile(x, y))) return 'suolo';
      if (G.novAt && o.suolo !== 'acqua' && G.novAt(x, y) === 2) return 'scale';
      if (o.suolo !== 'acqua') { const q = UP.quota(x, y); q0 = Math.min(q0, q); q1 = Math.max(q1, q); }
    }
    if (o.suolo !== 'acqua' && q1 - q0 > (o.piano || .2)) return 'pendenza';
    for (const M of mezzi(st, R.cx, R.cz, 14)) if (M.v !== o.salta && sat2(R, Object.assign({}, M, { hu: M.hu + .45, hv: M.hv + .45 }))) return M.barca ? 'barca' : 'mezzo';
    for (const A of o.altri || []) if (sat2(R, A)) return 'cantiere';
    if (UP.ostacoli) for (const b of UP.ostacoli(R.cx, R.cz, Math.hypot(R.hu, R.hv) + 2)) if (sat2(R, { cx: b.x, cz: b.y, a: 0, hu: b.hx + .2, hv: b.hy + .2 })) return 'arredo:' + (b.tag || '?');
    const p = st && st.player; if (p && !p.indoor && sat2(R, { cx: p.x, cz: p.y, a: 0, hu: .5, hv: .5 })) return 'giocatore';
    // le porte delle case: niente davanti a una porta (2 m)
    for (const b of G.BUILDINGS || []) { if (!b || !b.door) continue; const dx = (b.door[0] + .5) * G.TS, dy = (b.door[1] + .5) * G.TS; if (Math.abs(dx - R.cx) > 12 || Math.abs(dy - R.cz) > 12) continue; if (sat2(R, { cx: dx, cz: dy, a: 0, hu: 1.6, hv: 1.6 })) return 'porta'; }
    // i corridoi che devono restare liberi (la rincorsa, l'atterraggio): caselle carrabili, niente case, niente mezzi
    for (const K of o.corridoi || []) {
      const Rk = rettMondo(S, K, 0); if (Ig && Ig.casa(G, Rk, .2)) return 'corridoio:casa';
      for (let lx = K[0]; lx <= K[2]; lx += 1) for (let ly = K[1]; ly <= K[3]; ly += .6) { const x = S.x + c * lx - s * ly, y = S.y + s * lx + c * ly; if (!(ok.has(tile(x, y)) || tile(x, y) === G.T.WALK) || (G.novAt && G.novAt(x, y) > 0) || Math.abs(UP.quota(x, y) - UP.quota(S.x, S.y)) > .9) return 'corridoio:suolo';
        if ([[4, 0], [-4, 0], [0, 4], [0, -4]].some(([ax, ay]) => tile(x + ax, y + ay) === G.T.WATER)) return 'corridoio:acqua'; }   // non verso il mare (le scogliere, le banchine)
      for (const M of mezzi(st, Rk.cx, Rk.cz, 24)) if (!M.barca && M.v !== o.salta && sat2(Rk, M)) return 'corridoio:mezzo';
      if (UP.ostacoli) for (const b of UP.ostacoli(Rk.cx, Rk.cz, Math.hypot(Rk.hu, Rk.hv) + 2)) if (b.z1 > .4 && sat2(Rk, { cx: b.x, cz: b.y, a: 0, hu: b.hx, hv: b.hy })) return 'corridoio:arredo';
    }
    // il passaggio sulla via: di traverso alla via deve restare un tratto libero di o.passaggio m
    if (o.via && o.passaggio) {
      const V = o.via, nx = -Math.sin(V.th), ny = Math.cos(V.th); let a0 = Infinity, a1 = -Infinity;
      for (const [lx, ly] of [[F[0], F[1]], [F[2], F[1]], [F[0], F[3]], [F[2], F[3]]]) { const q = aMondo(S, lx, ly), t = (q.x - V.x) * nx + (q.y - V.y) * ny; a0 = Math.min(a0, t); a1 = Math.max(a1, t); }
      const hw = V.w / 2, libero = Math.max(hw - a1, a0 + hw); if (libero < o.passaggio) return 'passaggio';
    }
    return '';
  }
  UP.controlla = controlla;
  // le vie vicine: per ogni segmento, punti ogni passo m (dal 10 al 90%)
  function puntiVia(x, y, R, filtro, passo) {
    const out = [];
    for (const rd of (G.MAP && G.MAP.roads) || []) {
      if (!rd || !rd.pts || rd.pts.length < 2 || (filtro && !filtro(rd))) continue; const P = rd.pts;
      // le polilinee sono fitte (punti ogni 0,4 m): si cammina lungo la via a passi di passo m; la direzione da 2,5 m prima a 2,5 m dopo
      let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity; for (const q of P) { bx0 = Math.min(bx0, q[0]); bx1 = Math.max(bx1, q[0]); by0 = Math.min(by0, q[1]); by1 = Math.max(by1, q[1]); }
      if (x < bx0 - R || x > bx1 + R || y < by0 - R || y > by1 + R) continue;
      const cum = [0]; for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + hyp(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1])); const Ltot = cum[cum.length - 1]; if (Ltot < 8) continue;
      let j = 0; const at = s => { while (j > 0 && cum[j] > s) j--; while (j < P.length - 2 && cum[j + 1] < s) j++; const L = cum[j + 1] - cum[j] || 1, u = (s - cum[j]) / L; return [P[j][0] + (P[j + 1][0] - P[j][0]) * u, P[j][1] + (P[j + 1][1] - P[j][1]) * u]; };
      for (let s = 4; s <= Ltot - 4; s += passo) { const q = at(s), d = hyp(q[0] - x, q[1] - y); if (d > R) continue; const a = at(Math.max(0, s - 2.5)), b = at(Math.min(Ltot, s + 2.5)), c = at(s);
        const th = Math.atan2(b[1] - a[1], b[0] - a[0]), dev = Math.abs(((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) / (hyp(b[0] - a[0], b[1] - a[1]) || 1));
        if (dev > .35) continue;   // in curva no: si cercano i tratti dritti
        out.push({ rd, x: q[0], y: q[1], th, d, w: rd.w || 6 }); }
    }
    out.sort((a, b) => a.d - b.d || (a.rd.id < b.rd.id ? -1 : 1));
    return out;
  }
  UP.puntiVia = puntiVia;
  // [presidio] GLI INCROCI, dai dati delle vie (G.MAP.roads, tutte: anche la bocca di un vicolo o di uno sterrato è un incrocio): dove due
  // vie si tagliano (i segmenti che si incrociano) e dove il capo di una via tocca un'altra (la T); il raggio è mezza la via più larga + 2 m
  // (come gli incroci di segnaletica.js). Più le zebre: quelle di Segnaletica se c'è (agli incroci, alle scuole, alle fermate), raggio 2 m.
  // Una griglia di 16 m per non provare tutte le coppie. UP.lontanoIncrocio(x, y): i metri dal bordo dell'incrocio (o della zebra) più vicino.
  let INC = null;
  function incroci() {
    const R0 = (G && G.MAP && G.MAP.roads) || []; if (INC && INC.R0 === R0 && INC.n === R0.length) return INC;
    const R = R0.filter(r => r && r.pts && r.pts.length > 1), CS = 16, H = new Map(), seg = [], J = [];
    const cella = (i, j) => (i + 4096) * 8192 + j + 4096;
    R.forEach((rd, ri) => { for (let k = 0; k < rd.pts.length - 1; k++) { const a = rd.pts[k], b = rd.pts[k + 1], si = seg.length; seg.push([ri, a, b, rd.w || 6]);
      for (let i = Math.floor(Math.min(a[0], b[0]) / CS); i <= Math.floor(Math.max(a[0], b[0]) / CS); i++) for (let j = Math.floor(Math.min(a[1], b[1]) / CS); j <= Math.floor(Math.max(a[1], b[1]) / CS); j++) { const c = cella(i, j); (H.get(c) || H.set(c, []).get(c)).push(si); } } });
    const mezzi = rd => rd.kind !== 'vicolo' && rd.kind !== 'sterrato' && !rd.pedonale;
    // [x, y, raggio, fra vie dei mezzi, mezza larghezza della via minore (la bocca del vicolo)]
    const add = (x, y, r, m, b) => { for (const q of J) if (hyp(q[0] - x, q[1] - y) < 4) { q[2] = Math.max(q[2], r); q[3] = q[3] || m; q[4] = Math.max(q[4], b); return; } J.push([x, y, r, m, b]); };
    const visti = new Set();
    for (const L of H.values()) for (let p = 0; p < L.length; p++) for (let q = p + 1; q < L.length; q++) {
      const [ra, a1, a2, wa] = seg[L[p]], [rb, b1, b2, wb] = seg[L[q]]; if (ra === rb) continue; const k = L[p] < L[q] ? L[p] + ',' + L[q] : L[q] + ',' + L[p]; if (visti.has(k)) continue; visti.add(k);
      const d1x = a2[0] - a1[0], d1y = a2[1] - a1[1], d2x = b2[0] - b1[0], d2y = b2[1] - b1[1], den = d1x * d2y - d1y * d2x; if (Math.abs(den) < 1e-9) continue;
      const t = ((b1[0] - a1[0]) * d2y - (b1[1] - a1[1]) * d2x) / den, u = ((b1[0] - a1[0]) * d1y - (b1[1] - a1[1]) * d1x) / den;
      if (t >= -.05 && t <= 1.05 && u >= -.05 && u <= 1.05) add(a1[0] + d1x * t, a1[1] + d1y * t, Math.max(wa, wb) / 2 + 2, mezzi(R[ra]) && mezzi(R[rb]), Math.min(wa, wb) / 2);
    }
    const dSeg = (x, y, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1e-9, t = cl(((x - a[0]) * dx + (y - a[1]) * dy) / L2, 0, 1); return hyp(a[0] + dx * t - x, a[1] + dy * t - y); };
    R.forEach((rd, ri) => { if (rd.closed) return; for (const e of [rd.pts[0], rd.pts[rd.pts.length - 1]]) { const i0 = Math.floor(e[0] / CS), j0 = Math.floor(e[1] / CS); let fatto = false;
      for (let i = i0 - 1; i <= i0 + 1 && !fatto; i++) for (let j = j0 - 1; j <= j0 + 1 && !fatto; j++) for (const si of H.get(cella(i, j)) || []) { const s = seg[si]; if (s[0] === ri) continue; if (dSeg(e[0], e[1], s[1], s[2]) < s[3] / 2 + 2) { add(e[0], e[1], Math.max(s[3], rd.w || 6) / 2 + 2, mezzi(rd) && mezzi(R[s[0]]), Math.min(s[3], rd.w || 6) / 2); fatto = true; break; } } } });
    const Z = [];
    try { const SG = typeof Segnaletica !== 'undefined' ? Segnaletica : null; if (SG) { const P = typeof window !== 'undefined' && SG.piano ? SG.piano() : null; for (const z of (P && P.zebre && P.zebre.length ? P.zebre : SG.crossings35 ? SG.crossings35() : [])) Z.push([z.x, z.y, 2, true, 2]); } } catch (e) { }
    return (INC = { R0, n: R0.length, J, Z });
  }
  UP.incroci = incroci;
  // gli incroci veri (fra vie dei mezzi: non vicoli, sterrati, vie pedonali) e le zebre contano per intero; la bocca di un vicolo (o di uno
  // sterrato) solo da vicino: non si chiude (UP.CFG_BOCCA m liberi), ma nei borghi ce n'è una ogni 10 m e la via fra due bocche è dritta
  function lontanoIncrocio(x, y, bocca) { const I = incroci(); let b = Infinity; for (const L of [I.J, I.Z]) for (const q of L) { const d = hyp(q[0] - x, q[1] - y) - (q[3] ? q[2] : q[4] + (bocca === undefined ? UP.CFG_BOCCA : bocca) - UP.CFG_INCROCIO); if (d < b) b = d; } return b; }
  UP.lontanoIncrocio = lontanoIncrocio;
  UP.CFG_INCROCIO = 8; UP.CFG_BOCCA = 1.5;   // i metri liberi fra un incrocio (o una zebra) e il capo del presidio, della barricata; dalla bocca di un vicolo
  // la ricerca del posto per un tipo: genera la forma per il posto (la barricata dipende dalla via), la mette, la controlla; se no sposta,
  // gira, cambia via. o: { x, y, seme, altri, R, folle, altezza, mezzo, corso (la baracca sul corso), vie (filtro), max }
  // → { S: { x, y, a, z0, rd, via, w, lato }, prog } | null (con UP.ultimoNo: i motivi)
  // [presidio] il tratto lungo la via (y locale) da un capo all'altro dell'impronta, più riserva m per capo (il presidio: la barricata
  // che chiude e l'auto che si ferma), a meno di UP.CFG_INCROCIO m da un incrocio o da una zebra? (un punto ogni metro)
  // Con rd: e la via resta dritta per tutto il tratto (la mezzeria a meno di 60 cm dall'asse del posto): niente curve sotto lo striscione.
  function vicinoIncrocio(S, F, riserva, rd) {
    const c = Math.cos(S.a), s = Math.sin(S.a), y0 = F[1] - riserva, y1 = F[3] + riserva, n = Math.max(2, Math.ceil(y1 - y0)), P = rd && rd.pts;
    const dRd = (x, y) => { let b = Infinity; for (let k = 0; k < P.length - 1; k++) { const a = P[k], q = P[k + 1]; if (Math.abs(a[0] - x) > 30 || Math.abs(a[1] - y) > 30) continue; const dx = q[0] - a[0], dy = q[1] - a[1], L2 = dx * dx + dy * dy || 1e-9, t = cl(((x - a[0]) * dx + (y - a[1]) * dy) / L2, 0, 1); b = Math.min(b, hyp(a[0] + dx * t - x, a[1] + dy * t - y)); } return b; };
    for (let i = 0; i <= n; i++) { const ly = y0 + (y1 - y0) * i / n, x = S.x - s * ly, y = S.y + c * ly; if (lontanoIncrocio(x, y) < UP.CFG_INCROCIO) return 'incrocio'; if (P && dRd(x, y) > .6) return 'curva'; }
    return '';
  }
  UP.vicinoIncrocio = vicinoIncrocio;
  function sito(st, tipo, o) {
    const T = TIPI[tipo]; if (!T || !G) return null; const R = Math.max(o.R || 90, tipo === 'rampa' ? 160 : 0), no = {}, max = o.max || (tipo === 'rampa' ? 900 : 320); let prove = 0;
    const segna = m => { no[m] = (no[m] || 0) + 1; };
    const prova = (S, prog, opz) => { if (++prove > max) return false; if (o.vieta) { const v = o.vieta(S); if (v) { segna(v); return false; } } const F = impronta(prog.parti), m = controlla(st, S, F, opz); if (m) { segna(m.split(':')[0]); return false; } return true; };
    const fine = (S, prog, V) => { S.z0 = tipo === 'zattera' ? UP.WL : r2(UP.quota(S.x, S.y)); S.rd = V && V.rd ? V.rd.id : null; S.via = V && V.rd ? V.rd.name || (tipo === 'baracca' ? 'il corso' : 'la via') : nomeZona(S); S.w = V ? V.w : 0; S.x = r2(S.x); S.y = r2(S.y); S.a = r3(S.a); UP.ultimoNo = no; return { S, prog }; };
    const progDi = (k, extra) => progetta(tipo, o.seme + '|' + k, Object.assign({ altezza: o.altezza, folle: o.folle, mezzo: o.mezzo }, extra || {}));
    if (tipo === 'barricata' || tipo === 'presidio') {
      const pr = tipo === 'presidio', V = puntiVia(o.x, o.y, Math.max(R, 150), rd => rd.id !== 'corso' && (rd.kind === 'citta' || rd.kind === 'vicolo' || rd.kind === 'strada') && (rd.w || 6) >= (pr ? 5.6 : 5) && (rd.w || 6) <= (pr ? 9 : 8.5), 1.5);
      let k = 0; for (const v of V) { for (const lato of pr ? [1] : [o.lato || 1, -(o.lato || 1)]) { const a = v.th + PI / 2, gira = !!(o.verso && Math.sin(a) * o.verso[0] - Math.cos(a) * o.verso[1] > 0);   // il davanti verso chi guarda
        const prog = progDi(k++, { w: v.w, lato, varco: 1.8, gira }); if (!prog) continue; const S = { x: v.x, y: v.y, a, lato };
        { const m = vicinoIncrocio(S, impronta(prog.parti), pr ? 3.2 : .6, v.rd); if (m) { segna(m); continue; } }
        if (prova(S, prog, { suolo: pr ? 'via' : 'strada', altri: o.altri })) { const f = fine(S, prog, v); f.S.lato = lato; f.S.varco = prog.meta.varco; return f; } if (prove > max) break; } if (prove > max) break; }
      UP.ultimoNo = no; return null;
    }
    if (tipo === 'zattera' || tipo === 'ponte') return sitoAcqua(st, tipo, o, progDi, prova, fine, no);
    // gli altri: sul bordo delle vie (lasciando il passaggio) e nelle piazze; la rampa con la rincorsa e l'atterraggio liberi
    const filtro = tipo === 'baracca' && o.corso ? (rd => rd.id === 'corso') : (rd => (rd.kind === 'citta' || rd.kind === 'vicolo' || rd.kind === 'piazza') && (rd.w || 6) >= (tipo === 'rampa' ? 7 : 5));
    const V = puntiVia(o.x, o.y, R, filtro, tipo === 'rampa' ? 4 : 3);
    for (let ci = 0; ci < V.length && prove <= max; ci++) {
      const v = V[ci], prog = progDi(ci % 3); if (!prog) continue; const F = impronta(prog.parti), lun = F[2] - F[0], lar = F[3] - F[1];
      const dirs = tipo === 'rampa' ? [0, PI] : [0, PI / 2, PI, -PI / 2];
      // chi guarda (o.verso): il davanti (−y locale) verso di lui, la catapulta e la rampa di traverso alla vista
      if (o.verso) { const sc = da => { const a = v.th + da; return tipo === 'baracca' || tipo === 'palco' || tipo === 'torre' ? Math.sin(a) * o.verso[0] - Math.cos(a) * o.verso[1] : Math.abs(Math.cos(a) * o.verso[0] + Math.sin(a) * o.verso[1]); }; dirs.sort((p, q) => sc(p) - sc(q)); }
      for (const da of dirs) {
        const a = v.th + da, along = Math.abs(Math.cos(da)) > .5, half = (along ? lar : lun) / 2, hw = v.w / 2;
        for (const side of tipo === 'rampa' ? [1, -1, 0] : [1, -1]) {
          const off = side * Math.max(0, hw - half - .35), nx = -Math.sin(v.th), ny = Math.cos(v.th), S = { x: v.x + nx * off, y: v.y + ny * off, a };
          const opz = { suolo: 'strada', altri: o.altri, via: v, passaggio: 3, salta: o.salta };
          if (tipo === 'rampa') opz.corridoi = [[F[0] - 11, F[1] - .3, F[0] - .1, F[3] + .3], [F[2] + .1, F[1] - .6, F[2] + 13, F[3] + .6]];
          if (tipo === 'catapulta') opz.corridoi = [[F[0] - 10, F[1] - .5, F[0] - .1, F[3] + .5]];   // dove tira: niente case, niente mezzi
          if (prova(S, prog, opz)) return fine(S, prog, v);
        }
      }
      if (prove > max * .6) break;   // il resto delle prove alle piazze
    }
    // le piazze (e i piazzali): una griglia di 6 m attorno, quattro versi
    if (!(tipo === 'baracca' && o.corso)) {
      const TS = G.TS, cx = Math.floor(o.x / TS), cy = Math.floor(o.y / TS), RT = Math.ceil(R / TS), PZ = [], okP = SUOLI.piazza();
      for (let dy = -RT; dy <= RT; dy += 3) for (let dx = -RT; dx <= RT; dx += 3) { const tx = cx + dx, ty = cy + dy; if (G.tileAt(tx, ty) !== G.T.PIAZZA) continue; PZ.push([dx * dx + dy * dy, (tx + .5) * TS, (ty + .5) * TS]); }
      PZ.sort((a, b) => a[0] - b[0]);
      for (let ci = 0; ci < PZ.length && prove <= max; ci++) {
        const [, x, y] = PZ[ci], prog = progDi(ci % 3 + 3); if (!prog) continue; const F = impronta(prog.parti);
        const dirs = [0, PI / 2, PI, -PI / 2];
        if (o.verso) { const sc = a => tipo === 'baracca' || tipo === 'palco' || tipo === 'torre' ? Math.sin(a) * o.verso[0] - Math.cos(a) * o.verso[1] : Math.abs(Math.cos(a) * o.verso[0] + Math.sin(a) * o.verso[1]); dirs.sort((p, q) => sc(p) - sc(q)); }
        for (const a of dirs) {
          const S = { x, y, a }, opz = { suolo: 'piazza', altri: o.altri, salta: o.salta };
          if (tipo === 'rampa') opz.corridoi = [[F[0] - 11, F[1] - .3, F[0] - .1, F[3] + .3], [F[2] + .1, F[1] - .6, F[2] + 13, F[3] + .6]];
          if (tipo === 'catapulta') opz.corridoi = [[F[0] - 10, F[1] - .5, F[0] - .1, F[3] + .5]];   // dove tira: niente case, niente mezzi
          if (prova(S, prog, opz)) return fine(S, prog, null);
        }
      }
    }
    UP.ultimoNo = no; return null;
  }
  UP.sito = sito;
  function nomeZona(S) { const P = G.PLACES || {}; let b = null, bd = 80; for (const k in P) { const q = P[k], d = hyp(q.x - S.x, q.y - S.y); if (d < bd) { bd = d; b = q.name || q.label || k; } } return b || 'lì'; }
  // l'acqua: la zattera sul pelo dell'acqua accanto a una riva; il ponte su un fosso stretto (1-3 caselle d'acqua fra due rive)
  function sitoAcqua(st, tipo, o, progDi, prova, fine, no) {
    const TS = G.TS, W = G.T.WATER, cx = Math.floor(o.x / TS), cy = Math.floor(o.y / TS), RT = Math.ceil((o.R || 140) / TS), riva = v => v !== W && v !== G.T.BLD && v !== undefined;
    const C = [];
    for (let dy = -RT; dy <= RT; dy++) for (let dx = -RT; dx <= RT; dx++) { const tx = cx + dx, ty = cy + dy; if (G.tileAt(tx, ty) !== W) continue; C.push([dx * dx + dy * dy, tx, ty]); }
    C.sort((a, b) => a[0] - b[0]);
    let k = 0;
    for (const [, tx, ty] of C) {
      if (tipo === 'zattera') {
        for (const [ex, ey] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { if (!riva(G.tileAt(tx + ex, ty + ey))) continue; if (G.tileAt(tx - ex, ty - ey) !== W || G.tileAt(tx - 2 * ex, ty - 2 * ey) !== W) continue;
          const prog = progDi(k++); if (!prog) continue; const S = { x: (tx + .5) * TS - ex * .3, y: (ty + .5) * TS - ey * .3, a: Math.atan2(ex, -ey) };
          if (prova(S, prog, { suolo: 'acqua', altri: o.altri })) return fine(S, prog, null); }
      } else {
        for (const [ex, ey] of [[1, 0], [0, 1]]) { let n = 1; while (n <= 3 && G.tileAt(tx + ex * n, ty + ey * n) === W) n++; if (n > 3 || !riva(G.tileAt(tx + ex * n, ty + ey * n)) || !riva(G.tileAt(tx - ex, ty - ey))) continue;
          const gap = n * TS - .2, prog = progDi(k++, { gap }); if (!prog || prog.parti.length > 40) continue;
          const S = { x: (tx + n / 2) * TS * (ex ? 1 : 0) + (tx + .5) * TS * (ex ? 0 : 1), y: (ty + n / 2) * TS * (ey ? 1 : 0) + (ty + .5) * TS * (ey ? 0 : 1), a: Math.atan2(ey, ex) };
          if (prova(S, prog, { suolo: 'piazza', altri: o.altri, ponte: 1, piano: .5 })) return fine(S, prog, null); }
      }
      if (k > 60) break;
    }
    UP.ultimoNo = no; return null;
  }
  return UP;
})();
if (typeof window !== 'undefined') window.UnicoParti = UnicoParti;
