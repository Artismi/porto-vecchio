// Prova della polizia: ammazzare un agente porta wanted 4, arrivano i rinforzi; esplosioni; i marsigliesi di notte.
// Portato dalla radice il 7/10/2026 sulla mappa v7. Uso (dalla cartella src): node test_polizia.js [seme]
global.World = require('./world.js'); global.Interior = require('./interiors.js');
global.Game = require('./game.js');
const G = Game, seed = +process.argv[2] || 21;
const st = G.create(seed); const p = st.player; p.hp = 1e6;
const run = (s, i) => { for (let k = 0; k < s * 30; k++) G.step(st, 1 / 30, i || { x: 0, y: 0 }); };
run(1);
G.giveWeapon(st, 'mitra', 90); G.switchWeapon(st, 'mitra');
const carla = G.byId(st, 'carla'); p.x = carla.x + 4; p.y = carla.y; run(.1);
for (let k = 0; k < 40 && !carla.dead; k++) { G.fire(st, Math.atan2(carla.y - p.y, carla.x - p.x), null, true); run(.08); }
console.log('carla morta', carla.dead, 'wanted', G.wanted(st), 'copKilled', st.copKilled);
run(5); console.log('wanted dopo 5s', G.wanted(st), 'reinf', st.reinf, 'ferri', G.byId(st, 'ferri').action.name);
for (let k = 0; k < 25; k++) { run(1); const car = st.reinf && st.vehicles.find(v => v.id === st.reinf.car); if (k % 5 === 0) console.log('t', k, car ? [car.x.toFixed(1), car.y.toFixed(1), car.speed.toFixed(1), !!car.arrived, car.stuck.toFixed(1)] : '-', st.npcs.filter(n => n.reinforcement).map(n => n.first + ':' + n.action.name).join(' ')); }
// esplosione: l'Ape del calata salta in aria
const tr = st.vehicles.find(v => v.id === 'v_ape');
G.giveWeapon(st, 'pistola', 100); G.switchWeapon(st, 'pistola'); p.x = tr.x; p.y = tr.y - 6;
for (let k = 0; k < 40 && !tr.wreck && !tr.burning; k++) { G.fire(st, Math.atan2(tr.y - p.y, tr.x - p.x), null, true); run(.25); }
run(.2); console.log('ape esplosa', tr.wreck, 'fuochi', st.fires.length);
run(4); console.log('fuochi dopo 4s', st.fires.length, 'brecce', st.breaches);
// marsigliesi di notte
st.t = 23 * 60; run(20);
const m = st.npcs.filter(n => n.faction === 'marsiglia'); console.log('marsigliesi', m.map(n => n.first + ':' + n.action.name + ' ' + n.x.toFixed(0) + ',' + n.y.toFixed(0) + ' in:' + n.inside).join(' '));
const pm = G.PLACES.pontile; p.x = pm.x; p.y = pm.y - 10; run(.1); for (let k = 0; k < 6; k++) { p.y += 1; run(.5); }
console.log('aggro', m.map(n => n.aggro + ':' + n.action.name).join(' '), 'fx', st.fx.length);
console.log('NaN', st.npcs.some(n => !isFinite(n.x)), 'over', st.over);
