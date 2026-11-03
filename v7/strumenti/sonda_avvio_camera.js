// [camera4] LA SONDA DELL'AVVIO DELLA CAMERA: cosa fa la camera nei primi secondi dopo «Gioca».
//   node strumenti/sonda_avvio_camera.js [--query=cittanuova&leggera&tassellivecchi] [--modi=nuova,vecchia] [--secondi=20] [--vista=480x270]
//                                        [--json=/percorso/uscita.json]
// Il gioco vero, col suo giro (main.js) e il disegno vero (SwiftShader: i fotogrammi sono lenti come su un telefono appena caricato).
// A ogni fotogramma (dal primo dopo l'intro per --secondi di gioco) registra: il dt e i ms del fotogramma, lo yaw, la pendenza, lo zoom,
// la distanza della camera, il punto guardato rispetto al personaggio, la regia (perché, bersaglio), le molle di [camera2], le case tagliate
// (quante, e quante coprono davvero il personaggio: il raggio dal busto e dalla testa alla camera entra nella loro scatola), i tetti
// sbiaditi, il personaggio coperto. Stampa un riassunto a tappe (0, 0,5, 1, 2, 3, 5, 8, 12, 20 s) e i conti.
// --modi=vecchia aggiunge ?nofixavvio&nofixinquadra (com'era prima di [camera4]).
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || 'playwright');
const ARG = {}; for (const a of process.argv.slice(2)) { const m = /^--([a-z]+)(?:=(.*))?$/.exec(a); if (m) ARG[m[1]] = m[2] === undefined ? true : m[2]; }
const root = path.resolve(__dirname, '..'), QUERY = (ARG.query || 'cittanuova&leggera&tassellivecchi').replace(/^[?&]/, ''), MODI = (ARG.modi || 'nuova,vecchia').split(',');
const SEC = +(ARG.secondi || 20), [VW, VH] = (ARG.vista || '480x270').split('x').map(Number);
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.gz': 'application/gzip' };

function initPagina(SEC) {
  const L = window.__AV = { righe: [], fatto: false, t0: 0, prima: [] };
  const aggancia = () => {
    const pv = window.__pv; if (!pv || !pv.R || !pv.R.frame || !pv.R.__models || !pv.R.__models.renderer) { setTimeout(aggancia, 100); return; }
    const R = pv.R, f0 = R.frame, dir = new THREE.Vector3(); let tg = 0, tr = 0, ultimo = performance.now();
    const taglia = (o, c, b) => { let t0 = 0, t1 = 1; for (const k of ['x', 'y', 'z']) { const d = c[k] - o[k], lo = b.min[k], hi = b.max[k]; if (Math.abs(d) < 1e-9) { if (o[k] < lo || o[k] > hi) return false; continue; } let a = (lo - o[k]) / d, e = (hi - o[k]) / d; if (a > e) { const q = a; a = e; e = q; } if (a > t0) t0 = a; if (e < t1) t1 = e; if (t0 > t1) return false; } return true; };
    R.frame = function (st, dt, ui) {
      const a = performance.now(), r = f0.apply(this, arguments), ms = performance.now() - a, reale = a - ultimo; ultimo = a;
      if (L.fatto) return r;
      const intro = !!ui.intro; if (intro) { L.prima.length = 0; return r; }
      if (!L.t0) L.t0 = a; tg += dt; tr = (a - L.t0) / 1000;
      const p = st.player, cam = R.cam, camera = R.getCamera(), cp = camera.position, V3 = R.__vis3, V4 = R.__vis4, C2 = R.__cam2 || {}, C4 = R.__cam4 || null, B = R.__buildings || [];
      camera.getWorldDirection(dir); const fy = R.groundH(p.x, p.y);
      // le case tagliate: quante (a > .5) e quante coprono davvero il personaggio (dal busto o dalla testa, verso la camera vera)
      let tagliate = 0, vere = 0, coperto = 0; const C = { x: cp.x, y: cp.y, z: cp.z }, O = [{ x: p.x, y: fy + 1.1, z: p.y }, { x: p.x, y: fy + 1.7, z: p.y }];
      if (V3 && V3.S) V3.S.forEach((s, Bk) => { if (s.a > .5) { tagliate++; const b3 = Bk.box3; if (b3 && O.some(o => taglia(o, C, b3))) vere++; } });
      for (const Bk of B) { const b3 = Bk.box3; if (!b3 || b3.max.y < fy + 1) continue; const s = V3 && V3.S && V3.S.get(Bk); if (s && s.a > .5) continue; if (p.x > b3.min.x && p.x < b3.max.x && p.y > b3.min.z && p.y < b3.max.z) continue;
        const cx = (b3.min.x + b3.max.x) / 2 - p.x, cz = (b3.min.z + b3.max.z) / 2 - p.y; if (cx * cx + cz * cz > 60 * 60) continue; if (taglia(O[0], C, b3)) { coperto = 1; break; } }
      const reg = C2.REG ? C2.REG.S : {}, CA = C2.CALMA2 || {};
      L.righe.push({ tg: +tg.toFixed(3), tr: +tr.toFixed(2), dt: +dt.toFixed(3), ms: Math.round(ms), reale: Math.round(reale), px: +p.x.toFixed(2), py: +p.y.toFixed(2), face: +(p.face || 0).toFixed(2),
        yaw: +cam.yaw.toFixed(3), uy: +(cam.uy || 0).toFixed(3), pitch: +(-Math.asin(Math.max(-1, Math.min(1, dir.y)))).toFixed(3), zoom: +cam.zoom.toFixed(3), dist: +Math.hypot(cp.x - cam.x, cp.y - cam.h, cp.z - cam.y).toFixed(1),
        ox: +(cam.x - p.x).toFixed(2), oy: +(cam.y - p.y).toFixed(2), regia: reg.perche || '', regN: reg.n || 0, zA: CA.zA ? +CA.zA.x.toFixed(3) : null, zU: CA.zU != null ? +CA.zU.toFixed(3) : null,
        tagliate, vere, tetti: V4 && V4.T ? [...V4.T.values()].filter(s => s.a > .5).length : 0, coperto, liv: C4 && C4.S ? C4.S.liv : null, iqp: R.__iq5 ? +(R.__iq5.p || 0).toFixed(3) : null });
      if (tg >= SEC) L.fatto = true;
      return r; };
  };
  aggancia();
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
      const pg = await b.newPage({ viewport: { width: VW, height: VH } }); await pg.addInitScript(initPagina, SEC);
      pg.on('pageerror', e => log('[errore]', e.message)); pg.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) log('[console]', m.text().slice(0, 200)); });
      const q = QUERY + (modo === 'vecchia' ? '&nofixavvio&nofixinquadra' : '');
      await pg.goto(`http://localhost:${srv.address().port}/${ARG.pagina || 'index.html'}?${q}`, { waitUntil: 'domcontentloaded', timeout: 0 });
      await pg.waitForFunction(() => window.__tl && window.__tl.gioco, null, { timeout: 1800000, polling: 1000 });
      log(modo, 'gioco pronto', q); await pg.keyboard.press('Enter');
      await pg.waitForFunction(() => window.__AV.fatto, null, { timeout: 1800000, polling: 1000 });
      const R = await pg.evaluate(() => window.__AV.righe); out[modo] = R;
      console.log(`\n== ${modo} (${q}): ${R.length} fotogrammi in ${R[R.length - 1].tr} s veri ==`);
      const K = ['tg', 'tr', 'dt', 'reale', 'yaw', 'pitch', 'zoom', 'dist', 'ox', 'oy', 'regia', 'tagliate', 'vere', 'tetti', 'coperto', 'liv', 'zA', 'face'];
      console.log(K.join('\t'));
      for (const t of [0, .25, .5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20]) { const r = R.find(x => x.tg >= t); if (r) console.log(K.map(k => r[k]).join('\t')); }
      const n = R.length, frac = f => +(R.filter(f).length / n * 100).toFixed(0);
      const yawCorsa = R.slice(1).reduce((s, r, i) => s + Math.abs(Math.atan2(Math.sin(r.yaw - R[i].yaw), Math.cos(r.yaw - R[i].yaw))), 0);
      const zMoto = R.slice(1).reduce((s, r, i) => s + Math.abs(r.zoom - R[i].zoom), 0), dMoto = R.slice(1).reduce((s, r, i) => s + Math.abs(r.dist - R[i].dist), 0), pMoto = R.slice(1).reduce((s, r, i) => s + Math.abs(r.pitch - R[i].pitch), 0);
      const assest = (k, eps) => { const fin = R[n - 1][k]; let i = n - 1; while (i > 0 && Math.abs(R[i - 1][k] - fin) < eps) i--; return R[i].tg; };
      console.log('riassunto', JSON.stringify({ fotogrammi: n, msMediana: R.map(r => r.reale).sort((a, b) => a - b)[n >> 1], dtMax: Math.max(...R.map(r => r.dt)), yawCorsa: +yawCorsa.toFixed(2), zoomCorsa: +zMoto.toFixed(2), distCorsa: +dMoto.toFixed(1), pendCorsa: +pMoto.toFixed(2),
        assestaYaw: assest('yaw', .01), assestaZoom: assest('zoom', .01), assestaDist: assest('dist', .3), tagliPct: frac(r => r.tagliate > 0), tagliFinti: frac(r => r.tagliate > r.vere), tagliMax: Math.max(...R.map(r => r.tagliate)), copertoPct: frac(r => r.coperto), regiaScelte: R[n - 1].regN }));
      await pg.close();
    }
  } catch (e) { log('errore', e.stack || e); }
  await b.close(); srv.close();
  if (ARG.json) fs.writeFileSync(ARG.json, JSON.stringify(out));
});
