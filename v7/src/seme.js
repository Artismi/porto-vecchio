// Il seme delle prove: sostituisce Math.random con un generatore col seme (mulberry32), così una prova che dipende dal caso
// (test_eventi, test_citta_viva) si rifà uguale. Va chiamato prima di caricare i moduli del gioco.
// Il seme viene da `--seme=N` sulla riga di comando, da PV_SEME, o dall'argomento; senza seme se ne sceglie uno a caso e si stampa,
// così anche un giro andato male si può rifare: node test_eventi.js --seme=N
function semina(dato) {
  const arg = process.argv.find(a => /^--seme=/.test(a));
  let s = arg ? arg.slice(7) : process.env.PV_SEME || (dato !== undefined && dato !== null && dato !== '' ? String(dato) : '');
  if (!s) s = String(Math.floor(Math.random() * 1e9));
  let a = (+s >>> 0) || 1;
  Math.random = function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  console.log(`     seme ${s} (si rifà con --seme=${s})`);
  return +s;
}
module.exports = semina;
