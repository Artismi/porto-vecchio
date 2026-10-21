// [visuale3] prova delle regole della visuale sul personaggio e dell'inquadratura (visuale.js), sulla città nuova in pianta (case come
// scatole: la pianta delle caselle, alte quanto i loro piani; il suolo piano, la camera del gioco a piedi):
//   1. il modo di difetto è il taglio; ?visuale=ellisse e ?visuale=sezione restano;
//   2. in dieci punti dei vicoli del borgo, col taglio, i raggi dai piedi, dal busto, dalla testa e dall'anello di suolo attorno verso la
//      camera non incontrano nessuna casa (le case tagliate contano fino alla quota del piano);
//   3. sul tetto non si taglia niente;
//   4. camminando due secondi lungo un muro (60 fotogrammi al secondo, e a 20) il taglio non si accende e spegne più di una volta;
//   5. la composizione: nei vicoli il quadro non si sposta, sulla Vittoria e nelle piazze sì, mai più di COMPOSIZIONE.max metri.
// node src/test_visuale3.js   (dalla cartella v7)
const path = require('path'), src = __dirname;
global.World = require(path.join(src, 'world_cittanuova.js'));
const V = require(path.join(src, 'visuale.js')), W = World, TS = W.TS || 2, GW = W.GW, GH = W.GH, K = V.TAGLIO;
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };
// 1. i modi
ok(V.modo('') === 'taglio' && V.modo('?cittanuova') === 'taglio', 'il modo di difetto è il taglio');
ok(V.modo('?cittanuova&visuale=ellisse') === 'ellisse' && V.modo('?visuale=sezione&x=1') === 'sezione' && V.modo('?visuale=boh') === 'taglio', '?visuale= sceglie fra ellisse, sezione e taglio');
// le case come scatole (FH 3,2 m a piano, il parapetto e la roba sul tetto 2,5 m sopra)
const CASE = W.BUILDINGS.map(b => ({ b, box3: { min: { x: b.x * TS + .3, y: 0, z: b.y * TS + .3 }, max: { x: (b.x + b.w) * TS - .3, y: (b.fl || 2) * 3.2 + 2.5, z: (b.y + b.h) * TS - .3 } } }));
const tile = (tx, ty) => tx < 0 || ty < 0 || tx >= GW || ty >= GH ? -1 : W.grid[ty * GW + tx];
const pieno = (x, z) => tile(Math.floor(x / TS), Math.floor(z / TS)) === W.T.BLD;
// la camera a piedi del gioco (render.js): yaw π/4, pitch 0,78, alla distanza dello zoom 0,4
const YAW = Math.PI / 4, PITCH = .78, DIST = (44 * .4 / 2) / Math.tan(15 * Math.PI / 180);
const camAt = (x, z, y) => ({ x: x + Math.sin(YAW) * Math.cos(PITCH) * DIST, y: y + 1 + Math.sin(PITCH) * DIST, z: z + Math.cos(YAW) * Math.cos(PITCH) * DIST });
// 2. dieci punti dei vicoli del borgo (strade strette fra case E0)
const era = (x, z) => { for (let r = 1; r < 6; r++) for (const [dx, dz] of [[r, 0], [-r, 0], [0, r], [0, -r]]) { const tx = Math.floor((x + dx * TS) / TS), ty = Math.floor((z + dz * TS) / TS); if (tile(tx, ty) === W.T.BLD) { const b = W.BUILDINGS.find(b => tx >= b.x && tx < b.x + b.w && ty >= b.y && ty < b.y + b.h); if (b) return b.era; } } return null; };
const muri = (x, z) => [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dz]) => { for (let s = 1; s <= 2.6; s += .4) if (pieno(x + dx * s, z + dz * s)) return true; return false; }).length;
const posti = [];
W.roads.filter(r => r.w <= 3.5).forEach(r => r.pts.forEach((p, i) => { if (i % 4) return; const [x, z] = p; if (pieno(x, z) || era(x, z) !== 'E0' || muri(x, z) < 2) return; if (posti.some(q => Math.hypot(q[0] - x, q[1] - z) < 25)) return; posti.push([x, z, r.name]); }));
const dieci = posti.slice(0, 10);
ok(dieci.length === 10, `dieci punti nei vicoli del borgo (${posti.length} candidati): ${dieci.map(q => q[2]).filter((v, i, a) => a.indexOf(v) === i).join(', ')}`);
// un raggio passa se nessuna scatola lo ferma; una casa tagliata vale fino alla sua quota
const libero = (o, cam, taglio) => { const dx = cam.x - o.x, dy = cam.y - o.y, dz = cam.z - o.z, l = Math.hypot(dx, dy, dz), d = { x: dx / l, y: dy / l, z: dz / l };
  for (const C of CASE) { const b3 = C.box3, t = taglio.get(C), box = t ? { min: b3.min, max: { x: b3.max.x, y: t.y, z: b3.max.z } } : b3;
    if (box.max.y <= box.min.y) continue; const y = V.entra(o, d, box); if (y !== null && !(Math.abs(y - o.y) < 1e-6 && !t)) return C; }   // dentro la propria casa non conta
  return null; };
let coperti = 0, corpi = 0, tagliate = 0, quote = [];
dieci.forEach(([x, z]) => { const cam = camAt(x, z, 0), T = V.scegli(x, z, 0, cam, CASE, K, false); tagliate += T.size; T.forEach(t => quote.push(t.y));
  const P = [[0, .15], [0, .95], [0, 1.75]].map(([_, h]) => ({ x, y: h, z }));
  P.forEach(o => { corpi++; if (libero(o, cam, T)) coperti++; });
  // senza taglio quanti raggi del corpo sono coperti (il prima)
});
ok(coperti === 0, `col taglio il personaggio si vede tutto: ${corpi - coperti}/${corpi} raggi del corpo liberi (${tagliate} case tagliate nei dieci punti, quote ${quote.length ? Math.min(...quote).toFixed(2) + '-' + Math.max(...quote).toFixed(2) : '-'} m)`);
let senza = 0; dieci.forEach(([x, z]) => { const cam = camAt(x, z, 0), none = new Map(); [.15, .95, 1.75].forEach(h => { if (libero({ x, y: h, z }, cam, none)) senza++; }); });
console.log(`     senza taglio: ${senza}/${corpi} raggi del corpo coperti da una casa`);
let anello = 0, anelloOk = 0; dieci.forEach(([x, z]) => { const cam = camAt(x, z, 0), T = V.scegli(x, z, 0, cam, CASE, K, false);
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, o = { x: x + Math.cos(a) * K.anello, y: .05, z: z + Math.sin(a) * K.anello };
    if (CASE.some(C => o.x > C.box3.min.x - K.allarga && o.x < C.box3.max.x + K.allarga && o.z > C.box3.min.z - K.allarga && o.z < C.box3.max.z + K.allarga)) continue;
    anello++; if (!libero(o, cam, T)) anelloOk++; } });
ok(anelloOk >= anello * .9, `il suolo attorno ai piedi si vede: ${anelloOk}/${anello} punti dell'anello liberi`);
ok(quote.every(y => y >= K.minimo - 1e-6), `le quote del taglio stanno sopra ${K.minimo} m dai piedi`);
// 3. sul tetto niente
{ const [x, z] = dieci[0], T = V.scegli(x, z, 0, camAt(x, z, 0), CASE, K, true); ok(T.size === 0, 'sul tetto non si taglia niente'); }
// 4. lungo un muro: il primo punto dei dieci con una casa tagliata; si cammina lungo il muro di quella casa per due secondi
function lungo(fps) {
  let best = null;
  for (const [x, z] of dieci) { const T = V.scegli(x, z, 0, camAt(x, z, 0), CASE, K, false); if (!T.size) continue;
    const [C] = T.keys(), b3 = C.box3; const lx = b3.max.x - b3.min.x, lz = b3.max.z - b3.min.z;   // il muro più lungo della casa: si cammina parallelo
    const ax = lx >= lz ? 1 : 0, az = 1 - ax; best = { x, z, ax, az }; break; }
  if (!best) return null;
  const S = new Map(), dt = 1 / fps; let cambi = 0, glob = 0, prev = false, max1 = 0; const per = new Map();
  for (let i = 0; i < 2 * fps; i++) { const t = i * dt, x = best.x + best.ax * 1.4 * t, z = best.z + best.az * 1.4 * t;
    const T = V.scegli(x, z, 0, camAt(x, z, 0), CASE, K, false); const before = new Map([...S].map(([k, s]) => [k, s.on]));
    cambi += V.passo(S, T, dt, K);
    S.forEach((s, k) => { if (!(before.get(k) || false) && s.on) per.set(k, (per.get(k) || 0) + 1); });   // le aperture: una casa che si riapre è un lampeggio
    const any = [...S.values()].some(s => s.on); if (i && any !== prev) glob++; prev = any; }
  per.forEach(n => { max1 = Math.max(max1, n); });
  return { glob, max1, case: per.size };
}
[60, 20].forEach(fps => { const r = lungo(fps); ok(r && r.max1 <= 1 && r.glob <= 1, `lungo il muro per 2 s a ${fps} fps: il taglio acceso/spento ${r ? r.glob : '-'} volte, nessuna casa si riapre (al più ${r ? r.max1 : '-'} apertura per casa, ${r ? r.case : '-'} case toccate)`); });
// l'isteresi da sola: una casa che copre a intermittenza (raggio radente, 3 fotogrammi sì e 2 no) resta tagliata
{ const S = new Map(), C = {}, dt = 1 / 60; let n = 0; for (let i = 0; i < 120; i++) { const T = new Map(); if (i % 5 < 3) T.set(C, { y: 1, top: 9 }); n += V.passo(S, T, dt, K); }
  ok(n === 1 && S.get(C).on, `a intermittenza la casa resta tagliata (${n} cambio in 2 s)`); }
{ const S = new Map(), C = {}; V.passo(S, new Map([[C, { y: 1, top: 9 }]]), 1 / 60, K); const y0 = V.quota(S.get(C)); for (let i = 0; i < 30; i++) V.passo(S, new Map([[C, { y: 1, top: 9 }]]), 1 / 60, K);
  ok(y0 > 8 && Math.abs(V.quota(S.get(C)) - 1) < 1e-6, `il piano scivola dalla cima (${y0.toFixed(2)} m) alla quota (1 m) in ${K.apri} s`); }
// 5. la composizione
const C5 = V.COMPOSIZIONE, fx = -Math.sin(YAW), fz = -Math.cos(YAW), rx = -fz, rz = fx;
const comp = (x, z) => { const v = V.verso(V.sonda(x, z, pieno, C5), fx, fz, 0, 0, C5); return { v, o: V.spostamento(v, rx, rz, fx, fz, 44 * .4 / 2 * 1.6, 44 * .4 / 2 / Math.sin(PITCH), C5) }; };
const vic = dieci.map(([x, z]) => comp(x, z)); console.log('     vicoli, aperto:', vic.map(c => c.v.aperto.toFixed(2)).join(' ')); const kv = Math.max(...vic.map(c => c.v.k));
ok(kv < .15, `nei vicoli il quadro non si sposta (k al più ${kv.toFixed(2)})`);
const vit = W.roads.find(r => r.pennoni) || W.roads.find(r => /Vittoria/.test(r.name));
const piazze = W.roads.filter(r => r.w >= 10 && r !== vit).slice(0, 3);
const larghi = [];
if (vit) { const p = vit.pts[Math.floor(vit.pts.length / 2)]; larghi.push(['Vittoria', p[0], p[1]]); }
(W.PLACES ? Object.entries(W.PLACES) : []).filter(([k, p]) => p && p.x && /piazza|mercato|sagrato/i.test(k)).slice(0, 3).forEach(([k, p]) => larghi.push([k, p.x, p.y]));
const larg = larghi.map(([n, x, z]) => ({ n, ...comp(x, z) }));
larg.forEach(c => console.log(`     ${c.n}: aperto ${c.v.aperto.toFixed(2)}, k ${c.v.k.toFixed(2)}, spostamento ${Math.hypot(c.o[0], c.o[1]).toFixed(2)} m`));
ok(larg.length && larg.some(c => c.v.k > .5), 'nelle vie larghe e nelle piazze il quadro va verso il fronte');
ok(larg.every(c => Math.hypot(c.o[0], c.o[1]) <= C5.max + 1e-6), `mai più di ${C5.max} m`);
console.log(fail ? `\n${fail} prove fallite` : '\ntutto a posto'); process.exit(fail ? 1 : 0);
