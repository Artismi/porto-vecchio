// [modelli1] Controllo dei modelli di strada (src/arredo3d.js), senza browser:
//   cd v7 && node strumenti/modelli_check.js [tipo ...] [--dett]
// Per ogni tipo, ai due livelli di dettaglio (liv 1 pieno, liv 0 lontano):
//   1. GRAFO CONNESSO: due pezzi sono collegati se si toccano entro 2 cm (un vertice a meno di 2 cm da una faccia dell'altro,
//      uno spigolo che attraversa una faccia dell'altro, o un vertice dentro il volume dell'altro). Tutti i pezzi devono
//      stare in un solo gruppo: niente parti sospese o staccate.
//   2. BASE: il modello poggia a y = 0 (il punto più basso fra -1 e +1 cm e almeno un pezzo che tocca terra); gli oggetti a muro
//      (userData.aMuro) invece toccano il muro, a z = 0.
//   3. TRIANGOLI: il conto al livello pieno e al livello lontano, contro il tetto del tipo (TETTO qui sotto).
// Esce con 1 se qualcosa non passa. --dett stampa i pezzi staccati.
const path = require('path'), src = path.join(__dirname, '..', 'src');
global.THREE = require(path.join(src, 'three.min.js'));
const A = require(path.join(src, 'arredo3d.js'));
const args = process.argv.slice(2), DETT = args.includes('--dett'), SOLO = args.filter(a => !a.startsWith('--'));
const TOL = .02;
// tetto dei triangoli al livello pieno: poche centinaia (800) per ogni oggetto, di più solo per le cose grandi e composte
const GRANDI = { edicola: 1100, cabina_enel: 1600, carretto: 1400, lampione_corso: 1300, bancarella: 1300, semaforo: 1200, fermata: 1200, paletti_catena: 1200, reti: 1000, cassonetto: 1000, impalcatura: 1000, cabina_sip: 900, cassone: 900,
  container: 1900, gru: 1800, muletto: 1450, invasatura: 1500, pila_gomme: 1200 };   // [roba3d] le cose grandi del porto e del magazzino
const TETTO = t => GRANDI[t] || 800;

const V = THREE.Vector3, tri = new THREE.Triangle(), _p = new V(), _q = new V(), ray = new THREE.Ray(), _hit = new V();
// i pezzi di un modello in coordinate del modello: posizioni non indicizzate, triangoli, ingombro
function pezzi(g) {
  g.updateMatrixWorld(true); const out = [];
  g.traverse(o => { if (!o.isMesh || !o.geometry) return; let ge = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); ge.applyMatrix4(o.matrixWorld);
    const P = ge.attributes.position.array, n = P.length / 9, bb = new THREE.Box3().setFromBufferAttribute(ge.attributes.position);
    const t = ge.type || o.geometry.type, chiuso = !/Plane|Circle/.test(o.geometry.type) && !(o.geometry.parameters && o.geometry.parameters.openEnded) && !/Tube/.test(o.geometry.type);
    out.push({ o, P, n, bb, chiuso, nome: (o.name || o.geometry.type.replace('Geometry', '')) + ' ' + [bb.min.x, bb.min.y, bb.min.z].map(v => v.toFixed(2)).join(',') }); ge.dispose(); });
  return out;
}
const setTri = (P, k) => { tri.a.set(P[k * 9], P[k * 9 + 1], P[k * 9 + 2]); tri.b.set(P[k * 9 + 3], P[k * 9 + 4], P[k * 9 + 5]); tri.c.set(P[k * 9 + 6], P[k * 9 + 7], P[k * 9 + 8]); };
// i punti di prova di un pezzo: i vertici e, sugli spigoli lunghi, un punto ogni 5 cm (un'asta lunga appoggiata a una lastra
// tocca a metà, lontano dai suoi vertici)
function campioni(a) {
  if (a.S) return a.S; const S = Array.from(a.P), A = new V(), B = new V();
  for (let k = 0; k < a.n; k++) for (let e = 0; e < 3; e++) { const i = k * 9 + e * 3, j = k * 9 + ((e + 1) % 3) * 3; A.set(a.P[i], a.P[i + 1], a.P[i + 2]); B.set(a.P[j], a.P[j + 1], a.P[j + 2]);
    const L = A.distanceTo(B), m = Math.floor(L / .05); for (let q = 1; q < m; q++) { const t = q / m; S.push(A.x + (B.x - A.x) * t, A.y + (B.y - A.y) * t, A.z + (B.z - A.z) * t); } }
  return (a.S = S);
}
// punti di a vicini alle facce di b
function vicino(a, b) {
  const bb = b.bb.clone().expandByScalar(TOL), S = campioni(a);
  for (let i = 0; i < S.length; i += 3) { _p.set(S[i], S[i + 1], S[i + 2]); if (!bb.containsPoint(_p)) continue;
    for (let k = 0; k < b.n; k++) { setTri(b.P, k); tri.closestPointToPoint(_p, _q); if (_q.distanceToSquared(_p) <= TOL * TOL) return true; } }
  return false;
}
// spigoli di a che attraversano le facce di b
function attraversa(a, b) {
  const bb = b.bb.clone().expandByScalar(TOL);
  for (let k = 0; k < a.n; k++) for (let e = 0; e < 3; e++) { const i = k * 9 + e * 3, j = k * 9 + ((e + 1) % 3) * 3; _p.set(a.P[i], a.P[i + 1], a.P[i + 2]); _q.set(a.P[j], a.P[j + 1], a.P[j + 2]);
    const L = _p.distanceTo(_q); if (L < 1e-6) continue; const sb = new THREE.Box3().setFromPoints([_p, _q]); if (!sb.intersectsBox(bb)) continue;
    ray.set(_p, _q.clone().sub(_p).divideScalar(L));
    for (let t = 0; t < b.n; t++) { setTri(b.P, t); const h = ray.intersectTriangle(tri.a, tri.b, tri.c, false, _hit); if (h && h.distanceTo(_p) <= L) return true; } }
  return false;
}
// un vertice di a dentro il volume chiuso di b (due raggi, tutti e due con un numero dispari di intersezioni)
function dentro(a, b) {
  if (!b.chiuso) return false; const dirs = [new V(1, .0123, .0071).normalize(), new V(.0091, .0137, 1).normalize()];
  for (let i = 0; i < a.P.length; i += 3) { _p.set(a.P[i], a.P[i + 1], a.P[i + 2]); if (!b.bb.containsPoint(_p)) continue;
    let ok = true; for (const d of dirs) { ray.set(_p, d); let c = 0; for (let t = 0; t < b.n; t++) { setTri(b.P, t); if (ray.intersectTriangle(tri.a, tri.b, tri.c, false, _hit)) c++; } if (c % 2 === 0) { ok = false; break; } }
    if (ok) return true; }
  return false;
}
function tocca(a, b) {
  if (!a.bb.clone().expandByScalar(TOL).intersectsBox(b.bb)) return false;
  return vicino(a, b) || vicino(b, a) || attraversa(a, b) || attraversa(b, a) || dentro(a, b) || dentro(b, a);
}
function controlla(tipo, liv) {
  const g = A.make(tipo, { liv }), ps = pezzi(g), n = ps.length, par = ps.map((_, i) => i), f = i => par[i] === i ? i : (par[i] = f(par[i]));
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { if (f(i) === f(j)) continue; if (tocca(ps[i], ps[j])) par[f(i)] = f(j); }
  const comp = new Map(); ps.forEach((p, i) => { const r = f(i); if (!comp.has(r)) comp.set(r, []); comp.get(r).push(p); });
  const gruppi = [...comp.values()].sort((a, b) => b.length - a.length), tris = ps.reduce((s, p) => s + p.n, 0);
  const bb = new THREE.Box3(); ps.forEach(p => bb.union(p.bb)); const aMuro = !!g.userData.aMuro;
  let base;
  if (g.userData.aPalo) base = true;   // si stringe a un palo che c'è già: basta che stia insieme
  else if (aMuro) base = Math.abs(bb.min.z) <= .011 && ps.some(p => Math.abs(p.bb.min.z) <= .011);
  else base = Math.abs(bb.min.y) <= .011 && ps.some(p => Math.abs(p.bb.min.y) <= .011);
  return { tipo, liv, n, gruppi, tris, bb, base, aMuro, mat: new Set(ps.map(p => p.o.material)).size };
}
const tipi = SOLO.length ? SOLO : A.TIPI; let ko = 0; const t0 = Date.now(), righe = [];
for (const t of tipi) {
  const r1 = controlla(t, 1), r0 = controlla(t, 0), cap = TETTO(t);
  const okC = r1.gruppi.length === 1 && r0.gruppi.length === 1, okB = r1.base && r0.base, okT = r1.tris <= cap && r0.tris <= r1.tris, ok = okC && okB && okT;
  if (!ok) ko++;
  const s = r1.bb.getSize(new V());
  righe.push(`${ok ? 'ok ' : 'NO '} ${t.padEnd(16)} ${String(r1.n).padStart(3)} pezzi  ${String(r1.tris).padStart(5)}/${cap} tri (lontano ${String(r0.tris).padStart(5)})  ${r1.mat} mat  ${s.x.toFixed(2)}×${s.y.toFixed(2)}×${s.z.toFixed(2)} m` +
    (okC ? '' : `  STACCATI ${r1.gruppi.length - 1}+${r0.gruppi.length - 1}`) + (okB ? '' : `  BASE ${r1.aMuro ? 'z' : 'y'}=${(r1.aMuro ? r1.bb.min.z : r1.bb.min.y).toFixed(3)}`) + (okT ? '' : '  TROPPI TRIANGOLI'));
  if (!okC && DETT) [r1, r0].forEach(r => r.gruppi.slice(1).forEach(gr => righe.push(`      liv ${r.liv} staccati: ${gr.map(p => p.nome).join(' | ')}`)));
}
console.log(righe.join('\n'));
console.log(`${tipi.length - ko}/${tipi.length} modelli passano (${Date.now() - t0} ms)`);
process.exit(ko ? 1 : 0);
