// [pieno] IL CENSIMENTO DELLA STRADA nel gioco vero (Chromium senza testa, SwiftShader, la città costruita nel browser ?cittanuova):
// tutto quello che sta a livello della strada, con la sua posizione, per la misura per 10 m di fronte (strumenti/pieno_misura.js).
//   - il registro del regista (R.__vis3.reg: porte, vetrine, insegne, serrande, tende, citofoni, applique, pluviali, tabelloni, bucato,
//     lampioni, cartelli, arredo, ingombri...): tipo, centro, quota, larghezza;
//   - gli oggetti statici posati (Pavimenti.oggetto, come censimento_scena.js): nome, centro, misure;
//   - i lavori dei writer già sul muro alla partenza (st.wr.works: stile, centro, larghezza, altezza).
//   node strumenti/pieno_censimento.js [uscita.json]     (da v7; V7DIR=<altra build> per misurarne un'altra; 4-6 minuti)
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || '/opt/node-tools/node_modules/playwright-core');
const ROOT = process.env.V7DIR || path.resolve(__dirname, '..'), OUT = path.resolve(process.argv[2] || path.join(__dirname, '..', 'reports', 'pieno_censimento.json'));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.gz': 'application/gzip', '.bin': 'application/octet-stream', '.webp': 'image/webp' };
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(ROOT, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const T0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0)} s]`, ...a);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: 480, height: 300 } });
  pg.on('pageerror', e => log('[errore]', e.message.slice(0, 200)));
  await pg.addInitScript(() => {
    let a = 4242; Math.random = function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    window.__pulita = true; const REC = window.__pienoC = [];
    const hook = () => { const P = window.Pavimenti; if (!P || !P.oggetto || P.__pienoC) return false; const orig = P.oggetto; P.__pienoC = true;
      P.oggetto = function (obj, nome) { const dy = orig.apply(this, arguments);
        try { if (typeof THREE !== 'undefined' && obj) { const bx = new THREE.Box3().setFromObject(obj); if (!bx.isEmpty()) { const s = bx.getSize(new THREE.Vector3()), c = bx.getCenter(new THREE.Vector3());
          REC.push([nome || obj.name || '?', +c.x.toFixed(2), +bx.min.y.toFixed(2), +c.z.toFixed(2), +s.x.toFixed(2), +s.y.toFixed(2), +s.z.toFixed(2)]); } } } catch (e) { }
        return dy; };
      return true; };
    const iv = setInterval(() => { if (hook()) clearInterval(iv); }, 5);
  });
  await pg.goto(`http://localhost:${srv.address().port}/index.html?cittanuova`, { timeout: 240000, waitUntil: 'commit' });
  await pg.waitForFunction(() => window.__pulizia2 && window.__pv && window.__pv.st && window.__pv.R && window.__pv.R.__vis3 && window.__pv.R.__vis3.reg, null, { timeout: 1800000, polling: 3000 });
  log('caricato');
  // la partita comincia (la storia dei muri si fa al primo passo del gioco: writer_vita.js history), poi si aspetta che i lavori ci siano
  await pg.keyboard.press('Enter').catch(() => {}); await pg.waitForTimeout(3000);
  await pg.waitForFunction(() => !window.__pv.ui.intro, null, { timeout: 240000, polling: 1000 }).catch(() => log('ancora nella schermata iniziale'));
  await pg.evaluate(() => { const pv = window.__pv; pv.st.deadline = 1e12; setInterval(() => { const u = pv.ui; u.dialog = null; pv.st.over = null; }, 200); });
  await pg.waitForFunction(() => { const w = window.__pv.st.wr; return w && w.works && w.works.length > 100; }, null, { timeout: 600000, polling: 3000 }).catch(() => log('pochi lavori'));
  await pg.waitForTimeout(5000);
  // lo strato del pieno: la pianta di tutta la città (di solito si fa a celle attorno alla camera)
  log('pieno', JSON.stringify(await pg.evaluate(() => { if (typeof Pieno === 'undefined' || !Pieno.tutto) return null; const t0 = performance.now(); const S = Pieno.tutto(window.__pv.st, 1222, 250, 1610, 420); return Object.assign({ ms: Math.round(performance.now() - t0), voci: Pieno.elenco().length }, S); }).catch(e => String(e))));
  const R = await pg.evaluate(() => {
    const pv = window.__pv, reg = pv.R.__vis3.reg || [];
    const ctr = B => [B.u0 + B.u1, B.v0 + B.v1].map(v => v / 2), xz = B => { const [u, v] = ctr(B); return [u * B.c + v * B.s, -u * B.s + v * B.c]; };
    const voci = reg.map(e => { const [x, z] = xz(e.B); return [e.k + (e.tipo ? ':' + e.tipo : ''), +x.toFixed(2), +e.B.y0.toFixed(2), +z.toFixed(2), +(e.B.u1 - e.B.u0).toFixed(2), +(e.B.v1 - e.B.v0).toFixed(2), +(e.B.y1 - e.B.y0).toFixed(2), e.src || '']; });
    const wr = (pv.st.wr && pv.st.wr.works) || [];
    const lavori = wr.map(w => { const r = w.gfxRect, c = r && r.c ? r.c : w.pos ? w.pos : w.spot ? { x: w.spot.x, y: -999, z: w.spot.y } : null; return c ? [w.style || w.kind || '?', +c.x.toFixed(2), +c.y.toFixed(2), +c.z.toFixed(2), r ? +(+r.W).toFixed(2) : 0, r ? +(+r.H).toFixed(2) : 0, w.by || '', w.sdStrato || '', w.anchor || (w.palo ? 'palo' : '')] : null; }).filter(Boolean);
    const pieno = typeof Pieno !== 'undefined' && Pieno.elenco ? Pieno.elenco() : [];
    return { voci, pieno, statici: window.__pienoC, lavori, tasselli: !!(window.__tasselli && window.__tasselli.on), stileE: typeof StileE !== 'undefined' ? StileE.on : null, sd: typeof StradaDipinta !== 'undefined' ? StradaDipinta.attiva && StradaDipinta.attiva() : null };
  });
  fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(R));
  log('voci', R.voci.length, 'statici', R.statici.length, 'lavori', R.lavori.length, 'tasselli', R.tasselli, 'stileE', R.stileE, 'sd', R.sd, '→', OUT);
  await b.close(); srv.close();
});
