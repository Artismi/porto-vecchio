// [strade3] la prova delle strade coerenti: la sonda (strumenti/strade3_sonda.js) sulla città nuova con le strade di serie (strade2 e
// strade3): i segni degli incroci, le zebre e i cartelli di segnaletica.js dicono quello che fa il guidatore (game.js Guida sulle corsie di
// G.LANES). Con un file dei cartelli di render.js (strumenti/strade3_vista.js) prova anche quelli.
//   node src/test_strade3.js [cartelli_render.json]
const path = require('path'), fs = require('fs');
const S = require(path.join(__dirname, '..', 'strumenti', 'strade3_sonda.js'));
const log = console.log; const ctx = S.carica(__dirname);
const ex = process.argv[2] && fs.existsSync(process.argv[2]) ? JSON.parse(fs.readFileSync(process.argv[2], 'utf8')) : null;
const R = S.sonda(ctx, ex ? ex.cartelli || ex : null);
let fail = 0; const ok = (c, m) => { log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };
const n = k => R.casi.filter(c => c.k.startsWith(k)), ese = L => L.slice(0, 3).map(c => `${c.x},${c.y} ${c.cosa}`).join(' | ');
log('[strade3]', JSON.stringify(R.per), JSON.stringify(R.conti));
ok(!n('zebra').length, `le zebre sugli incroci o sulle linee di desiderio, fuori dal cuore, dritte e a filo dei cordoli (${R.conti.zebre}${n('zebra').length ? '; ' + ese(n('zebra')) : ''})`);
ok(!n('arresto').length, `ogni approccio regolato ha la sua linea d'arresto, sulla corsia di chi arriva, prima della zebra (${R.conti.arresti}${n('arresto').length ? '; ' + ese(n('arresto')) : ''})`);
ok(!n('cartello').length, `i cartelli guardano il traffico che regolano, alla sua destra, uno per approccio, senza chiudere il marciapiede (${R.conti.cartelli}${n('cartello').length ? '; ' + ese(n('cartello')) : ''})`);
ok(!n('segno_freccia').length && !n('segno_stop').length && !n('segno_mezzeria').length, `le frecce, gli STOP e la mezzeria come il guidatore (${R.conti.frecce} frecce${n('segno_').length ? '; ' + ese(n('segno_')) : ''})`);
ok(n('segno_margine').length + n('segno_stallo').length <= 2, `i margini e gli stalli fuori dalla sagoma di chi passa (al più 2: ${n('segno_margine').length + n('segno_stallo').length})`);
ok(!n('arredo').length, `le fermate alla destra dell'autobus (${n('arredo').length ? ese(n('arredo')) : 'tutte'})`);
ok(R.conti.zebreVersiConCartello >= R.conti.zebreVersi * .6, `le zebre hanno il cartello per ogni verso di marcia (${R.conti.zebreVersiConCartello} versi su ${R.conti.zebreVersi})`);
log(fail ? `\n${fail} prove fallite.` : '\nTutto bene.'); process.exit(fail ? 1 : 0);
