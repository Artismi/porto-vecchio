// [visuale4] IL CONTROLLO DEL LEVEL DESIGNER: quanto spesso e per quanto il personaggio resta coperto camminando sui percorsi principali
// della città compatta (W.percorsi: i dominanti e i secondari; a parte le scorciatoie), con la visuale di sempre e coi due prototipi.
//   node strumenti/copertura_visuale4.js [uscita.json]     (dalla cartella v7)
// Un campione ogni 0,5 m, camminando a 1,4 m/s. Il personaggio è COPERTO quando almeno due dei tre raggi del corpo (piedi, busto, testa)
// verso la camera entrano in un pieno: le case come scatole (i muri fino alla gronda, il tetto come un blocco fino a metà fra gronda e colmo,
// quanto vale il suo volume), le volte (portici, archi, sottopassi) sopra i 3-5 m.
//   - oggi: la pendenza di sempre (0,78), tutto pieno (ellisse e taglio a parte: qui si misura quanto lavoro fa il buco);
//   - A (camera): la pendenza della camera che si adatta, simulata camminando (Visuale.camPasso, con l'isteresi), e il tetto della casa
//     che copre sbiadito (non conta più); restano i muri e le volte, dove copre ancora la sagoma;
//   - B (muretto): le case sul lato camera dentro il raggio scendono a un metro (restano le volte e le case fuori dal raggio).
// Stampa la percentuale di lunghezza coperta per percorso, i tratti coperti più lunghi e i punti peggiori (con le case che coprono), da
// correggere nella mappa.
const path = require('path'), fs = require('fs'), src = path.join(__dirname, '..', 'src');
const log = console.log; console.log = () => {};
global.World = require(path.join(src, 'world_cittanuova.js'));
global.Percorsi = require(path.join(src, 'percorsi.js'));
console.log = log;
const V = require(path.join(src, 'visuale.js')), W = World, PC = Percorsi, TS = W.TS || 2, GW = W.GW, GH = W.GH;
const M = V.mappa(W), KC = Object.assign({}, V.CAMERA4), KM = V.MURETTO;
const YAW = Math.PI / 4, DIST = (44 * .4 / 2) / Math.tan(15 * Math.PI / 180), CDX = Math.sin(YAW), CDZ = Math.cos(YAW);
const camAt = (x, z, y, pitch, zoom) => { const d = DIST * (zoom || 1); return { x: x + CDX * Math.cos(pitch) * d, y: y + 1 + Math.sin(pitch) * d, z: z + CDZ * Math.cos(pitch) * d }; };
const quota = (x, z) => { const tx = Math.floor(x / TS), ty = Math.floor(z / TS); return tx < 0 || ty < 0 || tx >= GW || ty >= GH ? 0 : W.elev[ty * GW + tx]; };
const pieno = (x, z) => { const tx = Math.floor(x / TS), ty = Math.floor(z / TS); return tx >= 0 && ty >= 0 && tx < GW && ty < GH && W.grid[ty * GW + tx] === W.T.BLD; };
// le scatole: muri e tetto di ogni casa (della città compatta), le volte
const CITTA = b => b.x * TS > 1240 && b.x * TS < 1620 && b.y * TS > 255 && b.y * TS < 455;
const CASE = W.BUILDINGS.map((b, i) => ({ b, i, geo: { y0: b.base || 0 }, gr: M.gronda(b), co: M.colmo(b) })).filter(C => CITTA(C.b) && !C.b.pezzo).map(C => {
  const x0 = C.b.x * TS + .3, x1 = (C.b.x + C.b.w) * TS - .3, z0 = C.b.y * TS + .3, z1 = (C.b.y + C.b.h) * TS - .3;
  C.muri = { min: { x: x0, y: C.geo.y0, z: z0 }, max: { x: x1, y: C.gr, z: z1 } };
  C.tetto = { min: { x: x0 - .3, y: C.gr, z: z0 - .3 }, max: { x: x1 + .3, y: (C.gr + C.co) / 2 + .3, z: z1 + .3 } };
  C.box3 = { min: C.muri.min, max: { x: x1, y: C.gr + 2.5, z: z1 } };   // la scatola che usano Visuale.tetti e Visuale.muretto (come render.js)
  return C; });
const VOLTE = M.V.map(v => { const c = Math.cos(v.p.rot || 0), s = Math.sin(v.p.rot || 0), P = [[v.x0, v.z0], [v.x1, v.z0], [v.x0, v.z1], [v.x1, v.z1]].map(([l, m]) => [v.p.x + l * c + m * s, v.p.y - l * s + m * c]);
  return { min: { x: Math.min(...P.map(q => q[0])), y: v.y0, z: Math.min(...P.map(q => q[1])) }, max: { x: Math.max(...P.map(q => q[0])), y: v.y0 + 2.5, z: Math.max(...P.map(q => q[1])) }, volta: v.p.tipo }; });
const raggi = (x, z, fy, cam) => [.15, .95, 1.75].map(h => { const o = { x, y: fy + h, z }, dx = cam.x - x, dy = cam.y - o.y, dz = cam.z - z, l = Math.hypot(dx, dy, dz); return { o, d: { x: dx / l, y: dy / l, z: dz / l } }; });
const vicine = (x, z) => CASE.filter(C => C.muri.max.x > x - 30 && C.muri.min.x < x + 30 && C.muri.max.z > z - 30 && C.muri.min.z < z + 30);
// quanti raggi sono fermati, e da chi. tettiVia: Set delle case senza tetto (sbiadito); giu: Map delle case abbassate (casa -> quota)
function copre(x, z, fy, cam, tettiVia, giu) {
  const R = raggi(x, z, fy, cam), chi = new Set(); let n = 0; const vic = vicine(x, z);
  R.forEach(q => { let fermo = false;
    for (const C of vic) { const dentro = x > C.muri.min.x && x < C.muri.max.x && z > C.muri.min.z && z < C.muri.max.z; if (dentro) continue;   // nel portico della casa stessa: la volta conta, la casa no
      const top = giu && giu.has(C) ? giu.get(C) : null, mu = top !== null ? { min: C.muri.min, max: { x: C.muri.max.x, y: top, z: C.muri.max.z } } : C.muri;
      if (V.entra(q.o, q.d, mu) !== null || (top === null && !(tettiVia && tettiVia.has(C)) && V.entra(q.o, q.d, C.tetto) !== null)) { fermo = true; chi.add(C); } }
    for (const B of VOLTE) if (B.max.x > x - 30 && B.min.x < x + 30 && B.min.y > fy + 1.8 && V.entra(q.o, q.d, B) !== null) { fermo = true; chi.add(B); }
    if (fermo) n++; });
  return { coperto: n >= 2, chi };
}
// un percorso: la linea, campionata ogni 0,5 m (fuori dai pieni: la linea taglia gli spigoli)
function campioni(P) { const out = []; for (let k = 1; k < P.length; k++) { const [ax, az] = P[k - 1], [bx, bz] = P[k], l = Math.hypot(bx - ax, bz - az); for (let s = 0; s < l; s += .5) { const x = ax + (bx - ax) * s / l, z = az + (bz - az) * s / l; out.push([x, z, !pieno(x, z)]); } } return out; }
const D = PC.dati, PERC = D.percorsi.map(p => ({ id: p.id, nome: p.nome || p.id, k: p.k, pts: p.pts })).concat(D.scorciatoie.filter(s => s.k === 'scorciatoia').map(s => ({ id: s.vic, nome: (W.roads.find(r => r.id === s.vic) || {}).name || s.vic, k: 'scorciatoia', pts: s.pts })));
const RIS = [], TRATTI = [];
PERC.forEach(p => {
  const C = campioni(p.pts).filter(q => q[2]); if (C.length < 4) return;
  const S = {}, TS4 = new Map(), MU = new Map(), dt = .5 / 1.4; let n0 = 0, nA = 0, nB = 0, nStretta = 0;
  const run = { oggi: null, A: null }, chiudi = (k, i) => { const r = run[k]; if (!r) return; r.L = (i - r.i0) * .5; if (r.L >= 1.5) TRATTI.push(Object.assign(r, { k, perc: p.nome })); run[k] = null; };
  C.forEach(([x, z], i) => { const fy = quota(x, z);
    // oggi
    const c0 = copre(x, z, fy, camAt(x, z, fy, KC.base), null, null);
    // A: la camera simulata (misura e passo), i tetti che coprono sbiaditi (con l'isteresi di passo)
    V.camPasso(S, V.misura(M, x, z, fy, CDX, CDZ, KC), dt, KC, YAW); if (S.on) nStretta++;
    const camA = camAt(x, z, fy, S.p, S.z), vuole = V.tetti(x, z, fy, camA, CASE, V.TETTO4, false); V.passo(TS4, vuole, dt, V.TETTO4);
    const via = new Set(); TS4.forEach((s, Cc) => { if (V.sbiadito(s) > .5) via.add(Cc); });
    const cA = copre(x, z, fy, camA, via, null);
    // B: il muretto
    const camB = camAt(x, z, fy, KC.base), sel = V.muretto(x, z, fy, camB, KC.base, CASE, KM, false, MU); V.passo(MU, sel, dt, KM);
    const giu = new Map(); MU.forEach((s, Cc) => { if (s.a > .5) giu.set(Cc, s.y); });
    const cB = copre(x, z, fy, camB, null, giu);
    if (c0.coperto) n0++; if (cA.coperto) nA++; if (cB.coperto) nB++;
    [['oggi', c0], ['A', cA]].forEach(([k, c]) => { if (c.coperto) { const r = run[k] || (run[k] = { i0: i, x0: x, z0: z, chi: new Map() }); r.x1 = x; r.z1 = z; c.chi.forEach(Cc => r.chi.set(Cc, (r.chi.get(Cc) || 0) + 1)); } else chiudi(k, i); }); });
  ['oggi', 'A'].forEach(k => chiudi(k, C.length));
  const L = C.length * .5; RIS.push({ id: p.id, nome: p.nome, k: p.k, L, oggi: n0 / C.length, A: nA / C.length, B: nB / C.length, stretta: nStretta / C.length, cambi: S.cambi || 0 });
});
const pc = v => (v * 100).toFixed(1).padStart(5) + '%';
const somma = L => { const T = L.reduce((a, r) => a + r.L, 0); return { L: T, oggi: L.reduce((a, r) => a + r.oggi * r.L, 0) / T, A: L.reduce((a, r) => a + r.A * r.L, 0) / T, B: L.reduce((a, r) => a + r.B * r.L, 0) / T, stretta: L.reduce((a, r) => a + r.stretta * r.L, 0) / T }; };
console.log('percorso'.padEnd(30), 'tipo'.padEnd(12), 'metri', '  oggi ', '   A   ', '   B   ', 'stretta', 'cambi');
RIS.forEach(r => console.log(r.nome.slice(0, 29).padEnd(30), r.k.padEnd(12), r.L.toFixed(0).padStart(5), pc(r.oggi), pc(r.A), pc(r.B), pc(r.stretta), String(r.cambi).padStart(5)));
const PR = RIS.filter(r => r.k !== 'scorciatoia'), SC = RIS.filter(r => r.k === 'scorciatoia'), sP = somma(PR), sS = somma(SC);
console.log(`\nPERCORSI PRINCIPALI (${PR.length}, ${sP.L.toFixed(0)} m): coperto oggi ${pc(sP.oggi)}, con A ${pc(sP.A)}, con B ${pc(sP.B)}; in stretta (A) ${pc(sP.stretta)}`);
console.log(`SCORCIATOIE (${SC.length}, ${sS.L.toFixed(0)} m): coperto oggi ${pc(sS.oggi)}, con A ${pc(sS.A)}, con B ${pc(sS.B)}; in stretta (A) ${pc(sS.stretta)}`);
const nomeChi = Cc => Cc.volta ? Cc.volta : `casa ${Cc.i}${Cc.b.id !== undefined && Cc.b.id !== Cc.i ? ' (' + Cc.b.id + ')' : ''} ${Cc.b.era || ''} ${Cc.b.fl || '?'}p${Cc.b.name ? ' «' + Cc.b.name + '»' : ''}`;
const peggio = k => TRATTI.filter(t => t.k === k).sort((a, b) => b.L - a.L).slice(0, 12).map(t => ({ percorso: t.perc, metri: t.L, secondi: +(t.L / 1.4).toFixed(1), da: [+t.x0.toFixed(1), +t.z0.toFixed(1)], a: [+t.x1.toFixed(1), +t.z1.toFixed(1)],
  case: [...t.chi].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([Cc]) => nomeChi(Cc)), ids: [...t.chi].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([Cc]) => Cc.volta ? Cc.volta : Cc.i) }));
const P0 = peggio('oggi'), PA = peggio('A');
const conta = k => { const T = TRATTI.filter(t => t.k === k); return { tratti: T.length, piuLungo: T.length ? Math.max(...T.map(t => t.L)) : 0, medio: T.length ? +(T.reduce((a, t) => a + t.L, 0) / T.length).toFixed(1) : 0 }; };
console.log(`\ntratti coperti (≥ 1,5 m): oggi ${JSON.stringify(conta('oggi'))}, con A ${JSON.stringify(conta('A'))}`);
console.log('\nI PUNTI PEGGIORI CON A (da correggere nella mappa):');
PA.forEach(t => console.log(`  ${t.percorso.padEnd(26)} ${t.metri.toFixed(1).padStart(5)} m (${t.secondi} s)  ${t.da.join(',')} → ${t.a.join(',')}  ${t.case.join(' · ')}`));
console.log('\nI tratti peggiori oggi (senza buco):');
P0.slice(0, 6).forEach(t => console.log(`  ${t.percorso.padEnd(26)} ${t.metri.toFixed(1).padStart(5)} m (${t.secondi} s)  ${t.da.join(',')} → ${t.a.join(',')}  ${t.case.join(' · ')}`));
const out = process.argv[2];
if (out) { fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, JSON.stringify({ quando: new Date().toISOString(), regola: 'coperto: almeno 2 dei 3 raggi del corpo fermati; campione ogni 0,5 m a 1,4 m/s; zoom 0,4', manopole: { CAMERA4: V.CAMERA4, TETTO4: V.TETTO4, MURETTO: V.MURETTO },
  principali: sP, scorciatoie: sS, percorsi: RIS, tratti: { oggi: conta('oggi'), A: conta('A') }, peggioriA: PA, peggioriOggi: P0 }, null, 1)); console.log('\nscritto', out); }
