// [graffitipool] QUANTI GRAFFITI SI VEDONO DALLA CAMERA DEL GIOCO. Nel gioco vero (Chromium senza testa, SwiftShader), un giro a piedi nel
// borgo (il porto, la Via della Marina, la Via di Mezzo, i vicoli, la Rua, Piazza San Rocco, la Via della Vittoria, il Glacis, il sottopasso):
// in ogni posto il personaggio sulla via girato nel verso della marcia, la camera del gioco (camera7) che si assesta da sé (il braccio, i muri),
// i graffiti piazzati e disegnati come nel gioco (lo scan forzato dallo stesso punto, perché qui un fotogramma dura più di un secondo). Poi:
//   - i lavori nel quadro (il centro nel campo della camera, entro 70 m) e, per ognuno: piazzato sul muro (i raggi di placeWall), disegnato
//     (il velo o l'atlante, non la prima stesura), visibile (cinque raggi dalla camera a cinque punti del riquadro contro tutta la scena),
//     leggibile (alto e largo almeno LEGG px a 540 righe, non di taglio: il coseno fra la normale e la vista oltre .3);
//   - quelli che non ci sono: falliti (i raggi non trovano il muro), in attesa, tolti dal diradamento dei tasselli (rimodella) che da qui si
//     vedrebbero;
//   - il costo: disegni del fotogramma, pagine dell'atlante, veli, lavori in memoria, tessiture, memoria JS.
//   - la foto (la tela della pagina, il passo dello stile E compreso).
//   node strumenti/graffiti_vista.js <cartella> <nome> [query]      es.  node strumenti/graffiti_vista.js /tmp/gv oggi ""   e   ... g2 "&graffiti2"
'use strict';
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const root = path.resolve(__dirname, '..'), [outDir0, NOME, QUERY] = process.argv.slice(2), outDir = path.resolve(outDir0 || '.');
const LEGG = 24;
// il giro: [via, frazione della via, verso (+1 avanti lungo i punti, -1 indietro), etichetta]
const GIRO = [
  ['Via della Marina', .12, 1, 'Calata del porto, Via della Marina verso est'],
  ['Via del Porto', .55, 1, 'Via del Porto, verso la Calata'],
  ['Via di Mezzo', .15, 1, 'Via di Mezzo, dall\'inizio verso est'],
  ['Via di Mezzo', .6, 1, 'Via di Mezzo, a metà'],
  ['Vico Lungo', .5, -1, 'Vico Lungo, salendo'],
  ['Vicolo dei Lanternini', .5, 1, 'Vicolo dei Lanternini'],
  ['Rua Maestra', .35, 1, 'Rua Maestra, verso est'],
  ['Rua Maestra', .75, -1, 'Rua Maestra, verso ovest'],
  ['Caruggio dei Pescatori', .3, 1, 'Caruggio dei Pescatori, scendendo'],
  ['Via della Vittoria', .25, 1, 'Via della Vittoria, Piazza Grande'],
  ['Via delle Mura', .5, 1, 'Via delle Mura, verso il Glacis'],
  ['Vico del Glacis', .1, 1, 'Glacis, verso l\'arco'],
  ['Sottopasso Cavour', .25, 1, 'Sottopasso Cavour'],
  ['Corso Garibaldi', .4, 1, 'Corso Garibaldi, scendendo al porto'],
];
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.gz': 'application/gzip' };
fs.mkdirSync(outDir, { recursive: true });
const t0 = Date.now(), sec = () => ((Date.now() - t0) / 1000).toFixed(0) + ' s';
const srv = http.createServer((req, res) => { let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html'; if (u.startsWith('/api/')) { res.writeHead(200); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); }).listen(0, async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const errori = [], rep = { nome: NOME, query: QUERY || '', posti: [] }, repF = path.join(outDir, NOME + '.json');
  try {
    const pg = await b.newPage({ viewport: { width: 960, height: 540 } });
    pg.on('pageerror', e => { errori.push(e.message); console.log('[errore]', e.message); });
    pg.on('console', m => { if (/\[Writing\]|\[stradadipinta\]|\[graffiti2|\[tasselli\]/.test(m.text())) console.log('[console]', m.text().slice(0, 200)); });
    await pg.addInitScript(() => { window.__pulita = true; });
    await pg.goto(`http://localhost:${srv.address().port}/index.html?x=1${QUERY || ''}`, { timeout: 0 });
    await pg.waitForFunction(() => window.__pv && window.__pv.st, null, { timeout: 1800000, polling: 1000 });
    console.log('pronto in', sec());
    await pg.keyboard.press('Enter'); await pg.waitForTimeout(500);
    await pg.addStyleTag({ content: '#app > *:not(#cv) { visibility: hidden !important; } #bubbles, #hover, #moment, #xhair, #ring, #touch { display: none !important; }' });
    await pg.evaluate(() => { const pv = window.__pv, st = pv.st; st.deadline = 1e12; window.__meteo = 'sereno';
      setInterval(() => { const u = pv.ui; u.flash = 0; u.fade = 0; u.desat = false; u.letterbox = false; u.dialog = null; u.book = false; u.menu = false; u.intro = false; st.over = null; st.chase = false; st.player.hp = 100; st.player.path = []; st.t = Math.floor(st.t / 1440) * 1440 + 15 * 60; }, 50); });
    await pg.waitForFunction(() => window.WriterVita && WriterVita.V(window.__pv.st).hist, null, { timeout: 900000, polling: 1000 });
    // il disegnatore a parte si riavvia (in SwiftShader il primo resta indietro di minuti), come strumenti/graffiti_sonda.js
    await pg.evaluate(() => { const A = Writing._.ARTW; try { A.w && A.w.terminate(); } catch (e) { } A.w = null; A.ok = null; A.morto = 0; A.t0 = 0; A.lastOk = performance.now(); A.fly = 0; A.wait.clear(); A.volo.clear(); A.pend.clear(); A.q.length = 0; A.wq.length = 0; });
    rep.stato = await pg.evaluate(() => ({ tasselli: !!(window.Tasselli && Tasselli.attivo && Tasselli.attivo()), cotti: window.Tasselli && Array.isArray(Tasselli.graffiti) ? Tasselli.graffiti.length : null, stileE: typeof StileE !== 'undefined' ? StileE.on : null, sd: StradaDipinta.attiva(), g2: typeof Graffiti2 !== 'undefined' ? Graffiti2.on : false, lavori: Writing.S(window.__pv.st).works.length, misura: StradaDipinta.misura(), g2m: typeof Graffiti2 !== 'undefined' && Graffiti2.misura ? Graffiti2.misura() : null }));
    console.log('stato', JSON.stringify(rep.stato).slice(0, 400));
    const fot = () => pg.evaluate(() => new Promise(r => requestAnimationFrame(() => r())));
    for (let i = 0; i < GIRO.length; i++) {
      const [via, fr, verso, nome] = GIRO[i];
      const P = await pg.evaluate(([via, fr, verso]) => { const W = Game.MAP.world, r = (W.roads || []).filter(q => q.name === via && q.pts && q.pts.length > 1).sort((a, b) => b.pts.length - a.pts.length)[0]; if (!r) return null;
        const p = r.pts, L = [0]; for (let k = 1; k < p.length; k++) L.push(L[k - 1] + Math.hypot(p[k][0] - p[k - 1][0], p[k][1] - p[k - 1][1])); const s = L[L.length - 1] * fr; let k = 1; while (k < p.length - 1 && L[k] < s) k++;
        const t = (s - L[k - 1]) / Math.max(1e-6, L[k] - L[k - 1]), x = p[k - 1][0] + (p[k][0] - p[k - 1][0]) * t, y = p[k - 1][1] + (p[k][1] - p[k - 1][1]) * t; let hx = p[k][0] - p[k - 1][0], hy = p[k][1] - p[k - 1][1]; const l = Math.hypot(hx, hy) || 1; hx = hx / l * verso; hy = hy / l * verso;
        // un punto calpestabile vicino all'asse
        const G = Game, wk = (x, y) => G.walkT(Math.floor(x / G.TS), Math.floor(y / G.TS)); let px = x, py = y; if (!wk(px, py)) { for (const d of [.5, 1, 1.5, 2, 3]) { let ok = false; for (const sg of [1, -1]) { const qx = x - hy * d * sg, qy = y + hx * d * sg; if (wk(qx, qy)) { px = qx; py = qy; ok = true; break; } } if (ok) break; } }
        return { x: px, y: py, hx, hy, len: Math.round(L[L.length - 1]) }; }, [via, fr, verso]);
      if (!P) { console.log(i + 1, via, 'via non trovata'); rep.posti.push({ n: i + 1, nome, via, manca: true }); continue; }
      // il personaggio sul posto, la camera7 si rifà da capo dietro di lui girata nel verso della marcia (CAM7.yaw0 al salto)
      const setPose = async yaw => pg.evaluate(([P, yaw]) => { const st = window.__pv.st, C = window.__CAM7; st.player.x = P.x; st.player.y = P.y; st.player.path = []; if (C) { C.yaw0 = yaw; C.ppx = undefined; } }, [P, yaw]);
      const head = () => pg.evaluate(() => { const c = window.__pv.R.getCamera(), d = new window.THREE.Vector3(); c.getWorldDirection(d); return Math.atan2(d.z, d.x); });
      let yaw = Math.atan2(P.hx, -P.hy); await setPose(yaw); for (let j = 0; j < 3; j++) await fot();
      { const want = Math.atan2(P.hy, P.hx), got = await head(); let dd = want - got; dd = Math.atan2(Math.sin(dd), Math.cos(dd)); if (Math.abs(dd) > .05) { yaw += dd * (await pg.evaluate(() => 1)); await setPose(yaw); for (let j = 0; j < 3; j++) await fot(); const g2 = await head(); let d2 = want - g2; d2 = Math.atan2(Math.sin(d2), Math.cos(d2)); if (Math.abs(d2) > Math.abs(dd)) { yaw -= 2 * dd; await setPose(yaw); for (let j = 0; j < 3; j++) await fot(); } } }
      // i graffiti attorno: lo scan forzato finché il disegnatore ha finito (o al più ~90 s)
      let s = null;
      for (let k = 0; k < 40; k++) {
        s = await pg.evaluate(P => { const st = window.__pv.st; Writing._.scanNear(st, P.x, P.y, { force: true, ms: 400 }); const A = Writing._.ARTW, W = Writing.S(st);
          const near = W.works.filter(w => !w.erased && (w.pos || w.spot) && Math.hypot((w.pos ? w.pos.x : w.spot.x) - P.x, (w.pos ? w.pos.z : w.spot.y) - P.y) < 60);
          return { near: near.length, posati: near.filter(w => w.gfxRect).length, veli: near.filter(w => Writing.GFX.works[w.id]).length, piatti: near.filter(w => { const g = Writing.GFX.works[w.id]; return g && g.flat; }).length, pend: A.pend.size + A.wq.length + A.q.length, attesa: near.filter(w => !w.gfxRect && !(w.gfxFail > 3)).length }; }, P);
        await pg.waitForTimeout(1500); await fot();
        if (k > 5 && s.pend === 0 && s.piatti === 0 && (s.attesa === 0 || k > 25)) break;
      }
      // la camera assestata: ferma entro 2 cm per 4 fotogrammi di fila (il braccio della camera7 si accorcia e torna fuori con le molle)
      { let prev = null, fermi = 0; for (let j = 0; j < 30 && fermi < 4; j++) { await fot(); const c = await pg.evaluate(() => { const p = window.__pv.R.getCamera().position; return [p.x, p.y, p.z]; }); if (prev && Math.hypot(c[0] - prev[0], c[1] - prev[1], c[2] - prev[2]) < .02) fermi++; else fermi = 0; prev = c; } }
      const file = path.join(outDir, `${NOME}_${String(i + 1).padStart(2, '0')}.png`);
      // la foto: la tela della pagina subito dopo il fotogramma del gioco (il suo passo dello stile E compreso: il giro del gioco è registrato
      // prima di questo, quindi nello stesso fotogramma ha già disegnato); in SwiftShader page.screenshot aspetta più di 30 s
      { const url = await pg.evaluate(() => new Promise(res => requestAnimationFrame(() => { try { res(document.getElementById('cv').toDataURL('image/png')); } catch (e) { res(null); } })));
        if (url && url.length > 20000) fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64')); else await pg.screenshot({ path: file, timeout: 240000 }); }
      // LA MISURA dalla camera vera
      const M = await pg.evaluate(([P, LEGG]) => {
        const THREE = window.THREE, pv = window.__pv, R = pv.R, st = pv.st, cam = R.getCamera(), W = Writing.S(st), GFX = Writing.GFX, rd = R.__models.renderer, sc = R.__models.scene;
        cam.updateMatrixWorld(true); const PW = 960, PH = 540, Fr = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse)), cp = cam.position.clone();
        // la scena per i raggi: tutte le mesh visibili, non i veli né l'atlante
        const all = []; sc.traverseVisible(o => { if (!(o.isMesh || o.isInstancedMesh) || !o.geometry || (o.userData && (o.userData.velo || o.userData.wr || o.userData.atlante))) return; let m = o.material; if (Array.isArray(m)) m = m[0]; if (m && m.transparent && m.opacity < .3) return; if (o.isInstancedMesh) { if (o.count <= 64) all.push([o, null, 0]); return; } if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); const s = o.geometry.boundingSphere.clone().applyMatrix4(o.matrixWorld); if (s.center.distanceTo(cp) - s.radius > 75) return; all.push([o, s.center, s.radius]); });
        const rc = new THREE.Raycaster(); rc.firstHitOnly = true;
        const libero = q => { const d = q.clone().sub(cp), D = d.length(); d.normalize(); rc.set(cp, d); rc.near = .3; rc.far = D - .12; const ray = rc.ray, L = []; for (const a of all) { if (!a[1] || ray.distanceSqToPoint(a[1]) < a[2] * a[2]) L.push(a[0]); } const h = rc.intersectObjects(L, false); return !h.length; };
        const pr = v => { const q = v.clone().project(cam); return [(q.x + 1) / 2 * PW, (1 - q.y) / 2 * PH, q.z]; };
        const up = new THREE.Vector3(0, 1, 0);
        function giudica(c, n, r0, Ww, Hh) {   // c centro, n normale, r destra; ritorna { quadro, vis (punti liberi su 5), hpx, wpx, cos }
          const r = r0 || new THREE.Vector3(n.z, 0, -n.x), u = new THREE.Vector3().crossVectors(n, r).normalize(); if (u.y < 0) u.negate();
          if (!Fr.containsPoint(c) || c.distanceTo(cp) > 70) return { quadro: false };
          const P5 = [[0, 0], [-.35, -.3], [.35, -.3], [-.35, .3], [.35, .3]].map(([a, b]) => c.clone().addScaledVector(r, a * Ww).addScaledVector(u, b * Hh).addScaledVector(n, .02));
          const vis = P5.filter(q => Fr.containsPoint(q) && libero(q)).length;
          const T = pr(c.clone().addScaledVector(u, Hh / 2)), B = pr(c.clone().addScaledVector(u, -Hh / 2)), Lf = pr(c.clone().addScaledVector(r, -Ww / 2)), Rt = pr(c.clone().addScaledVector(r, Ww / 2));
          const hpx = Math.hypot(T[0] - B[0], T[1] - B[1]), wpx = Math.hypot(Lf[0] - Rt[0], Lf[1] - Rt[1]), cs = n.dot(cp.clone().sub(c).normalize());
          return { quadro: true, vis, hpx, wpx, cos: cs, d: c.distanceTo(cp) };
        }
        const out = { lavori: W.works.length, quadro: 0, visibili: 0, leggibili: 0, piccoli: 0, taglio: 0, coperti: 0, nonDisegnati: 0, piatti: 0, falliti: 0, attesa: 0, perStile: {}, legStile: {}, lista: [] };
        for (const w of W.works) { if (w.erased || w.surf === 'treno' || w.surf === 'vagone' || w.surf === 'auto') continue;
          const g = GFX.works[w.id];
          if (w.gfxRect) { const R0 = w.gfxRect, j = giudica(R0.c, R0.n, R0.r, R0.W, R0.H); if (!j.quadro) continue; out.quadro++;
            if (!g || !g.tgt) { out.nonDisegnati++; continue; } if (g.flat) { out.piatti++; continue; }
            if (!j.vis) { out.coperti++; continue; }
            out.visibili++; out.perStile[w.style] = (out.perStile[w.style] || 0) + 1;
            const leg = j.hpx >= LEGG && j.wpx >= LEGG && j.cos > .3; if (leg) { out.leggibili++; out.legStile[w.style] = (out.legStile[w.style] || 0) + 1; } else if (j.cos <= .3) out.taglio++; else out.piccoli++;
            out.lista.push({ s: w.style, l: w.sdLiv || (w.cotto ? 'cotto' : ''), z: w.sdZona, W: +R0.W.toFixed(2), H: +R0.H.toFixed(2), d: +j.d.toFixed(1), hpx: Math.round(j.hpx), wpx: Math.round(j.wpx), cos: +j.cos.toFixed(2), vis: j.vis, leg });
          } else { const sp = w.spot || (w.pos && { x: w.pos.x, y: w.pos.z }); if (!sp) continue; const gh = R.groundH(sp.x, sp.y), c = new THREE.Vector3(sp.x, gh + 1.5, sp.y); if (!Fr.containsPoint(c) || c.distanceTo(cp) > 70) continue; out.quadro++;
            if (w.gfxFail > 3 || (w.gfxFail > 0 && !(w.__gfxWait > performance.now()))) { out.falliti++; (out.perche = out.perche || []).push({ s: w.style, l: w.sdLiv || '', no: w.__no || null, prove: (w.__prove || []).slice(-3) }); } else out.attesa++; } }
        // tolti dal diradamento dei tasselli (rimodella): i lavori cotti che da qui si vedrebbero
        out.diradati = null; try { const Lr = window.Tasselli && Tasselli.graffiti; if (Array.isArray(Lr) && StradaDipinta.attiva()) { const C = Lr.map(o => Object.assign({}, o)), K = new Set(StradaDipinta.rimodella(st, C)); let q = 0, v = 0, lg = 0; const st0 = {};
          C.forEach(o => { if (K.has(o) || !o.r) return; const c = new THREE.Vector3(...o.r.c), n = new THREE.Vector3(...o.r.n), r = o.r.r ? new THREE.Vector3(...o.r.r) : null, j = giudica(c, n, r, o.r.W, o.r.H); if (!j.quadro) return; q++; if (j.vis) { v++; if (j.hpx >= LEGG && j.wpx >= LEGG && j.cos > .3) { lg++; st0[o.style] = (st0[o.style] || 0) + 1; } } });
          out.diradati = { quadro: q, visibili: v, leggibili: lg, stili: st0 }; } } catch (e) { out.diradati = { err: String(e) }; }
        // il costo
        rd.info.autoReset = false; rd.info.reset(); rd.render(sc, cam); const inf = rd.info; out.costo = { disegni: inf.render.calls, triangoli: inf.render.triangles, tessiture: inf.memory.textures, geometrie: inf.memory.geometries, atlante: (Writing._.ATL.pages || []).length, veliVivi: GFX.mem.vivi || 0, graficaLavori: Object.keys(GFX.works).length, memMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null }; rd.info.autoReset = true;
        out.camera = { x: +cp.x.toFixed(1), y: +cp.y.toFixed(1), z: +cp.z.toFixed(1), fov: cam.fov, alto: +(cp.y - R.groundH(cp.x, cp.z)).toFixed(1), braccio: +Math.hypot(cp.x - st.player.x, cp.z - st.player.y).toFixed(1) };
        return out; }, [P, LEGG]);
      const rec = Object.assign({ n: i + 1, nome, via, x: +P.x.toFixed(1), y: +P.y.toFixed(1), foto: path.basename(file), scan: s }, M);
      rep.posti.push(rec); fs.writeFileSync(repF, JSON.stringify(rep, null, 1));
      console.log(i + 1, nome, `quadro ${M.quadro} visibili ${M.visibili} leggibili ${M.leggibili} piccoli ${M.piccoli} taglio ${M.taglio} coperti ${M.coperti} nonDis ${M.nonDisegnati} piatti ${M.piatti} falliti ${M.falliti} attesa ${M.attesa} diradati ${JSON.stringify(M.diradati)} disegni ${M.costo.disegni} atl ${M.costo.atlante}`, sec());
    }
  } catch (e) { console.log('errore', e.message, e.stack); }
  rep.errori = errori; fs.writeFileSync(repF, JSON.stringify(rep, null, 1));
  console.log('errori', JSON.stringify(errori.slice(0, 5))); await b.close(); srv.close(); process.exit(0);
});
