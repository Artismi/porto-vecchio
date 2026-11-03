// [disposizione] LA SONDA DELLA DISPOSIZIONE: arredo e oggetti messi male nella città nuova, misurati sul gioco vero.
// Carica il gioco in Chromium senza testa (SwiftShader) con ?sondadisp: render.js annota ogni cosa posata (addStatic e i gruppi fusi
// delle case e dei tetti) col tipo (Arredo3D, i tetti vissuti, i gruppi del piano), chi l'ha posata (la funzione) e la scatola nel suo
// riferimento (il davanti è +z, come dice arredo3d.js), più lo spostamento del regista ([pulizia2]) e del rumore. Qui si misura, per tipo:
//   a sedia_spalle   una sedia (o sdraio) che volta le spalle al tavolino più vicino entro 1,5 m
//   b contro_muro    una seduta (sedia, panchina, sdraio) col muro (o il parapetto del tetto) a meno di 60 cm davanti
//   c muro_staccato  una cosa a muro (userData.aMuro, o le voci a muro del regista) a più di 5 cm dal muro; muro_verso: girata verso il muro;
//                    senza_muro: nessun muro entro 1,5 m
//   d sospeso / affondato   la base sopra quello che c'è sotto (terra, tetto, un'altra cosa) oltre 4 cm, o sotto il suolo oltre 10 cm
//   e fuori_tetto / sbalzo  il piede fuori dal tetto su cui sta, o uno spigolo sul vuoto (oltre 30 cm sotto) col centro appoggiato
//   f porta / scala  sopra la zona libera davanti a una porta, ai piedi di una scala, sull'arrivo di una scala o di una passerella sul tetto
//   g urto           due cose che si compenetrano (oltre 5 cm; sedia e tavolino, le tele e i telai vuoti no)
//   h doppione       due cose uguali nello stesso punto
// Stampa il conto per tipo e per funzione e salva il json (reports/sonda_disposizione.json o l'argomento).
//   node strumenti/sonda_disposizione.js [uscita.json]     PV_QUERY='&altro' si aggiunge all'indirizzo; PV_PAGINA=altra.html
const path = require('path'), http = require('http'), fs = require('fs');
let pw; try { pw = require('playwright'); } catch (e) { pw = require(process.env.PW || '/opt/node22/lib/node_modules/playwright'); }
const root = path.resolve(__dirname, '..'), args = process.argv.slice(2);
const outJ = path.resolve(args.find(a => a.endsWith('.json')) || path.join(root, 'reports', 'sonda_disposizione.json'));
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.gz': 'application/gzip' };
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const t0 = Date.now(), b = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: 480, height: 300 } }); const visti = new Set();
  pg.on('pageerror', e => console.log('[errore]', e.message, (e.stack || '').split('\n').slice(0, 3).join(' | ')));
  pg.on('console', m => { const t = m.text(); if ((m.type() === 'error' || /shader/i.test(t)) && !visti.has(t.slice(0, 120))) { visti.add(t.slice(0, 120)); console.log('[console]', t.slice(0, 400)); } });
  // la città costruita tutta nel browser (niente tasselli, niente anelli), con le geometrie tenute (i raggi le leggono)
  const url = `http://localhost:${srv.address().port}/${process.env.PV_PAGINA || 'index.html'}?cittanuova&leggera&tasselli=0&tutto&nolibera1&nopigre&sondadisp${process.env.PV_QUERY || ''}`;
  console.log('apro', url.replace(/^http:\/\/localhost:\d+/, ''));
  await pg.goto(url, { timeout: 600000 });
  await pg.waitForFunction(() => window.__tl && window.__tl.gioco && window.__pulizia2, null, { timeout: 1200000, polling: 2000 });
  console.log('caricato in', Math.round((Date.now() - t0) / 1000), 's');
  const out = await pg.evaluate(misura);
  out.tempo = Math.round((Date.now() - t0) / 1000); out.url = url.replace(/^http:\/\/localhost:\d+/, '');
  fs.mkdirSync(path.dirname(outJ), { recursive: true }); fs.writeFileSync(outJ, JSON.stringify(out, null, 1));
  stampa(out); console.log('\nsalvato', path.relative(process.cwd(), outJ), 'in', out.tempo, 's');
  await b.close(); srv.close();
});

// ================= la misura, dentro la pagina =================
function misura() {
  const D = window.__sondaDisp(), R = window.__pv.R, gH = R.groundH, T3 = window.THREE, scene = R.__models.scene, TT = window.Tetti;
  if (!D) return { errore: 'niente __sondaDisp (manca ?sondadisp?)' };
  const SEDIE = /^(sedia|impagliata|sdraio|lettino)$/, PANCHE = /^panchina/, TAVOLI = /^(tavolino|tavolo)$/;
  const MURO2 = new Set(['insegna', 'tenda', 'pluviale', 'applique', 'tabellone', 'festone', 'balcone', 'portale', 'serranda', 'citofono', 'rete', 'bucato', 'scorcio_muro', 'scorcio_filo']);
  const VUOTI = /^(telo|stuoia|ombrellone|ombrellone_mare|fermata|edicola|chiosco|cabina_sip|bancarella|impalcatura|gruppo:(pergola|altana|bucato|stanza)|tettoia|tenda|bucato|festone)/;   // telai e tele: sotto si sta
  const APPESI = /^(telo|stuoia|fuori:|colatura|malta|gronda:|lampione_muro|staffa_cartello|isolatore|mensola|targa_via|civico|contatore|edicola_votiva|insegna|tenda)/;   // non stanno appoggiati a terra
  const PALI = /^(paletto|paletti_catena|cartello|lampione|semaforo|idrante|cestino|cassetta_postale|fontanella|ombrellone|antenna_tv|transenna|jersey)/;   // la base piantata nel selciato
  const r2 = v => Math.round(v * 100) / 100;
  // ---- le voci: assi, scatola nel mondo, impronta orientata ----
  const V = [];
  const VASI = /vas[oi]|^latta$|fioriera|^(pot|oPot)/;   // i vasi (vaso, vaso_appeso, fioriera_tetto, gruppo:vasi...)   // i vasi li rifà un altro filone: fuori dal conto
  const ARCH = new Set(['gradino', 'porta', 'scala', 'tombino', 'passerella', 'vetrina', 'grande', 'portale', 'serranda', 'scorcio', 'scorcio_muro', 'scorcio_filo', 'balcone', 'tettoia']);   // architettura del registro: non è arredo
  let nVasi = 0, nArch = 0;
  D.voci.forEach((q, i) => { const m = q.m, lb = q.lb; if (!(lb[3] - lb[0] >= 0)) return;
    if (((q.t === 'arredo' || q.t === 'pezzo') && !q.reg) || ARCH.has(q.k2)) { nArch++; return; }   // senza tipo e fuori dal registro: architettura e suolo (volumi, strade), non arredo
    if (VASI.test(q.t) || VASI.test(String(q.chi || '').split(':').pop()) || /^pot\b|^oPot/.test(q.chi || '')) { nVasi++; return; }
    const ex = [m[0], m[1], m[2]], ey = [m[4], m[5], m[6]], ez = [m[8], m[9], m[10]], o = [m[12], m[13], m[14]];
    let y0 = Infinity, y1 = -Infinity; for (let k = 0; k < 8; k++) { const x = k & 1 ? lb[3] : lb[0], y = k & 2 ? lb[4] : lb[1], z = k & 4 ? lb[5] : lb[2]; const wy = o[1] + ex[1] * x + ey[1] * y + ez[1] * z; y0 = Math.min(y0, wy); y1 = Math.max(y1, wy); }
    const lx = Math.hypot(ex[0], ex[2]) || 1, lz = Math.hypot(ez[0], ez[2]) || 1, mx = (lb[0] + lb[3]) / 2, my = (lb[1] + lb[4]) / 2, mz = (lb[2] + lb[5]) / 2;
    const cx = o[0] + ex[0] * mx + ey[0] * my + ez[0] * mz, cz = o[2] + ex[2] * mx + ey[2] * my + ez[2] * mz;
    const u = [ex[0] / lx, ex[2] / lx], v = [ez[0] / lz, ez[2] / lz], hu = (lb[3] - lb[0]) / 2 * lx, hv = (lb[5] - lb[2]) / 2 * lz;
    if (!isFinite(cx + cz + y0 + y1)) return;
    const e = { i, t: q.t, chi: q.chi || '?', fn: String(q.chi || '?').replace(/:\d+$/, ''), k2: q.k2, g: q.g, muro: !!q.muro, palo: !!q.palo, F: q.F, o, cx, cz, u, v, hu, hv, y0, y1, f: v, h: y1 - y0 };
    e.cs = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, c]) => [cx + u[0] * hu * a + v[0] * hv * c, cz + u[1] * hu * a + v[1] * hv * c]);
    V.push(e); });
  // griglia a 2 m
  const GR = new Map(), k2g = (i, j) => i * 100000 + j; V.forEach(e => { const r = Math.max(e.hu, e.hv); for (let i = Math.floor((e.cx - r) / 2); i <= Math.floor((e.cx + r) / 2); i++) for (let j = Math.floor((e.cz - r) / 2); j <= Math.floor((e.cz + r) / 2); j++) { const k = k2g(i, j); let a = GR.get(k); if (!a) GR.set(k, a = []); a.push(e); } });
  const vicini = (x, z, r, fn) => { const s = new Set(); for (let i = Math.floor((x - r) / 2); i <= Math.floor((x + r) / 2); i++) for (let j = Math.floor((z - r) / 2); j <= Math.floor((z + r) / 2); j++) for (const e of GR.get(k2g(i, j)) || []) if (!s.has(e)) { s.add(e); fn(e); } };
  // ---- le case del regista: rettangoli girati dal piede al tetto ----
  const H = D.case.map(h => Object.assign({}, h)), HG = new Map();
  const inH = (h, x, z, m) => { const uu = x * h.c - z * h.s, vv = x * h.s + z * h.c; return uu > h.u0 - m && uu < h.u1 + m && vv > h.v0 - m && vv < h.v1 + m; };
  H.forEach(h => { const cs = [[h.u0, h.v0], [h.u1, h.v0], [h.u1, h.v1], [h.u0, h.v1]].map(([a, c]) => [a * h.c + c * h.s, -a * h.s + c * h.c]); h.cs = cs;
    const xs = cs.map(p => p[0]), zs = cs.map(p => p[1]); for (let i = Math.floor(Math.min(...xs) / 8); i <= Math.floor(Math.max(...xs) / 8); i++) for (let j = Math.floor(Math.min(...zs) / 8); j <= Math.floor(Math.max(...zs) / 8); j++) { const k = k2g(i, j); let a = HG.get(k); if (!a) HG.set(k, a = []); a.push(h); } });
  const caseIn = (x, z, m) => (HG.get(k2g(Math.floor(x / 8), Math.floor(z / 8))) || []).filter(h => inH(h, x, z, m || 0));
  const caseVicine = (x, z, r) => { const s = new Set(); for (let i = Math.floor((x - r) / 8); i <= Math.floor((x + r) / 8); i++) for (let j = Math.floor((z - r) / 8); j <= Math.floor((z + r) / 8); j++) for (const h of HG.get(k2g(i, j)) || []) s.add(h); return [...s]; };
  // la faccia della casa più vicina a un punto: la normale fuori e la distanza col segno (fuori positivo)
  const faccia = (h, x, z) => { const uu = x * h.c - z * h.s, vv = x * h.s + z * h.c, L = [[uu - h.u0, [-h.c, h.s]], [h.u1 - uu, [h.c, -h.s]], [vv - h.v0, [-h.s, -h.c]], [h.v1 - vv, [h.s, h.c]]];
    const dentro = uu > h.u0 && uu < h.u1 && vv > h.v0 && vv < h.v1; if (dentro) { L.sort((a, b) => a[0] - b[0]); return { d: -L[0][0], n: L[0][1] }; }
    const du = Math.max(h.u0 - uu, 0, uu - h.u1), dv = Math.max(h.v0 - vv, 0, vv - h.v1), d = Math.hypot(du, dv); let n; if (du >= dv) n = uu < h.u0 ? [-h.c, h.s] : [h.c, -h.s]; else n = vv < h.v0 ? [-h.s, -h.c] : [h.s, h.c]; return { d, n }; };
  // ---- i raggi: le mesh della scena (non le persone, non le istanze, non i fantasmi) ----
  const MS = [], MI = []; scene.traverse(o => { if (o.isMesh && !o.isSkinnedMesh && o.geometry && o.geometry.attributes.position) { for (let p = o; p; p = p.parent) if (p.visible === false) return; const mt = o.material; if (mt && (mt.visible === false || (mt.transparent && mt.opacity < .05) || mt.colorWrite === false || mt.side === T3.BackSide)) return; (o.isInstancedMesh ? MI : MS).push(o); } });
  // le mesh in una griglia a 8 m per la loro scatola nel mondo: un raggio verticale prova solo quelle che ha sopra o sotto
  const MG = new Map(), BB = new T3.Box3(), GRANDI = [], TMP = new T3.Mesh(), IM4 = new T3.Matrix4();
  const metti = (o, bb) => { o.__bb = bb; if ((bb.max.x - bb.min.x) * (bb.max.z - bb.min.z) > 1e5) { GRANDI.push(o); return; }   // il terreno e il mare: si provano sempre
    for (let i = Math.floor(bb.min.x / 8); i <= Math.floor(bb.max.x / 8); i++) for (let j = Math.floor(bb.min.z / 8); j <= Math.floor(bb.max.z / 8); j++) { const k = k2g(i, j); let a = MG.get(k); if (!a) MG.set(k, a = []); a.push(o); } };
  MS.forEach(o => { const g = o.geometry; if (!g.boundingBox) g.computeBoundingBox(); BB.copy(g.boundingBox).applyMatrix4(o.matrixWorld); if (isFinite(BB.min.x)) metti(o, BB.clone()); });
  let nIst = 0; MI.forEach(im => { if (im.count > 50000) return; const g = im.geometry; if (!g.boundingBox) g.computeBoundingBox(); for (let i = 0; i < im.count; i++) { im.getMatrixAt(i, IM4); const W = new T3.Matrix4().multiplyMatrices(im.matrixWorld, IM4); BB.copy(g.boundingBox).applyMatrix4(W); if (!isFinite(BB.min.x)) continue; nIst++; metti({ ist: im, W }, BB.clone()); } });   // le istanze (la pila di [leggero], il kit): una per una
  const RC = new T3.Raycaster(), DN = new T3.Vector3(0, -1, 0), P0 = new T3.Vector3(); RC.firstHitOnly = true;
  let nRaggi = 0; const sotto = (x, y, z, far) => { nRaggi++; far = far || 30; const L = (MG.get(k2g(Math.floor(x / 8), Math.floor(z / 8))) || []).concat(GRANDI).filter(o => { const b = o.__bb; return x >= b.min.x && x <= b.max.x && z >= b.min.z && z <= b.max.z && b.min.y <= y && b.max.y >= y - far; });
    const gq0 = gH(x, z), gt = gq0 >= y - far ? Math.min(gq0, y) : null;   // un suolo più alto del raggio (lo spigolo a monte) regge lì   // il suolo lo disegna lo shader (i vertici spostati sulla scheda): i raggi non lo vedono, vale groundH
    if (!L.length) return gt; P0.set(x, y, z); RC.set(P0, DN); RC.near = 0; RC.far = far; let best = null;
    for (const o of L) { const a = []; if (o.ist) { TMP.geometry = o.ist.geometry; TMP.material = o.ist.material; TMP.matrixWorld.copy(o.W); TMP.raycast(RC, a); } else o.raycast(RC, a); for (const h of a) if (h.distance <= far && (best === null || h.point.y > best)) best = h.point.y; } return gt !== null && (best === null || gt > best) ? gt : best; };
  const out = { voci: V.length, vasi: nVasi, architettura: nArch, istanze: nIst, case: H.length, mesh: MS.length, difetti: [], per: {}, perFn: {}, perTipo: {} };
  const segna = (cat, e, det) => { out.difetti.push([cat, e.t, e.chi, r2(e.cx), r2(e.cz), r2(e.y0), det === undefined ? '' : det]); out.per[cat] = (out.per[cat] || 0) + 1; const kf = cat + '|' + e.fn, kt = cat + '|' + e.t; out.perFn[kf] = (out.perFn[kf] || 0) + 1; out.perTipo[kt] = (out.perTipo[kt] || 0) + 1; };
  const sedia = e => SEDIE.test(e.t), panca = e => PANCHE.test(e.t), tavolo = e => TAVOLI.test(e.t);
  const gq = e => { let a = Infinity, b = -Infinity; e.cs.concat([[e.cx, e.cz]]).forEach(([x, z]) => { const h = gH(x, z); a = Math.min(a, h); b = Math.max(b, h); }); return [a, b]; };
  // i raggi partono 1,5 cm sopra la base: nel profilo leggero le mesh fuse hanno i vertici a 16 bit (qualche millimetro di errore) e il piano
  // vero può stare un filo sopra la base della cosa; da sotto la base lo si saltava e si leggeva il piano di sotto (13 cm più giù sui terrazzi)
  V.forEach(e => { const [a, b] = gq(e); e.gmin = a; e.gmax = b; e.alto = e.y0 > b + .6; });
  const appeso = e => e.muro || MURO2.has(e.k2) || APPESI.test(e.t);
  // ---- a) la sedia e il tavolino ----
  const tavoli = V.filter(tavolo);
  V.filter(sedia).forEach(e => { let best = null, bd = 1.5; vicini(e.cx, e.cz, 1.5, t => { if (!tavolo(t) || Math.abs(t.y0 - e.y0) > .5) return; const d = Math.hypot(t.cx - e.cx, t.cz - e.cz); if (d < bd) { bd = d; best = t; } });
    e.tav = best; if (!best || bd < .05) return; const dot = (e.f[0] * (best.cx - e.cx) + e.f[1] * (best.cz - e.cz)) / bd;
    let altro = false; vicini(e.cx, e.cz, bd + .2, t => { if (!tavolo(t) || t === best || Math.abs(t.y0 - e.y0) > .5) return; const d2 = Math.hypot(t.cx - e.cx, t.cz - e.cz); if (d2 < bd + .15 && (e.f[0] * (t.cx - e.cx) + e.f[1] * (t.cz - e.cz)) / d2 > .5) { altro = true; e.tav = t; } });   // fra due tavolini quasi alla pari: basta guardarne uno
    if (dot < 0 && !altro) segna('a_sedia_spalle', e, 'dot ' + r2(dot) + ' a ' + r2(bd) + ' m'); });
  // ---- b) la seduta col muro davanti ----
  V.filter(e => sedia(e) || panca(e)).forEach(e => {
    if (e.tav) { const d = Math.hypot(e.tav.cx - e.cx, e.tav.cz - e.cz); if ((e.f[0] * (e.tav.cx - e.cx) + e.f[1] * (e.tav.cz - e.cz)) / (d || 1) > .3) return; }   // guarda il suo tavolino
    const y = e.y0 + .45, sopra = caseIn(e.cx, e.cz, 0).filter(h => e.y0 > h.y1 - 2.5 && e.y0 < h.y1 + 3)[0];   // sul tetto: il parapetto è il bordo della casa
    for (const s of [.1, .3, .5]) { const x = e.cx + e.f[0] * (e.hv + s), z = e.cz + e.f[1] * (e.hv + s);
      if (sopra) { if (!inH(sopra, x, z, -.28)) { segna('b_contro_muro', e, 'parapetto a ' + r2(s) + ' m'); return; } continue; }
      if (caseIn(x, z, 0).some(h => y > h.y0 && y < h.y1)) { segna('b_contro_muro', e, 'muro a ' + r2(s) + ' m'); return; } } });
  // ---- c) le cose a muro ----
  V.filter(e => e.muro || MURO2.has(e.k2)).forEach(e => { if (e.h < .01) return;
    let best = null; caseVicine(e.cx, e.cz, 1.5).forEach(h => { if (e.y1 < h.y0 || e.y0 > h.y1 + .3) return; const F = faccia(h, e.cx, e.cz); if (!best || Math.abs(F.d) < Math.abs(best.d)) best = Object.assign(F, { h }); });
    if (!best || best.d > 1.5) { if (e.muro) segna('c_senza_muro', e); return; }
    const n = best.n, h = best.h, uu = e.cx * h.c - e.cz * h.s, vv = e.cx * h.s + e.cz * h.c;
    if (best.d < -.5) return;   // dentro la casa (le voci della casa stessa: balconi, insegne nel vano)
    const fp = e.cs.map(([x, z]) => { const F = faccia(h, x, z); return F.d; }), dietro = Math.min(...fp);
    if (dietro > .05) segna('c_muro_staccato', e, r2(dietro) + ' m');
    if (e.muro && e.f[0] * n[0] + e.f[1] * n[1] < -.5) segna('c_muro_verso', e, 'dot ' + r2(e.f[0] * n[0] + e.f[1] * n[1]));
    void uu; void vv; });
  // ---- d, e) appoggio: sospeso, affondato, fuori dal tetto, sullo spigolo del vuoto ----
  const piatto = e => e.h < .06;
  const PIANTE = /(^|:)(erba|valeriana|cappero)$/;   // i ciuffi nascono dalle fughe: un po' dentro è giusto
  V.forEach(e => { if (appeso(e) || piatto(e) || VUOTI.test(e.t) || e.t === 'pezzo' || PIANTE.test(e.t) || e.hu * e.hv * 4 > 30) return;
    const inset = PALI.test(e.t) || e.h > 2.2 ? [] : e.cs.map(([x, z]) => [e.cx + (x - e.cx) * .6, e.cz + (z - e.cz) * .6]), c0 = PALI.test(e.t) || e.h > 2.2 ? [e.o[0], e.o[2]] : [e.cx, e.cz];   // le cose alte e sottili: sotto il piede (l'origine), non sotto la testa larga
    if (!e.alto) {   // a terra: la quota del suolo; poi i raggi decidono (scalini, pedane, marciapiedi, una cosa sotto)
      if (e.y0 > e.gmax + .04) { const gs = [c0].concat(inset).map(([x, z]) => sotto(x, e.y0 + .015, z, 3)); const gap = Math.min(...gs.map(g => g === null ? 9 : e.y0 - g));
        if (gap > .04) segna('d_sospeso', e, r2(gap) + ' m'); }
      else if (e.y0 < e.gmin - .1 && !PALI.test(e.t)) segna('d_affondato', e, r2(e.gmin - e.y0) + ' m');
    } else {   // in alto: sui tetti, sui balconi, su un'altra cosa
      const gs = [c0].concat(inset).map(([x, z]) => sotto(x, e.y0 + .015, z, 40)), gap = Math.min(...gs.map(g => g === null ? 99 : e.y0 - g));
      if (gap > .04) { segna(gap > 30 ? 'd_nel_vuoto' : 'd_sospeso', e, r2(gap) + ' m'); return; }
      const fuori = e.cs.map(([x, z]) => { const g = sotto(x + (x - e.cx) * .02, e.y0 + .6, z + (z - e.cz) * .02, 40); return g === null ? -99 : g; }), su = Math.min(...fuori);
      if (su > e.y0 + .1) segna('d_affondato', e, r2(su - e.y0) + ' m');
      // il tetto: la casa sotto il centro, alla quota giusta; il piede fuori dal suo rettangolo
      const hs = caseIn(e.cx, e.cz, 0).filter(h => e.y0 > h.y1 - 3 && e.y0 < h.y1 + 3);
      if (hs.length && !(PALI.test(e.t) || e.h > 2.2)) { const h = hs[0], fuoriM = Math.max(...e.cs.map(([x, z]) => faccia(h, x, z).d)), tol = /^falda:/.test(e.t) ? .6 : .02;
        if (fuoriM > tol) segna('e_fuori_tetto', e, r2(fuoriM) + ' m'); }
    }
    // lo spigolo sul vuoto: il centro appoggiato, uno spigolo con più di 30 cm sotto
    if (e.hu * e.hv * 4 > .04 && e.h < 2.2 && !PALI.test(e.t)) { const yc = sotto(e.cx, e.y0 + .05, e.cz, 40); if (yc !== null && e.y0 - yc < .1) { const gc = e.cs.map(([x, z]) => sotto(x, e.y0 + .05, z, 40)), peggio = Math.max(...gc.map(g => g === null ? 99 : e.y0 - g));
      if (peggio > .3) { const GG = window.__pv.G, gc0 = gH(e.cx, e.cz), dg = Math.max(...e.cs.map(([x, z]) => gc0 - gH(x, z))), acqua = e.cs.some(([x, z]) => GG.tileAt && GG.tileAt(Math.floor(x / GG.TS), Math.floor(z / GG.TS)) === GG.T.WATER);
        segna('e_sbalzo', e, r2(peggio) + ' m sotto uno spigolo · groundH ' + r2(dg) + (acqua ? ' · acqua' : '')); } } }
  });
  // ---- f) porte e scale ----
  const ZN = D.zone.filter(z => z.t === 'porta' || z.t === 'scala').map(z => Object.assign({}, z));
  const satR = (A, B) => {   // la compenetrazione in pianta di due rettangoli (spigoli), 0 se separati
    let pen = Infinity; for (const P of [A, B]) for (let k = 0; k < 2; k++) { const a = P[k], b = P[k + 1], ax = b[0] - a[0], az = b[1] - a[1], L = Math.hypot(ax, az) || 1, nx = ax / L, nz = az / L;
      let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity; A.forEach(p => { const q = p[0] * nx + p[1] * nz; a0 = Math.min(a0, q); a1 = Math.max(a1, q); }); B.forEach(p => { const q = p[0] * nx + p[1] * nz; b0 = Math.min(b0, q); b1 = Math.max(b1, q); });
      const o = Math.min(a1, b1) - Math.max(a0, b0); if (o <= 0) return 0; pen = Math.min(pen, o); } return pen; };
  ZN.forEach(z => { z.cs = [[z.u0, z.v0], [z.u1, z.v0], [z.u1, z.v1], [z.u0, z.v1]].map(([a, c]) => [a * z.c + c * z.s, -a * z.s + c * z.c]); z.cx = (z.cs[0][0] + z.cs[2][0]) / 2; z.cz = (z.cs[0][1] + z.cs[2][1]) / 2; });
  const arrivi = []; if (TT) { const qt = (x, z) => { const q = TT.roofAt ? TT.roofAt(x, z) : null; return q ? q.h : undefined; };
    (TT.LADDERS || []).forEach(L => { if (L.tx !== undefined) arrivi.push({ x: L.tx, z: L.ty, k: 'scala_tetto', y: L.hTop != null ? L.hTop : qt(L.tx, L.ty) }); });
    (TT.PLANKS || []).forEach(Q => { if (Q.wa) arrivi.push({ x: Q.wa[0] - Q.ox * .5, z: Q.wa[1] - Q.oy * .5, k: 'passerella', y: qt(Q.wa[0] - Q.ox * .5, Q.wa[1] - Q.oy * .5) }); if (Q.wb) arrivi.push({ x: Q.wb[0] + Q.ox * .5, z: Q.wb[1] + Q.oy * .5, k: 'passerella', y: qt(Q.wb[0] + Q.ox * .5, Q.wb[1] + Q.oy * .5) }); }); }
  (R.__buildings || []).forEach(rec => { if (rec && rec.roofHatch && rec.box3) arrivi.push({ x: rec.roofHatch[0], z: rec.roofHatch[1], k: 'botola', y: rec.box3.max.y - 2.5 }); });
  out.arrivi = arrivi.length;
  V.forEach(e => { if (appeso(e) || piatto(e) || VUOTI.test(e.t) || e.t === 'pezzo') return;
    for (const z of ZN) { if (Math.abs(z.cx - e.cx) > 4 || Math.abs(z.cz - e.cz) > 4) continue; if (e.y0 > z.y1 - .05 || e.y1 < z.y0 + .05) continue; const p = satR(e.cs, z.cs); if (p > .05) { segna('f_' + z.t, e, r2(p) + ' m'); return; } }
    if (e.alto) for (const a of arrivi) { if (Math.abs(a.x - e.cx) > 3 || Math.abs(a.z - e.cz) > 3) continue; if (a.y !== undefined && Math.abs(a.y - e.y0) > 1.5) continue;
      const uu = (a.x - e.cx) * e.u[0] + (a.z - e.cz) * e.u[1], vv = (a.x - e.cx) * e.v[0] + (a.z - e.cz) * e.v[1], d = Math.hypot(Math.max(0, Math.abs(uu) - e.hu), Math.max(0, Math.abs(vv) - e.hv));
      if (d < .5) { segna('f_' + a.k, e, r2(d) + ' m'); return; } } });
  // ---- g) urti e h) doppioni ----
  const cielo = e => VUOTI.test(e.t) || /malta$/.test(e.t) || /^(gruppo:|tetto$|casa$)/.test(e.t) && e.h > 1.8;
  V.forEach(e => { if (piatto(e) || cielo(e) || e.t === 'pezzo' || e.muro) return; const r = Math.max(e.hu, e.hv) + 3;
    vicini(e.cx, e.cz, r, o => { if (o.i <= e.i || o.g === e.g || piatto(o) || cielo(o) || o.t === 'pezzo' || o.muro) return;
      if ((sedia(e) || panca(e)) && tavolo(o) || (sedia(o) || panca(o)) && tavolo(e)) return;   // la sedia sotto il tavolino
      if (e.palo || o.palo) return;   // la staffa stretta al palo che c'è già (aPalo): il contatto è voluto
      if (o.t === e.t && Math.hypot(o.cx - e.cx, o.cz - e.cz) < .2 && Math.abs(o.y0 - e.y0) < .1 && Math.abs(o.h - e.h) < .1) { segna('h_doppione', e, 'con ' + o.chi); return; }
      const yo = Math.min(e.y1, o.y1) - Math.max(e.y0, o.y0); if (yo <= .05) return; const p = satR(e.cs, o.cs); if (p > .05) segna('g_urto', e, o.t + ' (' + o.chi + ') ' + r2(p) + ' m'); }); });
  // la diagnosi dei sospesi sui tetti: cosa c'è davvero sotto (tutte le mesh, anche quelle che i raggi saltano)
  try { out.diag = out.difetti.filter(d => d[0] === 'd_sospeso' && parseFloat(d[6]) > 1).slice(0, 4).map(d => { const RC2 = new T3.Raycaster(new T3.Vector3(d[3], d[5] + .5, d[4]), DN, 0, 10), hs = []; scene.traverse(o => { if (!o.isMesh) return; try { o.raycast(RC2, hs); } catch (e) { } }); hs.sort((p, q) => p.distance - q.distance);
    return [d[1], d[5]].concat(hs.slice(0, 8).map(h => { let vis = true; for (let p = h.object; p; p = p.parent) if (p.visible === false) vis = false; const mt = h.object.material || {}; const gb = h.object.geometry; if (gb && !gb.boundingBox) gb.computeBoundingBox(); return [r2(h.point.y), h.object.type, h.object.name || '', mt.name || '', mt.color ? '#' + mt.color.getHexString() : '', gb ? r2(gb.boundingBox.max.y - gb.boundingBox.min.y) + 'h' : '', h.object.parent ? h.object.parent.type + ':' + (h.object.parent.name || '') : '', vis ? 'v' : 'INV', mt.transparent ? 'T' + r2(mt.opacity) : '', mt.side, mt.colorWrite === false ? 'NOCW' : '', mt.visible === false ? 'MATINV' : '', h.object.isInstancedMesh ? 'IST' + h.object.count : '', MS.includes(h.object) ? 'inMS' : 'fuoriMS', mt.type || ''].join(' '); })); }); } catch (e) { out.diag = [String(e)]; }
  out.raggi = nRaggi;
  out.tipi = {}; V.forEach(e => { out.tipi[e.t] = (out.tipi[e.t] || 0) + 1; });
  return out;
}

// ================= la stampa =================
function stampa(o) {
  if (o.errore) { console.log('ERRORE', o.errore); return; }
  console.log(`\nvoci ${o.voci} (fuori: vasi ${o.vasi}, architettura ${o.architettura}) · istanze ${o.istanze} · case ${o.case} · mesh ${o.mesh} · raggi ${o.raggi} · arrivi sul tetto ${o.arrivi}`);
  console.log('\nDIFETTI PER TIPO'); const cats = Object.keys(o.per).sort(); let tot = 0; cats.forEach(c => { tot += o.per[c]; console.log('  ' + c.padEnd(18) + String(o.per[c]).padStart(6)); }); console.log('  ' + 'totale'.padEnd(18) + String(tot).padStart(6));
  console.log('\nPER FUNZIONE (tipo | chi l\'ha posata)'); Object.entries(o.perFn).sort((a, b) => b[1] - a[1]).slice(0, 60).forEach(([k, n]) => console.log('  ' + String(n).padStart(5) + '  ' + k));
  console.log('\nPER OGGETTO (tipo | oggetto)'); Object.entries(o.perTipo).sort((a, b) => b[1] - a[1]).slice(0, 50).forEach(([k, n]) => console.log('  ' + String(n).padStart(5) + '  ' + k));
  (o.diag || []).forEach(d => console.log('DIAG', JSON.stringify(d)));
  console.log('\nESEMPI'); cats.forEach(c => o.difetti.filter(d => d[0] === c).slice(0, 6).forEach(d => console.log('  ' + d.join('  '))));
}
