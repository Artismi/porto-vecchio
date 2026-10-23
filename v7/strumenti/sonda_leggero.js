// [leggero] La sonda dei disegni (node strumenti/sonda_leggero.js [uscita.json]): il gioco vero (?cittanuova) in Chromium senza testa, negli
// scorci della città compatta (borgo, Vittoria, Mercato, marina, città intera: strumenti/scorci_compatta.json), e per ognuno:
// disegni del passaggio principale e dell'ombra del sole (separati), triangoli, programmi della scheda video, millisecondi di JavaScript
// del fotogramma (logica + grafica, in SwiftShader: valgono i rapporti), memoria (heap, geometrie, texture) e chi fa i disegni
// (per famiglia: userData.lg, nome o tipo). Con FOTO=cartella salva anche la foto di ogni scorcio (per i fogli prima/dopo).
// SOLO=borgo,citta: solo quegli scorci. VW/VH (predefinito 640×400, lo stesso rapporto delle foto). NF fotogrammi per la mediana.
// JS=file.js: un corpo di funzione eseguito nella pagina in ogni scorcio (il risultato va nel registro). PV_QUERY cambia l'indirizzo (predefinito ?cittanuova). Esce con 1 se la pagina dà errori.
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || '/opt/node-tools/node_modules/playwright-core');
const root = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream' };
const NOMI = { c3_borgo_incroci: 'borgo', c4_vittoria: 'vittoria', c5_mercato: 'mercato', c6_marina: 'marina', c7_citta: 'citta' };
const SC = JSON.parse(fs.readFileSync(path.join(__dirname, 'scorci_compatta.json'), 'utf8')).scorci.filter(s => NOMI[s.nome]).map(s => Object.assign({}, s, { nome: NOMI[s.nome] }))
  .filter(s => !process.env.SOLO || process.env.SOLO.split(',').includes(s.nome));
const OUT = process.argv[2], FOTO = process.env.FOTO;
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const port = srv.address().port, T0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0)} s]`, ...a);
  const b = await chromium.launch({ executablePath: process.env.PW_CHROME || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info', '--js-flags=--expose-gc'] });
  const pg = await b.newPage({ viewport: { width: +(process.env.VW || 640), height: +(process.env.VH || 400) } });
  let errori = 0; pg.on('pageerror', e => { errori++; console.log('[errore]', e.message, (e.stack || '').split('\n').slice(0, 3).join(' | ')); });
  pg.on('console', m => { if (m.type() === 'error' || /\[leggero\]|\[foro\]/.test(m.text())) console.log('[console]', m.text().slice(0, 300)); });
  await pg.addInitScript(() => { window.__pulita = true; });
  await pg.goto(`http://localhost:${port}/index.html${process.env.PV_QUERY !== undefined ? process.env.PV_QUERY : '?cittanuova'}`);
  await pg.waitForFunction(() => window.__pv && window.__pv.st && window.__pv.R && window.__pv.R.__models.renderer, null, { timeout: 900000 });
  log('caricato'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(2500);
  await pg.waitForFunction(() => !window.__pv.ui.intro, null, { timeout: 120000 }).catch(() => log('ancora nella schermata iniziale'));
  await pg.addStyleTag({ content: '#app > *:not(#cv) { visibility: hidden !important; } #bubbles, #hover, #moment, #xhair, #ring, #touch { display: none !important; }' });
  await pg.evaluate(() => { const pv = window.__pv, st = pv.st; st.deadline = 1e12;
    setInterval(() => { const u = pv.ui; u.flash = 0; u.fade = 0; u.desat = false; u.letterbox = false; u.dialog = null; u.book = false; u.menu = false; st.over = null; st.chase = false; st.player.hp = 100; }, 50);
    // i contatori: la scena divisa in ombra (sole e faretti: three azzera info dopo le ombre) e passaggio principale, il resto (dopo-scena, ombre dei faretti fuori da render)
    const R = pv.R, rd = R.__models.renderer, sm = rd.shadowMap, r0 = rd.render, s0 = sm.render, C = window.__cnt = { sh: 0, main: 0, tris: 0, post: 0, js: 0 };
    sm.render = function () { const a = rd.info.render.calls; const r = s0.apply(this, arguments); C.sh += rd.info.render.calls - a; return r; };
    rd.render = function (sc) { const r = r0.apply(this, arguments); if (sc === R.__models.scene) { C.main += rd.info.render.calls; C.tris += rd.info.render.triangles; } else C.post += rd.info.render.calls; return r; };
    const f0 = R.frame, g0 = pv.G.step; R.frame = function () { const t = performance.now(); const r = f0.apply(this, arguments); C.js += performance.now() - t; return r; }; pv.G.step = function () { const t = performance.now(); const r = g0.apply(this, arguments); C.js += performance.now() - t; return r; };
  });
  const out = { quando: new Date().toISOString(), scorci: {} };
  for (const s of SC) {
    await pg.evaluate(s => { const pv = window.__pv, st = pv.st, p = st.player, R = pv.R, ui = pv.ui;
      p.vehicle = null; p.indoor = null; p.lv = null; p.x = s.x; p.y = s.y; p.path = []; let t = Math.floor(st.t / 1440) * 1440 + s.ora; if (t < st.t - 1) t += 1440; st.t = t; window.__meteo = s.meteo || null;
      ui.focus = { x: s.x, y: s.y }; ui.zoom = s.zoom || 1; R.cam.x = R.cam.tx = s.x; R.cam.y = R.cam.ty = s.y; R.cam.zoom = R.cam.tz = ui.zoom; R.cam.uy = 0; }, s);
    await pg.waitForTimeout(2500);
    for (let k = 0, quiet = 0, tb = Date.now(); Date.now() - tb < 60000 && quiet < 2; k++) { await pg.waitForTimeout(1000); quiet = (await pg.evaluate(() => !(window.__pv.R.ISO && window.__pv.R.ISO.job))) ? quiet + 1 : 0; }
    await pg.waitForTimeout(+(process.env.ATTESA || 6000));
    const m = await pg.evaluate(n => new Promise(res => { const C = window.__cnt, A = []; let k = 0;
      const f = () => { if (k++ > 0) A.push(Object.assign({}, C)); for (const q in C) C[q] = 0; if (k <= n) requestAnimationFrame(f); else {
        const md = q => { const a = A.map(x => x[q]).sort((x, y) => x - y); return a[a.length >> 1]; };
        const R = window.__pv.R, rd = R.__models.renderer, S = R.__models.scene, cam = R.getCamera();
        const fr = new THREE.Frustum(), M = new THREE.Matrix4(); M.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); fr.setFromProjectionMatrix(M);
        // la famiglia: case fuse, sagome d'ombra delle case, statiche fuse, case non fuse (fgRec1), persone, mezzi, istanze, sprite, il resto per nome
        const ppl = new Set(Object.values((R.__dyn && R.__dyn.people) || {})), veh = new Set(Object.values(R.__vehicles || {})), fam = {}, famSh = {};
        const key = o => { if (o.userData.fusione1) return 'fusione1'; if (o.userData.ombra1) return 'ombra1'; if (o.isSkinnedMesh) return 'persone'; if (o.isInstancedMesh) return 'istanze'; if (o.isSprite) return 'sprite';
          if (o.parent === S && o.matrixAutoUpdate === false) return 'statiche'; let t = o; while (t.parent && t.parent !== S) { if (t.userData && t.userData.lg) return t.userData.lg; t = t.parent; }
          if (veh.has(t)) return 'mezzi'; if (t.userData && t.userData.fgRec1) return 'fgRec1'; let sk = false; t.traverse(q => { if (q.isSkinnedMesh) sk = true; }); if (sk || ppl.has(t)) return 'persone'; return t.name || t.type; };
        S.traverseVisible(o => { if (!(o.isMesh || o.isSprite || o.isPoints || o.isLine)) return; const nm = Array.isArray(o.material) ? o.material.length : 1, k = key(o);
          if (o.castShadow && o.isMesh) famSh[k] = (famSh[k] || 0) + nm; if (o.frustumCulled && !fr.intersectsObject(o)) return; fam[k] = (fam[k] || 0) + nm; });
        const top = m => Object.fromEntries(Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 12));
        res({ disegni: md('main') + md('sh'), principale: md('main'), ombra_sole: md('sh'), dopo_scena: md('post'), triangoli_k: Math.round(md('tris') / 1000), js_ms: +md('js').toFixed(1),
          programmi: rd.info.programs ? rd.info.programs.length : 0, heap_mb: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : 0, geometrie: rd.info.memory.geometries, texture: rd.info.memory.textures,
          famiglie_in_vista: top(fam), famiglie_ombra: top(famSh) }); } };
      requestAnimationFrame(f); }), +(process.env.NF || 8));
    log(s.nome, JSON.stringify(m)); out.scorci[s.nome] = m;
    if (process.env.JS) { const r = await pg.evaluate(src => { try { return (new Function(src))(); } catch (e) { return 'errore ' + e.message; } }, fs.readFileSync(process.env.JS, 'utf8')); log(s.nome, 'JS', typeof r === 'string' ? r : JSON.stringify(r)); m.js_extra = r; }   // JS=file: un'analisi in più nella pagina
    if (FOTO) { fs.mkdirSync(FOTO, { recursive: true }); const url = await pg.evaluate(() => new Promise(r => requestAnimationFrame(() => r(document.getElementById('cv').toDataURL('image/png'))))); fs.writeFileSync(path.join(FOTO, s.nome + '.png'), Buffer.from(url.split(',')[1], 'base64')); }
  }
  out.errori = errori;
  if (OUT) fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  await b.close(); srv.close(); process.exit(errori ? 1 : 0);
});
