// [controlli8] le misure prima/dopo in Node (il mondo vero, la colla di main.js/render.js): node misure8.js → ../misure8.json
// ogni modo in un processo suo (COLLA=prima|dopo: il banco del mercato si piazza al primo create)
const { execFileSync } = require('child_process'), path = require('path'), fs = require('fs');
if (!process.env.COLLA) { const R = {}; for (const c of ['prima', 'dopo']) R[c] = JSON.parse(execFileSync(process.execPath, [__filename], { env: Object.assign({}, process.env, { COLLA: c }), maxBuffer: 1 << 26 }).toString().split('\n').filter(l => l.startsWith('{')).pop());
  fs.writeFileSync(path.resolve(__dirname, '../misure8.json'), JSON.stringify(R, null, 1)); console.log(JSON.stringify(R, (k, v) => k === 'tratti' ? undefined : v, 1)); return; }
const H = require('./nodo8.js'), { corsa, ang, D, basis } = H, T = require('./tratti8.js'), colla = process.env.COLLA, P0 = [1276, 268], R = {};
for (const fps of [60, 30]) {
  const L = corsa({ fps, colla, start: P0, yaw: 0, segs: [{ sec: .3, keys: {} }, { sec: 1, keys: { w: 1 } }] }), i0 = L.findIndex(q => q.seg === 1), a = L[i0 - 1];
  const G = corsa({ fps, colla, start: P0, yaw: 0, segs: [{ sec: 1.2, keys: { w: 1 } }, { sec: 1, keys: { s: 1 } }] }), j0 = G.findIndex(q => q.seg === 1), want = Math.atan2(G[j0].inp.y, G[j0].inp.x);
  const F = corsa({ fps, colla, start: P0, yaw: 0, segs: [{ sec: 1, keys: { w: 1, shift: 1 } }, { sec: 1, keys: {} }] }), k0 = F.findIndex(q => q.seg === 1), kf = F.slice(k0).findIndex(q => q.dsp < .05) + 1;
  R['fps' + fps] = { primaMossaFot: L.slice(i0).findIndex(q => Math.hypot(q.x - a.x, q.y - a.y) > .02) + 1, passo90Fot: L.slice(i0).findIndex(q => q.v > 3.24) + 1,
    giro180VistaS: (G.slice(j0).findIndex(q => Math.abs(ang(q.faceVis - want)) < 10 * D) + 1) / fps, giro180MotoreS: (G.slice(j0).findIndex(q => Math.abs(ang(q.face - want)) < 10 * D) + 1) / fps,
    marciaInvertitaS: (G.slice(j0).findIndex(q => q.dsp > 3.24 && Math.cos(Math.atan2(q.y - G[j0 - 1].y, q.x - G[j0 - 1].x) - want) > 0) + 1) / fps, frenataCorsaS: kf / fps, frenataCorsaM: +Math.hypot(F[k0 + kf - 1].x - F[k0 - 1].x, F[k0 + kf - 1].y - F[k0 - 1].y).toFixed(2) };
}
{ const L = corsa({ fps: 30, colla, start: P0, yaw: 0, segs: [{ sec: 4, keys: { d: 1 } }, { sec: .5, keys: { w: 1 } }] }), iW = L.findIndex(q => q.seg === 1) + 1, q = L[iW], B = basis(q.yaw);
  R.dopo4sDiD = { ricentroGradi: +(ang(L[iW - 2].yaw - L[0].yaw) / D).toFixed(1), wDiLatoGradi: +(ang(Math.atan2(q.inp.y, q.inp.x) - Math.atan2(B.fz, B.fx)) / D).toFixed(1) }; }
{ const L = corsa({ fps: 60, colla, start: P0, yaw: 0, segs: [{ sec: 1, keys: {} }, ...['w', 's', 'a', 'd', 'w'].map(k => ({ sec: .5, keys: { [k]: 1, shift: 1 } })), { sec: .6, keys: {} }] }), r0 = L[55]; let m = 0;
  L.forEach(q => { m = Math.max(m, Math.hypot((q.sx - r0.sx) * 16 / 9, q.sy - r0.sy)); }); R.derivaSchermoWSADW = +(m * 100).toFixed(1); }
const out = []; R.tratti30 = T.prova(colla, 30, ['levetta', 'tasti8', 'tasti8 corsa'], out); R.tratti = out;
R.scala = out.filter(o => /scala del Mercato/.test(o.tratto)).map(o => ({ tratto: o.tratto, modo: o.modo, s: o.s, intoppi: o.intoppi }));
console.log(JSON.stringify(R));
