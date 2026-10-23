// [cinema] LE FOTO DEGLI INTERNI: entra in un edificio per tipo (Interior.kindOf) e scatta il piano terra (e il primo, se c'è),
// sempre alla stessa ora, per giudicare luce, arredo e disposizione prima e dopo ogni ritocco. Stesso motore di galleria.js
// (Chromium senza testa con SwiftShader, il gioco vero servito da qui).
//   node strumenti/interni_foto.js <cartella> [tipi separati da virgola] [ora in minuti]
//   INTERNI_ELENCO=1: stampa i tipi di edificio che ci sono (e quanti) ed esce. PIANI=0,1: quali piani. PV_PAGINA=altra.html.
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const [outDir, kinds0, ora0] = process.argv.slice(2);
if (!outDir) { console.log('uso: node strumenti/interni_foto.js <cartella> [tipi] [ora in minuti]'); process.exit(1); }
const root = path.resolve(__dirname, '..'), KINDS = (kinds0 || 'casa,bar,trattoria,ufficio,ambulatorio,albergo,emporio,caserma').split(','), ORA = +(ora0 || 21 * 60 + 30);
const PIANI = (process.env.PIANI || '0').split(',').map(Number);
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream' };
fs.mkdirSync(outDir, { recursive: true });
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const port = srv.address().port, t0 = Date.now();
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: +(process.env.LARGO || 1280), height: +(process.env.ALTO || 800) } });
  pg.on('pageerror', e => console.log('[errore]', e.message, (e.stack || '').split('\n').slice(0, 3).join(' | ')));
  pg.on('console', m => { if (m.type() === 'error') console.log('[console]', m.text().slice(0, 240)); });
  await pg.addInitScript(() => { window.__pulita = true; });
  await pg.goto(`http://localhost:${port}/${process.env.PV_PAGINA || 'index.html'}`);
  await pg.waitForFunction(() => window.__pv && window.__pv.st, null, { timeout: 600000 });
  // l'introduzione si chiude solo quando i programmi della scheda sono pronti (anche un minuto e mezzo): si preme Invio finché non è chiusa
  for (let i = 0; i < 60 && await pg.evaluate(() => window.__pv.ui.intro); i++) { await pg.keyboard.press('Enter'); await pg.waitForTimeout(5000); }
  await pg.addStyleTag({ content: '#app > *:not(#cv) { visibility: hidden !important; } #bubbles, #hover, #moment, #xhair, #ring, #touch { display: none !important; }' });
  await pg.evaluate(() => { const pv = window.__pv, st = pv.st; st.deadline = 1e12;
    setInterval(() => { const u = pv.ui; u.flash = 0; u.fade = 0; u.desat = false; u.letterbox = false; u.dialog = null; u.book = false; u.menu = false; st.over = null; st.chase = false; st.player.hp = 100; }, 50); });
  console.log('caricato in', ((Date.now() - t0) / 1000).toFixed(0), 's');
  if (process.env.INTERNI_ELENCO) {
    const k = await pg.evaluate(() => { const G = window.__pv.G, c = {}; G.BUILDINGS.forEach(b => { if (!b.door) return; const k = G.INT.kindOf(b); c[k] = (c[k] || 0) + 1; }); return c; });
    console.log(JSON.stringify(k)); await b.close(); srv.close(); return;
  }
  for (const kind of KINDS) {
    // l'edificio: il primo di quel tipo (o quello col nome, «kind:Nome»), il più grande a parità
    const [k0, nome] = kind.split(':');
    const bi = await pg.evaluate(([k0, nome]) => { const G = window.__pv.G; let best = -1, area = 0; G.BUILDINGS.forEach((b, i) => { if (!b.door || G.INT.kindOf(b) !== k0) return; if (nome && !((b.label || b.name || '').includes(nome))) return; const a = b.w * b.h; if (a > area) { area = a; best = i; } }); return best; }, [k0, nome]);
    if (bi < 0) { console.log('nessun edificio', kind); continue; }
    for (const f of PIANI) {
      const ok = await pg.evaluate(([bi, f, ora]) => {
        const pv = window.__pv, st = pv.st, p = st.player, G = pv.G, b = G.BUILDINGS[bi], L = G.INT.layout(b); if (!L.floors[f]) return null;
        let t = Math.floor(st.t / 1440) * 1440 + ora; if (t < st.t - 1) t += 1440; st.t = t;
        p.vehicle = null; p.indoor = { b: bi, f }; p.path = [];
        // il personaggio nella stanza più grande, in un punto libero
        const F = L.floors[f], q = F.rooms.slice().sort((a, c) => c.w * c.h - a.w * a.h)[0], e = f === 0 && L.ent ? L.ent.in : [q.x + q.w / 2, q.y + q.h / 2];
        const s = G.INT.nearFree ? G.INT.nearFree(L, f, q.x + q.w / 2, q.y + q.h / 2) : null; p.x = s ? s[0] : e[0]; p.y = s ? s[1] : e[1];
        const [X0, Y0, W, H] = L.box; pv.ui.focus = { x: X0 + W / 2, y: Y0 + H / 2 }; pv.ui.zoom = Math.max(.6, Math.min(1.4, Math.max(W, H) / 22));
        return { nome: b.label || b.name, kind: G.INT.kindOf(b), piani: L.floors.length, stanze: F.rooms.map(q => q.name) };
      }, [bi, f, ORA]);
      if (!ok) continue;
      // la foto dalla tela, subito dopo un fotogramma del gioco (con SwiftShader un fotogramma dura anche minuti: lo screenshot della pagina scade).
      // Prima due fotogrammi: il piano si costruisce nel primo, i modelli del kit arrivano dopo
      // Entrando cambiano le luci e i programmi della scheda si ricompilano: finché non sono pronti il fotogramma è nero. Si riprova finché
      // la foto non ha luce (luminosità media sopra 6 su 255), al massimo dodici volte
      // (la tela non tiene il disegno: si fotografa la pagina, che sotto SwiftShader aspetta anche minuti il suo fotogramma).
      // Si aspetta che il gioco abbia girato almeno qualche fotogramma col piano costruito (ui.time avanza solo quando disegna)
      const t1 = await pg.evaluate(() => window.__pv.ui.time);
      await pg.waitForFunction(t1 => window.__pv.ui.time > t1 + +(window.__attesaFot || .3), t1, { timeout: 900000, polling: 1000 });
      const file = path.join(outDir, `${k0}${nome ? '_' + nome.replace(/\W+/g, '') : ''}_p${f}.png`);
      await pg.screenshot({ path: file, timeout: 900000 });
      console.log(file, JSON.stringify(ok), ((Date.now() - t0) / 1000).toFixed(0), 's');
    }
  }
  await b.close(); srv.close();
});
