// [camera7] le misure sui registri (vecchio e nuovo) e i provini a confronto
const fs = require('fs'), path = require('path'), { provino } = require('./lib'); const OUT = __dirname, DT = 1 / 15;
const POSTI = ['spawn', 'vicolo', 'sbocco', 'lungomare', 'piazza', 'mira', 'ShiftW', 'muro', 'salto'];
const leggi = (m, p) => { try { return JSON.parse(fs.readFileSync(path.join(OUT, `log_${m}_${p}.json`))); } catch (e) { return null; } };
const med = a => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[b.length >> 1] : NaN; };
function misura(L) {
  const av = L.map(s => s.davanti === 999 || s.davanti === 'orizzonte' ? 999 : s.davanti);
  // i cambi d'inquadratura: episodi in cui pendenza, distanza, campo o yaw si muovono da soli (senza il giocatore), separati da 0,3 s di calma
  let ep = 0, on = false, calma = 99;
  for (let i = 1; i < L.length; i++) { const a = L[i - 1], b = L[i], dyaw = Math.abs(Math.atan2(Math.sin(b.yaw - a.yaw), Math.cos(b.yaw - a.yaw)));
    const muove = !b.mano && (Math.abs(b.pitch - a.pitch) / DT > 3 || Math.abs(b.dist - a.dist) / DT > .8 || Math.abs(b.fov - a.fov) / DT > 2 || dyaw * 57.3 / DT > 8);
    if (muove) { if (!on && calma >= .3) ep++; on = true; calma = 0; } else { on = false; calma += DT; } }
  const sulPosto = L.filter(s => s.spd > .5 && s.dsp < .3 * s.spd).length;
  return { n: L.length, sec: +(L.length * DT).toFixed(1), davantiMed: med(av), davantiMin: Math.min(...av), cambiMin: +(ep / (L.length * DT / 60)).toFixed(1), sulPosto, taglioFot: L.filter(s => s.taglio > 0).length, taglioMax: Math.max(0, ...L.map(s => s.taglio || 0)),
    dentro: L.filter(s => s.dentro !== null && s.dentro > .2).length, vicino: L.filter(s => s.near > 1).length, nearMax: Math.max(...L.map(s => s.near)), pitchMed: med(L.map(s => s.pitch)), camHMed: med(L.map(s => s.camH)), spdMax: Math.max(...L.map(s => s.dsp)), jzMax: Math.max(...L.map(s => s.jz)), cose: Math.max(0, ...L.map(s => s.cose || 0)), braccioMin: Math.min(...L.map(s => s.arm === null ? 99 : s.arm)) };
}
const R = {}; for (const p of POSTI) for (const m of ['vecchio', 'nuovo']) { const d = leggi(m, p); if (d) (R[p] = R[p] || {})[m] = misura(d.log); }
console.log(JSON.stringify(R, null, 1)); fs.writeFileSync(path.join(OUT, 'misure7.json'), JSON.stringify(R, null, 1));
const DEST = process.argv[2]; if (DEST) { fs.mkdirSync(DEST, { recursive: true });
  for (const p of ['spawn', 'vicolo', 'sbocco', 'lungomare', 'piazza', 'mira']) { const F = []; let per = 1;
    for (const m of ['vecchio', 'nuovo']) { const d = leggi(m, p); if (!d) continue; per = Math.max(per, d.fotos.length);
      d.fotos.forEach(([t, s], i) => F.push([path.join(OUT, 'f', `${m}_${p}_${String(i).padStart(2, '0')}.jpg`), `${m} ${t}s ${s.pitch}° h${s.camH} av${s.davanti}m${s.taglio ? ' tagli' + s.taglio : ''}`])); }
    if (F.length) provino(F, path.join(DEST, `filmstrip_${p}.jpg`), `[camera7] ${p}: sopra la camera di prima (main 163679f), sotto la vista unica (variante C)`, per, 320, 180); } }
