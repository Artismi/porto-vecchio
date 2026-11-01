// [compenetra] LA SONDA DELLE COMPENETRAZIONI STRUTTURALI della città nuova: il gioco vero in Chromium senza testa (?tasselli=0: la città
// costruita nel browser, coi suoi pezzi), poi la misura sulle case come sono in scena (i pezzi delle mesh fuse, girati come la casa).
// Il committente: «un ponte fra due tetti che li compenetra» (sul ciglio: la gronda, il cornicione, il parapetto). Le voci:
//   casa_casa      due case che si sovrappongono in pianta (le impronte girate, oltre 5 cm)
//   sporto_muro    un pezzo di una casa (balcone, scala esterna, cornicione, gronda, portico) dentro il muro di un'altra (oltre 5 cm)
//   sporto_tetto   lo stesso dentro il tetto di un'altra (il solido vero del tetto: la colonna dei raggi sulle sue mesh, gronde e parapetti compresi)
//   complanare     una faccia in su di una casa a filo (±1,5 cm) di una faccia in su di un'altra: lo sfarfallio delle gronde sui muri
//   tetti_ferro    i pezzi di tetti.js (passerelle, ponti, archi, scale di ferro, staffe, pianerottoli) dentro il solido di una casa (oltre 3 cm)
//   capo_sospeso   un capo di passerella o una scala che non arriva: il piede o la testa più di 15 cm sopra (o sotto) il piano vero
//   scala_esterna  la scala della marina: il piede sospeso o sepolto, i gradini su una casella che non li regge
//   strada         un pezzo di casa a terra (sotto 2,5 m) sulla carreggiata, o la casa stessa sulla carreggiata
// Esce reports/sonda_compenetra.json (ogni difetto con la voce, la fonte, le coordinate di gioco x, y in metri e la quota) e il riassunto
// per voce e per fonte.   node strumenti/sonda_compenetra.js [uscita.json]
//   PV_QUERY (per difetto '?cittanuova&tasselli=0'): con &leggera le case fuse si rifanno compattate e molte fette tornano sbagliate
//   (vertici lontani dalla loro casa: si contano a parte, non si misurano). PV_PAGINA=altra.html: un'altra build (il prima).
//   SONDA_PIEDE=0: il piede delle scale alla quota della casella (come prima del [compenetra]), non a quella del terreno disegnato.
// Le voci che contano: sporto_* (oltre 10 cm, dall'aria dentro un'altra casa), tetti_ferro (oltre 10 cm), capo_sospeso, casa_casa;
// a_filo (accostamenti sul filo del muro) e tetti_tocco (sotto i 10 cm) sono informative.
// Dalla pagina già aperta: require('./sonda_compenetra.js').SONDA è la funzione da dare a page.evaluate.
const path = require('path'), http = require('http'), fs = require('fs');

// ======================================================= nella pagina =======================================================
async function SONDA(opz) {
  opz = opz || {};
  const R = window.__pv.R, G = window.__pv.G, TS = G.TS, BR = R.__buildings, T3 = THREE, TT = window.Tetti, gH = R.groundH;
  const D = [], push = d => { d.cm = Math.round(d.d * 100); delete d.d; D.push(d); };
  const r2 = v => Math.round(v * 100) / 100;
  const rotOf = b => b && b.rot && !b.sign && !b.shop ? b.rot : 0;   // come render.js
  // il modulo di muro del kit sporge dal filo della pianta (render.js P2.kit, ~5 cm): il solido della casa è la pianta più quello
  const KIT = Math.max(0, (window.__pulizia2 && window.__pulizia2.kit) || .05);
  // ---- le case: impronta girata (centro, angolo, mezze misure), la base e il filo del muro in cima ----
  const F = [];
  BR.forEach((rec, ri) => { const b = rec.b, g = rec.geo; if (!b || !g) return;
    const a = rec.tier ? 0 : rotOf(b), px = (b.x + b.w / 2) * TS, pz = (b.y + b.h / 2) * TS, lx = g.x0 + g.w / 2 - px, lz = g.z0 + g.d / 2 - pz, c = Math.cos(a), s = Math.sin(a);
    const grp = ['grp', 'roofGrp', 'cityGrp', 'detGrp', 'caseGrp', 'vissutiGrp'].map(k => rec[k]).filter(o => o && o.traverse);
    const meshes = []; grp.forEach(o => { o.updateMatrixWorld(true); o.traverse(m => { if (m.isMesh && !m.isInstancedMesh) meshes.push(m); }); });
    F.push({ k: F.length, ri, rec, b, id: b.id || ('casa' + ri), cx: px + lx * c - lz * s, cz: pz + lx * s + lz * c, a, c, s, hu: g.w / 2, hv: g.d / 2, hk: g.w / 2 + KIT, vk: g.d / 2 + KIT, y0: g.y0, top: g.y0 + g.H, era: b.era || '-', flat: !!rec.flat, tier: !!rec.tier, meshes }); });
  const loc = (f, x, z) => { const dx = x - f.cx, dz = z - f.cz; return [dx * f.c + dz * f.s, -dx * f.s + dz * f.c]; };
  const GR = new Map(), CELL = 8, ck = (i, j) => i * 65536 + j;
  F.forEach(f => { const R0 = Math.hypot(f.hu, f.hv) + 1.2; for (let i = Math.floor((f.cx - R0) / CELL); i <= Math.floor((f.cx + R0) / CELL); i++) for (let j = Math.floor((f.cz - R0) / CELL); j <= Math.floor((f.cz + R0) / CELL); j++) { const k = ck(i, j); let L = GR.get(k); if (!L) GR.set(k, L = []); L.push(f); } });
  const vicine = (x, z) => GR.get(ck(Math.floor(x / CELL), Math.floor(z / CELL))) || [];
  // ---- il solido vero di una casa in una colonna: i raggi dall'alto e dal basso sulle sue mesh (facce doppie), entrare/uscire ----
  const rc = new T3.Raycaster(), o3 = new T3.Vector3(), dn = new T3.Vector3(0, -1, 0), nm = new T3.Matrix3(), nv = new T3.Vector3();
  const sideOld = new Map(); F.forEach(f => f.meshes.forEach(m => { const ms = Array.isArray(m.material) ? m.material : [m.material]; ms.forEach(q => { if (q && !sideOld.has(q)) { sideOld.set(q, q.side); q.side = T3.DoubleSide; } }); }));
  const COL = new Map();
  function colonna(f, x, z) {   // [[y, +1 entra | -1 esce], ...] dall'alto in basso
    const key = f.k + ':' + Math.round(x * 20) + ':' + Math.round(z * 20); let L = COL.get(key); if (L) return L;
    o3.set(x, f.top + 30, z); rc.set(o3, dn); rc.far = 80; L = [];
    for (const m of f.meshes) { if (m.userData.velo || m.userData.noRoof) continue; const geo = m.userData.lazy1 ? m.userData.lazy1() : m.geometry; if (!geo || !geo.attributes || !geo.attributes.position) continue;
      const hs = []; m.raycast(rc, hs); hs.forEach(h => { if (!h.face) return; nm.getNormalMatrix(m.matrixWorld); nv.copy(h.face.normal).applyMatrix3(nm).normalize(); if (Math.abs(nv.y) < .2) return; L.push([h.point.y, nv.y > 0 ? 1 : -1]); }); }
    L.sort((p, q) => q[0] - p[0]); COL.set(key, L); return L;
  }
  // dentro il solido della casa f nel punto (x, y, z)? ritorna la profondità (al bordo più vicino, in verticale o in pianta) o 0
  function dentro(f, x, y, z, tol) {
    const [u, v] = loc(f, x, z), du = f.hk - Math.abs(u), dv = f.vk - Math.abs(v);
    if (du > tol && dv > tol && y > f.y0 + tol && y < f.top - tol) return Math.min(du, dv, y - f.y0, f.top - y);   // il muro, per tutta l'altezza
    if (du < -.9 || dv < -.9 || y < f.top - 1.2 || y > f.top + 12) return 0;
    const L = colonna(f, x, z); let n = 0, sopra = Infinity, sotto = -Infinity;
    for (const [hy, sg] of L) { if (hy > y) { n += sg; sopra = hy; } else { sotto = hy; break; } }
    if (n <= 0) return 0; const d = Math.min(sopra - y, y - sotto, du > 0 && dv > 0 ? 9 : .6);   // fuori dall'impronta (gronde, cornicioni) il solido è una lastra: al massimo 60 cm
    if (sopra - y > .6 && !(du > 0 && dv > 0)) return 0;
    return d > tol ? d : 0;
  }
  // la quota vera del piano su cui si posa (la prima faccia in su delle case lì, o il terreno)
  function piano(x, z, ymax) { let best = gH(x, z); for (const f of vicine(x, z)) { const L = colonna(f, x, z); for (const [hy, sg] of L) if (sg > 0 && hy <= ymax + .05) { if (hy > best) best = hy; break; } } return best; }
  // ---- 1. le case sovrapposte ----
  const angoli = f => [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([i, j]) => [f.cx + i * f.hu * f.c - j * f.hv * f.s, f.cz + i * f.hu * f.s + j * f.hv * f.c]);
  function pen(A, B) { const PA = angoli(A), PB = angoli(B); let p = Infinity;
    for (const Q of [A, B]) for (const t of [Q.a, Q.a + Math.PI / 2]) { const ax = Math.cos(t), az = Math.sin(t); let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
      PA.forEach(q => { const v = q[0] * ax + q[1] * az; a0 = Math.min(a0, v); a1 = Math.max(a1, v); }); PB.forEach(q => { const v = q[0] * ax + q[1] * az; b0 = Math.min(b0, v); b1 = Math.max(b1, v); });
      const o = Math.min(a1, b1) - Math.max(a0, b0); if (o <= 0) return 0; p = Math.min(p, o); } return p; }
  const visti = new Set();
  F.forEach(A => vicine(A.cx, A.cz).forEach(B => { if (B.k <= A.k || visti.has(A.k + ':' + B.k)) return; visti.add(A.k + ':' + B.k); if (A.b.__tierOf === B.b || B.b.__tierOf === A.b || A.tier || B.tier) return;
    const p = pen(A, B); if (p > .05 && Math.min(A.top, B.top) > Math.max(A.y0, B.y0)) push({ cat: 'casa_casa', src: 'pianta:' + (A.a || B.a ? 'girata' : 'dritta'), A: A.id, B: B.id, x: r2((A.cx + B.cx) / 2), y: r2((A.cz + B.cz) / 2), z: r2(Math.min(A.top, B.top)), d: p }); }));
  // ---- 2. i pezzi di ogni casa dentro le altre (muro, tetto), a filo (complanari), sulla carreggiata ----
  const VIA = G.T.VIA, agg = new Map();   // una riga per coppia e per fonte: il punto peggiore e quanti vertici
  const nota = (cat, src, A, B, x, y, z, d) => { const key = cat + '|' + src + '|' + A.id + '|' + (B ? B.id : '-'); const q = agg.get(key); if (q) { q.n++; if (d > q.d) Object.assign(q, { x, y, z, d }); return; } agg.set(key, { cat, src, A: A.id, B: B ? B.id : '-', x, y, z, d, n: 1 }); };
  const fonte = (A, gk, x, y, z) => { const [u, v] = loc(A, x, z), fuori = Math.max(Math.abs(u) - A.hk, Math.abs(v) - A.vk);
    const dove = y > A.top - .6 ? (A.flat ? 'ciglio' : 'gronda') : y < A.y0 + 3.2 ? 'pianterreno' : 'facciata';
    return gk + ':' + dove + (fuori > .02 ? ':sporge' : ':filo'); };
  // [compenetra] per triangoli: un vertice dentro un'altra casa conta solo se lo stesso triangolo ha un vertice all'aperto (fuori dalla
  // sua casa e da tutte le altre). Dentro due muri che si toccano (i moduli del kit che sporgono, le lesene sullo spigolo) non si vede niente;
  // un cornicione, una gronda o un balcone che entra nel muro o nel tetto del vicino partendo dall'aria si vede.
  let WS = new Float32Array(0), SB = new Int32Array(0), SD = new Float32Array(0); const LONTANI = { n: 0, c: {} };
  for (const A of F) {
    const gruppi = [['casa', A.rec.grp], ['tetto', A.rec.roofGrp], ['citta', A.rec.cityGrp], ['dettagli', A.rec.detGrp], ['vestito', A.rec.caseGrp], ['vissuti', A.rec.vissutiGrp]].filter(q => q[1] && q[1].traverse);
    for (const [gk, g0] of gruppi) { g0.traverse(m => { if (!m.isMesh || m.isInstancedMesh) return; const geo = m.userData.lazy1 ? m.userData.lazy1() : m.geometry; const P = geo && geo.attributes && geo.attributes.position; if (!P) return; const me = m.matrixWorld.elements, n = P.count;
      if (WS.length < n * 3) { WS = new Float32Array(n * 3); SB = new Int32Array(n); SD = new Float32Array(n); }
      for (let i = 0; i < n; i++) { const lx = P.getX(i), ly = P.getY(i), lz = P.getZ(i), x = me[0] * lx + me[4] * ly + me[8] * lz + me[12], y = me[1] * lx + me[5] * ly + me[9] * lz + me[13], z = me[2] * lx + me[6] * ly + me[10] * lz + me[14];
        WS[i * 3] = x; WS[i * 3 + 1] = y; WS[i * 3 + 2] = z; SB[i] = -1; SD[i] = 0;   // -1 all'aperto, -2 dentro la sua casa, k dentro la casa F[k]
        const [ua, va] = loc(A, x, z); if (Math.abs(ua) > A.hk + 2.2 || Math.abs(va) > A.vk + 2.2) { SB[i] = -3; LONTANI.n++; LONTANI.c[A.id] = (LONTANI.c[A.id] || 0) + 1; continue; }   // [compenetra] un pezzo a più di 2 m dalla sua casa non è suo (la fetta della mesh fusa rifatta male: si conta a parte)
        if (Math.abs(ua) < A.hk + .02 && Math.abs(va) < A.vk + .02 && y > A.y0 - 2 && y < A.top + .02) SB[i] = -2;
        // sulla carreggiata: i pezzi a terra fuori dall'impronta
        if (y < A.y0 + 2.5 && (Math.abs(ua) > A.hu + .25 || Math.abs(va) > A.hv + .25) && G.tileAt(Math.floor(x / TS), Math.floor(z / TS)) === VIA) nota('strada', fonte(A, gk, x, y, z), A, null, r2(x), r2(z), r2(y), Math.max(Math.abs(ua) - A.hu, Math.abs(va) - A.hv));
        for (const B of vicine(x, z)) { if (B === A || A.b.__tierOf === B.b || B.b.__tierOf === A.b) continue;
          const [u, v] = loc(B, x, z); if (Math.abs(u) > B.hu + .9 || Math.abs(v) > B.hv + .9) continue;
          const du = B.hk - Math.abs(u), dv = B.vk - Math.abs(v); let d = 0;
          if (du > 0 && dv > 0 && y > B.y0 && y < B.top) d = Math.min(du, dv, y - B.y0, B.top - y);
          else if (y >= B.top - 1.2 && y <= B.top + 12) d = dentro(B, x, y, z, 0);
          if (d > .005 && d > SD[i]) { SD[i] = d; SB[i] = B.k; } } }
      const I = geo.index, nt = Math.floor((I ? I.count : n) / 3), vi = k => I ? I.getX(k) : k;
      for (let t = 0; t < nt; t++) { const a = vi(t * 3), b = vi(t * 3 + 1), c = vi(t * 3 + 2);
        if (SB[a] !== -1 && SB[b] !== -1 && SB[c] !== -1) continue; let w = -1; for (const q of [a, b, c]) if (SB[q] >= 0 && (w < 0 || SD[q] > SD[w])) w = q; if (w < 0 || SD[w] < .05) continue;
        const B = F[SB[w]], x = WS[w * 3], y = WS[w * 3 + 1], z = WS[w * 3 + 2], [u, v] = loc(B, x, z), muro = B.hk - Math.abs(u) > 0 && B.vk - Math.abs(v) > 0 && y < B.top;
        nota(muro ? 'sporto_muro' : 'sporto_tetto', fonte(A, gk, x, y, z), A, B, r2(x), r2(z), r2(y), SD[w]); } }); }
    // la casa sulla carreggiata
    for (let u = -A.hu + .3; u <= A.hu - .3; u += .5) for (let v = -A.hv + .3; v <= A.hv - .3; v += .5) { const x = A.cx + u * A.c - v * A.s, z = A.cz + u * A.s + v * A.c; if (G.tileAt(Math.floor(x / TS), Math.floor(z / TS)) === VIA) nota('strada', 'pianta:casa_su_via', A, null, r2(x), r2(z), r2(A.y0), Math.min(A.hu - Math.abs(u), A.hv - Math.abs(v))); }
  }
  // [compenetra] sotto i 10 cm non si vede (la cornice che arriva al muro del vicino); col vertice sul filo della sua casa è un accostamento
  // (la falda o il parapetto di A che finisce sotto la copertina o la gronda di B: il difetto, se c'è, si conta dalla parte di B)
  agg.forEach(q => { if (q.cat === 'strada' && q.src !== 'pianta:casa_su_via' && q.d < .3) return; if (/^sporto/.test(q.cat) && q.d < .1) return; if (/^sporto/.test(q.cat) && /:filo$/.test(q.src)) q.cat = 'a_filo'; push(q); });
  // ---- 3. i pezzi di tetti.js (istanze di scatole): passerelle, ponti, archi, scale di ferro e staffe, pianerottoli ----
  const NOMI = ['ferro', 'pioli', 'gabbia', 'giallo', 'lampade', 'assi', 'corda', 'bandiere', 'crema', 'traccia', 'fondo', 'pietra', 'terra', 'verde', 'lastrico'];
  const GM = (TT && TT._ && TT._.GFX && TT._.GFX.meshes) || [], PL = (TT && TT.PLANKS) || [], LA = (TT && TT.LADDERS) || [];
  const chiDi = (x, z) => { let best = null, bd = 1.2;   // la passerella o la scala più vicina
    PL.forEach(P => { const dx = x - P.x0, dz = z - P.y0, s = Math.max(0, Math.min(P.L, dx * P.ox + dz * P.oy)), t = Math.abs(-dx * P.oy + dz * P.ox) - P.hw, dd = Math.max(0, t, Math.hypot(dx - P.ox * s, dz - P.oy * s) - P.hw - .1); if (dd < bd) { bd = dd; best = (P.tipo4 || (P.arco ? 'arco' : 'passerella')) + '#' + P.i; } });
    LA.forEach(L => { const dd = Math.min(Math.hypot(x - L.x, z - L.y), Math.hypot(x - L.tx, z - L.ty), Math.hypot(x - L.fx, z - L.fy)) - .8; if (dd < bd) { bd = dd; best = 'scala#' + L.i; } });
    return best || 'tetti'; };
  const m4 = new T3.Matrix4(), cv = new T3.Vector3(), agg3 = new Map();
  // le cose del registro di render.js rimaste al taglio (R.__vis3.reg: antenne e mensole della rete, insegne, pluviali, tende, tettoie, pezzi
  // grandi, con la loro scatola orientata): anche queste contro i pezzi di tetti.js. Le scatole vuote dentro (tende, tettoie, balconi) no
  const REG = new Map(), VUOTE = /^(grande|tenda|tettoia|bucato|festone|balcone|ingombro|scorcio_filo|arredo)$/;
  ((R.__vis3 && R.__vis3.reg) || []).forEach(e => { const Q = e.B; if (!Q || VUOTE.test(e.k)) return; const cs = [[Q.u0, Q.v0], [Q.u1, Q.v0], [Q.u1, Q.v1], [Q.u0, Q.v1]].map(([u, v]) => [u * Q.c + v * Q.s, -u * Q.s + v * Q.c]);
    const xs = cs.map(c => c[0]), zs = cs.map(c => c[1]); for (let i = Math.floor(Math.min(...xs) / CELL); i <= Math.floor(Math.max(...xs) / CELL); i++) for (let j = Math.floor(Math.min(...zs) / CELL); j <= Math.floor(Math.max(...zs) / CELL); j++) { const k = ck(i, j); let L = REG.get(k); if (!L) REG.set(k, L = []); L.push(e); } });
  GM.forEach((im, mi) => { const nome = NOMI[mi] || ('gfx' + mi); if (!im || !im.count || /traccia|fondo|lastrico|bandiere|lampade/.test(nome)) return;
    for (let i = 0; i < im.count; i++) { im.getMatrixAt(i, m4); let peg = null, aperto = false;
      for (const [a, b, c] of [[0, 0, 0], [-.5, -.5, -.5], [.5, -.5, -.5], [-.5, -.5, .5], [.5, -.5, .5], [-.5, .5, -.5], [.5, .5, -.5], [-.5, .5, .5], [.5, .5, .5], [0, -.5, 0], [0, .5, 0], [-.5, 0, 0], [.5, 0, 0], [0, 0, -.5], [0, 0, .5]]) {
        cv.set(a, b, c).applyMatrix4(m4); const x = cv.x, y = cv.y, z = cv.z; let dm = 0, Bm = null;
        for (const B of vicine(x, z)) { const d = dentro(B, x, y, z, 0); if (d > dm) { dm = d; Bm = B; } }
        for (const e of REG.get(ck(Math.floor(x / CELL), Math.floor(z / CELL))) || []) { const Q = e.B, u = x * Q.c - z * Q.s, v = x * Q.s + z * Q.c, d = Math.min(u - Q.u0, Q.u1 - u, v - Q.v0, Q.v1 - v, y - Q.y0, Q.y1 - y); if (d > dm) { dm = d; Bm = { id: 'reg:' + e.k + (e.tipo ? ':' + e.tipo : '') }; } }
        if (!Bm) aperto = true; else if (dm > .03 && (!peg || dm > peg.d)) peg = { x, y, z, d: dm, B: Bm }; }
      if (!peg || !aperto) continue;   // [compenetra] tutta dentro (nascosta) o tutta fuori: niente; un pezzo che entra dall'aria in una casa si vede
      { const { x, y, z, d, B } = peg, chi = chiDi(x, z), key = chi + '|' + nome + '|' + B.id, q = agg3.get(key);
        if (q) { q.n++; if (d > q.d) Object.assign(q, { x: r2(x), y: r2(z), z: r2(y), d }); } else agg3.set(key, { cat: 'tetti_ferro', src: chi.split('#')[0] + ':' + nome, chi, A: chi, B: B.id, x: r2(x), y: r2(z), z: r2(y), d, n: 1 }); } } });
  agg3.forEach(q => { if (q.d < .1) q.cat = 'tetti_tocco'; push(q); });   // [compenetra] sotto i 10 cm il ferro tocca (la copertina, la fascia): si conta a parte
  // ---- 4. i capi che non arrivano: le passerelle (il piede delle scalette sul lastrico) e le scale (il piede e la testa) ----
  PL.forEach(P => { if (!P.prof) return; const K = P.prof.k; [[0, K[0][1]], [P.L, K[K.length - 1][1]]].forEach(([s, h]) => { const x = P.x0 + P.ox * s, z = P.y0 + P.oy * s, p = piano(x, z, h + .3), d = h - .08 - p;   // le pedate posano a 8 cm (fa = lastrico + 8)
    if (Math.abs(d) > .15) push({ cat: 'capo_sospeso', src: (P.tipo4 || 'passerella') + ':capo', A: (P.tipo4 || 'passerella') + '#' + P.i, B: '-', x: r2(x), y: r2(z), z: r2(h), d: Math.abs(d), segno: d > 0 ? 'sospeso' : 'sepolto' }); }); });
  LA.forEach(L => { if (L.rampa) return; const fx = L.x + L.ox * .38, fz = L.y + L.oy * .38; let yb = TT._.footH ? TT._.footH(L) : null; if (yb == null) return;
    if (L.footB < 0 && !L.camm && opz.piedeVero !== false) { const g = gH(L.x + L.ox * .4, L.y + L.oy * .4); if (Number.isFinite(g) && Math.abs(g - yb) > .08 && Math.abs(g - yb) < 3) yb = g; }   // come buildLaddersGfx: il piede disegnato
    const p = piano(fx, fz, yb + .3), d = yb - p;
    if (Math.abs(d) > .15) push({ cat: 'capo_sospeso', src: 'scala:piede', A: 'scala#' + L.i, B: '-', x: r2(fx), y: r2(fz), z: r2(yb), d: Math.abs(d), segno: d > 0 ? 'sospeso' : 'sepolto' }); });
  // ---- 5. la scala esterna della marina (render.js epScala): il piede sul terreno, i gradini su caselle che li reggono ----
  const RUN = (MG => Math.round((MG - .2) / .26) * .22);
  F.forEach(f => { const X = f.b.__ep, S = X && X.scala; if (!S || !S.ok) return;
    const FY = { S: 0, N: Math.PI, E: Math.PI / 2, W: -Math.PI / 2 }, g = f.rec.geo, L = { S: g.w, N: g.w, E: g.d, W: g.d }[S.f];
    const p0 = S.f === 'S' ? [g.x0, g.z0 + g.d] : S.f === 'N' ? [g.x0 + g.w, g.z0] : S.f === 'E' ? [g.x0 + g.w, g.z0 + g.d] : [g.x0, g.z0];   // il frame del lato (u lungo il muro, n fuori), non girato
    const yaw = FY[S.f], ux = Math.cos(yaw), uz = -Math.sin(yaw), nx = Math.sin(yaw), nz = Math.cos(yaw), px = (f.b.x + f.b.w / 2) * TS, pz = (f.b.y + f.b.h / 2) * TS;
    const mondo = (u, n) => { const lx = p0[0] + ux * u + nx * n - px, lz = p0[1] + uz * u + nz * n - pz; return [px + lx * f.c - lz * f.s, pz + lx * f.s + lz * f.c]; };
    const MG = 3.2, run = RUN(MG), uE = S.u + S.dir * (.65 + run);
    for (const [u, n, k] of [[uE, .5, 'piede'], [uE, 1.0, 'piede'], [S.u + S.dir * .65, .9, 'gradini'], [S.u, 1.05, 'pianerottolo']]) { const [x, z] = mondo(u, n), t = G.tileAt(Math.floor(x / TS), Math.floor(z / TS));
      if (k === 'piede') { const d = f.y0 - gH(x, z); if (Math.abs(d) > .2) push({ cat: 'scala_esterna', src: 'epScala:' + (d > 0 ? 'piede_sospeso' : 'piede_sepolto'), A: f.id, B: '-', x: r2(x), y: r2(z), z: r2(f.y0), d: Math.abs(d) }); }
      if (t === G.T.BLD || t === G.T.WATER || t === VIA || t === G.T.STAIRS) push({ cat: 'scala_esterna', src: 'epScala:casella_' + (Object.keys(G.T).find(q => G.T[q] === t) || t), A: f.id, B: '-', x: r2(x), y: r2(z), z: r2(f.y0), d: .5 }); } });
  // ---- 6. i pezzi grandi del registro di render.js (portici, archi, mura, tettoie, pensiline: window.__pulizia2.grandi) contro le case e fra loro ----
  const GRd = window.__pulizia2 && window.__pulizia2.grandi;
  if (GRd) { (GRd.case || []).forEach(q => push({ cat: 'pezzo_casa', src: q[0], A: q[0], B: String(q[3]).replace(/^casa /, ''), x: q[1], y: q[2], z: 0, d: q[4] / 100 }));
    (GRd.controPezzi || []).concat(GRd.fra || []).forEach(q => push({ cat: 'pezzo_pezzo', src: q[0], A: q[0], B: '-', x: q[1], y: q[2], z: 0, d: q[3] / 100 })); }
  sideOld.forEach((s, q) => { q.side = s; });
  // ---- il riassunto ----
  const perCat = {}, perSrc = {}; D.forEach(d => { perCat[d.cat] = (perCat[d.cat] || 0) + 1; const k = d.cat + ' ' + d.src; perSrc[k] = (perSrc[k] || 0) + 1; });
  return { case: F.length, passerelle: PL.length, scale: LA.length, lontani: LONTANI, perCat, perSrc, difetti: D.sort((p, q) => p.cat < q.cat ? -1 : p.cat > q.cat ? 1 : q.cm - p.cm) };
}
module.exports = { SONDA };
if (require.main !== module) return;

// ======================================================= in Node =======================================================
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const root = path.resolve(__dirname, '..'), outJ = path.resolve(process.argv.slice(2).find(a => a.endsWith('.json')) || path.join(root, 'reports', 'sonda_compenetra.json'));
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.webp': 'image/webp' };
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const t0 = Date.now(), b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: 480, height: 300 } });
  pg.on('pageerror', e => console.log('[errore]', e.message));
  pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) console.log('[console]', m.text().slice(0, 300)); });
  await pg.goto(`http://localhost:${srv.address().port}/${process.env.PV_PAGINA || 'index.html'}${process.env.PV_QUERY || '?cittanuova&tasselli=0'}`, { timeout: 600000, waitUntil: 'commit' });
  await pg.waitForFunction(() => window.__tl && window.__tl.gioco, null, { timeout: 1200000, polling: 2000 });
  console.log('caricato in', Math.round((Date.now() - t0) / 1000), 's');
  const t1 = Date.now(), O = await pg.evaluate(SONDA, { piedeVero: process.env.SONDA_PIEDE !== '0' });
  console.log('misurato in', Math.round((Date.now() - t1) / 1000), 's:', O.case, 'case,', O.passerelle, 'passerelle,', O.scale, 'scale');
  if (O.lontani && O.lontani.n) console.log('vertici lontani dalla loro casa (le fette rifatte dalla mesh fusa che non tornano):', O.lontani.n, 'in', Object.keys(O.lontani.c).length, 'case');
  fs.mkdirSync(path.dirname(outJ), { recursive: true }); fs.writeFileSync(outJ, JSON.stringify(O, null, 1));
  console.log('\nper voce:'); Object.entries(O.perCat).sort((a, c) => c[1] - a[1]).forEach(([k, n]) => console.log('  ' + k.padEnd(16) + n));
  console.log('\nper fonte:'); Object.entries(O.perSrc).sort((a, c) => c[1] - a[1]).forEach(([k, n]) => console.log('  ' + k.padEnd(44) + n));
  console.log('\ni peggiori per voce:'); const per = {}; O.difetti.forEach(d => { (per[d.cat] = per[d.cat] || []).push(d); });
  Object.entries(per).forEach(([k, L]) => { console.log('  ' + k); L.slice(0, 8).forEach(d => console.log(`    ${String(d.cm).padStart(4)} cm  ${d.src.padEnd(30)} ${d.A} → ${d.B}  (${d.x}, ${d.y}) quota ${d.z}${d.n ? '  ×' + d.n : ''}`)); });
  console.log('\nsalvato', path.relative(root, outJ));
  await b.close(); srv.close();
});
