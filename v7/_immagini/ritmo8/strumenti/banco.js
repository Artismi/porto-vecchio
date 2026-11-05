// [ritmo8] il banco a passi: negli stessi posti, gli stessi passi (G.step + R.frame a 1/30 s, camminando verso un punto), i disegni spenti.
// Il tempo del PROCESSORE (tdur della traccia, il tempo del filo e non dell'orologio: regge la contesa con gli altri agenti), quanti raggi
// del braccio, quanti triangoli provati, i ms d'orologio. node banco.js <nome> [--pagina=...] [--q=...]
const fs = require('fs'), path = require('path');
const { avvia } = require('./lib.js');
const ARG = {}; const POS = []; for (const a of process.argv.slice(2)) { const m = /^--([a-z]+)(?:=(.*))?$/.exec(a); if (m) ARG[m[1]] = m[2] === undefined ? true : m[2]; else POS.push(a); }
const NOME = POS[0] || 'banco';
const L = JSON.parse(fs.readFileSync('/tmp/claude-0/-home-user/b7133111-ab7a-5dc5-8f88-7c780cd73e51/scratchpad/50motivi/camera/luoghi.json'));
(async () => {
  const H = await avvia({ q: ARG.q || '', pagina: ARG.pagina, disp: ARG.disp }); const { pg, cdp, log } = H; const RIS = { nome: NOME, posti: {} };
  try {
    await pg.evaluate(() => { window.__R8.muto = true; const st = window.__pv.st; st.t = Math.floor(st.t / 1440) * 1440 + 15 * 60; st.deadline = 1e12;
      setInterval(() => { const u = window.__pv.ui; u.dialog = null; u.book = false; st.over = null; st.chase = false; st.player.hp = 100; }, 200); });
    const V = L.vic_pescatori.pts, pz = L.piazza, lm = L.lungomare;
    const posti = { spawn: [L.spawn, [L.spawn[0] + 6, L.spawn[1] - 2]], vicolo: [V[4], V[16]], piazza: [[pz[0] - 8, pz[1]], [pz[0] + 8, pz[1] + 2]], lungomare: [[lm[0] - 10, lm[1]], [lm[0] + 12, lm[1]]] };
    for (const [nome, [a, b]] of Object.entries(posti)) {
      // in posizione e i primi passi (i tasselli e le griglie arrivano), col giro di main.js fermo
      await pg.evaluate(async ({ a, b }) => { const pv = window.__pv, st = pv.st, p = st.player, G = pv.G, R = pv.R; window.PV_ATTESA.on = () => true;
        let q = a; if (!G.walkM(a[0], a[1])) { outer: for (let r = .5; r < 8; r += .5) for (let k = 0; k < 6.28; k += .4) { const z = [a[0] + Math.cos(k) * r, a[1] + Math.sin(k) * r]; if (G.walkM(z[0], z[1])) { q = z; break outer; } } }
        p.x = q[0]; p.y = q[1]; p.path = []; p.vehicle = null; if (R.camReset) R.camReset(); R.snap(st); R.cam.ppx = undefined;
        const h = Math.atan2(b[1] - q[1], b[0] - q[0]); R.cam.uy = Math.atan2(-Math.cos(h), -Math.sin(h)) - R.YAW; p.face = h;
        window.__B = { ui: { zoom: .5, time: pv.ui.time || 0, stick: null, lead: null, tilt: 0, rot: 0, drag: 0, edge: 0, puntatore: false, reale: 1 / 30, mira: null }, a: q, b };
        for (let i = 0; i < 60; i++) { const B = window.__B, dx = b[0] - p.x, dy = b[1] - p.y, l = Math.hypot(dx, dy); const inp = l > .8 ? { x: dx / l, y: dy / l, mag: .6 } : { x: 0, y: 0 };
          G.step(st, 1 / 30, inp); B.ui.time += 1 / 30; pv.ui.time = B.ui.time; R.frame(st, 1 / 30, B.ui); if (i % 6 === 0) await new Promise(r => setTimeout(r, 30)); } }, { a, b });
      for (let k = 0; k < 20; k++) await pg.waitForTimeout(300);   // i giri dei moduli (tasselli, graffiti) recuperano
      // tre misure da 45 passi (avanti e indietro fra a e b), ognuna in UN compito (la traccia ne dà il tempo del filo)
      const mis = [];
      for (let rip = 0; rip < 3; rip++) {
        await cdp.send('Tracing.start', { traceConfig: { includedCategories: ['toplevel', 'devtools.timeline', 'v8'], recordMode: 'recordAsMuchAsPossible' }, transferMode: 'ReturnAsStream' });
        const r = await pg.evaluate((rip) => { const pv = window.__pv, st = pv.st, p = st.player, G = pv.G, R = pv.R, B = window.__B;
          const RI = THREE.Ray.prototype.intersectTriangle; let nT = 0; THREE.Ray.prototype.intersectTriangle = function () { nT++; return RI.apply(this, arguments); };
          const C = window.__C7M, c0 = C ? [C.chiamate || 0, C.memo || 0] : null; let colpi0 = window.__CAM7 ? window.__CAM7.colpi : 0;
          const m0 = performance.memory.usedJSHeapSize; const t0 = performance.now(); const fr = [];
          for (let i = 0; i < 45; i++) { const tg = (Math.floor(i / 45 + rip) % 2) ? B.a : B.b, dx = tg[0] - p.x, dy = tg[1] - p.y, l = Math.hypot(dx, dy), inp = l > .8 ? { x: dx / l, y: dy / l, mag: .6 } : { x: 0, y: 0 };
            const a = performance.now(); G.step(st, 1 / 30, inp); B.ui.time += 1 / 30; pv.ui.time = B.ui.time; R.frame(st, 1 / 30, B.ui); fr.push(performance.now() - a); }
          const ms = performance.now() - t0; THREE.Ray.prototype.intersectTriangle = RI; fr.sort((x, y) => x - y);
          return { ms: +ms.toFixed(1), msGiro: +(ms / 45).toFixed(2), p95: +fr[Math.floor(fr.length * .95)].toFixed(1), tri: Math.round(nT / 45), raggi: C ? Math.round(((C.chiamate || 0) - c0[0]) / 45 * 10) / 10 : null, memo: C ? (C.memo || 0) - c0[1] : null, heapMB: +((performance.memory.usedJSHeapSize - m0) / 1048576).toFixed(1), x: +p.x.toFixed(1), y: +p.y.toFixed(1) };
        }, rip);
        const fine = new Promise(res => cdp.once('Tracing.tracingComplete', res)); await cdp.send('Tracing.end'); const { stream } = await fine;
        let txt = ''; for (;;) { const c = await cdp.send('IO.read', { handle: stream }); txt += c.base64Encoded ? Buffer.from(c.data, 'base64').toString() : c.data; if (c.eof) break; } await cdp.send('IO.close', { handle: stream });
        const ev = JSON.parse(txt).traceEvents || JSON.parse(txt);
        const main = new Set(ev.filter(e => e.ph === 'M' && e.name === 'thread_name' && e.args && e.args.name === 'CrRendererMain').map(e => e.pid + ':' + e.tid));
        const tasks = ev.filter(e => e.ph === 'X' && main.has(e.pid + ':' + e.tid) && /RunTask|ThreadControllerImpl::RunTask/.test(e.name) && e.dur > 0).sort((x, y) => y.dur - x.dur);
        const gc = ev.filter(e => e.ph === 'X' && main.has(e.pid + ':' + e.tid) && /^(MinorGC|MajorGC|V8\.GC_SCAVENGER|V8\.GCScavenger|V8\.GCFinalizeMC|ScavengeGC)/.test(e.name)).reduce((s, e) => s + e.dur, 0);
        const T = tasks[0]; r.cpuMs = T && T.tdur ? +(T.tdur / 1000).toFixed(1) : null; r.cpuMsGiro = r.cpuMs ? +(r.cpuMs / 45).toFixed(2) : null; r.taskMs = T ? +(T.dur / 1000).toFixed(1) : null; r.gcMs = +(gc / 1000).toFixed(1);
        mis.push(r); log(nome, rip, JSON.stringify(r));
      }
      RIS.posti[nome] = mis;
    }
  } catch (e) { log('ERR', e.stack); RIS.err = e.message; }
  fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true }); fs.writeFileSync(path.join(__dirname, 'out', 'banco_' + NOME + '.json'), JSON.stringify(RIS, null, 1));
  await H.close();
})();
