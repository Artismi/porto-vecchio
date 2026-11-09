// [muri_vuoto] I MURI CHE CONTINUANO A VUOTO, misurati sui dati del mondo (world_cittanuova.js, in node: pochi secondi). Il direttore
// artistico, al Vico del Glacis verso l'arco: «il muro che continua a vuoto sulla destra oltre la casa, un metro di muro senza nulla dietro».
// La causa: le case di [pianta] (i lotti arretrati o stretti dai pezzi grandi: cx, cy, lw, ld) hanno lati che non sono multipli del modulo
// del kit (2 m). buildModular (render.js) posava i moduli della facciata casella per casella, k = 0 … ceil(n) − 1 su n = lw / 2 frazionario:
// l'ultimo modulo (muro, zoccolo, fascia, parapetto del lastrico) andava oltre lo spigolo della casa fino a 1,95 m, una lastra di muro sottile
// col nucleo scuro e il tetto che finiscono prima. Qui, per ogni casa e ogni lato:
//   sfora     quanto il filo dei moduli va oltre lo spigolo vero della scatola (m), da che parte, a che altezza
//   a_vuoto   la parte di quella lastra che dietro (dal lato della casa, a 30 cm) non ha nessun volume: né un'altra casa (alla sua altezza),
//             né un pezzo pieno (le caselle BLD dei pezzi, il sottopasso); i metri e i m² di muro «di carta»
// E per completezza le altre famiglie del difetto (stessi dati di strumenti/muri_vaganti.js): la cortina dei portici senza casa dietro, i
// monconi di muro isolati (≤ 2 m senza niente a cui attaccarsi), i muri dentro una casa.
// La regola nuova (render.js, buildModular, [muri_vuoto]): sui lati frazionari i moduli interi restano dove erano (le finestre, le porte,
// b.__win e i graffiti non si muovono) e l'avanzo diventa un modulo di muro pieno stretto quanto manca allo spigolo: nessun modulo oltre
// la scatola. Con PV_MURI_VUOTO=vecchio si misura la regola di prima (per il prima/dopo).
//   node strumenti/muri_vuoto.js [uscita.json]
const path = require('path'), fs = require('fs');
const log = console.log, warn = console.warn; console.log = () => {}; console.warn = () => {};
global.World = require(process.env.PV_MONDO ? path.resolve(process.env.PV_MONDO) : path.join(__dirname, '..', 'src', 'world_cittanuova.js'));
console.log = log; console.warn = warn;
const W = World, T = W.T, TS = W.TS, GW = W.GW, GH = W.GH, G = W.grid, B = W.BUILDINGS, VECCHIO = process.env.PV_MURI_VUOTO === 'vecchio';
const out = path.resolve(process.argv[2] || path.join(__dirname, '..', 'reports', 'muri_vuoto.json'));
const MG = 3.6, MF = 2.4, CORNICE = [1202, 230, 1630, 472], inC = (x, y) => x >= CORNICE[0] && x <= CORNICE[2] && y >= CORNICE[1] && y <= CORNICE[3];
const tile = (x, y) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); return tx < 0 || ty < 0 || tx >= GW || ty >= GH ? -1 : ty * GW + tx; };
// la vista di render.js (BLD(), vistaLotto): la casa coi lati veri del lotto, in caselle frazionarie; rotOf: girano solo le case senza insegna
const lotto = b => b.cx !== undefined && !b.__tierOf && !(b.tiers && b.tiers.length) && (Math.abs(b.cx - (b.x + b.w / 2) * TS) > .01 || Math.abs(b.cy - (b.y + b.h / 2) * TS) > .01 || Math.abs(b.lw - b.w * TS) > .01 || Math.abs(b.ld - b.h * TS) > .01);
const rotOf = b => b && b.rot && !b.sign && !b.shop ? b.rot : 0;
const scat = b => lotto(b) ? { x0: b.cx - b.lw / 2, z0: b.cy - b.ld / 2, w: b.lw, d: b.ld, cx: b.cx, cz: b.cy, a: rotOf(b) } : { x0: b.x * TS, z0: b.y * TS, w: b.w * TS, d: b.h * TS, cx: (b.x + b.w / 2) * TS, cz: (b.y + b.h / 2) * TS, a: rotOf(b) };
const giro = (s, x, z) => { if (!s.a) return [x, z]; const c = Math.cos(s.a), n = Math.sin(s.a), dx = x - s.cx, dz = z - s.cz; return [s.cx + dx * c - dz * n, s.cz + dx * n + dz * c]; };
const SC = B.map(scat), ALTO = B.map(b => (b.base || 0) + MG + (Math.max(1, b.fl || 1) - 1) * MF);
// dentro una casa (la scatola vera, girata), con margine m; l'altezza del suo muro
const BH = new Map(); B.forEach((b, i) => { const s = SC[i], r = Math.hypot(s.w, s.d) / 2 + 1; for (let gx = Math.floor((s.cx - r) / 8); gx <= Math.floor((s.cx + r) / 8); gx++) for (let gz = Math.floor((s.cz - r) / 8); gz <= Math.floor((s.cz + r) / 8); gz++) { const k = gx * 8192 + gz; if (!BH.has(k)) BH.set(k, []); BH.get(k).push(i); } });
const casaIn = (x, z, m, salta) => { for (const i of BH.get(Math.floor(x / 8) * 8192 + Math.floor(z / 8)) || []) { if (i === salta) continue; const s = SC[i], c = Math.cos(-s.a), n = Math.sin(-s.a), dx = x - s.cx, dz = z - s.cz, u = dx * c - dz * n, v = dx * n + dz * c; if (Math.abs(u) < s.w / 2 - m && Math.abs(v) < s.d / 2 - m) return i; } return -1; };
// i pezzi pieni: le caselle BLD che non sono di una casa (o sono di un pezzo), e le impronte misurate dei pezzi con la casa dentro
const FP = { arco_sottopasso: [0, 7.4, -4.5, 4.5], caserma: null };
const PZ = (W.pezzi || []).filter(p => FP[p.tipo]).map(p => { const [a0, a1, c0, c1] = FP[p.tipo]; return { p, a0, a1, c0, c1 }; });
const pezzoIn = (x, z) => { for (const q of PZ) { const p = q.p, c = Math.cos(p.rot || 0), s = Math.sin(p.rot || 0), dx = x - p.x, dz = z - p.y, u = dx * c - dz * s, v = dx * s + dz * c; if (u > q.a0 && u < q.a1 && v > q.c0 && v < q.c1) return true; }
  const t = tile(x, z); if (t < 0 || G[t] !== T.BLD) return false; const k = W.bIndex[t]; return k < 0 || (B[k] && B[k].pezzo); };
// il filo dei moduli di buildModular su un lato: [u0, u1] coperti (u lungo il lato dal suo inizio), per piano
function moduli(n, wide, f) {
  if (!VECCHIO) return [0, n * TS];   // [muri_vuoto] l'avanzo è un modulo stretto fino allo spigolo
  if (f === 0 || !wide) return [0, Math.ceil(n - 1e-9) * TS];
  let k = 0, u1 = 0; if (n % 2 === 1) { k = 1; u1 = TS; } for (; k + 1 < n; k += 2) u1 = (k + 2) * TS; return [0, u1];
}
const CASI = [], conto = { case: 0, lotti: 0, frazionari: 0, lati: 0, sfora: 0, a_vuoto: 0, metri_vuoto: 0, m2_vuoto: 0, citta: { lati: 0, metri: 0 } };
B.forEach((b, i) => {
  if (b.pezzo || b.lighthouse || b.kiosk || b.shack || b.id === 'rocca' || b.deco || b.church) return; conto.case++;
  if (!lotto(b)) return; conto.lotti++;
  const s = SC[i], nW = s.w / TS, nH = s.d / TS; if (Math.abs(nW - Math.round(nW)) < .01 && Math.abs(nH - Math.round(nH)) < .01) return; conto.frazionari++;
  const fl = Math.max(1, b.fl || 1), hgt = MG + (fl - 1) * MF, y0 = b.base || 0;
  // i lati come in buildModular: punto di partenza, direzione, normale verso fuori
  const LATI = [
    { f: 'S', n: nW, p: [s.x0, s.z0 + s.d], u: [1, 0], N: [0, 1] }, { f: 'N', n: nW, p: [s.x0 + s.w, s.z0], u: [-1, 0], N: [0, -1] },
    { f: 'E', n: nH, p: [s.x0 + s.w, s.z0 + s.d], u: [0, -1], N: [1, 0] }, { f: 'W', n: nH, p: [s.x0, s.z0], u: [0, 1], N: [-1, 0] }];
  LATI.forEach(L => {
    if (Math.abs(L.n - Math.round(L.n)) < .01) return; conto.lati++;
    const Lm = L.n * TS; let amax = 0, mv = 0, m2 = 0, pts = [];
    for (let f = 0; f < fl; f++) { const [, u1] = moduli(L.n, true, f), o = u1 - Lm; if (o <= .02) continue; amax = Math.max(amax, o);
      const ya = y0 + (f === 0 ? 0 : MG + (f - 1) * MF), yb = y0 + (f === 0 ? MG : MG + f * MF);
      for (let u = Lm + .05; u < u1; u += .1) { const px = L.p[0] + L.u[0] * u, pz = L.p[1] + L.u[1] * u, bx = px - L.N[0] * .3, bz = pz - L.N[1] * .3, [wx, wz] = giro(s, bx, bz);
        const k = casaIn(wx, wz, .05, i), dietro = (k >= 0 && ALTO[k] >= yb - .3) || pezzoIn(wx, wz);
        if (!dietro) { m2 += .1 * (yb - ya); if (f === 0) { mv += .1; pts.push(giro(s, px, pz)); } } } }
    if (amax <= .02) return; conto.sfora++;
    if (mv < .25) return; conto.a_vuoto++; conto.metri_vuoto += mv; conto.m2_vuoto += m2;
    const q = pts[Math.floor(pts.length / 2)], [ax, az] = giro(s, L.p[0] + L.u[0] * Lm, L.p[1] + L.u[1] * Lm), Nw = s.a ? [L.N[0] * Math.cos(s.a) - L.N[1] * Math.sin(s.a), L.N[0] * Math.sin(s.a) + L.N[1] * Math.cos(s.a)] : L.N, Uw = s.a ? [L.u[0] * Math.cos(s.a) - L.u[1] * Math.sin(s.a), L.u[0] * Math.sin(s.a) + L.u[1] * Math.cos(s.a)] : L.u;
    if (inC(q[0], q[1])) { conto.citta.lati++; conto.citta.metri += mv; }
    CASI.push({ id: b.id, nome: b.name || b.label || '', lato: L.f, era: b.era || '', piani: fl, lw: +s.w.toFixed(2), ld: +s.d.toFixed(2), arretrata: b.arretrata || 0, sfora: +amax.toFixed(2), a_vuoto: +mv.toFixed(2), m2: +m2.toFixed(1),
      x: +q[0].toFixed(2), y: +q[1].toFixed(2), spigolo: [+ax.toFixed(2), +az.toFixed(2)], N: Nw.map(v => +v.toFixed(3)), U: Uw.map(v => +v.toFixed(3)), alto: +(y0 + hgt).toFixed(1), base: +y0.toFixed(2), citta: inC(q[0], q[1]) });
  });
});
CASI.sort((a, b) => b.m2 - a.m2);
conto.metri_vuoto = +conto.metri_vuoto.toFixed(1); conto.m2_vuoto = +conto.m2_vuoto.toFixed(0); conto.citta.metri = +conto.citta.metri.toFixed(1);
// le altre famiglie (la stessa misura di muri_vaganti.js, se c'è il suo rapporto fresco)
let vag = null; try { vag = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'reports', 'muri_vaganti.json'), 'utf8')).tab; } catch (e) { }
log('MURI A VUOTO' + (VECCHIO ? ' (regola vecchia)' : ''), '· case', conto.case, '· lotti di [pianta]', conto.lotti, '· con un lato frazionario', conto.frazionari, '· lati frazionari', conto.lati);
log('lati coi moduli oltre lo spigolo', conto.sfora, '· di cui a vuoto (≥ 25 cm senza niente dietro)', conto.a_vuoto, '·', conto.metri_vuoto, 'm al piano terra,', conto.m2_vuoto, 'm² di muro di carta · in città', conto.citta.lati, 'lati,', conto.citta.metri, 'm');
CASI.slice(0, 20).forEach(c => log('  ', c.id.padEnd(12), c.lato, (c.nome || '').slice(0, 26).padEnd(26), 'sfora', c.sfora, 'a vuoto', c.a_vuoto, 'm', c.m2, 'm² ·', c.x, c.y));
if (vag) log('altre famiglie (muri_vaganti.json): fuori_casa', vag.fuori_casa && vag.fuori_casa.isola, '· moncone', vag.moncone && vag.moncone.isola, '· dentro_casa', vag.dentro_casa && vag.dentro_casa.isola);
fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, JSON.stringify({ quando: new Date().toISOString(), regola: VECCHIO ? 'vecchia' : 'nuova', conto, casi: CASI }, null, 1));
log('salvato', out);
// le tavole (strumenti/muri_vuoto_foto.js, strumenti/fogli_muri_vuoto.py): il posto del direttore artistico e i casi scelti fra i peggiori
// (della regola vecchia: PV_MURI_VUOTO=vecchio node strumenti/muri_vuoto.js out.json posti.json)
if (process.argv[3]) {
  const TAV = [['casa_473', 'N'], ['casa_99', 'N'], ['casa_191', 'E'], ['casa_415', 'N'], ['casa_378', 'E'], ['casa_140', 'E'], ['casa_255', 'E'], ['casa_264', 'E'], ['casa_142', 'N'], ['mare', 'E'], ['casa_279', 'E'], ['casa_442', 'N'], ['garante', 'E'], ['casa_192', 'W'], ['casa_469', 'W'], ['casa_70', 'E']];
  const P = [{ nome: 'glacis_vista', file: 'c00', x: 1473.83, y: 290.12, hx: .9989, hy: .0465, segni: [[1473.15, 292, 8.2]] }];
  TAV.forEach(([id, l], k) => { const c = CASI.find(q => q.id === id && q.lato === l); if (!c) return; const y = c.base + 1.5, ctl = [c.spigolo[0] - c.U[0] * .8, c.spigolo[1] - c.U[1] * .8];
    P.push({ nome: id + ' ' + l, file: 'c' + String(k + 1).padStart(2, '0'), caso: { Q: [c.x, c.y], N: c.N, U: c.U, S: c.spigolo }, segni: [[c.x, c.y, c.base + 1.8], [c.x, c.y, c.alto]],
      sonde: [[c.x + c.N[0], y, c.y + c.N[1], -c.N[0], 0, -c.N[1], 2.5], [ctl[0] + c.N[0], y, ctl[1] + c.N[1], -c.N[0], 0, -c.N[1], 2.5]], info: c }); });
  fs.writeFileSync(path.resolve(process.argv[3]), JSON.stringify(P, null, 1)); log('posti per le foto', P.length, process.argv[3]); }
