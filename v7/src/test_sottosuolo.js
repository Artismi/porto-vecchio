// prova del sottosuolo: fogne, tombini, posti di sotto, sbucare dentro le case, roba sepolta, metropolitana
global.World = require('./world.js'); global.Interior = require('./interiors.js');
global.Game = require('./game.js'); global.Risacca = require('./risacca.js'); global.Popolo = require('./popolo.js'); global.Azioni = require('./azioni.js');
global.Economia = require('./economia.js'); global.Fazioni = require('./fazioni.js'); global.Soldi = require('./soldi.js'); global.Oggetti = require('./oggetti.js');
global.Livelli = require('./livelli.js'); global.Sottosuolo = require('./sottosuolo.js');
const G = Game, LV = Livelli, SS = Sottosuolo, st = G.create(1), p = st.player, TS = G.TS;
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };
const L = LV.S(st), K = SS.K, cnt = k => L.kind.reduce((a, v) => a + (v === k ? 1 : 0), 0);
const wait = s => { for (let k = 0; k < s * 30; k++) G.step(st, 1 / 30, { x: 0, y: 0 }); };
const walk = (ang, s) => { p.face = ang; for (let k = 0; k < s * 30; k++) G.step(st, 1 / 30, { x: Math.cos(ang), y: Math.sin(ang), aim: ang }); };
const where = () => `(${p.x.toFixed(1)},${p.y.toFixed(1)}) lv=${p.lv ? p.lv.k + (p.lv.ride !== undefined ? ':treno' + p.lv.ride : '') : '-'} in=${p.indoor ? G.BUILDINGS[p.indoor.b].id : '-'}`;
console.log('fogne', cnt(K.FOGNA), 'cripte', cnt(K.CRIPTA), 'carceri', cnt(K.CARCERE), 'bunker', cnt(K.BUNKER), 'covi', cnt(K.COVO), 'metro', cnt(K.METRO), 'banchine', cnt(K.BANCHINA));
const kinds = {}; L.portals.forEach(P => { kinds[P.kind] = (kinds[P.kind] || 0) + 1; }); console.log('portali', JSON.stringify(kinds));
ok(cnt(K.FOGNA) > 800, 'le fogne corrono sotto le strade');
ok((kinds.tombino || 0) > 25, 'ci sono i tombini');
ok(SS.TPL.metro.ok, 'la metropolitana ha due stazioni: ' + (SS.TPL.metro.ok ? SS.TPL.metro.A.name + ' → ' + SS.TPL.metro.B.name + ', ' + SS.TPL.metro.L.toFixed(0) + ' m' : ''));
console.log('posti', SS.TPL.places.map(q => q.name).join(' · '));
console.log('gente', SS.S(st).folk.map(n => n.name).join(', '));
// 1) giù da un tombino, su da un altro
const T0 = L.portals.find(P => P.kind === 'tombino'); p.lv = null; p.x = (T0.s[0] + .5) * TS; p.y = (T0.s[1] + .5) * TS;
let m = LV.key(st, 'v'); ok(p.lv && p.lv.k === 'ug', 'scendo dal tombino: ' + m + ' ' + where());
wait(1); console.log('   ', st.feed.map(f => f.text).slice(0, 2).join(' | '));
m = LV.key(st, 'v'); ok(!p.lv, 'risalgo dal tombino: ' + m);
// 2) le carceri: dal portale «interno» si sale nella Caserma della Guardia, e da lì si torna giù
const PI = L.portals.find(P => P.kind === 'interno' && G.BUILDINGS[P.bi].id === 'commissariato');
p.lv = { k: 'ug' }; p.x = (PI.u[0] + .5) * TS; p.y = (PI.u[1] + .5) * TS; m = LV.key(st, 'v'); ok(p.indoor && G.BUILDINGS[p.indoor.b].id === 'commissariato', 'dalle carceri salgo in caserma: ' + m + ' ' + where());
m = LV.key(st, 'v'); ok(p.lv && p.lv.k === 'ug' && !p.indoor, 'e riscendo: ' + m + ' ' + where());
// 3) il percorso nei cunicoli dalle carceri alla fogna
const fz = L.portals.find(P => P.kind === 'tombino'); const path = SS.findPath(st, p.x, p.y, (fz.u[0] + .5) * TS, (fz.u[1] + .5) * TS);
console.log('    percorso fino a un tombino:', path.length, 'tappe');
// 4) scavare sotto una casa qualunque e sbucarci dentro
const bi = G.BUILDINGS.findIndex(b => b.door && !b.name && b.w >= 3 && b.h >= 3 && !L.ug[(b.y + 1) * G.GW + b.x + 1]);
const b = G.BUILDINGS[bi]; p.indoor = null; p.lv = { k: 'ug' }; L.ug[(b.y + 1) * G.GW + b.x + 1] = 2; L.fl[(b.y + 1) * G.GW + b.x + 1] = G.MAP.elev[(b.y + 1) * G.GW + b.x + 1] - 3.2;
p.x = (b.x + 1.5) * TS; p.y = (b.y + 1.5) * TS; p.inv = { pala: 1, piccone: 1 }; if (global.Oggetti) { const bag = Oggetti.inv(st); bag.pala = 1; bag.piccone = 1; }
m = LV.digUp(st); console.log('    ', m); wait(25); ok(p.indoor && p.indoor.b === bi, 'sbuco dentro la casa ' + (b.id || bi) + ': ' + (st.feed[0] && st.feed[0].text) + ' ' + where());
// 5) da dentro una casa: una botola nel pavimento
const b2i = G.BUILDINGS.findIndex((q, i) => i !== bi && q.door && q.w >= 3 && !L.portals.some(P => P.bi === i)); G.exitBuilding(st); p.lv = null; G.enterBuilding(st, b2i);
m = LV.key(st, 'h'); console.log('    ', m); wait(16); m = LV.key(st, 'v'); ok(p.lv && p.lv.k === 'ug' && !p.indoor, 'botola nel pavimento e giù: ' + m + ' ' + where());
// 6) scavare di filato: avanti finché non lo fermi
p.face = 0; m = LV.key(st, 'h', true); console.log('    ', m); const x0 = p.x; wait(40); ok(p.x > x0 + 4, `di filato: avanzato di ${(p.x - x0).toFixed(1)} m · ${st.feed.slice(0, 3).map(f => f.text).join(' | ')}`); LV.S(st).auto = null; LV.S(st).job = null;
// 7) la roba sepolta: la cassa del brigante sotto il Paese Vecchio
const C = SS.CACHES.find(c => c.id === 'brigante'); const before = JSON.stringify(Oggetti.inv(st));
const msg = LV.hooks.dug.map(f => f(st, C.tx, C.ty, L)).find(Boolean); ok(/brigante/.test(msg || ''), 'la cassa del brigante: ' + msg);
// 8) la gente di sotto: compro dal Mastro Ugo
p.money = 500; const V = SS.shopView(st, 'mercato'); console.log('    banco:', V.goods.map(g => g.nome + ' ' + g.price).join(', '));
const r1 = SS.buy(st, 'mercato', 'grimaldello'); ok(r1.ok, 'compro: ' + r1.msg);
// 9) le casse dei posti
const cr = SS.S(st).crates.find(c => c.id === 'armeria'); const r3 = SS.openCrate(st, cr); ok(r3.ok, r3.msg);
const r2 = SS.sell(st, 'mercato', 'maschera_gas'); ok(r2.ok, 'rivendo: ' + r2.msg);
const r4 = SS.openCrate(st, SS.S(st).crates.find(c => c.id === 'casse_contr')); ok(!r4.ok, 'le casse di Bavaglio sono sorvegliate: ' + r4.msg);
// 10) la metropolitana: in banchina a sud, si aspetta il treno, si sale, si arriva a nord
const MT = SS.TPL.metro; p.indoor = null; p.lv = { k: 'ug' }; p.x = MT.A.x; p.y = MT.A.y;
const ent = L.portals.find(P => P.kind === 'scala' && P.metro === 'sud'); console.log('    ingresso sud', ent.s, 'banchina', MT.A.x.toFixed(0), MT.A.y.toFixed(0), 'quota', MT.A.f.toFixed(1), '· nord', MT.B.x.toFixed(0), MT.B.y.toFixed(0), MT.B.f.toFixed(1));
let tries = 0; while (!(p.lv.ride !== undefined) && tries++ < 200) { m = LV.key(st, 'v'); if (p.lv.ride === undefined) wait(1); }
ok(p.lv.ride !== undefined, 'salgo sul treno: ' + m);
const hs = []; for (let k = 0; k < 80 && p.lv.ride !== undefined; k++) { wait(1); hs.push(LV.heightOf(st, p).toFixed(1)); }
console.log('    quote del viaggio', hs.filter((_, i) => i % 6 === 0).join(' '));
ok(p.lv.ride === undefined && Math.hypot(p.x - MT.B.x, p.y - MT.B.y) < 4, 'sceso a ' + MT.B.name + ': ' + (st.feed[0] && st.feed[0].text) + ' ' + where());
const EN = L.portals.find(P => P.kind === 'scala' && P.metro === 'nord'); p.x = (EN.u[0] + .5) * TS; p.y = (EN.u[1] + .5) * TS; m = LV.key(st, 'v'); ok(!p.lv, 'su per le scale: ' + m + ' ' + where());
// le due gallerie si incrociano a metà: una sopra, una sotto
const a = SS.trackAt(0, .5), c = SS.trackAt(1, .5), a0 = SS.trackAt(0, 0), c0 = SS.trackAt(1, 0);
ok(Math.abs(a.h - c.h) > 7 && Math.abs(a0.h - c0.h) < .01, `mezza elica: a metà ${a.h.toFixed(1)} sopra ${c.h.toFixed(1)}, ai capi alla stessa quota`);
console.log(fail ? `\n${fail} prove fallite` : '\nTutto bene.');
process.exitCode = fail ? 1 : 0;
