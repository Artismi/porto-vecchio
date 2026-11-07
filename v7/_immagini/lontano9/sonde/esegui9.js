// [lontano9] una pagina, un posto, uno o più pezzi di codice nella pagina: node esegui9.js <query> <pezzo.js> [x,y] [vx,vy] [c9 0/1] [uscita.json]
// il pezzo è il corpo di una funzione async (riceve A: { at, verso }) che rende un oggetto JSON
const path = require('path'), fs = require('fs');
const { avvia } = require('../../controlli8/sonde/lib.js'), { posa } = require('../../camera9/sonde/passo9.js');
const [, , Q, PEZZO, AT, VERSO, C9, OUTF] = process.argv;
(async () => {
  const { pg, log, close } = await avvia({ query: Q || 'leggera&tassellivecchi', vp: { width: +(process.env.W9 || 800), height: +(process.env.H9 || 450) } });
  try {
    const at = (AT || '1372.1,296.5').split(',').map(Number), verso = (VERSO || '1373,310.6').split(',').map(Number);
    await posa(pg, { at, verso, c9: C9 !== '0', assesta: 2.5, foto: false });
    const corpo = fs.readFileSync(PEZZO, 'utf8');
    const r = await pg.evaluate(new Function('A', 'return (async () => {' + corpo + '})()'), { at, verso });
    const s = JSON.stringify(r, null, 1); if (OUTF) fs.writeFileSync(OUTF, s); console.log(s.slice(0, 20000));
  } catch (e) { log('ERRORE', e.message, e.stack); }
  log('FINE'); await close();
})();
