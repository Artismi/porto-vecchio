// [pianta] LE IMPERFEZIONI DELLA PIANTA: la misura di strumenti/imperfezioni.js (della pulizia) con le soglie, perché non tornino.
//   node src/test_imperfezioni.js
// Prima di [pianta]: salti del suolo 125, cambi di pendenza lungo le vie 43, spigoli 1, case storte 326, scalini fra facciate 135.
// Le case storte e gli scalini (126 su 135 sono fra due case storte) aspettano le case girate lungo la via, con tetti4 che le accetti:
// qui si tiene solo che non crescano.
const path = require('path'), fs = require('fs'), os = require('os'), { execFileSync } = require('child_process');
const out = path.join(os.tmpdir(), 'imperfezioni_prova_' + process.pid + '.json');
execFileSync(process.execPath, [path.join(__dirname, '..', 'strumenti', 'imperfezioni.js'), out], { stdio: 'ignore' });
const R = JSON.parse(fs.readFileSync(out, 'utf8')), C = R.conti; fs.unlinkSync(out);
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };
console.log('imperfezioni', JSON.stringify(C));
ok(C.salto <= 30, `i salti del suolo calpestabile oltre 0,7 m senza scala, banchina o muro: ${C.salto} (al più 30; prima 125)`);
ok(C.gradino_via <= 8, `i cambi di pendenza bruschi lungo le vie, fuori dalle scalinate: ${C.gradino_via} (al più 8; prima 43)`);
ok(C.spigolo === 0, `gli angoli vivi delle vie di città: ${C.spigolo} (prima 1, il Sottopasso Cavour)`);
ok(C.zigzag === 0, `i sentieri a zigzag: ${C.zigzag}`);
ok(C.storta <= 330 && C.scalino <= 140, `case storte ${C.storta} e scalini fra facciate ${C.scalino}: non crescono (aspettano le case girate lungo la via)`);
// il generatore gira anche nel browser: una riga di prova con process.env senza la guardia ferma l'avvio (è successo due volte)
const nude = ['world_cittanuova.js', 'tetti.js', 'render.js', 'pezzi_citta.js'].flatMap(f => fs.readFileSync(path.join(__dirname, f), 'utf8').split('\n').map((l, i) => [f, i + 1, l])).filter(([, , l]) => /\bprocess\.(env|argv)/.test(l) && !/typeof process/.test(l));
ok(!nude.length, 'nessun process.env senza guardia nei file del browser' + (nude.length ? ': ' + nude.map(([f, i]) => f + ':' + i).join(', ') : ''));
console.log(fail ? `\n${fail} prove non passate` : '\nTutto bene.'); process.exitCode = fail ? 1 : 0;
