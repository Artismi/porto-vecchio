// [rifinitura suolo] Le foto prima | dopo della rifinitura del suolo (v7/RIFINITURA_SUOLO.md), nel gioco vero, alla camera del gioco.
//   node strumenti/rifinitura_suolo_foto.js <cartella> <scene.json> [larghezza altezza]
// scene.json: { "query": "tassellivecchi&stile=E", "scene": [{ "nome", "x", "y", "verso": [x, y] | "yaw", "zoom", "ora" }] }.
// La pagina parte con ?stile=E (il codice della rifinitura c'è); per ogni scena lo stesso istante con la manopola dal vivo
// window.__RIFS.k = 0 (com'era: A, lo stesso shader di oggi) e = 1 (la rifinitura): <nome>_0.png, <nome>_1.png. Con PROF=1 anche la
// distanza (cm in R*256+G) e la camera (<nome>_dep.png, <nome>.json) per vedere il risultato col prototipo del passo E (prototipo3.py).
// Con TEMPI=1 misura i millisecondi a fotogramma e le chiamate di disegno con k = 0 e k = 1. Chromium senza testa con SwiftShader.
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || 'playwright');
const [outDir, sceneFile, W0, H0] = process.argv.slice(2), CFG = JSON.parse(fs.readFileSync(sceneFile, 'utf8')), root = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.gz': 'application/gzip', '.webp': 'image/webp' };
fs.mkdirSync(outDir, { recursive: true });
const T0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0)}s]`, ...a);
const srv = http.createServer((req, res) => { let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html'; if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); }).listen(0, async () => {
  const W = +(W0 || 960), H = +(H0 || 540), SOLO = (process.env.SOLO || '').split(',').filter(Boolean);
  let b = null, pg = null; const err = [];
  for (let prova = 0; prova < 10; prova++) {   // la memoria della macchina è stretta: se la pagina cade nel caricamento, si riprova
    b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
    try { pg = await b.newPage({ viewport: { width: W, height: H } }); } catch (e) { log('caduta, riprovo'); await b.close().catch(() => {}); await new Promise(r => setTimeout(r, 60000)); continue; }
    pg.on('pageerror', e => { err.push(e.message); log('[errore]', e.message.slice(0, 300)); }); pg.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) { err.push(m.text()); log('[console]', m.text().slice(0, 300)); } });
    try { await pg.goto(`http://localhost:${srv.address().port}/index.html?${CFG.query || 'tassellivecchi&stile=E'}`, { waitUntil: 'domcontentloaded', timeout: 0 });
      await pg.waitForFunction(() => window.__tl && window.__tl.gioco, null, { timeout: 1800000, polling: 1000 }); break; }
    catch (e) { log('caduta nel caricamento, riprovo', String(e.message).slice(0, 80)); await b.close().catch(() => {}); await new Promise(r => setTimeout(r, 60000)); } }
  await pg.keyboard.press('Enter'); await pg.waitForTimeout(2000);
  await pg.waitForFunction(() => !window.__pv.ui.intro, null, { timeout: 120000 }).catch(() => log('ancora intro'));
  await pg.addStyleTag({ content: '#app > *:not(#cv) { visibility: hidden !important; } body > div:not(#app) { visibility: hidden !important; }' });
  await pg.evaluate(() => { const pv = window.__pv, st = pv.st; st.deadline = 1e12; if (window.PV_ATTESA) window.PV_ATTESA.on = () => true; if (pv.R.gpuTiming) pv.R.gpuTiming(true);
    setInterval(() => { const u = pv.ui; u.flash = 0; u.fade = 0; u.desat = false; u.letterbox = false; u.dialog = null; st.over = null; st.player.hp = 100; }, 50); });
  log('caricato', JSON.stringify(await pg.evaluate(() => window.__RIFS ? { on: window.__RIFS.on, k: window.__RIFS.k.value } : null)));
  if (process.env.DUMP) fs.writeFileSync(path.join(outDir, 'dump.json'), JSON.stringify(await pg.evaluate(C => {   // dove stanno le superfici nella cornice (per scegliere le scene)
    const G = window.__pv.G, T = G.T, TS = G.TS, R = window.__pv.R, out = {}, nomi = {}; for (const k in T) nomi[T[k]] = k;
    for (let ty = Math.floor(C[1] / TS); ty < C[3] / TS; ty++) for (let tx = Math.floor(C[0] / TS); tx < C[2] / TS; tx++) { const v = G.tileAt(tx, ty), n = nomi[v] + (window.Riva && Riva.inBanda && Riva.inBanda(tx, ty) ? '_riva' : ''); (out[n] = out[n] || []).push([tx * TS + 1, ty * TS + 1]); }
    const r = {}; for (const k in out) { const L = out[k]; r[k] = { n: L.length, campione: L.filter((_, i) => i % Math.max(1, Math.floor(L.length / 40)) === 0) }; }
    r.player = [window.__pv.st.player.x, window.__pv.st.player.y]; return r; }, CFG.cornice || [1202, 230, 1630, 472])));
  async function scena(s, outDir) { const ts = Date.now();
    await pg.evaluate(s => { const pv = window.__pv, R = pv.R, st = pv.st, p = st.player, G = pv.G; p.vehicle = null; p.indoor = null; p.lv = null; p.path = [];
      p.x = s.x; p.y = s.y; p.vx = p.vy = 0;
      if (s.ora !== undefined) st.t = Math.floor(st.t / 1440) * 1440 + s.ora * 60; window.__meteo = s.meteo || 'sereno';
      if (R.camReset) R.camReset(); R.snap(st); R.cam.ppx = undefined;
      const h = s.verso ? Math.atan2(s.verso[1] - p.y, s.verso[0] - p.x) : s.yaw || 0; R.cam.uy = Math.atan2(-Math.cos(h), -Math.sin(h)) - R.YAW; p.face = h;
      pv.ui.zoom = s.zoom || .5; pv.ui.tilt = 0; pv.ui.focus = s.fuoco ? { x: s.fuoco[0], y: s.fuoco[1] } : null; }, s);   // fuoco: la camera libera sul punto (da vicino: la camera7 lo zoom quasi non lo sente)
    // i blocchi del terreno attorno, costruiti subito (R.preparaArrivo: quello sotto la camera; la camera spostata un attimo sui vicini):
    // in SwiftShader la pompa dei blocchi ci mette minuti, e intanto si vede l'isola a bassa risoluzione
    log(s.nome, 'blocchi', await pg.evaluate(s => { const pv = window.__pv, R = pv.R, c = R.cam, t0 = performance.now(), n0 = R.ISO.chunks.size;
      for (const [a, b] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) { c.x = s.x + a * 48; c.y = s.y + b * 48; try { R.preparaArrivo(); } catch (e) { } }
      R.snap(pv.st); return [n0, R.ISO.chunks.size, Math.round(performance.now() - t0)]; }, s));
    await pg.waitForTimeout(3000);
    for (let quiet = 0, tb = Date.now(); Date.now() - tb < 40000 && quiet < 3;) { await pg.waitForTimeout(1500);
      quiet = (await pg.evaluate(s => { const I = window.__pv.R.ISO, Wc = I.CH * 2; if (I.job) return false; for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) if (!I.chunks.has(Math.floor((s.x + a * 30) / Wc) + ',' + Math.floor((s.y + b * 20) / Wc))) return false; return true; }, s)) ? quiet + 1 : 0; }
    await pg.waitForTimeout(+(process.env.ATTESA || 4000));
    // lo stesso istante: si ferma il tempo dell'acqua e della gente fra le due foto (la pausa del gioco), poi k = 0 e k = 1
    const r = await pg.evaluate(async P => {
      const pv = window.__pv, R = pv.R, rd = R.__models.renderer, gl = rd.getContext(), cv = rd.domElement, RS = window.__RIFS, out = {};
      const raf = () => new Promise(res => requestAnimationFrame(() => res()));
      // il fotogramma fatto qui (come strumenti del fumetto: passo7.js), letto subito: niente tempo che passa fra k = 0 e k = 1
      const ui = { focus: pv.ui.focus, zoom: pv.ui.zoom, time: pv.ui.time || 0, stick: null, lead: null, tilt: 0, rot: 0, drag: 0, edge: 0, puntatore: false, reale: 1e-3, mira: null };
      const scatto = () => { for (let i = 0; i < 2; i++) R.frame(pv.st, 1e-4, ui); gl.finish(); return cv.toDataURL('image/png'); };
      const k0 = RS ? RS.k.value : 0;
      for (const k of [0, 1]) { if (RS) RS.k.value = k; await raf();
        out[k] = scatto();
        if (P.tempi) { const t = []; let last = performance.now(); for (let i = 0; i < 8; i++) { await raf(); const n = performance.now(); t.push(n - last); last = n; } t.sort((a, b) => a - b);
          const g = R.gpuTimes; out['t' + k] = { ms: +t[4].toFixed(1), gpu: g && g.ms ? +(+g.ms).toFixed(2) : null, dc: rd.info.render.calls, tri: rd.info.render.triangles, prog: rd.info.programs.length }; } }
      if (RS) RS.k.value = k0;
      if (P.prof) {   // la distanza dalla camera (cm, R*256+G) per il prototipo del passo
        const cam = R.getCamera(), sc = R.__models.scene, w = cv.width, h = cv.height, rt = new THREE.WebGLRenderTarget(w, h); rt.depthTexture = new THREE.DepthTexture(w, h); rt.depthTexture.type = THREE.UnsignedIntType;
        rd.setRenderTarget(rt); rd.render(sc, cam);
        const m = new THREE.ShaderMaterial({ uniforms: { d: { value: rt.depthTexture }, nf: { value: new THREE.Vector2(cam.near, cam.far) } }, depthTest: false, depthWrite: false,
          vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = vec4(position.xy, 0., 1.); }',
          fragmentShader: 'precision highp float; uniform sampler2D d; uniform vec2 nf; varying vec2 vU; void main(){ float z = texture2D(d, vU).r * 2. - 1.; float dist = 2. * nf.x * nf.y / (nf.y + nf.x - z * (nf.y - nf.x)); float cm = clamp(floor(dist * 100. + .5), 0., 65535.); gl_FragColor = vec4(floor(cm / 256.) / 255., mod(cm, 256.) / 255., 0., 1.); }' });
        const qs = new THREE.Scene(); qs.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m)); rd.setRenderTarget(null); rd.render(qs, new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)); gl.finish();
        out.dep = cv.toDataURL('image/png'); rt.dispose(); m.dispose();
        const p = pv.st.player, gh = R.groundH(p.x, p.y), pr = (x, y, z) => { const v = new THREE.Vector3(x, y, z).project(cam); return [v.x * .5 + .5, 1 - (v.y * .5 + .5)]; };
        out.meta = { cam: { near: cam.near, far: cam.far, fov: cam.fov, aspect: cam.aspect, mw: cam.matrixWorld.elements.slice() }, player: { piedi: pr(p.x, gh, p.y), testa: pr(p.x, gh + 1.75, p.y), w: [p.x, gh, p.y] }, ora: pv.st.t / 60 };
      }
      return out;
    }, { prof: !!process.env.PROF, tempi: !!process.env.TEMPI });
    for (const k of [0, 1]) fs.writeFileSync(path.join(outDir, `${s.nome}_${k}.png`), Buffer.from(r[k].split(',')[1], 'base64'));
    if (r.dep) { fs.writeFileSync(path.join(outDir, `${s.nome}_dep.png`), Buffer.from(r.dep.split(',')[1], 'base64')); fs.writeFileSync(path.join(outDir, `${s.nome}.json`), JSON.stringify(r.meta)); }
    log(s.nome, ((Date.now() - ts) / 1000).toFixed(0) + 's', r.t0 ? JSON.stringify({ A: r.t0, E: r.t1 }) : ''); return r.t0 ? { A: r.t0, E: r.t1 } : null;
  }
  if (process.env.REPL) {   // la sonda dal vivo: <nome>.scena (JSON di una scena, ATTESA in "attesa"), <nome>.eval (JS), <nome>.quit in REPL/; la risposta in <nome>.out
    const CMD = process.env.REPL; fs.mkdirSync(CMD, { recursive: true }); log('pronto');
    for (;;) { const fl = fs.readdirSync(CMD).filter(f => /\.(eval|scena|quit)$/.test(f)).sort(); if (!fl.length) { await new Promise(r => setTimeout(r, 300)); continue; }
      const f = fl[0], kind = f.split('.').pop(), body = fs.readFileSync(path.join(CMD, f), 'utf8'); fs.unlinkSync(path.join(CMD, f)); let out = '';
      try { if (kind === 'eval') out = JSON.stringify(await pg.evaluate(new Function(body)));
        else if (kind === 'scena') { const sc = JSON.parse(body); if (sc.attesa !== undefined) process.env.ATTESA = String(sc.attesa); out = JSON.stringify(await scena(sc, sc.dir || outDir)); }
        else { fs.writeFileSync(path.join(CMD, f.replace(/\.\w+$/, '.out')), 'bye'); break; } }
      catch (e) { out = 'ERR ' + String(e.message).slice(0, 600); }
      fs.writeFileSync(path.join(CMD, f.replace(/\.\w+$/, '.out')), out + '\n'); }
  } else for (const s of CFG.scene) { if (SOLO.length && !SOLO.includes(s.nome)) continue; await scena(s, outDir); }
  log('errori', JSON.stringify(err.slice(0, 5)));
  await b.close(); srv.close(); process.exit(0);
});
