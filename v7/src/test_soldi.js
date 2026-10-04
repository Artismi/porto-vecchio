// Prova dei soldi: N giorni di vita (stipendi, affitti, bancomat, portavalori, decima, pizzo, macchinette, Lotto), poi il giocatore
// apre un conto, preleva, gioca, rapina. Controlla che il Banco quadri e quanto denaro compare o sparisce fuori dai conti.
// Uso: node test_soldi.js [giorni] [seme]
global.World = require('./world.js'); global.Interior = require('./interiors.js');
global.Game = require('./game.js'); global.Risacca = require('./risacca.js'); global.Popolo = require('./popolo.js'); global.Azioni = require('./azioni.js');
global.Economia = require('./economia.js'); global.Fazioni = require('./fazioni.js'); global.Soldi = require('./soldi.js');
const G = Game, So = Soldi, days = +process.argv[2] || 7, seed = +process.argv[3] || 1;
const line = s => console.log(s), clk = t => `${Popolo.WEEK[Popolo.weekday(t)]} ${G.clockStr(t)}`;
const st = G.create(seed);
const run = mins => { const end = st.t + mins; while (st.t < end) G.step(st, 1 / 30, {}); };
const errs = []; const ok = (c, s) => { if (!c) errs.push(s); };
// gli interni delle botteghe nuove (prima andavano in errore)
['emporio', 'macelleria', 'fabbro', 'falegnameria', 'banca'].forEach(u => { const b = G.BUILDINGS.find(b => b.use === u); try { Interior.layout(b); } catch (e) { errs.push(`interni di ${u}: ${e.message}`); } });
line(`Banco: ${G.BUILDINGS.find(b => b.use === 'banca').name} · ${clk(st.t)}`);
const t0 = Date.now(); let frames = 0;
for (let d = 0; d < days; d++) {
  const end = st.t + 1440; while (st.t < end) { G.step(st, 1 / 30, {}); frames++; }
  const R = So.report(st);
  line(`${clk(st.t)} · contanti ${R.contanti} · conti ${R.depositi} · caveau ${R.banca.caveau} · bancomat ${R.banca.bancomat.map(x => x.split(' ').pop()).join('/')} · Banco quadra ${R.banca.quadra} · fuori ${R.fuori} · fuori dai conti ${R.leak}`);
  line(`   gente: tasche ${R.gente.portafogli}, materassi ${R.gente.materassi}, conti ${R.gente.conti} (${R.gente.conConto} con conto, ${R.gente.senzaConto} senza), al verde ${R.gente.alVerde}, affitti arretrati ${R.gente.arretratiAffitto} · ditte: casse ${R.ditte.casse}, conti ${R.ditte.conti}, in rosso ${R.ditte.inRosso.length} · Stato ${R.stato} · Famiglia ${JSON.stringify(R.famiglia)}`);
  ok(Math.abs(R.banca.quadra) < 1, `il Banco non quadra (${R.banca.quadra}) il giorno ${d + 1}`);
}
const R = So.report(st);
line(`\nIn ${days} giorni: ${JSON.stringify(R.stats)}`);
line(`In rosso: ${R.ditte.inRosso.slice(0, 8).join('; ') || 'nessuno'}`);
line(`Notizie: ${R.notizie.join(' / ') || '-'}`);
const pp = st.npcs.filter(n => n.pop && !n.dead), D = n => n.pop.diary.filter(e => /stipendio|paga|affitto|bancomat|ufficiale|Grigi in bottega|Famiglia: si sono presi|macchinette|Lotto|conto/.test(e.text) && e.t > st.t - 2 * 1440).slice(-2).map(e => `${n.first}: ${e.text}`);
line(`Diari: ${pp.flatMap(D).sort(() => Math.random() - .5).slice(0, 8).join(' · ')}`);

// ---------------- il giocatore ----------------
const p = st.player, M = So.S(st), go = (x, y) => { p.x = x; p.y = y; }, A = (id, arg, ex) => { const r = So.act(st, id, arg, ex); line(`  ${id}: ${r.ok ? 'sì' : 'no'} — ${r.msg}`); return r; };
line('\nIl giocatore');
while (!So.bankOpen(st)) run(30);
const bt = So.bankT(); go(bt.x, bt.y); p.money = 400;
line(`  al Banco (${clk(st.t)}): ${So.here(st).map(a => a.label).join(' | ')}`);
A('apri_conto'); A('versa', null, { q: 250 }); A('prestito', null, { q: 200 }); A('preleva', null, { q: 50 });
const atm = M.atms[1]; go(atm.x, atm.y); A('atm_preleva', atm.id, { q: 100 });
const pv = So.playerView(st); line(`  conto ${Math.round(pv.conto.bal)}, in tasca ${Math.round(pv.wallet)}, prestito ${Math.round(pv.loan.amt)}`);
ok(Math.abs(pv.conto.bal - 300) < 1, `saldo atteso 300, è ${pv.conto.bal}`);
// al banco: un caffè, viveri per la banda, una corda in tasca
const E = Economia.eco(st), bar = Object.values(E.shops).find(s => /^Bar/.test(s.label) && s.sells.caffe), emp = Object.values(E.shops).find(s => s.emporio);
go(bar.t.x, bar.t.y); line(`  al bar: ${So.here(st).map(a => a.label).join(' | ')}`); A('compra', bar.k, { g: 'caffe', mode: 'consuma' });
go(emp.t.x, emp.t.y); A('compra', emp.k, { g: 'scatolame', q: 3, mode: 'banda' }); A('compra', emp.k, { g: 'corda', mode: 'tasche' });
ok((st.ris.inv.viveri || 0) >= 3 && (p.inv.corda || 0) >= 1, 'gli acquisti non sono arrivati');
// la cassa comune
A('cassa_metti', null, { q: 50 }); A('cassa_prendi', null, { q: 20 });
// macchinette: 400 giri da 1
const sl = M.slots[0]; sl.box = 500; p.money += 400; let bet = 0, won = 0; for (let i = 0; i < 400; i++) { const r = So.act(st, 'slot_gioca', sl.id, { bet: 1 }); if (r.ok) { bet += 1; won += r.win; } }
line(`  macchinette: giocati ${bet}, vinti ${Math.round(won)} (resa ${(won / bet * 100).toFixed(0)}%); resa teorica su 200.000 giri: ${(() => { let w = 0; for (let i = 0; i < 2e5; i++) w += So.spinOnce().mult; return (w / 2e5 * 100).toFixed(1); })()}%`);
// sette e mezzo
if (st.fam) st.fam.cash = Math.max(st.fam.cash, 300); let res = {};
for (let i = 0; i < 30; i++) { let r = So.act(st, 'bisca_puntata', null, { bet: 5 }); if (!r.ok) break; while (r.hand && !r.hand.over && r.hand.meP < 5) r = So.act(st, 'bisca_carta'); if (r.hand && !r.hand.over) r = So.act(st, 'bisca_sto'); res[r.hand.res] = (res[r.hand.res] || 0) + 1; }
line(`  sette e mezzo, 30 mani: ${JSON.stringify(res)}`);
// Lotto
const tab = Object.values(E.shops).find(s => /Tabacchi/.test(s.label)); A('lotto_gioca', tab.k, { nums: [7, 42], stake: 2 });
// le rapine
p.arms.pistola = { mag: 15, res: 30 }; p.cur = 'pistola'; p.hand = null; go(bt.x, bt.y); while (!So.bankOpen(st)) run(30);
const v0 = M.banca.vault; A('rapina'); ok(M.banca.vault < v0, 'la rapina non ha preso niente');
while (G.hour(st) !== 23) run(30); go(M.atms[2].x, M.atms[2].y); p.hand = 'piede'; p.inv.piede = 1; A('atm_scasso', M.atms[2].id);
// il portavalori: si aspetta il giro della sera e lo si assalta a una fermata
p.hand = null; p.cur = 'pistola'; let tries = 0, done = false;
while (tries++ < 60 * 30 && !done) { G.step(st, 1 / 30, {}); const v = So.van(st); if (M.van.crew && M.van.cargo > 0 && v && Math.abs(v.speed || 0) < 1 && G.hour(st) >= 18) { go(v.x + 1, v.y + 1); const h = So.here(st).find(a => a.id === 'sd_assalto'); if (h) { A('assalto'); done = true; } } }
line(`  portavalori: ${done ? 'assaltato' : 'nessuna occasione (giro ' + M.van.last + ', equipaggio ' + M.van.crew + ')'}`);
run(3 * 1440);
const R2 = So.report(st);
line(`\nDopo tre giorni: Banco quadra ${R2.banca.quadra}, caveau ${R2.banca.caveau}, patrimonio ${R2.banca.patrimonio}, rapine ${R2.stats.rapine} (${R2.stats.refurtiva}.000), Lotto: ${M.lotto.last ? M.lotto.last.nums.join(' ') + ' — ' + (M.lotto.last.wins.join(', ') || 'nessuno') : 'non ancora estratto'}`);
line(`Movimenti del giocatore: ${So.playerView(st).mov.slice(0, 8).map(m => `${m[1] > 0 ? '+' : ''}${m[1]} ${m[2]}`).join(' · ')}`);
ok(Math.abs(R2.banca.quadra) < 1, `il Banco non quadra alla fine (${R2.banca.quadra})`);
line(`\n${frames} passi nei primi ${days} giorni, ${((Date.now() - t0) / frames).toFixed(2)} ms per passo (media su tutto).`);
line(errs.length ? `ERRORI:\n  ${errs.join('\n  ')}` : 'Tutto a posto.');
process.exitCode = errs.length ? 1 : 0;
