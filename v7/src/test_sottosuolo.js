// prova del sottosuolo: fogne, tombini, posti di sotto, sbucare dentro le case, roba sepolta, metropolitana
const CN = /cittanuova/.test(process.argv.join(" ")) || !!process.env.CN; global.World = require(CN ? "./world_cittanuova.js" : "./world.js"); global.Interior = require('./interiors.js');
global.Game = require('./game.js'); global.Risacca = require('./risacca.js'); global.Popolo = require('./popolo.js'); global.Azioni = require('./azioni.js');
global.Economia = require('./economia.js'); global.Fazioni = require('./fazioni.js'); global.Soldi = require('./soldi.js'); global.Oggetti = require('./oggetti.js');
global.Livelli = require('./livelli.js'); global.Sottosuolo = require('./sottosuolo.js');
const GRID0 = Game.MAP.grid.slice();   // [sotto2] la mappa com'è prima che la partita ci costruisca sopra
const G = Game, LV = Livelli, SS = Sottosuolo, st = G.create(1), p = st.player, TS = G.TS;
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };
const L = LV.S(st), K = SS.K, cnt = k => L.kind.reduce((a, v) => a + (v === k ? 1 : 0), 0);
const wait = s => { for (let k = 0; k < s * 30; k++) G.step(st, 1 / 30, { x: 0, y: 0 }); };
const walk = (ang, s) => { p.face = ang; for (let k = 0; k < s * 30; k++) G.step(st, 1 / 30, { x: Math.cos(ang), y: Math.sin(ang), aim: ang }); };
const where = () => `(${p.x.toFixed(1)},${p.y.toFixed(1)}) lv=${p.lv ? p.lv.k + (p.lv.ride !== undefined ? ':treno' + p.lv.ride : '') : '-'} in=${p.indoor ? G.BUILDINGS[p.indoor.b].id : '-'}`;
console.log('fogne', cnt(K.FOGNA), 'cripte', cnt(K.CRIPTA), 'carceri', cnt(K.CARCERE), 'bunker', cnt(K.BUNKER), 'covi', cnt(K.COVO), 'metro', cnt(K.METRO), 'banchine', cnt(K.BANCHINA));
const kinds = {}; L.portals.forEach(P => { kinds[P.kind] = (kinds[P.kind] || 0) + 1; }); console.log('portali', JSON.stringify(kinds));
ok(cnt(K.FOGNA) > 800, 'le fogne corrono sotto le strade');
ok((kinds.tombino || 0) > 25, 'ci sono i tombini');
ok(SS.TPL.metro.ok, 'la metropolitana ha due stazioni: ' + (SS.TPL.metro.ok ? SS.TPL.metro.A.name + ' → ' + SS.TPL.metro.B.name + ', ' + SS.TPL.metro.L.toFixed(0) + ' m' : ''));
console.log('posti', SS.TPL.places.map(q => q.name).join(' · '));
console.log('gente', SS.S(st).folk.map(n => n.name).join(', '));
// 1) giù da un tombino, su da un altro
const T0 = L.portals.find(P => P.kind === 'tombino'); p.lv = null; p.x = (T0.s[0] + .5) * TS; p.y = (T0.s[1] + .5) * TS;
let m = LV.key(st, 'v'); ok(p.lv && p.lv.k === 'ug', 'scendo dal tombino: ' + m + ' ' + where());
wait(1); console.log('   ', st.feed.map(f => f.text).slice(0, 2).join(' | '));
m = LV.key(st, 'v'); ok(!p.lv, 'risalgo dal tombino: ' + m);
// 2) le carceri: dal portale «interno» si sale nella Caserma della Guardia, e da lì si torna giù
const PI = L.portals.find(P => P.kind === 'interno' && G.BUILDINGS[P.bi].id === 'commissariato');
p.lv = { k: 'ug' }; p.x = (PI.u[0] + .5) * TS; p.y = (PI.u[1] + .5) * TS; m = LV.key(st, 'v'); ok(p.indoor && G.BUILDINGS[p.indoor.b].id === 'commissariato', 'dalle carceri salgo in caserma: ' + m + ' ' + where());
m = LV.key(st, 'v'); ok(p.lv && p.lv.k === 'ug' && !p.indoor, 'e riscendo: ' + m + ' ' + where());
// 3) il percorso nei cunicoli dalle carceri alla fogna
const fz = L.portals.find(P => P.kind === 'tombino'); const path = SS.findPath(st, p.x, p.y, (fz.u[0] + .5) * TS, (fz.u[1] + .5) * TS);
console.log('    percorso fino a un tombino:', path.length, 'tappe');
// 4) scavare sotto una casa qualunque e sbucarci dentro
const bi = G.BUILDINGS.findIndex(b => b.door && !b.name && b.w >= 3 && b.h >= 3 && !L.ug[(b.y + 1) * G.GW + b.x + 1]);
const b = G.BUILDINGS[bi]; p.indoor = null; p.lv = { k: 'ug' }; L.ug[(b.y + 1) * G.GW + b.x + 1] = 2; L.fl[(b.y + 1) * G.GW + b.x + 1] = G.MAP.elev[(b.y + 1) * G.GW + b.x + 1] - 3.2;
p.x = (b.x + 1.5) * TS; p.y = (b.y + 1.5) * TS; p.inv = { pala: 1, piccone: 1 }; if (global.Oggetti) { const bag = Oggetti.inv(st); bag.pala = 1; bag.piccone = 1; }
m = LV.digUp(st); console.log('    ', m); wait(25); ok(p.indoor && p.indoor.b === bi, 'sbuco dentro la casa ' + (b.id || bi) + ': ' + (st.feed[0] && st.feed[0].text) + ' ' + where());
// 5) da dentro una casa: una botola nel pavimento
const sideFree = (q, dir) => { for (let y = q.y; y < q.y + q.h; y++) for (let k = 0; k < 8; k++) { const x = dir > 0 ? q.x + q.w + k : q.x - 1 - k, t = G.tileAt(x, y); if (t === G.T.BLD || t === G.T.WATER || L.ug[y * G.GW + x]) return false; } return true; };   // [sotto2] e niente già scavato (cantine, città sepolta)   // [città2] la città è fitta: di filato senza fondamenta
const b2i = G.BUILDINGS.findIndex((q, i) => i !== bi && q.door && q.w >= 3 && !q.rot && !q.military && sideFree(q, 1) && sideFree(q, -1) && !L.portals.some(P => P.bi === i)); G.exitBuilding(st); p.lv = null; G.enterBuilding(st, b2i);
m = LV.key(st, 'h'); console.log('    ', m); wait(16); m = LV.key(st, 'v'); ok(p.lv && p.lv.k === 'ug' && !p.indoor, 'botola nel pavimento e giù: ' + m + ' ' + where());
// 6) scavare di filato: avanti finché non lo fermi
{ const qb = G.BUILDINGS[b2i], tx0 = Math.floor(p.x / TS); p.face = tx0 - qb.x < qb.x + qb.w - 1 - tx0 ? Math.PI : 0; }   // verso il lato più vicino: fuori dalla casa
m = LV.key(st, "h", true); console.log("    ", m); const x0 = p.x, nI0 = L.portals.filter(P => P.kind === "imbocco").length; wait(70); const nI = L.portals.filter(P => P.kind === "imbocco").length - nI0; ok(Math.abs(p.x - x0) > 4 || (Math.abs(p.x - x0) >= 2 && nI > 0), `di filato: ${nI ? "sbucato sul pendio dopo" : "avanzato di"} ${Math.abs(p.x - x0).toFixed(1)} m · ${st.feed.slice(0, 3).map(f => f.text).join(' | ')}`); LV.S(st).auto = null; LV.S(st).job = null;
// 7) la roba sepolta: la cassa del brigante sotto il Paese Vecchio
const C = SS.CACHES.find(c => c.id === 'brigante'); const before = JSON.stringify(Oggetti.inv(st));
const msg = LV.hooks.dug.map(f => f(st, C.tx, C.ty, L)).find(Boolean); ok(/brigante/.test(msg || ''), 'la cassa del brigante: ' + msg);
// 8) la gente di sotto: compro dal Mastro Ugo
p.money = 500; const V = SS.shopView(st, 'mercato'); console.log('    banco:', V.goods.map(g => g.nome + ' ' + g.price).join(', '));
const r1 = SS.buy(st, 'mercato', 'grimaldello'); ok(r1.ok, 'compro: ' + r1.msg);
// 9) le casse dei posti
const cr = SS.S(st).crates.find(c => c.id === 'armeria'); const r3 = SS.openCrate(st, cr); ok(r3.ok, r3.msg);
const r2 = SS.sell(st, 'mercato', 'maschera_gas'); ok(r2.ok, 'rivendo: ' + r2.msg);
const r4 = SS.openCrate(st, SS.S(st).crates.find(c => c.id === 'casse_contr')); ok(!r4.ok, 'le casse di Bavaglio sono sorvegliate: ' + r4.msg);
// 10) la metropolitana: in banchina a sud, si aspetta il treno, si sale, si arriva a nord
const MT = SS.TPL.metro; p.indoor = null; p.lv = { k: 'ug' }; p.x = MT.A.x; p.y = MT.A.y;
const ent = L.portals.find(P => P.kind === 'scala' && P.metro === 'sud'); console.log('    ingresso sud', ent.s, 'banchina', MT.A.x.toFixed(0), MT.A.y.toFixed(0), 'quota', MT.A.f.toFixed(1), '· nord', MT.B.x.toFixed(0), MT.B.y.toFixed(0), MT.B.f.toFixed(1));
let tries = 0; while (!(p.lv.ride !== undefined) && tries++ < 200) { m = LV.key(st, 'v'); if (p.lv.ride === undefined) wait(1); }
ok(p.lv.ride !== undefined, 'salgo sul treno: ' + m);
const hs = []; for (let k = 0; k < 80 && p.lv.ride !== undefined; k++) { wait(1); hs.push(LV.heightOf(st, p).toFixed(1)); }
console.log('    quote del viaggio', hs.filter((_, i) => i % 6 === 0).join(' '));
// [mappa_nuova] la linea a più stazioni: si scende alla prossima; alle fermate di mezzo si risale finché si arriva al capolinea
if (MT.linea) for (let leg = 1; leg < MT.stazioni.length - 1 && Math.hypot(p.x - MT.B.x, p.y - MT.B.y) >= 4; leg++) { console.log('    fermata', (st.feed[0] && st.feed[0].text), where()); let t2 = 0; while (p.lv.ride === undefined && t2++ < 200) { m = LV.key(st, 'v'); if (p.lv.ride === undefined) wait(1); } for (let k = 0; k < 80 && p.lv.ride !== undefined; k++) wait(1); }
ok(p.lv.ride === undefined && Math.hypot(p.x - MT.B.x, p.y - MT.B.y) < 4, 'sceso a ' + MT.B.name + ': ' + (st.feed[0] && st.feed[0].text) + ' ' + where());
const EN = L.portals.find(P => P.kind === 'scala' && P.metro === 'nord'); p.x = (EN.u[0] + .5) * TS; p.y = (EN.u[1] + .5) * TS; m = LV.key(st, 'v'); ok(!p.lv, 'su per le scale: ' + m + ' ' + where());
// le due gallerie si incrociano a metà: una sopra, una sotto
const tm = MT.linea ? (MT.seg[0].s0 + MT.seg[0].L / 2) / MT.L : .5, a = SS.trackAt(0, tm), c = SS.trackAt(1, tm), a0 = SS.trackAt(0, 0), c0 = SS.trackAt(1, 0);
ok(Math.abs(a.h - c.h) > 7 && Math.abs(a0.h - c0.h) < .01, `mezza elica: a metà ${a.h.toFixed(1)} sopra ${c.h.toFixed(1)}, ai capi alla stessa quota`);
console.log(fail ? `\n${fail} prove fallite` : '\nTutto bene.');
process.exitCode = fail ? 1 : 0;
// 11) scavare a clic: dal fondo di una fogna verso un punto nella terra, il personaggio ci arriva scavando
{
  const L2 = LV.S(st); let P0 = null, dir = null; for (const Q of L2.portals) { if (Q.kind !== 'tombino') continue; const d = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([a, b]) => [1, 2, 3, 4, 5].every(k => !L2.ug[(Q.u[1] + b * k) * G.GW + Q.u[0] + a * k] && G.tileAt(Q.u[0] + a * k, Q.u[1] + b * k) !== G.T.WATER && !SS.findAt(Q.u[0] + a * k, Q.u[1] + b * k))); if (d) { P0 = Q; dir = d; break; } }
  p.indoor = null; p.lv = { k: 'ug' }; p.x = (P0.u[0] + .5) * TS; p.y = (P0.u[1] + .5) * TS; const bag = Oggetti.inv(st); bag.pala = 1; bag.piccone = 1;
  const gx = (P0.u[0] + dir[0] * 5 + .5) * TS, gy = (P0.u[1] + dir[1] * 5 + .5) * TS, r = LV.digTo(st, gx, gy); ok(r && r.ok, 'scavo a clic: ' + (r && r.msg));
  for (let k = 0; k < 120 * 10 && L2.route; k++) { const T0 = LV.routeTarget(st); let inp = { x: 0, y: 0 }; if (T0 && !T0.wait) { const a = Math.atan2(T0.y - p.y, T0.x - p.x); inp = { x: Math.cos(a), y: Math.sin(a), aim: a }; } else if (T0) inp = { x: 0, y: 0, aim: T0.aim }; G.step(st, 1 / 10, inp); }
  ok(Math.hypot(p.x - gx, p.y - gy) < 1.5, `arrivato scavando: (${p.x.toFixed(1)},${p.y.toFixed(1)}) → (${gx},${gy})`);
  const f0 = LV.heightOf(st, p); LV.key(st, 'j'); for (let k = 0; k < 150; k++) G.step(st, 1 / 10, { x: 0, y: 0 }); ok(LV.heightOf(st, p) < f0 - 1.1, `J: giù sul posto ${f0.toFixed(1)} → ${LV.heightOf(st, p).toFixed(1)}`);
  LV.key(st, 'k'); for (let k = 0; k < 150; k++) G.step(st, 1 / 10, { x: 0, y: 0 }); ok(Math.abs(LV.heightOf(st, p) - f0) < .2, `K: su sul posto → ${LV.heightOf(st, p).toFixed(1)}`);
}
console.log(fail ? `\n${fail} prove fallite (dopo lo scavo a clic)` : 'Scavo a clic: bene.');
process.exitCode = fail ? 1 : 0;
// 12) [sotto2] GLI STRATI E I RITROVAMENTI
{
  const TP = SS.TPL, GW = G.GW, EL = G.MAP.elev, S2 = TP.strati, F = SS.RITROVAMENTI, NEW = new Set([K.CISTERNA, K.CATACOMBA, K.SEPOLTA, K.GROTTA, K.CUNICOLO, K.MINIERA, K.RELITTO, K.FIUME]);
  const ck = k => TP.kind.reduce((a, v) => a + (v === k ? 1 : 0), 0);
  console.log('strati', JSON.stringify(S2), '· caselle: cantine', ck(K.CANTINA), 'sepolta', ck(K.SEPOLTA), 'catacombe', ck(K.CATACOMBA), 'cisterne', ck(K.CISTERNA), 'grotte', ck(K.GROTTA), 'fiume', ck(K.FIUME), 'miniere', ck(K.MINIERA), 'relitto', ck(K.RELITTO));
  ok(S2.cantine >= 8 && S2.sepolte >= 10 && S2.catacombe >= 2, 'strati: cantine, città sepolta, catacombe');
  ['catacombe', 'borgo_sepolto', 'sventramento', 'grotta_stal', 'fiume', 'miniera_cava', 'relitto_sotto'].forEach(id => ok(TP.places.some(q => q.id === id), 'c\'è il posto ' + id));
  // le catacombe: loculi in galleria, la cappella e l'ossario; rilegate alla cripta che c'era
  ok(TP.rooms.filter(R => R.deco === 'cappella').length >= 2 && TP.rooms.filter(R => R.deco === 'ossario').length >= 2, 'catacombe con cappella e ossario');
  // nessuna intersezione con le fondamenta di oggi: sotto una casa solo la sua cantina, o più giù di sei metri
  let bad = []; for (let i = 0; i < TP.kind.length; i++) { if (!NEW.has(TP.kind[i])) continue; const tx = i % GW, ty = (i / GW) | 0; if (GRID0[i] === G.T.BLD && EL[i] - TP.fl[i] < 6 && !(TP.kind[i] === K.CATACOMBA && /^(chiesa|chiesa_sg|santuario)$/.test((G.BUILDINGS[G.MAP.world.bIndex[i]] || {}).id))) bad.push([tx, ty, TP.kind[i], (EL[i] - TP.fl[i]).toFixed(1), (G.BUILDINGS[G.MAP.world.bIndex[i]] || {}).id]); }
  ok(!bad.length, `nessuno strato nelle fondamenta di oggi (oltre le cantine): ${bad.length} ${JSON.stringify(bad.slice(0, 4))}`);
  // tutto raggiungibile: dalle uscite in superficie (portali) si arriva in ogni stanza degli strati camminando nei cunicoli
  const seen = new Uint8Array(TP.kind.length), Q = []; TP.portals.forEach(P => { const i = P.u[1] * GW + P.u[0]; if (TP.ug[i] && !seen[i]) { seen[i] = 1; Q.push(i); } });
  while (Q.length) { const i = Q.pop(), tx = i % GW, ty = (i / GW) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = (ty + dy) * GW + tx + dx; if (TP.ug[j] && !seen[j]) { seen[j] = 1; Q.push(j); } } }
  const DECO = new Set(['cantina', 'sepolta', 'vicolo_sepolto', 'cisterna', 'cappella', 'ossario', 'catacomba', 'grotta', 'fiume', 'miniera', 'miniera_camera', 'relitto']);
  const tilesOf = R => { const out = []; if (R.x0 !== undefined) { for (let ty = R.y0; ty < R.y0 + R.th; ty++) for (let tx = R.x0; tx < R.x0 + R.tw; tx++) out.push(ty * GW + tx); } else out.push(Math.floor(R.y / TS) * GW + Math.floor(R.x / TS)); return out.filter(i => TP.ug[i]); };
  const lost = TP.rooms.filter(R => DECO.has(R.deco) && !tilesOf(R).some(i => seen[i]));
  ok(!lost.length, `ogni cavità è raggiungibile dalla superficie: ${TP.rooms.filter(R => DECO.has(R.deco)).length} stanze, perse ${lost.length} ${lost.slice(0, 4).map(R => R.deco + '@' + Math.round(R.x) + ',' + Math.round(R.y)).join(' ')}`);
  // i ritrovamenti: 25-40, i grossi tutti, in terra scavabile (non acqua, non sotto le case, non già scavata, sopra la falda)
  console.log('    ritrovamenti', F.length, F.filter(q => !/_\d+$/.test(q.id)).map(q => q.id + ' ' + q.tw * TS + '×' + q.th * TS + ' m a ' + q.d.toFixed(1) + ' m').join(' · '));
  ok(F.length >= 25 && F.length <= 40, 'da 25 a 40 ritrovamenti: ' + F.length);
  ['dino', 'bus', 'barca', 'statua', 'campana', 'auto', 'partigiani', 'regime', 'cani', 'armi', 'brigante'].forEach(id => ok(F.some(q => q.id === id), 'ritrovamento ' + id));
  ok(F.some(q => q.kind === 'anfore'), 'ritrovamento: anfore');
  const dino = F.find(q => q.id === 'dino'); ok(dino && dino.tw * TS >= 12 && dino.th * TS >= 6, 'il dinosauro sta in una cavità di 12 × 6 m');
  let badF = []; F.forEach(q => { for (let ty = q.y0; ty < q.y0 + q.th; ty++) for (let tx = q.x0; tx < q.x0 + q.tw; tx++) { const i = ty * GW + tx, t = GRID0[i], dz = EL[i] - q.f; if (t === G.T.WATER || t === G.T.BLD || TP.ug[i] || dz < 1.5 || dz > 30) badF.push(q.id + '@' + tx + ',' + ty); } });
  ok(!badF.length, 'ritrovamenti in terra scavabile: ' + (badF.slice(0, 5).join(' ') || 'tutti'));
  const miss = new Set(); F.forEach(q => Object.keys(q.items || {}).forEach(g => { if (!Oggetti.CAT[g]) miss.add(g); })); ok(!miss.size, 'la roba dei ritrovamenti è in oggetti.js ' + [...miss].join(' '));
  // scavando: prima l'indizio (accanto), poi la cavità (dentro, alla quota giusta). L'autobus si scava davvero, col personaggio.
  const bus = F.find(q => q.id === 'bus'), L3 = LV.S(st), bag = Oggetti.inv(st); bag.pala = 1; bag.piccone = 1;
  const sx = bus.x0 - 2, sy = bus.y0, si = sy * GW + sx; L3.ug[si] = 2; L3.fl[si] = bus.f; L3.kind[si] = 2; L3.rev++;
  p.indoor = null; p.lv = { k: 'ug', }; p.x = (sx + .5) * TS; p.y = (sy + .5) * TS; p.face = 0; L3.job = null; L3.auto = null; L3.route = null;
  m = LV.key(st, 'h'); wait(8); const hint = st.feed.slice(0, 4).map(f => f.text).join(' | '); ok(/lamiera/.test(hint), 'indizio accanto all\'autobus: ' + hint.slice(0, 120));
  p.x = (sx + 1.5) * TS; L3.job = null; m = LV.key(st, 'h'); wait(8); const msg2 = st.feed.slice(0, 4).map(f => f.text).join(' | ');
  const opened = (() => { for (let ty = bus.y0; ty < bus.y0 + bus.th; ty++) for (let tx = bus.x0; tx < bus.x0 + bus.tw; tx++) if (L3.kind[ty * GW + tx] !== K.RITROV) return false; return true; })();
  ok(opened && /autobus|Ci si entra/.test(msg2), 'la cavità dell\'autobus si apre: ' + msg2.slice(0, 140));
  ok(L3.rooms.some(R => R.find === 'bus' && R.deco === 'bus'), 'la stanza dell\'autobus c\'è (per la grafica)');
  // il dinosauro, dall'aggancio: accanto indizio, dentro la cavità
  const dh = LV.hooks.dug, at = (tx, ty, f) => { const i = ty * GW + tx; L3.ug[i] = 2; L3.fl[i] = f; L3.kind[i] = 2; return dh.map(fn => fn(st, tx, ty, L3)).find(Boolean); };
  const h1 = at(dino.x0 - 1, dino.y0, dino.f), h2 = at(dino.x0, dino.y0, dino.f); ok(/osso|duro/.test(h1 || '') && /dinosauro/.test(h2 || ''), 'dinosauro: ' + (h1 || '-').slice(0, 50) + ' → ' + (h2 || '-').slice(0, 60));
}
console.log(fail ? `\n${fail} prove fallite (strati e ritrovamenti)` : 'Strati e ritrovamenti: bene.');
process.exitCode = fail ? 1 : 0;
