// [regia2] LA GALLERIA DEGLI SCORCI: venti inquadrature fisse della città nuova (?cittanuova), sempre le stesse, per giudicare la luce
// e l'equilibrio dell'immagine prima e dopo ogni ritocco. Sopra lo stesso motore di strumenti_inverno/shot_gioco.js (Chromium senza
// testa con SwiftShader, il gioco vero servito da qui).
//   node strumenti/galleria.js <cartella> [scorci.json] [larghezza altezza]
// Per ogni scorcio: la camera va sul punto (ui.focus, la visuale non insegue il personaggio), l'ora e il tempo si fissano, la scena
// SI RIEMPIE (il riempimento di fondo di popolo.js gira subito più volte e chi ha preso un posto ci viene messo, già seduto o
// appoggiato: è lo strumento a farlo, la logica di gioco non cambia), poi si aspetta che i blocchi della città siano costruiti e si scatta.
// Con "pulita" (in scorci.json, vero per difetto) niente HUD, fumetti, nomi sopra la gente ed etichette dei luoghi.
// Esce: una foto per scorcio, il mosaico galleria.png e galleria.json con le misure di ogni foto (luminosità media, contrasto,
// % di pixel quasi neri e quasi bianchi, saturazione media, draw call della scena).
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const [outDir, sceneFile0, W0, H0] = process.argv.slice(2);
if (!outDir) { console.log('uso: node strumenti/galleria.js <cartella> [scorci.json] [larghezza altezza]'); process.exit(1); }
const sceneFile = sceneFile0 || path.join(__dirname, 'scorci.json');
const CFG = JSON.parse(fs.readFileSync(sceneFile, 'utf8')), SCORCI = (CFG.scorci || CFG).filter(s => !process.env.SOLO || process.env.SOLO.split(',').some(k => s.nome.includes(k)));
const PULITA = CFG.pulita !== false, root = path.resolve(__dirname, '..');
// le soglie delle misure (su 0-255, luminanza Rec. 709 dei valori sRGB)
const MIS = { nero: 12, bianco: 245 };
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream' };
fs.mkdirSync(outDir, { recursive: true });
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const port = srv.address().port, W = +(W0 || 1280), H = +(H0 || 800), t0 = Date.now();
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: W, height: H } });
  pg.on('pageerror', e => console.log('[errore]', e.message, (e.stack || '').split('\n').slice(0, 3).join(' | ')));
  pg.on('console', m => { if (m.type() === 'error') console.log('[console]', m.text().slice(0, 240)); });
  if (PULITA) await pg.addInitScript(() => { window.__pulita = true; });   // render.js e main.js: niente etichette dei luoghi
  await pg.goto(`http://localhost:${port}/index.html${process.env.PV_QUERY !== undefined ? process.env.PV_QUERY : '?cittanuova'}`);
  await pg.waitForFunction(() => window.__pv && window.__pv.st, null, { timeout: 300000 });
  await pg.keyboard.press('Enter'); await pg.waitForTimeout(1500);
  if (PULITA) await pg.addStyleTag({ content: '#app > *:not(#cv) { visibility: hidden !important; } #bubbles, #hover, #moment, #xhair, #ring, #touch { display: none !important; }' });
  await pg.evaluate(() => { const pv = window.__pv, st = pv.st; st.deadline = 1e12; if (pv.R.gpuTiming) pv.R.gpuTiming(true);
    setInterval(() => { const u = pv.ui; u.flash = 0; u.fade = 0; u.desat = false; u.letterbox = false; u.dialog = null; u.book = false; u.menu = false; st.over = null; st.chase = false; st.player.hp = 100; }, 50); });
  console.log('caricato in', ((Date.now() - t0) / 1000).toFixed(0), 's');
  const out = [];
  for (const s of SCORCI) {
    const ts = Date.now();
    // 1) il posto, l'ora, il tempo, la camera
    await pg.evaluate(s => {
      const pv = window.__pv, st = pv.st, p = st.player, R = pv.R, ui = pv.ui;
      p.vehicle = null; p.indoor = null; p.lv = null; p.x = s.x; p.y = s.y; p.path = []; if (p.vx !== undefined) { p.vx = 0; p.vy = 0; }
      if (s.ora !== undefined) { let t = Math.floor(st.t / 1440) * 1440 + s.ora; if (t < st.t - 1) t += 1440; st.t = t; }   // l'orologio non torna indietro
      window.__meteo = s.meteo || null;
      ui.focus = { x: s.x + (s.dx || 0), y: s.y + (s.dy || 0) }; ui.zoom = s.zoom || 1;
      if (R && R.cam) { R.cam.x = R.cam.tx = ui.focus.x; R.cam.y = R.cam.ty = ui.focus.y; R.cam.zoom = R.cam.tz = ui.zoom; R.cam.uy = (s.giro || 0) * Math.PI / 180; }
    }, s);
    await pg.waitForTimeout(2500);   // chi è vicino si accorge del giocatore (pop.near), i blocchi cominciano a costruirsi
    // 2) la scena si riempie: il riempimento di popolo.js gira subito più volte; chi ha preso un posto ci arriva
    const pieni = await pg.evaluate(() => {
      const pv = window.__pv, st = pv.st; if (typeof Popolo === 'undefined' || !Popolo.fillStep || !Popolo.FILL) return -1;
      for (let k = 0; k < 30; k++) { if (st.pop) st.pop.fillAt = 0; try { Popolo.fillStep(st, 0); } catch (e) { break; } }
      let n = 0; st.npcs.forEach(m => { const q = m.__posto; if (!q) return; n++; if (q.arrived) return; if (q.tetto) return;
        m.x = q.slot.x; m.y = q.slot.y; m.inside = false; m.path = []; m.speedNow = 0; m.face = q.slot.face; q.arrived = true; });
      return n;
    });
    // i blocchi della città attorno (render.js ISO.job: uno alla volta) finiti per due controlli di fila
    for (let k = 0, quiet = 0; k < 90 && quiet < 2; k++) { await pg.waitForTimeout(1000); quiet = (await pg.evaluate(() => !(window.__pv.R.ISO && window.__pv.R.ISO.job))) ? quiet + 1 : 0; }
    await pg.waitForTimeout(s.attesa || 4500);
    // 3) la foto e le misure
    const file = path.join(outDir, s.nome + '.png');
    const buf = await pg.screenshot({ path: file, timeout: 240000 });
    const m = await pg.evaluate(async ({ b64, MIS }) => {
      const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0);
      const D = x.getImageData(0, 0, c.width, c.height).data, N = D.length / 4; let sl = 0, sl2 = 0, nero = 0, bianco = 0, ss = 0;
      for (let i = 0; i < D.length; i += 4) { const r = D[i], g = D[i + 1], bb = D[i + 2], l = .2126 * r + .7152 * g + .0722 * bb, mx = Math.max(r, g, bb), mn = Math.min(r, g, bb);
        sl += l; sl2 += l * l; if (l < MIS.nero) nero++; if (l > MIS.bianco) bianco++; ss += mx > 0 ? (mx - mn) / mx : 0; }
      const mu = sl / N, pv = window.__pv, info = pv.R.gpuTimes && pv.R.gpuTimes.info;
      return { luminosita: +(mu / 255).toFixed(3), contrasto: +(Math.sqrt(Math.max(0, sl2 / N - mu * mu)) / 255).toFixed(3), quasiNeri: +(nero / N * 100).toFixed(2), quasiBianchi: +(bianco / N * 100).toFixed(2), saturazione: +(ss / N).toFixed(3),
        drawCall: info && info.calls || null, triangoli: info && info.tris || null, ora: Math.round(pv.st.t % 1440), notte: +(pv.R.nightLevel(pv.st.t)).toFixed(2), gente: pv.st.npcs.filter(n => !n.inside && !n.dead && Math.hypot(n.x - pv.st.player.x, n.y - pv.st.player.y) < 40).length };
    }, { b64: buf.toString('base64'), MIS });
    const rec = Object.assign({ nome: s.nome, titolo: s.titolo || s.nome, luce: s.luce || null, meteo: s.meteo || null, nelPosto: pieni }, m);
    out.push(rec);
    console.log(`ok ${s.nome.padEnd(22)} lum ${m.luminosita} contr ${m.contrasto} neri ${m.quasiNeri}% bianchi ${m.quasiBianchi}% sat ${m.saturazione} dc ${m.drawCall} gente ${m.gente} nei posti ${pieni} (${((Date.now() - ts) / 1000).toFixed(0)} s)`);
  }
  // 4) il mosaico: cinque colonne, la didascalia con le misure sotto ogni foto
  const files = out.map(r => ({ r, b64: fs.readFileSync(path.join(outDir, r.nome + '.png')).toString('base64') }));
  const mosaic = await pg.evaluate(async ({ files, W, H }) => {
    const C = 5, tw = 512, th = Math.round(tw * H / W), cap = 38, R = Math.ceil(files.length / C), pad = 6;
    const c = document.createElement('canvas'); c.width = C * (tw + pad) + pad; c.height = R * (th + cap + pad) + pad; const x = c.getContext('2d');
    x.fillStyle = '#16181c'; x.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < files.length; i++) { const { r, b64 } = files[i], img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
      const X = pad + (i % C) * (tw + pad), Y = pad + Math.floor(i / C) * (th + cap + pad); x.drawImage(img, X, Y, tw, th);
      x.fillStyle = '#e8e2d4'; x.font = 'bold 15px sans-serif'; x.fillText(r.titolo, X + 4, Y + th + 16);
      const bad = (r.notte < .5 && r.quasiNeri > 4) || r.quasiBianchi > 2; x.fillStyle = bad ? '#ff8a70' : '#a8b0b8'; x.font = '12px monospace';
      x.fillText(`L ${r.luminosita} C ${r.contrasto} N ${r.quasiNeri}% B ${r.quasiBianchi}% S ${r.saturazione} dc ${r.drawCall}`, X + 4, Y + th + 32); }
    return c.toDataURL('image/png').split(',')[1];
  }, { files, W, H });
  fs.writeFileSync(path.join(outDir, 'galleria.png'), Buffer.from(mosaic, 'base64'));
  const day = out.filter(r => r.notte < .5), avg = (L, k) => L.length ? +(L.reduce((a, r) => a + r[k], 0) / L.length).toFixed(3) : null;
  const sintesi = { foto: out.length, giorno: day.length, lumMediaGiorno: avg(day, 'luminosita'), contrastoMedio: avg(out, 'contrasto'), saturazioneMedia: avg(out, 'saturazione'),
    neriOltre4Giorno: day.filter(r => r.quasiNeri > 4).map(r => r.nome), sovraesposte: out.filter(r => r.quasiBianchi > 2).map(r => r.nome), drawCallMedie: avg(out.filter(r => r.drawCall), 'drawCall') };
  fs.writeFileSync(path.join(outDir, 'galleria.json'), JSON.stringify({ quando: new Date().toISOString(), larghezza: W, altezza: H, soglie: MIS, sintesi, foto: out }, null, 1));
  console.log('sintesi', JSON.stringify(sintesi));
  console.log('mosaico', path.join(outDir, 'galleria.png'), 'in', ((Date.now() - t0) / 60000).toFixed(1), 'min');
  await b.close(); srv.close();
});
