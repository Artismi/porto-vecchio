// [avvio3] node strumenti/sonda_programmi.js [--query=&leggera] [--secondi=12]
// Apre il gioco (Chromium senza testa, SwiftShader), aspetta che si giochi, poi elenca i programmi della scheda video raggruppati per
// tipo di materiale e per i #define che li distinguono (quanti programmi, quanto sorgente), e misura a regime: disegni, triangoli,
// oggetti in scena, ms di R.frame e G.step (mediana su N fotogrammi coi disegni a vuoto, come banco_peso.js). Serve a capire perché i
// programmi sono tanti (ogni programma è un'attesa nel caricamento) e dove va il tempo del processore a fotogramma.
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || 'playwright');
const ARG = {}; for (const a of process.argv.slice(2)) { const m = /^--([a-z]+)(?:=(.*))?$/.exec(a); if (m) ARG[m[1]] = m[2] === undefined ? true : m[2]; }
const root = path.resolve(__dirname, '..'), SEC = +(ARG.secondi || 12);
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.gz': 'application/gzip' };
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info'] });
  const pg = await b.newPage({ viewport: { width: 640, height: 360 } });
  pg.on('pageerror', e => console.log('[errore]', e.message));
  const t0 = Date.now();
  await pg.goto(`http://localhost:${srv.address().port}/${ARG.pagina || 'index.html'}?${(ARG.query || '').replace(/^&/, '')}`, { waitUntil: 'domcontentloaded', timeout: 0 });
  await pg.waitForFunction(() => window.__tl && window.__tl.gioco, null, { timeout: 1800000, polling: 1000 });
  console.log('gioco dopo', ((Date.now() - t0) / 1000).toFixed(0), 's');
  await pg.keyboard.press('Enter'); await pg.waitForTimeout(3000);
  await pg.waitForFunction(() => !window.__pv.ui.intro, null, { timeout: 120000 }).catch(() => console.log('ancora intro'));
  // i programmi: per tipo di shader e per i define principali
  const prog = await pg.evaluate(() => {
    const R = window.__pv.R, rd = R.__models.renderer, gl = rd.getContext(), out = { n: 0, kb: 0, per: {}, chiavi: {} };
    (rd.info.programs || []).forEach(p => {
      out.n++; let len = 0; try { gl.getAttachedShaders(p.program).forEach(s => { len += (gl.getShaderSource(s) || '').length; }); } catch (e) { }
      out.kb += len / 1024; const k = p.cacheKey || p.name || '?';
      const tipo = (k.match(/^(\w+)/) || ['', k])[1];
      out.per[tipo] = out.per[tipo] || { n: 0, kb: 0 }; out.per[tipo].n++; out.per[tipo].kb += len / 1024;
      // i define che cambiano da un programma all'altro dello stesso tipo
      const defs = (k.match(/\b[A-Z][A-Z0-9_]{3,}\b/g) || []).filter((d, i, a) => a.indexOf(d) === i);
      defs.forEach(d => { out.chiavi[d] = (out.chiavi[d] || 0) + 1; });
    });
    out.kb = Math.round(out.kb); for (const t in out.per) out.per[t].kb = Math.round(out.per[t].kb);
    return out; });
  // le luci in scena: ogni luce entra in ogni programma (e ogni ombra di luce è una mappa letta da ogni pixel)
  const luci = await pg.evaluate(() => { const out = []; window.__pv.R.__models.scene.traverse(o => { if (o.isLight && !o.isAmbientLight && !o.isHemisphereLight) out.push([o.type, o.name || '', o.parent && o.parent !== o.parent.parent ? (o.parent.name || o.parent.type) : '', +o.intensity.toFixed(2), !!o.castShadow, o.shadow && o.shadow.map ? o.shadow.mapSize.x : 0]); }); return out; });
  console.log('luci in scena', luci.length, 'con ombra', luci.filter(l => l[4]).length); luci.filter(l => l[4] || l[0] === 'PointLight').forEach(l => console.log('  ', JSON.stringify(l)));
  console.log('programmi', prog.n, prog.kb, 'KB');
  console.log(Object.entries(prog.per).sort((a, b) => b[1].n - a[1].n).map(([k, v]) => `${k}: ${v.n} (${v.kb} KB)`).join('\n'));
  console.log('define più variabili:', JSON.stringify(Object.entries(prog.chiavi).filter(([k, v]) => v > 0 && v < prog.n).sort((a, b) => b[1] - a[1]).slice(0, 40)));
  // le chiavi intere dei programmi di uno stesso tipo, per capire le varianti (le prime 60)
  const chiavi = await pg.evaluate(() => (window.__pv.R.__models.renderer.info.programs || []).map(p => p.cacheKey).filter(Boolean));
  fs.writeFileSync('/tmp/programmi_chiavi.txt', chiavi.join('\n'));
  // il sorgente del programma physical più grosso (per vedere dove vanno i KB)
  const grosso = await pg.evaluate(() => { const rd = window.__pv.R.__models.renderer, gl = rd.getContext(); let best = null, bl = 0;
    (rd.info.programs || []).forEach(p => { if (!/^physical/.test(p.cacheKey || '')) return; try { const sh = gl.getAttachedShaders(p.program); const src = sh.map(s => gl.getShaderSource(s) || ''); const l = src[0].length + src[1].length; if (l > bl) { bl = l; best = { key: p.cacheKey, vs: src[0], fs: src[1] }; } } catch (e) { } });
    return best; });
  if (grosso) { fs.writeFileSync('/tmp/prog_phys.vert', grosso.vs); fs.writeFileSync('/tmp/prog_phys.frag', grosso.fs); console.log('programma physical più grosso', Math.round(grosso.vs.length / 1024), '+', Math.round(grosso.fs.length / 1024), 'KB', grosso.key.slice(0, 120)); }
  // [avvio3] GLI SCATTI: i programmi che nascono mentre si gioca. Il personaggio salta in otto posti della città (uno ogni 6 s), si contano
  // i programmi nuovi (con la chiave) e il tempo passato ad aspettarne la compilazione (gl.getProgramParameter, LINK_STATUS e uniform)
  if (!ARG.nocammino) {
    const cam = await pg.evaluate(() => new Promise(res => {
      const pv = window.__pv, R = pv.R, rd = R.__models.renderer, gl = rd.getContext(), st = pv.st;
      const k0 = new Set((rd.info.programs || []).map(p => p.cacheKey)), gpp = gl.getProgramParameter; let att = 0, n = 0;
      gl.getProgramParameter = function () { const a = performance.now(); const r = gpp.apply(this, arguments); att += performance.now() - a; n++; return r; };
      const posti = [[1400, 312], [1380, 343], [1272, 343], [1306, 312], [1268, 390], [1540, 338], [1286, 272], [1428, 324]]; let i = 0, fr = [], lt = performance.now();
      const salta = () => { const [x, y] = posti[i]; const p = st.player; p.x = x; p.y = y; p.path = []; p.vehicle = null; p.indoor = null; if (R.cam) { R.cam.x = x; R.cam.y = y; } };
      salta(); const t0 = performance.now();
      (function tick() { const now = performance.now(); fr.push(now - lt); lt = now;
        if (now - t0 > (i + 1) * 6000) { i++; if (i < posti.length) salta(); }
        if (i < posti.length) requestAnimationFrame(tick); else { gl.getProgramParameter = gpp;
          const nuovi = (rd.info.programs || []).map(p => p.cacheKey).filter(k => !k0.has(k));
          fr.sort((a, b) => a - b);
          res({ nuovi: nuovi.length, attesaMs: Math.round(att), chiamate: n, fotogrammi: fr.length, mediana: Math.round(fr[fr.length >> 1]), p95: Math.round(fr[Math.floor(fr.length * .95)]), max: Math.round(fr[fr.length - 1]),
            chiavi: nuovi.map(k => { const f = k.split(','); return f[0] + ' … ' + f.slice(-3).join(',').slice(0, 140); }) }); } })(); }));
    console.log('cammino', JSON.stringify(Object.assign({}, cam, { chiavi: undefined })));
    cam.chiavi.forEach(k => console.log('   nuovo:', k));
  }
  // a regime: i disegni e i ms del processore (disegni a vuoto)
  const mis = await pg.evaluate(SEC => new Promise(res => {
    const pv = window.__pv, R = pv.R, rd = R.__models.renderer, gl = rd.getContext(), G = pv.G, st = pv.st;
    if (R.gpuTiming) try { R.gpuTiming(true); } catch (e) { }
    const de = gl.drawElements, da = gl.drawArrays, dei = gl.drawElementsInstanced, dai = gl.drawArraysInstanced;
    let calls = 0; gl.drawElements = function () { calls++; }; gl.drawArrays = function () { calls++; }; if (dei) gl.drawElementsInstanced = function () { calls++; }; if (dai) gl.drawArraysInstanced = function () { calls++; };
    const F = [], S = [], C = [], T = []; let n = 0; const t0 = performance.now();
    const F0 = R.frame, S0 = G.step; let fr = 0, stp = 0;
    R.frame = function () { const a = performance.now(); const r = F0.apply(this, arguments); fr += performance.now() - a; return r; };
    G.step = function () { const a = performance.now(); const r = S0.apply(this, arguments); stp += performance.now() - a; return r; };
    (function tick() { if (n > 0) { F.push(fr); S.push(stp); C.push(calls); T.push(rd.info.render.triangles); } fr = 0; stp = 0; calls = 0; n++;
      if (performance.now() - t0 < SEC * 1000) requestAnimationFrame(tick); else {
        gl.drawElements = de; gl.drawArrays = da; if (dei) gl.drawElementsInstanced = dei; if (dai) gl.drawArraysInstanced = dai; R.frame = F0; G.step = S0;
        const med = a => { const b = a.slice().sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; }, p9 = a => { const b = a.slice().sort((x, y) => x - y); return b[Math.floor(b.length * .9)]; };
        let obj = 0, mesh = 0, vis = 0; R.__models.scene.traverse(o => { obj++; if (o.isMesh) { mesh++; if (o.visible) vis++; } });
        const info = R.gpuTimes && R.gpuTimes.info;
        res({ fotogrammi: F.length, frame_med: +med(F).toFixed(1), frame_p90: +p9(F).toFixed(1), step_med: +med(S).toFixed(1), step_p90: +p9(S).toFixed(1), disegni_med: med(C), disegni_p90: p9(C), tri: med(T), oggetti: obj, mesh, meshVisibili: vis, info, heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null, npc: st.npcs.length, veicoli: st.vehicles.length, profilo: window.PV_PROFILO, luci: window.__luci, tasselli: window.__tasselli ? { inScena: window.__tasselli.inScena, mesh: window.__tasselli.mesh } : null }); } })(); }), SEC);
  console.log(JSON.stringify(mis));
  // il profilo del processore a regime, per funzione (tempo proprio) e per sezione
  const cdp = await pg.context().newCDPSession(pg);
  await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 }); await cdp.send('Profiler.start');
  await pg.evaluate(SEC => new Promise(res => { const gl = window.__pv.R.__models.renderer.getContext(); const de = gl.drawElements, da = gl.drawArrays, dei = gl.drawElementsInstanced, dai = gl.drawArraysInstanced; gl.drawElements = function () { }; gl.drawArrays = function () { }; if (dei) gl.drawElementsInstanced = function () { }; if (dai) gl.drawArraysInstanced = function () { }; const t0 = performance.now(); (function tick() { if (performance.now() - t0 < SEC * 1000) requestAnimationFrame(tick); else { gl.drawElements = de; gl.drawArrays = da; if (dei) gl.drawElementsInstanced = dei; if (dai) gl.drawArraysInstanced = dai; res(); } })(); }), SEC);
  const { profile } = await cdp.send('Profiler.stop');
  const html = fs.readFileSync(path.join(root, ARG.pagina || 'index.html'), 'utf8').split('\n'), sez = []; html.forEach((l, i) => { const m = /<script data-m="([^"]+)"/.exec(l); if (m) sez.push([i, m[1]]); });
  const sezOf = (url, ln) => { if (!/index\.html/.test(url)) return url.replace(/^.*\//, '') || '(nativo)'; let s = '(pagina)'; for (const [i, n] of sez) { if (i <= ln) s = n; else break; } return s; };
  const by = new Map(profile.nodes.map(n => [n.id, n])), cnt = new Map(); profile.samples.forEach((id, i) => cnt.set(id, (cnt.get(id) || 0) + (profile.timeDeltas[i] || 0)));
  const self = new Map(), perS = new Map(); let tot = 0;
  cnt.forEach((us, id) => { const f = by.get(id).callFrame, s = f.url ? sezOf(f.url, f.lineNumber) : (f.functionName || '(nativo)'); tot += us; const k = `${f.functionName || '(anonima)'} ${s}:${f.lineNumber + 1}`; self.set(k, (self.get(k) || 0) + us); perS.set(s, (perS.get(s) || 0) + us); });
  console.log('profilo a regime', (tot / 1e6).toFixed(1), 's');
  console.log('sezioni', JSON.stringify([...perS].sort((a, b) => b[1] - a[1]).slice(0, 18).map(([k, v]) => [k, +(v / tot * 100).toFixed(1) + '%'])));
  console.log('funzioni', JSON.stringify([...self].sort((a, b) => b[1] - a[1]).slice(0, 40).map(([k, v]) => [k, +(v / tot * 100).toFixed(1) + '%'])));
  await b.close(); srv.close();
});
