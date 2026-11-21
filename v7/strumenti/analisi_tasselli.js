// [prestazioni] analisi dei grezzi della cottura dei tasselli (ATLANTI.md): perché le mesh piccole restano sole e quanto darebbe un atlante.
//   node strumenti/tassella.js --impronta=<hex> --grezzi=<cartella> --tieni   poi   node strumenti/analisi_tasselli.js <cartella>
const fs = require('fs'), path = require('path'), G = process.argv[2] + '/grezzi';
const tav = JSON.parse(fs.readFileSync(G + '/tavole.json', 'utf8')), mats = tav.materiali;
const motivi = {}; let tot = 0, piccole = 0;
const leggi = f => { const b = fs.readFileSync(f), n = b.readUInt32LE(0); return JSON.parse(b.slice(4, 4 + n).toString()); };
for (const f of fs.readdirSync(G).filter(f => /^t_.*\.bin$/.test(f))) { const T = leggi(path.join(G, f));
  const uso = new Map(); T.mesh.forEach(r => { Object.values(r.g.at).forEach(i => uso.set(i, (uso.get(i) || 0) + 1)); if (r.g.ix !== null) uso.set(r.g.ix, (uso.get(r.g.ix) || 0) + 1); });
  for (const r of T.mesh) { tot++; const nv = T.attr[r.g.at.position] ? T.attr[r.g.at.position].n : 0; if (nv > 200) continue; piccole++;
    const M = Array.isArray(r.m) ? null : mats[r.m]; const k = [];
    if (r.inst) k.push('istanze'); if (Array.isArray(r.m)) k.push('più materiali'); if (r.g.dr) k.push('drawRange'); if (r.g.gr && r.g.gr.length > 1) k.push('gruppi');
    if (M && M.transparent) k.push('trasparente'); if (M && /Shader/.test(M.type)) k.push('ShaderMaterial');
    if (r.mx && M && M.cvs !== undefined) k.push('matrice+shader suo'); if (r.mx && T.attr[r.g.at.position] && T.attr[r.g.at.position].tipo !== 'Float32Array') k.push('matrice+pos non float');
    const ids = Object.values(r.g.at).concat(r.g.ix !== null ? [r.g.ix] : []); if (ids.some(i => uso.get(i) !== 1)) k.push('vettori divisi');
    if (r.rc) k.push('rc');
    const key = k.length ? k.join('+') : 'unibile'; motivi[key] = (motivi[key] || 0) + 1; } }
console.log('mesh', tot, 'piccole (≤200 vertici)', piccole); Object.entries(motivi).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(String(v).padStart(6), k));
// i gruppi (la stessa chiave di unisci, senza tavolozza) e i vettori divisi
let soli = 0, inGruppo = 0, divFuori = 0, divDentro = 0, perMat = 0;
for (const f of fs.readdirSync(G).filter(f => /^t_.*\.bin$/.test(f))) { const T = leggi(path.join(G, f)); const A = T.attr;
  const uso = new Map(), chi = new Map(); T.mesh.forEach((r, mi) => { const ids = Object.values(r.g.at).concat(r.g.ix !== null ? [r.g.ix] : []); ids.forEach(i => { uso.set(i, (uso.get(i) || 0) + 1); if (!chi.has(i)) chi.set(i, []); chi.get(i).push(mi); }); });
  const Gm = new Map();
  T.mesh.forEach((r, mi) => { if (r.inst || Array.isArray(r.m) || r.g.dr || (r.g.gr && r.g.gr.length > 1)) return; const M = mats[r.m]; if (!M || M.transparent || /Shader/.test(M.type)) return;
    if (r.mx && M.cvs !== undefined) return;
    const sig = Object.keys(r.g.at).sort().map(k => k + ':' + A[r.g.at[k]].tipo + A[r.g.at[k]].s + A[r.g.at[k]].norm).join(',');
    const key = [r.m, r.cs, r.rs, r.ro, r.ly, r.fc, r.cdm, r.cdi, sig, r.rc || ''].join('|'); if (!Gm.has(key)) Gm.set(key, []); Gm.get(key).push(mi); });
  Gm.forEach(L => { if (L.length < 2) { soli++; return; } inGruppo += L.length; const S = new Set(L);
    L.forEach(mi => { const r = T.mesh[mi], ids = Object.values(r.g.at).concat(r.g.ix !== null ? [r.g.ix] : []); if (ids.some(i => uso.get(i) !== 1)) { if (ids.some(i => chi.get(i).some(o => !S.has(o)))) divFuori++; else divDentro++; } }); }); }
console.log('gruppi di uno', soli, '· mesh in gruppi di 2+', inGruppo, '· di queste con vettori divisi: dentro il gruppo', divDentro, 'con qualcuno fuori', divFuori);
// quanto darebbe un atlante: per tassello, i gruppi «uguali a meno della mappa e del colore» (la firma senza map, color, name)
let mapsTot = 0, gruppiA = 0, meshA = 0, ripete = 0; const texRep = tav.tessiture || [];
const firmaA = i => { const c = Object.assign({}, mats[i]); delete c.map; delete c.color; delete c.name; delete c.mapE; return JSON.stringify(c); };
for (const f of fs.readdirSync(G).filter(f => /^t_.*\.bin$/.test(f))) { const T = leggi(path.join(G, f)); const Gm = new Map();
  T.mesh.forEach((r, mi) => { if (r.inst || Array.isArray(r.m) || r.g.dr || (r.g.gr && r.g.gr.length > 1)) return; const M = mats[r.m]; if (!M || M.transparent || /Shader/.test(M.type) || M.map === undefined) return;
    const key = [firmaA(r.m), r.cs, r.rs, r.ro, r.ly, r.fc, r.cdm, r.cdi, r.rc || ''].join('|'); if (!Gm.has(key)) Gm.set(key, new Set()); Gm.get(key).add(r.m); });
  Gm.forEach(S => { if (S.size < 2) return; gruppiA++; meshA += S.size; }); }
console.log('materiali con la mappa che si unirebbero con un atlante (uguali a meno di mappa e colore), per tassello: gruppi', gruppiA, 'materiali dentro', meshA);
const rep = (tav.tessiture || []).filter(t => t.wrapS === 1000 || t.wrapT === 1000).length; console.log('tessiture', (tav.tessiture || []).length, 'che si ripetono (RepeatWrapping: in un atlante non vanno, solo in una pila)', rep);
