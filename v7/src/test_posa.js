// [posa] prova dei pezzi urbani grandi posati nella città nuova (W.pezzi di world_cittanuova.js, i modelli di pezzi_citta.js):
//   1. ci sono tutti i pezzi del filone (chiesa, campanile, portici, torre, tettoia, stazione, binari, sottopasso, passaggio a livello, carro,
//      locomotiva, magazzini, scalinate, bitte, darsena, molo, scalo, Rocca, mura, Porta di Terra, archi, edicole, pozzo, fontana, lavatoio,
//      Muro del Garante, pali dei riflettori), ognuno con la sua quota;
//   2. ogni pezzo sta sul suolo giusto: le caselle che ha riservato sono del tipo detto (BLD sotto i volumi, PIAZZA, WALK, QUAY...);
//   3. nessuna casa del tassellatore dentro un pezzo (le scatole delle mesh vere, girate e posate, contro le caselle delle case);
//   4. nessun pezzo in mare tranne le opere a mare;
//   5. i vicoli con gli archi, i sottopassi e le scalinate restano percorribili da un capo all'altro; si scende dalla Via della Stazione
//      agli scogli passando sotto il rilevato; sotto i portici si cammina.
// cd v7/src && node test_posa.js
const path = require('path');
global.THREE = require(path.join(__dirname, 'three.min.js'));
const PC = require(path.join(__dirname, 'pezzi_citta.js'));
const log = console.log, warn = console.warn; console.log = () => {}; console.warn = () => {};
const W = require(path.join(__dirname, 'world_cittanuova.js'));
console.log = log; console.warn = warn;
const T = W.T, TS = W.TS, GW = W.GW, GH = W.GH, P = W.pezzi || [];
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };
const cell = (x, y) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); return tx < 0 || ty < 0 || tx >= GW || ty >= GH ? -1 : ty * GW + tx; };
const wpos = (p, lx, lz) => { const c = Math.cos(p.rot), s = Math.sin(p.rot); return [p.x + lx * c + lz * s, p.y - lx * s + lz * c]; };
const conta = {}; P.forEach(p => { conta[p.tipo] = (conta[p.tipo] || 0) + 1; });
console.log('pezzi', P.length, JSON.stringify(conta));

// 1) tutti i pezzi del filone, con una quota vera
const VOLUTI = { facciata_chiesa: 1, campanile: 1, portico: 6, torre_littoria: 1, tettoia_mercato: 1, stazione: 1, binari: 1, sottopasso: 1, passaggio_livello: 1, carro_merci: 1, locomotiva: 1,
  magazzini_volta: 1, scalinata: 3, bitta: 3, darsena: 2, molo_vecchio: 1, scalo_alaggio: 1, bastione: 1, fossato: 1, torrione: 1, caserma: 1, polveriera: 1, porta_monumentale: 2,
  mastio: 1, corpo_rocca: 6, ponte_arco: 1, porta_acqua: 1, scogliera: 10,   // [rocca2] il castello a mare
  torre_acqua: 1, gru_porto: 1, grata_vapore: 1,   // [mappa_compatta] i segni nuovi della città compatta
  porta_terra: 1, arco_sottopasso: 2, arco_contrasto: 3, edicola_votiva: 3, pozzo: 1, fontana: 1, lavatoio: 1, muro_garante: 1, palo_riflettori: 3 };
const manca = Object.keys(VOLUTI).filter(t => (conta[t] || 0) < VOLUTI[t]);
ok(!manca.length, 'ci sono tutti i pezzi del filone' + (manca.length ? ' (mancano: ' + manca.map(t => t + ' ' + (conta[t] || 0) + '/' + VOLUTI[t]).join(', ') + ')' : ''));
ok(P.every(p => PC.TIPI.includes(p.tipo)), 'ogni tipo esiste nella libreria');
ok(P.every(p => Number.isFinite(p.q) && Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.rot)), 'ogni pezzo ha posizione, rotazione e quota');
const scal = P.filter(p => p.tipo === 'scalinata' && p.vicolo);
ok(scal.length >= 2 && P.some(p => p.tipo === 'scalinata' && !p.vicolo), `tre scalinate: ${scal.length} dalla marina al borgo e quella della stazione`);

// 2) il suolo riservato è del tipo giusto
const KT = { B: T.BLD, P: T.PIAZZA, W: T.WALK, Q: T.QUAY, F: T.FOUNT, G: T.GRAVEL, C: T.COB };
let suoliNo = [];
const dentroR = (p, r, wx, wy) => { const c = Math.cos(p.rot), s = Math.sin(p.rot), dx = wx - p.x, dy = wy - p.y, l = dx * c - dy * s, z = dx * s + dy * c; return l >= r[1] && l <= r[2] && z >= r[3] && z <= r[4]; };
P.forEach(p => (p.imp || []).forEach(([k, x0, x1, z0, z1], ri) => { let n = 0, g = 0; const dopo = p.imp.slice(ri + 1);
  const seen = new Set(); for (let lx = x0 + .25; lx < x1; lx += .5) for (let lz = z0 + .25; lz < z1; lz += .5) { const i = cell(...wpos(p, lx, lz)); if (i < 0 || seen.has(i) || W.roadW[i] > 0 || (W.grid[i] === T.WATER && k !== 'Q')) continue; seen.add(i);
    const tx = i % GW, ty = (i / GW) | 0, c = Math.cos(p.rot), s = Math.sin(p.rot), dx = tx * TS + 1 - p.x, dy = ty * TS + 1 - p.y, cl = dx * c - dy * s, cz = dx * s + dy * c; if (cl < x0 || cl > x1 || cz < z0 || cz > z1 || dopo.some(r => dentroR(p, r, tx * TS + 1, ty * TS + 1))) continue;   // come il generatore: conta la casella se il suo centro sta dentro (e una riserva successiva non la ridice)
    n++; if (W.grid[i] === KT[k] || (k === 'B' && W.bIndex[i] >= 0 && W.BUILDINGS[W.bIndex[i]].pezzo)) g++; }
  if (n && g / n < .8) { let c = ''; if (process.env.V) { const inv = {}; for (const q in T) inv[T[q]] = q; const h = {}; for (let lx = x0 + .5; lx < x1; lx += 1) for (let lz = z0 + .5; lz < z1; lz += 1) { const i = cell(...wpos(p, lx, lz)); if (i < 0 || W.roadW[i] > 0) continue; const kk = inv[W.grid[i]] + (W.bIndex[i] >= 0 ? '#' + W.BUILDINGS[W.bIndex[i]].id : ''); h[kk] = (h[kk] || 0) + 1; } c = ' ' + JSON.stringify(h); }
    suoliNo.push(p.tipo + '@' + Math.round(p.x) + ',' + Math.round(p.y) + ' ' + k + ' ' + Math.round(100 * g / n) + '%' + c); } }));
ok(!suoliNo.length, 'ogni pezzo sta sul suolo che ha riservato' + (suoliNo.length ? ': ' + suoliNo.slice(0, 6).join(' · ') : ''));
// i volumi chiusi si urtano: sotto la chiesa, la torre, la stazione, le caserme ci sono caselle BLD
const pieni = ['torre_littoria', 'stazione', 'magazzini_volta', 'porta_terra', 'arco_sottopasso', 'caserma', 'polveriera', 'torrione', 'campanile'];
const vuoti = P.filter(p => pieni.includes(p.tipo)).filter(p => { const i = cell(...wpos(p, p.tipo === 'torrione' ? 8.2 : p.tipo === 'arco_sottopasso' ? .8 : 2, 0)); if (process.env.V && (i < 0 || W.grid[i] !== T.BLD)) console.log('   vuoto', p.tipo, p.x.toFixed(1), p.y.toFixed(1), p.rot.toFixed(2), wpos(p, .8, 0).map(v => v.toFixed(1)), W.grid[i], W.roadW[i]); return i < 0 || W.grid[i] !== T.BLD; });
ok(!vuoti.length, 'sotto i volumi chiusi le caselle si urtano (BLD)' + (vuoti.length ? ': ' + vuoti.map(p => p.tipo).join(', ') : ''));

// 3) nessuna casa del tassellatore dentro un pezzo: le scatole delle mesh vere (posate e girate) contro le caselle delle case
const houseAt = (x, y) => { const i = cell(x, y); if (i < 0) return null; const bi = W.bIndex[i]; if (bi < 0) return null; const b = W.BUILDINGS[bi]; return b.pezzo ? null : b; };
const _b = new THREE.Box3(), dentro = [];
P.forEach(p => {
  if (p.tipo === 'bitta') return;
  const g = PC.make(p.tipo, Object.assign({}, p.opz, { lod: 'basso' })), root = new THREE.Group(); root.position.set(p.x, p.q, p.y); root.rotation.y = p.rot; root.add(g); root.updateMatrixWorld(true);
  const tol = p.tipo === 'arco_contrasto' ? 1.1 : p.tipo === 'edicola_votiva' ? .5 : .35;   // le spalle dell'arco di contrasto sono fette dei muri delle case
  let hit = null;
  // un punto è dentro una casa se lo è anche spostandolo di tol nelle quattro direzioni (il contatto sul muro comune non conta)
  const casaDentro = (x, z, y0, y1) => { const b = houseAt(x, z); if (!b || [[tol, 0], [-tol, 0], [0, tol], [0, -tol]].some(([a, c]) => houseAt(x + a, z + c) !== b)) return null; const top = (b.base || 0) + (b.fl || 1) * 3 + 1; return y0 < top - .2 && y1 > (b.base || 0) + .2 ? b : null; };
  const _v = new THREE.Vector3(), _w = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  g.traverse(o => { if (hit || !o.isMesh) return; _b.setFromObject(o, true); const ex = _b.max.x - _b.min.x, ez = _b.max.z - _b.min.z; if (ex < .05 && ez < .05) return;
    if (ex * ez < .5) {   // le parti minute: la loro scatola
      for (let x = _b.min.x; x <= _b.max.x + 1e-6 && !hit; x += .5) for (let z = _b.min.z; z <= _b.max.z + 1e-6 && !hit; z += .5) { const b = casaDentro(Math.min(x, _b.max.x), Math.min(z, _b.max.z), _b.min.y, _b.max.y); if (b) hit = b.id + ' (' + (o.material && o.material.name) + ')' + (process.env.V ? ' ' + [x, z].map(Math.round) + ' casa ' + [b.x * TS, b.y * TS, (b.x + b.w) * TS, (b.y + b.h) * TS] : ''); }
      return; }
    // le parti grandi (muri, basolati, tetti): i loro triangoli, punto per punto (le scatole di un ottagono o di un muro girato mentono)
    const pos = o.geometry.attributes.position, idx = o.geometry.index, n = idx ? idx.count : pos.count;
    for (let t = 0; t < n && !hit; t += 3) { for (let k = 0; k < 3; k++) _w[k].fromBufferAttribute(pos, idx ? idx.getX(t + k) : t + k).applyMatrix4(o.matrixWorld);
      const y0 = Math.min(_w[0].y, _w[1].y, _w[2].y), y1 = Math.max(_w[0].y, _w[1].y, _w[2].y);
      for (const [a, c] of [[1 / 3, 1 / 3], [.8, .1], [.1, .8], [.1, .1], [.45, .45], [.45, .1], [.1, .45]]) { _v.set(0, 0, 0).addScaledVector(_w[0], 1 - a - c).addScaledVector(_w[1], a).addScaledVector(_w[2], c);
        const b = casaDentro(_v.x, _v.z, y0, y1); if (b) { hit = b.id + ' (' + (o.material && o.material.name) + ')' + (process.env.V ? ' ' + [_v.x, _v.y, _v.z].map(v => v.toFixed(1)) + ' casa ' + [b.x * TS, b.y * TS, (b.x + b.w) * TS, (b.y + b.h) * TS] + ' base ' + (b.base || 0).toFixed(1) : ''); break; } } } });
  if (hit) dentro.push(p.tipo + '@' + Math.round(p.x) + ',' + Math.round(p.y) + '→' + hit);
});
ok(!dentro.length, 'nessuna casa del tassellatore dentro un pezzo' + (dentro.length ? ` (${dentro.length}): ` + dentro.slice(0, process.env.V ? 99 : 8).join(' · ') : ''));

// 4) in mare solo le opere a mare
const ACQUA = ['darsena', 'molo_vecchio', 'scalo_alaggio', 'bitta', 'scogliera', 'ponte_arco', 'porta_acqua', 'fossato'];   // [rocca2] il frangiflutti, la darsena e il canale della Rocca
const bagnati = P.filter(p => !ACQUA.includes(p.tipo)).filter(p => { const i = cell(p.x, p.y), r = (p.imp || []).flatMap(([k, x0, x1, z0, z1]) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1], [(x0 + x1) / 2, (z0 + z1) / 2]]);
  return (i >= 0 && W.grid[i] === T.WATER && W.zone[i] === W.Z.MARE) || r.filter(([a, b]) => { const j = cell(...wpos(p, a, b)); return j >= 0 && W.grid[j] === T.WATER && W.zone[j] === W.Z.MARE; }).length > 2; });
ok(!bagnati.length, 'nessun pezzo in mare tranne le opere a mare' + (bagnati.length ? ': ' + bagnati.map(p => p.tipo + '@' + Math.round(p.x) + ',' + Math.round(p.y)).join(', ') : ''));
ok(P.filter(p => p.tipo === 'darsena').every(p => { const i = cell(...wpos(p, 16, 0)); return i >= 0 && W.grid[i] === T.WATER; }) && P.filter(p => p.tipo === 'molo_vecchio').every(p => [4, 12, 20].every(lx => { const i = cell(...wpos(p, lx, 0)); return i >= 0 && W.grid[i] === T.QUAY; })),
  'la darsena ha l\'acqua dentro, il molo ha il piano di banchina sotto');

// 5) percorribilità: i vicoli con gli archi e le scalinate, la discesa al sottopasso, il portico
const walk = i => { const v = W.grid[i]; return i >= 0 && v !== T.BLD && v !== T.WATER && v !== T.FOUNT && v !== T.CLIFF && v !== T.TREE; };
const reach = (a, b, lim) => { const s = cell(...a), e = cell(...b); if (!walk(s) || !walk(e)) return false; const seen = new Set([s]), q = [s]; let h = 0;
  while (h < q.length && q.length < (lim || 40000)) { const i = q[h++]; if (i === e) return true; const tx = i % GW, ty = (i / GW) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = (ty + dy) * GW + tx + dx; if (!seen.has(j) && walk(j)) { seen.add(j); q.push(j); } } } return seen.has(e); };
const rdOf = id => W.roads.find(r => r.id === id);
const bloccati = [];
P.filter(p => p.vicolo).forEach(p => { const rd = rdOf(p.vicolo); if (!rd) return; const a = rd.pts[0], b = rd.pts[rd.pts.length - 1];
  // sotto il pezzo la strada resta strada
  let sotto = 0; for (const lz of [-3, -1.5, 0, 1.5, 3]) { const lx = p.tipo === 'arco_sottopasso' ? 3.7 : p.tipo === 'arco_contrasto' ? 2.2 : 1.5; const i = cell(...wpos(p, p.tipo === 'scalinata' ? lz + 4 : lx, p.tipo === 'scalinata' ? 0 : lz)); if (i >= 0 && !walk(i)) sotto++; }
  if (sotto || !reach(a, b)) bloccati.push(p.tipo + ' ' + rd.name); });
ok(!bloccati.length, `i vicoli con archi, sottopassi e scalinate restano percorribili (${P.filter(p => p.vicolo).length})` + (bloccati.length ? ': ' + bloccati.join(', ') : ''));
const cav = rdOf('cavour_sotto'); ok(!!cav && reach(cav.pts[0], cav.pts[cav.pts.length - 1]), 'dalla Via della Stazione si scende agli scogli passando sotto il rilevato');
const vit = rdOf('vittoria'), sp = P.filter(p => p.tipo === 'portico'); let sottoPort = 0, portOk = 0;
sp.forEach(p => { const L = p.opz.campate * p.opz.campata; for (let lx = 1; lx < L - 1; lx += 2) { const i = cell(...wpos(p, lx, 0)); sottoPort++; if (walk(i)) portOk++; } });
ok(sottoPort > 0 && portOk / sottoPort > .95, `sotto i portici si cammina (${portOk}/${sottoPort} caselle) e la Vittoria corre fra le arcate`);
ok(!!vit && reach([vit.pts[0][0] + 2, vit.pts[0][1]], [vit.pts[vit.pts.length - 1][0] - 2, vit.pts[0][1]]), 'la Vittoria si percorre tutta, dal Mercato al Muro');
const F = W.FORT; ok(!!F && reach([F.x - 30, F.y], [F.x + 12, F.y], 80000), 'dalla spianata si entra nella Rocca dal ponte e dalla porta');
// le quote: niente pezzi sospesi (la base non sta più di 0,6 m sopra il terreno attorno all'origine)
const sosp = P.filter(p => !ACQUA.includes(p.tipo) && !['locomotiva', 'carro_merci', 'fossato', 'porta_monumentale'].includes(p.tipo)).filter(p => { const i = cell(p.x, p.y); return i >= 0 && p.q > W.elev[i] + .9; });
ok(!sosp.length, 'nessun pezzo sospeso sopra il terreno' + (sosp.length ? ': ' + sosp.map(p => p.tipo + ' q' + p.q + ' terra ' + W.elev[cell(p.x, p.y)].toFixed(2)).slice(0, 6).join(', ') : ''));
console.log(fail ? `\n${fail} prove non passate` : '\ntutte le prove passano');
process.exit(fail ? 1 : 0);
