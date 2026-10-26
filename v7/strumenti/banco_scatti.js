// [scatti] IL BANCO DEGLI SCATTI: una camminata e un giro in auto sempre uguali (seme fisso, passo fisso di 1/60 s, la stessa rotta
// cercata con G.findPath), e per ogni fotogramma quanto è durato davvero (l'intervallo fra due requestAnimationFrame). Conta i picchi,
// non la media: i fotogrammi sopra i 33 e sopra i 50 ms, e per ognuno da dove viene (logica, grafica, shader nuovi, raccolta della
// memoria, timer fra un fotogramma e l'altro, e le funzioni più pesanti nel profilo del processore preso proprio in quel fotogramma).
//   node strumenti/banco_scatti.js [cartella] [--giro=cammina,auto] [--nf=1500] [--query=&...] [--disegna] [--seme=12345] [--vw=480] [--vh=300]
// --disegna: la scheda video (SwiftShader, cioè il processore) disegna davvero; senza, i disegni vanno a vuoto come in banco_peso.js e i
// tempi sono quelli del processore che prepara il fotogramma (quello che fa gli scatti su una macchina vera).
// Esce scatti.json (tutto) e la tabella a schermo.
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || '/opt/node-tools/node_modules/playwright-core');
const root = path.resolve(__dirname, '..');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const has = k => process.argv.includes('--' + k);
const OUT = process.argv.slice(2).find(a => !a.startsWith('--')) || path.join(root, 'reports', 'banco_scatti');
const Q = '?cittanuova' + arg('query', ''), NF = +arg('nf', 1500), W = +arg('vw', 480), H = +arg('vh', 300), SEME = +arg('seme', 12345);
const GIRI = arg('giro', 'cammina,auto').split(',');
// le rotte: punti in metri (le mete; fra l'una e l'altra la strada la cerca G.findPath), ora del giorno in minuti
const ROTTE = {
  cammina: { ora: 660, mete: [[1424, 322], [1410, 343], [1372, 388], [1300, 330], [1278, 340], [1360, 334], [1424, 322], [1520, 352]] },
  auto: { ora: 900, mete: [[1300, 330], [1360, 334], [1410, 343], [1520, 352], [1560, 344], [1420, 340], [1300, 330]] },
};
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream' };
fs.mkdirSync(OUT, { recursive: true });

// dentro la pagina: il passo fisso, la guida lungo la rotta, il registro per fotogramma, i timer cronometrati
function initPage(opt) {
  window.__pulita = true;
  if (!opt.disegna) { window.__nodraw = true;
    for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) { if (!C) continue; const P = C.prototype;
      for (const k of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced', 'drawRangeElements']) { const f = P[k]; if (!f) continue; P[k] = function () { if (window.__nodraw) return; return f.apply(this, arguments); }; } } }
  { let a = opt.seme >>> 0 || 1; Math.random = function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  // i timer: ogni richiamo cronometrato e attribuito a chi l'ha messo (la riga del sorgente che ha chiamato setInterval/setTimeout)
  const B = window.__sc = { on: false, rec: [], cur: null, timers: {}, idle: {} };
  const chi = () => { const l = (new Error().stack || '').split('\n').slice(3, 5).map(s => (s.match(/at (?:new )?([\w$.<>]+)? ?\(?(?:.*\/)?([^/:]+):(\d+)/) || []).slice(1).join(':')).join(' < '); return l; };
  const avvolgi = (orig, tipo) => function (fn, ms, ...rest) {
    if (typeof fn !== 'function') return orig.call(this, fn, ms, ...rest);
    const k = tipo + ' ' + chi();
    return orig.call(this, function () { if (!B.on) return fn.apply(this, arguments); const t = performance.now(); try { return fn.apply(this, arguments); } finally { const d = performance.now() - t; const T = B.timers[k] || (B.timers[k] = { n: 0, ms: 0, max: 0 }); T.n++; T.ms += d; if (d > T.max) T.max = d; if (B.cur) { B.cur.timer += d; if (d > (B.cur.tmax || 0)) { B.cur.tmax = d; B.cur.tchi = k; } } } }, ms, ...rest);
  };
  window.setInterval = avvolgi(window.setInterval, 'setInterval');
  window.setTimeout = avvolgi(window.setTimeout, 'setTimeout');
  if (window.requestIdleCallback) { const ric = window.requestIdleCallback; window.requestIdleCallback = function (fn, o) { const k = 'idle ' + chi(); return ric.call(this, function () { if (!B.on) return fn.apply(this, arguments); const t = performance.now(); try { return fn.apply(this, arguments); } finally { const d = performance.now() - t; const T = B.timers[k] || (B.timers[k] = { n: 0, ms: 0, max: 0 }); T.n++; T.ms += d; if (d > T.max) T.max = d; if (B.cur) { B.cur.timer += d; if (d > (B.cur.tmax || 0)) { B.cur.tmax = d; B.cur.tchi = k; } } } }, o); }; }
  // il tempo dentro le chiamate WebGL: qui la scheda video è un altro processo (SwiftShader) che si contende il processore con tutto il
  // resto, e un uniformMatrix4fv può aspettare decine di ms. Il «lavoro» del fotogramma (logica + grafica + timer − WebGL) è il tempo del
  // gioco: i suoi picchi sono quelli che il codice causa, non la macchina
  for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) { if (!C) continue; const P = C.prototype;
    for (const k of Object.getOwnPropertyNames(P)) { const d = Object.getOwnPropertyDescriptor(P, k); if (!d || typeof d.value !== 'function' || k === 'constructor') continue; const f = d.value;
      P[k] = function () { if (!B.on || !B.cur) return f.apply(this, arguments); const t = performance.now(); try { return f.apply(this, arguments); } finally { B.cur.gl += performance.now() - t; } }; } }
  const heap = () => (performance.memory ? performance.memory.usedJSHeapSize : 0);
  const hook = () => {
    const pv = window.__pv; if (!pv || !pv.G || !pv.R || !pv.R.__models || !pv.R.__models.renderer) { setTimeout(hook, 200); return; }
    const G = pv.G, R = pv.R, rd = R.__models.renderer, s0 = G.step, f0 = R.frame, r0 = rd.render;
    // la rotta: G.findPath da una meta all'altra; a piedi si dà al motore la direzione (nel mondo) del prossimo punto, in auto acceleratore e sterzo
    const ROT = window.__rotta = { on: false, pts: [], i: 0, auto: false, fatto: false, bloccato: 0, lx: 0, ly: 0 };
    G.step = function (st, dt, inp) {
      if (B.on) { dt = 1 / 60;
        const p = st.player;
        if (ROT.on && ROT.pts.length && !ROT.fatto) {
          while (ROT.i < ROT.pts.length && Math.hypot(ROT.pts[ROT.i][0] - p.x, ROT.pts[ROT.i][1] - p.y) < (ROT.auto ? 4 : 1.2)) ROT.i++;
          if (ROT.i >= ROT.pts.length) { ROT.i = 0; }   // in giro: si ricomincia
          const q = ROT.pts[ROT.i], dx = q[0] - p.x, dy = q[1] - p.y, l = Math.hypot(dx, dy) || 1;
          // incastrati (un muro, un passante): dopo 1 s fermi si va al punto
          if (Math.hypot(p.x - ROT.lx, p.y - ROT.ly) < .02) ROT.bloccato++; else ROT.bloccato = 0; ROT.lx = p.x; ROT.ly = p.y;
          if (ROT.bloccato > 60) { if (ROT.auto) { const v = st.vehicles.find(k => k.id === p.vehicle); if (v) { v.x = q[0]; v.y = q[1]; v.speed = 0; } } else { p.x = q[0]; p.y = q[1]; } ROT.bloccato = 0; ROT.salti = (ROT.salti || 0) + 1; }
          if (ROT.auto) { const v = st.vehicles.find(k => k.id === p.vehicle); const ad = v ? Math.atan2(Math.sin(Math.atan2(dy, dx) - v.ang), Math.cos(Math.atan2(dy, dx) - v.ang)) : 0;
            inp = { x: 0, y: 0, aim: p.face, drive: { thr: Math.abs(ad) > 1.2 ? .4 : 1, steer: Math.max(-1, Math.min(1, ad * 1.8)), hb: false, boost: false } }; }
          else inp = { x: dx / l, y: dy / l, sprint: true, brake: false, aim: Math.atan2(dy, dx), mag: 1 };
        }
        if (B.cur) { B.cur.dt = B.tNow - B.cur.t0; B.rec.push(B.cur); }
        B.cur = { i: B.rec.length, t0: B.tNow, dt: 0, step: 0, frame: 0, render: 0, timer: 0, gl: 0, h0: heap(), progs0: rd.info.programs ? rd.info.programs.length : 0 };
        const t = performance.now(); try { return s0.call(this, st, dt, inp); } finally { B.cur.step = performance.now() - t; }
      }
      return s0.apply(this, arguments);
    };
    R.frame = function (st, dt, ui) {
      if (!B.on) return f0.apply(this, arguments);
      const t = performance.now(); try { return f0.call(this, st, 1 / 60, ui); } finally { if (B.cur) { B.cur.frame = performance.now() - t; B.cur.h1 = heap(); B.cur.progs = rd.info.programs ? rd.info.programs.length : 0; B.cur.calls = rd.info.render.calls; B.cur.x = st.player.x; B.cur.y = st.player.y; } }
    };
    rd.render = function () { const t = performance.now(); const r = r0.apply(this, arguments); if (B.on && B.cur) B.cur.render += performance.now() - t; return r; };
    // l'intervallo vero fra un fotogramma e l'altro: il primo richiamo di ogni requestAnimationFrame è il nostro
    const raf = () => { const now = performance.now(); B.tLast = B.tNow || now; B.tNow = now; requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
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
  pg.on('console', m => { if ((m.type() === 'error' && !/404|Failed to load/.test(m.text())) || /\[grafica\]/.test(m.text())) log('[console]', m.text().slice(0, 300)); });
  await pg.addInitScript(initPage, { disegna: has('disegna'), seme: SEME });
  const cdp = await pg.context().newCDPSession(pg);
  await pg.goto(`http://localhost:${srv.address().port}/index.html${Q}`, { timeout: 900000 });
  await pg.waitForFunction(() => window.__pv && window.__pv.st && window.__sc && window.__sc.pronto, null, { timeout: 1200000, polling: 1000 });
  log('caricato', Q);
  await pg.keyboard.press('Enter'); await pg.waitForTimeout(2000);
  await pg.waitForFunction(() => !window.__pv.ui.intro, null, { timeout: 300000, polling: 500 }).catch(() => log('ancora nella schermata iniziale'));
  const A = await pg.evaluate(() => { if (window.Anelli && Anelli.ON) { const t = performance.now(); Anelli.finisci(); return Math.round(performance.now() - t); } return null; }); log('anelli finiti', A);
  await pg.evaluate(() => { const R = window.__pv.R; if (R.setRes) R.setRes(1); R.setRes = null; R.lowQuality = () => { }; if (window.PesoSchermo && PesoSchermo.blocca) PesoSchermo.blocca(); });
  await pg.evaluate(() => { const pv = window.__pv, st = pv.st; st.deadline = 1e12;
    setInterval(() => { const u = pv.ui; u.flash = 0; u.fade = 0; u.desat = false; u.letterbox = false; u.dialog = null; u.book = false; u.menu = false; st.over = null; st.chase = false; st.player.hp = 100; st.player.stun = 0; }, 50); });
  const OUTJ = { query: Q, seme: SEME, nf: NF, vw: W, vh: H, disegna: has('disegna'), giri: {}, errori };
  for (const nome of GIRI) {
    const ro = ROTTE[nome]; if (!ro) continue;
    // la partenza: il primo punto, l'ora, la rotta intera; in auto, una macchina messa lì
    const info = await pg.evaluate(([ro, auto]) => { const pv = window.__pv, st = pv.st, p = st.player, R = pv.R, G = pv.G, ui = pv.ui;
      p.vehicle = null; p.indoor = null; p.lv = null; p.path = []; const [x0, y0] = ro.mete[0]; p.x = x0; p.y = y0;
      window.__t0 = window.__t0 || (Math.floor(st.t / 1440) + 1) * 1440; st.t = window.__t0 + ro.ora; window.__meteo = 'sereno';
      ui.zoom = 1; R.cam.x = R.cam.tx = x0; R.cam.y = R.cam.ty = y0;
      const pts = []; for (let k = 1; k < ro.mete.length; k++) { const a = k === 1 ? [x0, y0] : ro.mete[k - 1], q = ro.mete[k]; const P = G.findPath(a[0], a[1], q[0], q[1], auto ? 1 : undefined, auto) || []; P.forEach(n => pts.push(Array.isArray(n) ? n : [n.x, n.y])); if (!P.length) pts.push(q); }
      let car = null;
      if (auto) { const v = st.vehicles.find(v => !v.rider && !v.hidden && !v.wreck && !v.traffic && !G.VK[v.kind].boat && !G.VK[v.kind].pocket && v.kind !== 'vespa' && v.kind !== 'bmx');
        if (v) { v.x = x0; v.y = y0; v.speed = 0; v.ang = Math.atan2(pts[0][1] - y0, pts[0][0] - x0); p.x = x0 + 1.5; p.y = y0; const r = G.act(st, 'F'); car = { kind: v.kind, id: v.id, dentro: p.vehicle === v.id, msg: r && r.msg }; if (p.vehicle !== v.id) { p.vehicle = v.id; v.rider = 'player'; } } }
      Object.assign(window.__rotta, { on: false, pts, i: 0, auto, fatto: false, salti: 0 });
      return { punti: pts.length, metri: Math.round(pts.reduce((s, q, k) => s + (k ? Math.hypot(q[0] - pts[k - 1][0], q[1] - pts[k - 1][1]) : 0), 0)), car }; }, [ro, nome === 'auto']);
    log(nome, JSON.stringify(info));
    // si assesta: i blocchi attorno si costruiscono, poi un giro di raccolta della memoria
    for (let k = 0, quiet = 0, tb = Date.now(); Date.now() - tb < 90000 && quiet < 2; k++) { await pg.waitForTimeout(1000); quiet = (await pg.evaluate(() => !(window.__pv.R.ISO && window.__pv.R.ISO.job))) ? quiet + 1 : 0; }
    await pg.waitForTimeout(3000); await pg.evaluate(() => window.gc && window.gc());
    // il profilo del processore lungo tutto il giro; l'orologio del profilo si allinea con una marca (40 ms di lavoro in una funzione col suo nome)
    await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 250 }); await cdp.send('Profiler.start');
    const marca = await pg.evaluate(() => { const t = performance.now(); (function __marca_scatti() { let x = 0; while (performance.now() - t < 40) x += Math.sqrt(x + 1); return x; })(); return t; });
    await pg.evaluate(() => { const B = window.__sc; B.rec = []; B.cur = null; B.timers = {}; B.on = true; window.__rotta.on = true; });
    for (let tb = Date.now(), lt = 0; ;) { await pg.waitForTimeout(2000); const n = await pg.evaluate(() => window.__sc.rec.length);
      if (n >= NF) break; if (Date.now() - lt > 30000) { lt = Date.now(); log(nome, 'fotogrammi', n); } if (Date.now() - tb > 1800000) throw new Error('troppo lento'); }
    await pg.evaluate(() => { window.__sc.on = false; window.__rotta.on = false; });
    const { profile } = await cdp.send('Profiler.stop');
    const rec = await pg.evaluate(() => window.__sc.rec.map(f => ({ i: f.i, t0: f.t0, dt: +f.dt.toFixed(1), step: +f.step.toFixed(1), frame: +f.frame.toFixed(1), render: +f.render.toFixed(1), timer: +f.timer.toFixed(1), gl: +f.gl.toFixed(1), lavoro: +(f.step + f.frame + f.timer - f.gl).toFixed(1), tchi: f.tchi, tmax: f.tmax && +f.tmax.toFixed(1), progs: f.progs - f.progs0, gc: f.h1 && f.h0 && f.h1 < f.h0 ? Math.round((f.h0 - f.h1) / 1048576) : 0, heap: Math.round((f.h1 || 0) / 1048576), x: Math.round(f.x), y: Math.round(f.y), calls: f.calls })));
    const timers = await pg.evaluate(() => Object.entries(window.__sc.timers).sort((a, b) => b[1].max - a[1].max).slice(0, 12).map(([k, v]) => ({ chi: k, n: v.n, ms: +v.ms.toFixed(0), max: +v.max.toFixed(1) })));
    const rotta = await pg.evaluate(() => ({ i: window.__rotta.i, salti: window.__rotta.salti }));
    // il profilo: i campioni nei fotogrammi lunghi, per funzione (tempo proprio)
    const byId = new Map(profile.nodes.map(n => [n.id, n])); let tUs = profile.startTime; const samp = [];
    profile.samples.forEach((id, k) => { tUs += profile.timeDeltas[k] || 0; samp.push([tUs, id]); });
    const mk = samp.find(([, id]) => byId.get(id).callFrame.functionName === '__marca_scatti');
    const off = mk ? mk[0] / 1000 - marca : null;   // ms del profilo − performance.now()
    const nomeDi = id => { const cf = byId.get(id).callFrame; return `${cf.functionName || '(anon)'} @${(cf.url || '').split('/').pop()}:${cf.lineNumber + 1}`; };
    const lunghi = rec.slice().sort((a, b) => b.lavoro - a.lavoro).slice(0, Math.ceil(rec.length / 10)).sort((a, b) => a.t0 - b.t0);   // il 10% di lavoro più lungo
    const perFot = (f) => { if (off === null) return null; const a = f.t0 + off, z = f.t0 + f.dt + off, m = {}; let n = 0; for (const [t, id] of samp) { const ms = t / 1000; if (ms < a) continue; if (ms > z) break; const k = nomeDi(id); m[k] = (m[k] || 0) + 1; n++; } return Object.entries(m).sort((x, y) => y[1] - x[1]).slice(0, 6).map(([k, v]) => `${(v / n * 100).toFixed(0)}% ${k}`); };
    lunghi.forEach(f => { f.prof = perFot(f); });
    // in tutto il giro, solo i fotogrammi lunghi: chi pesa di più
    const tutto = {}; let ntot = 0; if (off !== null) { let j = 0; const L = lunghi.map(f => [f.t0 + off, f.t0 + f.dt + off]); for (const [t, id] of samp) { const ms = t / 1000; while (j < L.length && L[j][1] < ms) j++; if (j >= L.length) break; if (ms >= L[j][0]) { const k = nomeDi(id); tutto[k] = (tutto[k] || 0) + 1; ntot++; } } }
    const dts = rec.map(f => f.dt).sort((a, b) => a - b), q = p => dts[Math.min(dts.length - 1, Math.floor(dts.length * p))];
    const G = { info, rotta, n: rec.length, mediana_ms: q(.5), p95_ms: q(.95), p99_ms: q(.99), max_ms: dts[dts.length - 1], sopra33: rec.filter(f => f.dt > 33).length, sopra50: rec.filter(f => f.dt > 50).length, sopra100: rec.filter(f => f.dt > 100).length,
      con_shader_nuovi: rec.filter(f => f.progs > 0).length, shader_nuovi: rec.reduce((s, f) => s + Math.max(0, f.progs), 0), gc_fotogrammi: rec.filter(f => f.gc > 0).length,
      timers, picchi_funzioni: Object.entries(tutto).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => `${(v / ntot * 100).toFixed(1)}% ${k}`),
      peggiori: rec.slice().sort((a, b) => b.lavoro - a.lavoro).slice(0, 25), rec };
    OUTJ.giri[nome] = G;
    log(`== ${nome}: ${G.n} fotogrammi, mediana ${G.mediana_ms} ms, p95 ${G.p95_ms}, p99 ${G.p99_ms}, max ${G.max_ms}; >33 ms: ${G.sopra33}, >50 ms: ${G.sopra50}, >100: ${G.sopra100}; shader nuovi ${G.shader_nuovi} in ${G.con_shader_nuovi} fotogrammi; raccolte ${G.gc_fotogrammi}; rotta ${JSON.stringify(rotta)}`);
    console.log('  timer più lunghi:'); timers.slice(0, 8).forEach(t => console.log(`    max ${t.max} ms, ${t.n}× (${t.ms} ms)  ${t.chi}`));
    console.log('  funzioni nel 10% dei fotogrammi di lavoro più lungo:'); G.picchi_funzioni.slice(0, 18).forEach(s => console.log('    ' + s));
    console.log('  i 12 peggiori:'); G.peggiori.slice(0, 12).forEach(f => console.log(`    #${f.i} ${f.dt} ms (lavoro ${f.lavoro}, WebGL ${f.gl}): logica ${f.step} grafica ${f.frame} (render ${f.render}) timer ${f.timer}${f.tchi ? ' [' + f.tchi + ' ' + f.tmax + ']' : ''} shader+${f.progs} gc ${f.gc} MB @${f.x},${f.y}\n        ${(f.prof || []).join(' | ')}`));
  }
  const slim = JSON.parse(JSON.stringify(OUTJ)); for (const k in slim.giri) delete slim.giri[k].rec;
  fs.writeFileSync(path.join(OUT, 'scatti.json'), JSON.stringify(OUTJ));
  fs.writeFileSync(path.join(OUT, 'scatti_sintesi.json'), JSON.stringify(slim, null, 1));
  log('fatto', OUT);
  await b.close(); srv.close(); process.exit(0);
});
