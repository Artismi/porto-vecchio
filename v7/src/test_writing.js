// prova del writing: il treno e il suo orario, i writer dell'isola, la notte e la mattina, la fama, i crossaggi, le bombolette
global.World = require('./world.js'); global.Interior = require('./interiors.js');
global.Game = require('./game.js'); global.Risacca = require('./risacca.js'); global.Popolo = require('./popolo.js'); global.Azioni = require('./azioni.js');
global.Economia = require('./economia.js'); global.Fazioni = require('./fazioni.js'); global.Soldi = require('./soldi.js'); global.Oggetti = require('./oggetti.js');
global.Graffiti = require('./graffiti.js'); global.Livelli = require('./livelli.js'); global.Sottosuolo = require('./sottosuolo.js'); global.Tetti = require('./tetti.js'); global.Writing = require('./writing.js');
const G = Game, WR = Writing, st = G.create(1), p = st.player;
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };
const DT = 1 / 30, run = s => { for (let i = 0; i < s * 30; i++) G.step(st, DT, { x: 0, y: 0 }); };
const at = (h, m) => { const d = Math.floor(st.t / 1440); st.t = d * 1440 + h * 60 + (m || 0); };

// il treno della miniera
const TR = WR.TR; ok(TR.ok && TR.len > 900, `la ferrovia della costa nord: ${TR.len} m, treno di ${Math.round(TR.LEN)} m (due diesel e quattro carri)`);
const A = WR.railAt(0), Z = WR.railAt(TR.len), mine = G.PLACES.miniera;
ok(Math.hypot(A.x - mine.x, A.y - mine.y) < 30, `parte dalla miniera (${A.x.toFixed(0)}, ${A.y.toFixed(0)})`);
ok(Z.x > 1520 && Math.hypot(Z.x - G.PLACES.eliporto.x, Z.y - G.PLACES.eliporto.y) < 80, `arriva al porto militare della Base (${Z.x.toFixed(0)}, ${Z.y.toFixed(0)})`);
const nord = G.MAP.roads.find(r => r.id === 'nord'); let north = 0, n = 0; for (let s = 0; s <= TR.len; s += 20) { const q = WR.railAt(s); if (q.x > 1480) continue; n++; let best = null, bd = 1e9; nord.pts.forEach(p => { const d = Math.abs(p[0] - q.x); if (d < bd) { bd = d; best = p; } }); if (Math.abs(q.y - best[1]) < 40) north++; }
ok(north / n > .95, `resta sulla costa nord, vicino alla Costiera Nord (${north}/${n} punti)`);
ok(G.layout().rail.conflicts === 0, 'nessuna casa sul binario');
at(23); let tr = WR.trainAt(st.t); ok(tr.parked && tr.at === 'miniera', 'di notte il treno dorme in deposito alla miniera');
at(3); ok(WR.trainAt(st.t).parked, 'alle 3 è ancora lì');
let seen = { porto: 0, miniera: 0, viaggio: 0 }; for (let m = 6 * 60; m < 22 * 60; m += 3) { const t = Math.floor(st.t / 1440) * 1440 + m, q = WR.trainAt(t); seen[q.at || 'viaggio']++; }
ok(seen.porto > 0 && seen.miniera > 0 && seen.viaggio > 0, `di giorno fa le corse: in viaggio ${seen.viaggio}, al porto ${seen.porto}, alla miniera ${seen.miniera} (campioni)`);
at(6, 0); const a = WR.trainAt(st.t); at(22, 0); const b = WR.trainAt(st.t); ok(Math.abs(a.s - TR.sMine) < .5 && Math.abs(b.s - TR.sMine) < .5, 'alle 6 parte dal deposito e alle 22 ci torna (niente salti)');
const D = 1440 * Math.floor(st.t / 1440); let jump = 0; for (let m = 0; m < 1440; m++) { const p1 = WR.trainAt(D + m).s, p2 = WR.trainAt(D + m + 1).s; jump = Math.max(jump, Math.abs(p2 - p1)); } ok(jump < 30, `nessun salto minuto per minuto (massimo ${jump.toFixed(1)} m)`);
// il treno ingombra il binario
at(23); const q2 = WR.carPose(WR.trainAt(st.t), 2); p.x = q2.x; p.y = q2.y; p.lv = null; run(.1); const d2 = Math.abs(-(p.x - q2.x) * Math.sin(q2.ang) + (p.y - q2.y) * Math.cos(q2.ang)); ok(d2 > TR.W / 2, 'chi sta sul binario col treno fermo viene spostato di lato');

// i writer
run(.1); const W = WR.S(st); ok(W.writers.length >= 6, `i writer dell'isola: ${W.writers.map(id => { const n = G.byId(st, id); return n.pop.writer.aka + ' ' + n.pop.writer.crew; }).join(', ')}`);
ok(new Set(W.writers.map(id => G.byId(st, id).pop.writer.crew)).size === 3, 'tre crew');
// la notte: lavori nuovi
at(1, 30); W.night = -1; const n0 = W.works.length; run(.2); ok(W.works.length > n0, `di notte bombano: ${W.works.length - n0} lavori (${W.works.slice(n0).map(w => w.style).join(', ')})`);
ok(W.works.every(w => w.done && w.by !== 'player'), 'i lavori della notte sono finiti e sono loro');
// la mattina: le notizie
at(7); W.morning = -1; run(.1); ok(true, 'la mattina passa senza errori');

// il giocatore: una tag, un throw-up, la fama, le bombolette
const inv = Oggetti.inv(st); inv.bomboletta = 3; inv.pennarello = 1; W.aka = 'ZETA';
const gEl = G.MAP.elev[Math.floor(p.y / G.TS) * G.GW + Math.floor(p.x / G.TS)];
const mk = (style, extra) => WR._.addWork(st, Object.assign({ by: 'player', aka: 'ZETA', style, pal: 0, seed: 1, prog: 0, done: false, surf: 'muro', pos: { x: p.x, y: gEl + 1.4, z: p.y } }, extra || {}));
let w = mk('mtag'); let r; for (let i = 0; i < 200 && w.prog < 1; i++) r = WR.progress(st, w, .05); ok(w.prog >= 1 && r === 'fatto', 'la tag a pennarello si fa in un attimo');
const f0 = W.fame; WR.finish(st, w); ok(W.fame > f0, `la tag dà fama (${W.fame})`);
w = mk('throw'); const c0 = inv.bomboletta; for (let i = 0; i < 400 && w.prog < 1; i++) WR.progress(st, w, .05); WR.finish(st, w);
ok(w.done && (inv.bomboletta || 0) <= c0, `il throw-up consuma vernice (bombolette ${c0} → ${inv.bomboletta || 0}, ${W.canUse.toFixed(2)} di una in corso)`);
// senza bombolette il pezzo si ferma a metà
inv.bomboletta = 1; W.canUse = 0; w = mk('burner'); let res = null; for (let i = 0; i < 4000 && w.prog < 1; i++) { res = WR.progress(st, w, .05); if (res === null) break; }
ok(res === null && w.prog > .1 && w.prog < 1, `finite le bombolette il burner resta a metà (${Math.round(w.prog * 100)}%)`);
// in alto vale di più: heaven spot
const fa = W.fame; const w1 = mk('pezzo', { prog: 1 }); WR.finish(st, w1); const plain = W.fame - fa;
const fb = W.fame; const w2 = mk('pezzo', { prog: 1, pos: { x: p.x, y: gEl + 9, z: p.y } }); WR.finish(st, w2); const high = W.fame - fb;
ok(high > plain * 2, `un pezzo in alto (heaven spot) vale di più: ${high} contro ${plain}`);
ok(WR.rankOf(W.fame) !== 'toy' || W.fame < 25, `rango: ${WR.rankOf(W.fame)} (${W.fame})`);

// i crossaggi: una tag sopra un pezzo di un altro = beef; un pezzo sopra una tag = si può
const R0 = { c: { x: 10, y: 1.5, z: 10 }, n: { x: 1, z: 0 }, r: { x: 0, z: -1 }, W: 4, H: 2 };
const other = WR._.addWork(st, { by: W.writers[0], aka: 'DAKO', crew: 'PVK', style: 'pezzo', pal: 1, seed: 2, prog: 1, done: true, surf: 'muro', gfxRect: R0 });
const t1 = mk('tag', { gfxRect: Object.assign({}, R0, { W: 1, H: .5 }) }); W.beef = {}; const m1 = WR.judge(st, t1);
ok(W.beef.PVK > 0 && /crossato/.test(m1), `tag sopra un pezzo: ${m1}`);
const tagO = WR._.addWork(st, { by: W.writers[1], aka: 'KEOS', crew: 'BDS', style: 'tag', pal: 1, seed: 3, prog: 1, done: true, surf: 'muro', gfxRect: { c: { x: 20, y: 1.5, z: 20 }, n: { x: 1, z: 0 }, r: { x: 0, z: -1 }, W: 1, H: .5 } });
const big = mk('burner', { gfxRect: { c: { x: 20, y: 1.5, z: 20 }, n: { x: 1, z: 0 }, r: { x: 0, z: -1 }, W: 6, H: 2.5 } }); const m2 = WR.judge(st, big);
ok(!(W.beef.BDS > 0) && /si può/.test(m2), `burner sopra una tag: ${m2}`);
// il beef si paga: di notte ti crossano
W.works.filter(w => w.by === 'player').forEach(w => { w.done = true; w.erased = false; w.crossed = null; }); W.beef = { PVK: 3 }; let crossed = false;
for (let k = 0; k < 6 && !crossed; k++) { at(2); W.night = -1; WR.night(st); crossed = W.works.some(w => w.by === 'player' && w.crossed); }
ok(crossed, 'chi è stato crossato, crossa');

// il treno dipinto: tre giorni di linea, poi si lava; ogni mattina fama
const day = Math.floor(st.t / 1440); const tw = WR._.addWork(st, { by: 'player', aka: 'ZETA', style: 'wholecar', pal: 0, seed: 4, prog: 1, done: true, surf: 'treno', car: 1, side: 1, u0: .25, vb: .12, W: 14.5, H: 2.6, t0: st.t, tDone: st.t });
W.train.sides['1:1'] = [tw.id]; const fT = W.fame;
st.t = (day + 1) * 1440 + 7 * 60; W.morning = -1; WR.morning(st); ok(W.fame > fT && !tw.erased, `la mattina il treno esce col whole car: fama ${fT} → ${W.fame}`);
st.t = (day + 3) * 1440 + 7 * 60; W.morning = -1; WR.morning(st); ok(tw.erased && tw.washed, 'dopo tre giorni la fiancata si lava');

// il menu: chi sei come writer
p.hand = 'bomboletta'; const acts = Azioni.playerActions(st).filter(a => /writer/.test(a.id)); ok(acts.length >= 2 && /ZETA/.test(acts[0].label), `nel menu: «${acts.map(a => a.label).join(' | ')}»`);
ok(WR.cycleMode(st) !== 'libero' && WR.wants(st, 'bomboletta'), 'B cambia modalità e passa la mano al writing');
ok(WR.wants(st, 'pennarello'), 'il pennarello fa sempre la tag');
ok(Oggetti.CAT.pennarello && Azioni.ITEMS.pennarello, 'il pennarello si compra (ferramenta, tabacchi)');

console.log(fail ? `\n${fail} prove fallite` : '\ntutto bene');
process.exit(fail ? 1 : 0);
