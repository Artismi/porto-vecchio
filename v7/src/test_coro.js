// Prova del Coro: caselle, gruppi di affinità, voci passate dal codice, una risposta IA finta distribuita sul gruppo.
// Uso (dalla cartella src): node test_coro.js [giorni] [seme]
global.World = require('./world.js'); global.Interior = require('./interiors.js');
global.Game = require('./game.js'); global.Risacca = require('./risacca.js'); global.Popolo = require('./popolo.js'); global.Azioni = require('./azioni.js'); global.Economia = require('./economia.js'); global.Fazioni = require('./fazioni.js');
const Coro = require('./coro.js');
const G = Game, days = +process.argv[2] || 2, seed = +process.argv[3] || 1;
const st = G.create(seed);
let ok = true; const check = (c, msg) => { console.log((c ? '✔ ' : '✘ ') + msg); if (!c) ok = false; };
const t0 = st.t; while (st.t < t0 + days * 1440) G.step(st, 1 / 30, {});

const list = Coro.gruppi(st);
const vivi = st.npcs.filter(n => n.pop && n.pop.ints && !n.dead);
const coperti = new Set(list.flatMap(g => g.ids));
check(vivi.every(n => coperti.has(n.id)), `tutti i ${vivi.length} abitanti stanno in un gruppo (${list.length} gruppi)`);
check(list.every(g => g.ids.length <= Coro.CFG.maxMembri), `nessun gruppo supera ${Coro.CFG.maxMembri} persone`);
console.log('  esempi:', list.slice(0, 6).map(g => `${g.label} (${g.ids.length})`).join(' · '));

const R = Coro.notte(st);
check(vivi.every(n => n.pop.box && n.pop.box.u), 'ogni abitante ha la sua casella');
check(R.voci > 0, `il codice ha passato ${R.voci} voci dentro i gruppi`);
check(R.gruppi.length === Coro.CFG.gruppiPerNotte, `stanotte l'IA si chiama ${R.gruppi.length} volte (una per gruppo) invece di ${vivi.length}`);

const g = R.gruppi[0], req = Coro.richiesta(st, g);
const size = JSON.stringify(req).length;
console.log(`\n  richiesta per «${g.label}» (${size} caratteri):\n` + JSON.stringify(req, null, 1).split('\n').slice(0, 24).map(s => '   ' + s).join('\n'));
check(size < 4000, 'la richiesta di un gruppo resta corta');

const ms = Coro.membri(st, g), spec = req.specifici[0], who = ms.find(n => n.id === spec);
const before = ms.map(n => n.pop.need.paura), th = who.pop.thoughts.length;
const n = Coro.applica(st, g, { clima: 'Aria pesante, nessuno si fida.', voce: 'stanotte i Grigi hanno fermato due ragazzi al molo', rabbia: .05, paura: .08,
  battute: ['Hai visto i Grigi al molo?', 'Meglio stare a casa, stasera.'], singoli: { [spec]: { pensiero: 'domani non esco prima di giorno', paura: .05 } } }, () => 0);
check(n === ms.length, `la risposta ricade su tutti i ${ms.length} del gruppo`);
check(ms.every((m, i) => m.pop.need.paura > before[i]), 'la paura sale per tutti, di più per chi ne aveva già');
check(who.pop.thoughts.length === th + 1 && who.pop.box.pensa.includes('non esco'), `${who.first} ha il suo pensiero personale nella casella`);
check(ms.every(m => m.pop.box.clima.startsWith('Aria pesante')), 'il clima del gruppo è scritto in tutte le caselle');
check(Coro.battuta(st, ms[0]) === 'Hai visto i Grigi al molo?', 'le battute per le chiacchiere sono pronte, senza chiamate');
check(Coro.applica(st, g, null) === 0 && Coro.applica(st, g, 'testo') === 0, 'una risposta vuota o sbagliata non rompe niente');
console.log('\n  casella di ' + who.first + ': ' + Coro.riga(st, who));
process.exit(ok ? 0 : 1);
