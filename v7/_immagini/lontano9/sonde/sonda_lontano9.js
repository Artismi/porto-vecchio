// [lontano9] IL BANCO DEI DODICI POSTI della tavola di camera9 (camera9/sonde/tavola9.js): oggi, camera9 senza lontano9, camera9 con
// lontano9; per ognuno i disegni e i triangoli di un fotogramma intero (renderer.info, tutti i passaggi), i disegni della vista
// principale per distanza e per genere, i ms del processore (G.step + R.frame coi disegni di WebGL spenti: il costo di three e del
// gioco, non di SwiftShader), la memoria (heap JS, geometrie, tessiture, programmi), e le foto.
//   node sonda_lontano9.js [query] [uscita.json] [foto: 1/0] [posti: 0,3,4...]     MODI=oggi,c9,c9l  W9/H9 la finestra  TOCCO9=1 il telefono
const path = require('path'), fs = require('fs');
const { avvia } = require('../../controlli8/sonde/lib.js'), { posa } = require('../../camera9/sonde/passo9.js');
const OUT = path.resolve(__dirname, '..'), TMP = process.env.TMP9 || '/tmp/claude-0/-home-user/b7133111-ab7a-5dc5-8f88-7c780cd73e51/scratchpad/lontano9';
const Q = process.argv[2] || 'leggera&tassellivecchi', FILE = process.argv[3] || 'banco.json', FOTO = process.argv[4] !== '0', SOLO = process.argv[5] ? process.argv[5].split(',').map(Number) : null;
const MODI = (process.env.MODI || 'oggi,c9').split(',');   // c9: senza e con lontano9 nello stesso stato
// la memoria dei processi del navigatore (figli di questo node): la scheda video (SwiftShader: la memoria della scheda sta lì) e la pagina
function rss() { const { execFileSync } = require('child_process'); const L = execFileSync('ps', ['-eo', 'pid=,ppid=,rss=,args=']).toString().trim().split('\n').map(l => { const m = l.trim().match(/^(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/); return m && { pid: +m[1], ppid: +m[2], rss: +m[3], a: m[4] }; }).filter(Boolean);
  const mine = new Set([process.pid]); let ch = true; while (ch) { ch = false; for (const q of L) if (!mine.has(q.pid) && mine.has(q.ppid)) { mine.add(q.pid); ch = true; } }
  let gpu = 0, pag = 0; for (const q of L) if (mine.has(q.pid)) { if (/--type=gpu-process/.test(q.a)) gpu += q.rss; else if (/--type=renderer/.test(q.a)) pag += q.rss; } return { gpuMB: Math.round(gpu / 1024), paginaMB: Math.round(pag / 1024) }; }
const scrivi = (url, f) => { fs.writeFileSync(f, Buffer.from(url.split(',')[1], 'base64')); return f; };
(async () => {
  fs.mkdirSync(TMP, { recursive: true });
  const { pg, log, close } = await avvia({ query: Q, vp: { width: +(process.env.W9 || 800), height: +(process.env.H9 || 450) }, touch: !!process.env.TOCCO9 });
  const fileOut = path.join(OUT, FILE); let prec = {}; try { prec = JSON.parse(fs.readFileSync(fileOut)); } catch (e) { }
  try {
    const RD = await pg.evaluate(() => { const W = window.__pv.G.MAP.world, o = {}; for (const r of W.roads) if (/^vic_|cavour/.test(r.id)) o[r.id] = { pts: r.pts.map(q => [+q[0].toFixed(2), +q[1].toFixed(2)]) }; return o; });
    const V = n => RD[n].pts, mid = (n, f) => { const P = V(n), i = Math.max(0, Math.min(P.length - 2, Math.floor((P.length - 1) * f))); return [P[i], P[Math.min(P.length - 1, i + 3)]]; };
    const pz = [1383, 303], lm = [1421, 399];
    const POSTI = [
      ['vicolo stretto (Caruggio dei Pescatori)', ...mid('vic_pescatori', .45)],
      ['Vico Lungo (a metà)', ...mid('vic_lungo', .5)],
      ['piazza San Rocco', [pz[0] - 8, pz[1] + 1], [pz[0] + 10, pz[1] - 1]],
      ['sbocco sulla piazza (Vicolo dei Lanternini)', [1372.1, 296.5], [1373, 310.6]],
      ['lungomare', [lm[0] - 6, lm[1]], [lm[0] + 20, lm[1]]],
      ['cima della Scala del Mercato', [1288.84, 342.9], [1288.84, 347.4]],
      ['cima della Scalinata di Vico Lungo', V('vic_lungo')[1], V('vic_lungo')[4]],
      ['Salita dei Gatti (a metà)', ...mid('vic_gatti', .5)],
      ['Vico della Corte (fessura 2,2 m)', [1420, 362], [1432, 362]],
      ['Corte dei Pescatori (fessura 2,2 m)', [1388, 360], [1396, 360]],
      ['Androne del Pozzo Vecchio (fessura 2,2 m)', [1412, 292], [1422, 292]],
      ['sottopasso del Vico del Glacis', [1477, 292], [1490, 294]],
    ];
      const misura = () => pg.evaluate(() => { const pv = window.__pv, Rr = pv.R, rd = Rr.__models.renderer, cam = Rr.getCamera(), gl = rd.getContext(), DT = 1 / 30;
          const on = v => { if (gl.__vero) for (const k in gl.__vero) gl[k] = v ? gl.__vero[k] : function () { }; };
          const ui = { zoom: .5, time: pv.ui.time, stick: null, lead: null, tilt: 0, rot: 0, drag: 0, edge: 0, puntatore: false, reale: DT, mira: null };
          const fr = () => { ui.time += DT; pv.ui.time = ui.time; pv.G.step(pv.st, DT, { x: 0, y: 0 }); Rr.frame(pv.st, DT, ui); };
          // un fotogramma coi disegni accesi: il conto di three e i disegni della vista per distanza e genere
          on(true); const rb = rd.renderBufferDirect, v = new THREE.Vector3(), B = {}, G = {}; let n = 0;
          rd.renderBufferDirect = function (camera, scene, geometry, material, object, group) {
            if (camera === cam) { const bs = geometry.boundingSphere; if (bs) v.copy(bs.center).applyMatrix4(object.matrixWorld); else object.getWorldPosition(v); let d = v.distanceTo(cam.position); if (bs) d = Math.max(0, d - bs.radius * object.matrixWorld.getMaxScaleOnAxis());
              const b = d < 30 ? '0-30' : d < 80 ? '30-80' : d < 150 ? '80-150' : '150+', ud = Object.keys(object.userData || {}).slice(0, 2).join('+'), g = (object.isInstancedMesh ? 'inst:' : object.isSkinnedMesh ? 'pers:' : object.isSprite ? 'sprite:' : '') + (material.type || '').replace(/Mesh|Material/g, '') + (ud ? '|' + ud : '') + (object.name ? '|' + object.name.slice(0, 18) : '');
              B[b] = (B[b] || 0) + 1; (G[g] || (G[g] = [0, 0, 0]))[0]++; if (d >= 30) G[g][1]++; if (d >= 80) G[g][2]++; n++; }
            return rb.apply(this, arguments); };
          // due fotogrammi (sul profilo leggero l'ombra del sole si ridisegna a fotogrammi alterni): la media; la vista del primo
          const ar = rd.info.autoReset; rd.info.autoReset = false; if (window.Lontano9) Lontano9.azzera(); let calls = 0, tri = 0, L9a = null;
          for (let f = 0; f < 2; f++) { rd.info.reset(); fr(); calls += rd.info.render.calls / 2; tri += rd.info.render.triangles / 2; if (f === 0) { rd.renderBufferDirect = rb; L9a = window.Lontano9 ? Lontano9.conto() : null; } } rd.info.autoReset = ar; calls = Math.round(calls); tri = Math.round(tri);
          const L9 = L9a;
          // il processore: 16 fotogrammi coi disegni spenti
          on(false); const ms = []; for (let i = 0; i < 16; i++) { const a = performance.now(); fr(); ms.push(performance.now() - a); } ms.sort((a, b) => a - b);
          const mem = performance.memory ? performance.memory.usedJSHeapSize : 0, im = rd.info.memory;
          return { disegni: calls, triangoli: tri, vista: n, perDistanza: B, generi: Object.entries(G).sort((a, b) => b[1][0] - a[1][0]).slice(0, 24), msMed: +ms[8].toFixed(2), msP90: +ms[14].toFixed(2), heapMB: +(mem / 1048576).toFixed(0), geometrie: im.geometries, tessiture: im.textures, programmi: rd.info.programs ? rd.info.programs.length : 0,
            far: +cam.far.toFixed(0), l9: L9 && { prove: L9.prove, occluse: L9.occluse, piccole: L9.piccole, colonne: L9.colonne, ms: +L9.ms.toFixed(2), on: L9.on } }; });
    for (let ip = 0; ip < POSTI.length; ip++) { if (SOLO && !SOLO.includes(ip)) continue; const [nome, at, verso] = POSTI[ip]; const t0 = Date.now(); const riga = { i: ip, nome, at, verso };
      for (const modo of MODI) {
        const c9 = modo !== 'oggi'; await pg.evaluate(() => { if (window.Lontano9) Lontano9.attivo = false; });
        const r = await posa(pg, { at, verso, c9, assesta: 2.5, foto: FOTO });
        // i tasselli che la vista chiede devono arrivare (scaricati, aperti, saliti alla scheda video a fette): fotogrammi e attese finché
        // niente è in volo e il numero delle mesh resta fermo per un secondo (al più 25 s)
        let fermo = 0, prima = -1; for (let k = 0; k < 120 && fermo < 7; k++) { const t = await pg.evaluate(() => { const pv = window.__pv, Rr = pv.R, DT = 1 / 30, ui = { zoom: .5, time: pv.ui.time, stick: null, lead: null, tilt: 0, rot: 0, drag: 0, edge: 0, puntatore: false, reale: DT, mira: null };
            for (let i = 0; i < 3; i++) { ui.time += DT; pv.ui.time = ui.time; pv.G.step(pv.st, DT, { x: 0, y: 0 }); Rr.frame(pv.st, DT, ui); } const T = window.__tasselli; return T && T.on ? { v: (T.inVolo || 0) + (T.inApertura || 0), m: T.mesh } : { v: 0, m: 0 }; });
          if (t.v === 0 && t.m === prima) fermo++; else fermo = 0; prima = t.m; await pg.waitForTimeout(150); }
        if (FOTO && r.url) riga['foto_' + modo] = scrivi(r.url, path.join(TMP, `p${ip}_${modo}_${Q.replace(/\W+/g, '_')}.jpg`));
        // camera9: prima e dopo nello stesso stato (gli stessi tasselli arrivati, lo stesso fotogramma del mondo): senza, poi con lontano9
        for (const sub of c9 ? ['c9', 'c9l'] : ['oggi']) {
          await pg.evaluate(l => { if (window.Lontano9) Lontano9.attivo = l; }, sub === 'c9l');
          const m = await misura();
          Object.assign(m, rss()); riga[sub] = Object.assign({ stato: { vista: r.s.vista, arm: r.s.arm, sfondoAlto: r.s.sfondoAlto } }, m);
          log(ip, nome, sub, JSON.stringify({ d: m.disegni, v: m.vista, tri: m.triangoli, ms: m.msMed, heap: m.heapMB, gpu: m.gpuMB, pag: m.paginaMB, geo: m.geometrie, tex: m.tessiture, prog: m.programmi, B: m.perDistanza, l9: m.l9 })); }
      }
      prec.query = Q; prec['p' + ip] = riga; fs.writeFileSync(fileOut, JSON.stringify(prec, null, 1)); log('posto', ip, ((Date.now() - t0) / 1000).toFixed(0) + 's');
    }
  } catch (e) { log('ERRORE', e.message, e.stack); }
  log('FINE'); await close();
})();
