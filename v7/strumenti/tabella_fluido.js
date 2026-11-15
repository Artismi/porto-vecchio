// [fluido] la tabella prima/dopo di FLUIDO.md dai due giri di banco_fluido.js: node strumenti/tabella_fluido.js <prima.json> <dopo.json>
const fs = require('fs'), [, , pf, df] = process.argv, P = JSON.parse(fs.readFileSync(pf, 'utf8')), D = JSON.parse(fs.readFileSync(df, 'utf8'));
const posti = ['inizio', 'porto', 'piazza'].filter(k => P.posti[k] && D.posti[k]);
const f0 = v => v === undefined || v === null ? '–' : Math.round(v).toLocaleString('it-IT'), f1 = v => v === undefined ? '–' : (+v).toFixed(1).replace('.', ',');
const gpu = (R, k) => { const g = R.gpuSwiftShader_ms || {}; if (k === 'passi') { let s = 0; for (const q in g) if (/^passo:/.test(q)) s += g[q]; return s; } return g[k]; };
const righe = [
  ['JS per fotogramma, ms (processore ×' + (P.cpu || 4) + ')', R => R.js_ms.totale, f0],
  ['· simulazione (G.step)', R => R.js_ms.simulazione, f0],
  ['· grafica (R.frame)', R => R.js_ms.grafica, f0],
  ['· altro (gli altri giri del browser)', R => R.js_ms.altro, f0],
  ['JS p95, ms', R => R.js_ms.totale_p95, f0],
  ['raccolte della memoria, ms per fotogramma', R => R.gc.msPerFotogramma, f1],
  ['allocato, KB per fotogramma', R => R.allocatoKBperFotogramma, f0],
  ['disegni per fotogramma (tutti)', R => R.gl.disegni, f0],
  ['· scena / ombre / passi', R => null, (v, R) => `${f0(R.gl.disegniScena)} / ${f0(R.gl.disegniOmbra)} / ${f0(R.gl.disegniPassi)}`],
  ['triangoli (migliaia)', R => R.gl.triangoli_k, f0],
  ['· scena / ombre', R => null, (v, R) => `${f0(R.gl.triangoliScena_k)} / ${f0(R.gl.triangoliOmbra_k)}`],
  ['programmi usati / cambi di programma', R => null, (v, R) => `${f0(R.gl.programmiUsati)} / ${f0(R.gl.cambiProgramma)}`],
  ['passi a tutta tela (Mpx a fotogramma)', R => null, (v, R) => `${f0(R.gl.passiTuttaTela)} (${f1(R.gl.MpxPassi)})`],
  ['risoluzione della scena', R => null, (v, R) => ((R.inventario.hd || '').match(/\(([0-9]+×[0-9]+)\)/) || [])[1] || '?'],
  ['SwiftShader, ms: scena', R => gpu(R, 'scenaSenzaOmbra'), f0],
  ['SwiftShader, ms: ombra / passi', R => null, (v, R) => `${f0(gpu(R, 'ombra'))} / ${f0(gpu(R, 'passi'))}`],
];
let out = '| | ' + posti.map(k => `${k} prima | ${k} dopo`).join(' | ') + ' |\n|---|' + posti.map(() => '---:|---:').join('|') + '|\n';
for (const [nome, get, fmt] of righe) out += `| ${nome} | ` + posti.map(k => [P.posti[k], D.posti[k]].map(R => fmt(get(R), R)).join(' | ')).join(' | ') + ' |\n';
console.log(out);
