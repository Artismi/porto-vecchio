// [suolo2] LA SONDA DEL SUOLO: il piano che si vede contro la quota del gioco. Il committente, sulla Piazza dell'Ottagono: «se cammino verso
// le scale sprofondo nel pavimento: il pavimento vero è sotto, sopra c'è la pedana rialzata della piazza, che si può attraversare».
// Carica il gioco vero (Chromium senza testa, la città costruita nel browser: ?tasselli=0, ?pavrush per avere subito i blocchi del suolo),
// passa la camera su ogni blocco di 64 m con caselle pedonabili e in ogni punto della griglia (PASSO m, 1 di base) dove il giocatore può
// stare (la stessa prova di game.js tryMove: i quattro spigoli dell'ingombro di 22 cm liberi) confronta:
//   - il piano visibile: un raggio dall'alto sulle mesh vere della scena (terreno, lastricati, marciapiedi, pezzi delle opere: gradoni,
//     scale, scalinate, sagrati, banchine, pontili, ponti, piattaforme...), la faccia in su più alta fra 1,5 m sotto e 1,3 m sopra la
//     quota del gioco che regge un piede: attorno, a 45 cm in otto direzioni, il piano non sale né scende più di 36 cm (una pedata si
//     passa, la seduta di una panchina, il piano di un tavolo, una ringhiera, il bordo di una fioriera no: sono arredi che il giocatore
//     attraversa, non suolo; gli scogli della riva sì: ci si cammina sopra). Fuori: acqua, piani di nebbia e d'acqua (ShaderMaterial), sagome lontane (MeshBasicMaterial), persone e mezzi;
//   - la quota del gioco: R.groundH(x, z), quella dei piedi del giocatore (render.js playerH), della gente, dei mezzi, delle cose posate.
// Ogni punto dove differiscono più di SOGLIA (5 cm) è un errore: «affonda» (il piano visibile sta sopra: i piedi dentro il pavimento)
// o «galleggia» (sta sotto: i piedi in aria). Gli errori si raggruppano in zone (punti vicini, stesso verso), con il nome del luogo
// più vicino, l'opera o il pezzo sotto (W.pedonali, W.pezzi), la misura (massimo, media), e la causa: la mesh che fa il piano visibile.
//   node strumenti/sonda_suolo.js [uscita.json]     QUERY='?nofixsuolo2' (com'era)   PASSO=1   SOGLIA=.05   AREA=x0,y0,x1,y1
// Senza uscita scrive reports/sonda_suolo[_QUERY].json. Stampa il conteggio e le zone peggiori.
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || '/opt/node-tools/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const QUERY = process.env.QUERY || '', PASSO = +(process.env.PASSO || 1), SOGLIA = +(process.env.SOGLIA || .05), AREA = process.env.AREA ? process.env.AREA.split(',').map(Number) : null;
const OUT = process.argv[2] || path.join(root, 'reports', 'sonda_suolo' + (QUERY ? '_' + QUERY.replace(/[^a-z0-9]+/gi, '') : '') + '.json');
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream' };

// ---- nella pagina ----
function pagina() {
  const pv = window.__pv, R = pv.R, G = pv.G, W = G.MAP.world, sc = R.__ed.scene, TS = W.TS, ISO = R.ISO;
  const rc = new THREE.Raycaster(), dn = new THREE.Vector3(0, -1, 0), o = new THREE.Vector3(), nrm = new THREE.Vector3(), sph = new THREE.Sphere();
  // il giocatore può stare qui (game.js tryMove con l'ingombro più stretto, quello sui gradini)
  const r0 = .22, libero = (x, y) => G.walkM(x - r0, y - r0) && G.walkM(x + r0, y - r0) && G.walkM(x - r0, y + r0) && G.walkM(x + r0, y + r0);
  // le mesh che non sono suolo: persone e mezzi (anche le loro ombre), acqua, nebbia, sagome lontane
  function escluse() {
    const S = new Set(); const via = g => g && g.traverse && g.traverse(m => S.add(m));
    try { const V = R.__vehicles; for (const k in V) via(V[k]); } catch (e) { }
    if (ISO.baseMesh) S.add(ISO.baseMesh);   // il terreno grosso da lontano (8 cm sotto): si nasconde dove c'è il blocco
    ISO.chunks.forEach(ch => { via(ch.veg); via(ch.nat); via(ch.vd); });   // le piante dei blocchi (alberi, cespugli, il verde): si attraversano, non sono suolo
    sc.traverse(o => { if (!S.has(o) && (/^(vegetazione|vegLontano|loTrees)$/.test(o.name || '') || (o.userData && (o.userData.mixer || o.userData.rig || o.userData.personaggi)))) via(o); });   // il verde attorno alla camera, le figure animate
    return S;
  }
  const scarta = m => { const mt = m.material; if (!mt || Array.isArray(mt)) return false; if (mt.isShaderMaterial || mt.isMeshBasicMaterial || mt.isPointsMaterial || mt.isLineBasicMaterial || mt.isSpriteMaterial) return true;
    if (mt.transparent && mt.opacity < .5) return true; if (mt.visible === false || mt.colorWrite === false) return true; if (/acqua|water|mare|vetro/i.test(mt.name || '')) return true; return m.userData && (m.userData.waterMask || m.userData.velo); };
  const classe = m => { const mt = m.material || {}; let k = (mt.name || mt.type || '?'); const u = m.userData || {}; if (u.fusione1) k = 'casa fusa:' + k; else if (u.posa1) k = 'pezzo:' + k; else if (u.statico1) k = 'statico:' + k;
    let p = m; while (p && p !== sc) { if (BLK.has(p)) { k = 'suolo:' + k; break; } p = p.parent; } return k; };
  const BLK = new Set(), TERR = new Set(); const blk = () => { BLK.clear(); TERR.clear(); ISO.chunks.forEach(ch => { if (ch.grp) { BLK.add(ch.grp); ch.grp.children.forEach(c => { if (c.isMesh) TERR.add(c); }); if (ch.riva && ch.riva.grp) ch.riva.grp.traverse(m => { if (m.isMesh) TERR.add(m); }); } }); };
  // le mesh vicine (sfera nel riquadro allargato)
  function vicine(x0, z0, x1, z1, EX) {
    const out = []; sc.traverseVisible(m => { if (!m.isMesh || m.isSkinnedMesh || m.isInstancedMesh || EX.has(m) || scarta(m)) return; const g = m.geometry; if (!g) return;
      if (!g.boundingSphere) { if (!g.attributes || !g.attributes.position) { if (!(m.userData && m.userData.lazy1)) return; } else g.computeBoundingSphere(); } if (!g.boundingSphere) return;
      sph.copy(g.boundingSphere).applyMatrix4(m.matrixWorld); if (sph.radius > 5000) return;   /* le mesh lunghe ci sono: la ferrovia intera è una mesh sola */ const cx = Math.max(x0, Math.min(sph.center.x, x1)), cz = Math.max(z0, Math.min(sph.center.z, z1)); if (Math.hypot(cx - sph.center.x, cz - sph.center.z) < sph.radius) out.push(m); });
    return out;
  }
  // le facce in su sotto (x, z) fra y0 e y1, dall'alto in basso: [y, mesh]
  function facce(M, x, z, y0, y1) {
    o.set(x, y1, z); rc.set(o, dn); rc.near = 0; rc.far = y1 - y0; const out = [];
    for (const h of rc.intersectObjects(M, false)) { if (!h.face) continue; let mt = h.object.material; if (Array.isArray(mt)) { mt = mt[h.face.materialIndex]; if (!mt || mt.visible === false) continue; }
      nrm.copy(h.face.normal).transformDirection(h.object.matrixWorld); if (nrm.y < (TERR.has(h.object) ? .3 : .7)) continue; out.push([h.point.y, h.object]); }   // il terreno anche ripido (il pendio è suolo), le altre facce quasi in piano
    return out;
  }
  const D8 = [0, 1, 2, 3, 4, 5, 6, 7].map(k => [Math.cos(k * Math.PI / 4) * .45, Math.sin(k * Math.PI / 4) * .45]);
  // il piano visibile che regge un piede: la faccia più alta della finestra con attorno un piano entro ±36 cm
  function piano(M, x, z, g) {
    const F = facce(M, x, z, g - 1.5, g + 1.3); if (!F.length) return null;
    if (Math.abs(F[0][0] - g) <= .05) return { y: F[0][0], m: F[0][1], ok: true };   // il caso comune: il primo piano è il suolo del gioco
    for (const [y, m] of F) {
      if (m.name === 'riva9s') return { y, m };   // gli scogli della riva (riva.js): si cammina sopra i sassi, il piede non chiede il piano
      let ok = true; for (const [a, b] of D8) { const N = facce(M, x + a, z + b, y - .37, y + .37); if (!N.length) { ok = false; break; } }
      if (ok) return { y, m };
    }
    return null;
  }
  return { pv, R, G, W, sc, TS, ISO, libero, escluse, vicine, piano, classe, blk };
}

function misuraBlocco(arg) {
  const [ci, cj, PASSO, SOGLIA, AREA] = arg, S = window.__SS, { R, G, W, TS, ISO } = S, B = ISO.CH * TS, gH = R.groundH;
  let x0 = ci * B, z0 = cj * B, x1 = x0 + B, z1 = z0 + B; if (AREA) { x0 = Math.max(x0, AREA[0]); z0 = Math.max(z0, AREA[1]); x1 = Math.min(x1, AREA[2]); z1 = Math.min(z1, AREA[3]); }
  // la ferrovia (writing.js) è fatta di mesh lunghe che cambiano mentre si gira: il loro indice veloce dei raggi (render.js RAGGI VELOCI)
  // dopo qualche blocco non tornava più e i raggi la attraversavano (in un giro fresco sì). Qui l'indice si rifà a ogni blocco
  const FER = S.sc.getObjectByName('ferrovia'); if (FER) FER.traverse(m => { const g = m.isMesh && m.geometry; if (g) { g.boundsTree = null; g.__bvhNo = false; g.__bvhSeen = null; g.__bvhMiss = 0; } });
  S.blk(); const EX = S.escluse(), M = S.vicine(x0 - 2, z0 - 2, x1 + 2, z1 + 2, EX), out = { n: 0, vuoti: 0, bad: [] };
  for (let z = Math.ceil(z0 / PASSO) * PASSO + PASSO / 2; z < z1; z += PASSO) for (let x = Math.ceil(x0 / PASSO) * PASSO + PASSO / 2; x < x1; x += PASSO) {
    if (!S.libero(x, z)) continue; const g = gH(x, z), p = S.piano(M, x, z, g); if (!p) { out.vuoti++; continue; } out.n++;
    const d = p.y - g; if (Math.abs(d) > SOGLIA) out.bad.push([+x.toFixed(2), +z.toFixed(2), +g.toFixed(3), +p.y.toFixed(3), S.classe(p.m)]);
  }
  return out;
}

function blocchi(arg) {   // i blocchi di 64 m con almeno una casella pedonabile
  const [AREA] = arg, pv = window.__pv, G = pv.G, W = G.MAP.world, TS = W.TS, CH = pv.R.ISO.CH, out = [];
  for (let cj = 0; cj < Math.ceil(W.GH / CH); cj++) for (let ci = 0; ci < Math.ceil(W.GW / CH); ci++) {
    if (AREA && ((ci + 1) * CH * TS < AREA[0] || ci * CH * TS > AREA[2] || (cj + 1) * CH * TS < AREA[1] || cj * CH * TS > AREA[3])) continue;
    let n = 0; for (let ty = cj * CH; ty < Math.min(W.GH, (cj + 1) * CH); ty++) for (let tx = ci * CH; tx < Math.min(W.GW, (ci + 1) * CH); tx++) if (G.walkT(tx, ty)) n++;
    if (n) out.push([ci, cj, n]);
  }
  return out;
}

function zone(bad, W, passo) {   // i punti vicini (entro 1,5 passi), stesso verso, fanno una zona
  const key = (x, z) => Math.round(x / passo) + ',' + Math.round(z / passo), H = new Map(); bad.forEach((b, i) => H.set(key(b[0], b[1]), i));
  const seen = new Uint8Array(bad.length), Z = [];
  for (let i = 0; i < bad.length; i++) { if (seen[i]) continue; const sg = Math.sign(bad[i][3] - bad[i][2]), L = [i], st = [i]; seen[i] = 1;
    while (st.length) { const j = st.pop(), bx = Math.round(bad[j][0] / passo), bz = Math.round(bad[j][1] / passo);
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const k = H.get((bx + a) + ',' + (bz + b)); if (k === undefined || seen[k] || Math.sign(bad[k][3] - bad[k][2]) !== sg) continue; seen[k] = 1; st.push(k); L.push(k); } }
    const P = L.map(k => bad[k]), ds = P.map(q => q[3] - q[2]), cx = P.reduce((s, q) => s + q[0], 0) / P.length, cz = P.reduce((s, q) => s + q[1], 0) / P.length, cau = {};
    P.forEach(q => cau[q[4]] = (cau[q[4]] || 0) + 1);
    const wq = P[ds.map(Math.abs).indexOf(Math.max(...ds.map(Math.abs)))];
    Z.push({ verso: sg > 0 ? 'affonda' : 'galleggia', n: P.length, x: +cx.toFixed(1), y: +cz.toFixed(1), bb: [Math.min(...P.map(q => q[0])), Math.min(...P.map(q => q[1])), Math.max(...P.map(q => q[0])), Math.max(...P.map(q => q[1]))],
      max: +Math.max(...ds.map(Math.abs)).toFixed(3), media: +(ds.reduce((s, v) => s + v, 0) / ds.length).toFixed(3), peggiore: wq.slice(0, 4), causa: Object.entries(cau).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, n]) => k + ' ×' + n) });
  }
  return Z.sort((a, b) => b.n * b.max - a.n * a.max);
}

function nomi(arg) {   // il luogo, l'opera e il pezzo vicini a ogni zona
  const Z = arg, W = window.__pv.G.MAP.world, PL = Object.values(W.PLACES || {}), OP = W.pedonali || [], PZ = W.pezzi || [];
  const dPoly = (P, x, y) => { let c = false, d = 1e9; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; const dx = xi - xj, dy = yi - yj, L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - xj) * dx + (y - yj) * dy) / L2)); d = Math.min(d, Math.hypot(xj + dx * t - x, yj + dy * t - y)); } return c ? 0 : d; };
  return Z.map(z => { let pl = null, pd = 1e9; PL.forEach(p => { const d = Math.hypot(p.x - z.x, p.y - z.y); if (d < pd) { pd = d; pl = p; } });
    let op = null, od = 3; OP.forEach(q => { const d = q.r !== undefined ? Math.max(0, Math.hypot(q.x - z.x, q.y - z.y) - q.r) : dPoly(q.poly, z.x, z.y); if (d < od) { od = d; op = q; } });
    let pz = null, zd = 12; PZ.forEach(p => { const d = Math.hypot(p.x - z.x, p.y - z.y); if (d < zd) { zd = d; pz = p; } });
    return Object.assign(z, { luogo: pl ? pl.name + ' (' + Math.round(pd) + ' m)' : '', opera: op ? op.nome + ' [' + op.tipo + ']' : '', pezzo: pz ? (pz.nome || pz.tipo) + ' [' + pz.tipo + ', ' + Math.round(zd) + ' m]' : '' }); });
}

const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const port = srv.address().port, T0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0)} s]`, ...a);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  let codice = 0;
  try {
    const pg = await b.newPage({ viewport: { width: 640, height: 400 } }), errori = [];
    pg.on('pageerror', e => { errori.push(e.message); log('[errore]', e.message); });
    const q = (QUERY ? QUERY + '&' : '?') + 'tasselli=0&pavrush';
    await pg.goto(`http://localhost:${port}/index.html${q}`, { timeout: 900000, waitUntil: 'commit' });
    await pg.waitForFunction(() => window.__pv && window.__pv.st && window.__pv.R && window.__pv.R.__ed && window.__pv.R.ISO, null, { timeout: 1200000, polling: 500 });
    log('pronto', q); await pg.keyboard.press('Enter'); await pg.waitForTimeout(2500);
    await pg.evaluate(() => { const pv = window.__pv, st = pv.st; st.deadline = 1e12; setInterval(() => { const u = pv.ui; u.flash = 0; u.fade = 0; u.dialog = null; u.book = false; u.menu = false; u.intro = false; st.over = null; st.chase = false; st.player.hp = 100; }, 50); });
    // la ferrovia (writing.js track) si costruisce dopo l'avvio: senza aspettarla i blocchi misurati prima non la vedono (e il confronto fra
    // due giri cambia a caso)
    await pg.waitForFunction(() => !!window.__pv.R.__ed.scene.getObjectByName('ferrovia'), null, { timeout: 240000, polling: 1000 }).then(() => log('ferrovia in scena')).catch(() => log('ferrovia non in scena'));
    await pg.evaluate(`window.__SS = (${pagina.toString()})(); 0`);
    const BL = await pg.evaluate(blocchi, [AREA]); log('blocchi', BL.length);
    const rep = { query: QUERY, passo: PASSO, soglia: SOGLIA, area: AREA, punti: 0, vuoti: 0, bad: [], blocchi: [] };
    for (const [ci, cj] of BL) {
      const B = await pg.evaluate(() => window.__pv.R.ISO.CH * window.__pv.G.TS), cx = (ci + .5) * B, cz = (cj + .5) * B;
      // la camera (e il giocatore) sul blocco: i blocchi del suolo attorno si fanno interi (?pavrush), i pezzi lontani tornano veri
      await pg.evaluate(([x, z]) => { const pv = window.__pv, p = pv.st.player; p.x = x; p.y = z; p.indoor = null; p.vehicle = null; p.lv = null; p.path = []; pv.R.cam.x = x; pv.R.cam.y = z; }, [cx, cz]);
      await pg.waitForFunction(([ci, cj]) => { const I = window.__pv.R.ISO, ch = I.chunks.get(ci + ',' + cj); return !!ch && ch.rev === I.rev; }, [ci, cj], { timeout: 300000, polling: 250 }).catch(() => log('blocco non pronto', ci, cj));
      await pg.waitForTimeout(600);
      const r = await pg.evaluate(misuraBlocco, [ci, cj, PASSO, SOGLIA, AREA]);
      rep.punti += r.n; rep.vuoti += r.vuoti; rep.bad.push(...r.bad); rep.blocchi.push([ci, cj, r.n, r.bad.length]);
      log('blocco', ci, cj, 'punti', r.n, 'errori', r.bad.length);
    }
    rep.zone = await pg.evaluate(nomi, zone(rep.bad, null, PASSO));
    rep.affonda = rep.bad.filter(q => q[3] > q[2]).length; rep.galleggia = rep.bad.length - rep.affonda; rep.errori = errori;
    
    console.log(`\npunti ${rep.punti} (senza piano visibile ${rep.vuoti}) · errori oltre ${SOGLIA * 100} cm: ${rep.bad.length} (affonda ${rep.affonda}, galleggia ${rep.galleggia}) · zone ${rep.zone.length}`);
    const cat = k => /^suolo:/.test(k) ? 'terreno (blocco del suolo)' : /^pezzo:/.test(k) ? 'opere (pezzi_citta)' : /^statico:/.test(k) ? 'arredo fuso (senza ingombro)' : /^casa fusa:/.test(k) ? 'case' : 'altro';
    rep.perCausa = {}; rep.bad.forEach(q => { const c = cat(q[4]), d = q[3] - q[2], o = rep.perCausa[c] || (rep.perCausa[c] = { n: 0, affonda: 0, galleggia: 0, max: 0 }); o.n++; if (d > 0) o.affonda++; else o.galleggia++; o.max = Math.max(o.max, +Math.abs(d).toFixed(3)); });
    console.log('per causa:'); Object.entries(rep.perCausa).sort((a, b) => b[1].n - a[1].n).forEach(([k, o]) => console.log(`  ${k.padEnd(30)} ${String(o.n).padStart(6)}  (affonda ${o.affonda}, galleggia ${o.galleggia}, max ${(o.max * 100).toFixed(0)} cm)`));
    console.log('le zone peggiori (punti × errore massimo):');
    rep.zone.slice(0, 40).forEach(z => console.log(`  ${z.verso.padEnd(9)} ${String(z.n).padStart(4)} punti  max ${(z.max * 100).toFixed(0).padStart(3)} cm  media ${(z.media * 100).toFixed(0).padStart(4)} cm  @ ${z.x},${z.y}  ${z.luogo} · ${z.opera || '-'} · ${z.pezzo || '-'} · ${z.causa.join(', ')}`));
    fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(rep));
    console.log('scritto', OUT);
    if (errori.length) codice = 1;
  } catch (e) { console.log('ERRORE', e); codice = 2; }
  await b.close(); srv.close(); process.exit(codice);
});
