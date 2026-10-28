// [segnaletica] la prova della strada che si legge (segnaletica.js), sulla città nuova:
//   - ogni attività (b.shop, b.sign, b.shopFront nella cornice della città) e ogni luogo-missione ha UNA voce in W.insegne, leggibile
//     (contrasto fra fondo e segno, misure, parola corta); nessuna bottega con due bandiere;
//   - i pali e le insegne non chiudono porte, vetrine, scale, marciapiedi (≥ 1 m libero) e non si compenetrano fra loro, coi muri, coi
//     lampioni e le mensole della rete, con le fermate, le edicole, le plance, i bidoni e i tavolini (le stesse classi di
//     strumenti/compenetrazioni.js: muro, urto, porta/vetrina/scala, carreggiata);
//   - le zebre stanno sugli incroci veri (strumenti/incroci.js) e attraversano la via; lo STOP sta sulla corsia di chi arriva (si guida a
//     destra, come le corsie di G.LANES);
//   - il conto delle chiamate di disegno (riquadri fusi × materiali) sta nel bilancio;
//   - uno scorcio che firma una bottega (W.scorci) toglie la bandiera di questo filone; il piano non usa Math.random.
// node src/test_segnaletica.js   (dalla cartella v7 o da src)
const path = require('path'), src = __dirname;
const log = console.log, warn = console.warn; console.log = () => {}; console.warn = () => {};
global.World = require(path.join(src, 'world_cittanuova.js')); global.Interior = require(path.join(src, 'interiors.js')); global.Game = require(path.join(src, 'game.js'));
global.Chiarezza = require(path.join(src, 'chiarezza.js')); global.Vievive = require(path.join(src, 'vievive.js'));
global.Scena = require(path.join(src, 'scena.js')); global.Rete = require(path.join(src, 'rete.js'));
Scena.init(Game); Scena.piano(); Rete.init(Game, Scena);
console.log = log; console.warn = warn;
const G = Game, W = G.MAP.world, TS = G.TS, T = G.T, I = require(path.join(src, '..', 'strumenti', 'incroci.js'));
const rnd = Math.random; Math.random = () => { throw new Error('Math.random nel piano della segnaletica'); };
const t0 = Date.now(); const SG = require(path.join(src, 'segnaletica.js')); let P = SG.piano(); const ms = Date.now() - t0; Math.random = rnd;
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };
const hyp = Math.hypot, C = SG.CORNICE, inC = (x, y) => x >= C[0] && x <= C[2] && y >= C[1] && y <= C[3];
const tile = (x, y) => G.tileAt(Math.floor(x / TS), Math.floor(y / TS));
console.log(`piano in ${ms} ms`, JSON.stringify(SG.conta()));
ok(SG.attivo && P.strisce.length > 300 && P.cartelli.length >= 10 && P.indicazioni.length >= 4, `il piano c'è (${P.strisce.length} strisce, ${P.cartelli.length} cartelli, ${P.indicazioni.length} pali delle indicazioni)`);
ok(W.insegne === P.insegne && Array.isArray(W.insegne), 'W.insegne è il dato delle insegne (id, place, text, type, position, facing)');
ok(W.insegne.every(q => q.id && q.place && q.tipo && Number.isFinite(q.x) && Number.isFinite(q.y) && Number.isFinite(q.facing) && typeof q.testo === 'string'), 'ogni voce ha id, posto, tipo, testo, posizione e verso');

// ---------------- 1. UNA INSEGNA PER ATTIVITÀ, LEGGIBILE ----------------
const att = G.BUILDINGS.filter(b => (b.shop || b.sign || b.shopFront) && b.door && inC((b.door[0] + .5) * TS, (b.door[1] + .5) * TS));
const perPosto = new Map(); W.insegne.forEach(q => perPosto.set(q.place, (perPosto.get(q.place) || 0) + 1));
const senza = att.filter(b => !perPosto.get(b.id)), doppie = [...perPosto].filter(([, n]) => n > 1);
ok(!senza.length && !doppie.length, `ogni attività della città ha una voce sola (${att.length} attività${senza.length ? '; senza: ' + senza.slice(0, 5).map(b => b.id).join(' ') : ''}${doppie.length ? '; doppie: ' + doppie.slice(0, 5).map(d => d[0]).join(' ') : ''})`);
const L = W.luoghi || [], perLuogo = L.map(l => [l.id, W.insegne.filter(q => q.luogo === l.id).length]);
ok(perLuogo.every(([, n]) => n === 1), `ogni luogo-missione ha la sua insegna, una (${perLuogo.map(([id, n]) => id + ':' + n).join(' ')})`);
// leggibile: il contrasto fra fondo e segno (WCAG, ≥ 3:1 per le scritte grandi), la parola corta, le misure
const lum = h => { const c = parseInt(h.slice(1), 16), f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c >> 16) + .7152 * f(c >> 8 & 255) + .0722 * f(c & 255); };
const contrasto = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
const mie = W.insegne.filter(q => q.fonte === 'segnaletica');
const illeggibili = mie.filter(q => { const T0 = SG.TIPI[q.tipo] || {}; if (T0.forma === 'segno') return false; return contrasto(q.bg, q.fg) < 3 || (q.parola || '').length > 12 || Math.min(q.w || 0, q.h || 0) < .4; });
ok(!illeggibili.length, `le insegne di questo filone si leggono: contrasto ≥ 3:1, parola ≤ 12 lettere, lato ≥ 0,4 m (${mie.length}${illeggibili.length ? '; no: ' + illeggibili.slice(0, 4).map(q => q.place + ' ' + contrasto(q.bg, q.fg).toFixed(1)).join(' ') : ''})`);
const tipiC = Object.entries(SG.TIPI).filter(([, t]) => t.forma !== 'segno').map(([k, t]) => [k, contrasto(t.bg, t.fg)]).filter(([, c]) => c < 3);
ok(!tipiC.length, `tutti i tipi d'insegna hanno contrasto ≥ 3:1 (${tipiC.map(([k, c]) => k + ' ' + c.toFixed(1)).join(', ') || Object.keys(SG.TIPI).length + ' tipi'})`);
const facc = W.insegne.filter(q => q.fonte === 'facciata'), faccKo = facc.filter(q => { const b = G.BUILDINGS.find(o => o.id === q.place); return !b || !b.sign || !b.sign.t; });
ok(!faccKo.length, `le insegne che render.js disegna già hanno il testo (${facc.length}${faccKo.length ? '; no: ' + faccKo.map(q => q.place).join(' ') : ''})`);
const mestieri = ['tabacchi', 'farmacia', 'bar', 'pescheria', 'barbiere', 'trattoria'], segnoGiusto = mestieri.every(m => mie.filter(q => q.tipo === m).every(q => q.icona === SG.TIPI[m].ic));
ok(segnoGiusto && mie.filter(q => q.tipo === 'tabacchi').every(q => q.icona === 'T') && mie.filter(q => q.tipo === 'farmacia').every(q => q.icona === 'croce' && q.luce), 'il segno del mestiere: la T dei tabacchi, la croce verde accesa della farmacia, la tazza del bar, il pesce…');

// ---------------- 2. NIENTE CHIUDE PORTE, MARCIAPIEDI, NIENTE SI COMPENETRA ----------------
const F = Chiarezza.fronti(G.BUILDINGS, TS, (tx, ty) => G.tileAt(tx, ty), T, G.GW, G.GH, W.pezzi);
const aTerra = P.pali.filter(p => !p.muro);
const porta = aTerra.filter(p => Chiarezza.davanti(F, p.x, p.y, 1.0));
ok(!porta.length, `nessun palo a meno di 1 m da porte, vetrine, scale (${aTerra.length} pali${porta.length ? '; no: ' + porta.map(p => p.tipo + '@' + p.x.toFixed(0) + ',' + p.y.toFixed(0)).join(' ') : ''})`);
const solido = v => v === T.BLD || v === T.WATER || v === T.CLIFF || v === T.FOUNT;
const muro = aTerra.filter(p => [[0, 0], [.3, 0], [-.3, 0], [0, .3], [0, -.3]].some(([a, b]) => solido(tile(p.x + a, p.y + b))));
ok(!muro.length, `nessun palo dentro un muro o nell'acqua (${muro.map(p => p.x.toFixed(0) + ',' + p.y.toFixed(0)).join(' ') || 'nessuno'})`);
const carr = aTerra.filter(p => SG.suCarreggiata(p.x, p.y, .1));
ok(!carr.length, `nessun palo sulla carreggiata (${carr.map(p => p.x.toFixed(0) + ',' + p.y.toFixed(0) + ' ' + SG.suCarreggiata(p.x, p.y, .1).id).join(' ') || 'nessuno'})`);
// il marciapiede resta passabile: attorno al palo, su almeno un lato, 1 m libero (né muro né carreggiata né altro palo)
const passo = p => { for (let a = 0; a < 8; a++) { const ux = Math.cos(a * Math.PI / 4), uy = Math.sin(a * Math.PI / 4); let lib = true; for (let d = .15; d <= 1.0 && lib; d += .1) { const x = p.x + ux * d, y = p.y + uy * d; if (solido(tile(x, y)) || P.pali.some(q => q !== p && hyp(q.x - x, q.y - y) < .15)) lib = false; } if (lib) return true; } return false; };
const chiusi = aTerra.filter(p => !passo(p));
ok(!chiusi.length, `accanto a ogni palo resta ≥ 1 m di passaggio (${chiusi.length})`);
const vicini = []; aTerra.forEach((p, i) => aTerra.forEach((q, j) => { if (j > i && hyp(p.x - q.x, p.y - q.y) < 1.0) vicini.push([p, q]); }));
ok(!vicini.length, `due pali mai a meno di 1 m (${vicini.length})`);
// le cose che stanno già a terra: rete (lampioni, pali, cabine), vievive (fermate, edicole, plance), il piano dell'arredo (bidoni, cassonetti, tavolini)
const R = Rete.grafo(), A = Scena.piano(), VV = Vievive, ost = [];
R.lampioni.forEach(n => { if (n.modello !== 'braccio') ost.push([n.x, n.z, .3, 'lampione']); }); R.nodi.forEach(n => { if (n.k === 'palo') ost.push([n.x, n.z, .3, 'palo della rete']); if (n.k === 'cabina') ost.push([n.x, n.z, 1.6, 'cabina']); });
VV.fermate().forEach(f => ost.push([f.x, f.y, 1.6, 'fermata'])); VV.edicole().forEach(e => ost.push([e.kx, e.ky, 1.8, 'edicola'])); VV.plance().forEach(q => ost.push([q.x, q.y, 1.2, 'plancia']));
A.bidoni.forEach(q => ost.push([q.x, q.z, .45, 'bidone'])); A.cassonetti.forEach(q => ost.push([q.x, q.z, .9, 'cassonetto'])); A.dehors.forEach(d => d.tavoli.forEach(t => ost.push([t.x, t.z, .9, 'tavolino'])));
const urti = []; aTerra.forEach(p => ost.forEach(o => { if (hyp(p.x - o[0], p.y - o[1]) < o[2] + .1) urti.push(p.tipo + '/' + o[3] + '@' + p.x.toFixed(0) + ',' + p.y.toFixed(0)); }));
ok(!urti.length, `i pali non urtano lampioni, fermate, edicole, plance, bidoni, cassonetti, tavolini (${ost.length} cose a terra${urti.length ? '; urti: ' + urti.slice(0, 5).join(' ') : ''})`);
// le insegne a muro: sopra la testa (≥ 2,5 m), sporgenza ≤ 1,1 m, mai sull'asse di una porta, la punta fuori dai muri, lontane fra loro,
// lontane dalle mensole, dai contatori e dai lampioni a braccio della rete sulla stessa casa
const band = mie.filter(q => q.montaggio === 'bandiera');
const bandKo = band.filter(q => q.y0 < 2.5 || SG.CFG.bandiera.da + q.w > 1.12 || solido(tile(q.x + q.nx * (SG.CFG.bandiera.da + q.w), q.y + q.ny * (SG.CFG.bandiera.da + q.w))));
ok(!bandKo.length, `le bandiere: sopra i 2,5 m, sporgenza ≤ 1,1 m, la punta nella strada (${band.length}${bandKo.length ? '; no: ' + bandKo.slice(0, 4).map(q => q.place).join(' ') : ''})`);
const sullaPorta = band.filter(q => F.some(f => f.tipo === 'porta' && hyp(f.x - q.x, f.z - q.y) < .5));
ok(!sullaPorta.length, `nessuna bandiera sull'asse di una porta (${sullaPorta.map(q => q.place).join(' ') || 'nessuna'})`);
const bb = []; band.forEach((p, i) => band.forEach((q, j) => { if (j > i && hyp(p.x - q.x, p.y - q.y) < 2.3) bb.push(p.place + '/' + q.place); }));
ok(!bb.length, `due bandiere mai a meno di 2,3 m (non si sovrappongono in prospettiva) (${bb.slice(0, 4).join(' ') || 'nessuna'})`);
const nodiMuro = R.nodi.filter(n => (n.k === 'mensola' || n.k === 'contatore' || (n.k === 'lampione' && n.modello === 'braccio')) && n.bi !== null && n.bi !== undefined);
const reteKo = band.filter(q => nodiMuro.some(n => n.bi === q.bi && hyp(n.x - q.x, n.z - q.y) < .85));
ok(!reteKo.length, `nessuna bandiera dentro una mensola, un contatore o un lampione a braccio della rete (${nodiMuro.length} nodi a muro${reteKo.length ? '; no: ' + reteKo.slice(0, 4).map(q => q.place).join(' ') : ''})`);
const targheKo = band.filter(q => A.targhe.some(t => t.bi === q.bi && hyp(t.x - q.x, t.z - q.y) < .85) || A.civici.some(c => c.bi === q.bi && hyp(c.x - q.x, c.z - q.y) < .45));
ok(!targheKo.length, `nessuna bandiera sopra una targa della via o un civico (${targheKo.map(q => q.place).join(' ') || 'nessuna'})`);
// le frecce delle indicazioni: la punta (1,7 m dal palo, a 2,35 m e più) non entra in un muro
const frKo = []; P.pali.filter(p => p.tipo === 'indicazioni').forEach(p => p.plates.forEach(q => { for (let d = .2; d <= 1.7; d += .25) if (solido(tile(p.x + Math.cos(q.dir) * d, p.y + Math.sin(q.dir) * d))) { frKo.push(q.testo + '@' + p.x.toFixed(0) + ',' + p.y.toFixed(0)); break; } }));
ok(!frKo.length, `le frecce delle indicazioni non entrano nei muri (${frKo.slice(0, 4).join(' ') || 'nessuna'})`);
const insegneVicinePali = mie.filter(q => q.montaggio === 'pannello' || q.montaggio === 'tavola').filter(q => P.pali.some(p => p.plates.every(x => !x.ins) && hyp(p.x - q.x, p.y - q.y) < 1.2));
ok(!insegneVicinePali.length, `i pannelli dei luoghi non toccano i pali dei cartelli (${insegneVicinePali.map(q => q.place).join(' ') || 'nessuno'})`);

// ---------------- 3. LE STRISCE STANNO SUGLI INCROCI E SULLA CORSIA GIUSTA ----------------
const { strade, nodi } = I.dalMondo(W, C), IC = I.controlla(strade, nodi), INC = IC.incroci;
const zebre = P.zebre, zInc = zebre.filter(z => z.motivo === 'incrocio');
const lontane = zInc.filter(z => !INC.some(j => hyp(j.x - z.x, j.y - z.y) < Math.max(...j.bracci.map(b => b.w)) / 2 + 9));
ok(zInc.length >= 4 && !lontane.length, `le zebre degli incroci stanno su un incrocio vero (${zInc.length}${lontane.length ? '; lontane: ' + lontane.map(z => z.x.toFixed(0) + ',' + z.y.toFixed(0)).join(' ') : ''})`);
const traverso = zebre.filter(z => { const q = SG.lNear(SG.lin(z.rd), z.x, z.y), p = SG.lAt(SG.lin(z.rd), q.s); return Math.abs(Math.cos(p.ang) * z.ux + Math.sin(p.ang) * z.uy) < .9 || q.d > .5; });
ok(!traverso.length, `ogni zebra attraversa la sua via da cordolo a cordolo (le bande lungo la via) (${zebre.length} zebre${traverso.length ? '; storte: ' + traverso.length : ''})`);
const altre = zebre.filter(z => z.motivo !== 'incrocio');
ok(altre.every(z => SG.nearJ(z.x, z.y, 2) >= 0), `le zebre della scuola, delle piazze e delle fermate stanno fuori dagli incroci (${altre.map(z => z.motivo).join(', ') || 'nessuna'})`);
// lo STOP e la linea d'arresto: sulla corsia di chi arriva all'incrocio, quella di destra (come G.LANES / G.lanePos)
const stops = P.strisce.filter(s => s.k === 'stop'); let latoKo = [];
stops.forEach(s => { const rd = W.roads.find(r => r.pts && SG.lNear(SG.lin(r), s.x, s.y).d < r.w / 2 && r.kind !== 'vicolo'); const Ln = rd && G.LANES.find(l => l.id === rd.id); if (!Ln) return;
  // il verso di chi arriva: lo STOP guarda dove si va (s.ang); la sua corsia in quel verso deve passare sullo STOP
  let best = null; for (const dir of [1, -1]) for (let k = 0; k <= Ln.L; k += 1) { const q = G.lanePos(Ln, k, dir), d = hyp(q.x - s.x, q.y - s.y); if (!best || d < best.d) best = { d, dir, k, q }; }
  const q2 = G.lanePos(Ln, Math.min(Ln.L, best.k + best.dir * 1), best.dir), mv = Math.atan2(q2.y - best.q.y, q2.x - best.q.x), cos = Math.cos(mv - s.ang);
  if (best.d > 2.0 || cos < 0) latoKo.push(rd.id + ' ' + best.d.toFixed(1) + ' m ' + cos.toFixed(2)); });
ok(stops.length && !latoKo.length, `lo STOP sta sulla corsia di chi arriva, a destra come il traffico di G.LANES (${stops.length}${latoKo.length ? '; no: ' + latoKo.join(' ') : ''})`);
ok(P.strisce.every(s => s.k !== 'bus' || s.giallo) && P.bus.length >= 2, `il riquadro giallo BUS alle fermate della linea 1 (${P.bus.length} su ${VV.fermate().length} fermate)`);
ok(['vittoria', 'corso'].every(id => P.strisce.some(s => s.k === 'riga' && !s.arresto && !s.stallo && SG.lNear(SG.lin(W.roads.find(r => r.id === id)), s.x, s.y).d < 3.6)), 'mezzeria e margini sulla Vittoria e sul Corso');
// [pedonale] la Rua passa sul sagrato: è pedonale (nessun mezzo, quindi niente triangoli); i triangoli restano per le vie minori dei mezzi
{ const minori = W.roads.filter(r => r.kind === 'vicolo' && r.w >= 4.5 && !r.pedonale).map(r => r.id), tri = P.strisce.filter(s => s.k === 'triangolo' && s.minore), pedT = tri.filter(s => (W.roads.find(r => r.id === s.minore) || {}).pedonale);
  ok(!pedT.length && tri.every(s => minori.includes(s.minore)), `i triangoli del dare precedenza solo dove una via minore dei mezzi sbocca su una via, mai sulle vie pedonali (${tri.length}: ${[...new Set(tri.map(s => s.minore))].join(' ')})`); }
ok(P.strisce.some(s => /^freccia/.test(s.k) && s.freccia === 'via_porto') && P.strisce.some(s => /^freccia/.test(s.k) && s.freccia === 'via_alta') && P.strisce.some(s => s.k === 'parola|PORTO') && P.strisce.some(s => s.k === 'parola|STAZIONE'), `le frecce e le scritte PORTO e STAZIONE dove le loro vie si staccano dalle costiere (${P.strisce.filter(s => s.freccia).length})`);
const pc = SG.conta().perCartello; ok(['stop', 'attraversamento', 'pedonale', 'divieto_sosta'].every(k => pc[k])   /* [pedonale] il dare precedenza in città lo davano solo i mezzi della Rua, che ora è pedonale (sul sagrato) */ && Object.values(pc).reduce((a, b) => a + b, 0) <= 40, `i cartelli dove servono, non a ogni angolo (${JSON.stringify(pc)})`);
const mete = new Set(P.indicazioni.flatMap(q => q.frecce.map(f => f.meta))); ok(['porto', 'stazione', 'mercato', 'centro', 'rocca'].every(m => mete.has(m)), `le indicazioni portano ai luoghi veri (${[...mete].join(', ')})`);
// la freccia va dove si arriva davvero: il campo di distanza della meta scende lungo il braccio indicato
const ME = SG.mete(), campi = new Map(ME.map(m => [m.id, SG.campo(m.x, m.y)])); let freKo = [];
P.indicazioni.forEach(q => q.frecce.forEach(f => { const D = campi.get(f.meta), d0 = SG.dAt(D, q.incrocio[0], q.incrocio[1]), d1 = SG.dAt(D, q.incrocio[0] + Math.cos(f.dir) * 12, q.incrocio[1] + Math.sin(f.dir) * 12); if (!(d1 < d0)) freKo.push(f.testo); }));
ok(!freKo.length, `ogni freccia punta verso la sua meta sul cammino vero (${P.indicazioni.reduce((a, q) => a + q.frecce.length, 0)} frecce${freKo.length ? '; no: ' + freKo.join(' ') : ''})`);

// ---------------- 3c. [suolo2] LA SEGNALETICA REGOLARE: i casi contati su tutto il piano (obiettivo zero) ----------------
// - la mezzeria continua o tratteggiata regolare (3 m su 6) per tutto il tratto: si ferma solo agli incroci fra vie dei veicoli (i vicoli e le
//   vie pedonali che sboccano non sono incroci), alle strisce, sul lastricato pedonale e fuori città. «Interrotta»: un buco di più di 3,6 m che
//   non tocca uno di questi motivi; «irregolare»: un tratto più corto di 2,5 m fra due buchi (un pezzo che si ferma a caso);
// - nessuna striscia sul marciapiede (un angolo oltre 5 cm fuori dalla via: carreggiata o vicolo dei mezzi minori);
// - le zebre perpendicolari alla via (le bande lungo la tangente vera, entro 3°), centrate (30 cm) e a filo dei marciapiedi (le bande
//   esterne a meno di 60 cm dal cordolo, mai oltre).
const Suolo = require(path.join(src, 'suolo.js')), SU = Suolo.di(W);
const VEI = W.roads.filter(r => r.pts && r.pts.length > 1 && r.kind !== 'sterrato' && r.kind !== 'vicolo' && !r.pedonale);
const vicineV = (x, y) => VEI.filter(rd => rd.pts.some(p => Math.abs(p[0] - x) < 90 && Math.abs(p[1] - y) < 90));
const SUOLI = W.roads.filter(r => r.pts && r.pts.length > 1 && r.kind !== 'sterrato'), vicineS = (x, y) => SUOLI.filter(rd => rd.pts.some(p => Math.abs(p[0] - x) < 90 && Math.abs(p[1] - y) < 90));
const oltreVia = (x, y) => { let e = 1e9; for (const rd of vicineS(x, y)) e = Math.min(e, SG.lNear(SG.lin(rd), x, y).d - rd.w / 2); return e; };   // fuori da ogni via lastricata (anche i vicoli dei mezzi minori): il marciapiede o le case
const oltreCarr = (x, y, salta) => { let e = 1e9; for (const rd of vicineV(x, y)) if (rd !== salta) e = Math.min(e, SG.lNear(SG.lin(rd), x, y).d - rd.w / 2); return e; };
const angoli = s => { const c = Math.cos(s.ang), n = Math.sin(s.ang); return [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([a, b]) => [s.x + c * a * s.L / 2 - n * b * s.w / 2, s.y + n * a * s.L / 2 + c * b * s.w / 2]); };
const GI = SG.junctions().filter(([x, y]) => vicineV(x, y).filter(rd => SG.lNear(SG.lin(rd), x, y).d < rd.w / 2 + 2).length >= 2).map(([x, y]) => [x, y, Math.max(...vicineV(x, y).filter(rd => SG.lNear(SG.lin(rd), x, y).d < rd.w / 2 + 2).map(rd => rd.w)) / 2 + 2]);
const zonaCitta = (x, y) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); return G.MAP.zone[ty * G.GW + tx] === G.MAP.Z.CITTA; };
function difettiSegnaletica(P) {
  const D = { mezzeria_interrotta: 0, mezzeria_irregolare: 0, sul_marciapiede: 0, zebre_storte: 0, zebre_non_a_filo: 0 }, es = [], quanti = {}, nota = (k, t) => { quanti[k] = (quanti[k] || 0) + 1; if (quanti[k] <= 3) es.push(t); };
  P.strisce.forEach(s => { if (angoli(s).some(([x, y]) => oltreVia(x, y) > .05)) { D.sul_marciapiede++; nota('marciapiede', 'marciapiede ' + s.k + '@' + s.x.toFixed(0) + ',' + s.y.toFixed(0)); } });
  P.zebre.forEach((z, zi) => { const B = P.strisce.filter(s => s.k === 'zebra' && s.zebra === zi), Ln = SG.lin(z.rd), q = SG.lNear(Ln, z.x, z.y), t = SG.lAt(Ln, q.s), tx = Math.cos(t.ang), ty = Math.sin(t.ang);
    if (!B.length) return;
    if (q.d > .3 || B.some(s => Math.abs(Math.sin(s.ang - t.ang)) > Math.sin(3 * Math.PI / 180))) { D.zebre_storte++; nota('storta', 'storta@' + z.x.toFixed(0) + ',' + z.y.toFixed(0)); return; }
    const v = B.map(s => -(s.x - t.x) * ty + (s.y - t.y) * tx), lo = Math.min(...v) - CFGz.b / 2, hi = Math.max(...v) + CFGz.b / 2, h = z.rd.w / 2;
    if (lo < -h - .02 || hi > h + .02 || lo > -h + .6 || hi < h - .6) { D.zebre_non_a_filo++; nota('non', 'non a filo@' + z.x.toFixed(0) + ',' + z.y.toFixed(0) + ' ' + lo.toFixed(2) + '..' + hi.toFixed(2) + '/' + h); } });
  // la mezzeria, via per via, a passi di 25 cm lungo la via
  const perVia = new Map(); P.strisce.forEach(s => { if (s.mezz) (perVia.get(s.mezz) || perVia.set(s.mezz, []).get(s.mezz)).push(s); });
  perVia.forEach((L0, id) => { const rd = W.roads.find(r => r.id === id), Ln = SG.lin(rd), n = Math.floor(Ln.L / .25) + 1, pit = new Uint8Array(n), ferma = new Uint8Array(n);
    L0.forEach(s => { const q = SG.lNear(Ln, s.x, s.y).s; for (let i = Math.max(0, Math.ceil((q - s.L / 2 - .1) / .25)); i <= Math.min(n - 1, Math.floor((q + s.L / 2 + .1) / .25)); i++) pit[i] = 1; });
    const asse = Math.abs(SG.lNear(Ln, L0[0].x, L0[0].y).d) * Math.sign(1);
    for (let i = 0; i < n; i++) { const p = SG.lAt(Ln, i * .25), nx = -Math.sin(p.ang), ny = Math.cos(p.ang);
      const pts = [[p.x + nx * asse, p.y + ny * asse], [p.x - nx * asse, p.y - ny * asse], [p.x, p.y]];
      ferma[i] = i < 8 || i > n - 9 || pts.some(([x, y]) => !zonaCitta(x, y) || GI.some(j => hyp(j[0] - x, j[1] - y) < j[2] + .5) || P.strisce.some(s => (s.k === 'zebra' || s.k === 'bus' || s.arresto) && hyp(s.x - x, s.y - y) < 3.2) || oltreCarr(x, y, rd) < -.6 || PEDT.has(tile(x, y)) || SU.rango(x, y) > SU.R.carreggiata || SU.tagliata(rd, i * .25)) ? 1 : 0; }
    // i buchi e i tratti
    for (let i = 0; i < n;) { const v0 = pit[i]; let j = i; while (j < n && pit[j] === v0) j++; const lung = (j - i) * .25, tocca = () => { for (let k = Math.max(0, i - 2); k < Math.min(n, j + 2); k++) if (ferma[k]) return true; return false; };
      if (!v0 && lung > 3.6 && !tocca()) { D.mezzeria_interrotta++; nota('interrotta', 'interrotta ' + id + ' s=' + (i * .25).toFixed(0) + ' (' + lung.toFixed(1) + ' m)'); }
      if (v0 && lung < 2.5 && i > 0 && j < n && !tocca()) { D.mezzeria_irregolare++; nota('irregolare', 'irregolare ' + id + ' s=' + (i * .25).toFixed(0) + ' (' + lung.toFixed(1) + ' m)'); }
      i = j; } });
  return { D, es, tot: Object.values(D).reduce((a, b) => a + b, 0) };
}
const CFGz = SG.CFG.zebra, PEDT = new Set([T.PIAZZA, T.STAIRS, T.FOUNT].filter(v => v !== undefined));
{ const R0 = difettiSegnaletica(P);
  console.log('     [suolo2] segnaletica, casi:', JSON.stringify(R0.D), R0.es.length ? '\n       ' + R0.es.join('\n       ') : '');
  ok(R0.tot === 0, `[suolo2] la mezzeria regolare e intera fra incroci e strisce, nessuna striscia sul marciapiede, le zebre perpendicolari e a filo dei marciapiedi (${R0.tot} casi)`); }

// ---------------- 3b. LA CAMERA LE VEDE ----------------
// dalla camera di gioco (sud-est, ~41° in giù), senza il taglio delle case attorno al personaggio: i pali (in cima) e le bandiere (al centro)
const vPali = aTerra.filter(p => SG.visibile(p.x, p.y, p.tipo === 'indicazioni' ? 2.9 : 2.7)).length, vBand = band.filter(q => SG.visibile(q.x + q.nx * .7, q.y + q.ny * .7, 3.1)).length;
const facceVis = band.filter(q => q.f === 'S' || q.f === 'E').length;
console.log(`     dalla camera: pali ${vPali}/${aTerra.length}, bandiere ${vBand}/${band.length} (sulle facce S/E ${facceVis}; le altre si vedono col taglio delle case vicino al personaggio)`);
ok(vPali >= aTerra.length * .6, `la camera vede almeno il 60% dei pali (${Math.round(vPali / aTerra.length * 100)}%)`);
ok(vBand >= band.length * .35, `la camera vede almeno un terzo delle bandiere senza il taglio (${Math.round(vBand / band.length * 100)}%)`);

// ---------------- 4. IL BILANCIO ----------------
const RQ = SG.riquadri();
ok(RQ.n <= 100, `le chiamate di disegno in più: al più ${RQ.n} mesh fuse per tutta la città (riquadri di ${SG.SETT} m × 4 materiali; bilancio 100)`);

// ---------------- 5. GLI SCORCI E IL PIANO RIFATTO ----------------
const conB = P.insegne.find(q => q.fonte === 'segnaletica' && q.montaggio === 'bandiera'), prima = JSON.stringify(P.insegne.map(q => [q.id, q.montaggio, +q.x.toFixed(2), +q.y.toFixed(2)]));
W.scorci = [{ id: 'prova', b: conB.place, insegna: true }]; P = SG.piano(true);
const sc = P.insegne.filter(q => q.place === conB.place);
ok(sc.length === 1 && sc[0].fonte === 'scorci' && !P.insegne.some(q => q.place === conB.place && q.montaggio === 'bandiera'), `uno scorcio che firma una bottega (W.scorci) toglie la bandiera di questo filone (${conB.place})`);
delete W.scorci; P = SG.piano(true);
ok(JSON.stringify(P.insegne.map(q => [q.id, q.montaggio, +q.x.toFixed(2), +q.y.toFixed(2)])) === prima, 'il piano rifatto è lo stesso (niente caso)');

console.log('\n' + (fail ? fail + ' prove fallite.' : 'tutte le prove passate'));
process.exitCode = fail ? 1 : 0;
