// [graffiti] prova dei graffiti: l'aderenza (zero lavori che galleggiano su una facciata difficile: gradoni, portico, zoccolo,
// finestre, insegna, spigolo), la decalcomania sui mezzi (sulla carrozzeria, si muove col mezzo), la persistenza (scrivi su un
// muro e su un'auto, allontanati oltre l'anello e torna, rifai i modelli, ricarica: c'è ancora, allineato), il tetto della
// memoria, la tavoletta (il centro e gli angoli dell'anteprima cadono sulla superficie: mai il cielo).
//   node test_graffiti.js [--seme=12345] [--file=writing.js]   (--file: un'altra versione di writing.js, per contare il «prima»)
const ARG = Object.fromEntries(process.argv.slice(2).map(a => /^--([a-z]+)=(.*)$/.exec(a)).filter(Boolean).map(m => [m[1], m[2]]));
const SEME = +(ARG.seme || 12345);
{ let a = SEME >>> 0; Math.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
// ---- il browser finto: tele che non disegnano, localStorage in memoria, i fotogrammi a mano ----
function fakeCanvas(w, h) {
  const c = { width: w || 1, height: h || 1 }; const st = {};
  const ctx = new Proxy(st, { get: (t, k) => k === 'canvas' ? c : k === 'getImageData' || k === 'createImageData' ? (a, b, W, H) => ({ data: new Uint8ClampedArray(Math.max(1, (W || a || 1) * (H || b || 1)) * 4) }) : k in t ? t[k] : () => { }, set: (t, k, v) => { t[k] = v; return true; } });
  c.getContext = () => ctx; return c;
}
const RIC = ARG.ricarica ? JSON.parse(require('fs').readFileSync(ARG.ricarica, 'utf8')) : null;   // la seconda metà: la pagina ricaricata (un processo nuovo)
const MEM = new Map(RIC ? RIC.mem : []);
global.localStorage = { getItem: k => MEM.has(k) ? MEM.get(k) : null, setItem: (k, v) => MEM.set(k, String(v)), removeItem: k => MEM.delete(k) };
global.document = { createElement: () => fakeCanvas(1, 1), getElementById: () => null, readyState: 'complete', body: { appendChild() { } } };
global.window = global; global.addEventListener = () => { }; global.removeEventListener = () => { };
let RAF = null; global.requestAnimationFrame = f => { RAF = f; };
global.THREE = require('./three.min.js');
// i pennelli veri vogliono una tela vera: qui il disegno è una tela finta della misura giusta (l'aderenza non guarda i pixel)
global.Pennelli = { art: w => { const Wp = Math.max(1, Math.round(w.W * 100)), Hp = Math.max(1, Math.round(w.H * 100)); return { stages: [fakeCanvas(Wp, Hp)], paths: [[[1, 1]]], radii: [5], Wp, Hp, ppm: 100 }; }, PENNELLI: {} };
global.World = require('./world.js'); global.Interior = require('./interiors.js');
global.Game = require('./game.js'); global.Risacca = require('./risacca.js'); global.Popolo = require('./popolo.js'); global.Azioni = require('./azioni.js');
global.Economia = require('./economia.js'); global.Fazioni = require('./fazioni.js'); global.Soldi = require('./soldi.js'); global.Oggetti = require('./oggetti.js');
global.Graffiti = require('./graffiti.js'); global.Livelli = require('./livelli.js'); global.Sottosuolo = require('./sottosuolo.js'); global.Tetti = require('./tetti.js');
if (ARG.file) require('./writer_arte.js').art = global.Pennelli.art;   // la versione di prima disegna con writer_arte: anche lei con la tela finta
global.Writing = require(ARG.file ? require('path').resolve(ARG.file) : './writing.js');
Tetti.feetH = () => 0;
const G = Game, WR = Writing, T = THREE;
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };

// ---- la scena: lontano dalla città (nessun lavoro della storia ci arriva), il suolo a 0 ----
const X0 = 30, Z0 = 30, scene = new T.Scene(), mat = new T.MeshLambertMaterial({ color: '#c8c0b0' });
const box = (w, h, d, x, y, z, m) => { const o = new T.Mesh(new T.BoxGeometry(w, h, d), m || mat); o.position.set(X0 + x, y, Z0 + z); scene.add(o); o.updateMatrixWorld(true); return o; };
const ground = new T.Mesh(new T.PlaneGeometry(200, 200), mat); ground.rotation.x = -Math.PI / 2; ground.position.set(X0, 0, Z0); scene.add(ground); ground.updateMatrixWorld(true);
// LA FACCIATA (fronte verso +z, filo a z = 0, da x = 0 a 14): il piano terra con lo zoccolo che sporge 4 cm fino a 50 cm,
// un portico arretrato di 60 cm da x = 4 a 6.5, una finestra (un vano profondo 25 cm) e un'insegna che sporge 12 cm; sopra
// i 3,6 m la facciata arretra di 30 cm (a gradoni); a x = 14 lo spigolo.
const parts = [];
parts.push(box(4, 3.6, 1, 2, 1.8, -.5), box(7.5, 3.6, 1, 10.25, 1.8, -.5));   // il muro del piano terra, ai lati del portico
parts.push(box(2.5, 3.6, 1, 5.25, 1.8, -1.1));   // il fondo del portico
parts.push(box(14, 3, 1, 7, 5.1, -.8));   // il piano di sopra, arretrato
parts.push(box(4, .5, .04, 2, .25, .02), box(7.5, .5, .04, 10.25, .25, .02));   // lo zoccolo
// la finestra: il vano (da x 8.6 a 9.6, da y 1.2 a 2.5) con il fondo arretrato; il muro attorno a pezzi
scene.remove(parts[1]); parts.splice(1, 1);
parts.push(box(2.1, 3.6, 1, 7.55, 1.8, -.5), box(4.4, 3.6, 1, 11.8, 1.8, -.5), box(1, 1.2, 1, 9.1, .6, -.5), box(1, 1.1, 1, 9.1, 3.05, -.5), box(1, 1.3, .6, 9.1, 1.85, -.7));
parts.push(box(2.4, .6, .12, 2.2, 2.9, .06));   // l'insegna
const APER = [{ x: X0 + 9.1, z: Z0, ux: 1, uz: 0, nx: 0, nz: 1, hw: .5, y0: 1.2, y1: 2.5, tipo: 'finestra' }, { x: X0 + 2.2, z: Z0, ux: 1, uz: 0, nx: 0, nz: 1, hw: 1.2, y0: 2.6, y1: 3.2, tipo: 'insegna' }];
// IL MEZZO: un'auto (scatola col tetto e i parafanghi smussati) parcheggiata davanti, girata di 0,3
const car = new T.Group(); car.name = 'auto';
const body = new T.Mesh(new T.BoxGeometry(4.2, .8, 1.7), mat); body.position.y = .65; car.add(body);
const cab = new T.Mesh(new T.CylinderGeometry(.8, .8, 2.2, 16, 1, false, 0, Math.PI), mat); cab.rotation.set(Math.PI / 2, 0, Math.PI / 2); cab.scale.set(1, 1, .6); cab.position.set(-.2, 1.05, 0); car.add(cab);
let carX = RIC ? RIC.car[0] : X0 + 6, carZ = RIC ? RIC.car[1] : Z0 + 6, carA = RIC ? RIC.car[2] : .3;
const placeCar = g => { g.position.set(carX, 0, carZ); g.rotation.set(0, -carA, 0); g.updateMatrixWorld(true); };
placeCar(car); scene.add(car);
const cam = new T.PerspectiveCamera(50, 1.6, .05, 500);
const visMeshes = () => { const L = []; scene.traverseVisible(o => { if (o.isMesh && !o.userData.velo) L.push(o); }); return L; };
const R = { groundH: () => 0, __bmb: { bmbCands: () => visMeshes() }, __models: { scene, renderer: null }, __vehicles: { pv_prova: car }, getCamera: () => cam, aperture: () => APER, cam: { x: X0 + 6, y: Z0 + 4 } };
let st = G.create(SEME); const veh = () => ({ id: 'pv_prova', kind: 'car', x: carX, y: carZ, ang: carA, speed: 0 });
st.vehicles.push(veh()); global.__pv = { R, st };
WR.GFX.train = { grp: new T.Group(), cars: [] }; WR.GFX.noRail = true;
const tick = (n = 1) => { for (let k = 0; k < n; k++) { if (WR._.frame) WR._.frame(); else if (RAF) RAF(0); } };

// ---- la misura indipendente (come strumenti/graffiti_sonda.js): un punto del velo a più di 2 cm dal muro, niente muro sotto, o sopra un'apertura ----
const rc = new T.Raycaster();
function floating(w, g) {
  const m = g.tgt.mesh; m.updateMatrixWorld(true); const n = new T.Vector3(0, 0, 1).transformDirection(m.matrixWorld), L = visMeshes(); let bad = 0, worst = 0;
  for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) {
    const p = new T.Vector3((i / 4 - .5) * .96 * w.gfxRect.W, (j / 3 - .5) * .96 * w.gfxRect.H, 0).applyMatrix4(m.matrixWorld);
    rc.set(p.clone().addScaledVector(n, .5), n.clone().negate()); rc.far = 1.5; const h = rc.intersectObjects(L, false)[0], d = h ? Math.abs(h.distance - .5) : 9; worst = Math.max(worst, d);
    const inA = APER.some(a => Math.abs(p.x - a.x) < a.hw && p.y > a.y0 && p.y < a.y1 && Math.abs(p.z - a.z) < .5);
    if (d > .02 || inA) bad++;
  }
  return { bad, worst };
}
const onBody = g => { const P = g.tgt.mesh.geometry.attributes.position, v = new T.Vector3(); g.tgt.mesh.updateMatrixWorld(true); let worst = 0; for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(g.tgt.mesh.matrixWorld); const L = car.worldToLocal(v.clone()); const bl = body.worldToLocal(car.localToWorld(L.clone())); const dB = Math.max(Math.abs(bl.x) - 2.1, Math.abs(bl.y) - .4, Math.abs(bl.z) - .85), cl = cab.worldToLocal(car.localToWorld(L.clone())), dC = Math.abs(Math.hypot(cl.x, cl.z) - .8); worst = Math.max(worst, Math.min(Math.abs(dB), dC)); } return worst; };
const wallVeils = () => Object.keys(WR.GFX.works).map(id => [WR.S(st).works.find(o => o.id === +id), WR.GFX.works[id]]).filter(([w, g]) => w && g.tgt && g.tgt.mesh && w.surf === 'muro' && w.gfxRect && Math.abs(w.gfxRect.n.y || 0) < .5);

(async () => {
  await new Promise(r => setTimeout(r, 30)); tick(2);
  if (RIC) return ricarica();
  const W = WR.S(st);
  // 1. L'ADERENZA: 60 lavori degli NPC lungo la facciata (tag, throw-up, pezzi, roller, adesivi), da ogni punto della strada
  const styles = ['tag', 'mtag', 'throw', 'pezzo', 'burner', 'rullo', 'tag', 'throw', 'gotico', 'mostro'];
  for (let k = 0; k < 60; k++) { const style = ARG.file && styles[k % styles.length] === 'rullo' ? 'throw' : styles[k % styles.length], x = X0 + .2 + (k * 0.2333) % 14.2, w = WR.npcWork(st, { id: 'n' + k }, { aka: 'PROVA', crew: 'PVK', skill: .6, hand: 7 + k }, style, { x, y: Z0 + .55, face: -Math.PI / 2, place: '' }, { prog: 1, done: true }); if (style === 'mtag' && k % 4 === 0) w.sticker = true; WR._.addWork(st, w); }
  for (let k = 0; k < 12; k++) { R.cam.x = X0 + 7; R.cam.y = Z0 + 4; WR._.scanNear(st, R.cam.x, R.cam.y, { force: true, ms: 1e4 }); tick(); }
  const vs = wallVeils(); let gall = 0, worst = 0; vs.forEach(([w, g]) => { const f = floating(w, g); if (f.bad) gall++; worst = Math.max(worst, f.worst); });
  console.log(`  facciata: ${vs.length} lavori sul muro, ${gall} galleggianti (peggio ${(worst * 100).toFixed(1)} cm)`);
  if (process.env.DBG) vs.slice(0, 4).forEach(([w, g]) => { const m = g.tgt.mesh; console.log(w.style, JSON.stringify(w.gfxRect.c), JSON.stringify(w.gfxRect.n), w.gfxRect.W, w.gfxRect.H, 'mesh', JSON.stringify(m.position), JSON.stringify(m.parent && m.parent.type), floating(w, g)); });
  if (ARG.file) { console.log(`PRIMA: ${gall} galleggianti su ${vs.length}`); process.exit(0); }
  ok(vs.length >= 25, `molti lavori trovano il muro (${vs.length} su 60)`);
  ok(gall === 0, `nessun lavoro galleggia (oltre 2 cm dal muro, oltre lo spigolo, sopra la finestra o l'insegna): ${gall}`);
  ok(vs.every(([w, g]) => { const m = g.tgt.mesh, n = new T.Vector3(0, 0, 1).transformDirection(m.matrixWorld); return n.z > .99; }), 'tutti guardano la strada (la normale del muro)');
  const gm = WR._.galleggia(); ok(gm && gm.gall === 0, `la misura del gioco (Writing._.galleggia) dice lo stesso: ${gm && gm.gall} su ${gm && gm.n}`);
  // 2. IL GIOCATORE SCRIVE SU UN MURO: la camera davanti, il clic al centro
  WR.setMode(st, 'tag'); const p = st.player; p.x = X0 + 11; p.y = Z0 + .9; p.lv = null; p.vehicle = null; p.indoor = null;
  cam.position.set(X0 + 11, 1.6, Z0 + 3.5); cam.lookAt(X0 + 11, 1.5, Z0); cam.updateMatrixWorld(true);
  const r1 = WR.tick(st, .5, .5, 1 / 30, '#d8201a', 0, 'bomboletta'); const mine = W.cur; ok(r1 === true && mine && mine.gfxRect, 'il giocatore comincia una tag sul muro');
  if (mine) { WR.finish(st, mine); WR.release(st); }
  // 3. E SU UN'AUTO: la fiancata (la decalcomania)
  p.x = carX - Math.sin(carA) * 1.6; p.y = carZ + Math.cos(carA) * 1.6; cam.position.set(carX - Math.sin(carA) * 4, 1.2, carZ + Math.cos(carA) * 4); cam.lookAt(carX, .8, carZ); cam.updateMatrixWorld(true);
  const r2 = WR.tick(st, .5, .5, 1 / 30, '#2a6ac8', 3, 'bomboletta'), onCar = W.cur; ok(r2 === true && onCar && onCar.surf === 'auto' && onCar.veh === 'pv_prova', 'e su un\'auto: il lavoro è del mezzo');
  if (onCar) { WR.finish(st, onCar); WR.release(st); }
  tick(2);
  const gCar = onCar && WR.GFX.works[onCar.id];
  ok(gCar && gCar.tgt.decal && gCar.tgt.mesh.parent === car, 'sull\'auto è una decalcomania attaccata al mezzo');
  if (gCar) ok(onBody(gCar) < .01, `la vernice sta sulla carrozzeria (scarto massimo ${(onBody(gCar) * 100).toFixed(2)} cm)`);
  const wallPos = mine && WR.GFX.works[mine.id] && WR.GFX.works[mine.id].tgt.mesh.position.clone();
  // l'auto riparte: la vernice va con lei
  carX += 5; carA = .9; placeCar(car); Object.assign(st.vehicles.find(v => v.id === 'pv_prova'), veh()); tick(2);
  if (gCar) ok(onBody(gCar) < .01, 'l\'auto si sposta e gira: la vernice resta sulla carrozzeria');
  // 4. LONTANO E RITORNO: oltre l'anello (la grafica si libera) e poi di nuovo vicino; nel frattempo i modelli si rifanno
  R.cam.x = X0 + 400; R.cam.y = Z0 + 400; tick(3);
  ok(!WR.GFX.works[mine.id] && !WR.GFX.works[onCar.id], 'lontano: i veli si liberano (la memoria torna)');
  // i settori si scaricano e ricaricano: la facciata è una mesh nuova uguale; il modello dell'auto si rifà
  parts.forEach(o => { scene.remove(o); const c2 = new T.Mesh(o.geometry, mat); c2.position.copy(o.position); scene.add(c2); c2.updateMatrixWorld(true); });
  const car2 = car.clone(true); scene.remove(car); R.__vehicles.pv_prova = car2; scene.add(car2); placeCar(car2);
  R.cam.x = X0 + 7; R.cam.y = Z0 + 4; for (let k = 0; k < 6; k++) { WR._.scanNear(st, R.cam.x, R.cam.y, { force: true, ms: 1e4 }); tick(); }
  const back = WR.GFX.works[mine.id]; ok(back && back.tgt.mesh.position.distanceTo(wallPos) < .005, `tornando, la tag sul muro è lì (${back ? (back.tgt.mesh.position.distanceTo(wallPos) * 1000).toFixed(1) : '-'} mm)`);
  const backC = WR.GFX.works[onCar.id]; ok(backC && backC.tgt.decal && backC.tgt.mesh.parent === car2, 'e quella sull\'auto è sul modello nuovo dell\'auto');
  // 5. RICARICA: una partita nuova legge il salvataggio; i lavori tornano sugli stessi posti (chiave stabile), allineati
  WR._.salva(st); const saved = JSON.parse(MEM.get(WR._.SAVE_KEY) || '{}'); ok(saved.works && saved.works.length === 2, `salvati i tuoi lavori: ${saved.works ? saved.works.length : 0} (${saved.works ? saved.works.map(o => o.anc.k + (o.anc.key ? ' ' + o.anc.key : ' ' + (o.anc.veh || ''))).join(', ') : ''})`);
  { const f = require('path').join(require('os').tmpdir(), 'pv_graffiti_ricarica_' + process.pid + '.json'); require('fs').writeFileSync(f, JSON.stringify({ mem: [...MEM], wall: wallPos.toArray(), car: [carX, carZ, carA] }));
    const out = require('child_process').spawnSync(process.execPath, [__filename, '--seme=' + SEME, '--ricarica=' + f], { encoding: 'utf8' }); require('fs').unlinkSync(f);
    process.stdout.write((out.stdout || '').split('\n').filter(l => /^(ok|NO) /.test(l)).join('\n') + '\n'); if (out.status !== 0) { fail++; if (out.stderr) console.log(out.stderr.slice(-800)); } }
  // 6. LA MEMORIA: il tetto dei veli vivi e le tele riusate
  { const before = WR.GFX.mem.nuove; for (let k = 0; k < 3; k++) { R.cam.x = X0 + 400; tick(2); R.cam.x = X0 + 7; for (let j = 0; j < 4; j++) { WR._.scanNear(st, R.cam.x, R.cam.y, { force: true, ms: 1e4 }); tick(); } }
    ok(WR.GFX.mem.riuso > 0, `le tele dei veli si riusano (${WR.GFX.mem.riuso} riusi, ${WR.GFX.mem.nuove - before} nuove in tre giri)`);
    ok(Object.keys(WR.GFX.works).length <= WR._.VEIL_MAX(), `i veli vivi restano sotto il tetto (${Object.keys(WR.GFX.works).length} ≤ ${WR._.VEIL_MAX()})`); }
  // 7. LA TAVOLETTA: per un campione di superfici, il centro e gli angoli dell'anteprima cadono sulla superficie toccata
  WR.setMode(st, 'tavoletta');
  const samples = [
    { nome: 'muro, al centro', eye: [X0 + 11.5, 1.7, Z0 + 4], at: [X0 + 11.5, 1.6, Z0], drag: [.62, .4] },
    { nome: 'muro, trascinato sopra il tetto e oltre lo spigolo', eye: [X0 + 12.5, 1.7, Z0 + 5], at: [X0 + 13, 2.6, Z0], drag: [.98, .02] },
    { nome: 'muro, sotto con la terra davanti', eye: [X0 + 10.5, 1.6, Z0 + 3], at: [X0 + 10.5, .7, Z0], drag: [.6, .75] },
    { nome: 'pavimento (la strada)', eye: [X0 + 3, 2.5, Z0 + 9], at: [X0 + 3, 0, Z0 + 6], drag: [.6, .7], flat: true },
    { nome: 'auto, fianco', eye: null, car: 'side', drag: [.56, .55] },
    { nome: 'auto, tetto', eye: null, car: 'top', drag: [.55, .5] },
  ];
  for (const S0 of samples) {
    WR._.TAV.a = null; WR._.TAV.b = null; p.lv = null;
    const cg = R.__vehicles.pv_prova, c = Math.cos(carA), s = Math.sin(carA);
    if (S0.car === 'side') { cam.position.set(carX - s * 4, 1.4, carZ + c * 4); cam.lookAt(carX, .7, carZ); p.x = carX - s * 2.5; p.y = carZ + c * 2.5; }
    else if (S0.car === 'top') { cam.position.set(carX - s * 2.5, 4.2, carZ + c * 2.5); cam.lookAt(carX, 1.2, carZ); p.x = carX - s * 2.5; p.y = carZ + c * 2.5; }
    else { cam.position.set(...S0.eye); cam.lookAt(...S0.at); p.x = S0.eye[0]; p.y = S0.eye[2] - 1; }
    cam.updateMatrixWorld(true);
    WR.tick(st, .5, .5, 1 / 30, '#d8201a', 0, 'bomboletta'); WR.tick(st, S0.drag[0], S0.drag[1], 1 / 30, '#d8201a', 0, 'bomboletta');
    const A = WR._.TAV.a; if (!A) { ok(false, `tavoletta, ${S0.nome}: niente superficie`); continue; }
    if (process.env.DBG) { const r0 = WR._.tavRect(); console.log('RAW', JSON.stringify(r0), 'fit', JSON.stringify(WR._.fitWall(new T.Vector3(r0.c.x, r0.c.y, r0.c.z), A.n, r0.W, r0.H, visMeshes(), { minK: .05, free: true, noOpen: true, foot: 0 }))); }
    const Rc = WR._.tavFit(WR._.tavRect(), A), K = WR._.tavCam(Rc, A), oc = new T.OrthographicCamera(-K.halfW, K.halfW, K.halfH, -K.halfH, K.near, K.far);
    oc.position.set(K.pos.x, K.pos.y, K.pos.z); oc.up.set(K.up.x, K.up.y, K.up.z); oc.lookAt(K.target.x, K.target.y, K.target.z); oc.updateMatrixWorld(true); oc.updateProjectionMatrix();
    const L = visMeshes(), shoot = (u, v) => { rc.setFromCamera(new T.Vector2(u, v), oc); rc.near = K.near; rc.far = K.far; return rc.intersectObjects(L, true)[0]; };
    const h0 = shoot(0, 0), sameObj = h => { if (!h) return false; let o = h.object; while (o) { if (o === A.obj || (A.veh && o === cg)) return true; o = o.parent; } return S0.flat ? h.object === ground : !A.veh && parts.some(q => q.geometry === h.object.geometry); };
    if (process.env.DBG) console.log(S0.nome, h0 && h0.distance, h0 && h0.object.type, h0 && sameObj(h0), JSON.stringify(K), JSON.stringify(A.n));
    const corners = [[-.92, -.92], [.92, -.92], [-.92, .92], [.92, .92]].map(([u, v]) => shoot(u, v));
    ok(h0 && sameObj(h0) && h0.point.distanceTo(new T.Vector3(K.target.x, K.target.y, K.target.z)) < (A.veh ? .2 : .03), `tavoletta, ${S0.nome}: il centro dell'anteprima è sulla superficie (${Rc.W.toFixed(2)} × ${Rc.H.toFixed(2)} m)`);
    ok(corners.every(h => h && (S0.flat || A.veh ? true : sameObj(h))), `tavoletta, ${S0.nome}: gli angoli non guardano il cielo`);
  }
  WR._.TAV.a = null; WR.setMode(st, 'libero');
  ok(!WR.GFX.err, 'nessun errore nel giro dei graffiti' + (WR.GFX.err ? ': ' + WR.GFX.err.message : ''));
  console.log(fail ? `\n${fail} prove NON passate` : '\ntutte le prove passate');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
// 5. RICARICA (in un processo nuovo, come la pagina ricaricata): una partita nuova legge il salvataggio; i lavori tornano sugli
// stessi posti (la chiave stabile), allineati
function ricarica() {
  const wallPos = new T.Vector3().fromArray(RIC.wall), W2 = WR.S(st), again = W2.works.filter(w => w.by === 'player'); ok(again.length === 2, `ricaricando la pagina ci sono ancora: ${again.length}`);
  for (let k = 0; k < 6; k++) { WR._.scanNear(st, R.cam.x, R.cam.y, { force: true, ms: 1e4 }); tick(); }
  const wW = again.find(w => w.surf === 'muro'), wC = again.find(w => w.surf === 'auto'), gW = wW && WR.GFX.works[wW.id], gC = wC && WR.GFX.works[wC.id];
  ok(gW && gW.tgt.mesh.position.distanceTo(wallPos) < .005, `la tag sul muro è allineata (${gW ? (gW.tgt.mesh.position.distanceTo(wallPos) * 1000).toFixed(1) : '-'} mm)`);
  ok(gC && gC.tgt.decal && gC.tgt.mesh.parent === car && onBody(gC) < .01, `quella sull'auto è sulla carrozzeria (scarto ${gC ? (onBody(gC) * 100).toFixed(2) : '-'} cm)`);
  { const f = gW ? floating(wW, gW) : { bad: 1 }; ok(!f.bad, 'e non galleggia'); }
  process.exit(fail ? 1 : 0);
}
