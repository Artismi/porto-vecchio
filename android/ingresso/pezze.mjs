// [prestazioni] Le pezze sul Game Boy compilato (ingresso.js), dopo esbuild: i sorgenti del Game Boy stanno nel repo del sito, qui no.
// Le pezze cercano la forma del codice (non i nomi, che il minificatore cambia) e si fermano con un errore se non la trovano.
//   1. LA GRIGLIA DEL CARICAMENTO NASCOSTA NON ANIMA: nell'APK il caricamento resta montato per tutta la partita (page: c sempre vero) e
//      la griglia dei 140 cubi riscriveva transform e opacità a ogni giro dello schermo (60-120 al secondo), sotto il gioco, nello stesso
//      filo del gioco (stessa origine). Ora, se sta dentro [data-hidden="true"], si riguarda ogni 500 ms invece di animare.
//   2. LA LEVETTA PRONTA: la posizione della levetta partiva al giro dopo (requestAnimationFrame, poi postMessage, poi il gioco la legge al
//      suo fotogramma): ora parte subito, a ogni pointermove (Chrome li allinea già allo schermo; si manda solo se è cambiata).
//   node pezze.mjs <ingresso.js>   (costruisci.mjs le applica da sé)
import fs from 'node:fs'

export function pezzeIngresso(js) {
  let n = 0
  const griglia = /let (\w)=\(0,(\w+)\.useRef\)\(\[\]\),(\w)=\(0,\2\.useRef\)\(Date\.now\(\)\),(\w)=\(0,\2\.useRef\)\(null\),(\w)=\(0,\2\.useCallback\)\(\(\)=>\{/
  if (!griglia.test(js)) throw new Error('pezze: la griglia del caricamento non c\'è più com\'era')
  js = js.replace(griglia, (m, a, R, t, l, e) => { n++; return m + `{const K0=${a}.current[0];if(K0&&K0.closest&&K0.closest('[data-hidden="true"]')){${l}.current=0;setTimeout(()=>{K0.isConnected&&(${l}.current=requestAnimationFrame(${e}))},500);return}}` })
  const leva = /(\w)\.current\|\|\(\1\.current=requestAnimationFrame\((\w)\)\)/g
  const k = (js.match(leva) || []).length
  if (k !== 1) throw new Error('pezze: la levetta non c\'è più com\'era (' + k + ')')
  js = js.replace(leva, (m, c, v) => { n++; return `${v}()` })
  return { js, n }
}

if (process.argv[2]) {
  const f = process.argv[2], { js, n } = pezzeIngresso(fs.readFileSync(f, 'utf8'))
  fs.writeFileSync(f, js); console.log('[pezze]', n, 'pezze in', f)
}
