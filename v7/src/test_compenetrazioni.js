// [compenetrazioni2] la prova dei pezzi grandi contro i volumi delle case (ingombri.js), in Node e con la soglia a zero: nessun pezzo
// grande che si posa dai dati entra nella pianta di una casa (la pianta girata come la casa, per tutta l'altezza: un pezzo che ci entra la
// taglia a qualche quota). Il committente, davanti al distributore: «compenetrazione tra benzinaio e case».
//   1. il distributore: la pensilina, le isole delle pompe, il totem e le gomme nello spazio libero, a mezzo metro dai muri e dal chiosco,
//      sul suolo dei piazzali (non la carreggiata, l'acqua, le scale, il verde); la porta del chiosco sul lato della mappa;
//   2. le vie vive: le fermate (la pensilina a mezzo metro dai muri, la panchina col palo a 20 cm), le edicole, le plance delle affissioni e
//      le auto in sosta sugli stalli: nessuna dentro una casa;
//   3. fra loro: nessuna coppia di questi pezzi si compenetra.
// La stessa misura sul modello vero, con le tettoie, i dehors, i banchi e i pezzi degli scorci: node strumenti/compenetrazioni.js
// (GRANDI_ESIGI=1 esce con errore se un pezzo grande entra in una casa più di 10 cm).
// cd v7/src && node test_compenetrazioni.js [--seme=12345]
'use strict';
const path = require('path'), src = __dirname;
const sm = (process.argv.find(a => a.startsWith('--seme=')) || '').slice(7); if (sm) require(path.join(src, 'seme.js'))(+sm);
const log = console.log, warn = console.warn; console.log = () => {}; console.warn = () => {};
global.World = require(path.join(src, 'world_cittanuova.js')); global.Interior = require(path.join(src, 'interiors.js')); global.Game = require(path.join(src, 'game.js'));
global.Chiarezza = require(path.join(src, 'chiarezza.js')); global.Ingombri = require(path.join(src, 'ingombri.js')); global.Vievive = require(path.join(src, 'vievive.js'));
console.log = log; console.warn = warn;
const G = Game, IG = Ingombri, VV = Vievive, TS = G.TS;
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };
const f1 = v => Math.round(v * 10) / 10, dentro = (R, m, salta) => IG.casa(G, R, m || 0, salta);
const tutti = [];   // [nome, rettangolo] per le coppie

// ---------------- 1. il distributore ----------------
const BZ = G.BUILDINGS.filter(b => b.id === 'benzina');
ok(BZ.length === 1, `il distributore c'è (${BZ.length})`);
BZ.forEach(b => {
  const L = IG.distributore(G, b), x0 = b.x * TS, z0 = b.y * TS, chiosco = IG.rettAA(x0, z0, x0 + b.w * TS, z0 + b.h * TS);
  console.log(`  chiosco ${x0}-${x0 + b.w * TS} × ${z0}-${z0 + b.h * TS}; pensilina ${L.pensilina ? `sul lato ${L.lato}, ${f1(L.pensilina.x1 - L.pensilina.x0)} × ${f1(L.pensilina.z1 - L.pensilina.z0)} m` : 'nessuna'}; isole ${L.isole.length}, pompe ${L.pompe.length}, totem ${L.totem ? 'sì' : 'no'}, gomme ${L.gomme ? 'sì' : 'no'}; porta ${L.porta ? L.porta.f : '-'}`);
  ok(L.parti.length > 0 && L.pompe.length > 0, 'le pompe hanno il loro posto');
  L.parti.forEach(p => { const R = IG.rettAA(p.x0, p.z0, p.x1, p.z1), h = dentro(R, 0), hm = dentro(R, IG.MARGINE), suolo = IG.suolo(G, R, IG.piazzale(G));
    ok(!h, `${p.k}: fuori dalle case${h ? ` (dentro ${h.b.id} di ${f1(h.d)} m)` : ''}`);
    ok(!hm, `${p.k}: mezzo metro d'aria dai muri e dal chiosco${hm ? ` (${hm.b.id} a meno di ${IG.MARGINE} m)` : ''}`);
    ok(suolo, `${p.k}: sul suolo del piazzale`);
    tutti.push(['distributore:' + p.k, R, 'distributore']); });
  if (L.porta) { const dy = b.door[1], dx = b.door[0], lato = dy >= b.y + b.h ? 'S' : dy < b.y ? 'N' : dx < b.x ? 'W' : 'E'; ok(L.porta.f === lato, `la porta del chiosco sul lato della mappa (${L.porta.f})`); }
  void chiosco;
});

// ---------------- 2. le vie vive ----------------
ok(VV.attivo, 'le vie vive sono accese nella città nuova');
const rotV = (x, y, a, lu, lv, hu, hv) => { const ux = Math.cos(a), uy = Math.sin(a); return IG.rett(x + lu * ux - lv * uy, y + lu * uy + lv * ux, a, hu, hv); };
const conto = {};
const prova = (k, R, m) => { conto[k] = conto[k] || { n: 0, ko: [] }; conto[k].n++; const h = dentro(R, m); if (h) conto[k].ko.push(`${f1(R.cx)},${f1(R.cz)} in ${h.b.id} ${Math.round(h.d * 100)} cm`); tutti.push([k, R, k]); };
// la fermata: u lungo il cordolo = (sin ang, -cos ang), v verso la strada = (cos ang, sin ang) (il gruppo di vievive_arte.js)
VV.fermate().forEach(f => { const P = f.pensilina ? [.1, -.35, 1.75, .85] : [.3, -.15, 1.6, .7], a = Math.atan2(-Math.cos(f.dir), Math.sin(f.dir)); prova(f.pensilina ? 'pensilina della fermata' : 'panchina della fermata', rotV(f.x, f.y, a, P[0], P[1], P[2], P[3]), f.pensilina ? IG.MARGINE : 0); });
VV.edicole().forEach(q => prova('edicola', rotV(q.kx, q.ky, Math.atan2(-Math.cos(q.kang), Math.sin(q.kang)), .37, .2, 1.58, 1.0), 0));
VV.plance().forEach(q => prova('plancia', IG.rett(q.x, q.y, q.ang, 1.15, .08), 0));
VV.stalli().forEach(q => prova('auto in sosta', IG.rett(q.x, q.y, q.ang, 2.0, .85), 0));
Object.keys(conto).forEach(k => ok(!conto[k].ko.length, `${k}: ${conto[k].n}, nessuna dentro una casa${conto[k].ko.length ? ' (' + conto[k].ko.length + ': ' + conto[k].ko.slice(0, 4).join('; ') + ')' : ''}`));

// ---------------- 3. fra loro ----------------
const coppie = [];
for (let i = 0; i < tutti.length; i++) for (let j = i + 1; j < tutti.length; j++) { if (tutti[i][2] === tutti[j][2] && tutti[i][2] === 'distributore') continue; const d = IG.pen(tutti[i][1], tutti[j][1]); if (d > 0) coppie.push(`${tutti[i][0]}/${tutti[j][0]} a ${f1(tutti[i][1].cx)},${f1(tutti[i][1].cz)} ${Math.round(d * 100)} cm`); }
ok(!coppie.length, `i pezzi grandi non si compenetrano fra loro (${coppie.length}${coppie.length ? ': ' + coppie.slice(0, 4).join('; ') : ''})`);

console.log(fail ? `\n${fail} NO` : '\ntutto ok');
process.exit(fail ? 1 : 0);
