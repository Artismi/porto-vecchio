// [leggera] node strumenti/sonda_cpu.js — profilo del processore (tempo proprio per funzione e per file) e inventario della scena: chi sono le mesh sciolte,
// i materiali doppioni, i triangoli per categoria. Le ombre dei faretti sono spente per avere fotogrammi più svelti in SwiftShader.
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require('/opt/node-tools/node_modules/playwright-core');
const root = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary' };
const PLACES = (process.env.POSTI || 'borgo:1400:312,vittoria:1360:334').split(',').map(s => s.split(':')).map(([n, x, y]) => [n, +x, +y]);
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const port = srv.address().port, T0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0)} s]`, ...a);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info'] });
  const pg = await b.newPage({ viewport: { width: 400, height: 250 } });
  pg.on('pageerror', e => console.log('[errore]', e.message));
  const cdp = await pg.context().newCDPSession(pg);
  await pg.goto(`http://localhost:${port}/index.html?cittanuova`);
  await pg.waitForFunction(() => window.__pv && window.__pv.st && window.__pv.R && window.__pv.R.__models.renderer, null, { timeout: 900000 });
  // carico iniziale: profilo durante la schermata iniziale fino a «pronto» non serve; si entra
  log('pronto'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(2500);
  await pg.waitForFunction(() => !window.__pv.ui.intro, null, { timeout: 120000 }).catch(() => log('ancora intro'));
  await pg.evaluate(() => { setInterval(() => { const u = window.__pv.ui; u.flash = 0; u.fade = 0; }, 50);
    const S = window.__pv.R.__models.scene; S.traverse(o => { if (o.isSpotLight) o.castShadow = false; }); S.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.needsUpdate = true); }); });
  const go = (x, y) => pg.evaluate(([x, y]) => { const pv = window.__pv, st = pv.st, p = st.player; p.x = x; p.y = y; p.indoor = null; p.vehicle = null; st.t = Math.floor(st.t / 1440) * 1440 + 15 * 60; pv.R.cam.x = x; pv.R.cam.y = y; }, [x, y]);
  await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 });
  for (const [nome, x, y] of PLACES) {
    await go(x, y); await pg.waitForTimeout(25000);
    const inv = await pg.evaluate(() => {
      const R = window.__pv.R, S = R.__models.scene, cam = R.getCamera();
      const fr = new THREE.Frustum(), M = new THREE.Matrix4(); cam.updateMatrixWorld(); M.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); fr.setFromProjectionMatrix(M);
      // mesh sciolte figlie dirette della scena: per tipo di geometria e conteggio, e per materiale
      const loose = {}, looseVis = {}; let nLoose = 0, nLooseVis = 0;
      for (const o of S.children) { if (!o.isMesh) continue; nLoose++; const k = (o.geometry && o.geometry.type) + (o.isInstancedMesh ? '(ist ' + o.count + ')' : '') + ' ' + (o.material && o.material.type); loose[k] = (loose[k] || 0) + 1; if (o.visible && (!o.frustumCulled || fr.intersectsObject(o))) { nLooseVis++; const v = (o.geometry && o.geometry.attributes.position ? o.geometry.attributes.position.count : 0); const kk = k + (v < 100 ? ' <100v' : v < 1000 ? ' <1kv' : ' >1kv'); looseVis[kk] = (looseVis[kk] || 0) + 1; } }
      // materiali doppioni: stesso tipo, colore, mappa, parametri principali
      const seen = new Map(); let mats = 0; const typ = {};
      S.traverse(o => { if (!o.material) return; (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (seen.has(m)) return; mats++; typ[m.type] = (typ[m.type] || 0) + 1; seen.set(m, (m.type + '|' + (m.color ? m.color.getHexString() : '') + '|' + (m.map ? m.map.uuid : '') + '|' + (m.roughness || 0).toFixed(2) + '|' + (m.metalness || 0).toFixed(2) + '|' + m.transparent + '|' + (m.opacity).toFixed(2) + '|' + (m.emissive ? m.emissive.getHexString() : '') + '|' + m.side + '|' + !!m.onBeforeCompile.toString().length)); }); });
      const sig = new Map(); seen.forEach(s => sig.set(s, (sig.get(s) || 0) + 1));
      // triangoli in vista per categoria
      const veh = new Set(Object.values(R.__vehicles || {}));
      const tri = {}; S.traverseVisible(o => { if (!o.isMesh || !o.geometry) return; if (o.frustumCulled && !fr.intersectsObject(o)) return; let q = o; while (q.parent && q.parent !== S) q = q.parent; const c = veh.has(q) ? 'mezzi' : o.isSkinnedMesh ? 'persone' : o.isInstancedMesh ? 'istanze' : (q.name || q.type); const g = o.geometry, n = (g.index ? g.index.count : g.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1); tri[c] = (tri[c] || 0) + Math.round(n); });
      const top = (m, k) => Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, k || 12);
      // l'ombra del sole: quanto copre e quante cose la fanno
      const moon = (() => { let d = null; S.traverse(o => { if (o.isDirectionalLight && o.castShadow) d = o; }); return d; })();
      const sc = moon && moon.shadow.camera; let shN = 0; if (sc) { const F2 = new THREE.Frustum(), M2 = new THREE.Matrix4(); sc.updateMatrixWorld(); M2.multiplyMatrices(sc.projectionMatrix, sc.matrixWorldInverse); F2.setFromProjectionMatrix(M2); S.traverseVisible(o => { if (o.isMesh && o.castShadow && (!o.frustumCulled || F2.intersectsObject(o))) shN++; }); }
      return { mesh_sciolte: nLoose, sciolte_in_vista: nLooseVis, sciolte_tipi: top(loose), sciolte_in_vista_tipi: top(looseVis, 16), materiali: mats, materiali_tipi: typ, firme_diverse: sig.size, triangoli_k: top(tri).map(([k, v]) => [k, Math.round(v / 1000)]), ombra_sole: sc ? { lato_m: sc.right - sc.left, mappa: moon.shadow.mapSize.x, casters: shN } : null };
    });
    console.log(nome, 'scena', JSON.stringify(inv));
    await cdp.send('Profiler.start');
    const tJ = await pg.evaluate(() => new Promise(res => { let n = 0, t0 = performance.now(); const f = () => { if (++n < 40) requestAnimationFrame(f); else res(performance.now() - t0); }; requestAnimationFrame(f); }));
    const { profile } = await cdp.send('Profiler.stop');
    const self = {}, file = {}, byId = new Map(profile.nodes.map(n => [n.id, n])); let tot = 0;
    profile.samples.forEach((id, i) => { const n = byId.get(id), cf = n.callFrame, d = (profile.timeDeltas[i] || 0) / 1000; const k = `${cf.functionName || '(anon)'} @${(cf.url || '').split('/').pop()}:${cf.lineNumber + 1}`; self[k] = (self[k] || 0) + d; tot += d; });
    // tempo per «modulo»: con tutto incollato in index.html si usa la riga per capire il file (mappa righe → file da index.src)
    console.log(`== ${nome}: ${tot.toFixed(0)} ms campionati in ${tJ.toFixed(0)} ms`);
    Object.entries(self).sort((a, b) => b[1] - a[1]).slice(0, 45).forEach(([k, v]) => console.log(`${(v / tot * 100).toFixed(1).padStart(5)}%  ${k}`));
    fs.writeFileSync(path.join(process.env.DIR || '.', 'prof_' + nome + '.json'), JSON.stringify(profile));
  }
  await b.close(); srv.close(); process.exit(0);
});
