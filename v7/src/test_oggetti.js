// Prova degli oggetti: il catalogo, le botteghe, la produzione con le ricette, la nave, il giocatore che compra, fruga, fabbrica, scambia, costruisce.
// Uso: node test_oggetti.js [giorni] [seme]
global.World = require('./world.js'); global.Interior = require('./interiors.js');
global.Game = require('./game.js'); global.Risacca = require('./risacca.js'); global.Popolo = require('./popolo.js'); global.Azioni = require('./azioni.js');
try { global.Livelli = require('./livelli.js'); } catch (e) { }
global.Economia = require('./economia.js'); global.Fazioni = require('./fazioni.js'); global.Soldi = require('./soldi.js'); global.Oggetti = require('./oggetti.js');
try { global.Protagonista = require('./protagonista.js'); } catch (e) { console.log('protagonista:', e.message); }
const G = Game, O = Oggetti, days = +process.argv[2] || 2, seed = +process.argv[3] || 1;
const line = s => console.log(s), errs = [], ok = (c, s) => { if (!c) errs.push(s); };
const st = G.create(seed);
const run = mins => { const end = st.t + mins; while (st.t < end) G.step(st, 1 / 30, {}); };
// controlli statici: ogni ricetta usa oggetti che esistono, ogni bottega vende oggetti veri, ogni postazione ha un mobile
Object.values(O.RECIPES).forEach(r => { Object.keys(r.in).concat(Object.keys(r.out), r.tools).forEach(k => k.split('|').forEach(id => ok(O.CAT[id], `ricetta ${r.id}: oggetto sconosciuto ${id}`))); if (r.st) r.st.split('|').forEach(s => ok(O.STATIONS[s], `ricetta ${r.id}: postazione ${s}`)); });
O.SHOPLIST.forEach(([ref, l]) => l.forEach(g => ok(O.CAT[g], `bottega ${ref}: ${g}`)));
Object.entries(O.BUILD.struct).concat(Object.entries(O.BUILD.module)).forEach(([k, c]) => Object.keys(c).forEach(x => x.split('|').forEach(id => ok(O.CAT[id], `costruzione ${k}: ${id}`))));
[O.LOOT, ...Object.values(O.ROOM_LOOT), O.SPOT_LOOT].forEach(T => Object.entries(T).forEach(([k, l]) => l.forEach(([id]) => ok(id[0] === '$' || O.CAT[id], `bottino ${k}: ${id}`))));
line(`Catalogo: ${Object.keys(O.CAT).length} oggetti, ${Object.keys(O.RECIPES).length} ricette, ${Object.keys(O.STATIONS).length} postazioni, ${Economia.SELL.length} botteghe`);
// i luoghi di lavoro e di scambio: bancone, postazioni, chi ci lavora
const LL = O.luoghi(st), lv = Object.values(LL);
line(`Luoghi: ${lv.length} (${lv.filter(l => l.shop).length} con bancone, ${lv.filter(l => !l.indoor).length} all'aperto), lavoratori con un posto: ${st.npcs.filter(n => n.pop && n.pop.post).length}/${st.npcs.filter(n => n.pop && n.pop.job).length}`);
['fabbro', 'falegnameria', 'panetteria', 'macelleria'].forEach(u => { const b = G.BUILDINGS.findIndex(b => b.use === u); const Lg = lv.find(l => l.bi === b); line(`  ${u}: ${Lg ? Lg.posts.map(q => `${q.st}${q.who ? ' (' + G.byId(st, q.who).first + ')' : ''}`).join(', ') + (Lg.banco ? ` · banco: ${Lg.banco.who.map(id => G.byId(st, id).first).join(', ') || '-'}` : '') : 'manca'}`); ok(Lg && Lg.posts.length, `${u} senza postazioni`); });
const molo = lv.find(l => l.pid === 'molo'); line(`  molo: ${molo ? `banco ${molo.banco ? 'sì' : 'no'}, ${molo.staff.length} pescatori` : 'manca'}`);
ok(O.scatterInit(st).length > 200, 'pochi nascondigli sparsi');
const sc = {}; O.scatterInit(st).forEach(c => { sc[c.kind] = (sc[c.kind] || 0) + 1; }); line(`Roba sparsa: ${JSON.stringify(sc)}`);
const t0 = Date.now();
for (let d = 0; d < days; d++) {
  run(1440); const R = O.report(st);
  line(`giorno ${d + 1}: ${JSON.stringify(R.stats)} · scaffali vuoti ${R.vuoti}`);
}
{ while (G.hour(st) < 9 || G.hour(st) > 12) run(30); run(20); const postOf = n => { const Lg = O.luoghi(st)[n.pop.post.k]; return n.pop.post.i === -1 ? Lg.banco : n.pop.post.i >= 0 ? Lg.posts[n.pop.post.i] : n.pop.post; }; const pw = st.npcs.filter(n => n.pop && n.pop.post && n.pop.post.i >= -2 && n.pop.cur && n.pop.cur.act === 'lavoro' && !n.inside).filter(n => { const q = postOf(n); return !q || Math.hypot(n.x - q.x, n.y - q.y) < 40; }); /* chi è ancora in cammino verso un posto lontano non conta */ const atp = pw.filter(n => { const q = postOf(n); return q && Math.hypot(n.x - q.x, n.y - q.y) < 1.5; }); line(`Al lavoro all'aperto: ${pw.length}, al loro posto: ${atp.length}`); ok(!pw.length || atp.length / pw.length > .5, 'i lavoratori all\'aperto non stanno al loro posto'); }
const R = O.report(st);
line('Laboratori:'); R.laboratori.slice(0, 14).forEach(l => line('  ' + l));
line(`Vuoti: ${R.esempiVuoti.join('; ')}`);
line(`Mancanze: ${JSON.stringify(R.mancanze)}`);
ok(R.stats.ricette > 20, 'gli abitanti non hanno prodotto quasi niente');
if (Soldi.report) { const S = Soldi.report(st); line(`Soldi: Banco quadra ${S.banca.quadra}, fuori dai conti ${S.leak}`); ok(Math.abs(S.banca.quadra) < 1, 'il Banco non quadra'); }

// ---------------- il giocatore ----------------
const p = st.player, E = Economia.eco(st), A = (id, arg, ex) => { const r = O.act(st, id, arg, ex); line(`  ${id} ${arg || ''} ${ex ? JSON.stringify(ex) : ''}: ${r.ok ? 'sì' : 'no'} — ${r.msg}`); return r; };
const go = t => { p.indoor = null; p.x = t.x; p.y = t.y; };
line('\nIl giocatore'); p.money = 500;
while (G.hour(st) < 9 || G.hour(st) > 17) run(30);
const shop = re => Object.values(E.shops).find(s => re.test(s.label));
const fer = shop(/Ferramenta/), wu = shop(/Wu/), emp = Object.values(E.shops).find(s => s.emporio);
line(`  ferramenta: ${O.counter(st, fer.k).goods.map(g => `${g.name} ${g.price} (${g.stock})`).join(', ')}`);
go(fer.t); ['martello', 'sega', 'chiodi', 'cacciavite', 'pinze', 'nastro', 'cavo', 'pile', 'forbici'].forEach(g => A('compra', fer.k, { g, q: g === 'chiodi' ? 2 : 1 }));
go(wu.t); A('compra', wu.k, { g: 'pane', q: 2 }); A('compra', wu.k, { g: 'salame' }); A('compra', wu.k, { g: 'acqua', q: 2 }); A('compra', wu.k, { g: 'zucchero' }); A('compra', wu.k, { g: 'latte', mode: 'consuma' });
line(`  ricette possibili qui: ${O.recipesView(st).list.filter(r => r.ok).map(r => r.id).join(', ')}`);
A('fai', 'kit'); ok(O.inv(st).kit >= 1, 'il kit di sabotaggio non è venuto');
A('usa', 'acqua');
// dal falegname: niente banco qui fuori, dentro sì
const fal = G.BUILDINGS.findIndex(b => b.use === 'falegnameria'); const LgF = Object.values(O.luoghi(st)).find(l => l.bi === fal), bf = LgF.posts[0];
go(Object.values(E.shops).find(s => /Falegn/.test(s.label)).t); A('fai', 'casse'); A('compra', Object.values(E.shops).find(s => /Falegn/.test(s.label)).k, { g: 'assi', q: 2 });
p.indoor = { b: fal, f: 0 }; p.x = bf.x; p.y = bf.y;
line(`  dentro la falegnameria: postazioni ${[...O.stationsHere(st)].join(', ')} · azioni: ${O.here(st).map(a => a.label).join(' | ')}`);
A('fai', 'casse'); A('fai', 'branda');
// frugare in una casa
let fr = [];
for (let bi = 0; bi < G.BUILDINGS.length && !fr.length; bi++) { const b = G.BUILDINGS[bi]; if (b.use !== 'casa' || !b.door || b.playerHome) continue; const Lh = Interior.layout(b); for (const o of Lh.floors[0].furn) { p.indoor = { b: bi, f: 0 }; p.x = o.x; p.y = o.y + .8; fr = O.containersHere(st); if (fr.length) break; } }
line(`  in casa: ${fr.map(c => c.label).join(' | ')}`);
const fv = O.frugaView(st, fr[0].ref); line(`  ${fv.label}: ${fv.items.map(i => `${i.nome} ×${i.q}`).join(', ') || 'vuoto'}`);
A('prendi_tutto', fr[0].ref);
// la cassa di una bottega: si apre col piede di porco
const tab = G.BUILDINGS.findIndex(b => b.use === 'tabacchi'); const Lt = Interior.layout(G.BUILDINGS[tab]); const ci = Lt.floors[0].furn.findIndex(o => o.id === 'ar_cash-register');
if (ci >= 0) { p.indoor = { b: tab, f: 0 }; p.x = Lt.floors[0].furn[ci].x; p.y = Lt.floors[0].furn[ci].y + .7; const c = O.containersHere(st).find(c => /registratore/.test(c.label)); A('apri', c.ref); O.givePlayer(st, 'piede', 1); A('apri', c.ref); const v = O.frugaView(st, c.ref); line(`  cassa: ${v.items.map(i => i.nome).join(', ')}`); if (v.items[0]) A('prendi', c.ref, { g: '$' }); }
p.indoor = null;
// la discarica: rottami da smontare
go(G.PLACES.discarica); const d = O.containersHere(st)[0]; line(`  discarica: ${O.frugaView(st, d.ref).items.map(i => `${i.nome} ×${i.q}`).join(', ')}`); A('prendi_tutto', d.ref);
['sm_radio', 'sm_tv', 'sm_elettro', 'sm_mobile'].forEach(r => { if (O.inv(st)[O.RECIPES[r] && Object.keys(O.RECIPES[r].in)[0]]) A('fai', r); });
// vendere al mercato nero, scambiare con qualcuno
const mag = Object.values(E.shops).find(s => s.black); go(mag.t); line(`  il mercato nero compra: ${O.counter(st, mag.k).buys.map(b => `${b.name} ${b.price}`).join(', ')}`);
const n = st.npcs.find(k => k.pop && !k.dead && Object.keys(k.pop.inv || {}).some(x => O.CAT[x]));
const bv = O.barterView(st, n.id); line(`  ${bv.name} ha: ${bv.theirs.map(t => `${t.nome} ×${t.q}`).join(', ')}`);
if (bv.theirs[0]) { A('scambia', n.id, { get: { [bv.theirs[0].id]: 1 }, lire: 0 }); A('scambia', n.id, { get: { [bv.theirs[0].id]: 1 }, lire: Math.ceil(bv.theirs[0].v * 1.6) + 1 }); }
// costruire: una baracca con oggetti veri
if (st.ris && Risacca.startSite) {
  line(`  materiali (categoria) in tasca e in base: ${Risacca.totalRes(st, 'materiali').toFixed(1)}`);
  const lots = (Risacca.LOTS || []).map(l => l.id); const r0 = lots.length ? Risacca.startSite(st, lots[0], 'baracca') : 'niente lotti'; line(`  baracca senza roba: ${r0}`);
  ['assi', 'lamiera', 'chiodi', 'travi'].forEach(g => O.givePlayer(st, g, 4, true));
  const r1 = lots.length ? Risacca.startSite(st, lots[0], 'baracca') : 'niente lotti'; line(`  baracca con la roba: ${r1 || 'cantiere aperto'}`); ok(!r1, 'la baracca non parte con la roba giusta');
}
// il bottino: roba sparsa, cerca, cadaveri, bagagliai, casse al porto, borseggio
p.indoor = null; const c0 = O.scatterInit(st).find(c => c.kind === 'cestino' && Object.keys(c.items).length) || O.scatterInit(st).find(c => !c.roof && Object.keys(c.items).length); go(c0);
A('cerca'); const h0 = O.containersHere(st); line(`  qui: ${h0.map(c => c.label).join(' | ')}`); ok(h0.length, 'la roba sparsa non si trova'); if (h0[0]) A('prendi_tutto', h0[0].ref);
const vic = st.npcs.find(n => n.pop && !n.dead && n.pop.money > 5 && !n.inside); vic.stun = 30; go({ x: vic.x + .5, y: vic.y }); const cc = O.containersHere(st).find(c => c.ref.startsWith('c:')); line(`  a terra: ${cc ? O.frugaView(st, cc.ref).items.map(i => `${i.nome} (${i.tier})`).join(', ') : 'niente'}`); ok(cc, 'non si fruga chi è a terra'); if (cc) A('prendi_tutto', cc.ref); vic.stun = 0;
const car = (st.vehicles || []).find(v => !v.rider && !v.traffic && !v.wreck && !v.mine && !/vespa/.test(v.kind)); if (car) { go({ x: car.x + 1.5, y: car.y }); const tc = O.containersHere(st).find(c => c.ref.startsWith('v:')); if (tc) { A('apri', tc.ref); line(`  bagagliaio: ${O.frugaView(st, tc.ref).items.map(i => i.nome).join(', ')}`); } else line('  bagagliaio: non raggiunto'); }
if (G.PLACES.calata) { go(G.PLACES.calata); const gc = O.containersHere(st).find(c => c.ref.startsWith('g:')); line(`  porto: ${gc ? gc.label + ' — ' + Object.keys(O.contByRef(st, gc.ref).items).map(O.nm).join(', ') : 'niente'}`); }
const vit = st.npcs.find(n => n.pop && !n.dead && !n.inside && (n.pop.money > 5 || Object.keys(n.pop.inv || {}).length)); go({ x: vit.x - .8, y: vit.y }); p.sneak = true; A('borseggia', vit.id); p.sneak = false;
// il bancone chiuso di notte (se il bottegaio non c'è)
line(`\nIn tasca: ${O.pocketsView(st).items.map(i => `${i.nome} ×${i.q}`).join(', ')} (${O.pocketsView(st).peso} kg)`);
line(`\n${Math.round((Date.now() - t0) / 1000)} s.`);
if (errs.length) { line('ERRORI:'); errs.forEach(e => line('  ' + e)); process.exit(1); } else line('Tutto a posto.');
