// harness comune: server statico, avvio del gioco vero, stato della camera, foto
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const ROOT = '/home/user/porto-vecchio/.claude/worktrees/camera7/v7', OUT = __dirname;
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.gz': 'application/gzip', '.ktx2': 'image/ktx2', '.css': 'text/css' };
function server() {
  return new Promise(res => {
    const srv = http.createServer((req, r) => {
      let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
      if (u.startsWith('/api/')) { r.writeHead(200, { 'Content-Type': 'application/json' }); r.end('{"ok":false}'); return; }
      const p = path.join(ROOT, u); fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); r.end(d); });
    }).listen(0, () => res(srv));
  });
}
function initPagina() {
  const pad = { id: 'finto', index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
  window.__pad = pad; window.__padOn = false; navigator.getGamepads = () => window.__padOn ? [pad, null, null, null] : [null, null, null, null];
}
async function avvia(opts = {}) {
  const srv = await server();
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: opts.vp || { width: 800, height: 450 }, hasTouch: !!opts.touch, isMobile: !!opts.touch, deviceScaleFactor: 1 });
  const pg = await ctx.newPage(); await pg.addInitScript(initPagina);
  const T0 = Date.now(); const log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0)}s]`, ...a);
  pg.on('pageerror', e => log('[pageerror]', e.message.slice(0, 200)));
  pg.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) log('[console]', m.text().slice(0, 160)); });
  const q = opts.query === undefined ? 'tassellivecchi' : opts.query;
  await pg.goto(`http://localhost:${srv.address().port}/index.html?${q}`, { waitUntil: 'domcontentloaded', timeout: 0 });
  await pg.waitForFunction(() => window.__tl && window.__tl.gioco, null, { timeout: 1800000, polling: 1000 });
  log('caricato');
  if (opts.shotIntro) await foto(pg, opts.shotIntro);
  await pg.keyboard.press('Enter'); await pg.waitForTimeout(2000);
  await pg.waitForFunction(() => !window.__pv.ui.intro, null, { timeout: 120000 }).catch(() => log('ancora intro'));
  log('in gioco'); await pg.evaluate(() => { window.PV_ATTESA.on = () => true; });
  const S = (f, a) => pg.evaluate(f, a);
  const gioca = async sec => { const t0 = await S(() => window.__pv.ui.time); for (let i = 0; i < 4000; i++) { await pg.waitForTimeout(100); const t = await S(() => window.__pv.ui.time); if (t - t0 >= sec) return; } };
  const close = async () => { await b.close(); srv.close(); };
  return { b, pg, S, gioca, log, close };
}
// lo stato: camera, personaggio, quanto suolo si vede davanti, quanto è grande il personaggio sullo schermo
const STATO = () => {
  const pv = window.__pv, R = pv.R, p = pv.st.player, c = R.cam, cm = R.getCamera(), d = new THREE.Vector3(); cm.getWorldDirection(d);
  const gh = R.groundH(p.x, p.y), W = innerWidth, H = innerHeight;
  const proj = (x, y, z) => { const v = new THREE.Vector3(x, y, z).project(cm); return { x: (v.x * .5 + .5) * W, y: (1 - (v.y * .5 + .5)) * H, z: v.z }; };
  const piedi = proj(p.x, gh, p.y), testa = proj(p.x, gh + 1.75, p.y);
  // quanto suolo si vede davanti al personaggio, lungo la direzione della camera (il raggio del bordo alto dello schermo)
  const pitch = -Math.asin(Math.max(-1, Math.min(1, d.y))), hf = cm.fov * Math.PI / 360, hc = cm.position.y - gh;
  const top = pitch - hf; const horiz = Math.hypot(cm.position.x - p.x, cm.position.z - p.y);
  const davanti = top > .01 ? hc / Math.tan(top) - horiz : Infinity;
  const C6 = R.__cam6 ? R.__cam6.CAM6 : null;
  return { t: +pv.ui.time.toFixed(2), x: +p.x.toFixed(2), y: +p.y.toFixed(2), face: +p.face.toFixed(3), spd: +Math.hypot(p.vx || 0, p.vy || 0).toFixed(2), pspeed: p.speed, yaw: +c.yaw.toFixed(3), zoom: pv.ui.zoom, tilt: pv.ui.tilt || 0,
    pitchDeg: +(pitch * 57.3).toFixed(1), fov: +cm.fov.toFixed(1), camH: +hc.toFixed(2), dist: +cm.position.distanceTo(new THREE.Vector3(p.x, gh + 1, p.y)).toFixed(2), horiz: +horiz.toFixed(2),
    davanti: davanti === Infinity ? 'orizzonte' : +davanti.toFixed(1), omPx: +(piedi.y - testa.y).toFixed(1), omX: +(piedi.x / W).toFixed(3), omY: +(piedi.y / H).toFixed(3), near: +cm.near.toFixed(2),
    w: C6 ? { a: +C6.w.a.toFixed(2), m: +C6.w.m.toFixed(2), v: +C6.w.v.toFixed(2) } : null, coll: C6 && C6.coll.x !== null ? +C6.coll.x.toFixed(2) : null, urto: C6 ? !!C6.urto : null, asse: C6 ? C6.asse : null,
    veh: p.vehicle || null, jz: p.jz || 0, indoor: !!p.indoor };
};
async function foto(pg, nome, q = 70) { const f = path.join(OUT, nome + '.jpg'); await pg.screenshot({ path: f, type: 'jpeg', quality: q, timeout: 180000 }); return f; }
// provino: piu foto in una griglia
function provino(files, out, titolo, C = 4, Wc = 400, Hc = 225) {
  const { execFileSync } = require('child_process');
  const py = `
import sys, json
from PIL import Image, ImageDraw
fs = json.loads(sys.argv[1]); out = sys.argv[2]; titolo = sys.argv[3]; C, W, H = int(sys.argv[4]), int(sys.argv[5]), int(sys.argv[6])
R = (len(fs) + C - 1) // C
S = Image.new('RGB', (C * W, R * H + 22), (20, 20, 20)); dr = ImageDraw.Draw(S); dr.text((6, 5), titolo, fill=(255, 255, 255))
for i, (f, lab) in enumerate(fs):
    im = Image.open(f).convert('RGB').resize((W, H)); x, y = (i % C) * W, 22 + (i // C) * H; S.paste(im, (x, y))
    dr.rectangle((x, y, x + 7 * len(lab) + 4, y + 12), fill=(0, 0, 0)); dr.text((x + 2, y), lab, fill=(255, 230, 120))
S.save(out, quality=82)
`;
  execFileSync('python3', ['-c', py, JSON.stringify(files), out, titolo, String(C), String(Wc), String(Hc)]);
}
module.exports = { avvia, STATO, foto, provino, OUT };
