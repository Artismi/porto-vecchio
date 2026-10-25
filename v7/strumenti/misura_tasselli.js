// [tasselli] LA MISURA DEL PILOTA: carica il gioco (oggi, o con ?tasselli=1) col profilo del telefono (390×844, DPR 3, tocco, isMobile)
// o del computer (1280×720), Chromium senza testa con SwiftShader, seme fisso, disegni a vuoto (i tempi misurano il lavoro del gioco, non
// la rasterizzazione finta; i disegni si contano lo stesso), e misura:
//   - quando si gioca: __tl.gioco (main.js: i primi fotogrammi sotto i 100 ms) e, coi tasselli, quando l'anello vicino è in scena;
//   - la memoria da /proc: il processo della pagina (renderer) e quello della scheda video (gpu-process), RSS, ogni mezzo secondo: il picco
//     e il regime (la mediana degli ultimi 10 s); l'heap JS (dopo il garbage collector);
//   - i byte scaricati (tutti, i tasselli, quelli dell'anello vicino), i disegni e i triangoli per fotogramma.
//   node strumenti/misura_tasselli.js <out.json> [--profilo=telefono|computer] [--query=?tasselli=1] [--regime=30]
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
  const tass = /tasselli=1/.test(Q);
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
  // la rete
  const tot = RETE.reduce((a, r) => a + r[2], 0), tf = RETE.filter(r => r[1].startsWith('/tasselli/')), vic = R.tasselli && R.tasselli.vicinoT ? tf.filter(r => r[0] <= pronto) : [];
  R.rete = { file: RETE.length, MB: +(tot / 1048576).toFixed(1), tasselli_file: tf.length, tasselli_MB: +(tf.reduce((a, r) => a + r[2], 0) / 1048576).toFixed(1), fino_al_giocabile_MB: +(RETE.filter(r => r[0] <= pronto).reduce((a, r) => a + r[2], 0) / 1048576).toFixed(1), anello_vicino_MB: +(vic.reduce((a, r) => a + r[2], 0) / 1048576).toFixed(1) };
  clearInterval(iv); R.memoria.campioni = MEM;
  fs.writeFileSync(OUT, JSON.stringify(R, null, 1));
  const S = Object.assign({}, R); delete S.memoria; console.log(JSON.stringify(Object.assign(S, { memoria: { picco: R.memoria.picco, regime: R.memoria.regime } })));
  await b.close(); srv.close(); process.exit(0);
});
