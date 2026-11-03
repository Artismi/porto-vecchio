// [camera4] LA SONDA DELLE COPERTURE: quanto si taglia, quanto il personaggio resta coperto, quante volte l'inquadratura cambia.
//   node strumenti/sonda_occlusione.js [--query=cittanuova&leggera&tassellivecchi] [--modi=nuova,vecchia] [--dt=0.0333] [--json=uscita.json] [--serie=prefisso]
//        [--vecchia=nofixcamera6] [--zoom=0.5] [--zoomvecchia=0.72] [--gira=0.6]
// [camera6] e conta anche: le accensioni e gli spegnimenti al minuto (case tagliate, tetti sbiaditi, cose piccole nascoste, il retino [ad]),
// le cose piccole nascoste (ombrelloni, cartelli, tavolini: devono restare 0), i tetti sbiaditi che non coprivano; nella piazza la camera gira
// (--gira rad/s, come il giocatore che orbita).
// Il gioco vero senza testa (i disegni non vanno a SwiftShader: three li conta lo stesso). Il giro di main.js si ferma e la sonda porta il
// personaggio a passo d'uomo (1,5 m/s) lungo tre tratti presi dalla mappa vicino alla piazza: due vicoli (le strade strette della rete, per
// intero), la piazza da un lato all'altro, un portico per il lungo (sotto le volte). A ogni fotogramma: le case tagliate (e quante coprono
// davvero il personaggio: il raggio dal busto o dalla testa alla camera entra nella loro scatola), il personaggio coperto da una casa non
// tagliata, la pendenza, la distanza della camera, lo yaw, il personaggio sullo schermo. Per modo: % del tempo col taglio, % di tagli che
// non servivano, % del tempo coperto senza taglio, cambi d'inquadratura al minuto (le partenze di pendenza, distanza o yaw dopo 0,4 s di
// quiete), lo strappo (RMS della derivata terza, a 20 Hz di tempo di gioco). --modi=vecchia aggiunge ?nofixinquadra.
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || 'playwright');
const ARG = {}; for (const a of process.argv.slice(2)) { const m = /^--([a-z]+)(?:=(.*))?$/.exec(a); if (m) ARG[m[1]] = m[2] === undefined ? true : m[2]; }
const root = path.resolve(__dirname, '..'), QUERY = (ARG.query || 'cittanuova&leggera&tassellivecchi').replace(/^[?&]/, ''), MODI = (ARG.modi || 'nuova,vecchia').split(','), DT = +(ARG.dt || 1 / 30);
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.gz': 'application/gzip' };

async function corsa(pg, dt, zoom, gira) {
  return pg.evaluate(async ({ dt, zoom, gira }) => {
    const pv = window.__pv, R = pv.R, G = pv.G, st = pv.st, p = st.player, cam = R.cam, camera = R.getCamera(), rd = R.__models.renderer, gl = rd.getContext(), W = G.MAP.world;
    window.PV_ATTESA.on = () => true; if (!gl.__vuoto) { gl.__vuoto = 1; for (const k of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) if (gl[k]) gl[k] = function () { }; }
    const P0 = G.PLACES.piazza, d2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]), lung = pts => pts.slice(1).reduce((s, q, i) => s + d2(q, pts[i]), 0);
    // i tratti
    const tratti = [];
    const vic = (W.roads || []).filter(r => r.pts && r.pts.length > 1 && (r.w <= 3.6 || /^vic_/.test(r.id || '')) && lung(r.pts) > 25)
      .map(r => ({ r, d: Math.min(...r.pts.map(q => d2(q, [P0.x, P0.y]))) })).sort((a, b) => a.d - b.d);
    for (const { r } of vic.slice(0, 2)) { let pts = r.pts.map(q => [q[0], q[1]]), L = 0; const out = [pts[0]]; for (let i = 1; i < pts.length && L < 60; i++) { L += d2(pts[i], pts[i - 1]); out.push(pts[i]); } tratti.push({ nome: 'vicolo ' + (r.id || ''), pts: out }); }
    tratti.push({ nome: 'piazza', pts: [[P0.x - 16, P0.y], [P0.x + 16, P0.y]] });
    const por = (W.pezzi || []).filter(q => q.tipo === 'portico').sort((a, b) => d2([a.x, a.y], [P0.x, P0.y]) - d2([b.x, b.y], [P0.x, P0.y]))[0];
    if (por) { const c = Math.cos(por.rot || 0), s = Math.sin(por.rot || 0), len = ((por.opz && por.opz.campate) || 2) * ((por.opz && por.opz.campata) || 4), m = -2, w = l => [por.x + c * l + s * m, por.y - s * l + c * m];
      tratti.push({ nome: 'portico', pts: [w(-3), w(len + 3)] }); }
    // i conti per fotogramma
    const taglia = (o, c, b) => { let t0 = 0, t1 = 1; for (const k of ['x', 'y', 'z']) { const d = c[k] - o[k], lo = b.min[k], hi = b.max[k]; if (Math.abs(d) < 1e-9) { if (o[k] < lo || o[k] > hi) return false; continue; } let a = (lo - o[k]) / d, e = (hi - o[k]) / d; if (a > e) { const q = a; a = e; e = q; } if (a > t0) t0 = a; if (e < t1) t1 = e; if (t0 > t1) return false; } return true; };
    const dir = new THREE.Vector3(), scr = new THREE.Vector3();
    const ui = { zoom, time: pv.ui.time || 0, stick: null, lead: null, tilt: 0, rot: 0, drag: 0, edge: 0, puntatore: false, reale: dt };
    let giraOra = 0; const passo = () => { G.step(st, dt, { x: 0, y: 0 }); ui.time += dt; ui.drag = giraOra * dt; ui.camMano = !!giraOra; R.frame(st, dt, ui); };
    const C6 = () => R.__cam6 || null, prima = { tagli: new Set(), tetti: new Set(), cose: new Set(), ad: false };
    const conta = () => {   // [camera6] le accensioni: quello che compare o sparisce in questo fotogramma
      const c6 = C6(), V3 = R.__vis3, V4 = R.__vis4, ora = { tagli: new Set(), tetti: new Set(), cose: new Set(), ad: !!(c6 && c6.CAM6.on && c6.CAM6.occ.on) }; let n = 0;
      if (V3 && V3.S) V3.S.forEach((q, B) => { if (q.on) ora.tagli.add(B); }); if (V4 && V4.T) V4.T.forEach((q, B) => { if (q.on) ora.tetti.add(B); }); if (c6 && c6.BASSA) c6.BASSA.cose.forEach((t, tag) => ora.cose.add(tag));
      for (const k of ['tagli', 'tetti', 'cose']) { ora[k].forEach(x => { if (!prima[k].has(x)) n++; }); prima[k].forEach(x => { if (!ora[k].has(x)) n++; }); }
      const nuoveCose = [...ora.cose].filter(x => !prima.cose.has(x)).length; if (ora.ad !== prima.ad) n++;
      Object.assign(prima, ora); return { accensioni: n, cose: ora.cose.size, coseNuove: nuoveCose }; };
    const misura = () => {
      const V3 = R.__vis3, cp = camera.position, fy = R.groundH(p.x, p.y), C = { x: cp.x, y: cp.y, z: cp.z }, O = [{ x: p.x, y: fy + 1.1, z: p.y }, { x: p.x, y: fy + 1.65, z: p.y }];
      let tagliate = 0, vere = 0, coperto = 0;
      if (V3 && V3.S) V3.S.forEach((s, B) => { if (s.a > .5) { tagliate++; if (B.box3 && O.some(o => taglia(o, C, B.box3))) vere++; } });
      for (const B of R.__buildings || []) { const b3 = B.box3; if (!b3 || b3.max.y < fy + 1) continue; const s = V3 && V3.S && V3.S.get(B); if (s && s.a > .5) continue; if (p.x > b3.min.x && p.x < b3.max.x && p.y > b3.min.z && p.y < b3.max.z) continue;
        const cx = (b3.min.x + b3.max.x) / 2 - p.x, cz = (b3.min.z + b3.max.z) / 2 - p.y; if (cx * cx + cz * cz > 3600) continue; if (taglia(O[0], C, b3) && taglia(O[1], C, b3)) { coperto = 1; break; } }
      let tetti = 0, tettiVeri = 0; const V4 = R.__vis4; if (V4 && V4.T) V4.T.forEach((q, B) => { if (q.on && q.a > .5) { tetti++; if (B.box3 && O.some(o => taglia(o, C, B.box3))) tettiVeri++; } });
      camera.getWorldDirection(dir); scr.set(p.x, fy + 1, p.y).project(camera);
      return { ...conta(), tetti, tettiVeri, tagliate, vere, coperto, pitch: -Math.asin(Math.max(-1, Math.min(1, dir.y))), dist: Math.hypot(cp.x - cam.x, cp.y - cam.h, cp.z - cam.y), yaw: cam.yaw, sx: scr.x, sy: scr.y, liv: R.__cam4 && R.__cam4.S ? R.__cam4.S.liv : -1, c4: R.__cam4 && R.__cam4.S ? R.__cam4.S.cambi || 0 : 0, bis: R.__cam4 && R.__cam4.S ? +(R.__cam4.S.bis || 0).toFixed(2) : 0, reg: R.__cam2 && R.__cam2.REG.S ? R.__cam2.REG.S.n || 0 : 0, lift: +(cam.lift || 0).toFixed(2) };
    };
    const righe = [], info = [];
    for (const T of tratti) {
      giraOra = 0;
      const a = T.pts[0]; p.x = a[0]; p.y = a[1]; p.path = []; p.vehicle = null; p.indoor = null; p.lv = null; if (R.camReset) R.camReset(); R.snap(st); cam.ppx = undefined;
      for (let i = 0; i < 45; i++) { passo(); if (i % 15 === 0) await new Promise(r => setTimeout(r, 0)); }   // 1,5 s fermi (non si misura)
      let k = 1, t = 0; const n0 = righe.length; giraOra = T.nome === 'piazza' ? gira : 0; conta();   // [camera6] nella piazza la camera gira
      while (k < T.pts.length) { const b = T.pts[k], dx = b[0] - p.x, dz = b[1] - p.y, l = Math.hypot(dx, dz), v = 1.5 * dt;
        if (l < v) { p.x = b[0]; p.y = b[1]; k++; } else { p.x += dx / l * v; p.y += dz / l * v; p.face = Math.atan2(dz, dx); }
        passo(); const m = misura(); m.t = t; m.tratto = T.nome; righe.push(m); t += dt; if (righe.length % 15 === 0) await new Promise(r => setTimeout(r, 0)); }
      info.push({ nome: T.nome, m: +lung(T.pts).toFixed(0), fotogrammi: righe.length - n0 });
    }
    return { righe, info };
  }, { dt, zoom, gira });
}
// le misure
function ricampiona(S, k, hz) { const out = []; let j = 0; for (let t = 0; t <= S[S.length - 1].t; t += 1 / hz) { while (j < S.length - 2 && S[j + 1].t < t) j++; const a = S[j], b = S[j + 1] || a, f = b.t > a.t ? Math.max(0, Math.min(1, (t - a.t) / (b.t - a.t))) : 0; out.push(a[k] + (b[k] - a[k]) * f); } return out; }
const strappo = (x, hz) => { let j2 = 0; for (let i = 3; i < x.length; i++) { const j = (x[i] - 3 * x[i - 1] + 3 * x[i - 2] - x[i - 3]) * hz * hz * hz; j2 += j * j; } return Math.sqrt(j2 / Math.max(1, x.length - 3)); };
const partenze = (x, hz, eps) => { let ep = 0, fermo = 99; for (let i = 1; i < x.length; i++) { if (Math.abs(x[i] - x[i - 1]) * hz > eps) { if (fermo >= .4) ep++; fermo = 0; } else fermo += 1 / hz; } return ep; };
function riassunto(R) {
  const per = {}; R.righe.forEach(r => (per[r.tratto] = per[r.tratto] || []).push(r));
  const HZ = 20, una = rr => { const n = rr.length, T = rr[rr.length - 1].t || 1, pct = f => +(rr.filter(f).length / n * 100).toFixed(1);
    rr.forEach((r, i) => { r.yawU = i ? rr[i - 1].yawU + Math.atan2(Math.sin(r.yaw - rr[i - 1].yaw), Math.cos(r.yaw - rr[i - 1].yaw)) : r.yaw; });
    const pi = ricampiona(rr, 'pitch', HZ), di = ricampiona(rr, 'dist', HZ), yw = ricampiona(rr, 'yawU', HZ), sx = ricampiona(rr, 'sx', HZ), sy = ricampiona(rr, 'sy', HZ);
    const cp = partenze(pi, HZ, .03), cd = partenze(di, HZ, .5), cy = partenze(yw, HZ, .05), cambi = cp + cd + cy, mn = x => +(x / T * 60).toFixed(1);
    return { s: +T.toFixed(1), taglio: pct(r => r.tagliate > 0), tagliInutili: pct(r => r.tagliate > r.vere), copertoSenzaTaglio: pct(r => r.coperto), accensioniMin: +(rr.reduce((q, r) => q + (r.accensioni || 0), 0) / T * 60).toFixed(1), coseNascostePct: pct(r => r.cose > 0), coseNascosteEventi: rr.reduce((q, r) => q + (r.coseNuove || 0), 0), tettiInutili: pct(r => r.tetti > r.tettiVeri), cambiMin: mn(cambi), pendMin: mn(cp), distMin: mn(cd), yawMin: mn(cy),
      strappoPend: +strappo(pi, HZ).toFixed(2), strappoDist: +strappo(di, HZ).toFixed(1), strappoSchermo: +Math.hypot(strappo(sx, HZ), strappo(sy, HZ)).toFixed(2), pendMedia: +(rr.reduce((s, r) => s + r.pitch, 0) / n).toFixed(2) }; };
  const out = { tutto: null }; for (const k in per) out[k] = una(per[k]);
  // l'insieme: la media dei tratti pesata sul tempo (i salti fra un tratto e l'altro non contano)
  { const L = Object.keys(per).map(k => out[k]), T = L.reduce((s, x) => s + x.s, 0), tot = { s: +T.toFixed(1) };
    for (const k of Object.keys(L[0])) if (k !== 's') tot[k] = +(L.reduce((s, x) => s + x[k] * x.s, 0) / T).toFixed(2); out.tutto = tot; }
  return out;
}

const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const T0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0)} s]`, ...a), out = {};
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  try {
    for (const modo of MODI) {
      const pg = await b.newPage({ viewport: { width: 480, height: 270 } });
      pg.on('pageerror', e => log('[errore]', e.message)); pg.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) log('[console]', m.text().slice(0, 200)); });
      const q = QUERY + (modo === 'vecchia' ? '&' + (ARG.vecchia || 'nofixinquadra') : '');
      await pg.goto(`http://localhost:${srv.address().port}/${ARG.pagina || 'index.html'}?${q}`, { waitUntil: 'domcontentloaded', timeout: 0 });
      await pg.waitForFunction(() => window.__tl && window.__tl.gioco, null, { timeout: 1800000, polling: 1000 });
      await pg.keyboard.press('Enter'); await pg.waitForTimeout(3000);
      await pg.waitForFunction(() => !window.__pv.ui.intro, null, { timeout: 120000 }).catch(() => log('ancora nella schermata iniziale'));
      log(modo, 'in gioco', q);
      const R = await corsa(pg, DT, modo === 'vecchia' ? +(ARG.zoomvecchia || .72) : +(ARG.zoom || .5), +(ARG.gira !== undefined ? ARG.gira : .6)); out[modo] = riassunto(R); if (ARG.serie) fs.writeFileSync(`${ARG.serie}_${modo}.json`, JSON.stringify(R.righe));
      console.log(`\n== ${modo} == tratti: ${R.info.map(x => `${x.nome} ${x.m} m`).join(', ')}`);
      for (const k in out[modo]) console.log(k.padEnd(28), JSON.stringify(out[modo][k]));
      await pg.close();
    }
  } catch (e) { log('errore', e.stack || e); }
  await b.close(); srv.close();
  if (ARG.json) fs.writeFileSync(ARG.json, JSON.stringify(out, null, 1));
});
