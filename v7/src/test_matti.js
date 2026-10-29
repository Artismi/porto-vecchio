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
const ok0 = n => n && !n.dead && !n.inside && !n.room && !n.cop && !n.faction && !n.__ev && (!n.action || n.action.name === 'routine');   // fuori, per conto suo
// le manie: chi le ha, e una frase normale quando gli passi accanto
const man = S.manie.map(id => G.byId(st, id));
ok(man.length >= 6 && man.every(n => M.MANIE[n.pop.mania] && !n.pop.matto), `manie: ${man.map(n => `${n.pop.mania} = ${n.name}`).join('; ')}`);
{ let k = 0; while (!man.some(n => ok0(n)) && k++ < 600) G.step(st, DT, { x: 0, y: 0 }); const n = man.find(n => ok0(n)) || man[0]; let l = null; n.inside = false; n.__mtCd = 0; S.cd = 0; n.action = { name: 'routine', scores: [] }; p.indoor = null;
  for (let t = 0; t < 60 && !l; t++) { n.inside = false; n.room = null; n.action = { name: 'routine', scores: [] }; p.x = n.x + 2; p.y = n.y; G.step(st, DT, { x: 0, y: 0 }); if (n.bark && n.bark.until > st.clock && M.MANIE[n.pop.mania].passa.includes(n.bark.text)) l = n.bark.text; }
  ok(!!l, `la mania ${n.pop.mania} ti dice: «${l}»`); }
// due ragazzi vicini: il loro mazzo (fra, zio, la siga, il drum)
{ const yg = st.npcs.filter(n => n.pop && n.pop.age <= M.CFG.giovane && !n.pop.matto && !n.pop.mania && ok0(n)).slice(0, 2);
  if (yg.length === 2) {
    const others = st.npcs.filter(n => !yg.includes(n)); others.forEach(n => { n.__x = n.x; n.x += 5000; });
    yg.forEach((n, i) => { n.inside = false; n.room = null; n.inVeh = false; n.action = { name: 'routine', scores: [] }; n.x = p.x + 5 + i; n.y = p.y; });
    S.fram = 0; S.q = []; S.scr = 1e12; let hit = null;
    for (let t = 0; t < 120 && !hit; t++) { yg.forEach((n, i) => { n.inside = false; n.room = null; n.action = { name: 'routine', scores: [] }; n.x = p.x + 5 + i; n.y = p.y; }); G.step(st, DT, { x: 0, y: 0 }); yg.forEach(n => { if (n.bark && n.bark.until > st.clock && M.FRAM_G.some(F => F.includes(n.bark.text))) hit = n.bark.text; }); }
    others.forEach(n => { n.x = n.__x; });
    ok(!!hit, `due ragazzi si parlano col loro mazzo: «${hit}»`);
  } }
console.log(fail ? `\n${fail} prove fallite.` : '\nTutto bene.');
process.exit(fail ? 1 : 0);
