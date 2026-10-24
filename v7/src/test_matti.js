// prova dei matti di quartiere e dei frammenti sentiti passando (matti.js)
// Uso: node test_matti.js [seme]
require('./seme.js')(process.argv[2]);
global.World = require('./world.js'); global.Interior = require('./interiors.js');
global.Game = require('./game.js'); global.Risacca = require('./risacca.js'); global.Popolo = require('./popolo.js'); global.Azioni = require('./azioni.js');
global.Posti = require('./posti.js'); global.Eventi = require('./eventi.js'); global.Matti = require('./matti.js');
const G = Game, M = Matti, st = G.create(1), p = st.player;
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };
const DT = 1 / 30, step = s => { for (let i = 0; i < s * 30; i++) G.step(st, DT, { x: 0, y: 0 }); };
const E = Eventi.S(st); E.next = 1e12; st.deadline = 1e12;   // le scene ferme: qui si provano i matti e i frammenti
step(5);
const S = M.S(st), ids = Object.entries(S.ids);
ok(ids.length === Object.keys(M.MATTI).length, `matti scelti: ${ids.length} (${ids.map(([k, id]) => `${k} = ${G.byId(st, id).name}, ${G.byId(st, id).pop.age} anni`).join('; ')})`);
const homes = ids.map(([, id]) => G.byId(st, id).pop.homeT), dHome = Math.hypot(homes[0].x - p.x, homes[0].y - p.y);
ok(dHome < 200, `il primo abita vicino a Nino: ${dHome.toFixed(0)} m`);
ok(ids.every(([, id]) => Risacca.CARDS[id] && /Per tutti è/.test(Risacca.CARDS[id].bio)), 'la scheda della chat sa chi sono');
ok(ids.every(([, id]) => M.scheda(G.byId(st, id)).fissazione), 'Matti.scheda per mente.js');
ok(M.SCENE.every(D => Eventi.SCENE.includes(D)), `le scene strane sono nel catalogo (${M.SCENE.length})`);
// i frammenti: il giocatore in mezzo alla gente per qualche minuto
let fr = 0, seen = new Set(); S.fram = st.clock + 1;
for (let t = 0; t < 360 * 30; t++) {
  if (t % 900 === 0) { const busy = st.npcs.filter(n => !n.inside && !n.dead && n.pop).sort(() => Math.random() - .5)[0]; if (busy) { p.x = busy.x + 3; p.y = busy.y; } }
  G.step(st, DT, { x: 0, y: 0 });
  st.npcs.forEach(n => { if (n.bark && n.bark.until > st.clock && !seen.has(n.bark.text) && M.FRAM.some(F => F.includes(n.bark.text))) { seen.add(n.bark.text); fr++; } });
}
ok(fr >= 4, `frammenti sentiti in 6 minuti: ${fr} battute`); console.log('      «' + [...seen].slice(0, 4).join('» «') + '»');
// un matto: gli passi accanto e ti parla; la seconda volta ti riconosce
const [k0, id0] = ids[0], n0 = G.byId(st, id0); let lines = [];
for (let r = 0; r < 3; r++) {
  n0.inside = false; n0.__mtCd = 0; S.cd = 0; n0.action = { name: 'routine', scores: [] }; p.x = n0.x + 2; p.y = n0.y; p.indoor = null;
  for (let t = 0; t < 60; t++) { G.step(st, DT, { x: 0, y: 0 }); p.x = n0.x + 2; p.y = n0.y; if (n0.bark && n0.bark.until > st.clock && !lines.includes(n0.bark.text)) { lines.push(n0.bark.text); break; } }
}
ok(lines.length >= 2, `${M.MATTI[k0].nick} ti parla quando passi: «${lines.join('» «')}»`);
ok(S.incontri[k0] >= 2, `si ricorda di te: ${S.incontri[k0]} incontri`);
console.log(fail ? `\n${fail} prove fallite.` : '\nTutto bene.');
process.exit(fail ? 1 : 0);
