// [graffiti] prova dello strumento di selezione (seleziona.js), senza browser, su una scena finta come test_graffiti.js:
//   - la lettura dei piani: una facciata con una finestra (il vano), una porta e una vetrina con la saracinesca abbassata, un muretto, un'auto;
//   - i candidati: sul muro (fuori dalla finestra, dalla porta e dall'insegna, sui triangoli veri), sulla saracinesca, sul muretto, sull'auto
//     ferma (non su quella che corre), per terra; un muretto davanti copre la facciata dietro;
//   - la cornice: sul piano della superficie, della misura del riquadro, l'etichetta con la misura e il tipo;
//   - ◄ ► cambia posto (e torna), ▲ ▼ la misura; il tocco su un'altra cornice la sceglie;
//   - il salvataggio sul posto scelto (tavSave2: le regole di sempre, la volante dei Grigi alza il calore), la decalcomania sul mezzo;
//   - L'ATLANTE DEI MEZZI: i lavori finiti su tre auto in UNA mesh (un disegno), le matrici dei mezzi la portano dove sono; un mezzo
//     fuori scena sparisce; la vernice resta sulla carrozzeria quando l'auto si muove;
//   - i tempi: l'interrogazione sotto 1 ms (qui; sul telefono ~3-5 volte), la lettura a fette sotto il suo tetto.
//   node test_seleziona.js
const SEME = 777;
{ let a = SEME >>> 0; Math.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function fakeCanvas(w, h) {
  const c = { width: w || 1, height: h || 1 }; const st = {};
  const ctx = new Proxy(st, { get: (t, k) => k === 'canvas' ? c : k === 'measureText' ? s => ({ width: String(s).length * 20 }) : k === 'getImageData' || k === 'createImageData' ? (a, b, W, H) => ({ data: new Uint8ClampedArray(Math.max(1, (W || a || 1) * (H || b || 1)) * 4) }) : k in t ? t[k] : () => { }, set: (t, k, v) => { t[k] = v; return true; } });
  c.getContext = () => ctx; return c;
}
const MEM = new Map();
global.localStorage = { getItem: k => MEM.has(k) ? MEM.get(k) : null, setItem: (k, v) => MEM.set(k, String(v)), removeItem: k => MEM.delete(k) };
global.document = { createElement: () => fakeCanvas(1, 1), getElementById: () => null, readyState: 'complete', body: { appendChild() { } } };
global.window = global; global.addEventListener = () => { }; global.removeEventListener = () => { };
global.requestAnimationFrame = () => { };
global.THREE = require('./three.min.js');
global.Pennelli = { art: w => { const Wp = Math.max(1, Math.round(w.W * 100)), Hp = Math.max(1, Math.round(w.H * 100)); return { stages: [fakeCanvas(Wp, Hp)], paths: [[[1, 1]]], radii: [5], Wp, Hp, ppm: 100 }; }, PENNELLI: {} };
global.World = require('./world.js'); global.Interior = require('./interiors.js');
global.Game = require('./game.js'); global.Risacca = require('./risacca.js'); global.Popolo = require('./popolo.js'); global.Azioni = require('./azioni.js');
global.Economia = require('./economia.js'); global.Fazioni = require('./fazioni.js'); global.Soldi = require('./soldi.js'); global.Oggetti = require('./oggetti.js');
global.Graffiti = require('./graffiti.js'); global.Livelli = require('./livelli.js'); global.Sottosuolo = require('./sottosuolo.js'); global.Tetti = require('./tetti.js');
global.Writing = require('./writing.js'); global.Seleziona = require('./seleziona.js');
Tetti.feetH = () => 0;
const G = Game, WR = Writing, SE = Seleziona, T = THREE;
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };

// ---- la scena, lontano dalla città, il suolo a 0 ----
const X0 = 30, Z0 = 30, scene = new T.Scene(), mat = new T.MeshLambertMaterial({ color: '#c8c0b0' }), metal = new T.MeshLambertMaterial({ color: '#7a7a78' }), glass = new T.MeshLambertMaterial({ color: '#88aacc', transparent: true, opacity: .35 });
const box = (w, h, d, x, y, z, m) => { const o = new T.Mesh(new T.BoxGeometry(w, h, d), m || mat); o.position.set(X0 + x, y, Z0 + z); scene.add(o); o.updateMatrixWorld(true); return o; };
const ground = new T.Mesh(new T.PlaneGeometry(200, 200), mat); ground.rotation.x = -Math.PI / 2; ground.position.set(X0, 0, Z0); scene.add(ground); ground.updateMatrixWorld(true);
// LA FACCIATA (fronte verso +z, filo a z = 0, da x = 0 a 16, alta 3,6 m): a x 2-3 la finestra (un vano da y 1,2 a 2,5, il fondo a 25 cm),
// a x 5-6 la porta (un vano da 0 a 2,1), a x 9-12 la vetrina (un vano da 0 a 2,4, col vetro) con la saracinesca abbassata 4,5 cm davanti
const P = [];
P.push(box(2, 3.6, 1, 1, 1.8, -.5), box(1, 1.2, 1, 2.5, .6, -.5), box(1, 1.1, 1, 2.5, 3.05, -.5), box(1, 1.3, .6, 2.5, 1.85, -.7));   // la finestra
P.push(box(2, 3.6, 1, 4, 1.8, -.5), box(1, 1.5, 1, 5.5, 2.85, -.5), box(1, 2.1, .6, 5.5, 1.05, -.7));   // la porta
P.push(box(3, 3.6, 1, 7.5, 1.8, -.5), box(3, 1.2, 1, 10.5, 3, -.5), box(3, 2.4, .6, 10.5, 1.2, -.7), box(3, 2.4, .02, 10.5, 1.2, -.12, glass));   // la vetrina (col vetro)
P.push(box(4, 3.6, 1, 14, 1.8, -.5));
const SAR = box(3.03, 2.36, .03, 10.5, 1.2, .045 - .015, metal); SAR.userData.rc = 'saracinesca';   // la saracinesca abbassata: la faccia a 4,5 cm dal muro
const APER = [{ x: X0 + 2.5, z: Z0, ux: 1, uz: 0, nx: 0, nz: 1, hw: .5, y0: 1.2, y1: 2.5, tipo: 'finestra' }, { x: X0 + 5.5, z: Z0, ux: 1, uz: 0, nx: 0, nz: 1, hw: .5, y0: 0, y1: 2.1, tipo: 'porta' },
  { x: X0 + 10.5, z: Z0, ux: 1, uz: 0, nx: 0, nz: 1, hw: 1.5, y0: 0, y1: 2.4, tipo: 'finestra' }, { x: X0 + 10.5, z: Z0, ux: 1, uz: 0, nx: 0, nz: 1, hw: 1.8, y0: 2.4, y1: 3.55, tipo: 'insegna' }];
// IL MURETTO (alto 1 m, lungo 6, fronte verso +z a z = 14) e un secondo muro alto 3 m dietro di lui (z = 12)
const MUR = box(6, 1, .3, 30, .5, 14 - .15), DIETRO = box(6, 3, .4, 30, 1.5, 12 - .2);
// LE AUTO: tre parcheggiate (una è la volante), una che corre
function auto(name) { const g = new T.Group(); g.name = name; const body = new T.Mesh(new T.BoxGeometry(4.2, .8, 1.7), mat); body.position.y = .65; g.add(body); const cab = new T.Mesh(new T.BoxGeometry(2.2, .5, 1.5), mat); cab.position.set(-.2, 1.3, 0); g.add(cab); return g; }
const CARS = { a1: [X0 + 6, Z0 + 30, .3], a2: [X0 + 16, Z0 + 30, 0], pol: [X0 + 26, Z0 + 30, -.2], corre: [X0 + 40, Z0 + 30, 0] }, VG = {};
const placeCar = (id) => { const [x, z, a] = CARS[id], g = VG[id]; g.position.set(x, 0, z); g.rotation.set(0, -a, 0); g.updateMatrixWorld(true); };
for (const id in CARS) { VG[id] = auto(id); scene.add(VG[id]); placeCar(id); }
const cam = new T.PerspectiveCamera(50, .56, .05, 500);
const visMeshes = () => { const L = []; scene.traverseVisible(o => { if (o.isMesh && !o.userData.velo) L.push(o); }); return L; };
// un renderer finto: quanto basta all'atlante (WebGL2, le copie sulla scheda sono niente)
const GL = new Proxy({}, { get: (t, k) => typeof k === 'string' && /^[A-Z_0-9]+$/.test(k) ? 1 : () => { } });
const renderer = { capabilities: { isWebGL2: true, maxTextureSize: 4096 }, getContext: () => GL, properties: { get: () => ({ __webglTexture: {} }) }, state: { bindTexture() { } }, getRenderTarget: () => null, setRenderTarget() { }, getClearColor: c => c, getClearAlpha: () => 1, setClearColor() { }, clear() { } };
const R = { groundH: () => 0, __bmb: { bmbCands: () => visMeshes() }, __models: { scene, renderer }, __vehicles: VG, getCamera: () => cam, aperture: () => APER, cam: { x: X0 + 6, y: Z0 + 4 }, phone: false, res: { h: 844 } };
let st = G.create(SEME); st.vehicles = st.vehicles.filter(v => v.kind === 'bmx');
const kinds = { a1: 'cinquecento', a2: 'ritmo', pol: 'polizia', corre: 'giulia' };
for (const id in CARS) st.vehicles.push({ id, kind: kinds[id], x: CARS[id][0], y: CARS[id][1], ang: CARS[id][2], speed: id === 'corre' ? 8 : 0, police: id === 'pol' });
global.__pv = { R, st, ui: {}, touchMode: true, mouse: { active: false }, toast: m => { TOASTS.push(m); } }; const TOASTS = [];
WR.GFX.train = { grp: new T.Group(), cars: [] }; WR.GFX.noRail = true;
const p = st.player; const inv = Oggetti.inv(st); inv.bomboletta = 20; p.hand = 'bomboletta'; WR.setMode(st, 'tavoletta');
// il personaggio in (x, z) che guarda verso la; la camera dietro come camera7 (6,6 m, 4,4 su)
function metti(x, z, face) { p.x = x; p.y = z; p.face = face; p.lv = null; p.vehicle = null; p.indoor = null; const fx = Math.cos(face), fz = Math.sin(face); cam.position.set(x - fx * 6.6, 4.4, z - fz * 6.6); cam.lookAt(x + fx * 1.2, 1.1, z + fz * 1.2); cam.updateMatrixWorld(true); cam.updateProjectionMatrix(); }
const leggi = () => { let n = 0; for (let k = 0; k < 400; k++) { SE._.coda(p.x, p.y); n += SE._.lavora(5); if (!SE.misura().inCoda) break; } return n; };
const rc = new T.Raycaster();
// il riquadro sta sulla superficie? una griglia 5 × 4 di raggi lungo la normale: tutti colpiscono l'oggetto atteso entro tol dal piano
function sulla(C, obj, tol) { const L = visMeshes(); let bad = 0; for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) { const u = (i / 4 - .5) * .94 * C.W, v = (j / 3 - .5) * .94 * C.H, o = new T.Vector3(C.cx + C.rx * u + C.nx * .6, C.cy + v, C.cz + C.rz * u + C.nz * .6); rc.set(o, new T.Vector3(-C.nx, 0, -C.nz)); rc.near = 0; rc.far = 1.5;
  const h = rc.intersectObjects(L, true).find(h => !(h.object.material && h.object.material.transparent)); let q = h && h.object, inObj = false; while (q) { if (q === obj || (Array.isArray(obj) && obj.includes(q))) { inObj = true; break; } q = q.parent; } if (!h || !inObj || Math.abs(h.distance - .6) > tol) bad++; } return bad; }
const fuoriAperture = C => APER.filter(a => a.tipo !== 'finestra' || a.hw < 1).every(a => Math.abs(C.cx - a.x) > a.hw + C.W / 2 - .01 || C.cy + C.H / 2 < a.y0 + .01 || C.cy - C.H / 2 > a.y1 - .01 || Math.abs(C.cz - a.z) > .3);

(async () => {
  // 1. LA LETTURA DEI PIANI
  metti(X0 + 7.5, Z0 + 2.2, -Math.PI / 2);
  const t0 = Date.now(), nl = leggi(), M0 = SE.misura();
  ok(nl > 10 && M0.piani > 10, `la lettura: ${M0.meshLette} mesh, ${M0.piani} piani, ${M0.celle} celle, ${M0.msLettura} ms in tutto (${Date.now() - t0} ms veri)`);
  const facc = [...SE._.IDX.values()].flat().filter(pz => pz.nz > .99 && Math.abs(pz.d - Z0) < .02);
  ok(facc.length >= 1, `la facciata è un piano (z = 0): ${facc.length} piani, tipo ${[...new Set(facc.map(q => q.kind))].join(', ')}`);
  const sarP = [...SE._.IDX.values()].flat().find(pz => pz.m === SAR && pz.nz > .99);
  ok(sarP && sarP.kind === 'saracinesca', `la saracinesca è un piano a sé, a ${sarP ? ((sarP.d - Z0) * 100).toFixed(1) : '-'} cm dal muro: ${sarP && sarP.kind}`);
  const vetro = [...SE._.IDX.values()].flat().some(pz => pz.m && pz.m.material === glass);
  ok(!vetro, 'il vetro della vetrina non è una superficie');

  // 2. IL MURO: davanti alla facciata, a 2,2 m
  WR._.tavSize(0, 'throw'); let n = SE.cerca(st, 'throw', 'muro'), L = SE.candidati;
  const C1 = L.find(C => !C.flat && C.nz > .99 && Math.abs(C.cz - Z0) < .05 && C.kind !== 'saracinesca');
  ok(n >= 2 && C1, `davanti alla facciata: ${n} candidati, il muro ${C1 ? C1.W.toFixed(2) + ' × ' + C1.H.toFixed(2) + ' m a x ' + (C1.cx - X0).toFixed(2) : 'no'} (${L.map(C => C.kind + ' ' + C.W.toFixed(1) + '×' + C.H.toFixed(1)).join(', ')})`);
  if (C1) { ok(sulla(C1, P, .02) === 0, 'il riquadro sul muro sta tutto sui triangoli veri (5 × 4 raggi, entro 2 cm)'); ok(fuoriAperture(C1), 'e fuori dalla finestra, dalla porta e dall\'insegna');
    ok(C1.cy - C1.H / 2 >= .1 && C1.cy + C1.H / 2 <= 2.76, `nella fascia della mano: da ${(C1.cy - C1.H / 2).toFixed(2)} a ${(C1.cy + C1.H / 2).toFixed(2)} m`); }
  // tutti i candidati sul muro fuori dalle aperture, sui triangoli veri
  { const ws = L.filter(C => !C.flat && !C.veh && C.kind !== 'saracinesca' && C.nz > .99 && Math.abs(C.cz - Z0) < .05); ok(ws.every(C => fuoriAperture(C) && sulla(C, P, .02) === 0), `tutti i ${ws.length} riquadri sulla facciata: sui triangoli e fuori dai vani`); }
  // un burner: non ci sta fra le aperture: il più grande che ci sta (lo dice)
  { SE.cerca(st, 'burner', 'muro'); const B = SE.candidati.find(C => !C.flat && !C.veh && C.nz > .99 && Math.abs(C.cz - Z0) < .05 && C.kind !== 'saracinesca'); ok(B && (B.giu || B.W < 6.5), `il burner non ci sta: ci sta ${B ? B.W.toFixed(1) + ' × ' + B.H.toFixed(1) + (B.giu ? ' (' + B.giu + ')' : '') : 'niente'}`); }

  // 3. LA SARACINESCA: davanti alla vetrina
  metti(X0 + 10.5, Z0 + 1.8, -Math.PI / 2); leggi(); n = SE.cerca(st, 'throw', 'muro'); L = SE.candidati;
  const CS = L.find(C => C.kind === 'saracinesca');
  ok(CS && L[0] === CS, `davanti alla vetrina chiusa la prima scelta è la saracinesca (${L.slice(0, 3).map(C => C.kind).join(', ')})`);
  if (CS) ok(sulla(CS, SAR, .02) === 0 && Math.abs(CS.cz - (Z0 + .045)) < .01, `il riquadro sta sulla saracinesca (z ${((CS.cz - Z0) * 100).toFixed(1)} cm), ${CS.W.toFixed(2)} × ${CS.H.toFixed(2)} m`);

  // 4. IL MURETTO (e il muro dietro, coperto dal muretto in basso)
  metti(X0 + 30, Z0 + 15.6, -Math.PI / 2); leggi(); n = SE.cerca(st, 'tag', 'muro'); L = SE.candidati;
  const CM = L.find(C => C.kind === 'muretto');
  ok(CM && sulla(CM, MUR, .02) === 0, `il muretto alto un metro: ${CM ? 'una tag ' + CM.W.toFixed(2) + ' × ' + CM.H.toFixed(2) : 'no'} (${L.map(C => C.kind).join(', ')})`);
  const dietro = L.filter(C => C.pz && C.pz.m === DIETRO);
  ok(dietro.every(C => C.cy - C.H / 2 > .95), `il muro dietro il muretto: solo sopra il muretto (${dietro.map(C => (C.cy - C.H / 2).toFixed(2)).join(', ') || 'nessuno'})`);

  // 5. LE AUTO: ferma sì (il fianco), quella che corre no
  { const [x, z, a] = CARS.a1, nx = -Math.sin(a), nz = Math.cos(a); metti(x + nx * 2.2, z + nz * 2.2, Math.atan2(-nz, -nx)); leggi(); n = SE.cerca(st, 'tag', 'muro'); L = SE.candidati;
    const CA = L.find(C => C.veh === 'a1'); ok(CA && L[0] === CA, `accanto all'auto ferma la prima scelta è il fianco (${L.slice(0, 3).map(C => C.kind + (C.veh ? ':' + C.veh : '')).join(', ')})`);
    if (CA) ok(sulla(CA, VG.a1, .45) === 0, `il riquadro sta sul fianco (${CA.W.toFixed(2)} × ${CA.H.toFixed(2)} m)`); }
  { const [x, z] = CARS.corre; metti(x, z + 2.2, -Math.PI / 2); n = SE.cerca(st, 'tag', 'muro'); ok(!SE.candidati.some(C => C.veh === 'corre') && (SE.misura().scartati.inMoto || 0) >= 1, 'l\'auto che corre non si sceglie'); }

  // 6. LA CORNICE, ◄ ► e ▲ ▼ (col giro di writing.js, come nel gioco)
  metti(X0 + 7.5, Z0 + 2.2, -Math.PI / 2); WR._.tavSize(0, 'throw'); SE._.SEL.t = 0; WR._.frame();
  const H = WR._.TAV.hov, CR = SE._.CR, S0 = SE.scelto;
  ok(H && H.ok && H.sel && S0, `la cornice: ${H && H.ok ? H.kind + ' ' + H.Rc.W.toFixed(2) + ' × ' + H.Rc.H.toFixed(2) : 'no'}`);
  if (S0 && CR.g) { const e = CR.g.matrix.elements; ok(CR.g.visible && Math.abs(e[12] - S0.cx) < .03 && Math.abs(e[14] - (S0.cz + S0.nz * .012)) < .01 && Math.abs(e[8] - S0.nx) < 1e-6 && Math.abs(e[10] - S0.nz) < 1e-6, 'sul piano della superficie (centro e normale)');
    ok(Math.abs(CR.fill.scale.x - S0.W) < 1e-6 && Math.abs(CR.fill.scale.y - S0.H) < 1e-6, `della misura del riquadro (${S0.W.toFixed(2)} × ${S0.H.toFixed(2)})`);
    ok(/THROW-UP/.test(CR.labTxt) && /MURO|SARACINESCA/.test(CR.labTxt) && /►/.test(CR.labTxt), `l'etichetta: «${CR.labTxt.replace(/\|/g, ' / ')}»`);
    const pos = CR.bord.geometry.attributes.position.array; let mn = 9, mx = -9; for (let i = 0; i < CR.bord.geometry.drawRange.count; i++) { mn = Math.min(mn, pos[i * 3]); mx = Math.max(mx, pos[i * 3]); }
    ok(mx - mn > S0.W && mx - mn < S0.W + .5, `il bordo spesso attorno al riquadro (${(mx - mn).toFixed(2)} m)`); ok(CR.ghost.visible, 'gli altri posti a filo bianco'); }
  { const k0 = SE.scelto && SE.scelto.k, Nc = SE.candidati.length; SE.passo('dx'); const k1 = SE.scelto && SE.scelto.k; WR._.frame(); const k1b = SE.scelto && SE.scelto.k;
    ok(Nc > 1 && k1 && k1 !== k0 && k1b === k1, `► cambia posto e la scelta resta (${Nc} posti)`); for (let i = 1; i < Nc; i++) SE.passo('dx'); ok(SE.scelto && SE.scelto.k === k0, '► tante volte quanti i posti: si torna al primo');
    SE.passo('sx'); SE.passo('dx'); ok(SE.scelto && SE.scelto.k === k0, '◄ poi ►: lo stesso posto');
    SE.passo('su'); WR._.frame(); ok(WR._.TAV.size === 'pezzo' && SE.scelto && (SE.scelto.size === 'pezzo' || SE.scelto.giu), `▲ la misura: ${WR._.TAV.size} (${SE.scelto ? SE.scelto.W.toFixed(1) + ' × ' + SE.scelto.H.toFixed(1) : '-'})`); SE.passo('giu'); WR._.frame(); ok(WR._.TAV.size === 'throw', '▼ torna a throw-up'); }
  // il tocco dentro un'altra cornice la sceglie
  { const L2 = SE.candidati, j = L2.findIndex((C, i) => i !== SE._.SEL.i); const C = L2[j], v = new T.Vector3(C.cx, C.cy, C.cz).project(cam); const r = SE.tocca((v.x + 1) / 2, (1 - v.y) / 2); ok(r !== false && SE.scelto === C, 'il tocco su un\'altra cornice la sceglie'); }
  // la bomboletta tenuta: la levetta sceglie
  { const k0 = SE.scelto.k; SE.presa = true; SE.levetta(.9, 0); SE.levetta(0, 0); ok(SE.scelto.k !== k0, 'tenendo la bomboletta, una spinta della levetta cambia posto'); SE.presa = false; }

  // la terra: col tasto Terra la prima scelta è il selciato davanti ai piedi
  { const wk = G.walkT; G.walkT = () => true; metti(X0 + 60, Z0 + 20, 0); SE.cerca(st, 'throw', 'terra'); G.walkT = wk;   /* (la scena finta sta fuori dalla mappa: qui la si fa percorribile) */ const C = SE.candidati[0]; ok(C && C.kind === 'terra' && C.flat && Math.abs(C.cy) < .05, `per terra: ${C ? C.kind + ' ' + C.W.toFixed(1) + ' × ' + C.H.toFixed(1) : 'niente'}`); }
  // fermo, la scelta non si rifà a ogni fotogramma (al più ogni 90 ms se ti muovi, ogni 600 ms se no)
  { metti(X0 + 7.5, Z0 + 2.2, -Math.PI / 2); SE._.SEL.t = 0; SE.tick(st, 'throw', 'muro'); const q0 = SE.misura().interrogazioni, t0 = Date.now(); let n = 0; while (Date.now() - t0 < 300) { SE.tick(st, 'throw', 'muro'); n++; }
    const dq = SE.misura().interrogazioni - q0; ok(dq <= 1, `fermo: ${n} fotogrammi in 300 ms, ${dq} interrogazioni`); }
  // 7. I TEMPI
  { const T0 = SE.misura().interrogazioni; metti(X0 + 7.5, Z0 + 2.2, -Math.PI / 2); for (let i = 0; i < 300; i++) { p.x = X0 + 4 + (i % 30) * .3; p.face = -Math.PI / 2 + Math.sin(i) * .4; SE.cerca(st, ['tag', 'throw', 'pezzo', 'burner'][i % 4], 'muro'); }
    const M = SE.misura(); ok(M.ms.p95 < 1, `l'interrogazione: mediana ${M.ms.mediana} ms, 95° ${M.ms.p95} ms, massimo ${M.ms.max} ms (${M.interrogazioni - T0} interrogazioni; sul telefono ~3-5 volte)`);
    // UNA VIA FINTA, piena come il borgo: due file di 12 case da 6 m (tre piani, finestre a vano, porte, zoccolo), 40 cassonetti e pali
    { const via = [], Mv = mat, Z1 = Z0 + 120; let nB = 0;
      for (const side of [-1, 1]) for (let k = 0; k < 12; k++) { const x0 = X0 + k * 6, zf = Z1 + side * 4;   // il fronte a z = zf, che guarda la via (z = Z1)
        for (let f = 0; f < 3; f++) { const y0 = f * 3; for (let wv = 0; wv < 3; wv++) { const xa = x0 + wv * 2; const hole = !(f === 0 && wv === 1);
          via.push(box(.6, 3, .4, xa + .3 - X0, y0 + 1.5, zf - side * .2 - Z0, Mv), box(.6, 3, .4, xa + 1.7 - X0, y0 + 1.5, zf - side * .2 - Z0, Mv));
          if (hole) { via.push(box(.8, 1, .4, xa + 1 - X0, y0 + .5, zf - side * .2 - Z0, Mv), box(.8, .6, .4, xa + 1 - X0, y0 + 2.7, zf - side * .2 - Z0, Mv), box(.8, 1.4, .1, xa + 1 - X0, y0 + 1.7, zf - side * .35 - Z0, Mv)); }
          else via.push(box(.8, .8, .4, xa + 1 - X0, y0 + 2.6, zf - side * .2 - Z0, Mv), box(.8, 2.2, .1, xa + 1 - X0, y0 + 1.1, zf - side * .35 - Z0, Mv)); } }
        via.push(box(6, .4, .03, x0 + 3 - X0, .2, zf + side * .015 - Z0, Mv)); nB++; }
      for (let k = 0; k < 40; k++) via.push(box(1, 1.2, .8, (k * 1.83) % 70, .6, Z1 - Z0 + ((k % 2) ? 2.6 : -2.6), Mv));
      const r0 = SE.misura(); for (let x = X0; x <= X0 + 72; x += 6) { metti(x, Z1, -Math.PI / 2); leggi(); } const r1 = SE.misura();
      const tq = []; for (let i = 0; i < 400; i++) { p.x = X0 + 2 + (i % 66); p.y = Z1 + ((i % 3) - 1) * 1.2; p.face = (i % 2 ? 1 : -1) * Math.PI / 2 + Math.sin(i) * .5; let best = 1e9; for (let r = 0; r < 3; r++) { const t = process.hrtime.bigint(); SE.cerca(st, ['tag', 'throw', 'pezzo', 'burner'][i % 4], 'muro'); best = Math.min(best, Number(process.hrtime.bigint() - t) / 1e6); } tq.push(best); }   // il migliore di tre (la macchina delle prove è carica: gli altri processi rubano il tempo)
      tq.sort((a, b) => a - b); const q = f => tq[Math.floor(tq.length * f)].toFixed(3);
      // lungo la via, ogni 3 m: c'è sempre un posto sulla facciata davanti (il piano fatto di tanti pezzi è uno solo)
      let fronte = 0, tot = 0; const facc = new Set(); for (let x = X0 + 3; x < X0 + 69; x += 3) for (const sd of [-1, 1]) { p.x = x; p.y = Z1; p.face = sd * Math.PI / 2; leggi(); SE.cerca(st, 'throw', 'muro'); tot++; const C = SE.candidati.find(C => Math.abs(C.nz + sd) < .05 && C.kind !== 'muretto' && C.kind !== 'oggetto'); if (C) { fronte++; facc.add(C.k.split(':').slice(0, 2).join(':')); }
        else if (process.env.DBG) console.log('manca2', (x - X0).toFixed(0), sd, JSON.stringify(SE.misura().scartati), SE.candidati.map(C => C.kind + ' ' + C.nz.toFixed(1) + ' ' + C.W.toFixed(1) + 'x' + C.H.toFixed(1) + ' ' + C.d.toFixed(1)).join(', '));
        else if (process.env.DBG) console.log('manca', (x - X0).toFixed(0), sd, [...SE._.IDX.values()].flat().filter((pz, i, A) => A.indexOf(pz) === i && Math.abs(pz.nz + sd) < .05 && Math.abs(pz.nx * p.x + pz.nz * p.y - pz.d) < 7).map(pz => [(pz.nx * p.x + pz.nz * p.y - pz.d).toFixed(2), (pz.rx * p.x + pz.rz * p.y - pz.u0).toFixed(1), pz.W, pz.H, pz.run, pz.col, pz.y0.toFixed(2), pz.kind].join(' ')).join(' | ')); }
      ok(fronte >= tot * .8 && facc.size <= 6, `lungo la via (ogni 3 m, i due lati): un posto sulla facciata davanti ${fronte} volte su ${tot}, su ${facc.size} piani (fatti di tanti pezzi, guardati insieme)`);
      ok(+q(.95) < 1, `una via piena (${nB} case, ${via.length} mesh, ${r1.piani - r0.piani} piani nuovi, ${r1.kb} KB): l'interrogazione mediana ${q(.5)} ms, 95° ${q(.95)} ms (400 posti, il migliore di tre; ${SE.candidati.length} candidati)`);
      via.forEach(o => scene.remove(o)); }
    // la lettura a fette resta nel tetto: una mesh grande (60.000 triangoli)
    const big = new T.Mesh(new T.PlaneGeometry(40, 3, 200, 150), mat); big.position.set(X0 + 70, 1.5, Z0); scene.add(big); big.updateMatrixWorld(true); metti(X0 + 70, Z0 + 2, -Math.PI / 2);
    SE._.coda(p.x, p.y); const D = []; for (let k = 0; k < 4000 && SE.misura().inCoda; k++) { const t = process.cpuUsage(); SE._.lavora(1.2); const u = process.cpuUsage(t); D.push(u.user / 1000); } D.sort((a, b) => a - b);   // il tempo della CPU (la macchina delle prove è carica: il tempo vero conta anche gli altri)
    const q = f => D[Math.min(D.length - 1, Math.floor(D.length * f))];
    ok(q(.5) < 2, `la lettura di una mesh da 60.000 triangoli a fette: ${D.length} fotogrammi, mediana ${q(.5).toFixed(2)} ms, 90° ${q(.9).toFixed(2)} ms, il più lungo ${D[D.length - 1].toFixed(1)} ms (tetto 1,2 ms + una fetta di 256 triangoli; il più lungo è il raccoglitore di Node)`); scene.remove(big); }

  // 8. SI DIPINGE: sul posto scelto (la tavoletta salva; qui il salvataggio della tavoletta, tavSave2), sull'auto e sulla volante
  const strokes = { strokes: [[[2, 2, 0, .5], [80, 30, 10, .5]]], st: [{ c: '#c42a22', p: 'fat', w: 20 }], frame: { w: 100, h: 50 }, pen: 'fat' };
  const dipingi = (id) => { const [x, z, a] = CARS[id], nx = -Math.sin(a), nz = Math.cos(a); metti(x + nx * 2.2, z + nz * 2.2, Math.atan2(-nz, -nx)); SE._.SEL.t = 0; SE._.SEL.manual = false; WR._.frame(); const H = WR._.TAV.hov; if (!H || !H.ok || H.A.veh !== id) return null;
    const Rc = WR._.tavFit2(H.Rc, H.A) || H.Rc; const W = WR.S(st), n0 = W.works.length, h0 = W.heat || 0; const r = WR._.tavSave2(st, Rc, H.A, strokes); return { r, w: W.works[W.works.length - 1], nuovi: W.works.length - n0, dh: (W.heat || 0) - h0 }; };
  const d1 = dipingi('a1'); ok(d1 && d1.r.ok && d1.w.surf === 'auto' && d1.w.veh === 'a1', `sull'auto scelta: il lavoro è del mezzo (${d1 ? d1.w.style + ' ' + d1.w.W.toFixed(2) + ' × ' + d1.w.H.toFixed(2) : 'no'})`);
  // il padrone dell'auto ti vede: se la prende (la vista è quella del gioco; qui, fuori dalla mappa, la si dà per buona)
  const sp = G.seesPlayer; G.seesPlayer = () => true; st.vehicles.find(v => v.id === 'a2').owner = 'pad1'; st.npcs.push({ id: 'pad1', name: 'Tonino', x: CARS.a2[0] + 3, y: CARS.a2[1] + 4, face: 0 });
  const d2 = dipingi('a2'); G.seesPlayer = sp; st.npcs = st.npcs.filter(n => n.id !== 'pad1');
  ok(d2 && d2.w.padrone === 'pad1' && d2.dh >= 2, `il padrone dell'auto ti ha visto: se la prende (calore +${d2 ? d2.dh : '-'})`);
  const d3 = dipingi('pol');
  ok(d3 && d3.w.cop && d3.dh >= 6, `sulla volante dei Grigi: il lavoro lo sa (cop) e il calore sale di ${d3 ? d3.dh : '-'}`);
  // L'ATLANTE DEI MEZZI: qualche giro, i lavori finiti passano dai veli alla mesh dei mezzi
  for (let k = 0; k < 6; k++) WR._.frame();
  const VA = WR._.VATL, gw = [d1, d2, d3].filter(Boolean).map(d => WR.GFX.works[d.w.id]);
  ok(VA.P && gw.length === 3 && gw.every(g => g && g.tgt && g.tgt.vatl), `i tre lavori sui mezzi sono nell'atlante dei mezzi (${gw.map(g => g && g.tgt ? (g.tgt.vatl ? 'atlante' : g.tgt.decal ? 'velo' : '?') : 'niente').join(', ')})`);
  const vm = VA.P && VA.P.MG[0].mesh, vg = vm && vm.geometry;
  const disegni = (() => { let n = 0; scene.traverseVisible(o => { if ((o.isMesh || o.isInstancedMesh) && o.userData.velo && (o.userData.wr != null || o === vm) && o.visible) n++; }); return n; })();
  ok(vm && vm.visible && vg.attributes.aVeh && disegni === 1, `tre auto dipinte, un disegno (${disegni}): ${vg ? vg.attributes.position.count : 0} vertici con l'indice del mezzo`);
  ok(VA.slot.size === 3 && !scene.getObjectByProperty('type', 'Mesh') !== null, `tre mezzi nella tabella (${[...VA.slot.keys()].join(', ')})`);
  // le matrici: il vertice nel mondo = la matrice del mezzo × il vertice del mezzo; resta sulla carrozzeria quando l'auto si muove
  const sulCorpo = (id) => { const s = VA.slot.get(id), U = VA.U.value[s.i], P0 = vg.attributes.position, A = vg.attributes.aVeh, v = new T.Vector3(); let worst = 0, n = 0;
    for (let i = 0; i < P0.count; i++) { if (A.getX(i) !== s.i) continue; v.fromBufferAttribute(P0, i).applyMatrix4(U); const l = VG[id].worldToLocal(v.clone()); const dB = Math.max(Math.abs(l.x) - 2.1, Math.abs(l.y - .65) - .4, Math.abs(l.z) - .85); if (process.env.DBG && Math.abs(dB) > .01) console.log(id, l.toArray().map(q => q.toFixed(3))); worst = Math.max(worst, Math.abs(dB)); n++; } return { worst, n }; };
  WR._.vatlMatrici(); let sc = sulCorpo('a1'); ok(sc.n > 0 && sc.worst < .01, `la vernice sta sulla carrozzeria (${sc.n} vertici, scarto ${(sc.worst * 100).toFixed(2)} cm)`);
  CARS.a1 = [X0 + 9, Z0 + 33, 1.1]; placeCar('a1'); Object.assign(st.vehicles.find(v => v.id === 'a1'), { x: CARS.a1[0], y: CARS.a1[1], ang: CARS.a1[2] }); WR._.frame(); WR._.vatlMatrici(); sc = sulCorpo('a1');
  ok(sc.worst < .01, `l'auto si sposta e gira: la vernice va con lei (scarto ${(sc.worst * 100).toFixed(2)} cm)`);
  VG.a2.visible = false; WR._.vatlMatrici(); { const s = VA.slot.get('a2'); ok(s && VA.U.value[s.i].elements.slice(0, 15).every(x => x === 0), 'un mezzo che non si vede: la sua matrice è nulla (i suoi triangoli spariscono)'); } VG.a2.visible = true;
  // il mezzo esce dal traffico: il lavoro lascia l'atlante (il posto si libera), torna come velo quando torna il mezzo
  { scene.remove(VG.a2); WR._.frame(); const g = WR.GFX.works[d2.w.id]; ok(!g && !VA.slot.has('a2'), 'il mezzo esce di scena: il lavoro lascia l\'atlante e il posto nella tabella'); scene.add(VG.a2); placeCar('a2');
    for (let k = 0; k < 4; k++) { WR._.scanNear(st, p.x, p.y, { force: true, ms: 1e4 }); WR._.frame(); } const g2 = WR.GFX.works[d2.w.id]; ok(g2 && g2.tgt && (g2.tgt.vatl || g2.tgt.decal), `il mezzo torna: il lavoro torna (${g2 && g2.tgt ? (g2.tgt.vatl ? 'nell\'atlante' : 'velo') : 'no'})`); }

  // la pulizia: una mesh uscita di scena lascia l'indice quando sei lontano
  { const n0 = SE.misura().piani; scene.remove(MUR); metti(X0 + 200, Z0 + 200, 0); SE._.SEL.t = 0; await new Promise(r => setTimeout(r, 2100)); SE.tick(st, 'tag', 'muro');
    const resta = [...SE._.IDX.values()].flat().filter(pz => pz.m === MUR).length; ok(resta === 0 && SE.misura().piani < n0, `il muretto tolto dalla scena: i suoi piani lasciano l'indice (${n0} → ${SE.misura().piani})`); scene.add(MUR); }
  // 9. SPENTO: la scelta col dito sparisce col mouse (il puntatore vince)
  { global.__pv.touchMode = false; global.__pv.mouse = { active: true, nx: .5, ny: .5 }; WR._.TAV.hov = null; WR._.frame(); ok(!SE._.CR.g.visible, 'col mouse la cornice è quella del puntatore (la selezione si spegne)'); global.__pv.touchMode = true; global.__pv.mouse = { active: false }; }
  ok(!WR.GFX.err, 'nessun errore nel giro dei graffiti' + (WR.GFX.err ? ': ' + WR.GFX.err.message : ''));
  console.log(fail ? `\n${fail} prove NON passate` : '\ntutte le prove passate');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
