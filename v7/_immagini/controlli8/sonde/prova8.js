// [controlli8] la prova nel gioco vero (Chromium headless, SwiftShader, a passi): node prova8.js prima|dopo
//   prima = ?nofixcontrolli8 (com'era), dopo = il passo pronto e i comandi rispetto alla vista. Scrive ../prova8_<modo>.json e le foto
//   della Scala del Mercato (giù e su) in ../filmstrip_scala_<modo>_giu.jpg e _su.jpg
const path = require('path'), fs = require('fs');
const { avvia, provino } = require('./lib.js'), { corsa } = require('./passo8.js');
const modo = process.argv[2] === 'prima' ? 'prima' : 'dopo', OUT = path.resolve(__dirname, '..'), TMP = process.env.TMP8 || path.join(OUT, 'sonde', 'tmp_' + modo);
const GIU = [[1281, 342.4], [1286.6, 342.4], [1288.84, 342.6], [1288.84, 347.42], [1289, 349], [1292, 349.5]];
const SU = GIU.slice().reverse();
(async () => {
  fs.mkdirSync(TMP, { recursive: true });
  const { pg, log, close } = await avvia({ query: 'tassellivecchi' + (modo === 'prima' ? '&nofixcontrolli8' : '') });
  const R = { modo };
  try {
    // 1. la latenza: fermi, W: i fotogrammi (a 30 fps) alla prima mossa visibile (> 2 cm) e al 90% del passo; poi il dietrofront (S)
    { const o = await corsa(pg, { start: [1276, 268], verso: [1276, 250], dt: 1 / 30, foto: 0, segs: [{ sec: .3, keys: {} }, { sec: 1, keys: { w: 1 } }, { sec: .8, keys: { s: 1 } }] });
      const L = o.log, i0 = L.findIndex(q => q.seg === 1), a = L[i0 - 1]; R.primaMossa = L.slice(i0).findIndex(q => Math.hypot(q.x - a.x, q.y - a.y) > .02) + 1; R.passo90 = L.slice(i0).findIndex(q => q.dsp > 3.24) + 1;
      const j0 = L.findIndex(q => q.seg === 2), want = Math.atan2(L[j0].inp[1], L[j0].inp[0]); R.dietrofrontFaccia = (L.slice(j0).findIndex(q => Math.abs(Math.atan2(Math.sin(q.face - want), Math.cos(q.face - want))) < .175) + 1) / 30;
      R.dietrofrontMarcia = (L.slice(j0).findIndex(q => q.dsp > 3.24 && ((q.x - L[j0 - 1].x) * Math.cos(want) + (q.y - L[j0 - 1].y) * Math.sin(want)) > 0) + 1) / 30;
      log('latenza', R.primaMossa, R.passo90, R.dietrofrontFaccia, R.dietrofrontMarcia); }
    // 2. la base dei tasti: D per 4 s (il ricentro gira la camera), poi W: di quanto W va di lato sullo schermo
    { const o = await corsa(pg, { start: [1276, 268], verso: [1276, 250], dt: 1 / 15, foto: 0, segs: [{ sec: 4, keys: { d: 1 } }, { sec: .6, keys: { w: 1 } }] });
      const L = o.log, iW = L.findIndex(q => q.seg === 1) + 1, q = L[iW], md = Math.atan2(q.inp[1], q.inp[0]), fwd = Math.atan2(-Math.cos(q.yaw), -Math.sin(q.yaw));
      R.ricentroGiro = +((Math.atan2(Math.sin(L[iW - 2].yaw - L[0].yaw), Math.cos(L[iW - 2].yaw - L[0].yaw))) * 57.3).toFixed(1); R.wDiLato = +(Math.atan2(Math.sin(md - fwd), Math.cos(md - fwd)) * 57.3).toFixed(1);
      log('base', R.ricentroGiro, R.wDiLato); }
    // 3. la Scala del Mercato: giù dalla Piazza dell'Ottagono e su, coi tasti (il pilota umano), al passo; le foto ogni 0,4 s
    for (const [nome, P] of [['giu', GIU], ['su', SU]]) {
      const o = await corsa(pg, { start: P[0], verso: P[2], dt: 1 / 30, foto: .4, segs: [{ sec: 9, percorso: P }] });
      const L = o.log, k = o.arrivato[0], fin = k ? L.filter(q => q.t - L[0].t <= k + 1e-6) : L;
      let snag = 0, run = 0; for (const q of fin) { if ((q.inp[0] || q.inp[1]) && q.dsp < 3.6 * .3) { run++; if (run === 5) snag++; } else run = 0; }
      let dz = 0, dyaw = 0, armMin = 99, sxMin = 1, sxMax = 0, syMin = 1, syMax = 0; for (let i = 1; i < fin.length; i++) { dz = Math.max(dz, Math.abs(fin[i].gh - fin[i - 1].gh)); dyaw = Math.max(dyaw, Math.abs(Math.atan2(Math.sin(fin[i].yaw - fin[i - 1].yaw), Math.cos(fin[i].yaw - fin[i - 1].yaw))) * 30 * 57.3);
        if (fin[i].arm !== null) armMin = Math.min(armMin, fin[i].arm); sxMin = Math.min(sxMin, fin[i].sx); sxMax = Math.max(sxMax, fin[i].sx); syMin = Math.min(syMin, fin[i].sy); syMax = Math.max(syMax, fin[i].sy); }
      R['scala_' + nome] = { s: k, intoppi: snag, salitaFot: +dz.toFixed(3), giroCameraMax: +dyaw.toFixed(0), bracciomin: armMin, schermoX: [sxMin, sxMax], schermoY: [syMin, syMax], fine: [L[L.length - 1].x, L[L.length - 1].y] };
      log('scala', nome, JSON.stringify(R['scala_' + nome]));
      const files = o.fotos.map(([t, url, s]) => { const f = path.join(TMP, `scala_${nome}_${t.toFixed(1)}.jpg`); fs.writeFileSync(f, Buffer.from(url.split(',')[1], 'base64')); return [f, `${modo} ${t.toFixed(1)}s braccio ${s.arm} schermo ${s.sx},${s.sy}`]; });
      provino(files, path.join(OUT, `filmstrip_scala_${modo}_${nome}.jpg`), `[controlli8] Scala del Mercato ${nome === 'giu' ? 'giù dalla Piazza dell\'Ottagono' : 'su verso la piazza'} — ${modo === 'prima' ? '?nofixcontrolli8 (com\'era)' : 'dopo'} · tasti, pilota umano, ${k ? k.toFixed(2) + ' s' : 'non arriva'} · intoppi ${snag}`, 6, 320, 180);
      R['scala_' + nome].log = L.filter((q, i) => i % 3 === 0);
    }
  } catch (e) { log('ERRORE', e.message); R.errore = e.message; }
  fs.writeFileSync(path.join(OUT, `prova8_${modo}.json`), JSON.stringify(R, null, 1));
  await close();
})();
