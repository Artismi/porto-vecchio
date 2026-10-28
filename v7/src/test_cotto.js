// [cotto] la prova del mondo cotto (src/cotto.js, strumenti/cuoci.js): il mondo letto da mondo_cotto.js è IDENTICO a quello calcolato.
// In due processi (i moduli sono globali): uno calcola tutto come prima, l'altro legge il file cotto; ognuno fotografa, con la stessa
// codifica di cotto.js (oggetti, chiavi nel loro ordine, numeri esatti, vettori byte per byte, funzioni col loro sorgente), il mondo
// (World), i percorsi (Percorsi.dati), la rete dei tetti (Tetti: scale, passerelle, salti, camminamenti, rete4, corti, belvederi,
// premi, piano) e i tetti vissuti, più la firma dei tetti (Tetti.firma3/firma) e il conto di Math.random. Le due fotografie devono
// coincidere. Il file si cuoce qui in Node (in un file a parte: quello della build, cotto in Chromium, non si tocca).
// cd v7/src && node test_cotto.js [--seme=12345]
'use strict';
const path = require('path'), fs = require('fs'), crypto = require('crypto'), cp = require('child_process');
const CU = require(path.join(__dirname, '..', 'strumenti', 'cuoci.js'));
const modo = (process.argv.find(a => a.startsWith('--modo=')) || '').slice(7);

function foto() {
  const C = global.Cotto, ids = new Map(), K = C.Codifica(ids, { sorgenti: true });
  const T = global.Tetti, TV = global.TettiVissuti;
  const radici = { W: global.World, P: global.Percorsi && global.Percorsi.dati, TT: T && { LADDERS: T.LADDERS, PLANKS: T.PLANKS, JUMPS: T.JUMPS, CAMM: T.CAMM, BELV: T.BELV, RETE4: T.RETE4, CORTI: T.CORTI, PREMI: T.PREMI, PIANO: T.PIANO, _: T._ }, TV: TV && { VISSUTI: TV.VISSUTI } };
  const out = {};
  Object.keys(radici).forEach(k => { const j = K.enc(radici[k], k); out[k] = crypto.createHash('sha1').update(JSON.stringify(j)).digest('hex'); });
  const b = K.binario(); out.bin = crypto.createHash('sha1').update(b.bin).digest('hex') + ' ' + b.bin.length;
  out.funzioni = K.funz.length;
  out.oggetti = ids.size;
  out.caso = global.__nCaso();
  try { out.firma = T && T.firma3 ? String(T.firma3()) : T && T.firma ? String(T.firma()) : ''; } catch (e) { out.firma = 'errore ' + e.message; }
  out.restanti = C.restanti(radici, '').slice(0, 10);
  out.stato = C.STATO;
  return out;
}

if (modo) {
  require(path.join(__dirname, 'seme.js'))(12345);
  let opz = {};
  if (modo === 'cotto') { const file = process.argv.find(a => a.startsWith('--file=')).slice(7); const s = fs.readFileSync(file, 'utf8'); const win = {}; new Function('window', s)(win); opz = { cotto: win.PV_COTTO, impronta: CU.impronta() }; }
  const R0 = Math.random; let nR = 0; Math.random = function () { nR++; return R0(); }; global.__nCaso = () => nR;
  const t0 = Date.now(); const R = CU.carica(opz); const ms = Date.now() - t0;
  const F = foto(); F.ms = ms; F.tempi = R.tempi;
  process.stdout.write('FOTO ' + JSON.stringify(F) + '\n');
  process.exit(0);
}

let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };
// la cottura di Node (la build cuoce in Chromium: all'ultima cifra i numeri dei due V8 possono differire, vedi strumenti/cuoci.js)
const V7 = path.join(__dirname, '..'), imp = CU.impronta(), file = path.join(require('os').tmpdir(), 'mondo_cotto_node_' + imp + '.js');
const haImp = f => { try { return (/Impronta ([0-9a-f]+)/.exec(fs.readFileSync(f, 'utf8').slice(0, 400)) || [])[1]; } catch (e) { return null; } };
if (haImp(file) !== imp) { console.log('     cuocio in Node in ' + file); cp.execFileSync('node', [path.join(V7, 'strumenti', 'cuoci.js'), '--node', '--out=' + file, '--impronta=' + imp], { stdio: 'inherit' }); }
const corri = (m) => { const o = cp.execFileSync('node', [__filename, '--modo=' + m, '--file=' + file], { maxBuffer: 1 << 26 }).toString(); const r = /^FOTO (.*)$/m.exec(o); return JSON.parse(r[1]); };
const A = corri('calcolo'), B = corri('cotto');
console.log('     calcolo ' + A.ms + ' ms, cotto ' + B.ms + ' ms (world ' + A.tempi['world_cittanuova.js'] + ' → ' + B.tempi['world_cittanuova.js'] + ', tetti ' + A.tempi['tetti.js'] + ' → ' + B.tempi['tetti.js'] + ', vissuti ' + A.tempi['tetti_vissuti.js'] + ' → ' + B.tempi['tetti_vissuti.js'] + ')');
console.log('     cotto usato: ' + JSON.stringify(B.stato.usato) + (Object.keys(B.stato.calcolato).length ? ' calcolato: ' + JSON.stringify(B.stato.calcolato) : ''));
ok(B.stato.attivo && Object.keys(B.stato.calcolato).length === 0, 'il file cotto si legge e ogni punto lo usa');
['W', 'P', 'TT', 'TV', 'bin'].forEach(k => ok(A[k] === B[k], `${k}: identico (${A[k] && A[k].slice(0, 12)})`));
ok(A.funzioni === B.funzioni && A.oggetti === B.oggetti, `le stesse funzioni (${A.funzioni}, coi sorgenti) e gli stessi oggetti (${A.oggetti})`);
ok(A.firma === B.firma, 'la firma dei tetti è la stessa');
ok(A.caso === B.caso, `Math.random: lo stesso numero di chiamate (${A.caso} / ${B.caso})`);
ok(!B.restanti.length, 'nessuna funzione lasciata da rifare' + (B.restanti.length ? ': ' + B.restanti.join(' ') : ''));
console.log(fail ? `\n${fail} NO` : '\ntutto ok'); process.exit(fail ? 1 : 0);
