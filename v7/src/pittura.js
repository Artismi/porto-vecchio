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
  const SIZE = { T: [128, 160], AL: [32, 128], AR: [32, 128], LL: [48, 160], LR: [48, 160] };   // ~7 mm per pixel: pixel grossi e netti

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
  function paintGeo(B, src, si) {
    const key = B.key + '|' + si; if (GEO.has(key)) return GEO.get(key);
    const geo = src.userData.geo0 || src.geometry, gm = B.gmaps[si]; if (!gm) { GEO.set(key, null); return null; }
    const F = frame(B), idx = geo.index ? geo.index.array : null, nt = (idx ? idx.length : geo.attributes.position.count) / 3;
    const v = new THREE.Vector3(), byReg = [[], [], [], [], [], []];   // 0..4 regioni, 5 = resta com'è
    for (let t = 0; t < nt; t++) {
      const c = [0, 1, 2].map(k => idx ? idx[t * 3 + k] : t * 3 + k), r = c.map(q => gm[q] >= 0 ? regionOf(B, gm[q]) : -1);
      const cnt = {}; r.forEach(x => { cnt[x] = (cnt[x] || 0) + 1; }); let best = -1, bn = 0; for (const k in cnt) if (cnt[k] > bn) { bn = cnt[k]; best = +k; }
      byReg[best < 0 ? 5 : best].push(t);
    }
    const attrs = geo.attributes, out = new THREE.BufferGeometry(), N = nt * 3, keys = Object.keys(attrs).filter(k => k !== 'uv');
    const arr = {}; keys.forEach(k => { arr[k] = new attrs[k].array.constructor(N * attrs[k].itemSize); });
    const UV = new Float32Array(N * 2), order = [], groups = [];
    let w = 0;
    byReg.forEach((L, reg) => {
      if (!L.length) return; const start = w;
      L.forEach(t => {
        const c = [0, 1, 2].map(k => idx ? idx[t * 3 + k] : t * 3 + k);
        // coordinate di stoffa dei tre angoli nel tubo della regione del triangolo (stesso tubo: niente strappi)
        let uu = [0, 0, 0], vv = [0, 0, 0];
        if (reg < 5) {
          const tb = F.tubes[reg], [s0, s1] = F.range[reg];
          c.forEach((q, k) => { const g = gm[q]; if (g >= 0) v.set(B.P[g * 3], B.P[g * 3 + 1], B.P[g * 3 + 2]); else v.fromBufferAttribute(attrs.position, q).applyMatrix4(B.rel); const P0 = tb.proj(v); uu[k] = (P0.a + Math.PI) / (Math.PI * 2); vv[k] = (P0.i * tb.ds - s0) / (s1 - s0); });
          if (Math.max(...uu) - Math.min(...uu) > .5) uu = uu.map(x => x < .5 ? x + 1 : x);   // il triangolo a cavallo della cucitura dietro
        }
        c.forEach((q, k) => { keys.forEach(a => { const sz = attrs[a].itemSize; for (let j = 0; j < sz; j++) arr[a][w * sz + j] = attrs[a].array[q * sz + j]; }); UV[w * 2] = uu[k]; UV[w * 2 + 1] = vv[k]; w++; });
      });
      groups.push({ start, count: w - start, materialIndex: reg < 5 ? 1 + reg : 0 });
    });
    keys.forEach(a => out.setAttribute(a, new THREE.BufferAttribute(arr[a], attrs[a].itemSize, attrs[a].normalized)));
    out.setAttribute('uv', new THREE.BufferAttribute(UV, 2)); groups.forEach(gr => out.addGroup(gr.start, gr.count, gr.materialIndex));
    out.boundingSphere = geo.boundingSphere; out.boundingBox = geo.boundingBox; out.userData.pittura = true;
    const res = { geo: out, regs: groups.filter(g => g.materialIndex > 0).map(g => g.materialIndex - 1) };
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
    C.col = c.col; C.A = rgb(c.col || '#808080');
    const l = C.A[0] * .3 + C.A[1] * .59 + C.A[2] * .11; C.B = rgb(C.c2 || (l > .5 ? '#2a2a30' : D)); C.C = rgb(C.c3 || (l > .5 ? '#5a5a60' : '#a8a090'));
    const trous = !C.gonna && !C.solo_gonna && P.has('bacino') && (C.cl === 2 || P.has('cosce')), top = P.has('torso') && !C.solo_gonna;
    if (top) {
      const Ls = Sa.lengths(B, T, 'tronco', C, [...P]);
      let yb = Ls.yb; if (C.gonna || C.poncho) yb = B.waist - .02;   // la falda la fa la geometria
      if (C.cl <= 1 && all.some(o => (CUT[o.id] || {}).cl === 2 && (o.parti || []).includes('bacino'))) yb = B.waist - .02;   // infilata nei pantaloni
      L.T = { s0: T.sAtY(yb), s1: Ls.s1, yb, yt: Ls.yt };
    }
    if (trous || C.solo_gonna) L.T = Object.assign(L.T || {}, { p0: T.sAtY(B.crotch - .12), p1: T.sAtY(B.waist + .03) });
    for (const sd of ['L', 'R']) {
      if (top && !C.smanicato && !C.davanti && (P.has('braccia') || P.has('avambracci'))) { const tb = F.tubes[sd === 'L' ? 1 : 2], Ls = Sa.lengths(B, tb, 'manica' + sd, C, [...P]); if (Ls.s1 > .02) L['A' + sd] = Ls; }
      if (trous || C.velo || C.stretti && P.has('cosce')) { const tb = F.tubes[sd === 'L' ? 3 : 4], Ls = Sa.lengths(B, tb, 'gamba' + sd, C, [...P]); L['L' + sd] = Ls; }
      if (C.pettorina) { /* la salopette: pettorina dipinta sul busto */ L.T = Object.assign(L.T || {}, { bib: 1 }); }
      // giacche e cappotti che scendono sotto l'inforcatura, gonne e falde: continuano dipinti sulle cosce
      // (sotto le falde la gamba ha la stessa stoffa: se passa attraverso, non si vede)
      const hem = C.gonna || C.solo_gonna || C.poncho ? (Sa.lengths(B, T, 'gonna', C, [...P]).yb) : (L.T && L.T.yb !== undefined && L.T.yb < B.crotch + .02 ? L.T.yb : null);
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
    return d;
  }
  // il colore del tessuto in un punto (metri): la piastrella del tessuto della Sartoria
  // il colore della stoffa in un punto (metri), a campiture: 2-3 toni a blocchi grossi, motivi grandi e leggibili
  const hsh = (a, b) => { let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  function fabric(C, xm, ym) {
    const A = C.A, B = C.B, Cc = C.C, q = .028, n = hsh(Math.floor(xm / q), Math.floor(ym / q)), tone = n < .3 ? .9 : n < .8 ? 1 : 1.07;   // tre toni a blocchi
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
    else if (f === 'denim') c = mul(A, md(xm + ym, .028) < .014 ? .96 : 1.03);
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
          col[i] = c[0] * 255 * shade; col[i + 1] = c[1] * 255 * shade; col[i + 2] = c[2] * 255 * shade; col[i + 3] = 255;
          hh[i] = hh[i + 1] = hh[i + 2] = cl(h, 0, 1) * 255; hh[i + 3] = 255;
        }
      }
      out[R] = { W, H, col, hh };
    });
    return { out, plans };
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
      if (inTop) edge = Math.min(y - T.yb, nY - neckDrop(C, a) - y);
      if (inPel && !inTop) edge = Math.min(B.waist + .03 - y, 9);
    } else if (R[0] === 'A') {
      const Ls = L[R]; if (!Ls || sv > Ls.s1) return null; edge = Ls.s1 - sv;
    } else {
      const Ls = L[R]; if (!Ls) return null;
      if (Ls.falda !== undefined) { if (y < Ls.falda) return null; const f0 = fabric(C, xm, sv); const e = y - Ls.falda; return { c: [f0[0], f0[1], f0[2]], h: .3 + f0[3] * .4, s: e < .004 ? .62 : e < .02 ? .86 + .14 * (e - .004) / .016 : 1 }; }
      if (sv > Ls.s1) return null; edge = Ls.s1 - sv;
    }
    let f = fabric(C, xm, sv); let c = [f[0], f[1], f[2]], h = .3 + f[3] * .4, s = 1;
    // l'orlo: piega scura e un filo d'ombra prima
    if (edge < .008) { s *= .6; h = .1; } else if (edge < .02) s *= .88 + .12 * (edge - .008) / .012;
    // i capi pesanti hanno la bordura scura all'orlo (come nei riferimenti)
    if ((C.cl >= 4 || C.poncho) && !C.costine && edge >= .008 && edge < .04) s *= .72;
    const R2 = Math.PI / 2;
    if (R === 'T') {
      const xf = a * .14;   // metri dal centro davanti (all'incirca, sul petto)
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
      const el = Math.abs(sv - Ls.la); if (el < .05 && Math.cos(a) < -.2) { const k = Math.sin((sv - Ls.la) / .012 * Math.PI); if (k > .75) { s *= .84; h = .2; } }
      if (line(Math.abs(a) - Math.PI, .03) || line(a + Math.PI, .03)) { s *= .85; h = .2; }   // la cucitura sotto la manica
      if (sv < .02) { s *= .8; h = .15; }   // l'attaccatura alla spalla
    }
    if (R[0] === 'L') {
      const Ls = L[R], end = Ls.s1, sg = R === 'LL' ? 1 : -1;
      if (line(Math.abs(a) - R2, .02)) { s *= C.cuciture ? 1 : .82; if (C.cuciture) c = mixc(c, rgb(C.cuciture), .7); h = .15; }   // cucitura laterale
      if (C.banda && Math.abs(a - sg * R2) < .12) { c = rgb(C.banda); h = .6; }
      if (C.piega && line(a, .015)) { s *= 1.08; h = .9; }
      const kn = Math.abs(sv - Ls.kn); if (kn < .06 && Math.cos(a) < -.3) { const k = Math.sin((sv - Ls.kn) / .015 * Math.PI); if (k > .7) { s *= .85; h = .2; } }   // pieghe dietro il ginocchio
      if (kn < .04 && Math.cos(a) > .5 && C.usura) { c = mixc(c, [.85, .85, .9], C.usura * .5 * (1 - kn / .04)); }   // ginocchia schiarite
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
      const m = new THREE.MeshLambertMaterial({ map: mk(col), bumpMap: mk(hh), bumpScale: .0015, flatShading: true }); m.emissive = new THREE.Color('#2a2622'); m.userData.pittura = true; return m;
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
    srcs.forEach((src, si) => {
      const pg = paintGeo(B, src, si); if (!pg) return;
      if (!src.userData.pitOrig) src.userData.pitOrig = { geo: src.userData.geo0 || src.geometry, mat: src.material };
      const m0 = Array.isArray(src.userData.pitOrig.mat) ? src.userData.pitOrig.mat[0] : src.material;
      src.geometry = pg.geo; src.material = [Array.isArray(src.material) ? src.material[0] : src.material, ...M];
    });
    return { B, sig };
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
  return { dipingi, spoglia, paint, paintGeo, frame, blockMat };
})();
