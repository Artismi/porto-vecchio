// [integra1] la prova della cottura: i 5 posti di fumetto2 (sonde/luoghi.json: vicolo, sbocco, lungomare, piazza, sera) dagli STESSI tasselli
// cotti, lo stesso istante in A e in E (StileE.imposta dal vivo: le manopole degli shader, le varianti dei materiali, il passo unico).
// Senza leggera, piena qualità. node cattura.js <query> <prefisso> [posti] [varianti]
//   PV_ROOT=<v7 col suo tasselli/>  W=1920 H=1080 (per difetto)
// Il passo a passi è quello di fumetto2 (sonde/passo7.js corsa): la variante si cambia con R.stile, qui avvolto da StileE.imposta.
const path = require('path'), fs = require('fs');
const F2 = path.join(__dirname, '..', '..', 'fumetto2', 'sonde');
const { avvia } = require(path.join(F2, 'lib.js')); const { corsa } = require(path.join(F2, 'passo7.js'));
const Q = process.argv[2] || '', PRE = process.argv[3] || 'tas', SOLO = (process.argv[4] || '').split(',').filter(Boolean), VAR = (process.argv[5] || 'A,E').split(',');
const VP = { width: +(process.env.W || 1920), height: +(process.env.H || 1080) }, OUT = path.join(__dirname, 'f');
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  let H = await avvia({ vp: VP, query: Q }); const log = H.log;
  const prepara = async () => {
    // la variante dal vivo: R.stile('A'|'E') diventa StileE.imposta (che poi chiama il R.stile vero per il passo unico)
    await H.S(() => { const R = window.__pv.R; if (R.__stileVero) return; const vero = R.stile; R.__stileVero = vero;
      const f = R.stile; R.stile = function (v) { if (typeof StileE === 'undefined' || !/^[AE]$/.test(String(v))) return vero(v); R.stile = vero; try { StileE.imposta(v); } finally { R.stile = f; } return v; }; });
    // i tasselli attorno ai posti, subito (Tasselli.finisci tiene in scena quelli entro r)
    return H.S(() => ({ tasselli: typeof Tasselli !== 'undefined' && Tasselli.attivo(), stile: typeof StileE !== 'undefined' ? StileE.stato() : null, imp: window.PV_IMPRONTA_TASS }));
  };
  log('stato', JSON.stringify(await prepara()));
  const L = JSON.parse(fs.readFileSync(path.join(F2, 'luoghi.json'))); const V = L.vic_pescatori.pts, LT = L.vic_lanternini.pts.slice().reverse(), pz = L.piazza, lm = L.lungomare;
  const posti = {
    vicolo: { ora: 11, start: V[0], verso: V[3], foto: 0, segs: [{ sec: 5, percorso: V, mag: .5 }, { sec: .6 }] },
    sbocco: { ora: 16, start: LT[0], verso: LT[3], foto: 0, segs: [{ sec: 7.5, percorso: LT.concat([[pz[0], pz[1]], [pz[0] + 10, pz[1] - 6]]), mag: .5 }, { sec: .6 }] },
    lungomare: { ora: 11, start: [lm[0] - 15, lm[1]], verso: [lm[0], lm[1]], foto: 0, segs: [{ sec: 4.5, percorso: [[lm[0] + 25, lm[1]]], mag: 1 }, { sec: .6 }] },
    piazza: { ora: 13, start: [pz[0] - 10, pz[1]], verso: [pz[0], pz[1]], foto: 0, segs: [{ sec: 3, percorso: [[pz[0] + 10, pz[1]]], mag: .5 }, { sec: .6 }] },
    sera: { ora: 19.3, start: [pz[0] + 10, pz[1]], verso: [pz[0] - 10, pz[1]], foto: 0, segs: [{ sec: 3, percorso: [[pz[0] - 10, pz[1]]], mag: .5 }, { sec: .6 }] },
  };
  const esito = {};
  for (const posto of Object.keys(posti)) { if (SOLO.length && !SOLO.includes(posto)) continue; const t0 = Date.now();
    for (let k = 0; k < 2; k++) { try {
        const P = JSON.parse(JSON.stringify(posti[posto])); P.varianti = VAR; P.tempi = 1;
        await H.S(async a => { if (typeof Tasselli !== 'undefined' && Tasselli.attivo() && Tasselli.finisci) { const p = window.__pv.st.player; p.x = a[0]; p.y = a[1]; window.__pv.R.snap(window.__pv.st); await Promise.race([Tasselli.finisci(60), new Promise(r => setTimeout(r, 120000))]); }   /* al più due minuti: poi i tasselli arrivano coi fotogrammi della corsa */ }, P.start);
        const r = await corsa(H.pg, P);
        r.var.forEach(([v, url]) => fs.writeFileSync(path.join(OUT, `${PRE}_${posto}_${v}.png`), Buffer.from(url.split(',')[1], 'base64')));
        esito[posto] = { stato: r.var.map(x => [x[0], x[2]]), tasselli: await H.S(() => typeof Tasselli !== 'undefined' && Tasselli.attivo() ? (({ mesh, vertici, materiali, tessiture }) => ({ mesh, vertici, materiali, tessiture }))(window.__tasselli) : null) };
        log(posto, ((Date.now() - t0) / 1000).toFixed(0) + 's', JSON.stringify(r.var.map(x => [x[0], x[2].ms]))); break; }
      catch (e) { log('crash', posto, String(e.message).slice(0, 200)); try { await H.close(); } catch (x) { } H = await avvia({ vp: VP, query: Q }); await prepara(); } } }
  try { esito.__prog = await H.S(() => { const rd = window.__pv.R.__models.renderer; return { programmi: rd.info.programs.length, stile: StileE.stato() }; }); } catch (e) { }
  // la diagnosi: in E quanti materiali in scena hanno la variante accesa e quanti programmi portano le manopole
  try { esito.__diag = await H.S(async () => { const R = window.__pv.R, sc = R.__models.scene, rd = R.__models.renderer; const conta = () => { const vis = new Set(), d = { tinta: 0, tessitura: 0, soloE: 0, soloEvisibili: 0, rsK: 0, rcK: 0, tasselli: 0 };
      sc.traverse(o => { if (!o.material) return; [].concat(o.material).forEach(m => { if (!m || vis.has(m)) return; vis.add(m); const u = m.userData || {}; if (u.tassello) d.tasselli++; if (u.rcE) d.tinta++; if (m.__mapE && m.map === m.__mapE) d.tessitura++; if (u.rcSolo) { d.soloE++; if (m.visible) d.soloEvisibili++; }
        const p = rd.properties.get(m), pr = p && p.currentProgram; if (pr && pr.getUniforms) { const U = pr.getUniforms().map; if (U.rsK) d.rsK++; if (U.rcK) d.rcK++; } }); }); return d; };
      StileE.imposta('A'); R.frame(window.__pv.st, 1e-3, { zoom: .5, time: 1, stick: null, lead: null, tilt: 0, rot: 0, drag: 0, edge: 0, puntatore: false, reale: 1e-3, mira: null }); const a = conta();
      StileE.imposta('E'); R.frame(window.__pv.st, 1e-3, { zoom: .5, time: 1, stick: null, lead: null, tilt: 0, rot: 0, drag: 0, edge: 0, puntatore: false, reale: 1e-3, mira: null }); const e = conta(); return { A: a, E: e }; }); } catch (e) { esito.__diag = String(e.message).slice(0, 200); }
  fs.writeFileSync(path.join(__dirname, `esito_${PRE}.json`), JSON.stringify(esito, null, 1));
  try { await H.close(); } catch (x) { }
  log('fine');
})();
