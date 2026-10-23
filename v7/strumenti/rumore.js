// [pulizia] IL CENSIMENTO DEL RUMORE della città nuova: carica il gioco vero in Chromium senza testa e legge window.__rumore
// (src/pulizia_rumore.js: il censimento prima e dopo la passata, le azioni) e window.__pulizia2 (le compenetrazioni del regista).
// Stampa, per tipo di rumore, prima e dopo:
//   verso         una cosa a muro non parallela al muro, una cosa a terra non allineata al muro o alla via vicina
//   galleggia     a terra ma sospesa sopra groundH (oltre 6 cm, senza niente sotto)
//   affonda       sepolta sotto groundH (oltre 20 cm)
//   parete        due cose appese alla stessa facciata che si coprono nel piano del muro
//   finestra      una cosa appesa sopra una finestra
//   marciapiede   una cosa a terra a ridosso del muro davanti a una cosa appesa
//   doppione      due cose dello stesso tipo e della stessa sagoma troppo vicine
//   passaggio     una cosa che strozza un vicolo (meno di 0,9 m per passare)
//   facciata_piena, tratto_pieno: il di più sopra la densità leggibile (CFG.facciata, CFG.marciapiede)
// e la lista dei modelli per chi li posa, ordinata per quanto si vedono (la superficie sullo schermo della camera di gioco), con i
// triangoli e la quota di scatole nude: i candidati da migliorare. Salva reports/rumore.json e la pianta dei punti reports/rumore.png.
//   node strumenti/rumore.js [--spento] [uscita.json]      --spento: ?norumore, misura soltanto
//   RUMORE_ESIGI=1: esce con errore se le compenetrazioni del regista crescono rispetto a ?norumore (il conto è nel json)
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const root = path.resolve(__dirname, '..'), args = process.argv.slice(2), spento = args.includes('--spento');
const outJ = path.resolve(args.find(a => a.endsWith('.json')) || path.join(root, 'reports', spento ? 'rumore_prima.json' : 'rumore.json')), outP = outJ.replace(/\.json$/, '.png');
// le righe di index.html → file e riga di src/ (lo stesso conto di build.py)
const RIGHE = (() => { const h = fs.readFileSync(path.join(root, 'src', 'index.src.html'), 'utf8'), SALTA = new Set(['studio.js', 'skate.js']), out = []; let riga = 1, last = 0;
  h.replace(/\/\*([a-z0-9_.]+\.js)\*\//g, (m, f, at) => { riga += (h.slice(last, at).match(/\n/g) || []).length; last = at + m.length; if (SALTA.has(f)) return m;
    const t = fs.readFileSync(path.join(root, 'src', f), 'utf8'), n = (t.match(/\n/g) || []).length; out.push([riga, riga + n, f]); riga += n; return m; });
  return n => { for (const [a, b, f] of out) if (n >= a && n <= b) return f + ':' + (n - a + 1); return 'index.html:' + n; }; })();
const dove = chi => chi.replace(/:(\d+)$/, (m, n) => ' ' + RIGHE(+n));
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream' };
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const t0 = Date.now(), b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: 480, height: 300 } });
  pg.on('pageerror', e => console.log('[errore]', e.message, (e.stack || '').split('\n').slice(0, 3).join(' | ')));
  pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) console.log('[console]', m.text().slice(0, 400)); if (/\[rumore\]/.test(m.text())) console.log(m.text().slice(0, 600)); });
  await pg.addInitScript(() => { window.__dbg35 = true; window.__rumoreChi = true; });
  await pg.goto(`http://localhost:${srv.address().port}/${process.env.PV_PAGINA || 'index.html'}?cittanuova${spento ? '&norumore' : ''}`);
  await pg.waitForFunction(() => window.__pulizia2, null, { timeout: 900000, polling: 2000 });
  const R = await pg.evaluate(() => window.__rumore), P2 = await pg.evaluate(() => ({ prima: window.__pulizia2.prima, dopo: window.__pulizia2.dopo }));
  const T3 = await pg.evaluate(() => window.__tetti3 ? window.__tetti3() : null);
  if (!R) { console.log('window.__rumore non c\'è: pulizia_rumore.js non è nella build?'); process.exitCode = 1; await b.close(); srv.close(); return; }
  const pad = (s, n) => String(s).padEnd(n), lp = (s, n) => String(s).padStart(n);
  console.log('caricato in', Math.round((Date.now() - t0) / 1000), 's; la passata in', R.ms, 'ms;', R.spento ? 'SPENTA (?norumore): solo la misura' : 'accesa');
  console.log('voci', R.prima.voci, '→', R.dopo.voci, '; facciate', R.prima.facciate);
  console.log('\n' + pad('rumore', 16) + lp('prima', 7) + lp('dopo', 7));
  Object.keys(R.prima.per).forEach(t => console.log(pad(t, 16) + lp(R.prima.per[t], 7) + lp(R.dopo.per[t], 7)));
  console.log(pad('totale', 16) + lp(R.prima.tot, 7) + lp(R.dopo.tot, 7));
  console.log('\ndensità prima', JSON.stringify(R.prima.densita), '\ndensità dopo ', JSON.stringify(R.dopo.densita));
  if (R.numeri) console.log('\nNUMERI: tolti', R.numeri.tolti, '· ruotati', R.numeri.ruotati, '· spostati', R.numeri.spostati, '· posati a terra', R.numeri.posati, '· lasciati (fissi o posti delle persone)', R.numeri.tenuti);
  if (!R.spento) ['tolti', 'ruotati', 'spostati', 'posati', 'tenuti'].forEach(k => console.log('  ' + pad(k, 9), JSON.stringify(R.azioni[k])));
  const top = (o, n) => Object.entries(o).sort((a, c) => c[1] - a[1]).slice(0, n).map(([k, v]) => k + ' ' + v).join(' · ');
  console.log('\nprima, per tipo:', top(R.prima.perTipo, 30)); console.log('dopo, per tipo:', top(R.dopo.perTipo, 30) || '—');
  console.log('\ncompenetrazioni del regista (dopo):', P2.dopo.tot, JSON.stringify(P2.dopo.per));
  if (T3) console.log('compenetrazioni sui tetti', (T3.urti || []).length);
  // i modelli: i più visti, coi segni della povertà (quasi tutto scatole nude) o del peso inutile (troppi triangoli per lo spazio che occupano)
  const M = R.modelli ? R.modelli.prima : [];
  console.log('\nI MODELLI PIÙ VISTI (prima della passata): chi li posa, quanti, superficie sullo schermo (m²), triangoli a pezzo, mesh a pezzo, quota di scatole, triangoli per m² di schermo');
  M.slice(0, 60).forEach((q, i) => { const segni = [q.quotaScatole !== null && q.quotaScatole >= .7 && q.meshPer <= 8 ? 'SCATOLE' : '', q.triPerM2 > 900 ? 'PESANTE' : '', q.triPer < 40 ? 'POVERO' : ''].filter(Boolean).join(' ');
    console.log(lp(i + 1, 3) + ' ' + pad(dove(q.chi), 52) + lp(q.n, 6) + lp(q.schermo, 9) + lp(q.triPer, 7) + lp(q.meshPer, 6) + lp(q.quotaScatole === null ? '-' : q.quotaScatole, 6) + lp(q.triPerM2, 7) + '  ' + Object.keys(q.k).join(',') + (segni ? '  ← ' + segni : '')); });
  fs.mkdirSync(path.dirname(outJ), { recursive: true });
  const modelli = R.modelli ? { prima: R.modelli.prima.map(q => Object.assign({ dove: dove(q.chi) }, q)), dopo: R.modelli.dopo.map(q => Object.assign({ dove: dove(q.chi) }, q)) } : null;
  fs.writeFileSync(outJ, JSON.stringify({ quando: new Date().toISOString(), spento: R.spento, prima: R.prima, dopo: R.dopo, azioni: R.azioni, numeri: R.numeri, compenetrazioni: P2, tetti3: T3 ? (T3.urti || []).length : null, modelli, punti: R.punti }, null, 1));
  // la pianta dei punti: prima a sinistra, dopo a destra
  if (R.punti) { const png = await pg.evaluate(R => {
    const G = window.__pv.G, B = G.BUILDINGS, TS = G.TS, all = R.punti.prima; let x0 = 1222, x1 = 1610, z0 = 250, z1 = 452; all.forEach(p => { x0 = Math.min(x0, p[1]); x1 = Math.max(x1, p[1]); z0 = Math.min(z0, p[2]); z1 = Math.max(z1, p[2]); });
    x0 -= 6; x1 += 6; z0 -= 6; z1 += 6; const S = Math.min(1000 / (x1 - x0), 1000 / (z1 - z0)), W = Math.ceil((x1 - x0) * S), H = Math.ceil((z1 - z0) * S), c = document.createElement('canvas'); c.width = W * 2 + 30; c.height = H + 90; const x = c.getContext('2d');
    const COL = { verso: '#e0302a', galleggia: '#a08000', affonda: '#704020', parete: '#ff8a00', finestra: '#20b0e0', marciapiede: '#a020f0', doppione: '#1060ff', passaggio: '#000', facciata_piena: '#40a040', tratto_pieno: '#e040a0' };
    x.fillStyle = '#f4f1ea'; x.fillRect(0, 0, c.width, c.height);
    [[R.punti.prima, 0, 'prima: ' + R.prima.tot], [R.punti.dopo, W + 30, 'dopo: ' + R.dopo.tot]].forEach(([P, ox, tit]) => {
      x.fillStyle = '#c9c2b4'; B.forEach(b => { const X = (b.x * TS - x0) * S, Z = (b.y * TS - z0) * S; if (X > W || Z > H || X + b.w * TS * S < 0 || Z + b.h * TS * S < 0) return; x.fillRect(ox + X, Z, b.w * TS * S, b.h * TS * S); });
      P.forEach(p => { x.fillStyle = COL[p[0]] || '#000'; x.beginPath(); x.arc(ox + (p[1] - x0) * S, (p[2] - z0) * S, 2.2, 0, 7); x.fill(); });
      x.fillStyle = '#111'; x.font = 'bold 16px sans-serif'; x.fillText(tit, ox + 8, H + 22); });
    let lx = 8; x.font = '13px sans-serif'; Object.keys(COL).forEach(k => { x.fillStyle = COL[k]; x.fillRect(lx, H + 40, 12, 12); x.fillStyle = '#111'; x.fillText(k, lx + 16, H + 51); lx += x.measureText(k).width + 34; });
    return c.toDataURL('image/png'); }, R); fs.writeFileSync(outP, Buffer.from(png.split(',')[1], 'base64')); }
  console.log('\nsalvati', outJ, R.punti ? outP : '');
  if (process.env.RUMORE_ESIGI && T3 && (T3.urti || []).length) process.exitCode = 1;
  await b.close(); srv.close();
});
