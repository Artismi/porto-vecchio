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
  const CFG = { teste: ((Q.match(/[?&]teste=(\w+)/) || [])[1] || 'kit'), facce: ((Q.match(/[?&]facce=(\w+)/) || [])[1] || 'scolpite'), on: !/[?&]vecchiagente\b/.test(Q), capelli: ((Q.match(/[?&]capelli=(\w+)/) || [])[1] || 'mie'), stile: ((Q.match(/[?&]stile=([abck])/i) || [])[1] || 'k').toLowerCase() };
  const cl = (x, a, b) => x < a ? a : x > b ? b : x, lerp = (a, b, t) => a + (b - a) * t, sm = t => (t = cl(t, 0, 1), t * t * (3 - 2 * t));
  const spow = (v, e) => Math.sign(v) * Math.pow(Math.abs(v), e);
  function rng(seed) { let h = 2166136261; for (const ch of String(seed)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h |= 0; h = (h + 0x6D2B79F5) | 0; let t = Math.imul(h ^ (h >>> 15), 1 | h); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const C3 = c => { const k = new THREE.Color(c); return [k.r, k.g, k.b]; };
  const mulc = (c, k) => [c[0] * k, c[1] * k, c[2] * k], mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

  // =====================================================================================
  // GLI STILI (la tavola di prova): proporzioni, forme delle sezioni, ombreggiatura
  // =====================================================================================
  // [personaggi] LA MARCA sulle magliette (il logo nel riquadro, il retro della coach): un nome solo, qui. Si prova dal vivo con ?marca=NOME.
  const MARCA = (((typeof location !== 'undefined' && /[?&]marca=([^&]+)/.exec(location.search)) || [])[1] && decodeURIComponent(/[?&]marca=([^&]+)/.exec(location.search)[1]).toUpperCase().slice(0, 10)) || 'DOPE';
  const BRACCIO = 1.07;   // [personaggi] le braccia del kit sono corte: +7% scalando l'osso del braccio (la scala non è nelle clip)
  const STILI = {
    a: { nome: 'Statuina dipinta', testa: 1, mani: 1, piedi: 1, naso: 1, p: 2.25, seg: 16, spalle: 1, toon: 0, contorno: 0 },
    k: { nome: 'Kit', testa: 1.08, testaKit: 1, occhi: 1, mani: 1, piedi: 1, naso: .6, p: 2.6, seg: 10, pTesta: 2.35, spalle: 1, toon: 0, contorno: 0, piatto: 1, inchiostro: .32, luce: .3 },   // [personaggi] come i modelli del kit: sfaccettato, luce piatta, niente contorno (la tavola scelta)   // [personaggi] come i modelli del kit: sfaccettato, luce piatta, niente contorno, segni appena
    b: { nome: 'Linea chiara', testa: 1.08, mani: 1, piedi: 1, naso: .6, p: 3.1, seg: 14, pTesta: 2.35, spalle: 1, toon: 3, contorno: .008 },
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
    for (let i = v0; i < this.n; i++) { const q = i * 3, l = Math.hypot(N[q], N[q + 1], N[q + 2]); if (l < 1e-9) { N[q] = 0; N[q + 1] = 1; N[q + 2] = 0; } else { N[q] /= l; N[q + 1] /= l; N[q + 2] /= l; } }   // [personaggi] ai poli (raggio zero) la normale va in su, non a zero
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
        const th = (k / seg - .5) * (o.arco ? o.arco * 2 : Math.PI * 2), d = 1 + (r.mod ? r.mod(th, r) : 0) + (o.mod ? o.mod(th, r, j) : 0);
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
    const ring = (t, tr, v) => { const G = geom(t), L = tr.top, sp = tr.sp, F = L && L.forma, zona = o.zona;
      let da = 0, db = 0, pp = G.p, fold = null;
      if (F) {   // [personaggi] la sagoma del capo: sacchi gonfi, spalle scese, sbuffo sopra la costina, maniche che si allargano, pieghe che cadono, il mucchio in fondo ai pantaloni
        const u = cl((t - L.da) / ((L.a - L.da) || 1), 0, 1), uo = (L.orlo || 0) / ((L.a - L.da) || 1), inOrlo = tr.orlo;
        const gz = F.gonfio && (zona === 'gamba' ? null : F.gonfio); if (gz && !inOrlo) { const g = gz[1] * Math.pow(Math.sin(Math.PI * gz[0] * u), 2) * (zona === 'braccio' ? .75 : 1); da += g; db += g; }
        if (zona === 'busto') {
          if (F.drop) { const k = sm((u - .7) / .16) * (1 - sm((u - .95) / .05)); da += F.drop * .9 * k; db += F.drop * .28 * k; }
          if (F.blusa && !inOrlo) { const k = Math.exp(-(((u - uo - .06) / .08) ** 2)), bl = F.blusa; da += bl * k; db += bl * k * 1.1; }
          if (F.dritto && u < .7) { const k = F.dritto * sm(1 - u / .7); da += .011 * k; db += .015 * k; }   // il capo cade dritto dal petto, non segue la vita
          if (F.box) pp = lerp(F.box, S().p, sm((u - .6) / .25));   // squadrato in basso, tondo sulle spalle (niente spigoli sopra il braccio)
          if (F.pieghe) { const [n, A] = F.pieghe, w = (1 - sm((u - .05) / .45)) * A * .85; if (w > 1e-4) fold = th => w * (.5 + .5 * Math.sin(n * th + 1.3)) ** 1.5; }
        } else if (zona === 'braccio') {
          if (F.manica && !inOrlo) { const uE = Math.max(.05, 1 - uo), k = sm(u / uE) * (u <= uE ? 1 : 0), m = Math.min(F.manica, .035); da += m * k; db += m * k; }
          if (F.grinze && !inOrlo) { const w = F.grinze * .85 * Math.exp(-(((u - .55) / .18) ** 2)); if (w > 1e-4) fold = th => w * (.5 + .5 * Math.sin(3 * th + u * 30)); }
          } else if (zona === 'gamba') {
          if (F.pila && !inOrlo) { const k = sm((u - .74) / .22), pl = F.pila; da += pl * k; db += pl * k * 1.1; }   // il mucchio sulla scarpa: liscio, senza anelli
          if (F.ginocchio) { const k = Math.exp(-(((u - .5) / .16) ** 2)); da += F.ginocchio * .5 * k; db += F.ginocchio * k * 1.2; }
          if (F.pieghe) { const [n, A] = F.pieghe, w = A * .8 * sm((u - .6) / .3); if (w > 1e-4) fold = th => w * (.5 + .5 * Math.sin(n * th + .7)) ** 1.5; }
        }
      }
      const m0 = L && L.mod ? (th => L.mod(th, t)) : null, mod = fold && m0 ? (th => m0(th) + fold(th)) : fold || m0;
      return Object.assign({}, G, { spT: sp, a: G.a + sp + da, b: G.b + sp + db, p: pp, col: L ? (tr.orlo && L.colOrlo ? L.colOrlo : L.col) : pelle, col2: L && L.col2, col3: L && L.col3, tile: L ? (L.tile || 0) : 0, ptile: L ? (L.ptile || 0) : 0, v: L ? cl((t - L.da) / ((L.a - L.da) || 1), 0, 1) : 0, mv: t * (o.lung || 1), mod, colFn: L && L.colFn ? ((th) => L.colFn(th, t)) : null }); };
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
    jeans: 24, calzoni: 25, manica: 27, polsino: 28, sneaker: 32, suola: 33, scarpa: 34, cappellino: 36, bomber: 38, faccia: 40, toppe: 64, militare: 65, cardigan: 66, salopette: 67, lavoro: 68, chiodo: 69, colorblock: 70,
    box: 26, college: 29, fiamme: 30, smiley: 31, tramonto: 35, jersey: 39, calcio: 71, retro: 75, graffiti: 76, ringer: 77, zip: 78, felpa_blocchi: 79, felpa_college: 80, anorak: 81, varsity: 82, coach: 83, track: 84, bowling: 85, pile: 86, raso: 87, guscio: 96, nuptse: 97, manica_nuptse: 98, arrampicata: 99 };
  const PT = { liscio: 0, righe: 1, quadri: 2, fiori: 3, maglia: 4, pois: 5, righine: 6, mimetico: 7, fairisle: 56, kefiah: 57, tartan: 58, tiedye: 72, scacchi: 73, leopardo: 74, paisley: 75, graffiti: 76, rugby: 77, memphis: 78, stelle: 79 };   // il motivo j sta nella tessera 16 + j
  // [catena, da, a, spessore, extra]
  const CAPI = {
    canottiera: { busto: [.05, .93, .004], tile: 'canotta' },
    maglietta: { busto: [.05, .925, .005], braccio: [0, .3, .005], orlo: .025, tile: 'maglietta', manica: 'manica' },
    maglietta_righe: { busto: [.05, .925, .005], braccio: [0, .85, .005], ptile: 'righe', orlo: .02 },
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
    maglietta_larga: { busto: [-.07, .925, .024], braccio: [0, .48, .026], orlo: .03, tile: 'stampa', manica: 'manica', svasa: .018 },
    felpa_larga: { busto: [-.07, 1, .03], braccio: [0, .99, .026], orlo: .07, orloSp: .008, colletto: 'cappuccio', tile: 'felpa', manica: 'polsino', svasa: .012 },
    tuta_giacca: { busto: [-.02, 1, .02], braccio: [0, .97, .018], tile: 'tuta', orlo: .05, orloSp: .006, colletto: 'alto', bande: 1 },
    bomber: { busto: [-.02, 1, .034], braccio: [0, .97, .03], tile: 'bomber', orlo: .07, orloSp: .01, colletto: 'giro', manica: 'polsino' },
    larghi: { gamba: [-.06, 1, .014], orlo: .02, dritti: 1, bacino: .012, gtile: 'jeans', cintura2: 1 },
    jeans: { gamba: [-.06, .99, .01], orlo: .02, bacino: .01, gtile: 'jeans', cintura2: 1 },
    tuta_pantaloni: { gamba: [-.06, 1, .012], orlo: .05, orloSp: .006, dritti: .6, bacino: .01, bande: 1 },
    catena: { catena: 1 },
    // [guardaroba] il resto dei capi del gioco
    camicia_quadri: { busto: [.02, .99, .008], braccio: [0, .95, .008], tile: 'camicia', ptile: 'quadri', orlo: .03, polsino: 1, colletto: 'camicia', manica: 'manica' },
    polo: { busto: [.05, .925, .006], braccio: [0, .32, .006], tile: 'maglietta', orlo: .025, colletto: 'camicia', manica: 'manica' },
    dolcevita: { busto: [.02, 1, .01], braccio: [0, .96, .01], tile: 'maglione', orlo: .04, colletto: 'collo_alto' },
    maglione_v: { busto: [.0, 1, .014], braccio: [0, .96, .012], tile: 'gilet', ptile: 'maglia', orlo: .06, orloSp: .005 },
    giacca_pelle: { busto: [-.02, 1, .02], braccio: [0, .95, .018], tile: 'bomber', orlo: .03, colletto: 'revers', manica: 'manica' },
    giubbotto_jeans: { busto: [.02, 1, .018], braccio: [0, .95, .016], tile: 'camicia', orlo: .05, orloSp: .006, colletto: 'camicia', manica: 'polsino' },
    piumino: { busto: [-.02, 1, .045], braccio: [0, .97, .04], tile: 'bomber', orlo: .07, orloSp: .01, colletto: 'alto', manica: 'polsino' },
    smanicato: { busto: [-.02, 1, .04], tile: 'bomber', orlo: .05, orloSp: .008, colletto: 'alto' },
    montone: { busto: [-.06, 1, .035], braccio: [0, .95, .03], tile: 'cappotto', orlo: .06, orloSp: .012, colletto: 'revers', manica: 'polsino', svasa: .012, colOrlo: '#e8dcc4' },
    giubbotto: { busto: [.1, .95, .035], tile: 'tuta', orlo: .03 },
    poncho: { scialle: 1, lungo: 1 },
    pelliccia: { busto: [-.03, 1, .04], braccio: [0, .95, .035], tile: 'cappotto', ptile: 'pois', orlo: .05, orloSp: .01, colletto: 'giro', falda: [0, .62, 1.12] },
    vestito_corto: { busto: [-.02, .95, .006], tile: 'abito', orlo: .02, gonna: [.3, .4, 1.25], colletto: 'tondo' },
    vestito_lungo: { busto: [-.02, .97, .006], braccio: [0, .9, .006], tile: 'abito', orlo: .02, gonna: [.3, .95, 1.25], colletto: 'tondo', manica: 'manica' },
    leggings: { gamba: [-.06, 1, .003], bacino: .003 },
    calze_intere: { gamba: [-.04, 1, .002], bacino: .002 },
    calze_alte: { gamba: [.72, 1, .004] },
    bermuda: { gamba: [-.06, .42, .01], orlo: .03, bacino: .01, gtile: 'calzoni', cintura2: 1 },
    minigonna: { gonna: [.3, .14, 1.12], bacino: .008 },
    cargo: { gamba: [-.06, 1, .016], orlo: .02, dritti: .7, bacino: .012, gtile: 'calzoni', cintura2: 1, tasconi: 1 },
    // [guardaroba] vintage, second hand, drip, underground, resistenza
    giacca_militare: { busto: [-.06, 1, .022], braccio: [0, .95, .02], tile: 'militare', orlo: .03, colletto: 'alto', svasa: .012, manica: 'manica' },
    parka: { busto: [-.04, 1, .03], braccio: [0, .97, .026], tile: 'militare', orlo: .04, colletto: 'cappuccio', falda: [0, .32, 1.06], manica: 'polsino' },
    giacca_toppe: { busto: [.02, 1, .018], braccio: [0, .95, .016], tile: 'toppe', orlo: .05, orloSp: .006, colletto: 'camicia', manica: 'polsino' },
    gilet_toppe: { busto: [.05, .92, .016], tile: 'toppe', orlo: .03 },
    chiodo: { busto: [.0, 1, .022], braccio: [0, .95, .02], tile: 'chiodo', orlo: .04, orloSp: .006, colletto: 'revers', manica: 'manica' },
    cardigan: { busto: [-.02, 1, .016], braccio: [0, .96, .014], tile: 'cardigan', ptile: 'maglia', orlo: .06, orloSp: .005, manica: 'polsino' },
    maglione_fairisle: { busto: [0, 1, .016], braccio: [0, .96, .014], tile: 'maglione', ptile: 'fairisle', orlo: .06, orloSp: .005, colletto: 'giro', manica: 'polsino' },
    giacca_lavoro: { busto: [-.04, 1, .02], braccio: [0, .95, .018], tile: 'lavoro', orlo: .03, colletto: 'camicia', manica: 'manica' },
    salopette: { busto: [-.06, .85, .012], gamba: [-.06, .99, .012], tile: 'salopette', orlo: .02, gtile: 'jeans' },
    tuta_nylon: { busto: [-.02, 1, .022], braccio: [0, .97, .02], tile: 'colorblock', orlo: .05, orloSp: .006, colletto: 'alto', manica: 'polsino', svasa: .01 },
    puffer_corto: { busto: [.12, 1, .05], braccio: [0, .97, .045], tile: 'bomber', orlo: .07, orloSp: .012, colletto: 'alto', manica: 'polsino' },
    camicia_70: { busto: [.02, .99, .007], braccio: [0, .95, .007], tile: 'camicia', orlo: .03, polsino: 1, colletto: 'punte', manica: 'manica' },
    // [personaggi] hip hop e street: maglie da gioco, giacche da crew, felpe, pantaloni larghi
    jersey: { busto: [-.05, .93, .02], tile: 'jersey', svasa: .014 },
    sotto_lunga: { busto: [.05, .92, .003], braccio: [0, .96, .004], tile: 'maglietta', orlo: .02, ord: .5, manica: 'polsino' },
    varsity: { busto: [-.02, 1, .026], braccio: [0, .97, .024], tile: 'varsity', orlo: .06, orloSp: .008, colletto: 'giro', manica: 'polsino', colBr: '#e8e0cc', ord: 4 },
    coach: { busto: [-.05, 1, .016], braccio: [0, .97, .016], tile: 'coach', orlo: .03, colletto: 'camicia', manica: 'polsino', svasa: .014, ord: 4 },
    track_retro: { busto: [-.02, 1, .016], braccio: [0, .97, .014], tile: 'track', orlo: .05, orloSp: .006, colletto: 'alto', bande: 1, ord: 4 },
    bowling: { busto: [-.04, .99, .01], braccio: [0, .42, .014], tile: 'bowling', orlo: .03, colletto: 'camicia', svasa: .012, manica: 'manica', ord: 1.5 },
    pile: { busto: [-.03, 1, .03], braccio: [0, .97, .028], tile: 'pile', ptile: 'maglia', orlo: .04, orloSp: .006, colletto: 'alto', manica: 'polsino', ord: 4 },
    raso: { busto: [-.02, 1, .028], braccio: [0, .97, .026], tile: 'raso', orlo: .06, orloSp: .008, colletto: 'giro', manica: 'polsino', ord: 4 },
    anorak: { busto: [-.07, 1, .028], braccio: [0, .97, .026], tile: 'anorak', orlo: .04, colletto: 'cappuccio', manica: 'polsino', svasa: .016, ord: 4 },
    guscio: { busto: [-.08, 1, .02], braccio: [0, .98, .018], tile: 'guscio', orlo: .02, colletto: 'cappuccio', manica: 'manica', svasa: .018, ord: 5 },
    guscio_gonfio: { busto: [-.03, 1, .046], braccio: [0, .97, .04], tile: 'nuptse', orlo: .05, orloSp: .008, colletto: 'alto', manica: 'manica_nuptse', ord: 5 },
    gilet_piuma: { busto: [-.02, 1, .036], tile: 'nuptse', orlo: .04, orloSp: .006, colletto: 'alto', ord: 5 },
    pantaloni_arrampicata: { gamba: [-.06, .95, .012], orlo: .1, orloSp: .003, orloSolo: 'giu', bacino: .012, gtile: 'arrampicata', cintura2: 1 },
    paracadute: { gamba: [-.06, 1, .03], orlo: .07, orloSp: .01, orloSolo: 'giu', dritti: 1, bacino: .016, gtile: 'calzoni', cintura2: 1, tasconi: 1 },
    joggers: { gamba: [-.06, .95, .013], orlo: .09, orloSp: .004, orloSolo: 'giu', bacino: .012, bande: 1 },
    pantaloncini_basket: { gamba: [-.06, .56, .03], orlo: .05, orloSp: .006, dritti: 1, bacino: .018, bande: 1 },
    jeans_risvolto: { gamba: [-.06, .97, .016], orlo: .07, orloSp: .012, orloSolo: 'giu', dritti: 1, bacino: .012, gtile: 'jeans', cintura2: 1, colOrlo: '#8aa0c8' },
  };
  // scarpe: [altezza del gambale (0 scarpa bassa … 1 al ginocchio), punta, tacco]
  const SCARPE = { anfibi: [.17, 1.06, 0, 0, 0, .01], chunky: [0, 1.12, 0, 0, 1, .02], tela: [0, 1.02, 0, 0, 1], mocassini: [0, 1, 0], sneakers: [0, 1.06, 0, 0, 1], basket: [.07, 1.08, 0, 0, 1], scarpe: [0, 1, 0], stivali: [.62, 1.05, 0], stivaletti: [.12, 1, 0], sandali: [0, .95, 0, 1], tacchi: [0, .85, 1], ciabatte: [0, .95, 0, 1], scarponi: [.15, 1.12, 0], trail: [0, 1.09, 0, 0, 1, .016] };

  // =====================================================================================
  // LA FIGURA: costruisce la geometria nello spazio del personaggio
  // =====================================================================================
  // [personaggi] il busto scolpito: i pettorali (il seno per le donne) davanti, le scapole e il solco della schiena dietro, le clavicole, il fianco che rientra in vita
  const g1 = (x, m, s) => Math.exp(-(((x - m) / s) ** 2));
  function scolpisciBusto(th, t, f, sp) {
    const fr = Math.cos(th), sd = Math.sin(th), k = 1 / (1 + Math.max(0, sp) * 24);   // sotto i capi pesanti le forme si ammorbidiscono
    let d = 0;
    if (fr > 0) { const lob = g1(Math.abs(sd), f ? .5 : .52, f ? .3 : .34) * fr;
      d += (f ? .088 * g1(t, .7, .088) : .045 * g1(t, .74, .08)) * lob;                  // i pettorali, il seno
      d -= (f ? .025 : .03) * g1(sd, 0, .14) * g1(t, .72, .1) * fr;                     // lo sterno, tra i due
      d += .02 * g1(t, .9, .035) * g1(Math.abs(sd), .45, .25) * fr;                     // le clavicole
      d -= .02 * g1(t, .52, .06) * fr * (1 - Math.abs(sd)); }                           // sotto il petto, lo stomaco rientra appena
    else { const bk = -fr;
      d += .045 * g1(t, .8, .09) * g1(Math.abs(sd), .5, .28) * bk;                        // le scapole
      d -= .04 * g1(sd, 0, .12) * g1(t, .55, .3) * bk;                                    // il solco della schiena
      d += (f ? .05 : .02) * g1(t, .08, .1) * g1(Math.abs(sd), .45, .35) * bk; }          // i glutei
    d -= .03 * g1(t, .42, .1) * sd * sd;                                                // il fianco che rientra
    d += .035 * g1(t, .86, .07) * g1(Math.abs(sd), 1, .3);                              // il gran dorsale sotto le ascelle, le spalle piene
    return d * k;
  }
  // il deltoide: la spalla tonda sopra e fuori dove il braccio entra nel busto, e il bicipite davanti
  function deltoide(th, t, sp, f) { const up = Math.max(0, -Math.sin(th)), fr = Math.cos(th), k = 1 / (1 + Math.max(0, sp || 0) * 24);   // sotto i capi spessi la spalla non si gonfia
    if (f) return k * (.07 * g1(t, .24, .15) * up ** 1.8 + .025 * g1(t, .4, .12) * Math.max(0, fr) + .02 * g1(t, .24, .13) * Math.abs(fr));   // [personaggi] le donne: spalla tonda e bassa, niente punta che spunta sopra il braccio
    return k * (.16 * g1(t, .2, .11) * up ** 1.2 + .05 * g1(t, .4, .1) * Math.max(0, fr) + .04 * g1(t, .2, .1) * Math.abs(fr)); }
  // [personaggi] le forme dei capi: gonfio [sacchi, altezza], drop (spalla scesa), blusa (sbuffo sopra la costina), dritto (cade dal petto), box (sezione squadrata),
  // pieghe [quante, quanto] in fondo al busto o ai pantaloni, manica (si allarga verso il fondo), grinze (al gomito), pila (il mucchio sulla scarpa), ginocchio
  const FORMA = {
    maglietta: { manica: .012, pieghe: [6, .035], dritto: .4 }, maglietta_larga: { drop: .03, manica: .026, pieghe: [5, .06], dritto: 1, box: 2.9 }, maglietta_righe: { manica: .008, pieghe: [6, .03] },
    camicia: { pieghe: [7, .03], grinze: .03, dritto: .3 }, camicia_corta: { manica: .02, pieghe: [6, .03], dritto: .6 }, camicia_quadri: { pieghe: [6, .04], grinze: .035, dritto: .5 }, bowling: { manica: .03, dritto: 1, box: 3.1, drop: .015 },
    felpa: { blusa: .018, grinze: .04, pieghe: [5, .03], dritto: .5 }, felpa_larga: { blusa: .03, drop: .035, manica: .02, grinze: .05, pieghe: [4, .05], dritto: 1, box: 2.8 },
    maglione: { blusa: .012, grinze: .03 }, maglione_fairisle: { blusa: .014, grinze: .03, dritto: .5 }, cardigan: { pieghe: [5, .04], grinze: .03 }, pile: { blusa: .014, grinze: .035, dritto: .7, box: 2.7 },
    piumino: { gonfio: [5, .026], blusa: .01, box: 2.3 }, puffer_corto: { gonfio: [4, .03], box: 2.3, dritto: 1 }, smanicato: { gonfio: [5, .022], box: 2.4 }, guscio_gonfio: { gonfio: [5, .032], box: 2.2, dritto: 1 }, gilet_piuma: { gonfio: [6, .02], box: 2.4 },
    bomber: { blusa: .02, grinze: .045, box: 2.9 }, giacca_pelle: { box: 3, grinze: .03 }, chiodo: { box: 3, grinze: .035 }, varsity: { blusa: .016, grinze: .04, box: 3, dritto: .6 }, raso: { blusa: .02, grinze: .05, box: 2.8 },
    coach: { dritto: 1, box: 3.2, manica: .012, grinze: .04, pieghe: [4, .03] }, anorak: { dritto: 1, drop: .02, box: 2.8, manica: .016, grinze: .05, pieghe: [4, .05] }, tuta_nylon: { dritto: .8, box: 2.9, grinze: .05, pieghe: [4, .04] },
    guscio: { dritto: 1, box: 2.9, manica: .014, grinze: .06, pieghe: [5, .05], drop: .012 }, track_retro: { grinze: .035, pieghe: [5, .025] }, tuta_giacca: { grinze: .035, pieghe: [5, .025] },
    giacca: { box: 3.2, dritto: .4 }, giacca_militare: { box: 3.1, dritto: .8, grinze: .04, pieghe: [5, .03] }, parka: { box: 3, dritto: 1, grinze: .05, pieghe: [5, .05] }, giacca_lavoro: { box: 3.2, dritto: 1, grinze: .04 }, giubbotto_jeans: { box: 3.1, grinze: .035, blusa: .006 },
    cappotto: { box: 3, dritto: .5 }, cerata: { box: 2.8, dritto: 1, grinze: .06, pieghe: [5, .05] }, montone: { box: 3, dritto: .7 }, jersey: { dritto: 1, pieghe: [4, .06] },
    jeans: { pila: .006, pieghe: [5, .03] }, larghi: { pila: .016, pieghe: [4, .07] }, cargo: { pila: .012, ginocchio: .006, pieghe: [4, .06] }, paracadute: { pila: .022, ginocchio: .008, pieghe: [4, .09] }, pantaloni_arrampicata: { ginocchio: .01, pieghe: [5, .04] },
    tuta_pantaloni: { pila: .01, pieghe: [5, .04] }, joggers: { pieghe: [5, .04], ginocchio: .004 }, pantaloncini_basket: { pieghe: [4, .06] }, pantaloni: { pieghe: [6, .03] }, jeans_risvolto: { pieghe: [5, .03] }, tuta: { pila: .008, grinze: .04, pieghe: [5, .035] },
  };
  function costruisci(D, J) {
    const B = new Builder(), st = S(), f = D.sesso === 'f', K = corpoDi(D, J), pelle = C3(D.pelle || '#d8a888');
    const PTRI = typeof window !== 'undefined' && window.__partiTri, tq = n => { if (PTRI) { PTRI[n] = (PTRI[n] || 0) + (B.I.length - tq.i) / 3; } tq.i = B.I.length; }; tq.i = 0;   // [personaggi] i triangoli per parte (solo per la sonda)
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
      const sx = Math.abs(p[0]), k = sm((sx - .095) / .07) * sm((y - (J.Chest[1] - .05)) / .08) * (p[2] > J.Chest[2] + .04 ? .6 : 1);
      if (k > 0) w = mescola(w, [['Shoulder' + (p[0] > 0 ? 'L' : 'R'), 1]], k * .6);
      const kl = sm((J.UpperLegL[1] - .03 - y) / .06) * sm((sx - .03) / .08) * (p[2] < J.Hips[2] - .04 || p[2] > J.Hips[2] + .07 ? .3 : 1);   // l'inguine segue appena le cosce (sotto l'anca, non la vita)
      if (kl > 0) w = mescola(w, [['UpperLeg' + (p[0] > 0 ? 'L' : 'R'), 1]], kl * .2);
      return w;
    };
    const tLen = yT - yC, tB = y => (y - yC) / tLen, yOf = t => yC + t * tLen;
    const geomB = t => { const y = yOf(t), P0 = profAt(y); return { c: [0, y, zAt(y)], t: [0, 1, 0], f: [0, 0, 1], a: P0[0], b: P0[1], fz: P0[2], ao: lerp(.82, 1, sm(t / .3)), tt: t }; };
    const listaB = [], listaA = [], listaG = [];
    vesti.forEach((v, i) => {
      const base = { forma: v.forma || FORMA[v.tipo], col: v.col, col2: v.col2 || sotto(i, 'busto'), col3: v.col3 || mulc(v.col, .55), tile: tileOf(v), ptile: ptOf(v), orlo: v.orlo || 0, orloSp: v.orloSp, colOrlo: v.colOrlo ? C3(v.colOrlo) : null };
      if (v.busto) listaB.push(Object.assign({}, base, { da: v.busto[0], a: v.busto[1], sp: v.busto[2], svasa: v.svasa || 0 }, v.stampa || v.tile === 'stampa' ? { col2: v.col2 ? C3v(v.col2) : [.95, .94, .9] } : {}));
      const bnd = v.bande ? { tileC: TL.bande, col2: v.col3 ? C3v(v.col3) : [.95, .94, .9] } : {};
      if (v.braccio) listaA.push(Object.assign({}, base, bnd, v.colBr ? { col: C3(v.colBr) } : {}, { tile: bnd.tileC || (v.braccio[1] > .5 ? TL[v.manica] || TL.manica : 0), da: v.braccio[0], a: v.braccio[1], sp: v.braccio[2], orlo: v.polsino ? .1 : base.orlo ? .06 : 0, orloSp: v.polsino ? .004 : base.orloSp, orloSolo: 'giu', colOrlo: v.colOrloBr ? C3(v.colOrloBr) : v.polsino ? base.col : null }));
      if (v.gamba) listaG.push(Object.assign({}, base, bnd, { dritti: v.dritti || 0, tile: bnd.tileC || TL[v.gtile] || 0, col2: bnd.col2 || (v.col2 ? C3v(v.col2) : mulc(v.col, .6)), da: v.gamba[0], a: v.gamba[1], sp: v.gamba[2], orlo: base.orlo ? .04 : 0, orloSolo: 'giu', zampa: v.zampa || 0 }));
      if (v.bacino && !v.busto) listaB.push(Object.assign({}, base, { tile: 0, ptile: ptOf(v), da: -.05, a: .2, sp: v.bacino, orlo: .05, orloSp: .004, orloSolo: 'su', colOrlo: mulc(v.col, .8) }));
    });
    const nB = listaB.some(L => L.forma && (L.forma.gonfio || L.forma.blusa)) ? 19 : 14, campB = []; for (let k = 0; k <= nB; k++) campB.push(-.15 + k / nB * 1.15);
    // il busto parte un po' sotto l'inguine (chiuso dalle cosce) e arriva al collo; il collo fino a dentro la testa
    const tlo = Math.min(-.02, ...listaB.map(L => L.da)) - .001;
    catenaStrati(B, listaB, tlo, 1, campB, t => { const G = geomB(Math.max(t, 0)), Lt = strati(listaB, t).top, sv = Lt && Lt.svasa || 0; if (t < 0) { const k = 1 + t * (sv ? .3 : 2.2); G.a *= k; G.b *= k; } if (sv && t < .2) { const k = sv * sm((.2 - t) / .25); G.a += k; G.b += k * .9; } return G; }, pelle, { zona: 'busto', lung: tLen, wfn: p => wBusto(p), seg: st.piatto ? 14 : undefined, mod: (th, r) => scolpisciBusto(th, r.tt === undefined ? .5 : r.tt, f, r.spT || 0) });
    // il fondo del busto: si chiude tra le cosce
    { const G = geomB(0), y0 = yOf(tlo); const L = strati(listaB, tlo + .002).top; loft(B, [{ c: [0, y0, G.c[2]], t: [0, 1, 0], a: G.a * (1 + tlo * 2.2) + .01, b: G.b * (1 + tlo * 2.2) + .01, col: L ? L.col : pelle, ao: .7, w: [['Hips', 1]] }, { c: [0, y0 - .01, G.c[2]], t: [0, 1, 0], a: .01, b: .01, col: L ? L.col : pelle, ao: .6, w: [['Hips', 1]] }]); }
    // il collo e il pomo: dentro la testa
    loft(B, [0, .5, 1].map(q => { const y = lerp(yT - .01, J.Head[1] + .05, q); return { c: [0, y, lerp(J.Neck[2], J.Head[2] - .005, q)], t: [0, 1, 0], a: (f ? .038 : .047) * (D.corpo && D.corpo.robusto || 1) * lerp(1, .92, q), b: (f ? .038 : .045) * lerp(1, .9, q), col: pelle, ao: lerp(.8, .9, q), w: catena(y, ys, spine, [0, .05, .06, .07, .03, .025]) }; }));
    tq('busto');
    // ---------------- BRACCIA ----------------
    ['L', 'R'].forEach(sd => {
      const sg = sd === 'L' ? 1 : -1, j0 = J['UpperArm' + sd], j1 = J['LowerArm' + sd], j2 = J['Wrist' + sd], jS = J['Shoulder' + sd];
      const xs = [Math.abs(jS[0]), Math.abs(j0[0]), Math.abs(j1[0]), Math.abs(j2[0])], L0 = xs[1] - .07, L1 = xs[3];
      const geomA = t => {   // t: 0 dentro la spalla … 1 al polso
        const x = lerp(L0, L1, t), u = cl((x - xs[1]) / (xs[3] - xs[1]), 0, 1), ue = (x - xs[1]) / (xs[2] - xs[1]);
        const r = K.braccio * (t < .18 ? lerp(1.12, 1.08, t / .18) : u < .25 ? lerp(1.08, 1, (u) / .25) : u < .45 ? lerp(1, .84, (u - .25) / .2) : u < .55 ? lerp(.84, .9, (u - .45) / .1) : lerp(.9, .62, (u - .55) / .45));
        const y = lerp(j0[1], j2[1], u) - (t < .2 ? .015 * (1 - t / .2) : 0), z = lerp(j0[2], j2[2], u) - .005;
        const kb = x > xs[1] - .01 ? 1 / BRACCIO : 1;   // dove pesa il braccio la scala dell'osso lo ingrossa: qui si assottiglia di quanto
        return { c: [sg * x, y, z], t: [sg, 0, 0], f: [0, 0, 1], a: r * kb * (u > .55 ? .82 : 1), b: r * kb, ao: t < .15 ? .85 : 1, tt: t, w: catena(x, xs, ['Shoulder' + sd, 'UpperArm' + sd, 'LowerArm' + sd, 'Wrist' + sd], [0, .03, .035, .02]) };
      };
      const nA = listaA.some(L => L.forma && (L.forma.gonfio || L.forma.grinze)) ? 12 : 8, camp = []; for (let k = 0; k <= nA; k++) camp.push(k / nA);
      catenaStrati(B, listaA, 0, 1, camp, geomA, pelle, { zona: 'braccio', lung: L1 - L0, seg: 10, flipU: sd === 'R', mod: (th, r) => deltoide(th, r.tt === undefined ? .5 : r.tt, r.spT, f) });
      mano(B, J, sd, sg, pelle, D);
    });
    tq('braccia');
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
      const nG = lst.some(L => L.forma && (L.forma.pila || L.forma.pieghe)) ? 13 : 9, camp = []; for (let k = 0; k <= nG; k++) camp.push(k / nG);
      const gonne = vesti.filter(v => v.gonna).map(v => lerp(J.UpperLegL[1], J.FootL[1] + .03, v.gonna[1]) + .16), yv = Math.max(-1, ...gonne), tg0 = yv > -1 ? cl((y0 - yv) / Lg, 0, .9) : 0;
      const zampa = lst.find(L => L.zampa && L.a > .9 && !(sc[0] > 0));
      catenaStrati(B, lst, tg0, 1, camp, t => { const G = geomG(t); const dr = lst.reduce((m, L) => Math.max(m, t >= L.da && t <= L.a && L.dritti ? L.dritti : 0), 0); if (dr && t > .3) { const R0 = K.gamba * .92, k = dr * sm((t - .3) / .25); G.a = lerp(G.a, Math.max(G.a, R0), k); G.b = lerp(G.b, Math.max(G.b, R0 * 1.05), k); } if (zampa && t > .55) { const k = sm((t - .55) / .45) * zampa.zampa; G.a += k * .8; G.b += k; } return G; }, pelle, { zona: 'gamba', lung: Lg, seg: 10, flipU: sd === 'R' });
      scarpa(B, J, sd, sg, sc, colS, D, pelle);
    });
    // ---------------- TESTA ----------------
    tq('gambe');
    testa(B, J, D, pelle);
    tq('testa');
    // ---------------- PEZZI LIBERI: gonne, falde, grembiuli, scialli, colletti, cinture ----------------
    vesti.forEach((v, i) => {
      if (v.gonna) gonna(B, J, K, profAt, zAt, v.gonna, v, tileOf(v), ptOf(v), false, listaB);
      if (v.falda) { const gn = vesti.find(x => x.gonna && x.gonna[1] > .3); gonna(B, J, K, profAt, zAt, [.3, v.falda[1], Math.max(v.falda[2] || 1.08, gn ? (gn.gonna[2] || 1.2) + .03 : 0)], Object.assign({}, v, { aperta: true }), 0, ptOf(v), true, listaB, gn ? { sopra: .01 } : null); }   // [personaggi] la falda del cappotto sopra la gonna, non dentro
      if (v.grembiule) grembiule(B, J, K, profAt, zAt, yOf, v, listaB);
      if (v.scialle) scialle(B, J, profAt, zAt, yOf, v, listaB);
      if (v.colletto) colletto(B, J, profAt, zAt, yOf, v, listaB);
      if (v.cintura) cintura(B, J, profAt, zAt, yOf, v, listaB);
      if (v.catena) collana(B, profAt, zAt, yOf, listaB, { tipo: 'catenone', col: v.col });
      if (v.spalline) ['L', 'R'].forEach(sd => { const sg = sd === 'L' ? 1 : -1, p = J['UpperArm' + sd]; uovo(B, [sg * (Math.abs(p[0]) - .02), p[1] + .045, p[2]], [sg, 0, 0], .012, .04, .055, mulc(v.col, .8), [['Shoulder' + sd, .6], ['UpperArm' + sd, .4]], { anelli: 3, seg: 6, p: 3.5, f: [0, 1, 0] }); });
    });
    (D.extra || []).forEach(e => { if (e === 'bandoliera') bandoliera(B, J, profAt, zAt, yOf, listaB, D); });
    // la cintura dei pantaloni, quando in vita non c'è niente sopra
    const pv = vesti.find(v => v.cintura2), topV = strati(listaB, .2).top;
    if (pv && topV && topV.da <= -.04 && topV.a <= .25) { const y = yOf(.18), P0 = profAt(y), sp = strati(listaB, .18).sp, c = C3('#2a1c14');
      loft(B, [0, 1].map(q => ({ c: [0, y - .015 + q * .03, zAt(y)], t: [0, 1, 0], f: [0, 0, 1], a: P0[0] + sp + .004, b: P0[1] + sp + .004, fz: P0[2], col: c, w: [['Hips', .7], ['Abdomen', .3]] })), { seg: 16 });
      uovo(B, [0, y, zAt(y) + P0[1] + P0[2] + sp + .006], [0, 0, 1], .02, .016, .005, C3('#b8b0a0'), [['Hips', 1]], { anelli: 2, seg: 6, p: 4, f: [0, 1, 0] }); }
    if (D.imbrago) imbrago(B, J, D, K, profAt, zAt, yOf, listaB, listaG);
    if (D.corda) corda(B, J, profAt, zAt, yOf, listaB, D);
    tq('pezzi');
    accessori(B, J, D, K, profAt, zAt, yOf, listaB, listaA);
    addosso(B, J, D, K, profAt, zAt, yOf, listaB, vesti);
    tq('accessori');
    return B;
  }
  // ---------------- LE COLLANE: un filo che posa sul corpo vero (sezione a superellisse del busto, più lo spessore dei vestiti), dal collo al petto ----------------
  function collana(B, profAt, zAt, yOf, LB, it) {
    const col = C3v(it.col || '#d8b040'), e = 2 / (S().p || 2.6), tipo = it.tipo, drop = tipo === 'catenone' ? .2 : tipo === 'perle' ? .1 : .13, tHi = .975, N = tipo === 'perle' ? 22 : tipo === 'catenone' ? 24 : 18, pts = [];   // [personaggi] meno maglie, più lunghe: da vicino si legge uguale
    for (let k = 0; k <= N; k++) { const a = (k / N - .5) * Math.PI * 1.2, ca = Math.cos(a), t = lerp(tHi, tHi - drop, Math.pow(Math.max(ca, 0), 2.2)), y = yOf(t), P0 = profAt(y), sp = strati(LB, t).sp + .006;
      pts.push([spow(Math.sin(a), e) * (P0[0] * lerp(.55, 1, Math.pow(Math.max(ca, 0), .5)) + sp), y, zAt(y) + P0[2] + spow(Math.max(ca, 0), e) * (P0[1] + sp) - (ca < .3 ? .02 * (.3 - ca) : 0)]); }
    const w = p => p[1] > yOf(.9) ? [['Chest', .6], ['Neck', .4]] : [['Chest', 1]];
    if (tipo === 'perle') pts.forEach((p, k) => uovo(B, p, [0, 1, 0], .0085, .0085, .0085, mixc(col, [1, 1, 1], k % 2 ? .1 : 0), w(p), { anelli: 2, seg: 6 }));
    else { const r = tipo === 'catenone' ? .0042 : .0022; pts.forEach((p, k) => { if (k === pts.length - 1) return; const q = pts[k + 1], m = mul(add(p, q), .5), d = norm(sub(q, p)); uovo(B, m, d, r, r * (k % 2 ? 1.5 : .7), dist(p, q) * .62, col, w(m), { anelli: 2, seg: 4 }); });   // le maglie, alternate di piatto e di taglio
      if (tipo === 'catenone') { const c0 = pts[N >> 1], y = c0[1] - .03, P0 = profAt(y), z = zAt(y) + P0[2] + P0[1] + strati(LB, .8).sp + .01; uovo(B, [c0[0], y, z], [0, 0, 1], .022, .022, .005, mulc(col, 1.05), [['Chest', 1]], { anelli: 2, seg: 12, f: [0, 1, 0] }); uovo(B, [c0[0], y, z + .004], [0, 0, 1], .014, .014, .003, mulc(col, .8), [['Chest', 1]], { anelli: 2, seg: 10, f: [0, 1, 0] }); } }   // il medaglione
  }
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  // ---------------- QUELLO CHE SI PORTA SOPRA: sciarpe, cravatte, papillon, zaini, borse, marsupi, paraspalle, ginocchiere, tasconi ----------------
  function addosso(B, J, D, K, profAt, zAt, yOf, LB, vesti) {
    const fz = (t, ex) => { const y = yOf(t), P0 = profAt(y), sp = strati(LB, t).sp; return zAt(y) + P0[2] + P0[1] + sp + (ex || 0); };
    const bz = (t, ex) => { const y = yOf(t), P0 = profAt(y), sp = strati(LB, t).sp; return zAt(y) + P0[2] - P0[1] - sp - (ex || 0); };
    const wS = y => catena(y, [J.Hips[1], J.Abdomen[1], J.Torso[1], J.Chest[1], J.Neck[1]], ['Hips', 'Abdomen', 'Torso', 'Chest', 'Neck'], .05);
    const striscia = (pts, w, th, col, o) => loft(B, pts.map((p, j) => ({ c: p, t: norm(sub(pts[Math.min(pts.length - 1, j + 1)], pts[Math.max(0, j - 1)])), f: o && o.f || [0, 0, 1], a: w * (o && o.wk ? o.wk(j / (pts.length - 1)) : 1), b: th, p: 6, col, ptile: o && o.ptile || 0, col3: o && o.col3, mv: j * .05, w: o && o.w || wS(p[1]) })), { seg: 4 });
    const tasca = (c, a, b, h, col, w, o) => loft(B, [0, .08, .92, 1].map((q, j) => ({ c: add(c, [0, (q - .5) * h, 0]), t: [0, 1, 0], f: o && o.f || [0, 0, 1], a: a * (j === 0 || j === 3 ? .9 : 1), b: b * (j === 0 || j === 3 ? .85 : 1), p: 5, col: j === 3 ? mulc(col, .85) : col, w })), { seg: 8 });
    const C = D.collo || [], Sc = D.schiena || [];
    C.forEach(it => { const col = C3(it.col || '#a83a3a'), y0 = yOf(.965), P0 = profAt(y0), sp = strati(LB, .965).sp, zc = zAt(y0);
      if (it.tipo === 'sciarpa') {   // la sciarpa di lana: due giri grossi attorno al collo, i due capi che cadono davanti fino in vita, le frange
        const ptile = it.kefiah ? PT.kefiah : it.righe ? PT.righe : PT.maglia, c3 = it.kefiah ? [.1, .1, .12] : it.righe ? [.92, .9, .84] : mulc(col, .72), r = .034;
        [[-.016, .05, 0], [.032, .042, .012]].forEach(([dy, rr, dz], k) => loft(B, [0, .25, .5, .75, 1].map(q => ({ c: [0, y0 + .004 + dy + q * .05, zc - .006 + dz * Math.sin(q * Math.PI)], t: [0, 1, 0], f: [0, 0, 1], a: .072 + sp * .6 + rr * Math.sin(Math.PI * (.15 + .7 * q)) + k * .004, b: .066 + sp * .6 + rr * Math.sin(Math.PI * (.15 + .7 * q)) + k * .008, col, ptile, col3: c3, mv: q * .08 + k * .1, w: [['Neck', .5], ['Chest', .5]], mod: th => .05 * Math.sin(th * 7 + k) })), { seg: 16 }));
        [[.035, .48, .034], [.08, .58, .03]].forEach(([x, t1, w], k) => { const pts = [0, .2, .45, .7, 1].map(q => { const t = lerp(.97, t1, q); return [x + q * .012 + k * .004, yOf(t), fz(t, .016 + k * .01)]; });
          loft(B, pts.map((p, j) => ({ c: p, t: norm(sub(pts[Math.min(4, j + 1)], pts[Math.max(0, j - 1)])), f: [0, 0, 1], a: w, b: .012, p: 3, col, ptile, col3: c3, mv: j * .06, w: wS(p[1]) })), { seg: 8 });
          const e = pts[4]; for (let f = 0; f < 6; f++) tuboP(B, [[e[0] - w + f * w * .4, e[1], e[2]], [e[0] - w + f * w * .4, e[1] - .035, e[2] + .002]], () => .0025, col, wS(e[1])); });
      } else if (it.tipo === 'foulard') {   // il foulard di seta: giro stretto al collo, il nodo di lato, le due punte a triangolo che cadono sul petto
        const c3 = mixc(col, [.15, .15, .3], .5);
        loft(B, [0, .5, 1].map(q => ({ c: [0, y0 + .006 + q * .022, zc - .004], t: [0, 1, 0], f: [0, 0, 1], a: .066 + sp * .5 + .01 * (1 - Math.abs(q - .5)), b: .06 + sp * .5 + .01 * (1 - Math.abs(q - .5)), col, ptile: PT.fiori, col3: c3, mv: q * .05, w: [['Neck', .5], ['Chest', .5]] })), { seg: 16 });
        const k0 = [.03, y0 - .004, fz(.955, .014)]; uovo(B, k0, [0, 0, 1], .018, .014, .013, col, [['Chest', 1]], { anelli: 3, seg: 7 });
        [[.01, .78, .05], [.055, .82, .04]].forEach(([x, t1, w]) => { const pts = [0, .5, 1].map(q => { const t = lerp(.95, t1, q); return [x + q * .01, yOf(t), fz(t, .01)]; });
          loft(B, pts.map((p, j) => ({ c: p, t: norm(sub(pts[Math.min(2, j + 1)], pts[Math.max(0, j - 1)])), f: [0, 0, 1], a: w * (1 - j / 2.2), b: .003, p: 6, col, ptile: PT.fiori, col3: c3, mv: j * .05, w: wS(p[1]) })), { seg: 4 }); });
      } else if (it.tipo === 'cravatta') {
        const pt = { regimental: PT.righe, pois: PT.pois, paisley: PT.fiori, liberty: PT.fiori, costine: PT.maglia }[it.dis] || 0;
        uovo(B, [0, yOf(.955), fz(.955, .006)], [0, -1, .3], .016, .01, .014, col, [['Chest', .6], ['Neck', .4]], { anelli: 3, seg: 6 });
        striscia([0, .4, .8, 1].map(q => { const t = lerp(.94, .5, q); return [0, yOf(t), fz(t, .006)]; }), .018, .004, col, { wk: q => q < .9 ? lerp(.9, 1.6, q) : 1.6 * (1 - (q - .9) * 6), ptile: pt, col3: it.dis === 'regimental' ? [.85, .75, .3] : mixc(col, [1, 1, 1], .6) });
      } else if (it.tipo === 'papillon') { [1, -1].forEach(sg => uovo(B, [sg * .018, yOf(.955), fz(.955, .008)], [sg, 0, 0], .012, .006, .018, col, [['Chest', .6], ['Neck', .4]], { anelli: 3, seg: 6, punta: -.4 })); uovo(B, [0, yOf(.955), fz(.955, .01)], [0, 1, 0], .006, .005, .007, mulc(col, .8), [['Chest', 1]], { anelli: 2, seg: 5 }); }
      else if (it.tipo === 'perle' || it.tipo === 'catenina') collana(B, profAt, zAt, yOf, LB, it);
    });
    Sc.forEach(it => { const col = C3(it.col || '#4a5a3a'), dk = mulc(col, .75);
      if (it.tipo === 'zaino') {   // lo zaino: il corpo, la tasca, gli spallacci davanti
        const t0 = .45, t1 = .9, yc = yOf((t0 + t1) / 2), zb = Math.min(bz(.6), bz(.8)) - .06;
        tasca([0, yc, zb], .13, .06, yOf(t1) - yOf(t0), col, [['Chest', .5], ['Torso', .5]]); tasca([0, yOf(t0 + .1), zb - .055], .09, .025, .12, dk, [['Torso', 1]]);
        [1, -1].forEach(sg => striscia([[sg * .075, yOf(.98), zAt(yOf(.98)) - .02], [sg * .085, yOf(1.0) + .01, zAt(yOf(.98)) + .03], [sg * .09, yOf(.9), fz(.9, .006)], [sg * .085, yOf(.62), fz(.62, .006)], [sg * .09, yOf(.5), bz(.5, .02) + .04]], .018, .005, dk, { f: [0, 1, 0] }));
      } else if (it.tipo === 'marsupio') { tasca([0, yOf(.14), fz(.14, .028)], .085, .03, .07, col, [['Hips', 1]]); loft(B, [0, 1].map(q => { const y = yOf(.15), P0 = profAt(y), sp = strati(LB, .15).sp; return { c: [0, y - .01 + q * .02, zAt(y)], t: [0, 1, 0], f: [0, 0, 1], a: P0[0] + sp + .008, b: P0[1] + sp + .008, fz: P0[2], col: dk, w: [['Hips', 1]] }; }), { seg: 14 }); }
      else if (it.tipo === 'borsetta' || it.tipo === 'borsello' || it.tipo === 'tracolla') {   // la borsa al fianco sinistro, la cinghia sulla spalla destra
        const big = it.tipo === 'borsetta', y = yOf(big ? .2 : .3), P0 = profAt(y), x = P0[0] + strati(LB, .3).sp + .03;
        tasca([x, y, zAt(y) + .01], big ? .03 : .025, big ? .09 : .07, big ? .16 : .12, col, [['Hips', .6], ['Abdomen', .4]], { f: [1, 0, 0] });
        const pts = []; for (let j = 0; j <= 8; j++) { const q = j / 8, t = lerp(.3, .97, q), yy = yOf(t), PP = profAt(yy), sp = strati(LB, t).sp, xx = lerp(x - .01, -.1, q); const ex = Math.sqrt(Math.max(0, 1 - Math.pow(Math.abs(xx) / (PP[0] + sp + .01), 2.2))); pts.push([xx, yy + (j === 8 ? .02 : 0), zAt(yy) + PP[2] + (PP[1] + sp + .006) * Math.max(ex, .3)]); }
        striscia(pts, .009, .003, dk);
      }
    });
    if (D.spalle) { const col = C3(D.spalle.col || '#4a3a2a'); ['L', 'R'].forEach(sd => { const sg = sd === 'L' ? 1 : -1, p = J['UpperArm' + sd]; uovo(B, [sg * (Math.abs(p[0]) - .01), p[1] + .05, p[2]], [sg * .3, 1, 0], .07, .08, .028, col, [['Shoulder' + sd, .5], ['UpperArm' + sd, .5]], { anelli: 3, seg: 8 }); }); }
    if (D.ginocchia) { const col = C3(D.ginocchia.col || '#2a2a2e'); ['L', 'R'].forEach(sd => { const k = J['LowerLeg' + sd]; uovo(B, [k[0], k[1] + .01, k[2] + .075], [0, 1, 0], .07, .03, .075, col, [['LowerLeg' + sd, .6], ['UpperLeg' + sd, .4]], { anelli: 3, seg: 8 }); }); }
    vesti.filter(v => v.tasconi).forEach(v => ['L', 'R'].forEach(sd => { const sg = sd === 'L' ? 1 : -1, j0 = J['UpperLeg' + sd], j1 = J['LowerLeg' + sd], y = lerp(j0[1], j1[1], .55), x = lerp(j0[0], j1[0], .55) - sg * .022 * (1 - sm(.55 * .45)); tasca([x + sg * (K.gamba * .95 + .02), y, lerp(j0[2], j1[2], .55)], .02, .055, .13, mulc(C3v(v.col), .92), [['UpperLeg' + sd, 1]], { f: [1, 0, 0] }); }));
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
    const ax = norm(sub(m2, w)), x0 = w[0] + sg * .005; if (D.guanti) pelle = C3(D.guanti);
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
    const gin = sc[4], ss = sc[5] || 0, kw = (gin ? 1.16 : 1) * (ss > .015 ? 1.1 : 1), kh = gin ? 1.18 : 1, bianco = C3((D.scarpe && D.scarpe.col2) || '#f2eee6');
    const dark = gin ? bianco : mulc(col, .45), cm = sand ? pelle : col;
    // la tomaia: sezioni lungo il piede, dalla caviglia (alta) alla punta (bassa e tonda)
    const R = [[0, .05, .06, .08], [.12, .052, .075, .1], [.35, .05, .07, .085], [.6, .052, .045, .06], [.82, .046, .036, .045], [.95, .034, .028, .03], [1, .01, .016, .016]];
    loft(B, R.map(([q, a, h, hh], j) => ({ c: [f[0] - sg * .004 * q, y0 + .012 + ss + tacco * .05 * (1 - q) + h * .5 + (j === 0 ? .02 : 0), z0 + q * L], t: [0, 0, 1], f: [0, 1, 0], a: a * k * kw * (D.sesso === 'f' ? .9 : 1), b: h * .62 * kh * (j === 0 ? 1.3 : 1), p: gin ? 3 : 2.4, col: cm, v: q, tile: sand ? 0 : gin ? TL.sneaker : TL.scarpa, col2: gin ? C3((D.scarpe && D.scarpe.col3) || (D.scarpe && D.scarpe.col2) || '#c83a2a') : mulc(cm, .7), ao: j === 0 ? .85 : 1, w: j === 0 ? wA : w })), { seg: 10, flipU: sd === 'R' });
    // la suola: una lastra appena più larga, scura
    loft(B, [[0, .048], [.25, .052], [.6, .056], [.85, .05], [1, .02]].map(([q, a]) => ({ c: [f[0] - sg * .004 * q, y0 + .008 + ss * .5 + (tacco ? (q < .3 ? .04 : .04 * (1 - (q - .3) / .7) * .4) : 0), z0 + q * L * 1.01], t: [0, 0, 1], f: [0, 1, 0], a: a * k * kw * 1.04 * (D.sesso === 'f' ? .9 : 1), b: (gin ? .017 : .009) + ss * .5, p: 4, col: dark, v: q, tile: TL.suola, w })), { seg: 8 });
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
    { zigomi: 1, alzato: 1 }, { duro: 1, accigliato: 1, stretti: 1, umore: -.2, browW: .034, zigomi: 1 }, { umore: .6, aperto: 1, mw: .09 }, { ow: 1.08, oh: .85, browW: .036, bh: -.008, mw: .085, ghigno: 1 },
    { oh: 1.12, ex: .112, arco: .014, browW: .026, mw: .072, alzato: 1 }, { duro: 1, stretti: 1, coda: .012, browW: .03, barbetta: 1, mw: .09, ghigno: 1 }, { umore: .4, oh: .95, arco: .008, browW: .028, zigomi: 1, mw: .08, aperto: 1 }, { barbetta: 1, brow: .5, stretti: 1, zigomi: 1, storto: 1 },
    { rughe: 1, brow: -.2, stretti: 1, umore: -.1, browW: .032, accigliato: 1 }, { rughe: 1, umore: .4, oh: .9, coda: .01, browW: .036, mw: .086, aperto: 1 },
    { ciglia: 1, labbra: 1, browW: .017, arco: .012, alzato: 1 }, { ciglia: 1, labbra: 1, browW: .017, arco: .014, umore: .5, mw: .078, aperto: 1 }, { ciglia: 1, labbra: 1, browW: .02, oh: .9, ow: 1.06, coda: .006, mw: .085, ghigno: 1 }, { ciglia: 1.3, labbra: 1, browW: .015, arco: .02, oh: 1.12, mw: .068 },
    { ciglia: .5, labbra: 1, rughe: 1, browW: .015, accigliato: 1 }, { ciglia: .5, labbra: 1, rughe: 1, browW: .016, umore: .4, oh: .9, aperto: 1 }];
  // le facce pulite (56-63): 0 uomo, 1 uomo serio, 2 uomo che ride, 3 vecchio, 4 donna, 5 donna che ride, 6 vecchia, 7 uomo con la barba di un giorno
  function facciaPulita(D) {
    const T = D.testa || {}; if (T.faccia !== undefined) return T.faccia % 8; const f = D.sesso === 'f', old = (D.eta || 30) > 58, um = T.umore || 0, sb = T.sopracciglia || 0;
    const r = rng('fp' + (D.seme !== undefined ? D.seme : JSON.stringify(D)));
    if (f) return old ? 6 : um > .3 ? 5 : 4; if (old) return 3; if (sb < -.35) return 1; if (um > .3) return 2; return r() < .35 && (D.eta || 30) > 22 ? 7 : 0;
  }
  function facciaDi(D) {
    const T = D.testa || {}; if (T.faccia !== undefined) return T.faccia; const f = D.sesso === 'f', old = (D.eta || 30) > 58, um = T.umore || 0, sb = T.sopracciglia || 0;
    const r = rng('faccia' + (D.seme !== undefined ? D.seme : JSON.stringify(D))), pk = a => a[Math.floor(r() * a.length)];
    if (f) return old ? pk([14, 15]) : um > .3 ? 11 : pk([10, 12, 13]);
    if (old) return pk([8, 9]); if (sb < -.35) return pk([1, 5]); if (um > .3) return pk([2, 6]); return pk([0, 3, 4, 7]);
  }
  // =====================================================================================
  // LE TESTE DEL KIT: facce e capelli dei modelli di oggi (Quaternius), presi nello spazio del personaggio e cuciti nella figura
  // =====================================================================================
  // Si mescolano: la faccia di un modello coi capelli di un altro. Pelle, capelli, sopracciglia e occhi si ricolorano;
  // sotto i cappelli i capelli si tagliano alla fascia. ?teste=mie torna alle teste costruite qui.
  const PROF = new Map(), KT = { ok: false, f: {} }, KITF = ['Casual', 'Casual_2', 'Casual_Hoodie', 'Worker', 'Formal'];
  function kindOf(nm, file) { if (/^Skin_Darker/.test(nm)) return 'ombra'; if (/^Skin/.test(nm)) return 'pelle'; if (/Worker_Yellow/.test(nm)) return 'casco'; if (/Moustache/.test(nm)) return 'baffi';
    if (/^Eye$|^Brown$/.test(nm)) return 'occhi'; if (/Eyebrows|Hair_Brown/.test(nm)) return 'ciglia'; if (/Hair|^Red$/.test(nm)) return 'capelli'; return null; }
  function kitTeste(person) {
    if (KT.ok || typeof THREE === 'undefined') return KT.ok; const ready = KITF.every(f => window.Models && Models.loadChar && Models.charsReady && Models.charsReady());
    if (!ready) return false;
    KITF.forEach(file => {
      const g = person.call(Models, { model: file, hat: 'none', extra: '' }, null); if (!g) return; g.userData.body.scale.set(1, 1, 1); g.updateMatrixWorld(true);
      let body = null; g.traverse(o => { if (o.isSkinnedMesh && /Body/.test(o.name) && !body) body = o; }); if (!body) return;
      const { J } = giunture(g, body), gi = new THREE.Matrix4().copy(g.matrixWorld).invert(), parts = [];
      g.traverse(o => { if (!o.isSkinnedMesh || !/Head/.test(o.name)) return; const nm = [].concat(o.material)[0].name, kind = kindOf(nm, file); if (!kind) return;
        const M = new THREE.Matrix4().multiplyMatrices(gi, o.matrixWorld).multiply(o.bindMatrix), Nm = new THREE.Matrix3().getNormalMatrix(M), ge = o.geometry, n = ge.attributes.position.count;
        const P = new Float32Array(n * 3), N = new Float32Array(n * 3), v = new THREE.Vector3();
        for (let i = 0; i < n; i++) { v.fromBufferAttribute(ge.attributes.position, i).applyMatrix4(M); P.set([v.x - J.Head[0], v.y - J.Head[1], v.z - J.Head[2]], i * 3); v.fromBufferAttribute(ge.attributes.normal, i).applyMatrix3(Nm).normalize(); N.set([v.x, v.y, v.z], i * 3); }
        parts.push({ kind, P, N, I: Array.from(ge.index ? ge.index.array : P.map((_, i) => i).slice(0, n)) }); });
      KT.f[file] = { parts, neck: J.Neck[1] - J.Head[1] };
    });
    KT.ok = Object.keys(KT.f).length === KITF.length; return KT.ok;
  }
  // quale faccia e quali capelli: dal sesso e dal tipo di capelli, poi dal seme
  const HAIR_KIT = { lunghi: 'Casual', caschetto: 'Casual', coda: 'Formal', raccolti: 'Formal', permanente: 'Formal', riga: 'Casual_2', indietro: 'Casual_2', corti: 'Casual_Hoodie', ricci: 'Casual_Hoodie', brizzolati: 'Casual_2', calvo: 'Worker' };
  function sceltaKit(D) {
    const T = D.testa || {}, r = rng('kit' + (D.seme !== undefined ? D.seme : JSON.stringify(D))), f = D.sesso === 'f';
    const faccia = T.kit || (f ? (r() < .5 ? 'Casual' : 'Formal') : ['Casual_2', 'Casual_Hoodie', 'Worker'][Math.floor(r() * 3)]);
    const tipo = (D.capelli && D.capelli.tipo) || (f ? 'lunghi' : 'corti'), capelli = (D.capelli && D.capelli.kit) || HAIR_KIT[tipo] || (f ? 'Casual' : 'Casual_Hoodie');
    return { faccia, capelli };
  }
  // [personaggi] il cranio sotto i capelli: le teste del kit da donna sopra la fronte non hanno pelle (c'erano i capelli), e qualche
  // quota bassa di quelle da uomo esce bucata. Le righe che mancano o non tornano si rifanno da un cranio intero (Casual_Hoodie misurato),
  // scalato alla larghezza e alla profondità della testa alla quota della fronte; sopra si chiude la cupola.
  const CRANIO = [[.04, .065, .095, .03], [.06, .077, .103, .024], [.08, .086, .117, .027], [.1, .093, .119, .02], [.12, .098, .119, .015], [.14, .1, .122, .015], [.16, .1, .123, .015],
    [.18, .097, .119, .014], [.2, .094, .114, .013], [.22, .085, .099, .01], [.235, .074, .084, .008], [.25, .056, .062, .006], [.26, .034, .038, .004], [.265, .012, .014, .003]];
  function cranio(out) {
    const T = y => { let i = 0; while (i < CRANIO.length - 2 && y > CRANIO[i + 1][0]) i++; const A = CRANIO[i], Bq = CRANIO[i + 1], t = cl((y - A[0]) / (Bq[0] - A[0]), 0, 1); return [lerp(A[1], Bq[1], t), lerp(A[2], Bq[2], t), lerp(A[3], Bq[3], t)]; };
    const ok = r => r[1] > .03 && r[2] > .03, rif = out.find(r => Math.abs(r[0] - .09) < .006 && ok(r)) || out.find(r => r[0] > .06 && r[0] < .11 && ok(r));
    const t9 = T(rif ? rif[0] : .09), sa = rif ? rif[1] / t9[0] : 1, sb = rif ? rif[2] / t9[1] : 1, dz = rif ? rif[3] - t9[2] : 0;
    let su = false; for (let i = 0; i < out.length; i++) { const r = out[i];   // dalla prima riga che manca in su, il cranio intero (le righe più alte del kit a volte sono il bordo di un buco)
      if (r[0] > .1 && (!ok(r) || su)) { su = true; const t = T(r[0]); out[i] = [r[0], t[0] * sa, t[1] * sb, t[2] + dz]; }
      else if (!ok(r)) { const q = out.slice(0, i).reverse().find(ok) || rif; if (q) out[i] = [r[0], q[1], q[2], q[3]]; } }
    const top = out.length ? out[out.length - 1][0] : .1; for (let y = top + .01; y <= .27; y += .01) { const t = T(y); out.push([y, t[0] * sa, t[1] * sb, t[2] + dz]); }   // la cupola fino in cima
  }
  // cuce le parti nella figura; restituisce il profilo della testa misurato (per cappelli, baffi, barbe, occhiali)
  function testaKit(B, J, D, pelle, capH, K, base, taglio) {
    const sc = sceltaKit(D), F = KT.f[sc.faccia], H = KT.f[sc.capelli], hb = J.Head, sk = (D.testa && D.testa.scala || 1) * (S().testaKit || 1), OE = S().occhi || 1;   // [personaggi] testaKit, occhi: la testa e gli occhi del kit più grandi (lo stile cartoon)
    const col = { pelle, ombra: mulc(pelle, .86), occhi: [.06, .045, .04], ciglia: mulc(capH, .72), capelli: capH, baffi: mulc(capH, .85), casco: C3('#e8b030') };
    const neckY = hb[1] + F.neck, wOf = y => y < neckY + .035 ? [['Neck', 1 - sm((y - neckY) / .035)], ['Head', sm((y - neckY) / .035)]].filter(e => e[1] > 1e-3) : [['Head', 1]];
    const mie = CFG.capelli !== 'kit';   // [personaggi] i capelli sono i miei (capelli(), a calotta col volume dello stile) anche sulle teste del kit: ?capelli=kit per quelli del kit
    const usa = [...F.parts.filter(p => p.kind !== 'capelli' && p.kind !== 'casco' && (p.kind !== 'baffi' || D.baffi) && !(mie && p.kind === 'ciglia' && sc.faccia === 'Worker' && false)), ...(mie ? [] : H.parts.filter(p => p.kind === 'capelli'))];
    if (!mie && sc.capelli === 'Worker' && sc.faccia !== 'Worker') usa.push(...H.parts.filter(p => p.kind === 'ciglia'));   // il calvo: la corona di capelli del Worker sta nelle sue "sopracciglia"
    if (D.cappello && D.cappello.tipo === 'casco_cantiere') usa.push(...KT.f.Worker.parts.filter(p => p.kind === 'casco'));
    if (D.baffi && !usa.some(p => p.kind === 'baffi')) usa.push(...KT.f.Worker.parts.filter(p => p.kind === 'baffi'));   // i baffi del Worker, su qualunque faccia
    const pk = [sc.faccia, mie ? 'mie' : sc.capelli, sk, taglio, D.baffi ? 1 : 0, D.cappello && D.cappello.tipo === 'casco_cantiere' ? 1 : 0, hb.map(v => v.toFixed(4))].join('|'), cached = PROF.get(pk), misura = !cached;   // [leggera] il profilo della testa si misura una volta per combinazione
    const tris = []; let eyS = 0, eyN = 0, chinY = 9, skTop = -9; const eyA = { y: 0, x: 0, z: -9 };
    const capV = [];   // [personaggi] i vertici dei capelli: col cappello si stringono sotto la tesa
    usa.forEach(pt => {
      const v0 = B.n, c = col[pt.kind] || pelle, n = pt.P.length / 3; if (pt.kind === 'capelli') capV.push([v0, n]);
      let oc = null; if (pt.kind === 'occhi' && OE !== 1) { oc = [0, 0, 0]; for (let i = 0; i < n; i++) { oc[0] += Math.abs(pt.P[i * 3]); oc[1] += pt.P[i * 3 + 1]; oc[2] += pt.P[i * 3 + 2]; } oc = oc.map(v => v / n); }   // il centro di ciascun occhio (sono simmetrici: |x|) B.ol = pt.kind === 'occhi' || pt.kind === 'ciglia' || pt.kind === 'baffi' ? 0 : 1;
      const keep = new Uint8Array(n).fill(1);
      for (let i = 0; i < n; i++) {
        let q0 = pt.P[i * 3], q1 = pt.P[i * 3 + 1], q2 = pt.P[i * 3 + 2]; if (oc) { const cx = Math.sign(q0) * oc[0]; q0 = cx + (q0 - cx) * OE; q1 = oc[1] + (q1 - oc[1]) * OE; q2 += .002; }
        const p = [hb[0] + q0 * sk, hb[1] + q1 * sk, hb[2] + q2 * sk];
        if (taglio && pt.kind === 'capelli' && p[1] > taglio + (taglio > 0 ? .035 * K : 0)) keep[i] = 0;   // [personaggi] sotto un cappello i capelli si stringono dentro (stringi) e si tagliano solo ben dentro la cupola: niente scalino, niente triangoli che non si vedono
        B.v(p, c, ZERO, ZERO, [0, 0, 0], [0, 0, 0], wOf(p[1])); B.N[(v0 + i) * 3] = pt.N[i * 3]; B.N[(v0 + i) * 3 + 1] = pt.N[i * 3 + 1]; B.N[(v0 + i) * 3 + 2] = pt.N[i * 3 + 2];
        if (pt.kind === 'occhi') { eyS += (p[1] - base[1]) / K; eyN++; eyA.y += p[1]; eyA.x += Math.abs(p[0] - hb[0]); eyA.z = Math.max(eyA.z, p[2]); }
        if (pt.kind === 'pelle') { chinY = Math.min(chinY, p[1]); skTop = Math.max(skTop, p[1]); }
      }
      for (let k = 0; k < pt.I.length; k += 3) { const a = pt.I[k], b = pt.I[k + 1], d = pt.I[k + 2]; if (keep[a] && keep[b] && keep[d]) B.I.push(v0 + a, v0 + b, v0 + d); if (misura && (pt.kind === 'pelle' || pt.kind === 'capelli')) tris.push(Object.assign([v0 + a, v0 + b, v0 + d].map(q => [B.P[q * 3], B.P[q * 3 + 1], B.P[q * 3 + 2]]), { pelle: pt.kind === 'pelle' })); }
    });
    if (OE !== 1 && eyN) { const ey = eyA.y / eyN, ex = eyA.x / eyN, ez = eyA.z + .0025, r = .0055 * sk * OE, v = [.9, .9, .88], w = [['Head', 1]];   // [personaggi] il punto di luce negli occhi
      B.ol = 0; [1, -1].forEach(sg => { const x = hb[0] + sg * ex + .006 * sk, y = ey + .005 * sk, v0 = B.n;
        [[-r, -r], [r, -r], [r, r], [-r, r]].forEach(([a, b]) => { B.v([x + a * .8, y + b, ez], v, ZERO, ZERO, [0, 0, 0], [0, 0, 0], w); B.N[B.n * 3 - 3] = 0; B.N[B.n * 3 - 2] = 0; B.N[B.n * 3 - 1] = 1; });
        B.I.push(v0, v0 + 1, v0 + 2, v0, v0 + 2, v0 + 3); }); }
    B.ol = 1;
    // il profilo come TESTE: [quota, mezza larghezza, mezza profondità, centro in avanti], in unità di K
    // il profilo si misura coi raggi sulla pelle vera: davanti e dietro al centro, di lato a metà profondità
    const capp = taglio > 0, stringi = pr => { if (!capp || !pr || pr.length < 4) return pr;   // [personaggi] col cappello: quello che esce dal cappello si taglia o si stringe dentro
      const at = y => { const yk = (y - base[1]) / K; let i = 0; while (i < pr.length - 2 && pr[i + 1][0] < yk) i++; const A = pr[i], Bq = pr[i + 1], t = Math.max(0, Math.min(1, (yk - A[0]) / ((Bq[0] - A[0]) || 1))); return [lerp(A[1], Bq[1], t), lerp(A[2], Bq[2], t), lerp(A[3], Bq[3], t)]; };
      for (const [v0, n] of capV) for (let i = v0; i < v0 + n; i++) { let y = B.P[i * 3 + 1]; const yTop = base[1] + pr[pr.length - 1][0] * K; if (y > yTop) { y = yTop; B.P[i * 3 + 1] = y; } const dd = (taglio - y) / K; if (dd > .09) continue;
        const [a, b, cz] = at(y), m = dd < 0 ? .0035 : .0035 + dd * .6, x = B.P[i * 3] - base[0], z = B.P[i * 3 + 2] - (base[2] + cz * K), A = (a + m) * K, Bz = (b + m) * K, e = Math.hypot(x / A, z / Bz);
        if (e > 1) { B.P[i * 3] = base[0] + x / e; B.P[i * 3 + 2] = base[2] + cz * K + z / e; } }
      return pr; };
    if (cached) { KT.ultimo = cached; return stringi(cached); }
    const ray = (o, d, solo) => { let best = null; for (const T3 of tris) { if (solo && !T3.pelle) continue; const [A, Bv, C] = T3; const e1 = sub(Bv, A), e2 = sub(C, A), pv = cross(d, e2), det = dot(e1, pv); if (Math.abs(det) < 1e-9) continue; const iv = 1 / det, tv = sub(o, A), u = dot(tv, pv) * iv; if (u < 0 || u > 1) continue; const qv = cross(tv, e1), w = dot(d, qv) * iv; if (w < 0 || u + w > 1) continue; const t = dot(e2, qv) * iv; if (t > 0 && (best === null || t < best)) best = t; } return best; };
    const out = []; for (let yk = -.05; yk <= (mie ? .3 : .24); yk += .01) { const y = base[1] + yk * K;
      const tf = ray([base[0], y, base[2] + .5], [0, 0, -1], true), tbA = ray([base[0], y, base[2] - .5], [0, 0, 1]), tbS = ray([base[0], y, base[2] - .5], [0, 0, 1], true), tb = capp && tbS !== null && (tbA === null || tbS - tbA < .1) ? tbS - .004 : tbS !== null && tbA !== null && tbS - tbA < .1 ? Math.max(tbA, tbS - .012) : tbA; if (tf === null || tb === null) continue; /* la nuca sulla pelle, se c.è lì */
      const zf = .5 - tf, zb = -.5 + tb, zc = (zf + zb) / 2, tsA = ray([base[0] + .5, y, base[2] + zc], [-1, 0, 0]), tsS = ray([base[0] + .5, y, base[2] + zc], [-1, 0, 0], true), ts = capp && tsS !== null && (tsA === null || tsS - tsA < .1) ? tsS - .004 : tsS !== null && tsA !== null && tsS - tsA < .1 ? Math.max(tsA, tsS - .01) : tsA; if (ts === null) continue; /* le tempie sulla pelle */
      out.push([yk, (.5 - ts) / K, (zf - zb) / 2 / K, zc / K]); } if (mie) cranio(out); out.ey = eyN ? eyS / eyN : .093; out.tris = tris; out.eye = eyN ? { y: eyA.y / eyN, x: eyA.x / eyN, z: eyA.z } : null; out.chin = chinY; out.skTop = skTop; out.hb = hb.slice(); KT.ultimo = out; PROF.set(pk, out); return stringi(out);
  }
  function testa(B, J, D, pelle) {
    const st = S(), T = D.testa || {}, K = st.testa * (T.scala || 1) * (D.sesso === 'f' ? .95 : 1), h = J.Head, base = [h[0], h[1] - .01 * K, h[2] - .005], wH = [['Head', 1]];
    const r = rng(D.seme !== undefined ? D.seme : JSON.stringify(D)), vv = (a, b) => lerp(a, b, r());
    const masc = T.mascella || vv(.9, 1.06), zig = T.zigomi || vv(.96, 1.05), fro = T.fronte || vv(.97, 1.03), mento = T.mento !== undefined ? T.mento : vv(-.006, .006);
    const kitOn = KT.ok && CFG.teste !== 'mie', capH0 = (D.capelli && D.capelli.col) ? C3(D.capelli.col) : C3('#2a1a12');
    const taglio = D.cappello && /^(fazzoletto|passamontagna|maschera_gas|cappuccio_stelle|colbacco)/.test(D.cappello.tipo) ? -9 : D.cappello && /^(fascia|bandana|visiera)$/.test(D.cappello.tipo) ? 0 : D.cappello && D.cappello.tipo ? h[1] - .01 * K + (/paglia|cappello/.test(D.cappello.tipo) ? .16 : .135) * K : 0;
    const PK = kitOn ? testaKit(B, J, D, pelle, capH0, K, base, taglio) : null;
    const P = PK && PK.length > 4 ? PK : (TESTE[T.forma] || TESTE.ovale).map(([y, a, b, fz]) => { const kj = y < .04 ? masc : y < .12 ? zig : fro; return [y < 0 ? y - mento : y, a * kj, b * (y < .04 ? lerp(1, masc, .5) : 1), fz + (y < 0 ? mento * .6 : 0)]; });
    const at = (y, x, z) => [base[0] + x * K, base[1] + y * K, base[2] + z * K];
    const capH = (D.capelli && D.capelli.col) ? C3(D.capelli.col) : C3('#2a1a12'), labbra = mixc(pelle, [.55, .25, .22], .35), occ = C3('#1a1414');
    const ru = mixc(pelle, [.8, .35, .3], .12);   // un filo di rosso sulle guance
    const fac = (CFG.facce === 'pulite' ? 56 + facciaPulita(D) : TL.faccia + facciaDi(D)), y0f = P[0][0], y1f = P[P.length - 1][0];
    // [facce] il viso scolpito: arcata delle sopracciglia, orbite, zigomi, guance, labbra e mento in avanti, angolo della mascella, tempie
    const g2 = (y, c, w) => Math.exp(-((y - c) / w) * ((y - c) / w)), banda = (x, a, b) => sm((x - a) / .12) * sm((b - x) / .12), maschio = D.sesso !== 'f', old = (D.eta || 30) > 58;
    const scolpisci = (th, y) => {
      const fr = Math.cos(th), sn = Math.abs(Math.sin(th)); if (fr < -.2) return 0; const fp = Math.max(fr, 0);
      let d = 0;
      if (CFG.facce === 'pulite') return g2(y, -.017, .011) * Math.pow(fp, 7) * (maschio ? .05 : .03) + g2(y, -.006, .016) * banda(sn, .72, 1.05) * (maschio ? .025 : .008) * masc + g2(y, .02, .013) * Math.pow(fp, 6) * .02;
      d += g2(y, .118, .013) * Math.pow(fp, 3) * (maschio ? .055 : .035);                 // l'arcata delle sopracciglia
      d -= g2(y, .092, .012) * banda(sn, .18, .55) * fp * (maschio ? .05 : .04);           // le orbite
      d += g2(y, .066, .018) * banda(sn, .42, .82) * (maschio ? .04 : .045);               // gli zigomi
      d -= g2(y, .036, .013) * banda(sn, .45, .85) * (old ? .05 : maschio ? .03 : .015);   // sotto gli zigomi
      d += g2(y, .02, .013) * Math.pow(fp, 6) * .05;                                       // le labbra
      d -= g2(y, .002, .007) * Math.pow(fp, 8) * .03;                                      // la piega sotto il labbro
      d += g2(y, -.017, .011) * Math.pow(fp, 7) * (maschio ? .075 : .05);                  // il mento
      d += g2(y, -.006, .016) * banda(sn, .72, 1.05) * (maschio ? .05 : .015) * masc;      // l'angolo della mascella
      d -= g2(y, .14, .022) * banda(sn, .7, .95) * .02;                                    // le tempie
      return d;
    };
    const yS = [...new Set(P.map(r => r[0]).concat([-.022, -.01, .004, .018, .04, .055, .07, .082, .1, .112, .126, .155]))].sort((a, b) => a - b).filter(y => y >= P[0][0] && y <= P[P.length - 1][0]);
    const pr = (y, k) => { let i = 0; while (i < P.length - 2 && y > P[i + 1][0]) i++; const a = P[i], b = P[i + 1], t = cl((y - a[0]) / (b[0] - a[0]), 0, 1); return lerp(a[k], b[k], t); };
    if (!kitOn) loft(B, yS.map((y, j) => ({ c: at(y, 0, 0), t: [0, 1, 0], f: [0, 0, 1], a: pr(y, 1) * K, b: pr(y, 2) * K, fz: pr(y, 3) * K, p: st.pTesta || 2.2, col: pelle, v: (y - y0f) / (y1f - y0f), tile: fac, col2: mulc(capH, .85), col3: labbra, mod: th => scolpisci(th, y), colFn: (th) => { const fr = Math.cos(th); return y > .0 && y < .07 && fr > .3 && Math.abs(Math.sin(th)) > .35 ? ru : pelle; }, w: wH, ao: j === 0 ? .9 : 1 })), { seg: 20, uS: 2.5 });
    const front = (y) => { let i = 0; while (i < P.length - 2 && y > P[i + 1][0]) i++; const a = P[i], b = P[i + 1], t = cl((y - a[0]) / (b[0] - a[0]), 0, 1); return lerp(a[2] + a[3], b[2] + b[3], t); };
    const pa = (y, k) => { let i = 0; while (i < P.length - 2 && y > P[i + 1][0]) i++; const a = P[i], b = P[i + 1], t = cl((y - a[0]) / (b[0] - a[0]), 0, 1); return lerp(a[k], b[k], t); };
    const wid = (y) => { let i = 0; while (i < P.length - 2 && y > P[i + 1][0]) i++; const a = P[i], b = P[i + 1], t = cl((y - a[0]) / (b[0] - a[0]), 0, 1); return lerp(a[1], b[1], t); };
    B.ol = 0;
    // il naso: a cuneo, sporge dalla faccia; la forma per tipo (dritto, aquilino, a patata, all'insù)
    const nk = (T.naso || 1) * st.naso * vv(.92, 1.08), nt = T.nasoTipo || 'dritto', ny = .075, nz = front(ny) - .006;
    const NR = { dritto: [[.104, .008, .006, 0], [.08, .011, .01, .01], [.062, .014, .013, .019], [.054, .011, .009, .02]], aquilino: [[.104, .008, .006, 0], [.085, .011, .011, .015], [.064, .013, .013, .022], [.054, .01, .009, .019]], patata: [[.1, .008, .007, 0], [.08, .012, .01, .01], [.063, .019, .017, .019], [.055, .014, .011, .019]], insu: [[.1, .007, .006, 0], [.08, .01, .009, .008], [.066, .013, .012, .016], [.06, .01, .008, .018]] }[nt] || null;
    if (!kitOn) loft(B, NR.map(([y, a, b, fz]) => ({ c: at(y, 0, nz), t: [0, -1, 0], f: [0, 0, 1], a: a * nk, b: b * nk, fz: fz * nk * K, p: 2, col: mixc(pelle, ru, .4), w: wH })), { seg: 8 });
    // le orecchie
    if (!kitOn) [1, -1].forEach(s => uovo(B, at(.075, s * (wid(.075) - .004), -.012), [0, 1, 0], .012 * K, .02 * K, .03 * K, mulc(pelle, .93), wH, { anelli: 4, seg: 7 }));
    const ey = PK && PK.ey ? PK.ey : .093;
    if (kitOn) {   // [personaggi] le teste del kit non hanno la bocca: la fessura sottile, le labbra rosate sopra e sotto (piene per le donne), niente baffo scuro
      const fem = D.sesso === 'f', um = T.umore || 0, my = ey - .066, mz = front(my) + .003, mw = (fem ? .018 : .021) * (T.bocca || 1); B.ol = 0;
      const lab = fem ? mixc(pelle, [.72, .2, .24], .55) : mixc(pelle, [.6, .28, .24], .28), q5 = [-1, -.5, 0, .5, 1];
      const lp = (dyq, ww, a, b, col, k0) => loft(B, q5.map(q => ({ c: at(my + dyq + (Math.abs(q) * um * .006) - (q * (T.storto || 0) * .004), q * mw * ww, front(my + dyq) + .002 - Math.abs(q) * k0), t: [1, 0, 0], f: [0, 0, 1], a: a * K * (1 - .55 * Math.abs(q) ** 2), b: b * K, p: 2.4, col, w: wH })), { seg: 6 });
      if (fem) { lp(.0045, .92, .0034, .003, lab, .006); lp(-.0055, .78, .0052, .0035, mulc(lab, 1.06), .005); }
      else lp(-.005, .7, .0032, .0024, lab, .004);
      lp(0, 1, fem ? .0016 : .0019, .0032, [.2, .07, .07], .006);
      B.ol = 1; }
    // il mento e le guance degli anziani: un filo di doppio mento
    if (false) uovo(B, at(-.02, 0, front(-.02) - .03), [0, 0, 1], .06 * K, .025 * K, .03 * K, mulc(pelle, .96), wH, { anelli: 3, seg: 8 });
    B.ol = 1;
    if (!kitOn) capelli(B, at, K, D, capH, front, wid, wH, pa);
    else if (CFG.capelli !== 'kit') { const dy = PK && PK.ey ? PK.ey - .093 : 0;   // [personaggi] i miei capelli sul cranio del kit (misurato senza i suoi capelli), alla quota dei suoi occhi
      const pa2 = (y, k) => k === 0 ? pa(y + dy, 0) - dy : pa(y + dy, k) + (k === 1 || k === 2 ? .006 : 0); pa2.PK = PK;   // un filo più larga: il cranio del kit è squadrato, gli spigoli bucavano la calotta tonda
      pa2.lim = PK && PK.skTop > -9 ? (PK.skTop - base[1]) / K - dy - .006 : 9;   // l'attaccatura non sopra dove finisce la pelle del viso (le teste da donna del kit finiscono basse)
      capelli(B, (y, x, z) => at(y + dy, x, z), K, D, capH, y => front(y + dy), y => wid(y + dy), wH, pa2); }
    B.ol = 0;
    if (D.baffi && !kitOn) { const by = .036, bz = front(by) + .002, tipo = D.baffi; [1, -1].forEach(s => uovo(B, at(by - (tipo === 'spioventi' ? .006 : 0), s * .019, bz), [s, tipo === 'spioventi' ? -.6 : -.18, 0], .008 * K * (tipo === 'folti' || tipo === 'spioventi' ? 1.5 : 1), .009 * K, .026 * K * (tipo === 'spioventi' ? 1.2 : 1), capH, wH, { anelli: 4, seg: 6, punta: -.3, f: [0, 0, 1] })); }
    if (D.barba) { const corta = D.barba === 'corta' || D.barba === 'pizzetto';
      if (D.barba === 'pizzetto') uovo(B, at(-.025, 0, front(-.025) - .008), [0, 1, .2], .022 * K, .014 * K, .028 * K, capH, wH, { anelli: 4, seg: 7 });
      else { const y0 = P[0][0], yM = ey - .07, yT = ey - .02, ys = corta ? [y0 - .004, y0 + .01, yM, yT] : [y0 - .03, y0 - .012, y0 + .01, yM, yT];   // la barba segue la mascella misurata, dal mento alle basette
        loft(B, ys.map((y, j) => { const yy = Math.max(y, y0), q = j / (ys.length - 1), ex = (corta ? .009 : .016) * (1 - q * .4) + (y < y0 ? .0 : 0); return { c: at(y, 0, 0), t: [0, 1, 0], f: [0, 0, 1], a: (pa(yy, 1) * (y < y0 ? lerp(.55, 1, (y - (y0 - .03)) / .03) : 1) + ex) * K, b: (pa(yy, 2) * (y < y0 ? .7 : 1) + ex) * K, fz: pa(yy, 3) * K + (y < y0 ? .012 * K : 0), col: capH, w: wH,
          mod: th => { const fr = Math.cos(th); return (fr < .05 ? -.6 * sm((.05 - fr) / .4) : 0) - (y > yM - .005 && fr > .55 ? .25 * sm((fr - .55) / .2) : 0); } }; }), { seg: 16 }); } }
    if (D.occhiali) { B.ol = 0; occhiali(B, D, PK, at, K, ey, front, wid, wH); B.ol = 1; }
    B.ol = 1;
    pa.PK = PK; if (D.cappello && D.cappello.tipo) cappello(B, at, K, D, front, wid, wH, pa);
  }
  // ---------------- I CAPELLI A CIOCCHE ----------------
  const P0top = pa => { let y = .2; while (y < .3 && pa(y + .002, 1) > .012 && pa(y + .002, 1) < pa(y, 1) + 1e-6) y += .002; return y; };
  function capelli(B, at, K, D, col, front, wid, wH, pa) {
    const tipo = (D.capelli && D.capelli.tipo) || 'corti', hat = D.cappello && D.cappello.tipo, scuro = mulc(col, .8), chiaro = mixc(col, [1, 1, 1], .1);
    const cc = (y, x, z, ax, a, b, l, c, o) => uovo(B, at(y, x, z), ax, a * K, b * K, l * K, c || col, wH, Object.assign({ anelli: 4, seg: 8 }, o || {}));
    const top = pa(1, 0), sotto = hat && !/^(fazzoletto|fascia|bandana|visiera)$/.test(hat) ? (hat === 'paglia' || hat === 'cappello' ? .16 : .135) : 0;   // [personaggi] fascia, bandana e visiera non coprono la testa: i capelli restano interi
    if (hat === 'fazzoletto') return;
    const r = rng('capelli' + JSON.stringify(D.capelli || {}) + (D.seme || '')), lato = r() < .5 ? 1 : -1;
    // [capelli] una calotta sola che segue il cranio, con lo spessore e il volume dello stile, l'attaccatura vera
    // (fronte, tempie, basette, nuca) e i ciuffi fatti di forma, non di palline
    const S = {
      corti: { base: .007, cima: .012, ciuffo: .012, nuca: .035, fronte: .178, tempia: .15 },
      brizzolati: { base: .006, cima: .009, ciuffo: .008, nuca: .035, fronte: .182, tempia: .152 },
      riga: { base: .008, cima: .014, ciuffo: .018, nuca: .03, fronte: .172, tempia: .148, riga: 1 },
      indietro: { base: .006, cima: .006, ciuffo: 0, nuca: .04, fronte: .19, tempia: .158, dietro: .016, punta: 1 },
      ricci: { base: .02, cima: .02, ciuffo: .01, nuca: .04, fronte: .175, tempia: .15, ricci: .016 },
      calvo: { base: .006, cima: 0, ciuffo: 0, nuca: .045, fronte: .3, tempia: .3, calvo: 1 },
      lunghi: { base: .01, cima: .01, ciuffo: .01, nuca: -.02, fronte: .178, tempia: .14, riga: 1 },
      caschetto: { base: .012, cima: .012, ciuffo: .0, nuca: -.01, fronte: .155, tempia: .12, frangia: 1 },
      raccolti: { base: .006, cima: .006, ciuffo: 0, nuca: .05, fronte: .182, tempia: .15, riga: 1 },
      coda: { base: .006, cima: .006, ciuffo: 0, nuca: .05, fronte: .182, tempia: .15 },
      permanente: { base: .022, cima: .024, ciuffo: .008, nuca: .04, fronte: .175, tempia: .145, ricci: .02 },
    }[tipo] || {};
    const g2 = (y, c, w) => Math.exp(-((y - c) / w) * ((y - c) / w));
    // dove ci sono capelli: sopra l'attaccatura, che scende dalla fronte alle tempie, alle basette e alla nuca
    const attacco = (th) => attacco1(th, true), attacco0 = th => attacco1(th, false), attacco1 = (th, lim) => { const fr = Math.cos(th), sn = Math.sin(th), as = Math.abs(sn);
      if (S.calvo) return fr > -.35 ? 1 : lerp(.06, .2, sm((fr + .9) / .55));   // la corona: solo dietro e ai lati
      if (lim && pa.lim !== undefined && fr > -.2) { const yy = attacco0(th); return Math.min(yy, pa.lim + (1 - sm((fr + .2) / .5)) * .05); }
      let y = fr > .25 ? S.fronte - (S.riga && sn * lato > 0 ? .008 : 0) - (S.punta ? .01 * Math.exp(-sn * sn * 60) : 0) : lerp(S.tempia, S.fronte, sm((fr - .0) / .25));
      if (as > .8 && fr > -.3) y = Math.min(y, lerp(S.tempia, .07, sm((as - .8) / .15)));   // le basette
      if (fr < -.2) y = Math.min(y, lerp(y, S.nuca, sm((-.2 - fr) / .4)));             // la nuca
      return y; };
    const volume = (th, y) => { const fr = Math.cos(th), sn = Math.sin(th);
      let o = S.base + S.cima * sm((y - .17) / .06);
      o += S.ciuffo * g2(y, .19, .025) * sm((fr - .3) / .4) * (S.riga ? (sn * lato > 0 ? 1.4 : .5) : 1);   // il ciuffo davanti
      if (S.dietro) o += S.dietro * g2(y, .15, .04) * sm((-fr - .2) / .5);                              // pettinati all'indietro: il volume dietro
      if (S.ricci) o += S.ricci * (.5 + .5 * Math.sin(th * 9 + y * 140) * Math.sin(y * 210 + th * 3));
      if (S.frangia) o += .006 * sm((fr - .4) / .3) * g2(y, .17, .02);
      return o; };
    const hl = (th, y) => { const ya = attacco(th); return y >= ya ? 0 : -1 * sm((ya - y) / .012); };   // sotto l'attaccatura la calotta rientra nel cranio
    const y0 = sotto ? .05 : Math.min(.03, S.nuca - .01), ys = []; for (let k = 0; k <= 12; k++) ys.push(lerp(y0, sotto ? sotto + .004 : top, k / 12));
    if (!sotto) ys.push(top + .008, top + .016);
    loft(B, ys.map((y, j) => { const yy = Math.min(y, top - .003), last = j === ys.length - 1, sop = j >= ys.length - 2 && !sotto;
      const a0 = pa(yy, 1), b0 = pa(yy, 2), kk = sop ? (last ? .25 : .65) : 1;
      return { c: at(Math.min(y, top + .006), 0, 0), t: [0, 1, 0], f: [0, 0, 1], a: a0 * K * kk, b: b0 * K * kk, fz: pa(yy, 3) * K, p: S.ricci ? 2.2 : 2.35, col: y < .1 ? scuro : col,
        colFn: S.riga && !sotto ? (th => { const sn = Math.sin(th) * lato, fr = Math.cos(th); return Math.abs(sn - .32) < .05 && fr > 0 && y > .19 ? mulc(col, .6) : y < .1 ? scuro : col; }) : null,
        w: wH, mod: th => { if (sotto && y > sotto - .002) return -.04; let o = volume(th, y) * (sop ? .6 : 1) + (sotto ? .004 : 0); const k = -hl(th, y);
          if (sotto && pa.lim !== undefined) o = lerp(o, -.004, sm((y - (sotto - .045)) / .035));   /* [personaggi] sotto la tesa i capelli rientrano dentro il cappello: niente cercine che esce */ return lerp(o / ((a0 + b0) * .5), -.32, k); } }; }), { seg: 22 });   // [personaggi] sotto l'attaccatura rientra molto: sulle teste del kit (naso, labbra in avanti) a -.12 usciva sul viso
    // gli stili che hanno pezzi in più
    if (tipo === 'lunghi' || tipo === 'caschetto') {   // il tendone dietro e ai lati: fino alle spalle (lunghi) o al mento (caschetto), aperto davanti
      const lo = tipo === 'lunghi' ? -.13 : -.025;
      loft(B, [[.15, 1], [.08, 1.03], [.02, 1.03], [lo * .5, 1.0], [lo, .95]].map(([y, q], j) => ({ c: at(y, 0, -.012), t: [0, -1, 0], f: [0, 0, 1], a: (pa(Math.max(y, .03), 1) + .016) * q * K, b: (pa(Math.max(y, .03), 2) + .014) * q * K, fz: (pa(Math.max(y, .03), 3) - .006) * K, col: j > 2 ? scuro : col, w: y < -.04 ? [['Head', .5], ['Neck', .5]] : wH,
        mod: th => { const fr = Math.cos(th); return (fr > .15 ? -.9 * sm((fr - .15) / .25) : 0) + .02 * Math.sin(th * 11) * sm(j / 3); } })), { seg: 22 });
    }
    if (tipo === 'raccolti' && !sotto) cc(.165, 0, -.1, [0, .45, -1], .042, .042, .044, chiaro);   // lo chignon
    if (tipo === 'coda') { cc(.14, 0, -.112, [0, .2, -1], .018, .018, .022, scuro); loft(B, [0, .4, .8, 1].map((q, j) => ({ c: at(.14 - q * .2, 0, -.12 - q * .03), t: [0, -1, -.2], f: [0, 0, 1], a: [.024, .028, .02, .004][j] * K, b: [.022, .026, .018, .004][j] * K, col: j > 1 ? scuro : col, w: q > .4 ? [['Head', .5], ['Neck', .5]] : wH })), { seg: 8 }); }
  }
  // ---------------- GLI OCCHIALI: a goccia (montatura d'oro), ovali (lenti colorate), mascherina e visiera avvolgenti, da vista ----------------
  const LENTI = { scuro: ['#3a4a5a', '#0a0c10', '#141820'], fumo: ['#5a5048', '#1a1612', '#2a221a'], blu: ['#7ad0ff', '#1a3a8a', '#0e1a3a'], fuoco: ['#ffe070', '#e8502a', '#5a1a10'], verde: ['#8ae0a0', '#1a5a3a', '#0a2a1a'], chiaro: ['#e8f0f4', '#c8d8e0', '#b0c4d0'] };
  function occhiali(B, D, PK, at, K, ey, front, wid, wH) {
    const kind = D.occhiali, E = PK && PK.eye, hb = PK ? PK.hb : null;
    // in metri, nello spazio del personaggio: y degli occhi, x degli occhi, z davanti agli occhi, raggio del cranio
    const y = E ? E.y - .002 : at(ey, 0, 0)[1], ex = E ? E.x : .034 * K, zf = (E ? E.z : at(ey, 0, front(ey))[2]) + .014, cx = hb ? hb[0] : at(0, 0, 0)[0], rs = (wid(ey) || .085) * K + .006;
    const vista = kind === 'vista' || kind === 'oro', met = C3(kind === 'goccia' || kind === 'oro' ? '#c8a448' : D.occhialiCol || (vista ? '#2a2422' : '#101012'));
    const lens = LENTI[D.lente || { goccia: 'fumo', ovali: 'fuoco', mascherina: 'scuro', shield: 'blu' }[kind] || 'chiaro'].map(C3);
    const wrap = kind === 'mascherina' || kind === 'shield' ? 1 : kind === 'ovali' ? .25 : .45, zAt = x => zf - wrap * x * x * 3.2;
    // una lente: contorno 2D [x,y] sulla curva, a ventaglio, sfumata dall'alto in basso e col riflesso
    const pane = (L) => { const v0 = B.n, i0 = B.I.length, xs = L.map(p => p[0]), ysA = L.map(p => p[1]), y0 = Math.min(...ysA), y1 = Math.max(...ysA), x0 = Math.min(...xs), x1 = Math.max(...xs);
      const colAt = (px, py) => { const t = 1 - (py - y0) / (y1 - y0 || 1), c = t < .45 ? mixc(lens[0], lens[1], t / .45) : mixc(lens[1], lens[2], (t - .45) / .55), u = (px - x0) / (x1 - x0 || 1), v = t, hl = Math.exp(-(((u - .3) / .16) ** 2) - (((v - .28) / .07) ** 2)); return mixc(c, [1, 1, 1], hl * .55); };
      const ccx = xs.reduce((a, b) => a + b, 0) / xs.length, ccy = ysA.reduce((a, b) => a + b, 0) / ysA.length;
      B.v([cx + ccx, ccy, zAt(ccx)], colAt(ccx, ccy), ZERO, ZERO, [0, 0, 0], [0, 0, 0], wH);
      L.forEach(p => B.v([cx + p[0], p[1], zAt(p[0])], colAt(p[0], p[1]), ZERO, ZERO, [0, 0, 0], [0, 0, 0], wH));
      for (let k = 0; k < L.length; k++) B.I.push(v0, v0 + 1 + k, v0 + 1 + (k + 1) % L.length);
      for (let k = 0; k < L.length; k++) B.I.push(v0, v0 + 1 + (k + 1) % L.length, v0 + 1 + k);   // due facce
      for (let i = v0; i < B.n; i++) { B.N[i * 3] = 0; B.N[i * 3 + 1] = .2; B.N[i * 3 + 2] = 1; } };
    const rim = (L, r) => tuboP(B, L.map(p => [cx + p[0], p[1], zAt(p[0]) + .001]), () => r, met, wH, true);
    const ell = (ccx, ccy, rx, ry, n, e) => { const L = []; for (let k = 0; k < n; k++) { const t = k / n * Math.PI * 2, ct = Math.cos(t), st = Math.sin(t); L.push([ccx + Math.sign(ct) * Math.pow(Math.abs(ct), e || 1) * rx, ccy + Math.sign(st) * Math.pow(Math.abs(st), e || 1) * ry]); } return L; };
    let hingeX = rs * .92, hingeY = y + .006;
    if (kind === 'goccia') { for (const s0 of [-1, 1]) { const L = ell(s0 * ex, y - .004, .028, .024, 18).map(p => [p[0], p[1] - (p[1] < y - .004 ? .006 * Math.max(0, (p[0] * s0 - ex + .028) / .056) : 0)]); pane(L); rim(L, .0022); }
      tuboP(B, [[cx - ex + .022, y + .016, zAt(0) + .002], [cx, y + .019, zAt(0) + .003], [cx + ex - .022, y + .016, zAt(0) + .002]], () => .0018, met, wH); hingeX = ex + .028; hingeY = y + .012; }
    else if (kind === 'ovali') { for (const s0 of [-1, 1]) { const L = ell(s0 * (ex + .002), y, .023, .012, 16, .9); pane(L); rim(L, .0032); } tuboP(B, [[cx - .01, y + .004, zAt(0) + .002], [cx + .01, y + .004, zAt(0) + .002]], () => .002, met, wH); hingeX = ex + .026; hingeY = y + .003; }
    else if (kind === 'mascherina' || kind === 'shield') { const W = rs * .98, top = y + .02, L = [];
      for (let k = 0; k <= 20; k++) { const x = -W + k / 20 * 2 * W; L.push([x, top + .002 * Math.cos(x / W * Math.PI)]); }
      for (let k = 20; k >= 0; k--) { const x = -W + k / 20 * 2 * W, ax = Math.abs(x), nose = Math.max(0, 1 - ax / .016) * .014; L.push([x, y - .022 + .012 * Math.pow(ax / W, 2.2) + nose]); }
      pane(L); if (kind === 'mascherina') { const R = []; for (let k = 0; k <= 20; k++) { const x = -W - .002 + k / 20 * 2 * (W + .002); R.push([cx + x, top + .003 + .002 * Math.cos(x / W * Math.PI), zAt(x) + .002]); } tuboP(B, R, () => .0045, met, wH); }
      hingeX = W; hingeY = top - .006; }
    else { for (const s0 of [-1, 1]) { const L = ell(s0 * ex, y, .022, .017, 16, kind === 'oro' ? 1 : .7); pane(L); rim(L, kind === 'oro' ? .0018 : .003); } tuboP(B, [[cx - ex + .02, y + .005, zAt(0) + .002], [cx, y + .007, zAt(0) + .003], [cx + ex - .02, y + .005, zAt(0) + .002]], () => .0018, met, wH); hingeX = ex + .022; }
    for (const s0 of [-1, 1]) tuboP(B, [[cx + s0 * hingeX, hingeY, zAt(hingeX) - .002], [cx + s0 * (rs + .012), hingeY + .002, zAt(hingeX) * .3 + zf * 0 + (hb ? hb[2] : 0) * .7], [cx + s0 * (rs + .01), hingeY - .012, (hb ? hb[2] : 0) - .02]], () => kind === 'goccia' || kind === 'oro' ? .0018 : .003, met, wH);
  }
  // ---------------- IL PASSAMONTAGNA: guscio di maglia misurato sulla testa vera, fori coi bordi, e le varianti fantasia ----------------
  const PMS = {
    passamontagna: { fori: 'fessura' }, maschera_gas: { fori: 'fessura', gas: 1 },
    passamontagna_righe: { fori: 'fessura', righe: '#1a1a1e', bordo: '#1a1a1e' },
    passamontagna_punte: { fori: 'occhi', bordo: '#1a1a1e', cresta: ['#e8e0d0', '#1a1a1e'] },
    passamontagna_orecchie: { fori: 'occhi', bocca: 1, bordo: '#1a1a1e', orecchie: 'gatto', c2: '#f4b8c8' },
    passamontagna_diavolo: { fori: 'occhi', bocca: 'labbra', stelleOcchi: '#d8283a', spesso: 1, corna: 'diavolo', cc: ['#d8283a'], collo: '#d8283a', borchie: 1, guancia: '#6a8ad0' },
    passamontagna_clown: { fori: 'occhi', bocca: 1, viso: '#6ac8e0', zigzag: '#e8586a', bolle: '#f0e8d4', naso: '#e8586a', guance: '#e8586a', frange: '#f0e8d4', punta: 1 },
    passamontagna_riccio: { fori: 'occhi', bordo: '#5a0a2a', riccio: 1, becco: 1 },
    passamontagna_corna: { fori: 'occhi', borchieOcchi: '#d8d8e0', bordo2: ['#60e030', '#f040a8'], corna: 'lunghe', cc: ['#60e030', '#f040a8'], gorgiera: ['#ff8a1e'] },
    passamontagna_coniglio: { fori: 'occhi', bocca: 1, orecchie: 'coniglio', c2: '#f4b8b0', gorgiera: ['#f4c8c0'] },
    passamontagna_giullare: { fori: 'mandorla', bordo: '#1a4a5a', ricamo: 1, corna: 'giullare', cc: ['#8a6ad0', '#1a4a5a'], gorgiera: ['#d8e8d8', '#5a6a8a'] },
    cappuccio_stelle: { fori: 'viso', ruche: '#f0e08a', corna: 'giullare', cc: [null], stelle: '#f0e08a', gorgiera: ['#f0e08a', '#c8c0b0'] },
    passamontagna_pallini: { fori: 'viso', bordo: '#3ab048', spesso: 1, corna: 'grosse', cc: ['#d8f040'], pallini: '#f0409a', gorgiera: ['#f0409a'], rete: 1 },
  };
  const PMCACHE = new Map();
  function passamontagna(B, D, PK) {
    const H = D.cappello, st = PMS[H.tipo] || PMS.passamontagna, col = C3(H.col || '#2a2a2e'), hb = PK.hb, E = PK.eye || { y: hb[1] + .1, x: .033, z: hb[2] + .1 };
    const knit = c => ({ col: c, ptile: PT.maglia, col3: mulc(c, .7) }), cRighe = st.righe ? C3(st.righe) : null;
    const ey = E.y, ex = E.x, sc = cl((E.y - PK.chin) / .123, .85, 1.08), wH = [['Head', 1]];
    const cx = hb[0], cz = E.z - .108 * sc, skTop = cl(PK.skTop, ey + .112 * sc, ey + .135 * sc), brow = ey + .055 * sc, y0 = PK.chin - .05, yTop = st.punta ? skTop + .16 : skTop + .03;
    const wOf = y => y < PK.chin - .005 ? [['Neck', .7], ['Head', .3]] : y < PK.chin + .02 ? [['Neck', .3], ['Head', .7]] : wH;
    // 1. la testa misurata coi raggi (pelle e capelli), con le conche riempite, le sezioni ovalizzate e la calotta a cupola
    const NA = 40, NR = 26, key = JSON.stringify([hb, E, PK.chin, st.punta ? 1 : 0, PK.tris.length]);
    let RG = PMCACHE.get(key);
    if (!RG) { RG = []; const rowY = j => y0 + (yTop - y0) * j / NR;
      const ray = (o, d) => { let best = null; for (const [A, Bv, C] of PK.tris) { const e1 = sub(Bv, A), e2 = sub(C, A), pv = cross(d, e2), det = dot(e1, pv); if (Math.abs(det) < 1e-9) continue; const iv = 1 / det, tv = sub(o, A), u = dot(tv, pv) * iv; if (u < 0 || u > 1) continue; const qv = cross(tv, e1), w = dot(d, qv) * iv; if (w < 0 || u + w > 1) continue; const t = dot(e2, qv) * iv; if (t > 0 && (best === null || t < best)) best = t; } return best; };
      for (let j = 0; j <= NR; j++) { const y = rowY(j), R = new Float32Array(NA); for (let i = 0; i < NA; i++) { const a = -Math.PI + i / NA * Math.PI * 2, t = ray([cx + Math.sin(a) * .4, y, cz + Math.cos(a) * .4], [-Math.sin(a), 0, -Math.cos(a)]); R[i] = t === null ? 0 : .4 - t; } RG.push(R); }
      const fall = y => y < PK.chin ? lerp(.05, .075, sm((y - y0) / (PK.chin - y0))) : .092 * sc;
      for (let j = 0; j <= NR; j++) { const R = RG[j], y = rowY(j); for (let i = 0; i < NA; i++) if (R[i] < fall(y) * .55) R[i] = fall(y);
        for (let it = 0; it < 6; it++) for (let i = 0; i < NA; i++) R[i] = Math.max(R[i], (R[(i + 1) % NA] + R[(i + NA - 1) % NA]) / 2 * .998);   // le conche (occhi, sotto il naso) si riempiono
        let W = 0, Df = 0, Db = 0; for (let i = 0; i < NA; i++) { const a = -Math.PI + i / NA * Math.PI * 2; W = Math.max(W, Math.abs(Math.sin(a)) * R[i]); const z = Math.cos(a) * R[i]; if (z > 0) Df = Math.max(Df, z); else Db = Math.max(Db, -z); }
        for (let i = 0; i < NA; i++) { const a = -Math.PI + i / NA * Math.PI * 2, D0 = Math.cos(a) >= 0 ? Df : Db, e = 2.3, rs = 1 / Math.pow(Math.pow(Math.abs(Math.cos(a)) / Math.max(D0, .02), e) + Math.pow(Math.abs(Math.sin(a)) / Math.max(W, .02), e), 1 / e); R[i] = Math.max(R[i] * .985, rs * .9); } }
      for (let it = 0; it < 3; it++) for (let j = 1; j < NR; j++) { if (rowY(j) > brow) break; for (let i = 0; i < NA; i++) RG[j][i] = Math.max(RG[j][i], (RG[j - 1][i] + RG[j + 1][i]) / 2); }   // la maglia tesa tra naso, labbra e mento
      if (!st.punta) { let jb = 0; for (let j = 0; j <= NR; j++) if (rowY(j) <= brow) jb = j; const R0 = RG[jb].slice(), Hd = skTop - brow + .012, pe = 2.35;
        for (let j = jb + 1; j <= NR; j++) { const yy = rowY(j) - brow, f = Math.pow(Math.max(0, 1 - Math.pow(Math.min(1, yy / Hd), pe)), 1 / pe); for (let i = 0; i < NA; i++) RG[j][i] = R0[i] * f; } }
      else { let jb = 0; for (let j = 0; j <= NR; j++) if (rowY(j) <= brow) jb = j; const R0 = RG[jb].slice(); for (let j = jb + 1; j <= NR; j++) { const q = (rowY(j) - brow) / (yTop - brow); for (let i = 0; i < NA; i++) RG[j][i] = R0[i] * Math.pow(1 - q, 1.4) * (q < .3 ? 1 : 1); } }
      for (let j = 0; j <= NR; j++) for (let i = 0; i < NA; i++) RG[j][i] += .0045;
      PMCACHE.set(key, RG); }
    const rA = (a, y) => { const fj = cl((y - y0) / (yTop - y0) * NR, 0, NR), j0 = Math.floor(fj), j1 = Math.min(NR, j0 + 1), u = fj - j0, fi = ((((a + Math.PI) / (Math.PI * 2)) * NA) % NA + NA) % NA, i0 = Math.floor(fi), i1 = (i0 + 1) % NA, v = fi - i0; return (RG[j0][i0] * (1 - v) + RG[j0][i1] * v) * (1 - u) + (RG[j1][i0] * (1 - v) + RG[j1][i1] * v) * u; };
    const zSh = y => st.punta ? -Math.max(0, y - skTop + .02) * .45 : 0;
    const P = (a, y, off) => { const r = rA(a, y) + (off || 0); return [cx + Math.sin(a) * r, y, cz + Math.cos(a) * r + zSh(y)]; };
    const Nrm = (a, y) => norm(sub(P(a, y, .01), P(a, y, 0)));
    const aOf = (X, y) => Math.asin(cl(X / Math.max(.02, rA(0, y)), -1, 1));
    const my = ey - .072 * sc, faceY = ey - .03 * sc;
    const inHole = (a, y) => { if (Math.cos(a) < .2) return false; const X = Math.sin(a) * rA(a, y);
      if (st.fori === 'fessura') return Math.abs(y - ey) < .021 && Math.abs(X) < .064;
      if (st.fori === 'viso') return (X / (.072 * sc)) ** 2 + ((y - faceY) / (.09 * sc)) ** 2 < 1;
      for (const s of [-1, 1]) { const dx = X - s * ex, dy = y - ey; if (st.fori === 'mandorla' ? Math.abs(dx) / .023 + Math.abs(dy) / .021 < 1 : (dx / .02) ** 2 + (dy / .0135) ** 2 < 1) return true; }
      return !!st.bocca && (X / .025) ** 2 + ((y - my) / .012) ** 2 < 1; };
    // 2. il guscio: griglia fitta (i fori tondi), maglia a coste, a righe se c'è
    const shell = (filt, off, c0) => { const na = 64, nr = 40, v0 = B.n, i0 = B.I.length, K0 = knit(c0);
      for (let j = 0; j <= nr; j++) { const y = y0 + (yTop - y0) * j / nr; for (let i = 0; i <= na; i++) { const a = -Math.PI + i / na * Math.PI * 2, p = P(a, y, off), rr = cRighe && Math.floor((y - y0) / .022) % 2 ? cRighe : c0;
        B.v(p, rr, ZERO, mulc(rr, .7), [0, 0, 0], [i / na * 2 * Math.PI * .1, (y - y0), PT.maglia], wOf(y)); } }
      for (let j = 0; j < nr; j++) for (let i = 0; i < na; i++) { const a = -Math.PI + (i + .5) / na * Math.PI * 2, y = y0 + (yTop - y0) * (j + .5) / nr; if (!filt(a, y)) continue; const q = v0 + j * (na + 1) + i, r2 = q + na + 1; B.I.push(q, r2, q + 1, q + 1, r2, r2 + 1); }
      B.chiudi(v0, i0, vi => { const k = vi - v0, j = Math.floor(k / (na + 1)); return [cx, y0 + (yTop - y0) * j / nr, cz]; }); };
    shell((a, y) => !inHole(a, y), 0, col);
    const faceOval = (a, y) => Math.cos(a) > 0 && (Math.sin(a) * rA(a, y) / .085) ** 2 + ((y - (ey - .025)) / .1) ** 2 < 1;
    if (st.viso) shell((a, y) => faceOval(a, y) && !inHole(a, y), .0025, C3(st.viso));
    // 3. i bordi a cordone, chiusi sul guscio
    const loopP = (fn, n) => { const pts = []; for (let k = 0; k < n; k++) { const t = k / n * Math.PI * 2, [X, Y] = fn(t); pts.push(P(aOf(X, Y), Y, .003)); } return pts; };
    const sp2 = (t, e) => Math.sign(t) * Math.pow(Math.abs(t), e);
    const eyeLoop = s => loopP(t => st.fori === 'mandorla' ? [s * ex + .025 * sp2(Math.cos(t), 1.7), ey + .023 * sp2(Math.sin(t), 1.7)] : [s * ex + .022 * Math.cos(t), ey + .0155 * Math.sin(t)], 18);
    const loops = []; if (st.fori === 'fessura') loops.push(loopP(t => [.067 * sp2(Math.cos(t), .35), ey + .024 * sp2(Math.sin(t), .35)], 24));
    else if (st.fori === 'viso') loops.push(loopP(t => [.075 * sc * Math.cos(t), faceY + .093 * sc * Math.sin(t)], 26)); else loops.push(eyeLoop(-1), eyeLoop(1));
    const mouth = st.bocca ? loopP(t => [.028 * Math.cos(t), my + .0145 * Math.sin(t)], 16) : null, rimR = st.spesso ? .0085 : .0055;
    loops.forEach((L, i) => { const cc = st.bordo2 ? st.bordo2[i % 2] : st.bordo; tuboP(B, L, () => rimR, C3(cc || H.col || '#2a2a2e'), wH, true); });
    if (mouth) { if (st.bocca === 'labbra') tuboP(B, mouth, () => .012, C3(st.cc ? st.cc[0] : '#d8283a'), wH, true); else tuboP(B, mouth, () => rimR, C3(st.bordo || H.col || '#2a2a2e'), wH, true); }
    if (st.stelleOcchi) for (const sx of [-1, 1]) tuboP(B, loopP(t => { const k = Math.round(t / (Math.PI * 2) * 10), rr = (k % 2 ? .021 : .048) * sc, q = t + Math.PI / 2; return [sx * (ex + .003) + Math.cos(q) * rr, ey + .003 + Math.sin(q) * rr * .92]; }, 10), () => .0055, C3(st.stelleOcchi), wH, true);
    if (st.bolle) [...loops, ...(mouth ? [mouth] : [])].forEach(L => L.forEach((p, k) => { if (!(k % 2)) uovo(B, p, [0, 1, 0], .0068, .0068, .0068, C3(st.bolle), wH, { anelli: 2, seg: 5 }); }));
    if (st.ruche) loops.forEach(L => L.forEach(p => uovo(B, add(p, [0, 0, .002]), [0, 0, 1], .012, .012, .008, C3(st.ruche), wH, { anelli: 2, seg: 6 })));
    if (st.borchieOcchi) loops.forEach((L, i) => L.forEach((p, k) => { if (k % 3) return; const c0 = P(aOf(i ? ex : -ex, ey), ey, .003), d = norm(sub(p, c0)); cono(B, add(p, mul(d, .002)), d, .0035, .016, C3(st.borchieOcchi), wH); }));
    if (st.ricamo) for (const s of [-1, 1]) for (const dir of [1, -1]) { const x0 = s * ex, y1 = ey + dir * .023, pts = [P(aOf(x0, y1), y1, .003), P(aOf(x0 + s * .004, y1 + dir * .02), y1 + dir * .02, .003), P(aOf(x0 - s * .002, y1 + dir * .04), y1 + dir * .04, .003)]; tuboP(B, pts, () => .003, C3(st.bordo), wH);
      for (const k of [.012, .026]) for (const sd of [-1, 1]) { const yy = y1 + dir * k; tuboP(B, [P(aOf(x0, yy), yy, .003), P(aOf(x0 + sd * .008, yy + dir * .006), yy + dir * .006, .003)], () => .0022, C3(st.bordo), wH); } }
    // 4. le fantasie: cornice a punte, naso, guance, rete
    if (st.zigzag) for (let k = 0; k < 22; k++) { const t = k / 22 * Math.PI * 2, X = .088 * sc * Math.cos(t), Y = ey - .025 + .104 * sc * Math.sin(t), a = aOf(X, Y), p = P(a, Y, .003), n = Nrm(a, Y), d = norm(add(mul([Math.cos(t), Math.sin(t), 0], .7), mul(n, .5))); cono(B, p, d, .012, .026, C3(st.zigzag), wH, 4); }
    if (st.naso) { const p = P(0, ey - .036, .004), n = Nrm(0, ey - .036); cono(B, p, norm(add(n, [0, -.3, 0])), .016, .036, C3(st.naso), wH, 8); }
    if (st.guance || st.guancia) for (const s of st.guance ? [-1, 1] : [-1]) { const y = ey - .045, a = aOf(s * .058, y), p = P(a, y, .0035), n = Nrm(a, y), r = st.guance ? .013 : .019; uovo(B, p, n, r, r, .002, C3(st.guance || st.guancia), wH, { anelli: 2, seg: 10, f: [0, 1, 0] }); }
    if (st.rete) for (let k = -4; k <= 4; k++) { const ptsV = [], ptsH = []; for (let q = 0; q <= 10; q++) { const ya = faceY + (q / 10 - .5) * .17 * sc, X = k * .016 * sc; if (inHole(aOf(X, ya), ya)) ptsV.push(P(aOf(X, ya), ya, .004)); const Y = faceY + k * .018 * sc, xa = (q / 10 - .5) * .15 * sc; if (inHole(aOf(xa, Y), Y)) ptsH.push(P(aOf(xa, Y), Y, .004)); } if (ptsV.length > 1) tuboP(B, ptsV, () => .0012, [.9, .9, .88], wH); if (ptsH.length > 1) tuboP(B, ptsH, () => .0012, [.9, .9, .88], wH); }
    // 5. corna a fasce, orecchie a foglia, cresta, aculei, becco
    const corno = (pts, r0, bands, tip) => { const cu = curva(pts), nb = bands.length; for (let b = 0; b < nb; b++) { const t0 = b / nb, t1 = (b + 1) / nb, sm2 = []; for (let i = 0; i <= 6; i++) sm2.push(t0 + (t1 - t0) * i / 6); const cc = bands[b] ? C3(bands[b]) : col; tuboP(B, sm2.map(t => cu(t)), (k) => r0 * Math.pow(1 - sm2[k], .8) + .003, cc, wH, false, knit(cc)); } return cu; };
    const out = s => [s, 0, 0], up = [0, 1, 0], Hb = skTop - brow, ay = r => brow + r * Hb;
    if (st.corna) for (const s of [-1, 1]) {
      if (st.corna === 'diavolo') { const b0 = P(s * 1.05, ay(.62), -.004); corno([b0, add(b0, [s * .03, .035, 0]), add(b0, [s * .045, .08, .01]), add(b0, [s * .02, .125, .02])], .027, st.cc); }
      if (st.corna === 'lunghe') { const b0 = P(s * 1.15, ay(.58), -.004), d = norm([s * .62, .78, .05]), cu = corno([b0, add(b0, mul(d, .08)), add(b0, mul(d, .16)), add(add(b0, mul(d, .2)), [s * .02, .01, 0])], .032, [st.cc[0], st.cc[1], st.cc[1]]);
        const c0 = cu(.12); for (let k = 0; k < 9; k++) { const q = k / 9 * Math.PI * 2; uovo(B, add(c0, [Math.cos(q) * .036 * .3, Math.sin(q) * .036, Math.cos(q) * .036]), up, .011, .011, .011, C3(k % 2 ? st.cc[1] : st.cc[0]), wH, { anelli: 2, seg: 5 }); } }
      if (st.corna === 'giullare') { const b0 = P(s * 1.4, ay(.55), -.006), cu = corno([b0, add(b0, [s * .07, .05, 0]), add(b0, [s * .15, .03, 0]), add(b0, [s * .2, -.06, 0]), add(b0, [s * .21, -.17, .02])], .045, st.cc.length > 1 ? [st.cc[0], st.cc[1], st.cc[0], st.cc[1]] : [null]);
        const tp = cu(1); if (st.stelle) stella(B, add(tp, [0, -.025, 0]), .032, .014, C3(st.stelle), wH); else uovo(B, add(tp, [0, -.012, 0]), up, .016, .016, .016, C3('#f0e08a'), wH, { anelli: 3, seg: 6 }); }
      if (st.corna === 'grosse') { const b0 = P(s * 1.35, ay(.42), -.006), cu = corno([b0, add(b0, [s * .1, .02, 0]), add(b0, [s * .19, .07, 0]), add(b0, [s * .24, .16, 0])], .055, st.cc);
        if (st.pallini) for (let k = 0; k < 14; k++) { const t = .08 + k / 14 * .8, c0 = cu(t), q = k * 2.4, r = .055 * Math.pow(1 - t, .8) + .003; uovo(B, add(c0, [0, Math.cos(q) * r, Math.sin(q) * r]), up, .011, .011, .011, C3(st.pallini), wH, { anelli: 2, seg: 5 }); } } }
    if (st.pallini) for (let k = 0; k < 7; k++) uovo(B, P(-.9 + k * .3, ay(.78), .006), up, .011, .011, .011, C3(k % 2 ? st.pallini : '#f0e040'), wH, { anelli: 2, seg: 5 });
    if (st.orecchie) for (const s of [-1, 1]) { const coni = st.orecchie === 'coniglio', a = s * (coni ? .42 : .72), p = P(a, ay(coni ? .9 : .8), -.006), len = coni ? .16 : .065, wid = coni ? .034 : .042;
      const dir = norm([s * (coni ? .16 : .38), 1, coni ? -.22 : -.1]), fr = norm([Math.sin(a) * .4, 0, Math.cos(a)]);
      foglia(B, p, dir, fr, len, wid, coni ? .016 : .014, coni ? .01 : .006, !coni, col, C3(st.c2), wH); }
    if (st.cresta) for (let i = 0; i < 7; i++) { const t = i / 6, ang = .55 + t * 2.2, y = brow + Math.sin(ang) * Hb * .98, a = Math.cos(ang) > 0 ? 0 : Math.PI, p = P(a, y, 0), n = norm(sub(p, [cx, ey - .02, cz])), L = .045 + .03 * Math.sin(t * Math.PI);
      corno([add(p, mul(n, -.004)), add(add(p, mul(n, L * .55)), [0, 0, -L * .12]), add(add(p, mul(n, L)), [0, 0, -L * .3])], L * .3, [st.cresta[i % 2]]); }
    if (st.riccio) { const nS = 44, c0 = [cx, ey - .01, cz]; for (let i = 0; i < nS; i++) { const yy = 1 - (i + .5) / nS * 1.5, rr = Math.sqrt(Math.max(0, 1 - yy * yy)), th = i * 2.39996, dx = Math.cos(th) * rr, dz = Math.sin(th) * rr;
        if (yy < -.45 || (dz > .45 && yy < .45 && Math.abs(dx) < .75)) continue; const a = Math.atan2(dx, dz), y = yy > 0 ? ey + yy * (skTop - ey) : ey + yy * (ey - y0 - .03), p = P(a, y, 0), n = norm(sub(p, c0)), L = .055 + .035 * ((i * 37 % 11) / 11), sd = mul([-n[2], 0, n[0]], .12 * ((i % 3) - 1));
        corno([add(p, mul(n, -.004)), add(add(p, mul(n, L * .5)), mul(sd, L * .3)), add(add(p, mul(n, L)), mul(sd, L))], .017, [null]); }
      uovo(B, add(P(0, ey - .03, .004), [0, 0, .006]), up, .016, .016, .016, col, wH, { anelli: 3, seg: 6 }); }
    if (st.becco) { const p = P(0, ey - .05, -.004); corno([p, add(p, [0, -.035, .04]), add(p, [0, -.09, .05])], .028, [null]); }
    // 6. al collo: bordo, borchie, gorgiera a ruche col bordo arrotolato, frange coi pompon
    const wN = [['Neck', .6], ['Chest', .4]];
    // le spalle e i vestiti: niente scende sotto la loro superficie (mappa delle altezze dei vertici del corpo già costruiti)
    const HM = new Map(), cell = .015, hk = (x, z) => Math.round(x / cell) + ',' + Math.round(z / cell);
    for (let k = 0; k < B.n; k++) { const y = B.P[k * 3 + 1]; if (y > PK.chin - .01 || y < PK.chin - .35) continue; const x = B.P[k * 3] - cx, z = B.P[k * 3 + 2] - cz; if (Math.abs(x) > .4 || Math.abs(z) > .35) continue; const kk = hk(x, z); if (!(HM.get(kk) >= y)) HM.set(kk, y); }
    const floorAt = (x, z) => { let m = -9; for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) { const v = HM.get((Math.round(x / cell) + dx) + ',' + (Math.round(z / cell) + dz)); if (v !== undefined && v > m) m = v; } return m + .016; };
    const lift = p => { const f = floorAt(p[0] - cx, p[2] - cz); return p[1] < f ? [p[0], f, p[2]] : p; };
    if (st.collo) { const L = []; for (let k = 0; k < 24; k++) L.push(lift(P(k / 24 * Math.PI * 2, y0 + .008, .004))); tuboP(B, L, () => .008, C3(st.collo), wN, true); }
    if (st.borchie) for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 + .3, p = lift(P(a, y0 + .025, .004)), n = norm([Math.sin(a), -.15, Math.cos(a)]); cono(B, p, n, .007, .055, [.78, .78, .8], wN, 6); }
    if (st.gorgiera) st.gorgiera.forEach((gc, li) => { const na = 160, nr = 5, nf = 30 + li * 6, rin = rA(0, y0) + .003 + li * .006, w = .04 + li * .022, c0 = C3(gc), edge = []; let ringF = -9; for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2; for (const rr of [rin, rin + w * .5, rin + w]) ringF = Math.max(ringF, floorAt(Math.sin(a) * rr, Math.cos(a) * rr)); } const yc = Math.max(y0 + .012, ringF + .004) - li * .016;
      griglia(B, na, nr, (i, j) => { const a = i / na * Math.PI * 2, t = j / nr, f = Math.sin(a * nf + li), amp = Math.pow(t, 1.3), r = rin + w * t + .012 * amp * f, yy = yc - .03 * t * t + .016 * amp * Math.cos(a * nf + li) * .4 - .005 * amp * Math.abs(f); const q = lift([cx + Math.sin(a) * r, yy, cz + Math.cos(a) * r]); if (j === nr && i % 2 === 0 && i < na) edge.push(q); return q; }, c0, wN, true);
      tuboP(B, edge, () => .0045, mulc(c0, .85), wN, true); });
    if (st.frange) for (let k = 0; k < 22; k++) { const a = k / 22 * Math.PI * 2, p = P(a, y0 + .004, .006); if (floorAt(p[0] - cx, p[2] - cz) > p[1] - .065) continue; tuboP(B, [p, add(p, [0, -.05, 0])], () => .004, C3(st.frange), wN); uovo(B, add(p, [0, -.055, 0]), up, .012, .012, .012, C3(st.frange), wN, { anelli: 2, seg: 6 }); }
    // 7. la maschera antigas: il muso col filtro e le due lenti
    if (st.gas) { const p = P(0, ey - .055, .004), n = Nrm(0, ey - .055), dk = [.18, .19, .17];
      tuboP(B, [p, add(p, mul(n, .04))], k => k ? .022 : .032, dk, wH); tuboP(B, [add(p, mul(n, .04)), add(p, mul(norm(add(n, [0, -.6, 0])), .1))], () => .026, [.32, .34, .3], wH);
      for (const s of [-1, 1]) { const a = aOf(s * ex, ey), q = P(a, ey, .004), m = Nrm(a, ey); tuboP(B, [q, add(q, mul(m, .012))], () => .022, dk, wH); uovo(B, add(q, mul(m, .012)), m, .019, .019, .003, [.55, .62, .58], wH, { anelli: 2, seg: 10, f: [0, 1, 0] }); } }
  }
  // aiuti: un tubo lungo una polilinea (raggio per punto), una curva Catmull-Rom, un cono, una stella, una foglia (orecchie), una griglia a due facce
  function tuboP(B, pts, rFn, col, w, chiuso, mat, sg) {
    if (pts.length < 2) return; const r00 = rFn(0);   /* [personaggi] i fili sottili (cuciture, impunture) a 4 lati: da vicino non si vede la differenza */ const P2 = chiuso ? pts.concat([pts[0], pts[1]]) : pts, n = P2.length;
    loft(B, P2.map((p, k) => { const a = P2[Math.max(0, k - 1)], b = P2[Math.min(n - 1, k + 1)], r = rFn(chiuso ? k % pts.length : k); return { c: p, t: norm(sub(b, a)), f: Math.abs(norm(sub(b, a))[1]) > .9 ? [1, 0, 0] : [0, 1, 0], a: r, b: r, p: 2, col, ptile: mat ? mat.ptile : 0, col3: mat ? mat.col3 : null, mv: k * .01, w }; }).slice(0, chiuso ? pts.length + 1 : n), { seg: sg || (r00 < .0026 ? 4 : 6) });
  }
  function curva(pts) { const n = pts.length - 1; return t => { const f = cl(t, 0, 1) * n, i = Math.min(n - 1, Math.floor(f)), u = f - i, p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n, i + 2)];
    return [0, 1, 2].map(k => .5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * u + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * u * u + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * u * u * u)); }; }
  function cono(B, base, dir, r, len, col, w, seg) { loft(B, [0, .5, 1].map(q => ({ c: add(base, mul(dir, q * len)), t: dir, f: Math.abs(dir[1]) > .9 ? [1, 0, 0] : [0, 1, 0], a: r * (1 - q) + .0005, b: r * (1 - q) + .0005, p: 2, col, w })), { seg: seg || 6 }); }
  function stella(B, c, R, r, col, w) { for (let k = 0; k < 5; k++) { const q = -Math.PI / 2 + k * Math.PI * 2 / 5, d = [Math.cos(q), Math.sin(q), 0]; cono(B, add(c, mul(d, r * .4)), d, r * .7, R - r * .4, col, w, 4); } uovo(B, c, [0, 0, 1], r * .9, r * .9, r * .6, col, w, { anelli: 2, seg: 8 }); }
  function griglia(B, na, nr, pos, col, w, dueLati, pt) {
    for (const side of dueLati === -1 ? [-1] : dueLati ? [1, -1] : [1]) { const v0 = B.n, i0 = B.I.length;   // dueLati -1: solo il rovescio
      for (let j = 0; j <= nr; j++) for (let i = 0; i <= na; i++) B.v(pos(i, j), col, ZERO, mulc(col, .7), [0, 0, 0], [i * .01, j * .01, pt === undefined ? PT.maglia : pt], w);
      for (let j = 0; j < nr; j++) for (let i = 0; i < na; i++) { const q = v0 + j * (na + 1) + i, r2 = q + na + 1; if (side > 0) B.I.push(q, r2, q + 1, q + 1, r2, r2 + 1); else B.I.push(q, q + 1, r2, q + 1, r2 + 1, r2); }
      B.chiudi(v0, i0, null); }
  }
  function foglia(B, base, dir, front, len, wid, th, cup, tri, cOut, cIn, w) {   // l'orecchio di maglia: una foglia con lo spessore, incavata davanti, il dentro di un altro colore
    const side = norm(cross(dir, front)), fr = norm(cross(side, dir)), W = t => tri ? wid * (1 - t) * Math.min(1, t / .12 + .55) : wid * Math.pow(Math.sin(Math.PI * (.12 + .88 * t)), .6) * (.7 + .3 * t), nu = 8, nt = 10;
    const at2 = (u, t, sd, lift, um) => { const ww = W(t), bul = Math.sqrt(Math.max(0, 1 - u * u)), z = sd * th / 2 * bul * (1 - .5 * t) - cup * (1 - u * u) * Math.sin(Math.PI * t) + (lift || 0); return add(add(add(base, mul(dir, t * len)), mul(side, u * ww * (um || 1))), mul(fr, z)); };
    griglia(B, nu, nt, (i, j) => at2(i / nu * 2 - 1, j / nt, 1), cOut, w, true);
    griglia(B, nu, nt, (i, j) => at2(i / nu * 2 - 1, j / nt, -1), cOut, w, true);
    griglia(B, nu, nt, (i, j) => at2((i / nu * 2 - 1), .1 + .76 * j / nt, 1, .0018, .62), cIn, w, true);
  }
  // ---------------- I CAPPELLI ----------------
  function cappello(B, at0, K, D, front0, wid0, wH, pa0) {
    const dy = pa0.PK && pa0.PK.ey ? pa0.PK.ey - .093 : 0, at = (y, x, z) => at0(y + dy, x, z), pa = (y, k) => pa0(y + dy, k), front = y => front0(y + dy), wid = y => wid0(y + dy);
    const H = D.cappello, c = C3(H.col || '#2a2a2e'), sc = mulc(c, .7), tipo = H.tipo, top = .2;
    const tesa = (y, r0, r1, rf, col, dz) => loft(B, [[r0 * .9, 0], [r0, .003], [r1, .0], [r1, -.006], [r0 * .95, -.006]].map(([r, dy]) => ({ c: at(y + dy, 0, (dz || 0) - .012), t: [0, 1, 0], f: [0, 0, 1], a: r * K, b: r * K * (rf || 1.06), col, w: wH })), { seg: 14 });
    // [personaggi] la cupola si allarga dove la testa misurata (fronte, nuca, tempie) uscirebbe: niente fronte che buca il cappello
    const PKt = pa0.PK && pa0.PK.length > 4 ? pa0.PK[pa0.PK.length - 1][0] - dy : -9;
    const fit = (yy, a, b, cz) => { if (yy > PKt - .004 || yy < .125) return [a, b];   // solo sopra le sopracciglia: il viso resta scoperto (fazzoletto, coppola)
      const fr = front(yy), bk = pa(yy, 3) - pa(yy, 2); return [Math.max(a, Math.min(pa(yy, 1) + .006, a * 1.2)), Math.max(b, fr - cz + .007, cz - bk + .006)]; };
    const cupola = (y0, rows, col, fz, tile, c2, pt, c3) => loft(B, rows.map(([y, a0, b0], j) => { const [a, b] = fit(y0 + y, a0, b0, (fz || 0) - .012); return { c: at(y0 + y, 0, (fz || 0) - .012), t: [0, 1, 0], f: [0, 0, 1], a: a * K, b: b * K, col, v: j / (rows.length - 1), tile: tile || 0, col2: c2, ptile: pt || 0, col3: c3, mv: j * .05, w: wH }; }), { seg: 12 });
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
    } else if (tipo === 'cappellino' || tipo === 'cappellino_indietro' || tipo === 'snapback') {   // il cappellino: sei spicchi cuciti, davanti strutturato e alto, dietro sulla nuca; visiera curva (o piatta e larga), il sotto scuro, l'impuntura
      const dz = tipo === 'cappellino_indietro' ? -1 : 1, flat = tipo === 'snapback', y0 = .128, Hc = flat ? .104 : .097;
      const crown = (a, t) => { const fr = Math.max(0, Math.cos(a) * dz), rb = (pa(y0, 1) * Math.abs(Math.sin(a)) + pa(y0, 2) * Math.abs(Math.cos(a))) * .95 + .006, rr = rb * Math.pow(Math.cos(t * Math.PI / 2), flat ? .6 : .75) * (1 + (flat ? .06 : .04) * fr * Math.sin(Math.PI * t)), yb = -.004 - .03 * Math.pow(Math.max(0, -Math.cos(a) * dz), 1.5);
        return at(y0 + yb + (Hc - yb) * Math.pow(Math.sin(t * Math.PI / 2), flat ? .7 : .85), Math.sin(a) * rr, Math.cos(a) * rr * 1.04 + pa(y0, 3) + .004 * fr); };
      griglia(B, 24, 7, (i, j) => crown(-Math.PI + i / 24 * Math.PI * 2, j / 7), c, wH, -1, 0);   // [personaggi] una faccia sola (dentro non si vede): era 36×9 sui due lati
      for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + Math.PI / 6, L = []; for (let j = 0; j <= 4; j++) L.push(crown(a, j / 4 * .98)); tuboP(B, L, () => .0016, sc, wH); }   // le cuciture degli spicchi
      { const L = []; for (let i = 0; i < 20; i++) L.push(crown(-Math.PI + i / 20 * Math.PI * 2, 0)); tuboP(B, L, () => .0024, sc, wH, true); }
      uovo(B, crown(0, 1), [0, 1, 0], .009 * K, .009 * K, .005 * K, mulc(c, .85), wH, { anelli: 2, seg: 8 });   // il bottone
      // la visiera a D
      const VL = (flat ? .1 : .088) * K, VA = flat ? 1.05 : .95, vpt = (u, w, d) => { const a0 = -VA + u * 2 * VA, a = dz > 0 ? a0 : Math.PI + a0, base = crown(a, 0), out = norm([Math.sin(a), 0, Math.cos(a) * 1.04]), len = VL * Math.pow(Math.max(0, Math.cos(a0 / VA * Math.PI / 2)), .55) * w, side = Math.abs(a0) / VA;
        return [base[0] + out[0] * len, base[1] + (flat ? -.004 * w : -.012 * w * w - .03 * side * side * w) - d, base[2] + out[2] * len + .002 * dz]; };
      griglia(B, 12, 3, (i, j) => vpt(i / 12, j / 3, 0), mulc(c, .95), wH, false, 0); griglia(B, 12, 3, (i, j) => vpt(i / 12, j / 3, .006), flat ? C3('#2a3a2a') : mulc(c, .45), wH, true, 0);   // sopra una faccia, sotto due (si vede da sotto e chiude il bordo)
      { const L = []; for (let i = 0; i <= 12; i++) L.push(vpt(i / 12, 1, .003)); tuboP(B, L, () => .003, mulc(c, .9), wH, false, null, 4); }
      { const L = []; for (let i = 0; i <= 5; i++) { const a = (dz > 0 ? Math.PI : 0) - .32 + i / 5 * .64, p = crown(a, 0); L.push([p[0], p[1] + .028 * Math.sin(i / 5 * Math.PI), p[2]]); } tuboP(B, L, () => .003, C3('#1a1a1c'), wH, false, null, 4); }   // dietro: la regolazione
      if (flat) { const q = crown(0, .45); uovo(B, [q[0], q[1], q[2] + .003], [0, 0, 1], .028, .014, .002, C3(H.col2 || (/^#[0-3]/.test(H.col || '') ? '#e8e4dc' : '#1a1a1c')), wH, { anelli: 2, seg: 4, p: 6, f: [0, 1, 0] }); const v = vpt(.5, .6, -.0006); uovo(B, v, [0, 1, 0], .011, .011, .001, C3('#d8c050'), wH, { anelli: 2, seg: 10 }); }   // il ricamo davanti e il bollino d'oro sulla visiera
    } else if (tipo === 'docker') {   // il berretto corto da pescatore: alto sopra le orecchie, il risvolto largo a costine, l'etichetta
      const rr = y => [pa(Math.min(y, .17), 1) + .008, pa(Math.min(y, .17), 2) + .008];
      loft(B, [[.1, 1], [.12, 1], [.175, .98], [.215, .84], [.24, .45], [.25, .08], [.2505, .02]].map(([y, q]) => ({ c: at(y, 0, pa(Math.min(y, .2), 3)), t: [0, 1, 0], f: [0, 0, 1], a: rr(y)[0] * q * K, b: rr(y)[1] * q * K, col: c, ptile: PT.righine, col3: mulc(c, .82), mv: y, w: wH })), { seg: 16 });
      loft(B, [.096, .11, .126, .134].map((y, j) => ({ c: at(y, 0, pa(y, 3)), t: [0, 1, 0], f: [0, 0, 1], a: (rr(y)[0] + .012 * (j === 1 || j === 2 ? 1 : .6)) * K, b: (rr(y)[1] + .012 * (j === 1 || j === 2 ? 1 : .6)) * K, col: mulc(c, .9), ptile: PT.righine, col3: mulc(c, .72), w: wH })), { seg: 16 });
      uovo(B, at(.113, 0, pa(.113, 3) + rr(.113)[1] + .014), [0, 0, 1], .015 * K, .008 * K, .002, C3('#e8e4dc'), wH, { anelli: 2, seg: 4, p: 6, f: [0, 1, 0] });
    } else if (tipo === 'colbacco') {   // il colbacco: cupola di pelle, fascia di pelo, i paraorecchie che scendono ai lati coi lacci, la falda davanti alzata, il pelo dietro sulla nuca
      const pelo = { ptile: PT.maglia, col3: mulc(c, .7) }, pel = mixc(c, [.62, .5, .38], .35), rr = y => [pa(Math.min(Math.max(y, .02), .2), 1) + .01, pa(Math.min(Math.max(y, .02), .2), 2) + .01];
      loft(B, [[.13, 1], [.16, .99], [.195, .88], [.225, .55], [.238, .08], [.2385, .02]].map(([y, q]) => ({ c: at(y, 0, pa(Math.min(y, .2), 3)), t: [0, 1, 0], f: [0, 0, 1], a: rr(y)[0] * q * K + .006, b: rr(y)[1] * q * K + .006, col: mulc(c, .82), w: wH })), { seg: 16 });
      loft(B, [.125, .136, .155, .17].map((y, j) => ({ c: at(y, 0, pa(y, 3)), t: [0, 1, 0], f: [0, 0, 1], a: (rr(y)[0] + .022 * (j && j < 3 ? 1 : .7)) * K, b: (rr(y)[1] + .022 * (j && j < 3 ? 1 : .7)) * K, col: pel, ptile: PT.maglia, col3: mulc(pel, .75), mv: y * 2, w: wH })), { seg: 18 });
      const pann = (aC, aW, yT, yB, out, jFn) => { griglia(B, 8, 5, (i, j) => { const a = aC - aW / 2 + i / 8 * aW, y = lerp(yT, yB, j / 5), rk = rr(y), r0 = Math.hypot(Math.sin(a) * rk[0], Math.cos(a) * rk[1]) + out + .004 * Math.sin(i / 8 * Math.PI); return at(y, Math.sin(a) * r0 / Math.max(rk[0], 1e-3) * rk[0] / Math.max(Math.hypot(Math.sin(a), Math.cos(a)), 1e-3), Math.cos(a) * r0 + pa(Math.min(Math.max(y, .02), .2), 3)); }, pel, jFn ? [['Head', 1]] : wH, true); };
      for (const sx of [-1, 1]) loft(B, [.135, .1, .06, .02, -.005, -.012].map((y, j, A) => ({ c: at(y, sx * (pa(Math.max(y, .02), 1) + .022), pa(Math.max(y, .02), 3) - .008), t: [0, -1, 0], f: [sx, 0, 0], a: (j === A.length - 1 ? .02 : .05) * K, b: (j === A.length - 1 ? .006 : .013) * K, p: 2.6, col: pel, ptile: PT.maglia, col3: mulc(pel, .75), mv: y * 2, w: wH })), { seg: 12 });   // i paraorecchie: pannelli di pelo spessi ai lati
      pann(Math.PI, 1.6, .135, .05, .02);   // il pelo dietro sulla nuca
      griglia(B, 10, 3, (i, j) => { const a = -.8 + i / 10 * 1.6, y = .16 + j / 3 * .045, rk = rr(.16); return at(y, Math.sin(a) * (rk[0] + .03), Math.cos(a) * (rk[1] + .03 + j * .008) + pa(.15, 3)); }, pel, wH, true);   // la falda davanti alzata
      for (const sx of [-1, 1]) tuboP(B, [at(-.005, sx * (rr(.05)[0] + .02), pa(.05, 3)), at(-.05, sx * (rr(.05)[0] + .015), pa(.05, 3) + .01)], () => .003, mulc(c, .5), wH);   // i lacci
    } else if (tipo === 'basco') {   // il basco: un disco morbido, calato di lato, col picciolo
      loft(B, [[0, .102, .11], [.012, .118, .124], [.03, .12, .126], [.045, .1, .106], [.052, .02, .02]].map(([y, a0, b0]) => fit(.155 + y, a0, b0, -.02)).map((ab, j) => [[0, .012, .03, .045, .052][j], ...ab]).map(([y, a, b]) => ({ c: at(.155 + y - (a > .11 ? .006 : 0), .012, -.008), t: norm([.18, 1, 0]), f: [0, 0, 1], a: a * K, b: b * K, col: c, w: wH })), { seg: 16 });
      uovo(B, at(.214, .022, -.008), [0, 1, 0], .004 * K, .004 * K, .008 * K, sc, wH, { anelli: 2, seg: 5 });
    } else if (tipo === 'fascia') { cupola(.145, [[0, .095, .108], [.028, .094, .107]].map(([y, a, b]) => [y, a + .016, b + .016]), c, .0); }
    else if (tipo === 'bandana') { const ey = .108; loft(B, [ey - .03, ey - .065, ey - .1, ey - .13].map((y, j) => ({ c: at(y, 0, -.012), t: [0, 1, 0], f: [0, 0, 1], a: (pa(Math.max(y, -.01), 1) + .008) * K, b: (pa(Math.max(y, -.01), 2) + .01 + j * .003) * K, fz: pa(Math.max(y, -.01), 3) * K, col: c, ptile: PT.pois, col3: [.95, .93, .88], mv: j * .04, w: wH })), { seg: 16 }); }
    else if (/^passamontagna|^maschera_gas|^cappuccio_stelle/.test(tipo)) { if (pa.PK && pa.PK.tris) passamontagna(B, D, pa.PK); 
    } else if (tipo === 'durag') {   // [personaggi] il durag: la calotta di raso che segue la testa, la cucitura in mezzo, il nodo davanti, le due code dietro
      const R2 = y => [pa(Math.min(y, .2), 1) + .006, pa(Math.min(y, .2), 2) + .006];
      loft(B, [[.105, 1], [.13, 1], [.17, 1], [.2, .96], [.225, .8], [.24, .5], [.247, .05]].map(([y, q]) => ({ c: at(y, 0, pa(Math.min(y, .2), 3)), t: [0, 1, 0], f: [0, 0, 1], a: R2(y)[0] * q * K, b: R2(y)[1] * q * K, col: c, w: wH })), { seg: 16 });
      { const L = []; for (let i = 0; i < 20; i++) { const a = -Math.PI + i / 20 * Math.PI * 2, r2 = R2(.11); L.push(at(.11, Math.sin(a) * r2[0] * 1.03, Math.cos(a) * r2[1] * 1.03 + pa(.11, 3))); } tuboP(B, L, () => .005, mulc(c, .85), wH, true); }
      uovo(B, at(.122, 0, front(.122) + .012), [0, 0, 1], .016 * K, .011 * K, .008 * K, mulc(c, .85), wH, { anelli: 3, seg: 6 });
      [-1, 1].forEach(s => { const bz = pa(.11, 3) - R2(.11)[1] - .004; loft(B, [[.11, 0], [.04, .01], [-.03, .016], [-.1, .02]].map(([y, dx], j) => ({ c: at(y, s * (.022 + dx), bz - .006 * j), t: [0, -1, 0], f: [0, 0, -1], a: .022 * K * (1 - j * .1), b: .003 * K, p: 3, col: j ? mulc(c, .92) : c, w: wH })), { seg: 6 }); });
    } else if (tipo === 'visiera') {   // la visiera da tennis: la fascia e la tesa, niente cupola
      const R2 = y => [pa(y, 1) + .008, pa(y, 2) + .008];
      loft(B, [.125, .145, .16].map(y => ({ c: at(y, 0, pa(y, 3)), t: [0, 1, 0], f: [0, 0, 1], a: R2(y)[0] * K, b: R2(y)[1] * K, col: c, w: wH })), { seg: 16, dentro: 0 });
      loft(B, [[.0, .07], [.5, .085], [1, .07]].map(([q, a]) => ({ c: at(.13 - q * .012, 0, front(.135) + .006 + q * .06), t: [0, 0, 1], f: [0, 1, .25], a: a * K, b: .005 * K, p: 2.6, col: C3(H.col2 || '#f0ece2'), w: wH })), { seg: 8 });
    } else if (tipo === 'bucket') {   // il cappello da pescatora: la cupola morbida e la tesa che scende tutt'intorno, l'impuntura a giri
      const R = y => [pa(Math.min(y, .17), 1) + .008, pa(Math.min(y, .17), 2) + .008];
      loft(B, [[.094, 1.36, -.03], [.106, 1.31, -.018], [.117, 1.13, -.004], [.127, 1.02, 0], [.135, 1, 0], [.172, .98, 0], [.2, .86, 0], [.214, .4, 0], [.218, .02, 0]].map(([y, q, d], j) => ({ c: at(y, 0, pa(Math.min(y, .17), 3)), t: [0, 1, 0], f: [0, 0, 1], a: R(y)[0] * q * K, b: R(y)[1] * q * K, col: j < 3 ? mulc(c, .92) : c, ptile: j < 3 ? PT.righine : 0, col3: mulc(c, .8), mv: j * .03, w: wH })), { seg: 18 });
      loft(B, [[.094, 1.36], [.106, 1.31]].map(([y, q]) => ({ c: at(y - .004, 0, pa(.17, 3)), t: [0, 1, 0], f: [0, 0, 1], a: R(.17)[0] * q * K - .003, b: R(.17)[1] * q * K - .003, col: mulc(c, .6), w: wH })), { seg: 18 });   // il sotto della tesa
      { const L = []; for (let i = 0; i < 24; i++) { const a = -Math.PI + i / 24 * Math.PI * 2; L.push(at(.138, Math.sin(a) * R(.138)[0] * 1.01, Math.cos(a) * R(.138)[1] * 1.01 + pa(.138, 3))); } tuboP(B, L, () => .0025, mulc(c, .75), wH, true); }
    } else if (tipo === 'elmetto') {   // l'elmetto: la calotta, la tesa che scende tutt'intorno, il sottogola
      const R = y => [pa(Math.min(y, .17), 1) + .014, pa(Math.min(y, .17), 2) + .014];
      loft(B, [[.105, 1.18, -.008], [.11, 1.17, 0], [.118, 1.0, 0], [.17, .98, 0], [.215, .78, 0], [.24, .42, 0], [.248, .04, 0]].map(([y, q, d], j) => ({ c: at(y + d, 0, pa(Math.min(y, .17), 3)), t: [0, 1, 0], f: [0, 0, 1], a: R(y)[0] * q * K, b: R(y)[1] * q * K, col: j < 2 ? mulc(c, .82) : c, w: wH })), { seg: 18 });
      for (const sx of [-1, 1]) tuboP(B, [at(.11, sx * (R(.11)[0] + .002), pa(.1, 3)), at(.02, sx * (pa(.02, 1) + .004), pa(.02, 3) + .01), at(-.03, sx * .02, pa(-.03, 3) + pa(-.03, 2) * .6)], () => .003, mulc(c, .45), wH);
    } else if (tipo === 'casco') {   // il casco jet anni 80: calotta lucida aperta davanti, la riga in mezzo, il bordo imbottito, il cinturino
      const R = y => [pa(Math.min(y, .17), 1) + .02, pa(Math.min(y, .17), 2) + .02], cut = (th, y) => { const fr = Math.cos(th); return y < .13 && fr > .35 ? -.9 * sm((fr - .35) / .2) : 0; };
      loft(B, [[.0, .96], [.04, 1], [.1, 1.02], [.15, 1], [.2, .88], [.24, .58], [.258, .12], [.259, .02]].map(([y, q], j) => ({ c: at(y, 0, pa(Math.max(Math.min(y, .17), .02), 3)), t: [0, 1, 0], f: [0, 0, 1], a: R(Math.max(y, .02))[0] * q * K, b: R(Math.max(y, .02))[1] * q * K, col: c, colFn: th => Math.abs(Math.sin(th)) < .09 && Math.cos(th) > -.2 ? C3(H.col2 || '#f0ece2') : c, w: wH, mod: th => cut(th, y) })), { seg: 22 });
      { const L = []; for (let i = 0; i < 26; i++) { const a = -Math.PI + i / 26 * Math.PI * 2, fr = Math.cos(a), y = fr > .35 ? .13 : .0, rk = R(Math.max(y, .02)), ex = fr > .35 ? .9 : 1; L.push(at(y, Math.sin(a) * rk[0] * ex, Math.cos(a) * rk[1] * ex + pa(Math.max(y, .02), 3))); } tuboP(B, L, () => .007, C3('#1a1a1c'), wH, true); }
      for (const sx of [-1, 1]) tuboP(B, [at(.02, sx * R(.02)[0], pa(.02, 3)), at(-.035, sx * .025, pa(-.03, 3) + pa(-.03, 2) * .5)], () => .003, C3('#1a1a1c'), wH);
    } else if (tipo === 'fazzoletto') {   // il fazzoletto delle anziane: annodato sotto il mento, la punta dietro
      const fp = PT.fiori, f3 = C3(H.col2 || '#f0e0b0');
      cupola(.0, [[.03, .1, .11], [.13, .104, .116], [.19, .09, .1], [.23, .06, .07], [.25, .01, .01]].map(r => r), c, -.008, 0, null, fp, f3);
      loft(B, [[.14, .1, .112], [.06, .102, .11], [-.02, .08, .06], [-.055, .035, .025]].map(([y, a, b]) => ({ c: at(y, 0, -.012), t: [0, -1, 0], f: [0, 0, 1], a: a * K, b: b * K, col: c, ptile: fp, col3: f3, mv: y, w: wH, mod: th => { const fr = Math.cos(th); return fr > .3 ? -.95 * sm((fr - .3) / .2) : 0; } })), { seg: 16 });
      uovo(B, at(.05, 0, -.13), [0, -1, -.6], .03 * K, .01 * K, .06 * K, sc, wH, { anelli: 3, seg: 6, punta: .6 });
      uovo(B, at(-.05, 0, front(-.04) - .028), [0, -1, .3], .022 * K, .016 * K, .02 * K, sc, wH, { anelli: 3, seg: 7 }); [1, -1].forEach(q => uovo(B, at(-.07, q * .014, front(-.04) - .028), [q * .3, -1, .2], .012 * K, .006 * K, .03 * K, c, wH, { anelli: 3, seg: 5 }));   // il nodo sotto il mento
    }
  }
  // ---------------- GONNE, FALDE DEI CAPPOTTI, VESTITI: pendono dal bacino e seguono le cosce ----------------
  function gonna(B, J, K, profAt, zAt, g, v, tile, ptile, falda, LB, opz) {
    opz = opz || {}; const yOf0 = J.UpperLegL[1] - .07, tLen0 = J.Neck[1] + .045 - yOf0;   // la quota del busto (come corpoDi), per lo spessore dei capi sotto
    const yTop = lerp(J.UpperLegL[1] - .07, J.Neck[1] + .045, g[0]) + (falda ? 0 : 0), yKnee = J.LowerLegL[1], yBot = lerp(J.UpperLegL[1], J.FootL[1] + .03, g[1]), fl = g[2] || 1.2, n = 7, rings = [];
    let sp = .008 + (opz.sopra || 0) + (opz.arco && LB ? (LB.some(L => L.forma) ? .02 : 0) + Math.max(0, ...LB.map(L => L.orlo ? (L.orloSp || .006) : 0)) : 0); if (LB)   // [personaggi] le forme dei capi (sbuffi, capi dritti) stanno sotto
     for (let q = -.05; q <= .4; q += .05) sp = Math.max(sp, strati(LB, q).sp + .008 + (opz.sopra || 0));   // sopra tutto quello che sta sotto in vita
    const legX = Math.abs(J.UpperLegL[0]), spTop = LB ? Math.min(sp, strati(LB, (yTop - yOf0) / tLen0).sp + .006 + (opz.sopra || 0)) : sp;
    for (let j = 0; j <= n; j++) {
      const q = j / n, y = lerp(yTop, yBot, q), P0 = profAt(Math.max(y, J.UpperLegL[1] - .06));
      const spq = LB && opz.arco ? strati(LB, (y - yOf0) / tLen0).sp + .012 : 0, baseA = Math.max(P0[0] + .015 + spq, legX - .022 + K.gamba * 1.08 + .035), baseB = Math.max(P0[1] + .015 + spq, K.gamba + (opz.arco ? .06 : g[1] > .4 ? .095 : .085));   // mai dentro quello che sta sotto a quell'altezza   // il grembiule sta sulle cosce, non staccato davanti
      const qh = cl((yTop - y) / Math.max(.05, yTop - (J.UpperLegL[1] - (falda ? .2 : .1))), 0, 1),   /* [personaggi] dal fianco alla coscia senza scalino */ k = lerp(1, fl, Math.pow(q, 1.3)), spL = lerp(spTop, sp, sm(qh * 2.5)), a = lerp(P0[0] + spL + .006 * (falda ? 1.5 : 1), baseA * k, sm(qh)), b = lerp(P0[1] + spL + .006 * (falda ? 1.5 : 1), baseB * k, sm(qh));   // [personaggi] in vita lo spessore di lì, non il massimo dei fianchi: niente scalino
      rings.push({ c: [0, y, zAt(Math.max(y, J.Hips[1] - .05)) - .005], t: [0, -1, 0], f: [0, 0, 1], a, b, fz: q > .3 && !falda ? .01 : P0[2] * (1 - sm(q * 2)) - (falda ? .012 * sm(q * 2) : 0), col: C3v(v.col), col2: v.col2 ? C3v(v.col2) : mulc(C3v(v.col), .6), col3: v.col3 ? C3v(v.col3) : mulc(C3v(v.col), .55), v: q, mv: q * (yTop - yBot), ao: lerp(1, .92, q), tile: falda || opz.arco ? tile : TL.abito * 0, ptile,
        mod: th => { const fr = Math.cos(th); let d = Math.sin(th * (falda ? 6 : 9)) * (opz.arco ? .008 : .035) * sm(q * 1.4); return d; } });
    }
    { const r0 = rings[0], P1 = profAt(yTop + .04); rings.unshift(Object.assign({}, r0, { c: [r0.c[0], yTop + .04, zAt(yTop + .04) - .005], a: P1[0] - .002, b: P1[1] - .002, fz: P1[2], mod: null, ao: .8 })); }   // l'attacco: dentro il busto, così dall'alto non si vede il vuoto
    // l'orlo: si gira dentro con lo spessore
    const last = rings[rings.length - 1]; rings.push(Object.assign({}, last, { c: add(last.c, [0, .012, 0]), a: last.a - .008, b: last.b - .008, ao: .55 }));
    const wfn = (p, r, th) => { const q = cl((yTop - p[1]) / (yTop - yBot), 0, 1), lw = sm(q * 1.6) * .92, sx = cl(p[0] / (legX * 1.1), -1, 1); const wl = lw * (.5 + .5 * sx), wr = lw * (.5 - .5 * sx); const w = [['Hips', 1 - lw]]; if (wl > .001) w.push(['UpperLegL', wl]); if (wr > .001) w.push(['UpperLegR', wr]); return w; };
    loft(B, rings, { seg: opz.arco ? 12 : 20, wfn, arco: opz.arco });
  }
  const C3v = c => Array.isArray(c) ? c : C3(c);
  // ---------------- IL GREMBIULE DA BOTTEGA: davanti, dal petto alle ginocchia, coi lacci ----------------
  function grembiule(B, J, K, profAt, zAt, yOf, v, LB) {
    const col = C3v(v.col), yW = yOf(.34), P0 = profAt(yW), sp = strati(LB, .34).sp;
    gonna(B, J, K, profAt, zAt, [.34, v.grembiule && v.grembiule[2] || .55, .96], Object.assign({}, v, { col2: mulc(col, .85), col3: mulc(col, .6) }), TL.grembiule, 0, false, LB, { arco: 1.2, sopra: .008 });
    loft(B, [0, 1].map(q => ({ c: [0, yW - .012 + q * .024, zAt(yW)], t: [0, 1, 0], f: [0, 0, 1], a: P0[0] + sp + .014, b: P0[1] + sp + .014, fz: P0[2], col: mulc(col, .92), w: [['Abdomen', .4], ['Hips', .6]] })), { seg: 16 });   // il laccio in vita
    uovo(B, [0, yW, zAt(yW) - P0[1] - sp - .016], [0, 0, -1], .02, .012, .012, mulc(col, .9), [['Hips', 1]], { anelli: 2, seg: 6 });   // il nodo dietro
  }
  // ---------------- LO SCIALLE DELLE ANZIANE: sulle spalle, a punta dietro, annodato davanti ----------------
  function scialle(B, J, profAt, zAt, yOf, v, LB) {
    const col = C3v(v.col), y0 = yOf(.99), y1 = yOf(.5), n = 6, rings = [];
    for (let j = 0; j <= n; j++) {
      const q = j / n, y = lerp(y0, y1, q), P0 = profAt(y), tq = lerp(.99, .5, q), sotto = LB ? strati(LB.filter(L => L !== v), tq).sp : 0, extra = .024 + q * .012 + sotto;   // [personaggi] sopra i capi che ha sotto, non sul corpo nudo
      rings.push({ c: [0, y, zAt(y) + P0[2]], t: [0, -1, 0], f: [0, 0, 1], a: P0[0] + extra + (q > .2 ? .015 * sm((q - .2) / .3) : 0), b: P0[1] + extra, col, col2: mulc(col, .8), col3: mulc(col, .6), ptile: PT.maglia, mv: q * .4, ao: lerp(1, .9, q),
        mod: th => { const fr = Math.cos(th); const punta = fr < 0 ? 0 : 0; return (fr > .45 ? -.5 * sm((fr - .45) / .3) * sm((q - .15) / .2) : 0) + .012 * Math.sin(th * 8) * q + punta; } });
    }
    // la punta dietro scende più in basso
    const last = rings[n]; rings.push(Object.assign({}, last, { c: add(last.c, [0, -.08, -.02]), a: last.a * .4, b: last.b * .5, fz: (last.fz || 0) - last.b * .5, mod: null }));
    loft(B, rings, { seg: 18, wfn: p => { const sx = Math.abs(p[0]); const k = sm((sx - .1) / .12); const w = [['Chest', 1 - k * .5]]; if (k > 0) w.push(['Shoulder' + (p[0] > 0 ? 'L' : 'R'), k * .3], ['UpperArm' + (p[0] > 0 ? 'L' : 'R'), k * .2]); return w; } });
    uovo(B, [0, yOf(.83), zAt(yOf(.83)) + profAt(yOf(.83))[1] + profAt(yOf(.83))[2] + .03], [0, -1, .3], .03, .025, .035, mulc(col, .9), [['Chest', 1]], { anelli: 3, seg: 7 });   // il nodo
  }
  // ---------------- COLLETTI: della camicia, i revers della giacca, il collo alto della divisa, il cappuccio della felpa ----------------
  function colletto(B, J, profAt, zAt, yOf, v, listaB) {
    const col = C3v(v.col), y = yOf(.965), P0 = profAt(y), sp = strati(listaB, .96).sp, wN = [['Chest', .4], ['Neck', .6]], z = zAt(y) + P0[2];
    if (v.colletto === 'camicia' || v.colletto === 'revers' || v.colletto === 'alto' || v.colletto === 'punte') {
      const alto = v.colletto === 'alto', rev = v.colletto === 'revers', r0 = alto ? .068 : .066;
      loft(B, [0, 1].map(q => ({ c: [0, y + .005 + q * (alto ? .05 : .03), z - .005], t: [0, 1, 0], f: [0, 0, 1], a: r0 + .012 * (1 - q) + sp * .5, b: r0 - .005 + .012 * (1 - q) + sp * .5, col: q ? mulc(col, 1.05) : col, w: wN, mod: alto ? null : th => { const fr = Math.cos(th); return fr > .8 ? -.5 * sm((fr - .8) / .2) : 0; } })), { seg: 16 });
      // le punte del colletto (o i revers) sul petto
      [1, -1].forEach(s => {
        const pun = v.colletto === 'punte', L = rev ? .14 : pun ? .09 : .05, wd = rev ? .045 : pun ? .03 : .022, a0 = [s * .035, y + .02, z + P0[1] + sp - .006], a1 = [s * (rev ? .075 : pun ? .07 : .045), y - L, z + P0[1] + sp + (rev ? -.004 : -.01)];
        loft(B, [0, .6, 1].map(q => ({ c: lerp3(a0, a1, q), t: norm(sub(a1, a0)), f: [0, 0, 1], a: wd * (q < .6 ? 1 : 1 - (q - .6) / .4 * .9), b: .004, p: 8, col: rev ? mulc(col, .9) : col, w: q < .5 ? wN : [['Chest', 1]] })), { seg: 4 });
      });
    } else if (v.colletto === 'giro') {
      loft(B, [0, 1].map(q => ({ c: [0, y + q * .025, z - .004], t: [0, 1, 0], f: [0, 0, 1], a: .07 + sp * .5 + .006, b: .064 + sp * .5 + .006, col: mulc(col, q ? .9 : 1), ptile: PT.maglia, w: wN })), { seg: 14 });
    } else if (v.colletto === 'tondo') {
      loft(B, [0, 1].map(q => ({ c: [0, y - .005 + q * .01, z - .004], t: [0, 1, 0], f: [0, 0, 1], a: .085 + sp, b: .078 + sp, col: C3v(v.col3 || '#f2ece0'), w: wN, mod: th => { const fr = Math.cos(th); return fr > .6 ? .12 * sm((fr - .6) / .4) : 0; } })), { seg: 16 });
    } else if (v.colletto === 'cappuccio') {   // il cappuccio abbassato, sulle spalle
      loft(B, [[0, .095, .082, -.02], [.025, .104, .09, -.032], [.052, .092, .084, -.042], [.072, .055, .06, -.052]].map(([dy, a, b, fz]) => ({ c: [0, y + dy - .012, zAt(y)], t: [0, 1, 0], f: [0, 0, 1], a: a + sp * .3, b: b + sp * .2, fz, col: mulc(col, .95), w: dy > .05 ? [['Neck', .6], ['Chest', .4]] : [['Chest', 1]], mod: th => { const fr = Math.cos(th); return fr > .3 ? -.4 * sm((fr - .3) / .4) : 0; } })), { seg: 16 });
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
  // [personaggi] l'imbrago da arrampicata: la fascia in vita con la fibbia, l'anello davanti, i cosciali, gli anelli porta-materiale coi moschettoni colorati, il sacchetto della magnesite dietro
  function imbrago(B, J, D, K, profAt, zAt, yOf, listaB, listaG) {
    const c = C3(D.imbrago.col || '#e8601a'), c2 = C3(D.imbrago.col2 || '#1a1a1e'), y = yOf(.16), P0 = profAt(y), sp = strati(listaB, .16).sp + .006, z0 = zAt(y), wH = [['Hips', .8], ['Abdomen', .2]];
    loft(B, [0, .5, 1].map(q => ({ c: [0, y - .02 + q * .04, z0], t: [0, 1, 0], f: [0, 0, 1], a: P0[0] + sp + (q === .5 ? .004 : 0), b: P0[1] + sp + (q === .5 ? .004 : 0), fz: P0[2], col: q === .5 ? c : mulc(c, .8), w: wH })), { seg: 18 });
    const zf = z0 + P0[2] + P0[1] + sp + .006;
    uovo(B, [0, y, zf], [0, 0, 1], .026, .018, .006, C3('#c8ccd0'), [['Hips', 1]], { anelli: 2, seg: 6, p: 4, f: [0, 1, 0] });
    tuboP(B, Array.from({ length: 10 }, (_, k) => { const a = k / 10 * 6.283; return [Math.sin(a) * .018, y - .045 + Math.cos(a) * .024, zf + .004]; }), () => .005, c2, [['Hips', 1]], true);   // l'anello di servizio
    ['L', 'R'].forEach(sd => { const sg = sd === 'L' ? 1 : -1, j0 = J['UpperLeg' + sd], j1 = J['LowerLeg' + sd], q = lerp3(j0, j1, .2), sg2 = strati(listaG, .2).sp || .01, r = (D.sesso === 'f' ? .07 : .074) + sg2 + .012;
      tuboP(B, Array.from({ length: 14 }, (_, k) => { const a = k / 14 * 6.283; return [q[0] + Math.sin(a) * r * .95, q[1] + .01 * Math.cos(a), q[2] + Math.cos(a) * r]; }), () => .008, mulc(c, .9), [['UpperLeg' + sd, 1]], true);
      [.55, .85].forEach((ang, k) => { const a = sg * (Math.PI / 2 + (ang - .7) * 1.6), x = Math.sin(a) * (P0[0] + sp + .008), zz = z0 + P0[2] + Math.cos(a) * (P0[1] + sp + .008), cc = C3(['#e8a020', '#2a8ad0', '#c83a2a', '#3ab86a'][k + (sd === 'L' ? 0 : 2)]);
        for (let m = 0; m < 2; m++) tuboP(B, Array.from({ length: 8 }, (_, i) => { const t = i / 8 * 6.283; return [x + sg * m * .012 + Math.sin(t) * .009, y - .04 + Math.cos(t) * .018, zz + .004]; }), () => .0028, m ? C3('#c8ccd0') : cc, [['Hips', 1]], true); }); });
    const zb = z0 + P0[2] - P0[1] - sp - .03;   // la magnesite
    loft(B, [[-.03, .03], [.02, .033], [.035, .028], [.04, .01]].map(([dy, r]) => ({ c: [0, y + dy, zb], t: [0, 1, 0], f: [0, 0, -1], a: r, b: r * .9, col: dy > .03 ? C3('#f0ece2') : c2, w: [['Hips', 1]] })), { seg: 10 });
  }
  // la corda arrotolata a tracolla: due giri grossi dalla spalla al fianco, colorata a spirale
  function corda(B, J, profAt, zAt, yOf, listaB, D) {
    const sp = strati(listaB, .6).sp + .018, col = C3(D.corda.col || '#2a8ad0'), mat = { ptile: PT.righe, col3: C3(D.corda.col2 || '#e8d040') };
    [0, 1].forEach(g => { const pts = []; for (let j = 0; j <= 16; j++) { const q = j / 16, a = q * 6.283, y = lerp(yOf(.95), yOf(.3), .5 - .5 * Math.cos(a)), x = lerp(-.14, .15, .5 - .5 * Math.cos(a)) + g * .012, P0 = profAt(y), front = Math.sin(a) >= 0, ex = Math.sqrt(Math.max(0, 1 - Math.pow(Math.abs(x) / (P0[0] + sp), 2.2)));
      pts.push([x, y, zAt(y) + P0[2] + (front ? 1 : -1) * (P0[1] + sp + g * .008) * ex]); }
      tuboP(B, pts.slice(0, 16), () => .015, col, catena(pts[0][1], [J.Hips[1], J.Abdomen[1], J.Torso[1], J.Chest[1]], ['Hips', 'Abdomen', 'Torso', 'Chest'], .05), true, mat); });
  }
  function bandoliera(B, J, profAt, zAt, yOf, listaB, D) {
    const c = C3('#2a2018'), N = 7, sp = strati(listaB, .6).sp + .01;
    const pts = []; for (let j = 0; j <= N; j++) { const q = j / N, y = lerp(yOf(.92), yOf(.32), q), P0 = profAt(y), x = lerp(-.12, .13, q); const ex = Math.sqrt(Math.max(0, 1 - Math.pow(Math.abs(x) / (P0[0] + sp), 2.2))); pts.push([x, y, zAt(y) + P0[2] + (P0[1] + sp) * ex]); }
    loft(B, pts.map((p, j) => ({ c: p, t: norm(sub(pts[Math.min(N, j + 1)], pts[Math.max(0, j - 1)])), f: [0, 0, 1], a: .022, b: .004, p: 6, col: c, w: catena(p[1], [J.Hips[1], J.Abdomen[1], J.Torso[1], J.Chest[1]], ['Hips', 'Abdomen', 'Torso', 'Chest'], .05) })), { seg: 4 });
  }

  // =====================================================================================
  // L'ATLANTE DEI DISEGNI (una tela sola per tutti): R = apertura (secondo colore), G = linee e ombre (scurisce), B = luce (bottoni, fibbie)
  // =====================================================================================
  const AT = { N: 8, NY: 13, px: 256, tex: null };
  function atlante() {
    if (AT.tex || typeof document === 'undefined') return AT.tex;
    const N = AT.N, NY = AT.NY, px = AT.px, cv = document.createElement('canvas'); cv.width = N * px; cv.height = NY * px; const x = cv.getContext('2d');
    x.fillStyle = '#000'; x.fillRect(0, 0, N * px, NY * px);
    // tessera i (layout) nella riga 0..1, j: disegno ripetuto (motivi) nelle righe 2..3. Le u vanno da 0 (cucitura dietro) a 1, il davanti a 0.5; v da 0 (giù) a 1 (su)
    const T = (i, fn) => { const ox = (i % N) * px, oy = Math.floor(i / N) * px; x.save(); x.beginPath(); x.rect(ox, oy, px, px); x.clip(); x.translate(ox, oy); x.scale(px, px); fn(x); x.restore(); };   // la v della tessera cresce verso il basso della tela, come la legge lo shader (flipY spento)
    const R = 'rgb(255,0,0)', G = 'rgb(0,255,0)', Bl = 'rgb(0,0,255)';
    const line = (c, w, pts) => { c.strokeStyle = G; c.lineWidth = w; c.beginPath(); pts.forEach((p, k) => k ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke(); };
    const dot = (c, col, u, v, r) => { c.fillStyle = col; c.beginPath(); c.ellipse(u, v, r * .5, r, 0, 0, 7); c.fill(); };
    const add = (c) => { c.globalCompositeOperation = 'lighter'; };
    const bottoni = (c, u, v0, v1, n, r) => { for (let k = 0; k < n; k++) { const v = lerp(v0, v1, k / Math.max(1, n - 1)); dot(c, G, u, v, r * 1.5); dot(c, Bl, u, v, r); } };
    // pieghe a inchiostro (linea chiara): tratti corti che si assottigliano
    const piega = (c, a, b, w) => { c.strokeStyle = G; c.lineCap = 'round'; for (let k = 0; k < 3; k++) { c.globalAlpha = [1, .6, .3][k]; c.lineWidth = w * [1, .7, .4][k]; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(lerp(a[0], b[0], 1 - k * .25), lerp(a[1], b[1], 1 - k * .25)); c.stroke(); } c.globalAlpha = 1; };
    const cuci = (c, pts, w) => { c.save(); c.setLineDash([.012, .009]); c.strokeStyle = Bl; c.lineWidth = w || .004; c.beginPath(); pts.forEach((p, k) => k ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke(); c.restore(); };
    const costine = (c, v0, v1, n) => { for (let k = 0; k < n; k++) line(c, .003, [[k / n, v0], [k / n, v1]]); line(c, .006, [[0, v1], [1, v1]]); };
    const pieghe_busto = c => { piega(c, [.22, .8], [.3, .68], .008); piega(c, [.78, .8], [.7, .68], .008); piega(c, [.3, .22], [.38, .3], .007); piega(c, [.7, .22], [.62, .3], .007); piega(c, [.03, .2], [.08, .28], .005); piega(c, [.97, .2], [.92, .28], .005); line(c, .003, [[.25, 0], [.25, 1]]); line(c, .003, [[.75, 0], [.75, 1]]); };
    // [personaggi] lo streetwear: stampe e scritte a blocchi, maglie da gioco, felpe e giacche (tessere 26-39, 71, 75-87), i motivi nuovi (88-95).
    // Sulla stoffa: R = secondo colore, R+B = terzo colore, B = bianco, G = inchiostro. La tela è capovolta (v 0 all'orlo, 1 al collo) e la u è larga 1,5 volte la v.
    const MG = 'rgb(255,0,255)', W3 = '#000';
    const FONT = { A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100', R: '110101110101101', S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101101010', Z: '111001010100111',
      0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110', 4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001110', W: '101101111111101', Y: '101101010010010', X: '101101010101101', J: '001001001101010', Q: '010101101110011', '-': '000000111000000', ' ': '000000000000000', '*': '101010111010101' };
    const scritta = (c, txt, u, v, h, col, arco, gr) => { const s = h / 5, su = s * .66, w = su * (gr ? 4.4 : 4), n = txt.length; c.fillStyle = col;
      for (let i = 0; i < n; i++) { const g = FONT[txt[i]] || FONT[' '], x0 = u + (i - n / 2) * w + su * .5, dv = arco ? arco * (1 - ((i + .5) / n * 2 - 1) ** 2) : 0;
        for (let r = 0; r < 5; r++) for (let q = 0; q < 3; q++) if (g[r * 3 + q] === '1') c.fillRect(x0 + q * su, v + dv + h / 2 - (r + 1) * s, su * 1.06, s * 1.06); } };
    const ombra = (c, txt, u, v, h, a, b, arco) => { scritta(c, txt, u + .006, v - .01, h, b, arco); scritta(c, txt, u, v, h, a, arco); };   // la scritta col contorno sfalsato (terzo colore sotto)
    const dietro = (c, fn) => { fn(0); fn(1); };   // il dietro sta a cavallo della cucitura: u 0 e 1
    const tee = c => { c.save(); add(c); line(c, .01, [[0, .975], [1, .975]]); cuci(c, [[0, .04], [1, .04]]); pieghe_busto(c); c.restore(); };
    const zip = (c, v0, v1) => { c.save(); add(c); line(c, .01, [[.5, v0], [.5, v1]]); for (let v = v0; v < v1; v += .025) line(c, .003, [[.49, v], [.51, v]]); dot(c, Bl, .5, v1 - .03, .012); c.restore(); };
    const canguro = c => { c.save(); add(c); line(c, .006, [[.37, .1], [.4, .34], [.6, .34], [.63, .1]]); line(c, .007, [[.37, .1], [.33, .24], [.4, .34]]); line(c, .007, [[.63, .1], [.67, .24], [.6, .34]]); c.restore(); };
    const fiamma = (c, u, w, h, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(u - w, 0); c.bezierCurveTo(u - w, h * .4, u - w * .2, h * .5, u - w * .5, h); c.bezierCurveTo(u + w * .1, h * .7, u + w * .3, h * .6, u + w * .15, h * .85); c.bezierCurveTo(u + w * .9, h * .5, u + w, h * .3, u + w, 0); c.fill(); };
    const stella = (c, u, v, r, col, rot) => { c.fillStyle = col; c.beginPath(); for (let k = 0; k < 10; k++) { const a = (rot || 0) + k / 10 * 6.283 - Math.PI / 2, rr = k % 2 ? r * .45 : r; c.lineTo(u + Math.cos(a) * rr * .66, v - Math.sin(a) * rr); } c.fill(); };
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
    T(5, c => { add(c); line(c, .02, [[.0, .985], [1, .985]]); line(c, .012, [[.0, 0], [0, 1]]); line(c, .012, [[1, 0], [1, 1]]); line(c, .006, [[.36, .3], [.64, .3], [.64, .5], [.36, .5], [.36, .3]]); line(c, .004, [[.5, .3], [.5, .5]]); piega(c, [.3, .6], [.33, .85], .006); piega(c, [.7, .6], [.67, .85], .006); });
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
    // 13 maglietta: il collo a costine, l'orlo cucito, le pieghe sotto le ascelle e in vita
    T(13, c => { add(c); line(c, .01, [[0, .975], [1, .975]]); cuci(c, [[0, .04], [1, .04]]); pieghe_busto(c); });
    // 14 maglietta con la stampa sul petto (secondo colore)
    T(14, c => { c.fillStyle = MG; c.beginPath(); c.ellipse(.5, .62, .085, .13, 0, 0, 7); c.fill(); c.fillStyle = R; c.beginPath(); c.ellipse(.5, .62, .072, .11, 0, 0, 7); c.fill(); stella(c, .5, .64, .06, MG); scritta(c, 'OG', .5, .555, .035, Bl); scritta(c, 'CREW', .5, .45, .04, R); tee(c); });   // 14 la stampa: lo stemma tondo con la stella
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
      const ey = .472, ex = o.ex || .118, h = (o.stretti ? .018 : .023) * (o.oh || 1), w = .05 * (o.ow || 1), br = o.ciglia || 0;
      c.lineCap = 'round'; c.lineJoin = 'round';
      // le ombre: l'orbita sotto l'arcata, il lato del naso, sotto il labbro, sotto gli zigomi
      c.fillStyle = 'rgba(0,255,0,.1)'; [-1, 1].forEach(s => { c.beginPath(); c.ellipse(.5 + s * ex, ey + .016, .07, .04, 0, 0, 7); c.fill(); });
      c.fillStyle = 'rgba(0,255,0,.22)'; c.beginPath(); c.ellipse(.5, .145, .05, .014, 0, 0, 7); c.fill();
      [-1, 1].forEach(s => { const x = .5 + s * ex, xi = x - s * w, xo = x + s * w;   // xi verso il naso, xo verso la tempia
        // la mandorla: il bianco appena, l'iride grande e scura, la palpebra di sopra pesante e un po' calata verso l'esterno
        c.fillStyle = Bl; c.beginPath(); c.moveTo(xi, ey); c.quadraticCurveTo(x, ey + h * 2.1, xo, ey + h * .25); c.quadraticCurveTo(x, ey - h * 1.5, xi, ey); c.fill();
        c.fillStyle = G; c.beginPath(); c.ellipse(x - s * .004, ey + h * .15, .021, h * 1.02, 0, 0, 7); c.fill();
        c.fillStyle = Bl; c.beginPath(); c.arc(x - s * .01, ey + h * .55, .005, 0, 7); c.fill();   // il punto di luce
        c.strokeStyle = G; c.lineWidth = .017 + br * .006; c.beginPath(); c.moveTo(xi - s * .004, ey - h * .1); c.quadraticCurveTo(x, ey + h * 2.3, xo + s * .008, ey + h * .1); c.stroke();
        if (br) { c.lineWidth = .007; c.beginPath(); c.moveTo(xo, ey + h * .3); c.lineTo(xo + s * .018, ey + h * 1.1); c.stroke(); }
        c.lineWidth = .004; c.globalAlpha = .55; c.beginPath(); c.moveTo(xi + s * .008, ey - h * .9); c.quadraticCurveTo(x, ey - h * 1.7, xo - s * .004, ey - h * .5); c.stroke(); c.globalAlpha = 1;
        c.lineWidth = .004; c.globalAlpha = .45; c.beginPath(); c.moveTo(xi + s * .01, ey + h * 2.6); c.quadraticCurveTo(x, ey + h * 3.4, xo - s * .006, ey + h * 2.2); c.stroke(); c.globalAlpha = 1;   // la piega della palpebra
        // le sopracciglia: basse, quasi dritte, vicine agli occhi; la testa verso il naso un filo più giù
        const bt = (o.brow || 0) + (o.accigliato ? 1.6 : 0), bw = o.browW || .032, up = o.alzato && s > 0 ? .028 : 0; c.strokeStyle = R; c.lineWidth = bw; c.beginPath(); c.moveTo(.5 + s * .045, .522 - bt * .014 + (o.bh || 0) + up * .5); c.quadraticCurveTo(.5 + s * .11, .55 + (o.arco || 0) + (o.bh || 0) + up * 1.2, .5 + s * .178, .535 + bt * .01 + (o.bh || 0) - (o.coda || 0) + up * .6); c.stroke();
        if (o.rughe) { c.strokeStyle = G; c.lineWidth = .004; c.beginPath(); c.moveTo(xo + s * .006, ey + .004); c.lineTo(xo + s * .022, ey + .016); c.moveTo(xo + s * .006, ey - .006); c.lineTo(xo + s * .022, ey - .014); c.stroke(); c.beginPath(); c.moveTo(x - .03, ey - .04); c.quadraticCurveTo(x, ey - .052, x + .03, ey - .04); c.stroke(); } });
      c.strokeStyle = G;
      // il naso: l'ombra del dorso da un lato, le ali, le narici
      c.globalAlpha = .5; c.lineWidth = .006; c.beginPath(); c.moveTo(.47, .515); c.quadraticCurveTo(.455, .42, .46, .35); c.stroke(); c.globalAlpha = 1;
      c.lineWidth = .007; [-1, 1].forEach(s => { c.beginPath(); c.moveTo(.5 + s * .045, .345); c.quadraticCurveTo(.5 + s * .05, .322, .5 + s * .02, .318); c.stroke(); });
      // la bocca: larga e dritta, il labbro di sotto accennato; l'umore la piega appena
      const um = o.umore || 0, my = .19, mw = o.mw || .08;
      if (o.labbra) { c.fillStyle = 'rgb(255,0,255)'; c.beginPath(); c.moveTo(.5 - mw, my); c.quadraticCurveTo(.5, my + .025, .5 + mw, my); c.quadraticCurveTo(.5, my - .03, .5 - mw, my); c.fill(); }
      const gh = o.ghigno ? .022 : 0, giu = o.accigliato ? -.012 : 0;
      if (o.aperto) { c.fillStyle = Bl; c.beginPath(); c.moveTo(.5 - mw, my + um * .012); c.quadraticCurveTo(.5, my - .045, .5 + mw, my + um * .012); c.quadraticCurveTo(.5, my + .005, .5 - mw, my + um * .012); c.fill(); c.strokeStyle = G; c.lineWidth = .008; c.stroke(); c.beginPath(); c.moveTo(.5 - mw * .8, my - .004); c.lineTo(.5 + mw * .8, my - .004); c.lineWidth = .004; c.stroke(); }
      c.lineWidth = .011; c.beginPath(); c.moveTo(.5 - mw, my + um * .012 + giu); c.quadraticCurveTo(.5, my - um * .02 + .004 - giu * .5, .5 + mw, my + um * .012 - (o.storto ? .008 : 0) + gh + giu); c.stroke();
      if (gh) { c.lineWidth = .005; c.beginPath(); c.moveTo(.5 + mw + .004, my + gh + .004); c.quadraticCurveTo(.5 + mw + .02, my + gh * .4, .5 + mw + .012, my - .012); c.stroke(); }
      c.lineWidth = .006; c.globalAlpha = .5; c.beginPath(); c.moveTo(.46, my - .035); c.quadraticCurveTo(.5, my - .045, .54, my - .035); c.stroke(); c.globalAlpha = 1;
      c.lineWidth = .004; c.globalAlpha = .4; c.beginPath(); c.moveTo(.5, my + .1); c.lineTo(.5, my + .035); c.stroke(); c.globalAlpha = 1;   // il solco sopra il labbro
      if (um > .3) [-1, 1].forEach(s => { c.lineWidth = .005; c.beginPath(); c.moveTo(.5 + s * (mw + .02), my + .03); c.quadraticCurveTo(.5 + s * (mw + .03), my + .005, .5 + s * (mw + .012), my - .012); c.stroke(); });
      if (o.rughe) [-1, 1].forEach(s => { c.lineWidth = .005; c.beginPath(); c.moveTo(.5 + s * .06, .35); c.quadraticCurveTo(.5 + s * .11, .28, .5 + s * (mw + .025), .17); c.stroke(); c.beginPath(); c.moveTo(.4, .66 + s * .018); c.lineTo(.6, .66 + s * .018); c.stroke(); });
      if (o.duro) [-1, 1].forEach(s => { c.lineWidth = .006; c.beginPath(); c.moveTo(.5 + s * .018, .5); c.lineTo(.5 + s * .022, .545); c.stroke(); });
      if (o.zigomi) [-1, 1].forEach(s => { c.lineWidth = .004; c.globalAlpha = .35; c.beginPath(); c.moveTo(.5 + s * .2, .42); c.quadraticCurveTo(.5 + s * .18, .34, .5 + s * .14, .3); c.stroke(); c.globalAlpha = 1; });
      if (o.barbetta) { c.fillStyle = R; c.globalAlpha = .16; c.beginPath(); c.moveTo(.2, .38); c.quadraticCurveTo(.25, .0, .5, -.04); c.quadraticCurveTo(.75, .0, .8, .38); c.lineTo(.7, .36); c.quadraticCurveTo(.6, .14, .5, .13); c.quadraticCurveTo(.4, .14, .3, .36); c.closePath(); c.fill(); c.beginPath(); c.ellipse(.5, .245, .09, .02, 0, 0, 7); c.fill(); c.globalAlpha = 1; }
    });
    FACCE.forEach((o, i) => faccia(i, o));
    // le facce pulite, da linea chiara: occhi a ovale pieno, sopracciglia a tratto, bocca a linea; niente ombre
    const pulita = (i, o) => T(56 + i, c => {
      c.lineCap = 'round'; c.lineJoin = 'round';
      [-1, 1].forEach(s => { const x = .5 + s * .105, ey = .47;
        c.fillStyle = G; c.beginPath(); c.ellipse(x, ey, .017, .03, 0, 0, 7); c.fill();
        c.fillStyle = Bl; c.beginPath(); c.arc(x - s * .005, ey + .012, .005, 0, 7); c.fill();
        if (o.ciglia) { c.strokeStyle = G; c.lineWidth = .008; c.beginPath(); c.moveTo(x + s * .012, ey + .022); c.lineTo(x + s * .03, ey + .032); c.stroke(); }
        const b = o.brow || 0, up = o.alzato && s > 0 ? .02 : 0; c.strokeStyle = R; c.lineWidth = o.browW || .02;
        c.beginPath(); c.moveTo(x - s * .035, .54 - b * .018 + up * .5); c.quadraticCurveTo(x, .565 + (o.arco || .006) + up, x + s * .04, .548 + b * .01 + up * .3); c.stroke();
        if (o.rughe) { c.strokeStyle = G; c.lineWidth = .004; c.beginPath(); c.moveTo(x + s * .03, ey - .01); c.lineTo(x + s * .045, ey - .02); c.stroke(); } });
      c.strokeStyle = G;
      const um = o.umore || 0, my = .19, mw = o.mw || .045;
      if (o.aperto) { c.fillStyle = G; c.beginPath(); c.moveTo(.5 - mw, my + .006); c.quadraticCurveTo(.5, my - .05, .5 + mw, my + .006); c.closePath(); c.fill(); c.fillStyle = Bl; c.fillRect(.5 - mw * .7, my - .004, mw * 1.4, .008); }
      else { c.lineWidth = .009; c.beginPath(); c.moveTo(.5 - mw, my + um * .014); c.quadraticCurveTo(.5, my - um * .03, .5 + mw, my + um * .014 + (o.storto ? .01 : 0)); c.stroke(); }
      if (o.labbra) { c.fillStyle = 'rgb(255,0,255)'; c.beginPath(); c.ellipse(.5, my - .012, .035, .01, 0, 0, 7); c.fill(); }
      if (o.rughe) { c.lineWidth = .004; [-1, 1].forEach(s => { c.beginPath(); c.moveTo(.5 + s * .06, .33); c.quadraticCurveTo(.5 + s * .08, .26, .5 + s * (mw + .02), .19); c.stroke(); }); c.beginPath(); c.moveTo(.42, .64); c.lineTo(.58, .64); c.moveTo(.44, .67); c.lineTo(.56, .67); c.stroke(); }
      if (o.barbetta) { c.fillStyle = R; c.globalAlpha = .12; c.beginPath(); c.moveTo(.24, .36); c.quadraticCurveTo(.28, .0, .5, -.04); c.quadraticCurveTo(.72, .0, .76, .36); c.lineTo(.66, .34); c.quadraticCurveTo(.58, .16, .5, .15); c.quadraticCurveTo(.42, .16, .34, .34); c.closePath(); c.fill(); c.globalAlpha = 1; }
    });
    [{}, { brow: 1, browW: .024, umore: -.2 }, { umore: .7, aperto: 1 }, { rughe: 1, brow: -.3, umore: -.1 }, { ciglia: 1, labbra: 1, browW: .013, arco: .012 }, { ciglia: 1, labbra: 1, browW: .013, arco: .014, umore: .6, aperto: 1 }, { ciglia: 1, labbra: 1, rughe: 1, browW: .012 }, { barbetta: 1, alzato: 1, storto: 1 }].forEach((o, i) => pulita(i, o));
    // [guardaroba] 64 toppe: giubbotto o gilet di jeans con le toppe cucite (secondo colore) e le borchie (luce)
    T(64, c => { add(c); const toppa = (u, v, w, h, r) => { c.fillStyle = R; c.beginPath(); if (r) c.ellipse(u, v, w, h, 0, 0, 7); else c.rect(u - w, v - h, 2 * w, 2 * h); c.fill(); cuci(c, r ? Array.from({ length: 13 }, (_, k) => [u + Math.cos(k / 12 * 6.283) * w * .85, v + Math.sin(k / 12 * 6.283) * h * .85]) : [[u - w * .85, v - h * .85], [u + w * .85, v - h * .85], [u + w * .85, v + h * .85], [u - w * .85, v + h * .85], [u - w * .85, v - h * .85]]); };
      toppa(.06, .55, .05, .16); toppa(.94, .55, .05, .16); toppa(.06, .82, .04, .07, 1); toppa(.33, .72, .05, .07, 1); toppa(.67, .74, .055, .045); toppa(.36, .3, .05, .06); toppa(.7, .36, .045, .07, 1); toppa(.56, .55, .03, .04, 1); line(c, .007, [[.5, 0], [.5, 1]]); bottoni(c, .52, .15, .85, 5, .012);
      for (let k = 0; k < 14; k++) dot(c, Bl, .2 + k * .011, .97, .006); for (let k = 0; k < 14; k++) dot(c, Bl, .66 + k * .011, .97, .006); line(c, .006, [[.6, .66], [.7, .66], [.7, .56], [.6, .56], [.6, .66]]); line(c, .006, [[.3, .66], [.4, .66], [.4, .56], [.3, .56], [.3, .66]]); pieghe_busto(c); });
    // 65 militare (M65, parka): la zip coperta, quattro tasche con la pattina, il carré dietro, le spalline
    T(65, c => { add(c); line(c, .012, [[.5, 0], [.5, 1]]); bottoni(c, .53, .12, .9, 6, .01); [[.36, .68, .055], [.64, .68, .055], [.35, .22, .07], [.65, .22, .07]].forEach(([u, v, w]) => { line(c, .007, [[u - w, v + w * 1.1], [u + w, v + w * 1.1], [u + w, v - w * 1.1], [u - w, v - w * 1.1], [u - w, v + w * 1.1]]); line(c, .01, [[u - w * 1.05, v + w * 1.25], [u + w * 1.05, v + w * 1.25]]); dot(c, Bl, u, v + w * .95, .009); });
      line(c, .006, [[0, .86], [.2, .86]]); line(c, .006, [[.8, .86], [1, .86]]); line(c, .008, [[.25, .98], [.25, .9]]); line(c, .008, [[.75, .98], [.75, .9]]); pieghe_busto(c); cuci(c, [[0, .04], [1, .04]]); });
    // 66 cardigan: la V aperta (secondo colore = sotto), i bottoni, le tasche, le costine
    T(66, c => { add(c); c.fillStyle = R; c.beginPath(); c.moveTo(.43, 1.01); c.lineTo(.5, .5); c.lineTo(.57, 1.01); c.fill(); line(c, .012, [[.43, 1.01], [.5, .5], [.5, 0]]); bottoni(c, .515, .1, .45, 4, .014); costine(c, 0, .09, 40); line(c, .008, [[.3, .3], [.42, .3], [.42, .15], [.3, .15], [.3, .3]]); line(c, .008, [[.58, .3], [.7, .3], [.7, .15], [.58, .15], [.58, .3]]); });
    // 67 salopette: la pettorina davanti, il resto mostra sotto; le bretelle incrociate dietro con le fibbie
    T(67, c => { c.fillStyle = R; c.fillRect(0, .3, 1, .72); c.globalCompositeOperation = 'destination-out'; c.fillRect(.36, .3, .28, .62); [[.38, .43], [.57, .62]].forEach(([a, b]) => c.fillRect(a, .3, b - a, .72)); c.beginPath(); c.moveTo(.38, 1); c.lineTo(.42, 1); c.lineTo(.12, .3); c.lineTo(.08, .3); c.fill(); c.beginPath(); c.moveTo(.58, 1); c.lineTo(.62, 1); c.lineTo(.92, .3); c.lineTo(.88, .3); c.fill(); c.beginPath(); c.moveTo(.08, 1); c.lineTo(.12, 1); c.lineTo(.42, .3); c.lineTo(.38, .3); c.fill();
      c.globalCompositeOperation = 'lighter'; line(c, .006, [[.43, .78], [.57, .78], [.57, .62], [.43, .62], [.43, .78]]); cuci(c, [[.36, .92], [.36, .3]]); cuci(c, [[.64, .92], [.64, .3]]); dot(c, Bl, .405, .9, .016); dot(c, Bl, .595, .9, .016); cuci(c, [[0, .3], [1, .3]]); });
    // 68 giacca da lavoro: i bottoni, tre tasche applicate, le impunture
    T(68, c => { add(c); line(c, .008, [[.5, 0], [.5, 1]]); bottoni(c, .52, .12, .9, 5, .013); [[.62, .68, .05, .055], [.34, .22, .075, .08], [.66, .22, .075, .08]].forEach(([u, v, w, h]) => { line(c, .006, [[u - w, v + h], [u - w, v - h], [u + w, v - h], [u + w, v + h]]); cuci(c, [[u - w + .01, v + h - .012], [u - w + .01, v - h + .01], [u + w - .01, v - h + .01], [u + w - .01, v + h - .012]]); }); pieghe_busto(c); cuci(c, [[0, .03], [1, .03]]); });
    // 69 chiodo: la zip in diagonale, la tasca con la zip, la cintura in fondo, le spille (luce)
    T(69, c => { add(c); c.fillStyle = R; c.beginPath(); c.moveTo(.42, 1.01); c.lineTo(.5, .82); c.lineTo(.6, 1.01); c.fill(); line(c, .012, [[.6, 0], [.6, .55], [.42, 1]]); dot(c, Bl, .6, .52, .012); line(c, .009, [[.32, .62], [.44, .74]]); dot(c, Bl, .44, .74, .008); line(c, .009, [[.66, .3], [.74, .38]]); line(c, .014, [[0, .07], [1, .07]]); dot(c, Bl, .53, .07, .016);
      [[.36, .82, .012], [.33, .76, .01], [.39, .5, .014], [.7, .78, .011], [.74, .7, .009]].forEach(([u, v, r]) => { dot(c, Bl, u, v, r); dot(c, G, u, v, r * .4); }); pieghe_busto(c); });
    // 70 nylon a blocchi: il petto e le spalle di un altro colore, la riga di luce, la zip
    T(70, c => { c.fillStyle = R; c.fillRect(0, .55, 1, .45); c.globalCompositeOperation = 'lighter'; c.fillStyle = Bl; c.fillRect(0, .5, 1, .035); line(c, .01, [[.5, .08], [.5, 1]]); dot(c, Bl, .5, .95, .013); costine(c, 0, .06, 40); pieghe_busto(c); });
    // i motivi nuovi: mimetico (7), fair isle (56), kefiah (57), tartan (58)
    T(23, c => { const blob = (u, v, r, col) => { c.fillStyle = col; c.beginPath(); for (let k = 0; k <= 9; k++) { const a = k / 9 * 6.283, rr = r * (.7 + .3 * Math.sin(k * 2.7 + u * 9)); k ? c.lineTo(u + Math.cos(a) * rr * 1.5, v + Math.sin(a) * rr) : c.moveTo(u + Math.cos(a) * rr * 1.5, v + Math.sin(a) * rr); } c.fill(); };
      [[.2, .2, .12], [.7, .35, .14], [.4, .7, .13], [.9, .85, .1], [.05, .65, .09]].forEach(([u, v, r]) => { blob(u, v, r, R); blob(u - 1, v, r, R); blob(u, v - 1, r, R); }); [[.5, .15, .07], [.15, .45, .06], [.8, .6, .07], [.6, .95, .06]].forEach(([u, v, r]) => { blob(u, v, r, G); blob(u, v - 1, r, G); }); });
    T(72, c => { c.fillStyle = R; for (let k = 0; k < 8; k++) { const u = k / 8; c.beginPath(); c.moveTo(u, .5); c.lineTo(u + .0625, .38); c.lineTo(u + .125, .5); c.lineTo(u + .0625, .62); c.fill(); } c.fillRect(0, .14, 1, .04); c.fillRect(0, .82, 1, .04); c.fillStyle = Bl; for (let k = 0; k < 16; k++) { c.fillRect(k / 16, .25, .03, .03); c.fillRect(k / 16 + .03, .72, .03, .03); } });
    T(73, c => { c.strokeStyle = R; c.lineWidth = .05; for (let k = -2; k < 6; k++) { c.beginPath(); c.moveTo(k * .25, 0); c.lineTo(k * .25 + 1, 1); c.stroke(); c.beginPath(); c.moveTo(k * .25 + 1, 0); c.lineTo(k * .25, 1); c.stroke(); } c.fillStyle = R; c.fillRect(0, 0, 1, .08); });
    T(74, c => { c.fillStyle = R; c.globalAlpha = .6; c.fillRect(.1, 0, .25, 1); c.fillRect(0, .1, 1, .25); c.globalAlpha = 1; c.fillRect(.1, .1, .25, .25); c.globalCompositeOperation = 'lighter'; line(c, .015, [[.65, 0], [.65, 1]]); line(c, .015, [[0, .65], [1, .65]]); c.fillStyle = Bl; c.fillRect(.5, 0, .012, 1); c.fillRect(0, .5, 1, .012); });
    // i motivi (ripetuti ogni 'prep' metri): R = secondo colore (col3)
    const P = (j, fn) => T(16 + j, fn);
    // 26 box logo sul petto
    T(26, c => { c.fillStyle = R; c.fillRect(.4, .56, .2, .11); scritta(c, MARCA, .5, .615, Math.min(.06, .3 / MARCA.length), Bl); tee(c); });
    // 29 college: la scritta ad arco e il numero sotto
    T(29, c => { ombra(c, 'FRESH', .5, .6, .1, R, MG, .05); ombra(c, '84', .5, .4, .14, R, MG); tee(c); });
    // 30 fiamme dall'orlo
    T(30, c => { for (let k = 0; k < 9; k++) fiamma(c, k / 8, .07, .3 + .16 * Math.abs(Math.sin(k * 2.3)), R); for (let k = 0; k < 9; k++) fiamma(c, k / 8, .035, .16 + .08 * Math.abs(Math.sin(k * 1.7)), MG); tee(c); });
    // 31 la faccina acida, grande sul petto (e una piccola dietro)
    T(31, c => { const fc = (u, v, r) => { c.fillStyle = R; c.beginPath(); c.ellipse(u, v, r * .66, r, 0, 0, 7); c.fill(); c.fillStyle = MG; c.beginPath(); c.ellipse(u - r * .22, v + r * .25, r * .07, r * .17, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(u + r * .22, v + r * .25, r * .07, r * .17, 0, 0, 7); c.fill();
      c.strokeStyle = MG; c.lineWidth = r * .1; c.beginPath(); c.ellipse(u, v + r * .05, r * .42, r * .55, 0, Math.PI * 1.2, Math.PI * 1.8); c.stroke(); }; fc(.5, .6, .16); dietro(c, u => fc(u, .75, .07)); tee(c); });
    // 35 il tramonto a righe con le palme
    T(35, c => { c.fillStyle = R; c.beginPath(); c.ellipse(.5, .55, .12, .18, 0, 0, 7); c.fill(); c.fillStyle = W3; for (let k = 0; k < 5; k++) c.fillRect(.36, .4 + k * .035, .28, .012 + k * .002);
      const palma = (u, s) => { c.fillStyle = MG; c.beginPath(); c.moveTo(u, .38); c.quadraticCurveTo(u + s * .02, .55, u + s * .01, .72); c.lineTo(u + s * .02, .72); c.quadraticCurveTo(u + s * .035, .55, u + .012, .38); c.fill(); for (let k = 0; k < 5; k++) { const a = -.6 + k * .55; c.beginPath(); c.moveTo(u + s * .015, .72); c.quadraticCurveTo(u + s * .015 + Math.cos(a) * .05, .72 + .06, u + s * .015 + Math.cos(a) * .09, .72 + Math.sin(a) * .07 - .02); c.lineTo(u + s * .015 + Math.cos(a) * .06, .72 + .02); c.fill(); } };
      palma(.4, 1); palma(.6, -1); c.fillStyle = MG; c.fillRect(.36, .36, .28, .025); scritta(c, 'SUMMER', .5, .3, .045, R); tee(c); });
    // 39 la maglia da basket: gli scavi (secondo colore = sotto), i bordi e il numero davanti e dietro (terzo colore), il filo bianco
    T(39, c => { c.fillStyle = R; c.beginPath(); c.ellipse(.5, 1.0, .1, .2, 0, 0, 7); c.fill(); [0, 1, .25, .75].forEach(u => { c.beginPath(); c.ellipse(u, .99, .1, u === .25 || u === .75 ? .19 : .14, 0, 0, 7); c.fill(); });
      c.strokeStyle = MG; c.lineWidth = .025; c.beginPath(); c.ellipse(.5, 1.0, .112, .215, 0, 0, 7); c.stroke(); [.25, .75].forEach(u => { c.beginPath(); c.ellipse(u, .99, .112, .205, 0, 0, 7); c.stroke(); });
      ombra(c, '23', .5, .52, .2, MG, Bl); dietro(c, u => ombra(c, '23', u, .5, .24, MG, Bl)); scritta(c, 'KINGS', .5, .76, .06, MG); c.fillStyle = MG; c.fillRect(0, 0, 1, .035); });
    // 71 la maglia da calcio d'epoca: il collo a polo, il fascione sul petto, lo stemma, lo sponsor, il numero dietro
    T(71, c => { c.fillStyle = R; c.fillRect(0, .6, 1, .14); c.fillStyle = MG; c.fillRect(0, .6, 1, .015); c.fillRect(0, .725, 1, .015); c.fillStyle = R; c.fillRect(0, .95, 1, .05);
      c.fillStyle = MG; c.beginPath(); c.moveTo(.6, .86); c.lineTo(.66, .86); c.lineTo(.66, .8); c.lineTo(.63, .77); c.lineTo(.6, .8); c.fill(); scritta(c, 'GOAL', .5, .45, .06, Bl); dietro(c, u => ombra(c, '10', u, .48, .26, Bl, MG)); tee(c); });
    // 75 la scritta grande dietro, il logo piccolo sul cuore
    T(75, c => { dietro(c, u => { ombra(c, 'RESISTI', u, .62, .09, R, MG); stella(c, u, .4, .1, R); }); scritta(c, 'R*', .6, .76, .04, R); tee(c); });
    // 76 i graffiti: lettere a bolla sovrapposte, le colature, le luci
    T(76, c => { const bolla = (u, v, r, col) => { c.fillStyle = col; c.beginPath(); c.ellipse(u, v, r * .66, r, 0, 0, 7); c.fill(); };
      [[.36, .58, .08], [.44, .63, .09], [.52, .57, .085], [.6, .62, .08], [.67, .56, .07]].forEach(([u, v, r]) => bolla(u, v, r + .02, MG)); [[.36, .58, .08], [.44, .63, .09], [.52, .57, .085], [.6, .62, .08], [.67, .56, .07]].forEach(([u, v, r]) => bolla(u, v, r, R));
      c.fillStyle = R; [[.4, .5, .12], [.5, .49, .2], [.62, .52, .1]].forEach(([u, v, h]) => { c.fillRect(u - .006, v - h, .012, h); c.beginPath(); c.ellipse(u, v - h, .01, .015, 0, 0, 7); c.fill(); });
      c.fillStyle = Bl; [[.34, .64], [.43, .7], [.51, .63], [.59, .68]].forEach(([u, v]) => { c.beginPath(); c.ellipse(u, v, .012, .02, -.5, 0, 7); c.fill(); }); c.save(); add(c); c.globalAlpha = .7; line(c, .012, [[.3, .5], [.4, .7], [.47, .52], [.55, .72], [.62, .5], [.7, .66]]); c.restore(); tee(c); });
    // 77 ringer: il collo e l'orlo d'un altro colore, la scritta piccola
    T(77, c => { c.fillStyle = R; c.fillRect(0, .945, 1, .055); scritta(c, 'SOUND', .5, .65, .05, R); scritta(c, 'SYSTEM', .5, .58, .05, MG); tee(c); });
    // 78 felpa con la zip: la zip intera, le tasche oblique, i cordini
    T(78, c => { costine(c, 0, .08, 40); zip(c, .08, 1); c.save(); add(c); line(c, .007, [[.36, .14], [.42, .32]]); line(c, .007, [[.64, .14], [.58, .32]]); c.restore(); c.fillStyle = Bl; c.fillRect(.455, .78, .008, .2); c.fillRect(.537, .76, .008, .22); pieghe_busto(c); });
    // 79 felpa a blocchi: il petto d'un colore, la riga, la tasca a marsupio
    T(79, c => { c.fillStyle = R; c.fillRect(0, .56, 1, .44); c.fillStyle = MG; c.fillRect(0, .52, 1, .04); canguro(c); costine(c, 0, .08, 40); pieghe_busto(c); });
    // 80 felpa college: la scritta ad arco col contorno, la tasca
    T(80, c => { ombra(c, 'OLD', .5, .66, .1, R, MG, .04); scritta(c, 'SCHOOL', .5, .5, .045, R); canguro(c); costine(c, 0, .08, 40); pieghe_busto(c); });
    // 81 la giacca a vento da infilare: la mezza zip, il marsupione, il carré d'un altro colore, i cordini
    T(81, c => { c.fillStyle = R; c.fillRect(0, .74, 1, .26); c.fillStyle = MG; c.fillRect(0, .72, 1, .025); zip(c, .74, 1); c.save(); add(c); line(c, .008, [[.33, .14], [.67, .14], [.67, .44], [.33, .44], [.33, .14]]); line(c, .008, [[.36, .42], [.64, .42]]); c.restore(); dot(c, Bl, .4, .02, .012); dot(c, Bl, .6, .02, .012); costine(c, 0, .04, 40); pieghe_busto(c); });
    // 82 varsity: i bottoni a pressione, la lettera grande sul petto, le costine a righe, le tasche di pelle
    T(82, c => { c.fillStyle = MG; c.fillRect(.6, .55, .1, .2); c.fillStyle = R; c.fillRect(.61, .565, .08, .17); scritta(c, 'P', .65, .65, .13, MG); for (let k = 0; k < 2; k++) { c.fillStyle = k ? MG : R; c.fillRect(0, .025 + k * .03, 1, .015); c.fillRect(0, .95 + k * .02, 1, .01); }
      c.fillStyle = MG; c.fillRect(.31, .2, .02, .14); c.fillRect(.67, .2, .02, .14); bottoni(c, .5, .14, .88, 6, .011); dietro(c, u => ombra(c, 'KINGS', u, .62, .1, R, MG, .05)); c.save(); add(c); line(c, .008, [[.5, 0], [.5, 1]]); pieghe_busto(c); c.restore(); });
    // 83 coach jacket: i bottoni a pressione, il logo sul cuore, la scritta grande dietro
    T(83, c => { bottoni(c, .51, .1, .92, 6, .011); scritta(c, 'CREW', .62, .76, .04, Bl); dietro(c, u => { scritta(c, MARCA, u, .66, Math.min(.1, .5 / MARCA.length), Bl); scritta(c, 'SOUND', u, .52, .07, Bl); }); c.save(); add(c); line(c, .008, [[.5, 0], [.5, 1]]); cuci(c, [[0, .05], [1, .05]]); pieghe_busto(c); c.restore(); });
    // 84 la giacca della tuta d'epoca: il carré d'un altro colore col filo, la zip, lo scudetto
    T(84, c => { c.fillStyle = R; c.beginPath(); c.moveTo(0, .62); c.lineTo(.3, .62); c.lineTo(.5, .7); c.lineTo(.7, .62); c.lineTo(1, .62); c.lineTo(1, 1); c.lineTo(0, 1); c.fill(); c.strokeStyle = Bl; c.lineWidth = .012; c.beginPath(); c.moveTo(0, .61); c.lineTo(.3, .61); c.lineTo(.5, .69); c.lineTo(.7, .61); c.lineTo(1, .61); c.stroke();
      c.fillStyle = MG; c.beginPath(); c.ellipse(.62, .55, .025, .035, 0, 0, 7); c.fill(); zip(c, .06, 1); costine(c, 0, .06, 40); });
    // 85 la camicia da bowling: le due bande dritte davanti (secondo colore) col filo, i bottoni, il nome ricamato
    T(85, c => { c.fillStyle = R; c.fillRect(.33, 0, .1, 1); c.fillRect(.57, 0, .1, 1); dietro(c, u => c.fillRect(u - .12, .62, .24, .38)); c.fillStyle = MG; [.33, .43, .57, .67].forEach(u => c.fillRect(u - .004, 0, .008, 1)); scritta(c, 'NINO', .38, .76, .035, Bl); bottoni(c, .51, .1, .85, 5, .012); c.save(); add(c); line(c, .008, [[.5, 0], [.5, .97]]); c.restore(); });
    // 86 il pile: le spalle d'un altro colore, la zip, il taschino con la zip, il bordo
    T(86, c => { c.fillStyle = R; c.fillRect(0, .76, 1, .24); c.fillStyle = MG; c.fillRect(0, .74, 1, .022); zip(c, .04, 1); c.save(); add(c); line(c, .008, [[.6, .64], [.6, .74]]); line(c, .008, [[.3, .1], [.36, .3]]); line(c, .008, [[.7, .1], [.64, .3]]); c.restore(); c.fillStyle = MG; c.fillRect(0, 0, 1, .03); });
    // 87 la giacca di raso: la zip, le costine a righe, la stella grande ricamata dietro, la tigre... no: la stella piccola davanti
    T(87, c => { for (let k = 0; k < 3; k++) { c.fillStyle = k === 1 ? R : MG; c.fillRect(0, .015 + k * .02, 1, .012); } dietro(c, u => { stella(c, u, .55, .22, MG); stella(c, u, .55, .17, R); scritta(c, 'TOUR', u, .25, .06, Bl); }); stella(c, .63, .72, .05, R); zip(c, .07, 1); c.fillStyle = Bl; for (let k = 0; k < 12; k++) c.fillRect(k / 12 + .02, .4, .03, .008); });
    // [personaggi] la montagna: il logo (tre cime nell'arco), la giacca a guscio, il piumino a sacchi, la manica a due colori, i pantaloni da arrampicata
    const monte = (c, u, v, r, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(u - r * .66, v - r * .5); c.lineTo(u - r * .3, v + r * .2); c.lineTo(u - r * .1, v - r * .05); c.lineTo(u + r * .15, v + r * .5); c.lineTo(u + r * .66, v - r * .5); c.fill(); c.strokeStyle = col; c.lineWidth = r * .14; c.beginPath(); c.ellipse(u, v - r * .5, r * .7, r * 1.05, 0, Math.PI * 1.05, Math.PI * 1.95); c.stroke(); };
    // 96 guscio: il carré e le spalle d'un altro colore, le cuciture nastrate (luce), la zip coperta, le tasche al petto con la zip in diagonale, il logo
    T(96, c => { c.fillStyle = R; c.beginPath(); c.moveTo(0, .7); c.lineTo(.28, .72); c.lineTo(.42, .86); c.lineTo(.58, .86); c.lineTo(.72, .72); c.lineTo(1, .7); c.lineTo(1, 1); c.lineTo(0, 1); c.fill();
      c.strokeStyle = Bl; c.globalAlpha = .45; c.lineWidth = .006; c.beginPath(); c.moveTo(0, .69); c.lineTo(.28, .71); c.lineTo(.42, .85); c.lineTo(.58, .85); c.lineTo(.72, .71); c.lineTo(1, .69); c.stroke(); [.25, .75].forEach(u => { c.beginPath(); c.moveTo(u, 0); c.lineTo(u, 1); c.stroke(); }); c.globalAlpha = 1;
      c.save(); add(c); line(c, .014, [[.5, 0], [.5, 1]]); line(c, .008, [[.36, .78], [.42, .56]]); line(c, .008, [[.64, .78], [.58, .56]]); line(c, .007, [[.3, .22], [.4, .3]]); line(c, .007, [[.7, .22], [.6, .3]]); cuci(c, [[0, .03], [1, .03]]); pieghe_busto(c); c.restore();
      dot(c, Bl, .42, .57, .008); dot(c, Bl, .58, .57, .008); monte(c, .64, .66, .035, Bl); dietro(c, u => monte(c, u + .06, .8, .03, Bl)); });
    // 97 piumino a sacchi: le spalle scure (secondo colore), le cuciture dei sacchi (allineate al gonfio), la zip, il logo davanti e dietro
    T(97, c => { c.fillStyle = R; c.fillRect(0, .8, 1, .2); c.save(); add(c); for (let k = 1; k < 5; k++) line(c, .009, [[0, k / 5], [1, k / 5]]); line(c, .012, [[.5, 0], [.5, 1]]); c.restore(); c.fillStyle = Bl; c.fillRect(.495, .0, .01, 1); monte(c, .63, .7, .032, Bl); dietro(c, u => monte(c, u + .07, .9, .028, Bl)); c.fillStyle = R; c.fillRect(0, 0, 1, .04); });
    // 98 la manica a due colori del piumino: la spalla d'un altro colore, le cuciture dei sacchi (v 0 la spalla, 1 il polso)
    T(98, c => { c.fillStyle = R; c.fillRect(0, 0, 1, .32); c.save(); add(c); for (let k = 1; k < 4; k++) line(c, .01, [[0, k / 4], [1, k / 4]]); c.restore(); });
    // 99 pantaloni da arrampicata: il ginocchio sagomato (pinces), la tasca laterale con la zip, il cordino in fondo, il tassello tra le gambe (secondo colore)
    T(99, c => { c.save(); add(c); line(c, .007, [[.42, .42], [.5, .5], [.58, .42]]); line(c, .007, [[.42, .56], [.5, .5], [.58, .56]]); line(c, .008, [[.2, .18], [.2, .34]]); line(c, .006, [[.16, .16], [.25, .16], [.25, .36], [.16, .36]]); cuci(c, [[.25, 0], [.25, 1]]); cuci(c, [[.75, 0], [.75, 1]]); c.restore();
      c.fillStyle = R; c.beginPath(); c.moveTo(.66, 0); c.lineTo(.84, 0); c.lineTo(.75, .1); c.fill(); c.fillStyle = Bl; c.fillRect(.73, .93, .012, .07); dot(c, Bl, .74, .92, .01); monte(c, .3, .12, .03, Bl); });
    // i motivi nuovi (16 + 72..79): tie-dye, scacchi, leopardo, paisley, graffiti, rugby, memphis, stelle
    P(72, c => { for (let k = 0; k < 220; k++) { const t = k / 220, a = t * 6.283 * 3, rr = .04 + t * .62; for (let q = 0; q < 3; q++) { const aa = a + q * 2.094; c.fillStyle = `rgba(255,0,0,${.5 + .5 * Math.sin(t * 25)})`; c.beginPath(); c.ellipse(.5 + Math.cos(aa) * rr * .7, .5 + Math.sin(aa) * rr * .7, .03 + t * .05, .02 + t * .03, aa, 0, 7); c.fill(); } }
      c.fillStyle = 'rgba(0,0,255,.35)'; for (let k = 0; k < 60; k++) { const t = k / 60, a = t * 6.283 * 3 + 1, rr = .05 + t * .6; c.beginPath(); c.ellipse(.5 + Math.cos(a) * rr * .7, .5 + Math.sin(a) * rr * .7, .02, .012, a, 0, 7); c.fill(); } });
    P(73, c => { c.fillStyle = R; for (let k = 0; k < 4; k++) for (let l = 0; l < 4; l++) if ((k + l) % 2) c.fillRect(k / 4, l / 4, .25, .25); });
    P(74, c => { const ro = (u, v, r) => { c.fillStyle = R; c.beginPath(); c.ellipse(u, v, r, r * .8, 0, 0, 7); c.fill(); c.strokeStyle = G; c.lineWidth = r * .45; c.beginPath(); c.ellipse(u, v, r * 1.15, r * .95, .3, .3, 5.2); c.stroke(); };
      [[.15, .2], [.55, .12], [.85, .45], [.35, .55], [.7, .8], [.1, .85], [.95, .05], [.45, .95]].forEach(([u, v], k) => { const r = .06 + (k % 3) * .015; ro(u, v, r); ro(u - 1, v, r); ro(u, v - 1, r); ro(u + 1, v, r); ro(u, v + 1, r); }); });
    P(75, c => { const go = (u, v, r, a) => { c.save(); c.translate(u, v); c.rotate(a); c.fillStyle = R; c.beginPath(); c.arc(0, 0, r, 0, 7); c.quadraticCurveTo(r * 1.6, -r * .2, r * 2.2, r * 1.4); c.quadraticCurveTo(r * .9, r * 1.1, 0, r); c.fill(); c.fillStyle = 'rgb(0,0,255)'; c.beginPath(); c.arc(0, 0, r * .4, 0, 7); c.fill(); c.restore(); };
      [[.25, .25, .09, .3], [.72, .4, .08, 2.2], [.3, .75, .07, 4], [.8, .85, .06, 1]].forEach(([u, v, r, a]) => { go(u, v, r, a); go(u - 1, v, r, a); go(u, v - 1, r, a); }); });
    P(76, c => { c.lineCap = 'round'; for (let k = 0; k < 14; k++) { const u = (k * .37) % 1, v = (k * .61) % 1; c.strokeStyle = k % 3 ? R : G; c.lineWidth = .03; c.beginPath(); c.moveTo(u, v); c.bezierCurveTo(u + .1, v + .15, u + .15, v - .1, u + .25, v + .05); c.stroke(); } });
    P(77, c => { c.fillStyle = R; c.fillRect(0, 0, 1, .32); c.fillRect(0, .5, 1, .32); c.fillStyle = 'rgb(0,0,255)'; c.fillRect(0, .4, 1, .04); c.fillRect(0, .9, 1, .04); });
    P(78, c => { c.fillStyle = R; [[.15, .2, 0], [.6, .1, 1], [.4, .6, 2], [.85, .7, .5]].forEach(([u, v, a]) => { c.save(); c.translate(u, v); c.rotate(a); c.beginPath(); c.moveTo(0, -.08); c.lineTo(.07, .05); c.lineTo(-.07, .05); c.fill(); c.restore(); });
      c.strokeStyle = G; c.lineWidth = .025; c.beginPath(); c.moveTo(.05, .45); for (let k = 0; k < 6; k++) c.lineTo(.05 + (k + 1) * .05, .45 + (k % 2 ? .05 : -.05)); c.stroke(); c.fillStyle = 'rgb(0,0,255)'; [[.75, .3], [.2, .85], [.55, .9], [.9, .95]].forEach(([u, v]) => { c.beginPath(); c.arc(u, v, .025, 0, 7); c.fill(); }); });
    P(79, c => { [[.25, .25, .1], [.75, .7, .1], [.75, .2, .05], [.2, .75, .05]].forEach(([u, v, r]) => stella(c, u, v, r, R, .3)); });
    P(1, c => { c.fillStyle = R; for (let k = 0; k < 4; k++) c.fillRect(0, k / 4, 1, .1); });   // righe da marinaio
    P(2, c => { c.globalAlpha = .55; c.fillStyle = R; for (let k = 0; k < 4; k++) { c.fillRect(k / 4, 0, .1, 1); c.fillRect(0, k / 4, 1, .1); } c.globalAlpha = 1; for (let k = 0; k < 4; k++) for (let l = 0; l < 4; l++) c.fillRect(k / 4, l / 4, .1, .1); });   // quadri
    P(3, c => { const fl = (u, v, r) => { c.fillStyle = R; for (let k = 0; k < 5; k++) { const a = k / 5 * 6.283; c.beginPath(); c.ellipse(u + Math.cos(a) * r, v + Math.sin(a) * r, r * .7, r * .7, 0, 0, 7); c.fill(); } c.fillStyle = 'rgb(0,0,255)'; c.beginPath(); c.ellipse(u, v, r * .55, r * .55, 0, 0, 7); c.fill(); c.fillStyle = 'rgb(0,255,0)'; c.beginPath(); c.ellipse(u + r * 1.9, v - r * .6, r * .9, r * .4, .5, 0, 7); c.fill(); };
      [[.2, .25, .07], [.7, .15, .05], [.55, .62, .075], [.12, .78, .05], [.88, .6, .045], [.38, .95, .04], [.88, .95, .06]].forEach(p => { fl(p[0], p[1], p[2]); fl(p[0] - 1, p[1], p[2]); fl(p[0], p[1] - 1, p[2]); }); });   // fiori
    P(4, c => { c.fillStyle = 'rgb(0,255,0)'; for (let k = 0; k < 8; k++) for (let l = 0; l < 8; l++) { c.globalAlpha = .35; c.beginPath(); c.ellipse((k + (l % 2) * .5) / 8, l / 8, .03, .05, 0, 0, 7); c.fill(); } c.globalAlpha = 1; });   // maglia
    P(5, c => { c.fillStyle = R; for (let k = 0; k < 4; k++) for (let l = 0; l < 4; l++) { c.beginPath(); c.arc((k + (l % 2) * .5) / 4 + .06, l / 4 + .06, .045, 0, 7); c.fill(); } });   // pois
    P(6, c => { c.fillStyle = R; for (let k = 0; k < 8; k++) c.fillRect(k / 8, 0, .025, 1); });   // righine verticali
    const tex = new THREE.CanvasTexture(cv); tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.anisotropy = 4; tex.flipY = false; if (typeof LeggeraMem !== 'undefined') LeggeraMem.mezza(tex); /* [leggera] sul telefono a metà lato */ AT.tex = tex; AT.cv = cv; return tex;
  }

  // =====================================================================================
  // IL MATERIALE (uno per tutta la gente): colori per vertice, l'atlante, un filo di luce propria
  // =====================================================================================
  // =====================================================================================
  // [personaggi] LE STAMPE A COLORI: una tela a parte, coi colori veri e la trasparenza (tessere 200+). Sopra il capo, al posto del disegno a canali.
  // Nella tessera la y è la v del capo (0 all'orlo, 1 al collo); la u è 1,5 volte più larga della v sul busto, quindi le forme si stringono di lato (.66).
  // =====================================================================================
  const PR = { N: 8, NY: 3, px: 256, tex: null, nomi: ['vapore', 'wild', 'hotrod', 'onda', 'limoni', 'boombox', 'acido', 'cross', 'arcobaleno', 'camo_pop', 'righe70', 'stencil', 'alieni', 'tattoo', 'pallone', 'bandana_tutta', 'mixtape', 'chrome'] };
  PR.nomi.forEach((n, i) => { TL['s_' + n] = 200 + i; });
  function stampe() {
    if (PR.tex || typeof document === 'undefined') return PR.tex;
    const { N, NY, px } = PR, cv = document.createElement('canvas'); cv.width = N * px; cv.height = NY * px; const x = cv.getContext('2d');
    const T = (i, fn) => { const ox = (i % N) * px, oy = Math.floor(i / N) * px; x.save(); x.beginPath(); x.rect(ox, oy, px, px); x.clip(); x.translate(ox, oy); x.scale(px, px); fn(x); x.restore(); };
    const K = .66, ell = (c, u, v, rx, ry, a0, a1) => { c.beginPath(); c.ellipse(u, v, rx * K, ry, 0, a0 || 0, a1 === undefined ? 7 : a1); };
    const grad = (c, x0, y0, x1, y1, stops) => { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach((s, k) => g.addColorStop(k / (stops.length - 1), s)); return g; };
    // la scritta, girata per stare dritta sul capo; peso, contorno, ombra
    const txt = (c, s, u, v, h, fill, o) => { o = o || {}; c.save(); c.translate(u, v); c.scale(K * h / 100, -h / 100); c.rotate(o.rot || 0); c.font = `${o.peso || 900} 100px ${o.font || '"Arial Black", Impact, "Helvetica Neue", Arial, sans-serif'}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      if (o.skew) c.transform(1, 0, o.skew, 1, 0, 0);
      if (o.ombra) { c.fillStyle = o.ombra; c.fillText(s, 6, 8); }
      if (o.bordo) { c.lineJoin = 'round'; c.strokeStyle = o.bordo; c.lineWidth = o.bw || 16; c.strokeText(s, 0, 0); }
      c.fillStyle = typeof fill === 'function' ? fill(c) : fill; c.fillText(s, 0, 0); if (o.luce) { c.fillStyle = o.luce; c.globalAlpha = .55; c.fillText(s, -3, -6); } c.restore(); };
    const cuciture = c => { c.save(); c.translate(0, -SU); c.fillStyle = 'rgba(0,0,0,.22)'; c.fillRect(0, .955, 1, .045); c.fillRect(0, 0, 1, .03); c.fillStyle = 'rgba(0,0,0,.08)'; c.fillRect(.245, 0, .01, 1); c.fillRect(.745, 0, .01, 1); c.restore(); };
    const dietro = fn => { fn(0); fn(1); };
    const stella = (c, u, v, r, col, n) => { c.fillStyle = col; c.beginPath(); for (let k = 0; k < (n || 5) * 2; k++) { const a = k / ((n || 5) * 2) * 6.283 - Math.PI / 2, rr = k % 2 ? r * .42 : r; c.lineTo(u + Math.cos(a) * rr * K, v - Math.sin(a) * rr); } c.fill(); };
    const fiammaP = (c, u, w, h, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(u - w, 0); c.bezierCurveTo(u - w, h * .45, u - w * .1, h * .55, u - w * .45, h); c.bezierCurveTo(u + w * .15, h * .75, u + w * .35, h * .62, u + w * .2, h * .88); c.bezierCurveTo(u + w * .95, h * .52, u + w, h * .3, u + w, 0); c.fill(); };
    const goccia = (c, u, v, l, col) => { c.fillStyle = col; c.fillRect(u - .004, v - l, .008, l); ell(c, u, v - l, .007, .011); c.fill(); };
        const SU = .07, D = (i, fn) => T(i, c => { c.translate(0, SU); fn(c); });   // nella tessera la y è già la v del capo (in su); solo le scritte si girano. Il disegno sale di SU verso il petto
    const zoom = (c, z, fn, u0, v0) => { c.save(); c.translate(u0 || .5, v0 || .6); c.scale(z, z); c.translate(-(u0 || .5), -(v0 || .6)); fn(); c.restore(); };
    // 0 vapore: il sole a righe, la griglia viola, le palme, la scritta cromata; dietro il sole grande
    D(0, c => { const sole = (u, v, r) => { c.save(); ell(c, u, v, r, r); c.clip(); c.fillStyle = grad(c, 0, v + r, 0, v - r, ['#ffe14a', '#ff8a3d', '#ff3f8e', '#b23cd8']); c.fillRect(u - r, v - r, 2 * r, 2 * r); for (let k = 0; k < 6; k++) c.clearRect(u - r, v - r * .1 - k * r * .16, 2 * r, r * (.03 + k * .016)); c.restore(); };
      sole(.5, .66, .17); c.strokeStyle = '#ff3fd2'; c.lineWidth = .006; for (let k = 0; k < 5; k++) { c.beginPath(); c.moveTo(.34, .48 - k * k * .012); c.lineTo(.66, .48 - k * k * .012); c.stroke(); } for (let k = -4; k <= 4; k++) { c.beginPath(); c.moveTo(.5 + k * .02, .49); c.lineTo(.5 + k * .055, .3); c.stroke(); }
      const palma = (u, s) => { c.fillStyle = '#2a0e3a'; c.beginPath(); c.moveTo(u, .45); c.quadraticCurveTo(u + s * .02, .6, u + s * .01, .74); c.lineTo(u + s * .022, .74); c.quadraticCurveTo(u + s * .035, .6, u + .012, .45); c.fill(); for (let k = 0; k < 6; k++) { const a = -.9 + k * .55; c.beginPath(); c.moveTo(u + s * .016, .74); c.quadraticCurveTo(u + s * .016 + Math.cos(a) * .045, .79, u + s * .016 + Math.cos(a) * .085, .74 + Math.sin(a) * .06 - .02); c.lineTo(u + s * .016 + Math.cos(a) * .05, .755); c.fill(); } };
      palma(.37, 1); palma(.63, -1); txt(c, 'PARADISE', .5, .33, .045, cc => grad(cc, 0, .24, 0, .3, ['#9ad8ff', '#ffffff', '#ff7ad8']), { bordo: '#2a0e3a', bw: 12 }); dietro(u => sole(u, .62, .22)); cuciture(c); });
    // 1 wild: le lettere a bolla piene di sfumatura, il contorno nero, le luci, le colature, le stelline; dietro la firma
    D(1, c => { txt(c, 'WILD', .5, .62, .15, cc => grad(cc, 0, .5, 0, .74, ['#2af5ff', '#3ad86a', '#ffe14a']), { skew: -.25, bordo: '#141418', bw: 26, ombra: '#ff3f8e', luce: '#ffffff', rot: .06 });
      [['#2af5ff', .38, .5, .1], ['#3ad86a', .47, .5, .16], ['#ffe14a', .6, .5, .08]].forEach(([col, u, v, l]) => goccia(c, u, v, l, col)); [[.3, .78, .025], [.72, .76, .02], [.66, .44, .015]].forEach(([u, v, r]) => stella(c, u, v, r, '#ffffff', 4));
      dietro(u => txt(c, 'STYLE', u, .65, .075, '#ff3f8e', { skew: -.3, bordo: '#141418', bw: 18, luce: '#ffffff' })); cuciture(c); });
    // 2 hotrod: le fiamme a tre colori col contorno, dall'orlo fino al petto, tutt'intorno
    D(2, c => { for (let k = 0; k < 9; k++) fiammaP(c, k / 8, .075, .46 + .2 * Math.abs(Math.sin(k * 2.3)), '#141418'); for (let k = 0; k < 9; k++) fiammaP(c, k / 8, .065, .42 + .2 * Math.abs(Math.sin(k * 2.3)), '#e8281a'); for (let k = 0; k < 9; k++) fiammaP(c, k / 8, .045, .3 + .14 * Math.abs(Math.sin(k * 1.7)), '#ff8a1a'); for (let k = 0; k < 9; k++) fiammaP(c, k / 8, .025, .16 + .08 * Math.abs(Math.sin(k * 1.3)), '#ffe14a'); cuciture(c); });
    // 3 onda: la grande onda blu con gli artigli di schiuma, il sole rosso dietro, le scritte
    D(3, c => { zoom(c, 1.35, () => { ell(c, .58, .7, .09, .09); c.fillStyle = '#e8281a'; c.fill(); c.fillStyle = grad(c, 0, .3, 0, .8, ['#0e2a6a', '#1e5ab8', '#4aa8e8']); c.beginPath(); c.moveTo(.32, .36); c.bezierCurveTo(.34, .62, .44, .8, .56, .78); c.bezierCurveTo(.48, .74, .45, .66, .5, .6); c.bezierCurveTo(.54, .56, .6, .6, .6, .52); c.bezierCurveTo(.64, .46, .68, .4, .68, .36); c.closePath(); c.fill();
      c.fillStyle = '#f4f0e6'; for (let k = 0; k < 7; k++) { const a = k / 7; ell(c, .5 + .06 * Math.cos(a * 4), .75 - a * .05, .018, .012); c.fill(); } c.strokeStyle = '#f4f0e6'; c.lineWidth = .008; for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(.42 + k * .05, .42 + k * .02, .04, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
      txt(c, 'SURF', .5, .33, .045, '#141418'); }); dietro(u => { ell(c, u, .62, .18, .18); c.fillStyle = '#e8281a'; c.fill(); txt(c, 'GOOD VIBES', u, .3, .06, '#1e5ab8', { bordo: '#f4f0e6', bw: 10 }); }); cuciture(c); });
    // 4 limoni: i limoni gialli con le foglie e i fiorellini bianchi, dappertutto
    D(4, c => { const lim = (u, v, r, a) => { c.save(); c.translate(u, v); c.scale(K, 1); c.rotate(a); c.fillStyle = '#2e7a3a'; c.beginPath(); c.ellipse(r * 1.1, r * .6, r * .9, r * .35, .6, 0, 7); c.fill(); c.beginPath(); c.ellipse(-r * .6, r * 1, r * .8, r * .3, -.5, 0, 7); c.fill(); c.fillStyle = '#ffd21a'; c.beginPath(); c.ellipse(0, 0, r, r * .78, 0, 0, 7); c.fill(); c.beginPath(); c.arc(r * 1.02, 0, r * .12, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(-r * .3, r * .3, r * .3, r * .15, -.4, 0, 7); c.fill(); c.restore(); };
      const fio = (u, v, r) => { c.fillStyle = '#ffffff'; for (let k = 0; k < 5; k++) { const a = k / 5 * 6.283; ell(c, u + Math.cos(a) * r * K, v + Math.sin(a) * r, r * .6, r * .6); c.fill(); } c.fillStyle = '#ffb21a'; ell(c, u, v, r * .4, r * .4); c.fill(); };
      for (let k = 0; k < 22; k++) { const u = (k * .37 + .05) % 1, v = (k * .53 + .1) % 1; lim(u, v, .05 + (k % 3) * .01, k * 1.3); if (k % 2) fio((u + .13) % 1, (v + .17) % 1, .014); } cuciture(c); });
    // 5 boombox: lo stereo con le casse, la cassetta, l'equalizzatore a colori, BASS
    D(5, c => { zoom(c, 1.45, () => { c.fillStyle = '#c8ccd0'; c.fillRect(.36, .5, .28, .22); c.fillStyle = '#5a5e66'; c.fillRect(.4, .72, .2, .015); c.fillRect(.4, .72, .01, .04); c.fillRect(.59, .72, .01, .04); c.fillRect(.4, .755, .2, .012);
      [.405, .595].forEach(u => { ell(c, u, .6, .065, .065); c.fillStyle = '#141418'; c.fill(); ell(c, u, .6, .045, .045); c.fillStyle = '#3a3e44'; c.fill(); ell(c, u, .6, .015, .015); c.fillStyle = '#c8ccd0'; c.fill(); });
      c.fillStyle = '#141418'; c.fillRect(.465, .62, .07, .07); c.fillStyle = '#e8601a'; c.fillRect(.47, .65, .06, .03); ['#3ad86a', '#ffe14a', '#ff8a1a', '#e8281a', '#ff3f8e', '#2af5ff'].forEach((col, k) => { c.fillStyle = col; c.fillRect(.468 + k * .011, .52, .008, .02 + (k * 7 % 5) * .01); });
      txt(c, 'BASS', .5, .44, .06, '#ffe14a', { bordo: '#141418', bw: 14, skew: -.2 }); }); dietro(u => txt(c, 'SOUND SYSTEM', u, .66, .06, '#ff3f8e', { bordo: '#141418', bw: 12 })); cuciture(c); });
    // 6 acido: la faccina gialla, i raggi arcobaleno, la banda a scacchi
    D(6, c => { zoom(c, 1.2, () => { ['#e8281a', '#ff8a1a', '#ffe14a', '#3ad86a', '#2a8ad0', '#8a4ab8'].forEach((col, k) => { c.fillStyle = col; c.beginPath(); for (let j = 0; j < 12; j++) { const a0 = (j + k / 6) / 12 * 6.283, a1 = a0 + .12; c.moveTo(.5, .62); c.lineTo(.5 + Math.cos(a0) * .22 * K, .62 + Math.sin(a0) * .22); c.lineTo(.5 + Math.cos(a1) * .22 * K, .62 + Math.sin(a1) * .22); } c.fill(); });
      ell(c, .5, .62, .12, .12); c.fillStyle = '#141418'; c.fill(); ell(c, .5, .62, .11, .11); c.fillStyle = '#ffe14a'; c.fill(); c.fillStyle = '#141418'; ell(c, .465, .66, .012, .03); c.fill(); ell(c, .535, .66, .012, .03); c.fill(); c.strokeStyle = '#141418'; c.lineWidth = .012; c.beginPath(); c.ellipse(.5, .63, .07 * K, .06, 0, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); }, .5, .62);
      for (let k = 0; k < 40; k++) { c.fillStyle = (k + (k % 2)) % 2 ? '#141418' : '#f4f0e6'; c.fillRect(k / 40, .36, 1 / 40, .03); c.fillStyle = k % 2 ? '#f4f0e6' : '#141418'; c.fillRect(k / 40, .39, 1 / 40, .03); } cuciture(c); });
    // 7 cross: la maglia da motocross a blocchi diagonali, il numero grande col contorno, le toppe
    D(7, c => { c.fillStyle = '#e8281a'; c.beginPath(); c.moveTo(0, .55); c.lineTo(1, .25); c.lineTo(1, .45); c.lineTo(0, .75); c.fill(); c.fillStyle = '#141418'; c.beginPath(); c.moveTo(0, .75); c.lineTo(1, .45); c.lineTo(1, .52); c.lineTo(0, .82); c.fill(); c.fillStyle = '#ffe14a'; c.fillRect(0, .9, 1, .06);
      txt(c, '77', .5, .57, .2, '#f4f0e6', { bordo: '#141418', bw: 20, skew: -.15 }); txt(c, 'RACING', .36, .8, .035, '#141418'); txt(c, 'TEAM', .64, .8, .035, '#e8281a'); dietro(u => { txt(c, '77', u, .58, .3, '#ffe14a', { bordo: '#141418', bw: 20, skew: -.15 }); txt(c, 'FULL GAS', u, .84, .05, '#f4f0e6', { bordo: '#141418', bw: 10 }); }); cuciture(c); });
    // 8 arcobaleno: il tie-dye a spirale di tutti i colori
    D(8, c => { const cols = ['#e8281a', '#ff8a1a', '#ffe14a', '#3ad86a', '#2af5ff', '#2a5ad8', '#b23cd8', '#ff3f8e']; for (let k = 0; k < 400; k++) { const t = k / 400, a = t * 6.283 * 4, r = .02 + t * .75; c.fillStyle = cols[Math.floor(t * 32) % 8]; c.globalAlpha = .55; ell(c, .5 + Math.cos(a) * r * K, .55 + Math.sin(a) * r * .8, .05 + t * .07, .04 + t * .05); c.fill(); } c.globalAlpha = 1; dietro(u => { for (let k = 0; k < 120; k++) { const t = k / 120, a = t * 6.283 * 3, r = .02 + t * .3; c.fillStyle = cols[Math.floor(t * 18) % 8]; c.globalAlpha = .6; ell(c, u + Math.cos(a) * r * K, .55 + Math.sin(a) * r, .05, .04); c.fill(); } c.globalAlpha = 1; }); });
    // 9 camo pop: il mimetico rosa, azzurro, viola e nero, dappertutto
    D(9, c => { c.fillStyle = '#ff9ad8'; c.fillRect(0, 0, 1, 1); const blob = (u, v, r, col) => { c.fillStyle = col; c.beginPath(); for (let k = 0; k <= 10; k++) { const a = k / 10 * 6.283, rr = r * (.65 + .35 * Math.sin(k * 2.7 + u * 13)); c.lineTo(u + Math.cos(a) * rr * K * 1.4, v + Math.sin(a) * rr); } c.fill(); };
      for (let k = 0; k < 30; k++) { const u = (k * .43) % 1, v = (k * .61) % 1; blob(u, v, .09 + (k % 3) * .03, ['#6ac8ff', '#8a4ab8', '#141418', '#f4f0e6'][k % 4]); } c.globalAlpha = .25; c.fillStyle = '#000'; c.fillRect(0, .955, 1, .045); c.globalAlpha = 1; });
    // 10 righe 70: cinque righe arcobaleno che girano sul petto, la stellina
    D(10, c => { ['#e8281a', '#ff8a1a', '#ffe14a', '#3ab86a', '#2a8ad0'].forEach((col, k) => { c.fillStyle = col; c.fillRect(0, .66 - k * .045, 1, .04); }); stella(c, .64, .8, .035, '#ffe14a'); txt(c, 'ESTATE 79', .5, .4, .05, '#f4f0e6', { bordo: '#141418', bw: 10 }); cuciture(c); });
    // 11 stencil: la scritta a spruzzo, la stella rossa, le colature
    D(11, c => { c.globalAlpha = .9; stella(c, .5, .7, .13, '#d8202a'); c.globalAlpha = 1; txt(c, 'RESPECT', .5, .48, .07, '#141418', { font: 'Impact, "Arial Black", sans-serif', peso: 900 }); for (let k = 0; k < 6; k++) goccia(c, .4 + k * .04, .45, .03 + (k * 37 % 7) * .012, '#141418');
      c.fillStyle = 'rgba(20,20,24,.5)'; for (let k = 0; k < 80; k++) { const a = k * 2.4, r = .14 + (k % 7) * .012; c.fillRect(.5 + Math.cos(a) * r * K, .62 + Math.sin(a) * r, .004, .004); } dietro(u => { txt(c, 'NON SI', u, .7, .08, '#d8202a', { font: '"Courier New", monospace' }); txt(c, 'VENDE', u, .56, .08, '#d8202a', { font: '"Courier New", monospace' }); }); cuciture(c); });
    // 12 alieni: gli alieni a pixel in file colorate, GAME OVER
    D(12, c => { const A = ['00100000100', '00010001000', '00111111100', '01101110110', '11111111111', '10111111101', '10100000101', '00011011000'], pix = (u, v, s, col) => { c.fillStyle = col; A.forEach((row, r) => [...row].forEach((b, q) => { if (b === '1') c.fillRect(u + (q - 5.5) * s * K, v - r * s, s * K * 1.02, s * 1.02); })); };
      ['#3ad86a', '#ff3f8e', '#2af5ff', '#ffe14a'].forEach((col, k) => pix(.41 + (k % 2) * .18, .82 - Math.floor(k / 2) * .16, .016, col)); txt(c, 'GAME OVER', .5, .45, .05, '#ff3f8e', { font: '"Courier New", monospace' }); dietro(u => pix(u, .75, .025, '#3ad86a')); cuciture(c); });
    // 13 tattoo: il cuore col cartiglio MAMMA, le rondini, le rose (old school)
    D(13, c => { let cuore; zoom(c, 1.4, () => { cuore = (u, v, r) => { c.fillStyle = '#141418'; c.beginPath(); c.moveTo(u, v - r * 1.1); c.bezierCurveTo(u - r * 1.6 * K, v - r * .2, u - r * 1.2 * K, v + r * 1.1, u, v + r * .45); c.bezierCurveTo(u + r * 1.2 * K, v + r * 1.1, u + r * 1.6 * K, v - r * .2, u, v - r * 1.1); c.fill(); c.fillStyle = '#d8202a'; c.save(); c.translate(u, v); c.scale(.85, .85); c.translate(-u, -v); c.fill(); c.restore(); };
      cuore(.5, .64, .1); c.fillStyle = '#f4e6c0'; c.fillRect(.4, .6, .2, .045); c.fillStyle = '#c8a060'; c.fillRect(.385, .59, .02, .045); c.fillRect(.595, .59, .02, .045); txt(c, 'MAMMA', .5, .622, .035, '#141418');
      const rondine = (u, v, s) => { c.fillStyle = '#1e3a8a'; c.beginPath(); c.moveTo(u, v); c.lineTo(u + s * .08 * K, v + .04); c.lineTo(u + s * .03 * K, v + .005); c.lineTo(u + s * .09 * K, v - .03); c.lineTo(u + s * .02 * K, v - .01); c.fill(); c.fillStyle = '#d8202a'; ell(c, u + s * .012, v - .005, .012, .01); c.fill(); };
      rondine(.36, .76, -1); rondine(.64, .76, 1); [[.38, .48], [.62, .48]].forEach(([u, v]) => { ell(c, u, v, .03, .03); c.fillStyle = '#d8202a'; c.fill(); c.strokeStyle = '#141418'; c.lineWidth = .004; c.beginPath(); c.arc(u, v, .015, 0, 5); c.stroke(); c.fillStyle = '#2e7a3a'; ell(c, u + (u < .5 ? .03 : -.03), v - .02, .02, .01); c.fill(); }); });
      dietro(u => { cuore(u, .6, .17); txt(c, 'TRUE LOVE', u, .3, .045, '#141418'); }); cuciture(c); });
    // 14 pallone: il pallone da basket che brucia, STREET ad arco
    D(14, c => { zoom(c, 1.3, () => { for (let k = 0; k < 5; k++) fiammaP(c, .42 + k * .04, .03, .78 - Math.abs(k - 2) * .05, ['#ffe14a', '#ff8a1a', '#e8281a', '#ff8a1a', '#ffe14a'][k]); c.save(); c.translate(0, .0); ell(c, .5, .56, .1, .1); c.fillStyle = '#e8701a'; c.fill(); c.strokeStyle = '#141418'; c.lineWidth = .008; c.stroke(); c.beginPath(); c.moveTo(.5, .46); c.lineTo(.5, .66); c.moveTo(.5 - .1 * K, .56); c.lineTo(.5 + .1 * K, .56); c.stroke(); c.beginPath(); c.ellipse(.5 - .06 * K, .56, .05 * K, .09, 0, -1.2, 1.2); c.stroke(); c.beginPath(); c.ellipse(.5 + .06 * K, .56, .05 * K, .09, 0, Math.PI - 1.2, Math.PI + 1.2); c.stroke(); c.restore();
      txt(c, 'STREET', .5, .42, .06, '#f4f0e6', { bordo: '#141418', bw: 14 }); }, .5, .5); cuciture(c); });
    // 15 bandana: il paisley rosso, nero e bianco, dappertutto
    D(15, c => { c.fillStyle = '#b8141e'; c.fillRect(0, 0, 1, 1); const pa = (u, v, r, a) => { c.save(); c.translate(u, v); c.scale(K, 1); c.rotate(a); c.fillStyle = '#141418'; c.beginPath(); c.arc(0, 0, r, 0, 7); c.quadraticCurveTo(r * 1.6, -r * .2, r * 2.3, r * 1.5); c.quadraticCurveTo(r * .9, r * 1.1, 0, r); c.fill(); c.fillStyle = '#f4f0e6'; c.beginPath(); c.arc(0, 0, r * .6, 0, 7); c.fill(); c.fillStyle = '#b8141e'; c.beginPath(); c.arc(0, 0, r * .35, 0, 7); c.fill(); c.restore(); };
      for (let k = 0; k < 20; k++) pa((k * .41) % 1, (k * .57) % 1, .035, k * 1.7); c.fillStyle = '#f4f0e6'; for (let k = 0; k < 80; k++) { ell(c, (k * .29) % 1, (k * .71) % 1, .005, .005); c.fill(); } c.globalAlpha = .25; c.fillStyle = '#000'; c.fillRect(0, .955, 1, .045); c.globalAlpha = 1; });
    // 16 mixtape: la cassetta grande a colori, la scritta a mano
    D(16, c => { zoom(c, 1.45, () => { c.fillStyle = '#141418'; c.fillRect(.37, .5, .26, .24); c.fillStyle = '#ff3f8e'; c.fillRect(.385, .62, .23, .1); c.fillStyle = '#ffe14a'; c.fillRect(.385, .6, .23, .02); c.fillStyle = '#2af5ff'; c.fillRect(.385, .58, .23, .02);
      [.45, .55].forEach(u => { ell(c, u, .555, .025, .025); c.fillStyle = '#f4f0e6'; c.fill(); ell(c, u, .555, .012, .012); c.fillStyle = '#141418'; c.fill(); }); txt(c, 'LATO B', .5, .67, .03, '#141418', { font: '"Comic Sans MS", "Marker Felt", cursive', peso: 700 });
      txt(c, 'MIXTAPE', .5, .44, .055, '#ff3f8e', { bordo: '#141418', bw: 12, skew: -.2 }); }); cuciture(c); });
    // 17 chrome: la scritta cromata gotica grande sul petto, la croce di stelle dietro (Y2K)
    D(17, c => { txt(c, 'Hustle', .5, .62, .15, cc => grad(cc, 0, .52, 0, .68, ['#f4f4f8', '#8a8e96', '#ffffff', '#5a5e66']), { font: '"Old English Text MT", "UnifrakturMaguntia", "Times New Roman", serif', peso: 700, bordo: '#141418', bw: 8 });
      dietro(u => { stella(c, u, .62, .12, '#c8ccd8', 4); stella(c, u, .62, .07, '#ffffff', 4); txt(c, 'GOLD', u, .34, .07, cc => grad(cc, 0, .3, 0, .38, ['#f4f4f8', '#8a8e96', '#ffffff']), { font: '"Old English Text MT", "Times New Roman", serif', bordo: '#141418', bw: 6 }); }); cuciture(c); });
    const tex = new THREE.CanvasTexture(cv); tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.anisotropy = 4; tex.flipY = false; if (typeof LeggeraMem !== 'undefined') LeggeraMem.mezza(tex); /* [leggera] anche la tela delle stampe a metà lato sul telefono */ PR.tex = tex; PR.cv = cv; return tex;
  }
  let MAT = null, MAT_STILE = null;
  function materiale() {
    if (MAT && MAT_STILE === CFG.stile) return MAT; const st = S(); MAT_STILE = CFG.stile;
    let m;
    if (st.toon) { const n = st.toon, d = new Uint8Array(n * 4); for (let i = 0; i < n; i++) { const v = Math.round(n === 2 ? [150, 215][i] : lerp(108, 200, Math.pow(i / (n - 1), .8))); d.set([v, v, v, 255], i * 4); } const gm = new THREE.DataTexture(d, n, 1); gm.needsUpdate = true; m = new THREE.MeshToonMaterial({ gradientMap: gm }); }
    else m = new THREE.MeshStandardMaterial({ roughness: .78, metalness: 0, flatShading: !!st.piatto });
    m.vertexColors = true; m.name = 'personaggi'; m.userData.personaggi = true;
    const tex = atlante(), N = AT.N;
    const EMI = (st.toon ? .05 : st.luce || .22).toFixed(3);
    m.onBeforeCompile = sh => {
      sh.uniforms.uAtl = { value: tex }; sh.uniforms.uPrn = { value: stampe() };
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 col2; attribute vec3 col3; attribute vec3 atl; attribute vec3 mot; varying vec3 vC2; varying vec3 vC3; varying vec3 vAtl; varying vec3 vMot;')
        .replace('#include <color_vertex>', '#include <color_vertex>\nvC2 = col2; vC3 = col3; vAtl = atl; vMot = mot;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nuniform sampler2D uAtl; uniform sampler2D uPrn; varying vec3 vC2; varying vec3 vC3; varying vec3 vAtl; varying vec3 vMot;
        vec3 atlS(float t, vec2 uv) { vec2 N = vec2(${N}.0, ${AT.NY}.0); vec2 o = vec2(mod(t, N.x), floor(t / N.x)) / N; return texture2D(uAtl, o + clamp(uv, .004, .996) / N).rgb; }
        vec4 prnS(float t, vec2 uv) { vec2 N = vec2(${PR.N}.0, ${PR.NY}.0); vec2 o = vec2(mod(t, N.x), floor(t / N.x)) / N; return texture2D(uPrn, o + clamp(uv, .003, .997) / N); }`)
        .replace('#include <color_fragment>', `#include <color_fragment>
        { bool pr = vAtl.z > 199.5; vec3 L = vAtl.z > .5 && !pr ? atlS(floor(vAtl.z + .5), vec2(vAtl.x, vAtl.y)) : vec3(0.); vec4 SP = pr ? prnS(floor(vAtl.z + .5) - 200., vec2(vAtl.x, vAtl.y)) : vec4(0.);
          vec3 M = vMot.z > .5 ? atlS(16. + floor(vMot.z + .5), fract(vMot.xy * 6.)) : vec3(0.);
          vec3 c = diffuseColor.rgb;
          c = mix(c, vC3 * (1. - M.g * .4), M.r); c = mix(c, vec3(.95, .85, .3), M.b * .7); c *= 1. - M.g * .25;
          float lip = min(L.r, L.b); c = mix(c, vC3, lip); c = mix(c, vC2, L.r - lip); c *= 1. - L.g * ${(st.inchiostro || .78).toFixed(3)}; c = mix(c, vec3(.95, .93, .88), (L.b - lip) * .9);
          c = mix(c, SP.rgb, SP.a);
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
  function geometria(D, mesh, rel, J, B0) {
    const B = B0 || costruisci(D, J), bones = mesh.skeleton.bones, idx = new Map(); bones.forEach((b, i) => idx.set(b.name, i));
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
    if (typeof LeggeraMem !== 'undefined') LeggeraMem.figura(g, bones.length);   // [leggera] sul telefono la pelle in attributi compatti (112 → ~45 byte a vertice)
    return g;
  }
  // il modello del kit diventa la figura: le sue mesh se ne vanno, resta lo scheletro (con armi e attrezzi agganciati)
  const GEO = new Map(), GEO_MAX = typeof LeggeraMem !== 'undefined' && LeggeraMem.on('gente') ? 40 : 260,   /* [leggera] sul telefono 40 figure in cache */ STAT = { n: 0, ms: 0 };
  function veste(g, D) { const it = vesteGen(g, D); let r; do r = it.next(); while (!r.done); return r.value; }
  function* vesteGen(g, D) {
    const u = g.userData, m = u.mixer && u.mixer.getRoot ? u.mixer.getRoot() : null; let ref = null; const kit = [], vecchie = [];
    (m || g).traverse(o => { if (o.isSkinnedMesh && !o.userData.personaggi) { kit.push(o); if (!ref || /Body/.test(o.name)) ref = ref && /Body/.test(ref.name) ? ref : o; } if (o.isSkinnedMesh && o.userData.personaggi) vecchie.push(o); });
    if (!ref && u.pelle) ref = u.pelle;   // si riveste: lo scheletro è quello della pelle di prima
    if (!ref) return false;
    const corr = []; g.traverse(o => { if (o.userData && o.userData.corredo) corr.push(o); }); corr.forEach(o => o.parent && o.parent.remove(o));   // il corredo a scatole di models.js
    if (u.copHat && D.cappello) { if (u.copHat.parent) u.copHat.parent.remove(u.copHat); u.copHat = null; }   // il berretto a scatole della Guardia: c'è quello nuovo
    const bs = u.body.scale.clone(); u.body.scale.set(1, 1, 1);
    const { J, rel } = giunture(g, ref), gk = (u.model || '') + '|' + CFG.stile + '|' + CFG.teste + '|' + JSON.stringify(D);
    let geo = GEO.get(gk); if (geo) { GEO.delete(gk); GEO.set(gk, geo); } else { let t0 = performance.now(); const B0 = costruisci(D, J); STAT.ms += performance.now() - t0; yield; t0 = performance.now(); geo = geometria(D, ref, rel, J, B0); STAT.n++; STAT.ms += performance.now() - t0; GEO.set(gk, geo); if (GEO.size > GEO_MAX) { const k0 = GEO.keys().next().value; GEO.delete(k0); } }   // la stessa persona (stesso descrittore) riusa la sua geometria
    const sk = new THREE.SkinnedMesh(geo, materiale()); sk.name = 'Personaggio'; sk.userData.personaggi = true; sk.castShadow = true; sk.frustumCulled = false;
    sk.bind(ref.skeleton, ref.bindMatrix); ref.parent.add(sk); sk.position.copy(ref.position); sk.quaternion.copy(ref.quaternion); sk.scale.copy(ref.scale);
    if (S().contorno) { const ws = new THREE.Vector3(); ref.getWorldScale(ws); const gs = new THREE.Vector3(); g.getWorldScale(gs); OLU.value = S().contorno / (ws.x / gs.x || 1); const ol = new THREE.SkinnedMesh(geo, contorno()); ol.bind(ref.skeleton, ref.bindMatrix); ol.userData.personaggi = true; ol.frustumCulled = false; ref.parent.add(ol); ol.position.copy(ref.position); ol.quaternion.copy(ref.quaternion); ol.scale.copy(ref.scale); }
    kit.forEach(o => { if (o.parent) o.parent.remove(o); }); vecchie.forEach(o => { if (o.parent) o.parent.remove(o); });
    if (!u.braccioLungo) { u.braccioLungo = true; ['L', 'R'].forEach(sd => { const ua = ref.skeleton.bones.find(b => b.name === 'UpperArm' + sd), wr = ref.skeleton.bones.find(b => b.name === 'Wrist' + sd); if (!ua) return; ua.scale.multiplyScalar(BRACCIO);
      if (wr) wr.children.forEach(ch => { if (!ch.isBone) ch.scale.multiplyScalar(1 / BRACCIO); }); }); }   // armi e attrezzi già agganciati al polso restano della loro misura
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
  // ogni capo del Guardaroba (id) → un pezzo del descrittore. v: un capo sulle catene; c: cappello; o: occhiali; s: scarpe; k: collo; z: schiena; x: altro
  const DA_CAPO = {
    canotta: { v: 'canottiera' }, maglietta: { v: 'maglietta' }, maglietta_righe: { v: 'maglietta_righe', col3: '#f0ece2' }, camicia: { v: 'camicia' }, camicia_quadri: { v: 'camicia_quadri', col3: '#1a1a1e' },
    dolcevita: { v: 'dolcevita' }, maglione: { v: 'maglione' }, felpa: { v: 'felpa' }, gilet: { v: 'gilet' }, grembiule: { v: 'grembiule' }, vestiti: { v: 'vestito_lungo', ptile: 'quadri' }, tuta: { v: 'tuta' },
    giacca: { v: 'giacca' }, giacca_pelle: { v: 'giacca_pelle' }, giubbotto_jeans: { v: 'giubbotto_jeans' }, piumino: { v: 'piumino' }, cappotto: { v: 'cappotto' }, impermeabile: { v: 'cerata' }, montone: { v: 'montone' },
    divisa: { v: 'divisa' }, giubbotto: { v: 'giubbotto' }, scialle: { v: 'scialle' }, mutande: {}, calze_nylon: { v: 'calze_intere' }, calzamaglia: { v: 'calze_intere' },
    pantaloni: { v: 'pantaloni' }, jeans: { v: 'jeans' }, velluto: { v: 'pantaloni', ptile: 'righine' }, pantaloni_lavoro: { v: 'cargo' }, pantaloni_grigi: { v: 'pantaloni' }, gonna: { v: 'gonna' }, pantaloncini: { v: 'pantaloncini' },
    calzini: {}, scarpe: { s: 'scarponi' }, scarpe_eleganti: { s: 'scarpe' }, scarpe_tela: { s: 'tela' }, stivali: { s: 'stivali' }, ciabatte: { s: 'ciabatte' },
    guanti_lana: { x: 'guanti' }, guanti: { x: 'guanti' }, sciarpa: { k: 'sciarpa' }, sciarpa_righe: { k: 'sciarpa', righe: 1 }, foulard: { k: 'foulard' },
    berretto: { c: 'berretto' }, coppola: { c: 'coppola' }, cappello: { c: 'cappello' }, colbacco: { c: 'colbacco' }, fazzoletto: { c: 'fazzoletto' }, casco: { c: 'casco' }, elmetto: { c: 'elmetto' },
    passamontagna: { c: 'passamontagna' }, maschera_gas: { c: 'maschera_gas' }, paraspalle: { x: 'spalle' }, paraginocchia: { x: 'ginocchia' }, zaino: { z: 'zaino' },
    polo: { v: 'polo' }, camicia_hawaii: { v: 'camicia_corta', ptile: 'fiori', col3: '#f0e0a0' }, maglia_calcio: { v: 'maglietta', tile: 'calcio', col2: '#f0ece2', col3: '#e8d040' }, felpa_zip: { v: 'tuta_giacca' },
    giacca_completo: { v: 'giacca' }, pelliccia: { v: 'pelliccia', col3: '#3a2414' }, pelliccia_volpe: { v: 'pelliccia', ptile: 'maglia' }, poncho: { v: 'scialle', ptile: 'righe' },
    vestito_corto: { v: 'vestito_corto' }, vestito_lungo: { v: 'vestito_lungo' }, vestito_fiori: { v: 'abito', ptile: 'fiori', col3: '#c8402a' }, tuta_ginnastica: { v: 'tuta_giacca', e: 'tuta_pantaloni' },
    cargo: { v: 'cargo' }, pantaloni_completo: { v: 'pantaloni' }, bermuda: { v: 'bermuda', ptile: 'quadri', col3: '#5a6a3a' }, minigonna: { v: 'minigonna' }, leggings: { v: 'leggings' },
    sandali: { s: 'sandali' }, tacchi: { s: 'tacchi' }, scarpe_corsa: { s: 'sneakers' }, stivali_pelle: { s: 'stivali' }, mocassini: { s: 'mocassini' },
    cravatta: { k: 'cravatta' }, papillon: { k: 'papillon' }, collana_oro: { v: 'catena' }, collana_perle: { k: 'perle' }, catenina: { k: 'catenina' },
    occhiali_sole: { o: 'goccia' }, occhiali_mascherina: { o: 'mascherina' }, occhiali_ovali: { o: 'ovali' }, occhiali_shield: { o: 'shield' },
    cappellino: { c: 'cappellino' }, basco: { c: 'basco' }, fascia: { c: 'fascia' }, orologio_polso: { a: 'orologio' }, anelli: { a: 'braccialetto' }, marsupio: { z: 'marsupio' }, borsetta: { z: 'borsetta' },
    maglione_v: { v: 'maglione_v' }, maglione_collo_alto: { v: 'dolcevita', ptile: 'maglia' }, camicia_righe: { v: 'camicia', ptile: 'righine', col3: '#6a8ac0' }, camicia_vichy: { v: 'camicia', ptile: 'quadri', col3: '#c84a4a' },
    camicia_jeans: { v: 'camicia' }, camicia_fiori: { v: 'camicia', ptile: 'fiori', col3: '#c8584a' },
    cravatta_righe: { k: 'cravatta', dis: 'regimental' }, cravatta_pois: { k: 'cravatta', dis: 'pois' }, cravatta_cachemire: { k: 'cravatta', dis: 'paisley' }, cravatta_fiori: { k: 'cravatta', dis: 'liberty' }, cravatta_maglia: { k: 'cravatta', dis: 'costine' },
    maglietta_oversize: { v: 'maglietta_larga' }, felpa_skate: { v: 'felpa_larga' }, canotta_basket: { v: 'canottiera', ptile: 'righine' }, giacca_tuta: { v: 'tuta_giacca' }, smanicato: { v: 'smanicato' }, piumino_oca: { v: 'piumino' },
    giacca_militare: { v: 'giacca_militare' }, parka: { v: 'parka' }, giacca_toppe: { v: 'giacca_toppe', col2: '#c83a2a' }, gilet_toppe: { v: 'gilet_toppe', col2: '#e8a020' }, chiodo_spille: { v: 'chiodo' },
    cardigan: { v: 'cardigan' }, maglione_fairisle: { v: 'maglione_fairisle', col3: '#8a2a24' }, giacca_lavoro: { v: 'giacca_lavoro' }, salopette: { v: 'salopette' }, tuta_nylon: { v: 'tuta_nylon', col2: '#e8a020' },
    puffer_corto: { v: 'puffer_corto' }, camicia_70: { v: 'camicia_70', ptile: 'fiori', col3: '#5a2a14' }, jeans_risvolto: { v: 'jeans_risvolto' }, pantaloni_mimetici: { v: 'cargo', ptile: 'mimetico', col3: '#2e3424' },
    kefiah: { k: 'sciarpa', kefiah: 1 }, cappello_pescatora: { c: 'bucket' }, anfibi: { s: 'anfibi' }, scarpe_chunky: { s: 'chunky' }, guanti_monchi: { x: 'guanti' }, zaino_tattico: { z: 'zaino' },
    pantaloni_tuta: { v: 'tuta_pantaloni' }, jeans_larghi: { v: 'larghi' }, calze_sport: { v: 'calze_alte' }, scarpe_skate: { s: 'sneakers' }, scarpe_air: { s: 'basket' },
    maglietta_box: { v: 'maglietta_larga', tile: 'box' }, maglietta_college: { v: 'maglietta_larga', tile: 'college' }, maglietta_fiamme: { v: 'maglietta_larga', tile: 's_hotrod' },
    maglietta_tiedye: { v: 'maglietta_larga', tile: 's_arcobaleno' }, maglietta_graffiti: { v: 'maglietta_larga', tile: 's_wild' }, maglietta_ringer: { v: 'maglietta', tile: 'ringer', col2: '#c83a2a', colOrloBr: '#c83a2a' },
    maglietta_resisti: { v: 'maglietta_larga', tile: 'retro', col2: '#c83a2a', col3: '#f0ece2' }, maglietta_tramonto: { v: 'maglietta_larga', tile: 's_vapore' }, maglietta_onda: { v: 'maglietta_larga', tile: 's_onda' }, maglietta_limoni: { v: 'maglietta_larga', tile: 's_limoni' }, maglietta_tattoo: { v: 'maglietta_larga', tile: 's_tattoo' }, maglietta_boombox: { v: 'maglietta_larga', tile: 's_boombox' }, maglia_cross: { v: 'maglietta_larga', tile: 's_cross', braccio: [0, .96, .026] }, felpa_chrome: { v: 'felpa_larga', tile: 's_chrome' }, maglia_lunga: { v: 'sotto_lunga' },
    maglia_basket: { v: 'jersey', col3: '#f0ece2' }, felpa_college: { v: 'felpa_larga', tile: 'felpa_college' }, felpa_blocchi: { v: 'felpa_larga', tile: 'felpa_blocchi' }, felpa_cappuccio_zip: { v: 'felpa', tile: 'zip' },
    felpa_tiedye: { v: 'felpa_larga', tile: 's_arcobaleno' }, varsity: { v: 'varsity', col2: '#e8d040', col3: '#f0ece2' }, coach_jacket: { v: 'coach' }, giacca_raso: { v: 'raso', col2: '#e8a020', col3: '#c83a2a' },
    anorak: { v: 'anorak', col2: '#2a5aa8', col3: '#141418' }, pile: { v: 'pile', col2: '#e8d040', col3: '#141418' }, track_retro: { v: 'track_retro', col2: '#f0ece2', col3: '#c83a2a' }, camicia_bowling: { v: 'bowling', col2: '#e8d040', col3: '#c83a2a' },
    giacca_guscio: { v: 'guscio', col2: '#141418' }, piumino_sacchi: { v: 'guscio_gonfio', col2: '#141418' }, gilet_piuma: { v: 'gilet_piuma', col2: '#141418' }, pantaloni_arrampicata: { v: 'pantaloni_arrampicata', col2: '#e8601a' },
    imbrago: { x: 'imbrago' }, corda: { x: 'corda' }, scarpe_trail: { s: 'trail' }, pile_montagna: { v: 'pile', col2: '#141418', col3: '#141418' },
    pantaloni_paracadute: { v: 'paracadute' }, joggers: { v: 'joggers' }, pantaloncini_basket: { v: 'pantaloncini_basket' }, jeans_carpenter: { v: 'larghi' }, durag: { c: 'durag' }, visiera: { c: 'visiera' },
    cappellino_dritto: { c: 'snapback' }, berretto_corto: { c: 'docker' }, borsello: { z: 'borsello' }, marsupio_tracolla: { z: 'tracolla' }, bandana: { c: 'bandana' },
  };
  // i passamontagna fantasia sono tutti passamontagna (il tipo resta per le punte)
  Object.keys({ passamontagna_punte: 1, passamontagna_orecchie: 1, passamontagna_righe: 1, passamontagna_diavolo: 1, passamontagna_clown: 1, passamontagna_riccio: 1, passamontagna_corna: 1, passamontagna_coniglio: 1, passamontagna_giullare: 1, cappuccio_stelle: 1, passamontagna_pallini: 1 }).forEach(k => { DA_CAPO[k] = { c: k }; });
  // un vestito del Guardaroba (capi dal più interno al più esterno) → la parte "vestiti" del descrittore
  // [personaggi] le varianti: la stessa maglietta o felpa del Guardaroba, a testa sua, con la stampa, la scritta o il motivo e i colori d'accento.
  // Deterministiche (dal seme di chi la porta e dal capo); i giovani le hanno più spesso, gli anziani quasi mai.
  const ACC = ['#e8a020', '#c83a2a', '#2a5aa8', '#f0ece2', '#141418', '#3a8a4a', '#e86a9a', '#8a4ab8', '#e8d040', '#30a8b8', '#e8601a', '#7a1e2a'];
  const lum = c => { if (Array.isArray(c)) return .3 * c[0] + .59 * c[1] + .11 * c[2]; const h = String(c).replace('#', ''), v = i => parseInt(h.length === 3 ? h[i] + h[i] : h.slice(i * 2, i * 2 + 2), 16) / 255 || 0; return .3 * v(0) + .59 * v(1) + .11 * v(2); };
  const VAR = {
    maglietta: [['', 4], ['s_vapore', 2], ['s_wild', 2], ['s_hotrod', 2], ['s_onda', 2], ['s_limoni', 2], ['s_boombox', 2], ['s_acido', 2], ['s_cross', 1.5], ['s_arcobaleno', 1.5], ['s_camo_pop', 1], ['s_righe70', 1.5], ['s_stencil', 1.5], ['s_alieni', 1.5], ['s_tattoo', 2], ['s_pallone', 1.5], ['s_bandana_tutta', 1], ['s_mixtape', 1.5], ['s_chrome', 1.5], ['stampa', 1], ['box', 2], ['college', 2], ['fiamme', 1], ['smiley', 1], ['tramonto', 1], ['retro', 2], ['graffiti', 1], ['ringer', 2], ['calcio', 1], ['p:righe', 1], ['p:rugby', 1], ['p:tiedye', 2], ['p:scacchi', 1], ['p:memphis', 1], ['p:stelle', 1], ['p:leopardo', .6], ['p:paisley', .6]],
    felpa: [['', 3], ['s_wild', 1.5], ['s_vapore', 1], ['s_onda', 1], ['s_acido', 1], ['s_arcobaleno', 1.5], ['s_camo_pop', 1], ['s_stencil', 1], ['s_chrome', 1.5], ['s_tattoo', 1], ['s_hotrod', 1], ['felpa_blocchi', 2], ['felpa_college', 2], ['zip', 2], ['retro', 1.5], ['graffiti', 1], ['p:tiedye', 1], ['p:mimetico', 1], ['p:scacchi', .5], ['p:rugby', .5]],
    bomber: [['', 3], ['raso', 2], ['p:mimetico', 1], ['varsity', 1]],
    tuta_giacca: [['', 2], ['track', 3]],
    canottiera: [['', 6], ['jersey', 2]],
  };
  VAR.maglietta_larga = VAR.maglietta; VAR.felpa_larga = VAR.felpa;
  function variante(v, D, k) {
    const L = VAR[v.tipo]; if (!L || v.tile || v.ptile) return v;
    const r = rng('var' + (D.seme !== undefined ? D.seme : '') + v.tipo + k), eta = D.eta || 30;
    if (r() > (eta < 30 ? .92 : eta < 45 ? .55 : eta < 60 ? .2 : .06)) return v;   // il più delle volte gli anziani restano in tinta unita
    const tot = L.reduce((a, e) => a + e[1], 0); let x = r() * tot, pick = L[0][0]; for (const [id, w] of L) { x -= w; if (x <= 0) { pick = id; break; } }
    // la lunghezza e la manica: lunga fin sotto il sedere, corta sopra l'ombelico (le ragazze), la manica al gomito
    const CL = CAPI[v.tipo] || {}, fem = D.sesso === 'f', q = r();
    if (CL.busto && /maglietta|felpa/.test(v.tipo)) {
      if (q < .22) v.busto = [CL.busto[0] - .1, CL.busto[1], CL.busto[2]];
      else if (fem && q < .5) v.busto = [Math.max(CL.busto[0], 0) + .24, CL.busto[1], CL.busto[2]];
      if (CL.braccio && CL.braccio[1] < .6 && r() < .4) v.braccio = [0, .55, CL.braccio[2] + .004];
    }
    if (!pick) return v;
    const lb = lum(v.col || '#888'), far = ACC.filter(c => Math.abs(lum(c) - lb) > .28), pc = a => a[Math.floor(r() * a.length)];
    const c2 = pc(far.length ? far : ACC), c3 = pc(ACC.filter(c => c !== c2 && Math.abs(lum(c) - lb) > .18)) || '#f0ece2';
    if (pick.startsWith('p:')) return Object.assign(v, { ptile: pick.slice(2), col3: v.col3 || c2 }, /^maglietta/.test(v.tipo) ? { tile: 'maglietta' } : {});
    return Object.assign(v, { tile: pick, col2: pick === 'jersey' ? undefined : v.col2 || c2, col3: v.col3 || c3 }, pick === 'ringer' ? { colOrloBr: c2 } : {});
  }
  function daGuardaroba(outfit, D) {
    D = D || {}; D.vesti = []; D.collo = []; D.schiena = []; D.accessori = D.accessori || [];
    const stretto = outfit.some(c => /^(tuta_ginnastica)$/.test(c.id));
    (outfit || []).forEach(c => { const m = DA_CAPO[c.id]; if (!m) return; const col = c.col || (typeof Guardaroba !== 'undefined' && Guardaroba.CAPO[c.id] && Guardaroba.CAPO[c.id].col) || '#888';
      if (m.v) D.vesti.push(variante(Object.assign({ tipo: m.v, col }, m.ptile ? { ptile: m.ptile } : {}, m.tile ? { tile: m.tile } : {}, m.braccio ? { braccio: m.braccio } : {}, m.col3 ? { col3: m.col3 } : {}, m.col2 ? { col2: m.col2 } : {}, m.colBr ? { colBr: m.colBr } : {}, m.colOrloBr ? { colOrloBr: m.colOrloBr } : {}, c.col2 ? { col2: c.col2 } : {}, c.col3 ? { col3: c.col3 } : {}, c.tile ? { tile: c.tile } : {}, c.ptile ? { ptile: c.ptile } : {}), D, D.vesti.length));
      if (m.e) D.vesti.push({ tipo: m.e, col, col3: '#f0ece2' });
      if (m.c) D.cappello = { tipo: m.c, col };
      if (m.o) { D.occhiali = m.o; D.occhialiCol = c.col; if (c.lente) D.lente = c.lente; }
      if (m.s) D.scarpe = { tipo: m.s, col, col2: m.s === 'basket' || m.s === 'sneakers' ? '#f2eee6' : undefined, col3: c.col2 };
      if (m.k) D.collo.push({ tipo: m.k, col, righe: m.righe, dis: m.dis, kefiah: m.kefiah });
      if (m.z) D.schiena.push({ tipo: m.z, col });
      if (m.a) D.accessori.push(m.a);
      if (m.x === 'imbrago') D.imbrago = { col, col2: c.col2 }; if (m.x === 'corda') D.corda = { col, col2: c.col2 }; if (m.x === 'guanti') D.guanti = col; if (m.x === 'spalle') D.spalle = { col }; if (m.x === 'ginocchia') D.ginocchia = { col };
    });
    if (!D.vesti.some(v => CAPI[v.tipo] && (CAPI[v.tipo].gamba || CAPI[v.tipo].gonna))) D.vesti.push({ tipo: 'pantaloni', col: '#3a3a40' });   // nessuno gira in mutande
    return D;
  }
  // chi è → il descrittore intero. look: l'aspetto del motore; n: l'abitante (età, mestiere, id); outfit: i capi
  function descrittore(look, who, n, outfit) {
    look = look || {}; const id = (n && n.id !== undefined ? n.id : '') + '|' + (look.top || '') + (look.skin || '') + (look.hair || ''), r = rng(id), pk = a => a[Math.floor(r() * a.length)];
    const fem = look.fem !== undefined ? !!look.fem : /long|bun|pony/.test(look.hat || '') || /fem|donna/.test(look.extra || '') || !!(n && n.pop && n.pop.sex === 'f');
    const eta = (n && n.pop && n.pop.age) || look.age || 25 + Math.floor(r() * 40), old = eta > 58, ex = (look.extra || '').split(',');
    const capCol = old && r() < .7 ? pk(GRIGI) : look.hair || pk(CAPELLI);
    const tipoCap = fem ? (old ? pk(['raccolti', 'raccolti', 'caschetto']) : look.hat === 'bun' ? 'raccolti' : look.hat === 'pony' ? 'coda' : pk(['lunghi', 'lunghi', 'coda', 'raccolti', 'caschetto'])) : (old ? pk(['calvo', 'brizzolati', 'indietro']) : pk(['corti', 'corti', 'riga', 'indietro', 'ricci']));
    const D = { seme: id, sesso: fem ? 'f' : 'm', eta, pelle: look.skin || pk(PELLI), capelli: { tipo: tipoCap, col: capCol },
      corpo: { robusto: (look.build || 1) * lerp(.96, 1.05, r()), pancia: !fem && eta > 40 ? r() * .6 : r() * .2, alt: lerp(.95, 1.04, r()), fianchi: fem ? lerp(1, 1.1, r()) : 1 },
      testa: { umore: lerp(-.3, .5, r()), sopracciglia: lerp(-.6, .4, r()) },
      baffi: !fem && (ex.includes('moustache') || (eta > 35 && r() < .3)) ? 'sottili' : null, barba: !fem && r() < (old ? .3 : .12) ? pk(['corta', 'corta', 'pizzetto']) : null,
      occhiali: ex.includes('shades') ? 'sole' : ex.includes('glasses') || (old && r() < .35) ? (r() < .5 ? 'oro' : 'vista') : null, accessori: [] };
    if (!fem && D.barba) D.baffi = D.baffi || 'sottili';
    if (who === 'cop' || (n && (n.cop || n.military))) D.extra = r() < .5 ? ['bandoliera'] : [];
    let of = outfit; if (!of && typeof Guardaroba !== 'undefined') { try { of = Guardaroba.outfitOf(n || { id, look }, fem); } catch (e) { of = null; } }
    daGuardaroba(of || [{ id: 'maglietta', col: look.top }, { id: 'pantaloni', col: look.bottom }, { id: 'scarpe' }], D);
    if (who === 'cop' || (n && n.cop)) { D.cappello = D.cappello && D.cappello.tipo === 'elmetto' ? D.cappello : { tipo: 'regime', col: '#3e463a' }; const dv = D.vesti.find(v => v.tipo === 'divisa'); if (!dv) D.vesti.push({ tipo: 'divisa', col: look.uniform || '#4a5244' }); }
    return Object.assign(D, look.personaggio || {});
  }

  // =====================================================================================
  // LA FIGURA PRONTA: lo scheletro del kit (clip e pose di sempre) con la pelle nuova
  // =====================================================================================
  const POSE = ['Idle', 'Walk', 'Run', 'Death', 'Punch_Right', 'Punch_Left', 'HitRecieve', 'Wave', 'Interact', 'Idle_Gun', 'Run_Shoot', 'Roll', 'Kick_Right'];
  function figura(D, who, raw, aRate) {
    if (!window.Models) return null; const person = raw || RAW || Models.person; kitTeste(person);
    const g = person.call(Models, { model: D.sesso === 'f' ? 'Casual' : 'Casual_2', hat: 'none', extra: '', skin: D.pelle, top: '#888', bottom: '#888', hair: '#222' }, who === 'player' ? 'player' : who === 'cop' ? 'cop' : null);
    if (!g) return null;

    if (aRate) { g.userData.dressing = vesteGen(g, D); g.userData.nuova = true; return g; }   // [fluido] in strada si veste a rate (render.js lo tiene nascosto finché non ha finito)
    veste(g, D); return g;
  }
  const RAW = typeof Models !== 'undefined' && Models.person && !Models.person.__vesti ? Models.person : null;   // il costruttore del kit, prima che Vesti3D lo avvolga
  // =====================================================================================
  // NEL GIOCO: Models.person fa le figure nuove (gli abitanti secondo chi sono, Nino con quello che ha addosso). ?vecchiagente: come prima
  // =====================================================================================
  const ST = () => typeof window !== 'undefined' && window.__pv && window.__pv.st, players = new Set();
  let npcSt = null; const npcByLook = new WeakMap();
  function npcOf(look) { const st = ST(); if (!st || !look) return null; if (npcSt !== st) { npcSt = st; st.npcs.forEach(n => { if (n.look) npcByLook.set(n.look, n); }); } let n = npcByLook.get(look); if (!n) { n = st.npcs.find(k => k.look === look); if (n) npcByLook.set(look, n); } return n || null; }
  const wsig = st => { const W = (st && st.player && st.player.worn) || {}; return JSON.stringify([typeof Guardaroba !== 'undefined' ? Guardaroba.ZORD.map(z => W[z]) : 0, W.sx]); };
  function perGioco(look, who) {
    const st = ST(); let n = null, of = null;
    if (who === 'player' && st && typeof Guardaroba !== 'undefined') { Guardaroba.worn(st); of = Guardaroba.outfitOfPlayer(st); }
    else if (who === 'hazmat') of = [{ id: 'tuta', col: '#c8d23a' }, { id: 'maschera_gas', col: '#3a3e36' }, { id: 'stivali', col: '#2a2e26' }, { id: 'guanti', col: '#2a2e26' }];   // la squadra antigas della Rocca
    else { n = npcOf(look); if (who === 'cop' && n && !n.cop) n = Object.assign({}, n, { cop: true }); }
    return descrittore(Object.assign({}, look || {}, who === 'player' ? { fem: false } : {}), who, n, of);
  }
  function aggancia() {
    if (typeof window === 'undefined' || !CFG.on || !RAW) return;
    const iv = setInterval(() => {
      if (!window.Models || !Models.person || (typeof Vesti3D !== 'undefined' && !Models.person.__vesti)) return; clearInterval(iv);
      const p1 = Models.person;
      Models.person = function (look, who) {
        if (KT.ok || kitTeste(RAW)) try {
          const D = perGioco(look, who), g = figura(D, who, RAW, !!Models.__aRate && who !== 'player');
          if (g && (g.userData.pelle || g.userData.nuova)) { g.userData.look0 = look; if (who === 'player') { players.add(g); g.userData.wsig = wsig(ST()); } return g; }
        } catch (e) { console.error('[Personaggi]', e); }
        return p1.apply(this, arguments);
      };
      Models.person.__vesti = true; Models.person.__personaggi = true;
      const loop = () => { try { const st = ST(); if (st && players.size) { const sg = wsig(st); players.forEach(g => { if (!g.parent && !g.userData.keep) { players.delete(g); return; } if (g.userData.wsig !== sg) { g.userData.wsig = sg; veste(g, perGioco(g.userData.look0, 'player')); } }); } } catch (e) { console.error('[Personaggi] rivestire', e); } requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    }, 50);
  }
  aggancia();
  return { STAT, GEO, perGioco, DA_CAPO, daGuardaroba, KT, CFG, STILI, CAPI, SCARPE, TESTE, figura, veste, geometria, giunture, descrittore, materiale, atlante, POSE, PELLI, CAPELLI, GRIGI, set: (k, v) => { CFG[k] = v; } };
})();
if (typeof module !== 'undefined') module.exports = Personaggi;
