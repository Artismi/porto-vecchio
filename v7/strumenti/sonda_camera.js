// [camera2] LA SONDA DELLA CAMERA: quanto si muove, quanto ci ripensa, quanto scatta.
//   node strumenti/sonda_camera.js [--query=cittanuova&leggera&tassellivecchi] [--stili=levetta,tastiera] [--dt=0.0333,0.066,0.125,0.25]
//                                  [--modi=nuova,vecchia] [--posto=piazza|borgo|x,y] [--disegna] [--json=/percorso/uscita.json]
// Apre il gioco senza testa (Chromium, SwiftShader), ferma il giro di main.js e lo guida a mano: a ogni fotogramma un G.step e un R.frame
// col dt scelto (anche 66-250 ms: il gioco vero lo taglia a 50, qui no, per vedere cosa fa la camera coi fotogrammi lenti). Il
// personaggio fa una passeggiata scritta (avanti, sosta, a destra, in diagonale, corsa, verso la camera, a sinistra...) con due stili:
//   levetta  (telefono e controller): la levetta in coordinate dello schermo, girata con R.camBasis() come main.js; lo sguardo avanti
//            (ui.lead) e un tremolio del pollice (±4°, ±0,05) lento e ripetibile
//   tastiera (computer): W verso il puntatore, fermo in un punto dello schermo (main.js aimAngle); ui.aimPoint dal puntatore
// Per ogni fotogramma registra la camera (posizione, punto guardato, yaw, pendenza, campo, lente, rollio, zoom, distanza) e il personaggio
// sullo schermo; poi ricampiona a 20 Hz di tempo di gioco (le misure valgono a ogni dt) e calcola:
//   corsa (quanto si muove in tutto, al secondo), inversioni (quante volte torna indietro), episodi (quante volte parte da sola: il
//   «si riallinea»), strappo (RMS della derivata terza: gli scatti), alta frequenza (RMS dello scarto da una media mobile di 0,5 s)
// ?camvecchia (o --modi=vecchia) è la camera di prima: la stessa sonda li confronta.
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || 'playwright');
const ARG = {}; for (const a of process.argv.slice(2)) { const m = /^--([a-z]+)(?:=(.*))?$/.exec(a); if (m) ARG[m[1]] = m[2] === undefined ? true : m[2]; }
const root = path.resolve(__dirname, '..');
const QUERY = (ARG.query || 'cittanuova&leggera&tassellivecchi').replace(/^[?&]/, '');
const STILI = (ARG.stili || 'levetta,tastiera').split(',');
const DTS = (ARG.dt || '0.0333,0.066,0.125,0.25').split(',').map(Number);
const MODI = (ARG.modi || 'nuova').split(',');
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.gz': 'application/gzip' };

// la passeggiata: [da s, a s, levetta x, levetta y (in su = -1), corsa, puntatore x, puntatore y (0-1 dello schermo)]
const PASSI = [
  [0, 4, 0, -1, false, .5, .22],          // avanti (in su sullo schermo)
  [4, 5.5, 0, 0, false, .5, .22],         // sosta
  [5.5, 9.5, 1, 0, false, .82, .5],       // a destra
  [9.5, 13.5, -.7, -.7, false, .3, .25],  // in diagonale, in su a sinistra
  [13.5, 15, 0, 0, false, .3, .25],       // sosta
  [15, 20, 0, -1, true, .5, .2],          // corsa in avanti
  [20, 23, 0, 1, false, .5, .8],          // verso la camera
  [23, 24, 0, 0, false, .5, .8],          // sosta
  [24, 28, -1, 0, false, .18, .5],        // a sinistra
  [28, 32, .7, -.7, false, .72, .25],     // in su a destra
  [32, 33.5, 0, 0, false, .72, .25],      // sosta finale
];
const RISCALDA = 3.5, DURATA = +(ARG.durata || 33.5);

// dentro la pagina: una corsa intera (uno stile, un dt) e le serie della camera
async function corsa(pg, stile, dt, posto, disegna) {
  return pg.evaluate(async ({ stile, dt, posto, disegna, PASSI, RISCALDA, DURATA }) => {
    const pv = window.__pv, R = pv.R, G = pv.G, st = pv.st, p = st.player, cam = R.cam, camera = R.getCamera();
    // il giro di main.js si ferma: i fotogrammi li facciamo noi
    window.PV_ATTESA.on = () => true;
    const rd = R.__models.renderer, gl = rd.getContext();
    if (!disegna && !gl.__vuoto) { gl.__vuoto = { de: gl.drawElements, da: gl.drawArrays, dei: gl.drawElementsInstanced, dai: gl.drawArraysInstanced };
      gl.drawElements = function () { }; gl.drawArrays = function () { }; if (gl.drawElementsInstanced) gl.drawElementsInstanced = function () { }; if (gl.drawArraysInstanced) gl.drawArraysInstanced = function () { };
      gl.__vuoto.render = rd.render; rd.render = function () { }; }   // niente disegno (SwiftShader costa ~250 ms a fotogramma): la camera si calcola prima
    // un rumore lento e ripetibile (il pollice che trema)
    let seme = 12345; const rnd = () => { seme = (seme * 1103515245 + 12345) & 0x7fffffff; return seme / 0x7fffffff; };
    const nodi = Array.from({ length: 200 }, () => [rnd() - .5, rnd() - .5]);
    const lento = (t, k) => { const u = t * 2.5, i = Math.floor(u) % 199, f = u - Math.floor(u), s = f * f * (3 - 2 * f); return nodi[i][k] * (1 - s) + nodi[i + 1][k] * s; };
    // il punto di partenza
    const P = G.PLACES || {}; let x0, y0;
    if (/^[0-9.]+,[0-9.]+$/.test(posto)) [x0, y0] = posto.split(',').map(Number);
    else if (posto === 'borgo') { x0 = 1400; y0 = 312; }
    else { const q = P.piazza || { x: 1300, y: 330 }; x0 = q.x; y0 = q.y; }
    p.x = x0; p.y = y0; p.path = []; p.vehicle = null; p.indoor = null; p.lv = null; p.vx = p.vy = 0; p.speed = 0;
    if (R.camReset) R.camReset(); else { cam.uy = 0; cam.mano = {}; }
    R.snap(st); cam.ax = cam.ay = 0; cam.lx = cam.ly = 0; cam.pvx = cam.pvy = cam.mvx = cam.mvy = 0; cam.ppx = undefined;
    const ui = { studio: false, focus: null, mark: null, aimPoint: null, dialogNpc: null, intro: false, letterbox: false, flash: 0, fade: 0, desat: false, time: pv.ui.time || 0, zoom: 1, stick: null, lead: null, pan: null, tilt: 0, camMano: false, rot: 0, drag: 0, top: false, edge: 0 };
    const S = [], v3 = new THREE.Vector3(), W = innerWidth, H = innerHeight;
    let t = -RISCALDA, n = 0;
    const passo = () => {
      const tt = Math.max(0, t), seg = PASSI.find(s => tt >= s[0] && tt < s[1]) || PASSI[PASSI.length - 1];
      let [, , sx, sy, run, mx, my] = seg; if (t < 0) { sx = sy = 0; run = false; }
      let inp = { x: 0, y: 0, sprint: false };
      ui.stick = null; ui.lead = null; ui.aimPoint = null; ui.puntatore = stile === 'tastiera'; ui.camMano = t < -RISCALDA + .1;   // il primo fotogramma «tocca» la visuale: la regia riparte da capo
      if (stile === 'levetta') {
        if (sx || sy) { const a = Math.atan2(sy, sx) + lento(tt, 0) * .14, m = Math.min(1, Math.hypot(sx, sy)) * (run ? 1 : .72) + lento(tt, 1) * .1;
          const qx = Math.cos(a) * m, qy = Math.sin(a) * m, B = R.camBasis(), wx = B.rx * qx - B.fx * qy, wy = B.rz * qx - B.fz * qy, l = Math.hypot(wx, wy) || 1;
          inp = { x: wx, y: wy, sprint: run, brake: false, aim: Math.atan2(wy, wx), mag: Math.min(1, m) };
          ui.stick = { x: qx, y: qy }; ui.lead = { x: wx / l, y: wy / l, m: .4 + .6 * Math.min(1, m) }; }
      } else {   // tastiera: W verso il puntatore (fermo sullo schermo, anche nelle soste: ui.aimPoint resta)
        const g = R.screenToGround(mx, my); ui.aimPoint = g;
        if ((sx || sy) && g && Math.hypot(g.x - p.x, g.y - p.y) > .6) { const a = Math.atan2(g.y - p.y, g.x - p.x); inp = { x: Math.cos(a), y: Math.sin(a), sprint: run, aim: a }; }
      }
      G.step(st, dt, inp); ui.time += dt;
      R.frame(st, dt, ui);
      if (t >= 0) {
        const c = camera.position, pe = camera.matrixWorld.elements; v3.set(p.x, R.groundH(p.x, p.y) + 1, p.y).project(camera);
        const roll = Math.atan2(pe[1], pe[5]);   // l'asse x della camera rispetto al su del mondo
        const C2 = R.__cam2 || {}, reg = C2.REG ? C2.REG.S : null, PELL = window.__PELL;
        S.push({ t, px: p.x, py: p.y, cx: c.x, cy: c.y, cz: c.z, tx: cam.x, ty: cam.y, th: cam.h, yaw: cam.yaw, pitch: -Math.asin(Math.max(-1, Math.min(1, camera.getWorldDirection(v3).y))),
          fov: camera.fov, zoom: cam.zoom, lente: PELL && PELL.on ? PELL.gonfioOra : 0, roll: cam.roll || 0, sx: v3.x, sy: v3.y, sceltaN: (reg && reg.n) || 0, lx: cam.lx || 0, ly: cam.ly || 0 });
        // lo schermo del personaggio va misurato col punto vero (non quello guardato): rifatto qui sotto
        const q = new THREE.Vector3(p.x, R.groundH(p.x, p.y) + 1, p.y).project(camera); S[S.length - 1].sx = q.x; S[S.length - 1].sy = q.y;
      }
      t += dt; n++;
    };
    const T0 = performance.now();
    while (t < DURATA) { passo(); if (n % 30 === 0) await new Promise(r => setTimeout(r, 0)); }
    return { S, ms: (performance.now() - T0) / n, n, W, H };
  }, { stile, dt, posto, disegna, PASSI, RISCALDA, DURATA });
}

// ---------------- le misure ----------------
const unwrap = a => { const o = [a[0]]; for (let i = 1; i < a.length; i++) { let d = a[i] - a[i - 1]; d = Math.atan2(Math.sin(d), Math.cos(d)); o.push(o[i - 1] + d); } return o; };
function ricampiona(S, k, hz) {   // la serie k a hz campioni al secondo di gioco (interpolazione lineare)
  const T = S[S.length - 1].t, out = []; let j = 0;
  for (let t = S[0].t; t <= T; t += 1 / hz) { while (j < S.length - 2 && S[j + 1].t < t) j++; const a = S[j], b = S[j + 1] || a, f = b.t > a.t ? (t - a.t) / (b.t - a.t) : 0; out.push(a[k] + (b[k] - a[k]) * Math.max(0, Math.min(1, f))); }
  return out;
}
// x: serie a hz. eps: lo scarto sotto cui non conta (rumore numerico)
function misure(x, hz, eps) {
  const n = x.length, d = [], T = n / hz; for (let i = 1; i < n; i++) d.push(x[i] - x[i - 1]);
  let corsa = 0, inv = 0, segno = 0, acc = 0; for (const v of d) { corsa += Math.abs(v); if (Math.abs(v) > eps * .5) { const s = Math.sign(v); if (segno && s !== segno) { acc = 0; } acc += Math.abs(v); if (s !== segno && acc > eps) { if (segno) inv++; segno = s; } else if (!segno && acc > eps) segno = s; } }
  // gli episodi: tratti in cui si muove (oltre eps al secondo) separati da almeno 0,4 s di quiete
  let ep = 0, fermo = 99; for (const v of d) { if (Math.abs(v) * hz > eps * 4) { if (fermo >= .4) ep++; fermo = 0; } else fermo += 1 / hz; }
  // lo strappo: RMS della derivata terza; l'alta frequenza: RMS dello scarto da una media mobile di 0,5 s
  let j2 = 0; for (let i = 3; i < n; i++) { const j = (x[i] - 3 * x[i - 1] + 3 * x[i - 2] - x[i - 3]) * hz * hz * hz; j2 += j * j; }
  const w = Math.max(1, Math.round(hz * .25)); let hf = 0, hn = 0; for (let i = w; i < n - w; i++) { let m = 0; for (let k = -w; k <= w; k++) m += x[i + k]; m /= 2 * w + 1; hf += (x[i] - m) ** 2; hn++; }
  return { corsa: corsa / T, inv, ep, strappo: Math.sqrt(j2 / Math.max(1, n - 3)), af: Math.sqrt(hf / Math.max(1, hn)) };
}
function riassunto(r) {
  const S = r.S, HZ = 20; S.forEach(s => { s.ox = s.tx - s.px; s.oy = s.ty - s.py; });
  const yaw = unwrap(S.map(s => s.yaw)); S.forEach((s, i) => { s.yawU = yaw[i]; s.vh = s.zoom; });
  const R = k => ricampiona(S, k, HZ);
  const out = {
    yaw: misure(R('yawU'), HZ, .01),        // rad
    pendenza: misure(R('pitch'), HZ, .004), // rad
    zoom: misure(R('zoom'), HZ, .005),
    campo: misure(R('fov'), HZ, .05),       // gradi
    lente: misure(R('lente'), HZ, .0005),
    rollio: misure(R('roll'), HZ, .0005),
    scartoX: misure(R('ox'), HZ, .05), scartoY: misure(R('oy'), HZ, .05),   // m: il punto guardato meno il personaggio (sguardo avanti, mira, momenti)
    schermoX: misure(R('sx'), HZ, .01), schermoY: misure(R('sy'), HZ, .01), // il personaggio sullo schermo (-1..1)
    scelte: S[S.length - 1].sceltaN - S[0].sceltaN,                        // le scelte della regia (i «si riallinea» decisi)
    ms: +r.ms.toFixed(1), n: r.n,
  };
  return out;
}
const fmt = (v, d = 3) => (typeof v === 'number' ? (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(d)) : String(v));
function tabella(tutte) {
  const righe = [['modo', 'stile', 'dt', 'yaw corsa/s', 'yaw inv', 'yaw episodi', 'scelte regia', 'yaw strappo', 'pend corsa/s', 'pend inv', 'pend episodi', 'zoom corsa/s', 'zoom inv', 'lente inv', 'lente corsa/s', 'scarto m/s', 'scarto inv', 'schermo corsa/s', 'schermo inv', 'schermo AF', 'schermo strappo']];
  for (const r of tutte) { const m = r.m;
    righe.push([r.modo, r.stile, r.dt, fmt(m.yaw.corsa), m.yaw.inv, m.yaw.ep, m.scelte, fmt(m.yaw.strappo, 1), fmt(m.pendenza.corsa, 4), m.pendenza.inv, m.pendenza.ep, fmt(m.zoom.corsa, 4), m.zoom.inv, m.lente.inv, fmt(m.lente.corsa, 5),
      fmt(m.scartoX.corsa + m.scartoY.corsa, 2), m.scartoX.inv + m.scartoY.inv, fmt(m.schermoX.corsa + m.schermoY.corsa), m.schermoX.inv + m.schermoY.inv, fmt(Math.hypot(m.schermoX.af, m.schermoY.af), 4), fmt(Math.hypot(m.schermoX.strappo, m.schermoY.strappo), 1)]); }
  const w = righe[0].map((_, i) => Math.max(...righe.map(r => String(r[i]).length)));
  return righe.map(r => r.map((c, i) => String(c).padStart(w[i])).join(' | ')).join('\n');
}

const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const T0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0)} s]`, ...a);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const tutte = [];
  try {
    for (const modo of MODI) {
      const pg = await b.newPage({ viewport: { width: +(ARG.w || 640), height: +(ARG.h || 360) } });
      const errori = []; pg.on('pageerror', e => { errori.push(e.message); log('[errore]', e.message); });
      pg.on('console', m => { if (m.type() === 'error' || /\[camera2\]|\[regia\]|\[visuale4\]/.test(m.text())) log('[console]', m.type(), m.text().slice(0, 200)); });
      const q = QUERY + (modo === 'vecchia' ? '&camvecchia' : '');
      await pg.goto(`http://localhost:${srv.address().port}/${ARG.pagina || "index.html"}?${q}`, { waitUntil: 'domcontentloaded', timeout: 0 });
      await pg.waitForFunction(() => window.__tl && window.__tl.gioco, null, { timeout: 1800000, polling: 1000 });
      log(modo, 'gioco pronto', q);
      await pg.keyboard.press('Enter'); await pg.waitForTimeout(3000);
      await pg.waitForFunction(() => !window.__pv.ui.intro, null, { timeout: 120000 }).catch(() => log('ancora nella schermata iniziale'));
      for (const stile of STILI) for (const dt of DTS) {
        const r = await corsa(pg, stile, dt, ARG.posto || 'piazza', !!ARG.disegna);
        const m = riassunto(r); tutte.push({ modo, stile, dt, m });
        log(modo, stile, 'dt', dt, 'fotogrammi', r.n, 'ms/fotogramma', m.ms, 'yaw corsa/s', fmt(m.yaw.corsa), 'episodi', m.yaw.ep, 'scelte', m.scelte, 'schermo inv', m.schermoX.inv + m.schermoY.inv);
        if (ARG.serie) fs.writeFileSync(`${ARG.serie}_${modo}_${stile}_${dt}.json`, JSON.stringify(r.S));
      }
      await pg.close();
    }
  } catch (e) { log('errore', e.stack || e); }
  await b.close(); srv.close();
  console.log('\n' + tabella(tutte));
  if (ARG.json) fs.writeFileSync(ARG.json, JSON.stringify(tutte, null, 1));
});
