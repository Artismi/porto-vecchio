/* Porto Vecchio — I vestiti dipinti sul corpo.
   Niente gusci sopra il corpo: il vestito È la superficie del personaggio, dipinta. Così non ci sono compenetrazioni,
   il corpo si piega come è stato fatto, le misure sono quelle esatte del modello.
   Per ogni modello si rifanno una volta le mesh del corpo: triangoli separati, raggruppati per regione
   (busto, braccio sinistro e destro, gamba sinistra e destra; testa, mani e piedi restano col loro materiale)
   e con le coordinate di stoffa: giro attorno all'osso e lunghezza lungo l'osso (le stesse della Sartoria).
   Per ogni persona si dipingono cinque tele (busto, braccia, gambe) a strati, dal capo più interno al più esterno:
   tessuto vero (Sartoria.TESS), orli, cuciture, colletti, revers, bottoni, tasche, cinture, polsini, costine, ombre e pieghe.
   Il rilievo (bumpMap) viene dalla stessa pittura: cuciture e bordi incavati, trama del tessuto.
   Restano oggetti veri solo le cose che sporgono davvero: cappelli, falde di gonne e cappotti, scarpe, accessori. */
var Pittura = (function () {
  'use strict';
  const S = () => window.Sartoria;
  const cl = (x, a, b) => x < a ? a : x > b ? b : x, lerp = (a, b, t) => a + (b - a) * t, sm = t => t * t * (3 - 2 * t);
  const rgb = c => { const C = new THREE.Color(c); return [C.r, C.g, C.b]; };
  const mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)], mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const REG = ['T', 'AL', 'AR', 'LL', 'LR'];
  const SIZE = { T: [256, 320], AL: [64, 256], AR: [64, 256], LL: [96, 320], LR: [96, 320] };   // ~3,5 mm per pixel: bordi precisi   // ~7 mm per pixel: pixel grossi e netti

  // =====================================================================================
  // LE MESH DEL CORPO CON LE COORDINATE DI STOFFA (una volta per modello e per mesh)
  // =====================================================================================
  const GEO = new Map();
  function regionOf(B, i) {
    const p = B.part[i]; if (!p) return -1;
    if (p === 'torso' || p === 'collo' || p === 'bacino') return 0;
    if (p === 'braccia' || p === 'avambracci') return B.side[i] > 0 ? 1 : 2;
    if (p === 'cosce' || p === 'polpacci') return B.side[i] > 0 ? 3 : 4;
    return -1;
  }
  function frame(B) {   // i tubi e gli intervalli di ogni regione
    if (B.pit) return B.pit; const Sa = S(), T = Sa.tube(B, 'tronco');
    const sLo = T.sAtY(B.crotch - .14), sHi = T.sAtY((B.bones.Head ? B.bones.Head.y : 1.55) + .02);
    const tubes = [T, Sa.tube(B, 'manicaL'), Sa.tube(B, 'manicaR'), Sa.tube(B, 'gambaL'), Sa.tube(B, 'gambaR')];
    const circ = tb => { let best = 0; for (let i = 0; i <= tb.ns; i += 4) { let t = 0; for (let k = 0; k < tb.R[i].length; k++) t += tb.R[i][k]; best = Math.max(best, t / tb.R[i].length); } return best * Math.PI * 2; };
    B.pit = { tubes, range: [[sLo, sHi], [0, tubes[1].L], [0, tubes[2].L], [0, tubes[3].L], [0, tubes[4].L]], circ: tubes.map(circ) };
    return B.pit;
  }
  // il profilo "stirato" di un tubo: lisciato lungo l'asse e attorno, chiuso a involucro (niente conche, gradini, muscoli)
  const IRON = new Map();
  function ironed(tb) {
    if (IRON.has(tb)) return IRON.get(tb); const n = tb.ns, RG = tb.R[0].length, ds = tb.ds;
    const win = (A, w, f) => A.map((r, i) => { const o = new Float32Array(RG); for (let q = 0; q < RG; q++) { let m = f === 'min' ? 9 : 0; for (let k = -w; k <= w; k++) { const v = A[cl(i + k, 0, n)][q]; m = f === 'min' ? Math.min(m, v) : Math.max(m, v); } o[q] = m; } return o; });
    // apertura (minimo poi massimo su ±4 cm): via i rigonfiamenti stretti (orli gonfi, tasche, risvolti dei vestiti del kit), restano spalle, petto, glutei
    const w = Math.max(1, Math.round(.06 / ds));
    let R = win(win(tb.R, w, 'min'), w, 'max');
    const sg = Math.max(1, Math.round(.03 / ds));
    R = R.map((r, i) => { const o = new Float32Array(RG); for (let q = 0; q < RG; q++) { let a = 0, ww = 0; for (let k = -2 * sg; k <= 2 * sg; k++) { const g = Math.exp(-k * k / (2 * sg * sg)); a += R[cl(i + k, 0, n)][q] * g; ww += g; } o[q] = a / ww; } return o; });
    R = R.map(r => { const o = new Float32Array(RG); for (let q = 0; q < RG; q++) o[q] = (r[(q + RG - 2) % RG] + 2 * r[(q + RG - 1) % RG] + 3 * r[q] + 2 * r[(q + 1) % RG] + r[(q + 2) % RG]) / 9; return o; });
    IRON.set(tb, R); return R;
  }
  function ironRadius(R, tb, s, a) { const RG = R[0].length, fi = cl(s / tb.ds, 0, tb.ns), i0 = Math.floor(fi), i1 = Math.min(tb.ns, i0 + 1), t = fi - i0, fs = (((a / (Math.PI * 2)) * RG) % RG + RG) % RG, q0 = Math.floor(fs), q1 = (q0 + 1) % RG, u = fs - q0;
    return lerp(lerp(R[i0][q0], R[i0][q1], u), lerp(R[i1][q0], R[i1][q1], u), t); }
  // la posizione stirata di un vertice del corpo (per la sua parte, così un vertice condiviso va sempre nello stesso posto)
  function ironPos(B, g, out) {
    const r = regionOf(B, g); out.set(B.P[g * 3], B.P[g * 3 + 1], B.P[g * 3 + 2]); if (r < 0) return out;
    const F = frame(B), tb = F.tubes[r], q = axial(tb, out), fr = S().frameAt(tb, q.s), R = ironed(tb), rr = ironRadius(R, tb, q.s, q.a); q.r = q.r !== undefined ? q.r : out.clone().sub(fr.p).length(); q.i = q.s / tb.ds;
    // vicino a mani, piedi, collo (dove il corpo resta com'è) lo stiro sfuma
    let k = 1; if (r > 0) k = cl((tb.L - q.i * tb.ds) / .06, 0, 1) * cl(q.i * tb.ds / .05, 0, 1); else { const ny = S().neckY(B); k = cl((ny - out.y) / .04, 0, 1); }
    const d = cl(rr - q.r, -.06, .03) * k; if (Math.abs(d) < 1e-5 || q.r < 1e-4) return out;
    const dir = out.clone().sub(fr.p); dir.addScaledVector(fr.t, -dir.dot(fr.t)); dir.normalize(); return out.addScaledVector(dir, d);
  }
  // la proiezione esatta sull'asse: il campione il cui piano perpendicolare passa per il punto (non il più vicino in linea d'aria,
  // che sbaglia per i punti lontani dall'asse, come gli orli svasati del kit)
  function axial(tb, p) {
    let best = -1, bs = 9, bd = 9; const v = new THREE.Vector3();
    for (let i = 0; i < tb.ns; i++) { const a = v.copy(p).sub(tb.S[i]).dot(tb.T[i]), b = v.copy(p).sub(tb.S[i + 1]).dot(tb.T[i + 1]);
      if (a >= 0 && b <= 0) { const t = a / (a - b + 1e-12), q = tb.S[i].clone().lerp(tb.S[i + 1], t), d = q.distanceTo(p); if (d < bd) { bd = d; bs = (i + t) * tb.ds; best = i; } } }
    if (best < 0) { const q = tb.proj(p); return { s: q.i * tb.ds, a: q.a, i: q.i }; }
    const i = Math.round(bs / tb.ds), fr = S().frameAt(tb, bs), r = v.copy(p).sub(fr.p); r.addScaledVector(fr.t, -r.dot(fr.t));
    return { s: bs, a: Math.atan2(r.dot(fr.sd), r.dot(fr.f)), i, r: r.length() };
  }
  function paintGeo(B, src, si) {
    const key = B.key + '|' + si; if (GEO.has(key)) return GEO.get(key);
    const geo = src.userData.geo0 || src.geometry, gm = B.gmaps[si]; if (!gm) { GEO.set(key, null); return null; }
    const F = frame(B), idx = geo.index ? geo.index.array : null, nt = (idx ? idx.length : geo.attributes.position.count) / 3;
    const v = new THREE.Vector3(), ironCache = [], byReg = [[], [], [], [], [], []];   // 0..4 regioni, 5 = resta com'è
    for (let t = 0; t < nt; t++) {
      const c = [0, 1, 2].map(k => idx ? idx[t * 3 + k] : t * 3 + k), r = c.map(q => gm[q] >= 0 ? regionOf(B, gm[q]) : -1);
      const cnt = {}; r.forEach(x => { cnt[x] = (cnt[x] || 0) + 1; }); let best = -1, bn = 0; for (const k in cnt) if (cnt[k] > bn) { bn = cnt[k]; best = +k; }
      byReg[best < 0 ? 5 : best].push(t);
    }
    const attrs = geo.attributes, out = new THREE.BufferGeometry(), N = nt * 3, keys = Object.keys(attrs).filter(k => k !== 'uv');
    const arr = {}; keys.forEach(k => { arr[k] = new attrs[k].array.constructor(N * attrs[k].itemSize); });
    const UV = new Float32Array(N * 2), SRC = new Int32Array(N), order = [], groups = [];
    let w = 0;
    byReg.forEach((L, reg) => {
      if (!L.length) return; const start = w;
      L.forEach(t => {
        const c = [0, 1, 2].map(k => idx ? idx[t * 3 + k] : t * 3 + k);
        // coordinate di stoffa dei tre angoli nel tubo della regione del triangolo (stesso tubo: niente strappi)
        let uu = [0, 0, 0], vv = [0, 0, 0];
        if (reg < 5) {
          const tb = F.tubes[reg], [s0, s1] = F.range[reg];
          c.forEach((q, k) => { const g = gm[q]; if (g >= 0) v.set(B.P[g * 3], B.P[g * 3 + 1], B.P[g * 3 + 2]); else v.fromBufferAttribute(attrs.position, q).applyMatrix4(B.rel); const P0 = axial(tb, v); uu[k] = (P0.a + Math.PI) / (Math.PI * 2); vv[k] = (P0.s - s0) / (s1 - s0); });
          if (Math.max(...uu) - Math.min(...uu) > .5) uu = uu.map(x => x < .5 ? x + 1 : x);   // il triangolo a cavallo della cucitura dietro
        }
        c.forEach((q, k) => { keys.forEach(a => { const sz = attrs[a].itemSize; for (let j = 0; j < sz; j++) arr[a][w * sz + j] = attrs[a].array[q * sz + j]; });
          const g = gm[q]; if (g >= 0 && reg < 5) { let L = ironCache[q]; if (!L) { L = ironCache[q] = ironPos(B, g, new THREE.Vector3()).applyMatrix4(B.reli).toArray(); } arr.position[w * 3] = L[0]; arr.position[w * 3 + 1] = L[1]; arr.position[w * 3 + 2] = L[2]; }
          SRC[w] = q; UV[w * 2] = uu[k]; UV[w * 2 + 1] = vv[k]; w++; });
      });
      groups.push({ start, count: w - start, materialIndex: reg < 5 ? 1 + reg : 0 });
    });
    keys.forEach(a => out.setAttribute(a, new THREE.BufferAttribute(arr[a], attrs[a].itemSize, attrs[a].normalized)));
    out.setAttribute('uv', new THREE.BufferAttribute(UV, 2)); groups.forEach(gr => out.addGroup(gr.start, gr.count, gr.materialIndex));
    // normali lisce sulla forma stirata (stoffa continua, non triangoli a caso): somma delle facce per punto, saldando i vertici doppi delle cuciture del kit
    { const PA = arr.position, NA = arr.normal, inReg = new Uint8Array(N); groups.forEach(gr => { if (gr.materialIndex > 0) for (let k = gr.start; k < gr.start + gr.count; k++) inReg[k] = 1; });
      const key = k => Math.round(PA[k * 3] * 1e6) + ',' + Math.round(PA[k * 3 + 1] * 1e6) + ',' + Math.round(PA[k * 3 + 2] * 1e6), acc = new Map(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
      for (let k = 0; k < N; k += 3) { if (!inReg[k]) continue; a.fromArray(PA, k * 3); b.fromArray(PA, k * 3 + 3); c.fromArray(PA, k * 3 + 6); const n = b.clone().sub(a).cross(c.clone().sub(a));   // pesata con l'area
        for (let j = 0; j < 3; j++) { const kk = key(k + j); let v = acc.get(kk); if (!v) acc.set(kk, v = new THREE.Vector3()); v.add(n); } }
      for (let k = 0; k < N; k++) { if (!inReg[k]) continue; const v = acc.get(key(k)); if (!v || v.lengthSq() < 1e-30) continue; const n = v.clone().normalize(); NA[k * 3] = n.x; NA[k * 3 + 1] = n.y; NA[k * 3 + 2] = n.z; } }
    out.boundingSphere = geo.boundingSphere; out.boundingBox = geo.boundingBox; out.userData.pittura = true;
    // le parti del kit che non sono pelle (cappuccio della felpa, scarpe del kit…) rimaste fuori dalle regioni: si possono nascondere
    const ms = Array.isArray(src.material) ? src.material : [src.material], mname = (src.userData.pitOrig ? (Array.isArray(src.userData.pitOrig.mat) ? src.userData.pitOrig.mat[0] : src.userData.pitOrig.mat) : ms[0]).name || '';
    const res = { geo: out, regs: groups.filter(g => g.materialIndex > 0).map(g => g.materialIndex - 1), SRC, kitCloth: !/Head/i.test(src.name) && !/^(Skin|Eye|Eyebrows|Hair|Moustache)/i.test(mname), groups };   // mai le mesh della testa (capelli col nome di un colore, es. 'Red')
    GEO.set(key, res); return res;
  }

  // =====================================================================================
  // LA PITTURA
  // =====================================================================================
  const D = '#ece8dc';
  // un capo dipinto: in quale regione e dove (s in metri lungo il tubo, angolo) copre, e come
  function plan(B, c, k, all) {
    const Sa = S(), CUT = Sa.CUT_(), base = CUT[c.id] || { cl: 1, fab: 'cotone' }, C = Object.assign({ id: c.id }, base, c.var || {});
    const P = new Set(c.parti || []), F = frame(B), T = F.tubes[0], L = {};
    C.col = c.col; C.A = rgb(c.col || '#808080'); ['aperta', 'fab', 'c2', 'c3', 'usura', 'tasche', 'fronte', 'collo', 'polsi'].forEach(k => { if (c[k] !== undefined && k !== 'fab' || (k === 'fab' && c.fabV)) C[k] = k === 'fab' ? c.fabV : c[k]; });
    const l = C.A[0] * .3 + C.A[1] * .59 + C.A[2] * .11; C.B = rgb(C.c2 || (l > .5 ? '#2a2a30' : D)); C.C = rgb(C.c3 || (l > .5 ? '#5a5a60' : '#a8a090'));
    const trous = !C.gonna && !C.solo_gonna && P.has('bacino') && (C.cl === 2 || P.has('cosce')), top = P.has('torso') && !C.solo_gonna;
    if (top) {
      const Ls = Sa.lengths(B, T, 'tronco', C, [...P]);
      let yb = Ls.yb; if (C.gonna || C.poncho) yb = B.waist - .02;   // la falda la fa la geometria
      if (C.cl <= 1 && all.some(o => (CUT[o.id] || {}).cl === 2 && (o.parti || []).includes('bacino'))) { yb = B.waist - .02; C.infilata = 1; }   // infilata nei pantaloni
      L.T = { s0: T.sAtY(yb), s1: Ls.s1, yb, yt: Ls.yt };
    }
    if (trous || C.solo_gonna) L.T = Object.assign(L.T || {}, { p0: T.sAtY(B.crotch - .12), p1: T.sAtY(B.waist + .03) });
    for (const sd of ['L', 'R']) {
      if (top && !C.smanicato && !C.davanti && (P.has('braccia') || P.has('avambracci'))) { const tb = F.tubes[sd === 'L' ? 1 : 2], Ls = Sa.lengths(B, tb, 'manica' + sd, C, [...P]); if (Ls.s1 > .02) L['A' + sd] = Ls; }
      if (trous || C.velo || C.stretti && P.has('cosce')) { const tb = F.tubes[sd === 'L' ? 3 : 4], Ls = Object.assign({}, Sa.lengths(B, tb, 'gamba' + sd, C, [...P])); Ls.s1 = Math.min(Ls.s1, tb.L - .035); L['L' + sd] = Ls; }
      if (C.pettorina) { /* la salopette: pettorina dipinta sul busto */ L.T = Object.assign(L.T || {}, { bib: 1 }); }
      // giacche e cappotti che scendono sotto l'inforcatura, gonne e falde: continuano dipinti sulle cosce
      // (sotto le falde la gamba ha la stessa stoffa: se passa attraverso, non si vede)
      const hem = C.gonna || C.solo_gonna || C.poncho ? (Sa.lengths(B, T, 'gonna', C, [...P]).yb) : (L.T && L.T.yb !== undefined && L.T.s0 !== undefined && L.T.yb < B.waist + .02 ? L.T.yb : null);   // ogni capo che scende sotto la vita continua sulle cosce fino al suo orlo
      if (hem !== null && hem !== undefined && !L['L' + sd]) L['L' + sd] = { falda: hem, s1: 9, kn: 0, sCr: 0 };
    }
    C.L = L; return C;
  }
  // lo scollo (quanto scende dalla base del collo) per angolo, come nella Sartoria
  function neckDrop(C, a) {
    const fa = Math.cos(a), c = C.collo; let d = 0;
    if (c === 'v' || c === 'revers' || c === 'revers_pelle' || c === 'camicia_aperta') { const w = c === 'v' ? .55 : .7, dep = c === 'v' ? .1 : c === 'camicia_aperta' ? .11 : .2; if (Math.abs(a) < w) d = dep * (1 - Math.abs(a) / w); }
    if (c === 'giro' || c === 'polo' || c === 'camicia' || c === 'alto_zip' || c === 'cappuccio' || c === 'giro') d = Math.max(0, fa) * .025;
    if (c === 'barca') d = Math.max(0, Math.abs(fa)) * .02;
    if (c === 'canotta' || C.spalline_sottili) { const sa = Math.abs(Math.abs(a) - Math.PI / 2); d = sa < .75 ? 0 : Math.max(0, fa) * .1 + .03; if (sa >= .75 && fa < 0) d = .05; }
    if (c === 'alto') d = -.07; if (c === 'alto_zip') d = -.04;
    // ai lati e dietro lo scollo sale sul trapezio fino alla base del collo (niente pelle sulle spalle)
    if (!/canotta|barca/.test(c || '') && !C.spalline_sottili) d -= .018 * (1 - Math.max(0, fa));
    return d;
  }
  // il colore del tessuto in un punto (metri): la piastrella del tessuto della Sartoria
  // il colore della stoffa in un punto (metri), a campiture: 2-3 toni a blocchi grossi, motivi grandi e leggibili
  const hsh = (a, b) => { let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  function fabric(C, xm, ym) {
    const A = C.A, B = C.B, Cc = C.C, tone = 1;   // tinta unita (i corpi del kit sono già irregolari: niente macchie sopra)
    let c = A, h = .5; const f = C.fab;
    const md = (v, m) => ((v % m) + m) % m;
    if (f === 'righe') c = md(ym, .06) < .02 ? A : B;   // marinara: righe orizzontali
    else if (f === 'righe_v') c = md(xm, .08) < .04 ? A : B;
    else if (f === 'gessato') { if (md(xm, .07) < .006) c = mixc(A, B, .28); }
    else if (f === 'tartan' || f === 'madras' || f === 'galles') { const bx = md(xm, .14) < .045, by = md(ym, .14) < .045, tx = md(xm, .14) > .09 && md(xm, .14) < .1, ty = md(ym, .14) > .09 && md(ym, .14) < .1; c = bx && by ? mul(B, .85) : bx || by ? mixc(A, B, .6) : A; if (tx || ty) c = mixc(c, Cc, .8); }
    else if (f === 'vichy' || f === 'pied') { const bx = md(xm, .05) < .025, by = md(ym, .05) < .025; c = bx && by ? B : bx || by ? mixc(A, B, .5) : A; }
    else if (f === 'fiori' || f === 'liberty' || f === 'paisley' || f === 'pois') { const cs = f === 'fiori' ? .09 : .05, cx = Math.floor(xm / cs), cy = Math.floor(ym / cs), r = hsh(cx * 7 + 3, cy * 13 + 1), ox = (hsh(cx, cy * 3) - .5) * cs * .4, oy = (hsh(cx * 5, cy) - .5) * cs * .4, d = Math.hypot(md(xm, cs) - cs / 2 - ox, md(ym, cs) - cs / 2 - oy); if (d < cs * (f === 'pois' ? .2 : .32)) c = r < .5 ? B : Cc; else if (f === 'fiori' && d < cs * .45 && r > .6) c = mixc(Cc, [.15, .3, .15], .5); }
    else if (f === 'maculato') { const cs = .06, cx = Math.floor(xm / cs), cy = Math.floor(ym / cs), ox = (hsh(cx, cy * 3) - .5) * cs * .5, oy = (hsh(cx * 5, cy) - .5) * cs * .5, d = Math.hypot(md(xm, cs) - cs / 2 - ox, md(ym, cs) - cs / 2 - oy); if (d < cs * .16) c = Cc; else if (d < cs * .3) c = B; }
    else if (f === 'etnico') { const y0 = md(ym, .2); if (y0 < .02 || (y0 > .1 && y0 < .115)) c = Cc; else if (y0 > .03 && y0 < .08) { const z = Math.abs(md(xm, .06) - .03) + Math.abs(y0 - .055); c = z < .022 ? B : A; } }
    else if (f === 'piumino') { const t = md(ym, .07); c = mul(A, t < .008 ? .62 : .9 + .18 * Math.sin(t / .07 * Math.PI)); h = t < .008 ? .1 : .5 + .4 * Math.sin(t / .07 * Math.PI); }
    else if (f === 'velluto' || f === 'costine' || f === 'trecce') { if (md(xm, .02) < .007) { c = mul(A, .86); h = .3; } else h = .7; }
    else if (f === 'denim') c = mul(A, md(xm + ym, .007) < .0035 ? .97 : 1.02);   // saia sottile, uniforme
    else if (f === 'pelo' || f === 'montone') { c = mul(A, .85 + hsh(Math.floor(xm / .015), Math.floor(ym / .04)) * .3); }
    return [...mul(c, tone), h];
  }
  // dipinge le cinque tele di una persona. W[reg] = { c: Uint8ClampedArray rgba, h: bump }
  function paint(B, outfit, skin) {
    const F = frame(B), SK = rgb(skin || '#dcae88'), Sa = S(), CUT = Sa.CUT_();
    const list = outfit.filter(c => c.parti && c.parti.some(p => /torso|braccia|avambracci|bacino|cosce|polpacci|collo/.test(p)));
    // ordine degli strati (come la Sartoria): classe, poi l'ordine scelto
    const ranked = list.map((c, i) => ({ c, r: ((CUT[c.id] || {}).cl || 1) * 10 + i * .01 })).sort((a, b) => a.r - b.r).map(o => o.c);
    const plans = ranked.map((c, k) => plan(B, c, k, ranked));
    const nY = Sa.neckY(B), out = {};
    const shoe = outfit.find(c => /^(scarpe|scarpe_eleganti|scarpe_tela|scarpe_corsa|mocassini)/.test(c.id)), sock = outfit.find(c => c.id === 'calzini' || c.id === 'calze_nylon' || c.id === 'calzamaglia');
    const ankle = shoe ? rgb(sock && sock.col || '#2a2a2e') : null;
    const bt = outfit.find(c => /^stivali/.test(c.id)), boots = bt ? { top: bt.id === 'stivali' ? .34 : .3, col: rgb(bt.col || '#2a1e18'), risv: bt.id !== 'stivali' } : null;
    REG.forEach((R, ri) => {
      const [W, H] = SIZE[R], tb = F.tubes[ri], [s0, s1] = F.range[ri], circ = F.circ[ri], col = new Uint8ClampedArray(W * H * 4), hh = new Uint8ClampedArray(W * H * 4);
      for (let py = 0; py < H; py++) {
        const sv = lerp(s0, s1, (py + .5) / H), fr = S().frameAt(tb, sv), y = fr.p.y;
        for (let px = 0; px < W; px++) {
          const u = (px + .5) / W, a = u * Math.PI * 2 - Math.PI, xm = u * circ, i = (py * W + px) * 4;
          let c = SK, h = .5, shade = 1;
          // ombre del corpo: ascelle, inforcatura, interno coscia
          let top = -1;
          for (let k = plans.length - 1; k >= 0; k--) {
            const C = plans[k], r = paintAt(B, C, R, ri, a, sv, y, xm, nY, tb); if (!r) continue;
            c = r.c; h = r.h; shade = r.s; top = k; break;
          }
          // il colletto della camicia esce sopra il maglione o la giacca (se quelli non hanno il collo alto)
          if (R === 'T' && top >= 0) for (let k = 0; k < top; k++) { const C = plans[k]; if (!/^(camicia|polo|camicia_aperta)$/.test(C.collo || '')) continue;
            const O = plans[top]; if (/alto|cappuccio|montone|pelo/.test(O.collo || '')) break;
            const tip = Math.abs(a) < .55 ? (.55 - Math.abs(a)) * .08 : 0, dy = nY - neckDrop(C, a) - y, oy = nY - neckDrop(O, a) - y;
            if (dy >= 0 && dy < .035 + tip && oy < .012 + tip * .7) { const f0 = fabric(C, xm, sv); c = mul([f0[0], f0[1], f0[2]], 1.06); h = .7; shade = (dy > .031 + tip || dy < .003) ? .7 : 1; } }
          if (R === 'T') { const side = Math.max(0, Math.abs(Math.sin(a)) - .7) / .3, arm = cl(1 - Math.abs(y - (nY - .2)) / .1, 0, 1); shade *= 1 - .18 * side * arm; }
          if (R[0] === 'L') { const inner = cl(1 - Math.abs(a - (R === 'LL' ? -Math.PI / 2 : Math.PI / 2)) / .9, 0, 1), up = cl(1 - (sv - .1) / .25, 0, 1); shade *= 1 - .15 * inner * up; }
          // sotto l'orlo, con le scarpe: il calzino (niente caviglia nuda che sbuca dietro la scarpa)
          if (R[0] === 'L' && ankle && top < 0 && y < .16) { c = ankle; h = .5; shade = y < .06 ? .8 : 1; }
          // gli stivali: il gambale dipinto sul polpaccio, sopra i pantaloni, con l'orlo dritto
          if (R[0] === 'L' && boots && y < boots.top) { const e = boots.top - y, f0 = boots.col; c = mul(f0, .95 + .1 * (hsh(Math.floor(xm / .03), Math.floor(y / .03)) > .6 ? 1 : 0)); h = .6; shade = e < .008 ? .55 : e < .03 && boots.risv ? 1.08 : 1; top = -1; if (y < .05) shade *= .5; }
          // ---- il volume dipinto, come nella pixel art: luce di forma, pieghe, toni a gradini, contorni ----
          if (top >= 0) {
            const C = plans[top], fa = Math.cos(a - .45);   // luce da davanti-sinistra
            
            
            if (R !== 'T' || y < nY - .03) shade *= 1 - .08 * cl((Math.abs(Math.sin(a)) - .75) / .25, 0, 1);   // i fianchi girano nell'ombra
          }
          // toni a gradini (pixel art): niente sfumature continue
          
          col[i] = c[0] * 255 * shade; col[i + 1] = c[1] * 255 * shade; col[i + 2] = c[2] * 255 * shade; col[i + 3] = 255;
          hh[i] = hh[i + 1] = hh[i + 2] = cl(h, 0, 1) * 255; hh[i + 3] = 255;
        }
      }
      out[R] = { W, H, col, hh };
    });
    return { out, plans };
  }
  // le pieghe disegnate: tratti scuri dove la stoffa si raccoglie (sopra la cintura, al cavallo, ai gomiti, alle caviglie, sotto le ascelle)
  function fold(B, C, R, a, sv, y, xm, nY) {
    const md = (v, m) => ((v % m) + m) % m, stroke = (d, w) => Math.abs(d) < w;
    let k = 1;
    if (R === 'T') {
      // la maglia o la camicia che si gonfia sopra la cintura: archi corti orizzontali
      if (C.cl !== 2 && y > B.waist && y < B.waist + .07 && Math.abs(Math.sin(a)) < .85) { const ph = md(xm + Math.sin(y * 90) * .01, .07); if (stroke(ph - .035, .006) && md(y, .03) < .012) k *= .8; }
      // le pieghe a raggiera dall'ascella verso il petto
      const yA = nY - .2; if (C.cl !== 2 && y > yA - .08 && y < yA + .03 && Math.abs(Math.abs(a) - 1.25) < .35) { const t = (Math.abs(a) - 1.25) * .12 + (y - yA) * .6; if (stroke(md(t, .025) - .0125, .004)) k *= .82; }
      // il cavallo dei pantaloni: tratti obliqui
      if (C.cl === 2 && y < B.crotch + .07 && y > B.crotch - .02 && Math.abs(a) < .6) { const t = Math.abs(a) * .14 - (B.crotch + .07 - y) * .7; if (stroke(md(t, .03) - .015, .004)) k *= .8; }
    }
    if (R[0] === 'A') {
      const tb = frame(B).tubes[R === 'AL' ? 1 : 2], la = tb.sNear(B.bones['LowerArm' + R[1]]);
      if (Math.abs(sv - la) < .05) { const t = (sv - la) + Math.cos(a) * .01; if (stroke(md(t, .022) - .011, .004)) k *= .8; }
      if (sv > la + .06) { const t = sv + Math.sin(a * 2) * .02; if (stroke(md(t, .07) - .035, .0035) && Math.cos(a) < .3) k *= .86; }   // pieghe lunghe sull'avambraccio
    }
    if (R[0] === 'L') {
      const sd = R[1], tb = frame(B).tubes[R === 'LL' ? 3 : 4], kn = tb.sNear(B.bones['LowerLeg' + sd]), an = tb.sNear(B.ankle[sd]);
      if (Math.abs(sv - kn) < .06 && Math.cos(a) < 0) { const t = (sv - kn) + Math.sin(a) * .01; if (stroke(md(t, .025) - .0125, .004)) k *= .8; }
      if (an - sv < .1 && an - sv > 0 && C.cl === 2) { const t = (an - sv) - Math.abs(Math.sin(a)) * .03; if (stroke(md(t, .035) - .0175, .004)) k *= .78; }   // la "rottura" del pantalone sulla scarpa
      if (sv < .2 && sv > .05) { const t = sv + a * .03; if (stroke(md(t, .06) - .03, .003) && Math.abs(Math.sin(a)) > .5) k *= .86; }
    }
    return k;
  }
  // il cuore: cosa c'è dipinto nel punto (a, sv) della regione R per il capo C (null = il capo non copre qui)
  function paintAt(B, C, R, ri, a, sv, y, xm, nY, tb) {
    const L = C.L, dark = (c, k) => mul(c, k);
    const line = (d, w) => Math.abs(d) < w;   // una cucitura larga w metri
    let base = null, edge = 9;
    if (R === 'T') {
      const T = L.T; if (!T) return null;
      const inTop = T.s0 !== undefined && (() => { const top = nY - neckDrop(C, a); return y >= T.yb - (C.orlo === 'punte' && Math.abs(a) < .5 ? .04 * (1 - Math.abs(a) / .5) : 0) && y <= top; })();
      const inPel = T.p0 !== undefined && sv >= T.p0 && sv <= T.p1 && (C.solo_gonna || y > B.crotch - .02 - .07 * Math.pow(Math.abs(Math.sin(a)), 1.5));
      const inBib = T.bib && Math.abs(a) < .72 && y < B.bones.Chest.y + .04 && y > B.waist - .02;
      if (!inTop && !inPel && !inBib) return null;
      if (C.aperta && inTop && Math.abs(a) < .3) return null;   // aperta davanti: si vede quello che c'è sotto
      if (inTop) edge = Math.min(y - T.yb, nY - neckDrop(C, a) - y);
      if (inPel && !inTop) edge = Math.min(B.waist + .03 - y, 9);
    } else if (R[0] === 'A') {
      const Ls = L[R]; if (!Ls || sv > Ls.s1) return null; edge = Ls.s1 - sv;
    } else {
      const Ls = L[R]; if (!Ls) return null;
      if (Ls.falda !== undefined) { if (y < Ls.falda) return null; const f0 = fabric(C, xm, sv); const e = y - Ls.falda; let c0 = [f0[0], f0[1], f0[2]], h0 = .3 + f0[3] * .4, s0 = e < .008 ? .5 : e < .02 ? .88 + .12 * (e - .008) / .012 : 1;
        if (C.costine && e < .05) { const rib = .5 + .5 * Math.sin(xm / .006 * Math.PI); c0 = mul(C.A, .82 + rib * .22); h0 = rib; }
        if ((C.cl >= 4 || C.poncho) && !C.costine && e >= .008 && e < .04) s0 *= .72;
        return { c: c0, h: h0, s: s0 }; }
      if (sv > Ls.s1) return null; edge = Ls.s1 - sv;
    }
    let f = fabric(C, xm, sv); let c = [f[0], f[1], f[2]], h = .3 + f[3] * .4, s = 1;
    // l'orlo: piega scura e un filo d'ombra prima
    if (edge < .008) { s *= .5; h = .1; } else if (edge < .02) s *= .88 + .12 * (edge - .008) / .012;
    // i capi pesanti hanno la bordura scura all'orlo (come nei riferimenti)
    if ((C.cl >= 4 || C.poncho) && !C.costine && edge >= .008 && edge < .04) s *= .72;
    const R2 = Math.PI / 2;
    if (R === 'T') {
      const xf = a * .14;
      if (C.aperta) { const ea = Math.abs(a) - .3; if (ea < .06) { s *= ea < .03 ? .55 : .85; h = .2; }   // il bordo aperto (con la zip)
        if (Math.abs(Math.abs(a) - .42) < .04 && y > nY - .17 && y < nY - .02) { c = [.92, .9, .86]; s = 1; h = .7; } }   // i cordini del cappuccio   // metri dal centro davanti (all'incirca, sul petto)
      // cuciture laterali
      if (line(Math.abs(a) - R2, .012) && C.fab !== 'piumino') { s *= .82; h = .15; }
      // costine all'orlo e allo scollo (maglioni, felpe)
      if (C.costine && y - (L.T.yb || 0) < .05 && y >= L.T.yb) { const rib = .5 + .5 * Math.sin(xm / .006 * Math.PI); c = mul(C.A, .82 + rib * .22); h = rib; }
      if (/giro|barca|canotta/.test(C.collo || '') && nY - neckDrop(C, a) - y < .018) { const rib = .5 + .5 * Math.sin(xm / .005 * Math.PI); c = mul(C.A, .85 + rib * .2); h = rib; if (nY - neckDrop(C, a) - y < .008) s *= .6; }
      // colletto della camicia e della polo: fascia che gira, punte davanti
      if ((C.collo === 'camicia' || C.collo === 'polo' || C.collo === 'camicia_aperta') && L.T.s0 !== undefined) {
        const top = nY - neckDrop(C, a), dy = top - y, tip = Math.abs(a) < .55 ? (.55 - Math.abs(a)) * .08 : 0, wcol = .035 + tip;
        if (dy < wcol && dy >= 0) { c = mul(C.A, 1.06); if (dy > wcol - .008 || dy < .007) { s *= .68; h = .1; } else h = .7; if (Math.abs(a) < .05) { s *= .7; } }
      }
      // revers: le due ali lungo la V
      if (/revers/.test(C.collo || '') && L.T.s0 !== undefined) {
        const top = nY - neckDrop(C, a), dy = top - y, lap = .06 + (.2 - Math.min(.2, nY - y)) * .25;
        if (Math.abs(a) < 1.15 && dy >= 0 && dy < lap && y > nY - .24) { c = mul(C.A, 1.1); h = .75; if (dy > lap - .009) { s *= .55; h = .05; } if (dy < .008) { s *= .7; } const notch = Math.abs(nY - .07 - y) < .006 && dy > lap * .4; if (notch) { s *= .55; } }
        else if (Math.abs(a) < 1.15 && dy >= lap && dy < lap + .012 && y > nY - .24) { s *= .8; }   // l'ombra sotto il revers
      }
      // abbottonatura: listino e bottoni; doppio petto; zip
      const fr = C.fronte;
      if (fr && L.T.s0 !== undefined && y < nY - neckDrop(C, 0) - .01 && y > L.T.yb + .01) {
        if (fr === 'zip' || fr === 'zip_obl') { const ax = fr === 'zip_obl' ? a + (y - B.waist) * 1.2 - .25 : a; if (Math.abs(ax) < .025) { const tooth = Math.floor(y / .004) % 2; c = tooth ? [.75, .75, .72] : [.15, .15, .16]; h = .8; s = 1; } else if (Math.abs(ax) < .04) { s *= .85; h = .2; } }
        else {
          const dbl = fr === 'doppio', step = fr === 'polo' ? .03 : .085, yTop = nY - neckDrop(C, 0) - .02, ylo = fr === 'polo' ? yTop - .08 : L.T.yb;
          if (!dbl && line(a - .03, .006) && y > ylo) { s *= .78; h = .1; }   // il bordo del listino
          if (dbl && line(a - .6, .008) && y > L.T.yb) { s *= .78; h = .1; }
          if (y > ylo) for (let yy = yTop; yy > ylo + .02; yy -= step) { for (const ax of dbl ? [-.42, .42] : [0]) { const dx = (a - ax) * .14, dyb = y - yy, r = Math.hypot(dx, dyb); if (r < (C.cl >= 4 ? .015 : .011)) { const metal = /oro|rame/.test(fr); c = metal ? [.78, .62, .25] : C.cl >= 4 ? [.12, .1, .1] : [.9, .88, .84]; h = 1 - r / .012; s = r > .011 ? .6 : 1; } } }
        }
      }
      // tasche: petto, giacca, cappotto
      (C.tasche || []).forEach(t => {
        const chestY = B.bones.Chest.y - .03, hipY = B.bones.Hips.y;
        const box = (ax0, ax1, y0, y1, flap) => { for (const sd of [-1, 1]) { const aa = a * sd; if (aa < ax0 || aa > ax1 || y < y0 || y > y1) continue; const e = Math.min((aa - ax0) * .14, (ax1 - aa) * .14, y - y0, y1 - y); if (e < .008) { s *= .7; h = .1; } else if (flap && y1 - y < .03) { s *= y1 - y < .033 && y1 - y > .027 ? .7 : .95; h = .7; } } };
        if (t === 'petto') { const aa = a; if (aa > .32 && aa < .7 && y > chestY - .07 && y < chestY + .02) { const e = Math.min((aa - .32) * .14, (.7 - aa) * .14, y - chestY + .07, chestY + .02 - y); if (e < .008) { s *= .75; h = .1; } } }
        if (t === 'petto2') box(.3, .72, chestY - .07, chestY + .03, 1);
        if (t === 'giacca' || t === 'cappotto' || t === 'divisa') box(.4, .95, hipY - .02 + (t === 'cappotto' ? -.04 : .02), hipY + .015 + (t === 'cappotto' ? -.04 : .02), 1);
        if (t === 'canguro' && Math.abs(a) < .9 && y < B.waist + .1 && y > (L.T.yb || 0) + .05) { const e = Math.min((.9 - Math.abs(a)) * .14, B.waist + .1 - y); if (e < .004) { s *= .7; h = .1; } }
      });
      // la cintura (pantaloni) e i passanti
      if (C.cl === 2 && C.cintura && y > B.waist - .005 && y < B.waist + .028 && !C.solo_gonna) {
        const leather = /cuoio|jeans/.test(C.cintura); c = leather ? [.28, .17, .1] : mul(C.A, .7); h = .6; s = 1;
        if (y < B.waist - .002 || y > B.waist + .025) s *= .65;
        if (Math.abs(a) < .14 && y > B.waist + .002 && y < B.waist + .022) { const e = Math.min(.14 - Math.abs(a), Math.abs(y - B.waist - .012)); c = [.82, .76, .55]; s = Math.abs(a) > .1 || Math.abs(y - B.waist - .012) > .007 ? 1 : .35; h = .9; }
        for (const pa of [-2.6, -1.5, -.6, .6, 1.5, 2.6, Math.PI]) if (Math.abs(a - pa) < .05) { c = mul(C.A, .9); s = .85; }
      }
      // pantaloni sul busto (bacino): patta, tasche oblique, tasche dietro, cuciture
      if (C.cl === 2 && !C.solo_gonna && y < B.waist - .005) {
        if (a > .03 && a < .2 && y > B.crotch + .015 && line(a - (.2 - Math.pow(cl((B.crotch + .07 - y) / .055, 0, 1), 3) * .17), .012)) { s *= .72; h = .1; }   // la patta a J
        if (line(a, .008) && y < B.crotch + .08) { s *= .82; }
        if ((C.tasche || []).includes('oblique') || (C.tasche || []).includes('jeans')) for (const sd of [-1, 1]) { const aa = a * sd, t0 = (B.waist - y) / .09; if (t0 > 0 && t0 < 1 && line(aa - lerp(.62, 1.3, t0), .03)) { s *= .62; h = .1; } }
        if ((C.tasche || []).includes('jeans')) for (const sd of [-1, 1]) { const aa = Math.PI - a * sd; if (aa > .2 && aa < .75 && y < B.waist - .03 && y > B.waist - .14) { const e = Math.min((aa - .2) * .14, (.75 - aa) * .14, B.waist - .03 - y, y - B.waist + .14); if (e < .008) { c = C.cuciture ? rgb(C.cuciture) : c; s *= C.cuciture ? 1 : .7; h = .1; } } }
      }
      // pettorina della salopette e bretelle
      if (L.T.bib) { if (Math.abs(a) < .72 && y > B.bones.Chest.y + .03) { s *= .7; } }
    }
    if (R[0] === 'A') {
      const Ls = L[R], end = Ls.s1;
      if (C.polsi && end - sv < .045 && end > Ls.la) { c = mul(C.A, 1.04); h = .7; if (end - sv > .042 || end - sv < .003) { s *= .7; h = .1; } }
      if (C.costine && end - sv < .05 && end > Ls.la) { const rib = .5 + .5 * Math.sin(xm / .006 * Math.PI); c = mul(C.A, .82 + rib * .22); h = rib; }
      if (C.bande && Math.abs(Math.abs(a) - R2) < .25 && sv < end - .05) { c = rgb(C.bande); h = .6; }
      // pieghe al gomito (dentro) e alla spalla: archi più scuri


      if (sv < .02) { s *= .8; h = .15; }   // l'attaccatura alla spalla
    }
    if (R[0] === 'L') {
      const Ls = L[R], end = Ls.s1, sg = R === 'LL' ? 1 : -1;
      if (line(Math.abs(a) - R2, .02)) { s *= C.cuciture ? 1 : .82; if (C.cuciture) c = mixc(c, rgb(C.cuciture), .7); h = .15; }   // cucitura laterale
      if (C.banda && Math.abs(a - sg * R2) < .12) { c = rgb(C.banda); h = .6; }
      if (C.piega && line(a, .015)) { s *= 1.08; h = .9; }
      const kn = Math.abs(sv - Ls.kn);   // (niente tratti dipinti dietro il ginocchio: le pieghe le dà la forma)
      /* niente chiazze: i jeans sono uniformi */
      if (C.risvolto && end - sv < .04) { c = mul(c, 1.04); if (end - sv > .037 || end - sv < .003) { s *= .65; h = .1; } }
      if ((C.tasche || []).includes('cargo')) { const sk = Ls.sCr + (Ls.kn - Ls.sCr) * .45, aa = a - sg * R2; if (Math.abs(aa) < .6 && sv > sk - .07 && sv < sk + .07) { const e = Math.min((.6 - Math.abs(aa)) * .07, sv - sk + .07, sk + .07 - sv); if (e < .008) { s *= .7; h = .1; } else if (sk + .07 - sv < .03) { s *= .93; h = .7; if (Math.abs(sk + .07 - sv - .03) < .002) s *= .7; } } }
    }
    return { c, h, s };
  }

  // =====================================================================================
  // APPLICARE: mesh del corpo rifatte, materiali per persona (tele dipinte)
  // =====================================================================================
  const MCACHE = new Map(); let mcount = 0;
  function mats(sig, P) {
    if (MCACHE.has(sig)) return MCACHE.get(sig);
    const M = REG.map(R => {
      const { W, H, col, hh } = P.out[R], mk = (data) => { const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d'), id = x.createImageData(W, H); id.data.set(data); x.putImageData(id, 0, 0);
        const T = new THREE.CanvasTexture(cv); T.flipY = false; T.wrapS = THREE.RepeatWrapping; T.wrapT = THREE.ClampToEdgeWrapping; T.magFilter = THREE.NearestFilter; T.minFilter = THREE.NearestMipmapLinearFilter; T.anisotropy = 4; return T; };
      const m = new THREE.MeshLambertMaterial({ map: mk(col), bumpMap: mk(hh), bumpScale: .0015 }); m.emissive = new THREE.Color('#2a2622'); m.userData.pittura = true; return m;
    });
    MCACHE.set(sig, M); if (++mcount > 160) { const k = MCACHE.keys().next().value; MCACHE.delete(k); }
    return M;
  }
  // veste g dipingendo il corpo. Ritorna i piani (per sapere cosa c'è, es. le falde da fare in geometria)
  function dipingi(g, outfit, look, PARTI) {
    const Sa = S(); if (!Sa) return null; const B = Sa.body(g, PARTI); if (!B) return null;
    const srcs = []; g.traverse(o => { if (o.isSkinnedMesh && !o.userData.vesti) srcs.push(o); });
    const skin = (look && look.skin) || '#dcae88';
    const sig = B.key + '|' + skin + '|' + JSON.stringify(outfit.map(c => [c.id, c.col, c.parti]));
    let P = null, M = MCACHE.get(sig); if (!M) { P = paint(B, outfit, skin); M = mats(sig, P); }
    if (!B.welded) { B.welded = 1; weld(B, g, srcs); }
    srcs.forEach((src, si) => {
      const pg = paintGeo(B, src, si); if (!pg) return;
      if (!src.userData.pitOrig) src.userData.pitOrig = { geo: src.userData.geo0 || src.geometry, mat: src.material };
      const m0 = Array.isArray(src.userData.pitOrig.mat) ? src.userData.pitOrig.mat[0] : src.material;
      // quello che sta sotto scarpe e guanti (e i resti dei vestiti del kit sotto i nostri) si toglie davvero: un indice per persona
      const hid = src.userData.hid, gpos = pg.geo.attributes.position, idx = [], grp = [], gmS = B.gmaps[si] || [], closed = outfit.some(c => /^(scarpe|scarpe_eleganti|scarpe_tela|scarpe_corsa|mocassini|tacchi|stivali|stivali_pelle|stivali_cowboy)$/.test(c.id));
      const keepT = (w0, reg) => { const q = [pg.SRC[w0], pg.SRC[w0 + 1], pg.SRC[w0 + 2]]; if (hid && hid.length && q.every(x => hid[x])) return false;
        if (closed && reg === 0 && q.some(x => { const b = gmS[x]; return b >= 0 && B.part[b] === 'piedi'; })) return false;   // dentro le scarpe vere
        if (reg === 0 && pg.kitCloth) { const y = (gpos.getY(w0) + gpos.getY(w0 + 1) + gpos.getY(w0 + 2)) / 3; const yy = new THREE.Vector3(gpos.getX(w0), y, gpos.getZ(w0)).applyMatrix4(B.rel).y; if (yy > .3) return false; }   // vestiti del kit fuori dalle regioni (non i piedi)
        return true; };
      pg.groups.forEach(gr => { const st = idx.length; for (let w0 = gr.start; w0 < gr.start + gr.count; w0 += 3) if (keepT(w0, gr.materialIndex)) idx.push(w0, w0 + 1, w0 + 2); if (idx.length > st) grp.push([st, idx.length - st, gr.materialIndex]); });
      const pgeo = new THREE.BufferGeometry(); for (const k in pg.geo.attributes) pgeo.setAttribute(k, pg.geo.attributes[k]); pgeo.setIndex(idx); grp.forEach(g0 => pgeo.addGroup(g0[0], g0[1], g0[2]));
      pgeo.boundingSphere = pg.geo.boundingSphere; pgeo.userData.pittura = true;
      src.geometry = pgeo; src.material = [Array.isArray(src.material) ? src.material[0] : src.material, ...M];
    });
    return { B, sig };
  }
  // le normali saldate su tutto il modello (i pezzi del kit — busto, gambe, piedi — sono mesh diverse: senza questo, righe scure dove si toccano)
  function weld(B, g, srcs) {
    g.updateMatrixWorld(true); const gi = new THREE.Matrix4().copy(g.matrixWorld).invert(), acc = new Map(), L = [];
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), key = v => Math.round(v.x * 2e4) + ',' + Math.round(v.y * 2e4) + ',' + Math.round(v.z * 2e4);
    srcs.forEach((src, si) => { const pg = paintGeo(B, src, si); if (!pg) return; const M = new THREE.Matrix4().multiplyMatrices(gi, src.matrixWorld), NM = new THREE.Matrix3().getNormalMatrix(M), P = pg.geo.attributes.position, N = pg.geo.attributes.normal, keys = new Array(P.count), inReg = new Uint8Array(P.count);
      pg.groups.forEach(gr => { if (gr.materialIndex > 0) for (let k = gr.start; k < gr.start + gr.count; k++) inReg[k] = 1; });
      for (let k = 0; k < P.count; k++) keys[k] = key(a.fromBufferAttribute(P, k).applyMatrix4(M));
      for (let k = 0; k < P.count; k += 3) { if (!inReg[k]) continue; a.fromBufferAttribute(P, k).applyMatrix4(M); b.fromBufferAttribute(P, k + 1).applyMatrix4(M); c.fromBufferAttribute(P, k + 2).applyMatrix4(M); const n = b.sub(a).cross(c.sub(a));
        for (let j = 0; j < 3; j++) { let v = acc.get(keys[k + j]); if (!v) acc.set(keys[k + j], v = new THREE.Vector3()); v.add(n); } }
      L.push({ N, keys, inReg, NMi: new THREE.Matrix3().copy(NM).invert() }); });
    L.forEach(({ N, keys, inReg, NMi }) => { for (let k = 0; k < N.count; k++) { if (!inReg[k]) continue; const v = acc.get(keys[k]); if (!v || v.lengthSq() < 1e-30) continue; a.copy(v).applyMatrix3(NMi).normalize(); N.setXYZ(k, a.x, a.y, a.z); } N.needsUpdate = true; });
  }
  function spoglia(g) { g.traverse(o => { if (o.isSkinnedMesh && o.userData.pitOrig) { o.geometry = o.userData.pitOrig.geo; o.material = o.userData.pitOrig.mat; o.userData.pitOrig = null; } }); }
  // il materiale a campiture per i pezzi in rilievo (falde, cinture, risvolti): stessa pittura, una piastrella che si ripete
  const BMAT = new Map();
  function blockMat(fab, col, c2, c3, opt) {
    opt = opt || {}; const key = [fab, col, c2, c3, opt.dark || 0].join('|'); if (BMAT.has(key)) return BMAT.get(key);
    const C = { fab, A: rgb(col || '#808080'), B: rgb(c2 || col || '#808080'), C: rgb(c3 || col || '#808080') }, N = 64, sz = .45, cv = document.createElement('canvas'); cv.width = cv.height = N;
    const x = cv.getContext('2d'), id = x.createImageData(N, N);
    for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) { const f = fabric(C, (px + .5) / N * sz, (py + .5) / N * sz), i = (py * N + px) * 4, k = opt.dark ? .72 : 1; id.data[i] = f[0] * 255 * k; id.data[i + 1] = f[1] * 255 * k; id.data[i + 2] = f[2] * 255 * k; id.data[i + 3] = 255; }
    x.putImageData(id, 0, 0); const T = new THREE.CanvasTexture(cv); T.wrapS = T.wrapT = THREE.RepeatWrapping; T.magFilter = THREE.NearestFilter; T.minFilter = THREE.NearestMipmapLinearFilter; T.repeat.set(1 / sz, 1 / sz);
    const m = new THREE.MeshLambertMaterial({ map: T, vertexColors: opt.vc !== false, side: THREE.DoubleSide, flatShading: true }); m.emissive = new THREE.Color('#2a2622'); BMAT.set(key, m); return m;
  }
  // un punto sulla superficie stirata (quella che si vede) della regione r, staccato di off
  function surfI(B, r, s, a, off) {
    const F = frame(B), tb = F.tubes[r], fr = S().frameAt(tb, s), raw = S().surf(tb, s, a, 0).sub(fr.p).length(), rr = ironRadius(ironed(tb), tb, s, a);
    let k = 1; if (r > 0) k = cl((tb.L - s) / .06, 0, 1) * cl(s / .05, 0, 1);
    const R0 = raw + cl(rr - raw, -.06, .03) * k + off;
    return fr.p.clone().addScaledVector(fr.f, Math.cos(a) * R0).addScaledVector(fr.sd, Math.sin(a) * R0);
  }
  // il bordino in rilievo di un orlo: anello a n facce attorno alla regione r, all'altezza s (metri sul tubo), alto h, spesso th
  function orlo(B, r, s, h, off, th, n, mat) {
    const P = [], ring = (ds, o) => { const q = []; for (let k = 0; k < n; k++) q.push(surfI(B, r, s + ds, -Math.PI + (k + .5) / n * Math.PI * 2, o)); return q; };
    const ob = ring(-h / 2, off), ot = ring(h / 2, off), ib = ring(-h / 2, off - th), it = ring(h / 2, off - th);
    const quad = (a, b, c, d) => P.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, a.x, a.y, a.z, c.x, c.y, c.z, d.x, d.y, d.z);
    for (let k = 0; k < n; k++) { const j = (k + 1) % n; quad(ob[k], ob[j], ot[j], ot[k]); quad(ot[k], ot[j], it[j], it[k]); quad(ib[k], ib[j], ob[j], ob[k]); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.computeVertexNormals();
    const uv = []; for (let i = 0; i < P.length; i += 3) uv.push(P[i] + P[i + 2], P[i + 1]); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    return new THREE.Mesh(g, mat);
  }
  // i bordi netti di un vestito dipinto: fine manica, orlo della maglia, orlo dei pantaloni (solo il capo più esterno di ogni zona)
  function bordi(g, B, outfit, AT) {
    const P = paintPlans(B, outfit), Sa = S(), F = frame(B); if (!P) return;
    const outer = R => { for (let k = P.length - 1; k >= 0; k--) if (P[k].L[R]) return P[k]; return null; };
    const mat = C => blockMat(C.fab, '#' + new THREE.Color().setRGB(C.A[0] * .9, C.A[1] * .9, C.A[2] * .9).getHexString(), '#' + new THREE.Color().setRGB(C.B[0], C.B[1], C.B[2]).getHexString(), null, { vc: false });
    const boots = outfit.some(c => /^stivali/.test(c.id));
    for (const sd of ['L', 'R']) {
      const RA = 'A' + sd, CA = outer(RA); if (CA && !(CA.polsi && CA.L[RA].s1 > CA.L[RA].la)) { const Ls = CA.L[RA], ri = sd === 'L' ? 1 : 2, o = new THREE.Group(); o.add(orlo(B, ri, Ls.s1 - .008, .016, .0045, .005, 10, mat(CA))); AT(Ls.s1 < Ls.la - .02 ? 'UpperArm' + sd : 'LowerArm' + sd, o); }
      const RL = 'L' + sd, CL = outer(RL); if (CL && CL.L[RL].falda === undefined && !boots && !CL.risvolto) { const Ls = CL.L[RL], ri = sd === 'L' ? 3 : 4; if (Ls.s1 < F.tubes[ri].L + .01) { const o = new THREE.Group(); o.add(orlo(B, ri, Ls.s1 - .01, .02, .005, .006, 12, mat(CL))); AT((Ls.s1 < Ls.kn - .02 ? 'UpperLeg' : 'LowerLeg') + sd, o); } }
    }
    // (l'orlo del busto è dipinto, anche sulle cosce: niente anello in rilievo, che non può seguire le gambe divise)
  }
  function paintPlans(B, outfit) {
    const CUT = S().CUT_(), list = outfit.filter(c => c.parti && c.parti.some(p => /torso|braccia|avambracci|bacino|cosce|polpacci|collo/.test(p)));
    const ranked = list.map((c, i) => ({ c, r: ((CUT[c.id] || {}).cl || 1) * 10 + i * .01 })).sort((a, b) => a.r - b.r).map(o => o.c);
    return ranked.map((c, k) => plan(B, c, k, ranked));
  }
  return { dipingi, spoglia, paint, paintGeo, frame, blockMat, bordi, surfI, orlo };
})();
