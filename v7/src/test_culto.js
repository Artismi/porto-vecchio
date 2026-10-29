// prova della voce del regime (culto.js): il discorso delle 20, la TV, gli altoparlanti con la reazione, la supercazzola
// Uso: node test_culto.js [seme]
require('./seme.js')(process.argv[2]);
global.World = require('./world.js'); global.Interior = require('./interiors.js');
global.Game = require('./game.js'); global.Risacca = require('./risacca.js'); global.Popolo = require('./popolo.js'); global.Azioni = require('./azioni.js');
global.Posti = require('./posti.js'); global.Eventi = require('./eventi.js'); global.Culto = require('./culto.js');
const G = Game, C = Culto, st = G.create(1), p = st.player;
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };
const DT = 1 / 30, step = s => { for (let i = 0; i < s * 30; i++) G.step(st, DT, { x: 0, y: 0 }); };
Eventi.S(st).next = 1e12; st.deadline = 1e12;
step(5);
const sere = new Set(); for (let d = 0; d < C.GARANTE.length; d++) sere.add(C.garante({ t: d * 1440 }));
ok(sere.size === C.GARANTE.length, `il discorso delle 20 cambia ogni sera: ${sere.size} diversi in ${C.GARANTE.length} sere`);
ok(/«.+»/.test(C.garante(st)), 'il discorso tra virgolette: ' + C.garante(st));
ok(C.TV.includes(C.tv()), 'la TV');
const sc = C.supercazzola(); ok(sc.split(' ').length >= 5, 'supercazzola: ' + sc);
ok(C.SCENE.every(D => Eventi.SCENE.includes(D)), `le scene del culto nel catalogo (${C.SCENE.length})`);
// gli altoparlanti: il giocatore in mezzo alla gente; arriva il comunicato e qualcuno commenta
const S = C.S(st); let annunci = 0, reaz = 0; const heard = []; const seen = new Set();
for (let k = 0; k < 4; k++) {
  const busy = st.npcs.filter(n => !n.inside && !n.dead && n.pop && !n.cop).sort(() => Math.random() - .5)[0]; if (busy) { p.x = busy.x + 2; p.y = busy.y; p.indoor = null; }
  S.next = st.clock; let got = false;
  for (let t = 0; t < 8 * 30; t++) { G.step(st, DT, { x: 0, y: 0 }); st.feed.forEach(q => { if (/Altoparlante/.test(q.text)) { got = true; if (!heard.includes(q.text)) heard.push(q.text); } }); st.npcs.forEach(n => { if (n.bark && n.bark.until > st.clock && C.REAZIONI.includes(n.bark.text) && !seen.has(n.bark.text + n.id)) { seen.add(n.bark.text + n.id); reaz++; } }); }
  if (got) annunci++;
}
ok(annunci >= 3, `comunicati degli altoparlanti: ${annunci}/4`);
ok(reaz >= 2, `la gente commenta: ${reaz} reazioni (${[...seen].slice(0, 2).map(s => '«' + s.replace(/[a-z0-9_]+$/i, '') + '»').join(' ')})`);
console.log(heard.slice(0, 2).map(f => '      ' + f).join('\n'));
console.log(fail ? `\n${fail} prove fallite.` : '\nTutto bene.');
process.exit(fail ? 1 : 0);
