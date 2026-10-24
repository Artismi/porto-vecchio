// [pulizia] LE STRADE INTEGRE nel gioco vero (città nuova, Chromium senza testa): il controllo di src/strade_integre.js sui dati del
// mondo (capi ciechi, capi staccati, buchi della griglia, carreggiata sotto le case e i pezzi, marciapiedi interrotti) più quello che
// si vede solo col gioco caricato:
//   materiale    lungo la stessa via il materiale del suolo (la mappa dei materiali di pavimenti.js, blocco per blocco: basoli,
//                travertino, porfido, asfalto, banchina, terra, sabbia, spianata, lastre) cambia di netto lontano da un incrocio o da
//                una piazza; o due vie che si continuano (capo contro capo, meno di 30° fra le direzioni) hanno materiali diversi
//                senza raccordo;
//   ostacolo     le cose a terra che la passata della pulizia (src/pulizia_rumore.js, tipo 'strada') trova sulla carreggiata delle vie
//                carrabili, o che lasciano meno di 1,2 m nei vicoli e sui marciapiedi: prima e dopo la passata.
// Stampa i conti, salva reports/strade_integre.json e una foto ritagliata dalla camera del gioco dei 12 peggiori in
// reports/strade_integre/ (FOTO=0 per non farle).   node strumenti/strade_integre.js [uscita.json]
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const root = path.resolve(__dirname, '..'), args = process.argv.slice(2);
const outJ = path.resolve(args.find(a => a.endsWith('.json')) || path.join(root, 'reports', 'strade_integre.json')), outD = outJ.replace(/\.json$/, '');
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream' };
const srv = http.createServer((req, res) => { let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html'; if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); }).listen(0, async () => {
  const t0 = Date.now(), b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: 1280, height: 800 } });
  pg.on('pageerror', e => console.log('[errore]', e.message));
  await pg.addInitScript(() => { window.__dbg35 = true; window.__rumoreChi = true; window.__pulita = true; });
  await pg.goto(`http://localhost:${srv.address().port}/${process.env.PV_PAGINA || 'index.html'}${process.env.PV_QUERY || '?cittanuova'}`);
  await pg.waitForFunction(() => window.__pulizia2 && window.__pv && window.__pv.st, null, { timeout: 900000, polling: 2000 });
  await pg.addScriptTag({ content: fs.readFileSync(path.join(root, 'src', 'strade_integre.js'), 'utf8') });
  const R = await pg.evaluate(() => {
    const W = (window.Game && Game.MAP && Game.MAP.world && Game.MAP.world.BUILDINGS) ? Game.MAP.world : window.World, D = StradeIntegre.analizza(W), TS = W.TS, C = StradeIntegre.CORNICE;
    // i materiali: la mappa di pavimenti.js per blocco (32 caselle), la famiglia della via (rf) e del suolo (gf) a mezzo metro
    const PV = window.Pavimenti, FAMN = { 0: 'niente', 1: 'basoli', 2: 'travertino', 3: 'porfido', 4: 'asfalto', 5: 'banchina', 6: 'terra', 7: 'sabbia', 8: 'spianata', 9: 'lastre' }, MAP = new Map();
    const fam = (x, z) => { if (!PV || !PV.__mappe) return null; const ci = Math.floor(x / (TS * 32)), cj = Math.floor(z / (TS * 32)), k = ci + ',' + cj; let m = MAP.get(k);
      if (!m) { try { const q = PV.__mappe(ci * 32, cj * 32, 32, 32); m = { d: q.id.image.data, box: q.box, res: q.res }; } catch (e) { m = { err: String(e) }; } MAP.set(k, m); }
      if (!m.d) return null; const i = Math.floor((x - m.box.x) / m.box.z * m.res.x), j = Math.floor((z - m.box.y) / m.box.w * m.res.y); if (i < 0 || j < 0 || i >= m.res.x || j >= m.res.y) return null; const pk = m.d[(j * m.res.x + i) * 4 + 3]; return { rf: pk % 16, gf: Math.floor(pk / 16) % 16 }; };
    const VIE = new Set(['citta', 'vicolo', 'strada', 'litoranea']), inC = (x, y) => x >= C[0] && x <= C[2] && y >= C[1] && y <= C[3];
    const RR = (W.roads || []).filter(r => r && r.pts && r.pts.length > 1 && VIE.has(r.kind) && r.pts.some(([x, y]) => inC(x, y)));
    const dVia = (rd, x, y) => { let best = 1e9; const Q = rd.pts; for (let k = 0; k < Q.length - 1; k++) { const [ax, ay] = Q[k], [bx, by] = Q[k + 1], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2)); best = Math.min(best, Math.hypot(ax + dx * t - x, ay + dy * t - y)); } return best; };
    const inPoly = (P0, x, y) => { let c = false; for (let i = 0, j = P0.length - 1; i < P0.length; j = i++) { const [xi, yi] = P0[i], [xj, yj] = P0[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
    const NODI = (W.nodi || []).filter(n => n.poly), giunto = (rd, x, y) => RR.some(o => o !== rd && dVia(o, x, y) < (o.w || 4) / 2 + (rd.w || 4) / 2 + 3) || NODI.some(n => inPoly(n.poly, x, y)) || (W.sets || []).some(s => s.x0 !== undefined && x > s.x0 - 3 && x < s.x1 + 3 && y > s.y0 - 3 && y < s.y1 + 3);
    const MAT = [], famVia = {};
    RR.forEach(rd => { const Q = rd.pts, sv = []; for (let k = 0; k < Q.length - 1; k++) { const [ax, ay] = Q[k], [bx, by] = Q[k + 1], L = Math.hypot(bx - ax, by - ay); for (let s = 0; s < L; s += 1) { const x = ax + (bx - ax) * s / L, y = ay + (by - ay) * s / L; if (!inC(x, y)) continue; const f = fam(x, y); if (f) sv.push([x, y, f.rf || f.gf]); } }
      const cnt = {}; sv.forEach(q => cnt[q[2]] = (cnt[q[2]] || 0) + 1); famVia[rd.id] = +Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];
      for (let k = 1; k < sv.length; k++) { const a = sv[k - 1], c = sv[k]; if (a[2] === c[2] || !a[2] || !c[2]) continue; if (giunto(rd, c[0], c[1])) continue;
        let reg = 0; for (let q = k; q < sv.length && sv[q][2] === c[2]; q++) reg++; if (reg < 3) continue;   // un cambio che regge almeno 3 m (non un tombino)
        MAT.push(['materiale', Math.round(c[0] * 10) / 10, Math.round(c[1] * 10) / 10, rd.id, rd.kind, FAMN[a[2]] + ' → ' + FAMN[c[2]], 'lungo la via']); } });
    // due vie che si continuano capo contro capo con materiali diversi
    RR.forEach(rd => { const Q = rd.pts; [[Q[0], Q[1]], [Q[Q.length - 1], Q[Q.length - 2]]].forEach(([E, F]) => { if (!inC(E[0], E[1])) return; const ua = Math.atan2(E[1] - F[1], E[0] - F[0]);
      RR.forEach(o => { if (o === rd || o.id < rd.id) return; const P = o.pts; [[P[0], P[1]], [P[P.length - 1], P[P.length - 2]]].forEach(([G2, H]) => { if (Math.hypot(G2[0] - E[0], G2[1] - E[1]) > 4) return; const ub = Math.atan2(H[1] - G2[1], H[0] - G2[0]); let t = ub - ua; t = Math.atan2(Math.sin(t), Math.cos(t));
        if (Math.abs(t) > Math.PI / 6) return; const fa = famVia[rd.id], fb = famVia[o.id]; if (fa && fb && fa !== fb) MAT.push(['materiale', Math.round(E[0] * 10) / 10, Math.round(E[1] * 10) / 10, rd.id + '|' + o.id, rd.kind + '|' + o.kind, FAMN[fa] + ' → ' + FAMN[fb], 'capo contro capo']); }); }); }); });
    D.punti.materiale = MAT; D.conti.materiale = MAT.length;
    // gli ostacoli: dal censimento della pulizia
    const RU = window.__rumore || {}, pp = RU.punti || {}, ost = q => (q || []).filter(p => p[0] === 'strada');
    D.punti.ostacolo_prima = ost(pp.prima); D.punti.ostacolo = ost(pp.dopo); D.conti.ostacolo_prima = D.punti.ostacolo_prima.length; D.conti.ostacolo = D.punti.ostacolo.length;
    D.azioniStrada = { tolti: Object.entries((RU.azioni || {}).tolti || {}).filter(([k]) => /^strada/.test(k)), spostati: Object.entries((RU.azioni || {}).spostati || {}).filter(([k]) => /^strada/.test(k)), tenuti: Object.entries((RU.azioni || {}).tenuti || {}).filter(([k]) => /^strada/.test(k)) };
    D.famVia = {}; Object.keys(famVia).forEach(k => D.famVia[k] = FAMN[famVia[k]]); D.blocchi = MAP.size; return D;
  });
  console.log('caricato in', Math.round((Date.now() - t0) / 1000), 's; vie controllate', R.vie, '; blocchi della mappa dei materiali', R.blocchi);
  console.log('\nSTRADE INTEGRE', JSON.stringify(R.conti)); console.log('materiale di ogni via', JSON.stringify(R.famVia));
  console.log('ostacoli sulla strada: prima della passata', R.conti.ostacolo_prima, '→ dopo', R.conti.ostacolo, '·', JSON.stringify(R.azioniStrada));
  Object.keys(R.punti).forEach(k => { if (k === 'ostacolo_prima') return; console.log('\n' + k + ' (' + R.punti[k].length + ')'); R.punti[k].slice(0, 14).forEach(p => console.log('  ' + p.join('  '))); });
  // i 12 peggiori: carreggiata sotto le case (sull'asse prima, poi per lunghezza), sotto i pezzi, capi staccati, materiali, marciapiedi, ostacoli rimasti
  const num = v => parseFloat(String(v)) || 0, peso = p => ({ sotto_casa: 3 + num(p[5]) / 2 + (/asse/.test(p[6]) ? 10 : 0), sotto_pezzo: 4 + num(p[5]) / 2, buco: 3 + num(p[5]) / 2, capi_staccati: 8 - num(p[4]) / 2, materiale: 6, marciapiede: 2 + num(p[5]) / 3, capo_cieco: 9, ostacolo: 5 })[p[0]] || 1;
  const tutti = []; Object.keys(R.punti).forEach(k => { if (k !== 'ostacolo_prima') R.punti[k].forEach(p => tutti.push(p)); });
  tutti.sort((a, c) => peso(c) - peso(a)); const peggiori = []; for (const p of tutti) { if (peggiori.some(q => Math.hypot(q[1] - p[1], q[2] - p[2]) < 12)) continue; peggiori.push(p); if (peggiori.length >= 12) break; }
  console.log('\nI 12 PEGGIORI:'); peggiori.forEach((p, i) => console.log('  ' + (i + 1) + '. ' + p.join('  ')));
  fs.mkdirSync(path.dirname(outJ), { recursive: true }); fs.writeFileSync(outJ, JSON.stringify({ quando: new Date().toISOString(), conti: R.conti, punti: R.punti, azioniStrada: R.azioniStrada, peggiori }, null, 1));
  if (process.env.FOTO !== '0') { fs.mkdirSync(outD, { recursive: true });
    await pg.keyboard.press('Enter'); await pg.waitForTimeout(1500);
    await pg.addStyleTag({ content: '#app > *:not(#cv) { visibility: hidden !important; } #bubbles, #hover, #moment, #xhair, #ring, #touch { display: none !important; }' });
    await pg.evaluate(() => { const pv = window.__pv, st = pv.st; st.deadline = 1e12; window.__meteo = 'sereno'; setInterval(() => { const u = pv.ui; u.flash = 0; u.fade = 0; u.desat = false; u.letterbox = false; u.dialog = null; u.book = false; u.menu = false; st.over = null; st.chase = false; }, 50); });
    for (let i = 0; i < peggiori.length; i++) { const p = peggiori[i];
      await pg.evaluate(([x, y]) => { const pv = window.__pv, st = pv.st, R = pv.R; st.t = Math.floor(st.t / 1440) * 1440 + 1440 + 630; st.player.x = x; st.player.y = y + 6; pv.ui.focus = { x, y }; pv.ui.zoom = .4; if (R && R.cam) { R.cam.x = R.cam.tx = x; R.cam.y = R.cam.ty = y; R.cam.zoom = R.cam.tz = .4; } }, [p[1], p[2]]);
      for (let k = 0, quiet = 0, tb = Date.now(); Date.now() - tb < 40000 && quiet < 2; k++) { await pg.waitForTimeout(1000); quiet = (await pg.evaluate(() => !(window.__pv.R.ISO && window.__pv.R.ISO.job))) ? quiet + 1 : 0; }
      await pg.waitForTimeout(4000); const f = path.join(outD, String(i + 1).padStart(2, '0') + '_' + p[0] + '.png');
      await pg.screenshot({ path: f, clip: { x: 320, y: 200, width: 640, height: 400 }, timeout: 240000 }); console.log('foto', f); } }
  console.log('\nsalvato', outJ); await b.close(); srv.close();
});
