// [seduti] LA SONDA DEI SEDUTI: nel gioco vero (Chromium senza testa, SwiftShader) guarda ogni figura a ogni fotogramma:
//   - nessuno si muove (oltre 0,2 m/s, passo dichiarato o spostamento vero) con uno strato seduto acceso (siede, carte, tavola,
//     siede_terra, dorme, rotelle), tranne chi va sulla sedia con le rotelle E ha la sedia visibile;
//   - nessuno è seduto (siede, carte, tavola) all'aperto senza un sedile vero sotto (il registro di Anim, a meno di 0,8 m).
// Va nei posti affollati a due ore del giorno, poi si allontana e torna (le figure messe da parte e riprese dalla cache).
//   node strumenti/sonda_seduti.js [uscita.json]   POSTI=nome:x:y,…  ORE=10,18  ATTESA=25000
// Esce con 0 se non ci sono violazioni (e nessun errore di pagina), 1 altrimenti.
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || '/opt/node-tools/node_modules/playwright-core');
const root = path.resolve(__dirname, '..'), OUT = process.argv[2];
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.gz': 'application/gzip', '.bin': 'application/octet-stream' };
const PLACES = (process.env.POSTI || 'mercato:1275:343,borgo:1400:312').split(',').map(s => s.split(':')).map(([n, x, y]) => [n, +x, +y]);
const ORE = (process.env.ORE || '10,18').split(',').map(Number), ATTESA = +(process.env.ATTESA || 25000);
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const port = srv.address().port, T0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0)} s]`, ...a);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  let codice = 0; const rep = { tappe: [] };
  try {
    const pg = await b.newPage({ viewport: { width: 960, height: 600 } }), errori = [];
    pg.on('pageerror', e => { errori.push(e.message); console.log('[errore]', e.message); });
    await pg.goto(`http://localhost:${port}/index.html${process.env.QUERY || ''}`, { timeout: 600000, waitUntil: 'commit' });
    await pg.waitForFunction(() => window.__pv && window.__pv.st && window.Anim && Anim.sedutiReport, null, { timeout: 900000, polling: 500 });
    log('pronto'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(2500);
    await pg.evaluate(() => {
      const pv = window.__pv, st = pv.st; st.deadline = 1e12;
      setInterval(() => { const u = pv.ui; u.flash = 0; u.fade = 0; u.desat = false; u.dialog = null; u.book = false; u.menu = false; u.intro = false; st.over = null; st.chase = false; st.player.hp = 100; }, 50);
      // lo spione: dopo ogni Anim.apply (la figura vera) e ogni Anim.npcState (lo stato)
      const S = window.__sed = { fig: 0, sedutiVisti: 0, rotelleInMoto: 0, mossi: [], vuoto: [], stati: 0 };
      const ap = Anim.apply;
      Anim.apply = function (g, o, dt, t) {
        ap.apply(this, arguments); S.fig++;
        const R = g.userData.rig; if (!R) return;
        const v = Math.max(Math.abs(o.speed || 0), (o.anim && o.anim.velo) || 0), sedia = !!(g.userData.sediaR && g.userData.sediaR.visible);
        for (const k in R.layers) { if (!Anim.SEDUTE[k] || R.layers[k].w < .5) continue; S.sedutiVisti++;
          if (v > .2) { if (k === 'rotelle' && sedia) S.rotelleInMoto++; else if (S.mossi.length < 30) S.mossi.push({ k, v: +v.toFixed(2), sedia, x: +g.position.x.toFixed(1), z: +g.position.z.toFixed(1) }); } }
      };
      const ns = Anim.npcState;
      Anim.npcState = function (st0, n) {
        const s = ns.apply(this, arguments); S.stati++;
        if (s.act && Anim.SEDILE[s.act] && !s.sedile && !n.room && !n.inside && Anim.sediliOn() && !Anim.sedileNear(n.x, n.y, .8) && S.vuoto.length < 30) S.vuoto.push({ id: n.id, act: s.act, x: +n.x.toFixed(1), y: +n.y.toFixed(1) });
        return s;
      };
    });
    const vai = (x, y, h) => pg.evaluate(([x, y, h]) => { const pv = window.__pv, st = pv.st, p = st.player; p.x = x; p.y = y; p.indoor = null; p.vehicle = null; p.path = []; if (h != null) st.t = Math.floor(st.t / 1440) * 1440 + h * 60; if (pv.R.cam) { pv.R.cam.x = x; pv.R.cam.y = y; } }, [x, y, h]);
    for (const h of ORE) for (const [nome, x, y] of PLACES) {
      await vai(x, y, h); await pg.waitForTimeout(ATTESA);
      // via e ritorno: le figure lasciano la scena e tornano dalla cache
      await vai(x + 400, y, null); await pg.waitForTimeout(4000); await vai(x, y, null); await pg.waitForTimeout(ATTESA / 2);
      const r = await pg.evaluate(() => { const S = window.__sed, st = window.__pv.st; return { fig: S.fig, sedutiVisti: S.sedutiVisti, rotelleInMoto: S.rotelleInMoto, mossi: S.mossi.length, vuoto: S.vuoto.length, viol: Anim.sedutiReport(), rotelle: st.npcs.filter(n => n.rotelle).map(n => n.id) }; });
      log(nome, h + ':00', JSON.stringify(r)); rep.tappe.push(Object.assign({ nome, h }, r));
    }
    rep.dett = await pg.evaluate(() => ({ mossi: window.__sed.mossi, vuoto: window.__sed.vuoto }));
    rep.errori = errori;
    const fin = rep.tappe[rep.tappe.length - 1];
    if (fin.mossi || fin.vuoto || fin.viol.viol || errori.length) codice = 1;
    console.log(codice ? 'VIOLAZIONI: ' + JSON.stringify(rep.dett).slice(0, 1500) : `nessuno si muove seduto, nessuno seduto nel vuoto (${fin.sedutiVisti} figure-fotogramma sedute, ${fin.rotelleInMoto} in sedia con le rotelle in moto)`);
  } catch (e) { console.error(e); codice = 2; }
  if (OUT) fs.writeFileSync(OUT, JSON.stringify(rep, null, 1));
  await b.close(); srv.close(); process.exit(codice);
});
