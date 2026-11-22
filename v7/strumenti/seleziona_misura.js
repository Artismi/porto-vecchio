// [graffiti] LA MISURA DELLE SUPERFICI DIPINGIBILI lungo i percorsi principali (Percorsi.dati: i tre dominanti e i secondari), nel gioco vero
// (Chromium senza testa, SwiftShader; la città costruita nella pagina se mancano i tasselli). Ogni 4 m di percorso, a destra e a sinistra, il
// raggio orizzontale dal petto trova la superficie verticale che si vede (entro 9 m); il personaggio si mette davanti (1,1 m, girato verso di
// lei), la camera dietro come camera7, e si chiede:
//   - PRIMA: la cornice della tavoletta (writing.js tavHov al centro dello schermo, «muro»): c'è? sta su quella superficie? perché no?
//   - DOPO: lo strumento di selezione (seleziona.js cerca): fra i candidati ce n'è uno su quella superficie? quanto costa?
// Più i mezzi fermi vicino ai percorsi (il fianco a 1,5 m). Scrive <cartella>/<nome>.json e stampa il riassunto.
//   node strumenti/seleziona_misura.js <cartella> [--nome=prima] [--passo=4] [--misura=throw] [--query=&altro] [--max=0]
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const ARG = {}, POS = [];
for (const a of process.argv.slice(2)) { const m = /^--([a-z]+)=(.*)$/.exec(a); if (m) ARG[m[1]] = m[2]; else POS.push(a); }
const root = process.env.V7DIR || path.resolve(__dirname, '..'), outDir = path.resolve(POS[0] || path.join(require('os').tmpdir(), 'seleziona')), NOME = ARG.nome || 'misura';
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.woff2': 'font/woff2' };
fs.mkdirSync(outDir, { recursive: true });
const t0 = Date.now(), sec = () => ((Date.now() - t0) / 1000).toFixed(0) + ' s';
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  let codice = 0;
  try {
    const pg = await b.newPage({ viewport: { width: 390, height: 700 } });
    pg.on('pageerror', e => console.log('[errore]', e.message.slice(0, 200)));
    await pg.goto(`http://localhost:${srv.address().port}/index.html?${ARG.query || ''}`, { timeout: 0, waitUntil: 'commit' });
    await pg.waitForFunction(() => window.__pv && window.__pv.st && window.__pv.R && window.Percorsi, null, { timeout: 1500000, polling: 1000 });
    console.log('pronto in', sec());
    await pg.keyboard.press('Enter'); await pg.waitForTimeout(1500);
    await pg.evaluate(() => { const pv = window.__pv, st = pv.st; st.deadline = 1e12; window.__meteo = 'sereno';
      const inv = Oggetti.inv(st); inv.bomboletta = 9; inv.pennarello = 2; st.player.hand = 'bomboletta'; Writing.setMode(st, 'tavoletta'); window.__selMis = { righe: [], mezzi: [] }; });
    const rotte = await pg.evaluate(() => Percorsi.dati.percorsi.filter(p => p.k === 'dominante' || p.k === 'secondario').map(p => ({ id: p.id, nome: p.nome, k: p.k, L: p.L })));
    console.log('percorsi', rotte.map(r => r.id + ' ' + Math.round(r.L) + ' m').join(', '));
    const PASSO = +(ARG.passo || 4), MIS = ARG.misura || 'throw', MAX = +(ARG.max || 0);
    for (const ro of rotte) {
      const r = await pg.evaluate(([id, PASSO, MIS, MAX]) => {
        const THREE = window.THREE, pv = window.__pv, R = pv.R, st = pv.st, p = st.player, G = pv.G || window.Game, cam = R.getCamera(), WR = Writing, TAV = WR._.TAV, SEL = typeof Seleziona !== 'undefined' && Seleziona.on ? Seleziona : null;
        const P = Percorsi.dati.percorsi.find(q => q.id === id).pts, rc = new THREE.Raycaster(), out = [], V = new Set(Object.values(R.__vehicles || {}));
        const vehOf = o => { let q = o; for (let i = 0; i < 10 && q; i++) { if (V.has(q)) return q; q = q.parent; } return null; };
        const vis = h => { if (!h.face) return false; let m = h.object.material; if (Array.isArray(m)) m = m[h.face.materialIndex]; return m && m.visible !== false && !(m.transparent && m.opacity < .3) && !h.object.userData.velo && !h.object.userData.wr && !h.object.userData.atlante; };
        const nW = h => h.face.normal.clone().transformDirection(h.object.matrixWorld);
        let Ls = 0; const S = [0]; for (let i = 1; i < P.length; i++) { Ls += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); S.push(Ls); }
        const at = s => { let i = 1; while (i < P.length - 1 && S[i] < s) i++; const k = (s - S[i - 1]) / Math.max(1e-6, S[i] - S[i - 1]); return { x: P[i - 1][0] + (P[i][0] - P[i - 1][0]) * k, y: P[i - 1][1] + (P[i][1] - P[i - 1][1]) * k, tx: P[i][0] - P[i - 1][0], ty: P[i][1] - P[i - 1][1] }; };
        const metti = (x, y, face) => { p.x = x; p.y = y; p.face = face; p.lv = null; p.vehicle = null; p.indoor = null; p.path = []; const feet = Tetti.feetH ? Tetti.feetH(st) : R.groundH(x, y), fx = Math.cos(face), fz = Math.sin(face);
          cam.position.set(x - fx * 6.6, feet + 4.4, y - fz * 6.6); cam.lookAt(x + fx * 1.2, feet + 1.1, y + fz * 1.2); cam.updateMatrixWorld(true); cam.updateProjectionMatrix(); return feet; };
        let n = 0;
        for (let s = 2; s < Ls; s += PASSO) { const q = at(s), tl = Math.hypot(q.tx, q.ty) || 1, tx = q.tx / tl, ty = q.ty / tl;
          for (const side of [1, -1]) { if (MAX && n >= MAX) break; n++;
            const dx = -ty * side, dy = tx * side, feet0 = R.groundH(q.x, q.y), list = R.__bmb.bmbCands(q.x, q.y);
            let h = null; for (const da of [0, .35, -.35]) { const c = Math.cos(da), sn = Math.sin(da), ddx = dx * c - dy * sn, ddy = dx * sn + dy * c; rc.set(new THREE.Vector3(q.x, feet0 + 1.3, q.y), new THREE.Vector3(ddx, 0, ddy)); rc.near = 0; rc.far = 9; const hh = rc.intersectObjects(list, false).find(vis); if (hh && Math.abs(nW(hh).y) < .5 && (!h || hh.distance < h.distance)) h = hh; }
            const row = { id, s: +s.toFixed(1), side };
            if (!h) { row.k = 'aperto'; out.push(row); continue; }
            const n0 = nW(h); n0.y = 0; n0.normalize(); if (n0.x * dx + n0.z * dy > 0) n0.negate();
            const vg = vehOf(h.object), ud = h.object.userData || {}, hp = h.point;
            // che superficie è: mezzo, saracinesca (rc), finestra/porta/insegna (le aperture vere), facciata, muretto (alta meno di 1,7 m), altro
            let kind = vg ? 'mezzo' : /saracinesc/.test(ud.rc || '') ? 'saracinesca' : ud.rc ? 'pezzo:' + ud.rc : null;
            if (!kind) { const A = R.aperture ? R.aperture(hp.x, hp.z, 3) : []; const a = A.find(a => a.nx * n0.x + a.nz * n0.z > .85 && Math.abs((hp.x - a.x) * a.ux + (hp.z - a.z) * a.uz) < a.hw && hp.y > a.y0 && hp.y < a.y1); if (a) kind = a.tipo; }
            if (!kind) { rc.set(new THREE.Vector3(hp.x + n0.x * .05, feet0 + 1.75, hp.z + n0.z * .05), new THREE.Vector3(-n0.x, 0, -n0.z)); rc.far = .4; const up = rc.intersectObjects(list, false).find(vis); const tx2 = Math.floor((hp.x - n0.x * .4) / G.TS), ty2 = Math.floor((hp.z - n0.z * .4) / G.TS), bi = G.bIndex ? G.bIndex[ty2 * G.GW + tx2] : -1, B = bi >= 0 ? G.BUILDINGS[bi] : null; kind = B ? (B.kiosk ? 'chiosco' : 'facciata') : up ? 'muro' : 'muretto'; }
            row.k = kind; row.d = +h.distance.toFixed(2); row.y = +(hp.y - feet0).toFixed(2); row.obj = (h.object.name || h.object.type || '').slice(0, 24);
            // davanti, a 1,1 m (dove si sta per dipingere)
            let x = hp.x + n0.x * 1.1, y = hp.z + n0.z * 1.1; if (!G.walkM(x, y)) { x = q.x; y = q.y; }
            const feet = metti(x, y, Math.atan2(-n0.z, -n0.x)); row.px = +x.toFixed(2); row.py = +y.toFixed(2); row.pf = +Math.atan2(-n0.z, -n0.x).toFixed(3);
            const on = (cx, cy, cz, nx, nz) => nx * n0.x + nz * n0.z > .9 && Math.abs((cx - hp.x) * n0.x + (cz - hp.z) * n0.z) < .3 && Math.hypot(cx - hp.x, cz - hp.z) < 3.6;
            // PRIMA: la cornice della tavoletta al centro
            { TAV.size = MIS; const t = performance.now(); let H = null; try { H = WR._.tavHov(st, .5, .5, 'muro'); } catch (e) { H = { no: true, msg: 'errore ' + e.message }; } row.msP = +(performance.now() - t).toFixed(2);
              if (H && H.ok) { const c = H.Rc.c; row.P = on(c.x, c.y, c.z, H.A.n.x, H.A.n.z) ? (H.small ? 'piccolo' : 'si') : 'altrove'; row.PW = +(H.Rc.W * H.Rc.H).toFixed(2); }
              else row.P = !H ? 'niente' : H.lontano ? 'lontano' : H.wait ? 'attesa' : /gradino/.test(H.msg || '') ? 'gradino' : /non ci sta/.test(H.msg || '') ? 'non_ci_sta' : /treno/.test(H.msg || '') ? 'treno' : 'niente'; }
            // DOPO: lo strumento di selezione
            if (SEL) { const K0 = performance.now(); for (let k = 0; k < 400; k++) { SEL._.coda(p.x, p.y); SEL._.lavora(50); if (!SEL.misura().inCoda) break; } row.msLett = +(performance.now() - K0).toFixed(1);
              const t = performance.now(), nC = SEL.cerca(st, MIS, 'muro'); row.msD = +(performance.now() - t).toFixed(3); const L = SEL.candidati; row.nC = nC;
              const C = L.find(C => !C.flat && on(C.cx, C.cy, C.cz, C.nx, C.nz)); row.D = C ? (C.giu || C.W < C.W0 - .05 ? 'piccolo' : 'si') : nC ? 'altrove' : 'niente'; if (C) { row.DW = +(C.W * C.H).toFixed(2); row.Dk = C.kind; row.Dprimo = L[0] === C; } row.Dsc = Object.assign({}, SEL.misura().scartati); }
            out.push(row); }
          if (MAX && n >= MAX) break; }
        window.__selMis.righe.push(...out); return out.length;
      }, [ro.id, PASSO, MIS, MAX]);
      console.log(sec(), ro.id, r, 'punti');
    }
    // i mezzi fermi a meno di 10 m dai percorsi
    const mz = await pg.evaluate(MIS => {
      const THREE = window.THREE, pv = window.__pv, R = pv.R, st = pv.st, p = st.player, G = window.Game, cam = R.getCamera(), WR = Writing, TAV = WR._.TAV, SEL = typeof Seleziona !== 'undefined' && Seleziona.on ? Seleziona : null, out = [];
      const pts = []; Percorsi.dati.percorsi.filter(q => q.k === 'dominante' || q.k === 'secondario').forEach(q => q.pts.forEach(a => pts.push(a)));
      const vs = st.vehicles.filter(v => !v.wreck && !v.hidden && !(G.VK[v.kind] || {}).two && !(G.VK[v.kind] || {}).boat && R.__vehicles[v.id] && pts.some(a => Math.hypot(a[0] - v.x, a[1] - v.y) < 10)).slice(0, 40);
      for (const v of vs) { const K = G.VK[v.kind] || { wid: 1.6 }, nx = -Math.sin(v.ang), nz = Math.cos(v.ang), mov = Math.abs(v.speed || 0) > .3;
        for (const sd of [1, -1]) { const x = v.x + nx * sd * (K.wid / 2 + 1.3), y = v.y + nz * sd * (K.wid / 2 + 1.3), face = Math.atan2(-nz * sd, -nx * sd); p.x = x; p.y = y; p.face = face; p.lv = null; p.vehicle = null;
          const feet = R.groundH(x, y), fx = Math.cos(face), fz = Math.sin(face); cam.position.set(x - fx * 6.6, feet + 4.4, y - fz * 6.6); cam.lookAt(x + fx * 1.2, feet + .9, y + fz * 1.2); cam.updateMatrixWorld(true);
          const row = { veh: v.id, kind: v.kind, sd, mov, parked: !v.driver, px: +x.toFixed(2), py: +y.toFixed(2), pf: +face.toFixed(3) };
          TAV.size = MIS; const t = performance.now(); let H = null; try { H = WR._.tavHov(st, .5, .5, 'muro'); } catch (e) { H = null; } row.msP = +(performance.now() - t).toFixed(2);
          row.P = H && H.ok ? (H.A.veh === v.id ? 'si' : 'altrove') : H && H.msg ? H.msg.slice(0, 40) : 'niente';
          if (SEL) { for (let k = 0; k < 200; k++) { SEL._.coda(p.x, p.y); SEL._.lavora(50); if (!SEL.misura().inCoda) break; } const t2 = performance.now(); SEL.cerca(st, MIS, 'muro'); row.msD = +(performance.now() - t2).toFixed(3); const C = SEL.candidati.find(C => C.veh === v.id); row.D = C ? 'si' : mov ? 'in_moto' : 'no'; row.Dprimo = !!(C && SEL.candidati[0] === C); }
          out.push(row); } }
      window.__selMis.mezzi = out; return out;
    }, MIS);
    const all = await pg.evaluate(() => Object.assign({ sel: typeof Seleziona !== 'undefined' ? Seleziona.misura() : null }, window.__selMis));
    fs.writeFileSync(path.join(outDir, NOME + '.json'), JSON.stringify(all));
    // il riassunto
    const R = all.righe, sup = R.filter(r => r.k !== 'aperto'), cnt = (L, f) => L.reduce((a, r) => { const k = f(r); a[k] = (a[k] || 0) + 1; return a; }, {}), pc = (a, n) => n ? (100 * a / n).toFixed(1) + '%' : '-';
    const med = L => { const s = L.filter(v => v != null).sort((a, b) => a - b); return s.length ? { mediana: s[Math.floor(s.length / 2)], p95: s[Math.floor(s.length * .95)], max: s[s.length - 1] } : null; };
    const okP = sup.filter(r => r.P === 'si' || r.P === 'piccolo').length, okD = sup.filter(r => r.D === 'si' || r.D === 'piccolo').length;
    const riass = { punti: R.length, superfici: sup.length, aperto: R.length - sup.length, tipi: cnt(sup, r => r.k), prima: { accetta: pc(okP, sup.length), intero: pc(sup.filter(r => r.P === 'si').length, sup.length), esiti: cnt(sup, r => r.P), perTipo: Object.fromEntries(Object.entries(cnt(sup, r => r.k)).map(([k, n]) => [k, pc(sup.filter(r => r.k === k && (r.P === 'si' || r.P === 'piccolo')).length, n)])), ms: med(sup.map(r => r.msP)) },
      dopo: all.sel ? { accetta: pc(okD, sup.length), intero: pc(sup.filter(r => r.D === 'si').length, sup.length), primo: pc(sup.filter(r => r.Dprimo).length, sup.length), esiti: cnt(sup, r => r.D), perTipo: Object.fromEntries(Object.entries(cnt(sup, r => r.k)).map(([k, n]) => [k, pc(sup.filter(r => r.k === k && (r.D === 'si' || r.D === 'piccolo')).length, n)])), ms: med(sup.map(r => r.msD)), lettura: med(sup.map(r => r.msLett)), sel: all.sel } : null,
      mezzi: { n: all.mezzi.length, fermi: all.mezzi.filter(r => !r.mov).length, prima: cnt(all.mezzi, r => r.P), dopo: all.sel ? cnt(all.mezzi, r => r.D) : null } };
    fs.writeFileSync(path.join(outDir, NOME + '_riassunto.json'), JSON.stringify(riass, null, 1));
    console.log(JSON.stringify(riass, null, 1));
  } catch (e) { console.error(e); codice = 1; }
  console.log('fine in', sec()); await b.close(); srv.close(); process.exit(codice);
});
