// [camera6] LA SONDA DEI COMANDI: la levetta destra gira senza zoom, pizzico e rotella fanno lo zoom, si cammina rispetto alla camera, mirando
// il personaggio guarda dove guarda la camera, in bici la camera sta dietro e indietro si impenna.
//   node strumenti/sonda_comandi6.js [--query=cittanuova&leggera&tassellivecchi] [--modi=nuova,vecchia] [--json=uscita.json]
// Il gioco vero col suo giro (main.js) e un controller finto (navigator.getGamepads), i tasti e la rotella di Playwright, il pizzico con due
// puntatori «touch» finti sulla tela. I tempi sono di gioco (ui.time), non veri. --modi=vecchia aggiunge ?nofixcamera6.
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || 'playwright');
const ARG = {}; for (const a of process.argv.slice(2)) { const m = /^--([a-z]+)(?:=(.*))?$/.exec(a); if (m) ARG[m[1]] = m[2] === undefined ? true : m[2]; }
const root = path.resolve(__dirname, '..'), QUERY = (ARG.query || 'cittanuova&leggera&tassellivecchi').replace(/^[?&]/, ''), MODI = (ARG.modi || 'nuova,vecchia').split(',');
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.gz': 'application/gzip' };
function initPagina() {
  const pad = { id: 'finto', index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
  window.__pad = pad; window.__padOn = false; navigator.getGamepads = () => window.__padOn ? [pad, null, null, null] : [null, null, null, null];
}
async function prova(pg) {
  const S = async (f, a) => pg.evaluate(f, a);
  // aspetta `sec` secondi di gioco
  const gioca = async sec => { const t0 = await S(() => window.__pv.ui.time); for (let i = 0; i < 4000; i++) { await pg.waitForTimeout(150); const t = await S(() => window.__pv.ui.time); if (t - t0 >= sec) return; } };
  const stato = () => S(() => { const pv = window.__pv, R = pv.R, p = pv.st.player, c = R.cam, cm = R.getCamera(), d = new THREE.Vector3(); cm.getWorldDirection(d); const B = R.camBasis(), C6 = R.__cam6;
    const v = p.vehicle ? pv.st.vehicles.find(q => q.id === p.vehicle) : null;
    return { x: p.x, y: p.y, face: p.face, yaw: c.yaw, zoom: pv.ui.zoom, camZoom: c.zoom, tilt: pv.ui.tilt || 0, pitch: -Math.asin(Math.max(-1, Math.min(1, d.y))), dist: cm.position.distanceTo(new THREE.Vector3(c.x, c.h, c.y)), avanti: Math.atan2(B.fz, B.fx), moto: Math.atan2(d.z, d.x),
      v: v ? { ang: v.ang, head: Math.atan2(v.vy || 0, v.vx || 0), vel: Math.hypot(v.vx || v.speed || 0, v.vy || 0), wheelie: v.wheelie || 0, kind: v.kind } : null, w: C6 ? Object.assign({}, C6.CAM6.w) : null }; });
  const ang = a => Math.atan2(Math.sin(a), Math.cos(a)), deg = a => +(a * 57.3).toFixed(1);
  const padSet = (o) => S(o => { const P = window.__pad; window.__padOn = true; if (o.axes) o.axes.forEach((v, i) => { P.axes[i] = v; }); if (o.btn) for (const k in o.btn) { const b = P.buttons[+k]; b.value = o.btn[k]; b.pressed = o.btn[k] > .5; } P.timestamp++; }, o);
  const padZero = () => padSet({ axes: [0, 0, 0, 0], btn: { 6: 0, 7: 0, 11: 0 } });
  const R = {};
  await gioca(1); const s0 = await stato(); R.avvio = { zoom: s0.zoom, pesi: s0.w, pendenza: +s0.pitch.toFixed(2), distanza: +s0.dist.toFixed(1) };
  // 1. la levetta destra di lato: gira, lo zoom non cambia
  await padSet({ axes: [0, 0, 1, 0] }); await gioca(1.2); let s1 = await stato(); await padZero(); await gioca(.4);
  R.destraX = { giro: deg(ang(s1.yaw - s0.yaw)), zoomPrima: s0.zoom, zoomDopo: s1.zoom, zoomCambia: Math.abs(s1.zoom - s0.zoom) > 1e-6 };
  // 2. la levetta destra in su: inclina, lo zoom non cambia
  const s2a = await stato(); await padSet({ axes: [0, 0, 0, -1] }); await gioca(1); const s2 = await stato(); await padZero(); await gioca(.4);
  R.destraY = { tiltPrima: +s2a.tilt.toFixed(2), tiltDopo: +s2.tilt.toFixed(2), pendPrima: +s2a.pitch.toFixed(2), pendDopo: +s2.pitch.toFixed(2), zoomCambia: Math.abs(s2.zoom - s2a.zoom) > 1e-6 };
  await S(() => { window.__pv.ui.tilt = 0; }); await S(() => { window.__padOn = false; });
  // 3. la rotella e il pizzico fanno lo zoom
  const z3 = (await stato()).zoom; const box = await pg.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await pg.mouse.move(box.x, box.y); await pg.mouse.wheel(0, 240); await gioca(.3); const z3b = (await stato()).zoom;
  await S(b => { const cv = document.querySelector('canvas'), ev = (t, id, x, y) => cv.dispatchEvent(new PointerEvent(t, { pointerId: id, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, isPrimary: id === 71 }));
    ev('pointerdown', 71, b.x - 20, b.y); ev('pointerdown', 72, b.x + 20, b.y); for (let i = 1; i <= 6; i++) { ev('pointermove', 71, b.x - 20 - i * 12, b.y); ev('pointermove', 72, b.x + 20 + i * 12, b.y); } ev('pointerup', 71, 0, 0); ev('pointerup', 72, 0, 0); }, box);
  await gioca(.3); const z3c = (await stato()).zoom;
  R.zoom = { prima: +z3.toFixed(3), rotella: +z3b.toFixed(3), pizzico: +z3c.toFixed(3) };
  // 4. le tre viste: V e R3
  const v0 = (await stato()).zoom; await pg.keyboard.press('v'); await gioca(.6); const v1 = await stato(); await padSet({ btn: { 11: 1 } }); await gioca(.3); await padSet({ btn: { 11: 0 } }); await gioca(.6); const v2 = await stato(); await S(() => { window.__padOn = false; });
  await pg.keyboard.press('v'); await gioca(.6); const v3 = await stato();
  R.viste = { prima: +v0.toFixed(2), V: v1.zoom, R3: v2.zoom, V2: v3.zoom, pesi: [v1.w, v2.w, v3.w].map(w => w ? `a${w.a.toFixed(1)} m${w.m.toFixed(1)} v${w.v.toFixed(1)}` : '') };
  // torna alla vista media
  await S(() => { window.__pv.ui.zoom = .5; }); await gioca(1);
  // 5. la camminata relativa alla camera: si gira la visuale di ~90° e si spinge la levetta sinistra in su
  await padSet({ axes: [0, 0, 1, 0] }); await gioca(.9); await padZero(); await gioca(.5);
  const c5 = await stato(); await padSet({ axes: [0, -1, 0, 0] }); await gioca(1.5); const c5b = await stato(); await padZero(); await gioca(.4);
  const dir5 = Math.atan2(c5b.y - c5.y, c5b.x - c5.x);
  R.relativaLevetta = { avantiCamera: deg(c5.avanti), direzione: deg(dir5), scarto: deg(ang(dir5 - c5.avanti)), metri: +Math.hypot(c5b.x - c5.x, c5b.y - c5.y).toFixed(1), faccia: deg(ang(c5b.face - dir5)) };
  // e coi tasti (W): la stessa cosa
  await S(() => { window.__padOn = false; }); await gioca(.3); const c6 = await stato(); await pg.keyboard.down('w'); await gioca(1.5); await pg.keyboard.up('w'); const c6b = await stato();
  const dir6 = Math.atan2(c6b.y - c6.y, c6b.x - c6.x);
  R.relativaTasti = { avantiCamera: deg(c6.avanti), direzione: deg(dir6), scarto: deg(ang(dir6 - c6.avanti)), metri: +Math.hypot(c6b.x - c6.x, c6b.y - c6.y).toFixed(1), faccia: deg(ang(c6b.face - dir6)) };
  // 6. la mira: L2 tenuto, levetta sinistra a destra (si va di lato), poi si gira la visuale mirando
  await gioca(.3); const m0 = await stato(); await padSet({ axes: [1, 0, 0, 0], btn: { 6: 1 } }); await gioca(1.4); const m1 = await stato();
  await padSet({ axes: [0, 0, 1, 0], btn: { 6: 1 } }); await gioca(.8); await padSet({ axes: [0, 0, 0, 0], btn: { 6: 1 } }); await gioca(.6); const m2 = await stato(); await padZero(); await gioca(.6); const m3 = await stato();
  const dir7 = Math.atan2(m1.y - m0.y, m1.x - m0.x);
  R.mira = { faccia_meno_camera: deg(ang(m1.face - m1.avanti)), passo_meno_camera: deg(ang(dir7 - m1.avanti)), dopoGiro_faccia_meno_camera: deg(ang(m2.face - m2.avanti)), giroMirando: deg(ang(m2.yaw - m1.yaw)), distMirando: +m1.dist.toFixed(1), distDopo: +m3.dist.toFixed(1) };
  // 7. la bici: si sale, gas (R2) e sterzo; la camera dietro la velocità; indietro sulla levetta destra impenna; di lato gira e poi torna
  await S(() => { window.__padOn = false; window.__pv.bmx(); }); await gioca(1); const b0 = await stato();
  if (b0.v) {
    await padSet({ axes: [0, 0, 0, 0], btn: { 7: 1 } }); await gioca(2.5); await padSet({ axes: [.6, 0, 0, 0], btn: { 7: 1 } }); await gioca(1.5); await padSet({ axes: [0, 0, 0, 0], btn: { 7: 1 } }); await gioca(2.5); const b1 = await stato();
    await padSet({ axes: [0, 0, 0, 1], btn: { 7: 1 } }); await gioca(.8); const b2 = await stato();
    await padSet({ axes: [0, 0, 1, 0], btn: { 7: 1 } }); await gioca(.8); const b3 = await stato(); await padSet({ axes: [0, 0, 0, 0], btn: { 7: 1 } }); await gioca(3.5); const b4 = await stato(); await padZero();
    const dietro = s => deg(ang(s.avanti - (s.v.vel > 1 ? s.v.head : s.v.ang)));
    R.bici = { mezzo: b0.v.kind, vel: +b1.v.vel.toFixed(1), camera_meno_marcia: dietro(b1), pendenza: +b1.pitch.toFixed(2), distanza: +b1.dist.toFixed(1), impennaIndietro: +b2.v.wheelie.toFixed(2), impennaPrima: +b1.v.wheelie.toFixed(2),
      giroLevetta: deg(ang(b3.yaw - b2.yaw)), dopo35s_camera_meno_marcia: dietro(b4) };
  } else R.bici = { errore: 'niente bici' };
  return R;
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
      const pg = await b.newPage({ viewport: { width: 480, height: 270 } }); await pg.addInitScript(initPagina);
      pg.on('pageerror', e => log('[errore]', e.message)); pg.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) log('[console]', m.text().slice(0, 200)); if (/\[camera6\]|\[camera5\]|\[regia\]/.test(m.text())) log('[console]', m.text().slice(0, 200)); });
      const q = QUERY + (modo === 'vecchia' ? '&nofixcamera6' : '');
      await pg.goto(`http://localhost:${srv.address().port}/${ARG.pagina || 'index.html'}?${q}`, { waitUntil: 'domcontentloaded', timeout: 0 });
      await pg.waitForFunction(() => window.__tl && window.__tl.gioco, null, { timeout: 1800000, polling: 1000 });
      await pg.keyboard.press('Enter'); await pg.waitForTimeout(2000);
      await pg.waitForFunction(() => !window.__pv.ui.intro, null, { timeout: 120000 }).catch(() => log('ancora nella schermata iniziale'));
      log(modo, 'in gioco', q);
      out[modo] = await prova(pg);
      console.log(`\n== ${modo} ==`); for (const k in out[modo]) console.log(k.padEnd(16), JSON.stringify(out[modo][k]));
      await pg.close();
    }
  } catch (e) { log('errore', e.stack || e); }
  await b.close(); srv.close();
  if (ARG.json) fs.writeFileSync(ARG.json, JSON.stringify(out, null, 1));
});
