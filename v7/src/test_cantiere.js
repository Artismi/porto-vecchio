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
console.log(fail ? `\n${fail} prove fallite` : '\nTutto bene.');
process.exitCode = fail ? 1 : 0;
