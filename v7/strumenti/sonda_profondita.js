// [profondita2] LA SONDA DELLA PROFONDITÀ: quello che vede il committente, alla camera di gioco vera (non gli scorci della galleria).
//   node strumenti/sonda_profondita.js <cartella> [--dispositivo=portatile|telefono|pieno] [--scene=vicolo,piazza,...] [--varianti=file.json]
//        [--pagina=index.html] [--query=...] [--metri=12]
// Il gioco vero senza testa (SwiftShader); il giro di main.js si ferma e la sonda porta il personaggio a passo d'uomo (1,5 m/s) lungo una via
// della rete per --metri (la camera5 vera: regista, aria davanti, pendenza della gerarchia), con lo zoom di gioco (.72). I disegni vanno a
// SwiftShader solo per la foto, presa mentre cammina. Ogni variante (un corpo di funzione eseguito nella pagina prima della foto, e il suo
// rovescio dopo) fotografa lo STESSO istante: le manopole dal vivo (__DIR, __DIOR, __CAT, __NIT, __PROFD...).
// Dispositivi: portatile 1536×864 CSS a dpr 1,25 col profilo leggero (la Iris Xe del committente); telefono 390×844 a dpr 3, tocco, leggero;
// pieno 1536×864 a dpr 1,25 col profilo pieno. Esce: <cartella>/<dispositivo>/<variante>/<scena>.png alla risoluzione interna della tela
// (quella che il browser stende sullo schermo) e <scena>.json (camera, misure).
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || 'playwright');
const ARG = {}; const POS = []; for (const a of process.argv.slice(2)) { const m = /^--([a-z]+)(?:=(.*))?$/.exec(a); if (m) ARG[m[1]] = m[2] === undefined ? true : m[2]; else POS.push(a); }
const OUT = POS[0]; if (!OUT) { console.log('uso: node strumenti/sonda_profondita.js <cartella> [--dispositivo=portatile] [--scene=...] [--varianti=file.json]'); process.exit(1); }
const root = path.resolve(__dirname, '..'), DISP = ARG.dispositivo || 'portatile';
const DEV = { portatile: { viewport: { width: 1536, height: 864 }, deviceScaleFactor: 1.25, q: 'cittanuova&leggera&tassellivecchi' },
  telefono: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, q: 'cittanuova&leggera&tassellivecchi' },
  pieno: { viewport: { width: 1536, height: 864 }, deviceScaleFactor: 1.25, q: 'cittanuova&alta&tassellivecchi' } }[DISP];
const QUERY = (ARG.query !== undefined ? ARG.query : DEV.q) + (ARG.piu ? '&' + ARG.piu : '');
// le scene: un punto di partenza (la via della rete più vicina), quanti metri, l'ora, il verso (1 / -1 lungo la via)
const SCENE = JSON.parse(fs.readFileSync(ARG.file || path.join(__dirname, 'profondita_scene.json'), 'utf8')).scene.filter(s => !ARG.scene || String(ARG.scene).split(',').some(k => s.nome.includes(k)));
const VARIANTI = ARG.varianti ? Object.entries(JSON.parse(fs.readFileSync(ARG.varianti, 'utf8'))).filter(([k]) => !k.startsWith('nota')) : [['base', { su: '', giu: '' }]];
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.gz': 'application/gzip' };
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const T0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0)} s]`, ...a);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  try {
    const { q, ...ctxOpt } = DEV; const ctx = await b.newContext(ctxOpt); const pg = await ctx.newPage();
    pg.on('pageerror', e => log('[errore]', e.message)); pg.on('console', m => { const t = m.text(); if ((m.type() === 'error' && !/404/.test(t)) || /shaderdebug|THREE\.WebGLProgram|ERROR:/.test(t)) log('[console]', t.slice(0, 600)); });
    await pg.addInitScript(() => { window.__pulita = true; });
    await pg.goto(`http://localhost:${srv.address().port}/${ARG.pagina || 'index.html'}?${QUERY}`, { waitUntil: 'domcontentloaded', timeout: 0 });
    await pg.waitForFunction(() => window.__tl && window.__tl.gioco, null, { timeout: 1800000, polling: 1000 });
    await pg.keyboard.press('Enter'); await pg.waitForTimeout(3000);
    await pg.waitForFunction(() => !window.__pv.ui.intro, null, { timeout: 120000 }).catch(() => log('ancora nella schermata iniziale'));
    await pg.addStyleTag({ content: '#app > *:not(#cv) { visibility: hidden !important; } #bubbles, #hover, #moment, #xhair, #ring, #touch { display: none !important; }' });
    const info = await pg.evaluate((CAT0) => { const pv = window.__pv, R = pv.R, rd = R.__models.renderer, cv = rd.domElement; window.PV_ATTESA.on = () => true; window.__SPcat = CAT0;
      setInterval(() => { const u = pv.ui; u.flash = 0; u.fade = 0; u.desat = false; u.letterbox = false; u.dialog = null; u.book = false; u.menu = false; pv.st.over = null; pv.st.chase = false; pv.st.player.hp = 100; pv.st.deadline = 1e12; }, 50);
      return { tela: [cv.width, cv.height], css: [innerWidth, innerHeight], dpr: devicePixelRatio, telefono: R.phone, profilo: window.PV_PROFILO && window.PV_PROFILO.profilo }; }, !!ARG.cat);
    log('in gioco', QUERY, JSON.stringify(info));
    if (ARG.esplora) log('esplora', JSON.stringify(await pg.evaluate(() => {   // le vie lunghe e dritte e gli alberi vicino al centro (per scegliere le scene)
      const pv = window.__pv, W = pv.G.MAP.world, C = [1400, 335], out = { vie: [], alberi: [], posti: {} };
      for (const r of W.roads || []) { if (!r.pts || r.pts.length < 2) continue; let i0 = 0;   // i tratti dritti (meno di 8° fra un pezzo e l'altro)
        const ang = i => Math.atan2(r.pts[i + 1][1] - r.pts[i][1], r.pts[i + 1][0] - r.pts[i][0]);
        for (let i = 1; i <= r.pts.length - 1; i++) { const fine = i === r.pts.length - 1 || Math.abs(Math.atan2(Math.sin(ang(i) - ang(i0)), Math.cos(ang(i) - ang(i0)))) > .14;
          if (fine) { const a = r.pts[i0], b2 = r.pts[i], L = Math.hypot(b2[0] - a[0], b2[1] - a[1]), d = Math.hypot((a[0] + b2[0]) / 2 - C[0], (a[1] + b2[1]) / 2 - C[1]); if (L > 40 && d < 170) out.vie.push([r.id, r.w, Math.round(L), a.map(Math.round), b2.map(Math.round)]); i0 = i; } } }
      out.vie.sort((a, b) => b[2] - a[2]); out.vie = out.vie.slice(0, 25);
      const v = new THREE.Vector3(), M = new THREE.Matrix4(); pv.R.__ed.scene.traverse(o => { const m = o.material; if (!o.isInstancedMesh || !m || !m.color || m.color.getHexString() !== '1a1814') return; for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, M); v.setFromMatrixPosition(M).applyMatrix4(o.matrixWorld); const d = Math.hypot(v.x - C[0], v.z - C[1]); if (d < 140) out.alberi.push([Math.round(v.x), Math.round(v.z)]); } });
      for (const k in pv.G.PLACES) { const q = pv.G.PLACES[k]; if (q && Math.hypot(q.x - C[0], q.y - C[1]) < 200) out.posti[k] = [Math.round(q.x), Math.round(q.y)]; }
      out.alberi = out.alberi.slice(0, 60); return out; })));
    for (const s of SCENE) {
      const ts = Date.now();
      // 1) il cammino: la via più vicina al punto, --metri lungo la via; la camera di gioco segue (draws spenti)
      const cam = await pg.evaluate(async ({ s, metri }) => {
        const pv = window.__pv, R = pv.R, G = pv.G, st = pv.st, p = st.player, W = G.MAP.world, rd = R.__models.renderer, gl = rd.getContext(), DT = 1 / 30;
        if (!gl.__vero) { gl.__vero = {}; for (const k of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) if (gl[k]) { gl.__vero[k] = gl[k]; gl[k] = function () { }; } }
        const ui = { zoom: s.zoom || .72, time: pv.ui.time || 0, stick: null, lead: null, tilt: 0, rot: 0, drag: 0, edge: 0, puntatore: false, reale: DT };
        window.__SPui = ui;
        if (s.ora !== undefined) { let t = Math.floor(st.t / 1440) * 1440 + s.ora; if (t < st.t - 1) t += 1440; st.t = t; }
        window.__meteo = s.meteo || 'sereno';
        // la via: il segmento più vicino al punto; si cammina lungo la polilinea nel verso scelto
        let best = null; for (const r of W.roads || []) { if (!r.pts || r.pts.length < 2) continue; if (s.via && r.id !== s.via) continue;
          for (let i = 0; i < r.pts.length - 1; i++) { const a = r.pts[i], b2 = r.pts[i + 1], dx = b2[0] - a[0], dy = b2[1] - a[1], L2 = dx * dx + dy * dy || 1, u = Math.max(0, Math.min(1, ((s.x - a[0]) * dx + (s.y - a[1]) * dy) / L2)), qx = a[0] + dx * u, qy = a[1] + dy * u, d = Math.hypot(s.x - qx, s.y - qy);
            if (!best || d < best.d) best = { d, r, i, u, qx, qy }; } }
        let pts; if (s.pts) pts = s.pts; else { const P = best.r.pts, v = s.verso || 1; pts = [[best.qx, best.qy]]; let L = 0, i = v > 0 ? best.i + 1 : best.i;
          while (L < metri && i >= 0 && i < P.length) { const q = P[i], l = Math.hypot(q[0] - pts[pts.length - 1][0], q[1] - pts[pts.length - 1][1]); if (l > .01) { L += l; pts.push([q[0], q[1]]); } i += v; }
          if (pts.length < 2) pts.push([best.qx + 10, best.qy]); }
        const a = pts[0]; p.x = a[0]; p.y = a[1]; p.path = []; p.vehicle = null; p.indoor = null; p.lv = null; if (R.camReset) R.camReset(); R.snap(st); R.cam.ppx = undefined;
        { const b2 = pts[1], h = Math.atan2(b2[1] - a[1], b2[0] - a[0]); R.cam.uy = Math.atan2(-Math.cos(h), -Math.sin(h)) - R.YAW + (s.giro || 0) * Math.PI / 180; p.face = h; }
        for (let i = 0; i < 30; i++) { G.step(st, DT, { x: 0, y: 0 }); ui.time += DT; R.frame(st, DT, ui); if (i % 10 === 0) await new Promise(r => setTimeout(r, 0)); }
        let k = 1, n = 0; while (k < pts.length) { const b2 = pts[k], dx = b2[0] - p.x, dz = b2[1] - p.y, l = Math.hypot(dx, dz), v = 1.5 * DT;
          if (l < v) { p.x = b2[0]; p.y = b2[1]; k++; } else { p.x += dx / l * v; p.y += dz / l * v; p.face = Math.atan2(dz, dx); }
          G.step(st, DT, { x: 0, y: 0 }); ui.time += DT; R.frame(st, DT, ui); if (++n % 10 === 0) await new Promise(r => setTimeout(r, 0)); }
        window.__SPfine = { pts, p: [p.x, p.y], face: p.face };
        const c = R.getCamera(), d = new THREE.Vector3(); c.getWorldDirection(d);
        return { via: best && best.r.id, pts: pts.map(q => q.map(v => +v.toFixed(1))), pitch: +(-Math.asin(d.y) * 57.3).toFixed(1), fov: c.fov, dist: +Math.hypot(c.position.x - p.x, c.position.z - p.y).toFixed(1), h: +c.position.y.toFixed(1) };
      }, { s, metri: +(s.metri || ARG.metri || 12) });
      // 2) i tasselli e i blocchi attorno: si aspetta con fotogrammi senza disegno, il personaggio fermo nel passo (dt piccolissimo)
      for (let k = 0, quiet = 0, n0 = -1; k < 60 && quiet < 3; k++) {
        const T = await pg.evaluate(async () => { const pv = window.__pv, R = pv.R; for (let i = 0; i < 4; i++) { R.frame(pv.st, 1e-4, window.__SPui); await new Promise(r => setTimeout(r, 120)); }
          const t = window.__tasselli; return { v: t && t.on ? t.inVolo + t.inApertura : 0, n: t ? t.inScena : 0, job: !!(R.ISO && R.ISO.job) }; });
        quiet = T.v === 0 && !T.job && T.n === n0 ? quiet + 1 : 0; n0 = T.n; }
      // 3) le varianti, lo stesso istante
      for (const [vn, V] of VARIANTI) {
        const dir = path.join(OUT, DISP, vn); fs.mkdirSync(dir, { recursive: true });
        const r = await pg.evaluate(async ({ su, giu }) => {
          const pv = window.__pv, R = pv.R, rd = R.__models.renderer, gl = rd.getContext();
          const ret = su ? (new Function("pv", "R", su))(pv, R) : null;
          for (const k in gl.__vero) gl[k] = gl.__vero[k];
          R.frame(pv.st, 1e-4, window.__SPui); R.frame(pv.st, 1e-4, window.__SPui);   // due: le manopole nuove e i programmi entrano
          const t0 = performance.now(); R.frame(pv.st, 1e-4, window.__SPui); const ms = performance.now() - t0;
          const url = rd.domElement.toDataURL('image/png');
          let cat = null; if (window.__SPcat) { const C = R.catAlfa(); if (C) { const m = document.createElement('canvas'); m.width = C.w; m.height = C.h; const x = m.getContext('2d'), id = x.createImageData(C.w, C.h), PAL = [[0, 0, 0], [90, 90, 90], [230, 200, 120], [200, 80, 60], [40, 220, 255], [255, 0, 255]];
            for (let y = 0; y < C.h; y++) for (let x2 = 0; x2 < C.w; x2++) { const a = C.a[(C.h - 1 - y) * C.w + x2] / 255 * 35, k = Math.floor(Math.round(a) / 6 + .001), q = PAL[k] || PAL[5], j = (y * C.w + x2) * 4, off = Math.abs(a - Math.round(a)) > .2 ? 1 : 0; id.data[j] = off ? 255 : q[0]; id.data[j + 1] = off ? 255 : q[1]; id.data[j + 2] = off ? 0 : q[2]; id.data[j + 3] = 255; }
            x.putImageData(id, 0, 0); cat = m.toDataURL('image/png'); } }
          for (const k in gl.__vero) gl[k] = function () { };
          if (giu) (new Function('pv', 'R', giu))(pv, R);
          return { url, cat, ret: ret === undefined ? null : ret, ms: Math.round(ms) };
        }, { su: V.su || '', giu: V.giu || '' });
        fs.writeFileSync(path.join(dir, s.nome + '.png'), Buffer.from(r.url.split(',')[1], 'base64'));
        if (r.cat) fs.writeFileSync(path.join(dir, s.nome + '_cat.png'), Buffer.from(r.cat.split(',')[1], 'base64'));
        if (r.ret) log('   ', vn, JSON.stringify(r.ret).slice(0, 3000));
        fs.writeFileSync(path.join(dir, s.nome + '.json'), JSON.stringify(Object.assign({ scena: s.nome, variante: vn, ms: r.ms, ret: r.ret, tela: info.tela, dpr: info.dpr, css: info.css }, cam)));
        log(`${s.nome} ${vn} (${r.ms} ms) via ${cam.via} pendenza ${cam.pitch}° fov ${cam.fov} dist ${cam.dist} h ${cam.h}`);
      }
      log(s.nome, 'fatta in', ((Date.now() - ts) / 1000).toFixed(0), 's');
    }
  } catch (e) { log('errore', e.stack || e); }
  await b.close(); srv.close();
});
