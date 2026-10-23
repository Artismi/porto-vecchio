// [visuale4] prova dei due modi della visuale (visuale.js), sulla città compatta in pianta (case come scatole fino alla gronda più il
// tetto, la camera del gioco a piedi):
//   1. [visuale5] restano solo 'camera' (di difetto) e 'muretto'; ellisse, taglio e sezione non si scelgono più;
//   2. A, la camera: nei vicoli del borgo la pendenza sale, nelle vie larghe e nelle piazze no;
//   3. A, niente pompa: camminando lungo le vie con i vicoli di lato la stretta cambia stato al più una volta ogni 2 s (60 e 20 fps);
//   4. A, il tetto che sbiadisce: solo la casa che copre il personaggio (i raggi del corpo entrano nella sua scatola), mai quella dietro;
//   5. B, il muretto: scendono solo le case sul lato camera e dentro il raggio; camminando non si riaprono; la macchina del taglio che
//      usa (l'isteresi, lo scivolare del piano: le prove che erano in test_visuale3);
//   6. sul tetto niente cambia (niente stretta, niente tetti sbiaditi, niente muretti);
//   7. [visuale5] la camera a mano e il ricentro, con l'ingresso simulato a 60 e 20 fps: fermo, giri, parti → si ricentra; giri camminando
//      → resta; ti fermi e riparti → si ricentra; contromarcia sostenuta → si ricentra dopo il ritardo, l'esitazione corta no; il ricentro
//      non lotta col giocatore, è uguale a ogni frequenza, e lo scarto non porta il personaggio fuori dallo schermo (nel gioco vero: prova_fluido pad).
// node src/test_visuale4.js   (dalla cartella v7)
const path = require('path'), src = __dirname;
global.World = require(path.join(src, 'world_cittanuova.js'));
const V = require(path.join(src, 'visuale.js')), W = World, TS = W.TS || 2, GW = W.GW, GH = W.GH;
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };
const M = V.mappa(W), KC = V.CAMERA4, KT = V.TETTO4, KM = V.MURETTO;
// 1. i modi
ok(V.modo('?cittanuova&visuale=camera') === 'camera' && V.modo('?visuale=muretto') === 'muretto', '?visuale=camera e ?visuale=muretto');
ok(V.modo('') === 'camera' && V.modo('?cittanuova') === 'camera' && ['ellisse', 'taglio', 'sezione', 'boh'].every(m => V.modo('?visuale=' + m) === 'camera') && V.MODI.join() === 'camera,muretto',
  '[visuale5] il modo di difetto è la camera; ellisse, taglio e sezione non ci sono più (tornano alla camera)');
ok(V.scegli === undefined && V.chiesta === undefined, '[visuale5] via la scelta e la quota del taglio: resta la macchina che usa il muretto (passo, quota, entra)');
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
// [visuale3] la macchina del taglio che resta al muretto (da test_visuale3, che non c'è più): l'isteresi e lo scivolare del piano
{ const S = new Map(), C = {}, dt = 1 / 60; let n = 0; for (let i = 0; i < 120; i++) { const T = new Map(); if (i % 5 < 3) T.set(C, { y: 1, top: 9 }); n += V.passo(S, T, dt, KM); }
  ok(n === 1 && S.get(C).on, `a intermittenza la casa resta giù (${n} cambio in 2 s)`); }
{ const S = new Map(), C = {}; V.passo(S, new Map([[C, { y: 1, top: 9 }]]), 1 / 60, KM); const y0 = V.quota(S.get(C)); for (let i = 0; i < 40; i++) V.passo(S, new Map([[C, { y: 1, top: 9 }]]), 1 / 60, KM);
  ok(y0 > 8 && Math.abs(V.quota(S.get(C)) - 1) < 1e-6, `il piano scivola dalla cima (${y0.toFixed(2)} m) al muretto (1 m) in ${KM.apri} s`); }
// 7. [visuale5] la camera a mano e il ricentro (Visuale.mano), con l'ingresso simulato: la levetta destra (o il mouse, le dita) gira la
// visuale; il personaggio sta fermo o cammina in una direzione del mondo. La visuale del gioco: YAW più la parte a mano; il suo davanti in
// pianta è -π/2 - yaw (come render.js: la camera sta a (sin yaw, cos yaw) dal punto guardato)
{ const KN = V.MANO, YB = Math.PI / 4, avanti = S => -Math.PI / 2 - (YB + (S.yaw || 0)), A = a => Math.atan2(Math.sin(a), Math.cos(a));
  // f(t) -> { v: m/s, dir: direzione del mondo, w: rad/s girati a mano (mentre la tocca), pan: m/s, segue }
  const gioca = (S, fps, T, f, log) => { const dt = 1 / fps; for (let i = 0, n = Math.round(T * fps); i < n; i++) { const t = i * dt, q = f(t) || {}, att = !!(q.w || q.pan);
      V.mano(S, { dyaw: (q.w || 0) * dt, dpx: (q.pan || 0) * dt, dpz: 0, attivo: att, vel: q.v || 0, dir: q.dir, avanti: avanti(S), segue: !!q.segue }, dt, KN); if (log) log(t + dt, S); } return S; };
  const su = -Math.PI / 2 - YB;   // la direzione del mondo che nella visuale di sempre è «in su» sullo schermo
  [60, 20].forEach(fps => {
    // a) fermo, la giri, poi cammini: si ricentra
    const S = {}; gioca(S, fps, .5, () => ({})); gioca(S, fps, .5, () => ({ w: 2.4 })); const y1 = S.yaw; gioca(S, fps, 1.5, () => ({}));
    const fermo = S.off && Math.abs(S.yaw - y1) < 1e-9; let t95 = null, salti = 0, prima = S.yaw;
    gioca(S, fps, 2, () => ({ v: 1.4, dir: su }), (t, S) => { if (t95 === null && Math.abs(S.yaw) < .05 * Math.abs(y1)) t95 = t; if (S.yaw > prima + 1e-9) salti++; prima = S.yaw; });
    ok(fermo && t95 !== null && t95 > .4 && t95 < .9 && salti === 0 && !S.off && S.perche === 'partenza', `${fps} fps — fermo, la giri di ${y1.toFixed(2)} rad: resta girata finché stai fermo; parti e si ricentra liscia (95% in ${t95 && t95.toFixed(2)} s, sempre in calo)`);
    // b) cammini, la giri camminando: resta; ti fermi e riparti: si ricentra
    const S2 = {}; gioca(S2, fps, 1, () => ({ v: 1.4, dir: su })); gioca(S2, fps, .5, () => ({ v: 1.4, dir: su, w: 2 })); const y2 = S2.yaw;
    gioca(S2, fps, 3, () => ({ v: 1.4, dir: su })); const resta = S2.off && !S2.ric && Math.abs(S2.yaw - y2) < 1e-9;
    gioca(S2, fps, .15, () => ({ v: .1, dir: su })); gioca(S2, fps, .5, () => ({ v: 1.4, dir: su })); const passoIncerto = S2.off && Math.abs(S2.yaw - y2) < 1e-9;   // un attimo sotto la soglia non è una sosta
    gioca(S2, fps, .8, () => ({})); const fermo2 = S2.off && Math.abs(S2.yaw - y2) < 1e-9; gioca(S2, fps, .8, () => ({ v: 1.4, dir: su }));
    ok(resta && passoIncerto && fermo2 && Math.abs(S2.yaw) < .05 * Math.abs(y2) && S2.perche === 'partenza', `${fps} fps — la giri camminando (${y2.toFixed(2)} rad): resta per 3 s di marcia e dopo un passo incerto di 0,15 s; ferma resta; alla ripartenza si ricentra (${S2.yaw.toFixed(3)} rad dopo 0,8 s)`);
    // c) contromarcia sostenuta: si ricentra dopo il ritardo; d) un'esitazione corta no
    const S3 = {}; gioca(S3, fps, 1, () => ({ v: 1.4, dir: su })); gioca(S3, fps, .4, () => ({ v: 1.4, dir: su, w: 1.5 })); const y3 = S3.yaw, giu = su + Math.PI - y3;   // verso la camera girata
    let tRic = null; gioca(S3, fps, 2.5, () => ({ v: 1.4, dir: giu }), (t, S) => { if (tRic === null && S.ric) tRic = t; });
    ok(tRic !== null && tRic >= KN.tContro - 1e-6 && tRic < KN.tContro + .1 && S3.perche === 'contro' && Math.abs(S3.yaw) < .1 * Math.abs(y3), `${fps} fps — giri camminando e poi vai verso la camera: si ricentra dopo ${tRic && tRic.toFixed(2)} s di contromarcia (soglia ${(KN.contro * 180 / Math.PI).toFixed(0)}°, ${KN.tContro} s)`);
    const S4 = {}; gioca(S4, fps, 1, () => ({ v: 1.4, dir: su })); gioca(S4, fps, .4, () => ({ v: 1.4, dir: su, w: 1.5 })); const y4 = S4.yaw, giu4 = su + Math.PI - y4;
    gioca(S4, fps, 6, t => ({ v: 1.4, dir: (t % 1.1) < .6 ? giu4 : su - y4 }));   // 0,6 s contro e 0,5 s con, per 6 s
    const S5 = {}; gioca(S5, fps, 1, () => ({ v: 1.4, dir: su })); gioca(S5, fps, .4, () => ({ v: 1.4, dir: su, w: 1.5 })); const y5 = S5.yaw;
    gioca(S5, fps, 4, () => ({ v: 1.4, dir: su - y5 + 1.66 }));   // 95° dal davanti: nella banda dell'isteresi, mai oltre la soglia
    ok(S4.off && Math.abs(S4.yaw - y4) < 1e-9 && S4.n === 0 && S5.off && S5.n === 0, `${fps} fps — l'esitazione corta (0,6 s contro e 0,5 s con, per 6 s) e la marcia di traverso a 95° non ricentrano`);
    // e) il ricentro non lotta col giocatore: appena la tocca si ferma lì, e la segue
    const S6 = {}; gioca(S6, fps, .3, () => ({ w: 3 })); gioca(S6, fps, .5, () => ({})); gioca(S6, fps, .25, () => ({ v: 1.4, dir: su })); const ric = S6.ric, y6 = S6.yaw;
    gioca(S6, fps, .5, () => ({ v: 1.4, dir: su, w: -1 }));
    ok(ric && !S6.ric && S6.off && Math.abs(S6.yaw - (y6 - .5)) < 1e-6, `${fps} fps — durante il ricentro la tocchi: il ricentro si ferma e la camera fa solo quello che chiedi (${y6.toFixed(3)} → ${S6.yaw.toFixed(3)} rad)`);
  });
  // la stessa curva a ogni frequenza di fotogrammi (lo smorzamento esponenziale)
  { const curva = fps => { const S = {}; gioca(S, fps, .3, () => ({ w: 3 })); gioca(S, fps, .5, () => ({})); gioca(S, fps, .5, () => ({ v: 1.4, dir: -Math.PI / 2 - Math.PI / 4 })); return S.yaw; };
    const a = curva(60), b = curva(20), c = curva(144); ok(Math.abs(a - b) < .02 && Math.abs(a - c) < .02, `il ricentro è uguale a 20, 60 e 144 fps: dopo 0,5 s ${b.toFixed(3)}, ${a.toFixed(3)}, ${c.toFixed(3)} rad`); }
  // la partenza subito dopo averla girata vale come «girata camminando»: resta
  { const S = {}; gioca(S, 60, .4, () => ({ w: 2 })); const y = S.yaw; gioca(S, 60, 1, () => ({ v: 1.4, dir: su }));
    ok(S.off && Math.abs(S.yaw - y) < 1e-9, `parti mentre la stai girando (entro ${KN.grazia} s): resta dove l'hai messa`); }
  // lo spostamento torna insieme al giro
  { const S = {}; gioca(S, 60, .5, () => ({ pan: 6 })); const p0 = S.px; gioca(S, 60, .5, () => ({})); gioca(S, 60, 2, () => ({ v: 1.4, dir: su }));
    ok(p0 > 2 && Math.abs(S.px) < .05 && !S.off, `spostata da fermo di ${p0.toFixed(1)} m: alla partenza torna sul personaggio`); }
  // sul telefono la visuale segue la marcia: in centro la contromarcia non tocca la parte a mano ma lascia fare il mezzo giro (S.giro)
  { const S = {}; gioca(S, 60, 1, () => ({ v: 1.4, dir: su, segue: true })); let g = null; gioca(S, 60, 1.5, () => ({ v: 1.4, dir: su + Math.PI, segue: true }), (t, S) => { if (g === null && S.giro === 0) g = t; });
    ok(g !== null && Math.abs(g - KN.tContro) < .05 && S.n === 0 && !S.off, `in centro, sul telefono: dopo ${g && g.toFixed(2)} s di contromarcia la visuale che segue la marcia può girarsi (nessun ricentro a mano)`); }
  // lo scarto non porta mai il personaggio fuori dallo schermo
  { let peggio = 0; for (let k = 0; k < 64; k++) { const yaw = k * .37, S = { px: Math.cos(k) * 40, pz: Math.sin(k * 1.3) * 40 }, lx = Math.cos(k * .7) * 3, lz = Math.sin(k * .7) * 3, hu = 14, hv = 8, hvL = 15;   // in prospettiva il suolo verso la camera (in basso) è più corto
      V.limita(S, lx, lz, yaw, hu, hv, KN, hvL); const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = -fz, rz = fx, tx = S.px + lx, tz = S.pz + lz;
      peggio = Math.max(peggio, Math.abs(tx * rx + tz * rz) / hu, (tx * fx + tz * fz) / hv, -(tx * fx + tz * fz) / hvL); }
    ok(peggio <= KN.bordo + 1e-9, `lo scarto a mano più lo sguardo avanti resta entro ${KN.bordo} della mezza inquadratura, in basso e in alto la sua (il peggiore ${peggio.toFixed(3)}): il personaggio resta nello schermo`); } }
console.log(fail ? `\n${fail} prove fallite` : '\ntutto a posto'); process.exit(fail ? 1 : 0);
