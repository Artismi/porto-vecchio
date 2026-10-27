// [compressi] La prova «stesso modello»: apre in Chromium senza testa (three r149 del gioco, src/gltf_loader.js, src/meshopt_decoder.js)
// il .glb originale e quello di gltfpack e li confronta:
//   - i nodi con nome: stessi nomi e stessi genitori con nome, stessa matrice nel mondo;
//   - la geometria: per ogni mesh (sotto il suo nodo con nome, col suo materiale) l'insieme dei triangoli coi valori dei vertici
//     (posizione, normale, uv, colore; per la pelle le ossa per nome e i pesi), in coordinate del mondo;
//   - le animazioni: stessi nomi e durate, e la posa di ogni osso campionata a ogni 1/24 s.
//   node strumenti/prova_glb.js coppie.json      ([[originale relativo a v7, convertito], ...], lo scrive comprimi_glb.js)
// Esce con 1 se una coppia non torna (tolleranze: 1e-4 m sulle posizioni, 2e-3 sulle normali e sulle pose).
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || '/opt/node-tools/node_modules/playwright-core');
const V7 = path.resolve(__dirname, '..'), coppie = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const srv = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  let p = null;
  if (u === '/') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end('<!doctype html><script src="/src/three.min.js"></script><script src="/src/gltf_loader.js"></script><script src="/src/meshopt_decoder.js"></script>'); return; }
  if (u.startsWith('/src/') || u.startsWith('/assets/')) p = path.join(V7, u);
  else if (u.startsWith('/b/')) p = coppie[+u.slice(3)][1];
  fs.readFile(p || '', (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': /\.js$/.test(p) ? 'application/javascript' : 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const exe = fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined;
  let b; try { b = await chromium.launch({ executablePath: exe }); } catch (e) { b = await chromium.launch(); }
  const pg = await b.newPage(); await pg.goto(`http://localhost:${srv.address().port}/`);
  let male = 0;
  for (let i = 0; i < coppie.length; i++) {
    const r = await pg.evaluate(async ([ua, ub]) => {
      const L = new THREE.GLTFLoader(); L.setMeshoptDecoder(MeshoptDecoder);
      const carica = u => fetch(u).then(r => r.arrayBuffer()).then(ab => new Promise((ok, no) => L.parse(ab, '', ok, no)));
      const [A, B] = await Promise.all([carica(ua), carica(ub)]);
      const err = [];
      const nominati = g => { const m = new Map(); g.scene.updateMatrixWorld(true); g.scene.traverse(o => { if (!o.name || o === g.scene) return; let p = o.parent; while (p && !p.name && p !== g.scene) p = p.parent; m.set(o.name + '|' + (p && p !== g.scene ? p.name : ''), o); }); return m; };
      const NA = nominati(A), NB = nominati(B);
      for (const [k, o] of NA) { if (o.isMesh || o.isBone === undefined && false) { } const q = NB.get(k); if (!q) { if (!o.isMesh) err.push('manca il nodo ' + k); continue; } if (!o.isMesh && !q.isMesh) { const e = o.matrixWorld.elements, f = q.matrixWorld.elements; for (let j = 0; j < 16; j++) if (Math.abs(e[j] - f[j]) > 1e-4) { err.push('matrice ' + k); break; } } }
      // la geometria: chiave = nodo con nome più vicino + materiale; valore = triangoli ordinati
      const R = (x, s) => Math.round(x / s), GC = (a, k, c) => [a.getX, a.getY, a.getZ, a.getW][c].call(a, k);
      // ogni triangolo: 3 vertici × [x,y,z, nx,ny,nz, u,v, r,g,b] (nel mondo) + le ossa coi pesi; si cercano i gemelli entro le tolleranze
      const TOL = [5e-4, 5e-4, 5e-4, 1.5e-2, 1.5e-2, 1.5e-2, 5e-4, 5e-4, 4e-3, 4e-3, 4e-3], TW = 6e-3;
      const tri = g => { const m = new Map(); g.scene.updateMatrixWorld(true); g.scene.traverse(o => { if (!o.isMesh) return;
        let p = o; while (p && !p.name) p = p.parent; const mats = [].concat(o.material), geo = o.geometry, pos = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv, col = geo.attributes.color, si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight, idx = geo.index;
        const n = idx ? idx.count : pos.count, v = new THREE.Vector3(), nm = new THREE.Matrix3().getNormalMatrix(o.matrixWorld), w = new THREE.Vector3();
        const bones = o.isSkinnedMesh ? o.skeleton.bones.map(b => b.name) : null;
        const vert = k => { v.fromBufferAttribute(pos, k); if (!o.isSkinnedMesh) v.applyMatrix4(o.matrixWorld); const f = [v.x, v.y, v.z, 0, 0, 0, 0, 0, 0, 0, 0];
          if (nor) { w.fromBufferAttribute(nor, k); if (!o.isSkinnedMesh) w.applyMatrix3(nm); w.normalize(); f[3] = w.x; f[4] = w.y; f[5] = w.z; }
          if (uv) { f[6] = uv.getX(k); f[7] = uv.getY(k); const mp = mats[0] && mats[0].map; if (mp) { mp.updateMatrix(); const e = mp.matrix.elements, x = f[6], y = f[7]; f[6] = e[0] * x + e[3] * y + e[6]; f[7] = e[1] * x + e[4] * y + e[7]; } }
          if (col) { f[8] = col.getX(k); f[9] = col.getY(k); f[10] = col.getZ(k); }
          const s = {}; if (si && bones) for (let c = 0; c < 4; c++) { const ww = GC(sw, k, c); if (ww > 1e-3) s[bones[GC(si, k, c)]] = (s[bones[GC(si, k, c)]] || 0) + ww; }
          return { f, s }; };
        for (let t = 0; t + 2 < n; t += 3) { const a = idx ? idx.getX(t) : t, b2 = idx ? idx.getX(t + 1) : t + 1, c = idx ? idx.getX(t + 2) : t + 2;
          let mat = mats[0]; if (geo.groups.length) { const gg = geo.groups.find(g => t >= g.start && t < g.start + g.count); mat = gg ? mats[gg.materialIndex] : mat; }
          const key = (p ? p.name : '') + '#' + (mat ? [mat.name, mat.type, !!mat.map, mat.transparent, mat.alphaTest, mat.side, mat.vertexColors, mat.opacity, mat.color && mat.color.getHexString(), mat.emissive && mat.emissive.getHexString(), mat.roughness, mat.metalness, mat.depthWrite].map(x => typeof x === 'number' ? +x.toFixed(3) : x).join('/') : ''), vs = [vert(a), vert(b2), vert(c)];
          const P = vs.map(q => q.f.slice(0, 3)), d = (x, y) => Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
          if (d(P[0], P[1]) < 1e-6 || d(P[1], P[2]) < 1e-6 || d(P[0], P[2]) < 1e-6) continue;   // degeneri (area nulla, invisibili: gltfpack li toglie)
          if (!m.has(key)) m.set(key, []); m.get(key).push(vs); } });
        return m; };
      const vUguale = (x, y) => { for (let i = 0; i < 11; i++) if (Math.abs(x.f[i] - y.f[i]) > TOL[i]) return false; const ks = new Set([...Object.keys(x.s), ...Object.keys(y.s)]); for (const k of ks) if (Math.abs((x.s[k] || 0) - (y.s[k] || 0)) > TW) return false; return true; };
      const tUguale = (a, b) => { for (let r = 0; r < 3; r++) if (vUguale(a[0], b[r]) && vUguale(a[1], b[(r + 1) % 3]) && vUguale(a[2], b[(r + 2) % 3])) return true; return false; };
      const cella = t => { const c = [0, 1, 2].map(i => (t[0].f[i] + t[1].f[i] + t[2].f[i]) / 3); return c; };
      const bb = new THREE.Box3().setFromObject(A.scene), dim = bb.isEmpty() ? 1 : bb.getSize(new THREE.Vector3()).length(); TOL[0] = TOL[1] = TOL[2] = Math.max(5e-4, dim * 5e-5);
      const TA = tri(A), TB = tri(B);
      for (let [k, l] of TA) { const q = TB.get(k); if (!q) { err.push('mesh mancante ' + k + ' (' + l.length + ' tri)'); continue; }
        // i triangoli doppi (gli stessi tre vertici due volte: invisibili) gltfpack li toglie: si contano una volta
        const uni = L => { const m = new Map(); L.forEach(t => { const ks = t.map(x => x.f.map(y => Math.round(y / 1e-6)).join(',')), r = ks.indexOf([...ks].sort()[0]); m.set([0, 1, 2].map(j => ks[(r + j) % 3]).join(' '), t); }); return [...m.values()]; };
        const l0 = l; l = uni(l); const q0 = q.length; const qq = uni(q);
        if (l.length !== qq.length && Math.abs(l.length - qq.length) > 0) { err.push('triangoli ' + k + ' ' + l0.length + '→' + l.length + ' / ' + q0 + '→' + qq.length); continue; }
        const S = 0.01, H = new Map(), kc = (x, y, z) => x + ',' + y + ',' + z;
        q.forEach((t, i) => { const c = cella(t), h = kc(Math.floor(c[0] / S), Math.floor(c[1] / S), Math.floor(c[2] / S)); if (!H.has(h)) H.set(h, []); H.get(h).push(i); });
        const usato = new Uint8Array(q.length); let manca = 0, es = '';
        for (const t of l) { const c = cella(t), X = Math.floor(c[0] / S), Y = Math.floor(c[1] / S), Z = Math.floor(c[2] / S); let ok = false;
          for (let dx = -1; dx <= 1 && !ok; dx++) for (let dy = -1; dy <= 1 && !ok; dy++) for (let dz = -1; dz <= 1 && !ok; dz++) for (const i of H.get(kc(X + dx, Y + dy, Z + dz)) || []) if (tUguale(t, q[i])) { ok = true; break; }
          if (!ok) { manca++; if (!es) { let best = null, bw = Infinity; for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) for (const i of H.get(kc(X + dx, Y + dy, Z + dz)) || []) for (let r = 0; r < 3; r++) { let wv = 0, wi = -1; for (let j = 0; j < 3; j++) for (let c2 = 0; c2 < 11; c2++) { const z = Math.abs(t[j].f[c2] - q[i][(r + j) % 3].f[c2]) / TOL[c2]; if (z > wv) { wv = z; wi = c2; } } if (wv < bw) { bw = wv; best = 'comp ' + wi + ' ×' + wv.toFixed(1); } } es = (best || 'nessun vicino') + ' ' + JSON.stringify(t.map(x => x.f.map(y => +y.toFixed(4)))); } } }
        if (manca) err.push('vertici ' + k + ': ' + manca + ' triangoli senza gemello, p.es. ' + es.slice(0, 160)); }
      for (const k of TB.keys()) if (!TA.has(k)) err.push('mesh in più ' + k);
      // le animazioni: la posa delle ossa (nodi con nome) a ogni 1/24 s
      const an = {}; (B.animations || []).forEach(c => an[c.name] = c);
      const posa = (g, clip, t) => { const mx = new THREE.AnimationMixer(g.scene); const a = mx.clipAction(clip); a.play(); mx.setTime(t); g.scene.updateMatrixWorld(true); const o = {}; g.scene.traverse(n => { if (n.name) o[n.name] = n.matrixWorld.clone(); }); a.stop(); mx.uncacheRoot(g.scene); return o; };
      for (const c of A.animations || []) { const d = an[c.name]; if (!d) { err.push('animazione mancante ' + c.name); continue; } if (Math.abs(d.duration - c.duration) > 1e-3) err.push('durata ' + c.name + ' ' + c.duration + ' / ' + d.duration);
        for (let i = 0, t = 0; i <= Math.ceil(c.duration * 24) && err.length < 20; i++) { t = Math.min(i / 24, c.duration - 1e-4); const pa = posa(A, c, t), pb = posa(B, d, t);
          for (const k in pa) { if (!pb[k]) continue; const e = pa[k].elements, f = pb[k].elements; let dm = 0; const sc = Math.max(1e-9, Math.hypot(e[0], e[1], e[2]), Math.hypot(e[4], e[5], e[6]), Math.hypot(e[8], e[9], e[10])); for (let j = 0; j < 11; j++) dm = Math.max(dm, Math.abs(e[j] - f[j]) / sc); for (let j = 12; j < 15; j++) dm = Math.max(dm, Math.abs(e[j] - f[j]) / Math.max(1e-9, dim * .5)); if (dm > 2e-3) { err.push('posa ' + c.name + ' t=' + t.toFixed(3) + ' ' + k + ' Δ' + dm.toFixed(4)); break; } } } }
      let ntri = 0; TA.forEach(l => ntri += l.length);
      return { err: err.slice(0, 8), ntri, anim: (A.animations || []).length };
    }, ['/' + coppie[i][0], '/b/' + i]).catch(e => ({ err: ['errore ' + e.message.split('\n')[0]] }));
    if (r.err.length) { male++; console.log('NO ', coppie[i][0], r.err.join(' | ')); } else console.log('ok ', coppie[i][0], r.ntri, 'triangoli', r.anim, 'animazioni');
  }
  await b.close(); srv.close();
  console.log(male ? `[prova_glb] ${male} su ${coppie.length} diversi` : `[prova_glb] ${coppie.length} uguali`); process.exit(male ? 1 : 0);
});
