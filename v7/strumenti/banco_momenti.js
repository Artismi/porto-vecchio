// [momenti] I TRE MOMENTI DELLO SCATTO: la corsa (fermo → corre → fermo → corre), i piccioni che si alzano (uno stormo vicino, spaventato
// da un clacson finto), i fogli che volano (il vento forzato a raffiche forti). Stessa pagina e stessi agganci di banco_scatti.js (seme
// fisso, passo di 1/60 s, i disegni a vuoto senza --disegna), ma qui per ogni fotogramma si segna anche cosa succede (corre, quanti piccioni
// in volo, quanti fogli in aria) e per ogni momento si dà il fotogramma peggiore di «lavoro» (logica + grafica + timer − attese WebGL)
// nella finestra dell'evento, gli shader nuovi e le raccolte della memoria; più le funzioni del profilo nei fotogrammi peggiori.
//   node strumenti/banco_momenti.js [cartella] [--momenti=corsa,piccioni,fogli] [--rip=3] [--seme=12345] [--disegna]
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || '/opt/node-tools/node_modules/playwright-core');
const root = path.resolve(__dirname, '..');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const has = k => process.argv.includes('--' + k);
const OUT = process.argv.slice(2).find(a => !a.startsWith('--')) || path.join(root, 'reports', 'banco_momenti');
const Q = '?cittanuova' + arg('query', ''), SEME = +arg('seme', 12345), RIP = +arg('rip', 3), W = +arg('vw', 480), H = +arg('vh', 300);
const MOM = arg('momenti', 'corsa,piccioni,fogli').split(',');
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.gz': 'application/gzip', '.bin': 'application/octet-stream' };
fs.mkdirSync(OUT, { recursive: true });

function initPage(opt) {
  window.__pulita = true;
  if (!opt.disegna) { for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) { if (!C) continue; const P = C.prototype;
    for (const k of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced', 'drawRangeElements']) { const f = P[k]; if (f) P[k] = function () { }; } } }
  { let a = opt.seme >>> 0 || 1; Math.random = function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const B = window.__sc = { on: false, rec: [], cur: null, inp: null };
  const avvolgi = (orig) => function (fn, ms, ...rest) { if (typeof fn !== 'function') return orig.call(this, fn, ms, ...rest);
    return orig.call(this, function () { if (!B.on || !B.cur) return fn.apply(this, arguments); const t = performance.now(); try { return fn.apply(this, arguments); } finally { B.cur.timer += performance.now() - t; } }, ms, ...rest); };
  window.setInterval = avvolgi(window.setInterval); window.setTimeout = avvolgi(window.setTimeout);
  for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) { if (!C) continue; const P = C.prototype;
    for (const k of Object.getOwnPropertyNames(P)) { const d = Object.getOwnPropertyDescriptor(P, k); if (!d || typeof d.value !== 'function' || k === 'constructor') continue; const f = d.value;
      P[k] = function () { if (!B.on || !B.cur) return f.apply(this, arguments); const t = performance.now(); try { return f.apply(this, arguments); } finally { B.cur.gl += performance.now() - t; } }; } }
  const heap = () => (performance.memory ? performance.memory.usedJSHeapSize : 0);
  const hook = () => {
    const pv = window.__pv; if (!pv || !pv.G || !pv.R || !pv.R.__models || !pv.R.__models.renderer) { setTimeout(hook, 200); return; }
    const G = pv.G, R = pv.R, rd = R.__models.renderer, s0 = G.step, f0 = R.frame;
    G.step = function (st, dt, inp) {
      if (!B.on) return s0.apply(this, arguments);
      dt = 1 / 60; if (B.inp) inp = B.inp(st);
      if (B.cur) B.rec.push(B.cur);
      B.cur = { i: B.rec.length, step: 0, frame: 0, timer: 0, gl: 0, h0: heap(), progs0: rd.info.programs.length, ev: B.ev || '' }; B.ev = '';
      const t = performance.now(); try { return s0.call(this, st, dt, inp); } finally { B.cur.step = performance.now() - t; if (B.dopo) B.dopo(st); }
    };
    R.frame = function (st, dt, ui) {
      if (!B.on) return f0.apply(this, arguments);
      const t = performance.now(); try { return f0.call(this, st, 1 / 60, ui); } finally { const c = B.cur; if (c) { c.frame = performance.now() - t; c.h1 = heap(); c.progs = rd.info.programs.length - c.progs0; c.t1 = performance.now(); c.t0 = t - c.step;
        const p = st.player, M = R.__mondo && R.__mondo.M; c.v = Math.abs(p.speed || 0);
        const cm = R.getCamera(), cv = rd.domElement, Hh = cv.height / 2, Wh = cv.width / 2, V3 = window.__v3 || (window.__v3 = new cm.position.constructor());
        V3.set(p.x, (B.ph || 0) + 1, p.y).project(cm); c.px = V3.x * Wh; c.py = V3.y * Hh; if (B.fisso) { V3.set(B.fisso[0], B.fisso[1], B.fisso[2]).project(cm); c.wx = V3.x * Wh; c.wy = V3.y * Hh; }
        const ri = rd.info; c.calls = ri.render.calls; c.tris = ri.render.triangles; c.geo = ri.memory.geometries; c.tex = ri.memory.textures; c.far = cm.far; c.fog = R.__models.scene && R.__models.scene.fog ? R.__models.scene.fog.far : 0;
        c.str = window.__stream ? window.__stream.carichi : 0; c.cot = window.PesoOmbre ? PesoOmbre.conto().cotture : 0; c.job = !!(R.ISO && R.ISO.job);
        c.camx = cm.position.x; c.camz = cm.position.z; c.plx = p.x; c.ply = p.y;
        let vol = 0, su = 0; if (M && M.birds) for (const b of M.birds.S) if (b.st === 'volo') vol++; if (M && M.papers) for (const q of M.papers.S) if (!q.dead && q.y > 0) su++; c.vol = vol; c.su = su; } }
    };
    B.pronto = true;
  };
  hook();
}

const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const T0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0)} s]`, ...a);
  const b = await chromium.launch({ executablePath: process.env.PW_CHROME || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info', '--js-flags=--expose-gc'] });
  const pg = await b.newPage({ viewport: { width: W, height: H } }), errori = [];
  pg.on('crash', () => { log('[pagina morta]'); process.exit(2); });
  pg.on('pageerror', e => { errori.push(e.message); log('[errore]', e.message); });
  await pg.addInitScript(initPage, { disegna: has('disegna'), seme: SEME });
  if (arg('zoom')) await pg.addInitScript(z => { window.__zv = z; }, +arg('zoom'));
  const cdp = await pg.context().newCDPSession(pg);
  await pg.goto(`http://localhost:${srv.address().port}/${arg('pagina', 'index.html')}${Q}`, { timeout: 900000 });
  await pg.waitForFunction(() => window.__pv && window.__pv.st && window.__sc && window.__sc.pronto, null, { timeout: 1200000, polling: 1000 });
  log('caricato');
  await pg.keyboard.press('Enter'); await pg.waitForTimeout(2000);
  await pg.waitForFunction(() => !window.__pv.ui.intro, null, { timeout: 300000, polling: 500 }).catch(() => log('ancora nella schermata iniziale'));
  await pg.evaluate(() => { if (window.Anelli && Anelli.ON) Anelli.finisci(); const R = window.__pv.R; if (R.setRes) R.setRes(1); R.setRes = null; R.lowQuality = () => { }; if (window.PesoSchermo && PesoSchermo.blocca) PesoSchermo.blocca(); });
  await pg.evaluate(() => { const pv = window.__pv, st = pv.st; st.deadline = 1e12; window.__meteo = 'sereno';
    setInterval(() => { const u = pv.ui; u.flash = 0; u.fade = 0; u.desat = false; u.letterbox = false; u.dialog = null; u.book = false; u.menu = false; st.over = null; st.chase = false; st.player.hp = 100; st.player.stun = 0; }, 50);
    // il vento si può forzare: window.__vf (null: quello del gioco)
    const V = pv.R.__mondo.V.g; let v0 = V.value; Object.defineProperty(V, 'value', { get() { return window.__vf != null ? window.__vf : v0; }, set(x) { v0 = x; } }); });
  const OUTJ = { seme: SEME, rip: RIP, disegna: has('disegna'), momenti: {}, errori };
  const nfa = async (n) => { const s = await pg.evaluate(() => window.__sc.rec.length); for (let tb = Date.now(), lt = Date.now(); ;) { await pg.waitForTimeout(500); const k = await pg.evaluate(() => window.__sc.rec.length); if (k >= s + n) return; if (Date.now() - lt > 30000) { lt = Date.now(); log('fotogrammi', k, '/', s + n, JSON.stringify(await pg.evaluate(() => ({ intro: window.__pv.ui.intro, t: window.__pv.ui.time })))); } if (Date.now() - tb > 900000) throw new Error('troppo lento'); } };
  for (const nome of MOM) {
    // la partenza: un marciapiede della città nuova, di giorno, fermi; il mondo si assesta
    await pg.evaluate(() => { const pv = window.__pv, st = pv.st, p = st.player; p.vehicle = null; p.indoor = null; p.lv = null; p.path = []; p.x = 1424; p.y = 322; p.vx = p.vy = 0;
      window.__t0 = window.__t0 || (Math.floor(st.t / 1440) + 1) * 1440; st.t = window.__t0 + 660; pv.ui.zoom = 1; pv.R.cam.x = pv.R.cam.tx = p.x; pv.R.cam.y = pv.R.cam.ty = p.y; window.__vf = null; });
    await pg.evaluate(() => { window.__sc.inp = () => ({ x: 0, y: 0 }); });
    for (let k = 0, quiet = 0, tb = Date.now(); Date.now() - tb < 90000 && quiet < 2; k++) { await pg.waitForTimeout(1000); quiet = (await pg.evaluate(() => !(window.__pv.R.ISO && window.__pv.R.ISO.job))) ? quiet + 1 : 0; }
    log(nome, 'assestato');
    // i comandi del momento
    await pg.evaluate(([nome, RIP]) => { const pv = window.__pv, G = pv.G, B = window.__sc, M = pv.R.__mondo.M; let f = 0;
      const P0 = [1424, 322], P1 = [1372, 388], rotta = (a, q) => (G.findPath(a[0], a[1], q[0], q[1]) || []).map(n => Array.isArray(n) ? n : [n.x, n.y]).concat([q]);
      let lx = 0, ly = 0, ferm = 0; window.__salti = 0;
      const corri = (st, pts) => { const p = st.player; if (Math.hypot(p.x - lx, p.y - ly) < .01) ferm++; else ferm = 0; lx = p.x; ly = p.y; if (ferm > 30 && pts.length) { p.x = pts[0][0]; p.y = pts[0][1]; ferm = 0; window.__salti++; }   // incastrati: al punto
        while (pts.length > 1 && Math.hypot(pts[0][0] - p.x, pts[0][1] - p.y) < 1.2) pts.shift(); const q = pts[0], dx = q[0] - p.x, dy = q[1] - p.y, l = Math.hypot(dx, dy) || 1; return { x: dx / l, y: dy / l, sprint: true, aim: Math.atan2(dy, dx), mag: 1 }; };
      if (nome === 'corsa') { const A = rotta(P0, P1), Bk = rotta(P1, P0); let pts = null, k = 0;
        B.inp = st => { f++; const ph = f % 420; if (ph === 120) { pts = (k++ % 2 ? Bk : A).slice(); B.ev = 'corre'; } if (ph === 0) B.ev = 'ferma'; return ph >= 120 ? corri(st, pts) : { x: 0, y: 0 }; }; }
      else if (nome === 'piccioni') { B.inp = () => { f++; return { x: 0, y: 0 }; };
        B.dopo = st => { const ph = f % 360; if (ph === 300 && M.birds && M.birds.F.length) { st.sfx = st.sfx || []; st.sfx.push({ k: 'honk', x: st.player.x, y: st.player.y }); B.ev = 'clacson'; } }; }
      else if (nome === 'cadenza') { const p = pv.st.player; B.fisso = [p.x, 0, p.y]; B.ph = 0; let pts = rotta(P0, P1); B.inp = st => { f++; const q = corri(st, pts); q.sprint = false; q.mag = (3.8 - 1.3) / 5.1; return q; }; }
      else if (nome === 'zoom') { const ZV = window.__zv || 4.2; window.__persi = 0; pv.R.__models.renderer.domElement.addEventListener('webglcontextlost', () => window.__persi++);
        const A = rotta(P0, P1), Bk = rotta(P1, P0); let pts = A.slice(), k = 0; pv.ui.zoom = ZV;   // il vecchio massimo: chi lo scrive da fuori arriva lì
        B.inp = st => { f++; pv.ui.zoom = ZV; if (pts.length < 2 && Math.hypot(pts[0][0] - st.player.x, pts[0][1] - st.player.y) < 1.5) pts = (k++ % 2 ? A : Bk).slice(); return corri(st, pts); }; }
      else if (nome === 'fogli') { B.inp = () => { f++; const ph = f % 300; window.__vf = ph < 150 ? .2 : 1.6; if (ph === 150) B.ev = 'raffica'; return { x: 0, y: 0 }; }; }
    }, [nome, RIP]);
    await pg.waitForTimeout(3000); await pg.evaluate(() => window.gc && window.gc());
    await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 250 }); await cdp.send('Profiler.start');
    const marca = await pg.evaluate(() => { const t = performance.now(); (function __marca_scatti() { let x = 0; while (performance.now() - t < 40) x += Math.sqrt(x + 1); return x; })(); return t; });
    await pg.evaluate(() => { const B = window.__sc; B.rec = []; B.cur = null; B.on = true; if (window.PesoOmbre) { PesoOmbre.azzera(); PesoOmbre.diag(true); } });
    if (nome === 'zoom') { // due minuti veri allo zoom massimo, correndo avanti e indietro: il contesto della scheda video regge?
      for (let tb = Date.now(); Date.now() - tb < 120000;) { await pg.waitForTimeout(5000); const q = await pg.evaluate(() => { const ri = window.__pv.R.__models.renderer.info; return { persi: window.__persi, heap: Math.round(performance.memory.usedJSHeapSize / 1048576), geo: ri.memory.geometries, tex: ri.memory.textures, n: window.__sc.rec.length }; }); log('zoom', JSON.stringify(q)); if (q.persi) break; }
      await pg.evaluate(() => { const B = window.__sc; B.on = false; B.inp = null; }); await cdp.send('Profiler.stop');
      const rr = await pg.evaluate(() => window.__sc.rec), mx = k => rr.reduce((m, f) => Math.max(m, f[k] || 0), 0), md = k => { const a = rr.map(f => f[k] || 0).sort((x, y) => x - y); return a[a.length >> 1]; };
      const Z = { fotogrammi: rr.length, contesti_persi: await pg.evaluate(() => window.__persi), zoom_camera: await pg.evaluate(() => window.__pv.R.cam.zoom), far: mx('far'), nebbia: mx('fog'), disegni_med: md('calls'), disegni_max: mx('calls'), triangoli_max: mx('tris'), geometrie_max: mx('geo'), tessiture_max: mx('tex'), lavoro_med: md('step') + md('frame') };
      OUTJ.momenti[nome] = Z; log('== zoom', JSON.stringify(Z)); continue; }
    const NF = nome === 'cadenza' ? 240 : nome === 'corsa' ? 420 * RIP + 60 : nome === 'piccioni' ? 360 * RIP + 60 : 300 * RIP + 60;
    await nfa(NF);
    await pg.evaluate(() => { const B = window.__sc; B.on = false; B.inp = null; B.dopo = null; window.__vf = null; });
    const { profile } = await cdp.send('Profiler.stop');
    log(nome, 'ombre', JSON.stringify(await pg.evaluate(() => window.PesoOmbre ? { conto: PesoOmbre.conto(), diag: PesoOmbre.diag(true) } : null)));
    const rec = await pg.evaluate(() => window.__sc.rec.map(f => ({ i: f.i, t0: f.t0, t1: f.t1, lavoro: +(f.step + f.frame + f.timer - f.gl).toFixed(1), step: +f.step.toFixed(1), frame: +f.frame.toFixed(1), timer: +f.timer.toFixed(1), gl: +f.gl.toFixed(1), progs: f.progs, gc: f.h1 && f.h0 && f.h1 < f.h0 ? Math.round((f.h0 - f.h1) / 1048576) : 0, ev: f.ev, v: +(f.v || 0).toFixed(1), vol: f.vol, su: f.su, str: f.str, cot: f.cot, job: f.job, px: f.px, py: f.py, wx: f.wx, wy: f.wy, camx: f.camx, camz: f.camz, plx: f.plx, ply: f.ply })));
    if (nome === 'cadenza') { // lo scarto da un fotogramma all'altro: il personaggio sullo schermo (deve stare fermo) e il mondo che scorre (deve scorrere uguale)
      // il mondo: lo scarto fra lo spostamento di un fotogramma e quello del precedente (a passo costante deve essere ~0); il personaggio: quanto
      // si sposta sullo schermo da un fotogramma all'altro (la camera gli è legata: deve stare fermo)
      const R1 = rec.slice(30).filter(f => f.v > .5), dW = [], dP = [], dPl = [];
      R1.forEach((f, i) => { if (i < 2) return; const q = R1[i - 1], q2 = R1[i - 2]; const m1 = Math.hypot(f.plx - q.plx, f.ply - q.ply), m2 = Math.hypot(q.plx - q2.plx, q.ply - q2.ply); if (m1 > .5 || m2 > .5 || m1 < .01 || m2 < .01) return; dW.push(Math.hypot((f.wx - q.wx) - (q.wx - q2.wx), (f.wy - q.wy) - (q.wy - q2.wy))); dP.push(Math.hypot(f.px - q.px, f.py - q.py)); dPl.push(Math.hypot(f.plx - q.plx, f.ply - q.ply)); });
      const st = a => { const m = a.reduce((s, x) => s + x, 0) / a.length; return { media: +m.toFixed(3), dev: +Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / a.length).toFixed(3), min: +Math.min(...a).toFixed(3), max: +Math.max(...a).toFixed(3) }; };
      const C = { fotogrammi: R1.length, salti: await pg.evaluate(() => window.__salti), h_px: await pg.evaluate(() => window.__pv.R.__models.renderer.domElement.height), scarto_mondo_px: st(dW), personaggio_px: st(dP), passo_m: st(dPl), prime: R1.slice(1, 25).map((f, i) => +Math.hypot(f.wx - R1[i].wx, f.wy - R1[i].wy).toFixed(2)), rec };
      OUTJ.momenti[nome] = C; log('== cadenza', JSON.stringify(Object.assign({}, C, { rec: undefined }))); continue; }
    // gli eventi: la corsa che parte, lo stormo che si alza (i piccioni in volo da 0 a più), i fogli che si alzano (in aria che cresce di 3 in pochi fotogrammi)
    const ev = []; rec.forEach((f, i) => { const p = rec[i - 1]; if (!p) return;
      if (nome === 'corsa' && f.ev === 'corre') ev.push(i);
      if (nome === 'piccioni' && f.vol > 0 && !p.vol) ev.push(i);
      if (nome === 'fogli' && f.ev === 'raffica') ev.push(i); });
    const finestra = (i) => rec.slice(Math.max(0, i - 2), i + (nome === 'corsa' ? 240 : 90));
    const med = (a) => { const s = a.slice().sort((x, y) => x - y); return s[s.length >> 1]; };
    const base = med(rec.map(f => f.lavoro));
    const eventi = ev.map(i => { const F = finestra(i), w = F.reduce((m, f) => f.lavoro > m.lavoro ? f : m, F[0]); return { da: i, peggiore_ms: w.lavoro, a: w.i, dopo: w.i - i, shader: F.reduce((s, f) => s + Math.max(0, f.progs), 0), gc: F.filter(f => f.gc).length, mediana: med(F.map(f => f.lavoro)) }; });
    // il profilo nei fotogrammi peggiori delle finestre
    const byId = new Map(profile.nodes.map(n => [n.id, n])); let tUs = profile.startTime; const samp = [];
    profile.samples.forEach((id, k) => { tUs += profile.timeDeltas[k] || 0; samp.push([tUs, id]); });
    const mk = samp.find(([, id]) => byId.get(id).callFrame.functionName === '__marca_scatti'), off = mk ? mk[0] / 1000 - marca : null;
    const nomeDi = id => { const cf = byId.get(id).callFrame; return `${cf.functionName || '(anon)'} @${(cf.url || '').split('/').pop()}:${cf.lineNumber + 1}`; };
    const prof = f => { if (off === null) return []; const m = {}; let n = 0; for (const [t, id] of samp) { const ms = t / 1000 - off; if (ms < f.t0 || ms > f.t1) continue; const k = nomeDi(id); m[k] = (m[k] || 0) + 1; n++; } return Object.entries(m).sort((x, y) => y[1] - x[1]).slice(0, 8).map(([k, v]) => `${(v / n * 100).toFixed(0)}% ${k}`); };
    const peggiori = new Set(eventi.map(e => e.a)); const inEv = new Set(); ev.forEach(i => finestra(i).forEach(f => inEv.add(f.i)));
    const fuori = rec.filter(f => !inEv.has(f.i)), Mx = a => a.reduce((m, f) => Math.max(m, f.lavoro), 0);
    const R = { mediana_ms: base, peggiore_eventi_ms: Mx(rec.filter(f => inEv.has(f.i))), peggiore_fuori_ms: Mx(fuori), eventi,
      profili: [...peggiori].map(i => ({ i, ms: rec[i].lavoro, step: rec[i].step, frame: rec[i].frame, timer: rec[i].timer, progs: rec[i].progs, gc: rec[i].gc, carichi: i ? rec[i].str - rec[i - 1].str : 0, cotture: i ? rec[i].cot - rec[i - 1].cot : 0, blocco: rec[i].job, prof: prof(rec[i]) })), rec };
    OUTJ.momenti[nome] = R;
    log(`== ${nome}: mediana ${base} ms, peggiore negli eventi ${R.peggiore_eventi_ms} ms, fuori ${R.peggiore_fuori_ms} ms`);
    eventi.forEach(e => console.log(`   evento @${e.da}: peggiore ${e.peggiore_ms} ms (+${e.dopo} fotogrammi), mediana ${e.mediana}, shader nuovi ${e.shader}, raccolte ${e.gc}`));
    R.profili.forEach(p => console.log(`   #${p.i} ${p.ms} ms (logica ${p.step} grafica ${p.frame} timer ${p.timer} shader+${p.progs} gc ${p.gc} carichi ${p.carichi} cotture ${p.cotture} blocco ${p.blocco})\n      ${p.prof.join(' | ')}`));
  }
  const slim = JSON.parse(JSON.stringify(OUTJ)); for (const k in slim.momenti) delete slim.momenti[k].rec;
  fs.writeFileSync(path.join(OUT, 'momenti.json'), JSON.stringify(OUTJ));
  fs.writeFileSync(path.join(OUT, 'momenti_sintesi.json'), JSON.stringify(slim, null, 1));
  log('fatto', OUT); await b.close(); srv.close(); process.exit(0);
});
