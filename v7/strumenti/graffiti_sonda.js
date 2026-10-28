// [graffiti] LA SONDA DEI GRAFFITI: nel gioco vero (Chromium senza testa, SwiftShader) conta i lavori che galleggiano e fa le foto da vicino.
//   node strumenti/graffiti_sonda.js [cartella] [--scorcio=ottagono] [--raggio=75] [--foto=3] [--nome=prima] [--query=&altro]
// Galleggia un lavoro se un punto del suo velo (griglia 5 × 4) sta a più di 2 cm dal muro sotto (raggio lungo la normale, dal
// davanti), se sotto non c'è muro (sporge da uno spigolo, sopra un'apertura o nel vuoto) o se il muro sotto gira (normale diversa).
// Esce con 0 se i lavori galleggianti sono 0 (e nessun errore di pagina), 1 altrimenti. Scrive <cartella>/<nome>_sonda.json.
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const ARG = {}, POS = [];
for (const a of process.argv.slice(2)) { const m = /^--([a-z]+)=(.*)$/.exec(a); if (m) ARG[m[1]] = m[2]; else POS.push(a); }
const root = path.resolve(__dirname, '..'), outDir = path.resolve(POS[0] || path.join(require('os').tmpdir(), 'graffiti')), NOME = ARG.nome || 'sonda';
const Q = `?scorcio=${ARG.scorcio || 'ottagono'}${ARG.raggio ? '&raggio=' + ARG.raggio : ''}${ARG.query || ''}`;
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream' };
fs.mkdirSync(outDir, { recursive: true });
const t0 = Date.now(), sec = () => ((Date.now() - t0) / 1000).toFixed(0) + ' s';
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  let codice = 0;
  try {
    const pg = await b.newPage({ viewport: { width: 960, height: 600 } });
    const errori = []; pg.on('pageerror', e => { errori.push(e.message); console.log('[errore]', e.message, (e.stack || '').split('\n').slice(0, 3).join(' | ')); });
    pg.on('console', m => { if (/\[Writing\]|\[graffiti\]/.test(m.text())) console.log('[console]', m.text().slice(0, 240)); });
    await pg.addInitScript(() => { window.__pulita = true; });
    await pg.goto(`http://localhost:${srv.address().port}/${ARG.pagina || "index.html"}${Q}`);
    await pg.waitForFunction(() => window.__pv && window.__pv.st, null, { timeout: 900000, polling: 500 });
    console.log('pronto in', sec());
    await pg.keyboard.press('Enter'); await pg.waitForTimeout(500);
    await pg.addStyleTag({ content: '#app > *:not(#cv) { visibility: hidden !important; } #bubbles, #hover, #moment, #xhair, #ring, #touch { display: none !important; }' });
    await pg.evaluate(() => { const pv = window.__pv, st = pv.st; st.deadline = 1e12; window.__meteo = 'sereno'; st.t = Math.floor(st.t / 1440) * 1440 + 15 * 60;
      setInterval(() => { const u = pv.ui; u.flash = 0; u.fade = 0; u.desat = false; u.letterbox = false; u.dialog = null; u.book = false; u.menu = false; u.intro = false; st.over = null; st.chase = false; st.player.hp = 100; st.player.path = []; }, 50); });
    const fot = () => pg.evaluate(() => new Promise(r => requestAnimationFrame(() => r())));
    // i muri dipinti attorno al centro: lo scan di corsa, finché il disegnatore ha finito
    for (let k = 0; k < 40; k++) {
      const n = await pg.evaluate(() => { const pv = window.__pv, R = pv.R, st = pv.st, c = (R.scoCentro && R.scoCentro()) || { x: st.player.x, z: st.player.y }; Writing._.scanNear(st, c.x, c.z, { force: true, ms: 200 }); return { veli: Object.keys(Writing.GFX.works).length, pend: Writing._.ARTW.pend.size }; });
      await pg.waitForTimeout(1500); await fot();
      if (k > 6 && n.pend === 0) { console.log('veli', n.veli, 'in', sec()); break; }
    }
    const conta = await pg.evaluate(() => Writing._.galleggia ? Writing._.galleggia() : null);
    const rep = conta || await pg.evaluate(() => {   // la misura per la versione di prima (senza Writing._.galleggia)
      const THREE = window.THREE, pv = window.__pv, R = pv.R, W = Writing.S(pv.st), rc = new THREE.Raycaster(), out = { n: 0, gall: 0, lista: [] };
      for (const id in Writing.GFX.works) { const g = Writing.GFX.works[id], w = W.works.find(o => o.id === +id); if (!w || !g.tgt || !g.tgt.mesh || w.surf !== 'muro' || !w.gfxRect) continue;
        const m = g.tgt.mesh; m.updateMatrixWorld(true); const n = new THREE.Vector3(0, 0, 1).transformDirection(m.matrixWorld), list = R.__bmb.bmbCands(m.position.x, m.position.z).filter(o => !o.userData.velo);
        let worst = 0, bad = 0; for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) { const p = new THREE.Vector3((i / 4 - .5) * .96 * w.gfxRect.W, (j / 3 - .5) * .96 * w.gfxRect.H, 0).applyMatrix4(m.matrixWorld);
          rc.set(p.clone().addScaledVector(n, .5), n.clone().negate()); rc.far = 1.5; const h = rc.intersectObjects(list, false).find(h => { let mt = h.object.material; if (Array.isArray(mt)) mt = mt[h.face.materialIndex]; return mt && mt.visible !== false && !(mt.transparent && mt.opacity < .3); });
          const d = h ? Math.abs(h.distance - .5) : 9; worst = Math.max(worst, d); if (d > .02) bad++; }
        out.n++; if (bad) { out.gall++; out.lista.push({ id: w.id, style: w.style, peggio: +worst.toFixed(3), punti: bad }); } }
      return out; });
    console.log(`lavori sui muri misurati: ${rep.n}, galleggianti: ${rep.gall}`);
    // il costo del piazzamento: dieci lavori rifatti da capo (il muro, la griglia dei raggi)
    rep.piazza = await pg.evaluate(() => { const W = Writing.S(window.__pv.st), L = W.works.filter(w => w.surf === 'muro' && w.spot && w.gfxRect).slice(0, 10), t = []; L.forEach(w => { const k = Object.assign({}, w, { gfxRect: null }); const t0 = performance.now(); Writing._.placeWall(k); t.push(performance.now() - t0); }); return { n: t.length, ms: t.length ? +(t.reduce((a, b) => a + b, 0) / t.length).toFixed(1) : 0, max: t.length ? +Math.max(...t).toFixed(1) : 0 }; });
    rep.mem = await pg.evaluate(() => { const G0 = Writing.GFX; let px = 0, n = 0; for (const id in G0.works) { const g = G0.works[id]; if (g.tgt && g.tgt.mesh && g.tgt.c && g.tgt.c.width) { px += g.tgt.c.width * g.tgt.c.height; n++; } } return { veli: n, mpx: +(px / 1e6).toFixed(2), mb: +(px * 4 / 1048576).toFixed(1), conti: G0.mem || null }; });
    console.log('piazzamento', JSON.stringify(rep.piazza), 'memoria dei veli', JSON.stringify(rep.mem));
    // le foto da vicino: i lavori più grandi in vista, la camera davanti al muro
    const nf = +(ARG.foto || 3), COME = ARG.come ? JSON.parse(fs.readFileSync(ARG.come, 'utf8')).foto : null;   // --come=prima_sonda.json: gli stessi muri della foto di prima
    const scelti = COME ? COME.map((q, k) => -1 - k) : await pg.evaluate(nf => { const W = Writing.S(window.__pv.st); return Object.keys(Writing.GFX.works).map(id => W.works.find(o => o.id === +id)).filter(w => w && w.surf === 'muro' && w.gfxRect && Math.abs(w.gfxRect.n.y) < .5).sort((a, b) => b.W * b.H - a.W * a.H || a.id - b.id).slice(0, nf).map(w => w.id); }, nf);
    for (let k = 0; k < scelti.length; k++) {
      rep.foto = rep.foto || [];
      const fq = await pg.evaluate(([id, Q]) => { const pv = window.__pv, R = pv.R, st = pv.st, W = Writing.S(st), w = Q ? null : W.works.find(o => o.id === id), c = Q ? Q.c : w.gfxRect.c, n = Q ? Q.n : w.gfxRect.n, d = Q ? Q.d : Math.max(3, w.gfxRect.W * 1.1);
        const x = c.x + n.x * d, z = c.z + n.z * d; st.player.x = c.x + n.x * (d + 30); st.player.y = c.z + n.z * (d + 30);   // il personaggio fuori quadro
        R.scorcio.cam = { x: c.x, z: c.z, yaw: Math.atan2(n.x, n.z) + Math.PI, pitch: .12, dist: d, fov: 38, y: c.y };
        window.__sondaCam = { x, y: c.y + .2, z, tx: c.x, ty: c.y, tz: c.z }; return { c: { x: c.x, y: c.y, z: c.z }, n: { x: n.x, y: n.y || 0, z: n.z }, d }; }, [scelti[k], COME ? COME[k] : null]);
      rep.foto.push(fq); fs.writeFileSync(path.join(outDir, NOME + '_sonda.json'), JSON.stringify(rep, null, 1));
      for (let j = 0; j < 4; j++) await fot();
      const url = await pg.evaluate(() => new Promise(res => requestAnimationFrame(() => { const pv = window.__pv, R = pv.R, cam = R.getCamera(), q = window.__sondaCam; const keep = { p: cam.position.clone(), q: cam.quaternion.clone(), f: cam.fov };
        cam.position.set(q.x, q.y, q.z); cam.lookAt(q.tx, q.ty, q.tz); cam.fov = 40; cam.updateProjectionMatrix(); cam.updateMatrixWorld(true);
        const rd = R.__models.renderer; rd.render(R.__models.scene, cam); const u = document.getElementById('cv').toDataURL('image/png'); cam.position.copy(keep.p); cam.quaternion.copy(keep.q); cam.fov = keep.f; cam.updateProjectionMatrix(); res(u); })));
      const file = path.join(outDir, `${NOME}_muro${k + 1}.png`); fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64')); console.log('foto', file);
    }
    if (errori.length) { console.log('ERRORI DI PAGINA:', errori.length); codice = 1; }
    if (rep.gall) codice = 1;
  } catch (e) { console.error(e); codice = 2; }
  await b.close(); srv.close(); process.exit(codice);
});
