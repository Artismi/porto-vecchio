// [tasselli] IL CONFRONTO DELL'IMMAGINE: le stesse inquadrature (quelle di banco_peso.js) fotografate con la città costruita nel browser
// (oggi, Anelli.finisci) e con la città a tasselli (?tasselli=1, Tasselli.finisci), stesso seme, stessa ora, stesso tempo, senza chi si
// muove (persone, mezzi, particelle); lo scarto per pixel (media 0-255, % di pixel oltre 8 su un canale) e l'immagine della differenza ×8.
//   node strumenti/confronta_tasselli.js <cartella> [--solo=borgo,marina] [--vw=480] [--vh=300] [--modi=oggi,tasselli]
'use strict';
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || '/opt/node-tools/node_modules/playwright-core');
const root = path.resolve(__dirname, '..');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const OUT = process.argv.slice(2).find(a => !a.startsWith('--')) || '/tmp/confronta_tasselli';
const W = +arg('vw', 480), H = +arg('vh', 300), SOLO = arg('solo', null), MODI = arg('modi', 'oggi,tasselli').split(',');
const SCATTI = [
  { nome: 'borgo', x: 1424, y: 322, zoom: .75, ora: 660 },
  { nome: 'marina', x: 1372, y: 388, zoom: .95, ora: 600 },
  { nome: 'vittoria', x: 1410, y: 343, zoom: .95, ora: 720 },
  { nome: 'citta', x: 1420, y: 340, zoom: 4, ora: 840 },
  { nome: 'recinto', x: 1520, y: 352, zoom: 1.2, ora: 900 },
  { nome: 'notte', x: 1424, y: 322, zoom: .75, ora: 1320 },
].filter(s => !SOLO || SOLO.split(',').includes(s.nome));
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.webp': 'image/webp' };
fs.mkdirSync(OUT, { recursive: true });
const srv = http.createServer((req, res) => { let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); }).listen(0, async () => {
  const T0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0)} s]`, ...a);
  const b = await chromium.launch({ executablePath: process.env.PW_CHROME || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const modo of MODI) {
    const pg = await b.newPage({ viewport: { width: W, height: H } });
    pg.on('pageerror', e => log('[errore]', modo, (e.stack || e.message).slice(0, 300)));
    await pg.addInitScript(() => { window.__pulita = true; window.__nodraw = true;
      const P = WebGL2RenderingContext.prototype; for (const k of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced', 'drawRangeElements']) { const f = P[k]; P[k] = function () { if (window.__nodraw) return; return f.apply(this, arguments); }; } });
    await pg.addInitScript(seme => { let a = seme >>> 0 || 1; Math.random = function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }, 12345);
    await pg.goto(`http://localhost:${srv.address().port}/index.html${modo === 'tasselli' ? '?tasselli=1' : ''}`, { timeout: 0 });
    await pg.waitForFunction(() => window.__tl && window.__tl.gioco, null, { timeout: 0, polling: 1000 });
    log(modo, 'caricato', await pg.evaluate(() => window.Tasselli ? Tasselli.attivo() : null));
    if (modo === 'tasselli' && !(await pg.evaluate(() => window.Tasselli && Tasselli.attivo()))) { log('i tasselli non sono attivi (impronta?)', await pg.evaluate(() => window.__tasselli && window.__tasselli.motivo)); await pg.close(); continue; }
    await pg.addStyleTag({ content: '#app > *:not(#cv) { visibility: hidden !important; } #bubbles, #hover, #moment, #xhair, #ring, #touch { display: none !important; }' });
    await pg.evaluate(() => { const R = window.__pv.R; if (R.setRes) R.setRes(1); R.setRes = null; R.lowQuality = () => { }; if (window.PesoSchermo) PesoSchermo.blocca(); });
    await pg.evaluate(() => { const pv = window.__pv, st = pv.st; st.deadline = 1e12; setInterval(() => { const u = pv.ui; u.flash = 0; u.fade = 0; u.desat = false; u.letterbox = false; u.dialog = null; u.book = false; u.menu = false; st.over = null; st.chase = false; st.player.hp = 100; }, 50); });
    if (modo === 'oggi') await pg.evaluate(() => { if (window.Anelli && Anelli.ON) Anelli.finisci(); });
    for (const s of SCATTI) {
      await pg.evaluate(s => { const pv = window.__pv, st = pv.st, p = st.player, R = pv.R, ui = pv.ui;
        p.vehicle = null; p.indoor = null; p.lv = null; p.x = s.x; p.y = s.y; p.path = []; if (p.vx !== undefined) { p.vx = 0; p.vy = 0; }
        window.__t0 = window.__t0 || (Math.floor(st.t / 1440) + 1) * 1440; st.t = window.__t0 + s.ora; window.__meteo = 'sereno';
        ui.focus = { x: s.x, y: s.y }; ui.zoom = s.zoom; R.cam.x = R.cam.tx = s.x; R.cam.y = R.cam.ty = s.y; R.cam.zoom = R.cam.tz = s.zoom; R.cam.uy = 0; }, s);
      await pg.waitForTimeout(2500);
      if (modo === 'tasselli') await pg.evaluate(() => Tasselli.finisci(300).then(() => { if (window.Anelli) Anelli.finisci(); }));
      for (let k = 0, quiet = 0, tb = Date.now(); Date.now() - tb < 90000 && quiet < 2; k++) { await pg.waitForTimeout(1000); quiet = (await pg.evaluate(() => !(window.__pv.R.ISO && window.__pv.R.ISO.job))) ? quiet + 1 : 0; }
      await pg.waitForTimeout(3000);
      const url = await pg.evaluate(() => { const pv = window.__pv, Rr = pv.R, S = Rr.__models.scene, f0 = Rr.frame, s0 = pv.G.step; pv.G.step = () => { };
        const hid = [], veh = new Set(Object.values(Rr.__vehicles || {}));
        S.children.forEach(q => { let mob = veh.has(q); if (!mob) q.traverse(o => { if (o.isSkinnedMesh) mob = true; }); if (mob) q.traverse(o => { hid.push([o, o.layers.mask]); o.layers.set(31); }); });
        S.traverse(o => { if ((o.isSprite || o.isPoints || o.isLine) && o.layers.mask !== 1 << 31) { hid.push([o, o.layers.mask]); o.layers.set(31); } });
        const M = Rr.__mondo; if (M && M.V) { M.V.t.value = 10; M.V.g.value = .4; }
        window.__nodraw = false; S.traverse(o => { if (o.isLight && o.castShadow && o.shadow) o.shadow.needsUpdate = true; });
        f0.call(Rr, pv.st, 0, pv.ui); f0.call(Rr, pv.st, 0, pv.ui); if (M && M.V) { M.V.t.value = 10; M.V.g.value = .4; } f0.call(Rr, pv.st, 0, pv.ui);
        const u = document.getElementById('cv').toDataURL('image/png'); window.__nodraw = true; hid.forEach(([o, m]) => o.layers.mask = m); pv.G.step = s0; return u; });
      fs.writeFileSync(path.join(OUT, s.nome + '_' + modo + '.png'), Buffer.from(url.split(',')[1], 'base64'));
      log(modo, s.nome);
    }
    await pg.close();
  }
  await b.close(); srv.close();
  // gli scarti
  let sharp = null; try { sharp = require(path.join(__dirname, 'node_modules', 'sharp')); } catch (e) { }
  const R = {};
  if (sharp) for (const s of SCATTI) {
    const fa = path.join(OUT, s.nome + '_oggi.png'), fb = path.join(OUT, s.nome + '_tasselli.png'); if (!fs.existsSync(fa) || !fs.existsSync(fb)) continue;
    const A = await sharp(fa).removeAlpha().raw().toBuffer({ resolveWithObject: true }), B = await sharp(fb).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    if (A.info.width !== B.info.width || A.info.height !== B.info.height) { R[s.nome] = 'misure diverse'; continue; }
    const D = Buffer.alloc(A.data.length); let sum = 0, over = 0; const N = A.info.width * A.info.height;
    for (let i = 0; i < A.data.length; i += 3) { let m = 0; for (let c = 0; c < 3; c++) { const d = Math.abs(A.data[i + c] - B.data[i + c]); sum += d; if (d > m) m = d; D[i + c] = Math.min(255, d * 8); } if (m > 8) over++; }
    await sharp(D, { raw: { width: A.info.width, height: A.info.height, channels: 3 } }).png().toFile(path.join(OUT, s.nome + '_diff.png'));
    R[s.nome] = { media: +(sum / (N * 3)).toFixed(2), oltre8_pct: +(over / N * 100).toFixed(2) };
  }
  fs.writeFileSync(path.join(OUT, 'scarti.json'), JSON.stringify(R, null, 1)); console.log(JSON.stringify(R));
  process.exit(0);
});
