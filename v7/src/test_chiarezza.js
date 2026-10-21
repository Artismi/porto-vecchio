// [chiarezza] prova delle regole della lettura del fotogramma (chiarezza.js) sulla città nuova:
//   1. le misure del leccio di città: fusto libero sopra il piano terra, chioma stretta, ombra chiara;
//   2. i fronti: ogni porta, ogni vetrina di bottega e ogni scala ha la sua fascia libera, e un punto sull'asse di una porta è «davanti»;
//   3. i filari: solo le vie giuste (mai la Vittoria dei pennoni, mai i vicoli), un posto ogni 12 m lungo il tracciato, e dopo il
//      filtro nessun albero davanti a una porta (≥ 2 m dal suo asse), a una vetrina o a una scala; il filare resta un filare;
//   4. le cose a terra (pannelli, cartoni, tavole) si posano solo nelle scene che le giustificano.
// node src/test_chiarezza.js   (dalla cartella v7)
const path = require('path'), src = __dirname;
global.World = require(path.join(src, 'world_cittanuova.js'));
const C = require(path.join(src, 'chiarezza.js')), W = World, TS = W.TS || 2, GW = W.GW, GH = W.GH;
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };
const A = C.ALBERO;
ok(A.fusto >= 3.5 && A.fusto <= 4.2, `fusto libero ${A.fusto} m: la chioma comincia sopra il piano terra (3,6 m)`);
ok(A.raggio * 2 >= 3 && A.raggio * 2 <= 3.6, `chioma larga ${(A.raggio * 2).toFixed(1)} m (3-3,5)`);
ok(A.masse <= 6 && A.carte <= 50, `una sagoma che si legge: ${A.masse} masse, ${A.carte} carte di foglie`);
ok(A.ombra <= .25, `ombra a terra chiara (${A.ombra})`);
// i fronti
const tile = (tx, ty) => W.grid[ty * GW + tx];
const t0 = Date.now(), F = C.fronti(W.BUILDINGS, TS, tile, W.T, GW, GH, W.pezzi), n = t => F.filter(q => q.tipo === t).length;
console.log(`fronti in ${Date.now() - t0} ms: porte ${n('porta')}, vetrine ${n('vetrina')}, scale ${n('scala')}`);
ok(n('porta') > 300 && n('vetrina') >= 40 && n('scala') > 0, 'porte, vetrine e scale hanno la loro fascia libera');
const porte = F.filter(q => q.tipo === 'porta');
ok(porte.every(q => C.davanti(F, q.x + q.nx * 2, q.z + q.nz * 2) && C.davanti(F, q.x + q.nx * 3 - q.nz * 1.8, q.z + q.nz * 3 + q.nx * 1.8)), 'sull\'asse della porta e a 1,8 m di lato il posto non è libero');
// le vie con gli alberi
const S = C.strade(W.roads);
console.log('vie alberate', S.map(s => `${s.rd.name}:${s.kind}:${s.sp || 'leccio'}:lati ${s.lati.length}`).join(' · '));
ok(!S.some(s => s.rd.pennoni), 'nessun albero sulla Vittoria dei pennoni');
ok(!S.some(s => s.rd.kind === 'vicolo' || s.rd.w < 7), 'nessun albero nei vicoli e nelle vie strette');
ok(S.some(s => s.kind === 'filare' && s.sp === 'leccio'), 'il Corso ha il suo filare di lecci');
ok(S.filter(s => s.kind === 'viale').every(s => s.lati.length === 1), 'le altre vie alberate solo su un lato');
// i filari dopo il filtro dei fronti
let tot = 0, tenuti = [], salt = { porta: 0, vetrina: 0, scala: 0 };
S.forEach(s => C.filare(s.rd.pts, s.passo, s.off, s.inizio).forEach(p => { if (s.lati.indexOf(p.sd) < 0) return; if (tile(Math.floor(p.x / TS), Math.floor(p.z / TS)) === W.T.BLD) return; tot++;
  const q = C.davanti(F, p.x, p.z); if (q) salt[q.tipo]++; else tenuti.push(Object.assign(p, { rd: s.rd.name, kind: s.kind, passo: s.passo })); }));
console.log(`posti ${tot}, tenuti ${tenuti.length}, saltati ${JSON.stringify(salt)}`);
const m = C.misura(F, tenuti);
ok(m.porta + m.vetrina + m.scala === 0, `nessun albero davanti a un fronte (${JSON.stringify(m)})`);
ok(tenuti.every(t => !porte.some(q => { const dx = t.x - q.x, dz = t.z - q.z, v = dx * q.nx + dz * q.nz, u = Math.abs(-dx * q.nz + dz * q.nx); return v > 0 && v < C.PROF && u < 2; })), 'ogni albero ad almeno 2 m dall\'asse di ogni porta');
const corso = tenuti.filter(t => /Corso/.test(t.rd));
ok(corso.length >= 10, `il Corso resta alberato (${corso.length} lecci)`);
// passo: due alberi dello stesso lato della stessa via non stanno più vicini del passo
const vicini = tenuti.filter((a, i) => tenuti.some((b, j) => j !== i && a.rd === b.rd && a.sd === b.sd && Math.hypot(a.x - b.x, a.z - b.z) < a.passo - 2)).length;
ok(vicini <= tenuti.length * .05, `il passo del filare si legge (${vicini} troppo vicini su ${tenuti.length})`);
// le cose a terra
ok(['consegna', 'cantiere'].every(k => C.SCENE_A_TERRA.includes(k)), 'pannelli e cartoni solo nelle scene: ' + C.SCENE_A_TERRA.join(', '));
console.log(fail ? `\n${fail} prove fallite` : '\ntutte le prove passate');
process.exit(fail ? 1 : 0);
