// [orienta] prova dell'obiettivo: appena si parte c'è un obiettivo con un posto (Lupo), G.jobTarget ripiega lì, la tabella dei comandi
// è completa; col favore accettato vince la missione; con Lupo nella Risacca si passa al secondo membro.
// Uso: node test_orienta.js
require('./seme.js')(process.argv[2] || 7);
global.World = require('./world.js'); global.Interior = require('./interiors.js');
global.Game = require('./game.js'); global.Risacca = require('./risacca.js'); global.Popolo = require('./popolo.js'); global.Azioni = require('./azioni.js');
global.Economia = require('./economia.js'); global.Fazioni = require('./fazioni.js'); global.Soldi = require('./soldi.js'); global.Oggetti = require('./oggetti.js');
global.Protagonista = require('./protagonista.js');
const OR = require('./orienta.js'); OR.installa(true);
const G = Game, RS = Risacca, st = G.create(3), p = st.player;
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };
const DT = 1 / 30; for (let i = 0; i < 60; i++) G.step(st, DT, { x: 0, y: 0 });
// 1. si parte: l'obiettivo è Lupo, con un posto
let o = OR.obiettivo(st);
ok(o && /Lupo/.test(o.testo) && isFinite(o.x), `all'inizio: «${o && o.testo}» (${o && Math.round(o.x)}, ${o && Math.round(o.y)})`);
const jt = G.jobTarget(st);
ok(jt && jt.or && Math.hypot(jt.x - o.x, jt.y - o.y) < .01, 'G.jobTarget ripiega sull\'obiettivo (freccia, minimappa, mappa, diamante)');
ok(!/Infinity/.test(G.talk(st, G.byId(st, 'sandro')).lines.join(' ')), 'lo Squalo non dice più «Infinity ore»');
// 2. il favore di Lupo: vince la missione
const lupo = G.byId(st, 'lupo'), r = RS.offerMission(st, lupo);
o = OR.obiettivo(st); ok(r && r.ok && o && o.kind === 'missione' && /libri/i.test(o.testo), `col favore accettato: «${o && o.testo}»`);
// 3. Lupo nella Risacca: il secondo membro, con qualcuno da cercare
st.ris.mission = null; lupo.ris.missionDone = true; o = OR.obiettivo(st); ok(o && /chiedigli/.test(o.testo), `favore fatto: «${o && o.testo}»`);
RS.join(st, lupo); o = OR.obiettivo(st); ok(o && o.kind === 'recluta' && /1\/2/.test(o.testo) && isFinite(o.x), `Lupo è dentro: «${o && o.testo}»`);
// 4. due membri: la base
const altro = st.npcs.find(n => n.id !== 'lupo' && n.ris && !n.ris.member && !n.cop && !n.dead && ['elena', 'tonino', 'rosa', 'nico', 'gino', 'beppe'].includes(n.id));
RS.join(st, altro); o = OR.obiettivo(st); ok(o && o.kind === 'base', `due membri (${altro.first}): «${o && o.testo}»`);
// 5. la tabella dei comandi: ogni riga ha tastiera, controller, tocco e Game Boy; i tasti di questo blocco ci sono
ok(OR.COMANDI.every(c => c.k && c.p && c.t && c.c), `tabella dei comandi: ${OR.COMANDI.length} righe complete`);
['Pausa', 'Mappa', 'Parlare', 'Azione: parla, entra, usa', 'Crimine: scippo, rapina', 'Aiuto: questa tabella'].forEach(a => ok(OR.COMANDI.some(c => c.a === a), 'c\'è «' + a + '»'));
ok(OR.COMANDI.filter(c => c.m).length >= 6, 'le righe da allineare al merge sono segnate (camera7, guida2)');
console.log(fail ? `\n${fail} NON VANNO` : '\ntutto ok'); process.exit(fail ? 1 : 0);
