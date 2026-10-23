// [scorci] prova degli scorci composti (scorci.js le ricette, scorci_arte.js il kit), sulla città nuova:
//   1. almeno dieci scorci, sui luoghi-missione e sulle piazzette, ognuno col suo punto focale (il pezzo che gli dà il nome c'è);
//   2. niente sull'asse di una porta (il corridoio di 2 m per 2,6) né ai piedi di una scala; davanti a una vetrina solo la merce della
//      bottega stessa, entro 1,2 m; niente appeso sopra una porta del piano terra (le cose fatte per le aperture a parte);
//   3. nessuna compenetrazione in pianta: fra i pezzi a terra degli scorci, coi mezzi in sosta, coi pezzi grandi, con l'arredo della scena
//      (bidoni, cassonetti, tavolini, fioriere), con le vie vive (edicole, fermate, plance, stalli), coi pali della rete; a muro con le
//      mensole, i contatori e i bracci dei lampioni della rete;
//   4. niente nella striscia della cucitura (la Vittoria, la Piazza Grande, la spianata) finché quel filone non arriva;
//   5. il costo: fuso per stato e materiale, ogni scorcio sta nel suo budget di chiamate di disegno e di triangoli;
//   6. gli stati per ora (la serranda giù di notte, le luci la sera, i tavoli impilati) e gli agganci per la gente (i posti nuovi).
// node src/test_scorci.js   (dalla cartella v7)
const path = require('path'), src = __dirname;
global.World = require(path.join(src, 'world_cittanuova.js')); global.Interior = require(path.join(src, 'interiors.js')); global.Game = require(path.join(src, 'game.js'));
global.Chiarezza = require(path.join(src, 'chiarezza.js')); global.Vievive = require(path.join(src, 'vievive.js'));
global.Scena = require(path.join(src, 'scena.js'));
const SC = require(path.join(src, 'scorci.js')); global.Scorci = SC;
const Rete = require(path.join(src, 'rete.js')), G = Game, W = World, TS = G.TS, T = G.T;
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };
const t0 = Date.now(), L = SC.tutti(); console.log(`scorci ${L.length} in ${Date.now() - t0} ms`);
L.forEach(s => console.log(`  ${s.id.padEnd(20)} ${(s.b ? (s.b.name || s.b.id) : (s.set ? 'scenografia ' + s.set.k : '-')).padEnd(26)} ${s.fr ? s.fr.f : '-'}  focale ${s.focale.k} ${s.focale.x.toFixed(1)},${s.focale.z.toFixed(1)}  pezzi ${s.cose.length} mezzi ${s.mezzi.length} posti ${s.posti.length}${s.scarti.length ? '  (lasciati: ' + s.scarti.length + ')' : ''}`));

// ---------------- 1. quanti, dove, il punto focale ----------------
ok(L.length >= 10, `almeno dieci scorci composti (${L.length} su ${SC.RICETTE.length} ricette)`);
const luoghi = new Set(L.map(s => s.R.luogo).filter(Boolean)); ok(luoghi.size >= 6, `sui luoghi-missione: ${[...luoghi].join(', ')}`);
ok(L.every(s => s.focale && isFinite(s.focale.x) && isFinite(s.focale.z) && s.cose.some(c => c.k === s.R.focale)), 'ogni scorcio ha il suo punto focale, e il pezzo che gli dà il nome c\'è');
ok(L.every(s => s.cose.every(c => Math.hypot(c.x - s.focale.x, c.z - s.focale.z) < SC.CFG.raggio + 4)), `tutto lo scorcio sta attorno al suo fuoco (entro ${SC.CFG.raggio + 4} m)`);
ok(new Set(L.filter(s => s.bi >= 0).map(s => s.bi)).size === L.filter(s => s.bi >= 0).length, 'uno scorcio per edificio');
ok(L.every(s => !s.fr || s.fr.f === 'S' || s.fr.f === 'E'), 'solo fronti che la camera vede (S, E)');

// ---------------- 2. porte, scale, vetrine ----------------
const terra = []; L.forEach(s => s.cose.forEach(c => { if (!c.muro && c.k !== 'soglia') terra.push({ s, c }); }));
const angoli = (x, z, yaw, hw, hd) => { const C = Math.cos(yaw), S = Math.sin(yaw); return [[0, 0], [1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => [x + a * hw * C + b * hd * S, z - a * hw * S + b * hd * C]); };
const viol = { porta: [], scala: [], vetrina: [] };
terra.forEach(({ s, c }) => { angoli(c.x, c.z, c.yaw, (c.w || .5) / 2 * .97, (c.d || .5) / 2 * .97).forEach(([x, z]) => { const v = SC.vietato(x, z, s.b, !!c.propria); if (v) viol[v].push(`${s.id}:${c.k}`); }); });
L.forEach(s => s.mezzi.forEach(m => angoli(m.x, m.z, m.yaw, m.L / 2, m.W / 2).forEach(([x, z]) => { const v = SC.vietato(x, z, null, false); if (v) viol[v].push(`${s.id}:mezzo ${m.modello}`); })));
const uniq = a => [...new Set(a)];
ok(!viol.porta.length, `niente nel corridoio di una porta (2 m × 2,6) ${uniq(viol.porta).join(' ')}`);
ok(!viol.scala.length, `niente ai piedi di una scala ${uniq(viol.scala).join(' ')}`);
ok(!viol.vetrina.length, `davanti a una vetrina solo la merce della bottega, entro 1,2 m ${uniq(viol.vetrina).join(' ')}`);
const propria = terra.filter(q => q.c.propria); ok(propria.every(q => q.c.v <= SC.CFG.vetrina.propria + .01), `la merce fuori sta nella fascia di 1,2 m davanti alla vetrina (${propria.length} pezzi)`);
// a muro: sotto i 2,3 m niente sopra una porta (le cose fatte per le aperture, la serranda e la soglia, a parte)
const PER_APERTURE = new Set(['serranda', 'griglia', 'vetrofania', 'pannello_forato', 'zoccolo', 'soglia', 'manifesti']);
let sullaPorta = []; L.forEach(s => { if (!s.fr) return; s.cose.forEach(c => { if (!c.muro || PER_APERTURE.has(c.k) || c.filo || (c.y || 0) >= 2.3) return; s.fr.ap.filter(a => a.tipo === 'porta' || a.tipo === 'portone').forEach(a => { if (Math.abs(c.u - a.u) < (c.w || .5) / 2 + a.w / 2) sullaPorta.push(`${s.id}:${c.k}`); }); }); });
ok(!sullaPorta.length, `niente appeso sopra una porta ${sullaPorta.join(' ')}`);
// la soglia sta davanti alla porta della bottega, non altrove
ok(L.every(s => s.cose.filter(c => c.k === 'soglia').every(c => s.fr.ap.some(a => a.tipo === 'porta' && Math.abs(a.u - c.u) < .05))), 'la soglia consumata sta sulla porta della bottega');

// ---------------- 3. le compenetrazioni in pianta ----------------
const ob = (x, z, yaw, hw, hd, k) => SC.obb(x, z, yaw, hw, hd, k);
const pezziT = terra.map(({ s, c }) => Object.assign(ob(c.x, c.z, c.yaw, (c.w || .5) / 2, (c.d || .5) / 2, c.k), { s: s.id }));
L.forEach(s => s.mezzi.forEach(m => pezziT.push(Object.assign(ob(m.x, m.z, m.yaw, m.L / 2, m.W / 2, 'mezzo:' + m.modello), { s: s.id }))));
let urti = []; for (let i = 0; i < pezziT.length; i++) for (let j = i + 1; j < pezziT.length; j++) { const p = SC.sat(pezziT[i], pezziT[j]); if (p > .03) urti.push(`${pezziT[i].s}:${pezziT[i].k}×${pezziT[j].s}:${pezziT[j].k}`); }
ok(!urti.length, `nessun pezzo a terra ne compenetra un altro (${pezziT.length} pezzi e mezzi) ${urti.slice(0, 6).join(' ')}`);
// contro quello che c'è già: i pezzi grandi, la scena (bidoni, cassonetti, dehors), le vie vive, la rete
Scena.init(G); const PI0 = Scena.piano(); Rete.init(G, Scena); const RG = Rete.grafo ? Rete.grafo() : null;
const altri = [];
(W.pezzi || []).forEach(p => { const o = p.opz || {}, r = p.tipo === 'pozzo' ? (o.r || .8) + .2 : p.tipo === 'fontana' ? (o.r || 1.8) : p.tipo === 'lavatoio' ? (o.L || 4) / 2 : p.tipo === 'bitta' ? .3 : p.tipo === 'grata_vapore' ? 1 : null; if (r) altri.push(ob(p.x, p.y, 0, r, r, 'pezzo:' + p.tipo)); });
PI0.bidoni.forEach(q => altri.push(ob(q.x, q.z, q.yaw, .3, .3, 'bidone'))); PI0.cassonetti.forEach(q => altri.push(ob(q.x, q.z, q.yaw, .8, .45, 'cassonetto')));
PI0.dehors.forEach(d => { d.tavoli.forEach(t => altri.push(ob(t.x, t.z, 0, .8, .8, 'tavolino'))); d.fioriere.forEach(f => altri.push(ob(f.x, f.z, 0, .4, .4, 'fioriera'))); if (d.lavagna) altri.push(ob(d.lavagna.x, d.lavagna.z, 0, .3, .3, 'lavagna')); if (d.frigo) altri.push(ob(d.frigo.x, d.frigo.z, 0, .6, .35, 'frigo')); });
Vievive.edicole().forEach(e => altri.push(ob(e.kx, e.ky, e.kang, 1.25, 1.1, 'edicola'))); Vievive.fermate().forEach(f => altri.push(ob(f.x, f.y, f.dir || 0, 1.8, .9, 'fermata'))); Vievive.plance().forEach(p => altri.push(ob(p.x, p.y, p.ang || 0, 1.1, .3, 'plancia'))); Vievive.stalli().forEach(q => altri.push(ob(q.x, q.y, q.ang || 0, 2.4, 1, 'stallo')));
const nodi = RG ? RG.nodi : []; nodi.filter(n => n.k === 'lampione' && n.modello !== 'braccio').forEach(n => altri.push(ob(n.x, n.z, 0, .3, .3, 'palo')));
nodi.filter(n => n.k === 'cabina').forEach(n => altri.push(ob(n.x, n.z, n.yaw || 0, .8, .5, 'cabina_enel')));
let urtiAltri = []; pezziT.forEach(p => altri.forEach(o => { if (SC.sat(p, o) > .03) urtiAltri.push(`${p.s}:${p.k}×${o.k}`); }));
ok(!urtiAltri.length, `nessun pezzo a terra entra nell'arredo che c'era (${altri.length} cose: pezzi grandi, bidoni, cassonetti, dehors, edicole, fermate, stalli, pali) ${uniq(urtiAltri).slice(0, 8).join(' ')}`);
// a muro: le cose della rete sullo stesso muro (mensole a 3,4 m, contatori a 2,5, bracci dei lampioni a 3,9) non toccano i pezzi dello scorcio
const ALTO = { mensola: [3.25, 3.6], contatore: [2.25, 2.75], lampione: [3.4, 4.2] };
let urtiMuro = []; L.forEach(s => { if (!s.fr) return; nodi.filter(n => n.bi === s.bi && n.f === s.fr.f && ALTO[n.k] && n.u !== undefined).forEach(n => { const [y0, y1] = ALTO[n.k];
  s.cose.forEach(c => { if (!c.muro || c.filo) return; const cy0 = c.y || 0, cy1 = cy0 + (c.h || .5); if (cy1 < y0 || cy0 > y1) return; if (Math.abs(c.u - n.u) < (c.w || .5) / 2 + .2) urtiMuro.push(`${s.id}:${c.k}×${n.k}@${n.u.toFixed(1)}`); }); }); });
ok(!urtiMuro.length, `a muro, niente sopra le mensole, i contatori e i bracci della rete ${urtiMuro.join(' ')}`);
// il resto della scena tace sulle pareti degli scorci (le pagine segnate: niente bidoni, cassonetti, targhe, civici, dehors posati lì)
const pag = Scena.pagine().filter(p => p.scorcio); ok(pag.length >= L.filter(s => s.fr).length - 2 && pag.every(p => !p.presi.dom.length && !p.presi.sec.length), `le pareti degli scorci tacciono per gli altri sistemi (${pag.length} pagine)`);
const vicini = [].concat(PI0.bidoni, PI0.cassonetti, PI0.targhe, PI0.civici).filter(q => SC.riservato(q.x, q.z, 0));
ok(!vicini.length, `niente bidoni, cassonetti, targhe o civici dentro uno scorcio (${vicini.length})`);

// ---------------- 4. la cucitura ----------------
ok(L.every(s => !SC.cucitura(s.focale.x, s.focale.z) && s.cose.every(c => !SC.cucitura(c.x, c.z))), 'niente nella striscia della Vittoria, sulla Piazza Grande e oltre la Passeggiata finché la cucitura non arriva');

// ---------------- 5. il costo, con la grafica vera (three.js in Node: il kit, la posa, la fusione per stato e materiale) ----------------
global.THREE = require(path.join(src, 'three.min.js')); global.Arredo3D = require(path.join(src, 'arredo3d.js'));
const { ScorciArte } = require(path.join(src, 'scorci_arte.js'));
const scene = new THREE.Scene(), api = { scene, G, groundH: () => 0, sporge: .05 };
let costi = [], fuori = [];
L.forEach(s => { const q = ScorciArte.posa(s, api); costi.push([s.id, q.conto.draws, Math.round(q.conto.tri)]); if (q.conto.draws > SC.CFG.budget.draws || q.conto.tri > SC.CFG.budget.tri) fuori.push(s.id); });
console.log('  costo (chiamate di disegno, triangoli): ' + costi.map(c => `${c[0]} ${c[1]}/${c[2]}`).join(' · '));
const tot = costi.reduce((a, c) => [a[0] + c[1], a[1] + c[2]], [0, 0]);
ok(!fuori.length, `ogni scorcio nel budget (≤ ${SC.CFG.budget.draws} chiamate, ≤ ${SC.CFG.budget.tri / 1000}k triangoli, con tutti gli stati) ${fuori.join(' ')}; in tutto ${tot[0]} chiamate, ${Math.round(tot[1] / 1000)}k triangoli`);
ok(costi.every(c => c[1] >= 3), 'ogni scorcio è fuso per materiale (poche mesh), non pezzo per pezzo');

// ---------------- 6. gli stati e la gente ----------------
const conSerranda = L.filter(s => s.cose.some(c => c.k === 'serranda'));
ok(conSerranda.every(s => SC.gruppi(s, 2).serranda_chiusa && (s.R.ore.chiuso || !SC.gruppi(s, 10.5).serranda_chiusa)), `le serrande: giù di notte, su di giorno (la bottega chiusa sempre giù) (${conSerranda.length})`);
ok(L.filter(s => s.R.ore && s.R.ore.mezza).every(s => SC.gruppi(s, (Array.isArray(s.R.ore.mezza[0]) ? s.R.ore.mezza[0][0] : s.R.ore.mezza[0]) + .2).serranda_mezza), 'a mezzogiorno la serranda a metà');
ok(L.every(s => SC.gruppi(s, 21.5).luci === SC.inOre(s.R.ore.luci, 21.5)) && L.some(s => SC.gruppi(s, 21.5).luci), 'le luci la sera');
const gino = L.find(s => s.id === 'pozzo_gino'); ok(!gino || (SC.gruppi(gino, 17).tavoli && SC.gruppi(gino, 3).impilati), 'il tavolino della scopa: le sedie fuori di giorno, impilate la notte');
const P = SC.posti(); const tipi = new Set(P.map(p => p.k)); ok(['carte', 'comari', 'telefono', 'gioco'].every(k => tipi.has(k)), `gli agganci per la gente: ${[...tipi].join(', ')}`);
ok(P.every(p => G.walkT(Math.floor(p.x / TS), Math.floor(p.y / TS))), 'i posti degli scorci stanno dove si cammina');
ok(SC.SCENE.every(s => s.posto && SC.TIPI_POSTI[s.posto]), 'le scene nuove (la scopa, le comari, la rincorsa) hanno i loro posti');
const M = L.reduce((a, s) => a.concat(s.mezzi), []); ok(M.length >= 3 && M.some(m => m.modello === 'f500' || m.modello === 'f126') && M.some(m => m.modello === 'ape'), `i mezzi in sosta degli scorci: ${M.map(m => m.modello).join(', ')}`);
ok(M.every(m => { const t = G.tileAt(Math.floor(m.x / TS), Math.floor(m.z / TS)); return t !== T.BLD && t !== T.WATER; }), 'i mezzi stanno su suolo aperto');
console.log(fail ? `\n${fail} prove fallite` : '\ntutte le prove passate'); process.exit(fail ? 1 : 0);
