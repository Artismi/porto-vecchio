// [camera5] LA SONDA DEL REGISTA: la camera giudicata come la giudicherebbero un regista, un operatore e un attore.
//   node strumenti/sonda_regista.js [--query=cittanuova&leggera&tassellivecchi] [--modi=nuova,vecchia] [--foto=/cartella] [--json=uscita.json] [--tratti=vicolo,piazza,portico,svolta] [--riscalda=3]
// Il gioco vero senza testa; il giro di main.js si ferma e la sonda porta il personaggio a passo d'uomo (1,5 m/s) lungo i tratti di
// sonda_occlusione.js (due vicoli, la piazza, un portico) più una svolta stretta (una strada della rete con un angolo di oltre 60°); a metà
// di ogni tratto si ferma 3 s (la quiete fa parte dell'inquadratura). I disegni vanno a SwiftShader solo per le foto (una ogni 0,5 s di
// gioco, --foto: i fotogrammi e un provino per tratto), per il resto three li conta e basta. Misura:
//   (i primi --riscalda s di ogni tratto, 3 di difetto, non contano: dopo il salto la camera si mette dietro la marcia)
//   mosse al minuto: le mosse della camera, pendenza, distanza e yaw insieme (un gesto solo se si sovrappongono o si toccano entro 0,4 s);
//   tenuta: il tempo più corto e la mediana fra una mossa e la prossima; mosse da fermi;
//   aria davanti: nei fotogrammi in cammino, quanto il personaggio sta dietro il centro rispetto a dove va (in unità dello schermo, -1..1)
//   e la % dei fotogrammi con almeno 0,04 di aria; testa o piedi tagliati dal quadro (fuori dallo schermo) o da una casa non tagliata;
//   il taglio delle case e il personaggio coperto (come sonda_occlusione); lo strappo della pendenza, della distanza, dello schermo; il rollio.
// --modi=vecchia aggiunge ?nofixcamera5.
const path = require('path'), http = require('http'), fs = require('fs'), { execFileSync } = require('child_process');
const { chromium } = require(process.env.PW || 'playwright');
const ARG = {}; for (const a of process.argv.slice(2)) { const m = /^--([a-z]+)(?:=(.*))?$/.exec(a); if (m) ARG[m[1]] = m[2] === undefined ? true : m[2]; }
const RISCALDA = ARG.riscalda !== undefined ? +ARG.riscalda : 3, root = path.resolve(__dirname, '..'), QUERY = (ARG.query || 'cittanuova&leggera&tassellivecchi').replace(/^[?&]/, ''), MODI = (ARG.modi || 'nuova,vecchia').split(','), DT = 1 / 30, FOTO = ARG.foto || null;
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.gz': 'application/gzip' };

async function corsa(pg, foto, salva) {
  // i tratti e lo stato, una volta
  await pg.evaluate(() => {
    const pv = window.__pv, R = pv.R, G = pv.G, W = G.MAP.world, rd = R.__models.renderer, gl = rd.getContext();
    window.PV_ATTESA.on = () => true;
    if (!gl.__vero) { gl.__vero = {}; for (const k of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) if (gl[k]) { gl.__vero[k] = gl[k]; gl[k] = function () { }; } }
    const P0 = G.PLACES.piazza, d2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]), lung = pts => pts.slice(1).reduce((s, q, i) => s + d2(q, pts[i]), 0), tratti = [];
    const vic = (W.roads || []).filter(r => r.pts && r.pts.length > 1 && (r.w <= 3.6 || /^vic_/.test(r.id || '')) && lung(r.pts) > 25).map(r => ({ r, d: Math.min(...r.pts.map(q => d2(q, [P0.x, P0.y]))) })).sort((a, b) => a.d - b.d);
    for (const { r } of vic.slice(0, 2)) { const pts = r.pts.map(q => [q[0], q[1]]); let L = 0; const out = [pts[0]]; for (let i = 1; i < pts.length && L < 60; i++) { L += d2(pts[i], pts[i - 1]); out.push(pts[i]); } tratti.push({ nome: 'vicolo ' + (r.id || ''), pts: out }); }
    tratti.push({ nome: 'piazza', pts: [[P0.x - 16, P0.y], [P0.x + 16, P0.y]] });
    const por = (W.pezzi || []).filter(q => q.tipo === 'portico').sort((a, b) => d2([a.x, a.y], [P0.x, P0.y]) - d2([b.x, b.y], [P0.x, P0.y]))[0];
    if (por) { const c = Math.cos(por.rot || 0), s = Math.sin(por.rot || 0), len = ((por.opz && por.opz.campate) || 2) * ((por.opz && por.opz.campata) || 4), w = l => [por.x + c * l + s * -2, por.y - s * l + c * -2]; tratti.push({ nome: 'portico', pts: [w(-3), w(len + 3)] }); }
    // la svolta stretta: il vertice di una strada vicina con l'angolo più forte (oltre 60°), 12 m prima e 12 m dopo
    let sv = null; for (const r of W.roads || []) { if (!r.pts || r.pts.length < 3) continue; for (let i = 1; i < r.pts.length - 1; i++) { const a = r.pts[i - 1], b = r.pts[i], c = r.pts[i + 1], l1 = d2(a, b), l2 = d2(b, c); if (l1 < 6 || l2 < 6) continue;
      const u = [(b[0] - a[0]) / l1, (b[1] - a[1]) / l1], v = [(c[0] - b[0]) / l2, (c[1] - b[1]) / l2], ang = Math.acos(Math.max(-1, Math.min(1, u[0] * v[0] + u[1] * v[1]))), d = d2(b, [P0.x, P0.y]);
      if (ang > .9 && d < 320 && (!sv || d < sv.d)) sv = { d, pts: [[b[0] - u[0] * Math.min(12, l1), b[1] - u[1] * Math.min(12, l1)], [b[0], b[1]], [b[0] + v[0] * Math.min(12, l2), b[1] + v[1] * Math.min(12, l2)]], id: r.id, ang }; } }
    if (sv) tratti.push({ nome: 'svolta ' + (sv.id || '') + ' ' + Math.round(sv.ang * 57.3) + '°', pts: sv.pts });
    else tratti.push({ nome: 'svolta stretta 90°', pts: [[P0.x - 12, P0.y + 5], [P0.x, P0.y + 5], [P0.x, P0.y - 9]] });   // la rete vicina non ne ha: un angolo retto nella piazza
    window.__SR = { tratti };
  });
  const tratti = await pg.evaluate(() => window.__SR.tratti.map(t => t.nome)), righe = [], foto0 = [];
  for (let ti = 0; ti < tratti.length; ti++) {
    if (ARG.tratti && !String(ARG.tratti).split(',').some(f => tratti[ti].startsWith(f))) continue;   // --tratti=svolta,piazza: solo quelli
    // un tratto alla volta (le foto tornano a node a ogni tratto)
    const r = await pg.evaluate(async ({ ti, foto, DT }) => {
      const pv = window.__pv, R = pv.R, G = pv.G, st = pv.st, p = st.player, cam = R.cam, camera = R.getCamera(), rd = R.__models.renderer, gl = rd.getContext(), T = window.__SR.tratti[ti];
      const taglia = (o, c, b) => { let t0 = 0, t1 = 1; for (const k of ['x', 'y', 'z']) { const d = c[k] - o[k], lo = b.min[k], hi = b.max[k]; if (Math.abs(d) < 1e-9) { if (o[k] < lo || o[k] > hi) return false; continue; } let a = (lo - o[k]) / d, e = (hi - o[k]) / d; if (a > e) { const q = a; a = e; e = q; } if (a > t0) t0 = a; if (e < t1) t1 = e; if (t0 > t1) return false; } return true; };
      const dir = new THREE.Vector3(), v3 = new THREE.Vector3(), ui = { zoom: 1, time: pv.ui.time || 0, stick: null, lead: null, tilt: 0, rot: 0, drag: 0, edge: 0, puntatore: false, reale: DT };
      const draws = on => { for (const k in gl.__vero) gl[k] = on ? gl.__vero[k] : function () { }; };
      const ndc = (x, y, z) => { v3.set(x, y, z).project(camera); return [v3.x, v3.y, v3.z]; };
      const misura = (vx, vz) => {
        const V3 = R.__vis3, cp = camera.position, fy = R.groundH(p.x, p.y), C = { x: cp.x, y: cp.y, z: cp.z }, O = [{ x: p.x, y: fy + 1.1, z: p.y }, { x: p.x, y: fy + 1.65, z: p.y }];
        const testa = { x: p.x, y: fy + 1.75, z: p.y }, piedi = { x: p.x, y: fy + .08, z: p.y };
        let tagliate = 0, vere = 0, coperto = 0, testaG = 0, piediG = 0;
        if (V3 && V3.S) V3.S.forEach((s, B) => { if (s.a > .5) { tagliate++; if (B.box3 && O.some(o => taglia(o, C, B.box3))) vere++; } });
        for (const B of R.__buildings || []) { const b3 = B.box3; if (!b3 || b3.max.y < fy + .2) continue; const s = V3 && V3.S && V3.S.get(B); if (s && s.a > .5) continue; if (p.x > b3.min.x && p.x < b3.max.x && p.y > b3.min.z && p.y < b3.max.z) continue;
          const cx = (b3.min.x + b3.max.x) / 2 - p.x, cz = (b3.min.z + b3.max.z) / 2 - p.y; if (cx * cx + cz * cz > 3600) continue;
          if (!coperto && taglia(O[0], C, b3) && taglia(O[1], C, b3)) coperto = 1; if (!testaG && taglia(testa, C, b3)) testaG = 1; if (!piediG && taglia(piedi, C, b3)) piediG = 1; }
        const h = ndc(testa.x, testa.y, testa.z), f = ndc(piedi.x, piedi.y, piedi.z), c0 = ndc(p.x, fy + 1, p.y), qd = (q) => Math.abs(q[0]) > .97 || Math.abs(q[1]) > .97;
        let aria = null; const vv = Math.hypot(vx, vz); if (vv > .5) { const c1 = ndc(p.x + vx / vv, fy + 1, p.y + vz / vv), dx = c1[0] - c0[0], dy = c1[1] - c0[1], l = Math.hypot(dx, dy) || 1; aria = -(c0[0] * dx + c0[1] * dy) / l; }
        camera.getWorldDirection(dir); const e = camera.matrixWorld.elements, roll = Math.atan2(e[1], e[5]);
        const R5 = R.__cam5; return { mv: R5 && R5.mov ? R5.mov.perche : '', tagliate, vere, coperto, testaQ: qd(h) ? 1 : 0, piediQ: qd(f) ? 1 : 0, testaG, piediG, aria, sx: c0[0], sy: c0[1], pitch: -Math.asin(Math.max(-1, Math.min(1, dir.y))), dist: Math.hypot(cp.x - cam.x, cp.y - cam.h, cp.z - cam.y), yaw: cam.yaw, roll, v: vv };
      };
      const a = T.pts[0]; p.x = a[0]; p.y = a[1]; p.path = []; p.vehicle = null; p.indoor = null; p.lv = null; if (R.camReset) R.camReset(); R.snap(st); cam.ppx = undefined;
      { const b = T.pts[1], h = Math.atan2(b[1] - a[1], b[0] - a[0]); cam.uy = Math.atan2(-Math.cos(h), -Math.sin(h)) - R.YAW; p.face = h; }   // la camera parte già dietro la marcia (come nel gioco, dove ci arriva camminando): niente allineamento dopo il salto
      for (let i = 0; i < 45; i++) { G.step(st, DT, { x: 0, y: 0 }); ui.time += DT; R.frame(st, DT, ui); if (i % 15 === 0) await new Promise(r => setTimeout(r, 0)); }
      const L = T.pts.slice(1).reduce((s, q, i) => s + Math.hypot(q[0] - T.pts[i][0], q[1] - T.pts[i][1]), 0), sosta = L / 2;   // a metà strada, 3 s fermi
      const righe = [], fotos = []; let k = 1, t = 0, fatto = 0, ferma = 0, px0 = p.x, py0 = p.y, prossima = 0;
      while (k < T.pts.length || ferma > 0) {
        let vx = 0, vz = 0;
        if (ferma > 0) ferma -= DT;
        else { const b = T.pts[k], dx = b[0] - p.x, dz = b[1] - p.y, l = Math.hypot(dx, dz), v = 1.5 * DT;
          if (fatto < sosta && fatto + v >= sosta) ferma = 3;
          if (l < v) { p.x = b[0]; p.y = b[1]; k++; } else { p.x += dx / l * v; p.y += dz / l * v; p.face = Math.atan2(dz, dx); vx = dx / l * 1.5; vz = dz / l * 1.5; } fatto += v; }
        G.step(st, DT, { x: 0, y: 0 }); ui.time += DT;
        const scatta = foto && t >= prossima - 1e-6; if (scatta) draws(true);
        R.frame(st, DT, ui);
        if (scatta) { fotos.push([+t.toFixed(1), rd.domElement.toDataURL('image/jpeg', .82)]); draws(false); prossima += .5; }
        const m = misura(vx, vz); m.t = t; m.fermo = vx === 0 && vz === 0 ? 1 : 0; righe.push(m); t += DT; if (righe.length % 15 === 0) await new Promise(r => setTimeout(r, 0)); }
      return { righe, fotos, nome: T.nome, m: Math.round(L) };
    }, { ti, foto: !!foto, DT });
    r.righe.forEach(x => { x.tratto = r.nome; righe.push(x); });
    if (foto) { const dir = path.join(foto, salva); fs.mkdirSync(dir, { recursive: true }); const nome = r.nome.replace(/[^a-z0-9]+/gi, '_');
      r.fotos.forEach(([t, url], i) => fs.writeFileSync(path.join(dir, `${nome}_${String(i).padStart(3, '0')}_${t}.jpg`), Buffer.from(url.split(',')[1], 'base64')));
      foto0.push({ nome, n: r.fotos.length }); }
    console.log('   tratto', r.nome, r.m, 'm', r.righe.length, 'fotogrammi', r.fotos.length, 'foto');
  }
  return { righe, foto0 };
}
// le misure
function ricampiona(S, k, hz) { const out = []; let j = 0; for (let t = 0; t <= S[S.length - 1].t; t += 1 / hz) { while (j < S.length - 2 && S[j + 1].t < t) j++; const a = S[j], b = S[j + 1] || a, f = b.t > a.t ? Math.max(0, Math.min(1, (t - a.t) / (b.t - a.t))) : 0; out.push(a[k] + (b[k] - a[k]) * f); } return out; }
const strappo = (x, hz) => { let j2 = 0; for (let i = 3; i < x.length; i++) { const j = (x[i] - 3 * x[i - 1] + 3 * x[i - 2] - x[i - 3]) * hz * hz * hz; j2 += j * j; } return Math.sqrt(j2 / Math.max(1, x.length - 3)); };
function una(rr0) {
  const rr = rr0.filter(r => r.t >= RISCALDA).map(r => Object.assign({}, r, { t: r.t - RISCALDA }));   // i primi secondi dopo il salto al tratto non contano (la camera si mette dietro la marcia: nel gioco vero è già lì)
  const HZ = 20, n = rr.length, T = rr[n - 1].t || 1, pct = (f, g) => { const q = g ? rr.filter(g) : rr; return q.length ? +(q.filter(f).length / q.length * 100).toFixed(1) : 0; };
  rr.forEach((r, i) => { r.yawU = i ? rr[i - 1].yawU + Math.atan2(Math.sin(r.yaw - rr[i - 1].yaw), Math.cos(r.yaw - rr[i - 1].yaw)) : r.yaw; });
  const pi = ricampiona(rr, 'pitch', HZ), di = ricampiona(rr, 'dist', HZ), yw = ricampiona(rr, 'yawU', HZ), fe = ricampiona(rr, 'fermo', HZ), sx = ricampiona(rr, 'sx', HZ), sy = ricampiona(rr, 'sy', HZ);
  // le mosse: un campione si muove se pendenza, distanza o yaw vanno oltre la soglia; i tratti in moto vicini meno di 0,4 s sono una mossa
  const moto = pi.map((_, i) => i > 0 && (Math.abs(pi[i] - pi[i - 1]) * HZ > .03 || Math.abs(di[i] - di[i - 1]) * HZ > .5 || Math.abs(yw[i] - yw[i - 1]) * HZ > .05));
  const perche = t => { const r = rr.find(x => x.t >= t + .1); return r && r.mv ? r.mv : ''; };
  const mosse = []; let cur = null, quiete = 99; moto.forEach((m, i) => { const t = i / HZ; if (m) { if (cur && quiete < .4) cur.fine = t; else { cur = { inizio: t, fine: t, fermo: fe[i] > .5, perche: perche(t) }; mosse.push(cur); } quiete = 0; } else quiete += 1 / HZ; });
  const tenute = mosse.slice(1).map((m, i) => m.inizio - mosse[i].fine).sort((a, b) => a - b);
  const cam = r => !r.fermo && r.aria !== null;
  return { s: +T.toFixed(1), mosseMin: +(mosse.length / T * 60).toFixed(1), mosse: mosse.length, mosseFermo: mosse.filter(m => m.fermo).length, tenutaMin: tenute.length ? +tenute[0].toFixed(1) : null, tenutaMed: tenute.length ? +tenute[tenute.length >> 1].toFixed(1) : null,
    durataMossa: mosse.length ? +(mosse.reduce((s, m) => s + m.fine - m.inizio, 0) / mosse.length).toFixed(1) : 0,
    aria: +(rr.filter(cam).reduce((s, r) => s + r.aria, 0) / Math.max(1, rr.filter(cam).length)).toFixed(3), ariaPct: pct(r => r.aria >= .04, cam),
    testaPiediQuadro: pct(r => r.testaQ || r.piediQ), testaPiediCasa: pct(r => r.testaG || r.piediG), taglio: pct(r => r.tagliate > 0), coperto: pct(r => r.coperto),
    strappoPend: +strappo(pi, HZ).toFixed(2), strappoDist: +strappo(di, HZ).toFixed(1), strappoSchermo: +Math.hypot(strappo(sx, HZ), strappo(sy, HZ)).toFixed(2), rollioMax: +(Math.max(...rr.map(r => Math.abs(r.roll))) * 57.3).toFixed(2),
    mosseT: mosse.map(m => `${m.inizio.toFixed(1)}-${m.fine.toFixed(1)}${m.fermo ? 'F' : ''}${m.perche ? '(' + m.perche + ')' : ''}`).join(' ') };
}
function riassunto(righe) {
  const per = {}; righe.forEach(r => (per[r.tratto] = per[r.tratto] || []).push(r));
  const out = {}; for (const k in per) out[k] = una(per[k]);
  const L = Object.values(out), T = L.reduce((s, x) => s + x.s, 0), tot = { s: +T.toFixed(1) };
  for (const k of Object.keys(L[0])) { if (k === 's' || k === 'mosseT') continue; if (k === 'tenutaMin') tot[k] = Math.min(...L.map(x => x[k] === null ? 99 : x[k])); else if (k === 'mosse' || k === 'mosseFermo') tot[k] = L.reduce((s, x) => s + x[k], 0); else tot[k] = +(L.reduce((s, x) => s + (x[k] || 0) * x.s, 0) / T).toFixed(2); }
  tot.mosseMin = +(tot.mosse / T * 60).toFixed(1); out.tutto = tot; return out;
}
function provini(dir, foto0, modo) {   // un provino per tratto: 6 colonne, l'ora di gioco in alto a sinistra
  const py = `
import sys, os, glob
from PIL import Image, ImageDraw
d, modo = sys.argv[1], sys.argv[2]
for nome in sys.argv[3:]:
    fs = sorted(glob.glob(os.path.join(d, modo, nome + '_*.jpg')))
    if not fs: continue
    W, H, C = 240, 135, 6
    R = (len(fs) + C - 1) // C
    S = Image.new('RGB', (C * W, R * H + 24), (20, 20, 20)); dr = ImageDraw.Draw(S); dr.text((6, 5), modo + ' - ' + nome, fill=(255, 255, 255))
    for i, f in enumerate(fs):
        im = Image.open(f).convert('RGB').resize((W, H)); x, y = (i % C) * W, 24 + (i // C) * H; S.paste(im, (x, y))
        t = f.rsplit('_', 1)[1][:-4]; dr.rectangle((x, y, x + 34, y + 12), fill=(0, 0, 0)); dr.text((x + 2, y), t + 's', fill=(255, 230, 120))
    S.save(os.path.join(d, modo + '_' + nome + '.jpg'), quality=84)
`;
  execFileSync('python3', ['-c', py, dir, modo, ...foto0.map(f => f.nome)]);
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
      const pg = await b.newPage({ viewport: { width: 480, height: 270 } });
      pg.on('pageerror', e => log('[errore]', e.message)); pg.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) log('[console]', m.text().slice(0, 200)); });
      const q = QUERY + (modo === 'vecchia' ? '&nofixcamera5' : '');
      await pg.goto(`http://localhost:${srv.address().port}/${ARG.pagina || 'index.html'}?${q}`, { waitUntil: 'domcontentloaded', timeout: 0 });
      await pg.waitForFunction(() => window.__tl && window.__tl.gioco, null, { timeout: 1800000, polling: 1000 });
      await pg.keyboard.press('Enter'); await pg.waitForTimeout(3000);
      await pg.waitForFunction(() => !window.__pv.ui.intro, null, { timeout: 120000 }).catch(() => log('ancora nella schermata iniziale'));
      log(modo, 'in gioco', q);
      const R = await corsa(pg, FOTO, modo); out[modo] = riassunto(R.righe);
      if (FOTO && R.foto0.length) provini(FOTO, R.foto0, modo);
      console.log(`\n== ${modo} ==`); for (const k in out[modo]) console.log(k.padEnd(26), JSON.stringify(out[modo][k]));
      await pg.close();
    }
  } catch (e) { log('errore', e.stack || e); }
  await b.close(); srv.close();
  if (ARG.json) fs.writeFileSync(ARG.json, JSON.stringify(out, null, 1));
});
