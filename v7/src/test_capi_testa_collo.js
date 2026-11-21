// [modelli] PROVA DEI CAPI DI TESTA E DI COLLO (berretti, cappelli, bandane, durag, passamontagna, sciarpe, foulard, kefiah, collane,
// colli alti, cappucci): per ogni capo, su più corporature e forme di testa (magri, grossi, alti, donne, anziani, barba, capelli lunghi,
// afro, treccine) e in più fotogrammi delle clip vere (fermo, camminata, corsa, pugno: lo skinning sposta testa e collo rispetto ai capi),
// conta i vertici del capo che finiscono DENTRO la pelle della testa, dentro i capelli (i capelli che bucano il capo) o dentro collo e
// busto (pelle e vestiti di sotto che bucano il capo). Dentro = oltre la superficie più vicina, in profondità oltre TOLL, lungo la sua normale
// (entro 30° dalla perpendicolare: gli orli e gli spigoli non contano), fino a RAGGIO di profondità.
// Uso (dalla cartella src): node test_capi_testa_collo.js [--tutto] [--capi=a,b] [--dett] [--prima]. Esce con 1 se un capo ha più vertici dentro
// del suo RESIDUO (zero per tutti, tranne i casi rimasti, segnati qui sotto: la prova impedisce che peggiorino).
'use strict';
const SRC = __dirname + '/', fs = require('fs');
const ARG = k => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : null; };
const TUTTO = process.argv.includes('--tutto'), DETT = process.argv.includes('--dett');
global.THREE = require(SRC + 'three.min.js'); global.window = global; global.self = global; global.location = { search: '?facce3' };
require(SRC + 'gltf_loader.js');
const P = require(SRC + 'personaggi.js');
if (process.argv.includes('--prima')) P.set('capiFuori', false);   // senza i passaggi che tengono i capi fuori (per il confronto)
const TOLL = +(process.env.TOLL || .004), RAGGIO = .04, COS = .866;   // 4 mm: sotto, alla distanza del gioco, non si vede (e lo skinning lineare ne perde un paio nelle pieghe)
Error.stackTraceLimit = 40;
// chi ha fatto il vertice: la prima funzione nota sulla pila ('!' se è stata lei a chiamare B.v direttamente)
const NOMI0 = ['cappello3', 'cappello', 'passamontagnaN', 'capelli3', 'capelli', 'occhiali', 'collana', 'colletto', 'addosso', 'accessori', 'scarpa', 'mano', 'testa3', 'catenaStrati', 'costruisci'];
if (process.env.ETICHETTE) P.etichette(() => { const st = new Error().stack.split('\n'); for (let k = 3; k < st.length; k++) { const m = /at (?:\S+\.)?([A-Za-z0-9_]+) \(/.exec(st[k]); if (m && NOMI0.includes(m[1])) return m[1] + (k === 3 ? '!' : ''); } return '?'; });

// i capi: [id del Guardaroba, famiglia]
// i casi rimasti (vertici dentro, persone e fotogrammi di serie): le collane e i cappucci quando ci si muove (skinning lineare: pochi mm),
// passamontagna e fazzoletto dove scendono sul collo, i capelli lunghi contro il casco e gli orli dei cappelli di prima (coppola, basco, colbacco)
const RESIDUO = { coppola: 24, cappello: 6, colbacco: 6, basco: 18, durag: 12, bandana: 8, fazzoletto: 78, casco: 73, passamontagna: 15, passamontagna_orecchie: 745, passamontagna_diavolo: 931, maschera_gas: 15, collana_oro: 61, catenina: 11, collana_perle: 20, felpa: 15, felpa_skate: 36, parka: 27, anorak: 38, piumino: 2, puffer_corto: 1, divisa: 2 };
const TESTA = ['berretto', 'berretto_corto', 'cappellino', 'cappellino_dritto', 'coppola', 'cappello', 'colbacco', 'basco', 'cappello_pescatora', 'durag', 'bandana', 'visiera', 'fascia', 'fazzoletto', 'casco', 'elmetto', 'passamontagna', 'passamontagna_orecchie', 'passamontagna_diavolo', 'maschera_gas'];
const COLLO = ['sciarpa', 'sciarpa_righe', 'kefiah', 'foulard', 'collana_oro', 'catenina', 'collana_perle', 'cravatta', 'papillon', 'dolcevita', 'maglione_collo_alto', 'felpa', 'felpa_skate', 'parka', 'anorak', 'piumino', 'puffer_corto', 'divisa'];
let CAPI = TESTA.map(id => [id, 'testa']).concat(COLLO.map(id => [id, 'collo']));
if (ARG('capi')) { const w = ARG('capi').split(','); CAPI = CAPI.filter(c => w.includes(c[0])); }
// le persone: corporature, forme di testa, capelli, barbe
const GENTE = [
  { sesso: 'm', eta: 24, pelle: '#c89070', forma3: 'squadra', f3: 'sfumato', robusto: 1, alt: 1 },
  { sesso: 'm', eta: 30, pelle: '#7a4a30', forma3: 'lunga', f3: 'afro', robusto: .92, alt: 1.04 },
  { sesso: 'm', eta: 35, pelle: '#b07a58', forma3: 'tonda', f3: 'treccine', robusto: 1.15, alt: .96, barba: 'corta' },
  { sesso: 'm', eta: 70, pelle: '#e8c0a0', forma3: 'spigolosa', f3: 'corti', robusto: 1, alt: 1, baffi: 'folti', capCol: '#c8c4bc' },
  { sesso: 'f', eta: 26, pelle: '#e0b090', forma3: 'morbida', tipo: 'lunghi', robusto: 1, alt: 1 },
  { sesso: 'f', eta: 40, pelle: '#a86a48', forma3: 'fine', f3: 'chignon', robusto: .95, alt: .95 },
  { sesso: 'm', eta: 45, pelle: '#d8a888', forma3: 'pera', f3: 'indietro', robusto: 1.1, alt: 1, barba: 'lunga', baffi: 'sottili' },
  { sesso: 'f', eta: 68, pelle: '#f0c8a8', forma3: 'uovo', f3: 'chignon', robusto: 1.1, alt: .97, capCol: '#e0dcd4' },
].slice(0, TUTTO ? 8 : 5);
const FOTO = process.env.FOTO ? JSON.parse(process.env.FOTO) : TUTTO ? [['riposo', 0], ['Idle', 0], ['Idle', .5], ['Walk', 0], ['Walk', .25], ['Walk', .5], ['Walk', .75], ['Run', .2], ['Run', .7], ['Punch_Right', .45]] : [['riposo', 0], ['Idle', 0], ['Walk', .25], ['Walk', .75], ['Run', .2], ['Punch_Right', .45]];

function descr(g, id) {
  const base = [{ id: 'maglietta', col: '#d8d2c4' }, { id: 'jeans', col: '#4a5468' }, { id: 'scarpe_tela', col: '#e8e4dc' }].filter(c => !(COLLO.includes(id) && /^(dolcevita|maglione_collo_alto)$/.test(id) && c.id === 'maglietta'));
  const D = P.descrittore({ skin: g.pelle, hair: g.capCol || '#2a1a12', top: '#888', bottom: '#444', fem: g.sesso === 'f', age: g.eta }, null, { id: 'prova_' + id + g.forma3, pop: { age: g.eta, sex: g.sesso } }, base.concat([{ id, col: '#c8402a' }]));
  D.testa = Object.assign({}, D.testa, { forma3: g.forma3 }); D.capelli = Object.assign({}, D.capelli, g.f3 ? { f3: g.f3 } : {}, g.tipo ? { tipo: g.tipo } : {});
  D.corpo = Object.assign({}, D.corpo, { robusto: g.robusto, alt: g.alt }); D.barba = g.barba || null; D.baffi = g.baffi || null; D.occhiali = null; return D;
}
// il modello del kit: lo scheletro, le giunture, le clip
const MOD = {};
function modello(file) {
  if (MOD[file]) return Promise.resolve(MOD[file]);
  const b = fs.readFileSync(SRC + '../assets/mc/' + file + '.glb');
  return new Promise(res => new THREE.GLTFLoader().parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '', gl => {
    const g = new THREE.Group(), root = gl.scene; g.add(root); root.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(root), k = 1.8 / (bb.max.y - bb.min.y); root.scale.setScalar(k); root.position.y = -bb.min.y * k; g.updateMatrixWorld(true);
    let ref = null; root.traverse(o => { if (o.isSkinnedMesh && (!ref || /Body/.test(o.name))) ref = o; });
    const { J, rel } = P.giunture(g, ref), clips = {}; gl.animations.forEach(a => { clips[a.name.split('|').pop()] = a; });
    res(MOD[file] = { g, root, ref, J, rel, clips, mixer: new THREE.AnimationMixer(root) });
  }));
}
// una griglia di triangoli per trovare la superficie più vicina
function griglia(pos, tris, flip) {
  const C = .02, H = new Map(), key = (a, b, c) => a + ',' + b + ',' + c;
  for (let t = 0; t < tris.length; t += 3) { let x0 = 1e9, y0 = 1e9, z0 = 1e9, x1 = -1e9, y1 = -1e9, z1 = -1e9;
    for (let q = 0; q < 3; q++) { const i = tris[t + q] * 3; x0 = Math.min(x0, pos[i]); x1 = Math.max(x1, pos[i]); y0 = Math.min(y0, pos[i + 1]); y1 = Math.max(y1, pos[i + 1]); z0 = Math.min(z0, pos[i + 2]); z1 = Math.max(z1, pos[i + 2]); }
    for (let a = Math.floor(x0 / C); a <= Math.floor(x1 / C); a++) for (let b = Math.floor(y0 / C); b <= Math.floor(y1 / C); b++) for (let c = Math.floor(z0 / C); c <= Math.floor(z1 / C); c++) { const k = key(a, b, c); let L = H.get(k); if (!L) H.set(k, L = []); L.push(t); } }
  const T = new THREE.Triangle(), A = new THREE.Vector3(), B = new THREE.Vector3(), Cc = new THREE.Vector3(), q = new THREE.Vector3(), n = new THREE.Vector3(), p = new THREE.Vector3();
  // la profondità del punto dentro la superficie (0 se fuori, sulla superficie, o non perpendicolare)
  return (x, y, z) => { p.set(x, y, z); let best = 1e9, bt = -1; const R = Math.ceil(RAGGIO / C), ca = Math.floor(x / C), cb = Math.floor(y / C), cc = Math.floor(z / C), seen = new Set();
    for (let a = ca - R; a <= ca + R; a++) for (let b = cb - R; b <= cb + R; b++) for (let c = cc - R; c <= cc + R; c++) { const L = H.get(key(a, b, c)); if (!L) continue;
      for (const t of L) { if (seen.has(t)) continue; seen.add(t); A.fromArray(pos, tris[t] * 3); B.fromArray(pos, tris[t + 1] * 3); Cc.fromArray(pos, tris[t + 2] * 3); T.set(A, B, Cc); T.closestPointToPoint(p, q); const d = q.distanceToSquared(p); if (d < best) { best = d; bt = t; } } }
    if (bt < 0) return 0; A.fromArray(pos, tris[bt] * 3); B.fromArray(pos, tris[bt + 1] * 3); Cc.fromArray(pos, tris[bt + 2] * 3); T.set(A, B, Cc); T.closestPointToPoint(p, q); T.getNormal(n); if (flip && flip[bt / 3]) n.negate();
    const dist = Math.sqrt(best); griglia.ultimo = tris[bt]; if (dist < TOLL || dist > RAGGIO) return 0; const d = p.clone().sub(q).divideScalar(dist), c = d.dot(n); return c < -COS ? dist : 0; };
}
(async () => {
  const esiti = {}, t0 = Date.now(); let tot = 0;
  for (const [id, fam] of CAPI) {
    const R = esiti[id] = { fam, testa: 0, capelli: 0, corpo: 0, prof: 0, dove: '' };
    for (const g of GENTE) {
      const M = await modello(g.sesso === 'f' ? 'Casual' : 'Casual_2'), D = descr(g, id), B = P.costruisci(D, M.J), geo = P.geometria(D, M.ref, M.rel, M.J, B), T = B.T;
      const sk = new THREE.SkinnedMesh(geo, new THREE.MeshBasicMaterial()); sk.bind(M.ref.skeleton, M.ref.bindMatrix); M.ref.parent.add(sk); sk.position.copy(M.ref.position); sk.quaternion.copy(M.ref.quaternion); sk.scale.copy(M.ref.scale);
      const yC = M.J.Chest[1] - .14, n = B.n, reg = []; for (let i = 0; i < n; i++) if (B.P[i * 3 + 1] > yC) reg.push(i);
      // chi è chi: il capo, la pelle della testa, i capelli, il corpo vicino (pelle del collo, busto e braccia, i vestiti di sotto)
      // le parti le dice il costruttore (B.Pa: 1 cranio, 2 capelli, 3 cappello, 4 collo, 5 busto, 6 capo al collo); il collo sopra il mento sta dentro la testa e non conta
      const Pa = B.Pa, capo = i => fam === 'testa' ? Pa[i] === 3 : Pa[i] === 6;
      const cls = new Int8Array(n); reg.forEach(i => { cls[i] = capo(i) ? 1 : Pa[i] === 1 ? 2 : Pa[i] === 2 && fam === 'testa' ? 3 : (Pa[i] === 4 || Pa[i] === 5) && B.P[i * 3 + 1] < B.chin ? 4 : 0; });
      const trisOf = c => { const L = []; for (let k = 0; k < B.I.length; k += 3) { const a = B.I[k], b = B.I[k + 1], d = B.I[k + 2]; if (cls[a] === c && cls[b] === c && cls[d] === c) L.push(a, b, d); } return L; };
      const TT = { 2: trisOf(2), 3: trisOf(3), 4: trisOf(4) }, mine = reg.filter(i => cls[i] === 1);
      // il verso di ogni triangolo dalle normali lisce dei vertici, nella posa (ai poli i triangoli schiacciati hanno il verso a caso)
      const FL = {}; for (const c of [2, 3, 4]) { const L = TT[c], f = new Uint8Array(L.length / 3), tr = new THREE.Triangle(), a = new THREE.Vector3(), b = new THREE.Vector3(), d = new THREE.Vector3(), nn = new THREE.Vector3();
        for (let t = 0; t < L.length; t += 3) { a.fromArray(B.P, L[t] * 3); b.fromArray(B.P, L[t + 1] * 3); d.fromArray(B.P, L[t + 2] * 3); tr.set(a, b, d); tr.getNormal(nn); let sx = 0, sy = 0, sz = 0; for (let q = 0; q < 3; q++) { sx += B.N[L[t + q] * 3]; sy += B.N[L[t + q] * 3 + 1]; sz += B.N[L[t + q] * 3 + 2]; } f[t / 3] = nn.x * sx + nn.y * sy + nn.z * sz < 0 ? 1 : 0; } FL[c] = f; }
      const v = new THREE.Vector3(), pos = new Float32Array(n * 3);
      for (const [clip, f] of FOTO) {
        M.mixer.stopAllAction(); if (clip === 'riposo') { M.ref.skeleton.pose(); } else { const c = M.clips[clip] || M.clips.Idle; const a = M.mixer.clipAction(c); a.reset().play(); a.time = f * c.duration; M.mixer.update(0); } M.g.updateMatrixWorld(true);
        const PA = geo.attributes.position; for (const i of reg) { v.fromBufferAttribute(PA, i); sk.boneTransform(i, v); v.applyMatrix4(sk.matrixWorld); pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z; }
        const G = { 2: griglia(pos, TT[2], FL[2]), 3: griglia(pos, TT[3], FL[3]), 4: griglia(pos, TT[4], FL[4]) };
        for (const i of mine) { const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
          for (const [c, nome] of [[2, 'testa'], [3, 'capelli'], [4, 'corpo']]) { const d = G[c](x, y, z); if (d > 0) { if (process.env.DBG3 && (R.nd = (R.nd || 0) + 1) < 6) console.log(T ? T[i] : '', clip, f, nome, 'riposo', [0, 1, 2].map(q => B.P[i * 3 + q].toFixed(3)).join(','), 'pesi', JSON.stringify(B.W[i]), 'vicino', Pa[griglia.ultimo], JSON.stringify(B.W[griglia.ultimo]), 'prof', d.toFixed(4)); R[nome]++; if (process.env.DBG2) { const k = clip + '@' + f + ' ' + nome + ':' + Pa[griglia.ultimo] + ' y' + (B.P[i * 3 + 1] - M.J.Head[1]).toFixed(2) + ' ' + Pa[i]; (R.hist = R.hist || {})[k] = (R.hist[k] || 0) + 1; } if (d > R.prof) { R.prof = d; R.dove = `${g.forma3}/${g.f3 || g.tipo} ${clip}@${f} ${nome}`; } } } }
      }
      M.ref.parent.remove(sk); geo.dispose();
    }
    const n = R.testa + R.capelli + R.corpo, lim = TUTTO || process.argv.includes('--prima') ? 0 : RESIDUO[id] || 0; if (n > lim) tot += n - lim; if (R.hist) console.log(Object.entries(R.hist).sort((a, b) => b[1] - a[1]).slice(0, 12).map(e => e.join(' × ')).join('\n'));
    console.log(`${n > lim ? 'NO ' : n ? 'res' : 'ok '} ${id.padEnd(22)} ${fam.padEnd(5)} dentro la testa ${String(R.testa).padStart(5)} · nei capelli ${String(R.capelli).padStart(5)} · nel corpo ${String(R.corpo).padStart(5)}  (più profondo ${(R.prof * 1000).toFixed(1)} mm${DETT && R.dove ? ': ' + R.dove : ''})`);
  }
  console.log(`\n${GENTE.length} persone × ${FOTO.length} fotogrammi, tolleranza ${TOLL * 1000} mm, ${((Date.now() - t0) / 1000).toFixed(0)} s: ${tot ? tot + ' vertici dentro oltre il residuo' : 'tutto ok (res = residuo ammesso, vedi RESIDUO)'}`);
  process.exit(tot ? 1 : 0);
})();
