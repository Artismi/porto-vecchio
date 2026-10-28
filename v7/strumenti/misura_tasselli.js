// [tasselli] LA MISURA DEL PILOTA: carica il gioco (coi tasselli, il modo normale, o oggi con ?tasselli=0) col profilo del telefono (390×844, DPR 3, tocco, isMobile)
// o del computer (1280×720), Chromium senza testa con SwiftShader, seme fisso, disegni a vuoto (i tempi misurano il lavoro del gioco, non
// la rasterizzazione finta; i disegni si contano lo stesso), e misura:
//   - quando si gioca: __tl.gioco (main.js: i primi fotogrammi sotto i 100 ms) e, coi tasselli, quando l'anello vicino è in scena;
//   - la memoria da /proc: il processo della pagina (renderer) e quello della scheda video (gpu-process), RSS, ogni mezzo secondo: il picco
//     e il regime (la mediana degli ultimi 10 s); l'heap JS (dopo il garbage collector);
//   - i byte scaricati (tutti, i tasselli, quelli dell'anello vicino), i disegni e i triangoli per fotogramma.
//   - [tasselli3] con --giri=N: N spostamenti lunghi (il giocatore portato da un capo all'altro della città, ogni volta si aspetta che
//     l'impronta sia in scena), poi di nuovo al punto di partenza: la memoria al ritorno (stessa mediana) contro quella di partenza.
//     Se i tasselli lontani si scaricano davvero (geometrie, materiali, tessiture) la differenza resta piccola.
//   node strumenti/misura_tasselli.js <out.json> [--profilo=telefono|computer] [--query=?tasselli=0] [--regime=30] [--giri=10]
'use strict';
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium, devices } = require(process.env.PW || '/opt/node-tools/node_modules/playwright-core');
const root = path.resolve(__dirname, '..');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const OUT = process.argv.slice(2).find(a => !a.startsWith('--')) || '/tmp/misura_tasselli.json';
const PROF = arg('profilo', 'telefono'), Q = arg('query', ''), REGIME = +arg('regime', 30), SEME = 12345;
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.webp': 'image/webp' };
const T0 = Date.now(), RETE = [];
const log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0)} s]`, ...a);
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } RETE.push([Date.now() - T0, u, d.length]); res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const b = await chromium.launch({ executablePath: process.env.PW_CHROME || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info', '--js-flags=--expose-gc'] });
  // i processi di Chromium: il browser e i suoi figli (renderer, gpu-process), da /proc
  // il processo del browser: il figlio di questo Node (playwright lo lancia direttamente)
  const bpid = (() => { for (const d of fs.readdirSync('/proc')) { if (!/^\d+$/.test(d)) continue; try { const st = fs.readFileSync(`/proc/${d}/stat`, 'utf8'), pp = +st.slice(st.lastIndexOf(')') + 2).split(' ')[1];
    if (pp === process.pid && /chrom/.test(fs.readFileSync(`/proc/${d}/cmdline`, 'utf8'))) return +d; } catch (e) { } } return -1; })();
  const figli = () => { const out = []; for (const d of fs.readdirSync('/proc')) { if (!/^\d+$/.test(d)) continue; try { const st = fs.readFileSync(`/proc/${d}/stat`, 'utf8'), pp = +st.slice(st.lastIndexOf(')') + 2).split(' ')[1]; out.push([+d, pp]); } catch (e) { } } const set = new Set([bpid]); let ch = true; while (ch) { ch = false; for (const [p, pp] of out) if (!set.has(p) && set.has(pp)) { set.add(p); ch = true; } } return [...set]; };
  const rss = pid => { try { const m = /VmRSS:\s+(\d+) kB/.exec(fs.readFileSync(`/proc/${pid}/status`, 'utf8')); return m ? +m[1] / 1024 : 0; } catch (e) { return 0; } };
  const tipo = pid => { try { const c = fs.readFileSync(`/proc/${pid}/cmdline`, 'utf8'); const m = /--type=([a-z-]+)/.exec(c); return m ? m[1] : 'browser'; } catch (e) { return '?'; } };
  const MEM = []; let picco = { renderer: 0, gpu: 0, somma: 0 };
  const campiona = () => { const s = { t: Date.now() - T0, renderer: 0, gpu: 0 }; for (const p of figli()) { const k = tipo(p); if (k === 'renderer') s.renderer += rss(p); else if (k === 'gpu-process') s.gpu += rss(p); }
    s.renderer = Math.round(s.renderer); s.gpu = Math.round(s.gpu); MEM.push(s); if (s.renderer > picco.renderer) picco.renderer = s.renderer; if (s.gpu > picco.gpu) picco.gpu = s.gpu; if (s.renderer + s.gpu > picco.somma) picco.somma = s.renderer + s.gpu; };
  const iv = setInterval(campiona, 500);
  const ctx = PROF === 'telefono' ? await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3, userAgent: devices['iPhone 13'].userAgent })
    : await b.newContext({ viewport: { width: 1280, height: 720 } });
  const pg = await ctx.newPage(), errori = [];
  pg.on('pageerror', e => { if (errori.length < 30) errori.push((e.stack || e.message).slice(0, 400)); });
  await pg.addInitScript(() => { window.__pulita = true; window.__nodraw = true;
    const P = WebGL2RenderingContext.prototype; for (const k of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced', 'drawRangeElements']) { const f = P[k]; P[k] = function () { if (window.__nodraw) return; return f.apply(this, arguments); }; } });
  await pg.addInitScript(seme => { let a = seme >>> 0 || 1; Math.random = function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }, SEME);
  const cdp = await ctx.newCDPSession(pg);
  const nav = Date.now() - T0;
  await pg.goto(`http://localhost:${srv.address().port}/index.html${Q}`, { timeout: 0, waitUntil: 'commit' });
  const R = { profilo: PROF, query: Q, errori };
  // quando si gioca: __tl.gioco (e coi tasselli l'anello vicino)
  const tass = !/tasselli=0/.test(Q);   // i tasselli sono il modo normale: si aspetta l'anello vicino se ci sono
  await pg.waitForFunction(t => window.__tl && window.__tl.gioco && (!t || !window.Tasselli || !Tasselli.attivo() || (window.__tasselli && window.__tasselli.vicinoT)), tass, { timeout: 0, polling: 250 });
  const pronto = Date.now() - T0;
  R.tl = await pg.evaluate(() => window.__tl); R.tasselli = await pg.evaluate(() => window.__tasselli || null); R.rt = await pg.evaluate(() => window.__rt || null);
  R.giocabile_s = +((pronto - nav) / 1000).toFixed(1);
  R.giocabile_pagina_s = +(Math.max(R.tl.gioco, (R.tasselli && R.tasselli.vicinoT) || 0) / 1000).toFixed(1);
  log('giocabile', R.giocabile_s, 's', JSON.stringify(R.tl));
  const memPronto = MEM.length ? MEM[MEM.length - 1] : null;
  // il regime: si sta fermi REGIME secondi (i lavori finiscono), poi la mediana degli ultimi 10 s
  await pg.waitForTimeout(REGIME * 1000);
  await cdp.send('HeapProfiler.collectGarbage').catch(() => { });
  await pg.waitForTimeout(2000);
  const ult = MEM.filter(s => s.t > Date.now() - T0 - 10000), md = a => { const q = a.slice().sort((x, y) => x - y); return q[q.length >> 1] || 0; };
  R.memoria = { picco, al_giocabile: memPronto, regime: { renderer: md(ult.map(s => s.renderer)), gpu: md(ult.map(s => s.gpu)) } };
  R.memoria.regime.somma = R.memoria.regime.renderer + R.memoria.regime.gpu;
  R.heap = await pg.evaluate(() => ({ usato: Math.round(performance.memory.usedJSHeapSize / 1048576), totale: Math.round(performance.memory.totalJSHeapSize / 1048576) }));
  // i disegni: 20 fotogrammi (tutte le render() del fotogramma: ombre, scena, post)
  R.disegni = await pg.evaluate(() => new Promise(res => { const rd = window.__pv.R.__models.renderer, r0 = rd.render; let c = 0, t = 0; const A = [], T = [];
    rd.render = function () { const r = r0.apply(this, arguments); c += rd.info.render.calls; t += rd.info.render.triangles; return r; };
    let k = 0; const f = () => { if (k > 0) { A.push(c); T.push(t); } c = 0; t = 0; if (++k <= 20) requestAnimationFrame(f); else { rd.render = r0; const md = a => a.slice().sort((x, y) => x - y)[a.length >> 1];
      res({ per_fotogramma: md(A), triangoli_k: Math.round(md(T) / 1000), programmi: rd.info.programs.length, geometrie: rd.info.memory.geometries, tessiture: rd.info.memory.textures }); } }; requestAnimationFrame(f); }));
  R.scena = await pg.evaluate(() => { let n = 0; window.__pv.R.__models.scene.traverse(o => { if (o.isMesh) n++; }); return { mesh: n }; });
  R.tasselli_fine = await pg.evaluate(() => window.__tasselli || null);
  // [tasselli3] i giri: lontano e di nuovo qui
  const GIRI = +arg('giri', 0);
  if (GIRI > 0) {
    const POSTI = [{ x: 1278, y: 340 }, { x: 1560, y: 344 }, { x: 1372, y: 388 }, { x: 1520, y: 352 }, { x: 1424, y: 322 }];
    const vai = s => pg.evaluate(s => { const pv = window.__pv, st = pv.st, p = st.player, R = pv.R, ui = pv.ui; p.vehicle = null; p.indoor = null; p.lv = null; p.x = s.x; p.y = s.y; p.path = []; if (p.vx !== undefined) { p.vx = 0; p.vy = 0; }
      ui.focus = { x: s.x, y: s.y }; R.cam.x = R.cam.tx = s.x; R.cam.y = R.cam.ty = s.y; R.cam.uy = 0; }, s);
    const fermo = async () => { await pg.waitForTimeout(1500); await pg.waitForFunction(() => { const t = window.__tasselli; return !t || !t.on || (t.inVolo === 0 && t.inApertura === 0 && t.pronti === 0); }, null, { timeout: 120000, polling: 250 }).catch(() => log('giro: non fermo in 120 s')); await pg.waitForTimeout(1500); };
    const misura = async () => { await cdp.send('HeapProfiler.collectGarbage').catch(() => { }); await pg.waitForTimeout(12000); const u = MEM.filter(s => s.t > Date.now() - T0 - 10000);
      const info = await pg.evaluate(() => { const rd = window.__pv.R.__models.renderer, t = window.__tasselli || {}; return { geometrie: rd.info.memory.geometries, tessiture: rd.info.memory.textures, programmi: rd.info.programs.length, heap: Math.round(performance.memory.usedJSHeapSize / 1048576), inScena: t.inScena, mesh: t.mesh, vertici: t.vertici, tessitureScaricate: t.tessitureScaricate, materialiInUso: t.materialiInUso, texLiberate: t.texLiberate, matLiberati: t.matLiberati, buttati: t.buttati, smontati: t.smontati }; });
      const r = { renderer: md(u.map(s => s.renderer)), gpu: md(u.map(s => s.gpu)) }; r.somma = r.renderer + r.gpu; return Object.assign(r, info); };
    const casa = await pg.evaluate(() => ({ x: window.__pv.st.player.x, y: window.__pv.st.player.y }));
    const prima = await misura(); log('giri: partenza', JSON.stringify(prima));
    const passi = [];
    for (let k = 0; k < GIRI; k++) { const s = POSTI[k % POSTI.length]; await vai(s); await fermo(); const c = MEM[MEM.length - 1]; passi.push({ k, x: s.x, y: s.y, renderer: c.renderer, gpu: c.gpu }); log('giro', k + 1, JSON.stringify(passi[k])); }
    await vai(casa); await fermo();
    const dopo = await misura(); log('giri: ritorno', JSON.stringify(dopo));
    R.giri = { n: GIRI, casa, prima, dopo, passi, scarto_MB: dopo.somma - prima.somma, scarto_pct: +((dopo.somma - prima.somma) / prima.somma * 100).toFixed(1) };
  }
  // la rete
  const tot = RETE.reduce((a, r) => a + r[2], 0), tf = RETE.filter(r => r[1].startsWith('/tasselli/')), vic = R.tasselli && R.tasselli.vicinoT ? tf.filter(r => r[0] <= pronto) : [];
  R.rete = { file: RETE.length, MB: +(tot / 1048576).toFixed(1), tasselli_file: tf.length, tasselli_MB: +(tf.reduce((a, r) => a + r[2], 0) / 1048576).toFixed(1), fino_al_giocabile_MB: +(RETE.filter(r => r[0] <= pronto).reduce((a, r) => a + r[2], 0) / 1048576).toFixed(1), anello_vicino_MB: +(vic.reduce((a, r) => a + r[2], 0) / 1048576).toFixed(1) };
  clearInterval(iv); R.memoria.campioni = MEM;
  fs.writeFileSync(OUT, JSON.stringify(R, null, 1));
  const S = Object.assign({}, R); delete S.memoria; console.log(JSON.stringify(Object.assign(S, { memoria: { picco: R.memoria.picco, regime: R.memoria.regime } })));
  await b.close(); srv.close(); process.exit(0);
});
