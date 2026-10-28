// [cotto] LA PROVA NEL BROWSER del mondo cotto: un avvio della pagina (Chromium senza testa, SwiftShader, disegni a vuoto, Math.random
// col seme come src/seme.js) che fotografa
//   1. il mondo appena fatto (quando nasce TettiVissuti: World, Percorsi.dati, la rete dei tetti, i tetti vissuti) con la codifica di
//      cotto.js (oggetti, chiavi in ordine, numeri esatti, vettori byte per byte, funzioni col sorgente) e Math.random fin lì;
//   2. all'inizio della costruzione (init0) il mondo, e da lì Math.random riparte dal seme (prima lo consumano anche i caricamenti, quanto
//      dipende dai tempi); il rapporto di pulizia2 (window.__pulizia2), il mondo alla fine (init1), __rt, __tl, Cotto.STATO;
//   3. alla fine della costruzione (init1, ancora dentro R.init): la scena ferma (le mesh con la matrice identità: le case fuse
//      dell'anello vicino, le statiche, il terreno), mesh per mesh (vertici, byte delle posizioni e degli indici): il conto dei vertici,
//      la somma delle posizioni nel mondo, e una firma che non dipende dall'ordine (la somma delle firme delle mesh).
//      Dopo init1 i fotogrammi del menu (i lavori degli anelli, le persone) dipendono dai tempi: fra due giri uguali non coincidono.
// Due giri (col file cotto e con ?cuoci=0) si confrontano con --confronta. Con --senza-scena niente foto alla fine: si aspetta il menu
// che risponde (i tempi).
//   node strumenti/prova_cotto.js <uscita.json> [--query=cuoci=0] [--telefono] [--senza-scena]
//   node strumenti/prova_cotto.js --confronta a.json b.json
const path = require('path'), http = require('http'), fs = require('fs');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const has = k => process.argv.includes('--' + k);

if (has('confronta')) {
  const [a, b] = process.argv.slice(process.argv.indexOf('--confronta') + 1).map(f => JSON.parse(fs.readFileSync(f, 'utf8')));
  let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };
  const eq = (x, y) => JSON.stringify(x) === JSON.stringify(y);
  console.log(`     A: ${a.query || '(cotto)'} ${a.telefono ? 'telefono' : 'computer'} · B: ${b.query || '(cotto)'} ${b.telefono ? 'telefono' : 'computer'}`);
  ['W', 'P', 'TT', 'TV', 'bin'].forEach(k => ok(a.mondo && b.mondo && a.mondo[k] === b.mondo[k], `il mondo appena fatto, ${k}: ${a.mondo && a.mondo[k]} / ${b.mondo && b.mondo[k]}`));
  ok(a.mondo && b.mondo && a.mondo.caso === b.mondo.caso, `Math.random fino ai tetti vissuti: ${a.mondo && a.mondo.caso} / ${b.mondo && b.mondo.caso}`);
  const sc = x => Object.assign({}, x, { init0: undefined }); ok(eq(sc(a.casoA), sc(b.casoA)), `il mondo all'inizio della costruzione (init0; da lì Math.random riparte dal seme: prima lo consumano i caricamenti, quanto dipende dai tempi) e Math.random a pulizia2 e alla fine: ${JSON.stringify(a.casoA)} / ${JSON.stringify(b.casoA)}`);
  ok(eq(a.pulizia2, b.pulizia2), `il rapporto di pulizia2: ${a.pulizia2 && a.pulizia2.firma} / ${b.pulizia2 && b.pulizia2.firma} (${a.pulizia2 && a.pulizia2.riassunto})`);
  ok(a.fine && b.fine && eq(a.fine.mondo, b.fine.mondo), `il mondo alla fine della costruzione 3D (init1): ${JSON.stringify(a.fine && a.fine.mondo)} / ${JSON.stringify(b.fine && b.fine.mondo)}`);
  ok(a.fine && b.fine && a.fine.caso === b.fine.caso, `Math.random alla fine della costruzione: ${a.fine && a.fine.caso} / ${b.fine && b.fine.caso}`);
  ok(a.fine && b.fine && eq(a.fine.scena0, b.fine.scena0), `la scena alla fine della costruzione: ${JSON.stringify(a.fine && a.fine.scena0)} / ${JSON.stringify(b.fine && b.fine.scena0)}`);
  if (a.fine && a.fine.scena1) ok(a.fine && b.fine && eq(a.fine.scena1, b.fine.scena1), `la scena dopo Anelli.finisci(): ${JSON.stringify(a.fine && a.fine.scena1)} / ${JSON.stringify(b.fine && b.fine.scena1)}`);
  ok(!a.errori.length && !b.errori.length, `nessun errore della pagina (${a.errori.length} / ${b.errori.length})${a.errori.concat(b.errori).slice(0, 3).map(e => ' · ' + e).join('')}`);
  console.log(`     tempi: mappa (domInteractive) ${a.tempi.domInteractive} / ${b.tempi.domInteractive} ms; costruzione (init1-init0) ${a.tempi.costruzione} / ${b.tempi.costruzione}; menu pronto ${a.tempi.pronto} / ${b.tempi.pronto}`);
  process.exit(fail ? 1 : 0);
}

const { chromium, devices } = require(process.env.PW || '/opt/node-tools/node_modules/playwright-core');
const root = path.resolve(__dirname, '..'), OUT = process.argv[2], Q = arg('query', ''), TEL = has('telefono'), SEME = +arg('seme', 12345);
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.webp': 'image/webp' };
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const T0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0)} s]`, ...a);
  const b = await chromium.launch({ executablePath: process.env.PW_CHROME || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info'] });
  const ctx = TEL ? await b.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2, userAgent: devices['iPhone 13'].userAgent }) : await b.newContext({ viewport: { width: 1280, height: 720 } });
  const pg = await ctx.newPage(), errori = [];
  pg.on('pageerror', e => { errori.push(e.message.slice(0, 300)); log('[errore]', e.message.slice(0, 300)); });
  pg.on('console', m => { if (/\[cotto\]/.test(m.text())) log('[pagina]', m.text().slice(0, 300)); });
  pg.on('crash', () => { log('CRASH della pagina'); b.close().catch(() => {}); srv.close(); process.exit(3); });
  await pg.addInitScript(seme => {
    window.__nodraw = true;
    for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) { if (!C) continue; const P = C.prototype;
      for (const k of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced', 'drawRangeElements']) { const f = P[k]; if (!f) continue; P[k] = function () { if (window.__nodraw) return; return f.apply(this, arguments); }; } }
    let a = seme >>> 0 || 1; window.__caso = 0; window.__dettaglio = /dettaglio/.test(location.hash); window.__senzaScena = /senzascena/.test(location.hash);
    Math.random = function () { window.__caso++; a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    // l'impronta (FNV-1a a 64 bit in due metà) di una stringa e di byte
    const fnv = () => ({ a: 0x811c9dc5, b: 0x01000193 ^ 0x5bd1e995 });
    const sS = (h, s) => { let x = h.a, y = h.b; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); x = Math.imul(x ^ c, 16777619); y = Math.imul(y ^ c, 2246822519) ^ (y >>> 15); } h.a = x; h.b = y; return h; };
    const sB = (h, u) => { let x = h.a, y = h.b; for (let i = 0; i < u.length; i++) { const c = u[i]; x = Math.imul(x ^ c, 16777619); y = Math.imul(y ^ c, 2246822519) ^ (y >>> 15); } h.a = x; h.b = y; return h; };
    const hx = h => (h.a >>> 0).toString(16).padStart(8, '0') + (h.b >>> 0).toString(16).padStart(8, '0');
    window.__impr = { fnv, sS, sB, hx };
    // la foto del mondo: la codifica di cotto.js su World, Percorsi, Tetti, TettiVissuti
    window.__fotoMondo = () => { const C = window.Cotto, ids = new Map(), K = C.Codifica(ids, { sorgenti: true, tollera: true }), T = window.Tetti, TV = window.TettiVissuti;
      const R = { W: window.World, P: window.Percorsi && window.Percorsi.dati, TT: T && { LADDERS: T.LADDERS, PLANKS: T.PLANKS, JUMPS: T.JUMPS, CAMM: T.CAMM, BELV: T.BELV, RETE4: T.RETE4, CORTI: T.CORTI, PREMI: T.PREMI, PIANO: T.PIANO }, TV: TV && { VISSUTI: TV.VISSUTI } };
      const out = {}; Object.keys(R).forEach(k => { out[k] = hx(sS(fnv(), JSON.stringify(K.enc(R[k], k)))); });
      if (window.__dettaglio) { const D = out.chiavi = {}; const W = window.World; Object.keys(W).forEach(k => { const i2 = new Map(), K2 = C.Codifica(i2, { sorgenti: true, tollera: true }); const j = JSON.stringify(K2.enc(W[k], 'W.' + k)), b2 = K2.binario(); D[k] = hx(sS(fnv(), j)) + ':' + hx(sB(fnv(), b2.bin)) + (j.length < 600 ? ' ' + j : ''); if (W[k] && typeof W[k] === 'object' && !Array.isArray(W[k]) && !ArrayBuffer.isView(W[k])) Object.keys(W[k]).forEach(k2 => { const i3 = new Map(), K3 = C.Codifica(i3, { sorgenti: true, tollera: true }), j3 = JSON.stringify(K3.enc(W[k][k2], 'W.' + k + '.' + k2)); D[k + '.' + k2] = hx(sS(fnv(), j3)) + (k === 'SEA' ? ' ' + j3 : j3.length < 2000 ? ' ' + j3 : ' ' + j3.slice(0, 1500)); }); }); }
      const bb = K.binario(); out.bin = hx(sB(fnv(), bb.bin)) + ':' + bb.bin.length; out.oggetti = ids.size; out.funzioni = K.funz.length; return out; };
    // quando nasce TettiVissuti (l'ultimo modulo cotto) si fotografa il mondo
    let TVv; Object.defineProperty(window, 'TettiVissuti', { configurable: true, get() { return TVv; }, set(v) { TVv = v; try { const t = performance.now(); window.__mondo = Object.assign(window.__fotoMondo(), { caso: window.__caso, ms: Math.round(performance.now() - t), quando: Math.round(t) }); } catch (e) { window.__mondo = { errore: String(e && e.stack || e) }; } } });
    // Math.random all'inizio della costruzione (init0, col mondo come lo trova render.js), a pulizia2 e alla fine (init1)
    window.__casoA = {}; const TL = {}; window.__tl = TL;
    ['init0', 'init1', 'compilato'].forEach(k => { let v; Object.defineProperty(TL, k, { enumerable: true, configurable: true, get() { return v; }, set(x) { v = x; window.__casoA[k] = window.__caso; if (k === 'init0') { try { window.__casoA.mondo0 = window.__fotoMondo(); } catch (e) { window.__casoA.mondo0 = String(e); } a = (seme ^ 0x5bd1e995) >>> 0 || 1; window.__caso0 = window.__caso; window.__caso = 0; } if (k === 'init1' && !window.__senzaScena) window.__alFine(); } }); });
    // la scena ferma: le mesh con la matrice identità (case fuse, statiche, terreno), mesh per mesh; la firma non dipende dall'ordine
    window.__firmaScena = () => {
      const I = window.__impr, S = window.Render.__models.scene; S.updateMatrixWorld(true);
      let n = 0, nV = 0, nI = 0, sx = 0, sy = 0, sz = 0, firma = 0, firma2 = 0;
      const v = new THREE.Vector3();
      // solo le mesh ferme nel mondo (la matrice è l'identità: le case fuse, le statiche, il terreno): chi si muove (persone, mezzi,
      // l'acqua, le luci) cambia da un fotogramma all'altro anche fra due giri uguali
      let altre = 0; const id = o => { const e = o.matrixWorld.elements; for (let i = 0; i < 16; i++) if (Math.abs(e[i] - (i % 5 ? 0 : 1)) > 1e-9) return false; return true; };
      S.traverse(o => { if (!(o.isMesh || o.isPoints || o.isLine)) return; const g = o.geometry; if (!g || !g.attributes || !g.attributes.position) return; if (o.isSkinnedMesh || o.isInstancedMesh || !id(o)) { altre++; return; } n++;
        const p = g.attributes.position, h = I.fnv(); I.sS(h, o.type + '|' + p.count + '|' + p.itemSize);
        const arr = p.isInterleavedBufferAttribute ? p.data.array : p.array; I.sB(h, new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength));
        if (g.index) { const ia = g.index.array; I.sB(h, new Uint8Array(ia.buffer, ia.byteOffset, ia.byteLength)); nI += ia.length; }
        I.sS(h, o.matrixWorld.elements.join(',')); if (o.isInstancedMesh) { const im = o.instanceMatrix.array; I.sB(h, new Uint8Array(im.buffer, im.byteOffset, im.byteLength)); I.sS(h, '#' + o.count); }
        firma = (firma + (h.a >>> 0)) % 4294967296; firma2 = (firma2 + (h.b >>> 0)) % 4294967296;
        nV += p.count;
        // la somma delle posizioni nel mondo (in centimetri interi: la somma non dipende dall'ordine)
        const step = Math.max(1, Math.floor(p.count / 4000)); for (let i = 0; i < p.count; i += step) { v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld); sx += Math.round(v.x * 100); sy += Math.round(v.y * 100); sz += Math.round(v.z * 100); } });
      return { mesh: n, altre, vertici: nV, indici: nI, somma: [sx, sy, sz], firma: firma.toString(16) + firma2.toString(16), fusione1: window.__fusione1 ? { prima: window.__fusione1.prima, dopo: window.__fusione1.dopo, secchi: window.__fusione1.secchi } : null };
    };
    // alla fine della costruzione (init1, ancora dentro R.init: nessun fotogramma in mezzo) il mondo, Math.random, la scena; poi
    // Anelli.finisci() (tutti i settori lontani fusi) e di nuovo la scena
    window.__alFine = () => { try { const f = { mondo: window.__fotoMondo(), caso: window.__caso, scena0: window.__firmaScena() }; window.__fine = f; } catch (e) { window.__fine = { errore: String(e && e.stack || e) }; } };
    let P2v; Object.defineProperty(window, '__pulizia2', { configurable: true, get() { return P2v; }, set(v) { P2v = v; window.__casoA.pulizia2 = window.__caso; } });
  }, SEME);
  await pg.goto(`http://localhost:${srv.address().port}/index.html${Q ? '?' + Q.replace(/^[?&]/, '') : ''}${has('solo-mondo') ? '#dettaglio' : has('senza-scena') ? '#senzascena' : ''}`, { timeout: 0, waitUntil: 'commit' });
  if (has('solo-mondo')) { await pg.waitForFunction(() => window.__mondo, null, { timeout: 0, polling: 1000 }); const M = await pg.evaluate(() => window.__mondo); fs.writeFileSync(OUT, JSON.stringify({ query: Q, mondo: M, errori }, null, 1)); log('mondo', JSON.stringify(M).slice(0, 300)); await b.close(); srv.close(); process.exit(0); }
  // con la scena (la prova d'identità) ci si ferma alla fine della costruzione; senza (--senza-scena: i tempi) si aspetta il menu che risponde
  if (has('senza-scena')) { await pg.waitForFunction(() => { const g = document.getElementById('go'); return window.__pv && window.__pv.R && g && !g.disabled; }, null, { timeout: 0, polling: 1000 }); log('menu pronto'); }
  else { await pg.waitForFunction(() => window.__fine, null, { timeout: 0, polling: 1000 }); log('costruzione finita'); }
  const OUTJ = { query: Q, telefono: TEL, seme: SEME, errori };
  Object.assign(OUTJ, await pg.evaluate(() => {
    const n = performance.getEntriesByType('navigation')[0] || {}, rt = window.__rt || {}, tl = window.__tl || {}, I = window.__impr;
    const P2 = window.__pulizia2, p2s = P2 ? JSON.stringify(P2) : '';
    const riass = P2 ? (() => { try { return 'prima ' + (P2.prima && (P2.prima.n !== undefined ? P2.prima.n : P2.prima.tot !== undefined ? P2.prima.tot : JSON.stringify(P2.prima).length)) + ', azioni ' + (Array.isArray(P2.azioni) ? P2.azioni.length : JSON.stringify(P2.azioni).length); } catch (e) { return '?'; } })() : '';
    let somma = 0; for (const k in rt) if (typeof rt[k] === 'number') somma += rt[k];
    return { mondo: window.__mondo, casoA: window.__casoA, pulizia2: P2 ? { firma: I.hx(I.sS(I.fnv(), p2s)), lung: p2s.length, riassunto: riass } : null, cotto: window.Cotto ? { attivo: window.Cotto.attivo, stato: window.Cotto.STATO } : null,
      tempi: { domInteractive: Math.round(n.domInteractive), init0: tl.init0, init1: tl.init1, costruzione: tl.init1 - tl.init0, compilato: tl.compilato, pronto: document.getElementById('go') && !document.getElementById('go').disabled ? Math.round(performance.now()) : null, rtSomma: Math.round(somma), mondoNato: window.__mondo && window.__mondo.quando },
      rt, tl };
  }));
  log('mondo', JSON.stringify(OUTJ.mondo), 'tempi', JSON.stringify(OUTJ.tempi), 'cotto', JSON.stringify(OUTJ.cotto));
  {
    OUTJ.fine = await pg.evaluate(() => window.__fine);
    log('fine', JSON.stringify(OUTJ.fine));
  }
  fs.writeFileSync(OUT, JSON.stringify(OUTJ, null, 1));
  log('scritto', OUT, 'errori', errori.length);
  await b.close(); srv.close(); process.exit(0);
});
