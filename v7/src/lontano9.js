/* Porto Vecchio — [lontano9] IL LONTANO DELLA CAMERA BASSA (v7).
   Con ?camera9 la camera sta a 3,7 m e guarda a 15°: il tronco di vista prende la città fino alla nebbia e i disegni salgono da 1,4× a
   9× (ANALISI_CAMERA9.md §4). I disegni in più stanno fra 30 e 150 m: nei vicoli e nelle piazze chiuse sono DIETRO LE CASE (la camera
   bassa non vede sopra i tetti), sul lungomare e dall'alto delle scale sono le cose piccole lontane. Qui, solo nel passaggio principale
   della scena (non nelle ombre, non per chi chiede «si vede?» per la logica), due prove dopo quella del frustum:

   1. L'OCCLUSIONE DELLE CASE (la mappa delle altezze, come la scansione di camera9). Dalla camera, a ventaglio sulle direzioni del quadro
      (una colonna ogni P.dA in pianta), si cammina sulla griglia delle case e si tiene, per ogni distanza, la pendenza più alta del pieno
      incontrato fin lì (l'«orizzonte» di quella direzione). Una cosa è nascosta se in TUTTE le colonne che copre (più una per lato) il
      pieno davanti a lei sale più in alto della sua cima: la sfera per le cose piccole, la scatola del mondo per le grandi (i secchi delle
      case fuse e dei tasselli: la sfera di un settore sporge 34 m in alto e nessuna casa la coprirebbe). La griglia è prudente: solo le
      case vere (le caselle del lotto: il corpo della casa riempie il lotto), alla gronda meno P.margine e sopra il tetto a falde che sale
      dal bordo più vicino (la falda più bassa possibile), le case girate solo nelle caselle tutte dentro il lotto, niente pezzi (chiesa,
      opifici: la forma non è un blocco), chioschi, faro, gradoni, niente volte (sotto archi, sottopassi e portici si vede attraverso).
      Così una cosa torna disegnata quando spunta appena da una casa più bassa della vera: niente salti. test_lontano9.js lo prova su
      migliaia di sfere e scatole a caso contro le case vere.
   2. LE COSE PICCOLE LONTANE (per genere): oltre P.dist metri (il bordo vicino della sfera) le cose di raggio sotto P.rPiccolo, oltre
      P.distPers le persone, oltre P.distMezzo le medie (raggio sotto P.rMezzo; lì la nebbia le ha già quasi coperte). Nella fascia di
      P.banda metri prima del taglio si stringono verso il centro (vedi sotto, «la dissolvenza»): al taglio sono un punto, non saltano.
      Valgono anche per i secchi piccoli delle case fuse e dei tasselli (le decalcomanie, le insegne, i vetri di una casa sola).
   Solo con camera9 accesa e fuori (non al chiuso, non sotto terra, non alla guida: render.js C7); la camera di oggi non cambia di un
   disegno. ?nolontano9 spegne tutto (?nolontano9occ solo l'occlusione, ?nolontano9pic solo le piccole), Lontano9.attivo dal vivo. */
var Lontano9 = (function () {
  'use strict';
  const Q = typeof location !== 'undefined' ? location.search : '';
  const ON = !/[?&]nolontano9\b/.test(Q);
  const OCC_ON = !/[?&]nolontano9occ\b/.test(Q), PIC_ON = !/[?&]nolontano9pic\b/.test(Q);
  const P = {
    dA: .4 * Math.PI / 180,   // la larghezza di una colonna del ventaglio (rad): a 50 m, 35 cm (le bocche dei vicoli da 1,7 m si vedono)
    vicino: 10,               // m: sotto (bordo della sfera) nessuna prova di occlusione
    margine: .25,             // m: la gronda abbassata (prudenza)
    dist: 75, banda: 15,      // m: le cose piccole spariscono oltre dist (bordo vicino della sfera), dissolte da dist - banda
    rPiccolo: 1.6,            // m: «piccolo» (vasi, sedie, cartelli, insegne, cassette, biciclette, persone ferme)
    distMezzo: 120, rMezzo: 4,   // m: e le medie (banchi, chioschi, alberelli, barche piccole) oltre distMezzo
    distPers: 80,             // m: le persone e gli animali
  };
  const MIS = { on: false };   // le sonde: si prova tutto ma non si taglia niente (o.__l9w: 'occ', 'pic' o '')
  const ST = { on: false, prove: 0, occluse: 0, piccole: 0, fascia: 0, colonne: 0, ms: 0, fotogrammi: 0 };
  let colId = 0, ultima = [NaN, 0, 0, 0, 0], occF = false, camDentro = false, K = null, T3 = null, pronto = false, attivo = true, acceso = false, inMain = 0, inShadow = 0, frameId = 0;
  // la camera di questo fotogramma
  let cx = 0, cy = 0, cz = 0, az0 = 0, A = 0, NC = 0;
  // ---------------------------------------------------------------- la griglia delle case (prudente)
  let OCC = null, GW = 0, GH = 0, TS = 2, WOK = null;
  function griglia(W) {
    if (WOK === W) return !!OCC; WOK = W; OCC = null;
    if (!W || !W.grid || !W.GW || !W.T || W.T.BLD === undefined) return false;
    GW = W.GW; GH = W.GH; TS = W.TS || 2; const N = GW * GH, g = W.grid, BI = W.bIndex, B = W.BUILDINGS || [], BLD = W.T.BLD;
    const gronda = b => (b.base || 0) + (b.lighthouse ? 12 : b.kiosk ? 2.8 : b.fl >= 1 ? 3.6 + (b.fl - 1) * 2.4 : 3);   // come Visuale.mappa / Tetti.roofRule
    // le case: le caselle dentro il lotto (render.js: il corpo della casa riempie il lotto, x0 = b.x * TS, w = b.w * TS); le case girate
    // solo le caselle coi quattro spigoli dentro il lotto girato (stretto di 30 cm). Niente pezzi (chiesa, opifici: la forma non è un
    // blocco), chioschi, faro, gradoni
    const H0 = new Float32Array(N).fill(-1e9);
    B.forEach((b, bi) => { if (!b || b.kiosk || b.pezzo || b.lighthouse || b.tiers || b.__tierOf || !(b.w > 0) || !(b.h > 0)) return;
      const h = gronda(b) - P.margine, a = b.rot && !b.sign && !b.shop ? b.rot : 0, cxb = (b.x + b.w / 2) * TS, czb = (b.y + b.h / 2) * TS, hw = b.w * TS / 2 - .3, hd = b.h * TS / 2 - .3, ca = Math.cos(a), sa = Math.sin(a);
      const fald = (b.era === 'E0' || b.era === 'E3') && !b.torre && !b.annesso ? Math.tan(b.era === 'E3' ? .42 : .3) : 0, colmo = fald ? Math.min(b.w, b.h) * TS / 2 * fald : 0;
      const dentro = (x, z) => { const dx = x - cxb, dz = z - czb, l = dx * ca - dz * sa, m = dx * sa + dz * ca; return Math.abs(l) <= hw && Math.abs(m) <= hd; };   // (l'inverso di Ry(-a), come massaGeo1)
      const m = a ? 2 : 0; for (let ty = b.y - m; ty < b.y + b.h + m; ty++) for (let tx = b.x - m; tx < b.x + b.w + m; tx++) { if (tx < 0 || ty < 0 || tx >= GW || ty >= GH) continue; const i = ty * GW + tx;
        if (g[i] !== BLD || (BI && BI[i] !== bi)) continue;
        if (a && !(dentro(tx * TS, ty * TS) && dentro((tx + 1) * TS, ty * TS) && dentro(tx * TS, (ty + 1) * TS) && dentro((tx + 1) * TS, (ty + 1) * TS))) continue;
        if (!a && (tx < b.x || ty < b.y || tx >= b.x + b.w || ty >= b.y + b.h)) continue;
        // il tetto a falde sale dalla gronda: nella casella il punto più basso è il più vicino al bordo del lotto (falde su due o quattro
        // lati: la distanza dal bordo più vicino è prudente per tutte e due), con la pendenza di Visuale.mappa colmo; il tetto piatto no
        let hh = h; if (fald && !a) { const dx = Math.max(Math.abs(tx * TS - cxb), Math.abs((tx + 1) * TS - cxb)), dz = Math.max(Math.abs(ty * TS - czb), Math.abs((ty + 1) * TS - czb));
          const e = Math.min(b.w * TS / 2 - dx, b.h * TS / 2 - dz); if (e > 0) hh += Math.min(e * fald, colmo - .2); }   // (la distanza dal bordo del punto della casella più vicino al bordo)
        H0[i] = hh; } });
    // le volte (archi, sottopassi, portici): si vede attraverso
    (W.pezzi || []).forEach(p => { let r = null; const q = p.q || 0;
      if (p.tipo === 'arco_sottopasso') r = [-1, 8.4, -6, 6]; else if (p.tipo === 'arco_contrasto') r = [-2, 2, -.6, .6]; else if (p.tipo === 'portico') r = [0, ((p.opz && p.opz.campate) || 2) * ((p.opz && p.opz.campata) || 4) + .5, -4.2, .2];
      if (!r) return; void q; const c = Math.cos(p.rot || 0), s = Math.sin(p.rot || 0), R = 2 + Math.hypot(Math.max(-r[0], r[1]), Math.max(-r[2], r[3]));
      for (let ty = Math.floor((p.y - R) / TS); ty <= Math.floor((p.y + R) / TS); ty++) for (let tx = Math.floor((p.x - R) / TS); tx <= Math.floor((p.x + R) / TS); tx++) {
        if (tx < 0 || ty < 0 || tx >= GW || ty >= GH) continue; const dx = (tx + .5) * TS - p.x, dy = (ty + .5) * TS - p.y, l = dx * c - dy * s, m = dx * s + dy * c;
        if (l >= r[0] - 2 && l <= r[1] + 2 && m >= r[2] - 2 && m <= r[3] + 2) H0[ty * GW + tx] = -1e9; } });
    OCC = H0; return true;
  }
  // ---------------------------------------------------------------- il ventaglio
  // i campioni lungo una colonna: ogni metro fino a 60 m, ogni 2 fino a 140, ogni 4 fino a 300
  const SD = []; for (let s = 1; s <= 60; s += 1) SD.push(s); for (let s = 62; s <= 140; s += 2) SD.push(s); for (let s = 144; s <= 300; s += 4) SD.push(s);
  const NS = SD.length, NCMAX = 1200;
  const PM = new Float32Array(NCMAX * NS), CF = new Int32Array(NCMAX);
  const idxD = q => q < 1 ? -1 : q <= 60 ? Math.floor(q) - 1 : q <= 140 ? 59 + Math.floor((q - 60) / 2) : Math.min(NS - 1, 99 + Math.floor((q - 140) / 4));
  // (a tratti: il passo cresce con la distanza; le coordinate del mondo sono positive: |0 al posto di floor)
  const TRATTI = [[1, 1, 60], [62, 2, 40], [144, 4, 40]];   // [primo s, passo, quanti]
  function colonna(c) {
    const a = az0 - A + (c + .5) * P.dA, ux = Math.cos(a), uz = Math.sin(a), o = c * NS, iT = 1 / TS; let m = -1e9, i = 0, fuori = !camDentro;
    tratti: for (let t = 0; t < 3; t++) { const T = TRATTI[t], st = T[1]; let s = T[0], x = cx + ux * s, z = cz + uz * s; const dx = ux * st, dz = uz * st;
      for (let n = T[2]; n > 0; n--, i++, s += st, x += dx, z += dz) {
        if (x < 0 || z < 0) break tratti; const tx = (x * iT) | 0, ty = (z * iT) | 0; if (tx >= GW || ty >= GH) break tratti;
        const h = OCC[ty * GW + tx]; if (h > -1e8) { if (fuori) { const q = (h - cy) / s; if (q > m) m = q; } } else fuori = true;   // (la camera nella casella di una casa: quella casa non conta finché non se ne esce)
        PM[o + i] = m; } }
    for (; i < NS; i++) PM[o + i] = m;
    CF[c] = colId; ST.colonne++;
  }
  // nascosto dietro le case? (cx, cy, cz, r: la sfera nel mondo)
  function occluso(x, y, z, r) {
    const dx = x - cx, dz = z - cz, dh = Math.sqrt(dx * dx + dz * dz), q = dh - r; if (q < P.vicino) return false;
    const top = y + r - cy, tanT = top > 0 ? top / q : top / (dh + r), k = idxD(q); if (k < 0) return false;
    let rel = Math.atan2(dz, dx) - az0; rel = Math.atan2(Math.sin(rel), Math.cos(rel));
    const w = Math.asin(Math.min(1, r / dh)), c0 = Math.floor((rel - w + A) / P.dA) - 1, c1 = Math.floor((rel + w + A) / P.dA) + 1;
    if (c0 < 0 || c1 >= NC) return false;   // la sfera esce dal ventaglio: decide il frustum
    for (let c = c0; c <= c1; c++) { if (CF[c] !== colId) colonna(c); if (PM[c * NS + k] <= tanT) return false; }
    return true;
  }
  // nascosta dietro le case una scatola del mondo (x0..x1, y0..y1, z0..z1)? Per le cose grandi (i secchi delle case fuse e dei tasselli,
  // larghi un settore): la sfera di un secchio di 48 m sporge 34 m in alto e nessuna casa la copre mai; la scatola ha la sua cima vera
  function occlusoB(x0, y0, z0, x1, y1, z1) {
    if (cx >= x0 && cx <= x1 && cz >= z0 && cz <= z1) return false;   // la camera sopra l'impronta
    const nx = cx < x0 ? x0 : cx > x1 ? x1 : cx, nz = cz < z0 ? z0 : cz > z1 ? z1 : cz, q = Math.hypot(nx - cx, nz - cz); if (q < P.vicino) return false;
    const k = idxD(q); if (k < 0) return false;
    const ux = (x0 + x1) / 2 - cx, uz = (z0 + z1) / 2 - cz, a0 = Math.atan2(uz, ux); let lo = 0, hi = 0, far = 0;   // gli angoli degli spigoli attorno alla direzione del centro
    for (let i = 0; i < 4; i++) { const x = i & 1 ? x1 : x0, z = i & 2 ? z1 : z0, dx = x - cx, dz = z - cz; let a = Math.atan2(dz, dx) - a0; a = Math.atan2(Math.sin(a), Math.cos(a)); if (a < lo) lo = a; if (a > hi) hi = a; const f = Math.hypot(dx, dz); if (f > far) far = f; }
    const top = y1 - cy, tanT = top > 0 ? top / q : top / far;
    let rel = a0 - az0; rel = Math.atan2(Math.sin(rel), Math.cos(rel));
    const c0 = Math.floor((rel + lo + A) / P.dA) - 1, c1 = Math.floor((rel + hi + A) / P.dA) + 1;
    if (c0 < 0 || c1 >= NC) return false;
    for (let c = c0; c <= c1; c++) { if (CF[c] !== colId) colonna(c); if (PM[c * NS + k] <= tanT) return false; }
    return true;
  }
  // la scatola del mondo di una mesh grande (in cache finché non cambiano la matrice o la geometria)
  const BOXK = 6;   // m: oltre questo raggio si prova la scatola invece della sfera
  function scatolaIst(o) {   // un gruppo di istanze con l'ingombro vero (render.js instCull): la scatola delle istanze (la sfera della forma attorno a ognuna)
    const g = o.geometry, im = o.instanceMatrix; if (!g || !im || !im.array || o.count > 4096) return null; const e = o.matrixWorld.elements; let C = o.__l9b;
    if (C && C.v === im.version && C.n === o.count) { let u = true; for (let i = 0; i < 16; i++) if (C.m[i] !== e[i]) { u = false; break; } if (u) return C.b; }
    if (!g.boundingSphere) g.computeBoundingSphere(); const gs = g.boundingSphere; if (!gs) return null;
    const b = C && C.b || new Float32Array(6), a = im.array, s = sc(e); b[0] = b[1] = b[2] = Infinity; b[3] = b[4] = b[5] = -Infinity; let any = false;
    for (let i = 0; i < o.count; i++) { const q = i * 16, k = Math.sqrt(Math.max(a[q] * a[q] + a[q + 1] * a[q + 1] + a[q + 2] * a[q + 2], a[q + 4] * a[q + 4] + a[q + 5] * a[q + 5] + a[q + 6] * a[q + 6], a[q + 8] * a[q + 8] + a[q + 9] * a[q + 9] + a[q + 10] * a[q + 10]));
      if (k < 1e-4) continue; const lx = a[q] * gs.center.x + a[q + 4] * gs.center.y + a[q + 8] * gs.center.z + a[q + 12], ly = a[q + 1] * gs.center.x + a[q + 5] * gs.center.y + a[q + 9] * gs.center.z + a[q + 13], lz = a[q + 2] * gs.center.x + a[q + 6] * gs.center.y + a[q + 10] * gs.center.z + a[q + 14];
      const wx = e[0] * lx + e[4] * ly + e[8] * lz + e[12], wy = e[1] * lx + e[5] * ly + e[9] * lz + e[13], wz = e[2] * lx + e[6] * ly + e[10] * lz + e[14], r = gs.radius * k * s + .3; any = true;
      if (wx - r < b[0]) b[0] = wx - r; if (wy - r < b[1]) b[1] = wy - r; if (wz - r < b[2]) b[2] = wz - r; if (wx + r > b[3]) b[3] = wx + r; if (wy + r > b[4]) b[4] = wy + r; if (wz + r > b[5]) b[5] = wz + r; }
    if (!any) return null; o.__l9b = { v: im.version, n: o.count, m: Float64Array.from(e), b }; return b;
  }
  function scatola(o) {
    if (o.isInstancedMesh) return o.__icS ? scatolaIst(o) : null;
    const g = o.geometry; if (!g || o.isInstancedMesh || o.isSkinnedMesh || o.isSprite || (g.morphAttributes && g.morphAttributes.position)) return null;
    const e = o.matrixWorld.elements; let C = o.__l9b;
    if (C && C.g === g && C.bb === g.boundingBox) { let u = true; for (let i = 0; i < 16; i++) if (C.m[i] !== e[i]) { u = false; break; } if (u) return C.b; }
    if (!g.boundingBox) g.computeBoundingBox(); const bb = g.boundingBox; if (!bb || bb.isEmpty()) return null;
    const b = C && C.b || new Float32Array(6); b[0] = b[1] = b[2] = Infinity; b[3] = b[4] = b[5] = -Infinity;
    for (let i = 0; i < 8; i++) { const x = i & 1 ? bb.max.x : bb.min.x, y = i & 2 ? bb.max.y : bb.min.y, z = i & 4 ? bb.max.z : bb.min.z;
      const wx = e[0] * x + e[4] * y + e[8] * z + e[12], wy = e[1] * x + e[5] * y + e[9] * z + e[13], wz = e[2] * x + e[6] * y + e[10] * z + e[14];
      if (wx < b[0]) b[0] = wx; if (wy < b[1]) b[1] = wy; if (wz < b[2]) b[2] = wz; if (wx > b[3]) b[3] = wx; if (wy > b[4]) b[4] = wy; if (wz > b[5]) b[5] = wz; }
    b[0] -= .3; b[1] -= .3; b[2] -= .3; b[3] += .3; b[4] += .3; b[5] += .3;   // il vento, le stoffe
    o.__l9b = { g, bb, m: Float64Array.from(e), b }; return b;
  }
  // ---------------------------------------------------------------- le sfere
  let sph = null;
  const sc = e => Math.sqrt(Math.max(e[0] * e[0] + e[1] * e[1] + e[2] * e[2], e[4] * e[4] + e[5] * e[5] + e[6] * e[6], e[8] * e[8] + e[9] * e[9] + e[10] * e[10]));
  let pad = 0;
  function sferaMesh(o) {   // false: niente prova
    pad = 0;
    if (o.__icS) { sph.copy(o.__icS).applyMatrix4(o.matrixWorld); return true; }   // i gruppi di istanze con l'ingombro vero (render.js instCull)
    if (o.__icR) { const e = o.__icR.matrixWorld.elements; sph.center.set(e[12], e[13] + 1, e[14]); sph.radius = 2.6 * sc(e); return true; }   // un personaggio
    if (o.isInstancedMesh) return false;   // la sfera della forma sola: non dice dove sono le istanze
    const g = o.geometry; if (!g || !g.attributes || !g.attributes.position) return false;
    if (g.boundingSphere === null) g.computeBoundingSphere(); const s = g.boundingSphere; if (!s || !(s.radius >= 0)) return false;
    sph.copy(s).applyMatrix4(o.matrixWorld);
    if (o.isSkinnedMesh) { const e = o.matrixWorld.elements; sph.center.set(e[12], e[13] + 1, e[14]); sph.radius = Math.max(sph.radius, 1.6 * sc(e)); }   // le ossa muovono la forma
    else pad = .3;   // il vento, le stoffe (solo per l'occlusione: il genere si decide col raggio vero)
    return true;
  }
  function sferaSprite(o) { pad = 0; const e = o.matrixWorld.elements, ce = o.center; sph.center.set(e[12], e[13], e[14]); sph.radius = (.7072 + Math.hypot(ce.x - .5, ce.y - .5)) * sc(e); return true; }
  // mai tagliati per distanza (solo l'occlusione): il cielo, il terreno, l'acqua, la sagoma (keep, waterMask), i gruppi di istanze (la
  // sfera è di tutto il gruppo: decide il raggio), chi ha un onBeforeRender suo (non si potrebbe stringere: salterebbe). Le parti piccole
  // delle case fuse e dei tasselli (decalcomanie, insegne, vetri di una casa sola: un secchio piccolo) sì, come le cose sciolte
  const mai = o => { const u = o.userData; return !!(u && (u.keep || u.waterMask)) || Object.prototype.hasOwnProperty.call(o, 'onBeforeRender'); };
  // il genere e la distanza di taglio: le piccole (raggio sotto rPiccolo) e le persone oltre dist, le medie (sotto rMezzo) oltre distMezzo
  function taglio(o, r) { if (!PIC_ON || mai(o)) return 0; if (o.isSkinnedMesh || o.__icR) return P.distPers; return r < P.rPiccolo ? P.dist : r < P.rMezzo ? P.distMezzo : 0; }
  // la prova (true: si disegna)
  function prova(o, sprite) {
    if (!(sprite ? sferaSprite(o) : sferaMesh(o))) return true;
    ST.prove++;
    const c = sph.center, r = sph.radius, D = taglio(o, r);
    if (D > 0) { const dx = c.x - cx, dy = c.y - cy, dz = c.z - cz, d = Math.sqrt(dx * dx + dy * dy + dz * dz) - r;
      if (d > D) { ST.piccole++; if (MIS.on) { o.__l9w = 'pic'; return true; } return false; }
      if (d > D - P.banda) {   // nella fascia: si rimpicciolisce verso il centro della sfera mentre si allontana (onBeforeRender), fino a zero al taglio
        const k = (D - d) / P.banda; o.__l9k = k * k * (3 - 2 * k); o.__l9f = frameId; const q = o.__l9c || (o.__l9c = [0, 0, 0]); q[0] = c.x; q[1] = c.y; q[2] = c.z; ST.fascia++; } }
    let occ = false; if (occF) { const b = r > BOXK && !sprite ? scatola(o) : null; occ = b ? occlusoB(b[0], b[1], b[2], b[3], b[4], b[5]) : occluso(c.x, c.y, c.z, r + pad); }
    if (occ) { ST.occluse++; if (MIS.on) { o.__l9w = 'occ'; return true; } return false; }
    if (MIS.on) o.__l9w = '';
    return true;
  }
  // ---------------------------------------------------------------- la dissolvenza delle cose piccole
  // Le cose nella fascia prima del taglio si stringono verso il centro (la scala da 1 a 0 lungo P.banda metri, liscia): al taglio sono
  // già un punto, quindi non saltano. Niente programmi nuovi (un retino nello shader vorrebbe dire ricompilare i materiali di tutti,
  // e gli shader del look non sono di questo modulo): la matrice del mondo si stringe solo per il disegno della vista (onBeforeRender
  // del prototipo; chi ha un onBeforeRender suo non si stringe, solo si taglia) e torna com'era subito dopo (onAfterRender).
  const SAVE = new Float32Array(16);
  function stringi(o, camera) {
    if (!acceso || !inMain || inShadow || camera !== K.camera()) return;   // (spento dal vivo: niente strette rimaste dall'ultimo fotogramma acceso)
    const k = o.__l9k, q = o.__l9c, e = o.matrixWorld.elements; for (let i = 0; i < 16; i++) SAVE[i] = e[i]; o.__l9s = true;
    for (let i = 0; i < 11; i++) if (i !== 3 && i !== 7) e[i] *= k;
    e[12] = q[0] + (e[12] - q[0]) * k; e[13] = q[1] + (e[13] - q[1]) * k; e[14] = q[2] + (e[14] - q[2]) * k;
  }
  function rimetti(o) { o.__l9s = false; const e = o.matrixWorld.elements; for (let i = 0; i < 16; i++) e[i] = SAVE[i]; }
  function installa() {
    T3 = window.THREE; sph = new T3.Sphere();
    const rd = K.renderer, sm = rd.shadowMap;
    const r0 = rd.render; rd.render = function (scene, camera) { const m = scene === K.scene && camera === K.camera(); if (m) inMain++; try { return r0.apply(this, arguments); } finally { if (m) inMain--; } };
    const s0 = sm.render; sm.render = function () { inShadow++; try { return s0.apply(this, arguments); } finally { inShadow--; } };
    const io = T3.Frustum.prototype.intersectsObject;
    T3.Frustum.prototype.intersectsObject = function (o) { const v = io.call(this, o); if (!v || !inMain || inShadow || !acceso) return v; return prova(o, false); };
    const O3 = T3.Object3D.prototype, ob = O3.onBeforeRender, oa = O3.onAfterRender;
    O3.onBeforeRender = function (r, sc, camera) { if (this.__l9f === frameId) stringi(this, camera); return ob.apply(this, arguments); };
    O3.onAfterRender = function () { if (this.__l9s) rimetti(this); return oa.apply(this, arguments); };
    const is = T3.Frustum.prototype.intersectsSprite;
    T3.Frustum.prototype.intersectsSprite = function (o) { const v = is.call(this, o); if (!v || !inMain || inShadow || !acceso) return v; return prova(o, true); };
    pronto = true;
  }
  // prima del disegno: la camera, il ventaglio. on: camera9 accesa, fuori (render.js)
  function prima(kit, W, on) {
    if (!ON) return; K = kit; if (!pronto) installa();
    const cam = K.camera(); acceso = !!(attivo && on && cam && cam.isPerspectiveCamera); ST.on = acceso; if (!acceso) return;
    const t0 = performance.now(); frameId++; ST.fotogrammi++;
    if (OCC_ON && !griglia(W)) OCC = null;
    cam.updateMatrixWorld(); const e = cam.matrixWorld.elements; cx = e[12]; cy = e[13]; cz = e[14];
    // la camera dentro il pieno (non dovrebbe: il braccio la tiene fuori): niente occlusione
    // la camera nella casella di una casa (la casella è di 2 m: il braccio la tiene fuori dai muri veri, non dalla griglia): ogni colonna
    // comincia a contare il pieno solo dopo esserne uscita
    occF = !!OCC; camDentro = false; if (OCC) { const tx = Math.floor(cx / TS), ty = Math.floor(cz / TS); if (tx < 0 || ty < 0 || tx >= GW || ty >= GH) occF = false; else camDentro = OCC[ty * GW + tx] > -1e8; }
    // il ventaglio: l'azimut dello sguardo e la metà dell'apertura in pianta (dai quattro spigoli del quadro), più un margine
    const fx = -e[8], fz = -e[10]; az0 = Math.atan2(fz, fx);
    const th = Math.tan(cam.fov * Math.PI / 360), tw = th * cam.aspect; let amax = 0;
    for (const sy of [-1, 1]) for (const sx of [-1, 1]) {   // la direzione dello spigolo nel mondo
      const lx = sx * tw, ly = sy * th, lz = -1, wx = e[0] * lx + e[4] * ly + e[8] * lz, wz = e[2] * lx + e[6] * ly + e[10] * lz;
      if (wx * wx + wz * wz < 1e-6) { amax = Math.PI; break; } let d = Math.atan2(wz, wx) - az0; d = Math.abs(Math.atan2(Math.sin(d), Math.cos(d))); if (d > amax) amax = d; }
    A = Math.min(Math.PI, amax + 3 * Math.PI / 180); NC = Math.min(NCMAX, Math.ceil(2 * A / P.dA));
    if (NC >= NCMAX) A = NC * P.dA / 2;   // (guarda giù a piombo: il ventaglio più largo che c'è; fuori decide il frustum)
    // la camera ferma (stesso punto, stesso sguardo): le colonne del fotogramma prima valgono ancora
    const U = ultima; if (!(U[0] === cx && U[1] === cy && U[2] === cz && U[3] === az0 && U[4] === A)) { colId++; U[0] = cx; U[1] = cy; U[2] = cz; U[3] = az0; U[4] = A; }
    ST.ms += performance.now() - t0;
  }
  function conto() { return Object.assign({ ON, attivo, P: Object.assign({}, P) }, ST); }
  function azzera() { for (const k in ST) if (typeof ST[k] === 'number') ST[k] = 0; }
  // per le sonde: la prova senza tagliare
  function perche(o) { if (!pronto || !acceso) return null; const sprite = !!o.isSprite; if (!(sprite ? sferaSprite(o) : sferaMesh(o))) return 'senza sfera';
    const c = sph.center, r = sph.radius, dx = c.x - cx, dy = c.y - cy, dz = c.z - cz, d = Math.sqrt(dx * dx + dy * dy + dz * dz) - r;
    const D = taglio(o, r), pic = D > 0 && d > D, b = occF && r > BOXK && !sprite ? scatola(o) : null, occ = occF && (b ? occlusoB(b[0], b[1], b[2], b[3], b[4], b[5]) : occluso(c.x, c.y, c.z, r + pad));
    return { x: c.x, y: c.y, z: c.z, r: +r.toFixed(2), d: +d.toFixed(1), piccola: pic, occlusa: occ, taglio: D }; }
  // per le prove in Node (test_lontano9.js): la camera in (x, y, z) che guarda verso l'azimut az con mezza apertura a (rad)
  function ventaglio(W, x, y, z, az, a) { if (!griglia(W)) return false; cx = x; cy = y; cz = z; az0 = az; A = a; NC = Math.min(NCMAX, Math.ceil(2 * A / P.dA)); frameId++; colId++; ultima[0] = NaN; occF = true; const tx = Math.floor(x / TS), ty = Math.floor(z / TS); camDentro = tx >= 0 && ty >= 0 && tx < GW && ty < GH && OCC[ty * GW + tx] > -1e8; return true; }
  return { ON, P, MIS, prima, ventaglio, occlusoB, conto, azzera, perche, occluso, get attivo() { return attivo; }, set attivo(v) { attivo = !!v; }, get griglia() { return OCC; } };
})();
if (typeof window !== 'undefined') window.Lontano9 = Lontano9;
if (typeof module !== 'undefined' && module.exports) module.exports = Lontano9;
