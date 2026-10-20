// [modelli2] Prova dei modelli dei mezzi (src/veicoli3d.js), senza browser:
//   node strumenti/veicoli_check.js [id ...]
// Per ogni modello, livello alto:
//   - grafo connesso: ogni pezzo tocca un altro pezzo entro 2 cm (distanza vera fra vertici, punti degli spigoli e triangoli) o ci entra
//     dentro (scatole, cilindri e sfere piene), e i pezzi formano un solo gruppo;
//   - ruote a terra: il punto più basso di ogni ruota sta a y = 0 (±1 cm) (le barche: la linea di galleggiamento a y = 0);
//   - misure: lunghezza e larghezza (senza specchietti e antenne, segnati userData.sporge) entro il 5% di VK (game.js) per ogni tipo
//     di mezzo che usa quel modello (Veicoli3D.VARIANTI); per i mezzi che non sono in VK, entro il 5% delle misure del modello;
//   - triangoli del livello alto e del basso, materiali.
// Esce con codice 1 se qualcosa non va.
const fs = require('fs'), path = require('path'), vm = require('vm');
const src = path.resolve(__dirname, '../src');
const ctx = { console, Math, Float32Array, Uint16Array, Uint32Array, Int32Array, Uint8Array, Int8Array, Int16Array, Uint8ClampedArray, Float64Array, ArrayBuffer, DataView, Map, Set, WeakMap, Symbol, Object, Array, JSON, Number, String, Boolean, Error, TypeError, RangeError, Promise, Date, parseFloat, parseInt, isFinite, isNaN };
ctx.self = ctx; ctx.globalThis = ctx; ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(src, 'three.min.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(src, 'veicoli3d.js'), 'utf8') + ';this.Veicoli3D = Veicoli3D;', ctx);
const THREE = ctx.THREE, V = ctx.Veicoli3D;
// VK dal sorgente del gioco (solo il blocco dei dati)
const gs = fs.readFileSync(path.join(src, 'game.js'), 'utf8'), a = gs.indexOf('const VK = {'), b = gs.indexOf('\n  };', a);
const VK = vm.runInNewContext('(' + gs.slice(a + 11, b + 4) + ')');
const want = process.argv.slice(2), ids = want.length ? want : V.ids;
let bad = 0;
const T0 = new THREE.Vector3(), T1 = new THREE.Vector3(), T2 = new THREE.Vector3(), P = new THREE.Vector3(), Q = new THREE.Vector3(), tri = new THREE.Triangle();
function pezzi(root) {   // le mesh col loro mondo: vertici e triangoli
  root.updateMatrixWorld(true); const out = [];
  root.traverse(o => {
    if (!o.isMesh || !o.visible) return; let sp = false; for (let p = o; p; p = p.parent) if (p.userData && p.userData.sporge) sp = true;
    const g = o.geometry, pos = g.attributes.position, idx = g.index, v = [];
    for (let i = 0; i < pos.count; i++) v.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld));
    const t = []; const n = idx ? idx.count : pos.count; for (let i = 0; i < n; i += 3) t.push(idx ? [idx.getX(i), idx.getX(i + 1), idx.getX(i + 2)] : [i, i + 1, i + 2]);
    const bb = new THREE.Box3().setFromPoints(v); g.computeBoundingBox();
    const convex = /^(Box|Cylinder|Sphere|Icosahedron)Geometry$/.test(g.type) && !(g.parameters && g.parameters.openEnded) && !(g.parameters && g.parameters.thetaLength < 6.28);
    out.push({ o, v, t, bb, sp, convex, inv: o.matrixWorld.clone().invert(), lbb: g.boundingBox.clone().expandByScalar(.002), name: (o.material && o.material.color ? '#' + o.material.color.getHexString() : '?') + ' ' + g.type });
  });
  return out;
}
// i punti da provare: i vertici e, lungo gli spigoli dei triangoli, tre punti (due pezzi che si compenetrano possono non avere vertici vicini)
function punti(X) { if (X.pp) return X.pp; const out = X.v.slice(); for (const t of X.t) for (let e = 0; e < 3; e++) { const A = X.v[t[e]], B = X.v[t[(e + 1) % 3]]; for (const f of [.25, .5, .75]) out.push(A.clone().lerp(B, f)); } return (X.pp = out); }
function vicini(A, B, eps) {
  if (!A.bb.clone().expandByScalar(eps).intersectsBox(B.bb)) return false;
  const near = (X, Y) => { const bbY = Y.bb.clone().expandByScalar(eps); for (const p of punti(X)) { if (!bbY.containsPoint(p)) continue; if (Y.convex && Y.lbb.containsPoint(Q.copy(p).applyMatrix4(Y.inv))) return true; /* dentro un pezzo pieno: si compenetrano */ for (const t of Y.t) { tri.set(Y.v[t[0]], Y.v[t[1]], Y.v[t[2]]); tri.closestPointToPoint(p, Q); if (Q.distanceToSquared(p) <= eps * eps) return true; } } return false; };
  return near(A, B) || near(B, A);
}
function tris(root) { let n = 0; root.traverse(o => { if (o.isMesh) { const g = o.geometry; n += (g.index ? g.index.count : g.attributes.position.count) / 3; } }); return Math.round(n); }
function mats(root) { const s = new Set(); root.traverse(o => { if (o.isMesh) s.add(o.material); }); return s.size; }
const kindsOf = id => Object.keys(V.VARIANTI).filter(k => V.VARIANTI[k].includes(id));
console.log('modello        L×W×H (m)            VK                         tri alto/basso  mat  pezzi  esito');
for (const id of ids) {
  const R = V.costruisci(id, '#b5221c', { targa: 1 }), g = R.alto, ps = pezzi(g), err = [];
  // grafo connesso
  const par = ps.map((_, i) => i), f = i => par[i] === i ? i : (par[i] = f(par[i]));
  for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) if (f(i) !== f(j) && vicini(ps[i], ps[j], .02)) par[f(i)] = f(j);
  const grp = {}; ps.forEach((p, i) => (grp[f(i)] = grp[f(i)] || []).push(p));
  const gl = Object.values(grp).sort((x, y) => y.length - x.length);
  if (gl.length > 1) gl.slice(1).forEach(gg => err.push('staccato: ' + gg.map(p => p.name + ' @' + p.bb.getCenter(P).toArray().map(x => x.toFixed(2)).join(',')).slice(0, 3).join(' | ') + (gg.length > 3 ? ` (+${gg.length - 3})` : '')));
  // ruote
  (R.ud.wheels || []).forEach((w, i) => { const bb = new THREE.Box3().setFromObject(w.wh); if (Math.abs(bb.min.y) > .01) err.push(`ruota ${i} a y=${bb.min.y.toFixed(3)}`); });
  if (!(R.ud.wheels || []).length && !R.ud.barca) err.push('senza ruote');
  // misure
  const bb = new THREE.Box3(); ps.filter(p => !p.sp).forEach(p => bb.union(p.bb)); const sz = bb.getSize(P.clone());
  if (bb.min.y < -.012 && !R.ud.barca) err.push(`sotto terra: y=${bb.min.y.toFixed(3)}`);
  const ks = kindsOf(id).concat(VK[id] && !kindsOf(id).includes(id) ? [id] : []), vk = [];
  ks.forEach(k => { const K = VK[k]; if (!K) return; const dl = sz.z / K.len - 1, dw = sz.x / K.wid - 1; vk.push(`${k} ${K.len}×${K.wid}`); if (Math.abs(dl) > .05) err.push(`lunghezza ${sz.z.toFixed(2)} contro VK.${k}.len ${K.len} (${(dl * 100).toFixed(1)}%)`); if (Math.abs(dw) > .05) err.push(`larghezza ${sz.x.toFixed(2)} contro VK.${k}.wid ${K.wid} (${(dw * 100).toFixed(1)}%)`); });
  if (!vk.length) { const Mo = V.MODELLI[id]; if (Mo) { if (Math.abs(sz.z / Mo.L - 1) > .05) err.push(`lunghezza ${sz.z.toFixed(2)} contro ${Mo.L}`); if (Math.abs(sz.x / Mo.W - 1) > .05) err.push(`larghezza ${sz.x.toFixed(2)} contro ${Mo.W}`); } }
  const ta = tris(g), tb = R.basso ? tris(R.basso) : 0;
  console.log(`${id.padEnd(14)} ${sz.z.toFixed(2)}×${sz.x.toFixed(2)}×${sz.y.toFixed(2)}`.padEnd(37) + (vk.join(', ') || '(fuori VK)').padEnd(27) + `${ta}/${tb}`.padEnd(16) + `${mats(g)}`.padEnd(5) + `${ps.length}`.padEnd(7) + (err.length ? 'NO' : 'ok'));
  err.forEach(e => console.log('    - ' + e)); if (err.length) bad++;
}
console.log(bad ? `\n${bad} modelli da sistemare` : '\ntutti a posto');
process.exit(bad ? 1 : 0);
