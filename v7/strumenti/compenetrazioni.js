// [pulizia2] Il validatore delle compenetrazioni e dei segni del gioco (città nuova).
// Carica il gioco vero in Chromium senza testa (la geometria vera: le scatole delle mesh posate, girate e fuse), legge il registro
// del regista finale di render.js (window.__pulizia2: la misura prima e dopo la sua passata) e stampa, per tipo:
//   muro         oggetti dentro i muri delle case (un vertice oltre 3 cm)
//   urto         oggetti che si compenetrano fra loro (coppie, oltre 3 cm)
//   porta        cose davanti a una porta praticabile (entro 1 m dalla soglia, fino a 2,3 m d'altezza)
//   vetrina      cose davanti a una vetrina (entro 1 m)
//   scala        cose ai piedi di una scala (1 m)
//   tombino      cose attorno a un tombino (0,8 m)
//   carreggiata  arredo a terra sulla carreggiata asfaltata
//   tenda        tende che toccano balconi, insegne, lampioni
//   sospeso      arredo a terra sospeso nel vuoto
//   sotto        arredo sotto il suolo
//   coperto      praticabili (porte, scale, tombini, passerelle) coperti in proiezione dalla camera di gioco (oltre il 12%)
//   pezzo        lo stesso, ma per colpa di un pezzo urbano grande di [posa] (portici, archi, mura, tettoie): architettura, si conta a parte
// e salva il json (reports/compenetrazioni.json) e la pianta dei punti prima/dopo (reports/compenetrazioni.png).
//   node strumenti/compenetrazioni.js [--spento] [uscita.json]
//   --spento: il regista misura soltanto (?nopulizia2), per vedere com'era.
// [tetti3] in più i tetti (window.__tetti3): oggetti per tetto e compenetrazioni dei gruppi del piano; TETTI3_ESIGI=1 esce con errore se non sono zero.
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const root = path.resolve(__dirname, '..'), args = process.argv.slice(2), spento = args.includes('--spento');
const outJ = path.resolve(args.find(a => a.endsWith('.json')) || path.join(root, 'reports', spento ? 'compenetrazioni_prima.json' : 'compenetrazioni.json')), outP = outJ.replace(/\.json$/, '.png');
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream' };
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const t0 = Date.now(), b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: 480, height: 300 } });
  pg.on('pageerror', e => console.log('[errore]', e.message, (e.stack || '').split('\n').slice(0, 3).join(' | ')));
  pg.on('console', m => { if (m.type() === 'error' || /pulizia2/.test(m.text())) console.log('[console]', m.text().slice(0, 400)); });
  await pg.addInitScript(() => { window.__dbg35 = true; });
  await pg.goto(`http://localhost:${srv.address().port}/${process.env.PV_PAGINA || 'index.html'}?cittanuova${spento ? '&nopulizia2' : ''}`);   // [tetti3] PV_PAGINA=altra.html: un'altra build (il prima)
  await pg.waitForFunction(() => window.__pulizia2, null, { timeout: 900000, polling: 2000 });
  const R = await pg.evaluate(() => window.__pulizia2);
  // [tetti3] I TETTI: il conto degli oggetti per tetto (case con l'epoca) e le compenetrazioni misurate sul modello vero dei gruppi del piano
  const T3 = await pg.evaluate(() => window.__tetti3 ? window.__tetti3() : null);
  if (T3) { console.log('\n[tetti3] tetti', T3.tetti, 'oggetti', T3.oggetti, 'media per tetto', T3.media, 'massimo', T3.max, 'tetti vuoti', T3.vuoti, 'piano', T3.piano);
    console.log('[tetti3] istogramma (oggetti: tetti)', JSON.stringify(T3.istogramma), 'per epoca', JSON.stringify(T3.perEra));
    if (T3.verifica) console.log('[tetti3] piano', JSON.stringify(T3.verifica));
    const ut = {}; (T3.urti || []).forEach(u => ut[u[2]] = (ut[u[2]] || 0) + 1);
    console.log('[tetti3] compenetrazioni sui tetti', (T3.urti || []).length, JSON.stringify(ut)); (T3.urti || []).slice(0, 30).forEach(u => console.log('  ' + u.join('  ')));
    if (process.env.TETTI3_ESIGI && (T3.urti || []).length) process.exitCode = 1; }
  // [scorci] GLI SCORCI: il costo di ognuno (window.__scorci) e le compenetrazioni dei loro pezzi, che il regista misura come le altre voci
  // (fissi: non li sposta; quello che resta, coi pezzi degli scorci da una parte o dall'altra, si stampa). SCORCI_ESIGI=1 esce con errore se non sono zero.
  const SCO = await pg.evaluate(() => window.__scorci ? window.__scorci() : null);
  if (SCO) { console.log('\n[scorci] scorci', SCO.scorci.length, '· posati in', SCO.ms, 'ms · tessere dell\'atlante', SCO.atlante);
    SCO.scorci.forEach(q => console.log(`  ${q.id.padEnd(20)} ${String(q.draws).padStart(3)} chiamate ${String(q.tri).padStart(6)} tri  ${q.pezzi} pezzi${q.scarti.length ? '  lasciati: ' + q.scarti.join('; ') : ''}`));
    const tocca = P => (P || []).filter(p => /scorcio/.test(String(p[3])) || /scorcio/.test(String(p[5])));
    const sp = tocca(R.punti.prima), sd = tocca(R.punti.dopo), per = {}; sd.forEach(p => per[p[0]] = (per[p[0]] || 0) + 1);
    console.log('[scorci] compenetrazioni coi pezzi degli scorci: prima del regista', sp.length, '· dopo', sd.length, JSON.stringify(per)); sd.slice(0, 40).forEach(p => console.log('  ' + p.join('  ')));
    if (process.env.SCORCI_ESIGI && sd.length) process.exitCode = 1; }
  console.log('caricato in', Math.round((Date.now() - t0) / 1000), 's; voci', R.prima.voci, '→', R.dopo.voci, '; case', R.prima.case, '; il muro del kit sporge', (R.kit || 0).toFixed(3), 'm');
  console.log('praticabili', JSON.stringify(R.prima.praticabili));
  const tipi = Object.keys(R.prima.per), pad = (s, n) => String(s).padEnd(n), lp = (s, n) => String(s).padStart(n);
  console.log('\n' + pad('tipo', 13) + lp('prima', 7) + lp('dopo', 7));
  tipi.forEach(t => console.log(pad(t, 13) + lp(R.prima.per[t], 7) + lp(R.dopo.per[t], 7)));
  console.log(pad('totale', 13) + lp(R.prima.tot, 7) + lp(R.dopo.tot, 7));
  console.log('\nazioni del regista', JSON.stringify(R.azioni));
  const top = (o, n) => Object.entries(o).sort((a, c) => c[1] - a[1]).slice(0, n).map(([k, v]) => k + ' ' + v).join(' · ');
  console.log('\nprima, per voce:', top(R.prima.perVoce, 24)); console.log('prima, per passo:', top(R.prima.perPasso, 16));
  console.log('\ndopo, per voce:', top(R.dopo.perVoce, 24) || '—'); console.log('dopo, per passo:', top(R.dopo.perPasso, 16) || '—');
  if (R.punti.dopo.length) { console.log('\nquello che resta (tipo, x, z, voce, passo, contro, quota):'); R.punti.dopo.slice(0, 60).forEach(p => console.log('  ' + p.join('  '))); }
  fs.mkdirSync(path.dirname(outJ), { recursive: true });
  fs.writeFileSync(outJ, JSON.stringify({ quando: new Date().toISOString(), spento, prima: R.prima, dopo: R.dopo, azioni: R.azioni, punti: R.punti, tetti3: T3 }, null, 1));
  // la pianta: le case, i punti per tipo, prima a sinistra e dopo a destra
  const png = await pg.evaluate(R => {
    const G = window.__pv.G, B = G.BUILDINGS, TS = G.TS, all = R.punti.prima.concat(R.punti.dopo);
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity; all.forEach(p => { x0 = Math.min(x0, p[1]); x1 = Math.max(x1, p[1]); z0 = Math.min(z0, p[2]); z1 = Math.max(z1, p[2]); });
    if (!isFinite(x0)) { x0 = 1200; x1 = 1550; z0 = 200; z1 = 450; } x0 -= 10; x1 += 10; z0 -= 10; z1 += 10;
    const S = Math.min(900 / (x1 - x0), 900 / (z1 - z0)), W = Math.ceil((x1 - x0) * S), H = Math.ceil((z1 - z0) * S), c = document.createElement('canvas'); c.width = W * 2 + 30; c.height = H + 120; const x = c.getContext('2d');
    const COL = { muro: '#d0202a', urto: '#ff8a00', porta: '#1060ff', vetrina: '#20b0e0', scala: '#a020f0', tombino: '#00a060', carreggiata: '#202020', tenda: '#e040a0', sospeso: '#a08000', sotto: '#704020', coperto: '#ff00ff', pezzo: '#808080' };
    x.fillStyle = '#f4f1ea'; x.fillRect(0, 0, c.width, c.height);
    [[R.punti.prima, 0, 'prima del regista: ' + R.prima.tot], [R.punti.dopo, W + 30, 'dopo: ' + R.dopo.tot]].forEach(([P, ox, tit]) => {
      x.fillStyle = '#c9c2b4'; B.forEach(b => { const X = (b.x * TS - x0) * S, Z = (b.y * TS - z0) * S; if (X > W || Z > H || X + b.w * TS * S < 0 || Z + b.h * TS * S < 0) return; x.fillRect(ox + X, Z, b.w * TS * S, b.h * TS * S); });
      P.forEach(p => { x.fillStyle = COL[p[0]] || '#000'; x.beginPath(); x.arc(ox + (p[1] - x0) * S, (p[2] - z0) * S, 2.6, 0, 7); x.fill(); });
      x.fillStyle = '#111'; x.font = 'bold 16px sans-serif'; x.fillText(tit, ox + 8, H + 22); });
    let lx = 8; x.font = '13px sans-serif'; Object.keys(COL).forEach(k => { x.fillStyle = COL[k]; x.fillRect(lx, H + 40, 12, 12); x.fillStyle = '#111'; x.fillText(k, lx + 16, H + 51); lx += x.measureText(k).width + 34; });
    x.fillStyle = '#333'; x.fillText(`x ${Math.round(x0)}–${Math.round(x1)}  z ${Math.round(z0)}–${Math.round(z1)}  (${S.toFixed(2)} px/m)`, 8, H + 80);
    return c.toDataURL('image/png');
  }, R);
  fs.writeFileSync(outP, Buffer.from(png.split(',')[1], 'base64'));
  console.log('\nsalvati', outJ, outP);
  await b.close(); srv.close();
});
