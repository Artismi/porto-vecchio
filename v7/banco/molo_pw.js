#!/usr/bin/env node
/* Porto Vecchio — banco/molo_pw.js: LA MATTINA SUL MOLO NEL GIOCO VERO (commedia/SISTEMA_UNICO.md §8, §9.3, §10 passo 7).
   Serve v7/ con un server http locale (non file://: i fetch dei kit falliscono), apre index.html[?commedia] in Chromium (Playwright),
   porta la partita alla mattina del secondo giorno (dalle 9 del primo, a passi di gioco veri: la notte passa e la Gazzetta delle 7
   ha i fatti del giorno prima), mette Nino a piedi sul Molo dei pescatori e lascia andare il gioco per qualche ora di gioco,
   col giocatore che va piano avanti e indietro fra molo, calata e banchina. Registra:
     - gli errori della pagina (pageerror e console.error; le chiamate /api/* non contano: qui non c'è il server delle IA);
     - i tempi dei fotogrammi (intervalli di requestAnimationFrame: p50/p95/p99/max) e il lavoro per fotogramma (Game.step + Render.frame);
     - i long task (PerformanceObserver), la memoria JS (performance.memory) all'inizio, alla fine e il massimo;
     - con ?commedia: le fasi del sistema unico (Unico.misure: p50/p95/p99/max), i fatti della memoria (quanti, di che tipo, quanti
       con un segno), i segni (bolle, pose, frecce, battute, Gazzetta), gli obiettivi scelti dalla Mente e i verbi fatti, quanti NPC
       con la Mente hanno fatto qualcosa entro 45 m dal giocatore.
   Il disegno: SwiftShader (niente GPU) costa secondi a fotogramma e il tempo di gioco si fermerebbe (dt ≤ 50 ms). Per le misure le
   chiamate di disegno WebGL (drawElements/drawArrays…) sono a vuoto: resta tutto il lavoro del processore (logica, scena di three.js,
   ombre, DOM, i nostri segni); per le foto (--foto) il disegno torna vero solo per gli scatti.
     node banco/molo_pw.js                          con ?commedia, 1×, 3 ore di gioco
     node banco/molo_pw.js --spento                 lo stesso senza il flag (il riferimento)
     node banco/molo_pw.js --rate 4                 CPU 4× più lenta (CDP Emulation.setCPUThrottlingRate): l'Iris Xe, all'incirca
     node banco/molo_pw.js --rate 6 --telefono      6× e lo schermo di un Pixel 7 (devices['Pixel 7']): un Android medio, all'incirca
     node banco/molo_pw.js --foto                   le foto in _immagini/commedia/molo_*.jpg (deviceScaleFactor 2)
   Con ?commedia l'indirizzo porta anche &molo (la scena dei venti, unico_molo.js; --senzamolo per toglierla).
   Opzioni: --ore H (ore di gioco misurate, 3) --max S (secondi veri al più, 900) --seme N (il caso della pagina, 3) --vw --vh
            --out file.json --query "&perf" (in più nell'indirizzo) --headed
   Il rallentamento di DevTools è un'APPROSSIMAZIONE: rallenta la CPU, non simula cache, calore e GPU di un telefono vero. */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
let PW; try { PW = require('playwright'); } catch (e) { PW = require(path.join(require('child_process').execSync('npm root -g').toString().trim(), 'playwright')); }
const { chromium, devices } = PW;

const argv = process.argv.slice(2), opt = {};
for (let i = 0; i < argv.length; i++) { const a = argv[i]; if (a.startsWith('--')) { const k = a.slice(2), v = argv[i + 1]; if (v == null || v.startsWith('--')) opt[k] = true; else { opt[k] = v; i++; } } }
const RATE = +(opt.rate || 1), ORE = +(opt.ore || 3), MAXS = +(opt.max || 900), SEME = +(opt.seme || 3), ON = !opt.spento, FOTO = !!opt.foto, TEL = !!opt.telefono;
const ROOT = path.resolve(__dirname, '..');   // v7/
const FOTOD = path.join(ROOT, '_immagini', 'commedia');
const T0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0)} s]`, ...a);

// ----------------------------------------------------------------- server statico (le /api/* rispondono «niente», senza errore)
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.gz': 'application/gzip', '.bin': 'application/octet-stream', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav' };
function server() {
  return new Promise(ok => {
    const s = http.createServer((q, r) => {
      let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html';
      if (u.startsWith('/api/')) { r.writeHead(200, { 'Content-Type': 'application/json' }); r.end('{"ok":false}'); return; }
      const f = path.join(ROOT, u); if (!f.startsWith(ROOT)) { r.writeHead(403); r.end(); return; }
      fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); r.end(b); });
    });
    s.listen(0, '127.0.0.1', () => ok(s));
  });
}

// ----------------------------------------------------------------- nella pagina, prima di tutto
function initPage(o) {
  // il caso della pagina a seme (la partita nasce sempre uguale: G.create prende il seme da Math.random)
  { let a = o.seme >>> 0 || 1; Math.random = function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  // il disegno a vuoto (window.__disegna = true lo rimette vero, per gli scatti)
  window.__disegna = false;
  for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) { if (!C) continue; const P = C.prototype;
    for (const k of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced', 'drawRangeElements']) { const f = P[k]; if (f) P[k] = function () { if (window.__disegna) return f.apply(this, arguments); }; } }
  const M = window.__molo = { on: false, raf: [], lav: [], step: [], frame: [], lt: [], heap0: 0, heapMax: 0, inp: null };
  let last = 0;
  const giro = t => { if (M.on) { if (last) M.raf.push(t - last); const h = performance.memory ? performance.memory.usedJSHeapSize : 0; if (h > M.heapMax) M.heapMax = h; } last = t; requestAnimationFrame(giro); };
  requestAnimationFrame(giro);
  try { new PerformanceObserver(l => { if (M.on) for (const e of l.getEntries()) M.lt.push(Math.round(e.duration)); }).observe({ entryTypes: ['longtask'] }); } catch (e) { }
  const aggancia = () => {
    const pv = window.__pv; if (!pv || !pv.G || !pv.R || !pv.R.frame || !pv.G.step || (/[?&]commedia\b/.test(location.search) && !(window.Unico && Unico.passo))) { setTimeout(aggancia, 200); return; }
    const G = pv.G, R = pv.R, s0 = G.step, f0 = R.frame; let cur = 0;
    G.step = function (st, dt, inp) { if (M.inp && inp && !inp.freeze) inp = M.inp(st, dt); if (!M.on) return s0.call(this, st, dt, inp); const t = performance.now(); try { return s0.call(this, st, dt, inp); } finally { cur = performance.now() - t; M.step.push(cur); } };
    for (const k in s0) if (Object.prototype.hasOwnProperty.call(s0, k)) G.step[k] = s0[k];
    R.frame = function () { if (!M.on) return f0.apply(this, arguments); const t = performance.now(); try { return f0.apply(this, arguments); } finally { const d = performance.now() - t; M.frame.push(d); M.lav.push(d + cur); cur = 0; } };
    M.pronto = true;
  };
  aggancia();
}

const pc = (a, p) => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const r2 = x => Math.round(x * 100) / 100;
const quattro = a => ({ n: a.length, p50: r2(pc(a, .5)), p95: r2(pc(a, .95)), p99: r2(pc(a, .99)), max: r2(pc(a, 1)) });

(async () => {
  const srv = await server(), port = srv.address().port;
  const browser = await chromium.launch({ headless: !opt.headed, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--autoplay-policy=no-user-gesture-required'] });
  const VW = +(opt.vw || 960), VH = +(opt.vh || 540);
  const ctxOpt = TEL ? Object.assign({}, devices['Pixel 7']) : { viewport: { width: VW, height: VH }, deviceScaleFactor: FOTO ? 2 : 1 };
  const ctx = await browser.newContext(ctxOpt);
  const page = await ctx.newPage();
  const errori = [];
  page.on('pageerror', e => { errori.push('pageerror: ' + e.message); log('[errore pagina]', e.message); });
  page.on('console', m => { if (m.type() !== 'error') return; const t = m.text(), u = (m.location() || {}).url || ''; if (/\/api\//.test(u) || /\/api\//.test(t)) return; if (/Failed to load resource/.test(t) && /404/.test(t)) { errori.push('404: ' + u); return; } errori.push('console: ' + t.slice(0, 300)); log('[console.error]', t.slice(0, 200)); });
  page.on('requestfailed', q => { if (!/\/api\//.test(q.url())) errori.push('richiesta fallita: ' + q.url()); });
  page.on('crash', () => { log('[pagina morta]'); process.exit(2); });
  await page.addInitScript(initPage, { seme: SEME });
  const cdp = await ctx.newCDPSession(page);
  const url = `http://127.0.0.1:${port}/index.html?${ON ? 'commedia' + (opt.senzamolo ? '' : '&molo') : ''}${opt.query || ''}`;   // &molo: i venti della mattina (unico_molo.js)
  log('apro', url, TEL ? '(Pixel 7)' : `${VW}×${VH}`, 'CPU', RATE + '×');
  await page.goto(url, { timeout: 900000 });
  await page.waitForFunction(() => window.__pv && window.__pv.st && window.__molo && window.__molo.pronto, null, { timeout: 900000, polling: 1000 });
  log('caricato');
  // dentro: «Premi per entrare»
  for (let k = 0; k < 6; k++) { const intro = await page.evaluate(() => !!window.__pv.ui.intro); if (!intro) break; await page.keyboard.press('Enter').catch(() => { }); if (TEL) await page.touchscreen.tap(200, 400).catch(() => { }); await page.waitForTimeout(2500); }
  const asp = await page.evaluate(() => ({ intro: !!window.__pv.ui.intro, t: window.__pv.st.t, npc: window.__pv.st.npcs.length, unico: !!(window.Unico && Unico.ON) }));
  log('in partita', JSON.stringify(asp));

  if (opt.alloc === 'tutto') { await cdp.send('HeapProfiler.enable'); await cdp.send('HeapProfiler.startSampling', { samplingInterval: 65536 }); }
  // ------------------------------------------------------------- la notte passa: a passi di gioco veri fino alle 6:30 del giorno dopo
  await page.evaluate(() => {
    const pv = window.__pv, st = pv.st; st.deadline = 1e12; window.__meteo = 'sereno';
    window.__guardia = () => { const u = pv.ui; u.flash = 0; u.fade = 0; u.desat = false; u.letterbox = false; u.dialog = null; u.book = window.__libro || false; u.menu = false; st.over = null; st.chase = false; const p = st.player; p.hp = 100; p.stun = 0; if (st.heat !== undefined) st.heat = 0; if (st.wanted !== undefined) st.wanted = 0; };
    setInterval(window.__guardia, 50);
  });
  const fino = 1440 + 6 * 60 + 30;
  const tff = Date.now();
  for (let giri = 0; giri < 400; giri++) {
    const t = await page.evaluate(fino => {
      const pv = window.__pv, st = pv.st, G = pv.G, p = st.player;
      for (let i = 0; i < 300 && st.t < fino; i++) { window.__guardia(); p.vehicle = null; G.step(st, .1, { x: 0, y: 0 }); }
      return st.t;
    }, fino);
    if (t >= fino) break;
    if (giri % 20 === 0) log('notte…', Math.floor(t / 60) % 24 + ':' + String(Math.floor(t % 60)).padStart(2, '0'));
  }
  log('mattina, in', ((Date.now() - tff) / 1000).toFixed(0), 's');
  // Nino a piedi sul molo, la camera con lui. A ogni finestra va (a piedi, fermo a guardare) nel posto del porto dove c'è più gente
  // con la Mente all'aperto, fra molo, calata, marina, scalo, pontile e caruggio: lì si guarda e si misura
  await page.evaluate((primo) => {
    const pv = window.__pv, st = pv.st, G = pv.G, M = window.__molo;
    window.__posti = ['molo', 'calata', 'marina', 'scalo', 'pontile', 'caruggio'].filter(k => G.PLACES[k]);
    window.__vai = (k) => { const p = st.player, P = G.PLACES[k]; p.vehicle = null; p.indoor = null; p.lv = null; p.path = []; p.x = P.x; p.y = P.y + 1.5; p.vx = p.vy = 0; if (pv.R.snap) pv.R.snap(st); return k; };
    window.__dove = () => { const MU = window.MenteUnica && MenteUnica.ON ? MenteUnica : null; let best = window.__posti[0], bn = -1;
      for (const k of window.__posti) { const P = G.PLACES[k]; let n = 0; for (const q of st.npcs) if (!q.dead && !q.inside && q.pop && Math.hypot(q.x - P.x, q.y - P.y) < 22 && (!MU || (st.u && st.u.menti && st.u.menti[q.id]))) n++; if (n > bn) { bn = n; best = k; } }
      return best; };
    window.__vai(primo);
    M.inp = () => ({ x: 0, y: 0 });   // fermo a guardare (i comandi della tastiera non contano)
  }, FOTO ? 'molo' : (opt.posto || 'marina'));
  await page.waitForTimeout(3000);

  // ------------------------------------------------------------- le foto (con ?commedia, disegno vero solo per lo scatto)
  const scatti = [];
  async function scatta(nome, prima) {
    if (prima) await page.evaluate(prima);
    await page.evaluate(() => { window.__disegna = true; });
    await page.evaluate(() => new Promise(ok => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(ok)))));
    const f = path.join(FOTOD, `molo_${nome}.jpg`);
    await page.screenshot({ path: f, type: 'jpeg', quality: 86, timeout: 300000 });
    const quadro = await page.evaluate(() => {
      const r = e => { if (!e || e.hidden) return null; const b = e.getBoundingClientRect(); return b.width ? [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)] : null; };
      const bolle = Array.from(document.querySelectorAll('#unico-segni .us-b:not([hidden])')).map(e => ({ r: r(e), t: e.textContent }));
      const fr = r(document.querySelector('#unico-segni .us-f')), mini = r(document.getElementById('mini'));
      const tags = Array.from(document.querySelectorAll('#bubbles .tag:not([hidden]), #bubbles .nm:not([hidden]), .nametag:not([hidden])')).map(r).filter(Boolean);
      // i difetti che si cercano: una bolla sopra un cartellino del nome, la freccia sopra la mappa, due bolle una sull'altra
      const tocca = (a, b) => a && b && a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
      const difetti = [];
      for (const b of bolle) for (const t of tags) if (tocca(b.r, t)) difetti.push('bolla «' + b.t + '» sul nome ' + JSON.stringify(t));
      if (tocca(fr, mini)) difetti.push('freccia sulla mappa');
      for (let i = 0; i < bolle.length; i++) for (let j = i + 1; j < bolle.length; j++) if (tocca(bolle[i].r, bolle[j].r)) difetti.push('bolle sovrapposte «' + bolle[i].t + '» «' + bolle[j].t + '»');
      const testi = Array.from(document.querySelectorAll('#unico-segni, #bubbles, #book .body')).map(e => e.textContent).join(' | ');
      const grammatica = (testi.match(/(^|[^A-Za-zÀ-ÿ'])a A[a-zà-ÿ]+|(^|[^A-Za-zÀ-ÿ'])e E[a-zà-ÿ]+/g) || []).slice(0, 10);
      return { bolle, freccia: fr, mini, tags, difetti, grammatica };
    });
    await page.evaluate(() => { window.__disegna = false; });
    scatti.push({ nome, f: path.relative(ROOT, f), quadro }); log('foto', nome, JSON.stringify(quadro).slice(0, 300));
  }

  // ------------------------------------------------------------- la misura
  // A finestre: ogni mezz'ora di gioco il gioco va da sé per FIN secondi veri (disegno, DOM, segni: si misura), poi la mezz'ora va
  // avanti a passi veri (Game.step con dt = 50 ms, il tetto di main.js: tutto il sistema gira com'è, senza fotogrammi). Così le ore
  // di gioco passano anche dove il fotogramma costa centinaia di ms (SwiftShader, la CPU rallentata), e le misure sono del gioco vivo
  if (RATE !== 1) { await cdp.send('Emulation.setCPUThrottlingRate', { rate: RATE }); log('CPU rallentata', RATE + '×'); }
  // il mondo si assesta attorno al molo (i tasselli, le ombre): due letture di fila senza lavori in corso, almeno 15 s
  for (let k = 0, quiet = 0, tb = Date.now(); Date.now() - tb < 90000 && (quiet < 2 || Date.now() - tb < (FOTO ? 15000 : 45000)); k++) { await page.waitForTimeout(1500); quiet = (await page.evaluate(() => !(window.__pv.R.ISO && window.__pv.R.ISO.job))) ? quiet + 1 : 0; }
  const prima = await page.evaluate(() => {
    const st = window.__pv.st, M = window.__molo; if (window.gc) window.gc();
    M.heap0 = performance.memory ? performance.memory.usedJSHeapSize : 0; M.heapMax = M.heap0;
    M.raf.length = 0; M.lav.length = 0; M.step.length = 0; M.frame.length = 0; M.lt.length = 0;
    const U = window.Unico && Unico.ON ? Unico : null, Fm = U && st.u && st.u.fatti ? st.u.fatti : null;
    // le fasi nostre, misurate solo nelle finestre (l'anello di Unico.misure prenderebbe anche i passi fra una finestra e l'altra)
    M.fasi = {}; if (U && U._ && U._.FASI) for (const F of U._.FASI) { if (F.__molo) continue; const f0 = F.fn, A = M.fasi[F.nome] = []; F.fn = function (st2, dt) { if (!M.on) return f0(st2, dt); const t = performance.now(); try { return f0(st2, dt); } finally { A.push(performance.now() - t); } }; F.__molo = true; }
    if (window.MenteUnica && MenteUnica.ON) MenteUnica.CFG.registro = true;
    return { t: st.t, clock: st.clock, fatti: Fm ? Fm.n : 0, scelte: window.MenteUnica && MenteUnica.ON ? JSON.parse(JSON.stringify(MenteUnica.stats.per)) : {}, verbi: window.MenteUnica && MenteUnica.ON ? JSON.parse(JSON.stringify(MenteUnica.stats.perVerbo)) : {},
      segni: window.Segni && Segni.ON ? JSON.parse(JSON.stringify(Segni.stats)) : null, log0: window.MenteUnica && MenteUnica.ON ? MenteUnica.log.length : 0 };
  });
  if (opt.alloc && opt.alloc !== 'tutto') { await cdp.send('HeapProfiler.enable'); await cdp.send('HeapProfiler.startSampling', { samplingInterval: 65536 }); }   // --alloc: chi tiene la memoria (i vivi a fine prova)
  const FIN = +(opt.finestra || 20), SEG = 30;
  log('misuro dalle', Math.floor(prima.t / 60) % 24 + ':' + String(Math.floor(prima.t % 60)).padStart(2, '0'), 'per', ORE, 'ore di gioco, finestre di', FIN, 's ogni', SEG, 'minuti');
  const tfine = prima.t + ORE * 60, tlim = Date.now() + MAXS * 1000;
  const FOTO_A = FOTO ? { 0: 'alba', 1: 'a', 2: 'b', 3: 'c', 4: 'd', 5: 'e', 6: 'f', 7: 'g', 8: 'h' } : {};
  let ffPassi = 0, ffMs = 0;
  for (let seg = 0; Date.now() < tlim; seg++) {
    // la finestra viva: nel posto con più gente, 3 s per assestarsi, poi si misura
    const posto = await page.evaluate(([seg, FOTO, fisso]) => FOTO ? window.__vai(seg % 3 === 0 ? 'molo' : window.__dove()) : fisso, [seg, FOTO, opt.posto || 'marina']);   // per le misure un posto fisso (niente tasselli e shader nuovi a ogni finestra)
    await page.waitForTimeout(3000);
    await page.evaluate(() => { window.__molo.on = true; });
    let scattata = false;
    if (FOTO_A[seg]) {   // la foto quando si vedono almeno due segni nostri (bolle o freccia), se no in fondo alla finestra
      for (let tb = Date.now(); Date.now() - tb < FIN * 1000 && !scattata;) {
        await page.waitForTimeout(1500);
        const nb = await page.evaluate(() => document.querySelectorAll('#unico-segni .us-b:not([hidden]), #unico-segni .us-f:not([hidden])').length);
        if (nb >= 2) { await page.evaluate(() => { window.__molo.on = false; window.__fermo = true; }); await scatta(String(seg + 1).padStart(2, '0') + '_' + posto); await page.evaluate(() => { window.__fermo = false; }); scattata = true; }
      }
    } else if (opt.prof && seg === 2) {   // --prof: il profilo della CPU nella terza finestra (dove va il tempo del fotogramma)
      await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 }); await cdp.send('Profiler.start');
      await page.waitForTimeout(FIN * 1000);
      const { profile } = await cdp.send('Profiler.stop'); const by = new Map(profile.nodes.map(n => [n.id, n])), cnt = {}; profile.samples.forEach(id => cnt[id] = (cnt[id] || 0) + 1);
      const self = {}; let tot = 0; for (const id in cnt) { const cf = by.get(+id).callFrame, k = `${cf.functionName || '(anon)'} @${(cf.url || '').split('/').pop().split('?')[0]}:${cf.lineNumber + 1}`; self[k] = (self[k] || 0) + cnt[id]; tot += cnt[id]; }
      console.log('PROFILO (tempo proprio)'); for (const [k, v] of Object.entries(self).sort((a, b) => b[1] - a[1]).slice(0, 25)) console.log(`  ${(v / tot * 100).toFixed(1)}% ${k}`);
    } else await page.waitForTimeout(FIN * 1000);
    await page.evaluate(() => { window.__molo.on = false; });
    if (FOTO_A[seg] && !scattata) { await page.evaluate(() => { window.__fermo = true; }); await scatta(String(seg + 1).padStart(2, '0') + '_' + posto); await page.evaluate(() => { window.__fermo = false; }); }
    const q = await page.evaluate(() => { const M = window.__molo; return { t: window.__pv.st.t, n: M.raf.length, heap: Math.round(performance.memory.usedJSHeapSize / 1048576) }; });
    log(`  finestra ${seg} (${posto}): ${Math.floor(q.t / 60) % 24}:${String(Math.floor(q.t % 60)).padStart(2, '0')}, fotogrammi ${q.n}, heap ${q.heap} MB`);
    if (q.t >= tfine) break;
    // la mezz'ora che resta, a passi veri
    const meta = Math.min(tfine, prima.t + (seg + 1) * SEG);
    for (let g = 0; g < 400; g++) {
      const r = await page.evaluate(meta => { const pv = window.__pv, st = pv.st, G = pv.G, t0 = performance.now(); let k = 0; for (; k < 200 && st.t < meta; k++) { window.__guardia(); G.step(st, .05, { x: 0, y: 0 }); } return { t: st.t, k, ms: performance.now() - t0 }; }, meta);
      ffPassi += r.k; ffMs += r.ms; if (r.t >= meta) break;
    }
  }
  const dopo = await page.evaluate(([prima]) => {
    const pv = window.__pv, st = pv.st, M = window.__molo; M.on = false;
    const out = { t: st.t, clock: st.clock, raf: M.raf, lav: M.lav, step: M.step, frame: M.frame, lt: M.lt, heap0: M.heap0, heapMax: M.heapMax, heap1: performance.memory ? performance.memory.usedJSHeapSize : 0 };
    const U = window.Unico && Unico.ON ? Unico : null; if (!U) return out;
    out.fasi = U.misure(); out.fasiFin = {}; for (const k in M.fasi) out.fasiFin[k] = M.fasi[k]; { const K = Object.keys(M.fasi), n = Math.min(...K.map(k => M.fasi[k].length)); const T = []; for (let i = 0; i < n; i++) { let x = 0; for (const k of K) x += M.fasi[k][i]; T.push(x); } out.fasiFin['unico (tutte)'] = T; } out.errUnico = U.errTot; out.ultimoErr = U.ultimo; out.rientri = U.rientri;
    const F = window.Fatto, Fm = st.u.fatti, n0 = prima.fatti, nuovi = []; for (let i = n0 + 1; i <= Fm.n; i++) { const f = F.di(st, i); if (f) nuovi.push(f); }
    const p = st.player, per = {}, perVis = {}, conSegno = {}, chi = new Set(), chiVicino = new Set();
    let vis = 0, visSegno = 0, dellaMente = 0;
    for (const f of nuovi) {
      per[f.v] = (per[f.v] || 0) + 1;
      const m = f.chi != null && st.u.menti[f.chi]; if (m && f.x && f.x.verbo) { dellaMente++; chi.add(f.chi); }
      const d = f.dove && typeof f.dove[0] === 'number' ? Math.hypot(f.dove[0] - p.x, f.dove[1] - p.y) : 1e9;
      if (m && f.x && f.x.verbo && f.vis >= 1) chiVicino.add(f.chi);
      if (f.vis >= 1) { vis++; perVis[f.v] = (perVis[f.v] || 0) + 1; if (f.segno && /[BPODF]/.test(f.segno)) visSegno++; }
      if (f.segno) for (const c of f.segno.split('+')) conSegno[c] = (conSegno[c] || 0) + 1;
    }
    const diff = (a, b) => { const o = {}; for (const k in a) { const v = (a[k] || 0) - ((b || {})[k] || 0); if (v) o[k] = v; } return o; };
    const MU = window.MenteUnica && MenteUnica.ON ? MenteUnica : null;
    out.fatti = { nuovi: nuovi.length, per, visti: vis, vistiConSegno: visSegno, perVisti: perVis, canali: conSegno, dellaMente, attoriMente: chi.size, attoriMenteVisti: chiVicino.size };
    if (MU) {
      out.scelte = diff(MU.stats.per, prima.scelte); out.verbi = diff(MU.stats.perVerbo, prima.verbi);
      out.mente = { scelte: MU.stats.scelte, piani: MU.stats.piani, riusciti: MU.stats.riusciti, falliti: MU.stats.falliti, sforati: MU.stats.sforati, passi: MU.stats.passi, menti: Object.keys(st.u.menti).length, classe: st.u.classe };
      // chi sta in scena col giocatore adesso: obiettivo e passo
      const sc = MU._.scena(); out.inScena = Array.from(sc).slice(0, 24).map(id => { const n = pv.G.byId(st, id), q = MU.perche(st, id); return n && q ? `${n.first || n.name} (${(n.pop && n.pop.job && (n.pop.job.title || n.pop.job.base)) || n.role || "—"}): ${q.ob || '—'}${q.passo ? ' → ' + q.passo : ''}` : null; }).filter(Boolean);
      out.logMolo = MU.log.slice(prima.log0).filter(x => { const n = pv.G.byId(st, x.id || x[1]); return n && Math.hypot(n.x - p.x, n.y - p.y) < 60; }).length;
    }
    if (window.Segni && Segni.ON) { out.segni = diff(Segni.stats, prima.segni); out.disegno = Segni.disegno ? Segni.disegno() : null; }
    out.gazzetta = st.u.cronaca && st.u.cronaca.edizioni[0] ? st.u.cronaca.edizioni[0].righe.map(r => r.testo) : [];
    return out;
  }, [prima]);
  if (opt.alloc) {
    await page.evaluate(() => window.gc && window.gc());
    const { profile: hp } = await cdp.send('HeapProfiler.stopSampling'); const m = {}; let tot = 0;
    const nomeF = cf => `${cf.functionName || '(anon)'} @${(cf.url || '').split('/').pop().split('?')[0]}:${cf.lineNumber + 1}`;
    const giu = (n, sopra) => { const k = nomeF(n.callFrame), q = sopra.concat(k).slice(-4); if (n.selfSize) { const kk = q.slice().reverse().join(' < '); m[kk] = (m[kk] || 0) + n.selfSize; tot += n.selfSize; } (n.children || []).forEach(c => giu(c, q)); };
    giu(hp.head, []);
    console.log('MEMORIA VIVA campionata MB', (tot / 1048576).toFixed(0)); for (const [k, v] of Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 30)) console.log(`  ${(v / 1048576).toFixed(1)} MB  ${k}`);
  }
  // la Gazzetta e il Taccuino (solo per le foto)
  if (FOTO) {
    await page.evaluate(() => { window.__fermo = true; });
    await scatta('gazzetta', () => { window.__libro = true; Segni.apriScheda('u_gazzetta'); });
    await scatta('taccuino', () => { Segni.apriScheda('u_cronaca'); });
    await scatta('conti', () => { Segni.apriScheda('u_sentito'); });
    await page.evaluate(() => { window.__libro = false; window.__pv.book(false); });
  }
  const ris = {
    flag: ON ? 'commedia' : 'spento', rate: RATE, telefono: TEL, viewport: TEL ? devices['Pixel 7'].viewport : { width: VW, height: VH }, chromium: browser.version(),
    oreGioco: r2((dopo.t - prima.t) / 60), secondiVeri: r2(dopo.clock - prima.clock),
    raf: quattro(dopo.raf), lavoro: quattro(dopo.lav), step: quattro(dopo.step), frame: quattro(dopo.frame),
    sopra33: dopo.raf.filter(x => x > 33.4).length, sopra50: dopo.raf.filter(x => x > 50).length,
    longtask: { n: dopo.lt.length, max: dopo.lt.length ? Math.max(...dopo.lt) : 0, sopra100: dopo.lt.filter(x => x > 100).length },
    heapMB: { inizio: r2(dopo.heap0 / 1048576), fine: r2(dopo.heap1 / 1048576), max: r2(dopo.heapMax / 1048576) },
    errori: Array.from(new Set(errori)).slice(0, 40), nErrori: errori.length,
    fasiFinestre: dopo.fasiFin ? Object.fromEntries(Object.entries(dopo.fasiFin).map(([k, a]) => [k, Object.assign(quattro(a), { p95: +pc(a, .95).toFixed(3), p50: +pc(a, .5).toFixed(3), p99: +pc(a, .99).toFixed(3) })])) : null,
    passiFF: ffPassi, msPassoFF: ffPassi ? r2(ffMs / ffPassi) : 0,
    fasi: dopo.fasi ? Object.fromEntries(Object.entries(dopo.fasi).map(([k, v]) => [k, { n: v.n, p50: +v.p50.toFixed(3), p95: +v.p95.toFixed(3), p99: +v.p99.toFixed(3), max: +v.max.toFixed(2), err: v.err }])) : null,
    errUnico: dopo.errUnico, ultimoErr: dopo.ultimoErr, rientri: dopo.rientri,
    disegnoSegni: dopo.disegno || null, fatti: dopo.fatti, scelte: dopo.scelte, verbi: dopo.verbi, mente: dopo.mente, segni: dopo.segni, inScena: dopo.inScena, gazzetta: dopo.gazzetta, scatti,
  };
  const out = opt.out || path.join(__dirname, `molo_${ON ? 'on' : 'off'}_${RATE}x${TEL ? '_tel' : ''}${FOTO ? '_foto' : ''}.json`);
  fs.writeFileSync(out, JSON.stringify(ris, null, 1));
  // riassunto
  const f = q => `p50 ${q.p50} p95 ${q.p95} p99 ${q.p99} max ${q.max} (n ${q.n})`;
  console.log(`\n== ${ris.flag} · CPU ${RATE}× · ${TEL ? 'Pixel 7' : VW + '×' + VH} · ${ris.oreGioco} ore di gioco in ${ris.secondiVeri} s`);
  console.log(`  rAF ms      ${f(ris.raf)} · >33 ms ${ris.sopra33} · >50 ms ${ris.sopra50}`);
  console.log(`  lavoro ms   ${f(ris.lavoro)}   (step ${f(ris.step)})`);
  console.log(`  long task   ${ris.longtask.n} (max ${ris.longtask.max} ms) · heap ${ris.heapMB.inizio} → ${ris.heapMB.fine} MB (max ${ris.heapMB.max}) · errori ${ris.nErrori}`);
  if (ris.fasiFinestre) for (const k in ris.fasiFinestre) { const q = ris.fasiFinestre[k], e = ris.fasi && ris.fasi[k]; console.log(`  ${k.padEnd(14)} p50 ${q.p50} p95 ${q.p95} p99 ${q.p99} max ${q.max} (n ${q.n}; tutti i passi: p95 ${e ? e.p95 : '-'}, err ${e ? e.err : '-'})`); }
  console.log(`  passi fra le finestre ${ris.passiFF}, ${ris.msPassoFF} ms a passo`);
  if (ris.fatti) console.log(`  fatti ${ris.fatti.nuovi} (della mente ${ris.fatti.dellaMente}, ${ris.fatti.attoriMente} attori; visti ${ris.fatti.visti}, con segno ${ris.fatti.vistiConSegno}) · tipi ${JSON.stringify(ris.fatti.per)}`);
  if (ris.scelte) console.log(`  obiettivi ${JSON.stringify(ris.scelte)}\n  verbi ${JSON.stringify(ris.verbi)}`);
  if (ris.segni) console.log(`  segni ${JSON.stringify(ris.segni)}`);
  if (ris.disegnoSegni) console.log(`  disegno dei segni (rAF) ms ${JSON.stringify(ris.disegnoSegni)}`);
  if (ris.errori.length) console.log('  ERRORI', ris.errori.slice(0, 10));
  log('scritto', out);
  await browser.close(); srv.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
