// [scorcio] LE FOTO DEL LABORATORIO DEL LOOK: lo scorcio (?scorcio=ottagono) in Chromium senza testa (SwiftShader), una volta sola,
// e poi ogni inquadratura a ogni ora, col look di oggi e con la proposta (le manopole di window.__SGU.pro, src/render.js [scorcio]).
//   node strumenti/scorcio_foto.js [cartella] [--manopole=file.json] [--scorcio=ottagono] [--raggio=75]
//        [--inquadrature=gioco,basso] [--ore=mattino,pomeriggio,sera,notte] [--oggi=pomeriggio,sera] [--proposta=tutte|ore,...]
//        [--set=miniatura=0,ao=0] [--prove=senzaao:ao=0,senzamini:miniatura=0] [--larghezza=960 --altezza=540] [--query=&altro]
// La cartella per difetto è <tmp>/scorcio. I file: oggi_<inquadratura>_<ora>.png e proposta_<inquadratura>_<ora>.png.
// --manopole (per difetto strumenti/scorcio_manopole.json; nessuna: quelle di render.js): un JSON che si fonde dentro window.__SGU.pro (le manopole della proposta) e, sotto "momenti", nei quattro set di luce
// (vedi strumenti/scorcio_manopole.json). Così si cambia una manopola e si rifà tutto con un comando solo, senza ricostruire il gioco.
// --oggi=nessuna o --proposta=nessuna saltano quel look.
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const ARG = {}, POS = [];
for (const a of process.argv.slice(2)) { const m = /^--([a-z]+)=(.*)$/.exec(a); if (m) ARG[m[1]] = m[2]; else POS.push(a); }
const root = path.resolve(__dirname, '..');
const outDir = path.resolve(POS[0] || path.join(require('os').tmpdir(), 'scorcio'));
const lista = (v, d) => v === 'nessuna' ? [] : (v || d).split(',').filter(Boolean);
const ORE = { mattino: 9, pomeriggio: 15.5, sera: 19.1, notte: 23 };
const INQ = lista(ARG.inquadrature, 'gioco,basso'), ORE_P = ARG.proposta === 'tutte' || !ARG.proposta ? lista(ARG.ore, 'mattino,pomeriggio,sera,notte') : lista(ARG.proposta, ''), ORE_O = lista(ARG.oggi, 'pomeriggio,sera');
const MANO_F = ARG.manopole || path.join(__dirname, 'scorcio_manopole.json'), MANOPOLE = ARG.manopole !== 'nessuna' && fs.existsSync(MANO_F) ? JSON.parse(fs.readFileSync(MANO_F, 'utf8')) : null;   // per difetto strumenti/scorcio_manopole.json
// --set=miniatura=0,ao=0: una manopola al volo sopra il file (per spegnere un pezzo e confrontare)
const MAN = Object.assign(MANOPOLE || {}, Object.fromEntries((ARG.set || '').split(',').filter(Boolean).map(q => { const [k, v] = q.split('='); return [k, isNaN(+v) ? v : +v]; })));
const W = +(ARG.larghezza || 960), H = +(ARG.altezza || 540);
const Q = `?scorcio=${ARG.scorcio || 'ottagono'}${ARG.raggio ? '&raggio=' + ARG.raggio : ''}${ARG.query || ''}`;
// le inquadrature: 'gioco' è la camera del gioco col personaggio al suo posto; le altre sono camere fisse (R.scorcio.cam) attorno
// al centro dello scorcio: yaw come la camera del gioco (R.YAW = 45°) più uno scarto, pendenza, distanza, campo
const CAMERE = {
  gioco: null,
  largo: { dyaw: 0, pitch: .78, dist: 120, fov: 30, dx: 0, dz: 4 },      // come lo scatto del committente: la piazza intera dall'alto
  sopra: { dyaw: -.35, pitch: .4, dist: 46, fov: 26, dx: -1, dz: 5 },    // tre quarti bassi sopra i tetti a sud (la prima prova: le righe del suolo)
  basso: { dyaw: .785, pitch: .42, dist: 44, fov: 26, dx: 5, dz: 3 },    // tre quarti bassi da levante (dalla parte delle scale): la fontana, i gradoni, le porte
};
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
    const pg = await b.newPage({ viewport: { width: W, height: H } });
    const errori = []; pg.on('pageerror', e => { errori.push(e.message); console.log('[errore]', e.message, (e.stack || '').split('\n').slice(0, 3).join(' | ')); });
    pg.on('console', m => { if (/Shader Error|not compiled/.test(m.text())) errori.push('shader: ' + m.text().slice(0, 300)); if (m.type() === 'error' && !/Failed to load resource/.test(m.text()) || /\[scorcio\]/.test(m.text())) console.log('[console]', m.text().slice(0, 240)); });
    await pg.addInitScript(() => { window.__pulita = true; });
    await pg.goto(`http://localhost:${srv.address().port}/index.html${Q}`);
    await pg.waitForFunction(() => window.__pv && window.__pv.st, null, { timeout: 900000, polling: 500 });
    console.log('pronto in', sec(), JSON.stringify(await pg.evaluate(() => window.__tl)));
    await pg.keyboard.press('Enter'); await pg.waitForTimeout(500);
    await pg.addStyleTag({ content: '#app > *:not(#cv) { visibility: hidden !important; } #bubbles, #hover, #moment, #xhair, #ring, #touch { display: none !important; }' });
    await pg.evaluate(() => { const pv = window.__pv, st = pv.st; st.deadline = 1e12; window.__meteo = 'sereno';
      setInterval(() => { const u = pv.ui; u.flash = 0; u.fade = 0; u.desat = false; u.letterbox = false; u.dialog = null; u.book = false; u.menu = false; u.intro = false; st.over = null; st.chase = false; st.player.hp = 100; st.player.path = []; }, 50); });
    await pg.evaluate(M => { const S = window.__SGU; if (M.momenti) { for (const k in M.momenti) Object.assign(S.momenti[k], M.momenti[k]); delete M.momenti; } Object.assign(S.pro, M); }, JSON.parse(JSON.stringify(MAN)));
    const fot = () => pg.evaluate(() => new Promise(r => requestAnimationFrame(() => r())));
    const fatti = [];
    const scatta = async (look, inq, ora) => {
      const ts = Date.now();
      await pg.evaluate(({ look, inq, ora, C }) => { const pv = window.__pv, st = pv.st, R = pv.R, p = st.player, c = R.scoCentro();
        window.__SGU.pro.on = look !== 'oggi';
        let t = Math.floor(st.t / 1440) * 1440 + ora * 60; st.t = t;
        p.vehicle = null; p.indoor = null; p.lv = null; p.x = c.px; p.y = c.pz; p.face = Math.PI / 2 + .6; if (p.vx !== undefined) { p.vx = 0; p.vy = 0; }
        pv.ui.focus = null; pv.ui.zoom = .72; R.cam.uy = 0; R.cam.mano = {};
        R.scorcio.cam = C ? { x: c.x + C.dx, z: c.z + C.dz, yaw: R.YAW + C.dyaw, pitch: C.pitch, dist: C.dist, fov: C.fov } : null; }, { look, inq, ora: ORE[ora], C: CAMERE[inq] });
      for (let k = 0; k < 4; k++) await fot();   // la luce dell'ora, la camera al suo posto, le ombre
      const url = await pg.evaluate(() => new Promise(res => requestAnimationFrame(() => res(document.getElementById('cv').toDataURL('image/png')))));
      const file = path.join(outDir, `${look}_${inq}_${ora}.png`); fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
      fatti.push(path.basename(file)); console.log('ok', path.basename(file), ((Date.now() - ts) / 1000).toFixed(1) + ' s');
    };
    // i pezzi a caselle (il verde, gli alberi di città, l'erba) arrivano a lavori (ISO): si fanno subito attorno allo scorcio, come
    // strumenti/foto_inquadratura.js, e si aspetta che la coda sia vuota
    await pg.evaluate(() => { const R = window.__pv.R, c = R.scoCentro(); const ld = setInterval(() => { try { Render.ISO.rush = true; R.updateChunks(c.x, c.z); } finally { Render.ISO.rush = false; } }, 150); setTimeout(() => clearInterval(ld), 60000); });
    for (let quiet = 0, tb = Date.now(); Date.now() - tb < 90000 && quiet < 2;) { await pg.waitForTimeout(1000); quiet = (await pg.evaluate(() => !(window.__pv.R.ISO && window.__pv.R.ISO.job))) ? quiet + 1 : 0; }
    console.log('caselle pronte in', sec());
    // il primo giro carica tutto (i programmi della proposta compresi): qualche fotogramma a vuoto con la proposta accesa e poi spenta
    await pg.evaluate(() => { window.__SGU.pro.on = true; }); for (let k = 0; k < 3; k++) await fot();
    await pg.evaluate(() => { window.__SGU.pro.on = false; }); for (let k = 0; k < 2; k++) await fot();
    console.log('scaldato in', sec());
    for (const inq of INQ) { for (const ora of ORE_O) await scatta('oggi', inq, ora); for (const ora of ORE_P) await scatta('proposta', inq, ora); }
    // --prove=nome:k=v+k=v,nome2:...: la proposta con qualche manopola cambiata (proposta-<nome>_<inquadratura>_<ora>.png), poi si torna al file
    for (const pr of lista(ARG.prove, '')) { const [nome, kv] = pr.split(':'), D = Object.fromEntries((kv || '').split('+').filter(Boolean).map(q => { const [k, v] = q.split('='); return [k, +v]; }));
      const prima = await pg.evaluate(D => { const P = window.__SGU.pro, b = {}; for (const k in D) { b[k] = P[k]; P[k] = D[k]; } return b; }, D);
      for (const inq of INQ) for (const ora of ORE_P) await scatta('proposta-' + nome, inq, ora);
      await pg.evaluate(b => Object.assign(window.__SGU.pro, b), prima); }
    // le finestre accese (i pannelli caldi dietro al vetro, peso_vetro.js): quante facce nello scorcio
    const finestre = await pg.evaluate(() => { const V = window.PesoVetro && PesoVetro.voci1; if (!V) return null; let tri = 0, voci = new Set();
      window.__pv.R.__models.scene.traverse(o => { const A = o.isMesh && o.geometry && o.geometry.attributes.vt1; if (!A) return; for (let i = 0; i < A.count; i += 3) { const c = V[Math.round(A.getX(i))]; if (c && c[4] > .01 && c[4] >= c[5] && c[5] >= c[6]) { tri++; voci.add(Math.round(A.getX(i))); } } });
      return { facce: Math.round(tri / 2), toni: voci.size }; });
    console.log('finestre accese (pannelli caldi):', JSON.stringify(finestre));
    const info = await pg.evaluate(() => ({ finestre: null, scorcio: window.__pv.R.scorcio, pro: window.__SGU.pro, gpu: window.__pv.R.gpuTimes && window.__pv.R.gpuTimes.info }));
    fs.writeFileSync(path.join(outDir, 'scorcio_foto.json'), JSON.stringify({ quando: new Date().toISOString(), query: Q, W, H, errori, foto: fatti, info }, null, 1));
    console.log('fatto in', sec(), '· foto', fatti.length, '· errori', errori.length, '·', outDir);
    codice = errori.length ? 1 : 0;
  } catch (e) { console.log('[scorcio_foto]', e); codice = 2; }
  await b.close(); srv.close(); process.exit(codice);
});
