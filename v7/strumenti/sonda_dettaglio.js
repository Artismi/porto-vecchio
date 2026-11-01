// [dettaglio] LA SONDA DEL DETTAGLIO: il gioco vero (?cittanuova&leggera) in Chromium senza testa, col censimento dei modelli acceso
// (window.__rumoreChi: addStatic segna chi posa ogni cosa, quante mesh, quante scatole nude, poliedri nudi e cilindri grossi a pochi lati).
// Stampa i modelli ordinati per presenza sullo schermo (superficie proiettata m²) contro la ricchezza (triangoli per m², quota di
// scatole), dice per ogni costruttore se ha già la strada di arredo3d (ARR3()/pm3 nel suo corpo) e un punteggio «povertà × presenza».
// Poi misura disegni e triangoli del fotogramma in qualche punto (zoom di gioco e da vicino).
// Con --foto=<cartella> fotografa ogni punto (x,z,zoom; zoom 0,35 da vicino) alle 11 di un giorno sereno, senza interfaccia.
//   node strumenti/sonda_dettaglio.js [uscita.json] [--punti=x,z,zoom;...] [--foto=cartella] [--pagina=altra.html] [--query=&...] [--senza-punti]
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || 'playwright');
const root = path.resolve(__dirname, '..'), args = process.argv.slice(2);
const arg = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const OUT = path.resolve(args.find(a => a.endsWith('.json')) || path.join(root, 'reports', 'sonda_dettaglio.json'));
const Q = '?cittanuova&leggera' + arg('query', '');
const PUNTI = arg('punti', '1424,322,1;1400,312,.35;1428,324,.35;1440,329,.35;1274,343,.35').split(';').map(s => s.split(',').map(Number)), FOTO = arg('foto', null), PAGINA = arg('pagina', 'index.html');
// le righe di index.html → file e riga di src/ (lo stesso conto di build.py e di rumore.js)
const SRC = {}; const RIGHE = (() => { const h = fs.readFileSync(path.join(root, 'src', 'index.src.html'), 'utf8'), SALTA = new Set(['studio.js', 'skate.js']), out = []; let riga = 1, last = 0;
  h.replace(/\/\*([a-z0-9_.]+\.js)\*\//g, (m, f, at) => { riga += (h.slice(last, at).match(/\n/g) || []).length; last = at + m.length; if (SALTA.has(f)) return m;
    const t = fs.readFileSync(path.join(root, 'src', f), 'utf8'); SRC[f] = t.split('\n'); const n = (t.match(/\n/g) || []).length; out.push([riga, riga + n, f]); riga += n; return m; });
  return n => { for (const [a, b, f] of out) if (n >= a && n <= b) return [f, n - a + 1]; return ['index.html', n]; }; })();
// il corpo della funzione che posa: dalla riga della chiamata risale alla dichiarazione «function nome» e guarda se c'è la strada arredo3d
function corpo(fn, f, riga) { const L = SRC[f]; if (!L) return null; const re = new RegExp('(function\\s+' + fn.replace(/[$.]/g, '\\$&').split('.').pop() + '\\b|\\b' + fn.split('.').pop() + '\\s*[:=]\\s*(function|\\())');
  for (let i = riga - 1; i >= Math.max(0, riga - 400); i--) if (re.test(L[i])) return { da: i + 1, testo: L.slice(i, riga + 2).join('\n') }; return null; }
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.gz': 'application/gzip' };
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const T0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0)} s]`, ...a);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--js-flags=--max-old-space-size=6144'] });
  const pg = await b.newPage({ viewport: { width: 960, height: 600 } });
  pg.on('crash', () => { log('[pagina morta]'); process.exit(2); });
  const errori = [];
  pg.on('pageerror', e => { errori.push(e.message); log('[errore]', e.message); });
  pg.on('console', m => { if ((m.type() === 'error' && !/Failed to load resource/.test(m.text())) || /atlante delle parti pieno/.test(m.text())) { errori.push(m.text().slice(0, 300)); log('[console]', m.text().slice(0, 300)); } });
  await pg.addInitScript(() => { window.__rumoreChi = true; window.__pulita = true;
    let a = 12345; Math.random = function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; });
  await pg.goto(`http://localhost:${srv.address().port}/${PAGINA}${Q}`, { timeout: 900000 });
  await pg.waitForFunction(() => window.__rumore, null, { timeout: 1500000, polling: 2000 });
  log('caricato', Q);
  const R = await pg.evaluate(() => window.__rumore);
  const M = (R.modelli && R.modelli.dopo) || [];
  const tot = M.reduce((s, q) => s + q.schermo, 0) || 1;
  const righe = M.map(q => { const m = /^(.*):(\d+)$/.exec(q.chi) || [0, q.chi, 0]; const [f, r] = m[2] ? RIGHE(+m[2]) : ['?', 0];
    const c = m[2] ? corpo(m[1], f, r) : null, testo = c ? c.testo : '';
    const arredo = /ARR3\(\)|pm3\(|Arredo3D\.make/.test(testo);
    // la povertà: quota di scatole nude e di poliedri/cilindri grossi, pochi triangoli per m² di schermo
    const rozze = (q.scatole + (q.poliedri || 0) + (q.cilGrossi || 0)) / Math.max(1, q.mesh);
    const scarno = q.triPerM2 < 40 ? 1 : q.triPerM2 < 120 ? .5 : 0;
    const punti = +(q.schermo / tot * 100 * (rozze + scarno * .5)).toFixed(2);
    return { chi: m[1], dove: f + ':' + r, decl: c ? f + ':' + c.da : null, n: q.n, schermo: q.schermo, quota: +(q.schermo / tot * 100).toFixed(2), triPer: q.triPer, meshPer: q.meshPer, scatole: q.quotaScatole, poliedri: q.poliedri || 0, cilGrossi: q.cilGrossi || 0, triPerM2: q.triPerM2, arredo, punti, k: Object.keys(q.k).join(',') }; });
  const pad = (s, n) => String(s).slice(0, n).padEnd(n), lp = (s, n) => String(s).padStart(n);
  console.log('\nI MODELLI PER PRESENZA (dopo la pulizia): chi, dove, quanti, m² di schermo, % dello schermo, tri a pezzo, mesh a pezzo, quota scatole, poliedri, cilindri grossi, tri/m², arredo3d');
  righe.slice(0, 60).forEach((q, i) => console.log(lp(i + 1, 3) + ' ' + pad(q.chi, 22) + pad(q.dove, 20) + lp(q.n, 6) + lp(q.schermo, 8) + lp(q.quota, 6) + lp(q.triPer, 6) + lp(q.meshPer, 6) + lp(q.scatole === null ? '-' : q.scatole, 6) + lp(q.poliedri, 5) + lp(q.cilGrossi, 5) + lp(q.triPerM2, 6) + '  ' + (q.arredo ? 'A3' : '--') + '  ' + q.k));
  const peggio = righe.filter(q => q.punti > 0).sort((a, b) => b.punti - a.punti);
  console.log('\nI PEGGIORI (presenza × povertà):');
  peggio.slice(0, 30).forEach((q, i) => console.log(lp(i + 1, 3) + ' ' + lp(q.punti, 6) + '  ' + pad(q.chi, 22) + pad(q.dove, 20) + ' n=' + q.n + ' scatole=' + q.scatole + ' poli=' + q.poliedri + ' cil=' + q.cilGrossi + ' tri/m²=' + q.triPerM2 + (q.arredo ? ' (ha arredo3d)' : '')));
  // il fotogramma: disegni e triangoli in qualche punto, a zoom di gioco (1) e da vicino (0,35)
  const fot = {};
  if (!args.includes('--senza-punti')) {
    await pg.keyboard.press('Enter'); await pg.waitForTimeout(2000);
    await pg.waitForFunction(() => !window.__pv.ui.intro, null, { timeout: 300000, polling: 500 }).catch(() => log('ancora nella schermata iniziale'));
    await pg.evaluate(() => { if (window.Anelli && Anelli.ON) Anelli.finisci(); const pv = window.__pv, R = pv.R, st = pv.st; if (R.setRes) R.setRes(1); R.setRes = null; R.lowQuality = () => { }; if (window.PesoSchermo && PesoSchermo.blocca) PesoSchermo.blocca(); st.deadline = 1e12;
      setInterval(() => { const u = pv.ui; u.flash = 0; u.fade = 0; u.desat = false; u.letterbox = false; u.dialog = null; u.book = false; u.menu = false; st.over = null; st.chase = false; st.player.hp = 100; st.player.stun = 0; }, 50); });
    if (FOTO) fs.mkdirSync(FOTO, { recursive: true });
    for (const [px, pz, z0] of PUNTI) { const P = [px, pz], z = z0 || 1;
      await pg.evaluate(([x0, y0, z]) => { const pv = window.__pv, st = pv.st, p = st.player, R = pv.R; p.vehicle = null; p.indoor = null; p.lv = null; p.path = []; p.x = x0; p.y = y0; st.t = (Math.floor(st.t / 1440) + 1) * 1440 + 660; window.__meteo = 'sereno'; pv.ui.zoom = z; R.cam.x = R.cam.tx = x0; R.cam.y = R.cam.ty = y0; }, [...P, z]);
      for (let k = 0, quiet = 0, tb = Date.now(); Date.now() - tb < 120000 && quiet < 3; k++) { await pg.waitForTimeout(1000); quiet = (await pg.evaluate(() => !(window.__pv.R.ISO && window.__pv.R.ISO.job))) ? quiet + 1 : 0; }
      await pg.waitForTimeout(3000);
      // tutti i passaggi del fotogramma (ombre, scena, dopo): info senza azzeramento automatico, letta e azzerata a ogni rAF
      const info = await pg.evaluate(() => new Promise(res => { const rd = window.__pv.R.__models.renderer; rd.info.autoReset = false; rd.info.reset(); let n = -1, c = 0, t = 0;
        const f = () => { if (n >= 0) { c += rd.info.render.calls; t += rd.info.render.triangles; } rd.info.reset(); if (++n < 6) requestAnimationFrame(f); else { rd.info.autoReset = true; res({ calls: Math.round(c / 6), tri: Math.round(t / 6) }); } }; requestAnimationFrame(f); }));
      fot[P.join(',') + '@' + z] = info; log('punto', P.join(','), 'zoom', z, JSON.stringify(info));
      if (FOTO) { const f = path.join(FOTO, `p${P.join('_')}_z${z}.png`); const url = await pg.evaluate(() => new Promise(res => requestAnimationFrame(() => res(document.getElementById('cv').toDataURL('image/png')))));   // la tela subito dopo un fotogramma (lo screenshot della pagina scade sotto SwiftShader)
        fs.writeFileSync(f, Buffer.from(url.split(',')[1], 'base64')); log('foto', f); }
    }
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ query: Q, errori, fotogramma: fot, modelli: righe, peggio: peggio.slice(0, 40) }, null, 1));
  log('fatto', OUT);
  await b.close(); srv.close(); process.exit(0);
});
