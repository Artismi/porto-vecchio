// [scatti] I picchi di un giro di banco_scatti.js, misurati contro il passo normale del giro stesso: dove la macchina è lenta (SwiftShader,
// processore condiviso) un fotogramma normale dura centinaia di ms e la soglia di 33/50 ms non vuol dire niente. Qui un fotogramma è un
// picco «da 33 ms» se dura più del doppio della mediana dei 60 fotogrammi attorno (a 60 fps: 16,7 → 33), «da 50 ms» se più del triplo.
// Si contano anche sul lavoro del gioco (logica + grafica + timer, meno il tempo dentro WebGL): le attese della scheda video finta, che qui
// si contende il processore con tutto il resto, non sono del gioco.
//   node strumenti/scatti_conta.js <scatti.json> [<scatti.json di confronto>]
const fs = require('fs');
function conta(file) {
  const J = JSON.parse(fs.readFileSync(file, 'utf8')), out = {};
  for (const [nome, G] of Object.entries(J.giri)) {
    const R = G.rec, med = (a) => { const s = a.slice().sort((x, y) => x - y); return s[s.length >> 1]; };
    const k = (key) => { let x2 = 0, x3 = 0; R.forEach((f, i) => { const m = med(R.slice(Math.max(0, i - 30), i + 30).map(key)); const v = key(f); if (v > 2 * m) x2++; if (v > 3 * m) x3++; }); return [x2, x3]; };
    const dt = k(f => f.dt), lav = k(f => f.lavoro !== undefined ? f.lavoro : f.step + f.frame + f.timer);
    out[nome] = { fotogrammi: R.length, mediana_ms: med(R.map(f => f.dt)), picchi33: dt[0], picchi50: dt[1], lavoro_picchi33: lav[0], lavoro_picchi50: lav[1], shader_nuovi: G.shader_nuovi, raccolte_memoria: G.gc_fotogrammi, mb_raccolti: R.reduce((s, f) => s + (f.gc || 0), 0), lavoro_mediana_ms: med(R.map(f => f.lavoro !== undefined ? f.lavoro : f.step + f.frame + f.timer)) };
  }
  return out;
}
const a = conta(process.argv[2]); console.log(process.argv[2], JSON.stringify(a, null, 1));
if (process.argv[3]) console.log(process.argv[3], JSON.stringify(conta(process.argv[3]), null, 1));
