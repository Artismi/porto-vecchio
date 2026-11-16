// [insegne_e] LA SONDA DEL MONTAGGIO DELLE COSE PIATTE: insegne, cartelli, targhe, civici, manifesti, adesivi, lavagne, stencil... misurati
// sul gioco vero (città nuova, costruita nel browser). Il direttore: «spesso si compenetrano col muro o ne risultano staccati».
// Come: ogni mesh della scena con una tela disegnata (CanvasTexture, l'atlante della segnaletica, quello degli scorci) si spezza nei suoi
// pezzi piani (componenti connesse, complanari entro 2 mm); i pezzi verticali piccoli (0,005–14 m²) sono le «cose piatte». Per ognuna,
// dal centro e da quattro punti appena dentro gli spigoli, un raggio arriva da fuori lungo la sua normale e attraversa tutto (le facce
// contate da tutte e due le parti: ogni materiale DoubleSide per la durata della sonda, poi rimesso):
//   sepolta     la faccia disegnata sta DENTRO un solido (il muro, la cornice, la lesena): non si vede o si vede a tratti
//   zfight      una faccia di altro davanti o dietro entro 2,5 mm (complanare: sfarfalla, nel profilo leggero i vertici a 16 bit sbagliano di mm)
//   staccata    fra la faccia disegnata e il primo solido dietro (la sua tavola, poi il muro) c'è aria per più di 15 mm, senza staffa
//   nel_vuoto   dietro, entro 1 m, non c'è niente (davanti a un vano, a un vetro tolto, oltre lo spigolo)
// Le cose a bandiera (il piano perpendicolare al muro) si misurano a parte: il bordo verso il muro dentro il muro (bandiera_dentro) o
// lontano più di 6 cm senza niente in mezzo (bandiera_staccata). Le cose a palo (nessun muro entro 1,5 m da nessuna parte) si contano e basta.
// Il nome della fonte: material.userData.grafica (render.js graf, segnaletica.js, scorci_arte.js, arredo3d.js); con opz.tutte anche ogni
// altra tela (larghezza × altezza e tipo del materiale). I materiali col polygonOffset (le decalcomanie) a filo del muro non sono zfight.
//   node strumenti/sonda_insegne.js [uscita.json]    PV_QUERY='&insegne2' si aggiunge; PV_PAGINA=altra.html
// Dalla pagina già aperta: require('./sonda_insegne.js').SONDA è la funzione da dare a page.evaluate.
const path = require('path'), http = require('http'), fs = require('fs');

async function SONDA(opz) {
  opz = opz || {};
  const T3 = window.THREE, R = window.__pv.R, scene = R.__models.scene, r3 = v => Math.round(v * 1000) / 1000;
  const BVH = window.MeshBVHLib;
  // ---- le mesh: tutte quelle visibili (anche le istanze), in una griglia a 6 m ----
  const MS = []; scene.traverse(o => { if (!o.isMesh || o.isSkinnedMesh || !o.geometry || !o.geometry.attributes.position) return; for (let p = o; p; p = p.parent) if (p.visible === false) return; const mt = o.material; if (!mt || Array.isArray(mt) && !mt.length) return; const m0 = Array.isArray(mt) ? mt[0] : mt; if (m0.visible === false || m0.colorWrite === false || (m0.transparent && m0.opacity < .05)) return; MS.push(o); });
  scene.updateMatrixWorld(true);
  const GR = new Map(), K = (i, j) => i * 100003 + j, BB = new T3.Box3(), CS = 6;
  const metti = (it, bb) => { if ((bb.max.x - bb.min.x) * (bb.max.z - bb.min.z) > 4e4) return; for (let i = Math.floor(bb.min.x / CS); i <= Math.floor(bb.max.x / CS); i++) for (let j = Math.floor(bb.min.z / CS); j <= Math.floor(bb.max.z / CS); j++) { const k = K(i, j); let a = GR.get(k); if (!a) GR.set(k, a = []); a.push(it); } it.bb = bb; };
  const IM4 = new T3.Matrix4();
  MS.forEach(o => { const g = o.geometry; if (!g.boundingBox) g.computeBoundingBox(); if (o.isInstancedMesh) { for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, IM4); const W = new T3.Matrix4().multiplyMatrices(o.matrixWorld, IM4); BB.copy(g.boundingBox).applyMatrix4(W); if (isFinite(BB.min.x)) metti({ o, W, ist: i }, BB.clone()); } return; }
    BB.copy(g.boundingBox).applyMatrix4(o.matrixWorld); if (isFinite(BB.min.x)) metti({ o, W: o.matrixWorld }, BB.clone()); });
  // ---- le cose piatte: le mesh con una tela ----
  const tela = m => { const t = m && m.map; if (!t) return null; const im = t.image; if (!im) return null; const c = typeof HTMLCanvasElement !== 'undefined' && im instanceof HTMLCanvasElement || typeof OffscreenCanvas !== 'undefined' && im instanceof OffscreenCanvas || t.isCanvasTexture; return c ? (im.width || 0) + 'x' + (im.height || 0) : null; };
  const nomeDi = (m, o) => (m.userData && m.userData.grafica) || (o.userData && o.userData.grafica) || ((m.type || '').replace(/Mesh|Material/g, '') + ':' + tela(m) + (m.transparent ? ':tr' : '') + (m.alphaTest ? ':at' : '') + (m.polygonOffset ? ':po' : ''));
  const V3 = () => new T3.Vector3(), a = V3(), b = V3(), c = V3(), n = V3(), e1 = V3(), e2 = V3();
  const cose = [];
  MS.forEach(o => { if (o.isInstancedMesh) return; const mats = Array.isArray(o.material) ? o.material : [o.material]; const g = o.geometry, P = g.attributes.position, I = g.index, groups = g.groups && g.groups.length ? g.groups : [{ start: 0, count: I ? I.count : P.count, materialIndex: 0 }];
    groups.forEach(gr => { const m = mats[gr.materialIndex || 0] || mats[0]; if (!m || !(m.userData && m.userData.grafica) && !(opz.tutte && tela(m))) return; if (m.side === T3.BackSide) return;
      const nT = Math.floor(gr.count / 3), idx = t => I ? I.getX(gr.start + t) : gr.start + t; if (nT > 60000) return;
      // le componenti: vertici uniti per posizione (1 mm) e per normale della faccia (stesso piano)
      const par = new Map(), find = x => { while (par.get(x) !== x) { par.set(x, par.get(par.get(x))); x = par.get(x); } return x; }, uni = (x, y) => { x = find(x); y = find(y); if (x !== y) par.set(x, y); };
      const tris = [];
      for (let t = 0; t < nT; t++) { const i0 = idx(t * 3), i1 = idx(t * 3 + 1), i2 = idx(t * 3 + 2); a.fromBufferAttribute(P, i0).applyMatrix4(o.matrixWorld); b.fromBufferAttribute(P, i1).applyMatrix4(o.matrixWorld); c.fromBufferAttribute(P, i2).applyMatrix4(o.matrixWorld);
        e1.subVectors(b, a); e2.subVectors(c, a); n.crossVectors(e1, e2); const ar = n.length() / 2; if (ar < 1e-7) continue; n.normalize();
        const kn = Math.round(n.x * 20) + ',' + Math.round(n.y * 20) + ',' + Math.round(n.z * 20), ks = [a, b, c].map(v => Math.round(v.x * 1000) + ',' + Math.round(v.y * 1000) + ',' + Math.round(v.z * 1000) + '|' + kn);
        ks.forEach(k => { if (!par.has(k)) par.set(k, k); }); uni(ks[0], ks[1]); uni(ks[1], ks[2]); tris.push({ k: ks[0], p: [a.clone(), b.clone(), c.clone()], n: n.clone(), ar }); }
      const comp = new Map(); tris.forEach(t => { const r = find(t.k); let q = comp.get(r); if (!q) comp.set(r, q = { tris: [], ar: 0, n: V3() }); q.tris.push(t); q.ar += t.ar; q.n.addScaledVector(t.n, t.ar); });
      comp.forEach(q => { if (q.ar < .004 || q.ar > 14) return; q.n.normalize(); if (Math.abs(q.n.y) > .35) return;   // in piano (le strisce a terra, i tetti) no
        const N = q.n.clone(); N.y = 0; N.normalize(); const Tg = new T3.Vector3(N.z, 0, -N.x);   // la tangente orizzontale
        let u0 = 1e9, u1 = -1e9, y0 = 1e9, y1 = -1e9, d0 = 1e9, d1 = -1e9; const O = q.tris[0].p[0];
        q.tris.forEach(t => t.p.forEach(p => { const dx = p.x - O.x, dz = p.z - O.z, u = dx * Tg.x + dz * Tg.z, d = dx * N.x + dz * N.z; u0 = Math.min(u0, u); u1 = Math.max(u1, u); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); d0 = Math.min(d0, d); d1 = Math.max(d1, d); }));
        if (d1 - d0 > .003) return;   // non piano
        if (u1 - u0 < .05 || y1 - y0 < .04) return;
        const dm = (d0 + d1) / 2, C = new T3.Vector3(O.x + Tg.x * (u0 + u1) / 2 + N.x * dm, (y0 + y1) / 2, O.z + Tg.z * (u0 + u1) / 2 + N.z * dm);
        cose.push({ o, m, nome: nomeDi(m, o), C, N, Tg, w: u1 - u0, h: y1 - y0, ar: q.ar, tris: q.tris.length }); }); }); });
  // ---- i raggi: tutte le facce, da tutte e due le parti ----
  const sideOld = new Map(); MS.forEach(o => (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m && !sideOld.has(m)) { sideOld.set(m, m.side); m.side = T3.DoubleSide; } }));
  const RC = new T3.Raycaster(), TMP = new T3.Mesh(), nm = new T3.Matrix3(), WN = V3();
  const lancia = (P0, D, far) => { RC.set(P0, D); RC.near = 0; RC.far = far; RC.firstHitOnly = false; const end = P0.clone().addScaledVector(D, far), L = new Set();
    for (const p of [P0, end]) { const k = K(Math.floor(p.x / CS), Math.floor(p.z / CS)); for (const it of GR.get(k) || []) L.add(it); }
    const H = []; L.forEach(it => { const bb = it.bb; if (RC.ray.intersectsBox(bb) === false) return; const out = []; if (it.ist !== undefined) { TMP.geometry = it.o.geometry; TMP.material = it.o.material; TMP.matrixWorld.copy(it.W); TMP.raycast(RC, out); out.forEach(h => { h.object = it.o; h.ist = it.ist; h.W = it.W; }); } else it.o.raycast(RC, out);
      out.forEach(h => { if (!h.face) return; nm.getNormalMatrix(h.W || h.object.matrixWorld); WN.copy(h.face.normal).applyMatrix3(nm).normalize(); h.dn = WN.dot(D); h.mat = Array.isArray(h.object.material) ? h.object.material[h.face.materialIndex || 0] : h.object.material; H.push(h); }); });
    H.sort((p, q) => p.distance - q.distance); return H; };
  const STACCO = opz.stacco || .015, ZF = opz.zf || .0025;
  const out = { mesh: MS.length, cose: cose.length, per: {}, perFonte: {}, difetti: [], fonti: {} };
  const segna = (cat, q, det) => { out.per[cat] = (out.per[cat] || 0) + 1; const kf = q.nome; (out.perFonte[kf] = out.perFonte[kf] || {})[cat] = (out.perFonte[kf][cat] || 0) + 1; out.difetti.push([cat, q.nome, r3(q.C.x), r3(q.C.y), r3(q.C.z), r3(q.N.x), r3(q.N.z), r3(q.w), r3(q.h), det]); };
  const D = V3(), P0 = V3();
  const propria = (h, q) => h.object === q.o && h.mat === q.m && Math.abs(h.point.clone().sub(q.C).dot(q.N)) < .002;
  // un raggio da fuori: cosa c'è prima della faccia, cosa c'è dopo (l'aria fino al primo solido, poi fino al muro)
  const pila = (q, su, sy) => { P0.copy(q.C).addScaledVector(q.Tg, su * q.w / 2).setY(q.C.y + sy * q.h / 2).addScaledVector(q.N, .6); D.copy(q.N).negate();
    const H = lancia(P0, D, 1.65), ip = H.findIndex(h => propria(h, q)); if (ip < 0) return { manca: true };
    const tp = H[ip].distance; let dentro = 0, zf = null; const altri = H.filter((h, i) => i !== ip && !(h.mat && (h.mat.transparent && (h.mat.opacity < .95 || h.mat.depthWrite === false) || h.mat.userData && h.mat.userData.vetro)) && !(h.mat && h.mat.userData && h.mat.userData.grafica && Math.abs(h.distance - tp) < .0005 && h.object === q.o));
    const po = q.m.polygonOffset && q.m.polygonOffsetFactor < 0;
    altri.forEach(h => { if (h.distance < tp - .3) return; if (h.distance < tp - ZF) dentro += h.dn < 0 ? 1 : -1; else if (!po && Math.abs(h.distance - tp) <= ZF && Math.abs(h.dn) > .5) zf = zf === null ? Math.abs(h.distance - tp) : Math.min(zf, Math.abs(h.distance - tp)); });
    // dopo la faccia: la prima faccia verso fuori (dn < 0: guarda il raggio che arriva), poi se il suo solido finisce (dn > 0) e riprende
    // dopo la faccia: gli intervalli di solido (si entra con dn < 0, si esce con dn > 0), uniti se si toccano; il MURO è il primo solido
    // spesso almeno 4 cm (o che non finisce entro la finestra); l'aria è il vuoto più largo fra la faccia e il muro (fra la tavola e il muro)
    const dopo = altri.filter(h => h.distance > tp + ZF && Math.abs(h.dn) > .5 && h.distance - tp < 1.0), IV = []; let lv = 0, a0 = null;
    for (const h of dopo) { if (h.dn < 0) { if (lv === 0) a0 = h.distance; lv++; } else if (lv > 0) { lv--; if (lv === 0) { IV.push([a0, h.distance]); a0 = null; } } }
    if (lv > 0) IV.push([a0, tp + 1.0]);
    const U = []; IV.forEach(v => { const L = U[U.length - 1]; if (L && v[0] <= L[1] + .002) L[1] = Math.max(L[1], v[1]); else U.push(v.slice()); });
    let aria = 0, pos = tp, muro = null, primo = U.length ? U[0][0] - tp : null;
    for (const v of U) { aria = Math.max(aria, v[0] - pos); if (v[1] - v[0] >= .04 || v[1] >= tp + .999) { muro = v[0] - tp; break; } pos = v[1]; }
    if (muro === null) primo = null;   // solo tavole sottili e poi niente: un pannello (bandiera, palo)
    return { dentro: dentro > 0, zf, aria: primo === null ? null : aria, primo }; };
  const SU = [[0, 0], [-.8, -.7], [.8, -.7], [-.8, .7], [.8, .7]];
  if (opz.traccia) { const T = []; const cnt = {}; for (const q of cose) { if (opz.traccia.fonte && q.nome !== opz.traccia.fonte) continue; if (opz.traccia.dentro && !pila(q, 0, 0).dentro) continue; cnt[q.nome] = (cnt[q.nome] || 0) + 1; if (cnt[q.nome] > (opz.traccia.n || 4)) continue;
      P0.copy(q.C).addScaledVector(q.N, .6); D.copy(q.N).negate(); const H = lancia(P0, D, 1.65);
      T.push({ nome: q.nome, C: [q.C.x, q.C.y, q.C.z].map(r3), N: [q.N.x, q.N.z].map(r3), w: r3(q.w), h: r3(q.h), hits: H.map(h => [r3(h.distance - .6), r3(h.dn), (h.mat && (h.mat.userData.grafica || h.mat.name || h.mat.type)) + (h.object === q.o ? '*' : ''), h.object.name || h.object.type, propria(h, q) ? 'P' : '']) }); }
    sideOld.forEach((s, m) => { m.side = s; }); return T; }
  let nPalo = 0, nBand = 0, nOk = 0;
  for (const q of cose) {
    // il muro: davanti/dietro (lungo la normale) o di fianco (bandiera)?
    const dietro = pila(q, 0, 0);
    if (dietro.manca) { (out.per.non_misurata = (out.per.non_misurata || 0) + 1); continue; }
    if (dietro.primo === null) {   // niente dietro entro 1 m: a bandiera, a palo o nel vuoto
      let lato = null; for (const s of [1, -1]) { P0.copy(q.C).addScaledVector(q.Tg, s * (q.w / 2 + .02)); D.copy(q.Tg).multiplyScalar(s); const H = lancia(P0, D, 1.4).filter(h => !propria(h, q) && Math.abs(h.dn) > .7 && h.dn < 0); if (H.length && (!lato || H[0].distance < lato.d)) lato = { d: H[0].distance, s }; }
      // il bordo verso il muro dentro il muro: dall'altro lato, raggio verso il muro dall'interno della faccia
      let pen = 0; for (const s of [1, -1]) { P0.copy(q.C); D.copy(q.Tg).multiplyScalar(s); const H = lancia(P0, D, q.w / 2 + .01).filter(h => Math.abs(h.dn) > .7 && h.object !== q.o); if (H.length && H[0].dn < 0) pen = Math.max(pen, q.w / 2 - H[0].distance); }
      if (pen > .01) { nBand++; segna('bandiera_dentro', q, r3(pen) + ' m dentro'); continue; }
      if (lato && lato.d < 1.4) { nBand++; if (lato.d > .06) { // c'è qualcosa in mezzo (la staffa)? un raggio un filo sopra e sotto il bordo
          let staffa = false; for (const dy of [q.h / 2 + .03, q.h / 2 + .08, q.h / 2 - .04, 0, -q.h / 2 + .04, -q.h / 2 - .03]) { P0.copy(q.C).addScaledVector(q.Tg, lato.s * (q.w / 2 + .005)).setY(q.C.y + dy); D.copy(q.Tg).multiplyScalar(lato.s); const H = lancia(P0, D, lato.d + .05).filter(h => !propria(h, q)); if (H.length && (H[0].distance < lato.d - .03 || H[0].dn > 0)) { staffa = true; break; } /* qualcosa in mezzo, o si parte già dentro il braccio */ }
          if (!staffa) segna('bandiera_staccata', q, r3(lato.d) + ' m'); else nOk++; } else nOk++; continue; }
      // davanti: forse è un cartello col retro, o una tavola a palo
      P0.copy(q.C).addScaledVector(q.N, -.01); D.copy(q.N).negate(); const H2 = lancia(P0, D, 1.5).filter(h => !propria(h, q) && h.dn < -.5);
      if (!H2.length || H2[0].distance > .3) { nPalo++; continue; }   // a palo (anche davanti a un muro lontano)
      segna('nel_vuoto', q, 'muro a ' + r3(H2[0].distance) + ' m'); continue; }
    const P = [dietro].concat(SU.slice(1).map(([su, sy]) => pila(q, su, sy))).filter(p => !p.manca);
    const sep = P.filter(p => p.dentro).length, zfs = P.filter(p => p.zf !== null && !p.dentro), stac = P.filter(p => p.aria !== null && p.aria > STACCO), vuoto = P.filter(p => p.primo === null).length;
    let bad = false;
    if (sep) { segna(sep >= 3 ? 'sepolta' : 'sepolta_in_parte', q, sep + '/' + P.length + ' punti'); bad = true; }
    if (zfs.length >= 2) { segna('zfight', q, r3(Math.min(...zfs.map(p => p.zf)) * 1000) + ' mm'); bad = true; }
    if (!sep && stac.length >= 3) { segna('staccata', q, r3(Math.min(...stac.map(p => p.aria)) * 1000) + '–' + r3(Math.max(...stac.map(p => p.aria)) * 1000) + ' mm'); bad = true; }
    if (!sep && vuoto >= 2) { segna('mezza_nel_vuoto', q, vuoto + '/' + P.length + ' punti senza niente dietro'); bad = true; }
    if (!bad) nOk++;
  }
  sideOld.forEach((s, m) => { m.side = s; });
  out.ok = nOk; out.palo = nPalo; out.bandiere = nBand;
  cose.forEach(q => { out.fonti[q.nome] = (out.fonti[q.nome] || 0) + 1; });
  return out;
}

if (require.main === module) {
  const root = path.resolve(__dirname, '..'), args = process.argv.slice(2);
  const outJ = path.resolve(args.find(a => a.endsWith('.json')) || path.join(root, 'reports', 'sonda_insegne.json'));
  const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.gz': 'application/gzip' };
  let pw; try { pw = require('playwright'); } catch (e) { pw = require(process.env.PW || '/opt/node22/lib/node_modules/playwright'); }
  const srv = http.createServer((req, res) => { let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html'; if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
    const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); }).listen(0, async () => {
    const t0 = Date.now(), b = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
    const pg = await b.newPage({ viewport: { width: 480, height: 300 } });
    pg.on('pageerror', e => console.log('[errore]', e.message));
    const url = `http://localhost:${srv.address().port}/${process.env.PV_PAGINA || 'index.html'}?cittanuova&tasselli=0&tutto&nolibera1&nopigre${process.env.PV_QUERY || ''}`;
    await pg.goto(url, { timeout: 600000 });
    await pg.waitForFunction(() => window.__tl && window.__tl.gioco && window.__pulizia2, null, { timeout: 1200000, polling: 2000 });
    await pg.waitForTimeout(8000);
    const out = await pg.evaluate(SONDA, {});
    out.url = url.replace(/^http:\/\/localhost:\d+/, ''); out.tempo = Math.round((Date.now() - t0) / 1000);
    fs.mkdirSync(path.dirname(outJ), { recursive: true }); fs.writeFileSync(outJ, JSON.stringify(out, null, 1));
    console.log('cose piatte', out.cose, 'ok', out.ok, 'a palo', out.palo, 'bandiere', out.bandiere); console.log(JSON.stringify(out.per));
    Object.entries(out.perFonte).sort((p, q) => Object.values(q[1]).reduce((s, v) => s + v, 0) - Object.values(p[1]).reduce((s, v) => s + v, 0)).slice(0, 30).forEach(([k, v]) => console.log(' ', k.padEnd(40), JSON.stringify(v)));
    console.log('salvato', outJ, out.tempo, 's'); await b.close(); srv.close(); });
}
module.exports = { SONDA };
