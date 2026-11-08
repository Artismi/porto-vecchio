// [rifcostruito] prove della rifinitura del costruito (stile E): node src/test_rifcostruito.js
// 1. senza ?stile=E è spenta (niente aggancio, tinta() rende il colore com'era); con ?norifcostruito anche con E
// 2. con E: tinta() tiene il valore (Oklab L) e resta nella fascia; le righe delle tele hanno un gradino di valore ≥ .25
// 3. il GLSL: niente `map` fuori da texture2D(map, …) (la pila di [leggero]), niente `diffuse`, solo ASCII, parentesi in pari
// 4. il manto E di tetti_vissuti: per ogni genere lo shader si compone e rispetta le stesse regole
const path = require('path'), assert = require('assert');
let ok = 0; const prova = (nome, f) => { f(); ok++; console.log('ok  ', nome); };
const carica = q => { delete require.cache[require.resolve('./rifinitura_costruito.js')]; global.location = { search: q }; global.window = {}; return require('./rifinitura_costruito.js'); };

prova('spenta senza ?stile=E', () => { const R = carica(''); assert.strictEqual(R.on, false); assert.strictEqual(R.tinta('#d84a4a'), '#d84a4a'); });
prova('spenta con ?stile=A e ?stile=D2', () => { assert.strictEqual(carica('?stile=A').on, false); assert.strictEqual(carica('?stile=D2').on, false); });
prova('?norifcostruito la spegne anche con E', () => { assert.strictEqual(carica('?stile=E&norifcostruito').on, false); });
prova('accesa con ?stile=E, E1, e (minuscola)', () => { assert.ok(carica('?stile=E').on); assert.ok(carica('?x=1&stile=E1').on); assert.ok(carica('?stile=e').on); });

const R = carica('?leggera&stile=E');
prova('tinta(): il valore resta (|ΔL| < .01) senza fascia', () => {
  for (const h of ['#d84a4a', '#e0cdb0', '#2f5a3e', '#2a2c2e', '#9a9e9a', '#8a6440', '#2a4a78', '#c8a034']) { const a = R.oklab(h)[0], b = R.oklab(R.tinta(h, null, .7))[0]; assert.ok(Math.abs(a - b) < .01, h + ' ' + a + ' ' + b); }
});
prova('tinta(): la fascia del genere tiene il valore dentro', () => { const L = R.oklab(R.tinta('#1c1c1e', null, .7, [.3, .5]))[0]; assert.ok(L > .29 && L < .51, L); });
prova('righe(): ogni coppia ha un gradino di valore ≥ .25 e nessun inchiostro riservato', () => {
  for (const [a, b] of R.RIGHE) { const La = R.oklab(R.ink(a, a === 'ocra' ? .64 : .56))[0], Lb = R.oklab(R.ink(b, .9))[0]; assert.ok(Lb - La >= .24, a + '/' + b); }
  for (const h of ['#d84a4a', '#3a6aa8', '#2f5a3e', '#f07aa8', '#e9e0cf', '#7a6a5a']) assert.ok(R.RIGHE.includes(R.righe(h)), h);
});

// il GLSL dell'aggancio: si genera chiamando il pezzo con una finta scheda (lo shader di MeshStandardMaterial ridotto alle righe che servono)
function regole(nome, frag) {
  const senza = frag.replace(/texture2D\(\s*map\s*,/g, 'X(');
  assert.ok(!/\bmap\b/.test(senza.replace(/#ifdef USE_MAP|#if defined\(USE_MAP\)/g, '')), nome + ': `map` fuori da texture2D');
  assert.ok(!/\bdiffuse\b/.test(frag), nome + ': `diffuse`');
  assert.ok(/^[\x00-\x7f]*$/.test(frag), nome + ': non ASCII');
  assert.strictEqual((frag.match(/\(/g) || []).length, (frag.match(/\)/g) || []).length, nome + ': parentesi tonde');
  assert.strictEqual((frag.match(/\{/g) || []).length, (frag.match(/\}/g) || []).length, nome + ': graffe');
}
const T3 = { Material: function () { }, };
T3.Material.prototype = { onBeforeCompile() { }, customProgramCacheKey() { return 'k'; } };
global.HTMLCanvasElement = function () { };
global.THREE = T3;
const R2 = carica('?stile=E');
prova('l\'aggancio si installa con E e avvolge intonaco e atlanti', () => {
  assert.ok(T3.Material.prototype.__rcAggancio);
  const sh = () => ({ vertexShader: '#include <common>\n#include <begin_vertex>', fragmentShader: '#include <common>\nvoid main() {\n#include <map_fragment>\n#include <color_fragment>\n}', uniforms: {} });
  const mk = (ud, im, rough) => { const m = Object.create(T3.Material.prototype); m.isMeshStandardMaterial = true; m.userData = ud; m.roughness = rough || .9; if (im) { const c = Object.create(HTMLCanvasElement.prototype); c.width = im[0]; c.height = im[1]; m.map = { image: c }; } return m; };
  const casi = [['intonaco', mk({ plaster: true })], ['fa', mk({}, [1024, 2048], .85)], ['ca', mk({}, [256, 1024], .92)]];
  for (const [g, m] of casi) { let chiamata = 0; if (g === 'intonaco') m.onBeforeCompile = () => { chiamata++; }; const s = sh(); m.onBeforeCompile.call(m, s); if (g === 'intonaco') assert.strictEqual(chiamata, 1, 'la funzione di prima gira');
    assert.ok(/rcLum/.test(s.fragmentShader), g + ': il pezzo c\'è'); regole(g, s.fragmentShader);
    const pre = m.onBeforeCompile; m.onBeforeCompile = function (q) { pre.call(m, q); }; const s2 = sh(); m.onBeforeCompile.call(m, s2);   // la fusione compone: niente doppio
    assert.strictEqual((s2.fragmentShader.match(/float rcLum/g) || []).length, 1, g + ': una volta sola'); }
  const altro = mk({}, [512, 512]); const s = sh(); altro.onBeforeCompile.call(altro, s); assert.ok(!/rcLum/.test(s.fragmentShader), 'gli altri materiali no');
});
prova('il manto E (tetti_vissuti.js) rispetta le regole per ogni genere', () => {
  const src = require('fs').readFileSync(path.join(__dirname, 'tetti_vissuti.js'), 'utf8');
  assert.ok(/function applicaE\(/.test(src) && /if \(RC\) return applicaE/.test(src));
  // [integra1] applicaE riusa il manto di A (pezziA) e ci mette davanti il ramo di E dietro la manopola rcK (StileE)
  const taglia = (nome) => { const i0 = src.indexOf('function ' + nome + '('), i1 = src.indexOf('\n  }\n', i0) + 4; return src.slice(i0, i1); };
  const d0 = src.indexOf('const DISEGNO = {'), d1 = src.indexOf('};', d0) + 2, DIS = src.slice(d0, d1);
  const RC = R2, f = v => v.toFixed(4), BUCO_TV = .22;
  const mk = new Function('RC', 'BUCO_TV', 'StileE', DIS + '\n' + taglia('pezziA') + '\n' + taglia('applicaE') + '\nreturn applicaE;');
  const CELLE = { coppi: [256 / 6, 256 / 8], tegole: [256 / 4, 256 / 7], pianelle: [256 / 5, 256 / 5], cemento: [256 / 8, 256 / 8], ardesia: [256 / 6, 256 / 5] };
  const SEc = { pre: n => '\nuniform float ' + n + ';\n', adatta: x => x, chiave: () => '|C' }, SEa = { pre: n => '\n#define ' + n + ' 0.\n', adatta: x => x.replace(/uniform float rcK;/g, '#define rcK 0.'), chiave: () => '' };
  for (const k in CELLE) for (const SE of [SEc, SEa]) { const applicaE = mk(Object.assign({ k: { value: 0 } }, RC), BUCO_TV, SE); const m = { userData: {} }; applicaE(m, k, CELLE[k], k === 'coppi' || k === 'tegole' || k === 'ardesia', f);
    const s = { vertexShader: '#include <common>\n#include <worldpos_vertex>', fragmentShader: '#include <common>\nvoid main() {\n#include <map_fragment>\n}', uniforms: {} }; m.onBeforeCompile(s);
    const fr = s.fragmentShader, iE = fr.indexOf('if (rcK > .5) {'), jE = fr.indexOf('} else {\n#ifdef USE_UV', iE);   // le regole sul ramo E (quello di A è il testo di prima, che usa diffuse)
    regole('manto ' + k, jE > 0 ? fr.slice(iE + 15, jE) : fr); assert.ok(/riga/.test(s.fragmentShader)); assert.ok(/if \(rcK > \.5\)/.test(s.fragmentShader), k + ': il ramo E dietro rcK');
    if (k !== 'ardesia') assert.ok(/} else \{\n#ifdef USE_UV/.test(s.fragmentShader), k + ': il manto di A nel ramo else'); }
});
console.log(`\ntutte le prove passate (${ok})`);
