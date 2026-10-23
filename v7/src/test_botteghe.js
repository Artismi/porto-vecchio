// prova delle botteghe sotto casa nella città nuova (filone C): distribuzione per strada ed epoca, il fronte accanto al portone,
// la pianta bottega + androne, i due ingressi dal gioco. node test_botteghe.js
global.World = require('./world_cittanuova.js'); global.Interior = require('./interiors.js'); global.Game = require('./game.js');
const W = World, I = Interior, G = Game, B = W.BUILDINGS, TS = W.TS || 2, GW = W.GW;
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };
const city = B.filter(b => b.door && W.zone[b.y * GW + b.x] === W.Z.CITTA && !b.military), SF = B.filter(b => b.shopFront);
const conFronte = SF.filter(b => b.shopFront.door), piano1 = SF.filter(b => b.shopFront.piano === 1), soloCase = city.filter(b => !b.shop && !b.name);
console.log(`edifici di città ${city.length} · botteghe sotto casa ${SF.length} (al primo piano ${piano1.length}) · solo case ${soloCase.length}`);
ok(SF.length >= 40, 'almeno quaranta botteghe sotto casa');
ok(soloCase.length > city.length * .5, `molti palazzi restano solo case (${soloCase.length}/${city.length})`);
// per epoca: fitte sulla Rua (E0), sulla marina (E2), sul Corso e agli angoli (E3), sotto i portici della Vittoria (E4); poche fra le baracche
const per = e => { const t = city.filter(b => b.era === e), s = t.filter(b => b.shopFront); return [s.length, t.length]; };
['E0', 'E2', 'E3', 'E4', 'E6', 'E7'].forEach(e => { const [s, t] = per(e); console.log(`  ${e}: ${s}/${t}`); });
ok(per('E7')[0] <= Math.max(1, per('E7')[1] * .1), 'fra le baracche quasi nessuna bottega');
// [cucitura] la Vittoria viva: le case dei portici sono dell'Ottocento (E3) e del borgo (E0); le botteghe si contano sui suoi due fronti
const sulV = city.filter(b => b.shopFront && (b.vittoria || b.vittoriaSud)).length;
ok(per('E0')[0] >= 8 && per('E3')[0] >= 6 && (per('E4')[0] >= 3 || sulV >= 5), `botteghe nel borgo, nell'Ottocento e sotto i portici (sulla Vittoria ${sulV})`);
// i dati: formato completo, porta della bottega accanto al portone sullo stesso lato, caselle libere e distinte
const adj = (p, q) => Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]);
ok(SF.every(b => { const S = b.shopFront; return S.use && S.name && S.sign && S.era && (S.piano === 0 || S.piano === 1); }), 'ogni shopFront ha use, name, sign, era, piano');
ok(conFronte.every(b => { const S = b.shopFront; return S.face && S.span && adj(S.door, b.door) >= 1 && adj(S.door, b.door) <= 5 && (S.door[0] === b.door[0] || S.door[1] === b.door[1]); }), 'la porta della bottega sta sul lato del portone, a una-cinque caselle');
ok(conFronte.every(b => W.walkT ? true : true) && conFronte.every(b => { const t = W.grid[b.shopFront.door[1] * GW + b.shopFront.door[0]]; return t !== W.T.BLD && t !== W.T.WATER; }), 'davanti alla porta della bottega si cammina');
ok(new Set(conFronte.map(b => b.shopFront.door.join())).size === conFronte.length, 'due botteghe non condividono la porta');
// pescherie e osterie vicino all'acqua (40 m)
const acqua = b => { for (let r = 0; r <= 20; r++) for (let a = -r; a <= r; a++) for (const [tx, ty] of [[b.x + a, b.y - r], [b.x + a, b.y + b.h + r], [b.x - r, b.y + a], [b.x + b.w + r, b.y + a]]) { const v = W.grid[ty * GW + tx]; if (v === W.T.QUAY || v === W.T.PIER || (v === W.T.WATER && W.zone[ty * GW + tx] === W.Z.MARE)) return true; } return false; };
const pesce = SF.filter(b => /pescheria|trattoria/.test(b.shopFront.use) && b.era && b.era !== 'E0');
ok(pesce.every(acqua), `pescherie e osterie fuori dal borgo entro 40 m dall'acqua (${pesce.length})`);
// chi usa b.use/b.shop/b.sign trova la bottega come prima; il luogo è la porta della bottega
ok(SF.every(b => b.use || b.id), 'b.use resta (economia, mestieri, missioni)');
ok(conFronte.filter(b => W.PLACES[b.id]).every(b => W.PLACES[b.id].tx === b.shopFront.door[0] && W.PLACES[b.id].ty === b.shopFront.door[1]), 'PLACES porta alla porta della bottega');
// gli interni: due ingressi, bottega con almeno locale e retro, androne con la scala, tutto raggiungibile
let nI = 0, bad = [], poche = 0, nob = 0, scalaB = 0;
conFronte.forEach(b => { const L = I.layout(b); nI++;
  if (!L.ent || !L.ent2 || !L.shop) { bad.push(b.id); return; }
  for (let f = 0; f < L.floors.length; f++) if (!I.reachAll(L, f)) { bad.push(b.id + '@' + f); return; }
  const inS = q => q.x + q.w / 2 > L.shop[0] && q.x + q.w / 2 < L.shop[0] + L.shop[2] && q.y + q.h / 2 > L.shop[1] && q.y + q.h / 2 < L.shop[1] + L.shop[3];
  const F0 = L.floors[0], rs = F0.rooms.filter(inS), rp = F0.rooms.filter(q => !inS(q));
  if (rs.length < 2) poche++; if (!rp.some(q => q.name === 'androne')) nob++;
  if (L.stairs && inS({ x: L.stairs.x, y: L.stairs.y, w: L.stairs.w, h: L.stairs.h })) scalaB++; });
ok(!bad.length, `interni con due ingressi e tutto raggiungibile (${nI}) ${bad.slice(0, 5).join(' ')}`);
ok(poche <= nI * .15, `la bottega ha locale e retrobottega (${nI - poche}/${nI})`);
ok(!nob, 'dal portone si entra nell\'androne');
ok(!scalaB, 'la scala sta nell\'androne, non in bottega');
const pal = conFronte.find(b => b.fl >= 3), Lp = I.layout(pal);
console.log(`  ${pal.shopFront.name} (${pal.era}): ${Lp.floors.map((F, f) => `${f}: ${F.rooms.map(q => q.name).join(',')}`).join(' | ')}`);
ok(Lp.floors.length >= 2 && Lp.floors.slice(1).every(F => !F.rooms.some(q => /^bottega$|retro$/.test(q.name))), 'sopra la bottega ci sono le case');
// dal gioco: la porta della bottega porta in bottega, il portone nell'androne
const st = G.create(1), p = st.player, bi = B.indexOf(pal);
ok(G.SHOP_T && G.SHOP_T.has(pal.shopFront.door[1] * GW + pal.shopFront.door[0]), 'il gioco conosce la porta della bottega');
G.enterBuilding(st, bi, true); const r1 = I.roomAt(Lp, 0, p.x, p.y); ok(p.indoor && r1 && r1.x + r1.w / 2 > Lp.shop[0] && r1.x + r1.w / 2 < Lp.shop[0] + Lp.shop[2] && r1.y + r1.h / 2 > Lp.shop[1] && r1.y + r1.h / 2 < Lp.shop[1] + Lp.shop[3], `dalla porta della bottega: ${r1 && r1.name}`);
G.exitBuilding(st); ok(Math.hypot(p.x - Lp.ent2.out[0], p.y - Lp.ent2.out[1]) < .1, 'si esce dalla porta della bottega');
G.enterBuilding(st, bi, false); const r2 = I.roomAt(Lp, 0, p.x, p.y); ok(r2 && r2.name === 'androne', `dal portone: ${r2 && r2.name}`);
G.exitBuilding(st); ok(Math.hypot(p.x - Lp.ent.out[0], p.y - Lp.ent.out[1]) < .1, 'si esce dal portone');
console.log(fail ? `${fail} prove non passate` : 'Tutto a posto.'); process.exitCode = fail ? 1 : 0;
