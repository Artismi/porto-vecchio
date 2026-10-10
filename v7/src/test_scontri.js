// Prova degli scontri: la piazza che bolle (lanci, scudi, lacrimogeni, idrante, carica anticipata), la regola delle bottiglie
// (i Grigi arrestano, non sparano), la barricata (la celere si ritira, i difensori armati, il reparto d'assalto, il Blindato).
// Uso (dalla cartella src): node test_scontri.js [seme]
global.World = require('./world.js'); global.Interior = require('./interiors.js');
global.Game = require('./game.js');
const MODS = ['Risacca:risacca', 'Popolo:popolo', 'Azioni:azioni', 'Economia:economia', 'Fazioni:fazioni', 'Soldi:soldi', 'Oggetti:oggetti', 'Ordine:ordine', 'Scontri:scontri'];
// solo il portavalori: node test_scontri.js 1 furgone
for (const m of MODS) { const [g, f] = m.split(':'); try { global[g] = require('./' + f + '.js'); } catch (e) { console.log('(manca ' + f + ': ' + e.message.slice(0, 120) + ')'); } }
const G = Game, O = Ordine, SC = Scontri, seed = +process.argv[2] || 1;
const errs = [], ok = (c, s) => { console.log((c ? 'ok   ' : 'NO   ') + s); if (!c) errs.push(s); };
let warn = 0; const ce = console.warn; console.warn = (...a) => { warn++; ce(...a); };
const st = G.create(seed);
const p = st.player, ONLY_VAN = process.argv[3] === 'furgone';
const run = secs => { for (let i = 0; i < secs * 30; i++) G.step(st, 1 / 30, {}); };
const runUntil = (f, secs) => { for (let i = 0; i < secs * 30; i++) { G.step(st, 1 / 30, {}); if (f()) return true; } return false; };
ok(st.sc && st.sc.squad.length === SC.CFG.squadra, `il reparto d'assalto è in caserma (${st.sc.squad.length})`);
ok(st.sc.squad.every(id => G.byId(st, id).inside), 'non si vede finché non serve');

if (!ONLY_VAN) {
// 1) una protesta in piazza, coi Grigi
while (G.hour(st) < 10) run(10);
st.ris.morale = 40;
const Pr = O.startProtest(st, { kind: 'spontanea', motivo: 'rabbia', place: 'piazza', size: 26 });
ok(!!Pr, `protesta: ${Pr ? Pr.people.length + ' persone a ' + Pr.place : 'non partita'}`);
st.player.x = Pr.x + 30; st.player.y = Pr.y; st.player.indoor = null;
ok(runUntil(() => Pr.police.length > 0 && Pr.phase === 'cordone', 120), `la celere arriva e fa il cordone (${Pr.police.length} Grigi, fase ${Pr.phase})`);
const s = SC.scOf(Pr);
SC.heat(st, Pr, 2.2);   // la piazza è già calda: prima dei manganelli, il gas
ok(runUntil(() => st.sc.gas.length > 0, 25), `lacrimogeni sulla folla prima della carica (fase ${Pr.phase}, nubi ${st.sc.stats.gas})`);
// la piazza si scalda da sola: lanci dei radicali
runUntil(() => Pr.phase === 'carica' || Pr.phase === 'fine' || s.lanci > 4, 60);
console.log(`     lanci ${st.sc.stats.lanci}, parati dagli scudi ${st.sc.stats.parati}, calore ${s.heat.toFixed(1)}, fase ${Pr.phase}, avvisi ${Pr.warn}`);
ok(st.sc.stats.lanci > 0, 'i più decisi tirano sanpietrini e bottiglie');
// il giocatore tira una molotov sul cordone
p.x = Pr.x + 12; p.y = Pr.y + 2;
G.giveWeapon ? G.giveWeapon(st, 'molotov', 3) : (p.arms.molotov = { mag: 3 });
const evm = G.emit(st, 'molotov', { x: Pr.x + 6, y: Pr.y }); SC.heat(st, Pr, 0);
run(.2);
SC.heat(st, Pr, 1);
run(.2);
ok(st.sc.cap === Pr.id, 'con le bottiglie la regola tiene: allerta al massimo all\'arresto');
ok(G.HOOKS.wantedCap(st, 3) === 1, 'anche con tre stelle i Grigi arrestano invece di sparare');
// il giocatore nella nube
if (st.sc.gas.length) { const g = st.sc.gas[0]; p.x = g.x; p.y = g.y; const hp0 = p.hp; run(3); ok(st.sc.gasP > .3 && p.hp < hp0, `nella nube: brucia (gas ${st.sc.gasP.toFixed(2)}, vita ${hp0}→${p.hp.toFixed(0)})`); p.hp = 100; p.x = Pr.x + 30; }
// l'idrante (se c'è il Blindato)
SC.heat(st, Pr, 1.5); runUntil(() => st.sc.stats.idranti > 0 || Pr.phase === 'fine', 30);
SC.heat(st, Pr, 3);
console.log(`     idranti ${st.sc.stats.idranti} (Blindato: ${Pr.blind || 'no'}), fase ${Pr.phase}`);
ok(Pr.phase === 'carica' || Pr.phase === 'fine' || Pr.warn >= 2, 'più si tira, prima caricano');
runUntil(() => Pr.phase === 'fine', 90);
ok(Pr.phase === 'fine', `la piazza si svuota (${Pr.arrested} fermati, ${Pr.hurt} colpiti)`);
// il giocatore spara in piazza: la regola salta
const Pr2 = O.startProtest(st, { kind: 'spontanea', motivo: 'rabbia', place: 'piazza', size: 24 });
if (Pr2) { p.x = Pr2.x + 8; p.y = Pr2.y; G.emit(st, 'spari', { x: p.x, y: p.y }); run(.3); ok(st.sc.cap === null, 'con la pistola in mano la regola salta'); }

// 2) la barricata
run(5);
const Pr3 = Pr2 && Pr2.phase !== 'fine' ? Pr2 : O.startProtest(st, { kind: 'organizzata', motivo: 'risacca', place: 'piazza', size: 30 });
ok(!!Pr3, 'una piazza piena per la barricata');
let b = null;
if (Pr3) {
  // in mezzo alla strada più vicina
  let x = Pr3.x, y = Pr3.y; const T = G.T; for (let r = 0; r < 30 && G.tileAt(Math.floor(x / G.TS), Math.floor(y / G.TS)) !== T.VIA; r++) { const a = r * 2.4; x = Pr3.x + Math.cos(a) * (2 + r); y = Pr3.y + Math.sin(a) * (2 + r); }
  p.x = x; p.y = y;
  const act = SC.actions(st).find(a => a.id === 'barricata');
  ok(act && act.run, `azione: ${act ? act.label + (act.off ? ' — ' + act.off : '') : 'nessuna'}`);
  if (act && act.run) act.run();
  b = st.sc.barr[0];
  ok(!!b, `barricata cominciata a ${b && b.place}`);
}
if (b) {
  ok(runUntil(() => b.phase === 'alzata', 60), `la barricata è su (fase ${b.phase})`);
  ok(Pr3.police.length === 0, 'la celere si ritira');
  console.log(`     difensori armati: ${b.def.map(id => { const n = G.byId(st, id); return n.first + ' (' + n.weapon + ')'; }).join(', ') || 'nessuno'}`);
  ok(st.sc.cap === null, 'alla barricata la regola non vale più');
  p.x = b.x + Math.cos(b.a + Math.PI / 2) * b.backS * 10; p.y = b.y + Math.sin(b.a + Math.PI / 2) * b.backS * 10; p.hp = 100;
  ok(runUntil(() => b.phase === 'assalto', SC.CFG.assaltoDopo + 5), 'arriva il reparto d\'assalto');
  const on = st.sc.squad.filter(id => { const n = G.byId(st, id); return n && n.sc.on && !n.inside; }).length;
  ok(on >= 6, `${on} soldati in strada`);
  const hpOf = () => b.def.reduce((t, id) => { const n = G.byId(st, id); return t + (n ? Math.max(0, n.hp) : 0); }, 0) + p.hp;
  const hp0 = hpOf(); runUntil(() => b.fired && hpOf() < hp0 - 20, 40);
  ok(b.fired && hpOf() < hp0 - 20, `sparano senza avviso, e colpiscono (vita dietro la barricata ${Math.round(hp0)}→${Math.round(hpOf())})`);
  ok(Pr3.people.length === 0, 'al primo sparo la piazza disarmata scappa');
  ok(st.sc.squad.every(id => { const n = G.byId(st, id); return n.dead || !n.inside; }), 'in assalto i soldati restano in strada');
  p.x = b.x + 200; p.y = b.y; p.hp = 100; st.over = null;
  ok(runUntil(() => b.phase === 'giu', 180), `la barricata cade (vita ${Math.round(b.hp)}, ${b.lost} morti dietro, ${b.killed} soldati a terra)`);
  ok(runUntil(() => st.sc.squad.every(id => { const n = G.byId(st, id); return !n || n.dead || !n.sc.on; }), 60), 'il reparto rientra');
}
}
// 3) il portavalori: il blocco, le guardie, lo scontro, il bottino e la scelta
{
  st.over = null; p.hp = 100; p.vehicle = null; run(1);
  const v = Soldi.van(st), V = st.soldi.van;
  ok(!!v && st.sc.guards.length === 2, `il portavalori ha due guardie giurate (${st.sc.guards.map(id => G.byId(st, id).first).join(', ')})`);
  // in giro col carico, con l'autista
  const drv = st.npcs.find(n => n.pop && !n.cop && !n.dead && !n.sc);
  V.cargo = 300; V.crew = drv.id; v.rider = 'npc:' + drv.id; drv.inside = true; v.hidden = false; v.wreck = false;
  let x = v.x, y = v.y; v.ang = 0; v.speed = 0;
  run(.5);
  ok(st.sc.guards.every(id => G.byId(st, id).inside), 'le guardie viaggiano a bordo');
  // un camion di traverso davanti al muso
  const tr = st.vehicles.find(q => q !== v && !q.hidden && !q.wreck && !q.rider && !q.traffic && q.kind !== 'portavalori');
  tr.x = v.x + Math.cos(v.ang) * 6; tr.y = v.y + Math.sin(v.ang) * 6; tr.speed = 0; tr.vx = tr.vy = 0;
  run(1);
  ok(!!st.sc.vanBlock, 'il furgone trova la strada chiusa e si ferma');
  ok(st.sc.guards.every(id => { const n = G.byId(st, id); return !n.inside && n.sc.mode === 'allerta'; }), 'le guardie scendono in allerta');
  // arrivi con lo Skorpion in mano
  G.giveWeapon(st, 'mitra', 60); p.cur = 'mitra'; p.hand = null; p.x = v.x - 8; p.y = v.y; p.indoor = null;
  const hp1 = p.hp; run(.5);
  ok(st.sc.guards.some(id => G.byId(st, id).sc.mode === 'fuoco'), 'con l\'arma in pugno: fuoco');
  runUntil(() => p.hp < hp1, 12);
  ok(p.hp < hp1, `le guardie sparano (vita ${hp1}→${Math.round(p.hp)})`);
  // giù le guardie
  st.sc.guards.forEach(id => { const n = G.byId(st, id); if (!n.dead) G.kill(st, n, 'player', 0); });
  run(.3); p.hp = 100;
  const sd = Azioni.playerActions(st).find(a => a.id === 'sd_assalto');
  p.x = v.x - 2; p.y = v.y;
  const sd2 = Azioni.playerActions(st).find(a => a.id === 'sd_assalto');
  ok(!!(sd2 && sd2.run), `con le guardie a terra: ${sd2 ? sd2.label : 'nessuna azione di assalto'}`);
  const m0 = p.money; if (sd2 && sd2.run) console.log('     ', sd2.run());
  run(.5);
  ok(p.money > m0 && st.sc.bottino, `il bottino è in tasca (${Math.round(p.money - m0)}.000)`);
  const acts = Azioni.playerActions(st).filter(a => /^colpo_/.test(a.id)).map(a => a.label);
  console.log('     scelte:', acts.join(' | '));
  ok(acts.some(l => /serre/.test(l)) && acts.some(l => /cambiali/.test(l)), 'si sceglie: le serre o le cambiali');
  const c0 = st.ris.cassa; const se = Azioni.playerActions(st).find(a => a.id === 'colpo_serre'); if (se) console.log('     ', se.run());
  ok(st.ris.cassa > c0, `le serre: la cassa comune sale (${Math.round(c0)}→${Math.round(st.ris.cassa)})`);
  // con le armi della Famiglia: la parte, e chi non paga
  st.sc.bottino = null; st.sc.colpo = { fam: true, t: st.t }; V.cargo = 200; st.soldi.stats.rapine++; st.soldi.stats.refurtiva += 200; p.money += 200;
  run(.3);
  ok(st.sc.bottino && st.sc.bottino.fam && st.sc.bottino.quota === 80, `armi della Famiglia: vuole ${st.sc.bottino && st.sc.bottino.quota}.000`);
  st.t += SC.CFG.pagaEntro + 5; run(.3);
  ok(st.npcs.filter(n => n.faction === 'squalo' && !n.dead).every(n => n.aggro), 'chi non paga la parte ha la Famiglia contro');
}
console.log('resoconto', JSON.stringify(SC.report(st)));
ok(!warn, `nessun avviso in console (${warn})`);
console.log(errs.length ? `\nERRORI: ${errs.length}\n  ` + errs.join('\n  ') : '\nTutto a posto.');
process.exit(errs.length ? 1 : 0);
