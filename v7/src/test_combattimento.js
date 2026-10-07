// Prova del combattimento: armi, sparatorie in piazza, eventi nella memoria, panico, polizia e carjacking.
// Portato dalla radice il 7/10/2026 sulla mappa v7. Uso (dalla cartella src): node test_combattimento.js [seme]
global.World = require('./world.js'); global.Interior = require('./interiors.js');
global.Game = require('./game.js');
const G = Game, seed = +process.argv[2] || 11;
const st = G.create(seed); const p = st.player;
let bad = false;
function run(sec, inp) { for (let i = 0; i < sec * 30; i++) G.step(st, 1 / 30, inp || { x: 0, y: 0 }); st.npcs.forEach(n => { if (!isFinite(n.x)) bad = true; }); }
run(3);
// pistola al molo
G.giveWeapon(st, 'pistola', 30); G.switchWeapon(st, 'pistola');
const molo = G.PLACES.molo; p.x = molo.x; p.y = molo.y; run(.2);
console.log('armi', Object.keys(p.arms), p.cur, JSON.stringify(p.arms.pistola));
// spara in piazza vicino a gente (se la piazza è vuota, dal primo civile fuori)
const pz = G.PLACES.piazza; p.x = pz.x; p.y = pz.y + 2; run(.1);
let civ = st.npcs.filter(n => !n.inside && !n.dead && !n.cop && !n.faction);
let near = civ.map(n => ({ n, d: Math.hypot(n.x - p.x, n.y - p.y) })).sort((a, b) => a.d - b.d)[0];
if (!near || near.d > 14) { p.x = near.n.x - 8; p.y = near.n.y; run(.1); civ = st.npcs.filter(n => !n.inside && !n.dead && !n.cop && !n.faction); }
const tgt = civ.map(n => ({ n, d: Math.hypot(n.x - p.x, n.y - p.y) })).sort((a, b) => a.d - b.d).find(o => o.d < 14);
console.log('bersaglio', tgt && tgt.n.name, tgt && tgt.d.toFixed(1));
if (tgt) { for (let k = 0; k < 6; k++) { const a = Math.atan2(tgt.n.y - p.y, tgt.n.x - p.x); G.fire(st, a, null, true); run(.25); } console.log('hp', tgt.n.hp.toFixed(0), 'dead', tgt.n.dead); }
run(1);
console.log('eventi', st.events.slice(0, 5).map(e => e.type + ':' + G.knowers(st, e.id).length).join(' '));
console.log('panico', st.npcs.filter(n => n.panic > 0).length, 'wanted', G.wanted(st));
run(40);
console.log('dopo 40s wanted', G.wanted(st), 'cops', st.npcs.filter(n => n.cop).map(n => n.first + ':' + n.action.name + ':' + n.alert.toFixed(2)).join(' '), 'hp player', p.hp.toFixed(0), 'reinf', !!st.reinf);
run(30);
console.log('dopo 70s wanted', G.wanted(st), 'cops', st.npcs.filter(n => n.cop).map(n => n.first + ':' + n.action.name + (n.dead ? '(morto)' : '')).join(' '), 'hp', p.hp.toFixed(0), 'veicoli', st.vehicles.map(v => v.id + (v.wreck ? 'x' : '')).join(','));
console.log(st.log.slice(0, 10).map(l => l.text).join('\n'));
// traffico e carjacking
const st2 = G.create(5); const p2 = st2.player;
for (let i = 0; i < 60; i++) G.step(st2, 1 / 30, { x: 0, y: 0 });
const car = st2.vehicles.find(v => v.traffic);
p2.x = car.x + Math.cos(car.ang) * 5; p2.y = car.y + Math.sin(car.ang) * 5;   // davanti, sulla traiettoria
for (let i = 0; i < 120; i++) G.step(st2, 1 / 30, { x: 0, y: 0 });
console.log('auto ferma?', car.speed.toFixed(1)); p2.x = car.x; p2.y = car.y - 1.6;
console.log(G.act(st2, 'veicolo').msg, p2.vehicle);
for (let i = 0; i < 60; i++) G.step(st2, 1 / 30, { x: 1, y: 0, aim: 0 });
console.log('auto', car.x.toFixed(1), car.y.toFixed(1), car.speed.toFixed(1), 'automobilista', st2.npcs.filter(n => n.driver).map(n => n.action.name + ' mem ' + n.mem.length).join(' '));
// esplosione: la macchina rubata presa a fucilate brucia e salta
G.giveWeapon(st2, 'pistola', 100); G.switchWeapon(st2, 'pistola');
for (let k = 0; k < 40 && !car.wreck && !car.burning; k++) { G.fire(st2, Math.atan2(car.y - p2.y, car.x - p2.x), null, true); run(.25); }
run(4); console.log('auto esplosa', car.wreck, 'brecce', st2.breaches, 'danno finale', p2.hp < 100);
console.log('marsigliesi', st.npcs.filter(n => n.faction === 'marsiglia').map(n => n.first + ':' + n.inside).join(' '));
console.log('NaN', bad, 'over', st.over);
console.log('ultimo danno da', p.lastHurtBy);
