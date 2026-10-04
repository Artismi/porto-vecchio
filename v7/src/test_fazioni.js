// Prova delle fazioni: la Famiglia (15 uomini, aiutanti temporanei, nuovi uomini solo dai 3 fidati col sì del capo, tetto 20)
// e la Risacca (tetto 15, 3 collaboratori a testa, cellule autonome). Uso (dalla cartella src): node test_fazioni.js [giorni] [seme]
global.World = require('./world.js'); global.Interior = require('./interiors.js');
global.Game = require('./game.js'); global.Risacca = require('./risacca.js'); global.Popolo = require('./popolo.js'); global.Azioni = require('./azioni.js'); global.Economia = require('./economia.js');
global.Fazioni = require('./fazioni.js');
const G = Game, RS = Risacca, F = Fazioni, days = +process.argv[2] || 5, seed = +process.argv[3] || 1;
const st = G.create(seed);
const by = id => st.npcs.find(n => n.id === id);
const out = []; const line = s => { out.push(s); };
const ok = (cond, what) => line(`${cond ? 'OK  ' : 'NO  '} ${what}`);
const step = mins => { const end = st.t + mins; while (st.t < end) G.step(st, 1 / 30, { mx: 0, my: 0, aim: { x: st.player.x + 1, y: st.player.y } }); };

line('=== PARTENZA ===');
let R = F.report(st); line(JSON.stringify(R.famiglia));
ok(R.famiglia.uomini === 15, `la Famiglia parte con 15 uomini (${R.famiglia.uomini})`);
ok(R.famiglia.fidati.length === 3, `tre fidati: ${R.famiglia.fidati.join(', ')}`);
const capo = by('capo'); ok(capo && capo.inside && capo.fam.rank === 'capo', `il capo esiste, è chiuso in casa (${st.fam.hq.label}) e non ha nome («${capo.name}»)`);
ok(!st.npcs.some(n => /Squalo/.test(n.name)), 'nessuno si chiama più «lo Squalo»');
const sold = F.men(st).filter(n => n.fam.rank === 'soldato'); line(`Soldati: ${sold.map(n => `${n.first} (${n.fam.role}, risponde a ${G.nameOf(st, n.fam.boss)})`).join('; ')}`);
line(`Tatuaggi di ${sold[0].first}: ${sold[0].fam.tattoos.join(', ')}`);

// --- tre membri, come a metà partita; qualcuno in città ha un motivo per arrabbiarsi
['lupo', 'vinile', 'cono'].forEach(id => { const n = by(id); if (n) RS.join(st, n, 'prova'); });
st.npcs.filter(n => n.pop && !n.pop.cast && n.ris && !n.ris.member && n.ris.ideo > .5).slice(0, 12).forEach(n => { n.pop.need.rabbia = .5; });
F._.cellNight(st); F._.cellNight(st);
line(`Cellule dopo la prima notte: ${Object.values(st.ris.cells).map(c => `«${c.name}» (${c.members.map(id => G.nameOf(st, id)).join(', ')}${c.accepted ? `, contatto ${G.nameOf(st, c.contact)}` : ''})`).join('; ') || 'nessuna'}`);
// --- giorni di vita
line('\n=== GIORNI ===');
const t0 = Date.now(); let steps = 0; const realStart = Date.now();
for (let d = 0; d < days; d++) {
  const a = Date.now(); step(1440); steps++;
  R = F.report(st);
  line(`${Popolo.wdName(st.t)}: Famiglia ${R.famiglia.uomini}/${R.famiglia.tetto} (fidati ${R.famiglia.fidati.join(', ')}; in cella ${R.famiglia.inCella}; visite al capo ${R.famiglia.visiteAlCapo}) ${JSON.stringify(R.famiglia.stats)}`);
  line(`   Risacca ${R.risacca.membri}/15, collaboratori ${R.risacca.collaboratori}, morale ${R.risacca.morale}, repr ${R.risacca.repr}; cellule: ${R.risacca.cellule.join('; ') || 'nessuna'}  [${((Date.now() - a) / 1000).toFixed(1)} s]`);
}
// --- Risacca: riempio fino al tetto e provo il sedicesimo
line('\n=== RISACCA: IL TETTO DEI 15 ===');
const cands = st.npcs.filter(n => n.pop && !n.pop.cast && !n.fam && !n.cop && !n.faction && n.ris && !n.ris.member).sort((a, b) => b.ris.ideo - a.ris.ideo);
let joined = 0; for (const n of cands) { if (RS.members(st).length >= 15) break; if (RS.join(st, n, 'prova') !== false) joined++; }
ok(RS.members(st).length === 15, `15 membri (${RS.members(st).length})`);
const sedici = cands.find(n => !n.ris.member);
ok(RS.join(st, sedici, 'prova') === false && !sedici.ris.member, `il sedicesimo (${sedici.first}) non entra`);
const r16 = RS.order(st, sedici, 'unisciti', {}, { force: true }); line(`  risposta: ${r16.msg}`);

// --- collaboratori: 3 a testa, non di più
line('\n=== COLLABORATORI ===');
const m0 = RS.members(st).find(m => F.collabsOf(st, m).length === 0) || RS.members(st)[0]; F.collabsOf(st, m0).forEach(k => {});
const pool = st.npcs.filter(n => n.pop && !n.pop.cast && !n.fam && !n.cop && n.ris && !n.ris.member && !n.ris.collabOf && !n.cell).slice(0, 5);
pool.slice(0, 3 - F.collabsOf(st, m0).length).forEach(k => F.addCollab(st, m0, k));
ok(F.collabsOf(st, m0).length === 3, `${m0.first} ha 3 collaboratori: ${F.collabsOf(st, m0).map(k => k.first).join(', ')}`);
const r4 = F.askCollab(st, m0, pool[3]); ok(!r4.ok, `il quarto no: «${r4.msg}»`);
const pl = RS.plan(st, m0, 'collaboratore', { persona: pool[3].id }); ok(!!pl.err, `anche da ordine: «${pl.err}»`);
const m1 = RS.members(st)[1]; const pl2 = RS.plan(st, m1, 'collaboratore', { persona: pool[4].id }); ok(!pl2.err, `un altro membro può: ${pl2.desc}`);
line(`  segreto di ${pool[0].first} per la chat: ${RS.CARDS[pool[0].id].secret}`);


const fam = F.report(st).famiglia;
ok(fam.uomini <= 20, `la Famiglia non supera 20 (${fam.uomini})`);
ok(RS.members(st).length <= 15, 'la Risacca non supera 15');
ok(RS.members(st).every(m => F.collabsOf(st, m).length <= 3), 'nessun membro ha più di 3 collaboratori');
ok(st.fam.stats.aiuti > 0, `gli uomini della Famiglia si sono presi aiutanti temporanei (${st.fam.stats.aiuti} volte)`);
const helpersNow = F.men(st).filter(n => n.fam.helper).length; ok(helpersNow <= F.men(st).length, `aiutanti in questo momento: ${helpersNow} (al massimo uno per uomo)`);
const newMen = F.men(st).filter(n => n.fam.by); line(`Nuovi uomini: ${newMen.map(n => `${n.first} (garante ${G.nameOf(st, n.fam.by)})`).join(', ') || 'nessuno'}`);
ok(newMen.every(n => st.fam.fidati.includes(n.fam.by) || by(n.fam.by).fam), 'ogni nuovo uomo l\'ha portato un fidato');
const h = Object.entries(st.fam.helpers).sort((a, b) => b[1].times - a[1].times)[0];
if (h) { const k = by(h[0]); line(`Aiutante più usato: ${k.name} (${h[1].times} volte). Diario: ${k.pop.diary.filter(e => e.tag === 'famiglia').slice(-2).map(e => e.text).join(' / ')}`); }
const cells = Object.values(st.ris.cells);
line(`Cellule nate: ${cells.length}. ${cells.map(c => `«${c.name}»: ${c.members.map(id => G.nameOf(st, id)).join(', ')}; ${c.accepted ? `accolta, contatto ${G.nameOf(st, c.contact)}` : 'non ancora accolta'}; azioni: ${c.log.map(l => l.what).join(' | ') || '—'}`).join('\n  ')}`);
const col = Object.entries(st.ris.collab).sort((a, b) => (b[1].helped + b[1].money) - (a[1].helped + a[1].money))[0];
if (col) line(`Collaboratore più attivo: ${G.nameOf(st, col[0])} per ${G.nameOf(st, col[1].of)} (aiuti ${col[1].helped}, soldi ${col[1].money}.000, avvisi ${col[1].warned})`);
line(`\nRapporti dalla squadra (ultimi):\n  ${st.ris.inbox.slice(0, 10).map(m => `${G.clockStr(m.t)} ${G.nameOf(st, m.npc)}: ${m.text}`).join('\n  ')}`);
line(`\nTempo: ${((Date.now() - realStart) / 1000).toFixed(1)} s per ${days} giorni`);
console.log(out.join('\n'));
