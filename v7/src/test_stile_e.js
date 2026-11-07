// [integra1] prove dello stile E come interruttore (src/stile_e.js, INTEGRAZIONE1.md): node src/test_stile_e.js
// 1. lo stato: A per difetto, E con PV_STILE, la cottura (?cottae) porta i rami E coi valori di A
// 2. le manopole negli shader: pre() e adatta() (con A la costante 0, con E e nella cottura la uniform), una dichiarazione sola per programma
// 3. le varianti dei materiali: la tinta (rcE/rcA), i pezzi solo di E, la tessitura E (e le copie se la portano dietro)
// 4. la cottura e il caricamento le portano: tassella_pagina.js (mapE, rc), tassella.js (mapE fra le tessiture, rc e rcE fuori dalle unioni), tasselli.js
// 5. un solo posto per il difetto (index.src.html)
const path = require('path'), fs = require('fs'), assert = require('assert');
let ok = 0; const prova = (nome, f) => { f(); ok++; console.log('ok  ', nome); };
class Col { constructor(h) { this.set(h || '#ffffff'); } set(h) { this.h = String(h).replace('#', '').toLowerCase(); return this; } getHexString() { return this.h; } get isColor() { return true; } }
function carica(q, stile) {
  delete require.cache[require.resolve('./stile_e.js')];
  global.location = { search: q }; global.window = { PV_STILE: stile || 'A' };
  global.THREE = { Material: function () { } }; THREE.Material.prototype = { copy(s) { this.userData = JSON.parse(JSON.stringify(s.userData)); return this; } };
  delete global.Render; delete global.Tasselli; delete global.RifSuolo;
  return require('./stile_e.js');
}
const mat = (hex, ud) => { const m = Object.create(THREE.Material.prototype); m.color = new Col(hex); m.userData = ud || {}; m.visible = true; m.map = null; return m; };

prova('A per difetto: niente rami, nessuna manopola accesa', () => { const S = carica(''); assert.strictEqual(S.on, false); assert.strictEqual(S.capace, false); assert.strictEqual(S.u('rsK').value, 0); assert.strictEqual(S.chiave(), ''); });
prova('E (PV_STILE): rami e manopole accese', () => { const S = carica('?stile=E', 'E'); assert.ok(S.on && S.capace); assert.strictEqual(S.u('rcK').value, 1); assert.strictEqual(S.chiave(), '|E'); });
prova('la cottura (?cottae): i rami entrano, i valori restano di A', () => { const S = carica('?tutto&tasselli=0&cottae'); assert.ok(!S.on && S.capace && S.cotta); assert.strictEqual(S.u('rcK').value, 0); assert.strictEqual(S.chiave(), '|C'); });

prova('pre(): uniform con E e nella cottura, la costante con A; una dichiarazione sola', () => {
  let S = carica(''); assert.ok(/#define rsK 0\./.test(S.pre('rsK')) && !/uniform/.test(S.pre('rsK')));
  S = carica('?cottae'); const p = S.pre('rcK'); assert.ok(/uniform float rcK;/.test(p) && /#ifndef PVE_rcK/.test(p));
});
prova('adatta(): il testo cotto con A diventa quello senza ramo (la costante); con E resta', () => {
  const testo = 'x\n#ifndef PVE_rsK\n#define PVE_rsK\nuniform float rsK;\n#endif\nuniform float rcK;\nuniform float altra;\nvoid main(){ if (rsK > 0.) {} }';
  let S = carica(''); const a = S.adatta(testo); assert.ok(/#define rsK 0\./.test(a) && /#define rcK 0\./.test(a) && /uniform float altra;/.test(a) && !/uniform float rsK/.test(a)); assert.ok(S.usa(testo) && !S.usa(a));
  S = carica('?stile=E', 'E'); assert.strictEqual(S.adatta(testo), testo);
  S = carica('?cottae'); assert.strictEqual(S.adatta(testo), testo);
});
prova('le varianti dei materiali: tinta, pezzi solo di E, tessitura E, e dal vivo', () => {
  const S = carica(''); const m = mat('#d84a4a'); S.colore(m, '#c25b36'); assert.strictEqual(m.color.getHexString(), 'd84a4a'); assert.strictEqual(m.userData.rcA, '#d84a4a');
  const s = mat('#16121b'); S.soloE(s); assert.strictEqual(s.visible, false);
  const tA = { isTexture: true, n: 'A' }, tE = { isTexture: true, n: 'E' }, t = mat('#ffffff'); t.map = tA; t.emissiveMap = tA; S.mappaE(t, tE); assert.strictEqual(t.map, tA);
  const c = Object.create(THREE.Material.prototype); c.copy(t); assert.strictEqual(c.__mapE, tE);   // la copia se la porta dietro
  S.imposta('E'); [m, s, t].forEach(S.applica); assert.strictEqual(m.color.getHexString(), 'c25b36'); assert.strictEqual(s.visible, true); assert.strictEqual(t.map, tE); assert.strictEqual(t.emissiveMap, tE); assert.strictEqual(S.u('rsK').value, 1);
  S.imposta('A'); [m, s, t].forEach(S.applica); assert.strictEqual(m.color.getHexString(), 'd84a4a'); assert.strictEqual(s.visible, false); assert.strictEqual(t.map, tA); assert.strictEqual(S.u('rsK').value, 0);
});
const leggi = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
prova('la cottura porta E: ?cottae, mapE, i pezzi segnati, niente tavolozza per le tinte E', () => {
  const T = fs.readFileSync(path.join(__dirname, '..', 'strumenti', 'tassella.js'), 'utf8'), P = fs.readFileSync(path.join(__dirname, '..', 'strumenti', 'tassella_pagina.js'), 'utf8');
  assert.ok(/tasselli=0&cottae/.test(T), 'la cottura con ?cottae');
  assert.ok(/'displacementMap', 'mapE'\]/.test(T), 'mapE fra le tessiture unite');
  assert.ok(/!\(M\.ud && M\.ud\.rcE\)/.test(T), 'le tinte E fuori dalla tavolozza per tassello');
  assert.ok(/sig, r\.rc \|\| ''\]/.test(T), 'i pezzi segnati non si uniscono agli altri');
  assert.ok(/r\.mapE = texId\(m\.__mapE\)/.test(P) && /rc: o\.userData\.rc/.test(P));
});
prova('il caricamento li rimette: adatta sul testo cotto, la chiave segue lo stile, le varianti, rc', () => {
  const L = leggi('tasselli.js');
  assert.ok(/SE\.adatta\(FS\)/.test(L) && /key \+ SE\.chiave\(\)/.test(L) && /m\.__mapE = tessitura\(r\.mapE\)/.test(L) && /SE\.applica\(m\)/.test(L) && /o\.userData\.rc = r\.rc/.test(L) && /__materiali/.test(L));
  const R = leggi('render.js'); assert.ok(/Object\.assign\(TASSR\.uni, StileE\.U\)/.test(R), 'le manopole fra le uniform di modulo');
});
prova('un solo posto per il difetto: PV_STILE_PREDEFINITO in index.src.html', () => {
  const H = leggi('index.src.html'), m = H.match(/window\.PV_STILE_PREDEFINITO = '([AE])'/g) || []; assert.strictEqual(m.length, 1);
  assert.ok(H.indexOf('data-m="stile_e"') < H.indexOf('data-m="rifinitura_costruito"'), 'stile_e prima della rifinitura');
});
console.log(`\ntutte le prove passate (${ok})`);
