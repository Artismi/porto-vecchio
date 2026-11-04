// [hd] la scala fine di peso_ritmo.js (v7/ANALISI_HD.md): passi del 5% fra la soglia (640 righe) e il massimo, mai sotto la soglia,
// al più un cambio ogni 2 s, poi il tetto a 30; col margine misurato dalla scheda video risale. node src/test_hd_ritmo.js
const fs = require('fs'), path = require('path'), vm = require('vm');
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };
function carica(q, R) {
  const win = { PV_HD: { on: k => !/[?&]hd=0\b/.test(q) && !new RegExp('[?&]' + k + '=0\\b').test(q) }, __pv: { R }, __pesoLivello: { livello: 'media' } };
  const ctx = { window: win, location: { search: q }, matchMedia: () => ({ matches: false }), console };
  vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(__dirname, 'peso_ritmo.js'), 'utf8'), ctx); return win.PesoRitmo;
}
function finto(leggero, gpu) {
  const R = { phone: leggero, res: leggero ? 640 / 1080 : 1, cambi: [], gpuTimes: { ok: true, ms: { scena: gpu, post: 0 } },
    hdScala() { return { kmin: 640 / 1080, lo: 640, hi: 1080, L: Math.round(1080 * this.res), leggero }; },
    setRes(k) { this.res = Math.max(640 / 1080, Math.min(1, k)); this.cambi.push(+this.res.toFixed(3)); return this.res; }, gpuTiming() { return true; } };
  return R;
}
// 1. sotto pressione dal massimo: scende a passi del 5% e mai sotto la soglia, poi il tetto
{ const R = finto(false, 30), P = carica('?leggera', R); let t = 0;
  for (let i = 0; i < 6000; i++) { t += 33; P.misura(t, .033, true); }   // 30 fps per 200 s
  const s = P.stato(); ok(s.hd, 'scala fine attiva');
  ok(Math.min(...R.cambi) >= 640 / 1080 - 1e-6, 'mai sotto 640 righe (min ' + Math.round(Math.min(...R.cambi) * 1080) + ')');
  let passo = 0; for (let i = 1; i < R.cambi.length; i++) passo = Math.max(passo, Math.abs(R.cambi[i] / R.cambi[i - 1] - 1)); ok(passo < .06, 'passi al più del 5% (max ' + (passo * 100).toFixed(1) + '%)');
  ok(s.tetto === 30, 'in fondo il tetto a 30'); }
// 2. un cambio ogni 2 s al più
{ const R = finto(false, 30), P = carica('?leggera', R); let t = 0, ultimo = null, minD = 1e9; P.misura(t += 33, .033, true); let n = R.cambi.length;   // (la prima: la scala di partenza)
  for (let i = 0; i < 3000; i++) { t += 33; P.misura(t, .033, true); if (R.cambi.length !== n) { if (ultimo !== null) minD = Math.min(minD, t - ultimo); ultimo = t; n = R.cambi.length; } }
  ok(minD >= 2000, 'fra due cambi almeno 2 s (min ' + minD + ' ms)'); }
// 3. il profilo leggero parte dalla soglia; con il margine (scheda video 4 ms) risale fino al massimo, a passi
{ const R = finto(true, 4), P = carica('?leggera', R); let t = 0;
  for (let i = 0; i < 4000; i++) { t += 16.7; P.misura(t, .0167, true); }
  ok(Math.abs(R.cambi[0] - 640 / 1080) < .002, 'parte da 640 righe'); ok(R.res > .99, 'con il margine sale a 1080 (' + Math.round(R.res * 1080) + ')'); }
// 4. ?hd=0 e ?regola=0: la scala di prima (1 · .9 · .8)
{ const R = finto(false, 30); delete R.hdScala; const P = carica('?leggera&hd=0', R); P.misura(33, .033, true); ok(!P.stato().hd && P.stato().scalaTutta.join() === '1,0.9,0.8', '?hd=0: la scala di prima'); }
{ const R = finto(false, 30), P = carica('?leggera&regola=0', R); let t = 0; for (let i = 0; i < 100; i++) { t += 33; P.misura(t, .033, true); } ok(!P.stato().hd, '?regola=0: la scala di prima'); }
console.log(fail ? fail + ' prove fallite' : 'tutto bene'); process.exit(fail ? 1 : 0);
