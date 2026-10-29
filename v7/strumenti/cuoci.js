// [cotto] LA COTTURA DEL MONDO (P1 di ANALISI_CARICAMENTO): genera il mondo in Node come il gioco, nello stesso ordine dei moduli di
// src/index.src.html (da cotto.js a tetti_vissuti.js), e salva quello che i moduli cotti producono in mondo_cotto.js accanto a
// index.html. La chiama build.py quando l'impronta dei sorgenti cambia; il gioco lo legge all'avvio (src/cotto.js).
//   node strumenti/cuoci.js                 cuoce (l'impronta la calcola da sé, come build.py)
//   node strumenti/cuoci.js --out=FILE      altrove
// Come modulo: require('./cuoci.js').carica({ cuoci, cotto }) carica i moduli in Node (le prove: test_cotto.js).
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const V7 = path.join(__dirname, '..'), SRC = path.join(V7, 'src');

// l'impronta: sha1 dei sorgenti di Cotto.FONTI, nell'ordine (nome, zero, contenuto, zero); la stessa di build.py
function fonti() { const s = fs.readFileSync(path.join(SRC, 'cotto.js'), 'utf8'), m = /const FONTI = \[([^\]]*)\]/.exec(s); return m[1].split(',').map(q => q.trim().replace(/^'|'$/g, '')).filter(Boolean); }
function impronta() { const h = crypto.createHash('sha1'); fonti().forEach(f => { h.update(f); h.update(Buffer.from([0])); h.update(fs.readFileSync(path.join(SRC, f))); h.update(Buffer.from([0])); }); return h.digest('hex').slice(0, 16); }

// i moduli del gioco fino a tetti_vissuti.js, nell'ordine della pagina (world.js no: è la mappa vecchia, ?vecchia)
function moduli() {
  const h = fs.readFileSync(path.join(SRC, 'index.src.html'), 'utf8'), L = [], re = /\/\*([a-z0-9_.]+\.js)\*\//g; let m;
  while ((m = re.exec(h))) L.push(m[1]);
  const a = L.indexOf('cotto.js'), b = L.indexOf('tetti_vissuti.js');
  return L.slice(a, b + 1).filter(f => f !== 'world.js' && f !== 'skate.js');
}
const nomeDi = f => { const s = fs.readFileSync(path.join(SRC, f), 'utf8'), m = /^var ([A-Za-z_$][\w$]*)\s*=/m.exec(s); return m ? m[1] : null; };

// carica i moduli in Node come globali (come i <script> della pagina). opz.cuoci: la cottura; opz.cotto: il contenuto di mondo_cotto.js
// da leggere (con la sua impronta, o opz.impronta). Torna i globali e i tempi.
function carica(opz) {
  opz = opz || {};
  if (opz.cuoci) global.PV_CUOCI = true;
  if (opz.cotto) { global.PV_COTTO = opz.cotto; global.PV_IMPRONTA_MONDO = opz.impronta || opz.cotto.impronta; }
  const tempi = {}, log = console.log, warn = console.warn; if (!opz.parla) { console.log = () => {}; console.warn = () => {}; }
  try {
    moduli().forEach(f => { const n = nomeDi(f); if (!n) throw new Error('nessun var in ' + f); const t0 = Date.now(); global[n] = require(path.join(SRC, f)); tempi[f] = Date.now() - t0; });
  } finally { console.log = log; console.warn = warn; }
  return { tempi, Cotto: global.Cotto };
}

// il file: uno script che la pagina carica prima dei moduli (window.PV_COTTO); i dati in JSON dentro una stringa (JSON.parse è più
// svelto del codice), il blocco binario in base64
function scrivi(file, F) {
  const testa = '/* [cotto] il mondo cotto da strumenti/cuoci.js (build.py): non si scrive a mano. Impronta ' + F.impronta + ' */\n';
  const s = testa + 'window.PV_COTTO = { versione: ' + F.versione + ', impronta: ' + JSON.stringify(F.impronta) + ', punti: JSON.parse(' + JSON.stringify(JSON.stringify(F.punti)) + '), bin: ' + JSON.stringify(F.bin) + ' };\n';
  fs.writeFileSync(file, s); return s.length;
}

// [cotto] LA COTTURA NEL BROWSER: i numeri a virgola mobile di Node e di Chromium non sono sempre uguali all'ultima cifra (Math.atan2 e
// simili nei due V8: nel mondo 2 numeri su qualche milione, ma poi la costruzione 3D decide diversamente). La cottura vera la fa quindi la
// pagina stessa (index.html già rifatto) in Chromium senza testa, con window.PV_CUOCI: quando nasce l'ultimo modulo cotto, Cotto.sforna.
// Senza Chromium (playwright-core) si cuoce in Node: il gioco resta deterministico, uguale a Node all'ultima cifra.
function chromium() { try { const pw = require(process.env.PW || '/opt/node-tools/node_modules/playwright-core'), exe = process.env.PW_CHROME || '/opt/pw-browsers/chromium'; return fs.existsSync(exe) ? { pw, exe } : null; } catch (e) { return null; } }
const ULTIMO = 'TettiVissuti';   // il global dell'ultimo modulo cotto (quando la pagina lo assegna, si sforna)
async function cuociChromium(imp, C) {
  const http = require('http'), TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.webp': 'image/webp' };
  const srv = http.createServer((req, res) => { let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
    if (u.startsWith('/api/') || u === '/mondo_cotto.js') { res.writeHead(404); res.end(); return; }
    const p = path.join(V7, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); });
  await new Promise(r => srv.listen(0, r));
  const b = await C.pw.chromium.launch({ executablePath: C.exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  try {
    const pg = await b.newPage();
    await pg.addInitScript(([imp, ULTIMO]) => { window.PV_CUOCI = true; let v0; Object.defineProperty(window, ULTIMO, { configurable: true, get() { return v0; }, set(v) { v0 = v;
      try { const F = window.Cotto.sforna(imp); window.__sfornato = JSON.stringify(F); } catch (e) { window.__sfornato = 'ERRORE ' + (e && e.stack || e); } } }); }, [imp, ULTIMO]);
    await pg.goto(`http://localhost:${srv.address().port}/index.html`, { waitUntil: 'commit', timeout: 0 });
    await pg.waitForFunction(() => window.__sfornato, null, { timeout: 900000, polling: 500 });
    const s = await pg.evaluate(() => window.__sfornato);
    if (s.startsWith('ERRORE')) throw new Error(s);
    return JSON.parse(s);
  } finally { await b.close(); srv.close(); }
}

if (require.main === module) (async () => {
  const arg = k => { const a = process.argv.find(q => q.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : null; };
  const out = arg('out') || path.join(V7, 'mondo_cotto.js'), imp = arg('impronta') || impronta();
  const t0 = Date.now(), CH = process.argv.includes('--node') ? null : chromium(); let F, tempi = {}, dove;
  if (CH) { F = await cuociChromium(imp, CH); dove = 'Chromium'; }
  else { const R = carica({ cuoci: true }); tempi = R.tempi; F = R.Cotto.sforna(imp); dove = 'Node'; }
  const n = scrivi(out, F);
  console.log('[cotto] cotto in ' + dove);
  Object.keys(F.info).forEach(k => { const I = F.info[k]; console.log(`[cotto] ${k}: ${I.ms} ms, oggetti delle radici ${I.conta.o}, cambiati ${I.cambiati}, Math.random ${I.caso}, funzioni ${I.funzioni.length}`); });
  if (process.argv.includes('--funzioni')) Object.keys(F.info).forEach(k => { const c = {}; F.info[k].funzioni.forEach(f => { const q = f.replace(/\[\d+\]/g, '[]').replace(/#\d+/, '#'); c[q] = (c[q] || 0) + 1; }); console.log('[cotto] ' + k + ' funzioni: ' + Object.entries(c).map(([q, n]) => q + (n > 1 ? ' ×' + n : '')).join(', ')); });
  const caso = Object.keys(F.info).filter(k => F.info[k].caso);
  if (caso.length) { console.error('[cotto] ERRORE: i punti ' + caso.join(', ') + ' usano Math.random: non si possono cuocere'); fs.unlinkSync(out); process.exit(1); }
  console.log(`[cotto] ${path.relative(V7, out)}: ${(n / 1e6).toFixed(2)} MB, impronta ${imp}, ${((Date.now() - t0) / 1000).toFixed(1)} s (moduli: ${Object.entries(tempi).filter(([, t]) => t > 200).map(([f, t]) => f + ' ' + t).join(', ')})`);
})().catch(e => { console.error('[cotto] ERRORE', e && e.stack || e); process.exit(1); });
module.exports = { carica, impronta, fonti, moduli, scrivi, nomeDi };
