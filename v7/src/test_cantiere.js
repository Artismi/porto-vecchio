// prova del cantiere del covo: in città solo al chiuso, la banda che disbosca e costruisce, il garage, l'officina
global.World = require('./world.js'); global.Interior = require('./interiors.js');
global.Game = require('./game.js'); global.Risacca = require('./risacca.js'); global.Popolo = require('./popolo.js'); global.Azioni = require('./azioni.js');
global.Economia = require('./economia.js'); global.Fazioni = require('./fazioni.js'); global.Soldi = require('./soldi.js'); global.Oggetti = require('./oggetti.js');
global.Livelli = require('./livelli.js'); global.Sottosuolo = require('./sottosuolo.js');
// il cantiere è un modulo della pagina: qui bastano due finte
global.addEventListener = () => {}; global.window = {}; global.document = { readyState: 'loading', addEventListener() {} };
global.Cantiere = require('./cantiere.js');
const G = Game, CN = Cantiere, st = G.create(1), p = st.player, TS = G.TS, W = G.MAP.world;
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };
const wait = s => { for (let k = 0; k < s * 10; k++) G.step(st, 1 / 10, { x: 0, y: 0 }); };
const bag = Oggetti.inv(st); Object.assign(bag, { assi: 60, chiodi: 20, travi: 30, lamiera: 30, mattoni: 40, malta: 10, cemento: 10, cerniere: 4, bulloni: 30, ferro: 20, tubi: 20, olio_motore: 4, molle: 10, bombola: 3, benzina: 10, stoffa: 10, corda: 4, lucchetto: 2, ascia: 1 });
// 1) un covo in città: fuori non si costruisce, dentro sì
const home = W.BUILDINGS.findIndex(b => b.door && b.w >= 4 && W.zone[(b.door[1]) * W.GW + b.door[0]] === W.Z.CITTA);
const b = W.BUILDINGS[home]; p.x = (b.door[0] + .5) * TS; p.y = (b.door[1] + .5) * TS; CN.claim(st);
ok(CN.inCity(p.x, p.y), 'il covo è in città');
let r = CN.place(st, CN.BY.muro_assi, p.x + 2, p.y + 2, 0); ok(!r.ok && /al chiuso/.test(r.msg), 'fuori, in città: ' + r.msg);
r = CN.place(st, CN.BY.rastrelliera, p.x + 1, p.y, 0); ok(!r.ok, 'fuori anche gli arredi: ' + r.msg);
G.enterBuilding(st, home); r = CN.place(st, CN.BY.rastrelliera, p.x, p.y, 0); ok(r.ok, 'dentro la stanza: ' + r.msg);
r = CN.place(st, CN.BY.deposito, p.x + .5, p.y, 0); ok(r.ok, 'dentro la stanza: ' + r.msg);
r = CN.place(st, CN.BY.garage, p.x, p.y, 0); ok(!r.ok, 'dentro casa niente garage: ' + r.msg);
G.exitBuilding(st);
// 2) fuori città, nel bosco: un covo, due membri della banda
let tx0 = 0, ty0 = 0; for (let ty = 30; ty < G.GH - 30 && !tx0; ty++) for (let tx = 330; tx < 380; tx++) { const i = ty * G.GW + tx; if (W.zone[i] !== W.Z.CITTA && G.tileAt(tx, ty) === G.T.TREE && G.walkT(tx - 1, ty) && G.walkT(tx - 2, ty)) { tx0 = tx; ty0 = ty; break; } }
p.x = (tx0 - 1.5) * TS; p.y = (ty0 + .5) * TS; CN.claim(st); console.log('    covo nel bosco', p.x.toFixed(0), p.y.toFixed(0));
const crew = st.npcs.filter(n => !n.dead && !n.cop && !n.military && n.ris !== undefined || true).filter(n => !n.cop && !n.dead).sort((a, c) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(c.x - p.x, c.y - p.y)).slice(0, 2);
crew.forEach(n => { Risacca.initNpc ? Risacca.initNpc(st, n) : 0; Risacca.join(st, n); n.x = p.x + 3; n.y = p.y; n.path = []; });
ok(CN.crewAll(st).length >= 2, 'due membri: ' + CN.crewAll(st).map(n => n.first).join(', '));
const legna0 = Object.values(CN.S(st).bauli || {}).reduce((s, B) => s + (B.legna || 0), 0);
CN.addJob(st, { op: 'disbosca', x: (tx0 + .5) * TS, y: (ty0 + .5) * TS });
let gs = null; for (let r0 = 4; r0 < 18 && !gs; r0 += 2) for (let a = 0; a < 16 && !gs; a++) { const x = p.x + Math.cos(a / 16 * 6.283) * r0, y = p.y + Math.sin(a / 16 * 6.283) * r0; if (!CN.canPlace(st, CN.BY.garage, x, y, 0)) gs = [x, y]; }
r = gs ? CN.place(st, CN.BY.garage, gs[0], gs[1], 0) : { msg: 'nessun posto per il garage' }; console.log('    ', r.msg);
for (let k = 0; k < 40 && CN.jobsView(st).length; k++) { wait(5); if (process.env.DBG) { const J = CN.S(st).jobs.find(j => !j.done), n = J && G.byId(st, J.who); console.log(k, J && J.op, n ? `${n.first} ${n.x.toFixed(1)},${n.y.toFixed(1)} step ${n.ris.task && n.ris.task.i} ${n.ris.task && n.ris.task.verb} act ${n.action && n.action.name} in ${n.inside}` : 'nessuno', 't', st.t.toFixed(0)); } }
const jv = CN.jobsView(st); ok(!jv.length, 'la banda ha finito: ' + (jv.length ? JSON.stringify(jv) : 'albero giù, garage su'));
ok(G.tileAt(tx0, ty0) !== G.T.TREE, 'l\'albero non c\'è più');
const legna = Object.values(CN.S(st).bauli || {}).reduce((s, B) => s + (B.legna || 0), 0); ok(legna > legna0, `la legna è nel baule del covo (${legna})`);
const gar = CN.S(st).obj.find(o => o.id === 'garage'); ok(gar && !gar.wip, 'il garage è finito');
// il portone largo: due caselle libere sul davanti
const fp = CN.footprint(CN.BY.garage, gar.x, gar.y, gar.rot); ok(fp.filter(q => q[2]).length === 10, `garage: ${fp.filter(q => q[2]).length} caselle di muro, portone di 2 caselle`);
// 3) l'officina del garage: la Giulia parcheggiata accanto
r = CN.place(st, CN.BY.officina_auto, gar.x, gar.y, 0); ok(r.ok, r.msg);
const v = st.vehicles.find(q => !q.traffic && !q.police && q.kind !== 'vespa' && !q.wreck); v.x = gar.x + 1; v.y = gar.y; v.rider = null; v.hp *= .5;
const V = CN.autoView(st, r.o.uid); console.log('    ', V.nome, 'carrozzeria', V.hp + '%', V.ups.map(u => u.nome + ':' + u.lvl).join(' '));
const sp0 = G.VK[v.kind].max; r = CN.autoUp(st, 'motore', r.o.uid); ok(r.ok && v.up.motore === 1, 'motore: ' + r.msg);
r = CN.autoUp(st, 'ripara', CN.S(st).obj.find(o => o.id === 'officina_auto').uid); ok(r.ok && v.hp === G.VK[v.kind].hp, 'riparata: ' + r.msg);
// 4) senza banda: fuori città lo fai da te
crew.forEach(n => Risacca.leave(st, n));
let cs = null; for (let r0 = 4; r0 < 18 && !cs; r0 += 2) for (let a = 0; a < 16 && !cs; a++) { const x = p.x + Math.cos(a / 16 * 6.283) * r0, y = p.y + Math.sin(a / 16 * 6.283) * r0; if (!CN.canPlace(st, CN.BY.capanno, x, y, 0)) cs = [x, y]; }
r = CN.place(st, CN.BY.capanno, cs[0], cs[1], 0); ok(r.ok && !r.o.wip, 'senza banda il capanno è subito fatto: ' + r.msg);
// 5) [survival] l'orto: zappa, semina, annaffia, aspetta, raccogli; l'alberello diventa albero
{
  Object.assign(bag, { zappa: 1, secchio: 1, patate: 2, legna: 3 });
  let ox = null; for (let r0 = 2; r0 < 16 && !ox; r0 += 2) for (let a = 0; a < 16 && !ox; a++) { const x = p.x + Math.cos(a / 16 * 6.283) * r0, y = p.y + Math.sin(a / 16 * 6.283) * r0, [tx, ty] = [Math.floor(x / TS), Math.floor(y / TS)]; if (!CN.cropCheck(st, CN.BY.ara, tx, ty) && !CN.cropCheck(st, CN.BY.ara, tx + 1, ty)) ox = [tx, ty]; }
  Object.assign(bag, { zappa: 1, secchio: 1, patate: 2, legna: 3 });
  let r = CN.cropDo(st, CN.BY.ara, ...ox); ok(r.ok, 'zappa: ' + r.msg);
  r = CN.cropDo(st, CN.BY.semina_patate, ...ox); ok(r.ok, 'semina: ' + r.msg);
  r = CN.cropDo(st, CN.BY.raccogli, ...ox); ok(!r.ok, 'non ancora: ' + r.msg);
  const c = CN.S(st).crops[ox.join(',')]; CN.cropsStep(st); st.t += 600; CN.cropsStep(st); st.t += 600; CN.cropsStep(st); ok(c.stage === 0, 'senz\'acqua non cresce (fase ' + c.stage + ')');
  r = CN.cropDo(st, CN.BY.innaffia, ...ox); ok(r.ok, 'annaffia: ' + r.msg);
  for (let k = 0; k < 2; k++) { st.t += 1200; CN.cropsStep(st); CN.cropDo(st, CN.BY.innaffia, ...ox); } ok(c.stage === 4, 'cresciute (fase ' + c.stage + ')');
  const p0 = Oggetti.inv(st).patate || 0; r = CN.cropDo(st, CN.BY.raccogli, ...ox); ok(r.ok, 'raccolto: ' + r.msg);
  r = CN.cropDo(st, CN.BY.albero, ox[0] + 1, ox[1]); ok(r.ok, 'alberello: ' + r.msg); for (let k = 0; k < 8; k++) { st.t += 600; CN.cropsStep(st); } ok(G.tileAt(ox[0] + 1, ox[1]) === G.T.TREE, 'è diventato un albero');
}
let rb = null;
// 6) [survival] la corrente: pannello di giorno, niente di notte; il lampione si accende solo con la corrente
{
  const C0 = CN.covoAt(st, p.x, p.y); Object.assign(bag, { vetro: 4, cavo: 10, lampadine: 3, batteria_auto: 6, motore_el: 2 });
  const spot = b0 => { for (let r0 = 4; r0 < 20; r0 += 1) for (let a = 0; a < 24; a++) { const x = p.x + Math.cos(a / 24 * 6.283) * r0, y = p.y + Math.sin(a / 24 * 6.283) * r0; if (!CN.canPlace(st, b0, x, y, 0)) return [x, y]; } };
  ok(CN.place(st, CN.BY.pannello_solare, ...spot(CN.BY.pannello_solare), 0).ok, 'pannello solare posato');
  ok(CN.place(st, CN.BY.pala_eolica, ...spot(CN.BY.pala_eolica), 0).ok, 'pala eolica posata');
  ok(CN.place(st, CN.BY.lampione, ...spot(CN.BY.lampione), 0).ok, 'lampione posato');
  rb = CN.place(st, CN.BY.batterie, ...spot(CN.BY.batterie), 0); ok(rb.ok, 'batterie posate: ' + rb.msg);
  st.t = Math.floor(st.t / 1440) * 1440 + 12 * 60; let P = CN.power(st, C0); ok(P.make === 4 && P.on, `mezzogiorno: fa ${P.make}, usa ${P.use}`);
  CN.S(st).powT = st.t; st.t += 300; CN.powerStep(st); P = CN.power(st, C0); ok(P.stored > 0, 'le batterie si caricano: ' + P.stored.toFixed(1));
  st.t = Math.floor(st.t / 1440) * 1440 + 23 * 60; P = CN.power(st, C0); ok(P.make === 2 && P.on, `di notte solo la pala (${P.make} contro ${P.use}): il resto dalle batterie`);
}
// 7) [survival] annulla: l'ultima cosa posata torna in tasca intera
{ CN.state.undo = [{ k: 'posa', uid: rb.o.uid }]; const r = CN.undoLast(st); ok(r.ok && (bag.batteria_auto || 0) >= 3, 'annulla: ' + r.msg); }
// 8) [survival] sotto terra, come fuori ma con le stanze: lo scavo da edificio si apre, poi ci si arreda
{
  const L = Livelli.S(st); let T0 = L.portals.find(P => P.kind === 'tombino'); p.lv = { k: 'ug' }; p.x = (T0.u[0] + .5) * TS; p.y = (T0.u[1] + .5) * TS; Object.assign(bag, { pala: 1, travi: 20, assi: 20 });
  let at = null; for (let r0 = 4; r0 < 12 && !at; r0 += 2) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = p.x + dx * r0, y = p.y + dy * r0; if (!CN.canDig(st, CN.BY.scavo_stanza, x, y, 0)) { at = [x, y]; break; } }
  ok(!!at, 'c\'è posto per una stanza accanto alla fogna'); let r = CN.placeDig(st, CN.BY.scavo_stanza, ...at, 0); ok(r.ok, 'stanza tracciata: ' + r.msg);
  for (let k = 0; k < 400 && !CN.S(st).digs[0].done; k++) G.step(st, .1, { x: 0, y: 0 });
  ok(CN.S(st).digs[0].done, `stanza scavata (${CN.S(st).digs[0].i} caselle)`);
  p.x = at[0]; p.y = at[1]; r = CN.place(st, CN.BY.branda, at[0], at[1], 0); ok(r.ok && r.o.lv === 'ug', 'branda nella stanza sotto terra: ' + r.msg);
  r = CN.place(st, CN.BY.banco_lavoro, at[0] + 1.5, at[1], 0); ok(r.ok, 'banco da lavoro sotto terra: ' + r.msg);
}
console.log(fail ? `\n${fail} prove fallite` : '\nTutto bene.');
process.exitCode = fail ? 1 : 0;
