// [ritmo8] il percorso misurato: nascita → vicolo → piazza → lungomare → 30 s in auto → la tavoletta dei graffiti, a tempo vero,
// i disegni spenti (R8.muto: il processore fa tutto, SwiftShader non riempie pixel). Per tratto: i giri (ms di JS per giro),
// il profilo del processore (Profiler), le allocazioni (HeapProfiler a campioni), GC, long task, chiamate WebGL, disegni e triangoli.
//   node percorso.js <nome> [--q=hd=0&nofixcamera7...] [--disp=telefono] [--disegni] [--noprof] [--root=...]
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const { avvia } = require('./lib.js');
const ARG = {}; const POS = []; for (const a of process.argv.slice(2)) { const m = /^--([a-z]+)(?:=(.*))?$/.exec(a); if (m) ARG[m[1]] = m[2] === undefined ? true : m[2]; else POS.push(a); }
const NOME = POS[0] || 'prova', OUT = path.join(__dirname, 'out', NOME); fs.mkdirSync(OUT, { recursive: true });
const L = JSON.parse(fs.readFileSync('/tmp/claude-0/-home-user/b7133111-ab7a-5dc5-8f88-7c780cd73e51/scratchpad/50motivi/camera/luoghi.json'));
// righe di index.html → modulo (<script data-m="…">)
function mappaModuli(file) {
  const righe = fs.readFileSync(file, 'utf8').split('\n'), M = []; righe.forEach((r, i) => { const m = /<script[^>]*data-m="([^"]+)"/.exec(r); if (m) M.push([i, m[1]]); }); return M; }
const pq = (a, q) => { if (!a.length) return 0; const b = a.slice().sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(b.length * q))]; };
const media = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
(async () => {
  const root = ARG.root || '/home/user/porto-vecchio/.claude/worktrees/ritmo8/v7';
  const MOD = mappaModuli(ARG.pagina || path.join(root, 'index.html')); const modulo = l => { let n = '?'; for (const [i, m] of MOD) { if (i <= l) n = m; else break; } return n; };
  const H = await avvia({ q: ARG.q || '', disp: ARG.disp, root, pagina: ARG.pagina }); const { pg, cdp, log } = H;
  try { const kids = execSync(`ps -o pid= --ppid ${process.pid}`).toString().trim(); fs.writeFileSync(path.join(__dirname, 'browser.pid'), kids); log('i miei pid', kids.replace(/\s+/g, ',')); } catch (e) { }
  const RIS = { nome: NOME, q: ARG.q || '', disp: ARG.disp || 'portatile', quando: new Date().toISOString(), tratti: {} };
  try {
    await pg.evaluate(({ muto }) => {
      const pv = window.__pv, st = pv.st; window.PV_ATTESA && (window.PV_ATTESA.on = () => false);
      st.deadline = 1e12; st.t = Math.floor(st.t / 1440) * 1440 + 15 * 60;   // le 15: luce del giorno, uguale in ogni corsa
      try { const inv = Oggetti.inv(st); inv.bomboletta = 6; inv.pennarello = 2; } catch (e) { }
      setInterval(() => { const u = pv.ui; u.dialog = null; u.book = false; st.over = null; st.chase = false; st.player.hp = 100; st.deadline = 1e12; }, 200);
      window.__R8.muto = !!muto;
    }, { muto: !ARG.disegni });
    await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 400 }); await cdp.send('HeapProfiler.enable'); await cdp.send('Performance.enable');
    const info0 = await pg.evaluate(() => ({ hd: window.__pv.R.hdStato && window.__pv.R.hdStato(), prof: window.PV_PROFILO }));
    RIS.info0 = info0; log(JSON.stringify(info0));
    // un tratto: fa(...) gira dentro la pagina e rende quando ha finito; intorno il profilo e le misure
    async function tratto(nome, fa, arg) {
      const m0 = (await cdp.send('Performance.getMetrics')).metrics.reduce((o, m) => (o[m.name] = m.value, o), {});
      await pg.evaluate(() => window.__R8.reset());
      if (!ARG.noprof) { await cdp.send('Profiler.start'); await cdp.send('HeapProfiler.startSampling', { samplingInterval: 16384, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true }); }
      const tp0 = await pg.evaluate(() => performance.now());
      const prog0 = await pg.evaluate(() => (window.__pv.R.__models.renderer.info.programs || []).map(p => p.id));
      const t0 = Date.now(); let esito = null;
      try { esito = await pg.evaluate(fa, arg); } catch (e) { esito = { err: e.message }; log('tratto', nome, 'errore', e.message); }
      const wall = (Date.now() - t0) / 1000;
      let prof = null, heap = null; if (!ARG.noprof) { prof = (await cdp.send('Profiler.stop')).profile; heap = (await cdp.send('HeapProfiler.stopSampling')).profile; }
      const m1 = (await cdp.send('Performance.getMetrics')).metrics.reduce((o, m) => (o[m.name] = m.value, o), {});
      const D = await pg.evaluate((p0) => { const r = window.__R8.prendi(), R = window.__pv.R, rd = R.__models.renderer;
        const pr = rd.info.programs || [], nuovi = pr.filter(p => !p0.includes(p.id)).map(p => (p.name || '') + ' ' + String(p.cacheKey || '').replace(/,+/g, ',').slice(0, 90));
        const C = window.__C7M, Tt = window.__tasselli, A = window.Writing && (Writing.ARTW || (Writing._ && Writing._.ARTW));
        const r8 = { c7: C ? { chiamate: C.chiamate || 0, memo: C.memo || 0, ms: +(C.ms || 0).toFixed(1) } : null, tas: Tt ? { griglie: Tt.r8griglie, grigliaMs: Tt.r8grigliaMs, pile: Tt.r8pile, pileFatte: Tt.r8pileFatte, raggiV: Tt.raggiV } : null, artw: A ? { ok: A.ok, seq: A.seq, q: A.q.length, lastOk: !!A.lastOk } : null };
        if (C) { C.chiamate = 0; C.memo = 0; C.ms = 0; }
        return Object.assign(r, { r8, programmiNuovi: nuovi, info: { progs: rd.info.programs ? rd.info.programs.length : 0, tex: rd.info.memory.textures, geo: rd.info.memory.geometries }, hd: R.hdStato && R.hdStato(), ritmo: window.__ritmo, mem: performance.memory ? { used: performance.memory.usedJSHeapSize, tot: performance.memory.totalJSHeapSize } : null }); }, prog0);
      // i giri
      const G = D.giri.filter(g => g.ts >= tp0), js = G.map(g => g.js), main = G.map(g => g.main || 0), dts = []; for (let i = 1; i < G.length; i++) dts.push(G[i].ts - G[i - 1].ts);
      const T = { esito, wall: +wall.toFixed(1), giri: G.length, fps: +(G.length / Math.max(.001, (D.t1 - tp0) / 1000)).toFixed(1),
        jsMs: { media: +media(js).toFixed(2), p50: +pq(js, .5).toFixed(2), p95: +pq(js, .95).toFixed(2), p99: +pq(js, .99).toFixed(2), max: +Math.max(0, ...js).toFixed(1) },
        mainMs: { media: +media(main).toFixed(2), p95: +pq(main, .95).toFixed(2), p99: +pq(main, .99).toFixed(2) },
        intervallo: { media: +media(dts).toFixed(2), p95: +pq(dts, .95).toFixed(1), p99: +pq(dts, .99).toFixed(1), max: +Math.max(0, ...dts).toFixed(0), oltre50: dts.filter(d => d > 50).length, oltre100: dts.filter(d => d > 100).length },
        disegni: { media: Math.round(media(G.map(g => g.dr || 0))), max: Math.max(0, ...G.map(g => g.dr || 0)), triangoli: Math.round(media(G.map(g => g.prim || 0))) },
        longtask: D.lt.filter(l => l[0] >= tp0), cicli: Object.entries(D.cb).map(([k, v]) => ({ k, n: v.n, msGiro: +(v.ms / Math.max(1, G.length)).toFixed(3), max: +v.max.toFixed(1) })).sort((a, b) => b.msGiro - a.msGiro).slice(0, 14),
        gl: Object.entries(D.gl).map(([k, v]) => ({ k, n: v.n, ms: +v.ms.toFixed(1), max: +v.max.toFixed(1), MB: +(v.byte / 1048576).toFixed(1) })).sort((a, b) => b.ms - a.ms).slice(0, 16), glLento: D.glLog.slice(0, 40),
        metriche: { TaskDuration: +(m1.TaskDuration - m0.TaskDuration).toFixed(2), ScriptDuration: +(m1.ScriptDuration - m0.ScriptDuration).toFixed(2), LayoutDuration: +(m1.LayoutDuration - m0.LayoutDuration).toFixed(3), RecalcStyleDuration: +(m1.RecalcStyleDuration - m0.RecalcStyleDuration).toFixed(3), LayoutCount: m1.LayoutCount - m0.LayoutCount, RecalcStyleCount: m1.RecalcStyleCount - m0.RecalcStyleCount, JSHeapUsedMB: +(m1.JSHeapUsedSize / 1048576).toFixed(1), Nodes: m1.Nodes },
        info: D.info, hd: D.hd, r8: D.r8, siti: D.siti, programmiNuovi: D.programmiNuovi, ritmo: D.ritmo && { scala: D.ritmo.scala, cambi: D.ritmo.cambi, tetto: D.ritmo.tetto }, mem: D.mem };
      T.metriche.taskMsGiro = +(T.metriche.TaskDuration * 1000 / Math.max(1, G.length)).toFixed(2);
      // il profilo: tempo proprio per funzione e per modulo; GC; i campioni dentro i long task
      if (prof) {
        const byId = new Map(); prof.nodes.forEach(n => byId.set(n.id, n)); const self = new Map(); const dt = prof.timeDeltas; let tot = 0;
        const par = new Map(); prof.nodes.forEach(n => (n.children || []).forEach(c => par.set(c, n.id)));
        const nomeN = n => { const cf = n.callFrame; return (cf.functionName || '(anon)') + (cf.url ? '@' + modulo(cf.lineNumber) + ':' + (cf.lineNumber + 1) : ''); };
        const perMod = new Map(), incl = new Map();
        const tS = []; let t = prof.startTime; for (let i = 0; i < prof.samples.length; i++) { t += dt[i]; tS.push(t); }
        const offs = prof.startTime / 1000 - tp0;   // ms del profilo → performance.now
        const ltS = T.longtask.map(l => ({ a: l[0], b: l[0] + l[1], d: l[1], f: new Map() }));
        for (let i = 0; i < prof.samples.length; i++) {
          const d = (dt[i + 1] !== undefined ? dt[i + 1] : 0) / 1000; const n = byId.get(prof.samples[i]); const k = nomeN(n); tot += d;
          self.set(k, (self.get(k) || 0) + d); const cf = n.callFrame, md = cf.url ? modulo(cf.lineNumber) : cf.functionName.startsWith('(') ? cf.functionName : 'nativo'; perMod.set(md, (perMod.get(md) || 0) + d);
          const vis = new Set(); let id = n.id; while (id !== undefined) { const q = byId.get(id), kk = nomeN(q); if (!vis.has(kk)) { vis.add(kk); incl.set(kk, (incl.get(kk) || 0) + d); } id = par.get(id); }
          const ts = tS[i] / 1000 - offs - (prof.startTime / 1000 - tp0) + (prof.startTime / 1000 - tp0); // (performance.now approssimato)
          const tpn = tS[i] / 1000 - prof.startTime / 1000 + tp0;
          for (const l of ltS) if (tpn >= l.a - 2 && tpn <= l.b + 2) { let id2 = n.id, s = ''; const ch = []; while (id2 !== undefined && ch.length < 6) { const q = byId.get(id2); if (q.callFrame.url || q.callFrame.functionName) ch.push(nomeN(q)); id2 = par.get(id2); } s = ch.slice(0, 4).join(' < '); l.f.set(s, (l.f.get(s) || 0) + d); }
        }
        const N = Math.max(1, G.length);
        T.prof = { totMs: +tot.toFixed(0), giri: N,
          self: [...self].sort((a, b) => b[1] - a[1]).slice(0, 40).map(([k, v]) => [k, +(v / N).toFixed(3)]),
          incl: [...incl].sort((a, b) => b[1] - a[1]).slice(0, 60).map(([k, v]) => [k, +(v / N).toFixed(3)]),
          moduli: [...perMod].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([k, v]) => [k, +(v / N).toFixed(3)]),
          gcMsGiro: +((self.get('(garbage collector)') || 0) / N).toFixed(3) };
        T.longtask = ltS.map(l => ({ t: +l.a.toFixed(0), ms: l.d, chi: [...l.f].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => [k, +v.toFixed(1)]) }));
        fs.writeFileSync(path.join(OUT, nome + '.cpuprofile'), JSON.stringify(prof));
      }
      if (heap) {
        const allB = new Map(); let totB = 0; const visita = (n, st) => { const cf = n.callFrame, k = (cf.functionName || '(anon)') + (cf.url ? '@' + modulo(cf.lineNumber) + ':' + (cf.lineNumber + 1) : ''); if (n.selfSize) { allB.set(k, (allB.get(k) || 0) + n.selfSize); totB += n.selfSize; } (n.children || []).forEach(c => visita(c)); };
        visita(heap.head); const N = Math.max(1, G.length);
        T.alloc = { totMB: +(totB / 1048576).toFixed(1), kbGiro: +(totB / 1024 / N).toFixed(1), top: [...allB].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => [k, +(v / 1024 / N).toFixed(2)]) };
      }
      RIS.tratti[nome] = T;
      log(`${nome}: ${T.wall}s ${T.giri} giri ${T.fps} fps · JS/giro media ${T.jsMs.media} p95 ${T.jsMs.p95} p99 ${T.jsMs.p99} max ${T.jsMs.max} · intervallo p99 ${T.intervallo.p99} >50:${T.intervallo.oltre50} · task/giro ${T.metriche.taskMsGiro} · gc/giro ${T.prof && T.prof.gcMsGiro} · alloc ${T.alloc && T.alloc.kbGiro} kB/giro · LT ${T.longtask.length} · disegni ${T.disegni.media} · ${JSON.stringify(esito).slice(0, 200)}`);
      fs.writeFileSync(path.join(OUT, 'risultati.json'), JSON.stringify(RIS, null, 1));
    }
    // ---- i tratti, dentro la pagina ----
    // il tempo è quello del GIOCO (ui.time): a 3-5 fotogrammi al secondo di SwiftShader il personaggio fa per fotogramma quello che farebbe a 20
    const vai = async ({ dest, max }) => { const pv = window.__pv, st = pv.st, p = st.player; const g0 = pv.ui.time, t0 = performance.now(); let n = 0;
      for (const d of dest) { pv.goTo(d[0], d[1]); const ga = pv.ui.time; let px = p.x, py = p.y, fermo = 0;
        while (pv.ui.time - g0 < max && performance.now() - t0 < 1500000) { await new Promise(r => setTimeout(r, 150)); if (Math.hypot(p.x - d[0], p.y - d[1]) < 2.5) break;
          if (pv.ui.time - ga > 3 && Math.hypot(p.x - px, p.y - py) < .01) { if (++fermo > 25) break; } else fermo = 0; px = p.x; py = p.y; } n++; }
      return { x: +p.x.toFixed(1), y: +p.y.toFixed(1), giocoS: +(pv.ui.time - g0).toFixed(1), ms: Math.round(performance.now() - t0), tappe: n }; };
    const metti = ({ x, y, verso }) => { const pv = window.__pv, st = pv.st, p = st.player, G = pv.G, R = pv.R; let a = [x, y];
      if (!G.walkM(x, y)) { outer: for (let r = .5; r < 8; r += .5) for (let k = 0; k < 6.28; k += .4) { const q = [x + Math.cos(k) * r, y + Math.sin(k) * r]; if (G.walkM(q[0], q[1])) { a = q; break outer; } } }
      p.x = a[0]; p.y = a[1]; p.vehicle = null; p.indoor = null; p.lv = null; p.path = []; if (R.camReset) R.camReset(); R.snap(st); R.cam.ppx = undefined;
      if (verso) { const h = Math.atan2(verso[1] - a[1], verso[0] - a[0]); R.cam.uy = Math.atan2(-Math.cos(h), -Math.sin(h)) - R.YAW; p.face = h; } return a; };
    const fermo = async ({ sec }) => { const pv = window.__pv, g0 = pv.ui.time, t0 = performance.now(); while (pv.ui.time - g0 < sec && performance.now() - t0 < 600000) await new Promise(r => setTimeout(r, 150)); return { giocoS: +(pv.ui.time - g0).toFixed(1) }; };
    const sp = L.spawn, V = L.vic_pescatori.pts, pz = L.piazza, lm = L.lungomare;
    await pg.evaluate(metti, { x: sp[0], y: sp[1], verso: V[0] }); await pg.waitForTimeout(4000);
    await tratto('0_fermo', fermo, { sec: ARG.fermo ? +ARG.fermo : 12 });
    await tratto('1_vicolo', vai, { dest: [V[0], V[8], V[16], V[V.length - 1]], max: 45 });
    await tratto('2_piazza', async ({ pz, vai }) => { const r = await (new Function('return ' + vai)())({ dest: [pz], max: 30 }); const pv = window.__pv, g0 = pv.ui.time; while (pv.ui.time - g0 < 3) { pv.ui.drag = (pv.ui.drag || 0) + .04; await new Promise(r => setTimeout(r, 60)); } return r; }, { pz, vai: vai.toString() });
    await tratto('3_lungomare', vai, { dest: [lm, [lm[0] + 25, lm[1]], [lm[0] + 40, lm[1] - 2]], max: 40 });
    // l'auto: la più vicina parcheggiata (una macchina, non vespe né barche), dentro, 30 s di gas con lo sterzo verso i punti della strada
    await tratto('4_auto', async ({ sec }) => {
      const pv = window.__pv, st = pv.st, p = st.player, G = pv.G, K = pv.keys;
      const auto = st.vehicles.filter(v => !v.traffic && !v.wreck && !v.hidden && /^(cinquecento|ritmo|giulia|panda|uno|127)$/.test(v.kind)).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
      if (!auto) return { err: 'nessuna auto' };
      p.x = auto.x + Math.cos(auto.ang + Math.PI / 2) * 1.2; p.y = auto.y + Math.sin(auto.ang + Math.PI / 2) * 1.2; p.path = [];
      const r = G.act(st, 'veicolo'); if (!p.vehicle) return { err: 'non salito', r, kind: auto.kind };
      // la strada: i punti delle vie più vicine
      const W = G.MAP.world; let best = null; for (const rd of W.roads || []) { if (!rd.pts || rd.pts.length < 3) continue; for (let i = 0; i < rd.pts.length; i++) { const d = Math.hypot(rd.pts[i][0] - auto.x, rd.pts[i][1] - auto.y); if (!best || d < best.d) best = { d, rd, i }; } }
      const P = best ? best.rd.pts : [[auto.x + 50, auto.y]]; let k = best ? best.i : 0, dir = 1, segno = 0, giri = 0, urti = 0; const t0 = performance.now(), g0 = pv.ui.time; let ang0 = auto.ang, tS = 0, lastX = auto.x, lastY = auto.y, fermoT = 0;
      for (const q in K) K[q] = false;
      while (pv.ui.time - g0 < sec && performance.now() - t0 < 1200000) {
        const v = st.vehicles.find(q => q.id === p.vehicle); if (!v) break;
        // il prossimo punto (andata e ritorno lungo la via)
        while (Math.hypot(P[k][0] - v.x, P[k][1] - v.y) < 6) { k += dir; if (k >= P.length || k < 0) { dir = -dir; k = Math.max(0, Math.min(P.length - 1, k + 2 * dir)); giri++; } }
        const want = Math.atan2(P[k][1] - v.y, P[k][0] - v.x), err = Math.atan2(Math.sin(want - v.ang), Math.cos(want - v.ang));
        // il segno dello sterzo si impara: A tenuto per 0,4 s e si guarda come gira
        if (!segno) { K.w = true; K.a = true; const ga = pv.ui.time; while (pv.ui.time - ga < .5) await new Promise(r => setTimeout(r, 50)); const d = Math.atan2(Math.sin(v.ang - ang0), Math.cos(v.ang - ang0)); segno = d > 0 ? 1 : -1; K.a = false; continue; }
        K.w = true; K.s = false; K.a = err * segno > .08; K.d = err * segno < -.08;
        const gN = pv.ui.time; if (Math.hypot(v.x - lastX, v.y - lastY) < .05) fermoT += gN - (tS || gN); else fermoT = 0; lastX = v.x; lastY = v.y; tS = gN;
        if (fermoT > 1.5) { urti++; K.w = false; K.s = true; const ga = pv.ui.time; while (pv.ui.time - ga < .8) await new Promise(r => setTimeout(r, 50)); K.s = false; fermoT = 0; }
        await new Promise(r => setTimeout(r, 60));
      }
      for (const q in K) K[q] = false; const v = st.vehicles.find(q => q.id === p.vehicle);
      return { kind: v && v.kind, x: v && +v.x.toFixed(0), y: v && +v.y.toFixed(0), segno, giri, urti, via: best && best.rd.id, giocoS: +(pv.ui.time - g0).toFixed(1) };
    }, { sec: 30 });
    // la tavoletta: giù dall'auto, in piazza, la camera girata finché davanti c'è un muro; Writing.apri (la stessa strada del clic: tavShot + tavPad), 4 s col pannello, Esc
    await pg.evaluate(() => { const pv = window.__pv; if (pv.st.player.vehicle) pv.G.act(pv.st, 'veicolo'); });
    await pg.evaluate(metti, { x: pz[0] + 6, y: pz[1] + 4, verso: [pz[0] + 20, pz[1]] }); await pg.evaluate(fermo, { sec: 2 });
    await tratto('5_tavoletta', async () => {
      const pv = window.__pv, st = pv.st, R = pv.R; st.player.hand = 'bomboletta'; try { Writing.setMode(st, 'tavoletta'); } catch (e) { }
      let ok = false, k = 0, tA = 0; const g0 = pv.ui.time;
      for (; k < 16 && !ok; k++) { R.cam.uy += Math.PI / 8; const ga = pv.ui.time; while (pv.ui.time - ga < .3) await new Promise(r => setTimeout(r, 50));
        const a = performance.now(); try { ok = Writing.apri(st, {}); } catch (e) { ok = false; } tA = performance.now() - a; }
      const pad = !!(Writing._ && Writing._.TAV.pad); const ga = pv.ui.time, t1 = performance.now(); while (performance.now() - t1 < 8000) await new Promise(r => setTimeout(r, 100));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await new Promise(r => setTimeout(r, 1500)); return { ok, tentativi: k, apriMs: +tA.toFixed(1), pad, chiuso: !(Writing._ && Writing._.TAV.pad) };
    });
    await tratto('6_dopo', fermo, { sec: 6 });
  } catch (e) { log('ERR', e.stack); RIS.err = e.message; }
  fs.writeFileSync(path.join(OUT, 'risultati.json'), JSON.stringify(RIS, null, 1));
  await H.close(); log('fine');
})();
