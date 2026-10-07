# [bombolette1] I graffiti col pennello dello Studio (editor.js, ramo charming-gates: «Colore»), con la misura bloccata
# da bomboletta. Si dipinge davvero sulla texture della facciata (le texture che il codice disegna su canvas):
# - abitanti: ogni muro di st.pop.walls con «strokes» (graffiti.js: tratti in metri, u lungo il muro, v in altezza) si
#   spruzza lungo i tratti; se chi dipinge è vicino al giocatore si vede crescere (live: c0, dur), se no compare intero.
#   Se la texture viene ridisegnata (il quartiere si ricostruisce) si ridipinge; quando il regime cancella (erased) la
#   facciata torna com'era (gomma: la copia della texture prima del primo spruzzo).
# - giocatore: R.spray(nx, ny, colore) dipinge col puntatore sulla superficie davanti (entro 2,6 m), come lo Studio.
# Texture propria (canvas di un solo oggetto, non ripetuto): si dipinge dentro. Condivisa o a piastrelle: velo di vernice.
# Sostituisce i riquadri di muri_gente2 per i muri che hanno i tratti. Dopo trame1.py. Guardia [bombolette1].
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[bombolette1]' in s: print('già applicato'); sys.exit()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:90], s.count(old)); s = s.replace(old, new)
rep("""    muriGente(st);   /* [muri_gente2] */""", """    muriGente(st);   /* [muri_gente2] */
    bmbPass(st);   /* [bombolette1] */""")
rep("""    L.forEach((w, i) => { if (w.wx == null) return;""", """    L.forEach((w, i) => { if (w.wx == null || w.strokes) return;   /* [bombolette1] chi ha i tratti si dipinge col pennello */""")
rep("""  // [muri_gente2] i muri dipinti dalla gente""", """  // [bombolette1] IL PENNELLO DELLO STUDIO A MISURA DI BOMBOLETTA
  // Dove la superficie ha una texture tutta sua (un canvas usato da un solo oggetto, non ripetuto) si dipinge lì dentro,
  // come lo Studio. Dove la texture è condivisa o a piastrelle (dipingerla sporcherebbe ogni palazzo che la usa) il
  // pennello dipinge su un velo di vernice aderente alla superficie: stesso spruzzo, solo su quel pezzo di muro.
  const BMB = { rc: new THREE.Raycaster(), cands: null, candT: 0, cx: 1e9, cz: 1e9, use: new Map(), veli: [], tmp: document.createElement('canvas'), dirty: new Set(), chk: 0, sph: new THREE.Sphere(), va: new THREE.Vector3(), vb: new THREE.Vector3() };
  const bmbCanvas = t => { const im = t && t.image; return im && im.getContext ? im : null; };
  function bmbCands(cx, cz) {
    const now = performance.now(); if (BMB.cands && now - BMB.candT < 2000 && Math.hypot(BMB.cx - cx, BMB.cz - cz) < 15) return BMB.cands;
    BMB.candT = now; BMB.cx = cx; BMB.cz = cz; const out = []; BMB.use.clear();
    scene.traverseVisible(o => { if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || !o.geometry || !o.geometry.attributes.position || o.userData.velo) return;
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      ms.forEach(m => { const c = m && bmbCanvas(m.map); if (c) BMB.use.set(c, (BMB.use.get(c) || 0) + 1); });   // quanti oggetti usano lo stesso canvas
      if (ms.every(m => !m || m.visible === false || (m.transparent && m.opacity < .3))) return;
      if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); BMB.sph.copy(o.geometry.boundingSphere).applyMatrix4(o.matrixWorld);
      if (Math.hypot(BMB.sph.center.x - cx, BMB.sph.center.z - cz) > BMB.sph.radius + 10) return; out.push(o); });
    return (BMB.cands = out);
  }
  const bmbAlive = L => { let o = L.mesh; while (o.parent) o = o.parent; return o === scene; };
  function bmbDrop(L) { if (L.mesh.parent) L.mesh.parent.remove(L.mesh); L.mesh.geometry.dispose(); L.tex.dispose(); L.mesh.material.dispose(); const i = BMB.veli.indexOf(L); if (i >= 0) BMB.veli.splice(i, 1); }
  // il velo di vernice sulla faccia colpita: quello che c'è già lì, o uno nuovo (ctr: il riquadro del muro di chi dipinge)
  function bmbVelo(h, ctr, noNew) {
    const n = h.face.normal.clone().transformDirection(h.object.matrixWorld); if (n.dot(BMB.rc.ray.direction) > 0) n.negate();
    const p = h.point, at = L => { const q = L.mesh.worldToLocal(BMB.va.copy(p)); return Math.abs(q.z) < .06 && Math.abs(q.x) < L.W / 2 && Math.abs(q.y) < L.H / 2 ? { c: L.c, t: L.tex, x: (q.x / L.W + .5) * L.c.width, y: (.5 - q.y / L.H) * L.c.height, dens: L.dens, point: p } : null; };
    for (let i = BMB.veli.length - 1; i >= 0; i--) { const L = BMB.veli[i]; if (!bmbAlive(L)) { bmbDrop(L); continue; } if (L.n.dot(n) < .96) continue; const S = at(L); if (S) return S; }
    if (noNew) return null;
    const W = ctr ? ctr.W : 1.6, H = ctr ? ctr.H : 1.6, dens = 56, c = document.createElement('canvas'); c.width = Math.ceil(W * dens); c.height = Math.ceil(H * dens);
    const tex = canvasTex(c); tex.encoding = THREE.sRGBEncoding;
    const mat = new THREE.MeshLambertMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(W, H), mat); mesh.userData.velo = true; mesh.renderOrder = 2;
    const o = ctr ? ctr.o.clone().addScaledVector(n, -new THREE.Vector3().subVectors(ctr.o, p).dot(n)) : p.clone();   // il centro del muro, portato sul piano colpito
    if (Math.abs(n.y) > .9) mesh.up.set(0, 0, 1);
    mesh.position.copy(o).addScaledVector(n, .012); mesh.lookAt(BMB.vb.copy(mesh.position).add(n)); scene.add(mesh); mesh.updateMatrixWorld(true);
    const s = h.object.getWorldScale(new THREE.Vector3()); if (Math.abs(s.x - s.y) < .01 && Math.abs(s.y - s.z) < .01) h.object.attach(mesh);   // segue l'oggetto (una macchina che riparte)
    const L = { mesh, c, tex, n, W, H, dens }; c.__velo = L; BMB.veli.push(L); if (BMB.veli.length > 90) bmbDrop(BMB.veli[0]);
    return at(L);
  }
  // la superficie colpita da un raggio: canvas, pixel, densità (pixel per metro), come surfaceAt dello Studio
  function bmbHit(ox, oy, oz, dx, dy, dz, far, ctr, noNew) {
    BMB.rc.set(BMB.va.set(ox, oy, oz), BMB.vb.set(dx, dy, dz).normalize()); BMB.rc.far = far || 1.6; BMB.rc.near = 0;
    for (const h of BMB.rc.intersectObjects(bmbCands(ox, oz), false)) {
      if (!h.face) continue; let m = h.object.material; if (Array.isArray(m)) m = m[h.face.materialIndex]; if (!m || m.visible === false) continue;
      if (m.transparent && m.opacity < .3) continue;   // edifici resi trasparenti davanti alla camera
      const t = m.map, c = bmbCanvas(t), uv0 = h.uv;
      const own = c && uv0 && (BMB.use.get(c) || 0) <= 1 && t.repeat.x <= 1.01 && t.repeat.y <= 1.01 && uv0.x > -.001 && uv0.x < 1.001 && uv0.y > -.001 && uv0.y < 1.001;
      if (!own) return bmbVelo(h, ctr, noNew);
      const W = c.width, H = c.height; if (t.matrixAutoUpdate) t.updateMatrix(); const uv = uv0.clone(); t.transformUv(uv);
      const g = h.object.geometry, U = g.attributes.uv, P = g.attributes.position, ids = [h.face.a, h.face.b, h.face.c];
      const uvs = ids.map(i => new THREE.Vector2(U.getX(i), U.getY(i)).applyMatrix3(t.matrix)), ps = ids.map(i => new THREE.Vector3().fromBufferAttribute(P, i).applyMatrix4(h.object.matrixWorld));
      const ua = Math.abs((uvs[1].x - uvs[0].x) * (uvs[2].y - uvs[0].y) - (uvs[2].x - uvs[0].x) * (uvs[1].y - uvs[0].y)) * W * H / 2, wa = new THREE.Vector3().subVectors(ps[1], ps[0]).cross(new THREE.Vector3().subVectors(ps[2], ps[0])).length() / 2;
      return { c, t, x: uv.x * W, y: uv.y * H, dens: wa > 1e-6 && ua > 1e-6 ? Math.sqrt(ua / wa) : 16, point: h.point };
    }
    return null;
  }
  // uno spruzzo: il «dab» dello Studio (pennello) o la gomma (dalla copia di prima)
  function bmbDab(S, col, size, hard, opac, gomma) {
    const c = S.c; if (!c.__pvOrig) { const k = document.createElement('canvas'); k.width = c.width; k.height = c.height; k.getContext('2d').drawImage(c, 0, 0); c.__pvOrig = k; }
    const r = Math.max(.75, Math.min(60, size * S.dens)), d = Math.ceil(r * 2) + 2, T = BMB.tmp, x = T.getContext('2d');
    if (T.width < d || T.height < d) { T.width = Math.max(T.width, d); T.height = Math.max(T.height, d); }
    x.clearRect(0, 0, T.width, T.height); x.globalCompositeOperation = 'source-over';
    if (gomma) x.drawImage(c.__pvOrig, S.x - d / 2, S.y - d / 2, d, d, 0, 0, d, d); else { x.fillStyle = col; x.fillRect(0, 0, d, d); }
    x.globalCompositeOperation = 'destination-in'; const gr = x.createRadialGradient(d / 2, d / 2, r * Math.min(.98, hard), d / 2, d / 2, r);
    gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, d, d); x.globalCompositeOperation = 'source-over';
    const cx = c.getContext('2d'); cx.save(); cx.globalAlpha = gomma ? 1 : opac; cx.drawImage(T, 0, 0, d, d, S.x - d / 2, S.y - d / 2, d, d); cx.restore();
    BMB.dirty.add(S.t);
  }
  const BMB_SIZE = [.025, .09];   // la misura bloccata: da tratto sottile a spruzzo largo di bomboletta
  // un punto del muro (u lungo il muro, v in altezza) → spruzzo; ritorna il canvas colpito
  function bmbWallDab(w, u, v, col, size, gomma) {
    const f = w.wface, cf = Math.cos(f), sf = Math.sin(f), gx = w.wx - sf * u, gz = w.wy + cf * u, base = groundH(w.wx - cf * .6, w.wy - sf * .6);
    const ctr = w.__ctr || (w.__ctr = { W: 3.4, H: 2.7, o: new THREE.Vector3(w.wx, base + 1.45, w.wy) });
    const S = bmbHit(gx - cf * .6, base + v, gz - sf * .6, cf, 0, sf, 1.6, ctr, gomma); if (!S) return null;
    bmbDab(S, col, Math.max(BMB_SIZE[0], Math.min(BMB_SIZE[1], size)), .45, .92, gomma);
    if (!gomma) {   // per chi dipinge (graffiti.js, anim_vita.js): dov'è davvero il muro, dove sta andando la vernice
      const dW = (S.point.x - w.wx) * cf + (S.point.z - w.wy) * sf; w.__wallD = w.__wallD == null ? dW : w.__wallD * .9 + dW * .1;
      w.__tip = { x: S.point.x, y: S.point.y, z: S.point.z, t: performance.now() }; w.__tipU = u;
    }
    return S.c;
  }
  // i tratti di un muro fino a una certa lunghezza (per vederli crescere)
  function bmbStrokes(w, upTo, gomma) {
    let L = 0;
    for (const tr of w.strokes) { const P = tr.pts; for (let i = 0; i < P.length; i++) {
      const a = P[Math.max(0, i - 1)], b = P[i], seg = i ? Math.hypot(b[0] - a[0], b[1] - a[1]) : 0, step = Math.max(.012, (tr.w || .05) * .35), n = Math.max(1, Math.ceil(seg / step));
      for (let k = i ? 1 : 0; k <= n; k++) { const q = i ? k / n : 0, u = a[0] + (b[0] - a[0]) * q, v = a[1] + (b[1] - a[1]) * q; L += i ? seg / n : 0; if (L < (w.__done || 0) - 1e-6 && !gomma) continue; if (L > upTo) return L;
        const c = bmbWallDab(w, u, v, tr.c, tr.w || .05, gomma); if (c && !gomma) (w.__canv = w.__canv || new Set()).add(c); }
    } }
    return 1e9;
  }
  const bmbLen = w => w.__len || (w.__len = w.strokes.reduce((s, tr) => s + tr.pts.reduce((t, p, i) => t + (i ? Math.hypot(p[0] - tr.pts[i - 1][0], p[1] - tr.pts[i - 1][1]) : 0), 0), 0));
  function bmbPass(st) {
    const L = (st.pop && st.pop.walls) || []; if (!L.length && !BMB.dirty.size) return;
    const cx = camera.position.x, cz = camera.position.z, slow = performance.now() > BMB.chk; if (slow) BMB.chk = performance.now() + 1200;
    for (const w of L) {
      if (!w.strokes || w.wx == null || Math.hypot(w.wx - cx, w.wy - cz) > 90) continue;
      if (w.erased) {   // il regime cancella: via il velo, e la facciata propria torna com'era
        if (w.__canv && !w.__erased) { w.__erased = true; let own = false; [...w.__canv].forEach(c => { if (c.__velo) bmbDrop(c.__velo); else own = true; }); if (own) { w.__done = 0; bmbStrokes(w, 1e9, true); } }
        continue;
      }
      // il quartiere ricostruito (velo sparito o texture ridisegnata): si ridipinge da capo
      if (slow && w.__painted && w.__canv) {
        let lost = [...w.__canv].some(c => c.__velo && !bmbAlive(c.__velo));
        const own = [...w.__canv].find(c => !c.__velo), p0 = own && w.strokes[0] && w.strokes[0].pts[0];
        if (!lost && p0) { const f = w.wface, gx = w.wx - Math.sin(f) * p0[0], gz = w.wy + Math.cos(f) * p0[0], S = bmbHit(gx - Math.cos(f) * .6, groundH(w.wx - Math.cos(f) * .6, w.wy - Math.sin(f) * .6) + p0[1], gz - Math.sin(f) * .6, Math.cos(f), 0, Math.sin(f), 1.6, w.__ctr, true); if (S && !w.__canv.has(S.c)) lost = true; }
        if (lost) { w.__canv.forEach(c => { if (c.__velo) bmbDrop(c.__velo); }); w.__done = 0; w.__painted = false; w.__canv = null; }
      }
      if (w.__painted) continue;
      if (w.live && w.live.near && !w.live.done && w.live.c0 == null) continue;   // sta ancora andando al muro
      const tot = bmbLen(w), live = w.live && w.live.near && !w.live.done, up = live ? tot * Math.min(1, (st.clock - w.live.c0) / Math.max(1, w.live.dur)) : w.partial ? tot * w.partial : 1e9;   // lasciato a metà: solo la parte fatta
      if (!live && !slow && w.__done === undefined) continue;   // i muri finiti si dipingono al giro lento (non tutti nello stesso fotogramma)
      const r = bmbStrokes(w, up, false); if (!w.__canv) continue;   // le facciate qui non sono ancora costruite: si riprova, senza perdere i tratti
      w.__done = Math.min(up, tot);
      if (r >= 1e9 || w.__done >= tot - 1e-6 || (!live && w.partial)) w.__painted = true;
    }
    BMB.dirty.forEach(t => { t.needsUpdate = true; }); BMB.dirty.clear();
  }
  // il giocatore: spruzza col puntatore sulla superficie a portata di braccio. Più lontano (entro 9 m) ritorna dove
  // mettersi per arrivarci ({ go: x, y }): main.js ci fa camminare il giocatore, poi spruzza
  const BMB_REACH = 1.2;
  function sprayAt(st, nx, ny, col) {
    const rc = BMB.rc, p = st.player; rc.setFromCamera(new THREE.Vector2(nx * 2 - 1, 1 - ny * 2), camera); rc.near = 0; rc.far = 1e4;
    // la prima superficie a portata di braccio (i tetti e i muri fra la camera e il giocatore il gioco li toglie di mezzo)
    const h = rc.intersectObjects(bmbCands(p.x, p.y), false).find(h => { if (Math.hypot(h.point.x - p.x, h.point.z - p.y) > 9 || h.point.y > groundH(h.point.x, h.point.z) + 2.4) return false; let m = h.object.material; if (Array.isArray(m)) m = m[h.face && h.face.materialIndex]; return m && m.visible !== false && !(m.transparent && m.opacity < .3); });
    if (!h) return false;
    const o = h.point, nW = h.face.normal.clone().transformDirection(h.object.matrixWorld); if (nW.dot(rc.ray.direction) > 0) nW.negate();
    const nh = Math.hypot(nW.x, nW.z), off = nh > .3 ? .5 : 0;   // davanti al muro, a mezzo metro; per terra, ci si va sopra
    if (Math.hypot(o.x - p.x, o.z - p.y) > BMB_REACH) return { go: { x: o.x + (off ? nW.x / nh * off : 0), y: o.z + (off ? nW.z / nh * off : 0) }, at: { x: o.x, y: o.z } };
    const d = rc.ray.direction.clone(), S = bmbHit(o.x - d.x * .3, o.y - d.y * .3, o.z - d.z * .3, d.x, d.y, d.z, .6); if (!S) return false;
    bmbDab(S, col, .045, .45, .9, false); BMB.dirty.forEach(t => { t.needsUpdate = true; }); BMB.dirty.clear();
    p.__tip = { x: o.x, y: o.y, z: o.z, t: performance.now() }; p.face = Math.atan2(o.z - p.y, o.x - p.x); return true;
  }
  // [muri_gente2] i muri dipinti dalla gente""")
# esporta lo spruzzo del giocatore (e i pezzi, per le prove)
rep("  return { dirtyAt, updateChunks, ISO, __mondo,", "  return { spray: (st, nx, ny, col) => sprayAt(st, nx, ny, col), __bmb: { BMB, bmbHit, bmbCands, bmbWallDab }, dirtyAt, updateChunks, ISO, __mondo,")
open(p, 'w', encoding='utf-8').write(s); print('ok')
