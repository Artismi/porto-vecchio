/* Porto Vecchio — [spianata2] IL PALCO DEL POTERE: la spianata davanti alla Rocca e la piazza d'armi dentro (solo nella città nuova).
   «Un campo largo e vuoto con poche cose disegnate»: il posto di blocco, le torri, i pali dei riflettori, i carri, i container e
   l'eliporto non si spargono per probabilità attorno a un punto (com'era il poligono della mappa vecchia), si impaginano qui una volta
   sola sui dati del mondo (il Muro, la Rocca, gli edifici, le caselle) e render.js e models.js li disegnano dove dice il piano:
   - i CARRI in fila nel parco mezzi a sud dell'asse della Porta, tutti col muso verso la strada, a passo fisso;
   - i CONTAINER in fila contro il Muro, a sud del varco, allineati al Muro (il deposito del posto di guardia);
   - l'ELIPORTO al centro della corte nord, la sua piazzola libera; l'ANTENNA radio controventata nell'angolo della corte, lontana
     dalla piazzola e dall'asse (prima stava sulla piazzola e da lontano era una sbarra rossa storta);
   - le VIE libere: l'asse della Vittoria che passa la Porta e la pista di pattuglia lungo la seconda rete restano vuote;
   - le COSE A TERRA (Chiarezza.SCENE_A_TERRA) solo dove una scena le giustifica, a mucchietti: al piede del Muro, attorno ai due
     posti di blocco, ai capi della fila dei container, accanto ai carri. Nel resto del palco niente cartacce;
   - i SEGNI del suolo: le tracce dei cingoli e delle gomme (la pista di pattuglia, l'inversione davanti al varco, le manovre dei
     carri) e le canalette di scolo con le griglie.
   Nessuna grafica: gira anche in Node (test_chiarezza.js). Coordinate in metri, x est, z sud. */
var Palco = (function () {
  'use strict';
  const CARRO = { hx: 3.1, hz: 3.3, passo: 7.2, n: 3 };   // m: la mezza sagoma di un carro (il modello è largo 6,2 m e lungo 6,5) e il passo della fila
  const CONT = { hx: 1.2, hz: 3, passo: 6.6, n: 3, dalMuro: 4.2 };   // container da 6 m, il fianco a 3 m dal Muro (le torri ci stanno davanti)
  const PAD = 6, ANT = { h: 16, r: 3.6 };   // la piazzola (mezzo lato libero) e l'antenna (altezza, raggio dei tiranti)
  const MUCCHI = { recinto: 24, max: 14 };   // un mucchietto ogni ~24 m al piede del Muro; al massimo tanti in tutto
  const hash = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + (s || 0) * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  let CACHE = null;
  // W: il mondo (World della città nuova: WALL, FORT, pezzi); B: gli edifici; tile(tx, ty): il tipo della casella; T: i tipi; TS: metri per casella
  function piano(W, B, tile, T, TS) {
    if (CACHE && CACHE.W === W) return CACHE.P;
    const P = calcola(W, B, tile, T, TS); CACHE = { W, P }; return P;
  }
  function calcola(W, B, tile, T, TS) {
    const WL = W && W.WALL, F = W && W.FORT; if (!WL || !F || !F.x || !F.ditch) return null;
    const ty = (x, z) => tile(Math.floor(x / TS), Math.floor(z / TS));
    const duro = v => v === T.BLD || v === T.WATER || v === T.FOUNT || v === T.TREE || v === T.STAIRS || v === T.CLIFF || v === undefined;
    // un rettangolo (mezzi lati hx, hz) tutto su suolo aperto; via: true ammette la strada sotto
    const libero = (x, z, hx, hz, via) => { for (let a = -hx; a <= hx + .01; a += Math.min(1, hx)) for (let b = -hz; b <= hz + .01; b += Math.min(1, hz)) { const v = ty(x + a, z + b); if (duro(v) || (!via && v === T.VIA)) return false; } return true; };
    const x0 = WL.x - 25, x1 = (F.tip || F.x + 80) + 6, z0 = WL.y0, z1 = WL.y1, gy = F.y;
    const zona = (x, z) => x >= x0 && x <= x1 && z >= z0 && z <= z1;
    const dentro = (x, z) => x > F.x + .5 && x <= x1 && z >= z0 && z <= z1;   // la piazza d'armi, oltre la Porta
    const occ = [];   // le sagome posate (per non sovrapporle)
    const sovr = (x, z, hx, hz) => occ.some(o => Math.abs(o.x - x) < o.hx + hx + .6 && Math.abs(o.z - z) < o.hz + hz + .6);
    const posa = (x, z, hx, hz, k) => { occ.push({ x, z, hx, hz, k }); };
    // l'asse: le caselle di strada della Vittoria che passano la Porta, da tenere libere (con 1,5 m di rispetto)
    const asse = { z0: gy - 6, z1: gy + 6 }; { let a = gy, b = gy; for (let z = gy; z > gy - 12 && ty(F.x + 14, z) === T.VIA; z -= .5) a = z; for (let z = gy; z < gy + 12 && ty(F.x + 14, z) === T.VIA; z += .5) b = z; asse.z0 = a - 1.5; asse.z1 = b + 1.5; }
    // [mappa_compatta] la piazza d'armi della Rocca a mare è lastricata (PIAZZA, non VIA): se la Vittoria non passa la Porta, l'asse è il fornice
    // della porta_monumentale (la luce del portale e 1,5 m di rispetto per parte)
    if (ty(F.x + 14, gy) !== T.VIA) { const pm = F.porta || (W.pezzi || []).find(p => p.tipo === 'porta_monumentale' && p.rocca === 'spianata'); if (pm) { const lw = (pm.opz && pm.opz.fornice) || 4.2; asse.z0 = gy - lw / 2 - 1.5; asse.z1 = gy + lw / 2 + 1.5; asse.porta = true; } }
    // 1) l'ELIPORTO: al centro della corte nord (fra la Porta e il comando, sopra l'asse); si cerca il posto più vicino al centro voluto
    const cerca = (cx, cz, ok, passo, R) => { for (let r = 0; r <= R; r += passo) for (let k = 0; k < Math.max(1, Math.round(r * 2)); k++) { const a = k / Math.max(1, Math.round(r * 2)) * Math.PI * 2, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r; if (ok(x, z)) return { x, z }; } return null; };
    const eliporto = cerca(F.x + 27, asse.z0 - PAD - .5, (x, z) => dentro(x, z) && libero(x, z, PAD, PAD) && z + PAD < asse.z0, 1, 16);
    if (eliporto) posa(eliporto.x, eliporto.z, PAD, PAD, 'eliporto');
    // 2) l'ANTENNA: nell'angolo nord-ovest della corte (contro la cortina, lontano dalla camera che guarda da sud-est), ≥ 9 m dalla piazzola
    const antenna = cerca(F.x + 13, asse.z0 - ANT.r - 6, (x, z) => dentro(x, z) && libero(x, z, ANT.r, ANT.r) && z + ANT.r < asse.z0 && !sovr(x, z, ANT.r, ANT.r) && (!eliporto || Math.hypot(x - eliporto.x, z - eliporto.z) > PAD + ANT.r + 2), 1, asse.porta ? 30 : 14);   // [mappa_compatta] nella Rocca a mare si cerca in tutta la corte
    if (antenna) { antenna.h = ANT.h; antenna.r = ANT.r; posa(antenna.x, antenna.z, ANT.r, ANT.r, 'antenna'); }
    // 3) i CARRI: in fila nel parco mezzi a sud dell'asse, muso a nord verso la strada (rot π), a passo fisso; la fila si sposta in blocco
    let carri = [];
    for (let dz = 0; dz <= 6 && !carri.length; dz += 1) for (let dx = 0; dx <= 16 && !carri.length; dx += 2) {
      const z = asse.z1 + 3 + CARRO.hz + dz, xs = []; for (let i = 0; i < CARRO.n; i++) xs.push(F.x + 12 + dx + i * CARRO.passo);
      if (xs.every(x => dentro(x, z) && libero(x, z, CARRO.hx, CARRO.hz) && !sovr(x, z, CARRO.hx, CARRO.hz))) carri = xs.map(x => ({ x, z, rot: Math.PI })); }
    // [rocca2] nella Rocca a mare la piazza d'armi è piccola (a sud dell'asse c'è la darsena): il parco mezzi va sulla spianata, a sud
    // dell'asse fra la città e il Muro, coi carri in fila a passo fisso
    for (let dz = 0; dz <= 16 && !carri.length; dz += 1) for (let dx = 0; dx <= 6 && !carri.length; dx += 1) {
      const z = asse.z1 + 3 + CARRO.hz + dz, xs = []; for (let i = 0; i < CARRO.n; i++) xs.push(WL.x - 21 + dx + i * CARRO.passo);
      if (xs.every(x => zona(x, z) && x + CARRO.hx < WL.x - .5 && libero(x, z, CARRO.hx, CARRO.hz) && !sovr(x, z, CARRO.hx, CARRO.hz))) carri = xs.map(x => ({ x, z, rot: Math.PI })); }
    carri.forEach(c => posa(c.x, c.z, CARRO.hx, CARRO.hz, 'carro'));
    // 4) i CONTAINER: contro il Muro, a sud del varco, il lato lungo parallelo al Muro, lontano dalle torri
    const torri = (WL.towers || []).map(([x, z]) => ({ x: x + 1.6, z }));
    let container = [];
    for (let s = 0; s <= 16 && !container.length; s += 1) {
      const x = WL.x + CONT.dalMuro, zs = []; for (let i = 0; i < CONT.n; i++) zs.push(WL.gate[1] + 4 + CONT.hz + s + i * CONT.passo);
      if (zs.every(z => libero(x, z, CONT.hx, CONT.hz) && !torri.some(t => Math.abs(t.z - z) < CONT.hz + 1.6 && Math.abs(t.x - x) < CONT.hx + 1.5) && !sovr(x, z, CONT.hx, CONT.hz))) container = zs.map((z, i) => ({ x, z, rot: 0, col: ['#5a6a4a', '#4a5a6a', '#5a6a4a'][i % 3] })); }
    container.forEach(c => posa(c.x, c.z, CONT.hx, CONT.hz, 'container'));
    // 5) le COSE A TERRA, a mucchietti, solo nelle scene: (x, z, scena, n pezzi, raggio)
    const mucchi = [], mucchio = (x, z, scena, n, r) => { if (mucchi.length >= MUCCHI.max || !libero(x, z, .6, .6) || sovr(x, z, r, r) || mucchi.some(m => Math.hypot(m.x - x, m.z - z) < 6)) return; mucchi.push({ x, z, scena, n, r }); };
    { const xm = WL.x + 2.9; for (let z = z0 + 8; z < z1 - 8; z += MUCCHI.recinto) { const zz = z + (hash(Math.round(z), 3, 771) - .5) * 8;   // il piede del Muro dalla parte della spianata
        if (zz > WL.gate[0] - 6 && zz < WL.gate[1] + 6) continue; if (torri.some(t => Math.abs(t.z - zz) < 3)) continue; if (hash(Math.round(z), 5, 772) < .35) continue; mucchio(xm, zz, 'recinto', 4, 1.1); } }
    mucchio(WL.x + 6.5, WL.gate[0] - 4.5, 'posto_blocco', 6, 1.4);   // accanto alla garitta del varco
    { const mg = (W.pezzi || []).find(p => p.tipo === 'muro_garante'); if (mg) { const L = (mg.opz && mg.opz.L) || 24; mucchio(mg.x + 3.2, mg.y + 2.5, 'posto_blocco', 5, 1.2); mucchio(mg.x + 3.2, mg.y + L - 2.5, 'posto_blocco', 5, 1.2); } }
    if (container.length) { const c0 = container[0], c1 = container[container.length - 1]; mucchio(c1.x + .4, c1.z + CONT.hz + 2.4, 'container', 5, 1.2); mucchio(c0.x + CONT.hx + 1.8, c0.z - 1, 'container', 3, .9); }
    if (carri.length) { const c = carri[carri.length - 1]; mucchio(c.x + CARRO.hx + 1.8, c.z + 1, 'parco_mezzi', 4, 1); }
    // 6) le TRACCE: linee di mezzeria di un mezzo (le due ruote le disegna render.js a ±0,9 m)
    const tracce = [], arco = (cx, cz, r, a0, a1, n) => { const L = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; L.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); } return L; };
    { const xp = WL.x + 11.2;   // la pista di pattuglia lungo la seconda rete (dentro), fino al varco
      tracce.push({ k: 'gomme', pts: [[xp, z0 + 6], [xp + .3, WL.gate[0] - 3]] }, { k: 'gomme', pts: [[xp, WL.gate[1] + 3], [xp - .2, z1 - 6]] }); }
    if (container.length) { const c0 = container[0], c1 = container[container.length - 1], xl = c0.x + CONT.hx + 3.1;   // il camion dei container: esce dall'asse e accosta lungo la fila
      tracce.push({ k: 'gomme', pts: [[xl + 4.5, asse.z1 - 2.5], [xl + 2, asse.z1 + 1]].concat(arco(xl + 4, asse.z1 + 4.2, 4, Math.PI * 1.22, Math.PI, 5)).concat([[xl, c1.z + CONT.hz]]) }); }
    carri.forEach((c, i) => tracce.push({ k: 'cingoli', pts: [[c.x - 5 + i, asse.z1 - 2], [c.x - 1.5, asse.z1 + 1.5], [c.x, c.z - CARRO.hz + .4]] }));   // in retromarcia al posto
    // 7) le CANALETTE di scolo: lungo il bordo sud dell'asse nella piazza d'armi e lungo il Muro dalla parte della città
    const canalette = [[F.x + 9, asse.z1 + .6, F.x + 9 + Math.max(20, CARRO.n * CARRO.passo + 16), asse.z1 + .6], [WL.x - 1.2, z0 + 10, WL.x - 1.2, WL.gate[0] - 3], [WL.x - 1.2, WL.gate[1] + 3, WL.x - 1.2, z1 - 10]];
    return { zona, dentro, asse, eliporto, antenna, carri, container, mucchi, tracce, canalette, x0, x1, CARRO, CONT };
  }
  return { piano, CARRO, CONT, PAD, ANT, hash };
})();
if (typeof module !== 'undefined') module.exports = Palco;
