// Prova della vita: N giorni di gioco senza grafica, registro giorno per giorno di alcuni personaggi.
// Uso (dalla cartella src): node test_vita.js [giorni] [seme] > registro_vita.txt
// [vita1] node test_vita.js sonde [secondi per ora = 600] [seme = 1] [uscita.json]: la sonda della vita (strumenti/sonda_vita.js,
// AUDIT_VITA F0) sulla città nuova, a quattro ore del giorno; esce con 1 se qualcuno è in un mezzo ma «fuori» (inVeh && !inside,
// car && !inside, n.dove che non torna col mezzo) o se un autista si vedrebbe col pupazzo a scatole. Gli altri conti si stampano.
if (process.argv[2] === 'sonde') {
  const SV = require('../strumenti/sonda_vita.js'), secondi = +process.argv[3] || 600, seme = +process.argv[4] || 1;
  require('./seme.js')(seme);   // ogni ora gira in un processo suo (strumenti/sonda_vita.js)
  const R = SV.giro(secondi, seme, (process.env.PV_SONDA_ORE || '8.5,13,19,22.5').split(',').map(Number), console.log), T = R.totale;
  if (process.argv[5]) require('fs').writeFileSync(process.argv[5], JSON.stringify(R, null, 1));
  let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };
  ok(T.inVehFuori === 0, `nessuno in un mezzo e «fuori» (inVeh && !inside: ${T.inVehFuori})`);
  ok(T.carFuori === 0, `nessun equipaggio «fuori» dentro la scocca (car && !inside: ${T.carFuori})`);
  ok(T.doveKo === 0, `n.dove torna col mezzo (${T.doveKo})`);
  ok(T.pupazzi === 0, `nessun autista col pupazzo a scatole (${T.pupazzi} campioni su ${T.guidati})`);
  ok(T.senzaAutista === 0, `nessun mezzo di un abitante senza autista (${T.senzaAutista})`);
  console.log(JSON.stringify(T)); console.log(fail ? `${fail} conti non tornano.` : 'Tutto bene.'); process.exit(fail ? 1 : 0);
}
global.World = require('./world.js'); global.Interior = require('./interiors.js');
global.Game = require('./game.js'); global.Risacca = require('./risacca.js'); global.Popolo = require('./popolo.js'); global.Azioni = require('./azioni.js'); global.Economia = require('./economia.js');
const G = Game, Po = Popolo, days = +process.argv[2] || 4, seed = +process.argv[3] || 1;
const st = G.create(seed);
const by = id => st.npcs.find(n => n.id === id);
const pp = st.npcs.filter(n => n.pop && !n.pop.cast);
const pick = f => pp.find(f);
const watch = ['lupo', 'gino', 'rosa', 'betamax', 'vinile', 'cono', 'sandro', 'vasco'].map(by)
  .concat([pick(n => n.pop.debt), pick(n => n.pop.status === 'disoccupato'), pick(n => n.pop.giro === 'ladro' || n.pop.giro === 'borsaiolo'), pick(n => n.pop.rel === 'madre'), pick(n => n.pop.age < 25), pick(n => n.pop.status === 'pensionato'), pick(n => n.pop.intW.arte && n.pop.age < 40)])
  .filter(Boolean);
const out = [];
const line = s => out.push(s);
const r2 = v => Math.round(v * 100) / 100;
const needs = N => Object.entries(N).filter(([k, v]) => v > .55).map(([k, v]) => `${k} ${r2(v)}`).join(', ') || 'tranquillo';
function dump(day) {
  line(`\n==================== ${Po.WEEK[(day + 1) % 7].toUpperCase()} (giorno ${day + 1}) ====================`);
  const S = st.pop.stats; line(`Città: progetti nati ${S.progetti}, riusciti ${S.riusciti}, falliti ${S.falliti} · furti ${S.furti} · arresti ${S.arresti} · scritte degli abitanti ${S.scritte} · graffiti ${S.graffiti || 0}${st.pop.walls.length ? ` (muri dipinti ${st.pop.walls.length}, cancellati ${st.pop.walls.filter(w => w.erased).length})` : ''} · appuntamenti ${S.appuntamenti} (bidoni ${S.bidoni}) · ritardi ${S.ritardi}${st.ris ? ` · morale ${Math.round(st.ris.morale)} repressione ${Math.round(st.ris.repr)}` : ''}`);
  watch.forEach(n => {
    const P = n.pop; if (!P) return;
    line(`\n— ${n.name}, ${P.age} anni, ${n.role}${P.cast ? ' [cast]' : ''}. Interessi: ${P.ints.map(i => Po.INTERESSI[i.k]).join(', ')}. Soldi ${Math.round(P.money)}${P.debt ? `, debito ${Math.round(P.debt.amount)}` : ''}, dispensa ${Math.round(P.pantry)}.`);
    line(`  Giornata: ${(P.yesterday || []).map(x => `${String(Math.floor(x.t / 60) % 24).padStart(2, '0')}:${String(Math.floor(x.t % 60)).padStart(2, '0')} ${x.label}`).join(' → ') || '(niente)'}`);
    const th = P.thoughts.filter(t => Math.floor(t.t / 1440) === day + 1); if (th.length) line(`  Stanotte ha pensato: ${th.map(t => t.text).join('; ')}`);
    if (P.projects.length) line(`  Progetti: ${P.projects.map(p => `${p.label} [passo ${p.i + 1}/${p.steps.length}: ${p.steps[p.i] ? p.steps[p.i].label : '-'}]`).join(' · ')}`);
    const done = P.history.filter(h => Math.floor(h.t / 1440) === day); if (done.length) line(`  Chiusi: ${done.map(h => `${h.label} (${h.how})`).join('; ')}`);
    line(`  Bisogni: ${needs(P.need)}`);
  });
}
// una prova della catena: mercoledì mattina i Grigi portano via un figlio della madre osservata
const mother = watch.find(n => n.pop.rel === 'madre'), kid = mother && st.npcs.find(k => k.pop && k.pop.hh === mother.pop.hh && k.pop.rel === 'figlio');
let arrested = false;
let lastDay = Math.floor(st.t / 1440), t0 = Date.now(), frames = 0;
const end = st.t + days * 1440 + 1;
while (st.t < end) {
  G.step(st, 1 / 30, {}); frames++;
  if (!arrested && kid && st.t >= 1440 + 600) { arrested = true; Po.arrest(st, kid, 'volantini della Risacca'); line(`\n>>> Mercoledì 10:00: i Grigi portano via ${kid.name}, figlio di ${mother.name}.`); }
  const d = Math.floor(st.t / 1440);
  if (d !== lastDay) { dump(lastDay); lastDay = d; }
}
line(`\nMuri: ${st.pop.walls.map(w => `${w.place}: ${w.text} (${G.nameOf(st, w.by)}, ${w.style}${w.erased ? ', cancellato' : ''})`).join(' | ') || 'nessuno'}`);
line(`\n${frames} passi, ${((Date.now() - t0) / frames).toFixed(2)} ms per passo.`);
const R = Po.report(st); line(JSON.stringify({ abitanti: R.abitanti, cast: R.cast, stats: R.stats }));
// un esempio di quello che la chat legge di un personaggio
line(`\nScheda per la chat (Lupo): ${Risacca.CARDS.lupo.bio}`);
line(`\nScheda per la chat (${watch[7] ? watch[7].name : ''}): ${watch[7] ? Risacca.CARDS[watch[7].id].bio : ''}`);
console.log(out.join('\n'));
