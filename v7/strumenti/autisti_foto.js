// [vita1] F3 · LA SONDA DEGLI AUTISTI, con le foto: venti mezzi (tutti i modelli a quattro ruote, il traffico, chi guida il suo mezzo
// con rider 'npc:<id>', le volanti con l'agente accanto) messi uno alla volta sullo stesso tratto di strada, il gioco fermo, la camera
// dal lato del guidatore a 10, 45 e 80 m (la camera della partita, la «messa a fuoco», segue: a 10 m c'è la figura vera, oltre i 45 m
// il ripiego). Per ogni foto: la cima della figura al volante (e di chi siede accanto), coi vertici veri della pelle animata, contro il
// tetto: porta.yw + 5 cm nei modelli di veicoli3d, il tetto vero (un raggio dall'alto sul sedile) negli altri.
// Uso: node strumenti/autisti_foto.js <cartella v7> <uscita> [cartella con index.html e mondo_cotto.js da servire al loro posto]
//      (dentro browser_slot.sh; PW = il percorso di playwright). Scrive <uscita>/autisti.json e le foto <uscita>/a_<i>_<d>.png;
//      PV_FOTOGRAMMI = fotogrammi da aspettare per foto (16), PV_DA = il mezzo da cui riprendere
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require(process.env.PW || 'playwright');
const root = process.argv[2], out = process.argv[3], sost = process.argv[4] || null;
fs.mkdirSync(out, { recursive: true });
const T0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0)}s]`, ...a);
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.gz': 'application/gzip' };
const srv = http.createServer((req, res) => { let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html'; if (u.startsWith('/api/')) { res.writeHead(200); res.end('{"ok":false}'); return; }
  let p = path.join(root, u); if (sost && (u === '/index.html' || u === '/mondo_cotto.js') && fs.existsSync(path.join(sost, u))) p = path.join(sost, u);
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); });
srv.listen(0, async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disk-cache-size=1'] });
  const err = [], R = { shots: [] };
  try {
    const pg = await b.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
    pg.on('pageerror', e => err.push(e.message.slice(0, 200))); pg.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) err.push(m.text().slice(0, 200)); if (/\[vita1\]|\[anim\]/.test(m.text())) err.push('avviso: ' + m.text().slice(0, 200)); });
    await pg.goto(`http://localhost:${srv.address().port}/index.html?cittanuova&leggera&tassellivecchi`, { waitUntil: 'domcontentloaded', timeout: 0 });
    await pg.waitForFunction(() => window.__tl && window.__tl.gioco, null, { timeout: 2400000, polling: 2000 }); log('gioco');
    await pg.keyboard.press('Enter'); await pg.waitForTimeout(2000);
    await pg.addStyleTag({ content: '#app > *:not(#cv) { visibility: hidden !important; } body > div:not(#app) { visibility: hidden !important; }' });
    await pg.waitForFunction(() => window.Models && Models.charsReady && Models.charsReady(), null, { timeout: 600000, polling: 2000 }).catch(() => log('personaggi non pronti'));
    // il gioco fermo, la camera a mano
    R.info = await pg.evaluate(() => { const pv = window.__pv, st = pv.st, G = pv.G; st.deadline = 1e12; window.__meteo = 'sereno'; window.__frames = 0;
      st.t = Math.floor(st.t / 1440) * 1440 + 11 * 60;
      setInterval(() => { const u = pv.ui; u.flash = 0; u.fade = 0; u.desat = false; u.letterbox = false; u.dialog = null; u.book = false; u.menu = false; u.intro = false; st.over = null; st.player.hp = 100; }, 50);
      const Rr = pv.R, rd = Rr.__models.renderer, orig = rd.render.bind(rd);
      rd.render = (s2, c2) => { if (c2 === Rr.getCamera()) { window.__frames++; const F = window.__camFix; if (F) { c2.position.set(F.p[0], F.p[1], F.p[2]); c2.up.set(0, 1, 0); c2.lookAt(F.t[0], F.t[1], F.t[2]); c2.fov = F.fov || 50; c2.updateProjectionMatrix(); c2.updateMatrixWorld(); } } return orig(s2, c2); };
      window.__step0 = G.step; G.step = () => { };
      const p = st.player, VK = G.VK;
      // il tratto di strada: la corsia lunga più vicina al giocatore, a metà
      let best = null; G.LANES.forEach((L, i) => { if (L.L < 70) return; const q = G.lanePos(L, L.L / 2, 1), d = Math.hypot(q.x - p.x, q.y - p.y); if (!best || d < best.d) best = { d, i, q }; });
      window.__spot = best.q;
      // i venti mezzi: tutti i modelli a quattro ruote, poi di nuovo i più comuni; a turno traffico, l'abitante col suo mezzo, la volante
      const kinds = Object.keys(VK).filter(k => !VK[k].boat && !VK[k].two && !VK[k].pocket && k !== 'vespa' && k !== 'bmx' && k !== 'ciao' && k !== 'bici' && VK[k].len >= 2.5);
      const comuni = ['cinquecento', 'ritmo', 'giulia', 'furgone', 'polizia', 'campagnola'].filter(k => VK[k]);
      const list = kinds.slice(); for (let i = 0; list.length < 20; i++) list.push(comuni[i % comuni.length]);
      const abit = st.npcs.filter(n => n.pop && !n.dead && !n.cop && n.look);
      const L = list.slice(0, 20).map((kind, i) => { const ruolo = ['traffico', 'abitante', 'volante'][i % 3];
        const v = G.makeVehicle(st, { id: 'aut' + i, kind, x: best.q.x, y: best.q.y, ang: best.q.ang, color: ['#b8302a', '#f3c6d4', '#2f4a3a', '#d8d0c0', '#3a5a7a'][i % 5], speed: 0, hidden: true });
        st.vehicles.push(v);
        if (ruolo === 'traffico') { v.traffic = true; }
        else if (ruolo === 'abitante') { const n = abit[i % abit.length]; v.rider = 'npc:' + n.id; n.inVeh = v.id; if (G.entra) G.entra(n, 'mezzo', v.id); else n.inside = true; n.x = v.x; n.y = v.y; v.__chi = n.id; }
        else { v.police = true; v.rider = 'npc'; v.driveTo = { x: v.x + 50, y: v.y }; }
        return { id: v.id, kind, ruolo, chi: v.__chi || null }; });
      window.__aut = L;
      return { spot: best.q, kinds, list: L, lane: G.LANES[best.i].id }; });
    log('info', JSON.stringify(R.info).slice(0, 600));
    // la sonda: la cima delle figure al volante e accanto, contro il tetto
    const misura = () => pg.evaluate(() => {
      const pv = window.__pv, Rr = pv.R, st = pv.st, id = window.__cur, v = st.vehicles.find(q => q.id === id), dyn = Rr.__dyn, g = dyn && dyn.vehicles ? dyn.vehicles[id] : null;
      if (!g) return { niente: true };
      const u = g.userData, V = new THREE.Vector3(); g.updateMatrixWorld(true);
      const vis = o => { for (let q = o; q; q = q.parent) if (!q.visible) return false; return true; };
      const top = o => { let m = -1e9; o.updateMatrixWorld(true); o.traverse(q => { if (!q.isMesh || !vis(q) || !q.geometry) return; const P = q.geometry.attributes.position; if (!P) return;
        if (q.isSkinnedMesh && (q.getVertexPosition || q.boneTransform)) { if (q.skeleton) q.skeleton.update(); const step = Math.max(1, Math.floor(P.count / 6000)); for (let i = 0; i < P.count; i += step) { if (q.getVertexPosition) q.getVertexPosition(i, V); else { V.fromBufferAttribute(P, i); q.boneTransform(i, V); } V.applyMatrix4(q.matrixWorld); if (V.y > m) m = V.y; } }
        else { if (!q.geometry.boundingBox) q.geometry.computeBoundingBox(); const B = q.geometry.boundingBox; for (const x of [B.min.x, B.max.x]) for (const y of [B.min.y, B.max.y]) for (const z of [B.min.z, B.max.z]) { V.set(x, y, z).applyMatrix4(q.matrixWorld); if (V.y > m) m = V.y; } } }); return m; };
      const figure = new Set([u.drvG, u.drv, u.drv2G, u.drv2].filter(Boolean));
      // il tetto vero sopra un sedile: un raggio dall'alto, sui pezzi del mezzo (non sulle figure, non sugli aloni)
      const rc = new THREE.Raycaster(), tettoSu = seat => { const S = new THREE.Vector3(seat[0], seat[1], seat[2]).applyMatrix4(g.matrixWorld); rc.set(new THREE.Vector3(S.x, S.y + 6, S.z), new THREE.Vector3(0, -1, 0)); const objs = []; g.traverse(q => { if (!q.isMesh || q.isSprite) return; for (let a = q; a && a !== g; a = a.parent) if (figure.has(a)) return; if (q.material && (q.material.transparent && q.material.opacity < .5)) return; objs.push(q); }); const h = rc.intersectObjects(objs, false).filter(x => x.point.y > S.y - .2); return h.length ? h[0].point.y : null; };
      const yW = (seat, y) => new THREE.Vector3(seat[0], y, seat[2]).applyMatrix4(g.matrixWorld).y;
      const una = (pass) => { const seat = pass ? u.seat2 : u.seat; if (!seat) return null; const vero = pass ? u.drv2G : u.drvG, rip = pass ? u.drv2 : u.drv;
        const fig = vero && vis(vero) ? vero : rip && vis(rip) ? rip : null; if (!fig) return { chi: 'nessuno' };
        const t = top(fig), lim = u.porta ? yW(seat, u.porta.yw + .05) : tettoSu(seat), base = new THREE.Vector3().setFromMatrixPosition(g.matrixWorld).y;
        return { chi: fig === vero ? 'vero' : fig.userData.seduto ? 'seduto' : 'pupazzo', cima: +(t - base).toFixed(3), limite: lim == null ? null : +(lim - base).toFixed(3), margine: lim == null ? null : +(lim - t).toFixed(3), fonte: u.porta ? 'porta.yw+5cm' : 'tetto (raggio)' }; };
      return { modello: u.glb ? 'glb' : u.porta ? 'veicoli3d' : 'carMesh', guida: una(false), accanto: v && (v.police || v.livrea) ? una(true) : null };
    });
    const DIST = (process.env.PV_DIST || '10,45,80').split(',').map(Number);   // PV_DIST: solo alcune distanze
    for (let i = +process.env.PV_DA || 0; i < Math.min(R.info.list.length, process.env.PV_A ? +process.env.PV_A + 1 : 1e9); i++) {   // PV_DA..PV_A: solo quei mezzi   // PV_DA: si riprende da quel mezzo
      const A = R.info.list[i];
      for (const d of DIST) {
        await pg.evaluate(([id, d]) => { const pv = window.__pv, Rr = pv.R, st = pv.st, p = st.player, s = window.__spot; window.__cur = id;
          st.vehicles.forEach(v => { if (/^aut/.test(v.id)) v.hidden = v.id !== id; else if (v.traffic || v.guida || v.police) v.__nasc = v.__nasc || (v.hidden ? 1 : 2), v.hidden = true; });
          const v = st.vehicles.find(q => q.id === id); v.x = s.x; v.y = s.y; v.ang = s.ang; v.speed = 0; v.vx = v.vy = v.w = 0;
          const sx = Math.cos(v.ang - Math.PI / 2), sy = Math.sin(v.ang - Math.PI / 2), fx = Math.cos(v.ang), fy = Math.sin(v.ang);   // il lato del guidatore
          // da vicino di fianco (un poco da dietro); da lontano lungo la strada, 20° sul lato del guidatore (di fianco, a 80 m, c'erano le case)
          let ux = sx - fx * .12, uy = sy - fy * .12;
          if (d >= 60) {   // la direzione più vicina al lato del guidatore con la vista libera (G.los sulle caselle) fino a d
            const G = pv.G, a0 = Math.atan2(sy, sx); let best = null;
            for (let k = 0; k <= 24 && !best; k++) for (const sg of [1, -1]) { const a = a0 + sg * k * Math.PI / 24, cx = s.x + Math.cos(a) * d, cy = s.y + Math.sin(a) * d; if (G.los(s.x, s.y, cx, cy) && G.walkM(cx, cy)) { best = a; break; } }
            if (best !== null) { ux = Math.cos(best); uy = Math.sin(best); }
          }
          const ul = Math.hypot(ux, uy); ux /= ul; uy /= ul;
          const f = Math.min(d, 70); p.vehicle = null; p.indoor = null; p.lv = null; p.path = []; p.x = s.x + ux * f; p.y = s.y + uy * f;
          Rr.snap(st); try { Rr.preparaArrivo(); } catch (e) { }
          const gH = (x, y) => { try { return Rr.groundH ? Rr.groundH(x, y) || 0 : 0; } catch (e) { return 0; } };
          const h = gH(s.x + ux * d, s.y + uy * d) + 1.5 + d * .03, fov = 2 * Math.atan(1.9 / d) * 180 / Math.PI;
          window.__camFix = { p: [s.x + ux * d, h, s.y + uy * d], t: [s.x, gH(s.x, s.y) + 1.05, s.y], fov }; }, [A.id, d]);
        const f0 = await pg.evaluate(() => window.__frames), tb = Date.now();
        while (Date.now() - tb < 120000) { await pg.waitForTimeout(1500); const f = await pg.evaluate(() => window.__frames); if (f - f0 >= (+process.env.PV_FOTOGRAMMI || 16)) break; }
        const m = await misura();
        const url = await pg.evaluate(() => new Promise(res => requestAnimationFrame(() => { try { res(document.getElementById('cv').toDataURL('image/png')); } catch (e) { res(null); } })));
        const nome = `a_${String(i).padStart(2, '0')}_${d}.png`; if (url) fs.writeFileSync(path.join(out, nome), Buffer.from(url.split(',')[1], 'base64'));
        const S = Object.assign({ i, d, file: nome }, A, m); R.shots.push(S); log(JSON.stringify(S)); fs.writeFileSync(path.join(out, 'autisti_parziale.json'), JSON.stringify(R));
      }
    }
  } catch (e) { log('errore', e.message.slice(0, 500)); }
  R.errori = err.slice(0, 20);
  const ok = R.shots.filter(s => s.guida && s.guida.margine != null);
  R.riassunto = { foto: R.shots.length, conMisura: ok.length, sopraIlTetto: ok.filter(s => s.guida.margine < 0).length + R.shots.filter(s => s.accanto && s.accanto.margine != null && s.accanto.margine < 0).length,
    margineMin: ok.length ? Math.min(...ok.map(s => s.guida.margine)) : null, chi: R.shots.reduce((a, s) => { const k = s.d + ':' + (s.guida ? s.guida.chi : '?'); a[k] = (a[k] || 0) + 1; return a; }, {}) };
  fs.writeFileSync(path.join(out, 'autisti.json'), JSON.stringify(R, null, 1));
  log('riassunto', JSON.stringify(R.riassunto)); log('errori', JSON.stringify(R.errori.slice(0, 6)));
  await b.close(); srv.close(); process.exit(0);
});
