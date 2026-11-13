// [pulizia_globale] LA PROVA DI TUTTA LA CITTÀ, a città costruita (Chromium senza testa, la città nuova costruita nel browser con
// ?sondadisp&pulglob: render.js annota ogni cosa posata col tipo, chi l'ha posata e la scatola; in più le corde coi capi, i pezzi
// staccati dal loro corpo e le barche; game.js dà la fisica del passo). Conta, per categoria e per generatore (file:funzione):
//   a_sospeso      la base a più di 5 cm da quello che c'è sotto (suolo, tetto, un'altra cosa); a_nel_vuoto oltre 30 m
//   b_urto         due cose che si compenetrano (oltre 5 cm in pianta e in quota); b_muro dentro il volume di una casa;
//   b_barca        barche che si compenetrano fra loro o con la terra (moli, banchine), cose dentro una barca
//   c_corda        corde, cime, fili con un capo (o due) lontano da un ancoraggio (bitta, palo, pilone, anello, muro, barca)
//   d_staccato     parti di una cosa che non toccano il corpo (oltre 5 cm: le barre sollevate dalla barca)
//   e_verde        ciuffi, erbe, capperi che non nascono da terra, aiuola, piede di muro, bordo o ciglio
//   f_passaggio    cose a terra che lasciano meno di 1 m libero nel passaggio (la fisica del passo: walkM); f_carreggiata
//                  sulla carreggiata; f_porta / f_scala davanti a una porta o ai piedi di una scala
//   g_quota        il suolo che salta più di 30 cm fra due caselle praticabili confinanti senza un muro fra loro (il passo lo scavalca)
//   g_colore       il lastrico che cambia di colpo (pietra o tinta) fra due caselle dello stesso tipo, alla stessa quota
//   h_ruotato      cose rettangolari a meno di 1,2 m da un muro, girate più di 8° fuori asse rispetto al muro
//   node strumenti/pulizia_globale.js [uscita.json]      PV_QUERY='&altro'   PV_PAGINA=altra.html
const path = require('path'), http = require('http'), fs = require('fs');
let pw; try { pw = require('playwright'); } catch (e) { pw = require(process.env.PW || '/opt/node22/lib/node_modules/playwright'); }
const root = path.resolve(__dirname, '..'), args = process.argv.slice(2);
const outJ = path.resolve(args.find(a => a.endsWith('.json')) || path.join(root, 'reports', 'pulizia_globale.json'));
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.gz': 'application/gzip' };
// la riga di index.html → il file di src/ (come lo compone build.py: la riga di PV_VER in più prima del primo <script)
function mappaRighe() {
  let h = fs.readFileSync(path.join(root, 'src/index.src.html'), 'utf8'); const i = h.indexOf('<script'); h = h.slice(0, i) + '\n' + h.slice(i);
  const FUORI = new Set(['studio.js', 'skate.js']), M = []; let riga = 1, k = 0; const re = /\/\*([a-z0-9_.]+\.js)\*\//g; let m;
  while ((m = re.exec(h))) { riga += (h.slice(k, m.index).match(/\n/g) || []).length; k = m.index + m[0].length;
    const f = m[1]; if (FUORI.has(f)) continue; let c = ''; try { c = fs.readFileSync(path.join(root, 'src', f), 'utf8'); } catch (e) { continue; }
    const n = (c.match(/\n/g) || []).length; M.push([riga, riga + n, f]); riga += n; }
  return r => { for (const q of M) if (r >= q[0] && r <= q[1]) return [q[2], r - q[0] + 1]; return ['index.html', r]; };
}
const fileDi = mappaRighe();
const gen = chi => { const m = /^([\w$.<>]+):(\d+)$/.exec(chi || ''); if (!m) return [String(chi || '?'), '']; const [f, r] = fileDi(+m[2]); return [f + ':' + m[1], f + ':' + r]; };
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const t0 = Date.now(), b = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: 480, height: 300 } }); const visti = new Set();
  pg.on('pageerror', e => console.log('[errore]', e.message, (e.stack || '').split('\n').slice(0, 3).join(' | ')));
  pg.on('console', m => { const t = m.text(); if (m.type() === 'error' && !/404/.test(t) && !visti.has(t.slice(0, 120))) { visti.add(t.slice(0, 120)); console.log('[console]', t.slice(0, 300)); } });
  const url = `http://localhost:${srv.address().port}/${process.env.PV_PAGINA || 'index.html'}?cittanuova&leggera&tasselli=0&tutto&nolibera1&nopigre&sondadisp&pulglob${process.env.PV_QUERY || ''}`;
  await pg.goto(url, { timeout: 600000 });
  await pg.waitForFunction(() => window.__tl && window.__tl.gioco && window.__pulizia2, null, { timeout: 1500000, polling: 2000 });
  console.log('caricato in', Math.round((Date.now() - t0) / 1000), 's');
  const out = await pg.evaluate(misura);
  if (out.errore) { console.log('ERRORE', out.errore); process.exit(1); }
  out.per = {}; out.perGen = {};
  out.difetti.forEach(d => { const [g, r] = gen(d[2]); d[2] = g; d[7] = r; out.per[d[0]] = (out.per[d[0]] || 0) + 1; const k = d[0] + ' | ' + d[2] + ' | ' + d[1]; out.perGen[k] = (out.perGen[k] || 0) + 1; });
  out.tempo = Math.round((Date.now() - t0) / 1000);
  fs.mkdirSync(path.dirname(outJ), { recursive: true }); fs.writeFileSync(outJ, JSON.stringify(out));
  const cats = Object.keys(out.per).sort(); let tot = 0;
  console.log(`\nvoci ${out.voci} · case ${out.case} · corde ${out.corde} · barche ${out.barche} · cose provate per le parti ${out.cose} · ciuffi ${out.verde}`);
  console.log('\nPER CATEGORIA'); cats.forEach(c => { tot += out.per[c]; console.log('  ' + c.padEnd(16) + String(out.per[c]).padStart(6)); }); console.log('  ' + 'totale'.padEnd(16) + String(tot).padStart(6));
  console.log('\nPER GENERATORE (categoria | file:funzione | tipo)'); Object.entries(out.perGen).sort((a, b) => b[1] - a[1]).slice(0, +(process.env.RIGHE || 70)).forEach(([k, n]) => console.log('  ' + String(n).padStart(5) + '  ' + k));
  console.log('\nsalvato', path.relative(process.cwd(), outJ), 'in', out.tempo, 's');
  await b.close(); srv.close();
});

// ================= la misura, dentro la pagina =================
function misura() {
  const D = window.__sondaDisp(), PG = window.__PG1, PW = window.__PG_walk, R = window.__pv.R, G = window.__pv.G, gH = R.groundH, T3 = window.THREE, scene = R.__models.scene;
  if (!D || !PG || !PW) return { errore: 'manca ?sondadisp&pulglob (o game.js senza __PG_walk)' };
  const T = G.T, TS = G.TS, tile = (x, z) => G.tileAt(Math.floor(x / TS), Math.floor(z / TS)), WL = -.45, muro1 = window.__PV_muro1;
  const r2 = v => Math.round(v * 100) / 100, out = { difetti: [], voci: 0, case: D.case.length };
  const segna = (cat, t, chi, x, z, y, det) => out.difetti.push([cat, t, chi, r2(x), r2(z), r2(y), det === undefined ? '' : det]);
  const MURO2 = new Set(['insegna', 'tenda', 'pluviale', 'applique', 'tabellone', 'festone', 'balcone', 'portale', 'serranda', 'citofono', 'rete', 'bucato', 'scorcio_muro', 'scorcio_filo']);
  const VUOTI = /^(telo|stuoia|ombrellone|ombrellone_mare|fermata|edicola|chiosco|cabina_sip|bancarella|impalcatura|gruppo:(pergola|altana|bucato|stanza)|tettoia|tenda|bucato|festone)/;
  const APPESI = /^(telo|stuoia|fuori:|colatura|malta|gronda:|lampione_muro|lampione_boom|lanterna_braccio|staffa_cartello|isolatore|mensola|targa_via|civico|contatore|edicola_votiva|insegna|tenda|cassetta$|vaso_appeso)/;
  const PALI = /^(paletto|paletti_catena|cartello|lampione|semaforo|idrante|cestino|cassetta_postale|fontanella|ombrellone|antenna_tv|transenna|jersey|palo|pennone|asta|traliccio)/;
  const ARCH = new Set(['gradino', 'porta', 'scala', 'tombino', 'passerella', 'vetrina', 'grande', 'portale', 'serranda', 'scorcio', 'scorcio_muro', 'scorcio_filo', 'balcone', 'tettoia']);
  const VERDE = /(^|:)(erba|valeriana|cappero|ciuffo|muschio|felce|parietaria|ortica|malva|tarassaco|papavero|cespo|erbaccia)$/;
  const SEDIE = /^(sedia|impagliata|sdraio|lettino)$/, TAVOLI = /^(tavolino|tavolo)$/, VIVI = /^(gatto|cane|piccione|gabbiano|persona)/;
  // ---- le voci ----
  const V = [];
  D.voci.forEach((q, i) => { const m = q.m, lb = q.lb; if (!(lb[3] - lb[0] >= 0)) return;
    if (((q.t === 'arredo' || q.t === 'pezzo') && !q.reg) || ARCH.has(q.k2)) return;
    const ex = [m[0], m[1], m[2]], ey = [m[4], m[5], m[6]], ez = [m[8], m[9], m[10]], o = [m[12], m[13], m[14]];
    let y0 = Infinity, y1 = -Infinity; for (let k = 0; k < 8; k++) { const x = k & 1 ? lb[3] : lb[0], y = k & 2 ? lb[4] : lb[1], z = k & 4 ? lb[5] : lb[2]; const wy = o[1] + ex[1] * x + ey[1] * y + ez[1] * z; y0 = Math.min(y0, wy); y1 = Math.max(y1, wy); }
    const lx = Math.hypot(ex[0], ex[2]) || 1, lz = Math.hypot(ez[0], ez[2]) || 1, mx = (lb[0] + lb[3]) / 2, my = (lb[1] + lb[4]) / 2, mz = (lb[2] + lb[5]) / 2;
    const cx = o[0] + ex[0] * mx + ey[0] * my + ez[0] * mz, cz = o[2] + ex[2] * mx + ey[2] * my + ez[2] * mz;
    const u = [ex[0] / lx, ex[2] / lx], v = [ez[0] / lz, ez[2] / lz], hu = (lb[3] - lb[0]) / 2 * lx, hv = (lb[5] - lb[2]) / 2 * lz;
    if (!isFinite(cx + cz + y0 + y1)) return;
    const e = { i, t: q.t, chi: q.chi || '?', k2: q.k2, g: q.g, muro: !!q.muro, palo: !!q.palo, o, cx, cz, u, v, hu, hv, y0, y1, h: y1 - y0, tilt: Math.abs(ey[1]) / (Math.hypot(ey[0], ey[1], ey[2]) || 1) };
    e.cs = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, c]) => [cx + u[0] * hu * a + v[0] * hv * c, cz + u[1] * hu * a + v[1] * hv * c]);
    V.push(e); });
  out.voci = V.length;
  const GR = new Map(), k2g = (i, j) => i * 100000 + j; V.forEach(e => { const r = Math.max(e.hu, e.hv); for (let i = Math.floor((e.cx - r) / 2); i <= Math.floor((e.cx + r) / 2); i++) for (let j = Math.floor((e.cz - r) / 2); j <= Math.floor((e.cz + r) / 2); j++) { const k = k2g(i, j); let a = GR.get(k); if (!a) GR.set(k, a = []); a.push(e); } });
  const vicini = (x, z, r, fn) => { const s = new Set(); for (let i = Math.floor((x - r) / 2); i <= Math.floor((x + r) / 2); i++) for (let j = Math.floor((z - r) / 2); j <= Math.floor((z + r) / 2); j++) for (const e of GR.get(k2g(i, j)) || []) if (!s.has(e)) { s.add(e); fn(e); } };
  // ---- le case ----
  const H = D.case, HG = new Map();
  const inH = (h, x, z, m) => { const uu = x * h.c - z * h.s, vv = x * h.s + z * h.c; return uu > h.u0 - m && uu < h.u1 + m && vv > h.v0 - m && vv < h.v1 + m; };
  H.forEach(h => { const cs = [[h.u0, h.v0], [h.u1, h.v0], [h.u1, h.v1], [h.u0, h.v1]].map(([a, c]) => [a * h.c + c * h.s, -a * h.s + c * h.c]); h.cs = cs;
    const xs = cs.map(p => p[0]), zs = cs.map(p => p[1]); for (let i = Math.floor(Math.min(...xs) / 8); i <= Math.floor(Math.max(...xs) / 8); i++) for (let j = Math.floor(Math.min(...zs) / 8); j <= Math.floor(Math.max(...zs) / 8); j++) { const k = k2g(i, j); let a = HG.get(k); if (!a) HG.set(k, a = []); a.push(h); } });
  const caseIn = (x, z, m) => (HG.get(k2g(Math.floor(x / 8), Math.floor(z / 8))) || []).filter(h => inH(h, x, z, m || 0));
  const caseVicine = (x, z, r) => { const s = new Set(); for (let i = Math.floor((x - r) / 8); i <= Math.floor((x + r) / 8); i++) for (let j = Math.floor((z - r) / 8); j <= Math.floor((z + r) / 8); j++) for (const h of HG.get(k2g(i, j)) || []) s.add(h); return [...s]; };
  const faccia = (h, x, z) => { const uu = x * h.c - z * h.s, vv = x * h.s + z * h.c, L = [[uu - h.u0, [-h.c, h.s]], [h.u1 - uu, [h.c, -h.s]], [vv - h.v0, [-h.s, -h.c]], [h.v1 - vv, [h.s, h.c]]];
    const dentro = uu > h.u0 && uu < h.u1 && vv > h.v0 && vv < h.v1; if (dentro) { L.sort((a, b) => a[0] - b[0]); return { d: -L[0][0], n: L[0][1] }; }
    const du = Math.max(h.u0 - uu, 0, uu - h.u1), dv = Math.max(h.v0 - vv, 0, vv - h.v1), d = Math.hypot(du, dv); let n; if (du >= dv) n = uu < h.u0 ? [-h.c, h.s] : [h.c, -h.s]; else n = vv < h.v0 ? [-h.s, -h.c] : [h.s, h.c]; return { d, n }; };
  const satR = (A, B) => { let pen = Infinity; for (const P of [A, B]) for (let k = 0; k < 2; k++) { const a = P[k], b = P[k + 1], ax = b[0] - a[0], az = b[1] - a[1], L = Math.hypot(ax, az) || 1, nx = ax / L, nz = az / L;
      let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity; A.forEach(p => { const q = p[0] * nx + p[1] * nz; a0 = Math.min(a0, q); a1 = Math.max(a1, q); }); B.forEach(p => { const q = p[0] * nx + p[1] * nz; b0 = Math.min(b0, q); b1 = Math.max(b1, q); });
      const o = Math.min(a1, b1) - Math.max(a0, b0); if (o <= 0) return 0; pen = Math.min(pen, o); } return pen; };
  // ---- i raggi verso il basso (come strumenti/sonda_disposizione.js) ----
  const MS = [], MI = []; scene.traverse(o => { if (o.isMesh && !o.isSkinnedMesh && o.geometry && o.geometry.attributes.position) { for (let p = o; p; p = p.parent) if (p.visible === false) return; const mt = o.material; if (mt && (mt.visible === false || (mt.transparent && mt.opacity < .05) || mt.colorWrite === false || mt.side === T3.BackSide)) return; (o.isInstancedMesh ? MI : MS).push(o); } });
  const MG = new Map(), BB = new T3.Box3(), GRANDI = [], TMP = new T3.Mesh(), IM4 = new T3.Matrix4();
  const metti = (o, bb) => { o.__bb = bb; if ((bb.max.x - bb.min.x) * (bb.max.z - bb.min.z) > 1e5) { GRANDI.push(o); return; } for (let i = Math.floor(bb.min.x / 8); i <= Math.floor(bb.max.x / 8); i++) for (let j = Math.floor(bb.min.z / 8); j <= Math.floor(bb.max.z / 8); j++) { const k = k2g(i, j); let a = MG.get(k); if (!a) MG.set(k, a = []); a.push(o); } };
  MS.forEach(o => { const g = o.geometry; if (!g.boundingBox) g.computeBoundingBox(); BB.copy(g.boundingBox).applyMatrix4(o.matrixWorld); if (isFinite(BB.min.x)) metti(o, BB.clone()); });
  MI.forEach(im => { if (im.count > 50000) return; const g = im.geometry; if (!g.boundingBox) g.computeBoundingBox(); for (let i = 0; i < im.count; i++) { im.getMatrixAt(i, IM4); const W = new T3.Matrix4().multiplyMatrices(im.matrixWorld, IM4); BB.copy(g.boundingBox).applyMatrix4(W); if (isFinite(BB.min.x)) metti({ ist: im, W }, BB.clone()); } });
  const RC = new T3.Raycaster(), DN = new T3.Vector3(0, -1, 0), P0 = new T3.Vector3(); RC.firstHitOnly = true;
  const sotto = (x, y, z, far) => { const L = (MG.get(k2g(Math.floor(x / 8), Math.floor(z / 8))) || []).concat(GRANDI).filter(o => { const b = o.__bb; return x >= b.min.x && x <= b.max.x && z >= b.min.z && z <= b.max.z && b.min.y <= y && b.max.y >= y - far; });
    const gq0 = gH(x, z), gt = gq0 >= y - far ? Math.min(gq0, y) : null; if (!L.length) return gt; P0.set(x, y, z); RC.set(P0, DN); RC.near = 0; RC.far = far; let best = null;
    for (const o of L) { const a = []; if (o.ist) { TMP.geometry = o.ist.geometry; TMP.material = o.ist.material; TMP.matrixWorld.copy(o.W); TMP.raycast(RC, a); } else o.raycast(RC, a); for (const h of a) if (h.distance <= far && (best === null || h.point.y > best)) best = h.point.y; } return gt !== null && (best === null || gt > best) ? gt : best; };
  const appeso = e => e.muro || MURO2.has(e.k2) || APPESI.test(e.t), piatto = e => e.h < .06, verde = e => VERDE.test(e.t);
  V.forEach(e => { let a = Infinity, b = -Infinity; e.cs.concat([[e.cx, e.cz]]).forEach(([x, z]) => { const h = gH(x, z); a = Math.min(a, h); b = Math.max(b, h); }); e.gmin = a; e.gmax = b; e.alto = e.y0 > b + .6; });
  // ---- a) sospesi ----
  V.forEach(e => { if (appeso(e) || piatto(e) || VUOTI.test(e.t) || e.t === 'pezzo' || verde(e) || e.hu * e.hv * 4 > 30) return;
    const sott = PALI.test(e.t) || e.h > 2.2, c0 = sott ? [e.o[0], e.o[2]] : [e.cx, e.cz], inset = sott ? [] : e.cs.map(([x, z]) => [e.cx + (x - e.cx) * .6, e.cz + (z - e.cz) * .6]);
    if (!e.alto && e.y0 <= e.gmax + .05) return;
    const gs = [c0].concat(inset).map(([x, z]) => sotto(x, e.y0 + .015, z, e.alto ? 40 : 3)), gap = Math.min(...gs.map(g => g === null ? 99 : e.y0 - g));
    if (gap > .05) segna(gap > 30 ? 'a_nel_vuoto' : 'a_sospeso', e.t, e.chi, e.cx, e.cz, e.y0, r2(gap) + ' m'); });
  // appeso sotto qualcosa (la trave, il balcone): un raggio in su dal gancio (l'origine) trova una mesh entro 15 cm
  const UP = new T3.Vector3(0, 1, 0), RU = new T3.Raycaster();
  const appesoSopra = e => { const x = e.o[0], y = e.y1 + .01, z = e.o[2]; const L = (MG.get(k2g(Math.floor(x / 8), Math.floor(z / 8))) || []).filter(o => { const b = o.__bb; return x >= b.min.x && x <= b.max.x && z >= b.min.z && z <= b.max.z && b.max.y >= y && b.min.y <= y + .2; });
    P0.set(x, y, z); RU.set(P0, UP); RU.near = 0; RU.far = .18; for (const o of L) { const a = []; if (o.ist) { TMP.geometry = o.ist.geometry; TMP.material = o.ist.material; TMP.matrixWorld.copy(o.W); TMP.raycast(RU, a); } else o.raycast(RU, a); if (a.length) return true; } return false; };
  // le cose appese: devono toccare un muro (entro 15 cm), se no pendono dal nulla
  V.forEach(e => { if (!(APPESI.test(e.t) || e.muro) || e.h < .01 || /^(telo|stuoia)/.test(e.t)) return; let best = Infinity;
    caseVicine(e.cx, e.cz, 2).forEach(h => { if (e.y1 < h.y0 || e.y0 > h.y1 + .5) return; best = Math.min(best, Math.min(...e.cs.concat([[e.cx, e.cz]]).map(([x, z]) => faccia(h, x, z).d))); });
    if (best > .15 && !appesoSopra(e)) segna('a_sospeso', e.t, e.chi, e.cx, e.cz, e.y0, 'appeso a ' + (best === Infinity ? 'niente' : r2(best) + ' m dal muro')); });
  // ---- b) compenetrazioni: fra cose, con le case, con le barche ----
  const cielo = e => VUOTI.test(e.t) || /malta$/.test(e.t) || /^(gruppo:|tetto$|casa$)/.test(e.t) && e.h > 1.8;
  V.forEach(e => { if (piatto(e) || cielo(e) || e.t === 'pezzo' || e.muro || verde(e)) return; const r = Math.max(e.hu, e.hv) + 3;
    vicini(e.cx, e.cz, r, o => { if (o.i <= e.i || o.g === e.g || piatto(o) || cielo(o) || o.t === 'pezzo' || o.muro || verde(o)) return;
      if ((SEDIE.test(e.t) || /^panchina/.test(e.t)) && TAVOLI.test(o.t) || (SEDIE.test(o.t) || /^panchina/.test(o.t)) && TAVOLI.test(e.t)) return;
      if (e.palo || o.palo) return;
      const yo = Math.min(e.y1, o.y1) - Math.max(e.y0, o.y0); if (yo <= .05) return; const p = satR(e.cs, o.cs); if (p > .05) segna('b_urto', e.t, e.chi, e.cx, e.cz, e.y0, o.t + ' ' + r2(p) + ' m'); }); });
  V.forEach(e => { if (appeso(e) || piatto(e) || e.t === 'pezzo' || verde(e) || /^(falda|ciglio|gronda|gruppo:|tetto|casa)/.test(e.t)) return;
    for (const h of caseVicine(e.cx, e.cz, 2)) { if (e.y0 > h.y1 - .3 || e.y1 < h.y0 + .1) continue; const F = Math.min(...e.cs.concat([[e.cx, e.cz]]).map(([x, z]) => faccia(h, x, z).d)); if (F < -.05) { segna('b_muro', e.t, e.chi, e.cx, e.cz, e.y0, r2(-F) + ' m'); break; } } });
  const BAR = PG.barche.map(q => { const c = Math.cos(q.yaw), s = Math.sin(q.yaw), lb = q.lb, P = [[lb[0], lb[2]], [lb[3], lb[2]], [lb[3], lb[5]], [lb[0], lb[5]]].map(([a, b]) => [q.x + a * c + b * s, q.z - a * s + b * c]); return Object.assign({ cs: P, y0: q.y + lb[1], y1: q.y + lb[4] }, q); });
  out.barche = BAR.length;
  BAR.forEach((q, i) => { BAR.forEach((p, j) => { if (j <= i || Math.hypot(p.x - q.x, p.z - q.z) > 30) return; const pe = satR(q.cs, p.cs); if (pe > .1) segna('b_barca', 'barca:' + q.k, 'boatAt:barche', q.x, q.z, q.y, 'con barca:' + p.k + ' ' + r2(pe) + ' m'); });
    // la terra: lo scafo (la scatola rientrata del 15%) sopra una casella che non è acqua né scalo
    const ins = q.cs.map(([x, z]) => [q.x + (x - q.x) * .85, q.z + (z - q.z) * .85]).concat([[q.x, q.z]]); const fuori = ins.filter(([x, z]) => { const t = tile(x, z); return t !== T.WATER && gH(x, z) > WL + .25; }).length;
    if (fuori) segna('b_barca', 'barca:' + q.k, 'boatAt:terra', q.x, q.z, q.y, fuori + ' punti sulla terra'); });
  // ---- c) corde: i due capi su un ancoraggio ----
  const ANCORE = /^(bitta|palo|pilone|anello|paletto|pennone|lampione|briccola|colonnina|asta|gru|traliccio|stendino|antenna|cartello|semaforo)/;
  const ancorato = (p, chi) => { const [x, y, z] = p; if (muro1 && muro1(x, z, y) < .35) return 'muro';
    if (BAR.some(q => satR(q.cs, [[x - .3, z - .3], [x + .3, z - .3], [x + .3, z + .3], [x - .3, z + .3]]) > 0 && y > q.y0 - .3 && y < q.y1 + .5)) return 'barca';
    let a = null; vicini(x, z, 1, e => { if (a || !(ANCORE.test(e.t) || e.palo)) return; const dx = x - e.cx, dz = z - e.cz, uu = Math.abs(dx * e.u[0] + dz * e.u[1]) - e.hu, vv = Math.abs(dx * e.v[0] + dz * e.v[1]) - e.hv; if (Math.hypot(Math.max(uu, 0), Math.max(vv, 0)) < .3 && y > e.y0 - .2 && y < e.y1 + .3) a = e.t; }); return a; };
  const CORDE = PG.corde.filter(c => !/^barca:/.test(c.chi)).concat((window.__PV_FILIprova ? window.__PV_FILIprova() : []).map(f => ({ chi: 'filo:' + f.k, a: f.a, b: f.b, fil: f })));
  out.corde = CORDE.length;
  CORDE.forEach(c => { const A = c.fil ? (c.fil.da <= .35 ? 'muro' : null) : ancorato(c.a, c.chi), B = c.fil ? (c.fil.db <= .35 ? 'muro' : null) : ancorato(c.b, c.chi);
    if (!A || !B) { const p = A ? c.b : c.a; segna('c_corda', c.fil ? c.fil.k : 'corda', c.chi, p[0], p[2], p[1], (A || '—') + ' / ' + (B || '—')); } });
  // ---- d) parti staccate dal corpo ----
  out.cose = PG.cose; PG.staccati.forEach(s => { if (s.gap > .05) segna('d_staccato', /^barca:/.test(s.chi) ? s.chi : 'parte', s.chi, s.c[0], s.c[2], s.c[1], s.gap + ' m, ' + s.n + ' pezzi ' + s.s.join('×')); });
  // ---- e) la vegetazione minuta: da dove nasce ----
  const TERRA = new Set([T.GRASS, T.DIRT, T.FIELD, T.SHRUB, T.TREE, T.SAND, T.ROCK, T.CLIFF, T.GRAVEL, T.DESERT]);
  const VV = V.filter(verde); out.verde = VV.length;
  VV.forEach(e => { const x = e.o[0], z = e.o[2], y = e.y0;
    const hs = caseIn(x, z, .05).filter(h => y > h.y1 - 4 && y < h.y1 + 3);
    if (hs.length) { if (Math.min(...hs.map(h => -faccia(h, x, z).d)) < .6) return; segna('e_verde', e.t, e.chi, x, z, y, 'in mezzo al tetto'); return; }   // sul tetto: in gronda, sul colmo, sul ciglio
    if (y > e.gmax + .4) { const s = sotto(x, y + .05, z, 30); if (s !== null && Math.abs(s - y) < .1) { /* su un muretto, un ciglio, un gradino */ let bordo = false; for (const [a, b] of [[.35, 0], [-.35, 0], [0, .35], [0, -.35]]) { const q = sotto(x + a, y + .05, z + b, 30); if (q === null || y - q > .1) bordo = true; } if (bordo) return; }
      segna('e_verde', e.t, e.chi, x, z, y, 'in alto, non su un bordo'); return; }
    if (TERRA.has(tile(x, z))) return;
    if (muro1 && muro1(x, z, y + .1) < .3) return;   // al piede del muro
    let dmax = 0; const g0 = gH(x, z); for (const [a, b] of [[.3, 0], [-.3, 0], [0, .3], [0, -.3], [.21, .21], [-.21, -.21], [.21, -.21], [-.21, .21]]) dmax = Math.max(dmax, Math.abs(gH(x + a, z + b) - g0)); if (dmax > .05) return;   // sul cordolo, sul gradino
    let vaso = false; vicini(x, z, 1, o => { if (/fioriera|aiuola|vaso|tronco|albero|cassone/.test(o.t) && Math.hypot(o.cx - x, o.cz - z) < Math.max(o.hu, o.hv) + .4) vaso = true; }); if (vaso) return;
    let tT = false; for (const [a, b] of [[.5, 0], [-.5, 0], [0, .5], [0, -.5]]) if (TERRA.has(tile(x + a, z + b)) || tile(x + a, z + b) === T.BLD) tT = true; if (tT) return;   // sul confine con la terra
    segna('e_verde', e.t, e.chi, x, z, y, 'dal nulla (casella ' + tile(x, z) + ')'); });
  // ---- f) il passaggio (la fisica del passo: walkM, driveM) ----
  const DIRS = []; for (let k = 0; k < 12; k++) { const a = k * Math.PI / 12; DIRS.push([Math.cos(a), Math.sin(a)]); }
  const marcia = (x, z, dx, dz) => { let t = 0; while (t < 14 && PW.walkM(x + dx * (t + .1), z + dz * (t + .1))) t += .1; return t; };
  V.forEach(e => { if (appeso(e) || piatto(e) || VUOTI.test(e.t) || e.t === 'pezzo' || verde(e) || e.alto || e.h < .25 || VIVI.test(e.t)) return;
    if (!PW.walkM(e.cx, e.cz)) return;
    if (window.__PG_carr && window.__PG_carr(e.cx, e.cz) && e.y0 < e.gmax + .6 && !PALI.test(e.t) && !/^(auto|moto|vespa|ape|furgone|bici|motorino|scooter)/.test(e.t)) { segna('f_carreggiata', e.t, e.chi, e.cx, e.cz, e.y0); return; }
    let best = null; DIRS.forEach(([dx, dz]) => { const tp = marcia(e.cx, e.cz, dx, dz), tn = marcia(e.cx, e.cz, -dx, -dz), W = tp + tn; if (!best || W < best.W) best = { W, tp, tn, dx, dz }; });
    if (!best || best.W >= 13) return;   // una piazza: si gira attorno
    let p0 = Infinity, p1 = -Infinity; e.cs.forEach(([x, z]) => { const q = (x - e.cx) * best.dx + (z - e.cz) * best.dz; p0 = Math.min(p0, q); p1 = Math.max(p1, q); });
    const libero = Math.max(best.tp - p1, best.tn + p0);
    if (libero < 1) segna('f_passaggio', e.t, e.chi, e.cx, e.cz, e.y0, 'libero ' + r2(libero) + ' m su ' + r2(best.W)); });
  const ZN = D.zone.filter(z => z.t === 'porta' || z.t === 'scala').map(z => { const cs = [[z.u0, z.v0], [z.u1, z.v0], [z.u1, z.v1], [z.u0, z.v1]].map(([a, c]) => [a * z.c + c * z.s, -a * z.s + c * z.c]); return Object.assign({ cs, cx: (cs[0][0] + cs[2][0]) / 2, cz: (cs[0][1] + cs[2][1]) / 2 }, z); });
  V.forEach(e => { if (appeso(e) || piatto(e) || VUOTI.test(e.t) || e.t === 'pezzo' || verde(e)) return;
    for (const z of ZN) { if (Math.abs(z.cx - e.cx) > 4 || Math.abs(z.cz - e.cz) > 4) continue; if (e.y0 > z.y1 - .05 || e.y1 < z.y0 + .05) continue; const p = satR(e.cs, z.cs); if (p > .05) { segna('f_' + z.t, e.t, e.chi, e.cx, e.cz, e.y0, r2(p) + ' m'); return; } } });
  // ---- g) il suolo fra caselle confinanti ----
  const PAV = window.Pavimenti, GW = G.GW, GHt = G.GH; let nC = 0;
  const ok = (tx, ty) => PW.walkT(tx, ty) && G.tileAt(tx, ty) !== T.STAIRS && G.tileAt(tx, ty) !== T.WATER;
  for (let ty = 0; ty < GHt; ty++) for (let tx = 0; tx < GW; tx++) { if (!ok(tx, ty)) continue;
    for (const [ax, ay] of [[1, 0], [0, 1]]) { const ux = tx + ax, uy = ty + ay; if (ux >= GW || uy >= GHt || !ok(ux, uy)) continue;
      const ex = (tx + .5 + ax * .5) * TS, ez = (ty + .5 + ay * .5) * TS, xa = ex - ax * .08, za = ez - ay * .08, xb = ex + ax * .08, zb = ez + ay * .08;
      if (!PW.walkM(xa, za) || !PW.walkM(xb, zb) || PW.taglia(xa, za, xb, zb)) continue;
      const ha = gH(xa, za), hb = gH(xb, zb), dh = Math.abs(ha - hb);
      if (dh > .3) { segna('g_quota', 'suolo', 'suolo:' + G.tileAt(tx, ty) + '/' + G.tileAt(ux, uy), ex, ez, Math.min(ha, hb), r2(dh) + ' m'); continue; }
      if (PAV && PAV.sonda && dh < .03 && G.tileAt(tx, ty) === G.tileAt(ux, uy)) { const A = PAV.sonda(ex - ax * .4, ez - ay * .4), B = PAV.sonda(ex + ax * .4, ez + ay * .4); if (A.gf === undefined || B.gf === undefined) continue; nC++;
        if (A.gf !== B.gf || A.rf !== B.rf) segna('g_colore', 'suolo', 'pavimenti:' + G.tileAt(tx, ty), ex, ez, ha, 'suolo ' + A.gf + '/' + A.rf + ' → ' + B.gf + '/' + B.rf); } } }
  out.confrontiColore = nC;
  // ---- h) ruotati fuori asse rispetto al muro vicino ----
  V.forEach(e => { if (verde(e) || SEDIE.test(e.t) || VIVI.test(e.t) || e.t === 'pezzo' || e.tilt < .9) return; const a = Math.max(e.hu, e.hv), b = Math.min(e.hu, e.hv); if (b < .03 || a / b < 1.25) return;
    let best = null; caseVicine(e.cx, e.cz, 1.5).forEach(h => { if (e.y1 < h.y0 || e.y0 > h.y1 + .5) return; const F = faccia(h, e.cx, e.cz); if (F.d > 1.2 || F.d < -1.2) return; if (!best || Math.abs(F.d) < Math.abs(best.d)) best = F; });
    if (!best) return; const an = Math.atan2(e.u[1], e.u[0]) - Math.atan2(best.n[1], best.n[0]); let dv = Math.abs(((an % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2)); dv = Math.min(dv, Math.PI / 2 - dv) * 180 / Math.PI;
    if (dv > 8) segna('h_ruotato', e.t, e.chi, e.cx, e.cz, e.y0, Math.round(dv) + '°'); });
  return out;
}
