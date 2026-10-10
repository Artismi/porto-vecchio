// prova della vita dei writer: i muri della città, le uscite di notte (muro, heaven spot dal tetto, treno), il palo e i Grigi, la città che si colora, gli stili
global.World = require('./world.js'); global.Interior = require('./interiors.js');
global.Game = require('./game.js'); global.Risacca = require('./risacca.js'); global.Popolo = require('./popolo.js'); global.Azioni = require('./azioni.js');
global.Economia = require('./economia.js'); global.Fazioni = require('./fazioni.js'); global.Soldi = require('./soldi.js'); global.Oggetti = require('./oggetti.js');
global.Graffiti = require('./graffiti.js'); global.Livelli = require('./livelli.js'); global.Sottosuolo = require('./sottosuolo.js'); global.Tetti = require('./tetti.js');
global.WriterArte = require('./writer_arte.js'); global.Writing = require('./writing.js'); global.WriterVita = require('./writer_vita.js');
const G = Game, WR = Writing, WV = WriterVita, WA = WriterArte, st = G.create(1), p = st.player;
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };
const DT = 1 / 30, run = s => { for (let i = 0; i < s * 30; i++) G.step(st, DT, { x: 0, y: 0 }); };
const at = (h, m) => { const d = Math.floor(st.t / 1440); st.t = d * 1440 + h * 60 + (m || 0); };
const runUntil = (f, maxS) => { for (let i = 0; i < maxS * 30; i++) { G.step(st, DT, { x: 0, y: 0 }); if (f()) return true; } return false; };

// i muri
const K = {}; WV.SITES.forEach(s => K[s.kind] = (K[s.kind] || 0) + 1);
ok(K.strada > 150 && K.hall > 20 && K.heaven > 30, `i muri della città: ${K.strada} di strada, ${K.hall} hall of fame, ${K.heaven} heaven spot`);
ok(WV.SITES.every(s => G.walkM(s.x, s.y) || s.kind === 'heaven'), 'chi dipinge per strada sta su una casella dove si cammina');
const hv = WV.SITES.filter(s => s.kind === 'heaven'); ok(hv.every(s => Tetti.roofAt(s.roof.x, s.roof.y) && Tetti.roofAt(s.roof.x, s.roof.y).bi === s.bi), 'dagli heaven spot si sta sul tetto dello stesso palazzo');

// i writer e i loro profili
run(.2); const W = WR.S(st); const ws = W.writers.map(id => G.byId(st, id));
ok(ws.every(n => n.pop.writer.fam && WA.FAM[n.pop.writer.fam]), `ognuno ha la sua mano: ${ws.map(n => n.pop.writer.aka + ' ' + n.pop.writer.fam).join(', ')}`);
ok(ws.some(n => n.pop.writer.roof) && ws.some(n => n.pop.writer.train), 'c\'è chi sale sui tetti e chi fa i treni');

// un'uscita sull'heaven spot, lontano dagli occhi: sale, dipinge, scende
at(23, 30); p.x = 50; p.y = 50;
const away = st.npcs.filter(n => n.cop || n.military).map(n => [n, n.x, n.y]); away.forEach(([n]) => { n.x = 5; n.y = 5; });   // niente Grigi in giro per questa prova
const a = ws.find(n => !n.pop.emer) || ws[0]; if (a.pop.emer) Azioni.endPlan(st, a, 'prova');
const n0 = W.works.length, E = WV.mission(st, a, 'heaven', null);
ok(!!E, `${a.pop.writer.aka} esce per un heaven spot: «${E && E.label}» (${E && E.steps.map(s => s.label).join(' → ')})`);
let up = false; const done = runUntil(() => { if (a.wrH > 3) up = true; return !a.pop.emer; }, 600);
const hw = E && E.work;
ok(done && up, `sale sul tetto (quota sopra la strada fino a più di 3 m) e torna giù: ${a.wrH == null ? 'di nuovo a terra' : a.wrH}`);
ok(hw && hw.done && hw.spot && hw.spot.h > 4, `il lavoro è finito, in alto: ${hw && hw.style} a ${hw && hw.spot.h.toFixed(1)} m ${hw && hw.place}`);

away.forEach(([n, x, y]) => { n.x = x; n.y = y; });
// un muro col palo: arrivano i Grigi e il pezzo resta a metà
const [b, c] = ws.filter(n => n !== a && !n.dead).slice(0, 2); [b, c].forEach(n => n.pop.emer && Azioni.endPlan(st, n, 'prova'));
const E2 = WV.mission(st, b, 'muro', c); ok(E2 && c.pop.emer && /palo/.test(c.pop.emer.label), `${b.pop.writer.aka} dipinge, ${c.pop.writer.aka} fa il palo`);
runUntil(() => E2.work && E2.work.prog > .2, 600);
const cop = st.npcs.find(n => n.cop && !n.dead); ok(!!cop, 'c\'è un agente');
const keep = { x: cop.x, y: cop.y }; cop.x = b.x + 2; cop.y = b.y + 2;
runUntil(() => !b.pop.emer, 20); const bw = E2.work;
ok(!b.pop.emer && bw && !bw.done && bw.prog < 1, `i Grigi! il ${bw && bw.style} resta al ${bw && Math.round(bw.prog * 100)}%`);
cop.x = keep.x; cop.y = keep.y;

// il treno al deposito
const tw0 = W.works.length; at(1, 0); const t = ws.find(n => !n.pop.emer && n !== b) ; const E3 = WV.mission(st, t, 'treno', null);
ok(!!E3, `${t.pop.writer.aka} va al deposito a fare il treno`); runUntil(() => !t.pop.emer, 900);
const trw = W.works.slice(tw0).find(w => w.surf === 'treno'); ok(trw && trw.done && W.train.sides[trw.car + ':' + trw.side].includes(trw.id), `whole car finito sulla fiancata ${trw && trw.car + ':' + trw.side}`);

// l'auto parcheggiata
{ const wa = ws.find(n => !n.pop.emer && !n.dead), aw0 = W.works.length; at(2, 0); const cars = st.vehicles.filter(v => !v.rider && !v.traffic && !v.hidden && !v.wreck && !v.military);
  let E4 = null; for (const v of cars) { wa.x = v.x + 3; wa.y = v.y + 3; E4 = WV.auto(st, wa); if (E4) break; } ok(!!E4, `${wa.pop.writer.aka}: «${E4 && E4.label}»`); if (E4) { runUntil(() => !wa.pop.emer, 600); const aw = W.works.slice(aw0).find(w => w.surf === 'auto'); ok(aw && aw.veh && (aw.done || aw.prog > 0), `sulla fiancata di ${aw && aw.veh}: ${aw && aw.style}${aw && aw.cop ? ' (la volante!)' : ''}`); } }
// il calendario della notte e la città che si colora
const v = WV.V(st); v.night = -1; at(21, 30); run(.1); ok(v.plan.length >= 2, `stanotte escono in ${v.plan.length}: ${v.plan.map(q => q.kind).join(', ')}`);
const cov0 = WV.coverage(st); for (let k = 0; k < 120; k++) { const s = WV.freeSite(st, ['strada', 'hall', 'heaven'], null); if (s) WR._.addWork(st, { by: ws[0].id, aka: 'TEST', crew: 'PVK', style: 'pezzo', pal: 1, seed: k, surf: 'muro', spot: { x: s.x, y: s.y, face: s.face, h: s.h }, prog: 1, done: true }); }
const cov1 = WV.coverage(st); ok(cov1 > cov0, `la città si colora: ${Math.round(cov0 * 100)}% → ${Math.round(cov1 * 100)}%`);
const wn = W.writers.length; W.grow = .6; WR.grow(st); WR.grow(st); ok(W.writers.length > wn, `la scena cresce: ${wn} → ${W.writers.length} writer`);

// gli stili: scelte diverse dal seme, sempre uguali per lo stesso lavoro
const picks = new Set(); for (let k = 1; k < 60; k++) { const C = WA.choose({ style: 'burner', seed: k, pal: k % 14 }); picks.add(C.fam + '/' + C.bgk + '/' + C.fillk + '/' + C.chr); }
ok(picks.size > 25, `${picks.size} combinazioni diverse di lettere, sfondi, riempimenti e personaggi su 59 burner (i personaggi sono rari: solo i king)`);
ok(JSON.stringify(WA.choose({ style: 'pezzo', seed: 7, pal: 2 })) === JSON.stringify(WA.choose({ style: 'pezzo', seed: 7, pal: 2 })), 'lo stesso lavoro si ridisegna uguale');

console.log(fail ? `\n${fail} prove fallite` : '\ntutto bene');
process.exit(fail ? 1 : 0);
