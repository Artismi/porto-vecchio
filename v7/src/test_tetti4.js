// [tetti4] prova dei tetti come secondo livello esplorabile (tetti.js: rete4, corti4, premi4, copertura4, il piano; percorsi.js: i giri
// col tema, le vie e i rami) sulla città nuova:
//   1. la copertura: nel borgo almeno il 70% dei tetti si raggiunge dalla rete dei giri; marina e Ottocento almeno il 60%; le isole e i
//      tetti irraggiungibili calano rispetto a prima;
//   2. i giri: da 8 a 10 (il camminamento delle mura compreso), ognuno col suo tema e almeno un ramo che paga (belvedere, terrazza,
//      tesoro, corte); almeno due vie per salire e due per scendere, scale da terra viste dalla camera col piede in strada;
//   3. tutto si percorre col motore del gioco: la linea del giro, ogni via in su e in giù, ogni ramo fino al premio (la corte: giù
//      per la scala fino al cortile);
//   4. i tetti espressivi: più forme per quartiere (capanna col colmo nei due versi, padiglione, falda, cupoletta, volta), pendenze
//      diverse, la forma più comune sotto la metà dei tetti del borgo, i tetti muti in calo, i terrazzi col parapetto di più altezze;
//      zero compenetrazioni nel piano (premi compresi);
//   5. le corti a terra: ogni vuoto chiuso dentro gli isolati vecchi ha uno scopo (pozzo, orto, cortile delle reti, passaggio coperto).
// cd v7/src && node test_tetti4.js
const path = require('path'), src = __dirname;
require(path.join(src, 'seme.js'))(12345);   // il seme delle prove (--seme=N)
const log = console.log, warn = console.warn; console.log = () => {}; console.warn = () => {};
global.World = require(path.join(src, 'world_cittanuova.js'));
global.Percorsi = require(path.join(src, 'percorsi.js'));
global.Interior = require(path.join(src, 'interiors.js')); global.Game = require(path.join(src, 'game.js'));
// [tetti4] LA PROVA DELLE CASE GIRATE (TETTI4_RUOTA=1, la lancia questa stessa prova alla fine): in una copia del mondo un quarto delle case
// dei quartieri vecchi gira di 10-40° attorno al centro (seme 12345), più le dieci case che [pianta] deve allineare di più; tutto il resto
// (rete, giri, premi, passerelle, misura) si rifà sopra e deve reggere: copertura ≥ 70% per quartiere, zero urti, i giri camminati.
const RUOTA = process.env.TETTI4_RUOTA || '';
// [tetti4] IL LOTTO ORIENTATO ([pianta]: b.cx, b.cy, b.lw, b.ld, b.rot). TETTI4_RUOTA=uguali: i campi su ogni casa, uguali alla casella
// (il primo passo di [pianta]); la firma del piano, della rete e della misura dev'essere identica a quella senza campi.
// TETTI4_RUOTA=strada: file di tre (o due) case attaccate girano insieme di 20-40° attorno al centro della fila, come lungo una strada
// in diagonale: ogni casa ha il centro libero (non sulla casella), le caselle si ristampano sull'impronta nuova, la porta segue il muro.
// il mondo di [pianta] i campi li ha già (passo 1): allora qui si tolgono, e vale il ripiego sulla casella; se non li avesse, si mettono
if (RUOTA === 'uguali') { const TS = Game.TS, ha = Game.BUILDINGS.some(b => b.cx !== undefined);
  Game.BUILDINGS.forEach(b => { if (ha) { if (b.arretrata === undefined) { delete b.cx; delete b.cy; delete b.lw; delete b.ld; } } else {   /* [pianta] la casa arretrata dalla via tiene la sua scatola: le caselle non la dicono */ b.cx = (b.x + b.w / 2) * TS; b.cy = (b.y + b.h / 2) * TS; b.lw = b.w * TS; b.ld = b.h * TS; } });
  log(`[lotti] ${ha ? 'tolti i campi del lotto: vale la casella' : 'messi i campi del lotto uguali alla casella'}`); }
if (RUOTA === 'strada') { let a = 4242; const rnd = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  // la città è fitta: nessuna fila che c'è si può girare senza entrare nelle case di dietro. Allora, come farà [pianta], la fila si
  // rifà: nei vuoti grandi dei quartieri vecchi (slarghi, piazzette, prati dentro le mura) una strada in diagonale di 20-40° e lungo la
  // strada da due a quattro case attaccate, prese dalle case vicine (le loro caselle vecchie diventano selciato): ogni casa col suo
  // centro libero, la sua larghezza e profondità, girata come la strada, la facciata e la porta sulla strada.
  const TS = Game.TS, GW = Game.GW, GH = Game.GH, W = Game.MAP.world, BI = W.bIndex, GR = Game.MAP.grid, GW0 = W.grid, EL = Game.MAP.elev, B = Game.BUILDINGS, BLD = 2, COB = 0;
  const buono = b => b && ['E0', 'E2', 'E3'].includes(b.era) && !b.church && !b.gov && !b.shack && !b.pezzo && !b.__tierOf && !b.rot && !b.sign && !b.shop && !b.military && !b.annesso && b.w >= 2 && b.w <= 3 && b.h >= 2 && b.h <= 3;
  const terra = i => [0, 3, 9, 11, 14, 20].includes(GR[i]) && BI[i] < 0, gira = (t, x, y) => [x * Math.cos(t) - y * Math.sin(t), x * Math.sin(t) + y * Math.cos(t)];
  const libero = (x, y) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); return tx >= 0 && ty >= 0 && tx < GW && ty < GH && terra(ty * GW + tx); };
  // il rettangolo girato (centro, misure, angolo) sta tutto nel vuoto, col margine m
  const nelVuoto = (cx, cy, lw, ld, th, m) => { for (let u = -.5; u <= .5001; u += 1 / 12) for (let v = -.5; v <= .5001; v += 1 / 8) { const [ex, ey] = gira(th, u * (lw + 2 * m), v * (ld + 2 * m)); if (!libero(cx + ex, cy + ey)) return false; } return true; };
  const FILE = [], presi = new Set(), usati = [];
  for (let ty = 2; ty < GH - 2 && FILE.length < 6; ty += 2) for (let tx = 2; tx < GW - 2 && FILE.length < 6; tx += 2) {
    const i0 = ty * GW + tx; if (!terra(i0) || usati.some(([x, y]) => Math.hypot(x - tx, y - ty) < 20)) continue;
    // le case vicine che si possono spostare (dei quartieri vecchi), le più vicine prima
    const vic = []; for (let j = -14; j <= 14; j++) for (let i = -14; i <= 14; i++) { const k = (ty + j) >= 0 && (ty + j) < GH && (tx + i) >= 0 && (tx + i) < GW ? BI[(ty + j) * GW + tx + i] : -1; if (k >= 0 && !presi.has(k) && buono(B[k]) && !vic.includes(k)) vic.push(k); }
    if (vic.length < 3) continue; vic.sort((p, q) => Math.hypot(B[p].x - tx, B[p].y - ty) - Math.hypot(B[q].x - tx, B[q].y - ty));
    const era = B[vic[0]].era, cand = vic.filter(k => B[k].era === era), cx0 = (tx + .5) * TS, cy0 = (ty + .5) * TS, sg = rnd() < .5 ? -1 : 1, a0 = 20 + Math.floor(rnd() * 5) * 5;
    let fatto = null;
    // prima le due file che si guardano attraverso la strada (larga 4 m), da due a tre case per parte; se non ci stanno, una fila sola
    for (const [n, lati] of [[3, 2], [2, 2], [4, 1], [3, 1], [2, 1]]) { if (fatto || cand.length < n * lati) continue; for (const aa of [a0, 40, 35, 30, 25, 20]) { if (fatto) break; for (const s of [sg, -sg]) { if (fatto) break;
      const th = s * aa * Math.PI / 180, fila = cand.slice(0, n * lati), lw = fila.map(k => B[k].w * TS), ld = fila.map(k => B[k].h * TS), lato = fila.map((k, q) => q < n ? -1 : 1);
      const [ux, uy] = gira(th, 1, 0), [nx, ny] = gira(th, 0, 1), cen = [], WST = 4;
      [-1, 1].slice(0, lati).forEach(sl => { const Q = fila.map((k, q) => q).filter(q => lato[q] === sl), Lr = Q.reduce((p, q) => p + lw[q], 0); let s0 = -Lr / 2;
        Q.forEach(q => { const cu = s0 + lw[q] / 2, cv = sl * (WST / 2 + ld[q] / 2); cen[q] = [cx0 + ux * cu + nx * cv, cy0 + uy * cu + ny * cv]; s0 += lw[q]; }); });   // la facciata sul filo della strada
      if (!fila.every((k, q) => nelVuoto(cen[q][0], cen[q][1], lw[q], ld[q], th, .6))) continue;
      const Lm = Math.max(...[-1, 1].map(sl => fila.reduce((p, k, q) => p + (lato[q] === sl ? lw[q] : 0), 0))); if (!nelVuoto(cx0, cy0, Lm, WST - .4, th, 0)) continue;   // la strada libera
      fatto = { fila, th, cen, lw, ld, nx, ny, lato, tx, ty }; } } }
    if (!fatto) continue;
    fatto.fila.forEach(k => presi.add(k)); usati.push([tx, ty]); FILE.push(fatto);
    // le caselle vecchie si vuotano, le nuove si stampano sull'impronta girata
    fatto.fila.forEach(k => { const b = B[k]; for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) { const i = y * GW + x; if (BI[i] === k) { BI[i] = -1; GR[i] = GW0[i] = COB; } } });
    fatto.fila.forEach((k, q) => { const b = B[k], [cx, cy] = fatto.cen[q], th = fatto.th, c = Math.cos(-th), sn = Math.sin(-th), R = Math.hypot(fatto.lw[q], fatto.ld[q]) / 2; let mx = 1e9, my = 1e9, Mx = -1, My = -1;
      b.cx = cx; b.cy = cy; b.lw = fatto.lw[q]; b.ld = fatto.ld[q]; b.rot = th; b.base = EL[Math.floor(cy / TS) * GW + Math.floor(cx / TS)];
      for (let y = Math.floor((cy - R) / TS); y <= Math.floor((cy + R) / TS); y++) for (let x = Math.floor((cx - R) / TS); x <= Math.floor((cx + R) / TS); x++) {
        const i = y * GW + x, px = (x + .5) * TS - cx, py = (y + .5) * TS - cy, lx = px * c - py * sn, ly = px * sn + py * c;
        if (Math.abs(lx) > b.lw / 2 || Math.abs(ly) > b.ld / 2 || BI[i] >= 0) continue;
        BI[i] = k; GR[i] = GW0[i] = BLD; EL[i] = b.base; mx = Math.min(mx, x); my = Math.min(my, y); Mx = Math.max(Mx, x); My = Math.max(My, y); }
      b.x = mx; b.y = my; b.w = Mx - mx + 1; b.h = My - my + 1;
      // la porta: sulla strada, davanti al mezzo della facciata
      for (let d = b.ld / 2 + .3; d < b.ld / 2 + 3; d += .3) { const x = Math.floor((cx - fatto.lato[q] * fatto.nx * d) / TS), y = Math.floor((cy - fatto.lato[q] * fatto.ny * d) / TS); if (BI[y * GW + x] < 0 && Game.walkT(x, y)) { b.door = [x, y]; break; } } }); }
  global.STRADA4 = FILE;
  log(`[case girate] ${FILE.length} strade in diagonale (${FILE.map(f => Math.round(f.th * 180 / Math.PI) + '°').join(', ')}) con ${FILE.reduce((s, f) => s + f.fila.length, 0)} case attaccate col centro libero (${FILE.map(f => f.fila.map(k => B[k].id).join('+')).join(' · ')})`); }
if (RUOTA === '1') { let a = 12345; const rnd = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  // le dieci case di [pianta] per posto (casella d'angolo), non per nome: gli id scorrono quando il mondo aggiunge un edificio prima di loro
  const PEGGIO = [[637, 184], [641, 186], [656, 186], [650, 188], [678, 222], [707, 191], [709, 191], [717, 192], [644, 158], [646, 159]].map(([x, y]) => (Game.BUILDINGS.find(b => b.x === x && b.y === y) || {}).id).filter(Boolean);
  const POSTO = process.env.TETTI4_POSTO;   // TETTI4_POSTO=1: l'estrazione per posto (la casella d'angolo mescolata col seme) invece che in fila
  let n = 0; Game.BUILDINGS.forEach(b => { if (!['E0', 'E2', 'E3'].includes(b.era) || b.church || b.gov || b.shack || b.pezzo || b.__tierOf) return; if (POSTO) { a = (12345 ^ Math.imul(b.x + 1, 73856093) ^ Math.imul(b.y + 1, 19349663)) | 0; rnd(); } const u = rnd(), v = rnd(), z = rnd();
    if (PEGGIO.includes(b.id)) { b.rot = (z < .5 ? -1 : 1) * 40 * Math.PI / 180; n++; } else if (u < .25) { b.rot = (z < .5 ? -1 : 1) * (10 + v * 30) * Math.PI / 180; n++; } });
  log(`[case girate] ${n} case girate di 10-40°`); }
global.Risacca = require(path.join(src, 'risacca.js')); global.Popolo = require(path.join(src, 'popolo.js')); global.Azioni = require(path.join(src, 'azioni.js'));
global.Livelli = require(path.join(src, 'livelli.js')); global.Sottosuolo = require(path.join(src, 'sottosuolo.js')); global.Tetti = require(path.join(src, 'tetti.js'));
global.TettiVissuti = require(path.join(src, 'tetti_vissuti.js'));   // le cose dei tetti vissuti contano nella misura delle passerelle
console.log = log; console.warn = warn;
const G = Game, T = Tetti, LV = Livelli, D = Percorsi.dati, B = G.BUILDINGS, TS = G.TS, hyp = Math.hypot;
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };

// ---------------- 1. la copertura ----------------
const C4 = T.copertura4(), Z = C4.zone;
Object.entries(Z).forEach(([z, s]) => console.log(`${z}: ${s.tetti} tetti, sul giro ${s.giro}, dalla rete ${s.rete}, isole ${s.isola}, irraggiungibili ${s.muro}, muti ${s.muti}, forme ${JSON.stringify(s.forme)}`));
ok(Z.borgo.raggiungibili >= .7, `nel borgo i tetti raggiungibili dalla rete dei giri: ${Math.round(100 * Z.borgo.raggiungibili)}% (almeno 70%; prima 23%)`);
ok(Z.marina.raggiungibili >= .7 && Z.ottocento.raggiungibili >= .7, `marina ${Math.round(100 * Z.marina.raggiungibili)}%, Ottocento ${Math.round(100 * Z.ottocento.raggiungibili)}% (almeno 70%; prima 0% e 12%)`);   // [cucitura] alzato a 70%
ok(Z.borgo.isola + Z.borgo.muro <= 90, `nel borgo isole e irraggiungibili: ${Z.borgo.isola} + ${Z.borgo.muro} (prima 167 + 77)`);
ok(Z.borgo.attraversati >= .2, `i tetti del borgo attraversati da un giro, da una sua via o da un suo ramo: ${Math.round(100 * Z.borgo.attraversati)}% (prima 3%)`);
const R4 = T.RETE4; console.log(`la rete: ${R4.scalette.length} scalette fra tetti, ${R4.archi.length} archi, ${R4.passerelle.length} passerelle, ${(R4.salite || []).length} salite nuove da terra, ${R4.anelli} anelli`);
ok(R4.scalette.length >= 20 && R4.archi.length >= 8, 'i legami nuovi col vocabolario di qui: scalette di ferro e archi di contrasto');
ok(T.PLANKS.filter(P => P.via5).length <= 4, `sopra la Rua e la Marina pochi archi (${T.PLANKS.filter(P => P.via5).length}), uno ogni 30 m`);

// ---------------- 2. i giri, i temi, i premi, le vie ----------------
const giri = D.circuiti.filter(c => c.k === 'tetti'), tutti = D.circuiti;
ok(giri.length >= 8 && giri.length <= 10 && tutti.length === giri.length + 1, `da otto a dieci giri sui tetti, più le mura (${tutti.length}: ${tutti.map(c => c.nome.replace(/^Il (giro )?/, '')).join(', ')})`);
ok(tutti.every(c => c.tema), 'ogni giro ha il suo tema: ' + tutti.map(c => c.tema).join(' · '));
ok(giri.every(c => (c.rami || []).length >= 1), 'ogni giro sui tetti ha almeno un ramo che paga: ' + giri.map(c => c.id.replace('giro_', '') + ' ' + c.rami.map(r => r.premio).join('+')).join(' · '));
const kinds = new Set(); giri.forEach(c => c.rami.forEach(r => kinds.add(r.premio)));
ok(kinds.size >= 4, `i premi sono di quattro tipi (${[...kinds].join(', ')})`);
ok(T.PREMI.length === giri.reduce((s, c) => s + c.rami.length, 0) && T.BELV.filter(v => v.giro).length === giri.reduce((s, c) => s + c.rami.filter(r => r.premio === 'belvedere').length, 0), `i premi nel mondo (${T.PREMI.length}) e i belvederi dei giri fra i belvederi (${T.BELV.filter(v => v.giro).length})`);
const strada = L => G.walkT(Math.floor(L.fx / TS), Math.floor(L.fy / TS)) && T.bAt(L.fx, L.fy) < 0;
giri.forEach(c => { const su = [...new Set(c.salite)], giu = [...new Set(c.discese)], tutte = [...new Set(su.concat(giu))].map(i => T.LADDERS[i]);
  ok(su.length >= 2 && giu.length >= 2 && tutte.every(L => L.footB < 0 && strada(L) && T.vistaL3(L)), `${c.nome}: ${su.length} vie su e ${giu.length} giù, tutte da terra e viste dalla camera`); });

if (RUOTA === 'strada') { const S = B.map((b, i) => T.libero4(b) ? i : -1).filter(i => i >= 0), E = T.grafo ? T.grafo() : null;
  const cl = {}; S.forEach(i => { const k = C4.classe[i] ? C4.classe[i].k : '-'; cl[k] = (cl[k] || 0) + 1; });
  const pl = T.PLANKS.filter(P => S.includes(P.a) || S.includes(P.b)).length, sc = T.LADDERS.filter(L => S.includes(L.bi)).length;
  const fra = E ? S.reduce((n, i) => n + (E.get(i) || []).filter(e => S.includes(e.b) && e.k !== 'scala').length, 0) / 2 : -1;
  console.log(`le case della strada in diagonale: ${JSON.stringify(cl)}, ${pl} passerelle/archi verso di loro, ${sc} scale sui loro muri, ${fra} passaggi da tetto a tetto fra loro`);
  // ogni strada ha la sua scala da terra sui muri girati; lungo ogni fila, due case attaccate entro un gradino (1,2 m) si passano nei due versi
  const F4 = global.STRADA4 || [], manca = [];
  let salite = 0; F4.forEach(f => { if (T.LADDERS.some(L => f.fila.includes(L.bi) && L.footB < 0)) salite++; else console.log(`  la strada di ${f.fila.map(k => B[k].id).join('+')} (${Math.round(f.th * 180 / Math.PI)}°) non ha la scala da terra: la facciata è tutta porta e i fianchi non si vedono dalla camera`);
    [-1, 1].forEach(sl => { const Q = f.fila.filter((k, q) => f.lato[q] === sl); for (let q = 0; q + 1 < Q.length; q++) { const [u, v] = [Q[q], Q[q + 1]];
      if (Math.abs(T.roofRule(B[u]) - T.roofRule(B[v])) <= 1.2 && !((E.get(u) || []).some(e => e.b === v && e.k !== 'scala') && (E.get(v) || []).some(e => e.b === u && e.k !== 'scala'))) manca.push(B[u].id + '-' + B[v].id); } }); });
  ok(F4.length >= 3 && salite >= Math.ceil(F4.length * 2 / 3) && !manca.length, `${salite} strade in diagonale su ${F4.length} si salgono da terra (la scala sui muri girati) e lungo ogni fila si passa da tetto a tetto${manca.length ? ': manca ' + manca.join(', ') : ''}`); }
// ---------------- 3. col motore ----------------
const st = G.create(1), p = st.player, DT = 1 / 30;
const run = (s, inp) => { for (let i = 0; i < s * 30; i++) G.step(st, DT, Object.assign({ x: 0, y: 0 }, inp)); };
const calm = () => { p.hp = 100; p.stun = 0; p.kbx = p.kby = 0; st.police = []; st.heat = 0; p.speed = 0; p.jz = 0; p.jvz = 0; p.jcharge = null; };
const clear = () => st.npcs.forEach(n => { if (hyp(n.x - p.x, n.y - p.y) < 30) { n.x = p.x + 120; n.y = p.y; n.path = []; } });
const roofAt = (b, x, y) => { const q = T.roofAt(x, y); return q && q.bi === b ? q.h : T.roofRule(B[b]); };
function sali(L) { p.lv = null; p.indoor = null; p.vehicle = null; p.x = L.fx; p.y = L.fy; calm(); clear(); LV.key(st, 'v'); run(8, {}); return !!(p.lv && p.lv.k === 'tetto' && p.lv.b === L.bi); }
function scendi(L) { p.lv = { k: 'tetto', b: L.bi, h: roofAt(L.bi, L.tx, L.ty) }; p.x = L.tx; p.y = L.ty; calm(); clear(); LV.key(st, 'v'); run(9, {}); return !p.lv && hyp(p.x - L.fx, p.y - L.fy) < .3; }
function passa(e) {   // come test_percorsi.js
  if (e.k === 'scala') { const L = T.LADDERS[e.i], up = e.a === L.footB; p.lv = { k: 'tetto', b: e.a, h: up ? roofAt(e.a, L.fx, L.fy) : roofAt(e.a, L.tx, L.ty) }; p.x = up ? L.fx : L.tx; p.y = up ? L.fy : L.ty; calm(); clear();
    T.climb(st, L, up); run(9, {}); return p.lv && p.lv.k === 'tetto' && p.lv.b === e.b && p.hp === 100; }
  const PK = e.k === 'passerella' ? T.PLANKS[e.i] : null, ux = e.ux, uy = e.uy, back = e.k === 'salto' ? 2.2 : e.k === 'passerella' ? (PK && PK.pin ? PK.gap / 2 + (e.a === PK.b ? (PK.pinB || PK.pin) : PK.pin) + .3 : 3.4) : e.k === 'gradino' ? .55 : 1.2;
  p.x = e.x - ux * back; p.y = e.y - uy * back; p.lv = { k: 'tetto', b: e.a, h: roofAt(e.a, p.x, p.y) }; calm(); clear(); T.settle(st);
  if (!(p.lv && p.lv.b === e.a)) return false;
  if (e.k === 'salto' || e.k === 'gradino') { G.jumpHold(st, true); run(.7, {}); G.jumpHold(st, false); }
  for (let k = 0; k < 5 * 30 && !(p.lv && p.lv.b === e.b && !(p.jz > 0)); k++) G.step(st, DT, { x: ux, y: uy, sprint: e.k === 'salto' });
  run(.4, {}); return !!(p.lv && p.lv.k === 'tetto' && p.lv.b === e.b) && p.hp === 100;
}
const nome = e => e.k + '(' + B[e.a].id + '→' + B[e.b].id + ')';
let passi = 0;
giri.forEach(c => {
  const es = [], L0 = T.LADDERS[c.sali], L1 = T.LADDERS[c.scendi];
  es.push(sali(L0) ? 'su' : 'NOsu'); c.passi.forEach(e => { passi++; es.push(passa(e) ? e.k[0] : 'NO' + nome(e)); }); es.push(scendi(L1) ? 'giù' : 'NOgiù');
  (c.vie || []).forEach(v => { const L = T.LADDERS[v.i];
    const a = [sali(L) ? 'su' : 'NOsu']; v.su.forEach(e => { passi++; a.push(passa(e) ? e.k[0] : 'NO' + nome(e)); }); a.push(p.lv && c.edifici.includes(p.lv.b) ? 'giro' : 'NOgiro');
    const b = []; v.giu.forEach(e => { passi++; b.push(passa(e) ? e.k[0] : 'NO' + nome(e)); }); b.push(scendi(L) ? 'giù' : 'NOgiù');
    es.push('| via ' + a.join(' ') + ' / ' + b.join(' ')); });
  (c.rami || []).forEach(r => { const a = []; r.passi.forEach(e => { passi++; a.push(passa(e) ? e.k[0] : 'NO' + nome(e)); });
    if (!r.passi.length) { const q = T.LADDERS[r.scala]; p.lv = { k: 'tetto', b: r.bi, h: roofAt(r.bi, q.tx, q.ty) }; }
    a.push(p.lv && p.lv.b === r.bi ? r.premio : 'NO' + r.premio);
    if (r.premio === 'corte') { const L = T.LADDERS[r.scala], Cc = T.CORTI[L.corte]; const giu = scendi(L), dentro = Cc && Cc.celle.some(([x, y]) => x === Math.floor(p.x / TS) && y === Math.floor(p.y / TS)); a.push(giu && dentro ? 'nella corte' : 'NOcorte'); }
    es.push('| ramo ' + a.join(' ')); });
  ok(!es.some(s => /NO/.test(s)), `${c.nome} (${c.tema}): ${es.join(' ')}`);
});
console.log(`passaggi percorsi col motore: ${passi}`);
// il tesoro si apre la prima volta, e una volta sola
{ const q = T.PREMI.find(z => z.k === 'tesoro'); if (q) { if (st.tetti) st.tetti.tesori = {}; p.lv = { k: 'tetto', b: q.bi, h: T.roofRule(B[q.bi]) }; p.x = q.x; p.y = q.y; calm(); const m0 = p.money; run(.3, {}); const m1 = p.money; run(.3, {}); ok(m1 > m0 && p.money === m1, `il tesoro si apre una volta (+${m1 - m0})`); } }

// ---------------- 4. i tetti espressivi e senza compenetrazioni ----------------
const V = T.verifica3(), perTipo = {}; V.compenetrazioni.forEach(c => perTipo[c[c.length - 1]] = (perTipo[c[c.length - 1]] || 0) + 1);
ok(V.compenetrazioni.length === 0, `zero compenetrazioni nel piano dei tetti (${V.compenetrazioni.length} ${JSON.stringify(perTipo)})`);
const P4 = T.PIANO.filter(P => P && (P.era === 'E0' || P.era === 'E2' || P.era === 'E3'));
const firme = {}; P4.filter(P => P.era === 'E0').forEach(P => { const f = P.firma4; firme[f] = (firme[f] || 0) + 1; });
const dom = Math.max(...Object.values(firme)) / P4.filter(P => P.era === 'E0').length;
console.log('forme del borgo', JSON.stringify(firme));
ok(dom < .5, `nel borgo la forma più comune copre ${Math.round(100 * dom)}% dei tetti (meno della metà)`);
const forme = new Set(P4.map(P => P.forma4 || P.forma || P.tipo)); ok(['capanna', 'padiglione', 'falda', 'cupola', 'volta'].every(f => forme.has(f)), `le forme: ${[...forme].join(', ')}`);
ok(P4.some(P => P.colmo && !P.colmo.along) && P4.some(P => P.colmo && P.colmo.along), 'il colmo nei due versi');
const pend = new Set(P4.filter(P => P.pitch).map(P => P.pitch.toFixed(2))); ok(pend.size >= 5, `pendenze diverse (${pend.size})`);
const par = new Set(); P4.forEach(P => P.parapetti && Object.values(P.parapetti).forEach(h => par.add(h))); ok(par.size >= 3, `i parapetti dei terrazzi di più altezze (${[...par].sort().join(', ')} m)`);
ok(P4.filter(P => P.tipo === 'piano' && P.parapetti).every(P => P.parapetti.S <= .5 && P.parapetti.E <= .5), 'verso la camera (sud, est) il parapetto resta basso');
ok(T.PIANO.filter(Boolean).every(P => !P.giro || P.tipo === 'piano'), 'i tetti dei giri restano terrazzi');
const alt = T.PIANO.filter(P => P && P.gruppi.some(g => g.k === 'altana')).length, tor = T.PIANO.filter(P => P && P.gruppi.some(g => g.k === 'torretta')).length;
ok(alt >= 4 && tor >= 2, `altane (${alt}) e torrette (${tor}) sui tetti`);
const cam = {}; T.PIANO.forEach(P => P && P.gruppi.forEach(g => { if (g.k === 'comignoli' && g.tipo4) cam[g.tipo4] = (cam[g.tipo4] || 0) + 1; })); ok(Object.keys(cam).length >= 3, `comignoli di più tipi: ${JSON.stringify(cam)}`);
ok(T.PREMI.every(q => { const P = T.PIANO[q.bi], [lx, ly] = T.loc3(B[q.bi], q.x, q.y); return !P || P.riserve.some(r => hyp(r[0] - lx, r[1] - ly) < .05); }), 'ogni premio ha il suo posto riservato sul tetto');   // [tetti4] nel riferimento della casa (girata o no)

// ---------------- 4b. le passerelle contro i tetti (Tetti.passerelle4, strumenti/passerelle4.js): zero urti, regola dura ----------------
{ const R = T.passerelle4(), CN = T.PLANKS.filter(P => T.PIANO[P.a] && T.PIANO[P.b]);
  ok(R.urti.length === 0, `nessuna passerella, arco o ponte entra nei tetti (falde, colmo, gronde, parapetti, comignoli, gruppi, cose dei tetti vissuti; 2 cm): ${R.urti.length} su ${R.passerelle}` + (R.urti.length ? ' — ' + R.urti.slice(0, 6).map(u => `#${u.i} ${u.tipo} ${u.cm} cm in ${u.contro} a (${u.x}, ${u.y}, ${u.z})`).join(' · ') : ''));
  ok(CN.length === T.PLANKS.length && CN.every(P => T.PIANO[P.a].tipo === 'piano' && T.PIANO[P.b].tipo === 'piano' && P.prof), `ogni capo posa sul lastrico di un terrazzo, col pianerottolo sopra il parapetto e la scaletta (${CN.length})`);
  ok(T.PLANKS.every(P => !P.prof || P.prof.k.every(([s, h], i, K) => !i || (s >= K[i - 1][0] - 1e-6))), 'il profilo va da un capo all\'altro'); }

// ---------------- 5. le corti ----------------
const CO = T.CORTI, ck = {}; CO.forEach(c => ck[c.k] = (ck[c.k] || 0) + 1);
ok(CO.length >= 10 && CO.every(c => ['pozzo', 'orto', 'bottega', 'passaggio'].includes(c.k)), `le corti a terra con uno scopo: ${CO.length} ${JSON.stringify(ck)}`);
ok(CO.filter(c => c.scala >= 0).length >= 3, `le scale che scendono nelle corti (${CO.filter(c => c.scala >= 0).length})`);
ok(giri.some(c => c.rami.some(r => r.premio === 'corte')), 'almeno un giro scende in una corte');

// ---------------- 6. la prova delle case girate e dei lotti (in altri processi: la copia del mondo) ----------------
// la firma: il piano dei tetti, la rete (passerelle, scale, salti), la copertura, i tetti vissuti, i giri (numeri arrotondati al mm)
const firma4 = () => { const vis = new WeakSet(), BS = new Set(B), J = JSON.stringify({ piano: T.PIANO, plank: T.PLANKS, scale: T.LADDERS, salti: T.JUMPS, zone: C4.zone, giri: D.circuiti, vissuti: TettiVissuti.VISSUTI },
    (k, v) => typeof v === 'number' ? Math.round(v * 1000) / 1000 : v && typeof v === 'object' ? (BS.has(v) ? '#casa' : vis.has(v) ? '~' : (vis.add(v), v)) : v);
  return require('crypto').createHash('md5').update(J).digest('hex').slice(0, 12) + ' (' + J.length + ')'; };
console.log('[firma lotti] ' + firma4());
if (!RUOTA) { const figlio = (m, nome, extra) => { const r = require('child_process').spawnSync(process.execPath, [__filename], { env: Object.assign({}, process.env, { TETTI4_RUOTA: m }, extra || {}), encoding: 'utf8', maxBuffer: 64 << 20 });
    const out = (r.stdout || '') + (r.stderr || ''), righe = out.split('\n');
    righe.filter(l => /^\[case girate\]|^(borgo|marina|ottocento):|raggiungibili dalla rete|marina \d+%|entra nei tetti|^NO /.test(l)).forEach(l => console.log('     ' + nome + ' · ' + l));
    return { r, righe }; };
  let { r, righe } = figlio('1', 'girate');
  ok(r.status === 0, `con le case girate (10-40°) la rete regge: copertura ≥ 70% per quartiere, zero urti, i giri camminati (${r.status === 0 ? 'tutte le prove passate' : righe.filter(l => /^NO /.test(l)).length + ' prove non passate'})`);
  ({ r, righe } = figlio('1', 'girate per posto', { TETTI4_POSTO: '1' }));   // un'altra estrazione (per posto): la rete deve reggere senza ritocchi
  ok(r.status === 0, `anche con un'altra estrazione delle case girate (per posto) la rete regge (${r.status === 0 ? 'tutte le prove passate' : righe.filter(l => /^NO /.test(l)).length + ' prove non passate'})`);
  ({ r, righe } = figlio('strada', 'strada'));
  ok(r.status === 0, `con le file di case col centro libero lungo strade in diagonale (20-40°) la rete regge: copertura ≥ 70% per quartiere, zero urti, i giri camminati (${r.status === 0 ? 'tutte le prove passate' : righe.filter(l => /^NO /.test(l)).length + ' prove non passate'})`);
  ({ r, righe } = figlio('uguali', 'lotti uguali'));
  const f0 = firma4(), f1 = (righe.find(l => l.startsWith('[firma lotti] ')) || '').slice(14);
  ok(r.status === 0 && f1 === f0, `con i campi del lotto (b.cx, b.cy, b.lw, b.ld) di [pianta] e col ripiego sulla casella il risultato è identico: firma ${f0} = ${f1 || '?'}`); }

console.log(fail ? `\n${fail} prove non passate` : '\ntutte le prove passate');
process.exit(fail ? 1 : 0);
