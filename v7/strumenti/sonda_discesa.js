// [camera3] LA SONDA DELLA DISCESA: cosa costa la camera che scende verso l'orizzonte (lo zoom sotto .42: la visuale bassa, [bassa]).
//   node strumenti/sonda_discesa.js [--query=cittanuova&leggera&tassellivecchi] [--modi=nuova,vecchia] [--vista=480x270] [--tieni=4]
//                                   [--posto=piazza|borgo|x,y] [--json=/percorso/uscita.json] [--disegna]
// Il gioco vero, col disegno vero (Chromium senza testa, SwiftShader: i millisecondi valgono come rapporti; disegni, triangoli, byte e
// tasselli valgono uguali dappertutto). Il giro di main.js si ferma e i fotogrammi li fa la sonda (G.step + R.frame, dt 1/30): per ogni
// zoom da 2 (lontano) a .12 (la visuale più bassa) la camera resta --tieni secondi veri e si misura, per fotogramma: i ms del processore
// (passo + disegno), i disegni e i triangoli di tutte le passate (ombre comprese), i byte mandati alla scheda video (buffer e tessiture),
// i tasselli in scena e in arrivo, le cotture delle ombre, la nebbia e il piano lontano. Poi una discesa continua (zoom 1 → .12 in 3 s
// di gioco: i picchi e il tempo con cui la pendenza arriva) e 5 s di cammino nella visuale bassa.
// --modi=vecchia aggiunge ?nofixbassa (com'era prima di [camera3]). Di difetto i disegni non vanno a SwiftShader (gl.draw* vuoti: i suoi
// tempi sono rumore, fotogrammi da 1 a 18 s); three li conta lo stesso, quindi disegni e triangoli restano veri e i ms sono il processore.
// --disegna li manda davvero. Si contano anche i programmi nuovi (ognuno è un'attesa), i mezzi in scena e le cose ricaricate dallo streaming.
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || 'playwright');
const ARG = {}; for (const a of process.argv.slice(2)) { const m = /^--([a-z]+)(?:=(.*))?$/.exec(a); if (m) ARG[m[1]] = m[2] === undefined ? true : m[2]; }
const root = path.resolve(__dirname, '..');
const QUERY = (ARG.query || 'cittanuova&leggera&tassellivecchi').replace(/^[?&]/, ''), MODI = (ARG.modi || 'nuova,vecchia').split(',');
const [VW, VH] = (ARG.vista || '480x270').split('x').map(Number), TIENI = +(ARG.tieni || 3);
const ZOOM = [2, 1.5, 1.1, .8, .6, .5, .44, .4, .36, .32, .28, .24, .2, .16, .12];
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.gz': 'application/gzip' };

// dentro la pagina, prima di tutto: i contatori dei byte verso la scheda video
function initPagina() {
  const S = window.__SD = { up: 0 };
  const bpp = () => 4;
  const w = (P, name, f) => { const o = P[name]; if (typeof o !== 'function') return; P[name] = function () { try { S.up += f(arguments) || 0; } catch (e) { } return o.apply(this, arguments); }; };
  const dims = s => s ? [s.videoWidth || s.naturalWidth || s.width || 0, s.videoHeight || s.naturalHeight || s.height || 0] : [0, 0];
  for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) { if (!C) continue; const P = C.prototype;
    w(P, 'bufferData', a => typeof a[1] === 'number' ? a[1] : a[1] ? a[1].byteLength : 0);
    w(P, 'bufferSubData', a => a[2] ? (a[4] ? a[4] * (a[2].BYTES_PER_ELEMENT || 1) : a[2].byteLength) : 0);
    w(P, 'texImage2D', a => a.length >= 9 ? a[3] * a[4] * bpp() : (([W, H]) => W * H * 4)(dims(a[5])));
    w(P, 'texSubImage2D', a => a.length >= 9 ? a[4] * a[5] * bpp() : (([W, H]) => W * H * 4)(dims(a[6])));
    w(P, 'texImage3D', a => a[3] * a[4] * a[5] * 4);
    w(P, 'compressedTexImage2D', a => a[6] ? a[6].byteLength : 0); }
}

async function prova(pg, posto, disegna) {
  return pg.evaluate(async ({ ZOOM, TIENI, posto, disegna }) => {
    const pv = window.__pv, R = pv.R, G = pv.G, st = pv.st, p = st.player, cam = R.cam, camera = R.getCamera(), rd = R.__models.renderer, scene = R.__models.scene, SD = window.__SD;
    window.PV_ATTESA.on = () => true;   // il giro di main.js si ferma
    const gl = rd.getContext(); if (!disegna && !gl.__vuoto) { gl.__vuoto = 1; for (const k of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) if (gl[k]) gl[k] = function () { }; }
    const prog = () => (rd.info.programs || []).length, mezzi = () => { const D = R.__models && R.__models.scene; let n = 0; const V = R.__vehicles || {}; for (const k in V) if (V[k] && V[k].visible) n++; return n; }, carichi = () => window.__stream ? window.__stream.carichi : 0;
    const r0 = rd.render; let calls = 0, tris = 0; rd.render = function () { const r = r0.apply(this, arguments); calls += rd.info.render.calls; tris += rd.info.render.triangles; return r; };
    const P = G.PLACES || {}; let x0, y0;
    if (/^[0-9.]+,[0-9.]+$/.test(posto)) [x0, y0] = posto.split(',').map(Number); else if (posto === 'borgo') { x0 = 1400; y0 = 312; } else { const q = P.piazza || { x: 1300, y: 330 }; x0 = q.x; y0 = q.y; }
    p.x = x0; p.y = y0; p.path = []; p.vehicle = null; p.indoor = null; p.lv = null; if (R.camReset) R.camReset(); R.snap(st);
    const ui = { studio: false, focus: null, mark: null, aimPoint: null, dialogNpc: null, intro: false, letterbox: false, flash: 0, fade: 0, desat: false, time: pv.ui.time || 0, zoom: 2, stick: null, lead: null, pan: null, tilt: 0, camMano: false, rot: 0, drag: 0, top: false, edge: 0, puntatore: false };
    let dt = 1 / 30; const T = () => window.Tasselli && Tasselli.stato ? Tasselli.stato() : {}, PO = () => window.PesoOmbre && PesoOmbre.conto ? PesoOmbre.conto().cotture || 0 : 0;
    const dove = new THREE.Vector3();
    const fot = (inp) => { calls = 0; tris = 0; const u0 = SD.up, t0 = performance.now(); G.step(st, dt, inp || { x: 0, y: 0 }); ui.time += dt; R.frame(st, dt, ui); const ms = performance.now() - t0;
      camera.getWorldDirection(dove); return { ms, calls, tris, up: SD.up - u0, pitch: -Math.asin(Math.max(-1, Math.min(1, dove.y))), fog: scene.fog ? scene.fog.far : 0, far: camera.far }; };
    const pausa = () => new Promise(r => setTimeout(r, 0));   // i tasselli e i lavoratori vanno avanti fra un fotogramma e l'altro (come col giro vero)
    const med = a => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[b.length >> 1] : 0; }, p95 = a => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[Math.min(b.length - 1, Math.floor(b.length * .95))] : 0; };
    // al lontano finché la città vicina è in scena (al più 40 s veri)
    ui.zoom = 2; { const t0 = performance.now(); while (performance.now() - t0 < 40000) { fot(); await pausa(); const s = T(); if (performance.now() - t0 > 8000 && !s.pronti && !s.inVolo) break; } }
    const righe = [];
    for (const z of ZOOM) {
      ui.zoom = z; const F = [], s0 = T(), o0 = PO(), g0 = prog(), c0 = carichi(), t0 = performance.now(); let n = 0;
      while ((performance.now() - t0 < TIENI * 1000 || F.length < 12) && performance.now() - t0 < 60000) { const f = fot(); if (n++ >= 2) F.push(f); await pausa(); }
      const s1 = T(), last = F[F.length - 1] || {};
      righe.push({ zoom: z, n: F.length, ms: +med(F.map(f => f.ms)).toFixed(1), ms95: +p95(F.map(f => f.ms)).toFixed(1), disegni: Math.round(med(F.map(f => f.calls))), triK: Math.round(med(F.map(f => f.tris)) / 1000),
        upMB: +(F.reduce((s, f) => s + f.up, 0) / Math.max(1, F.length) / 1048576).toFixed(2), upPicco: +(Math.max(0, ...F.map(f => f.up)) / 1048576).toFixed(1),
        tasselli: s1.inScena, verticiK: Math.round((s1.vertici || 0) / 1000), montati: (s1.inScena || 0) - (s0.inScena || 0), scaricatiMB: +(((s1.byte || 0) - (s0.byte || 0)) / 1048576).toFixed(1), attesa: (s1.pronti || 0) + (s1.inVolo || 0),
        ombre: PO() - o0, programmi: prog() - g0, mezzi: mezzi(), stream: carichi() - c0, pendenza: +last.pitch.toFixed(2), nebbia: Math.round(last.fog), lontano: Math.round(last.far) });
    }
    // la discesa continua: zoom 1 → .12 in 3 s di gioco (a 15 fotogrammi al secondo), poi 2 s fermi
    dt = 1 / 15; ui.zoom = 1; for (let i = 0; i < 45; i++) { fot(); await pausa(); }
    const gD = prog(), cD = carichi(); const D = []; for (let i = 0; i < 75; i++) { ui.zoom = i < 45 ? 1 * Math.pow(.12, i / 44) : .12; const f = fot(); f.t = i * dt; D.push(f); await pausa(); }
    const pf = D[D.length - 1].pitch, p0 = D[0].pitch, arriva = (D.find(f => Math.abs(f.pitch - pf) < .1 * Math.abs(pf - p0)) || D[D.length - 1]).t;
    const disc = { ms: +med(D.map(f => f.ms)).toFixed(1), ms95: +p95(D.map(f => f.ms)).toFixed(1), msMax: +Math.max(...D.map(f => f.ms)).toFixed(0), disegniMax: Math.max(...D.map(f => f.calls)), upMB: +(D.reduce((s, f) => s + f.up, 0) / D.length / 1048576).toFixed(2), programmi: prog() - gD, stream: carichi() - cD, pendenza90: +(arriva - 3).toFixed(2), salti: D.slice(1).filter((f, i) => Math.abs(f.pitch - D[i].pitch) > .06).length };
    // 5 s di cammino nella visuale bassa (la levetta in su: si guarda lontano davanti)
    const C = [], s0 = T(), o0 = PO(), gC = prog(), cC = carichi();
    for (let i = 0; i < 75; i++) { const B = R.camBasis(), inp = { x: B.fx, y: B.fz, sprint: true, aim: Math.atan2(B.fz, B.fx), mag: 1 }; ui.lead = { x: B.fx, y: B.fz, m: 1 }; ui.stick = { x: 0, y: -1 }; C.push(fot(inp)); await pausa(); }
    ui.lead = ui.stick = null; const s1 = T();
    const cammino = { ms: +med(C.map(f => f.ms)).toFixed(1), ms95: +p95(C.map(f => f.ms)).toFixed(1), msMax: +Math.max(...C.map(f => f.ms)).toFixed(0), disegni: Math.round(med(C.map(f => f.calls))), triK: Math.round(med(C.map(f => f.tris)) / 1000),
      upMB: +(C.reduce((s, f) => s + f.up, 0) / C.length / 1048576).toFixed(2), montati: (s1.montati || s1.inScena) - (s0.montati || s0.inScena), scaricatiMB: +(((s1.byte || 0) - (s0.byte || 0)) / 1048576).toFixed(1), ombre: PO() - o0, tasselli: s1.inScena, programmi: prog() - gC, stream: carichi() - cC, mezzi: mezzi() };
    rd.render = r0;
    return { righe, disc, cammino };
  }, { ZOOM, TIENI, posto, disegna });
}

const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const T0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0)} s]`, ...a), out = {};
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  try {
    for (const modo of MODI) {
      const pg = await b.newPage({ viewport: { width: VW, height: VH } }); await pg.addInitScript(initPagina);
      pg.on('pageerror', e => log('[errore]', e.message)); pg.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) log('[console]', m.text().slice(0, 200)); });
      const q = QUERY + (modo === 'vecchia' ? '&nofixbassa' : '');
      await pg.goto(`http://localhost:${srv.address().port}/${ARG.pagina || 'index.html'}?${q}`, { waitUntil: 'domcontentloaded', timeout: 0 });
      await pg.waitForFunction(() => window.__tl && window.__tl.gioco, null, { timeout: 1800000, polling: 1000 });
      log(modo, 'gioco pronto', q);
      await pg.keyboard.press('Enter'); await pg.waitForTimeout(3000);
      await pg.waitForFunction(() => !window.__pv.ui.intro, null, { timeout: 120000 }).catch(() => log('ancora nella schermata iniziale'));
      const r = await prova(pg, ARG.posto || 'piazza', !!ARG.disegna); out[modo] = r;
      console.log(`\n== ${modo} (${q}) ==`);
      const K = Object.keys(r.righe[0]); console.log(K.join('\t')); r.righe.forEach(x => console.log(K.map(k => x[k]).join('\t')));
      console.log('discesa continua', JSON.stringify(r.disc)); console.log('cammino in basso', JSON.stringify(r.cammino));
      await pg.close();
    }
  } catch (e) { log('errore', e.stack || e); }
  await b.close(); srv.close();
  if (ARG.json) fs.writeFileSync(ARG.json, JSON.stringify(out, null, 1));
});
