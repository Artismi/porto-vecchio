// [camera7] la prova: i cinque posti dell'audit e i comandi, a passi; node prova7.js nuovo|vecchio [posti]
const { avvia, OUT } = require('./lib'); const { corsa } = require('./passo7'); const fs = require('fs'), path = require('path');
const MODO = process.argv[2] || 'nuovo', SOLO = (process.argv[3] || '').split(',').filter(Boolean);
(async () => {
  fs.mkdirSync(path.join(OUT, 'f'), { recursive: true });
  const Q = (MODO === 'vecchio' ? 'nofixcamera7&' : '') + 'leggera&tassellivecchi', VP = { width: 640, height: 360 };
  let H = await avvia({ vp: VP, query: Q }); const log = H.log;
  const L = JSON.parse(fs.readFileSync(OUT + '/luoghi.json')); const sp = L.spawn, V = L.vic_pescatori.pts, LT = L.vic_lanternini.pts.slice().reverse(), pz = L.piazza, lm = L.lungomare;
  const nuovo = MODO === 'nuovo';
  const posti = {
    spawn: Object.assign({ start: sp, foto: 1, segs: [{ sec: 1 }, { sec: 4, keys: { w: 1 } }, { sec: 1.01 }] }, nuovo ? { avvio: true } : { verso: [sp[0] + 1, sp[1] + 1] }),
    vicolo: { start: V[0], verso: V[3], foto: 1, segs: [{ sec: 8, percorso: V, mag: .5 }] },
    sbocco: { start: LT[0], verso: LT[3], foto: 1, segs: [{ sec: 8, percorso: LT.concat([[pz[0], pz[1]], [pz[0] + 10, pz[1] - 6]]), mag: .5 }] },
    lungomare: { start: [lm[0] - 15, lm[1]], verso: [lm[0], lm[1]], foto: 1.5, segs: [{ sec: 6, percorso: [[lm[0] + 25, lm[1]]], mag: 1 }] },
    piazza: { start: [pz[0] - 10, pz[1]], verso: [pz[0], pz[1]], foto: 1, segs: [{ sec: 3, percorso: [[pz[0] + 10, pz[1]]], mag: .5 }, { sec: 3, drag: 1.2 }] },
    mira: { start: [pz[0] - 6, pz[1]], verso: [pz[0], pz[1]], foto: 1, segs: [{ sec: .5 }, { sec: 2.5, mira: 1, drag: .8 }] },
    ShiftW: { start: sp, verso: [sp[0] + 1, sp[1] + 1], foto: 0, segs: [{ sec: 2, keys: { w: 1, shift: 1 } }, { sec: 2, keys: { w: 1 } }] },
    muro: { start: V[2], verso: [V[2][0] + 10, V[2][1]], foto: 0, segs: [{ sec: 3, keys: { w: 1 } }] },
    salto: { start: [pz[0] - 6, pz[1]], verso: [pz[0], pz[1]], foto: 0, segs: [{ sec: 1.5, salta: .1, jump: 2 / 30 }] },
  };
  const RES = {};
  for (const posto of Object.keys(posti)) { if (SOLO.length && !SOLO.includes(posto)) continue; const t0 = Date.now();
    for (let k = 0; k < 3; k++) { try { const r = await corsa(H.pg, JSON.parse(JSON.stringify(posti[posto])));
        RES[posto] = r.log; r.fotos.forEach(([t, url, s], i) => fs.writeFileSync(path.join(OUT, 'f', `${MODO}_${posto}_${String(i).padStart(2, '0')}.jpg`), Buffer.from(url.split(',')[1], 'base64')));
        fs.writeFileSync(path.join(OUT, `log_${MODO}_${posto}.json`), JSON.stringify({ log: r.log, fotos: r.fotos.map(f => [f[0], f[2]]) }));
        log(posto, ((Date.now() - t0) / 1000).toFixed(0) + 's', r.fotos.length + ' foto', JSON.stringify(r.log.at(-1))); break; }
      catch (e) { log('crash', posto, String(e.message).slice(0, 120)); try { await H.close(); } catch (x) { } H = await avvia({ vp: VP, query: Q }); } } }
  if (MODO === 'nuovo') try { const A = await H.pg.evaluate(() => { const pv = window.__pv, R = pv.R, p = pv.st.player, camera = R.getCamera(), out = [];   // le chiome: chi copre il personaggio, col suo programma
      for (const [x, y, f] of [[1271, 351.5, .39], [1268, 350.2, .39]]) { p.x = x; p.y = y; p.face = f; const ui = { zoom: .5, time: pv.ui.time, reale: 1 / 15 }; for (let i = 0; i < 6; i++) { pv.G.step(pv.st, 1 / 15, { x: 0, y: 0 }); R.frame(pv.st, 1 / 15, ui); }
        const rc = new THREE.Raycaster(), o = camera.position.clone(), t = new THREE.Vector3(p.x, R.groundH(p.x, p.y) + 1.1, p.y), d = t.clone().sub(o), L = d.length(); d.normalize(); rc.set(o, d); rc.far = L; rc.camera = camera; const hs = [], rd = R.__models.renderer;
        R.__models.scene.traverseVisible(q => { if (q.isMesh) try { rc.intersectObject(q, false, hs); } catch (e) { } }); hs.sort((a, b) => a.distance - b.distance);
        hs.slice(0, 6).forEach(h => { const m = Array.isArray(h.object.material) ? h.object.material[h.face ? h.face.materialIndex : 0] : h.object.material, pr = rd.properties.get(m), pg = pr && pr.currentProgram; let fs = ''; try { fs = pg ? rd.getContext().getShaderSource(pg.fragmentShader) || '' : ''; } catch (e) { }
          out.push({ x, d: +h.distance.toFixed(1), t: h.object.type, inst: !!h.object.isInstancedMesh, mt: m && m.type, key: m && m.customProgramCacheKey ? String(m.customProgramCacheKey()).slice(0, 40) : '', tass: !!(m && m.userData && m.userData.tassello), r7: fs.indexOf('uR7') >= 0, vwp: fs.indexOf('vWP') >= 0, ucm: fs.indexOf('uCm') >= 0, vk: fs.indexOf('vgN') >= 0, cam: [o.x, o.y, o.z].map(v => +v.toFixed(1)) }); }); }
      const cens = {}; const rd = R.__models.renderer; R.__models.scene.traverseVisible(q => { if (!q.isMesh) return; const ms = Array.isArray(q.material) ? q.material : [q.material]; for (const m of ms) { if (!m) continue; const k = (m.customProgramCacheKey ? String(m.customProgramCacheKey()).slice(0, 30) : '') + (m.userData && m.userData.tassello ? '|tas' : '') + (q.isInstancedMesh ? '|inst' : '');
        const pr = rd.properties.get(m), pg = pr && pr.currentProgram; let fs = ''; try { fs = pg ? rd.getContext().getShaderSource(pg.fragmentShader) || '' : ''; } catch (e) { } if (fs.indexOf('vSnow') < 0 && fs.indexOf('vgN') < 0 && !/natMat|veg/.test(k)) continue; const c = cens[k] || (cens[k] = { n: 0, r7: 0 }); c.n++; if (fs.indexOf('uR7') >= 0) c.r7++; } });
      out.push({ censimento: cens, r7: R.__cam7 && Vegetazione && Vegetazione.U && Vegetazione.U.uR7 ? Vegetazione.U.uR7.value : null });
      return out; }); log('chiome', JSON.stringify(A)); } catch (e) { log('chiome ERR', String(e.message).slice(0, 200)); }
  try { await H.close(); } catch (x) { }
})();
