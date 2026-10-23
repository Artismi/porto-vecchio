/* Porto Vecchio — I personaggi: corpo, testa e vestiti costruiti da un descrittore, legati allo scheletro del kit.
   Lo scheletro e le clip (camminata, fermo, corsa…) restano quelli di sempre (Quaternius, letti da models.js), e così tutte le
   pose di animazioni.js / anim_*.js: cambia solo la pelle. Il corpo è fatto di sezioni lungo le ossa (busto, braccia, gambe),
   i vestiti sono strati veri sulle stesse sezioni: ogni capo ha il suo spessore, il suo orlo e il suo gradino, e copre la pelle
   (sotto un capo la pelle non c'è: niente compenetrazioni). Gonne, falde, grembiuli e scialli pendono per conto loro.
   Un materiale solo per tutta la gente: colori per vertice e un atlante di disegni (abbottonature, tasche, revers, righe, quadri,
   fiori, maglia) letto nello shader. Varietà per combinazione (corpo × testa × vestiti × colori) da un seme.
   API:  Personaggi.descrittore(look, who, npc) → D      (deterministico)
         Personaggi.figura(D)                    → gruppo come Models.person (userData compatibile)
         Personaggi.geometria(D, skeleton, rel)  → BufferGeometry skinned (per le versioni a distanza)
         Personaggi.POSE                         → le clip dello scheletro
   ?vecchiagente torna ai modelli del kit vestiti da Vesti3D. */
var Personaggi = (function () {
  'use strict';
  const Q = typeof location !== 'undefined' ? location.search : '';
  const CFG = { on: !/[?&]vecchiagente\b/.test(Q), stile: ((Q.match(/[?&]stile=([abc])/i) || [])[1] || 'b').toLowerCase() };
  const cl = (x, a, b) => x < a ? a : x > b ? b : x, lerp = (a, b, t) => a + (b - a) * t, sm = t => (t = cl(t, 0, 1), t * t * (3 - 2 * t));
  const spow = (v, e) => Math.sign(v) * Math.pow(Math.abs(v), e);
  function rng(seed) { let h = 2166136261; for (const ch of String(seed)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h |= 0; h = (h + 0x6D2B79F5) | 0; let t = Math.imul(h ^ (h >>> 15), 1 | h); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const C3 = c => { const k = new THREE.Color(c); return [k.r, k.g, k.b]; };
  const mulc = (c, k) => [c[0] * k, c[1] * k, c[2] * k], mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

  // =====================================================================================
  // GLI STILI (la tavola di prova): proporzioni, forme delle sezioni, ombreggiatura
  // =====================================================================================
  const BRACCIO = 1.07;   // [personaggi] le braccia del kit sono corte: +7% scalando l'osso del braccio (la scala non è nelle clip)
  const STILI = {
    a: { nome: 'Statuina dipinta', testa: 1, mani: 1, piedi: 1, naso: 1, p: 2.25, seg: 16, spalle: 1, toon: 0, contorno: 0 },
    b: { nome: 'Linea chiara', testa: 1.08, mani: 1, piedi: 1, naso: .6, p: 3.1, seg: 14, pTesta: 2.7, spalle: 1, toon: 3, contorno: .008 },
    c: { nome: 'Carosello', testa: 1.55, mani: 1.4, piedi: 1.35, naso: 1.8, p: 2.0, seg: 16, spalle: .9, toon: 3, contorno: 0 },
  };
  const S = () => STILI[CFG.stile] || STILI.a;

  // =====================================================================================
  // IL COSTRUTTORE DI GEOMETRIA: vertici con colore, secondo colore, coordinate dell'atlante e pesi sulle ossa
  // =====================================================================================
  function Builder() { this.P = []; this.N = []; this.C = []; this.C2 = []; this.C3 = []; this.L = []; this.M = []; this.W = []; this.O = []; this.I = []; this.n = 0; this.ol = 1; }
  Builder.prototype.v = function (p, c, c2, c3, l, m, w) {
    this.P.push(p[0], p[1], p[2]); this.N.push(0, 0, 0); this.C.push(c[0], c[1], c[2]); this.C2.push(c2[0], c2[1], c2[2]); this.C3.push(c3[0], c3[1], c3[2]);
    this.L.push(l[0], l[1], l[2]); this.M.push(m[0], m[1], m[2]); this.W.push(w); this.O.push(this.ol); return this.n++;
  };
  // normali lisce sul tratto appena aggiunto (dal vertice v0, dall'indice i0); i triangoli girati verso l'esterno rispetto a 'ctr'
  Builder.prototype.chiudi = function (v0, i0, ctrFn) {
    const P = this.P, I = this.I, N = this.N; let s = 0;
    const tri = (k, f) => { const a = I[k] * 3, b = I[k + 1] * 3, c = I[k + 2] * 3; const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2]; return f(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx, a, b, c); };
    if (ctrFn) for (let k = i0; k < I.length; k += 3) s += tri(k, (nx, ny, nz, a) => { const q = ctrFn(I[k]); return nx * (P[a] - q[0]) + ny * (P[a + 1] - q[1]) + nz * (P[a + 2] - q[2]); });
    if (s < 0) for (let k = i0; k < I.length; k += 3) { const t = I[k + 1]; I[k + 1] = I[k + 2]; I[k + 2] = t; }
    for (let k = i0; k < I.length; k += 3) tri(k, (nx, ny, nz, a, b, c) => { for (const q of [a, b, c]) { N[q] += nx; N[q + 1] += ny; N[q + 2] += nz; } });
    for (let i = v0; i < this.n; i++) { const q = i * 3, l = Math.hypot(N[q], N[q + 1], N[q + 2]) || 1; N[q] /= l; N[q + 1] /= l; N[q + 2] /= l; }
  };
  const ZERO = [0, 0, 0];
  // Una superficie a sezioni (loft). rings: [{ c:[x,y,z], t:asse, f:davanti, a: raggio di lato, b: raggio davanti, p, col, col2, col3, w: pesi, v, mv, ao, mod(θ) }]
  // Ogni sezione è una superellisse; θ=0 davanti. u dell'atlante: il davanti a 0,5, la cucitura dietro.
  function loft(B, rings, o) {
    o = o || {}; const seg = o.seg || S().seg, v0 = B.n, i0 = B.I.length, tile = o.tile || 0, pt = o.ptile || 0, prep = o.prep || 1;
    const ctrs = [];
    rings.forEach((r, j) => {
      const t = norm(r.t), f0 = r.f || [0, 0, 1]; let f = sub(f0, mul(t, dot(f0, t))); if (Math.hypot(f[0], f[1], f[2]) < 1e-4) f = sub([0, 1, 0], mul(t, dot([0, 1, 0], t))); f = norm(f); const s = cross(t, f);
      const e = 2 / (r.p || o.p || S().p), circ = Math.PI * (r.a + r.b);
      for (let k = 0; k <= seg; k++) {
        const th = (k / seg - .5) * Math.PI * 2, d = 1 + (r.mod ? r.mod(th, r) : 0) + (o.mod ? o.mod(th, r, j) : 0);
        const sx = spow(Math.sin(th), e) * r.a * d + (r.sz || 0), fz = spow(Math.cos(th), e) * r.b * d + (r.fz || 0);
        const p = [r.c[0] + s[0] * sx + f[0] * fz, r.c[1] + s[1] * sx + f[1] * fz, r.c[2] + s[2] * sx + f[2] * fz];
                const ao = r.ao === undefined ? 1 : r.ao, colv = r.colFn ? r.colFn(th, r) : r.col;
        const w = o.wfn ? o.wfn(p, r, th) : r.w;
        let uA = k / seg; if (o.flipU) uA = 1 - uA; if (o.uS) uA = .5 + (uA - .5) * o.uS;   // flipU: la gamba e il braccio destri a specchio; uS: la faccia allargata nella sua tessera
        B.v(p, mulc(colv, ao), r.col2 || ZERO, r.col3 || ZERO, [uA, r.v || 0, r.tile !== undefined ? r.tile : tile], [k / seg * circ * prep, (r.mv || 0) * prep, r.ptile !== undefined ? r.ptile : pt], w);
        ctrs.push(r.c);
      }
    });
    for (let j = 0; j < rings.length - 1; j++) for (let k = 0; k < seg; k++) { const a = v0 + j * (seg + 1) + k, b = a + 1, c = a + seg + 1, d = c + 1; B.I.push(a, c, b, b, c, d); }
    B.chiudi(v0, i0, o.dentro ? null : (vi => ctrs[vi - v0]));
    if (o.dentro) { for (let k = i0; k < B.I.length; k += 3) { const t = B.I[k + 1]; B.I[k + 1] = B.I[k + 2]; B.I[k + 2] = t; } for (let i = v0; i < B.n; i++) { B.N[i * 3] *= -1; B.N[i * 3 + 1] *= -1; B.N[i * 3 + 2] *= -1; } }
    return v0;
  }
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  // un ellissoide (o un uovo, con 'punta') lungo un asse: per teste, ciocche, mani, nasi, bottoni
  function uovo(B, c, ax, ra, rb, rl, col, w, o) {
    o = o || {}; const n = o.anelli || 5, t = norm(ax), rings = [];
    for (let j = 0; j <= n; j++) {
      const ph = j / n * Math.PI, y = -Math.cos(ph), q = Math.sin(ph), pk = o.punta ? (1 + o.punta * y) : 1, k = Math.max(q, .02) * pk;
      rings.push({ c: add(c, mul(t, y * rl)), t, f: o.f || [0, 0, 1], a: ra * k, b: rb * k, p: o.p || 2.2, col: o.colFn ? o.colFn(y) : col, w, ao: o.ao, col2: o.col2, tile: o.tile });
    }
    return loft(B, rings, { seg: o.seg || 8, wfn: o.wfn });
  }

  // =====================================================================================
  // LO SCHELETRO: le giunture nella posa di riferimento (a T), in metri nello spazio del personaggio
  // =====================================================================================
  function giunture(g, mesh) {
    g.updateMatrixWorld(true); const gi = new THREE.Matrix4().copy(g.matrixWorld).invert(), rel = new THREE.Matrix4().multiplyMatrices(gi, mesh.matrixWorld), J = {}, m = new THREE.Matrix4(), v = new THREE.Vector3();
    mesh.skeleton.bones.forEach((b, i) => { m.copy(mesh.skeleton.boneInverses[i]).invert().premultiply(rel); v.setFromMatrixPosition(m); J[b.name] = [v.x, v.y, v.z]; });
    return { J, rel };
  }
  // pesi lungo una catena di ossa: t è la coordinata lungo la catena, tj le giunture (inizio di ciascun osso), bl la mezza larghezza della fusione
  function catena(t, tj, bones, bl) {
    let k = 0; while (k < tj.length - 1 && t >= tj[k + 1]) k++;
    for (let j = 1; j < tj.length; j++) { const b = Array.isArray(bl) ? bl[j] : bl; if (Math.abs(t - tj[j]) < b) { const u = sm((t - (tj[j] - b)) / (2 * b)); return [[bones[j - 1], 1 - u], [bones[j], u]]; } }
    return [[bones[k], 1]];
  }
  const mescola = (a, b, t) => { const m = new Map(); a.forEach(([n, w]) => m.set(n, (m.get(n) || 0) + w * (1 - t))); b.forEach(([n, w]) => m.set(n, (m.get(n) || 0) + w * t)); return [...m.entries()].filter(e => e[1] > 1e-3); };

  // =====================================================================================
  // IL CORPO: profili per tipo (sezioni in metri attorno alla catena), adattati alle giunture
  // =====================================================================================
  // busto: [quota relativa (0 inguine … 1 collo), mezza larghezza, mezza profondità, spostamento in avanti]
  const BUSTO = {
    // [misure] prese dai modelli del kit (Casual_2, Casual) nella posa a T: stesse larghezze e profondità di oggi
    m: [[0, .118, .09, .0], [.14, .132, .098, .0], [.34, .12, .094, .01], [.52, .122, .098, .015], [.68, .136, .104, .015], [.8, .148, .1, .0], [.9, .14, .086, -.01], [1, .058, .056, .0]],
    f: [[0, .124, .09, .0], [.14, .14, .1, -.008], [.36, .1, .078, .008], [.52, .106, .082, .018], [.66, .118, .1, .03], [.8, .124, .088, .0], [.91, .112, .074, -.01], [1, .048, .048, .0]],
  };
  function corpoDi(D, J) {
    const st = S(), f = D.sesso === 'f', C = D.corpo || {}, pan = C.pancia || 0, rob = C.robusto || 1, spa = (C.spalle || 1) * st.spalle;
    const yN = J.Neck[1], yC = J.UpperLegL[1] - .07, prof = BUSTO[f ? 'f' : 'm'].map(([q, a, b, fz]) => {
      let A = a * rob, Bz = b * rob, F = fz;
      if (q > .6 && q < .95) A *= lerp(1, spa, sm((q - .6) / .25));
      if (q > .2 && q < .72) { const k = Math.sin((q - .2) / .52 * Math.PI); A += pan * .03 * k; Bz += pan * .06 * k; F += pan * .04 * k; }
      if (q < .3 && C.fianchi) A *= 1 + (C.fianchi - 1) * Math.sin(q / .3 * Math.PI * .5 + .5);
      return [lerp(yC, yN + .045, q), A, Bz, F];
    });
    return { prof, gamba: (f ? .07 : .074) * rob * (1 + pan * .1), braccio: (f ? .04 : .046) * rob, pan };
  }

  // =====================================================================================
  // GLI STRATI SULLE CATENE: per ogni punto della catena il capo più esterno decide colore e raggio
  // =====================================================================================
  // Un capo su una catena: { da, a (coordinate della catena), sp (spessore), col, tile, ptile, col2, col3, orlo (larghezza del bordo), orloSp, mod }
  function strati(lista, t) { let sp = 0, top = null; for (const L of lista) if (t >= L.da - 1e-6 && t <= L.a + 1e-6) { sp += L.sp; top = L; } return { sp, top }; }
  // tratti della catena a capo esterno costante, con le giunzioni (gradini dove un capo finisce)
  function tratti(lista, t0, t1, campioni) {
    const cuts = new Set([t0, t1]); lista.forEach(L => { [L.da, L.a].forEach(x => { if (x > t0 + 1e-6 && x < t1 - 1e-6) cuts.add(x); }); if (L.orlo) { [L.da + L.orlo, L.a - L.orlo].forEach(x => { if (x > Math.max(t0, L.da) + 1e-6 && x < Math.min(t1, L.a) - 1e-6) cuts.add(x); }); } });
    const cs = [...cuts].sort((a, b) => a - b), out = [];
    for (let i = 0; i < cs.length - 1; i++) {
      const a = cs[i], b = cs[i + 1], mid = (a + b) / 2, S0 = strati(lista, mid); let extra = 0;
      if (S0.top && S0.top.orlo && (mid - S0.top.da < S0.top.orlo || S0.top.a - mid < S0.top.orlo) && !(S0.top.orloSolo === 'giu' && mid - S0.top.da > S0.top.a - mid) && !(S0.top.orloSolo === 'su' && mid - S0.top.da < S0.top.a - mid)) extra = S0.top.orloSp || .006;
      const ts = [a]; campioni.forEach(x => { if (x > a + 1e-4 && x < b - 1e-4) ts.push(x); }); ts.push(b);
      out.push({ a, b, ts, top: S0.top, sp: S0.sp + extra, orlo: extra > 0 });
    }
    return out;
  }
  // costruisce una catena a strati: geom(t) → { c, t, f, a, b, fz, w, ao } (la sezione del corpo nudo); pelle = colore della pelle
  function catenaStrati(B, lista, t0, t1, campioni, geom, pelle, o) {
    o = o || {}; const T = tratti(lista, t0, t1, campioni); let prev = null;
    const ring = (t, tr, v) => { const G = geom(t), L = tr.top, sp = tr.sp, mod = L && L.mod ? (th => L.mod(th, t)) : null;
      return Object.assign({}, G, { a: G.a + sp, b: G.b + sp, col: L ? (tr.orlo && L.colOrlo ? L.colOrlo : L.col) : pelle, col2: L && L.col2, col3: L && L.col3, tile: L ? (L.tile || 0) : 0, ptile: L ? (L.ptile || 0) : 0, v: L ? cl((t - L.da) / ((L.a - L.da) || 1), 0, 1) : 0, mv: t * (o.lung || 1), mod, colFn: L && L.colFn ? ((th) => L.colFn(th, t)) : null }); };
    T.forEach(tr => {
      const rs = tr.ts.map(t => ring(t, tr));
      if (prev) {   // il gradino: dall'orlo del tratto prima al tratto nuovo, del colore del capo più esterno dei due
        const r0 = prev, r1 = rs[0], outer = (r0.a > r1.a ? r0 : r1), inner = outer === r0 ? r1 : r0;
        if (Math.abs(r0.a - r1.a) > .0015) loft(B, [Object.assign({}, inner, { col: outer.col, ao: .62, colFn: null, col2: outer.col2, tile: 0 }), Object.assign({}, outer, { ao: (outer.ao || 1) * .9 })], { seg: o.seg, mod: o.mod, wfn: o.wfn });
      }
      loft(B, rs, { seg: o.seg, mod: o.mod, wfn: o.wfn, flipU: o.flipU }); prev = rs[rs.length - 1];
    });
  }

  // =====================================================================================
  // I CAPI: dal descrittore ai pezzi sulle catene (busto 0..1, braccio 0..1, gamba 0..1) e ai pezzi liberi
  // =====================================================================================
  // tessere dell'atlante (disegni): 0 liscio
  const TL = { liscio: 0, camicia: 1, giacca: 2, divisa: 3, cerata: 4, grembiule: 5, maglione: 6, canotta: 7, abito: 8, tuta: 9, cappotto: 10, gilet: 11, bande: 12, maglietta: 13, stampa: 14, felpa: 15,
    jeans: 24, calzoni: 25, manica: 27, polsino: 28, sneaker: 32, suola: 33, scarpa: 34, cappellino: 36, bomber: 38, faccia: 40 };
  const PT = { liscio: 0, righe: 1, quadri: 2, fiori: 3, maglia: 4, pois: 5, righine: 6 };
  // [catena, da, a, spessore, extra]
  const CAPI = {
    canottiera: { busto: [.05, .97, .004], tile: 'canotta' },
    maglietta: { busto: [.05, .98, .005], braccio: [0, .3, .005], orlo: .025, tile: 'maglietta', manica: 'manica' },
    maglietta_righe: { busto: [.05, .98, .005], braccio: [0, .85, .005], ptile: 'righe', orlo: .02 },
    camicia: { busto: [.02, .99, .006], braccio: [0, .95, .006], tile: 'camicia', orlo: .03, polsino: 1, colletto: 'camicia', manica: 'manica' },
    camicia_corta: { busto: [.02, .99, .006], braccio: [0, .38, .006], tile: 'camicia', orlo: .03, colletto: 'camicia' },
    maglione: { busto: [.0, 1, .014], braccio: [0, .96, .012], tile: 'maglione', ptile: 'maglia', orlo: .06, orloSp: .005, colletto: 'giro' },
    felpa: { busto: [-.02, 1, .016], braccio: [0, .97, .014], orlo: .06, orloSp: .006, colletto: 'cappuccio', tile: 'felpa', manica: 'polsino' },
    gilet: { busto: [.08, .9, .012], tile: 'gilet', orlo: .02 },
    giacca: { busto: [-.08, 1, .016], braccio: [0, .93, .014], tile: 'giacca', orlo: .03, colletto: 'revers', svasa: .012, manica: 'manica' },
    divisa: { busto: [-.08, 1, .018], braccio: [0, .94, .015], tile: 'divisa', orlo: .03, colletto: 'alto', cintura: 1, spalline: 1, svasa: .012, manica: 'manica' },
    cappotto: { busto: [-.03, 1, .02], braccio: [0, .95, .018], tile: 'cappotto', orlo: .03, colletto: 'revers', falda: [0, .58, 1.05] },
    cerata: { busto: [-.03, 1, .02], braccio: [0, .95, .02], tile: 'cerata', orlo: .05, orloSp: .008, colletto: 'alto', falda: [0, .6, 1.1] },
    tuta: { busto: [-.02, .97, .012], braccio: [0, .95, .012], gamba: [-.05, .96, .012], tile: 'tuta', orlo: .03, colletto: 'camicia' },
    abito: { busto: [-.02, .97, .006], braccio: [0, .25, .006], tile: 'abito', orlo: .02, gonna: [.3, .62, 1.3], colletto: 'tondo' },
    pantaloni: { gamba: [-.06, .985, .008], orlo: .02, bacino: .008, gtile: 'calzoni', cintura2: 1 },
    zampa: { gamba: [-.06, .99, .008], orlo: .02, zampa: .03, bacino: .008, gtile: 'jeans', cintura2: 1 },
    pantaloncini: { gamba: [-.06, .3, .008], orlo: .03, bacino: .008 },
    gonna: { gonna: [.3, .56, 1.25], bacino: .006 },
    grembiule: { grembiule: [.4, .95] },
    scialle: { scialle: 1 },
    calze: { gamba: [.55, 1, .002] },
    maglietta_larga: { busto: [-.07, 1, .024], braccio: [0, .48, .026], orlo: .03, tile: 'stampa', manica: 'manica', svasa: .02 },
    felpa_larga: { busto: [-.07, 1, .03], braccio: [0, .99, .026], orlo: .07, orloSp: .008, colletto: 'cappuccio', tile: 'felpa', manica: 'polsino', svasa: .012 },
    tuta_giacca: { busto: [-.02, 1, .02], braccio: [0, .97, .018], tile: 'tuta', orlo: .05, orloSp: .006, colletto: 'alto', bande: 1 },
    bomber: { busto: [-.02, 1, .034], braccio: [0, .97, .03], tile: 'bomber', orlo: .07, orloSp: .01, colletto: 'giro', manica: 'polsino' },
    larghi: { gamba: [-.06, 1, .014], orlo: .02, dritti: 1, bacino: .012, gtile: 'jeans', cintura2: 1 },
    jeans: { gamba: [-.06, .99, .01], orlo: .02, bacino: .01, gtile: 'jeans', cintura2: 1 },
    tuta_pantaloni: { gamba: [-.06, 1, .012], orlo: .05, orloSp: .006, dritti: .6, bacino: .01, bande: 1 },
    catena: { catena: 1 },
  };
  // scarpe: [altezza del gambale (0 scarpa bassa … 1 al ginocchio), punta, tacco]
  const SCARPE = { sneakers: [0, 1.06, 0, 0, 1], basket: [.07, 1.08, 0, 0, 1], scarpe: [0, 1, 0], stivali: [.62, 1.05, 0], stivaletti: [.12, 1, 0], sandali: [0, .95, 0, 1], tacchi: [0, .85, 1], ciabatte: [0, .95, 0, 1], scarponi: [.15, 1.12, 0] };

  // =====================================================================================
  // LA FIGURA: costruisce la geometria nello spazio del personaggio
  // =====================================================================================
  function costruisci(D, J) {
    const B = new Builder(), st = S(), f = D.sesso === 'f', K = corpoDi(D, J), pelle = C3(D.pelle || '#d8a888');
    // l'ordine degli strati: le magliette dentro i pantaloni, i pantaloni sotto le felpe e le giacche (stabile a pari rango)
    const ORD = v => v.ord !== undefined ? v.ord : v.gamba && !v.busto ? 2 : /^(canottiera|maglietta|maglietta_righe|camicia|camicia_corta)$/.test(v.tipo) ? 1 : /cappotto|cerata/.test(v.tipo) ? 5 : /giacca|divisa|bomber|tuta_giacca/.test(v.tipo) ? 4 : v.busto ? 3 : 6;
    const vesti = (D.vesti || []).map((v, i) => Object.assign({}, CAPI[v.tipo] || {}, v, { col: C3(v.col || '#888'), col2: v.col2 ? C3(v.col2) : null, col3: v.col3 ? C3(v.col3) : null, _i: i })).map(v => Object.assign(v, { _o: ORD(v) })).sort((a, b) => a._o - b._o || a._i - b._i);
    // il colore che sta sotto ogni capo (per le aperture: lo scollo della giacca mostra la camicia)
    const sotto = (i, zona) => { for (let k = i - 1; k >= 0; k--) if (vesti[k][zona]) return vesti[k].col; return pelle; };
    const tileOf = v => TL[v.tile] || 0, ptOf = v => PT[v.ptile] || 0;
    // ---------------- BUSTO ----------------
    const spine = ['Hips', 'Abdomen', 'Torso', 'Chest', 'Neck', 'Head'], ys = spine.map(n => J[n][1]);
    const prof = K.prof, yC = prof[0][0], yT = prof[prof.length - 1][0];
    const profAt = y => { let i = 0; while (i < prof.length - 2 && y > prof[i + 1][0]) i++; const a = prof[i], b = prof[i + 1], t = sm((y - a[0]) / (b[0] - a[0])), tl = cl((y - a[0]) / (b[0] - a[0]), 0, 1); return [lerp(a[1], b[1], t * .5 + tl * .5), lerp(a[2], b[2], t * .5 + tl * .5), lerp(a[3], b[3], tl)]; };
    const zAt = y => { const i = Math.max(0, Math.min(ys.length - 2, ys.findIndex((v, k) => k < ys.length - 1 && y < ys[k + 1]))); const t = cl((y - ys[i]) / (ys[i + 1] - ys[i]), 0, 1); return lerp(J[spine[i]][2], J[spine[i + 1]][2], t); };
    const wBusto = (p) => {   // la colonna, e le spalle verso le ossa delle spalle
      const y = p[1]; let w = catena(y, ys, spine, [0, .05, .06, .07, .04, .03]);
      const sx = Math.abs(p[0]), k = sm((sx - .07) / .1) * sm((y - (J.Chest[1] - .08)) / .1);
      if (k > 0) w = mescola(w, [['Shoulder' + (p[0] > 0 ? 'L' : 'R'), 1]], k * .75);
      const kl = sm((J.UpperLegL[1] + .02 - y) / .08) * sm((sx - .02) / .1);   // l'inguine segue un po' le cosce
      if (kl > 0) w = mescola(w, [['UpperLeg' + (p[0] > 0 ? 'L' : 'R'), 1]], kl * .5);
      return w;
    };
    const tLen = yT - yC, tB = y => (y - yC) / tLen, yOf = t => yC + t * tLen;
    const geomB = t => { const y = yOf(t), P0 = profAt(y); return { c: [0, y, zAt(y)], t: [0, 1, 0], f: [0, 0, 1], a: P0[0], b: P0[1], fz: P0[2], ao: lerp(.82, 1, sm(t / .3)) }; };
    const listaB = [], listaA = [], listaG = [];
    vesti.forEach((v, i) => {
      const base = { col: v.col, col2: v.col2 || sotto(i, 'busto'), col3: v.col3 || mulc(v.col, .55), tile: tileOf(v), ptile: ptOf(v), orlo: v.orlo || 0, orloSp: v.orloSp, colOrlo: v.colOrlo ? C3(v.colOrlo) : null };
      if (v.busto) listaB.push(Object.assign({}, base, { da: v.busto[0], a: v.busto[1], sp: v.busto[2], svasa: v.svasa || 0 }, v.stampa || v.tile === 'stampa' ? { col2: v.col2 ? C3v(v.col2) : [.95, .94, .9] } : {}));
      const bnd = v.bande ? { tileC: TL.bande, col2: v.col3 ? C3v(v.col3) : [.95, .94, .9] } : {};
      if (v.braccio) listaA.push(Object.assign({}, base, bnd, { tile: bnd.tileC || (v.braccio[1] > .5 ? TL[v.manica] || TL.manica : 0), da: v.braccio[0], a: v.braccio[1], sp: v.braccio[2], orlo: v.polsino ? .1 : base.orlo ? .06 : 0, orloSp: v.polsino ? .004 : base.orloSp, orloSolo: 'giu', colOrlo: v.polsino ? base.col : null }));
      if (v.gamba) listaG.push(Object.assign({}, base, bnd, { dritti: v.dritti || 0, tile: bnd.tileC || TL[v.gtile] || 0, col2: bnd.col2 || (v.col2 ? C3v(v.col2) : mulc(v.col, .6)), da: v.gamba[0], a: v.gamba[1], sp: v.gamba[2], orlo: base.orlo ? .04 : 0, orloSolo: 'giu', zampa: v.zampa || 0 }));
      if (v.bacino && !v.busto) listaB.push(Object.assign({}, base, { tile: 0, ptile: ptOf(v), da: -.05, a: .2, sp: v.bacino, orlo: .05, orloSp: .004, orloSolo: 'su', colOrlo: mulc(v.col, .8) }));
    });
    const campB = []; for (let k = 0; k <= 13; k++) campB.push(-.15 + k / 13 * 1.15);
    // il busto parte un po' sotto l'inguine (chiuso dalle cosce) e arriva al collo; il collo fino a dentro la testa
    const tlo = Math.min(-.02, ...listaB.map(L => L.da)) - .001;
    catenaStrati(B, listaB, tlo, 1, campB, t => { const G = geomB(Math.max(t, 0)), Lt = strati(listaB, t).top, sv = Lt && Lt.svasa || 0; if (t < 0) { const k = 1 + t * (sv ? .3 : 2.2); G.a *= k; G.b *= k; } if (sv && t < .2) { const k = sv * sm((.2 - t) / .25); G.a += k; G.b += k * .9; } return G; }, pelle, { lung: tLen, wfn: p => wBusto(p) });
    // il fondo del busto: si chiude tra le cosce
    { const G = geomB(0), y0 = yOf(tlo); const L = strati(listaB, tlo + .002).top; loft(B, [{ c: [0, y0, G.c[2]], t: [0, 1, 0], a: G.a * (1 + tlo * 2.2) + .01, b: G.b * (1 + tlo * 2.2) + .01, col: L ? L.col : pelle, ao: .7, w: [['Hips', 1]] }, { c: [0, y0 - .01, G.c[2]], t: [0, 1, 0], a: .01, b: .01, col: L ? L.col : pelle, ao: .6, w: [['Hips', 1]] }]); }
    // il collo e il pomo: dentro la testa
    loft(B, [0, .5, 1].map(q => { const y = lerp(yT - .01, J.Head[1] + .05, q); return { c: [0, y, lerp(J.Neck[2], J.Head[2] - .005, q)], t: [0, 1, 0], a: (f ? .038 : .047) * (D.corpo && D.corpo.robusto || 1) * lerp(1, .92, q), b: (f ? .038 : .045) * lerp(1, .9, q), col: pelle, ao: lerp(.8, .9, q), w: catena(y, ys, spine, [0, .05, .06, .07, .03, .025]) }; }));
    // ---------------- BRACCIA ----------------
    ['L', 'R'].forEach(sd => {
      const sg = sd === 'L' ? 1 : -1, j0 = J['UpperArm' + sd], j1 = J['LowerArm' + sd], j2 = J['Wrist' + sd], jS = J['Shoulder' + sd];
      const xs = [Math.abs(jS[0]), Math.abs(j0[0]), Math.abs(j1[0]), Math.abs(j2[0])], L0 = xs[1] - .07, L1 = xs[3];
      const geomA = t => {   // t: 0 dentro la spalla … 1 al polso
        const x = lerp(L0, L1, t), u = cl((x - xs[1]) / (xs[3] - xs[1]), 0, 1), ue = (x - xs[1]) / (xs[2] - xs[1]);
        const r = K.braccio * (t < .18 ? lerp(1.12, 1.08, t / .18) : u < .25 ? lerp(1.08, 1, (u) / .25) : u < .45 ? lerp(1, .84, (u - .25) / .2) : u < .55 ? lerp(.84, .9, (u - .45) / .1) : lerp(.9, .62, (u - .55) / .45));
        const y = lerp(j0[1], j2[1], u) - (t < .2 ? .015 * (1 - t / .2) : 0), z = lerp(j0[2], j2[2], u) - .005;
        const kb = x > xs[1] - .01 ? 1 / BRACCIO : 1;   // dove pesa il braccio la scala dell'osso lo ingrossa: qui si assottiglia di quanto
        return { c: [sg * x, y, z], t: [sg, 0, 0], f: [0, 0, 1], a: r * kb * (u > .55 ? .82 : 1), b: r * kb, ao: t < .15 ? .85 : 1, w: catena(x, xs, ['Shoulder' + sd, 'UpperArm' + sd, 'LowerArm' + sd, 'Wrist' + sd], [0, .03, .035, .02]) };
      };
      const camp = []; for (let k = 0; k <= 9; k++) camp.push(k / 9);
      catenaStrati(B, listaA, 0, 1, camp, geomA, pelle, { lung: L1 - L0, seg: 12, flipU: sd === 'R' });
      mano(B, J, sd, sg, pelle, D);
    });
    // ---------------- GAMBE ----------------
    const sc = SCARPE[D.scarpe && D.scarpe.tipo] || SCARPE.scarpe, colS = C3((D.scarpe && D.scarpe.col) || '#2a2018');
    ['L', 'R'].forEach(sd => {
      const sg = sd === 'L' ? 1 : -1, j0 = J['UpperLeg' + sd], j1 = J['LowerLeg' + sd], j2 = J['Foot' + sd];
      const y0 = j0[1] + .025, y1 = j2[1] + .06, Lg = y0 - y1;
      const geomG = t => {   // t: 0 all'anca … 1 alla caviglia
        const y = lerp(y0, y1, t), u = (j0[1] - y) / (j0[1] - j1[1]), w2 = (j1[1] - y) / (j1[1] - j2[1]);
        let r = K.gamba;
        if (u < 1) r *= u < .1 ? lerp(.9, 1.04, sm((u + .06) / .16)) : lerp(1.04, .7, Math.pow(cl(u, 0, 1), 1.2)); else r *= w2 < .1 ? lerp(.7, .72, w2 / .1) : w2 < .35 ? lerp(.72, .78, Math.sin((w2 - .1) / .25 * Math.PI * .5)) : lerp(.78, .42, Math.pow((w2 - .35) / .65, .8));
        const x = lerp(j0[0], j1[0], cl(u, 0, 1)) * (u > 1 ? 1 : 1) - sg * (u > .9 && u < 1.3 ? .005 : 0), z = u < 1 ? lerp(j0[2], j1[2], cl(u, 0, 1)) : lerp(j1[2], j2[2] - .01, cl(w2, 0, 1));
        const calf = u > 1 && w2 < .45 ? -.012 * Math.sin(w2 / .45 * Math.PI) : 0;
        return { c: [x - sg * .022 * (1 - sm(t / .45)), y, z], t: [0, -1, 0], f: [0, 0, 1], a: r * (u < 1 ? .95 : .9), b: r, fz: calf, ao: t < .1 ? .8 : 1, w: catena(-y, [-y0 - .1, -j0[1] - .02, -j1[1], -j2[1] - .06], ['Hips', 'UpperLeg' + sd, 'LowerLeg' + sd, 'Foot' + sd], [0, .05, .04, .03]) };
      };
      const lst = listaG.map(L => Object.assign({}, L, L.zampa ? { mod: null } : {}));
      listaB.filter(L => L.da < -.09).forEach(L => { const yb = yOf(L.da); lst.push(Object.assign({}, L, { tile: 0, da: 0, a: cl((y0 - yb) / Lg + .04, .05, .4), sp: L.sp + .004, orlo: .03, orloSolo: 'giu', colOrlo: null })); });
      // il gambale degli stivali e le calze sono strati della gamba
      if (sc[0] > 0) lst.push({ da: 1 - sc[0] * .92, a: 1, sp: .012 + (lst.length ? lst.reduce((s, L) => s + (L.a > .9 ? L.sp : 0), 0) * 0 : 0), col: colS, tile: 0, ptile: 0, orlo: .04, orloSp: .006, orloSolo: 'su' });
      const camp = []; for (let k = 0; k <= 11; k++) camp.push(k / 11);
      const gonne = vesti.filter(v => v.gonna).map(v => lerp(J.UpperLegL[1], J.FootL[1] + .03, v.gonna[1]) + .16), yv = Math.max(-1, ...gonne), tg0 = yv > -1 ? cl((y0 - yv) / Lg, 0, .9) : 0;
      const zampa = lst.find(L => L.zampa && L.a > .9 && !(sc[0] > 0));
      catenaStrati(B, lst, tg0, 1, camp, t => { const G = geomG(t); const dr = lst.reduce((m, L) => Math.max(m, t >= L.da && t <= L.a && L.dritti ? L.dritti : 0), 0); if (dr && t > .3) { const R0 = K.gamba * .92, k = dr * sm((t - .3) / .25); G.a = lerp(G.a, Math.max(G.a, R0), k); G.b = lerp(G.b, Math.max(G.b, R0 * 1.05), k); } if (zampa && t > .55) { const k = sm((t - .55) / .45) * zampa.zampa; G.a += k * .8; G.b += k; } return G; }, pelle, { lung: Lg, seg: 12, flipU: sd === 'R' });
      scarpa(B, J, sd, sg, sc, colS, D, pelle);
    });
    // ---------------- TESTA ----------------
    testa(B, J, D, pelle);
    // ---------------- PEZZI LIBERI: gonne, falde, grembiuli, scialli, colletti, cinture ----------------
    vesti.forEach((v, i) => {
      if (v.gonna) gonna(B, J, K, profAt, zAt, v.gonna, v, tileOf(v), ptOf(v), false, listaB);
      if (v.falda) gonna(B, J, K, profAt, zAt, [.3, v.falda[1], v.falda[2] || 1.08], Object.assign({}, v, { aperta: true }), 0, ptOf(v), true, listaB);
      if (v.grembiule) grembiule(B, J, profAt, zAt, yOf, v);
      if (v.scialle) scialle(B, J, profAt, zAt, yOf, v);
      if (v.colletto) colletto(B, J, profAt, zAt, yOf, v, listaB);
      if (v.cintura) cintura(B, J, profAt, zAt, yOf, v, listaB);
      if (v.catena) { const y = yOf(.9), P0 = profAt(y), sp = strati(listaB, .9).sp, N = 9, pts = []; for (let j = 0; j <= N; j++) { const a = (j / N - .5) * Math.PI * 1.1; pts.push([Math.sin(a) * (P0[0] * .62 + sp), y + .03 - Math.cos(a) * .05 - .02, zAt(y) + P0[2] + Math.cos(a) * (P0[1] + sp + .004)]); } loft(B, pts.map((p, j) => ({ c: p, t: norm(sub(pts[Math.min(N, j + 1)], pts[Math.max(0, j - 1)])), f: [0, 0, 1], a: .006, b: .006, col: C3v(v.col || '#d8b040'), w: [['Chest', 1]] })), { seg: 5 }); }
      if (v.spalline) ['L', 'R'].forEach(sd => { const sg = sd === 'L' ? 1 : -1, p = J['UpperArm' + sd]; uovo(B, [sg * (Math.abs(p[0]) - .02), p[1] + .045, p[2]], [sg, 0, 0], .012, .04, .055, mulc(v.col, .8), [['Shoulder' + sd, .6], ['UpperArm' + sd, .4]], { anelli: 3, seg: 6, p: 3.5, f: [0, 1, 0] }); });
    });
    (D.extra || []).forEach(e => { if (e === 'bandoliera') bandoliera(B, J, profAt, zAt, yOf, listaB, D); });
    // la cintura dei pantaloni, quando in vita non c'è niente sopra
    const pv = vesti.find(v => v.cintura2), topV = strati(listaB, .2).top;
    if (pv && topV && topV.da <= -.04 && topV.a <= .25) { const y = yOf(.18), P0 = profAt(y), sp = strati(listaB, .18).sp, c = C3('#2a1c14');
      loft(B, [0, 1].map(q => ({ c: [0, y - .015 + q * .03, zAt(y)], t: [0, 1, 0], f: [0, 0, 1], a: P0[0] + sp + .004, b: P0[1] + sp + .004, fz: P0[2], col: c, w: [['Hips', .7], ['Abdomen', .3]] })), { seg: 16 });
      uovo(B, [0, y, zAt(y) + P0[1] + P0[2] + sp + .006], [0, 0, 1], .02, .016, .005, C3('#b8b0a0'), [['Hips', 1]], { anelli: 2, seg: 6, p: 4, f: [0, 1, 0] }); }
    accessori(B, J, D, K, profAt, zAt, yOf, listaB, listaA);
    return B;
  }
  // ---------------- GLI ACCESSORI: orologio, braccialetti, orecchini, cuffie col walkman ----------------
  function accessori(B, J, D, K, profAt, zAt, yOf, listaB, listaA) {
    const A = D.accessori || [], st = S(), has = k => A.includes(k);
    const polso = (sd, col, h, r) => { const w = J['Wrist' + sd], sg = sd === 'L' ? 1 : -1, x = Math.abs(w[0]) - .03, sp = strati(listaA, .93).sp; loft(B, [0, 1].map(q => ({ c: [sg * (x + q * h), w[1], w[2] - .004], t: [sg, 0, 0], f: [0, 0, 1], a: K.braccio * .66 + sp + r, b: K.braccio * .66 * 1.0 + sp + r, col: C3(col), w: [['LowerArm' + sd, .3], ['Wrist' + sd, .7]] })), { seg: 10 }); };
    if (has('orologio')) { polso('L', '#2a2420', .016, .004); const w = J.WristL; uovo(B, [Math.abs(w[0]) - .022, w[1] + K.braccio * .66 + .006, w[2] - .004], [0, 1, 0], .012, .012, .004, C3('#d8d0b8'), [['Wrist' + 'L', .7], ['LowerArmL', .3]], { anelli: 2, seg: 8 }); }
    if (has('braccialetto')) polso('R', '#d8b040', .006, .003);
    const h = J.Head, KH = st.testa * (D.sesso === 'f' ? .95 : 1), wH = [['Head', 1]];
    if (has('orecchini')) [1, -1].forEach(s => { const c = [h[0] + s * .084 * KH, h[1] + .04 * KH, h[2] - .012]; loft(B, [0, .25, .5, .75, 1].map(q => { const a = q * Math.PI * 2; return { c: add(c, [0, -.012 - Math.cos(a) * .012, Math.sin(a) * .012]), t: norm([0, Math.sin(a), Math.cos(a)]), f: [1, 0, 0], a: .0025, b: .0025, col: C3('#d8b040'), w: wH }; }), { seg: 4 }); });
    if (has('cuffie')) { const c = C3('#1a1a1e'), cc = C3('#c8302a');   // le cuffie del walkman sulla testa, le spugnette arancioni
      const N = 8, pts = []; for (let j = 0; j <= N; j++) { const a = (j / N - .5) * Math.PI; pts.push([h[0] + Math.sin(a) * .098 * KH, h[1] + (.08 + Math.cos(a) * .17) * KH, h[2] - .012]); }
      loft(B, pts.map((p, j) => ({ c: p, t: norm(sub(pts[Math.min(N, j + 1)], pts[Math.max(0, j - 1)])), f: [0, 0, 1], a: .005, b: .012, p: 4, col: c, w: wH })), { seg: 6 });
      [1, -1].forEach(s => uovo(B, [h[0] + s * .1 * KH, h[1] + .075 * KH, h[2] - .012], [s, 0, 0], .028 * KH, .028 * KH, .012, cc, wH, { anelli: 3, seg: 8 })); }
    if (has('walkman')) { const y = yOf(.12), P0 = profAt(y), sp = strati(listaB, .12).sp; loft(B, [0, 1].map(q => ({ c: [-(P0[0] + sp + .012), y - .045 + q * .09, zAt(y) + .02], t: [0, 1, 0], f: [1, 0, 0], a: .04, b: .012, p: 6, col: C3(q ? '#8a8e96' : '#5a5e66'), w: [['Hips', 1]] })), { seg: 8 }); }
  }
  // ---------------- LE MANI: palmo, pollice e dita in due gruppi (indice e le altre tre), leggibili da lontano ----------------
  function mano(B, J, sd, sg, pelle, D) {
    const st = S(), k = st.mani / BRACCIO / ((window.Anim && Anim.HAND) || .85) * (D.sesso === 'f' ? .9 : 1) * (D.mani || 1), w = J['Wrist' + sd], m1 = J['Middle1' + sd], m2 = J['Middle2' + sd], i1 = J['Index1' + sd], t1 = J['Thumb1' + sd], t2 = J['Thumb2' + sd];
    const ax = norm(sub(m2, w)), x0 = w[0] + sg * .005;
    // il palmo: piatto (davanti e dietro la mano nella posa a T sono sopra e sotto)
    const pc = [x0 + sg * .045 * k, w[1] - .004, w[2] + .002];
    loft(B, [0, .2, .55, .85, 1].map((q, j) => ({ c: add([x0, w[1] - .004, w[2] + .002], mul(ax, q * .085 * k)), t: ax, f: [0, 1, 0], a: [.03, .04, .047, .048, .043][j] * k, b: [.017, .023, .024, .022, .018][j] * k, p: 2.6, col: pelle, w: [['Wrist' + sd, 1]], ao: q < .2 ? .9 : 1 })), { seg: 8 });
    // le dita: indice a parte, le altre tre insieme; piegate dalle ossa
    const dita = (bone0, bone1, off, wd, len) => loft(B, [0, .5, .85, 1].map((q, j) => ({ c: add(add([x0, w[1] - .004, w[2] + .002], mul(ax, (.075 + q * len) * k)), [0, -q * .004, off * k]), t: ax, f: [0, 1, 0], a: [wd, wd * .96, wd * .8, wd * .1][j] * k, b: [.014, .013, .011, .004][j] * k, p: 2.4, col: pelle, w: q < .3 ? [['Wrist' + sd, .4], [bone0, .6]] : q < .7 ? [[bone0, .5], [bone1, .5]] : [[bone1, 1]] })), { seg: 6 });
    dita('Index1' + sd, 'Index2' + sd, .032, .013, .085);
    dita('Middle1' + sd, 'Middle2' + sd, -.009, .032, .09);
    // il pollice, verso il davanti
    const tp = sub(t2, t1), tl = norm([tp[0], tp[1] * .5, tp[2]]);
    loft(B, [0, .55, 1].map((q, j) => ({ c: add([x0 + sg * .02 * k, w[1] - .006, w[2] + .018 * k], mul(tl, q * .07 * k)), t: tl, f: [0, 1, 0], a: [.016, .013, .003][j] * k, b: [.014, .012, .003][j] * k, col: pelle, w: q < .4 ? [['Thumb1' + sd, 1]] : [['Thumb2' + sd, 1]] })), { seg: 6 });
  }
  // ---------------- LE SCARPE: tomaia, suola, tacco; il gambale degli stivali sta sulla gamba ----------------
  function scarpa(B, J, sd, sg, sc, col, D, pelle) {
    const st = S(), k = st.piedi * (D.sesso === 'f' ? .88 : 1), f = J['Foot' + sd], y0 = Math.max(.0, f[1] - .02), z0 = f[2] - .06 * k, L = .27 * k * sc[1], tacco = sc[2] || 0, sand = sc[3];
    const w = [['Foot' + sd, 1]], wA = [['LowerLeg' + sd, .5], ['Foot' + sd, .5]];
    const gin = sc[4], kw = gin ? 1.16 : 1, kh = gin ? 1.18 : 1, bianco = C3((D.scarpe && D.scarpe.col2) || '#f2eee6');
    const dark = gin ? bianco : mulc(col, .45), cm = sand ? pelle : col;
    // la tomaia: sezioni lungo il piede, dalla caviglia (alta) alla punta (bassa e tonda)
    const R = [[0, .05, .06, .08], [.12, .052, .075, .1], [.35, .05, .07, .085], [.6, .052, .045, .06], [.82, .046, .036, .045], [.95, .034, .028, .03], [1, .01, .016, .016]];
    loft(B, R.map(([q, a, h, hh], j) => ({ c: [f[0] - sg * .004 * q, y0 + .012 + tacco * .05 * (1 - q) + h * .5 + (j === 0 ? .02 : 0), z0 + q * L], t: [0, 0, 1], f: [0, 1, 0], a: a * k * kw * (D.sesso === 'f' ? .9 : 1), b: h * .62 * kh * (j === 0 ? 1.3 : 1), p: gin ? 3 : 2.4, col: cm, v: q, tile: sand ? 0 : gin ? TL.sneaker : TL.scarpa, col2: gin ? C3((D.scarpe && D.scarpe.col3) || (D.scarpe && D.scarpe.col2) || '#c83a2a') : mulc(cm, .7), ao: j === 0 ? .85 : 1, w: j === 0 ? wA : w })), { seg: 10, flipU: sd === 'R' });
    // la suola: una lastra appena più larga, scura
    loft(B, [[0, .048], [.25, .052], [.6, .056], [.85, .05], [1, .02]].map(([q, a]) => ({ c: [f[0] - sg * .004 * q, y0 + .008 + (tacco ? (q < .3 ? .04 : .04 * (1 - (q - .3) / .7) * .4) : 0), z0 + q * L * 1.01], t: [0, 0, 1], f: [0, 1, 0], a: a * k * kw * 1.04 * (D.sesso === 'f' ? .9 : 1), b: gin ? .017 : .009, p: 4, col: dark, v: q, tile: TL.suola, w })), { seg: 8 });
    if (tacco) loft(B, [0, 1].map(q => ({ c: [f[0], y0 + .005 + q * .045, z0 + .03], t: [0, 1, 0], f: [0, 0, 1], a: .016, b: .02, p: 3, col: dark, w })), { seg: 6 });
    else loft(B, [0, 1].map(q => ({ c: [f[0], y0 + .004 + q * .022, z0 + .045 * k], t: [0, 1, 0], f: [0, 0, 1], a: .044 * k, b: .04 * k, p: 3.5, col: dark, w })), { seg: 8 });
  }
  // ---------------- LA TESTA: cranio, mascella, naso, orecchie, sopracciglia, occhi, bocca, capelli a ciocche, baffi, barbe, occhiali, cappelli ----------------
  const TESTE = {   // [quota, mezza larghezza, mezza profondità, avanti] dal mento alla sommità (in metri, prima della scala dello stile)
    ovale: [[-.034, .022, .02, .058], [-.024, .038, .034, .05], [-.006, .053, .06, .032], [.03, .068, .085, .014], [.085, .081, .099, .0], [.135, .085, .103, -.006], [.18, .079, .094, -.012], [.215, .056, .068, -.016], [.235, .014, .02, -.016]],
    quadra: [[-.038, .03, .02, .062], [-.028, .048, .036, .052], [-.008, .062, .062, .032], [.03, .074, .088, .014], [.085, .084, .099, .0], [.135, .086, .103, -.006], [.18, .081, .094, -.012], [.21, .06, .07, -.015], [.232, .018, .024, -.015]],
    tonda: [[-.032, .022, .02, .056], [-.022, .042, .038, .048], [-.004, .06, .064, .03], [.03, .076, .089, .012], [.085, .087, .1, .0], [.135, .088, .103, -.006], [.18, .08, .093, -.012], [.21, .057, .066, -.015], [.228, .015, .02, -.015]],
    lunga: [[-.044, .022, .018, .062], [-.032, .038, .032, .052], [-.012, .052, .058, .032], [.03, .066, .086, .012], [.09, .078, .098, .0], [.14, .081, .102, -.006], [.19, .075, .093, -.012], [.225, .053, .065, -.016], [.245, .012, .018, -.016]],
  };
  // le sedici facce dell'atlante (40-55): occhi (ow, oh larghezza e altezza, ex distanza), sopracciglia (browW spessore, arco, bh altezza, coda giù, brow piega), bocca (mw larghezza, umore, storto), segni (zigomi, duro, rughe, barbetta, ciglia, labbra)
  const FACCE = [
    { zigomi: 1 }, { duro: 1, brow: 1, stretti: 1, umore: -.2, browW: .03, zigomi: 1 }, { umore: .6, storto: 1 }, { ow: 1.08, oh: .85, browW: .034, bh: -.008, mw: .085 },
    { oh: 1.12, ex: .112, arco: .014, browW: .022, mw: .072 }, { duro: 1, stretti: 1, coda: .012, browW: .026, barbetta: 1, mw: .09 }, { umore: .35, oh: .95, arco: .008, browW: .024, zigomi: 1, mw: .078 }, { barbetta: 1, brow: .5, stretti: 1, zigomi: 1, storto: 1 },
    { rughe: 1, brow: -.2, stretti: 1, umore: -.1, browW: .03 }, { rughe: 1, umore: .3, oh: .9, coda: .01, browW: .034, mw: .086 },
    { ciglia: 1, labbra: 1, browW: .015, arco: .01 }, { ciglia: 1, labbra: 1, browW: .015, arco: .012, umore: .5, mw: .075 }, { ciglia: 1, labbra: 1, browW: .018, oh: .9, ow: 1.06, coda: .006, mw: .085 }, { ciglia: 1.3, labbra: 1, browW: .013, arco: .018, oh: 1.12, mw: .068 },
    { ciglia: .5, labbra: 1, rughe: 1, browW: .013 }, { ciglia: .5, labbra: 1, rughe: 1, browW: .014, umore: .35, oh: .9 }];
  function facciaDi(D) {
    const T = D.testa || {}; if (T.faccia !== undefined) return T.faccia; const f = D.sesso === 'f', old = (D.eta || 30) > 58, um = T.umore || 0, sb = T.sopracciglia || 0;
    const r = rng('faccia' + (D.seme !== undefined ? D.seme : JSON.stringify(D))), pk = a => a[Math.floor(r() * a.length)];
    if (f) return old ? pk([14, 15]) : um > .3 ? 11 : pk([10, 12, 13]);
    if (old) return pk([8, 9]); if (sb < -.35) return pk([1, 5]); if (um > .3) return pk([2, 6]); return pk([0, 3, 4, 7]);
  }
  function testa(B, J, D, pelle) {
    const st = S(), T = D.testa || {}, K = st.testa * (T.scala || 1) * (D.sesso === 'f' ? .95 : 1), h = J.Head, base = [h[0], h[1] - .01 * K, h[2] - .005], wH = [['Head', 1]];
    const r = rng(D.seme !== undefined ? D.seme : JSON.stringify(D)), vv = (a, b) => lerp(a, b, r());
    const masc = T.mascella || vv(.9, 1.06), zig = T.zigomi || vv(.96, 1.05), fro = T.fronte || vv(.97, 1.03), mento = T.mento !== undefined ? T.mento : vv(-.006, .006);
    const P = (TESTE[T.forma] || TESTE.ovale).map(([y, a, b, fz]) => { const kj = y < .04 ? masc : y < .12 ? zig : fro; return [y < 0 ? y - mento : y, a * kj, b * (y < .04 ? lerp(1, masc, .5) : 1), fz + (y < 0 ? mento * .6 : 0)]; });
    const at = (y, x, z) => [base[0] + x * K, base[1] + y * K, base[2] + z * K];
    const capH = (D.capelli && D.capelli.col) ? C3(D.capelli.col) : C3('#2a1a12'), labbra = mixc(pelle, [.55, .25, .22], .35), occ = C3('#1a1414');
    const ru = mixc(pelle, [.8, .35, .3], .12);   // un filo di rosso sulle guance
    const fac = TL.faccia + facciaDi(D), y0f = P[0][0], y1f = P[P.length - 1][0];
    loft(B, P.map(([y, a, b, fz], j) => ({ c: at(y, 0, 0), t: [0, 1, 0], f: [0, 0, 1], a: a * K, b: b * K, fz: fz * K, p: st.pTesta || 2.2, col: pelle, v: (y - y0f) / (y1f - y0f), tile: fac, col2: mulc(capH, .85), col3: labbra, colFn: (th) => { const fr = Math.cos(th); return y > .0 && y < .07 && fr > .3 && Math.abs(Math.sin(th)) > .35 ? ru : pelle; }, w: wH, ao: j === 0 ? .9 : 1 })), { seg: st.seg + 2, uS: 2.5 });
    const front = (y) => { let i = 0; while (i < P.length - 2 && y > P[i + 1][0]) i++; const a = P[i], b = P[i + 1], t = cl((y - a[0]) / (b[0] - a[0]), 0, 1); return lerp(a[2] + a[3], b[2] + b[3], t); };
    const pa = (y, k) => { let i = 0; while (i < P.length - 2 && y > P[i + 1][0]) i++; const a = P[i], b = P[i + 1], t = cl((y - a[0]) / (b[0] - a[0]), 0, 1); return lerp(a[k], b[k], t); };
    const wid = (y) => { let i = 0; while (i < P.length - 2 && y > P[i + 1][0]) i++; const a = P[i], b = P[i + 1], t = cl((y - a[0]) / (b[0] - a[0]), 0, 1); return lerp(a[1], b[1], t); };
    B.ol = 0;
    // il naso: a cuneo, sporge dalla faccia; la forma per tipo (dritto, aquilino, a patata, all'insù)
    const nk = (T.naso || 1) * st.naso * vv(.92, 1.08), nt = T.nasoTipo || 'dritto', ny = .075, nz = front(ny) - .006;
    const NR = { dritto: [[.104, .008, .006, 0], [.08, .011, .01, .01], [.062, .014, .013, .019], [.054, .011, .009, .02]], aquilino: [[.104, .008, .006, 0], [.085, .011, .011, .015], [.064, .013, .013, .022], [.054, .01, .009, .019]], patata: [[.1, .008, .007, 0], [.08, .012, .01, .01], [.063, .019, .017, .019], [.055, .014, .011, .019]], insu: [[.1, .007, .006, 0], [.08, .01, .009, .008], [.066, .013, .012, .016], [.06, .01, .008, .018]] }[nt] || null;
    loft(B, NR.map(([y, a, b, fz]) => ({ c: at(y, 0, nz), t: [0, -1, 0], f: [0, 0, 1], a: a * nk, b: b * nk, fz: fz * nk * K, p: 2, col: mixc(pelle, ru, .4), w: wH })), { seg: 8 });
    // le orecchie
    [1, -1].forEach(s => uovo(B, at(.075, s * (wid(.075) - .004), -.012), [0, 1, 0], .012 * K, .02 * K, .03 * K, mulc(pelle, .93), wH, { anelli: 4, seg: 7 }));
    const ey = .093;
    // il mento e le guance degli anziani: un filo di doppio mento
    if (false) uovo(B, at(-.02, 0, front(-.02) - .03), [0, 0, 1], .06 * K, .025 * K, .03 * K, mulc(pelle, .96), wH, { anelli: 3, seg: 8 });
    B.ol = 1;
    capelli(B, at, K, D, capH, front, wid, wH, pa);
    B.ol = 0;
    if (D.baffi) { const by = .036, bz = front(by) + .002, tipo = D.baffi; [1, -1].forEach(s => uovo(B, at(by - (tipo === 'spioventi' ? .006 : 0), s * .019, bz), [s, tipo === 'spioventi' ? -.6 : -.18, 0], .008 * K * (tipo === 'folti' || tipo === 'spioventi' ? 1.5 : 1), .009 * K, .026 * K * (tipo === 'spioventi' ? 1.2 : 1), capH, wH, { anelli: 4, seg: 6, punta: -.3, f: [0, 0, 1] })); }
    if (D.barba) { const corta = D.barba === 'corta' || D.barba === 'pizzetto';
      if (D.barba === 'pizzetto') uovo(B, at(-.025, 0, front(-.025) - .008), [0, 1, .2], .022 * K, .014 * K, .028 * K, capH, wH, { anelli: 4, seg: 7 });
      else loft(B, [[-.06, .02, .02, .07], [-.045, .05, .045, .06], [-.02, .078, .078, .03], [.01, .09, .1, .012], [.045, .094, .104, .004]].map(([y, a, b, fz], j) => ({ c: at(y + (corta ? .012 : 0) * (j < 2 ? 1 : 0), 0, 0), t: [0, 1, 0], f: [0, 0, 1], a: (a + (corta ? .003 : .008)) * K, b: (b + (corta ? .003 : .008)) * K, fz: fz * K, col: capH, w: wH, mod: th => { const fr = Math.cos(th); return fr < .1 ? -.5 * sm((.1 - fr) / .5) : 0; } })), { seg: 14 }); }
    if (D.occhiali) { const sole = D.occhiali === 'sole', fc = sole ? C3('#141416') : C3(D.occhiali === 'oro' ? '#b8963a' : '#2a2422'), oz = front(ey) + .002;
      [1, -1].forEach(s => loft(B, [0, 1].map(q => ({ c: at(ey, s * .038, oz + q * .004), t: [0, 0, 1], f: [0, 1, 0], a: .024 * K, b: .019 * K, p: 3, col: sole ? C3('#0c1418') : mixc(fc, [.8, .85, .9], .3), w: wH })), { seg: 10 }));
      loft(B, [-1, 1].map(q => ({ c: at(ey + .004, q * .016, oz + .002), t: [1, 0, 0], f: [0, 1, 0], a: .003 * K, b: .003 * K, col: fc, w: wH })), { seg: 4 });
      [1, -1].forEach(s => loft(B, [0, 1].map(q => ({ c: at(ey + .004, s * (.062 + q * .03), oz - q * .1), t: [0, 0, -1], f: [0, 1, 0], a: .003 * K, b: .003 * K, col: fc, w: wH })), { seg: 4 })); }
    B.ol = 1;
    if (D.cappello && D.cappello.tipo) cappello(B, at, K, D, front, wid, wH);
  }
  // ---------------- I CAPELLI A CIOCCHE ----------------
  const P0top = pa => { let y = .2; while (y < .3 && pa(y + .002, 1) > .012 && pa(y + .002, 1) < pa(y, 1) + 1e-6) y += .002; return y; };
  function capelli(B, at, K, D, col, front, wid, wH, pa) {
    const tipo = (D.capelli && D.capelli.tipo) || 'corti', hat = D.cappello && D.cappello.tipo, scuro = mulc(col, .78), chiaro = mixc(col, [1, 1, 1], .12);
    const cc = (y, x, z, ax, a, b, l, c, o) => uovo(B, at(y, x, z), ax, a * K, b * K, l * K, c || col, wH, Object.assign({ anelli: 3, seg: 6 }, o || {}));
    const top = pa(1, 0), sotto = hat && hat !== 'fazzoletto' ? (hat === 'paglia' || hat === 'cappello' ? .16 : .135) : 0;
    const cuffia = (y0, k, back, cut) => loft(B, (sotto ? [y0, y0 + .03, .1, sotto - .01, sotto + .005, sotto + .012] : [y0, y0 + .03, .1, .15, .19, .215, top - .004, top + .008 * k, top + .014 * k]).map((y, j, A) => { const last = j === A.length - 1, yy = Math.min(y, top - .004), o = sotto ? (j >= A.length - 2 ? -.004 : .009 + .003 * k) : (.009 + .003 * k) * (j > 6 ? (last ? .2 : .6) : 1); return { c: at(y, 0, 0), t: [0, 1, 0], f: [0, 0, 1], a: (pa(yy, 1) * (j > 6 && !sotto ? .55 : 1) + o) * K * (last && !sotto ? .3 : 1), b: (pa(yy, 2) * (j > 6 && !sotto ? .55 : 1) + o) * K * (last && !sotto ? .3 : 1), fz: (pa(yy, 3) + (back || 0)) * K, col: j < 2 ? scuro : col, w: wH, mod: cut ? (th => cut(th, y)) : null }; }), { seg: 16 });
    if (tipo === 'calvo') { [1, -1].forEach(s => cc(.1, s * (pa(.1, 1) - .004), -.035, [0, .25, -1], .01, .022, .05, scuro)); cc(.095, 0, pa(.095, 3) - pa(.095, 2) + .006, [1, 0, 0], .014, .02, .06, scuro); return; }
    if (hat === 'fazzoletto') { cc(.06, 0, .035, [1, 0, 0], .01, .01, .04, scuro); return; }
    // la calotta: segue il cranio un filo più larga; davanti si apre sulla fronte (attaccatura)
    const fronte = (th, y) => { const fr = Math.cos(th); return fr > .2 && y < .175 ? -.3 * sm((fr - .2) / .3) * sm((.175 - y) / .025) : 0; };
    if (tipo === 'corti' || tipo === 'riga' || tipo === 'ricci' || tipo === 'indietro' || tipo === 'brizzolati') {
      cuffia(.045, tipo === 'ricci' ? 1.6 : 1, 0, (th, y) => fronte(th, y) + (tipo === 'ricci' ? .04 * Math.sin(th * 7) * Math.sin(y * 90) : 0));
      if (sotto) { [1, -1].forEach(s => cc(.1, s * (wid(.1) - .002), -.025, [0, 1, -.2], .012, .022, .035, scuro)); return; }
      if (tipo === 'corti' || tipo === 'brizzolati') { [-.04, 0, .04].forEach((x, i) => cc(.19, x, front(.17) - .03, [x * 4, -.25, 1], .02, .014, .035, i === 1 ? chiaro : col)); }
      if (tipo === 'riga') { cc(.205, -.03, front(.2) - .05, [1, -.2, .5], .03, .022, .065, chiaro); cc(.19, .045, front(.17) - .035, [-.3, -.3, 1], .018, .012, .03); }
      if (tipo === 'indietro') { cc(.21, 0, .0, [0, .15, -1], .05, .03, .09, chiaro, { punta: .2 }); }
      if (tipo === 'ricci') for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; cc(.17 + Math.sin(i * 2.3) * .03, Math.sin(a) * .08, Math.cos(a) * .085 - .02, [Math.sin(a), .4, Math.cos(a)], .024, .024, .026, i % 2 ? chiaro : col); }
      [1, -1].forEach(s => cc(.1, s * (wid(.1) - .002), -.025, [0, 1, -.2], .012, .022, .035, scuro));   // le basette
      return;
    }
    if (tipo === 'lunghi' || tipo === 'caschetto' || tipo === 'raccolti' || tipo === 'permanente' || tipo === 'coda') {
      cuffia(.06, tipo === 'permanente' ? 2.2 : 1.2, -.004, (th, y) => fronte(th, y) * .8 + (tipo === 'permanente' ? .05 * Math.abs(Math.sin(th * 5)) * Math.sin(y * 70) : 0));
      // la frangia o la riga: due ciocche che scendono dalla sommità ai lati della fronte
      if (!sotto) [1, -1].forEach(s => cc(.185, s * .045, front(.18) - .028, [s * .7, -.7, .15], .02, .012, .045, chiaro, { punta: .3 }));
      if (tipo === 'lunghi' || tipo === 'caschetto') {   // il tendone dietro e ai lati: ciocche lunghe fino alle spalle (lunghi) o al mento (caschetto)
        const lo = tipo === 'lunghi' ? -.14 : -.02;
        loft(B, [[.16, 1], [.08, 1.04], [.0, 1.02], [lo * .6, .98], [lo, .92]].map(([y, q], j) => ({ c: at(y, 0, -.02), t: [0, -1, 0], f: [0, 0, 1], a: (pa(Math.max(y, .02), 1) + .016) * q * K, b: (pa(Math.max(y, .02), 2) + .016) * q * K, fz: -.008 * K, col: j > 2 ? scuro : col, w: y < -.04 ? [['Head', .5], ['Neck', .5]] : wH, mod: th => { const fr = Math.cos(th); return fr > .2 ? -.9 * sm((fr - .2) / .25) : .03 * Math.sin(th * 9); } })), { seg: 18 });
      }
      if (tipo === 'raccolti') cc(.17, 0, -.1, [0, .5, -1], .042, .042, .045, chiaro);   // lo chignon
      if (tipo === 'coda') { cc(.14, 0, -.11, [0, .2, -1], .02, .02, .03, scuro); cc(.04, 0, -.13, [0, 1, -.15], .025, .028, .08, col, { punta: .4 }); }
      if (tipo === 'permanente') for (let i = 0; i < 10; i++) { const a = (i / 10 - .5) * Math.PI * 1.6 + Math.PI; cc(.13 + (i % 3) * .03, Math.sin(a) * .088, Math.cos(a) * .085 - .02, [Math.sin(a), .2, Math.cos(a)], .028, .028, .03, i % 2 ? chiaro : col); }
    }
  }
  // ---------------- I CAPPELLI ----------------
  function cappello(B, at, K, D, front, wid, wH) {
    const H = D.cappello, c = C3(H.col || '#2a2a2e'), sc = mulc(c, .7), tipo = H.tipo, top = .2;
    const tesa = (y, r0, r1, rf, col, dz) => loft(B, [[r0 * .9, 0], [r0, .003], [r1, .0], [r1, -.006], [r0 * .95, -.006]].map(([r, dy]) => ({ c: at(y + dy, 0, (dz || 0) - .012), t: [0, 1, 0], f: [0, 0, 1], a: r * K, b: r * K * (rf || 1.06), col, w: wH })), { seg: 18 });
    const cupola = (y0, rows, col, fz, tile, c2) => loft(B, rows.map(([y, a, b], j) => ({ c: at(y0 + y, 0, (fz || 0) - .012), t: [0, 1, 0], f: [0, 0, 1], a: a * K, b: b * K, col, v: j / (rows.length - 1), tile: tile || 0, col2: c2, w: wH })), { seg: 16 });
    if (tipo === 'coppola') {   // la coppola: piatta, avanti, con la visierina
      cupola(.15, [[0, .1, .108], [.04, .108, .12], [.065, .1, .118], [.08, .07, .09], [.084, .01, .01]], c, .012);
      loft(B, [[.0, .07, .2], [.5, .08, .3], [1, .06, .25]].map(([q, a]) => ({ c: at(.16 - q * .01, 0, front(.15) + q * .05), t: [0, 0, 1], f: [0, 1, 0], a: a * K, b: .006 * K, p: 2.6, col: sc, w: wH })), { seg: 8 });
    } else if (tipo === 'berretto') {   // la papalina del pescatore, col risvolto
      cupola(.13, [[-.01, .1, .112], [.03, .104, .116], [.03, .097, .109], [.08, .098, .11], [.115, .075, .085], [.14, .02, .025]], c, -.004);
      cupola(.13, [[-.012, .101, .113], [.025, .106, .118]], sc, -.004);
    } else if (tipo === 'cappello') {   // il borsalino
      tesa(.155, .1, .155, 1.04, sc); cupola(.155, [[0, .1, .108], [.02, .101, .109], [.02, .099, .107], [.085, .088, .1], [.1, .06, .07], [.1, .01, .01]], c);
      cupola(.155, [[.0, .102, .11], [.022, .103, .111]], mulc(c, .4));
    } else if (tipo === 'paglia') {   // il cappello di paglia, tesa larga
      tesa(.16, .1, .2, 1.0, mixc(c, [1, .95, .8], .2)); cupola(.16, [[0, .1, .108], [.07, .095, .1], [.085, .06, .065], [.088, .01, .01]], c); cupola(.16, [[0, .102, .11], [.018, .102, .11]], C3(H.col2 || '#8a2a24'));
    } else if (tipo === 'regime') {   // il berretto della Tutela: alto davanti, la visiera nera e lucida, il fregio
      cupola(.14, [[0, .1, .108], [.04, .105, .114], [.04, .104, .113], [.085, .13, .14], [.1, .128, .138], [.104, .02, .02]], c, .01);
      cupola(.14, [[.0, .102, .11], [.03, .104, .112]], mulc(c, .45), .01);
      loft(B, [[.0, .085], [.5, .09], [1, .07]].map(([q, a]) => ({ c: at(.145 - q * .02, 0, front(.15) - .005 + q * .055), t: [0, 0, 1], f: [0, 1, .4], a: a * K, b: .005 * K, p: 2.6, col: C3('#121214'), w: wH })), { seg: 8 });
      uovo(B, at(.205, 0, front(.15) + .02), [0, 0, 1], .014 * K, .016 * K, .006 * K, C3('#d8b040'), wH, { anelli: 2, seg: 6 });
    } else if (tipo === 'cappellino' || tipo === 'cappellino_indietro') {
      const dz = tipo === 'cappellino' ? 1 : -1;
      cupola(.13, [[-.005, .1, .11], [.04, .104, .114], [.08, .094, .104], [.11, .066, .076], [.125, .02, .024]], c, -.004, dz > 0 ? TL.cappellino : TL.cappellino + 1, C3(H.col2 || '#f0ece2'));
      loft(B, [[0, .085], [.5, .09], [1, .07]].map(([q, a]) => ({ c: at(.14 - q * .012, 0, (dz > 0 ? front(.14) - .01 : -.11) + dz * q * .075), t: [0, 0, dz], f: [0, 1, .15], a: a * K, b: .005 * K, p: 3, col: sc, w: wH })), { seg: 8 });
      uovo(B, at(.257, 0, -.008), [0, 1, 0], .012 * K, .012 * K, .005 * K, sc, wH, { anelli: 2, seg: 6 });
    } else if (tipo === 'elmetto') {
      cupola(.12, [[-.01, .125, .135], [.0, .12, .13], [.07, .112, .124], [.12, .07, .08], [.135, .01, .01]], c);
    } else if (tipo === 'fazzoletto') {   // il fazzoletto delle anziane: annodato sotto il mento, la punta dietro
      cupola(.0, [[.03, .1, .11], [.13, .104, .116], [.19, .09, .1], [.23, .06, .07], [.25, .01, .01]].map(r => r), c, -.008);
      loft(B, [[.14, .1, .112], [.06, .102, .11], [-.02, .08, .06], [-.055, .035, .025]].map(([y, a, b]) => ({ c: at(y, 0, -.012), t: [0, -1, 0], f: [0, 0, 1], a: a * K, b: b * K, col: c, w: wH, mod: th => { const fr = Math.cos(th); return fr > .3 ? -.95 * sm((fr - .3) / .2) : 0; } })), { seg: 16 });
      uovo(B, at(.05, 0, -.13), [0, -1, -.6], .03 * K, .01 * K, .06 * K, sc, wH, { anelli: 3, seg: 6, punta: .6 });
      uovo(B, at(-.05, 0, front(-.04) - .028), [0, -1, .3], .022 * K, .016 * K, .02 * K, sc, wH, { anelli: 3, seg: 7 }); [1, -1].forEach(q => uovo(B, at(-.07, q * .014, front(-.04) - .028), [q * .3, -1, .2], .012 * K, .006 * K, .03 * K, c, wH, { anelli: 3, seg: 5 }));   // il nodo sotto il mento
    }
  }
  // ---------------- GONNE, FALDE DEI CAPPOTTI, VESTITI: pendono dal bacino e seguono le cosce ----------------
  function gonna(B, J, K, profAt, zAt, g, v, tile, ptile, falda, LB) {
    const yTop = lerp(J.UpperLegL[1] - .07, J.Neck[1] + .045, g[0]) + (falda ? 0 : 0), yKnee = J.LowerLegL[1], yBot = lerp(J.UpperLegL[1], J.FootL[1] + .03, g[1]), fl = g[2] || 1.2, n = 7, rings = [];
    let sp = .008; if (LB) for (let q = -.05; q <= .4; q += .05) sp = Math.max(sp, strati(LB, q).sp + .008);   // sopra tutto quello che sta sotto in vita
    const legX = Math.abs(J.UpperLegL[0]);
    for (let j = 0; j <= n; j++) {
      const q = j / n, y = lerp(yTop, yBot, q), P0 = profAt(Math.max(y, J.UpperLegL[1] - .06));
      const baseA = Math.max(P0[0] + .015, legX - .022 + K.gamba * 1.08 + .035), baseB = Math.max(P0[1] + .015, K.gamba + (g[1] > .4 ? .095 : .085));
      const qh = cl((yTop - y) / Math.max(.05, yTop - (J.UpperLegL[1] - .05)), 0, 1), k = lerp(1, fl, Math.pow(q, 1.3)), a = lerp(P0[0] + sp + .006 * (falda ? 2.5 : 1), baseA * k, sm(qh)), b = lerp(P0[1] + sp + .006 * (falda ? 2.5 : 1), baseB * k, sm(qh));
      rings.push({ c: [0, y, zAt(Math.max(y, J.Hips[1] - .05)) - .005], t: [0, -1, 0], f: [0, 0, 1], a, b, fz: q > .3 && !falda ? .01 : P0[2] * (1 - sm(q * 2)) - (falda ? .012 * sm(q * 2) : 0), col: C3v(v.col), col2: v.col2 ? C3v(v.col2) : mulc(C3v(v.col), .6), col3: v.col3 ? C3v(v.col3) : mulc(C3v(v.col), .55), v: q, mv: q * (yTop - yBot), ao: lerp(1, .92, q), tile: falda ? tile : TL.abito * 0, ptile,
        mod: th => { const fr = Math.cos(th); let d = Math.sin(th * (falda ? 6 : 9)) * .035 * sm(q * 1.4); return d; } });
    }
    { const r0 = rings[0], P1 = profAt(yTop + .04); rings.unshift(Object.assign({}, r0, { c: [r0.c[0], yTop + .04, zAt(yTop + .04) - .005], a: P1[0] - .002, b: P1[1] - .002, fz: P1[2], mod: null, ao: .8 })); }   // l'attacco: dentro il busto, così dall'alto non si vede il vuoto
    // l'orlo: si gira dentro con lo spessore
    const last = rings[rings.length - 1]; rings.push(Object.assign({}, last, { c: add(last.c, [0, .012, 0]), a: last.a - .008, b: last.b - .008, ao: .55 }));
    const wfn = (p, r, th) => { const q = cl((yTop - p[1]) / (yTop - yBot), 0, 1), lw = sm(q * 1.6) * .92, sx = cl(p[0] / (legX * 1.1), -1, 1); const wl = lw * (.5 + .5 * sx), wr = lw * (.5 - .5 * sx); const w = [['Hips', 1 - lw]]; if (wl > .001) w.push(['UpperLegL', wl]); if (wr > .001) w.push(['UpperLegR', wr]); return w; };
    loft(B, rings, { seg: 20, wfn });
  }
  const C3v = c => Array.isArray(c) ? c : C3(c);
  // ---------------- IL GREMBIULE DA BOTTEGA: davanti, dal petto alle ginocchia, coi lacci ----------------
  function grembiule(B, J, profAt, zAt, yOf, v) {
    const y0 = yOf(Math.min(v.grembiule[1], .36)), y1 = J.LowerLegL[1] + .04, yW = yOf(.36), n = 8, col = C3v(v.col), rings = [];
    for (let j = 0; j <= n; j++) {
      const q = j / n, y = lerp(y0, y1, q), P0 = profAt(Math.min(Math.max(y, yOf(.02)), yOf(.98))), fz = y > yOf(0) ? P0[1] + P0[2] + .036 : .15 + q * .02;
      const w = y > yW ? lerp(.085, .11, sm((y0 - y) / (y0 - yW))) : lerp(.16, .19, q);
      rings.push({ c: [0, y, zAt(Math.max(y, J.Hips[1])) + fz - .06], t: [0, -1, 0], f: [0, 0, 1], a: w, b: .062, p: 2.6, col, col2: mulc(col, .85), col3: mulc(col, .6), tile: TL.grembiule, v: q, ao: 1 });
    }
    const legX = Math.abs(J.UpperLegL[0]);
    loft(B, rings, { seg: 14, wfn: p => { const q = cl((yW - p[1]) / (yW - y1), 0, 1), lw = sm(q * 1.3) * .9, sx = cl(p[0] / (legX * 1.1), -1, 1); const w = p[1] > yW ? [[p[1] > yOf(.6) ? 'Chest' : 'Torso', 1]] : [['Hips', 1 - lw], ['UpperLegL', lw * (.5 + .5 * sx)], ['UpperLegR', lw * (.5 - .5 * sx)]]; return w.filter(e => e[1] > 1e-3); } });
    // il laccio in vita
    const P0 = profAt(yW); loft(B, [0, 1].map(q => ({ c: [0, yW - .01 + q * .02, zAt(yW) + P0[2]], t: [0, 1, 0], f: [0, 0, 1], a: P0[0] + .012, b: P0[1] + .012, col: mulc(col, .9), w: [['Abdomen', .5], ['Hips', .5]] })), { seg: 16 });
  }
  // ---------------- LO SCIALLE DELLE ANZIANE: sulle spalle, a punta dietro, annodato davanti ----------------
  function scialle(B, J, profAt, zAt, yOf, v) {
    const col = C3v(v.col), y0 = yOf(.99), y1 = yOf(.5), n = 6, rings = [];
    for (let j = 0; j <= n; j++) {
      const q = j / n, y = lerp(y0, y1, q), P0 = profAt(y), extra = .018 + q * .012;
      rings.push({ c: [0, y, zAt(y) + P0[2]], t: [0, -1, 0], f: [0, 0, 1], a: P0[0] + extra + (q > .2 ? .015 * sm((q - .2) / .3) : 0), b: P0[1] + extra, col, col2: mulc(col, .8), col3: mulc(col, .6), ptile: PT.maglia, mv: q * .4, ao: lerp(1, .9, q),
        mod: th => { const fr = Math.cos(th); const punta = fr < 0 ? 0 : 0; return (fr > .45 ? -.5 * sm((fr - .45) / .3) * sm((q - .15) / .2) : 0) + .03 * Math.sin(th * 8) * q + punta; } });
    }
    // la punta dietro scende più in basso
    const last = rings[n]; rings.push(Object.assign({}, last, { c: add(last.c, [0, -.08, -.02]), a: last.a * .4, b: last.b * .5, fz: (last.fz || 0) - last.b * .5, mod: null }));
    loft(B, rings, { seg: 18, wfn: p => { const sx = Math.abs(p[0]); const k = sm((sx - .1) / .12); const w = [['Chest', 1 - k * .5]]; if (k > 0) w.push(['Shoulder' + (p[0] > 0 ? 'L' : 'R'), k * .3], ['UpperArm' + (p[0] > 0 ? 'L' : 'R'), k * .2]); return w; } });
    uovo(B, [0, yOf(.83), zAt(yOf(.83)) + profAt(yOf(.83))[1] + profAt(yOf(.83))[2] + .03], [0, -1, .3], .03, .025, .035, mulc(col, .9), [['Chest', 1]], { anelli: 3, seg: 7 });   // il nodo
  }
  // ---------------- COLLETTI: della camicia, i revers della giacca, il collo alto della divisa, il cappuccio della felpa ----------------
  function colletto(B, J, profAt, zAt, yOf, v, listaB) {
    const col = C3v(v.col), y = yOf(.965), P0 = profAt(y), sp = strati(listaB, .96).sp, wN = [['Chest', .4], ['Neck', .6]], z = zAt(y) + P0[2];
    if (v.colletto === 'camicia' || v.colletto === 'revers' || v.colletto === 'alto') {
      const alto = v.colletto === 'alto', rev = v.colletto === 'revers', r0 = alto ? .068 : .066;
      loft(B, [0, 1].map(q => ({ c: [0, y + .005 + q * (alto ? .05 : .03), z - .005], t: [0, 1, 0], f: [0, 0, 1], a: r0 + .012 * (1 - q) + sp * .5, b: r0 - .005 + .012 * (1 - q) + sp * .5, col: q ? mulc(col, 1.05) : col, w: wN, mod: alto ? null : th => { const fr = Math.cos(th); return fr > .8 ? -.5 * sm((fr - .8) / .2) : 0; } })), { seg: 16 });
      // le punte del colletto (o i revers) sul petto
      [1, -1].forEach(s => {
        const L = rev ? .14 : .05, wd = rev ? .045 : .022, a0 = [s * .035, y + .02, z + P0[1] + sp - .006], a1 = [s * (rev ? .075 : .045), y - L, z + P0[1] + sp + (rev ? -.004 : -.01)];
        loft(B, [0, .6, 1].map(q => ({ c: lerp3(a0, a1, q), t: norm(sub(a1, a0)), f: [0, 0, 1], a: wd * (q < .6 ? 1 : 1 - (q - .6) / .4 * .9), b: .004, p: 8, col: rev ? mulc(col, .9) : col, w: q < .5 ? wN : [['Chest', 1]] })), { seg: 4 });
      });
    } else if (v.colletto === 'giro') {
      loft(B, [0, 1].map(q => ({ c: [0, y + q * .025, z - .004], t: [0, 1, 0], f: [0, 0, 1], a: .07 + sp * .5 + .006, b: .064 + sp * .5 + .006, col: mulc(col, q ? .9 : 1), ptile: PT.maglia, w: wN })), { seg: 14 });
    } else if (v.colletto === 'tondo') {
      loft(B, [0, 1].map(q => ({ c: [0, y - .005 + q * .01, z - .004], t: [0, 1, 0], f: [0, 0, 1], a: .085 + sp, b: .078 + sp, col: C3v(v.col3 || '#f2ece0'), w: wN, mod: th => { const fr = Math.cos(th); return fr > .6 ? .12 * sm((fr - .6) / .4) : 0; } })), { seg: 16 });
    } else if (v.colletto === 'cappuccio') {   // il cappuccio abbassato, sulle spalle
      loft(B, [[0, .1, .085, -.02], [.03, .115, .1, -.035], [.07, .1, .095, -.05], [.1, .06, .07, -.07]].map(([dy, a, b, fz]) => ({ c: [0, y + dy - .01, zAt(y)], t: [0, 1, 0], f: [0, 0, 1], a: a + sp * .4, b, fz, col: mulc(col, .95), w: dy > .05 ? [['Neck', .6], ['Chest', .4]] : [['Chest', 1]], mod: th => { const fr = Math.cos(th); return fr > .3 ? -.4 * sm((fr - .3) / .4) : 0; } })), { seg: 16 });
      [1, -1].forEach(s => loft(B, [0, 1].map(q => ({ c: [s * .03, y - .02 - q * .14, z + P0[1] + sp + .002], t: [0, -1, 0], f: [0, 0, 1], a: .004, b: .004, col: C3('#f0ece4'), w: [['Chest', 1]] })), { seg: 4 }));
    }
  }
  // la cintura della divisa: una fascia con la fibbia
  function cintura(B, J, profAt, zAt, yOf, v, listaB) {
    const y = yOf(.3), P0 = profAt(y), sp = strati(listaB, .3).sp, c = C3('#2a2018');
    loft(B, [0, 1].map(q => ({ c: [0, y - .02 + q * .04, zAt(y)], t: [0, 1, 0], f: [0, 0, 1], a: P0[0] + sp + .006, b: P0[1] + sp + .006, fz: P0[2], col: c, w: [['Abdomen', .5], ['Hips', .5]] })), { seg: 16 });
    uovo(B, [0, y, zAt(y) + P0[1] + P0[2] + sp + .008], [0, 0, 1], .022, .018, .006, C3('#c8a848'), [['Abdomen', .5], ['Hips', .5]], { anelli: 2, seg: 6, p: 4, f: [0, 1, 0] });
  }
  // la bandoliera: dalla spalla destra al fianco sinistro
  function bandoliera(B, J, profAt, zAt, yOf, listaB, D) {
    const c = C3('#2a2018'), N = 7, sp = strati(listaB, .6).sp + .01;
    const pts = []; for (let j = 0; j <= N; j++) { const q = j / N, y = lerp(yOf(.92), yOf(.32), q), P0 = profAt(y), x = lerp(-.12, .13, q); const ex = Math.sqrt(Math.max(0, 1 - Math.pow(Math.abs(x) / (P0[0] + sp), 2.2))); pts.push([x, y, zAt(y) + P0[2] + (P0[1] + sp) * ex]); }
    loft(B, pts.map((p, j) => ({ c: p, t: norm(sub(pts[Math.min(N, j + 1)], pts[Math.max(0, j - 1)])), f: [0, 0, 1], a: .022, b: .004, p: 6, col: c, w: catena(p[1], [J.Hips[1], J.Abdomen[1], J.Torso[1], J.Chest[1]], ['Hips', 'Abdomen', 'Torso', 'Chest'], .05) })), { seg: 4 });
  }

  // =====================================================================================
  // L'ATLANTE DEI DISEGNI (una tela sola per tutti): R = apertura (secondo colore), G = linee e ombre (scurisce), B = luce (bottoni, fibbie)
  // =====================================================================================
  const AT = { N: 8, px: 256, tex: null };
  function atlante() {
    if (AT.tex || typeof document === 'undefined') return AT.tex;
    const N = AT.N, px = AT.px, cv = document.createElement('canvas'); cv.width = cv.height = N * px; const x = cv.getContext('2d');
    x.fillStyle = '#000'; x.fillRect(0, 0, N * px, N * px);
    // tessera i (layout) nella riga 0..1, j: disegno ripetuto (motivi) nelle righe 2..3. Le u vanno da 0 (cucitura dietro) a 1, il davanti a 0.5; v da 0 (giù) a 1 (su)
    const T = (i, fn) => { const ox = (i % N) * px, oy = Math.floor(i / N) * px; x.save(); x.beginPath(); x.rect(ox, oy, px, px); x.clip(); x.translate(ox, oy); x.scale(px, px); fn(x); x.restore(); };   // la v della tessera cresce verso il basso della tela, come la legge lo shader (flipY spento)
    const R = 'rgb(255,0,0)', G = 'rgb(0,255,0)', Bl = 'rgb(0,0,255)';
    const line = (c, w, pts) => { c.strokeStyle = G; c.lineWidth = w; c.beginPath(); pts.forEach((p, k) => k ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke(); };
    const dot = (c, col, u, v, r) => { c.fillStyle = col; c.beginPath(); c.ellipse(u, v, r * .5, r, 0, 0, 7); c.fill(); };
    const add = (c) => { c.globalCompositeOperation = 'lighter'; };
    const bottoni = (c, u, v0, v1, n, r) => { for (let k = 0; k < n; k++) { const v = lerp(v0, v1, k / Math.max(1, n - 1)); dot(c, G, u, v, r * 1.5); dot(c, Bl, u, v, r); } };
    // 1 camicia: abbottonatura, taschino, cucitura delle spalle
    T(1, c => { add(c); line(c, .008, [[.5, 0], [.5, .97]]); bottoni(c, .515, .15, .88, 6, .012); line(c, .006, [[.6, .66], [.68, .66], [.68, .56], [.6, .56], [.6, .66]]); line(c, .006, [[.0, .985], [1, .985]]); });
    // 2 giacca: lo scollo a V (secondo colore), due bottoni, le tasche con la pattina, il taschino
    T(2, c => { add(c); c.fillStyle = R; c.beginPath(); c.moveTo(.43, 1.01); c.lineTo(.5, .52); c.lineTo(.57, 1.01); c.fill(); line(c, .008, [[.43, 1.01], [.5, .52], [.5, 0]]); bottoni(c, .52, .26, .42, 2, .014);
      [[.34, .18], [.66, .18]].forEach(([u, v]) => { line(c, .01, [[u - .07, v + .04], [u + .07, v + .04]]); }); line(c, .007, [[.63, .7], [.7, .7]]); line(c, .006, [[.25, 1], [.25, .0]]); line(c, .006, [[.75, 1], [.75, .0]]); });
    // 3 divisa: abbottonatura doppia, tasche a soffietto sul petto, la riga dietro
    T(3, c => { add(c); line(c, .008, [[.5, 0], [.5, 1]]); bottoni(c, .46, .15, .82, 5, .013); bottoni(c, .54, .15, .82, 5, .013);
      [[.36, .7], [.64, .7]].forEach(([u, v]) => { line(c, .007, [[u - .06, v + .06], [u + .06, v + .06], [u + .06, v - .06], [u - .06, v - .06], [u - .06, v + .06]]); line(c, .009, [[u - .065, v + .07], [u + .065, v + .07]]); dot(c, Bl, u, v + .04, .01); }); line(c, .006, [[.0, .5], [.0, 0]]); });
    // 4 cerata: la chiusura con gli alamari, le tasche grandi, le cuciture saldate
    T(4, c => { add(c); line(c, .012, [[.5, 0], [.5, 1]]); for (let k = 0; k < 4; k++) { const v = .2 + k * .2; line(c, .01, [[.47, v], [.53, v]]); } [[.36, .2], [.64, .2]].forEach(([u, v]) => line(c, .008, [[u - .07, v + .1], [u + .07, v + .1], [u + .07, v - .06], [u - .07, v - .06], [u - .07, v + .1]])); line(c, .008, [[0, .82], [1, .82]]); });
    // 5 grembiule: tasca davanti in basso, la pettorina con l'orlo
    T(5, c => { add(c); line(c, .02, [[.0, .02], [1, .02]]); line(c, .006, [[.4, .5], [.6, .5], [.6, .66], [.4, .66], [.4, .5]]); });
    // 6 maglione: le coste del collo e del fondo, il treccia al centro
    T(6, c => { add(c); for (let k = 0; k < 30; k++) line(c, .004, [[k / 30, 0], [k / 30, .07]]); for (let k = 0; k < 6; k++) { const v = .12 + k * .14; line(c, .006, [[.46, v], [.54, v + .07], [.46, v + .14]]); line(c, .006, [[.54, v], [.46, v + .07], [.54, v + .14]]); } });
    // 7 canottiera: gli scavi delle spalle (secondo colore = pelle) e lo scollo
    T(7, c => { add(c); c.fillStyle = R; c.beginPath(); c.ellipse(.5, 1.0, .1, .2, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(0, 1.0, .1, .14, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(1, 1.0, .1, .14, 0, 0, 7); c.fill(); [.25, .75].forEach(u => { c.beginPath(); c.ellipse(u, .98, .1, .17, 0, 0, 7); c.fill(); }); });
    // 8 abito: la vita segnata, i bottoncini sul petto, lo scollo tondo
    T(8, c => { add(c); line(c, .012, [[0, .36], [1, .36]]); bottoni(c, .5, .55, .85, 4, .01); c.fillStyle = R; c.beginPath(); c.ellipse(.5, 1.02, .07, .08, 0, 0, 7); c.fill(); });
    // 9 tuta da lavoro: la zip, il taschino, le cuciture
    T(9, c => { add(c); line(c, .01, [[.5, .1], [.5, 1]]); dot(c, Bl, .5, .97, .012); line(c, .008, [[.6, .72], [.7, .72], [.7, .6], [.6, .6], [.6, .72]]); line(c, .006, [[0, .3], [1, .3]]); });
    // 10 cappotto: doppio petto, revers, le tasche oblique
    T(10, c => { add(c); c.fillStyle = R; c.beginPath(); c.moveTo(.44, 1.01); c.lineTo(.5, .72); c.lineTo(.56, 1.01); c.fill(); line(c, .008, [[.55, .72], [.55, 0]]); bottoni(c, .45, .34, .62, 3, .013); bottoni(c, .56, .34, .62, 3, .013); line(c, .01, [[.3, .1], [.36, .22]]); line(c, .01, [[.7, .1], [.64, .22]]); });
    // 11 gilet: lo scollo a V profondo, i bottoncini, i taschini
    T(11, c => { add(c); c.fillStyle = R; c.beginPath(); c.moveTo(.4, 1.01); c.lineTo(.5, .62); c.lineTo(.6, 1.01); c.fill(); line(c, .006, [[.5, .62], [.5, 0]]); bottoni(c, .51, .1, .56, 5, .01); line(c, .008, [[.36, .3], [.44, .3]]); line(c, .008, [[.56, .3], [.64, .3]]); });
    // 12 le due bande della tuta sui fianchi (u 0,25 e 0,75)
    T(12, c => { c.fillStyle = R; [.25, .75].forEach(u => { c.fillRect(u - .045, 0, .03, 1); c.fillRect(u + .015, 0, .03, 1); }); });
    // pieghe a inchiostro (linea chiara): tratti corti che si assottigliano
    const piega = (c, a, b, w) => { c.strokeStyle = G; c.lineCap = 'round'; for (let k = 0; k < 3; k++) { c.globalAlpha = [1, .6, .3][k]; c.lineWidth = w * [1, .7, .4][k]; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(lerp(a[0], b[0], 1 - k * .25), lerp(a[1], b[1], 1 - k * .25)); c.stroke(); } c.globalAlpha = 1; };
    const cuci = (c, pts, w) => { c.save(); c.setLineDash([.012, .009]); c.strokeStyle = Bl; c.lineWidth = w || .004; c.beginPath(); pts.forEach((p, k) => k ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke(); c.restore(); };
    const costine = (c, v0, v1, n) => { for (let k = 0; k < n; k++) line(c, .003, [[k / n, v0], [k / n, v1]]); line(c, .006, [[0, v1], [1, v1]]); };
    const pieghe_busto = c => { piega(c, [.22, .8], [.3, .68], .008); piega(c, [.78, .8], [.7, .68], .008); piega(c, [.3, .22], [.38, .3], .007); piega(c, [.7, .22], [.62, .3], .007); piega(c, [.03, .2], [.08, .28], .005); piega(c, [.97, .2], [.92, .28], .005); line(c, .003, [[.25, 0], [.25, 1]]); line(c, .003, [[.75, 0], [.75, 1]]); };
    // 13 maglietta: il collo a costine, l'orlo cucito, le pieghe sotto le ascelle e in vita
    T(13, c => { add(c); line(c, .01, [[0, .975], [1, .975]]); cuci(c, [[0, .04], [1, .04]]); pieghe_busto(c); });
    // 14 maglietta con la stampa sul petto (secondo colore)
    T(14, c => { add(c); line(c, .01, [[0, .975], [1, .975]]); cuci(c, [[0, .04], [1, .04]]); pieghe_busto(c);
      c.fillStyle = R; c.beginPath(); c.arc(.5, .66, .075, 0, 7); c.fill(); c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.arc(.5, .66, .05, 0, 7); c.fill(); c.globalCompositeOperation = 'lighter'; c.fillStyle = R; c.fillRect(.44, .645, .12, .03); c.fillRect(.41, .53, .18, .035); c.fillRect(.44, .49, .12, .02); });
    // 15 felpa: la tasca a marsupio, le costine in fondo, le pieghe
    T(15, c => { add(c); costine(c, 0, .08, 40); c.fillStyle = 'rgba(0,255,0,.18)'; c.beginPath(); c.moveTo(.37, .1); c.lineTo(.63, .1); c.lineTo(.6, .34); c.lineTo(.4, .34); c.closePath(); c.fill(); line(c, .006, [[.37, .1], [.4, .34], [.6, .34], [.63, .1]]); line(c, .007, [[.37, .1], [.33, .24], [.4, .34]]); line(c, .007, [[.63, .1], [.67, .24], [.6, .34]]); cuci(c, [[.4, .32], [.6, .32]]); pieghe_busto(c); });
    // 38 bomber: la zip, le costine di fondo e del collo, le trapuntature, la taschina sulla manica no: sul petto
    T(38, c => { add(c); costine(c, 0, .09, 40); line(c, .008, [[.5, .09], [.5, 1]]); dot(c, Bl, .5, .93, .014); for (let k = 1; k < 5; k++) { c.globalAlpha = .5; line(c, .004, [[0, .09 + k * .18], [1, .09 + k * .18]]); } c.globalAlpha = 1; line(c, .006, [[.6, .72], [.7, .72], [.7, .62], [.6, .62], [.6, .72]]); pieghe_busto(c); });
    // la tuta (9) prende anche le pieghe
    T(9, c => { add(c); pieghe_busto(c); costine(c, 0, .05, 40); });
    // 24 jeans, sulla gamba (v 0 all'anca, 1 alla caviglia; u 0,25 il fuori, 0,75 il dentro, 0,5 davanti): cuciture doppie, tasche, patta, tasca dietro, pieghe al ginocchio e in fondo
    T(24, c => { add(c); line(c, .004, [[.25, 0], [.25, 1]]); cuci(c, [[.235, 0], [.235, 1]]); cuci(c, [[.265, 0], [.265, 1]]); line(c, .004, [[.75, 0], [.75, 1]]); cuci(c, [[.765, 0], [.765, 1]]);
      line(c, .007, [[.43, 0], [.36, .07], [.27, .1]]); cuci(c, [[.45, 0], [.38, .085], [.27, .12]]); line(c, .005, [[.62, 0], [.62, .13], [.68, .16]]); cuci(c, [[.6, 0], [.6, .12], [.66, .15]]);
      line(c, .006, [[.05, .03], [.19, .03], [.19, .14], [.12, .17], [.05, .14], [.05, .03]]); cuci(c, [[.065, .045], [.175, .045], [.175, .13], [.12, .155], [.065, .13], [.065, .045]]); line(c, .006, [[.0, .02], [.22, .035]]);
      [[.46, .5, .52, .47], [.5, .53, .56, .51], [.44, .55, .5, .53]].forEach(([a, b, d, e]) => piega(c, [a, b], [d, e], .007)); [[.42, .88, .5, .9], [.52, .92, .6, .9], [.3, .9, .36, .94], [.66, .94, .72, .9]].forEach(([a, b, d, e]) => piega(c, [a, b], [d, e], .007)); cuci(c, [[0, .985], [1, .985]]); });
    // 25 calzoni: la piega davanti e dietro, le tasche oblique, la tasca a filetto, le pieghe
    T(25, c => { add(c); c.globalAlpha = .7; line(c, .003, [[.5, .12], [.5, 1]]); line(c, .003, [[.0, .12], [.0, 1]]); line(c, .003, [[1, .12], [1, 1]]); c.globalAlpha = 1; line(c, .004, [[.25, 0], [.25, 1]]); line(c, .006, [[.4, 0], [.29, .13]]); line(c, .007, [[.07, .08], [.18, .08]]); line(c, .005, [[.62, 0], [.62, .12]]);
      piega(c, [.45, .52], [.52, .49], .006); piega(c, [.43, .9], [.5, .92], .006); piega(c, [.55, .93], [.62, .9], .006); });
    // 12 le bande della tuta, più le pieghe e l'elastico in fondo
    T(12, c => { c.fillStyle = R; [.25, .75].forEach(u => { c.fillRect(u - .045, 0, .03, 1); c.fillRect(u + .015, 0, .03, 1); }); add(c); piega(c, [.44, .5], [.52, .47], .007); piega(c, [.5, .54], [.57, .51], .006); costine(c, .94, 1, 30); });
    // 27 manica: la cucitura della spalla, le pieghe del gomito (davanti), l'orlo; 28 col polsino a costine
    const manica = c => { add(c); line(c, .005, [[0, .1], [1, .1]]); [[.44, .47, .52, .5], [.47, .52, .55, .55], [.43, .56, .5, .58]].forEach(([a, b, d, e]) => piega(c, [a, b], [d, e], .009)); line(c, .003, [[0, .1], [0, 1]]); };
    T(27, c => { manica(c); cuci(c, [[0, .975], [1, .975]]); });
    T(28, c => { manica(c); costine(c, .9, 1, 30); });
    // 32 scarpa da ginnastica (u 0,5 sopra, 0,25 e 0,75 i fianchi; v 0 tallone, 1 punta): lacci, occhielli, linguetta, puntale, il segno sul fianco
    T(32, c => { add(c); for (let k = 0; k < 5; k++) { const v = .38 + k * .075; line(c, .012, [[.44, v], [.56, v + .04]]); line(c, .012, [[.56, v], [.44, v + .04]]); dot(c, Bl, .43, v, .008); dot(c, Bl, .57, v, .008); } line(c, .008, [[.4, .3], [.6, .3]]);
      line(c, .007, [[.28, .82], [.4, .86], [.6, .86], [.72, .82]]); cuci(c, [[.28, .8], [.4, .84], [.6, .84], [.72, .8]]); line(c, .006, [[.42, .0], [.42, .12], [.58, .12], [.58, 0]]);
      c.fillStyle = R; [[.25, 1], [.75, -1]].forEach(([u, s]) => { c.beginPath(); c.moveTo(u - .06 * s, .3); c.quadraticCurveTo(u + .02 * s, .42, u + .08 * s, .7); c.lineTo(u + .03 * s, .7); c.quadraticCurveTo(u - .02 * s, .45, u - .06 * s, .3); c.fill(); }); });
    // 33 la suola: la riga di gomma a metà
    T(33, c => { add(c); [.25, .75].forEach(u => line(c, .02, [[u, 0], [u, 1]])); });
    // 34 scarpa di cuoio: lacci, puntale cucito, la cucitura del tallone
    T(34, c => { add(c); for (let k = 0; k < 3; k++) line(c, .008, [[.45, .45 + k * .06], [.55, .45 + k * .06]]); line(c, .006, [[.3, .8], [.5, .85], [.7, .8]]); cuci(c, [[.3, .77], [.5, .82], [.7, .77]]); line(c, .005, [[.5, 0], [.5, .2]]); });
    // 36 cappellino: sei spicchi, il bottone, il logo davanti; 37 lo stesso girato (il logo dietro, la fibbia davanti)
    const spicchi = c => { add(c); for (let k = 0; k < 6; k++) { const u = (k + .5) / 6; line(c, .006, [[u, 0], [u, 1]]); cuci(c, [[u + .012, 0], [u + .012, .9]]); } line(c, .006, [[0, .06], [1, .06]]); };
    const logo = (c, u) => { c.fillStyle = R; c.beginPath(); c.arc(u, .42, .07, 0, 7); c.fill(); c.globalCompositeOperation = 'destination-out'; c.fillRect(u - .015, .3, .03, .24); c.globalCompositeOperation = 'lighter'; };
    T(36, c => { spicchi(c); logo(c, .5); });
    T(37, c => { spicchi(c); logo(c, 0); logo(c, 1); line(c, .02, [[.44, .02], [.56, .02]]); });
    // 40-47 le facce (u allargata: il viso riempie la tessera; v 0 il mento, 1 la sommità). R = sopracciglia e barba (colore dei capelli), B = il bianco degli occhi, R+B = le labbra, G = l'inchiostro
    const faccia = (i, o) => T(40 + i, c => {
      const ey = .472, ex = o.ex || .118, h = (o.stretti ? .016 : .021) * (o.oh || 1), w = .047 * (o.ow || 1), br = o.ciglia || 0;
      c.lineCap = 'round'; c.lineJoin = 'round';
      [-1, 1].forEach(s => { const x = .5 + s * ex, xi = x - s * w, xo = x + s * w;   // xi verso il naso, xo verso la tempia
        // la mandorla: il bianco appena, l'iride grande e scura, la palpebra di sopra pesante e un po' calata verso l'esterno
        c.fillStyle = Bl; c.beginPath(); c.moveTo(xi, ey); c.quadraticCurveTo(x, ey + h * 2.1, xo, ey + h * .25); c.quadraticCurveTo(x, ey - h * 1.5, xi, ey); c.fill();
        c.fillStyle = G; c.beginPath(); c.ellipse(x - s * .004, ey + h * .15, .021, h * 1.02, 0, 0, 7); c.fill();
        c.fillStyle = Bl; c.beginPath(); c.arc(x - s * .01, ey + h * .55, .005, 0, 7); c.fill();   // il punto di luce
        c.strokeStyle = G; c.lineWidth = .014 + br * .006; c.beginPath(); c.moveTo(xi - s * .004, ey - h * .1); c.quadraticCurveTo(x, ey + h * 2.3, xo + s * .008, ey + h * .1); c.stroke();
        if (br) { c.lineWidth = .007; c.beginPath(); c.moveTo(xo, ey + h * .3); c.lineTo(xo + s * .018, ey + h * 1.1); c.stroke(); }
        c.lineWidth = .004; c.globalAlpha = .55; c.beginPath(); c.moveTo(xi + s * .008, ey - h * .9); c.quadraticCurveTo(x, ey - h * 1.7, xo - s * .004, ey - h * .5); c.stroke(); c.globalAlpha = 1;
        c.lineWidth = .004; c.globalAlpha = .45; c.beginPath(); c.moveTo(xi + s * .01, ey + h * 2.6); c.quadraticCurveTo(x, ey + h * 3.4, xo - s * .006, ey + h * 2.2); c.stroke(); c.globalAlpha = 1;   // la piega della palpebra
        // le sopracciglia: basse, quasi dritte, vicine agli occhi; la testa verso il naso un filo più giù
        const bt = o.brow || 0, bw = o.browW || .03; c.strokeStyle = R; c.lineWidth = bw; c.beginPath(); c.moveTo(.5 + s * .05, .525 - bt * .012 + (o.bh || 0)); c.quadraticCurveTo(.5 + s * .11, .548 + (o.arco || 0) + (o.bh || 0), .5 + s * .175, .535 + bt * .008 + (o.bh || 0) - (o.coda || 0)); c.stroke();
        if (o.rughe) { c.strokeStyle = G; c.lineWidth = .004; c.beginPath(); c.moveTo(xo + s * .006, ey + .004); c.lineTo(xo + s * .022, ey + .016); c.moveTo(xo + s * .006, ey - .006); c.lineTo(xo + s * .022, ey - .014); c.stroke(); c.beginPath(); c.moveTo(x - .03, ey - .04); c.quadraticCurveTo(x, ey - .052, x + .03, ey - .04); c.stroke(); } });
      c.strokeStyle = G;
      // il naso: l'ombra del dorso da un lato, le ali, le narici
      c.globalAlpha = .5; c.lineWidth = .006; c.beginPath(); c.moveTo(.47, .515); c.quadraticCurveTo(.455, .42, .46, .35); c.stroke(); c.globalAlpha = 1;
      c.lineWidth = .007; [-1, 1].forEach(s => { c.beginPath(); c.moveTo(.5 + s * .045, .345); c.quadraticCurveTo(.5 + s * .05, .322, .5 + s * .02, .318); c.stroke(); });
      // la bocca: larga e dritta, il labbro di sotto accennato; l'umore la piega appena
      const um = o.umore || 0, my = .19, mw = o.mw || .08;
      if (o.labbra) { c.fillStyle = 'rgb(255,0,255)'; c.beginPath(); c.moveTo(.5 - mw, my); c.quadraticCurveTo(.5, my + .025, .5 + mw, my); c.quadraticCurveTo(.5, my - .03, .5 - mw, my); c.fill(); }
      c.lineWidth = .01; c.beginPath(); c.moveTo(.5 - mw, my + um * .012); c.quadraticCurveTo(.5, my - um * .02 + .004, .5 + mw, my + um * .012 - (o.storto ? .008 : 0)); c.stroke();
      c.lineWidth = .006; c.globalAlpha = .5; c.beginPath(); c.moveTo(.46, my - .035); c.quadraticCurveTo(.5, my - .045, .54, my - .035); c.stroke(); c.globalAlpha = 1;
      c.lineWidth = .004; c.globalAlpha = .4; c.beginPath(); c.moveTo(.5, my + .1); c.lineTo(.5, my + .035); c.stroke(); c.globalAlpha = 1;   // il solco sopra il labbro
      if (um > .3) [-1, 1].forEach(s => { c.lineWidth = .005; c.beginPath(); c.moveTo(.5 + s * (mw + .02), my + .03); c.quadraticCurveTo(.5 + s * (mw + .03), my + .005, .5 + s * (mw + .012), my - .012); c.stroke(); });
      if (o.rughe) [-1, 1].forEach(s => { c.lineWidth = .005; c.beginPath(); c.moveTo(.5 + s * .06, .35); c.quadraticCurveTo(.5 + s * .11, .28, .5 + s * (mw + .025), .17); c.stroke(); c.beginPath(); c.moveTo(.4, .66 + s * .018); c.lineTo(.6, .66 + s * .018); c.stroke(); });
      if (o.duro) [-1, 1].forEach(s => { c.lineWidth = .006; c.beginPath(); c.moveTo(.5 + s * .018, .5); c.lineTo(.5 + s * .022, .545); c.stroke(); });
      if (o.zigomi) [-1, 1].forEach(s => { c.lineWidth = .004; c.globalAlpha = .35; c.beginPath(); c.moveTo(.5 + s * .2, .42); c.quadraticCurveTo(.5 + s * .18, .34, .5 + s * .14, .3); c.stroke(); c.globalAlpha = 1; });
      if (o.barbetta) { c.fillStyle = R; c.globalAlpha = .16; c.beginPath(); c.moveTo(.2, .38); c.quadraticCurveTo(.25, .0, .5, -.04); c.quadraticCurveTo(.75, .0, .8, .38); c.lineTo(.7, .36); c.quadraticCurveTo(.6, .14, .5, .13); c.quadraticCurveTo(.4, .14, .3, .36); c.closePath(); c.fill(); c.beginPath(); c.ellipse(.5, .245, .09, .02, 0, 0, 7); c.fill(); c.globalAlpha = 1; }
    });
    FACCE.forEach((o, i) => faccia(i, o));
    // i motivi (ripetuti ogni 'prep' metri): R = secondo colore (col3)
    const P = (j, fn) => T(16 + j, fn);
    P(1, c => { c.fillStyle = R; for (let k = 0; k < 4; k++) c.fillRect(0, k / 4, 1, .1); });   // righe da marinaio
    P(2, c => { c.globalAlpha = .55; c.fillStyle = R; for (let k = 0; k < 4; k++) { c.fillRect(k / 4, 0, .1, 1); c.fillRect(0, k / 4, 1, .1); } c.globalAlpha = 1; for (let k = 0; k < 4; k++) for (let l = 0; l < 4; l++) c.fillRect(k / 4, l / 4, .1, .1); });   // quadri
    P(3, c => { const fl = (u, v, r) => { c.fillStyle = R; for (let k = 0; k < 5; k++) { const a = k / 5 * 6.283; c.beginPath(); c.ellipse(u + Math.cos(a) * r, v + Math.sin(a) * r, r * .7, r * .7, 0, 0, 7); c.fill(); } c.fillStyle = 'rgb(0,0,255)'; c.beginPath(); c.ellipse(u, v, r * .55, r * .55, 0, 0, 7); c.fill(); c.fillStyle = 'rgb(0,255,0)'; c.beginPath(); c.ellipse(u + r * 1.9, v - r * .6, r * .9, r * .4, .5, 0, 7); c.fill(); };
      [[.2, .25, .07], [.7, .15, .05], [.55, .62, .075], [.12, .78, .05], [.88, .6, .045], [.38, .95, .04], [.88, .95, .06]].forEach(p => { fl(p[0], p[1], p[2]); fl(p[0] - 1, p[1], p[2]); fl(p[0], p[1] - 1, p[2]); }); });   // fiori
    P(4, c => { c.fillStyle = 'rgb(0,255,0)'; for (let k = 0; k < 8; k++) for (let l = 0; l < 8; l++) { c.globalAlpha = .35; c.beginPath(); c.ellipse((k + (l % 2) * .5) / 8, l / 8, .03, .05, 0, 0, 7); c.fill(); } c.globalAlpha = 1; });   // maglia
    P(5, c => { c.fillStyle = R; for (let k = 0; k < 4; k++) for (let l = 0; l < 4; l++) { c.beginPath(); c.arc((k + (l % 2) * .5) / 4 + .06, l / 4 + .06, .045, 0, 7); c.fill(); } });   // pois
    P(6, c => { c.fillStyle = R; for (let k = 0; k < 8; k++) c.fillRect(k / 8, 0, .025, 1); });   // righine verticali
    const tex = new THREE.CanvasTexture(cv); tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.anisotropy = 4; tex.flipY = false; AT.tex = tex; AT.cv = cv; return tex;
  }

  // =====================================================================================
  // IL MATERIALE (uno per tutta la gente): colori per vertice, l'atlante, un filo di luce propria
  // =====================================================================================
  let MAT = null, MAT_STILE = null;
  function materiale() {
    if (MAT && MAT_STILE === CFG.stile) return MAT; const st = S(); MAT_STILE = CFG.stile;
    let m;
    if (st.toon) { const n = st.toon, d = new Uint8Array(n * 4); for (let i = 0; i < n; i++) { const v = Math.round(n === 2 ? [150, 215][i] : lerp(108, 200, Math.pow(i / (n - 1), .8))); d.set([v, v, v, 255], i * 4); } const gm = new THREE.DataTexture(d, n, 1); gm.needsUpdate = true; m = new THREE.MeshToonMaterial({ gradientMap: gm }); }
    else m = new THREE.MeshStandardMaterial({ roughness: .78, metalness: 0 });
    m.vertexColors = true; m.name = 'personaggi'; m.userData.personaggi = true;
    const tex = atlante(), N = AT.N;
    const EMI = (st.toon ? .05 : .22).toFixed(3);
    m.onBeforeCompile = sh => {
      sh.uniforms.uAtl = { value: tex };
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 col2; attribute vec3 col3; attribute vec3 atl; attribute vec3 mot; varying vec3 vC2; varying vec3 vC3; varying vec3 vAtl; varying vec3 vMot;')
        .replace('#include <color_vertex>', '#include <color_vertex>\nvC2 = col2; vC3 = col3; vAtl = atl; vMot = mot;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nuniform sampler2D uAtl; varying vec3 vC2; varying vec3 vC3; varying vec3 vAtl; varying vec3 vMot;
        vec3 atlS(float t, vec2 uv) { float N = ${N}.0; vec2 o = vec2(mod(t, N), floor(t / N)) / N; return texture2D(uAtl, o + clamp(uv, .004, .996) / N).rgb; }`)
        .replace('#include <color_fragment>', `#include <color_fragment>
        { vec3 L = vAtl.z > .5 ? atlS(floor(vAtl.z + .5), vec2(vAtl.x, vAtl.y)) : vec3(0.);
          vec3 M = vMot.z > .5 ? atlS(16. + floor(vMot.z + .5), fract(vMot.xy * 6.)) : vec3(0.);
          vec3 c = diffuseColor.rgb;
          c = mix(c, vC3 * (1. - M.g * .4), M.r); c = mix(c, vec3(.95, .85, .3), M.b * .7); c *= 1. - M.g * .25;
          float lip = min(L.r, L.b); c = mix(c, vC3, lip); c = mix(c, vC2, L.r - lip); c *= 1. - L.g * .78; c = mix(c, vec3(.95, .93, .88), (L.b - lip) * .9);
          diffuseColor.rgb = c; }`)
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * ' + EMI + ';');   // [inverno] i personaggi si staccano dallo sfondo
    };
    m.customProgramCacheKey = () => 'personaggi' + CFG.stile;
    MAT = m; return m;
  }
  let OUT = null; const OLU = { value: .0001 };   // il contorno (stile b): la stessa pelle, gonfiata e girata
  function contorno() {
    if (OUT) return OUT; OUT = new THREE.MeshBasicMaterial({ color: '#2a1c18', side: THREE.BackSide });
    OUT.onBeforeCompile = sh => { sh.uniforms.uOl = OLU; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uOl; attribute float ol;').replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += normalize(objectNormal) * uOl; if (ol < .5) transformed = vec3(0.);'); };
    OUT.customProgramCacheKey = () => 'personaggi-contorno' + CFG.stile; return OUT;
  }

  // =====================================================================================
  // DALLA GEOMETRIA ALLA PELLE SUL SCHELETRO
  // =====================================================================================
  function geometria(D, mesh, rel, J) {
    const B = costruisci(D, J), bones = mesh.skeleton.bones, idx = new Map(); bones.forEach((b, i) => idx.set(b.name, i));
    const n = B.n, inv = new THREE.Matrix4().copy(rel).invert(), nm = new THREE.Matrix3().getNormalMatrix(inv), v = new THREE.Vector3();
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      v.set(B.P[i * 3], B.P[i * 3 + 1], B.P[i * 3 + 2]).applyMatrix4(inv); pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z;
      v.set(B.N[i * 3], B.N[i * 3 + 1], B.N[i * 3 + 2]).applyMatrix3(nm).normalize(); nor[i * 3] = v.x; nor[i * 3 + 1] = v.y; nor[i * 3 + 2] = v.z;
      const w = B.W[i].filter(e => idx.has(e[0])).sort((a, b) => b[1] - a[1]).slice(0, 4); let s = 0; w.forEach(e => s += e[1]); if (!w.length) { w.push(['Hips', 1]); s = 1; }
      w.forEach((e, k) => { si[i * 4 + k] = idx.get(e[0]) || 0; sw[i * 4 + k] = e[1] / s; });
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(B.C, 3)); g.setAttribute('col2', new THREE.Float32BufferAttribute(B.C2, 3)); g.setAttribute('col3', new THREE.Float32BufferAttribute(B.C3, 3));
    g.setAttribute('atl', new THREE.Float32BufferAttribute(B.L, 3)); g.setAttribute('ol', new THREE.Float32BufferAttribute(B.O, 1)); g.setAttribute('mot', new THREE.Float32BufferAttribute(B.M, 3));
    g.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4)); g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
    g.setIndex(n > 65535 ? new THREE.Uint32BufferAttribute(B.I, 1) : new THREE.Uint16BufferAttribute(B.I, 1));
    g.computeBoundingSphere(); g.userData.personaggi = true; g.userData.tri = B.I.length / 3;
    return g;
  }
  // il modello del kit diventa la figura: le sue mesh se ne vanno, resta lo scheletro (con armi e attrezzi agganciati)
  function veste(g, D) {
    const u = g.userData, m = u.mixer && u.mixer.getRoot ? u.mixer.getRoot() : null; let ref = null; const kit = [];
    (m || g).traverse(o => { if (o.isSkinnedMesh && !o.userData.personaggi) { kit.push(o); if (!ref || /Body/.test(o.name)) ref = ref && /Body/.test(ref.name) ? ref : o; } });
    if (!ref) return false;
    const corr = []; g.traverse(o => { if (o.userData && o.userData.corredo) corr.push(o); }); corr.forEach(o => o.parent && o.parent.remove(o));   // il corredo a scatole di models.js
    const bs = u.body.scale.clone(); u.body.scale.set(1, 1, 1);
    const { J, rel } = giunture(g, ref), geo = geometria(D, ref, rel, J);
    const sk = new THREE.SkinnedMesh(geo, materiale()); sk.name = 'Personaggio'; sk.userData.personaggi = true; sk.castShadow = true; sk.frustumCulled = false;
    sk.bind(ref.skeleton, ref.bindMatrix); ref.parent.add(sk); sk.position.copy(ref.position); sk.quaternion.copy(ref.quaternion); sk.scale.copy(ref.scale);
    if (S().contorno) { const ws = new THREE.Vector3(); ref.getWorldScale(ws); const gs = new THREE.Vector3(); g.getWorldScale(gs); OLU.value = S().contorno / (ws.x / gs.x || 1); const ol = new THREE.SkinnedMesh(geo, contorno()); ol.bind(ref.skeleton, ref.bindMatrix); ol.userData.personaggi = true; ol.frustumCulled = false; ref.parent.add(ol); ol.position.copy(ref.position); ol.quaternion.copy(ref.quaternion); ol.scale.copy(ref.scale); }
    kit.forEach(o => { if (o.parent) o.parent.remove(o); });
    ['L', 'R'].forEach(sd => { const ua = ref.skeleton.bones.find(b => b.name === 'UpperArm' + sd), wr = ref.skeleton.bones.find(b => b.name === 'Wrist' + sd); if (!ua) return; ua.scale.multiplyScalar(BRACCIO);
      if (wr) wr.children.forEach(ch => { if (!ch.isBone) ch.scale.multiplyScalar(1 / BRACCIO); }); });   // armi e attrezzi già agganciati al polso restano della loro misura
    const C = D.corpo || {}; u.body.scale.set(bs.x ? (C.largo || 1) : 1, C.alt || 1, C.largo || 1);
    u.personaggio = D; u.tri = geo.userData.tri; u.pelle = sk;
    return true;
  }

  // =====================================================================================
  // IL DESCRITTORE: chi è (sesso, età, mestiere, quartiere) → corpo, testa, vestiti, colori. Sempre uguale per la stessa persona.
  // =====================================================================================
  const PELLI = ['#f0c8a8', '#e8b898', '#d8a888', '#c89070', '#b07a58', '#e0b090', '#a86a48'];
  const CAPELLI = ['#1a1410', '#2a1a12', '#3a2414', '#5a3a1a', '#7a5028', '#1a1a1a', '#8a6a3a'];
  const GRIGI = ['#a8a49c', '#c8c4bc', '#e0dcd4', '#7a766e'];
  function descrittore(look, who, n) { return Object.assign({ sesso: 'm', eta: 35, pelle: (look && look.skin) || '#d8a888', vesti: [], scarpe: { tipo: 'scarpe', col: '#2a2018' } }, look && look.personaggio || {}); }

  // =====================================================================================
  // LA FIGURA PRONTA: lo scheletro del kit (clip e pose di sempre) con la pelle nuova
  // =====================================================================================
  const POSE = ['Idle', 'Walk', 'Run', 'Death', 'Punch_Right', 'Punch_Left', 'HitRecieve', 'Wave', 'Interact', 'Idle_Gun', 'Run_Shoot', 'Roll', 'Kick_Right'];
  function figura(D, who, raw) {
    if (!window.Models) return null; const person = raw || RAW || Models.person;
    const g = person.call(Models, { model: D.sesso === 'f' ? 'Casual' : 'Casual_2', hat: 'none', extra: '', skin: D.pelle, top: '#888', bottom: '#888', hair: '#222' }, who === 'player' ? 'player' : who === 'cop' ? 'cop' : null);
    if (!g) return null;
    if (!veste(g, D)) return g;
    if (g.userData.riotHat && D.cappello) g.userData.copHat = null;
    return g;
  }
  const RAW = typeof Models !== 'undefined' && Models.person && !Models.person.__vesti ? Models.person : null;   // il costruttore del kit, prima che Vesti3D lo avvolga
  return { CFG, STILI, CAPI, SCARPE, TESTE, figura, veste, geometria, giunture, descrittore, materiale, atlante, POSE, PELLI, CAPELLI, GRIGI, set: (k, v) => { CFG[k] = v; } };
})();
if (typeof module !== 'undefined') module.exports = Personaggi;
