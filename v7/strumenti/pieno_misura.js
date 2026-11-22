// [pieno] LA MISURA DEL VUOTO: per ogni 10 m dei percorsi principali (W.percorsi: i dominanti e i secondari) quello che la camera vede a
// livello della strada (entro 9 m di lato dall'asse, sotto i 3,5 m sul suolo): arredo, insegne, graffiti e tag, manifesti, adesivi,
// serrande, tende, luci, minuterie; e i muri nudi: un punto di facciata ogni metro (il primo pieno della griglia a destra e a sinistra
// dell'asse, entro 9 m) è nudo se entro 1,2 m non c'è niente di tutto questo sotto i 3 m. I tratti nudi lunghi (≥ 6 m) per via.
//   node strumenti/pieno_misura.js <censimento.json> [--pieno]    (il censimento da strumenti/pieno_censimento.js)
//   --pieno: conta anche lo strato del pieno (Pieno.elenco() nel censimento); --senzalavori: senza i lavori dei writer non ancora piazzati
'use strict';
const fs = require('fs'), path = require('path');
const log = console.log; console.log = () => {}; console.warn = () => {};
const SV = require('./sonda_vita.js'); SV.carica(); require('../src/percorsi.js');
console.log = log;
const W = global.World, G = global.Game, TS = W.TS, GW = W.GW, GH = W.GH, T = W.T;
const C = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')), CONTA_PIENO = process.argv.includes('--pieno');
// le categorie
const CAT = k => {
  if (/^pieno:/.test(k)) { if (!CONTA_PIENO) return null; const s = k.slice(6); return /^(tag|throw|adesivo|manifesto|funebre|serranda|civico|colatura|cartello)/.test(s) ? 'p_' + s.replace(/[0-9]+$/, '').split('_')[0] : /^(gesso|mozzicone|macchia|vernice|terra)/.test(s) ? 'p_suolo' : 'p_cosa'; }
  if (/^(porta|vetrina|scala|gradino|portale|tombino|passerella|balcone|pluviale|citofono)$/.test(k)) return null;   // la casa stessa, non vita
  if (/^serranda/.test(k)) return 'serrande';
  if (/^(tenda|tettoia)/.test(k)) return 'tende';
  if (/^(insegna|tabellone|cartello|targa)/.test(k)) return 'insegne';
  if (/^(lampione|applique|festone)/.test(k)) return 'luci';
  if (/^(bucato)/.test(k)) return 'bucato';
  if (/^(arredo|ingombro|dehors|rete|scorcio|grande)/.test(k)) return 'arredo';
  return 'altro';
};
const WCAT = s => /^(tag|mtag|gotico)$/.test(s) ? 'tag' : /^(throw|estintore|stencil|scritta|bombing)$/.test(s) ? 'throw' : s === 'manifesto' ? 'manifesti' : s === 'adesivi' ? 'adesivi' : s === 'buff' ? 'toppe' : 'pezzi';
const items = [];
C.voci.forEach(v => { const c = CAT(v[0]); if (c) items.push({ c, x: v[1], z: v[3], y0: v[2], k: v[0] }); });
const SENZA_LAV = process.argv.includes('--senzalavori');   // i lavori dei writer non ancora sul muro (senza riquadro: si piazzano a gioco, vicino alla camera, a budget) non contano
C.lavori.forEach(w => { if (w[6] === 'player' || (SENZA_LAV && w[2] === -999)) return; items.push({ c: WCAT(w[0]), x: w[1], z: w[3], y0: w[2] === -999 ? -99 : w[2] - (w[5] || 0) / 2, k: w[0] }); });
(C.pieno || []).forEach(p => { const c = CAT('pieno:' + p[0]); if (c) items.push({ c, x: p[1], z: p[3], y0: p[2], k: p[0] }); });
// gli statici piccoli posati a terra (minuterie: bidoni, vasi, casse, sedie...), non le case né i pezzi grandi
C.statici.forEach(s => { const [nm, x, y0, z, sx, sy, sz] = s; if (Math.max(sx, sz) > 1.8 || sy > 3.2 || sy < .25 || nm === 'gradino') return; if (/casa|tetto|muro|strada|marciap|suolo|pav|terreno|costa|riva|acqua|albero|lecc|pino/i.test(nm)) return; items.push({ c: 'minuterie', x, z, y0, k: nm }); });   // i gradini sono la casa; le strisce lunghe e i piatti no
const CI = 8, idx = new Map(); items.forEach(q => { const k = Math.floor(q.x / CI) * 4096 + Math.floor(q.z / CI); (idx.get(k) || idx.set(k, []).get(k)).push(q); });
const vicini = (x, z, r) => { const out = []; for (let i = Math.floor((x - r) / CI); i <= Math.floor((x + r) / CI); i++) for (let j = Math.floor((z - r) / CI); j <= Math.floor((z + r) / CI); j++) for (const q of idx.get(i * 4096 + j) || []) if (Math.hypot(q.x - x, q.z - z) <= r) out.push(q); return out; };
const tile = (x, y) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); return tx < 0 || ty < 0 || tx >= GW || ty >= GH ? T.WATER : W.grid[ty * GW + tx]; };
const quota = (x, y) => { const q = G.quotaSuolo ? G.quotaSuolo(x, y) : null; if (q != null) return q; const tx = Math.floor(x / TS), ty = Math.floor(y / TS); return W.elev[ty * GW + tx] || 0; };
const CATS = ['arredo', 'minuterie', 'insegne', 'tag', 'throw', 'pezzi', 'manifesti', 'adesivi', 'serrande', 'tende', 'luci', 'bucato'].concat(CONTA_PIENO ? ['p_tag', 'p_throw', 'p_adesivo', 'p_manifesto', 'p_funebre', 'p_serranda', 'p_civico', 'p_colatura', 'p_suolo', 'p_cosa'] : []);
const R = { percorsi: [], tot: { metri: 0, muro: 0, nudo: 0, per: {} } }; CATS.forEach(c => R.tot.per[c] = 0);
const VUOTI = [];
W.percorsi.percorsi.forEach(p => {
  const P = p.pts; let L = 0; const S = [];   // campioni ogni metro: x, y, ux, uy
  for (let k = 1; k < P.length; k++) { const ax = P[k - 1][0], ay = P[k - 1][1], bx = P[k][0], by = P[k][1], l = Math.hypot(bx - ax, by - ay); if (l < 1e-6) continue; const ux = (bx - ax) / l, uy = (by - ay) / l;
    for (let s = (S.length ? (Math.ceil(L) - L) : 0); s < l; s += 1) S.push([ax + ux * s, ay + uy * s, ux, uy]); L += l; }
  const segs = []; for (let i = 0; i + 10 <= S.length; i += 10) segs.push(S.slice(i, i + 10));
  const per = {}; CATS.forEach(c => per[c] = 0); let muro = 0, nudo = 0, run = 0, run0 = null; const visti = new Set(), dens = [];
  const chiudi = q => { if (run >= 6) VUOTI.push({ via: p.nome, m: run, x: Math.round(run0[0]), y: Math.round(run0[1]) }); run = 0; run0 = null; };
  segs.forEach(sg => { let nSeg = 0, nVita = 0;
    sg.forEach(([x, y, ux, uy]) => { const g = quota(x, y);
      vicini(x, y, 9.5).forEach(q => { if (visti.has(q)) return; const dx = q.x - x, dz = q.z - y, lat = Math.abs(-dx * uy + dz * ux), lon = Math.abs(dx * ux + dz * uy); if (lat > 9 || lon > .5 || (q.y0 > -90 && q.y0 - g > 3.5)) return; visti.add(q); per[q.c]++; nSeg++; if (!/^(luci|arredo)$/.test(q.c)) nVita++; });
      for (const sd of [1, -1]) { const nx = -uy * sd, ny = ux * sd; let d = .5; for (; d <= 9; d += .25) if (tile(x + nx * d, y + ny * d) === T.BLD) break; if (d > 9) { if (sd === 1) chiudi(); continue; }
        const wx = x + nx * (d - .3), wy = y + ny * (d - .3); muro++; const pieno = vicini(wx, wy, 1.2).some(q => (q.y0 < -90 || q.y0 - g < 3) && !/^(luci|bucato)$/.test(q.c));
        if (!pieno) { nudo++; if (sd === 1) { if (!run) run0 = [wx, wy]; run++; } } else if (sd === 1) chiudi(); } });
    dens.push(nVita); });
  chiudi();
  const m = segs.length * 10; R.percorsi.push({ via: p.nome, k: p.k, metri: m, muro, nudo, per, ogni10: Object.fromEntries(CATS.map(c => [c, +(per[c] / Math.max(1, segs.length)).toFixed(2)])), vuoti10: dens.filter(n => n === 0).length, tratti10: dens.length });
  R.tot.metri += m; R.tot.muro += muro; R.tot.nudo += nudo; CATS.forEach(c => R.tot.per[c] += per[c]);
});
VUOTI.sort((a, b) => b.m - a.m);
R.vuoti = VUOTI.slice(0, 25);
const pad = (s, n) => String(s).padStart(n);
log('via'.padEnd(26) + pad('m', 5) + pad('nudo%', 7) + pad('10m vuoti', 10) + '  ' + CATS.map(c => pad(c.slice(0, 7), 8)).join(''));
R.percorsi.forEach(q => log(q.via.slice(0, 25).padEnd(26) + pad(q.metri, 5) + pad(Math.round(q.nudo / Math.max(1, q.muro) * 100), 7) + pad(q.vuoti10 + '/' + q.tratti10, 10) + '  ' + CATS.map(c => pad(q.ogni10[c], 8)).join('')));
const nS = R.tot.metri / 10; log('TUTTI'.padEnd(26) + pad(R.tot.metri, 5) + pad(Math.round(R.tot.nudo / R.tot.muro * 100), 7) + pad(R.percorsi.reduce((a, q) => a + q.vuoti10, 0) + '/' + nS, 10) + '  ' + CATS.map(c => pad((R.tot.per[c] / nS).toFixed(2), 8)).join(''));
log('\ni tratti di muro nudo più lunghi (lato destro del percorso):'); R.vuoti.slice(0, 15).forEach(v => log(`  ${pad(v.m, 3)} m  ${v.via} (${v.x}, ${v.y})`));
const out = process.argv.find(a => a.endsWith('.out.json')); if (out) fs.writeFileSync(out, JSON.stringify(R, null, 1));
