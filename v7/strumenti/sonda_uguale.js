// [leggera] La prova «stessa immagine» (node strumenti/sonda_uguale.js): ferma il gioco su un fotogramma e disegna la scena due volte,
// col ciclo delle luci di three com'era e con quello che salta le luci spente (render.js luciSpente), poi confronta i pixel.
// POSTI=nome:x:y,… ORE=15,22 VW=480 VH=300. Esce con 1 se un pixel cambia più di SOGLIA (predefinita 0: identici).
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || '/opt/node-tools/node_modules/playwright-core');
const root = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary' };
const PLACES = (process.env.POSTI || 'borgo:1400:312,vittoria:1360:334').split(',').map(s => s.split(':')).map(([n, x, y]) => [n, +x, +y]);
const ORE = (process.env.ORE || '15,22').split(',').map(Number), SOGLIA = +(process.env.SOGLIA || 0);
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const port = srv.address().port, T0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0)} s]`, ...a);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  let fail = 0, RAGGI_FATTI = !!process.env.NO_RAGGI;
  for (const [nome, x, y] of PLACES) for (const ora of ORE) {
    // una pagina nuova per ogni prova: fermati i cicli a fotogramma, la pagina non riparte
    const pg = await b.newPage({ viewport: { width: +(process.env.VW || 480), height: +(process.env.VH || 300) } });
    pg.on('pageerror', e => console.log('[errore]', e.message));
    pg.on('console', m => { if (/luci spente|shader|THREE\.WebGLProgram/i.test(m.text())) console.log('[console]', m.text().slice(0, 300)); });
    // il ciclo originale, preso prima che render.js lo cambi
    await pg.addInitScript(() => { const k = () => { if (window.THREE && THREE.ShaderChunk) window.__chunk0 = THREE.ShaderChunk.lights_fragment_begin; else setTimeout(k, 1); }; k(); });
    await pg.goto(`http://localhost:${port}/index.html${process.env.PV_QUERY !== undefined ? process.env.PV_QUERY : '?cittanuova'}`);
    await pg.waitForFunction(() => window.__pv && window.__pv.st && window.__pv.R && window.__pv.R.__models.renderer, null, { timeout: 900000 });
    await pg.keyboard.press('Enter'); await pg.waitForTimeout(2500);
    await pg.waitForFunction(() => !window.__pv.ui.intro, null, { timeout: 120000 }).catch(() => log('ancora intro'));
    const patched = await pg.evaluate(() => !!THREE.ShaderChunk.__luciSpente && window.__chunk0 !== THREE.ShaderChunk.lights_fragment_begin);
    log(nome, ora + ':00', 'ciclo delle luci cambiato:', patched);
    if (!patched) { fail++; await pg.close(); continue; }
    await pg.evaluate(([x, y, h]) => { const pv = window.__pv, st = pv.st, p = st.player; window.__stop = false; p.x = x; p.y = y; p.indoor = null; p.vehicle = null; st.t = Math.floor(st.t / 1440) * 1440 + h * 60; pv.R.cam.x = x; pv.R.cam.y = y; }, [x, y, ora]);
    await pg.waitForTimeout(+(process.env.ATTESA || 20000));
    // si ferma il gioco (tutti i cicli a fotogramma) e si disegna la sola scena in un bersaglio nostro, due volte
    const r = await pg.evaluate(() => new Promise(res => {
      const raf0 = window.__raf0 || (window.__raf0 = window.requestAnimationFrame); window.requestAnimationFrame = () => 0;
      setTimeout(() => {
        const R = window.__pv.R, rd = R.__models.renderer, S = R.__models.scene, cam = R.getCamera(), C = THREE.ShaderChunk;
        const W = 480, H = 300, T = new THREE.WebGLRenderTarget(W, H), px = () => { const a = new Uint8Array(W * H * 4); rd.setRenderTarget(T); rd.render(S, cam); rd.readRenderTargetPixels(T, 0, 0, W, H, a); rd.setRenderTarget(null); return a; };
        const remat = () => S.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.needsUpdate = true; }); });
        const auto = rd.shadowMap.autoUpdate; rd.shadowMap.autoUpdate = false; rd.shadowMap.needsUpdate = true;   // la stessa ombra nelle due immagini
        let on = 0; S.traverse(o => { if (o.isLight && o.visible && o.intensity > 0) on++; });
        const nuovo = px(); const nuovo2 = px();
        // la chiave del programma non contiene il testo dei pezzi di shader: si aggiunge un segno, così three compila davvero il ciclo vecchio
        const ks = new Map(); S.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (ks.has(m)) return; const f = m.customProgramCacheKey; ks.set(m, f); m.customProgramCacheKey = function () { return f.call(this) + '|ciclo0'; }; }); });
        const s1 = C.lights_fragment_begin; C.lights_fragment_begin = window.__chunk0; remat(); const vecchio = px(); C.lights_fragment_begin = s1; ks.forEach((f, m) => { m.customProgramCacheKey = f; }); remat(); px();
        rd.shadowMap.autoUpdate = auto; T.dispose();
        let diff = 0, max = 0, rip = 0; for (let i = 0; i < nuovo.length; i++) { const d = Math.abs(nuovo[i] - vecchio[i]); if (d) { diff++; if (d > max) max = d; } if (nuovo[i] !== nuovo2[i]) rip++; }
        let somma = 0; for (let i = 0; i < nuovo.length; i += 4) somma += nuovo[i] + nuovo[i + 1] + nuovo[i + 2];
        window.requestAnimationFrame = raf0; res({ accese: on, canali_diversi: diff, scarto_max: max, ripetizione_instabile: rip, luminosita_media: +(somma / (W * H * 3)).toFixed(1) });
      }, 300); }));
    // i raggi dei graffiti: con il filtro del tratto (writing.js segList) e senza, sugli stessi muri
    if (!RAGGI_FATTI) { RAGGI_FATTI = true; const q = await pg.evaluate(() => { const W = window.Writing.__ray, st = window.__pv.st, p = st.player; const rnd = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(7);
      const list = W.cands(p.x, p.y), rc = new THREE.Raycaster(); let same = 0, diff = 0, hits = 0, tOld = 0, tNew = 0;
      const ok = h => { if (!h.face) return false; let m = h.object.material; if (Array.isArray(m)) m = m[h.face.materialIndex]; return m && m.visible !== false && !(m.transparent && m.opacity < .3); };
      for (let w = 0; w < 3; w++) W.rayWall(new THREE.Vector3(p.x, window.__pv.R.groundH(p.x, p.y) + 1.4, p.y), new THREE.Vector3(1, 0, 0), 3, list);
      for (let i = 0; i < 200; i++) { const a = rnd() * 6.283, o = new THREE.Vector3(p.x + (rnd() - .5) * 30, window.__pv.R.groundH(p.x, p.y) + .3 + rnd() * 4, p.y + (rnd() - .5) * 30), d = new THREE.Vector3(Math.cos(a), 0, Math.sin(a)), far = [1.3, 3, 6][i % 3];
        // prima: il metodo lento puro (ogni triangolo di ogni mesh della lista), senza indice veloce e senza filtro del tratto
        const sv = list.map(m => [m.geometry, m.geometry.boundsTree, m.geometry.__bvhNo]); sv.forEach(([g]) => { g.boundsTree = null; g.__bvhNo = true; });
        let t = performance.now(); rc.set(o, d); rc.far = far; rc.near = 0; const h0 = rc.intersectObjects(list, false).find(ok); tOld += performance.now() - t;
        sv.forEach(([g, bt, no]) => { g.boundsTree = bt; g.__bvhNo = no; });
        t = performance.now(); const h1 = W.rayWall(o, d, far, list); tNew += performance.now() - t;
        if (h0) hits++; const eq = (!h0 && !h1) || (h0 && h1 && h0.object === h1.obj && h0.point.distanceTo(h1.p) < 1e-9); if (eq) same++; else diff++; }
      return { candidate: list.length, raggi: 200, colpi: hits, uguali: same, diversi: diff, ms_prima: +tOld.toFixed(1), ms_dopo: +tNew.toFixed(1) }; });
      console.log('raggi dei graffiti', q.diversi ? 'DIVERSI' : 'UGUALI', JSON.stringify(q)); if (q.diversi) fail++; }
    const ok = r.scarto_max <= SOGLIA; if (!ok) fail++;
    console.log(nome, ora + ':00', ok ? 'UGUALE' : 'DIVERSA', JSON.stringify(r));
    await pg.close();
  }
  await b.close(); srv.close(); process.exit(fail ? 1 : 0);
});
