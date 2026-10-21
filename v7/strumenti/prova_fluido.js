// [fluido] Prova della fluidità nel gioco vero (v7/index.html) con Chromium senza testa (SwiftShader: si misurano i tempi
// del processore, non i fotogrammi al secondo, e le risposte in tempo di gioco, non in secondi veri).
//   node strumenti/prova_fluido.js misura   → spaccato del fotogramma nel borgo, sul Corso e sulla Vittoria (?cittanuova)
//   node strumenti/prova_fluido.js pad      → il controller finto (navigator.getGamepads): corsa, inversione, sguardo, cronaca
//   node strumenti/prova_fluido.js tutto    → le due cose
// PV_QUERY cambia l'indirizzo (predefinito ?cittanuova). Esce con codice 1 se una prova del controller non passa.
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || '/opt/node-tools/node_modules/playwright-core');
const MODE = process.argv[2] || 'tutto', root = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream' };
const PLACES = [['borgo', 1400, 312], ['corso', 1300, 330], ['vittoria', 1360, 334]];   // metri, come in test_citta_viva: Rua Maestra, Corso, marciapiede della Vittoria

// dentro la pagina: un controller finto e i contatori del fotogramma (logica, grafica, disegno, disegni, triangoli, memoria, DOM)
function initPage() {
  const pad = { id: 'finto', index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
  window.__pad = pad; window.__padOn = false;
  navigator.getGamepads = () => window.__padOn ? [pad, null, null, null] : [null, null, null, null];
  const F = window.__fr = { n: 0, rec: [], cur: null, dom: {}, domN: 0, on: false };
  const heap = () => (performance.memory ? performance.memory.usedJSHeapSize : 0);
  const mo = () => new MutationObserver(list => { for (const m of list) { let e = m.target.nodeType === 1 ? m.target : m.target.parentElement; while (e && !e.id) e = e.parentElement; const k = e ? e.id : '?'; if (F.cur) { F.cur.dom[k] = (F.cur.dom[k] || 0) + 1; } } })
    .observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'hidden'] });
  if (document.documentElement) mo(); else document.addEventListener('DOMContentLoaded', mo);
  const hook = () => {
    const pv = window.__pv; if (!pv || !pv.G || !pv.R || !pv.R.__models || !pv.R.__models.renderer) { setTimeout(hook, 200); return; }
    const G = pv.G, R = pv.R, rd = R.__models.renderer, s0 = G.step, f0 = R.frame, r0 = rd.render;
    G.step = function (st, dt, inp) {
      if (F.cur) { F.rec.push(F.cur); if (F.rec.length > 600) F.rec.shift(); }
      F.cur = { i: F.n++, dt, clock: st.clock, step: 0, frame: 0, render: 0, calls: 0, tris: 0, sceneCalls: 0, h0: heap(), dom: {}, inp: inp ? { x: inp.x, y: inp.y, mag: inp.mag } : null };
      const t = performance.now(); const r = s0.apply(this, arguments); F.cur.step = performance.now() - t;
      const p = st.player; F.cur.speed = p.speed; F.cur.face = p.face; return r;
    };
    R.frame = function (st, dt, ui) {
      const t = performance.now(); const r = f0.apply(this, arguments);
      if (F.cur) { F.cur.frame = performance.now() - t; F.cur.h1 = heap(); F.cur.progs = rd.info.programs ? rd.info.programs.length : 0; const c = R.cam; F.cur.lx = c.lx || 0; F.cur.ly = c.ly || 0; F.cur.camx = c.x; F.cur.camy = c.y; F.cur.px = st.player.x; F.cur.py = st.player.y; }
      return r;
    };
    rd.render = function (sc, cam) { const t = performance.now(); const r = r0.apply(this, arguments); if (F.cur) { F.cur.render += performance.now() - t; const ri = rd.info.render; F.cur.calls += ri.calls; F.cur.tris += ri.triangles; if (sc === R.__models.scene) F.cur.sceneCalls += ri.calls; } return r; };
    F.on = true;
  };
  hook();
}

const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const port = srv.address().port; let fail = 0; const T0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0)} s]`, ...a);
  const b = await chromium.launch({ executablePath: process.env.PW_CHROME || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info', '--js-flags=--expose-gc'] });
  const pg = await b.newPage({ viewport: { width: +(process.env.VW || 1280), height: +(process.env.VH || 800) } });   // VW/VH: più piccolo per misure più svelte (i tempi del processore e i disegni non cambiano)
  pg.on('pageerror', e => console.log('[errore]', e.message, (e.stack || '').split('\n').slice(0, 3).join(' | ')));
  await pg.addInitScript(initPage);
  const q = process.env.PV_QUERY !== undefined ? process.env.PV_QUERY : '?cittanuova';
  await pg.goto(`http://localhost:${port}/${process.env.PV_PAGE || "index.html"}${q}`);
  log('pagina', q);
  const tick = setInterval(async () => { try { log('attendo…', JSON.stringify(await pg.evaluate(() => ({ pv: !!window.__pv, st: !!(window.__pv && window.__pv.st), fr: !!(window.__fr && window.__fr.on), n: window.__fr && window.__fr.n, intro: window.__pv && window.__pv.ui && window.__pv.ui.intro, go: (document.getElementById('go') || {}).textContent })))); } catch (e) { } }, 30000);
  await pg.waitForFunction(() => window.__pv && window.__pv.st && window.__fr && window.__fr.on, null, { timeout: 900000 });
  log('pronto'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(2500);
  await pg.waitForFunction(() => !window.__pv.ui.intro, null, { timeout: 120000 }).catch(() => log('ancora nella schermata iniziale'));
  clearInterval(tick); log('in gioco');
  await pg.evaluate(() => setInterval(() => { const u = window.__pv.ui; u.flash = 0; u.fade = 0; u.desat = false; }, 50));
  const go = (x, y) => pg.evaluate(([x, y]) => { const pv = window.__pv, st = pv.st, p = st.player; p.x = x; p.y = y; p.indoor = null; p.vehicle = null; st.t = Math.floor(st.t / 1440) * 1440 + 15 * 60; pv.ui.zoom = 1; if (pv.R.cam) { pv.R.cam.x = x; pv.R.cam.y = y; } }, [x, y]);
  const frames = (n) => pg.evaluate(n => new Promise(r => { const F = window.__fr, s = F.n; const w = () => F.n >= s + n ? r(F.rec.slice(-n)) : setTimeout(w, 30); w(); }), n);
  const med = a => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
  const out = {};

  if (MODE === 'misura' || MODE === 'tutto') {
    for (const [nome, x, y] of PLACES) {
      await go(x, y); await pg.waitForTimeout(+(process.env.ATTESA || 20000));   // i blocchi vicini si costruiscono
      await pg.evaluate(() => window.gc && window.gc());
      log(nome, 'misuro');
      const R = await frames(+(process.env.NF || 40));
      const sc = await pg.evaluate(() => { const S = window.__pv.R.__models.scene; let n = 0, auto = 0; const t0 = performance.now(); S.traverse(o => { n++; if (o.matrixAutoUpdate) auto++; }); const tTr = performance.now() - t0;
        const t1 = performance.now(); for (let i = 0; i < 5; i++) S.updateMatrixWorld(); const tUmw = (performance.now() - t1) / 5;
        const big = S.children.map(c => { let k = 0; c.traverse(() => k++); return [c.name || (c.userData && Object.keys(c.userData).slice(0, 2).join(',')) || c.type, k]; }).sort((a, b) => b[1] - a[1]).slice(0, 8);
        const kinds = {}; S.children.forEach(c => { let k = 0; c.traverse(() => k++); const key = (c.name || (c.userData && Object.keys(c.userData).filter(x => !/^__/.test(x)).slice(0, 2).join(',')) || '') + ':' + c.type; const K = kinds[key] || (kinds[key] = [0, 0]); K[0]++; K[1] += k; });
        const kTop = Object.entries(kinds).sort((a, b) => b[1][1] - a[1][1]).slice(0, 12);
        const bset = new Set(((window.__pv.R.__buildings) || []).map(B => B.grp).filter(Boolean)); let inB = 0; bset.forEach(g => g.traverse(() => inB++));
        return { oggetti: n, auto, figli: S.children.length, giro_ms: +tTr.toFixed(2), matrici_ms: +tUmw.toFixed(2), grossi: big, tipi: kTop, negli_edifici: inB, edifici: bset.size }; });
      const alloc = R.map(f => Math.max(0, (f.h1 || 0) - (f.h0 || 0)) / 1024);
      const domW = {}; R.forEach(f => { for (const k in f.dom) domW[k] = (domW[k] || 0) + f.dom[k]; });
      const js = R.map(f => f.step + f.frame).sort((a, b) => a - b);
      // da dove vengono i disegni: le mesh visibili nell'inquadratura per ramo (una chiamata per materiale), più chi fa ombra
      const dc = await pg.evaluate(() => { const R = window.__pv.R, S = R.__models.scene, cam = R.getCamera(), fr = new THREE.Frustum(), M = new THREE.Matrix4();
        cam.updateMatrixWorld(); M.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); fr.setFromProjectionMatrix(M);
        const cnt = {}, sh = {}; let tot = 0, tsh = 0;
        const key = o => { let q = o; while (q.parent && q.parent !== S) q = q.parent; return (q.name || (q.userData && Object.keys(q.userData).filter(x => !/^__/.test(x)).slice(0, 2).join(',')) || '') + ':' + q.type; };
        S.traverseVisible(o => { if (!(o.isMesh || o.isSprite || o.isLine || o.isPoints) || !o.layers.test(cam.layers)) return; const nm = Array.isArray(o.material) ? (o.geometry && o.geometry.groups.length || o.material.length) : 1;
          if (o.castShadow && o.isMesh) { const k = key(o); sh[k] = (sh[k] || 0) + nm; tsh += nm; }
          if (o.frustumCulled && !fr.intersectsObject(o)) return; const k = key(o); cnt[k] = (cnt[k] || 0) + nm; tot += nm; });
        const top = m => Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 10);
        return { in_vista: tot, rami: top(cnt), fanno_ombra: tsh, ombra_rami: top(sh), congelati: R.__frz ? R.__frz.list.filter(o => o.__frz && o.__frz.frozen).length : 0, in_prova: R.__frz ? R.__frz.list.length : 0 }; });
      out[nome] = { disegni_dettaglio: dc, js_p50_ms: +js[Math.floor(js.length / 2)].toFixed(1), js_p95_ms: +js[Math.floor(js.length * .95)].toFixed(1), js_max_ms: +js[js.length - 1].toFixed(1), logica_ms: +med(R.map(f => f.step)).toFixed(2), grafica_ms: +med(R.map(f => f.frame)).toFixed(1), di_cui_render_ms: +med(R.map(f => f.render)).toFixed(1), resto_grafica_ms: +med(R.map(f => f.frame - f.render)).toFixed(1),
        disegni: med(R.map(f => f.calls)), disegni_scena: med(R.map(f => f.sceneCalls)), triangoli_k: Math.round(med(R.map(f => f.tris)) / 1000), programmi: R[R.length - 1].progs,
        scena: sc, alloc_kb_fot: +med(alloc).toFixed(0), dom_scritture_fot: +(Object.values(domW).reduce((a, b) => a + b, 0) / R.length).toFixed(1),
        dom_per_nodo: Object.fromEntries(Object.entries(domW).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => [k, +(v / R.length).toFixed(2)])) };
      console.log(nome, JSON.stringify(out[nome]));
      if (process.env.SHOTS) { fs.mkdirSync(process.env.SHOTS, { recursive: true }); await pg.screenshot({ path: path.join(process.env.SHOTS, nome + '.png'), timeout: 300000 }); log('foto', nome, JSON.stringify(await pg.evaluate(() => { const p = window.__pv.st.player, c = window.__pv.R.cam; return { px: p.x, py: p.y, cx: c.x, cy: c.y, indoor: !!p.indoor, lv: p.lv && p.lv.k }; }))); }
    }
  }

  if (MODE === 'profilo') {   // le funzioni più pesanti (tempo proprio) in ogni posto, dal profilo del processore
    const cdp = await pg.context().newCDPSession(pg); await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
    for (const [nome, x, y] of PLACES) {
      await go(x, y); await pg.waitForTimeout(+(process.env.ATTESA || 20000));
      await cdp.send('HeapProfiler.enable'); await cdp.send('HeapProfiler.startSampling', { samplingInterval: 8192, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true });
      await cdp.send('Profiler.start'); const RF = await frames(+(process.env.NF || 30)); const { profile } = await cdp.send('Profiler.stop');
      const hp = (await cdp.send('HeapProfiler.stopSampling')).profile, am = {}; let atot = 0;
      (function walk(n) { const cf = n.callFrame, k = (cf.functionName || '(anon)') + ' @' + (cf.url || '').split('/').pop() + ':' + (cf.lineNumber + 1); am[k] = (am[k] || 0) + n.selfSize; atot += n.selfSize; (n.children || []).forEach(walk); })(hp.head);
      console.log('== ' + nome + ' memoria: ' + (atot / 1024 / RF.length).toFixed(0) + ' kB per fotogramma'); Object.entries(am).sort((a, b) => b[1] - a[1]).slice(0, 20).forEach(([k, v]) => console.log((v / 1024 / RF.length).toFixed(1).padStart(8) + ' kB  ' + k));
      const self = {}, byId = new Map(profile.nodes.map(n => [n.id, n])), dts = profile.timeDeltas; let tot = 0;
      profile.samples.forEach((id, i) => { const n = byId.get(id), cf = n.callFrame, k = `${cf.functionName || '(anon)'} @${(cf.url || '').split('/').pop()}:${cf.lineNumber + 1}`; const d = (dts[i] || 0) / 1000; self[k] = (self[k] || 0) + d; tot += d; });
      const top = Object.entries(self).sort((a, b) => b[1] - a[1]).slice(0, +(process.env.TOP || 30));
      console.log(`== ${nome} (${tot.toFixed(0)} ms campionati)`); top.forEach(([k, v]) => console.log(`${(v / tot * 100).toFixed(1).padStart(5)}%  ${k}`));
    }
  }

  if (MODE === 'pad' || MODE === 'tutto') {
    const P = PLACES[2]; if (!process.env.PAD_STAY) await go(P[1], P[2]); await pg.waitForTimeout(4000);   // PAD_STAY=1: dove si comincia (per la mappa di prima)
    out.posto = await pg.evaluate(() => { const p = window.__pv.st.player; return { x: Math.round(p.x), y: Math.round(p.y), mare: !!p.swim }; });
    const setPad = (ax, ay) => pg.evaluate(([ax, ay]) => { window.__padOn = true; const p = window.__pad; p.axes[0] = ax; p.axes[1] = ay; p.timestamp++; }, [ax, ay]);
    const ang = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
    // stick world direction: as the game itself converts it (same camera basis)
    const wdir = (ax, ay) => pg.evaluate(([ax, ay]) => { const B = window.__pv.R.camBasis(); return Math.atan2(B.rz * ax - B.fz * ay, B.rx * ax - B.fx * ay); }, [ax, ay]);
    // 1) stick all the way forward: run speed (game time)
    await setPad(0, -1); let R = await frames(30);
    const vmax = Math.max(...R.slice(-10).map(f => f.speed || 0));
    const runOk = vmax >= 6.0; out.corsa = { velocita: +vmax.toFixed(2), ok: runOk }; if (!runOk) fail++;
    // half stick: walking, not running
    await setPad(0, -.5); R = await frames(12); const vhalf = R[R.length - 1].speed; out.mezza = { velocita: +(vhalf || 0).toFixed(2), ok: vhalf > 1 && vhalf < 5.5 }; if (!out.mezza.ok) fail++;
    // 2) reversal: the facing turns within 0.15 s of game time; 3) the camera lead turns within 0.1 s
    await setPad(0, -1); await frames(25);
    const back = await wdir(0, 1); await setPad(0, 1); R = await frames(25);
    const i0 = R.findIndex(f => f.inp && f.inp.y !== undefined && Math.hypot(f.inp.x, f.inp.y) > .1 && ang(Math.atan2(f.inp.y, f.inp.x), back) < .3);
    const tFace = R.slice(i0).find(f => ang(f.face, back) < .35), tLead = R.slice(i0).find(f => Math.hypot(f.lx, f.ly) > .3 && ang(Math.atan2(f.ly, f.lx), back) < .5);
    const dtFace = tFace ? tFace.clock - R[i0].clock + R[i0].dt : 9, dtLead = tLead ? tLead.clock - R[i0].clock + R[i0].dt : 9;
    out.inversione = { volto_s: +dtFace.toFixed(3), ok: dtFace <= .15 }; if (!out.inversione.ok) fail++;
    out.sguardo = { s: +dtLead.toFixed(3), ok: dtLead <= .1 }; if (!out.sguardo.ok) fail++;
    // a 90° turn of the stick: the lead follows too
    const side = await wdir(1, 0); await setPad(1, 0); R = await frames(20);
    const j0 = R.findIndex(f => f.inp && Math.hypot(f.inp.x, f.inp.y) > .1 && ang(Math.atan2(f.inp.y, f.inp.x), side) < .3), tl2 = R.slice(Math.max(0, j0)).find(f => ang(Math.atan2(f.ly, f.lx), side) < .5);
    const dt2 = j0 >= 0 && tl2 ? tl2.clock - R[j0].clock + R[j0].dt : 9; out.sguardo_lato = { s: +dt2.toFixed(3), ok: dt2 <= .1 }; if (!out.sguardo_lato.ok) fail++;
    // the character stays put on screen: camera-player offset changes smoothly (no jitter) while walking straight
    await setPad(0, -1); R = await frames(30);
    const offs = R.slice(-20).map(f => [f.camx - f.px, f.camy - f.py]), jit = Math.max(...offs.slice(1).map((o, i) => Math.hypot(o[0] - offs[i][0], o[1] - offs[i][1])));
    out.tremolio = { salto_max_m: +jit.toFixed(3), ok: jit < .08 }; if (!out.tremolio.ok) fail++;
    await setPad(0, 0); await frames(10);
    // 4) the event log: no rewrite while nothing happens; one new line = one insertion, the old lines untouched
    R = await frames(30);
    const feedW = R.reduce((a, f) => a + (f.dom.feed || 0), 0);
    out.cronaca_ferma = { scritture: feedW, ok: feedW === 0 }; if (feedW !== 0) fail++;
    await pg.evaluate(() => window.__pv.toast('Prova della cronaca.'));
    R = await frames(20); const feedW2 = R.reduce((a, f) => a + (f.dom.feed || 0), 0);
    out.cronaca_nuova = { scritture: feedW2, ok: feedW2 >= 1 && feedW2 <= 3 }; if (!out.cronaca_nuova.ok) fail++;
    // the keyboard still walks and runs (shift)
    await pg.evaluate(() => { window.__padOn = false; });
    await pg.keyboard.down('w'); R = await frames(10); const vk = R[R.length - 1].speed; await pg.keyboard.down('Shift'); R = await frames(10); const vks = R[R.length - 1].speed; await pg.keyboard.up('Shift'); await pg.keyboard.up('w');
    out.tastiera = { passo: +(vk || 0).toFixed(2), corsa: +(vks || 0).toFixed(2), ok: vk > 3 && vk < 5 && vks > 6 }; if (!out.tastiera.ok) fail++;
    console.log('pad', JSON.stringify(out, ['posto', 'x', 'y', 'mare', 'corsa', 'mezza', 'inversione', 'sguardo', 'sguardo_lato', 'tremolio', 'cronaca_ferma', 'cronaca_nuova', 'tastiera', 'velocita', 'ok', 'volto_s', 's', 'salto_max_m', 'scritture', 'passo']));
  }
  if (process.env.OUT) fs.writeFileSync(process.env.OUT, JSON.stringify(out, null, 1));
  await b.close(); srv.close(); process.exit(fail ? 1 : 0);
});
