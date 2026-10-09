// prova dello skate: posti, tavola, spinta, ollie, grind, quarter, cadute, la linea e chi guarda
global.World = require('./world.js'); global.Interior = require('./interiors.js');
global.Game = require('./game.js'); global.Risacca = require('./risacca.js'); global.Popolo = require('./popolo.js'); global.Azioni = require('./azioni.js');
global.Economia = require('./economia.js'); global.Fazioni = require('./fazioni.js'); global.Soldi = require('./soldi.js'); global.Oggetti = require('./oggetti.js');
global.Livelli = require('./livelli.js'); global.Sottosuolo = require('./sottosuolo.js'); global.Skate = require('./skate.js');
const G = Game, SK = Skate, st = G.create(1), p = st.player, TS = G.TS;
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };
const DT = 1 / 30, run = (s, sk) => { for (let i = 0; i < s * 30; i++) { G.step(st, DT, { x: 0, y: 0, sk: Object.assign({ push: false, brake: false, turn: 0, crouch: false }, typeof sk === 'function' ? sk(i) : sk) }); if (!p.sk.on) break; } };
const fresh = () => { p.stun = 0; p.kbx = p.kby = 0; p.hp = 100; st.skate.line = null; st.skate.lastLine = null; };
// mette il giocatore a terra nel posto, a (du, dv) dal pezzo P, in tavola verso l'asse del pezzo (+ da)
const clear = () => st.npcs.forEach(n => { if (Math.hypot(n.x - p.x, n.y - p.y) < 25) { n.x = p.x + 60; n.y = p.y; n.path = []; } });   // niente passanti fra i piedi nelle prove
const at = (P, du, dv, da, V) => { const c = Math.cos(P.ang), s = Math.sin(P.ang); p.x = P.x + du * c - dv * s; p.y = P.y + du * s + dv * c; fresh(); clear(); SK.mount(st, true); Object.assign(p.sk, { yaw: P.ang + (da || 0), V: V || 0, z: SK.surface(p.x, p.y) }); };
const pop = (flick, hold) => i => ({ crouch: i < (hold || 10), flick });

console.log('posti:', SK.SPOTS.map(s => `${s.id}@${s.x.toFixed(0)},${s.y.toFixed(0)} (${s.pieces.length} pezzi)`).join(' | '));
ok(SK.SPOTS.length >= 5, `posti piazzati: ${SK.SPOTS.length} su 6`);
const blocked = [...SK._.MINE].filter(i => G.tileAt(i % G.GW, Math.floor(i / G.GW)) === G.T.BLD).length;
ok(blocked === SK._.MINE.size && blocked > 0, `le caselle dei posti sono ingombro per gli NPC (${blocked})`);
const cap = SK.SPOTS.find(s => s.id === 'capannone'), cul = SK.SPOTS.find(s => s.id === 'cultura');
ok(!!cap && !!cul, 'Capannone e Piazzale della Cultura ci sono');

// la tavola: X vicino alla tavola appoggiata
p.x = cul.board.x; p.y = cul.board.y; ok(SK.key(st) && st.skate.owned && SK.on(st), 'X prende la tavola e si sale');
SK.dismount(st, true); ok(!SK.on(st) && SK.key(st) && SK.on(st), 'X scende e risale');

// spinta: a colpi, fino a ~7 m/s
const rail = cul.pieces.find(q => q.k === 'rail');
at(rail, -5.5, -1.5, 0, 0); run(1.9, { push: true });
ok(p.sk.V > 4 && p.sk.V < 8.5, `la spinta porta a ${p.sk.V.toFixed(1)} m/s`);
const v0 = p.sk.V; at(rail, -5.5, -1.5, 0, v0); run(1.5, {}); ok(p.sk.V < v0 && p.sk.V > 0, `senza spingere rallenta (${v0.toFixed(1)} → ${p.sk.V.toFixed(1)})`);

// ollie in piano: si torna a terra puliti, la linea si chiude con i punti
at(rail, -5.5, -1.5, 0, 5); run(1.2, pop('ollie', 8)); ok(SK.on(st) && !p.sk.air, 'ollie: atterrato');
run(2.6, {}); ok(st.skate.total > 0, `linea chiusa: ${st.skate.total} punti`);

// grind sulla sbarra: ollie poco prima, allineati
at(rail, -4.4, 0, 0, 5.2); let grinded = false;
for (let i = 0; i < 60; i++) { run(DT, i < 6 ? { crouch: true } : {}); if (i === 6) run(DT, { crouch: false, flick: 'ollie' }); if (p.sk.grind) grinded = true; }
ok(grinded, 'ollie sulla sbarra: 50-50');
ok(SK.on(st), 'uscito dalla sbarra in piedi');
run(3, {}); ok(st.skate.lastLine && st.skate.lastLine.tricks.some(t => /50-50|Crooked/.test(t)), `linea: ${st.skate.lastLine && st.skate.lastLine.tricks.join(' + ')}`);

// kickflip troppo basso (Spazio appena toccato) → caduta
at(rail, -5.5, -1.5, 0, 4); run(1, i => ({ crouch: i < 1, flick: '' })); // pop col gesto vuoto: ollie basso
at(rail, -5.5, -1.5, 0, 4); p.sk.trick = null; run(.05, { crouch: true }); run(1.2, { crouch: false, flick: "tre" });
ok(!SK.on(st) && /trick|basso/i.test((st.skate.lastLine || {}).why || ''), `360 flip senza altezza: caduto (${(st.skate.lastLine || {}).why})`);
// kickflip con la carica piena: chiuso
at(rail, -5.5, -1.5, 0, 4); run(.4, { crouch: true }); run(1.3, { crouch: false, flick: 'kick' });
ok(SK.on(st) && st.skate.line && st.skate.line.tricks.some(t => /Kickflip/.test(t)), 'kickflip caricato: chiuso');

// quarter del Capannone: si sale, si vola dritti, si ricade dentro
const q = cap.pieces.find(x => x.k === 'quarter');
at(q, -6, 0, 0, 7.5); let top = 0, vert = false;
for (let i = 0; i < 150 && SK.on(st); i++) { run(DT, {}); top = Math.max(top, p.sk.z); if (p.sk.vert) vert = true; }
ok(vert && top > q.H + .1, `quarter: aria verticale (quota massima ${top.toFixed(2)} m, la rampa è ${q.H})`);
ok(SK.on(st) && p.sk.V > 0 && Math.abs(Math.atan2(Math.sin(p.sk.yaw - q.ang - Math.PI), Math.cos(p.sk.yaw - q.ang - Math.PI))) < .5, 'ricaduto dentro, girato verso il basso');

// contro il muro veloce → caduta, poi si rialza in tavola
const fb = cap.pieces.find(x => x.k === 'funbox'); fresh();
at(fb, 0, -fb.W / 2 - 1.2, Math.PI / 2, 6); run(1, {});
ok(!SK.on(st), `contro il fianco del funbox a 6 m/s: ${(st.skate.lastLine || {}).why || '?'}`);
for (let i = 0; i < 90; i++) G.step(st, DT, { x: 0, y: 0 });
ok(SK.on(st), 'dopo la caduta si torna sulla tavola');

// piscina: si entra dal bordo e si risale con la velocità
const bw = (SK.SPOTS.find(s => s.id === 'piscina') || { pieces: [] }).pieces[0];
if (bw) { at(bw, -bw.A - .7, 0, 0, 3); const z0 = p.sk.z; let low = 9; for (let i = 0; i < 120 && SK.on(st); i++) { run(DT, {}); low = Math.min(low, p.sk.z); } ok(z0 > 1.6 && low < .2, `nella vasca: dal bordo a ${z0.toFixed(2)} m giù fino a ${low.toFixed(2)} m`); ok(SK.on(st), 'vasca: ancora in tavola');
  const bk = bw.spot.pieces.find(x => x.k === 'bank'); at(bk, -2.5, 0, 0, 7); run(1.2, {}); ok(p.sk.z > 1.2 || p.sk.air, `la rampa porta sul bordo della vasca (quota ${p.sk.z.toFixed(2)})`); }

// scendere dentro un posto: si finisce fuori dalle caselle d'ingombro
at(fb, 0, 0, 0, 0); SK.dismount(st, true); const ti = Math.floor(p.y / TS) * G.GW + Math.floor(p.x / TS);
ok(!SK._.MINE.has(ti) && G.walkM(p.x, p.y), 'sceso dalla tavola sul funbox: a piedi fuori dal posto');

// chi guarda: una linea grossa davanti a qualcuno diventa un fatto
const n = st.npcs.find(k => !k.dead && !k.inside && !k.cop); SK.mount(st, true); n.x = p.x + 3; n.y = p.y; n.face = Math.PI; n.inside = false;
st.skate.line = { tricks: ['Kickflip', '50-50 3.0 m', 'Air'], pts: 400, t: st.clock }; SK._.closeLine(st);
ok(st.events.some(e => e.type === 'numero'), 'linea da 1200: nasce il fatto «numero»');
ok(n.mem.some(m => m.type === 'numero'), `${n.first} se lo ricorda: «${G.rumorText(st, n.mem.find(m => m.type === 'numero'))}»`);

// il gioco va avanti senza errori con la tavola sotto i piedi
for (let i = 0; i < 300; i++) G.step(st, DT, { x: 0, y: 0, sk: { push: i % 40 < 20, turn: i % 90 < 30 ? 1 : 0 } });
ok(true, 'dieci secondi di giro libero senza errori');
console.log(fail ? `\n${fail} prove fallite` : '\ntutto a posto');
process.exit(fail ? 1 : 0);
