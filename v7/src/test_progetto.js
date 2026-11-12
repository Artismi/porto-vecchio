// prova della vista progettuale (?progetto): il progetto si disegna senza spendere, la distinta, la coda, la banda che lo realizza
// a poco a poco (pezzi, terreno, scavi col pozzo), quello che manca, annulla e rifai, il salvataggio
process.env.PROGETTO = '1';
global.World = require('./world.js'); global.Interior = require('./interiors.js');
global.Game = require('./game.js'); global.Risacca = require('./risacca.js'); global.Popolo = require('./popolo.js'); global.Azioni = require('./azioni.js');
global.Economia = require('./economia.js'); global.Fazioni = require('./fazioni.js'); global.Soldi = require('./soldi.js'); global.Oggetti = require('./oggetti.js');
global.Livelli = require('./livelli.js'); global.Sottosuolo = require('./sottosuolo.js');
global.addEventListener = () => {}; global.window = {}; global.document = { readyState: 'loading', addEventListener() {} };
global.Cantiere = require('./cantiere.js'); global.Progetto = require('./progetto.js');
const G = Game, CN = Cantiere, PG = Progetto, st = G.create(1), p = st.player, TS = G.TS, W = G.MAP.world;
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };
const wait = s => { for (let k = 0; k < s * 10; k++) G.step(st, 1 / 10, { x: 0, y: 0 }); };
const bag = Oggetti.inv(st);
// un campo nel bosco, fuori città
let tx0 = 0, ty0 = 0; for (let ty = 30; ty < G.GH - 30 && !tx0; ty++) for (let tx = 330; tx < 380; tx++) { const i = ty * G.GW + tx; if (W.zone[i] !== W.Z.CITTA && G.tileAt(tx, ty) === G.T.TREE && G.walkT(tx - 1, ty) && G.walkT(tx - 2, ty)) { tx0 = tx; ty0 = ty; break; } }
p.x = (tx0 - 1.5) * TS; p.y = (ty0 + .5) * TS; CN.claim(st);
const spot = (id, r1, rot) => { for (let r0 = 3; r0 < (r1 || 20); r0 += 1) for (let a = 0; a < 24; a++) { const x = p.x + Math.cos(a / 24 * 6.283) * r0, y = p.y + Math.sin(a / 24 * 6.283) * r0; const it = { pid: '_', k: 'pezzo', id, x, y, rot: rot || 0, lv: null }; const [sx, sy] = CN.snap(CN.BY[id], x, y, rot || 0); it.x = sx; it.y = sy; if (!PG.checkPiece(st, it).why) return [sx, sy]; } return null; };
// 1) il progetto non costa: con le tasche vuote si progetta lo stesso
Object.keys(bag).forEach(k => delete bag[k]);
const cs = spot('casa'); let r = PG.addPiece(st, 'casa', ...cs, 0); ok(r.ok, 'casetta nel progetto a tasche vuote: ' + r.msg);
r = PG.addPiece(st, 'casa', ...cs, 0); ok(!r.ok && /sovrappone/.test(r.msg), 'due pezzi nello stesso posto: ' + r.msg);
const far = PG.addPiece(st, 'casa', p.x + 300, p.y, 0); ok(!far.ok && /campo/i.test(far.msg), 'fuori dal campo: ' + far.msg);
let B = PG.bom(st); ok(B.rows.some(q => q.k === 'mattoni' && q.need === 20 && q.miss === 20), `distinta: mattoni ${B.rows.find(q => q.k === 'mattoni').have}/20, manca ${B.rows.find(q => q.k === 'mattoni').miss}`);
// una fila di muri: come trascinare
let ms = null; for (let r0 = 3; r0 < 20 && !ms; r0++) for (let a = 0; a < 24 && !ms; a++) { const x = p.x + Math.cos(a / 24 * 6.283) * r0, y = p.y + Math.sin(a / 24 * 6.283) * r0, [sx, sy] = CN.snap(CN.BY.muro_assi, x, y, 0); if ([0, 1, 2, 3].every(i => !PG.checkPiece(st, { pid: '_', k: 'pezzo', id: 'muro_assi', x: sx + i * TS, y: sy, rot: 0, lv: null }).why)) ms = [sx, sy]; }
let n = 0; for (let i = 0; i < 4; i++) { if (PG.addPiece(st, 'muro_assi', ms[0] + i * TS, ms[1], 0).ok) n++; } ok(n === 4, `fila di muri: ${n} pezzi`);
// 2) annulla e rifai
const n0 = PG.items(st).length; r = PG.undo(st); ok(r.ok && PG.items(st).length === n0 - 1, 'annulla: un pezzo in meno'); r = PG.redo(st); ok(r.ok && PG.items(st).length === n0, 'rifai: torna');
// 3) gira e sposta nel progetto
const muro = PG.items(st).find(i => i.id === 'muro_assi'); r = PG.rotateItem(st, muro.pid, 1); ok(r.ok && Math.abs(muro.rot - Math.PI / 2) < 1e-6, 'girato: ' + r.msg);
// 4) il terreno: alza, spiana; i metri cubi; le zolle
let cx = 0, cy = 0; for (let r0 = 6; r0 < 18 && !cx; r0 += 2) for (let a = 0; a < 16 && !cx; a++) { const x = p.x + Math.cos(a / 16 * 6.283) * r0, y = p.y + Math.sin(a / 16 * 6.283) * r0; if (PG.sculpt(st, 'alza', x, y, 4, .4) > 6) { cx = x; cy = y; PG.sculpt(st, 'ripristina', x, y, 5, 0); } }
const h00 = G.MAP.vh[Math.round(cy / TS) * G.MAP.VW + Math.round(cx / TS)];
let ns = 0; for (let k = 0; k < 4; k++) ns += PG.sculpt(st, 'alza', cx, cy, 4, .4); ok(ns > 0, `alza: ${ns} vertici toccati`);
let Vv = PG.volOf(st); ok(Vv.fill > 2 && Vv.cut < .01, `alza: ${Vv.fill.toFixed(1)} m³ da portare, ${Vv.cut.toFixed(1)} da togliere`);
for (let k = 0; k < 16; k++) if (PG.sculpt(st, 'abbassa', cx + 9 * Math.cos(k / 16 * 6.283), cy + 9 * Math.sin(k / 16 * 6.283), 3, .5)) break; Vv = PG.volOf(st); ok(Vv.cut > .5, `abbassa: ${Vv.cut.toFixed(1)} m³ da togliere`);
PG.syncTerra(st); const zolle = PG.items(st).filter(i => i.k === 'terra'); ok(zolle.length >= 1, `le zolle: ${zolle.length}`);
ok(G.MAP.vh[Math.round(cy / TS) * G.MAP.VW + Math.round(cx / TS)] === h00, 'il terreno vero non è cambiato (è solo progetto)');
// 4b) [cantiere2] il terreno sopra un albero: l'albero va via da solo (un'icona, non si ricolora); la gomma lo rimette com'era
{ let tr = null; for (let r0 = 3; r0 < 20 && !tr; r0++) for (let a = 0; a < 24 && !tr; a++) { const tx = Math.floor(p.x / TS + Math.cos(a / 24 * 6.283) * r0), ty = Math.floor(p.y / TS + Math.sin(a / 24 * 6.283) * r0); if (G.tileAt(tx, ty) === G.T.TREE && CN.covoAt(st, (tx + .5) * TS, (ty + .5) * TS) && Math.hypot((tx + .5) * TS - cx, (ty + .5) * TS - cy) > 12) tr = [tx, ty]; }
  if (tr) { PG.sculpt(st, 'alza', (tr[0] + .5) * TS, (tr[1] + .5) * TS, 2, .5); PG.syncTerra(st); ok(PG.items(st).some(i => i.k === 'terra' && (i.clr || []).includes(tr[0] + ',' + tr[1])), 'l\'albero sotto il terreno cambiato è da togliere');
    PG.sculpt(st, 'ripristina', (tr[0] + .5) * TS, (tr[1] + .5) * TS, 3, 0); PG.syncTerra(st); ok(!PG.items(st).some(i => i.k === 'terra' && (i.clr || []).includes(tr[0] + ',' + tr[1])), 'la gomma: l\'albero resta'); } else ok(true, '(nessun albero vicino da provare)'); }
// 4c) [cantiere2] il pennello Scava, sopra: il suolo scende al più di 60 cm; insistendo nello stesso punto si va sotto, a blocchi (con l'entrata)
{ let sp = null; for (let r0 = 4; r0 < 20 && !sp; r0++) for (let a = 0; a < 24 && !sp; a++) { const x = p.x + Math.cos(a / 24 * 6.283) * r0, y = p.y + Math.sin(a / 24 * 6.283) * r0, [tx, ty] = [Math.floor(x / TS), Math.floor(y / TS)]; if (Math.hypot(x - cx, y - cy) < 14 || !CN.covoAt(st, x, y)) continue; if (!PG.cellWhy(st, tx, ty, PG.levelF(st, 1, tx, ty), 1) && !PG.cellWhy(st, tx + 1, ty, PG.levelF(st, 1, tx + 1, ty)) && !PG.cellWhy(st, tx + 2, ty, PG.levelF(st, 1, tx + 2, ty))) sp = [tx, ty]; }
  if (!sp) ok(false, 'posto per il pennello Scava'); else {
    const [tx, ty] = sp, x = (tx + .5) * TS, y = (ty + .5) * TS, k0 = Math.round(y / TS) * G.MAP.VW + Math.round(x / TS), h0 = G.MAP.vh[k0]; let r1 = null, k = 0;
    for (; k < 12; k++) { r1 = PG.digBrush(st, x, y, 2, .25); if (r1.blocks) break; } 
    const P0 = PG.plan(st); ok(k >= 2 && P0.vt[k0] >= h0 - PG.CUTMAX() - .01, `prima il suolo scende (${(h0 - P0.vt[k0]).toFixed(2)} m, al più ${PG.CUTMAX()}) poi si buca (colpo ${k + 1})`);
    const c = PG.cells(st)[tx + ',' + ty]; ok(r1 && r1.blocks === 1 && c && c.e === 1 && c.lv === r1.lv, `sotto: il blocco con l'entrata, livello −${c && c.lv}`);
    r = PG.paintCells(st, [[tx + 1, ty], [tx + 2, ty]], c.lv); PG.sync(st); const rm = PG.items(st).find(i => i.k === 'scavo'); ok(r.n === 2 && rm && rm.e && rm.tiles.length === 3, 'e si continua a blocchi: la strada sotto, collegata all\'entrata');
    PG.eraseCells(st, [[tx, ty], [tx + 1, ty], [tx + 2, ty]]); PG.sculpt(st, 'ripristina', x, y, 3, 0); PG.sync(st); ok(!PG.items(st).some(i => i.k === 'scavo') && P0.vt[k0] === undefined, 'tolto: né buca né blocchi'); } }
// 5) la coda: prima il terreno, poi i pezzi; avvio senza roba: manca
r = PG.go(st, true); ok(r.ok, r.msg); const Q = PG.queue(st); ok(Q[0].k === 'terra', 'in cima alla coda: il terreno');
wait(3); const casa = PG.items(st).find(i => i.id === 'casa'); ok((casa.st === 'manca' && /Manca/.test(casa.why)) || (casa.st === 'attesa' && PG.bom(st).miss.length > 0), 'la casetta non comincia (' + casa.st + '): ' + casa.why);
// 6) la banda: due membri; la roba nel baule del campo
const crew = st.npcs.filter(n => !n.cop && !n.dead).sort((a, c) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(c.x - p.x, c.y - p.y)).slice(0, 2);
crew.forEach(n => { Risacca.initNpc ? Risacca.initNpc(st, n) : 0; Risacca.join(st, n); n.x = p.x + 3; n.y = p.y; n.path = []; });
ok(CN.crewAll(st).length >= 2, 'due della banda: ' + CN.crewAll(st).map(n => n.first).join(', '));
const C0 = CN.covoAt(st, p.x, p.y), B0 = CN.bauleOf(st, C0); Object.assign(B0, { mattoni: 30, malta: 6, travi: 20, assi: 40, cemento: 4, cerniere: 2, chiodi: 10 });
Object.assign(bag, { pala: 1, ascia: 1, piccone: 1 });
B = PG.bom(st); ok(!B.miss.length, 'distinta: col baule non manca niente');
// si lavora: la casetta comincia, la roba si paga allora
let started = false, half = null; for (let k = 0; k < 400; k++) { wait(2); const c = PG.items(st).find(i => i.id === 'casa'); if (c && c.st === 'corso') { started = true; const pr = PG.progress(st, c); if (pr > .2 && pr < .9 && !half) half = pr; } if (!c) break; }
ok(started, 'la casetta è cominciata'); ok(B0.mattoni === 10, `pagata quando comincia (mattoni nel baule: ${B0.mattoni})`); ok(half !== null, `si riempie a poco a poco (visto a ${Math.round((half || 0) * 100)}%)`);
ok(CN.S(st).obj.some(o => o.id === 'casa' && !o.wip), 'la casetta è vera');
for (let k = 0; k < 600 && PG.items(st).length; k++) wait(2);
ok(!PG.items(st).length, `tutto il progetto fatto (resta: ${PG.items(st).map(i => i.k + ':' + i.st + ' ' + (i.why || '')).join('; ')})`);
const h1 = G.MAP.vh[Math.round(cy / TS) * G.MAP.VW + Math.round(cx / TS)]; ok(h1 > h00 + .8, `il terreno è salito davvero (${h00.toFixed(2)} → ${h1.toFixed(2)})`);
ok(CN.S(st).obj.filter(o => o.id === 'muro_assi').length >= 3, 'i muri sono veri');
// 7) [cantiere2] gli scavi come Minecraft: caselle dipinte a livelli, l'entrata, una galleria storta a −1, una stanza a elle a −2 col cemento
{
  const L = Livelli.S(st), C = PG.cells(st);
  let pz = null; for (let r0 = 3; r0 < 16 && !pz; r0++) for (let a = 0; a < 16 && !pz; a++) { const tx = Math.floor(p.x / TS + Math.cos(a / 16 * 6.283) * r0), ty = Math.floor(p.y / TS + Math.sin(a / 16 * 6.283) * r0); let free = !PG.cellWhy(st, tx, ty, PG.levelF(st, 1, tx, ty), 1); for (let j = 0; j < 5 && free; j++) for (let i = 0; i < 7 && free; i++) { if (PG.cellWhy(st, tx + i, ty + j, PG.levelF(st, 1, tx + i, ty + j)) || PG.cellWhy(st, tx + i, ty + j, PG.levelF(st, 2, tx + i, ty + j)) || !CN.covoAt(st, (tx + i + .5) * TS, (ty + j + .5) * TS)) free = false; } if (free) pz = [tx, ty]; }
  ok(!!pz, 'c\'è posto per uno scavo nel campo'); const [X, Y] = pz, E0 = G.MAP.elev[Y * G.GW + X];
  ok(/Troppo vicino/.test(PG.cellWhy(st, X, Y, E0 - 1)), 'a un metro sotto il suolo no: ' + PG.cellWhy(st, X, Y, E0 - 1));
  r = PG.paintCells(st, [[X + 1, Y], [X + 2, Y], [X + 3, Y], [X + 3, Y + 1]], 1); ok(r.ok && r.n === 4, 'galleria storta dipinta a −1: ' + r.msg);
  PG.sync(st); let gal = PG.items(st).find(i => i.k === 'scavo'); ok(gal && PG.stateOf(st, gal).s === 'attesa' && PG.stateOf(st, gal).iso, 'da sola non tocca niente (ocra): ' + PG.stateOf(st, gal).why);
  r = PG.paintCells(st, [[X, Y]], 1, { e: 1 }); ok(r.ok, 'l\'entrata: ' + r.msg); PG.sync(st);
  gal = PG.items(st).filter(i => i.k === 'scavo'); ok(gal.length === 1 && gal[0].e && gal[0].tiles.length === 5, `una stanza sola con l'entrata (${gal.length}, ${gal[0] && gal[0].tiles.length} caselle)`);
  ok(!['attesa', 'invalid'].includes(PG.stateOf(st, gal[0]).s), 'con l\'entrata è collegata: ' + PG.stateOf(st, gal[0]).s);
  const room2 = [[X + 3, Y + 2], [X + 4, Y + 2], [X + 5, Y + 2], [X + 3, Y + 3], [X + 4, Y + 3], [X + 5, Y + 3], [X + 3, Y + 4]];
  r = PG.paintCells(st, room2, 2, { rf: 'cemento' }); ok(r.n === 7, 'stanza a elle a −2: ' + r.msg);
  ok(PG.STEP === 2 && Math.abs(C[(X + 3) + ',' + (Y + 2)].f - (C[(X + 3) + ',' + (Y + 1)].f - 2)) < .01, `−2 è 2 m sotto −1 (${C[(X + 3) + ',' + (Y + 2)].f} / ${C[(X + 3) + ',' + (Y + 1)].f})`);
  PG.sync(st); const sc = PG.items(st).filter(i => i.k === 'scavo'); ok(sc.length === 2, 'due stanze: la galleria a −1 e la stanza a −2');
  const s2 = sc.find(i => i.lv === 2); ok(PG.stateOf(st, s2).s === 'attesa' && !PG.stateOf(st, s2).iso, 'la stanza a −2 aspetta la galleria (collegata, non ocra): ' + PG.stateOf(st, s2).why);
  ok(s2.rf === 'cemento' && PG.bom(st).rows.some(q => q.k === 'cemento' && q.need === 14), 'cemento in distinta: 2 per casella');
  r = PG.setRoomRf(st, (X + 4) + ',' + (Y + 3), 'muri'); PG.sync(st); ok(r.ok && PG.items(st).find(i => i.lv === 2).rf === 'muri', 'il rinforzo si sceglie per stanza: ' + r.msg); PG.setRoomRf(st, (X + 4) + ',' + (Y + 3), 'cemento');
  const nC = Object.keys(C).length; ok(PG.eraseCells(st, [[X + 5, Y + 3]]) === 1 && Object.keys(PG.cells(st)).length === nC - 1, 'gomma: una casella in meno'); PG.paintCells(st, [[X + 5, Y + 3]], 2, { rf: 'cemento' });
  { const m0 = (PG.bom(st).rows.find(q => q.k === 'mattoni') || { need: 0 }).need; PG.paintCells(st, [[X + 2, Y + 3]], 2, { rf: 'muri' }); PG.sync(st); const m1 = (PG.bom(st).rows.find(q => q.k === 'mattoni') || { need: 0 }).need; ok(PG.items(st).filter(i => i.k === 'scavo').length === 2 && m1 - m0 === 4, `il rinforzo è di ogni blocco: uno di mattoni attaccato alla stanza di cemento (mattoni +${m1 - m0})`); PG.eraseCells(st, [[X + 2, Y + 3]]); }
  PG.paintCells(st, [[X + 6, Y + 3]], 1); ok(PG.cells(st)[(X + 6) + ',' + (Y + 3)].lv === 1, 'una casella a −1'); PG.paintCells(st, [[X + 6, Y + 3]], 3); ok(PG.cells(st)[(X + 6) + ',' + (Y + 3)].lv === 3, 'ridipinta a −3: scende (un pavimento per casella)'); PG.eraseCells(st, [[X + 6, Y + 3]]);
  Object.assign(B0, { stoffa: 4, assi: (B0.assi || 0) + 4, travi: 20, cemento: 20 }); const br = PG.addPiece(st, 'branda', (X + 4.5) * TS, (Y + 3.5) * TS, 0, 'ug'); ok(br.ok, 'branda sotto terra nel progetto: ' + br.msg);
  ok(PG.stateOf(st, br.it).s === 'attesa', 'la branda aspetta lo scavo: ' + PG.stateOf(st, br.it).why);
  const tr0 = B0.travi, ce0 = B0.cemento;
  PG.go(st, true); let mix = false, raw0 = false, ghostRf = false;
  for (let k = 0; k < 1500 && PG.items(st).length; k++) { wait(1); let raw = 0, prop = 0; for (let j = 0; j < 5; j++) for (let i = 0; i < 7; i++) { const q = (Y + j) * G.GW + X + i; if (L.ug[q] && L.kind[q] === PG.RAW) raw++; if (L.ug[q] && L.kind[q] === 2) prop++; } if (raw) raw0 = true; if (raw && prop) mix = true; const c = PG.cells(st)[(X + 4) + ',' + (Y + 3)]; if (c && c.s === 2) ghostRf = true; }
  ok(raw0 && mix, 'a metà: caselle appena scavate (terra viva) e dietro quelle puntellate');
  ok(ghostRf, 'la stanza di cemento prima si puntella, poi si getta');
  ok(CN.S(st).obj.some(o => o.id === 'branda' && o.lv === 'ug'), 'la branda è sotto terra, vera ' + PG.items(st).map(i => PG.labelOf(i) + ':' + i.st + ':' + (i.why || '')).join(';'));
  let dug = 0; [[X, Y], [X + 1, Y], [X + 2, Y], [X + 3, Y], [X + 3, Y + 1]].concat(room2).forEach(([tx, ty]) => { if (L.ug[ty * G.GW + tx]) dug++; }); ok(dug === 12, `scavate ${dug}/12 caselle`);
  ok(L.portals.some(q => q.kind === 'botola' && q.s[0] === X && q.s[1] === Y), 'l\'entrata ha la botola per scendere');
  ok(L.kind[Y * G.GW + X + 2] === 2 && L.kind[(Y + 3) * G.GW + X + 4] === 6, `la galleria è di legno (kind ${L.kind[Y * G.GW + X + 2]}), la stanza di cemento (kind ${L.kind[(Y + 3) * G.GW + X + 4]})`);
  ok(Math.abs(L.fl[(Y + 3) * G.GW + X + 4] - (L.fl[Y * G.GW + X + 2] - PG.STEP)) < .01, 'la stanza è un livello sotto la galleria');
  ok(tr0 - B0.travi === 5 && ce0 - B0.cemento === 14, `pagati: travi ${tr0 - B0.travi} (una ogni 3 caselle), cemento ${ce0 - B0.cemento}`);
  ok(!Object.keys(PG.cells(st)).length, 'il progetto di sotto è vuoto: è tutto vero');
  // 7b) i progetti salvati prima: una «Stanza scavata» 3×3 diventa caselle (le stanze fisse non ci sono più)
  const P0 = PG.plan(st), q0 = [[X + 1, Y + 2], [X + 2, Y + 2], [X + 1, Y + 3], [X + 2, Y + 3]]; P0.items.push({ pid: 'old1', k: 'scavo', id: 'scavo_stanza', tiles: q0, f: PG.levelF(st, 1, X + 1, Y + 2), kind: 2, pozzo: 0, st: 'progetto', ord: 1 }); P0.v = 1;
  ok(Object.keys(PG.cells(st)).length === 4 && !PG.items(st).some(i => i.pid === 'old1'), 'lo scavo vecchio è diventato 4 caselle'); PG.eraseCells(st, q0); PG.sync(st);
}
// 8) la mano del giocatore: senza banda, vicino al cantiere, lavori tu
{
  CN.crewAll(st).forEach(n => Risacca.leave(st, n)); Object.assign(B0, { assi: 20, chiodi: 10 });
  const t1 = spot('tavolo'); r = PG.addPiece(st, 'tavolo', ...t1, 0); ok(r.ok, r.msg); PG.go(st, true); wait(2);
  const it = r.it; ok(it.st === 'corso', 'il tavolo è in corso (senza banda: aspetta te)'); const d0 = it.done || 0; wait(3); ok((it.done || 0) === d0, 'nessuno ci lavora: fermo');
  p.x = it.x + 1; p.y = it.y; r = PG.workHere(st, it.pid); ok(r.ok, 'dai una mano: ' + r.msg); for (let k = 0; k < 60 && PG.items(st).includes(it); k++) wait(1);
  ok(!PG.items(st).includes(it) && CN.S(st).obj.some(o => o.id === 'tavolo'), 'il tavolo l\'hai fatto tu');
}
// 9) togliere un pezzo già pagato: la roba torna nel baule
{ const mt0 = B0.mattoni || 0; Object.assign(B0, { mattoni: mt0 + 20, malta: 4, travi: 6, assi: 8, cemento: 2, cerniere: 1 }); const c2 = spot('casa'); r = PG.addPiece(st, 'casa', ...c2, 0); PG.go(st, true); wait(2); const it = r.it; ok(it.st === 'corso' && it.paid, 'casetta pagata e in corso');
  r = PG.removeItem(st, it.pid); ok(r.ok && B0.mattoni === mt0 + 20, 'tolta: i mattoni tornano nel baule (' + r.msg + ')'); }
// 11) la roba finisce: il garage aspetta (ocra), la coda passa alla tenda che si può fare
{ PG.items(st).slice().forEach(i => PG.removeItem(st, i.pid)); Object.keys(B0).forEach(k => delete B0[k]); Object.keys(bag).filter(k => !/pala|ascia|piccone/.test(k)).forEach(k => delete bag[k]);
  Object.assign(B0, { stoffa: 4, corda: 1, tubi: 2 }); const g = spot('garage'); const rg = PG.addPiece(st, 'garage', ...g, 0); const t = spot('tenda'); const rt = PG.addPiece(st, 'tenda', ...t, 0);
  ok(rg.ok && rt.ok, 'garage e tenda nel progetto'); ok(PG.queue(st)[0] === rg.it, 'il garage è primo in coda'); PG.go(st, true); wait(3);
  ok(rg.it.st === 'manca' && /lamiera/i.test(rg.it.why), 'il garage aspetta la roba: ' + rg.it.why); ok(rt.it.st === 'corso', 'la tenda comincia lo stesso (la coda passa avanti)');
  r = PG.prio(st, rt.it.pid, -1); ok(PG.queue(st)[0] === rt.it, 'riordinata: la tenda prima'); PG.removeItem(st, rg.it.pid); PG.removeItem(st, rt.it.pid); }
// 10) il progetto si salva con la partita (è dentro st.covo)
{ const c3 = spot('tenda'); PG.addPiece(st, 'tenda', ...c3, 0); PG.sculpt(st, 'alza', p.x - 10, p.y + 6, 2, .3); const js = JSON.stringify(st.covo.plan), back = JSON.parse(js); ok(back.items.some(i => i.id === 'tenda') && Object.keys(back.vt).length > 0, `il progetto sta in st.covo.plan (${js.length} caratteri)`); }
console.log(fail ? `\n${fail} prove fallite` : '\nTutto bene.');
process.exitCode = fail ? 1 : 0;
