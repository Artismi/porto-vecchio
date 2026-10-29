// [pezzi_citta] Controllo della libreria dei pezzi urbani: cd v7 && node strumenti/pezzi_check.js [tipo]
// Per ogni tipo e per 2-3 combinazioni di parametri (quelle di PROVE qui sotto, più il lod basso):
//   1. grafo di contatto connesso: ogni mesh tocca un'altra (scatole d'ingombro nel mondo che si sovrappongono con 2 cm di tolleranza);
//   2. qualcosa poggia a y = 0 (o alla quota di posa dichiarata in userData.quotaPosa) e niente sta sotto;
//   3. il conto dei triangoli e delle mesh, con un avviso sopra le soglie (12k pieno, 2k lod basso).
// Esce con 1 se una prova fallisce.
const path = require('path'), src = path.join(__dirname, '..', 'src');
global.THREE = require(path.join(src, 'three.min.js'));
const P = require(path.join(src, 'pezzi_citta.js'));
const PROVE = {
  campanile: [{}, { h: 22, lato: 4, campane: 1, orologio: false }, { h: 34, lato: 6, cuspide: false }],
  facciata_chiesa: [{}, { w: 10, h: 12, rosone: false, gradini: 2 }, { w: 18, h: 20, corpo: 30 }],
  portico: [{}, { campate: 3, piani: 2, lettere: '' }, { campate: 6, piani: 3, h: 6 }, { campate: 3, campata: 4, piani: 1, h: 4.4, profondita: 3.6, pilastro: .7, stile: 'ottocento', tinta: 'ocra' }, { campate: 2, campata: 4.4, piani: 2, h: 4.4, profondita: 3.6, pilastro: .7, stile: 'ottocento', tinta: 'intonacoRosso' }],   // [cucitura] il portico di bottega della Vittoria   // [volumi2] in città i corpi del portico hanno 2-3 campate e al più 3 piani: il caso largo resta a 6 × 3
  torre_littoria: [{}, { h: 24, orologio: false, antenna: false }, { h: 36, lato: 10 }],
  tettoia_mercato: [{}, { diametro: 24, h: 6 }, { diametro: 40, h: 8 }],
  stazione: [{}, { L: 28, piani: 1, piazzale: false }, { L: 52, binari: 4 }],
  binari: [{}, { L: 12, binari: 1, rilevato: false }, { L: 40, binari: 3, hRilevato: 4 }],
  sottopasso: [{}, { w: 4, h: 3, L: 14 }, { binario: false }],
  passaggio_livello: [{}, { w: 6, aperto: true }, { w: 12 }, { w: 8, obliquo: .9, aperto: true, nome: 'CASELLO 7' }],   // [campagna] anche di sbieco
  carro_merci: [{}, { aperto: true }, { colore: 'ruggine' }],
  locomotiva: [{}, { colore: 'verde' }],
  magazzini_volta: [{}, { n: 1 }, { n: 7, w: 7, p: 14, h: 5 }],
  scalinata: [{}, { w: 3, dislivello: 4, pianerottoli: 0, lampada: false }, { w: 5, dislivello: 14, pianerottoli: 3 }],
  bitta: [{}, { h: .7 }],
  parapetto: [{}, { L: 4 }, { L: 18, tipo: 'guardrail' }],
  darsena: [{}, { L: 24, W: 20 }, { L: 60, W: 40, scalette: 4 }, { L: 30, W: 22, rocca: true, gradini: 3 }],
  molo_vecchio: [{}, { L1: 24, L2: 0, lanterna: false }, { L1: 60, L2: 40, w: 8 }],
  scalo_alaggio: [{}, { L: 8, w: 5 }, { L: 16, w: 10, argano: false }],
  cortina: [{}, { L: 20, h: 9, cordone: false }, { L: 60, h: 14, cannoniere: 6 }],
  bastione: [{}, { faccia: 28, fianco: 10, h: 9 }, { faccia: 44, fianco: 16, garitta: false }],
  fossato: [{}, { L: 20, ponte: false, rivellino: false }, { L: 44, w: 20, prof: 6 }, { L: 88, w: 14, prof: 6, acqua: true, pelo: 4.2, rivellino: false }],
  torrione: [{}, { r: 5, h: 12, lanterna: false }, { r: 9, h: 20 }],
  caserma: [{}, { L: 36, piani: 1 }, { L: 80, piani: 3 }],
  polveriera: [{}, { L: 8, p: 6, cinta: false }, { L: 16, p: 10 }],
  porta_monumentale: [{}, { w: 8, h: 10, merli: false }, { w: 12, h: 14, pensilina: true }],
  mura_tramontana: [{}, { L: 20, scala: false, merli: false }, { L: 60, h: 10 }],
  porta_terra: [{}, { w: 5, h: 8, torri: false }, { w: 8, h: 11, addossate: true }, { w: 4.6, h: 7, tw: 2.8 }],   // [pezzi2] le casupole addossate (in città no)
  sopraelevata: [{}, { L: 25, lampioni: false }, { L: 100, h: 9, w: 12 }],
  vele: [{}, { L: 60, piani: 10, passerelle: 2 }, { L: 120, piani: 14 }],
  ina_casa: [{}, { L: 40, piani: 3, scale: 1 }, { L: 60, piani: 5, scale: 3 }],
  torre_boom: [{}, { piani: 8, parcheggio: false }, { piani: 14, lato: 22 }],
  gradone: [{}, { L: 8, h: 1.5, rampa: false }, { L: 20, h: 3, scala: true }],
  arco_sottopasso: [{}, { w: 2.2, h: 3, p: 10 }, { w: 4, h: 4, piani: 3 }],
  arco_contrasto: [{}, { w: 2, h: 3.5 }, { w: 3.5, h: 5, doppio: true }],
  edicola_votiva: [{}, { h: 1.8, lume: false }, { h: 2.6, tettuccio: false }],
  pozzo: [{}, { r: .6, arco: false }, { r: 1.1 }],
  lavatoio: [{}, { L: 4, tettoia: false }, { L: 9 }],
  fontana: [{}, { h: 2, lati: 6 }, { h: 3.2, lati: 8, cannelle: 4 }],
  muro_garante: [{}, { L: 16, posto_blocco: false }, { L: 48, h: 5, riflettore: false }, { L: 24, camminamento: true }, { L: 21, posto_blocco: false, riflettore: false, camminamento: true }],   // [cucitura] col camminamento di ronda
  torre_guardia: [{}, { h: 9, riflettore: false }, { h: 14 }],   // [cucitura] le torri del Recinto del Garante
  palo_riflettori: [{}, { h: 8, n: 2 }, { h: 16, n: 6 }],
  mastio: [{}, { L: 10, P: 12, h: 18, lanterna: false }, { L: 16, P: 20, h: 26, merli: false }],   // [rocca2]
  corpo_rocca: [{}, { L: 14, P: 10, h: 7, scarpa: true, erba: true }, { L: 30, P: 16, h: 15, merli: true, finestre: 3 }],
  ponte_arco: [{}, { L: 20, h: 5 }, { L: 36, w: 6, h: 8 }],
  porta_acqua: [{}, { L: 8, fornice: 4 }, { L: 16, h: 13, fornice: 8 }],
  scogliera: [{}, { L: 6, w: 3, n: 6 }, { L: 16, w: 5, n: 20, seme: 4 }],
  torre_acqua: [{}, { h: 14, antenna: false }, { h: 22, r: 4 }],   // [mappa_compatta]
  gru_porto: [{}, { h: 16, braccio: 12 }, { h: 26, braccio: 22 }],
  grata_vapore: [{}, { w: 1.6 }],
  opificio: [{}, { L: 16, P: 8, ciminiera: 0, banchina: false, insegna: 'MATTONIFICIO' }, { L: 30, P: 12, h: 9, ciminiera: 30 }],   // [campagna]
  castelletto: [{}, { h: 14, b: 4, funi: 8 }, { h: 22, b: 6 }],
  tramoggia: [{}, { nastro: 0 }, { L: 10, W: 7, h: 11, nastro: 10, salita: 3 }]
};
const solo = process.argv[2], SOGLIA = { pieno: 12000, basso: 2000 };
let fail = 0, totali = 0;
const bb = new THREE.Box3(), v = new THREE.Vector3();
function tri(o) { const g = o.geometry, n = g.index ? g.index.count : g.attributes.position.count; return (n / 3) | 0; }
function prova(tipo, opt) {
  const g = P.make(tipo, opt); if (!g) { console.log(`✗ ${tipo}: make restituisce null`); fail++; return; }
  g.updateMatrixWorld(true);
  const M = []; g.traverse(o => { if (o.isMesh) { o.geometry.computeBoundingBox(); const b = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld); M.push({ o, b, t: tri(o) }); } });
  const T = M.reduce((s, m) => s + m.t, 0), tutto = new THREE.Box3(); M.forEach(m => tutto.union(m.b));
  // grafo di contatto per sovrapposizione delle scatole (2 cm di tolleranza): union-find
  const par = M.map((_, i) => i), find = i => par[i] === i ? i : (par[i] = find(par[i]));
  for (let i = 0; i < M.length; i++) for (let j = i + 1; j < M.length; j++) { const a = M[i].b, b = M[j].b;
    if (a.min.x <= b.max.x + .02 && b.min.x <= a.max.x + .02 && a.min.y <= b.max.y + .02 && b.min.y <= a.max.y + .02 && a.min.z <= b.max.z + .02 && b.min.z <= a.max.z + .02) { const fi = find(i), fj = find(j); if (fi !== fj) par[fi] = fj; } }
  const comp = {}; M.forEach((m, i) => { const r = find(i); (comp[r] = comp[r] || []).push(m); });
  const comps = Object.values(comp).sort((a, b) => b.length - a.length), err = [];
  if (comps.length > 1) err.push(`${comps.length} pezzi staccati: ` + comps.slice(1).map(c => c.map(m => `${m.o.material.name}@${m.b.min.x.toFixed(1)},${m.b.min.y.toFixed(1)},${m.b.min.z.toFixed(1)}`).slice(0, 3).join(' ')).join(' | '));
  const q = g.userData.quotaPosa || 0;
  if (Math.abs(tutto.min.y - q) > .02) err.push(`base a y = ${tutto.min.y.toFixed(2)} (attesa ${q})`);
  const lod = opt && opt.lod === 'basso', soglia = lod ? SOGLIA.basso : SOGLIA.pieno;
  const sz = tutto.getSize(v), riga = `${tipo} ${JSON.stringify(opt)}: ${M.length} mesh, ${T} tri, ${sz.x.toFixed(1)}×${sz.y.toFixed(1)}×${sz.z.toFixed(1)} m`;
  if (T > soglia) err.push(`${T} triangoli sopra la soglia ${soglia}`);
  totali++; if (err.length) { fail++; console.log('✗ ' + riga + '\n    ' + err.join('\n    ')); } else console.log('✓ ' + riga);
}
for (const tipo of P.TIPI) {
  if (solo && tipo !== solo) continue;
  const pv = PROVE[tipo] || [{}]; if (!PROVE[tipo]) console.log(`  (nessuna combinazione per ${tipo}: solo le opzioni di base)`);
  pv.forEach(o => prova(tipo, o)); prova(tipo, Object.assign({}, pv[0], { lod: 'basso' }));
}
// [scorci] il kit dei fronti e degli scorci (src/scorci_arte.js): gli stessi controlli. I pezzi a muro hanno l'origine sul filo del muro, in
// basso al centro: la quota di posa è il loro punto più basso dichiarato (la tenda e la fascia pendono dal loro attacco, il resto parte da 0)
global.Arredo3D = require(path.join(src, 'arredo3d.js'));
const SK = require(path.join(src, 'scorci_arte.js')).ScorciKit;
const FILI = [{ a: [0, 0], b: [4, 1.5], y: 4.4 }];   // un filo per prova: due fili sono due pezzi appesi ognuno ai suoi muri
const PROVE_SC = { fascia: [{ w: 3.4, stile: 'cassonetto', testo: 'TABACCHI', marchio: 'cocacola' }, { w: 3, stile: 'dipinta', testo: 'DROGHERIA', sotto: 'SALUMI · VINI' }, { w: 2.6, stile: 'tavola', testo: 'FERRAMENTA' }, { w: 3.4, stile: 'mano', testo: 'RADIO LUNA' }],
  tenda: [{ w: 1.8, testo: 'ALIMENTARI' }, { w: 3.2, d: .9, col: '#2f6a46' }], serranda: [{ w: 1.1 }, { w: 3.1, tag: true }], bandiera: [{ marchio: 'T' }, { marchio: 'peroni' }], luminarie: [{ fili: FILI }], bucato: [{ fili: FILI }],
  insegna2: [{ testo: 'SALI E TABACCHI' }], targa: [{ testo: 'PIAZZA\nSAN ROCCO' }], manifesti: [{ carta: 'concerti' }], cartellone: [{ testo: 'OFFICINA DORINO', sotto: 'GOMMISTA' }], zoccolo: [{ w: 4, tratti: [[-2, -.5], [.6, 2]] }], cassette: [{ merce: 'verdura' }, { merce: 'pesce' }] };
for (const tipo of SK.TIPI) {
  if (solo && tipo !== solo) continue;
  (PROVE_SC[tipo] || [{}]).forEach(o => { const g0 = SK.make(tipo, o);
    // il muro a cui è appeso (un velo dietro z = 0) e il suolo per le cose separate: ci si attaccano davvero
    if (g0.userData.aMuro || g0.userData.sparso) { const bb = new THREE.Box3().setFromObject(g0), sz = bb.getSize(new THREE.Vector3()), c = bb.getCenter(new THREE.Vector3()), m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ name: 'appoggio' }));
      if (g0.userData.aMuro) { m.scale.set(sz.x + .1, sz.y + .1, .02); m.position.set(c.x, c.y, -.01); } else { m.scale.set(sz.x + 4, .02, sz.z + 4); m.position.set(c.x, bb.min.y - .01, c.z); } g0.add(m); }
    { const bb1 = new THREE.Box3().setFromObject(g0); g0.userData.quotaPosa = Math.round(bb1.min.y * 1000) / 1000; }   // a muro la quota di posa è l'attacco più basso (la tenda pende dal rullo)
    const mk = P.make; P.make = () => g0; try { prova('scorci:' + tipo, o); } finally { P.make = mk; } });
}
for (const k in PROVE) if (!P.TIPI.includes(k) && !solo) console.log(`  (manca il tipo ${k})`);
console.log(`\n${totali - fail}/${totali} prove passate` + (fail ? `, ${fail} fallite` : ''));
process.exit(fail ? 1 : 0);
