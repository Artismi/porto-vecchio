// Prova dell'economia: N giorni, scorte, produzione, la nave, il lavoro clandestino. Uso: node test_economia.js [giorni] [seme]
global.World = require('./world.js'); global.Interior = require('./interiors.js');
global.Game = require('./game.js'); global.Risacca = require('./risacca.js'); global.Popolo = require('./popolo.js'); global.Azioni = require('./azioni.js'); global.Economia = require('./economia.js');
const G = Game, E = Economia, A = Azioni, days = +process.argv[2] || 4, seed = +process.argv[3] || 1;
const out = [], line = s => out.push(s), clk = t => `${Popolo.WEEK[Popolo.weekday(t)]} ${G.clockStr(t)}`;
const st = G.create(seed);
const run = mins => { const end = st.t + mins; while (st.t < end) G.step(st, 1 / 30, {}); };
line('Botteghe nuove: ' + G.BUILDINGS.filter(b => b.trade).map(b => `${b.name} (${b.id})`).join(', '));
const jobs = {}; st.npcs.forEach(n => { if (n.pop && n.pop.job) { const b = n.pop.job.base; if (/macell|frutt|fabbr|falegn|Emporio|allevat|boscai|saldat|fornai|cuoc|pescat/.test(b)) jobs[b] = (jobs[b] || 0) + 1; } });
line('Mestieri: ' + Object.entries(jobs).map(([k, v]) => `${k} ${v}`).join(', '));
const shop = re => Object.values(E.eco(st).shops).find(S => re.test(S.label));
const show = (S, gs) => S ? `${S.label}: ` + (gs || Object.keys(S.sells)).map(g => `${g} ${Math.round(S.stock[g] || 0)} (${E.price(st, S, g)})`).join(', ') : '-';
const snap = () => { line(`  ${show(shop(/Emporio/), ['corda', 'sacchi', 'spugne', 'colla', 'caffe', 'scatolame', 'benzina'])}`); line(`  ${show(shop(/Macelleria/))}`); line(`  ${show(shop(/Frutta/))}`); line(`  ${show(shop(/Fabbro/))}`); line(`  ${show(shop(/Falegnam/))}`); line(`  ${show(shop(/Panetteria|Forno/))}`); line(`  ${show(shop(/Osteria/), ['pasto', 'carne', 'pesce', 'verdura', 'pasta'])}`); line(`  ${show(shop(/Wu/), ['pane', 'verdura', 'latte', 'pasta', 'caffe'])}`); line(`  ${show(shop(/Piazza San Rocco|mercato/i))}`); };
line(`\n${clk(st.t)}`); snap();
const t0 = Date.now(); let frames = 0;
for (let d = 0; d < days; d++) {
  const end = st.t + 1440; while (st.t < end) { G.step(st, 1 / 30, {}); frames++; if (d === 1 && st.t >= end - 1440 + 600 && !st._blk) { st._blk = 1; } }
  const R = E.report(st); line(`\n${clk(st.t)} — ${JSON.stringify(R.stats)} · mancato: ${Object.entries(R.mancanze).map(([k, v]) => `${k} ${v}`).join(', ')}`); snap();
  line(`  Vuoti: ${R.vuoti.slice(0, 14).join('; ')}${R.vuoti.length > 14 ? ` … (${R.vuoti.length})` : ''}`);
}
// una settimana con la nave bloccata dalla Tutela
E.eco(st).blocked = true; run(3 * 1440); line(`\nDopo tre giorni di nave bloccata (${clk(st.t)}):`); snap();
const sc = []; st.npcs.forEach(n => n.pop && n.pop.diary.forEach(e => { if (e.tag === 'scarsita' && e.t > st.t - 1440) sc.push(`${n.first}: ${e.text}`); }));
line(`  Lamentele dell'ultimo giorno (${sc.length}): ${sc.slice(0, 8).join(' · ')}`);
const th = []; st.npcs.forEach(n => n.pop && n.pop.thoughts.forEach(t => { if (/Emporio|botteghe vuote|affama/.test(t.text) && t.t > st.t - 1440) th.push(`${n.first}: ${t.text}`); })); line(`  Pensieri: ${th.length} — ${th.slice(0, 4).join(' · ')}`);
E.eco(st).blocked = false;
// il lavoro clandestino, forzato
const art = st.npcs.find(n => n.pop && !n.pop.cast && !n.dead && n.ris && n.pop.intW.arte) || st.npcs.find(n => n.pop && !n.pop.cast && n.ris);
art.ris.ideo = .8; art.tr.cor = .8; art.pop.money = 60;
const pj = Popolo._.startProject(st, art, Popolo._.PROJ.clandestino);
line(`\nClandestino: ${art.name} (${art.role}) — ${pj ? pj.steps.map(s => s.label).join(' → ') : 'non parte'}`);
const tA = st.t; run(4 * 1440);
line('  ' + art.pop.diary.filter(e => e.t >= tA && /stamp|manifest|libretto|carta|Grigi|perquis|muro/.test(e.text)).map(e => `${clk(e.t)} ${e.text}`).join('\n  '));
const readers = st.npcs.filter(n => n.pop && n.pop.diary.some(e => e.tag === 'libretto')); line(`  Hanno letto un libretto: ${readers.map(n => n.first).join(', ') || 'nessuno'}. Stampe in città: ${E.eco(st).stats.clandestino || 0}`);
// oggetti comprati dove ci sono: corda e sacchi
const k = st.npcs.find(n => n.pop && !n.pop.cast && !n.dead && n.jailedUntil <= st.t); k.pop.money = 50;
const r = A.intend(st, k, 'barrica', {}); line(`\nBarricarsi in casa (${k.name}): ${r.ok ? r.plan.steps.map(s => s.label).join(' → ') : r.why}`);
line(`\n${frames} passi nei primi ${days} giorni, ${((Date.now() - t0) / frames).toFixed(2)} ms per passo (media su tutto).`);
console.log(out.join('\n'));
