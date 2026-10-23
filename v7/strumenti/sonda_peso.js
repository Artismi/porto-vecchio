// [leggera] Sonda del peso (node strumenti/sonda_peso.js): in ogni posto conta luci, disegni per ramo e per chi li ha messi in scena
// (righe di index.html), poi spegne una cosa alla volta e misura il fotogramma (SwiftShader: valgono i rapporti, non i valori).
// POSTI=nome:x:y,… ORA=15 NF=12 VW=480 VH=300 ATTESA=20000 OUT=file.json
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require('/opt/node-tools/node_modules/playwright-core');
const root = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary' };
const PLACES = (process.env.POSTI || 'vittoria:1360:334,borgo:1400:312,mercato:1275:343').split(',').map(s => s.split(':')).map(([n, x, y]) => [n, +x, +y]);
const ORA = +(process.env.ORA || 15);
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const port = srv.address().port, T0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0)} s]`, ...a);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info', '--js-flags=--expose-gc'] });
  const pg = await b.newPage({ viewport: { width: +(process.env.VW || 960), height: +(process.env.VH || 600) } });
  pg.on('pageerror', e => console.log('[errore]', e.message));
  await pg.addInitScript(() => { const tag = () => { if (!window.THREE) { setTimeout(tag, 5); return; } const a0 = THREE.Object3D.prototype.add; THREE.Object3D.prototype.add = function (...objs) { if (this.isScene) { const st = new Error().stack.split('\n').slice(2, 6).map(l => (l.match(/:(\d+):\d+\)?$/) || [])[1]).filter(Boolean); objs.forEach(o => { if (o && !o.__src) o.__src = st; }); } return a0.apply(this, objs); }; }; tag(); });
  await pg.goto(`http://localhost:${port}/index.html${process.env.PV_QUERY !== undefined ? process.env.PV_QUERY : '?cittanuova'}`);
  await pg.waitForFunction(() => window.__pv && window.__pv.st && window.__pv.R && window.__pv.R.__models.renderer, null, { timeout: 900000 });
  log('pronto'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(2500);
  await pg.waitForFunction(() => !window.__pv.ui.intro, null, { timeout: 120000 }).catch(() => log('ancora intro'));
  await pg.evaluate(() => setInterval(() => { const u = window.__pv.ui; u.flash = 0; u.fade = 0; u.desat = false; }, 50));
  const go = (x, y, h) => pg.evaluate(([x, y, h]) => { const pv = window.__pv, st = pv.st, p = st.player; p.x = x; p.y = y; p.indoor = null; p.vehicle = null; st.t = Math.floor(st.t / 1440) * 1440 + h * 60; pv.ui.zoom = 1; pv.R.cam.x = x; pv.R.cam.y = y; }, [x, y, h]);
  // intervallo fra i fotogrammi (mediana su n) e conteggi del renderer
  const sample = (n) => pg.evaluate(n => new Promise(res => { const rd = window.__pv.R.__models.renderer; const dts = [], calls = [], tris = []; let last = performance.now(), k = 0;
    const R0 = window.__pv.R, f0 = R0.frame, G0 = window.__pv.G, s0 = G0.step, js = []; let jt = 0; R0.frame = function () { const a = performance.now(); const r = f0.apply(this, arguments); jt += performance.now() - a; return r; }; G0.step = function () { const a = performance.now(); const r = s0.apply(this, arguments); jt += performance.now() - a; return r; };
    const r0 = rd.render; let c = 0, t = 0; rd.render = function () { const r = r0.apply(this, arguments); c += rd.info.render.calls; t += rd.info.render.triangles; return r; };
    const f = () => { const now = performance.now(); if (k > 0) { dts.push(now - last); calls.push(c); tris.push(t); js.push(jt); } jt = 0; c = 0; t = 0; last = now; if (++k <= n) requestAnimationFrame(f); else { rd.render = r0; R0.frame = f0; G0.step = s0; const md = a => a.slice().sort((x, y) => x - y)[a.length >> 1]; res({ ms: +md(dts).toFixed(1), p95: +dts.slice().sort((x, y) => x - y)[Math.floor(dts.length * .95)].toFixed(1), js_ms: +md(js).toFixed(1), calls: md(calls), tris_k: Math.round(md(tris) / 1000) }); } };
    requestAnimationFrame(f); }), n);
  const out = {};
  for (const [nome, x, y] of PLACES) {
    await go(x, y, ORA); await pg.waitForTimeout(+(process.env.ATTESA || 25000));
    const info = await pg.evaluate(() => {
      const R = window.__pv.R, S = R.__models.scene, rd = R.__models.renderer, cam = R.getCamera(), st = window.__pv.st;
      const L = { dir: 0, spot: 0, spotOmbra: 0, punto: 0, puntoOmbra: 0, emi: 0, accese: 0 };
      S.traverse(o => { if (!o.isLight || !o.visible) return; if (o.isDirectionalLight) L.dir++; else if (o.isSpotLight) { L.spot++; if (o.castShadow) L.spotOmbra++; } else if (o.isPointLight) { L.punto++; if (o.castShadow) L.puntoOmbra++; } else if (o.isHemisphereLight) L.emi++; if (o.intensity > 0) L.accese++; });
      // categorie: persone, mezzi, edifici, resto (per ramo di primo livello)
      const peopleSet = new Set(Object.values((R.__dyn && R.__dyn.people) || {}));
      const fr = new THREE.Frustum(), M = new THREE.Matrix4(); cam.updateMatrixWorld(); M.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); fr.setFromProjectionMatrix(M);
      const veh = new Set(Object.values(R.__vehicles || {})), bset = new Set((R.__buildings || []).map(B => B.grp).filter(Boolean));
      const cat = {}, catSh = {}, perPersona = []; let persone = 0, personeVis = 0, mezzi = 0;
      const top = o => { let q = o; while (q.parent && q.parent !== S) q = q.parent; return q; };
      const catOf = q => { if (veh.has(q)) return 'mezzi'; if (bset.has(q)) return 'edifici'; let sk = false; q.traverse(o => { if (o.isSkinnedMesh) sk = true; }); if (sk) return 'persone'; return (q.name || q.type); };
      const cache = new Map();
      S.traverseVisible(o => { if (!(o.isMesh || o.isSprite || o.isLine || o.isPoints)) return; const q = top(o); let c = cache.get(q); if (!c) { c = catOf(q); cache.set(q, c); }
        const nm = Array.isArray(o.material) ? o.material.length : 1;
        if (o.castShadow && o.isMesh) catSh[c] = (catSh[c] || 0) + nm;
        if (o.frustumCulled && !fr.intersectsObject(o)) return; cat[c] = (cat[c] || 0) + nm; });
      cache.forEach((c, q) => { if (c === 'persone') { persone++; let n = 0, inv = false; q.traverseVisible(o => { if (o.isMesh) n += Array.isArray(o.material) ? o.material.length : 1; }); const p = new THREE.Vector3(); q.getWorldPosition(p); if (fr.containsPoint(p)) { personeVis++; perPersona.push(n); } } if (c === 'mezzi') mezzi++; });
      const srt = m => Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 14);
      perPersona.sort((a, b) => a - b);
      let progs = rd.info.programs ? rd.info.programs.length : 0, mats = new Set(); S.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => mats.add(m)); });
      let objs = 0; S.traverse(() => objs++);
      return { luci: L, persone_in_scena: persone, persone_inquadrate: personeVis, pezzi_per_persona_mediana: perPersona[perPersona.length >> 1], pezzi_per_persona_max: perPersona[perPersona.length - 1], mezzi_in_scena: mezzi,
        disegni_in_vista: srt(cat), ombre_per_ramo: srt(catSh), programmi: progs, materiali: mats.size, oggetti: objs, npc: st.npcs.length, npcVicini: st.npcs.filter(n => !n.inside && Math.hypot(n.x - st.player.x, n.y - st.player.y) < 60).length, veicoli: st.vehicles.length,
        mem_mb: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : 0, geo: rd.info.memory.geometries, tex: rd.info.memory.textures };
    });
    log(nome, JSON.stringify(info));
    const N = +(process.env.NF || 40);
    const R = {};
    R.base = await sample(N);
    // le mesh sciolte in vista e chi le ha messe (righe di index.html)
    R.origine = await pg.evaluate(() => { const Rr = window.__pv.R, S = Rr.__models.scene, cam = Rr.getCamera(); const fr = new THREE.Frustum(), M = new THREE.Matrix4(); cam.updateMatrixWorld(); M.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); fr.setFromProjectionMatrix(M);
      const vis = {}, all = {}, sh = {}; S.children.forEach(q => { const k = (q.__src || ['?']).join('<'); let nv = 0, na = 0, ns = 0; q.traverseVisible(o => { if (!(o.isMesh || o.isSprite || o.isPoints || o.isLine)) return; na++; if (o.castShadow) ns++; if (!o.frustumCulled || fr.intersectsObject(o)) nv++; }); vis[k] = (vis[k] || 0) + nv; all[k] = (all[k] || 0) + na; sh[k] = (sh[k] || 0) + ns; });
      const top = m => Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 25); return { in_vista: top(vis), tutte: top(all), ombra: top(sh) }; });
    // 1) ombre dei faretti ferme (nessun ridisegno)
    await pg.evaluate(() => { window.__sb = []; const R = window.__pv.R, S = R.__models.scene; S.traverse(o => { if (o.isSpotLight && o.castShadow) { window.__sb.push(o); o.shadow.autoUpdate = false; Object.defineProperty(o.shadow, 'needsUpdate', { configurable: true, get: () => false, set: () => {} }); } }); });
    R.faretti_ombra_ferma = await sample(N);
    // 2) faretti senza ombra (anche nel materiale: si ricompila)
    await pg.evaluate(() => { const S = window.__pv.R.__models.scene; window.__sb.forEach(o => { delete o.shadow.needsUpdate; o.castShadow = false; }); S.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.needsUpdate = true); }); });
    await sample(20); R.faretti_senza_ombra = await sample(N);
    // 3) anche le luci a zero fuori (le luci spente restano nello shader)
    await pg.evaluate(() => { const S = window.__pv.R.__models.scene; window.__lz = []; S.traverse(o => { if (o.isLight && !o.isDirectionalLight && !o.isHemisphereLight && !(o.intensity > 0) && o.visible) { o.visible = false; window.__lz.push(o); } }); S.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.needsUpdate = true); }); });
    await sample(20); R.luci_spente_tolte = await sample(N);
    // 4) ombra del sole ferma
    await pg.evaluate(() => { const rd = window.__pv.R.__models.renderer; rd.shadowMap.autoUpdate = false; rd.shadowMap.needsUpdate = false; window.__noSun = setInterval(() => { rd.shadowMap.needsUpdate = false; }, 0); });
    R.sole_ombra_ferma = await sample(N);
    // 5) post: bagliore e raggi via
    await pg.evaluate(() => { const A = window.__AMB; window.__A0 = { bloom: A.bloom, shafts: A.shafts }; A.bloom = 0; A.shafts = 0; });
    R.senza_bagliore_raggi = await sample(N);
    // 6) persone nascoste
    await pg.evaluate(() => { const R = window.__pv.R, S = R.__models.scene; window.__ph = []; S.children.forEach(q => { let sk = false; q.traverse(o => { if (o.isSkinnedMesh) sk = true; }); if (sk && q.visible) { q.visible = false; window.__ph.push(q); } }); window.__phI = setInterval(() => window.__ph.forEach(q => q.visible = false), 0); });
    R.senza_persone = await sample(N);
    // 7) mezzi nascosti
    await pg.evaluate(() => { const R = window.__pv.R; window.__vh = Object.values(R.__vehicles || {}); window.__vhI = setInterval(() => window.__vh.forEach(q => q.visible = false), 0); });
    R.senza_mezzi = await sample(N);
    // ripristino
    await pg.evaluate(() => { clearInterval(window.__phI); clearInterval(window.__vhI); clearInterval(window.__noSun); window.__ph.forEach(q => q.visible = true); window.__vh.forEach(q => q.visible = true); window.__lz.forEach(o => o.visible = true); window.__sb.forEach(o => { o.castShadow = true; o.shadow.needsUpdate = true; }); const A = window.__AMB; Object.assign(A, window.__A0); const rd = window.__pv.R.__models.renderer; rd.shadowMap.autoUpdate = true; window.__pv.R.__models.scene.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.needsUpdate = true); }); });
    await sample(20);
    // logica da sola: G.step cronometrato
    R.logica = await pg.evaluate(() => new Promise(res => { const G = window.__pv.G, s0 = G.step, a = []; G.step = function () { const t = performance.now(); const r = s0.apply(this, arguments); a.push(performance.now() - t); return r; }; setTimeout(() => { G.step = s0; a.sort((x, y) => x - y); res({ mediana: +a[a.length >> 1].toFixed(2), p95: +a[Math.floor(a.length * .95)].toFixed(2), max: +a[a.length - 1].toFixed(1) }); }, 6000); }));
    console.log(nome, 'prove', JSON.stringify(R));
    out[nome] = { info, prove: R };
  }
  if (process.env.OUT) fs.writeFileSync(process.env.OUT, JSON.stringify(out, null, 1));
  await b.close(); srv.close(); process.exit(0);
});
