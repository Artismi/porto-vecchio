// [strade3] LA PARTE DELLA SONDA CHE VUOLE IL GIOCO: carica la città nuova nel browser (Chromium senza testa), e
//   1. scrive i cartelli che render.js ha posato (window.__strade3: stop e precedenza di buildStrade1, attraversamenti, cantieri, i cartelli
//      sui pali dei lampioni, i semafori, le zone pedonali e i divieti di buildUrbano1) con il verso finale (dopo snapRot2): la parte in Node
//      (strade3_sonda.js) li prova contro le corsie insieme a quelli di segnaletica.js;
//   2. misura le GIUNTURE DEL SUOLO: su FINESTRE di 48 m nella città guarda il suolo dall'alto (una camera della sonda, ortografica, solo le
//      mesh del suolo e dei marciapiedi, senza le ombre delle case; la camera del gioco non si tocca) a 10 px/m, e su ogni lato fra due caselle
//      della stessa superficie (stesso tipo di casella e stessa famiglia di pietra di pavimenti.js) conta
//        giuntura   un gradino di luminanza lungo il lato (la media dei due pixel di qua e di là) più forte di 2,5 volte quello a metà casella
//                   e di almeno 3/255 (una cucitura: la tela o la mappa del blocco che non continuano);
//        salto      le due caselle con tinte medie diverse di più del 6% (un salto di tono fra caselle che dovrebbero essere la stessa cosa);
//      a parte i lati sui confini dei blocchi (64 m) e fra il marciapiede e la via (il cordolo: la luminanza deve cambiare, si conta solo la
//      differenza di tono fra marciapiedi vicini).
//   node strumenti/strade3_vista.js <v7> <uscita.json> [query] [finestre: x,y;x,y...]
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const root = path.resolve(process.argv[2] || path.join(__dirname, '..')), OUT = process.argv[3] || path.join(root, 'reports', 'strade3_vista.json'), Q = process.argv[4] || 'cittanuova';
const FIN = process.argv[5] ? process.argv[5].split(';').map(s => s.split(',').map(Number)) : null;
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.gz': 'application/gzip' };
const srv = http.createServer((req, res) => { let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html'; if (u.startsWith('/api/')) { res.writeHead(200); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); }).listen(0, async () => {
  const T0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0)}s]`, ...a);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const err = [], out = { query: Q, cartelli: [], finestre: [] };
  try {
    const pg = await b.newPage({ viewport: { width: 640, height: 400 } });
    pg.on('pageerror', e => err.push(e.message)); pg.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) err.push(m.text().slice(0, 200)); });
    await pg.goto(`http://localhost:${srv.address().port}/index.html?${Q}`, { waitUntil: 'domcontentloaded', timeout: 0 });
    await pg.waitForFunction(() => window.__tl && window.__tl.gioco, null, { timeout: 1800000, polling: 1000 }); log('caricato');
    await pg.keyboard.press('Enter'); await pg.waitForTimeout(2000);
    out.cartelli = await pg.evaluate(() => (window.__strade3 ? window.__strade3.C : []).map(c => Object.assign({}, c)));
    log('cartelli di render.js', out.cartelli.length);
    await pg.evaluate(() => { const pv = window.__pv, st = pv.st; st.deadline = 1e12; window.__meteo = 'sereno';
      setInterval(() => { const u = pv.ui; u.flash = 0; u.fade = 0; u.dialog = null; u.book = false; u.menu = false; st.over = null; st.chase = false; st.player.hp = 100; st.wanted = 0; }, 100); });
    // le finestre: gli incroci della città e il mezzo delle vie lunghe (o quelle date)
    const fin = FIN || await pg.evaluate(() => { const SG = Segnaletica, C = SG.CORNICE, L = [];
      SG.junc1().filter(J => J.city && J.x > C[0] && J.x < C[2] && J.y > C[1] && J.y < C[3]).forEach(J => { if (!L.some(q => Math.hypot(q[0] - J.x, q[1] - J.y) < 40)) L.push([J.x, J.y]); });
      (Game.MAP.roads || []).filter(rd => rd.kind === 'citta' && rd.pts.length > 4).forEach(rd => { const P = rd.pts, m = P[Math.floor(P.length / 2)]; if (m[0] > C[0] && m[0] < C[2] && m[1] > C[1] && m[1] < C[3] && !L.some(q => Math.hypot(q[0] - m[0], q[1] - m[1]) < 40)) L.push([m[0], m[1]]); });
      return L.slice(0, 14); });
    log('finestre', fin.length);
    for (const [cx, cy] of fin) {
      await pg.evaluate(([x, y]) => { const pv = window.__pv, st = pv.st, p = st.player; p.vehicle = null; p.indoor = null; p.path = []; p.x = x; p.y = y; p.vx = p.vy = 0; let t = Math.floor(st.t / 1440) * 1440 + 660; if (t < st.t - 1) t += 1440; st.t = t; }, [cx, cy]);
      await pg.waitForTimeout(4000);
      for (let k = 0, quiet = 0, tb = Date.now(); Date.now() - tb < 90000 && quiet < 3; k++) { await pg.waitForTimeout(2000); quiet = (await pg.evaluate(() => !(window.__pv.R.ISO && window.__pv.R.ISO.job))) ? quiet + 1 : 0; }
      await pg.waitForTimeout(3000);
      const r = await pg.evaluate(misura, [cx, cy, 24, 10]);
      out.finestre.push(r); log('finestra', cx.toFixed(0), cy.toFixed(0), JSON.stringify(r.conti));
    }
  } catch (e) { log('errore', e.message); err.push(e.message); }
  out.errori = err.slice(0, 8);
  const tot = { lati: 0, giunture: 0, salti: 0, blocco: 0, giuntureBlocco: 0, cordoli: 0, saltiMarciapiede: 0 }; out.finestre.forEach(f => Object.keys(tot).forEach(k => { tot[k] += f.conti[k] || 0; })); out.totale = tot;
  fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(out, null, 1)); log('scritto', OUT, JSON.stringify(tot)); console.log('errori', JSON.stringify(err.slice(0, 5)));
  await b.close(); srv.close(); process.exit(0); });

// ---- nella pagina: una finestra del suolo dall'alto ----
function misura([cx, cy, H, PPM]) {
  const pv = window.__pv, R = pv.R, G = pv.G, sc = R.__ed.scene, ren = R.__ed.renderer || R.renderer, ISO = R.ISO, TS = G.TS, T = G.T, M = G.MAP, N = 2 * H * PPM;
  // le mesh del suolo: i blocchi del terreno (e la riva), i marciapiedi e i lastricati col disegno di pavimenti.js
  const SU = new Set(); ISO.chunks.forEach(ch => { if (ch.grp) ch.grp.traverse(m => { if (m.isMesh) SU.add(m); }); if (ch.riva && ch.riva.grp) ch.riva.grp.traverse(m => { if (m.isMesh) SU.add(m); }); });
  const pavM = m => { const mt = m.material; if (!mt || Array.isArray(mt) || !mt.customProgramCacheKey) return false; try { return /pav/.test(String(mt.customProgramCacheKey())); } catch (e) { return false; } };
  const tolti = []; sc.traverse(o => { if ((o.isMesh || o.isInstancedMesh || o.isPoints || o.isLine || o.isSprite) && o.visible && !(o.isMesh && !o.isInstancedMesh && (SU.has(o) || pavM(o)))) { tolti.push(o); o.visible = false; } });
  const cam = new THREE.OrthographicCamera(-H, H, H, -H, 1, 400); cam.position.set(cx, 200, cy); cam.up.set(0, 0, -1); cam.lookAt(cx, 0, cy); cam.updateMatrixWorld(true);
  const rt = new THREE.WebGLRenderTarget(N, N); const fog = sc.fog; sc.fog = null;
  const prev = ren.getRenderTarget(); ren.setRenderTarget(rt); ren.clear(); ren.render(sc, cam); const px = new Uint8Array(N * N * 4); ren.readRenderTargetPixels(rt, 0, 0, N, N, px); ren.setRenderTarget(prev);
  sc.fog = fog; tolti.forEach(o => { o.visible = true; }); rt.dispose();
  // l'immagine: riga 0 in alto = nord (z piccolo); readPixels parte dal basso
  const Lm = new Float32Array(N * N), x0 = cx - H, z0 = cy - H; for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const o = ((N - 1 - j) * N + i) * 4; Lm[j * N + i] = (.2126 * px[o] + .7152 * px[o + 1] + .0722 * px[o + 2]) / 255; }
  const L = (i, j) => Lm[clampI(j) * N + clampI(i)], clampI = v => Math.max(0, Math.min(N - 1, v));
  // la superficie di una casella: il tipo, la zona, la famiglia di pavimenti.js al centro
  const tipo = (tx, ty) => { if (tx < 0 || ty < 0 || tx >= G.GW || ty >= G.GH) return null; const v = M.grid[ty * G.GW + tx]; if (v === T.BLD || v === T.WATER || v === T.TREE || v === T.FOUNT || v === T.CLIFF) return null;
    const s = typeof Pavimenti !== 'undefined' && Pavimenti.sonda ? Pavimenti.sonda((tx + .5) * TS, (ty + .5) * TS) : {}; return v + ':' + (s.rf || 0) + ':' + (s.gf || 0) + ':' + M.zone[ty * G.GW + tx]; };
  const marc = (tx, ty) => { const s = typeof Pavimenti !== 'undefined' && Pavimenti.sonda ? Pavimenti.sonda((tx + .5) * TS, (ty + .5) * TS) : {}; return s.gf === 9 && !s.rf; };
  const P = TS * PPM, conti = { lati: 0, giunture: 0, salti: 0, blocco: 0, giuntureBlocco: 0, cordoli: 0, saltiMarciapiede: 0 }, casi = [];
  const mediaCas = (tx, ty) => { const i0 = Math.round((tx * TS - x0) * PPM), j0 = Math.round((ty * TS - z0) * PPM); let s = 0, n = 0; for (let j = j0 + 3; j < j0 + P - 3; j++) for (let i = i0 + 3; i < i0 + P - 3; i++) if (i >= 0 && j >= 0 && i < N && j < N) { s += Lm[j * N + i]; n++; } return n ? s / n : null; };
  // i lati verticali (fra (tx-1, ty) e (tx, ty)) e orizzontali
  const tx0 = Math.ceil(x0 / TS) + 1, tx1 = Math.floor((x0 + 2 * H) / TS) - 1, ty0 = Math.ceil(z0 / TS) + 1, ty1 = Math.floor((z0 + 2 * H) / TS) - 1, CH = ISO.CH;
  for (let ty = ty0; ty < ty1; ty++) for (let tx = tx0; tx < tx1; tx++) for (const vert of [true, false]) {
    const ax = vert ? tx - 1 : tx, ay = vert ? ty : ty - 1, A = tipo(ax, ay), B = tipo(tx, ty); if (!A || !B) continue;
    const mA = mediaCas(ax, ay), mB = mediaCas(tx, ty); if (mA === null || mB === null) continue;
    const bl = vert ? tx % CH === 0 : ty % CH === 0;
    if (A !== B) { if (marc(ax, ay) && marc(tx, ty)) { conti.cordoli++; if (Math.abs(mA - mB) / Math.max(.05, (mA + mB) / 2) > .06) { conti.saltiMarciapiede++; casi.push({ k: 'salto_marciapiede', x: tx * TS, y: ty * TS, d: +(mA - mB).toFixed(3) }); } } continue; }
    conti.lati++; if (bl) conti.blocco++;
    // il gradino lungo il lato contro quello a metà casella (a 1/4 e 3/4: il disegno delle pietre ha i suoi giunti)
    const e = Math.round(((vert ? tx * TS - x0 : ty * TS - z0)) * PPM), o0 = Math.round(((vert ? ty * TS - z0 : tx * TS - x0)) * PPM);
    const step = c => { let s = 0, n = 0; for (let o = o0 + 2; o < o0 + P - 2; o++) { const a = vert ? (L(c - 2, o) + L(c - 3, o)) / 2 : (L(o, c - 2) + L(o, c - 3)) / 2, b2 = vert ? (L(c + 1, o) + L(c, o)) / 2 : (L(o, c + 1) + L(o, c)) / 2; s += b2 - a; n++; } return s / n; };
    const sE = step(e), sR = (Math.abs(step(e - Math.round(P / 4))) + Math.abs(step(e + Math.round(P / 4)))) / 2;
    if (Math.abs(sE) > 3 / 255 && Math.abs(sE) > 2.5 * sR + 1 / 255) { if (bl) conti.giuntureBlocco++; else conti.giunture++; if (casi.length < 60) casi.push({ k: bl ? 'giuntura_blocco' : 'giuntura', x: (vert ? tx : tx + .5) * TS, y: (vert ? ty + .5 : ty) * TS, d: +sE.toFixed(3), rif: +sR.toFixed(3), tipo: A }); }
    if (Math.abs(mA - mB) / Math.max(.05, (mA + mB) / 2) > .06) { conti.salti++; if (casi.length < 60) casi.push({ k: 'salto', x: (vert ? tx : tx + .5) * TS, y: (vert ? ty + .5 : ty) * TS, d: +(mB - mA).toFixed(3), tipo: A }); }
  }
  // una miniatura per la tavola (luminanza a 2 px/m)
  const S = 2, n2 = Math.floor(N / (PPM / S)), mini = []; for (let j = 0; j < n2; j++) { let r = ''; for (let i = 0; i < n2; i++) r += String.fromCharCode(48 + Math.round(L(Math.floor(i * PPM / S), Math.floor(j * PPM / S)) * 63)); mini.push(r); }
  return { cx, cy, H, conti, casi, mini };
}
