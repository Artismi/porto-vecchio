// prova dello scavo e dei livelli, senza grafica

global.World = require('./world.js'); global.Interior = require('./interiors.js');
global.Game = require('./game.js'); global.Risacca = require('./risacca.js'); global.Popolo = require('./popolo.js'); global.Azioni = require('./azioni.js');
global.Livelli = require('./livelli.js');
const G = Game, LV = Livelli, st = G.create(1), p = st.player, TS = G.TS;
const L = LV.S(st);
console.log('portali iniziali', L.portals.map(P => P.kind + ' ' + P.name + ' s' + P.s + ' u' + P.u));
console.log('caselle di grotta', L.ug.reduce((a, v) => a + (v ? 1 : 0), 0));
const walk = (ang, secs) => { p.face = ang; for (let k = 0; k < secs * 30; k++) G.step(st, 1 / 30, { x: Math.cos(ang), y: Math.sin(ang), aim: ang }); };
const wait = secs => { for (let k = 0; k < secs * 30; k++) G.step(st, 1 / 30, { x: 0, y: 0 }); };
const where = () => `(${p.x.toFixed(1)},${p.y.toFixed(1)}) lv=${p.lv ? p.lv.k : '-'} h=${(LV.heightOf(st, p) ?? G.MAP.elev[Math.floor(p.y / TS) * G.GW + Math.floor(p.x / TS)]).toFixed(1)}`;
// 1) la grotta del Romito: dal fondo della gola verso est
const P0 = L.portals[0]; p.x = (P0.s[0] + .5) * TS; p.y = (P0.s[1] + .5) * TS; p.inv = { pala: 1, piccone: 1 };
console.log('davanti alla grotta', where(), 'tile davanti', G.tileAt(P0.u[0], P0.u[1]));
const ang = Math.atan2(P0.u[1] - P0.s[1], P0.u[0] - P0.s[0]); walk(ang, 1.5); console.log('dopo un passo verso la parete', where());
// 2) scavare una botola in un prato del Borgo e scendere
p.lv = null; p.x = G.PLACES.villaggio.x + 3; p.y = G.PLACES.villaggio.y; console.log('al Borgo', where(), G.tileAt(Math.floor(p.x / TS), Math.floor(p.y / TS)));
console.log(LV.key(st, 'h')); wait(12); console.log(st.feed.map(f => f.text).slice(0, 2));
console.log(LV.key(st, 'v'), where());
// scava avanti 6 volte verso sud (verso la fiumara e il pendio)
for (let k = 0; k < 12; k++) { p.face = Math.PI / 2; const m = LV.key(st, 'h'); wait(11); walk(Math.PI / 2, .8); console.log(k, m, '→', st.feed[0] && st.feed[0].text, where()); if (!p.lv) break; }
console.log('portali', L.portals.length);
// 3) risalire da una botola nuova
console.log(LV.key(st, 'v'), where());
// 4) l'eremo: dalla cengia
const E0 = L.portals.find(P => P.name === 'Eremo del Romito'); p.lv = null; p.x = (E0.s[0] + .5) * TS; p.y = (E0.s[1] + .5) * TS; console.log('cengia', where());
walk(Math.atan2(E0.u[1] - E0.s[1], E0.u[0] - E0.s[0]), 1); console.log('dentro?', where());
for (let k = 0; k < 6; k++) walk(-.25, .8); console.log('in fondo', where(), LV.key(st, 'v'), where());
// 5) il ponte
const B = LV.BR[0]; p.lv = null; p.x = B.a[0] - 1.5; p.y = B.a[1]; console.log('ponte, capo ovest', where());
walk(0, 1); console.log(where()); walk(0, 2); console.log(where()); walk(0, 2.5); console.log(where());
