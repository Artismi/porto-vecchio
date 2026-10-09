// Prova dell'Ordine: turni, volanti, ronde, posti di blocco, controlli, proteste, la nave, la fila al supermercato.
// Uso (dalla cartella src): node test_ordine.js [giorni] [seme]
global.World = require('./world.js'); global.Interior = require('./interiors.js');
global.Game = require('./game.js');
const MODS = ['Risacca:risacca', 'Popolo:popolo', 'Azioni:azioni', 'Economia:economia', 'Fazioni:fazioni', 'Soldi:soldi', 'Oggetti:oggetti', 'Mestieri:mestieri', 'Scambi:scambi', 'Convivenza:convivenza', 'Imprese:imprese', 'Commissioni:commissioni', 'Trame:trame', 'Creativita:creativita', 'Ordine:ordine', 'Animali:animali'];
for (const m of MODS) { const [g, f] = m.split(':'); try { global[g] = require('./' + f + '.js'); } catch (e) { console.log('(manca ' + f + ': ' + e.message.slice(0, 90) + ')'); } }
const G = Game, O = Ordine, days = +process.argv[2] || 2, seed = +process.argv[3] || 1;
const st = G.create(seed);
const out = [], line = s => out.push(s);
const clk = t => `${Popolo.wdName(t)} ${G.clockStr(t)}`;
let err = 0; const ce = console.warn; console.warn = (...a) => { err++; ce(...a); };
line(`Supermercato: ${O.SUPER ? O.SUPER.b.name + ' (' + O.SUPER.b.w + 'x' + O.SUPER.b.h + ')' : 'NESSUNO'}`);
line(`Agenti: ${st.ord.agents.length}, abitanti ${st.npcs.filter(n => n.pop && !n.pop.cast).length}, animali ${st.ani ? st.ani.list.length : 0}`);
const t0 = Date.now(); let steps = 0, nextH = Math.ceil(st.t / 60) * 60;
const end = st.t + days * 1440;
// a metà del primo giorno: il giocatore passa davanti a una ronda (prova del controllo)
let forced = false;
while (st.t < end) {
  G.step(st, 1 / 30, { x: 0, y: 0 }); steps++;
  if (!forced && st.t > st.ord.nextProt - 1 && st.t > 600) { forced = true; const Pr = O.startProtest(st, { kind: 'spontanea', motivo: 'rabbia', place: 'piazza', size: 22 }); line(`${clk(st.t)} >>> protesta forzata: ${Pr ? Pr.people.length + ' persone' : 'non partita'}`); }
  if (st.t >= nextH) {
    nextH += 120; const R = O.report(st);
    line(`${clk(st.t)} turno ${R.diTurno}/${R.agenti} · servizi ${JSON.stringify(R.servizi)} · volanti ${R.volanti} · ronde ${R.ronde} · blocco ${R.blocco || '-'} · nave ${R.nave} · fila ${R.coda} · scorte ${R.scorte}% · proteste ${R.proteste.join('; ') || '-'}${st.ani ? ' · animali ' + JSON.stringify(Animali.report(st)) : ''}`);
  }
}
const R = O.report(st);
line(`\nStatistiche: ${JSON.stringify(R.stats)}`);
line(`Registro (ordine):\n  ` + st.log.filter(l => /Grigi|blocco|nave|protesta|Protesta|Manifestazione|antisommossa|camion|Supermercato|caricano|fermato|Fermato/.test(l.text)).slice(0, 40).map(l => l.text).join('\n  '));
line(`\n${steps} passi, ${((Date.now() - t0) / steps).toFixed(2)} ms per passo, avvisi ${err}.`);
console.log(out.join('\n'));
