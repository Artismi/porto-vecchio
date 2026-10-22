// [visuale4] prova dei due prototipi della visuale (visuale.js), sulla città compatta in pianta (case come scatole fino alla gronda più il
// tetto, la camera del gioco a piedi):
//   1. ?visuale=camera e ?visuale=muretto si scelgono; il modo di difetto resta il taglio;
//   2. A, la camera: nei vicoli del borgo la pendenza sale, nelle vie larghe e nelle piazze no;
//   3. A, niente pompa: camminando lungo le vie con i vicoli di lato la stretta cambia stato al più una volta ogni 2 s (60 e 20 fps);
//   4. A, il tetto che sbiadisce: solo la casa che copre il personaggio (i raggi del corpo entrano nella sua scatola), mai quella dietro;
//   5. B, il muretto: scendono solo le case sul lato camera e dentro il raggio; camminando non si riaprono;
//   6. sul tetto niente cambia (niente stretta, niente tetti sbiaditi, niente muretti).
// node src/test_visuale4.js   (dalla cartella v7)
const path = require('path'), src = __dirname;
global.World = require(path.join(src, 'world_cittanuova.js'));
const V = require(path.join(src, 'visuale.js')), W = World, TS = W.TS || 2, GW = W.GW, GH = W.GH;
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };
const M = V.mappa(W), KC = V.CAMERA4, KT = V.TETTO4, KM = V.MURETTO;
// 1. i modi
ok(V.modo('?cittanuova&visuale=camera') === 'camera' && V.modo('?visuale=muretto') === 'muretto', '?visuale=camera e ?visuale=muretto');
ok(V.modo('') === 'taglio' && V.modo('?visuale=ellisse') === 'ellisse', 'il modo di difetto resta il taglio; ellisse e taglio restano per il confronto');
// le case come scatole: dalla base alla gronda più 2,5 m (come le scatole di render.js: top + 2,5)
const CASE = W.BUILDINGS.map((b, i) => ({ b, i, geo: { y0: b.base || 0 }, box3: { min: { x: b.x * TS + .3, y: b.base || 0, z: b.y * TS + .3 }, max: { x: (b.x + b.w) * TS - .3, y: M.gronda(b) + 2.5, z: (b.y + b.h) * TS - .3 } } }));
const tile = (tx, ty) => tx < 0 || ty < 0 || tx >= GW || ty >= GH ? -1 : W.grid[ty * GW + tx];
const pieno = (x, z) => tile(Math.floor(x / TS), Math.floor(z / TS)) === W.T.BLD;
const quota = (x, z) => { const tx = Math.floor(x / TS), ty = Math.floor(z / TS); return tx < 0 || ty < 0 || tx >= GW || ty >= GH ? 0 : W.elev[ty * GW + tx]; };
const YAW = Math.PI / 4, DIST = (44 * .4 / 2) / Math.tan(15 * Math.PI / 180), CDX = Math.sin(YAW), CDZ = Math.cos(YAW);
const camAt = (x, z, y, pitch) => ({ x: x + CDX * Math.cos(pitch) * DIST, y: y + 1 + Math.sin(pitch) * DIST, z: z + CDZ * Math.cos(pitch) * DIST });
const CITTA = (x, z) => x > 1250 && x < 1610 && z > 262 && z < 446;
// i punti dei vicoli del borgo, uno per vicolo a giro (come test_visuale3)
const muri = (x, z) => [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dz]) => { for (let s = 1; s <= 2.6; s += .4) if (pieno(x + dx * s, z + dz * s)) return true; return false; }).length;
const perVicolo = W.roads.filter(r => r.w <= 3.5 && r.pts && r.pts.length > 1 && /^vic_|mezzo/.test(r.id)).map(r => { const L = [];
  r.pts.forEach(([x, z]) => { if (pieno(x, z) || !CITTA(x, z) || muri(x, z) < 2) return; if (L.some(q => Math.hypot(q[0] - x, q[1] - z) < 10)) return; L.push([x, z, r.name]); }); return L; }).filter(L => L.length);
const posti = []; for (let k = 0, more = true; more; k++) { more = false; perVicolo.forEach(L => { const q = L[k]; if (!q) return; more = true; if (posti.some(p => Math.hypot(p[0] - q[0], p[1] - q[1]) < 12)) return; posti.push(q); }); }
const vicoli = posti.slice(0, 16);
// i punti larghi: le vie da ≥ 7 m e le piazze della città compatta
const larghi = []; W.roads.filter(r => r.w >= 7 && r.pts).forEach(r => r.pts.forEach(([x, z], k) => { if (k % 7 || pieno(x, z) || !CITTA(x, z)) return; if (larghi.some(q => Math.hypot(q[0] - x, q[1] - z) < 14)) return; larghi.push([x, z, r.name]); }));
(W.sets || []).filter(q => /mercato|adunata|marina|sagrato|calata/.test(q.k)).forEach(q => { const x = q.x !== undefined ? q.x : (q.x0 + q.x1) / 2, z = q.y !== undefined ? q.y : (q.y0 + q.y1) / 2; if (!pieno(x, z) && CITTA(x, z)) larghi.push([x, z, q.k]); });
// la camera ferma in un punto per 2 s (30 fps)
const ferma = (x, z) => { const S = {}, fy = quota(x, z); let m; for (let i = 0; i < 60; i++) { m = V.misura(M, x, z, fy, CDX, CDZ, KC); V.camPasso(S, m, 1 / 30, KC, YAW); } return { S, m }; };
// 2. la stretta
{ const R = vicoli.map(([x, z, n]) => Object.assign(ferma(x, z), { n })), su = R.filter(r => r.S.on && r.S.p >= KC.stretta - .02);
  ok(vicoli.length >= 12 && su.length >= vicoli.length * .75, `nei vicoli del borgo la camera sale: ${su.length}/${vicoli.length} punti (pendenza ${Math.min(...su.map(r => r.S.p)).toFixed(2)}-${Math.max(...su.map(r => r.S.p)).toFixed(2)} rad; larghezza media ${(R.reduce((a, r) => a + r.m.larg, 0) / R.length).toFixed(1)} m)`);
  const no = R.filter(r => !r.S.on); if (no.length) console.log('     restano giù:', no.map(r => `${r.n} (largo ${r.m.larg.toFixed(1)} m, s ${r.m.s.toFixed(2)})`).join(', '));
  const L = larghi.map(([x, z, n]) => Object.assign(ferma(x, z), { n })), giu = L.filter(r => !r.S.on && Math.abs(r.S.p - KC.base) < .01);
  ok(larghi.length >= 10 && giu.length === larghi.length, `nelle vie larghe e nelle piazze la camera resta com'è: ${giu.length}/${larghi.length} (${[...new Set(larghi.map(q => q[2]))].join(', ')})${giu.length < L.length ? ' — salgono: ' + L.filter(r => r.S.on).map(r => r.n).join(', ') : ''}`);
  const v = R.find(r => r.S.on); if (v) { const S = v.S, t0 = []; let t = 0; for (; t < 3 && Math.abs(S.p - KC.base) > .01; t += 1 / 30) V.camPasso(S, null, 1 / 30, KC); t0.push(t);
    ok(t > .5 && t < 1.1, `il ritorno alla pendenza di sempre è liscio: ${t.toFixed(2)} s per arrivare entro 0,01 rad (smorzamento ${KC.tau} s)`); } }
// 3. niente pompa: le vie con i vicoli di lato, a 1,4 m/s
const lungo = (r, fps) => { const P = r.pts.filter(([x, z]) => CITTA(x, z)); if (P.length < 2) return null; const S = {}, dt = 1 / fps, T = []; let L = 0, t = 0, cambi0 = 0, m = null;
  for (let k = 1; k < P.length; k++) { const [ax, az] = P[k - 1], [bx, bz] = P[k], l = Math.hypot(bx - ax, bz - az);
    for (let s = 0; s < l; s += 1.4 * dt) { const x = ax + (bx - ax) * s / l, z = az + (bz - az) * s / l; t += dt; if (!pieno(x, z)) { L += 1.4 * dt; m = V.misura(M, x, z, quota(x, z), CDX, CDZ, KC); }   // dentro un pieno (la linea della via taglia uno spigolo) vale l'ultima misura
      if (!m) continue; V.camPasso(S, m, dt, KC, YAW); if (S.cambi > cambi0) { T.push(t); cambi0 = S.cambi; } } }
  let peggio = 0; T.forEach((t, i) => { let n = 0; for (let j = i; j < T.length && T[j] - t < 2; j++) n++; peggio = Math.max(peggio, n); });
  return { L, cambi: T.length, peggio, on: S.cambi }; };
const vie = W.roads.filter(r => ['vittoria', 'corso', 'marina', 'rua', 'via_porto'].includes(r.id));
const lati = r => W.roads.filter(q => /^vic_/.test(q.id) && q.pts && q.pts.some(a => r.pts.some(b => Math.hypot(a[0] - b[0], a[1] - b[1]) < 4))).length;
[60, 20].forEach(fps => { const R = vie.map(r => ({ r, q: lungo(r, fps) })).filter(o => o.q);
  ok(R.length >= 4 && R.every(o => o.q.peggio <= 1), `a ${fps} fps lungo le vie coi vicoli di lato la stretta cambia al più una volta in 2 s: ` + R.map(o => `${o.r.name} ${o.q.L.toFixed(0)} m, ${lati(o.r)} vicoli, ${o.q.cambi} cambi (al più ${o.q.peggio} in 2 s)`).join('; ')); });
// 4. il tetto che sbiadisce: solo chi copre
{ let tot = 0, coperti = 0, dietro = 0, fuori = 0, mancati = 0;
  vicoli.forEach(([x, z]) => { const fy = quota(x, z), cam = camAt(x, z, fy, KC.base), sel = V.tetti(x, z, fy, cam, CASE, KT, false);
    const R = [.15, .95, 1.75].map(h => { const o = { x, y: fy + h, z }, dx = cam.x - x, dy = cam.y - o.y, dz = cam.z - z, l = Math.hypot(dx, dy, dz); return { o, d: { x: dx / l, y: dy / l, z: dz / l } }; });
    const colpita = (C, A) => { const b = C.box3, bb = { min: { x: b.min.x - A, y: b.min.y, z: b.min.z - A }, max: { x: b.max.x + A, y: b.max.y, z: b.max.z + A } }; return R.some(q => V.entra(q.o, q.d, bb) !== null); };
    const vere = CASE.filter(C => colpita(C, 0)); if (vere.length) coperti++; tot += sel.size;
    vere.forEach(C => { if (!sel.has(C)) mancati++; });
    sel.forEach((_, C) => { if (!colpita(C, KT.allarga)) fuori++; const b = C.box3, cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2, dentro = x > b.min.x && x < b.max.x && z > b.min.z && z < b.max.z;
      if (!dentro && (cx - x) * CDX + (cz - z) * CDZ < -1) dietro++; }); });
  ok(coperti > 0 && mancati === 0 && fuori === 0 && dietro === 0, `il tetto sbiadisce solo sulla casa che copre: ${tot} tetti in ${vicoli.length} punti (${coperti} coperti), nessuna casa dietro (${dietro}), nessuna che non copre (${fuori}), nessuna che copre dimenticata (${mancati})`);
  // l'isteresi: una casa che copre a intermittenza resta sbiadita; lo sbiadire arriva pieno in apri
  const S = new Map(), C = {}; let n = 0; for (let i = 0; i < 120; i++) { const T = new Map(); if (i % 5 < 3) T.set(C, { y: 0, top: 0 }); n += V.passo(S, T, 1 / 60, KT); }
  ok(n === 1 && V.sbiadito(S.get(C)) > .99, `a intermittenza il tetto resta sbiadito (${n} cambio in 2 s), sbiadito del tutto fino a ${KT.resta} di opacità`); }
// 5. il muretto: lato camera e raggio
{ let tot = 0, male = 0, giu = 0, R0 = 0;
  vicoli.forEach(([x, z]) => { const fy = quota(x, z), cam = camAt(x, z, fy, KC.base), sel = V.muretto(x, z, fy, cam, KC.base, CASE, KM, false, null); tot += sel.size; if (sel.size) giu++;
    sel.forEach((v, C) => { const b = C.box3, cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2, a = (cx - x) * CDX + (cz - z) * CDZ;
      let lmin = Infinity; for (const px of [b.min.x, b.max.x]) for (const pz of [b.min.z, b.max.z]) lmin = Math.min(lmin, Math.abs((px - x) * -CDZ + (pz - z) * CDX));
      const lat = Math.max(0, Math.min(...[b.min.x, b.max.x].flatMap(px => [b.min.z, b.max.z].map(pz => (px - x) * -CDZ + (pz - z) * CDX))) > 0 ? lmin : Math.max(...[b.min.x, b.max.x].flatMap(px => [b.min.z, b.max.z].map(pz => (px - x) * -CDZ + (pz - z) * CDX))) < 0 ? lmin : 0);
      if (a < KM.davanti || lat > KM.raggio || Math.abs(v.y - (C.geo.y0 + KM.alto)) > 1e-6) male++; R0 = Math.max(R0, lat); });
    // nessuna casa dietro al personaggio scende
    CASE.forEach(C => { const b = C.box3, cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2; if ((cx - x) * CDX + (cz - z) * CDZ < 0 && sel.has(C)) male++; }); });
  ok(giu >= vicoli.length * .8 && male === 0, `il muretto: ${tot} case giù in ${giu}/${vicoli.length} punti, tutte sul lato camera e dentro il raggio di ${KM.raggio} m (la più di lato a ${R0.toFixed(1)} m), a ${KM.alto} m dalla loro base; fuori regola ${male}`);
  // camminando lungo un vicolo per 3 s: nessuna casa si riapre (sale e riscende)
  const [x0, z0] = vicoli[0], S = new Map(), per = new Map(); const r = W.roads.find(q => q.name === vicoli[0][2]); const P = r.pts; let k0 = 0, dmin = 1e9; P.forEach((q, k) => { const d = Math.hypot(q[0] - x0, q[1] - z0); if (d < dmin) { dmin = d; k0 = k; } });
  const k1 = Math.min(P.length - 1, k0 + 8), ux = P[k1][0] - P[k0][0], uz = P[k1][1] - P[k0][1], ul = Math.hypot(ux, uz) || 1;
  for (let i = 0; i < 180; i++) { const x = x0 + ux / ul * 1.4 * i / 60, z = z0 + uz / ul * 1.4 * i / 60, fy = quota(x, z); const T = V.muretto(x, z, fy, camAt(x, z, fy, KC.base), KC.base, CASE, KM, false, S);
    const prima = new Map([...S].map(([C, s]) => [C, s.on])); V.passo(S, T, 1 / 60, KM); S.forEach((s, C) => { if (!prima.get(C) && s.on) per.set(C, (per.get(C) || 0) + 1); }); }
  let mx = 0; per.forEach(n => { mx = Math.max(mx, n); });
  ok(mx <= 1, `lungo ${vicoli[0][2]} per 3 s nessuna casa risale e riscende (${per.size} case toccate, al più ${mx} discesa per casa)`); }
// 6. sul tetto
{ const [x, z] = vicoli[0], fy = quota(x, z), cam = camAt(x, z, fy, KC.base);
  ok(V.tetti(x, z, fy, cam, CASE, KT, true).size === 0 && V.muretto(x, z, fy, cam, KC.base, CASE, KM, true, null).size === 0, 'sul tetto niente tetti sbiaditi e niente muretti');
  const S = {}; for (let i = 0; i < 60; i++) V.camPasso(S, V.misura(M, x, z, fy, CDX, CDZ, KC), 1 / 30, KC, YAW); const su = S.on;
  for (let i = 0; i < 60; i++) V.camPasso(S, null, 1 / 30, KC, YAW);
  ok(su && !S.on && Math.abs(S.p - KC.base) < .01 && Math.abs(S.z - 1) < .01, `salito sul tetto dal vicolo la camera torna quella di sempre (${S.p.toFixed(3)} rad, zoom ${S.z.toFixed(3)})`); }
console.log(fail ? `\n${fail} prove fallite` : '\ntutto a posto'); process.exit(fail ? 1 : 0);
