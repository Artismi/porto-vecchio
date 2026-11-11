#!/usr/bin/env node
/* Porto Vecchio — banco/banco_pw.js
   Fa girare banco.html in Chromium (Playwright) con il rallentamento della CPU di DevTools (Emulation.setCPUThrottlingRate)
   sulla pagina E sul Worker, e (con --trace) registra le pause GC vere di ogni filo dal tracciato di V8.
     node banco_pw.js --rate 4 --min 10                      1000 NPC, 4× più lento, 10 minuti
     node banco_pw.js --rate 1 --min 2 --n 2000 --district 600
     node banco_pw.js --rate 4 --min 1 --sim off             solo il disegno (per il confronto)
     node banco_pw.js --rate 4 --min 1 --ricarica            in fondo: salva, ricarica la pagina, ripristina, confronta
   Opzioni: --rate --min --n --near --far --district --hz --base --render (dots|three|none) --sim (worker|main|off)
            --salva (s) --trace --out file.json --headed
   Il rallentamento di DevTools è un'APPROSSIMAZIONE di un telefono: rallenta la CPU, non simula le cache, il termico
   o la GPU di un telefono vero. Serve per l'ordine di grandezza; i numeri veri vengono dal telefono. */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), net = require('net');
let PW; try { PW = require('playwright'); } catch (e) { PW = require(path.join(require('child_process').execSync('npm root -g').toString().trim(), 'playwright')); }   // installato globale
const { chromium } = PW;

const argv = process.argv.slice(2), opt = {};
for (let i = 0; i < argv.length; i++) { const a = argv[i]; if (a.startsWith('--')) { const k = a.slice(2), v = argv[i + 1]; if (v == null || v.startsWith('--')) opt[k] = true; else { opt[k] = v; i++; } } }
const RATE = +(opt.rate || 1), MIN = +(opt.min || 2);
const ROOT = path.resolve(__dirname, '..', '..');   // la radice del deposito, come su Vercel: /v7/banco/banco.html

// ----------------------------------------------------------------- server statico minimo
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css' };
function server() {
  return new Promise(ok => {
    const s = http.createServer((q, r) => {
      const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(ROOT, u);
      if (!f.startsWith(ROOT)) { r.writeHead(403); r.end(); return; }
      fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); r.end(b); });
    });
    s.listen(0, '127.0.0.1', () => ok(s));
  });
}
const portaLibera = () => new Promise(ok => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok(p)); }); });

// ----------------------------------------------------------------- CDP grezzo (sessioni piatte: pagina e Worker)
function cdp(wsUrl) {
  const ws = new WebSocket(wsUrl); let id = 0; const att = new Map(), ascolta = [];
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id != null) { const h = att.get(m.id); if (h) { att.delete(m.id); m.error ? h.ko(m.error) : h.ok(m.result); } return; }
    for (const f of ascolta) f(m);
  };
  const send = (method, params, sessionId) => new Promise((ok, ko) => { const i = ++id; att.set(i, { ok, ko }); ws.send(JSON.stringify({ id: i, method, params: params || {}, sessionId })); });
  return new Promise(ok => { ws.onopen = () => ok({ send, on: f => ascolta.push(f), close: () => ws.close() }); });
}

(async () => {
  const srv = await server(), port = srv.address().port, dbg = await portaLibera();
  const browser = await chromium.launch({ headless: !opt.headed, args: ['--remote-debugging-port=' + dbg, '--enable-precise-memory-info', '--js-flags=--expose-gc'] });
  const ver = await (await fetch(`http://127.0.0.1:${dbg}/json/version`)).json();
  const C = await cdp(ver.webSocketDebuggerUrl);
  const rallentati = [];
  C.on(async m => {
    if (m.method !== 'Target.attachedToTarget') return;
    const sid = m.params.sessionId, t = m.params.targetInfo;
    if (t.type === 'page' || t.type === 'worker') {
      try { await C.send('Emulation.setCPUThrottlingRate', { rate: RATE }, sid); rallentati.push(t.type + ' ok'); }
      catch (e) { rallentati.push(t.type + ' ERRORE ' + (e.message || JSON.stringify(e))); }
      try { await C.send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true }, sid); } catch (e) { }
      try { await C.send('Runtime.runIfWaitingForDebugger', {}, sid); } catch (e) { }
    }
  });
  await C.send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true });
  await C.send('Target.setDiscoverTargets', { discover: true });
  // tracciato GC (tutti i fili)
  let traccia = null;
  if (opt.trace) {
    traccia = [];
    C.on(m => { if (m.method === 'Tracing.dataCollected') for (const e of m.params.value) traccia.push(e); });
    await C.send('Tracing.start', { traceConfig: { includedCategories: ['v8', '__metadata', 'blink.user_timing'], excludedCategories: ['*'] }, transferMode: 'ReportEvents' });
  }
  const ctx = await browser.newContext({ viewport: { width: 900, height: 700 } });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('[pagina]', m.text()); });
  page.on('pageerror', e => console.log('[errore pagina]', e.message));
  const q = new URLSearchParams({ avvia: '1', min: String(MIN) });
  for (const k of ['n', 'near', 'far', 'district', 'hz', 'hzNear', 'hzFar', 'decideSec', 'base', 'render', 'sim', 'salva', 'prewarm', 'muto', 'snapHz']) if (opt[k] != null) q.set(k, opt[k]);
  const url = `http://127.0.0.1:${port}/v7/banco/banco.html?${q}`;
  console.log('URL', url, '· rallentamento', RATE + '×');
  // prima di aprire la pagina vera: la sessione della scheda deve esistere (setAutoAttach la prende all'apertura)
  await page.goto(url);
  const limite = Date.now() + (MIN * 60 + 240) * 1000 * Math.max(1, RATE / 2);
  let r = null, ultimo = 0;
  while (Date.now() < limite) {
    await new Promise(k => setTimeout(k, 5000));
    const b = await page.evaluate(() => window.__banco && { stato: window.__banco.stato, s: document.getElementById('stato').textContent });
    if (b && Date.now() - ultimo > 60000) { console.log('  …', b.s); ultimo = Date.now(); }
    if (b && b.stato === 'fine') { r = await page.evaluate(() => window.__banco.risultato); break; }
  }
  if (!r) { console.log('TEMPO SCADUTO'); }
  let ricarica = null;
  if (opt.ricarica && r) {
    await page.click('#bRicarica');
    await page.waitForURL(/ripristina=1/, { timeout: 60000 });
    const lim2 = Date.now() + (MIN * 60 + 120) * 1000 * Math.max(1, RATE / 2);
    while (Date.now() < lim2) { await new Promise(k => setTimeout(k, 3000)); const b = await page.evaluate(() => window.__banco && window.__banco.stato).catch(() => null); if (b === 'fine') break; }
    ricarica = await page.evaluate(() => window.__banco.risultato && window.__banco.risultato.ricarica);
  }
  // pause GC dal tracciato
  let gc = null;
  if (traccia) {
    await new Promise(async ok => { C.on(m => { if (m.method === 'Tracing.tracingComplete') ok(); }); await C.send('Tracing.end'); });
    const nomi = {};
    for (const e of traccia) if (e.ph === 'M' && e.name === 'thread_name') nomi[e.pid + ':' + e.tid] = e.args.name;
    // eventi di pausa: quelli "di primo livello" di V8 (MinorGC/MajorGC della timeline, o V8.GC_* complete)
    let m0 = -Infinity, m1 = Infinity, ms0 = Infinity; const lunghe = [];
    for (const e of traccia) { if (e.name === 'banco:misura') m0 = e.ts; if (e.name === 'banco:fine') m1 = e.ts; if (e.name === 'banco:sim') ms0 = e.ts; }
    const riduci = traccia.filter(e => e.name === 'V8.GCFinalizeMCReduceMemory');   // il "memory reducer" di V8: GC pieni quando la pagina sembra ferma
    const per = {};
    for (const e of traccia) {
      if (opt.tuttoGC == null && (e.ts < m0 || e.ts > m1)) continue;   // solo dentro la finestra di misura (base + simulazione), non avvio/salvataggio finale
      if (e.ph !== 'X' || !e.dur) continue;
      let tipo = e.name === 'MinorGC' || e.name === 'MajorGC' ? e.name : e.name === 'V8.GCIncrementalMarking' ? 'marcatura incrementale' : null;
      if (!tipo) continue;
      if (tipo === 'MajorGC' && riduci.some(r => r.pid === e.pid && r.tid === e.tid && r.ts >= e.ts && r.ts <= e.ts + e.dur)) tipo = 'MajorGC (riduci memoria)';
      const th = nomi[e.pid + ':' + e.tid] || ('tid ' + e.tid);
      const k = th + ' · ' + tipo + (e.ts < ms0 ? ' · base' : ' · con sim');
      if (e.dur > 2000) lunghe.push({ filo: th, tipo, ms: +(e.dur / 1000).toFixed(2), s: +((e.ts - ms0) / 1e6).toFixed(1) }); const p = per[k] || (per[k] = { n: 0, totMs: 0, maxMs: 0, sopra4: 0, durate: [] });
      const ms = e.dur / 1000; p.n++; p.totMs += ms; if (ms > p.maxMs) p.maxMs = ms; if (ms > 4) p.sopra4++; p.durate.push(ms);
    }
    for (const k in per) { const d = per[k].durate.sort((a, b) => a - b); per[k].p99 = +(d[Math.floor(d.length * .99)] || 0).toFixed(2); per[k].maxMs = +per[k].maxMs.toFixed(2); per[k].totMs = +per[k].totMs.toFixed(1); delete per[k].durate; }
    gc = per; gc._sopra2ms = lunghe;   // s = secondi dall'inizio della fase con simulazione (negativo = nella base)
  }
  const out = { rate: RATE, min: MIN, chromium: browser.version(), rallentati, risultato: r, ricarica, gc };
  if (opt.out) fs.writeFileSync(opt.out, JSON.stringify(out, null, 1));
  if (opt.dumpcat && traccia) { const c = {}; for (const e of traccia) if (/GC/.test(e.name)) c[e.cat + ' | ' + e.name + ' | ' + e.ph] = (c[e.cat + ' | ' + e.name + ' | ' + e.ph] || 0) + 1; console.log(c); }
  // riassunto
  if (r) {
    const s = r.simulazione, b = r.base, m = r.conSimulazione;
    console.log(`Chromium ${browser.version()} · rallentamento ${RATE}× (${rallentati.join(', ')}) · N=${r.parametri.n} · ${r.parametri.sim} · ${r.parametri.render}`);
    if (s) console.log(`  tick Worker: p50 ${s.tick.p50} p95 ${s.tick.p95} p99 ${s.tick.p99} max ${s.tick.max} ms (n=${s.tick.n}); ritardo p99 ${s.ritardo.p99} max ${s.ritardo.max}; fasi ${JSON.stringify(s.fasiMsPerTick)}`);
    if (r.tickSulFilo) console.log(`  tick sul filo principale: ${JSON.stringify(r.tickSulFilo)}`);
    if (b) console.log(`  base     frame dt p50 ${b.dt.p50} p95 ${b.dt.p95} p99 ${b.dt.p99} max ${b.dt.max}; lavoro p95 ${b.lavoro.p95} max ${b.lavoro.max}; >33ms ${b.sopra33ms}/${b.frame}; longtask ${b.longtask}`);
    if (m) console.log(`  con sim  frame dt p50 ${m.dt.p50} p95 ${m.dt.p95} p99 ${m.dt.p99} max ${m.dt.max}; lavoro p95 ${m.lavoro.p95} max ${m.lavoro.max}; >33ms ${m.sopra33ms}/${m.frame}; longtask ${m.longtask} (max ${m.longtaskMax}); cadute heap ${m.cadutaHeap}`);
    for (const v of r.salvataggi || []) console.log(`  salva slot ${v.slot}: ${(v.grezzo / 1048576).toFixed(2)} MB → ${(v.compresso / 1024).toFixed(0)} KB, serializza ${v.msSerializza} gzip ${v.msGzip} idb ${v.msIdb} tot ${v.msTotale} ms ${v.err || ''}`);
    if (r.verificaRipristino) console.log(`  ripristino: ${r.verificaRipristino.ok ? 'OK' : 'FALLITO'} (gunzip ${r.verificaRipristino.msGunzip}, ripristino ${r.verificaRipristino.msRipristina} ms)`);
    console.log(`  crossOriginIsolated ${r.ambiente.crossOriginIsolated} · SAB ${r.ambiente.sharedArrayBuffer} · persist ${r.ambiente.persist}`);
    if (s) console.log(`  memoria buffer ${(s.memoria.totale / 1048576).toFixed(2)} MB · fatti ${s.registro.totali} (vivi ${s.registro.vivi}) · interazioni ${s.conti.interazioni} · storie ${s.storieSetacciate}`);
  }
  if (ricarica) console.log(`  RICARICA: ${ricarica.ok ? 'OK' : 'FALLITA'} · ${ricarica.dettaglio}`);
  if (gc) console.log('  GC > 2 ms:', JSON.stringify(gc._sopra2ms));
  if (gc) for (const k in gc) if (k[0] !== '_') console.log(`  GC ${k}: n ${gc[k].n} tot ${gc[k].totMs} ms max ${gc[k].maxMs} ms p99 ${gc[k].p99} >4ms ${gc[k].sopra4}`);
  C.close(); await browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
