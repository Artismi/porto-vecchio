// il passo di main.js (PACE) su una serie di intervalli: 60 Hz con ±0,4 ms, uno scatto da 50 ms al fotogramma 100, poi il tetto a 30 dal 300
function run(nuovo) {
  const P = { avg: 1 / 60, debt: 0, off: 0 }, out = [];
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 500; i++) {
    let raw = (i >= 300 ? 1 / 30 : 1 / 60) + (rnd() - .5) * .0008; if (i === 100) raw = .05;
    if (!nuovo) { if (raw > 0 && raw < .25) P.avg += (raw - P.avg) * .08; }
    else if (raw > 0 && raw < .25) { if (Math.abs(raw - P.avg) < P.avg * .2) { P.avg += (raw - P.avg) * .08; P.off = 0; } else if (++P.off >= 4) { P.avg = raw; P.off = 0; } }
    const near = Math.abs(raw - P.avg) < P.avg * .2;
    let dtv = near ? P.avg : raw; P.debt += raw - dtv; const pay = P.debt * .1; dtv += pay; P.debt -= pay; if (!near) P.debt = 0;
    out.push([raw, Math.min(.05, Math.max(0, dtv))]);
  }
  const win = (a, b) => out.slice(a, b).map(([r, d]) => Math.abs(d - (a >= 300 ? 1 / 30 : 1 / 60)) * 1000);
  const mx = a => Math.max(...a).toFixed(2), mean = a => (a.reduce((s, x) => s + x, 0) / a.length).toFixed(3);
  return { dopo_scatto_max_ms: mx(win(101, 160)), dopo_scatto_medio_ms: mean(win(101, 160)), cambio30_max_ms: mx(win(304, 360)), regime_medio_ms: mean(win(200, 300)), deriva_ms: ((out.reduce((s, [r, d]) => s + d - r, 0)) * 1000).toFixed(1) };
}
console.log('prima', JSON.stringify(run(false)));
console.log('dopo ', JSON.stringify(run(true)));
