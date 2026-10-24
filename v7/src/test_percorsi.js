// [percorsi] prova della rete dei percorsi del level designer (percorsi.js, W.percorsi) sulla città nuova:
//   1. la rete: i tre dominanti (Rua, Vittoria, Corso), i secondari che li legano, i tratti;
//   2. le scorciatoie sono davvero più corte (almeno del 30%) della strada misurata; gli altri vicoli sono nascondigli;
//   3. i circuiti sui tetti sono percorribili DAVVERO, col motore del gioco (game.js, livelli.js, tetti.js): si sale dalla scala,
//      si passa ogni passaggio (tetto, gradino col salto, salto del vicolo, passerella, scala fra tetti), si scende dall'altra parte;
//      il camminamento delle mura di tramontana si percorre da una scala all'altra;
//   4. ogni porta della città ha la sua alternativa (i tetti, percorsi davvero, o due tombini collegati sotto terra, uno per parte);
//   5. ogni tratto ha un punto di richiamo davanti, non coperto, e nel borgo a meno di 60 m.
// cd v7/src && node test_percorsi.js
const path = require('path'), src = __dirname;
const log = console.log, warn = console.warn; console.log = () => {}; console.warn = () => {};
global.World = require(path.join(src, 'world_cittanuova.js'));
global.Percorsi = require(path.join(src, 'percorsi.js'));
global.Interior = require(path.join(src, 'interiors.js')); global.Game = require(path.join(src, 'game.js'));
global.Risacca = require(path.join(src, 'risacca.js')); global.Popolo = require(path.join(src, 'popolo.js')); global.Azioni = require(path.join(src, 'azioni.js'));
global.Livelli = require(path.join(src, 'livelli.js')); global.Sottosuolo = require(path.join(src, 'sottosuolo.js')); global.Tetti = require(path.join(src, 'tetti.js'));
console.log = log; console.warn = warn;
const G = Game, T = Tetti, LV = Livelli, PC = Percorsi, D = PC.dati, B = G.BUILDINGS, TS = G.TS, GW = G.GW, hyp = Math.hypot;
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };
const C = PC.conteggio();
console.log('rete', JSON.stringify(C));

// ---------------- 1. la rete ----------------
const per = id => D.percorsi.find(p => p.id === id);
ok(['rua', 'vittoria', 'corso'].every(id => per(id) && per(id).k === 'dominante'), 'i tre percorsi dominanti: Rua Maestra, Via della Vittoria, Corso');
ok(C.secondari >= 5, `i percorsi secondari che li legano (${D.percorsi.filter(p => p.k === 'secondario').map(p => p.id).join(', ')})`);
ok(D.tratti.length >= 20 && D.tratti.every(t => t.pts.length >= 2 && t.L > 3), `i tratti (${D.tratti.length})`);
ok(D.tratti.filter(t => t.borgo).every(t => t.L <= 46), 'nel borgo nessun tratto oltre 45 m (gomiti, nodi, vista)');
// ogni secondario tocca un dominante o un altro secondario (la rete è legata)
const tocca = (P, Q) => P.some(a => Q.some(b => hyp(a[0] - b[0], a[1] - b[1]) < 6));
ok(D.percorsi.filter(p => p.k === 'secondario').every(p => D.percorsi.some(q => q !== p && tocca(p.pts, q.pts))), 'ogni secondario si lega a un altro percorso');

// ---------------- 2. scorciatoie e nascondigli ----------------
const SC = D.scorciatoie.filter(s => s.k === 'scorciatoia'), NA = D.scorciatoie.filter(s => s.k === 'nascondiglio');
const vicoli = G.MAP.world.roads.filter(r => /^vic_/.test(r.id));
ok(D.scorciatoie.length === vicoli.length, `ogni vicolo è una scorciatoia o un nascondiglio (${SC.length} + ${NA.length} = ${vicoli.length})`);
ok(SC.length >= 10, `le scorciatoie ci sono (${SC.length})`);
ok(SC.every(s => s.Lstrada && s.L <= .7 * s.Lstrada), 'ogni scorciatoia è almeno il 30% più corta della strada');
// la strada misurata è vera: calpestabile, e non passa dal vicolo (lontano dai capi)
const strVera = SC.every(s => { const P = s.strada; if (!P || P.length < 2) return false; let L = 0; for (let k = 1; k < P.length; k++) L += hyp(P[k][0] - P[k - 1][0], P[k][1] - P[k - 1][1]);
  return L >= s.L * 1.3 && P.every(([x, y]) => G.walkM(x, y)); });
ok(strVera, 'la strada di confronto è calpestabile e lunga quanto dichiarato');
console.log('     guadagni: ' + SC.map(s => `${s.nome} ${Math.round(s.L)}/${Math.round(s.Lstrada)} m (−${Math.round(100 * s.guadagno)}%)`).join(' · '));
ok(NA.every(s => s.cieco || s.guadagno < .3), 'i nascondigli: vicoli ciechi o che non accorciano');

// ---------------- 3. i circuiti sui tetti, col motore ----------------
const st = G.create(1), p = st.player, DT = 1 / 30;
const run = (s, inp) => { for (let i = 0; i < s * 30; i++) G.step(st, DT, Object.assign({ x: 0, y: 0 }, typeof inp === 'function' ? inp(i) : inp)); };
const calm = () => { p.hp = 100; p.stun = 0; p.kbx = p.kby = 0; st.police = []; st.heat = 0; p.speed = 0; p.jz = 0; p.jvz = 0; p.jcharge = null; };
const clear = () => st.npcs.forEach(n => { if (hyp(n.x - p.x, n.y - p.y) < 30) { n.x = p.x + 120; n.y = p.y; n.path = []; } });
const roofAt = (b, x, y) => { const q = T.roofAt(x, y); return q && q.bi === b ? q.h : T.roofRule(B[b]); };
function sali(L) { p.lv = null; p.indoor = null; p.vehicle = null; p.x = L.fx; p.y = L.fy; calm(); clear(); const m = LV.key(st, 'v'); run(Math.max(3, 8), {}); return !!(p.lv && p.lv.k === 'tetto' && p.lv.b === L.bi) || m; }
function scendi(L) { p.x = L.tx; p.y = L.ty; calm(); clear(); LV.key(st, 'v'); run(9, {}); return !p.lv && hyp(p.x - L.fx, p.y - L.fy) < .3; }
// un passaggio da a a b: si parte sul tetto a, poco prima del punto, e si va nel verso del passaggio (col salto se serve)
function passa(e) {
  if (e.k === 'scala') { const L = T.LADDERS[e.i], up = e.a === L.footB; p.lv = { k: 'tetto', b: e.a, h: up ? roofAt(e.a, L.fx, L.fy) : roofAt(e.a, L.tx, L.ty) }; p.x = up ? L.fx : L.tx; p.y = up ? L.fy : L.ty; calm(); clear();
    T.climb(st, L, up); run(9, {}); return p.lv && p.lv.k === 'tetto' && p.lv.b === e.b && p.hp === 100; }
  const PK = e.k === 'passerella' ? T.PLANKS[e.i] : null;   // [tetti4] sulle assi che entrano meno (case di una casella) si parte più vicino al bordo
  const ux = e.ux, uy = e.uy, back = e.k === 'salto' ? 2.2 : e.k === 'passerella' ? (PK && PK.pin ? PK.gap / 2 + (e.a === PK.b ? (PK.pinB || PK.pin) : PK.pin) + .3 : 3.4) : e.k === 'gradino' ? .55 : 1.2;
  p.x = e.x - ux * back; p.y = e.y - uy * back; p.lv = { k: 'tetto', b: e.a, h: roofAt(e.a, p.x, p.y) }; calm(); clear(); T.settle(st);
  if (!(p.lv && p.lv.b === e.a)) return false;
  if (e.k === 'salto' || e.k === 'gradino') { G.jumpHold(st, true); run(.7, {}); G.jumpHold(st, false); }
  for (let k = 0; k < 5 * 30 && !(p.lv && p.lv.b === e.b && !(p.jz > 0)); k++) G.step(st, DT, { x: ux, y: uy, sprint: e.k === 'salto' });
  run(.4, {}); return !!(p.lv && p.lv.k === 'tetto' && p.lv.b === e.b) && p.hp === 100;
}
function percorri(c) {
  const L0 = T.LADDERS[c.sali], L1 = T.LADDERS[c.scendi], esito = [];
  esito.push(sali(L0) && p.lv && p.lv.b === L0.bi ? 'su' : 'NOsu');
  (c.passi || []).forEach(e => esito.push(passa(e) ? e.k : 'NO' + e.k + '(' + B[e.a].id + '→' + B[e.b].id + ')'));
  p.lv = { k: 'tetto', b: L1.bi, h: roofAt(L1.bi, L1.tx, L1.ty) };
  esito.push(scendi(L1) ? 'giù' : 'NOgiù'); return esito;
}
// [mappa_compatta] passo 9: la regola dei tetti non cambia, il grafo si rigenera sulle case basse; si contano i passaggi nel borgo
{ const E = T.grafo(), k = {}; let nb = 0; E.forEach(L => L.forEach(e => { const b = B[e.a], x = (b.x + b.w / 2) * TS, y = (b.y + b.h / 2) * TS; if (!(x > D.borgo.x0 && x < D.borgo.x1 && y > D.borgo.y0 && y < D.borgo.y1)) return; nb++; k[e.k] = (k[e.k] || 0) + 1; }));
  console.log('grafo dei tetti nel borgo', nb, JSON.stringify(k));
  // [cucitura] la Vittoria viva ha il fronte sud a 2 piani (lato camera) invece della cortina del regime a 3: i gradini fra la cortina e il
  // borgo dietro si sono appiattiti (prima 25 gradini e 16 salti, ora ~18 e ~8); i giri sui tetti restano tutti
  ok((k.salto || 0) + (k.gradino || 0) >= 24 && (k.tetto || 0) >= 600, `il borgo basso si gira sui tetti: ${k.tetto || 0} passi a pari, ${k.gradino || 0} gradini, ${k.salto || 0} salti (prima: 854, 18, 12)`); }
const giri = D.circuiti.filter(c => c.k === 'tetti'), borgo = (x, y) => x > D.borgo.x0 && x < D.borgo.x1 && y > D.borgo.y0 && y < D.borgo.y1;
ok(giri.filter(c => !c.fuoriBorgo).length >= 3 && giri.filter(c => !c.fuoriBorgo).every(c => borgo(c.pts[0][0], c.pts[0][1])), `almeno tre giri sui tetti nel borgo (${giri.length})`);
ok(giri.some(c => c.id === 'giro_mercato'), 'il giro del Mercato sui tetti dell\'Ottocento ([mappa_compatta])');
giri.forEach(c => { const L0 = T.LADDERS[c.sali], L1 = T.LADDERS[c.scendi], es = percorri(c), crema = c.passi.filter(e => e.k === 'salto' || e.k === 'passerella' || e.k === 'scala').length;
  ok(!es.some(s => /^NO/.test(s)) && crema >= 1 && hyp(L0.fx - L1.fx, L0.fy - L1.fy) >= 14, `${c.nome}: ${Math.round(c.L)} m, ${c.edifici.length} tetti, ${crema} passaggi crema; sale e scende da un'altra parte (${Math.round(hyp(L0.fx - L1.fx, L0.fy - L1.fy))} m): ${es.join(' ')}`); });   // [cucitura] 14 m: le case dell'Ottocento a nord della Vittoria fanno isolati corti
// [ordine] le mura di tramontana lungo i binari non ci sono più (doppia divisione con la massicciata): nessun camminamento, nessun giro
ok(!D.circuiti.some(c => c.k === 'mura') && !T.CAMM.some(c => c.tipo === 'mura_tramontana'), 'niente mura di tramontana accanto alla ferrovia');

// ---------------- 4. le porte della città e la loro alternativa ----------------
ok(D.porte.length >= 5 && ['porta_terra', 'sottoportico', 'sottopasso', 'scala_pescatori', 'posto_blocco'].every(id => D.porte.some(q => q.id === id)), 'le cinque porte: Porta di Terra, sottoportico, sottopasso, scala dei pescatori, posto di blocco');
ok(D.porte.some(q => q.id === 'passaggio_livello'), 'la sesta porta: il passaggio a livello ([mappa_compatta])');
['stazione', 'scalo', 'baracche', 'radio', 'covo'].forEach(id => ok(D.nodi.some(n => n.id === id), `il nodo nuovo: ${id} ([mappa_compatta])`));
['officina', 'baracche', 'mura', 'stazione'].forEach(id => ok(D.percorsi.some(q => q.id === id), `il secondario: ${id} ([mappa_compatta])`));
['gru_porto', 'torre_acqua'].forEach(t => ok(D.landmark.some(q => q.tipo === t), `il landmark nuovo: ${t} ([mappa_compatta])`));
const SO = Sottosuolo.TPL, ug = SO.ug;
const sottoterra = (a, b) => { const s = Math.floor(a[1] / TS) * GW + Math.floor(a[0] / TS), t = Math.floor(b[1] / TS) * GW + Math.floor(b[0] / TS), seen = new Set([s]), Q = [s];
  for (let k = 0; k < Q.length; k++) { const i = Q[k]; if (i === t) return true; for (const d of [1, -1, GW, -GW]) { const j = i + d; if (!seen.has(j) && ug[j]) { seen.add(j); Q.push(j); } } } return false; };
D.porte.forEach(Pt => {
  const A = Pt.alternativa; if (!A) { ok(false, `${Pt.nome}: nessuna alternativa`); return; }
  const [a, z] = Pt.lati, ux = z[0] - a[0], uy = z[1] - a[1], lato = (x, y) => Math.sign((x - Pt.x) * ux + (y - Pt.y) * uy);
  if (A.k === 'porta') { const Q = D.porte.find(q => q.id === A.porta);   // [mappa_compatta] l'altra porta che passa lo stesso ostacolo (il sottopasso per il passaggio a livello)
    ok(Q && Q.id !== Pt.id && hyp(Q.x - Pt.x, Q.y - Pt.y) < 80 && Q.alternativa && Q.alternativa.k !== 'porta', `${Pt.nome}: l'alternativa è ${A.nome}, a ${Q ? Math.round(hyp(Q.x - Pt.x, Q.y - Pt.y)) : '?'} m`); return; }
  if (A.k === 'tombino') { const pa = SO.portals.find(P => hyp((P.s[0] + .5) * TS - A.entra[0], (P.s[1] + .5) * TS - A.entra[1]) < .1), pz = SO.portals.find(P => hyp((P.s[0] + .5) * TS - A.esce[0], (P.s[1] + .5) * TS - A.esce[1]) < .1);
    ok(pa && pz && lato(...A.entra) !== lato(...A.esce) && sottoterra(A.entra, A.esce), `${Pt.nome}: l'alternativa è sotto terra (${A.via}), un'apertura per parte, collegate`); return; }
  const L0 = T.LADDERS[A.sali], L1 = T.LADDERS[A.scendi], es = [];
  if (A.camm) { p.lv = null; p.x = L0.fx; p.y = L0.fy; calm(); clear(); LV.key(st, 'v'); run(9, {}); es.push(p.lv && p.lv.k === 'tetto' ? 'su' : 'NOsu');
    for (let k = 0; k < 15 * 30 && hyp(p.x - L1.tx, p.y - L1.ty) > .6; k++) { const dx = L1.tx - p.x, dy = L1.ty - p.y, d = hyp(dx, dy); G.step(st, DT, { x: dx / d, y: dy / d }); if (!p.lv) break; }
    es.push(p.lv ? 'sopra' : 'NOcaduto'); LV.key(st, 'v'); run(9, {}); es.push(!p.lv && hyp(p.x - L1.fx, p.y - L1.fy) < .3 ? 'giù' : 'NOgiù'); }
  else es.push(...percorri(A));
  ok(lato(L0.fx, L0.fy) !== lato(L1.fx, L1.fy) && !es.some(s => /^NO/.test(s)), `${Pt.nome}: l'alternativa è ${A.nome}, da una parte all'altra (${es.join(' ')})`);
});

// ---------------- 5. i punti di richiamo ----------------
const senza = D.tratti.filter(t => !t.richiamo); ok(!senza.length, 'ogni tratto ha il suo punto di richiamo');
const davanti = t => { const [ax, ay] = t.pts[0], r = t.richiamo; let a = Math.abs(Math.atan2(r.y - ay, r.x - ax) - t.sguardo); if (a > Math.PI) a = 2 * Math.PI - a; return Number.isFinite(t.sguardo) && a <= .62; };   // lo sguardo di chi cammina: verso il tratto a 10 m
// la vista ricontrollata con le quote dei tetti di tetti.js (la regola dei piani) e dei pezzi grandi
const coperto = t => { const [ax, ay] = t.pts[0], r = t.richiamo; return !PC.vista(ax, ay, PC.occhio(ax, ay), r.x, r.y, r.z, r.r || 1); };
const brutti = D.tratti.filter(t => t.richiamo && (!davanti(t) || coperto(t) || (t.borgo && t.richiamo.d > 60)));
if (process.env.V) brutti.forEach(t => console.log(t.id, JSON.stringify(t.pts.map(q => q.map(Math.round))), JSON.stringify(t.richiamo), t.sguardo, davanti(t), coperto(t)));
ok(!brutti.length, 'ogni richiamo sta davanti, non è coperto, nel borgo è a meno di 60 m' + (brutti.length ? ': ' + brutti.map(t => t.id + ' ' + t.richiamo.k).join(', ') : ''));
const kinds = {}; D.tratti.forEach(t => kinds[t.richiamo.k] = (kinds[t.richiamo.k] || 0) + 1);
ok(kinds.landmark >= 3 && kinds.mare >= 2 && kinds.luce >= 2, `i richiami sono di più tipi: ${JSON.stringify(kinds)}`);
ok(D.tratti.filter(t => t.borgo).length >= 15, `i tratti del borgo con la regola dei 60 m (${D.tratti.filter(t => t.borgo).length})`);
// i landmark: la Rua parte guardando la Porta o il campanile, la Vittoria punta la Porta della Rocca
ok(D.tratti.filter(t => t.percorso === 'vittoria').some(t => /Rocca/.test(t.richiamo.nome)), 'la Vittoria punta il cannocchiale sulla Porta della Rocca');

console.log(fail ? `\n${fail} prove non passate` : '\ntutte le prove passate');
process.exit(fail ? 1 : 0);
