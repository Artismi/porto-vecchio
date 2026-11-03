// [camera6] I PROVINI DELLA CAMERA 6: le tre viste nello stesso vicolo e nella stessa piazza, il cammino con la camera che gira, la mira, la
// bici, la piazza coi tavolini e gli ombrelloni.
//   node strumenti/sonda_camera6.js --foto=/cartella [--query=cittanuova&leggera&tassellivecchi] [--modi=nuova] [--scene=viste,giro,mira,bici,ombrelloni]
// Il gioco vero senza testa; il giro di main.js si ferma e la sonda fa i fotogrammi (dt 1/30, a passo d'uomo 1,5 m/s); i disegni vanno a
// SwiftShader solo per le foto (una ogni 0,5 s di gioco). Per ogni scena un provino (6 colonne, l'ora in alto) e, accanto, i conti: le cose
// piccole nascoste, le case tagliate, i tetti sbiaditi, le accensioni (quello che compare o sparisce). --modi=vecchia aggiunge ?nofixcamera6.
const path = require('path'), http = require('http'), fs = require('fs'), { execFileSync } = require('child_process');
const { chromium } = require(process.env.PW || 'playwright');
const ARG = {}; for (const a of process.argv.slice(2)) { const m = /^--([a-z]+)(?:=(.*))?$/.exec(a); if (m) ARG[m[1]] = m[2] === undefined ? true : m[2]; }
const root = path.resolve(__dirname, '..'), QUERY = (ARG.query || 'cittanuova&leggera&tassellivecchi').replace(/^[?&]/, ''), MODI = (ARG.modi || 'nuova').split(','), FOTO = ARG.foto || '/tmp/camera6';
const SCENE = (ARG.scene || 'viste,giro,mira,bici,ombrelloni').split(',');
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.gz': 'application/gzip' };

// una scena dentro la pagina: { nome, pts (il percorso), zoom, gira (rad/s), mira, bici, sec (se ferma) }
async function scena(pg, S) {
  return pg.evaluate(async S => {
    { const G = window.__pv.G, giu = q => { if (G.walkM(q[0], q[1])) return q; for (let r = .5; r < 8; r += .5) for (let a = 0; a < 6.28; a += .4) { const x = q[0] + Math.cos(a) * r, y = q[1] + Math.sin(a) * r; if (G.walkM(x, y)) return [x, y]; } return q; }; S.pts = S.pts.map(giu); }   // i punti dove si cammina davvero
    const pv = window.__pv, R = pv.R, G = pv.G, st = pv.st, p = st.player, cam = R.cam, camera = R.getCamera(), rd = R.__models.renderer, gl = rd.getContext(), DT = 1 / 30;
    window.PV_ATTESA.on = () => true;
    if (!gl.__vero) { gl.__vero = {}; for (const k of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) if (gl[k]) { gl.__vero[k] = gl[k]; gl[k] = function () { }; } }
    const draws = on => { for (const k in gl.__vero) gl[k] = on ? gl.__vero[k] : function () { }; };
    if (p.vehicle && !S.bici) { pv.bmx(); for (let i = 0; i < 10; i++) { G.step(st, DT, { x: 0, y: 0 }); } }
    const a = S.pts[0]; p.x = a[0]; p.y = a[1]; p.path = []; p.indoor = null; p.lv = null; if (!S.bici) p.vehicle = null;
    if (R.camReset) R.camReset(); R.snap(st); cam.ppx = undefined;
    { const b = S.pts[1] || [a[0] + 1, a[1]], h = Math.atan2(b[1] - a[1], b[0] - a[0]); cam.uy = Math.atan2(-Math.cos(h), -Math.sin(h)) - R.YAW; p.face = h; }   // la camera parte dietro la marcia
    pv.ui.zoom = S.zoom;
    const ui = { zoom: S.zoom, time: pv.ui.time || 0, stick: null, lead: null, tilt: 0, rot: 0, drag: 0, edge: 0, puntatore: false, reale: DT, mira: null };
    if (S.bici) { if (!p.vehicle) pv.bmx(); }
    const C6 = () => R.__cam6, prima = { tagli: new Set(), tetti: new Set(), cose: new Set() };
    const conta = () => { const c6 = C6(), V3 = R.__vis3, V4 = R.__vis4, ora = { tagli: new Set(), tetti: new Set(), cose: new Set() }; let n = 0;
      if (V3 && V3.S) V3.S.forEach((q, B) => { if (q.on) ora.tagli.add(B); }); if (V4 && V4.T) V4.T.forEach((q, B) => { if (q.on) ora.tetti.add(B); }); if (c6 && c6.BASSA) c6.BASSA.cose.forEach((t, tag) => ora.cose.add(tag));
      for (const k of ['tagli', 'tetti', 'cose']) { ora[k].forEach(x => { if (!prima[k].has(x)) n++; }); prima[k].forEach(x => { if (!ora[k].has(x)) n++; }); }
      const r = { acc: n, cose: ora.cose.size, tagli: ora.tagli.size, tetti: ora.tetti.size }; Object.assign(prima, ora); return r; };
    const passo = (inp) => { G.step(st, DT, inp || { x: 0, y: 0 }); ui.time += DT; R.frame(st, DT, ui); };
    for (let i = 0; i < 45; i++) { passo(); if (i % 15 === 0) await new Promise(r => setTimeout(r, 0)); }
    conta();
    const fotos = [], N = { acc: 0, coseMax: 0, coseFot: 0, tagliFot: 0, tettiFot: 0, n: 0 }; let k = 1, t = 0, prossima = 0;
    const fine = () => S.sec ? t >= S.sec : k >= S.pts.length;
    while (!fine()) {
      let inp = { x: 0, y: 0 };
      if (S.bici) { const v = st.vehicles.find(q => q.id === p.vehicle); const b = S.pts[Math.min(k, S.pts.length - 1)], want = Math.atan2(b[1] - p.y, b[0] - p.x); if (Math.hypot(b[0] - p.x, b[1] - p.y) < 3) k++;
        const d = v ? Math.atan2(Math.sin(want - v.ang), Math.cos(want - v.ang)) : 0; inp = { x: 0, y: 0, aim: p.face, drive: { thr: 1, steer: Math.max(-1, Math.min(1, d * 1.8)), hb: false, boost: false }, trick: { wheelie: S.impenna && t > 3 && t < 5, peg: 0 } }; }
      else if (!S.sec) { const b = S.pts[k], dx = b[0] - p.x, dz = b[1] - p.y, l = Math.hypot(dx, dz), v = 1.5 * DT;
        if (l < v) { p.x = b[0]; p.y = b[1]; k++; } else { p.x += dx / l * v; p.y += dz / l * v; p.face = S.mira ? p.face : Math.atan2(dz, dx); } }
      ui.drag = (S.gira || 0) * DT; ui.camMano = !!S.gira;
      if (S.mira) { const B = R.camBasis(); ui.mira = { a: Math.atan2(B.fz, B.fx), punto: false }; p.face = ui.mira.a; }
      const scatta = t >= prossima - 1e-6; if (scatta) draws(true);
      passo(inp);
      if (scatta) { fotos.push([+t.toFixed(1), rd.domElement.toDataURL('image/jpeg', .82)]); draws(false); prossima += .5; }
      const c = conta(); N.acc += c.acc; N.coseMax = Math.max(N.coseMax, c.cose); N.coseFot += c.cose > 0 ? 1 : 0; N.tagliFot += c.tagli > 0 ? 1 : 0; N.tettiFot += c.tetti > 0 ? 1 : 0; N.n++;
      t += DT; if (N.n % 15 === 0) await new Promise(r => setTimeout(r, 0));
    }
    const d = new THREE.Vector3(); camera.getWorldDirection(d);
    return { fotos, conti: { s: +t.toFixed(1), accensioniMin: +(N.acc / t * 60).toFixed(1), coseNascosteMax: N.coseMax, coseNascostePct: +(N.coseFot / N.n * 100).toFixed(1), taglioPct: +(N.tagliFot / N.n * 100).toFixed(1), tettiPct: +(N.tettiFot / N.n * 100).toFixed(1),
      pendenza: +(-Math.asin(d.y)).toFixed(2), distanza: +camera.position.distanceTo(new THREE.Vector3(cam.x, cam.h, cam.y)).toFixed(1), pesi: R.__cam6 ? Object.assign({}, R.__cam6.CAM6.w) : null } };
  }, S);
}
function provino(dir, nome, titolo) {
  const py = `
import sys, os, glob
from PIL import Image, ImageDraw
d, nome, titolo = sys.argv[1], sys.argv[2], sys.argv[3]
fs = sorted(glob.glob(os.path.join(d, 'f', nome + '_*.jpg')))
W, H, C = 240, 135, 6
R = (len(fs) + C - 1) // C
S = Image.new('RGB', (C * W, R * H + 24), (20, 20, 20)); dr = ImageDraw.Draw(S); dr.text((6, 5), titolo, fill=(255, 255, 255))
for i, f in enumerate(fs):
    im = Image.open(f).convert('RGB').resize((W, H)); x, y = (i % C) * W, 24 + (i // C) * H; S.paste(im, (x, y))
    t = f.rsplit('_', 1)[1][:-4]; dr.rectangle((x, y, x + 34, y + 12), fill=(0, 0, 0)); dr.text((x + 2, y), t + 's', fill=(255, 230, 120))
S.save(os.path.join(d, nome + '.jpg'), quality=84)
`;
  execFileSync('python3', ['-c', py, dir, nome, titolo]);
}
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const T0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0)} s]`, ...a), out = {};
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  fs.mkdirSync(path.join(FOTO, 'f'), { recursive: true });
  try {
    for (const modo of MODI) {
      const pg = await b.newPage({ viewport: { width: 480, height: 270 } });
      pg.on('pageerror', e => log('[errore]', e.message)); pg.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) log('[console]', m.text().slice(0, 200)); if (/\[camera6\]/.test(m.text())) log('[console]', m.text().slice(0, 200)); });
      const q = QUERY + (modo === 'vecchia' ? '&nofixcamera6' : '');
      await pg.goto(`http://localhost:${srv.address().port}/${ARG.pagina || 'index.html'}?${q}`, { waitUntil: 'domcontentloaded', timeout: 0 });
      await pg.waitForFunction(() => window.__tl && window.__tl.gioco, null, { timeout: 1800000, polling: 1000 });
      await pg.keyboard.press('Enter'); await pg.waitForTimeout(2000);
      await pg.waitForFunction(() => !window.__pv.ui.intro, null, { timeout: 120000 }).catch(() => log('ancora nella schermata iniziale'));
      log(modo, 'in gioco', q);
      // i luoghi: il vicolo più vicino alla piazza, la piazza, i tavolini (gli ombrelloni) più vicini alla piazza
      const L = await pg.evaluate(() => { const G = window.__pv.G, W = G.MAP.world, P0 = G.PLACES.piazza, d2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]), lung = pts => pts.slice(1).reduce((s, q, i) => s + d2(q, pts[i]), 0);
        const vic = (W.roads || []).filter(r => r.pts && r.pts.length > 1 && (r.w <= 3.6 || /^vic_/.test(r.id || '')) && lung(r.pts) > 25).map(r => ({ r, d: Math.min(...r.pts.map(q => d2(q, [P0.x, P0.y]))) })).sort((a, b) => a.d - b.d)[0];
        let pts = vic.r.pts.map(q => [q[0], q[1]]), Lm = 0; const al = [pts[0]]; for (let i = 1; i < pts.length && Lm < 24; i++) { Lm += d2(pts[i], pts[i - 1]); al.push(pts[i]); }
        // i tavolini coi loro ombrelloni: dal registro delle cose (DZ.props) i nomi con «ombrell» o «tavol», il gruppo più vicino alla piazza
        // le cose registrate alte 1,8-3,4 m e larghe 1,2-3,6 m (ombrelloni, tende, gazebo): il gruppo più fitto entro 80 m dalla piazza
        let om = null; try { const PR = window.__pv.R.__dz.props || [], c = PR.filter(r => r && r.c && r.he && r.he.y * 2 > 1.8 && r.he.y * 2 < 3.4 && Math.max(r.he.x, r.he.z) * 2 > 1.2 && Math.max(r.he.x, r.he.z) * 2 < 3.6 && Math.hypot(r.c.x - P0.x, r.c.z - P0.y) < 80);
          let best = null; for (const r of c) { const n = c.filter(q => Math.hypot(q.c.x - r.c.x, q.c.z - r.c.z) < 8).length; if (!best || n > best[2]) best = [r.c.x, r.c.z, n]; } om = best; } catch (e) { }
        return { vicolo: al, nome: vic.r.id, piazza: [[P0.x - 12, P0.y], [P0.x + 12, P0.y]], om }; });
      log('vicolo', L.nome, 'ombrelloni', JSON.stringify(L.om));
      const om = L.om ? [[L.om[0] - 10, L.om[1] + 3], [L.om[0] + 10, L.om[1] + 3]] : L.piazza;
      const scene = [];
      if (SCENE.includes('viste')) for (const [z, n] of [[.25, 'vicina'], [.5, 'media'], [.85, 'alta']]) { scene.push({ nome: `vicolo_${n}`, titolo: `${modo} - vicolo ${L.nome}, vista ${n} (zoom ${z})`, pts: L.vicolo, zoom: z }); scene.push({ nome: `piazza_${n}`, titolo: `${modo} - piazza, vista ${n} (zoom ${z})`, pts: L.piazza, zoom: z }); }
      if (SCENE.includes('giro')) scene.push({ nome: 'giro_media', titolo: `${modo} - cammino in piazza con la camera che gira (0,6 rad/s), vista media`, pts: L.piazza, zoom: .5, gira: .6 });
      if (SCENE.includes('mira')) scene.push({ nome: 'mira_media', titolo: `${modo} - la mira: il personaggio guarda dove guarda la camera, la camera gira (vista media)`, pts: [L.piazza[0]], zoom: .5, gira: .5, mira: true, sec: 8 });
      if (SCENE.includes('bici')) scene.push({ nome: 'bici', titolo: `${modo} - la bici: la camera da inseguimento, impennata a 3-5 s`, pts: [L.piazza[0], L.piazza[1], [L.piazza[1][0], L.piazza[1][1] - 14]], zoom: .5, bici: true, impenna: true, sec: 9 });
      if (SCENE.includes('ombrelloni')) for (const [z, n] of [[.5, 'media'], [.85, 'alta']]) scene.push({ nome: `ombrelloni_${n}`, titolo: `${modo} - i tavolini e gli ombrelloni, vista ${n}`, pts: om, zoom: z, gira: .4 });
      out[modo] = {};
      for (const S of scene) {
        const r = await scena(pg, S), nome = `${modo}_${S.nome}`;
        r.fotos.forEach(([t, url], i) => fs.writeFileSync(path.join(FOTO, 'f', `${nome}_${String(i).padStart(3, '0')}_${t}.jpg`), Buffer.from(url.split(',')[1], 'base64')));
        provino(FOTO, nome, S.titolo); out[modo][S.nome] = r.conti; log(nome, r.fotos.length, 'foto', JSON.stringify(r.conti));
      }
      await pg.close();
    }
  } catch (e) { log('errore', e.stack || e); }
  await b.close(); srv.close();
  fs.writeFileSync(path.join(FOTO, 'conti.json'), JSON.stringify(out, null, 1));
});
