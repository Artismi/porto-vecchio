// [nitida] IL CENSIMENTO DELL'ARREDO DI STRADA della città nuova, prima e dopo (src/pulizia_rumore.js: «meno ma leggibilissimo»).
// Carica il gioco vero in Chromium senza testa due volte, con ?vecchiapulizia (le regole di prima) e senza (le regole [nitida]), e legge
// window.__nitida (l'arredo di strada del registro a fine passata: per tipo, per km di via, gli ostacoli), window.__rumore (il rumore) e
// le righe [dbg] di chi sparge la roba minuta fuori dal registro (vita1: carte, lattine, sacchi; oggetti35: le cose davanti alle porte e il
// pattume dei cordoli; urbano1: parchimetri e distributori). Stampa la tabella prima/dopo e salva il json (reports/nitida.json).
//   node strumenti/nitida.js [uscita.json]          NITIDA_SOLO=dopo (o prima): una sola delle due
// Gli ostacoli:
//   corsia        a terra sul marciapiede, né contro il muro né contro il cordolo: chi cammina ha meno di 0,9 m
//   carreggiata   a terra sulla carreggiata
//   angolo        nel cuore di un incrocio di città (entro 1,5 m dal suo raggio)
//   strisce       sulla testa di un attraversamento (entro 1,6 m)
//   senzaRagione  una panchina senza posto, piazza o fermata; una cabina fuori da piazze e fermate; un cestino lontano da panchine,
//                 fermate, edicole, dehors e angoli; un distributore dei giornali; una buca delle lettere fuori dalle piazze
// I muri vaganti (dati del mondo, senza Chromium): strumenti/muri_vaganti.js.
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const root = path.resolve(__dirname, '..'), args = process.argv.slice(2);
const outJ = path.resolve(args.find(a => a.endsWith('.json')) || path.join(root, 'reports', 'nitida.json'));
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream' };
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const giro = async (vecchia) => {
    const t0 = Date.now(), pg = await b.newPage({ viewport: { width: 480, height: 300 } }), dbg = {};
    pg.on('pageerror', e => console.log('[errore]', e.message, (e.stack || '').split('\n').slice(0, 3).join(' | ')));
    pg.on('console', m => { const t = m.text(); if (m.type() === 'error' && !/Failed to load resource/.test(t)) console.log('[console]', t.slice(0, 400));
      let q; if ((q = /\[dbg\] vita1 oggetti (\d+) ciuffi (\d+)/.exec(t))) { dbg.vita1 = +q[1]; dbg.ciuffi = +q[2]; }
      if ((q = /^oggetti35 (\d+) bidoni (\d+)/.exec(t))) dbg.oggetti35 = +q[1];
      if ((q = /\[dbg\] urbano1 parchimetri (\d+) giornali (\d+)/.exec(t))) { dbg.parchimetri = +q[1]; dbg.giornali = +q[2]; }
      if ((q = /\[dbg\] urbano1 scalini \d+ impalcature \d+ telecamere \d+ paletti (\d+)/.exec(t))) dbg.paletti = +q[1]; });
    await pg.addInitScript(() => { window.__dbg35 = true; });
    await pg.goto(`http://localhost:${srv.address().port}/${process.env.PV_PAGINA || 'index.html'}?cittanuova${vecchia ? '&vecchiapulizia' : ''}`, { timeout: 300000 });
    await pg.waitForFunction(() => window.__pulizia2, null, { timeout: 3000000, polling: 2000 });
    const R = await pg.evaluate(() => ({ N: window.__nitida, rumore: window.__rumore ? { prima: window.__rumore.prima.tot, dopo: window.__rumore.dopo.tot, numeri: window.__rumore.numeri } : null, segni: window.__segni ? window.__segni.cnt : null }));
    await pg.close(); R.dbg = dbg; R.s = Math.round((Date.now() - t0) / 1000); return R;
  };
  const solo = process.env.NITIDA_SOLO, P = solo === 'dopo' ? null : await giro(true), D = solo === 'prima' ? null : await giro(false);
  const pad = (s, n) => String(s).padEnd(n), lp = (s, n) => String(s === undefined ? '-' : s).padStart(n);
  const fin = R => R && R.N ? R.N.dopo : null, A = fin(P), Bq = fin(D);
  console.log('\nARREDO DI STRADA NEL REGISTRO (a fine passata, città)' + '\n' + pad('', 18) + lp('prima', 8) + lp('dopo', 8) + lp('/km prima', 11) + lp('/km dopo', 10));
  const fams = [...new Set([...(A ? Object.keys(A.per) : []), ...(Bq ? Object.keys(Bq.per) : [])])].sort();
  fams.forEach(f => console.log(pad(f, 18) + lp(A && (A.per[f] || 0), 8) + lp(Bq && (Bq.per[f] || 0), 8) + lp(A && (A.perKm[f] || 0), 11) + lp(Bq && (Bq.perKm[f] || 0), 10)));
  console.log(pad('totale', 18) + lp(A && A.tot, 8) + lp(Bq && Bq.tot, 8) + lp(A && A.perKmTot, 11) + lp(Bq && Bq.perKmTot, 10));
  console.log(pad('lungo le vie', 18) + lp(A && A.lungoVie, 8) + lp(Bq && Bq.lungoVie, 8));
  console.log('km di via in città', (A || Bq).km, '· di vicolo', (A || Bq).kmVicoli);
  console.log('\nOSTACOLI'); ['corsia', 'carreggiata', 'angolo', 'strisce', 'senzaRagione', 'tot'].forEach(k => console.log(pad(k, 18) + lp(A && A.ostacoli[k], 8) + lp(Bq && Bq.ostacoli[k], 8)));
  console.log('\nLA ROBA MINUTA FUORI DAL REGISTRO (pezzi posati)'); ['vita1', 'ciuffi', 'oggetti35', 'parchimetri', 'giornali', 'paletti'].forEach(k => console.log(pad(k, 18) + lp(P && P.dbg[k], 8) + lp(D && D.dbg[k], 8)));
  if (P && P.segni && D && D.segni) { console.log('\nIL PIANO DEI SEGNI (scena.js)'); ['bidoni', 'cassonetti', 'tavolini'].forEach(k => console.log(pad(k, 18) + lp(P.segni[k], 8) + lp(D.segni[k], 8))); }
  if (P && D && P.rumore && D.rumore) console.log('\nrumore (pulizia_rumore) a fine passata', P.rumore.dopo, '→', D.rumore.dopo);
  if (D && D.N && D.N.azioni) console.log('\nle azioni [nitida]:', JSON.stringify(D.N.azioni));
  fs.mkdirSync(path.dirname(outJ), { recursive: true }); fs.writeFileSync(outJ, JSON.stringify({ quando: new Date().toISOString(), prima: P, dopo: D }, null, 1));
  console.log('\nsalvato', outJ, '· secondi', P && P.s, D && D.s);
  await b.close(); srv.close();
});
