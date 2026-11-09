// [muri_vuoto] LA SONDA DELLE TAVOLE: il gioco vero (Chromium senza testa, SwiftShader; da far girare con lo slot condiviso dei browser),
// per ogni posto di un elenco (strumenti/muri_vuoto.js out.json posti.json): il personaggio davanti al caso (la camera del gioco guarda
// sempre dallo stesso verso: il posto si sceglie prima del pezzo di muro e di lato, su una casella calpestabile), la camera assestata,
// la foto della tela, la proiezione dei punti segnati (per cerchiarli) e i raggi orizzontali contro il filo della facciata (sonde: oltre
// lo spigolo, dove la scatola della casa è finita, e uno di controllo sul muro vero). Con { solo: true } niente foto, solo i raggi;
// con raggi: [[u, v]] (frazioni dello schermo) chi c'è sotto ogni punto.
//   TASS=<cartella dei tasselli> node strumenti/muri_vuoto_foto.js <cartella v7> <posti.json> <uscita> [query]
// Il rapporto: <uscita>/rep.json. Le tavole: python3 strumenti/fogli_muri_vuoto.py.
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const [root, postiF, outDir, QUERY] = process.argv.slice(2);
const POSTI = JSON.parse(fs.readFileSync(postiF, 'utf8'));
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.gz': 'application/gzip' };
fs.mkdirSync(outDir, { recursive: true });
const t0 = Date.now(), sec = () => ((Date.now() - t0) / 1000).toFixed(0) + ' s';
const srv = http.createServer((req, res) => { let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html'; if (u.startsWith('/api/')) { res.writeHead(200); res.end('{"ok":false}'); return; }
  const p = process.env.TASS && u.startsWith('/tasselli/') ? path.join(process.env.TASS, u.slice(10)) : path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); }).listen(0, async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const errori = [], rep = [];
  try {
    const pg = await b.newPage({ viewport: { width: 640, height: 360 } });
    pg.on('pageerror', e => { errori.push(e.message); console.log('[errore]', e.message); });
    await pg.addInitScript(() => { window.__pulita = true; });
    await pg.goto(`http://localhost:${srv.address().port}/index.html?x=1${QUERY || ''}`, { timeout: 0 });
    await pg.waitForFunction(() => window.__pv && window.__pv.st, null, { timeout: 1800000, polling: 1000 });
    console.log('pronto in', sec());
    await pg.keyboard.press('Enter'); await pg.waitForTimeout(500);
    await pg.addStyleTag({ content: '#app > *:not(#cv) { visibility: hidden !important; } #bubbles, #hover, #moment, #xhair, #ring, #touch { display: none !important; }' });
    await pg.evaluate(() => { const pv = window.__pv, st = pv.st; st.deadline = 1e12; window.__meteo = 'sereno';
      setInterval(() => { const u = pv.ui; u.flash = 0; u.fade = 0; u.desat = false; u.letterbox = false; u.dialog = null; u.book = false; u.menu = false; u.intro = false; st.over = null; st.chase = false; st.player.hp = 100; st.player.path = []; st.t = Math.floor(st.t / 1440) * 1440 + 15 * 60; }, 50); });
    await pg.waitForTimeout(8000);
    console.log('stato', JSON.stringify(await pg.evaluate(() => ({ tasselli: !!(window.Tasselli && Tasselli.attivo && Tasselli.attivo()), stileE: typeof StileE !== 'undefined' ? StileE.on : null }))));
    const fot = () => pg.evaluate(() => new Promise(r => requestAnimationFrame(() => r())));
    for (let i = 0; i < POSTI.length; i++) {
      const P = POSTI[i];
      if (P.caso) { // il posto davanti al caso: fuori dal muro, di sbieco, su una casella calpestabile; la testa verso il pezzo di muro
        const Z = await pg.evaluate(C => { const G = Game, wk = (x, y) => G.walkT(Math.floor(x / G.TS), Math.floor(y / G.TS)); const [qx, qy] = C.Q, [nx, ny] = C.N, [ux, uy] = C.U;
          const cd = new window.THREE.Vector3(); window.__pv.R.getCamera().getWorldDirection(cd); const l0 = Math.hypot(cd.x, cd.z) || 1, dx = cd.x / l0, dz = cd.z / l0, rx = -dz, rz = dx;   // la camera del gioco guarda sempre di qui: il posto prima del caso, di lato
          for (const [a, b] of [[2, 2.2], [2, -2.2], [3, 2.5], [3, -2.5], [1.2, 2.5], [1.2, -2.5], [4, 1.5], [4, -1.5], [2.5, 3.5], [2.5, -3.5], [5, 0], [1, 3.5], [1, -3.5], [6, 2], [6, -2]]) { const x = qx - dx * a + rx * b, y = qy - dz * a + rz * b; if (!wk(x, y)) continue;
            let hx = dx, hy = dz; const l = Math.hypot(hx, hy) || 1; return { x, y, hx: hx / l, hy: hy / l, dn, du }; } return null; }, P.caso);
        if (!Z) { console.log(i + 1, P.nome, 'nessun posto calpestabile'); rep.push({ nome: P.nome, manca: true }); continue; }
        Object.assign(P, Z);
      }
      const setPose = async yaw => pg.evaluate(([P, yaw]) => { const st = window.__pv.st, C = window.__CAM7; st.player.x = P.x; st.player.y = P.y; st.player.path = []; if (C) { C.yaw0 = yaw; C.ppx = undefined; } }, [P, yaw]);
      const head = () => pg.evaluate(() => { const c = window.__pv.R.getCamera(), d = new window.THREE.Vector3(); c.getWorldDirection(d); return Math.atan2(d.z, d.x); });
      if (P.solo) {   // solo i raggi: il personaggio sul posto (i tasselli attorno arrivano), niente foto
        await pg.evaluate(P => { const st = window.__pv.st; st.player.x = P.x; st.player.y = P.y; st.player.path = []; }, P);
        for (let j = 0; j < 3; j++) await fot(); await pg.waitForTimeout(P.attesa || 3000); for (let j = 0; j < 2; j++) await fot();
        const so = await pg.evaluate(P => { const THREE = window.THREE, R = window.__pv.R, sc = R.__models.scene, cam = R.getCamera();
          const hitAll = r2 => { const H = []; sc.traverse(o => { if (!o.isMesh || o.isSprite || o.isPoints || o.isLine || o.userData.personaggi) return; try { o.raycast(r2, H); } catch (e) { } }); return H.sort((a, b) => a.distance - b.distance); };
          return (P.sonde || []).map(([ox, oy, oz, dx, dy, dz, far]) => { const r2 = new THREE.Raycaster(new THREE.Vector3(ox, oy, oz), new THREE.Vector3(dx, dy, dz).normalize(), 0, far); r2.camera = cam; const h = hitAll(r2)[0]; return h ? +h.distance.toFixed(2) : null; }); }, P);
        rep.push({ nome: P.nome, solo: true, sonde: so }); if (i % 10 === 0) console.log(i + 1, P.nome, sec(), JSON.stringify(so));
        fs.writeFileSync(path.join(outDir, 'rep.json'), JSON.stringify(rep, null, 1)); continue;
      }
      let yaw = Math.atan2(P.hx, -P.hy); await setPose(yaw); for (let j = 0; j < 3; j++) await fot();
      { const want = Math.atan2(P.hy, P.hx); let sg = 1; for (let it = 0; it < 3; it++) { for (let j = 0; j < 3; j++) await fot(); const got = await head(); let dd = want - got; dd = Math.atan2(Math.sin(dd), Math.cos(dd)); if (Math.abs(dd) < .04) break; const y0 = yaw; yaw += sg * dd; await setPose(yaw); for (let j = 0; j < 4; j++) await fot(); const g2 = await head(); let d2 = want - g2; d2 = Math.atan2(Math.sin(d2), Math.cos(d2)); if (Math.abs(d2) > Math.abs(dd)) { sg = -sg; yaw = y0 + sg * dd; await setPose(yaw); } } }
      await pg.waitForTimeout(P.attesa || 2500);
      { let prev = null, fermi = 0; for (let j = 0; j < 12 && fermi < 3; j++) { await fot(); const c = await pg.evaluate(() => { const p = window.__pv.R.getCamera().position; return [p.x, p.y, p.z]; }); if (prev && Math.hypot(c[0] - prev[0], c[1] - prev[1], c[2] - prev[2]) < .02) fermi++; else fermi = 0; prev = c; } }
      const file = path.join(outDir, (P.file || ('p' + String(i + 1).padStart(2, '0'))) + '.png');
      { const url = await pg.evaluate(() => new Promise(res => requestAnimationFrame(() => { try { res(document.getElementById('cv').toDataURL('image/png')); } catch (e) { res(null); } })));
        if (url && url.length > 20000) fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64')); else await pg.screenshot({ path: file, timeout: 240000 }); }
      // proiezione dei punti segnati (per cerchiarli) e raggi di identificazione
      const M = await pg.evaluate(P => {
        const THREE = window.THREE, R = window.__pv.R, cam = R.getCamera(), sc = R.__models.scene; cam.updateMatrixWorld();
        const proj = (x, y, z) => { const v = new THREE.Vector3(x, z === undefined ? R.groundH(x, y) + 1 : z, y).project(cam); return [+((v.x + 1) / 2).toFixed(4), +((1 - v.y) / 2).toFixed(4), v.z < 1]; };
        const segni = (P.segni || []).map(s => proj(s[0], s[1], s[2]));
        const rc = new THREE.Raycaster(), out = [];
        const hitAll = r2 => { const H = []; sc.traverseVisible(o => { if (!o.isMesh || o.isSprite || o.isPoints || o.isLine) return; try { o.raycast(r2, H); } catch (e) { } }); return H.sort((a, b) => a.distance - b.distance); };
        rc.camera = cam;
        const sonde = (P.sonde || []).map(([ox, oy, oz, dx, dy, dz, far]) => { const r2 = new THREE.Raycaster(new THREE.Vector3(ox, oy, oz), new THREE.Vector3(dx, dy, dz).normalize(), 0, far); r2.camera = cam; const h = hitAll(r2)[0]; return h ? +h.distance.toFixed(2) : null; });
        const desc = o => { const n = []; let q = o; for (let k = 0; k < 6 && q; k++) { n.push((q.name || q.type) + (q.userData && Object.keys(q.userData).length ? '{' + Object.keys(q.userData).slice(0, 8).map(k => { const v = q.userData[k]; return k + (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean' ? ':' + String(v).slice(0, 20) : ''); }).join(',') + '}' : '')); q = q.parent; } return n.join(' < '); };
        for (const [u, v] of P.raggi || []) { rc.setFromCamera(new THREE.Vector2(u * 2 - 1, 1 - v * 2), cam); const h = hitAll(rc).slice(0, 3);
          out.push({ uv: [u, v], hit: h.map(x => ({ d: +x.distance.toFixed(2), p: [+x.point.x.toFixed(2), +x.point.y.toFixed(2), +x.point.z.toFixed(2)], n: x.face ? [+x.face.normal.x.toFixed(2), +x.face.normal.y.toFixed(2), +x.face.normal.z.toFixed(2)] : null, obj: desc(x.object), mat: x.object.material && (x.object.material.name || x.object.material.type), inst: x.instanceId, fi: x.faceIndex })) }); }
        const c = cam.position; return { cam: [c.x, c.y, c.z].map(v => +v.toFixed(2)), segni, sonde, raggi: out, posto: [P.x, P.y], pl: [window.__pv.st.player.x, window.__pv.st.player.y], dir: (() => { const d = new THREE.Vector3(); cam.getWorldDirection(d); return [+d.x.toFixed(3), +d.y.toFixed(3), +d.z.toFixed(3)]; })() };
      }, P);
      rep.push(Object.assign({ nome: P.nome, file: path.basename(file) }, M));
      console.log(i + 1, P.nome, sec(), JSON.stringify(M.cam));
      fs.writeFileSync(path.join(outDir, 'rep.json'), JSON.stringify(rep, null, 1));
    }
  } catch (e) { console.log('ERR', e.stack); }
  console.log('errori', JSON.stringify(errori.slice(0, 5))); await b.close(); srv.close(); process.exit(0);
});
