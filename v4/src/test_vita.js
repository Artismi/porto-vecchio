// Prova della vita: N giorni di gioco senza grafica, registro giorno per giorno di alcuni personaggi.
// Uso (dalla cartella src): node test_vita.js [giorni] [seme] > registro_vita.txt
global.World = require('./world.js'); global.Interior = require('./interiors.js');
global.Game = require('./game.js'); global.Risacca = require('./risacca.js'); global.Popolo = require('./popolo.js');
const G = Game, Po = Popolo, days = +process.argv[2] || 4, seed = +process.argv[3] || 1;
const st = G.create(seed);
const by = id => st.npcs.find(n => n.id === id);
const pp = st.npcs.filter(n => n.pop && !n.pop.cast);
const pick = f => pp.find(f);
const watch = ['lupo', 'gino', 'rosa', 'betamax', 'vinile', 'sandro', 'vasco'].map(by)
  .concat([pick(n => n.pop.debt), pick(n => n.pop.status === 'disoccupato'), pick(n => n.pop.giro === 'ladro' || n.pop.giro === 'borsaiolo'), pick(n => n.pop.rel === 'madre'), pick(n => n.pop.age < 25), pick(n => n.pop.status === 'pensionato')])
  .filter(Boolean);
const out = [];
const line = s => out.push(s);
const r2 = v => Math.round(v * 100) / 100;
const needs = N => Object.entries(N).filter(([k, v]) => v > .55).map(([k, v]) => `${k} ${r2(v)}`).join(', ') || 'tranquillo';
function dump(day) {
  line(`\n==================== ${Po.WEEK[(day + 1) % 7].toUpperCase()} (giorno ${day + 1}) ====================`);
  const S = st.pop.stats; line(`Città: progetti nati ${S.progetti}, riusciti ${S.riusciti}, falliti ${S.falliti} · furti ${S.furti} · arresti ${S.arresti} · scritte degli abitanti ${S.scritte} · appuntamenti ${S.appuntamenti} (bidoni ${S.bidoni}) · ritardi ${S.ritardi}${st.ris ? ` · morale ${Math.round(st.ris.morale)} repressione ${Math.round(st.ris.repr)}` : ''}`);
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
line(`\n${frames} passi, ${((Date.now() - t0) / frames).toFixed(2)} ms per passo.`);
const R = Po.report(st); line(JSON.stringify({ abitanti: R.abitanti, cast: R.cast, stats: R.stats }));
// un esempio di quello che la chat legge di un personaggio
line(`\nScheda per la chat (Lupo): ${Risacca.CARDS.lupo.bio}`);
line(`\nScheda per la chat (${watch[7] ? watch[7].name : ''}): ${watch[7] ? Risacca.CARDS[watch[7].id].bio : ''}`);
console.log(out.join('\n'));
