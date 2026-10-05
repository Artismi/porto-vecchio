  // ================= [muri1] MURI VIVI: manifesti, stendardi, bandiere, murales =================
  // Meno schermi del regime, più carta, stoffa e vernice. Tutto montato come si deve: i manifesti incollati a strati sul
  // muro pieno del piano terra, spiegazzati, con gli angoli che si staccano; gli stendardi appesi a un'asta con le staffe;
  // le bandiere su un'asta inclinata fissata al muro; i murales dipinti sui tratti ciechi, con la vernice che si scrosta.
  // Stoffa che si muove col vento (vertex shader, fase dalla posizione: si possono fondere in un'unica mesh).
  const MV = { t: { value: 0 }, tex: {}, mats: {} };
  function mvCanvas(W, H, fn) { const c = mk(W, H), x = c.getContext('2d'); fn(x, W, H); const t = canvasTex(c); return t; }
  function mvAge(x, W, H, r, torn) {   // macchie, sbiadito, colle, strappi
    x.globalCompositeOperation = 'source-atop';
    x.fillStyle = 'rgba(214,204,184,' + (.08 + r() * .14) + ')'; x.fillRect(0, 0, W, H);
    for (let i = 0; i < W * H / 14; i++) { x.fillStyle = r() < .55 ? 'rgba(30,24,20,.10)' : 'rgba(235,228,210,.10)'; x.fillRect(Math.floor(r() * W), Math.floor(r() * H), 1 + Math.floor(r() * 2), 1); }
    for (let i = 0; i < 3; i++) { x.fillStyle = 'rgba(70,58,40,.16)'; const cx = r() * W; x.fillRect(Math.floor(cx), Math.floor(r() * H * .4), 1, Math.floor(H * (.2 + r() * .5))); }   // colature di colla
    x.globalCompositeOperation = 'destination-out';
    if (torn) for (let i = 0; i < 10 + r() * 14; i++) { const e = r(); const ex = e < .25 ? 0 : e < .5 ? W : r() * W, ey = e < .25 || e < .5 ? r() * H : (e < .75 ? 0 : H); x.beginPath(); x.ellipse(ex, ey, 1 + r() * W * .12, 1 + r() * H * .07, r() * 3, 0, 7); x.fill(); }
    x.globalCompositeOperation = 'source-over';
  }
  function mvFit(x, txt, W, fs0, font) { let fs = fs0; x.font = font.replace('#', fs); while (x.measureText(txt).width > W && fs > 6) { fs--; x.font = font.replace('#', fs); } return fs; }
  const MV_FONT = 'bold #px Impact, "Arial Black", sans-serif', MV_SER = 'bold #px Georgia, "Times New Roman", serif';
  // --- manifesti: 6 famiglie, carta stampata, colori da tipografia (non neon) ---
  function mvPoster(k) {
    const key = 'p' + k; if (MV.tex[key]) return MV.tex[key];
    const r = rng(k * 613 + 7), kind = k % 6, red = '#8e2a22', ink = '#1a1512', paper = '#d9cfba';
    return MV.tex[key] = mvCanvas(64, 90, (x, W, H) => {
      x.textAlign = 'center'; x.textBaseline = 'middle';
      if (kind === 0) {   // bando della Tutela
        x.fillStyle = paper; x.fillRect(0, 0, W, H); x.fillStyle = red; x.fillRect(0, 0, W, 16); x.fillStyle = paper; mvFit(x, 'BANDO', W - 8, 13, MV_FONT); x.fillText('BANDO', W / 2, 8.5);
        x.fillStyle = ink; x.beginPath(); x.ellipse(W / 2, 30, 10, 6, 0, 0, 7); x.fill(); x.fillStyle = paper; x.beginPath(); x.arc(W / 2, 30, 3, 0, 7); x.fill();
        x.fillStyle = 'rgba(26,21,18,.75)'; for (let i = 0; i < 10; i++) x.fillRect(6, 42 + i * 4, W - 12 - Math.floor(r() * 18), 1.5);
        x.strokeStyle = red; x.lineWidth = 2; x.beginPath(); x.arc(W - 14, H - 12, 7, 0, 7); x.stroke();
      } else if (kind === 1) {   // la Risacca: l'onda nera
        x.fillStyle = '#ddd3bd'; x.fillRect(0, 0, W, H); x.fillStyle = ink; x.beginPath(); x.moveTo(0, 54);
        for (let i = 0; i <= 8; i++) x.quadraticCurveTo(i * 8 + 4, 30 - (i % 2) * 10, i * 8 + 8, 48); x.lineTo(W, H); x.lineTo(0, H); x.fill();
        x.fillStyle = red; const t = pick(r, ['IL MARE TORNA', 'RISACCA', 'NON TACERE', 'SIAMO MAREA']); mvFit(x, t, W - 6, 13, MV_FONT); x.fillText(t, W / 2, 14);
      } else if (kind === 2) {   // scomparsi
        x.fillStyle = '#e2ddd0'; x.fillRect(0, 0, W, H); x.fillStyle = ink; mvFit(x, 'SCOMPARSO', W - 6, 11, MV_FONT); x.fillText('SCOMPARSO', W / 2, 9);
        x.fillStyle = '#6a645c'; x.fillRect(14, 18, 36, 40); x.fillStyle = '#3a3630'; x.beginPath(); x.arc(32, 33, 9, 0, 7); x.fill(); x.fillRect(19, 44, 26, 14);
        x.fillStyle = 'rgba(26,21,18,.7)'; for (let i = 0; i < 5; i++) x.fillRect(8, 64 + i * 4, W - 16 - Math.floor(r() * 14), 1.5);
      } else if (kind === 3) {   // concerto in cantina
        const bg = pick(r, ['#c08a2e', '#7a2a24', '#2e3a2a']); x.fillStyle = bg; x.fillRect(0, 0, W, H);
        x.fillStyle = ink; for (let i = 0; i < 5; i++) x.fillRect(0, 22 + i * 7, W, 3);
        x.fillStyle = '#e8dcc0'; const t = pick(r, ['LA CASSA', 'MAREMOTO', 'I CARBONAI', 'NEBBIA']); mvFit(x, t, W - 6, 15, MV_FONT); x.fillText(t, W / 2, 12);
        x.fillStyle = ink; mvFit(x, 'SABATO · 23', W - 8, 9, MV_FONT); x.fillText('SABATO · 23', W / 2, H - 14);
      } else if (kind === 4) {   // tessera annonaria
        x.fillStyle = '#cfc6ae'; x.fillRect(0, 0, W, H); x.strokeStyle = 'rgba(26,21,18,.6)'; x.lineWidth = 1;
        for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(4, 24 + i * 10); x.lineTo(W - 4, 24 + i * 10); x.stroke(); } x.beginPath(); x.moveTo(W / 2, 24); x.lineTo(W / 2, 74); x.stroke();
        x.fillStyle = ink; mvFit(x, 'RAZIONI', W - 8, 12, MV_SER); x.fillText('RAZIONI', W / 2, 11);
        x.strokeStyle = red; x.lineWidth = 2; x.save(); x.translate(44, 64); x.rotate(-.3); x.strokeRect(-12, -6, 24, 12); x.restore();
      } else {   // il Garante, stampa a due colori
        x.fillStyle = red; x.fillRect(0, 0, W, H);
        if (typeof garanteFace === 'function') garanteFace(x, W, H, 6, 6, 1.6, ink, '#d8c8b0', '#d8c8b0', r() < .3);
        x.fillStyle = ink; x.fillRect(0, H - 20, W, 20); x.fillStyle = '#d8c8b0'; const t = pick(r, ['TI ASCOLTA', 'VEGLIA', 'ORDINE']); mvFit(x, t, W - 6, 12, MV_FONT); x.fillText(t, W / 2, H - 10);
      }
      mvAge(x, W, H, r, true);
    });
  }
  // --- murales: dipinti dalla gente sui muri ciechi, colori di vernice da muro, scrostati ---
  function mvMural(k, tall) {
    const key = 'm' + k + (tall ? 't' : ''); if (MV.tex[key]) return MV.tex[key];
    const r = rng(k * 271 + 3);
    return MV.tex[key] = mvCanvas(tall ? 96 : 192, tall ? 136 : 64, (x, W, H) => {
      const P = pick(r, [['#b8643a', '#2f4a3a', '#d9c49a', '#7a2a24', '#1c1a18'], ['#c99a3c', '#5a2a2a', '#e0d3b4', '#2a3a4a', '#1a1816'], ['#8a4a3a', '#c8a050', '#d8ccb0', '#3a4a30', '#161412']]);
      const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, P[2]); g.addColorStop(1, P[0]); x.fillStyle = g; x.fillRect(0, 0, W, H);
      x.fillStyle = P[0]; x.beginPath(); x.arc(W * (.15 + r() * .2), H * .32, 12, 0, 7); x.fill();   // il sole basso
      x.fillStyle = P[1]; x.beginPath(); x.moveTo(0, H * .6);   // l'onda
      for (let i = 0; i <= 12; i++) x.quadraticCurveTo(i * 16 + 8, H * (.32 + (i % 2) * .2), i * 16 + 16, H * .58); x.lineTo(W, H); x.lineTo(0, H); x.fill();
      x.fillStyle = P[4]; const n = 5 + Math.floor(r() * 5);   // la gente, sagome in fila
      for (let i = 0; i < n; i++) { const cx = 20 + i * (W - 40) / Math.max(1, n - 1) + (r() - .5) * 6, hh = 18 + r() * 8; x.beginPath(); x.arc(cx, H - hh - 5, 3.2, 0, 7); x.fill(); x.fillRect(cx - 3.5, H - hh - 2, 7, hh); if (r() < .4) x.fillRect(cx + 3, H - hh - 10, 1.5, 9); }
      x.fillStyle = P[3]; x.textAlign = 'center'; x.textBaseline = 'middle'; const t = pick(r, ['IL MARE NON SI ARRESTA', 'SIAMO LA RISACCA', 'PANE · LEGNA · LIBERTÀ', 'QUESTA È LA NOSTRA RIVA']);
      mvFit(x, t, W - 20, 14, MV_FONT); x.fillText(t, W / 2, 11);
      // la vernice si scrosta e lascia vedere il muro; colature
      x.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 40; i++) { x.beginPath(); x.ellipse(r() * W, r() * H, 1 + r() * 7, 1 + r() * 4, r() * 3, 0, 7); x.fillStyle = 'rgba(0,0,0,' + (.4 + r() * .6) + ')'; x.fill(); }
      for (let i = 0; i < 600; i++) { x.fillStyle = 'rgba(0,0,0,' + (r() * .5) + ')'; x.fillRect(Math.floor(r() * W), Math.floor(r() * H), 1, 1); }
      x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(200,192,176,.18)'; x.fillRect(0, 0, W, H);   // sbiadito dal sale
      for (let i = 0; i < 14; i++) { x.fillStyle = 'rgba(20,16,12,.2)'; x.fillRect(Math.floor(r() * W), Math.floor(r() * H * .5), 1, 6 + Math.floor(r() * 18)); }
      x.globalCompositeOperation = 'source-over';
    });
  }
  // --- bandiere: la Tutela (rosso, l'occhio), la Risacca (osso, l'onda nera) ---
  function mvFlag(k) {
    const key = 'f' + k; if (MV.tex[key]) return MV.tex[key];
    const r = rng(k * 59 + 1);
    return MV.tex[key] = mvCanvas(48, 32, (x, W, H) => {
      if (k % 2 === 0) { x.fillStyle = '#8e2420'; x.fillRect(0, 0, W, H); x.fillStyle = '#16110f'; x.beginPath(); x.ellipse(W / 2, H / 2, 10, 6, 0, 0, 7); x.fill(); x.fillStyle = '#d8c8b0'; x.beginPath(); x.arc(W / 2, H / 2, 2.5, 0, 7); x.fill(); x.fillStyle = '#16110f'; x.fillRect(0, 0, W, 3); x.fillRect(0, H - 3, W, 3); }
      else { x.fillStyle = '#d6ccb4'; x.fillRect(0, 0, W, H); x.fillStyle = '#16110f'; x.beginPath(); x.moveTo(0, 22); for (let i = 0; i <= 6; i++) x.quadraticCurveTo(i * 8 + 4, 10 - (i % 2) * 5, i * 8 + 8, 20); x.lineTo(W, H); x.lineTo(0, H); x.fill(); }
      for (let i = 0; i < 120; i++) { x.fillStyle = 'rgba(20,16,12,.12)'; x.fillRect(Math.floor(r() * W), Math.floor(r() * H), 1, 1); }
      x.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 5; i++) { x.beginPath(); x.ellipse(W, r() * H, 1 + r() * 4, 1 + r() * 2, 0, 0, 7); x.fill(); } x.globalCompositeOperation = 'source-over';   // sfilacciata in punta
    });
  }
  // --- materiali: carta (statica), vernice (piatta), stoffa (si muove) ---
  function mvPaperMat(t) { return new THREE.MeshLambertMaterial({ map: t, transparent: false, alphaTest: .4, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }); }
  function mvMuralMat(k, tall) { const key = 'mm' + k + (tall ? 't' : ''); return MV.mats[key] || (MV.mats[key] = mvPaintMat(mvMural(k, tall))); }
  function mvPaintMat(t) { return new THREE.MeshLambertMaterial({ map: t, transparent: true, opacity: .93, alphaTest: .05, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }); }
  function mvClothMat(t, mode) {   // mode 0 = stendardo (appeso in alto, ondeggia in fondo), 1 = bandiera (attaccata all'asta, sventola in punta)
    const m = new THREE.MeshLambertMaterial({ map: t, side: THREE.DoubleSide, alphaTest: .4 });
    m.onBeforeCompile = sh => {
      sh.uniforms.uT = MV.t;
      sh.vertexShader = 'uniform float uT; varying float vSh;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        { float ph = position.x * .37 + position.z * .29, fr;
          ${mode === 0
            ? 'float hang = 1. - uv.y; fr = sin(uT * 1.2 + ph + uv.x * 2.) * .11 * hang + cos(uv.x * 15.7) * .035 + sin(uv.y * 9. + ph) * .02 * hang;'
            : 'float fly = uv.x; fr = sin(uT * 4.2 - uv.x * 7. + ph) * .17 * fly + sin(uT * 2.3 - uv.y * 4. + ph) * .05 * fly;'}
          transformed += normal * fr; vSh = .82 + .18 * sin(${mode === 0 ? 'uv.x * 15.7' : 'uT * 4.2 - uv.x * 7. + ph'}); }`);
      sh.fragmentShader = 'varying float vSh;\n' + sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n diffuseColor.rgb *= vSh;');
    };
    return m;
  }
  // un foglio spiegazzato: pieghe, una bolla di colla, un angolo che si stacca
  function mvSheet(w, h, r, bow) {
    const g = new THREE.PlaneGeometry(w, h, 5, 7), p = g.attributes.position, cu = r() < .5 ? 1 : -1, cv = r() < .6 ? 1 : -1;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i) / w + .5, y = p.getY(i) / h + .5;
      let z = (Math.sin(x * 9 + r() * .4) * Math.sin(y * 7) * .008 + (r() - .5) * .006) * bow;
      const cx = cu > 0 ? x : 1 - x, cy = cv > 0 ? y : 1 - y, curl = Math.max(0, cx + cy - 1.55); z += curl * curl * .5 * bow;   // angolo staccato
      p.setZ(i, z); }
    g.computeVertexNormals(); return g;
  }
  function buildWallsAlive() {
    const T = G.T, open = (tx, ty) => { const v = G.tileAt(tx, ty); return v === T.VIA || v === T.WALK || v === T.PIAZZA || v === T.COB || v === T.QUAY; };
    const iron = PM.iron(), cnt = { manifesti: 0, stendardi: 0, bandiere: 0, murales: 0 };
    const paperM = {}, paintM = {}, clothM = {};
    const P = k => paperM[k] || (paperM[k] = mvPaperMat(mvPoster(k))), PT = k => paintM[k] || (paintM[k] = mvPaintMat(mvMural(k))), C = (key, t, mode) => clothM[key] || (clothM[key] = mvClothMat(t, mode));
    const place = (o, sd, u, y, off) => { const p = sd.at(u); o.position.set(p[0] + Math.sin(sd.yaw) * off, y, p[1] + Math.cos(sd.yaw) * off); o.rotation.y = sd.yaw; };
    dyn.buildings.forEach((rec, bi) => {
      const b = rec.b; if (!b || !b.__gwall || b.__top === undefined) return;
      const dd = M.world && M.world.districtAt ? M.world.districtAt(b.x * TS) : 'centro'; if (dd === 'prateria' || dd === 'foresta') return;
      const x0 = b.x * TS, z0 = b.y * TS, w = b.w * TS, d = b.h * TS, fl = Math.max(1, b.fl), hgt = MG + (fl - 1) * MF, base = b.__top - hgt;
      const sides = [
        { f: 'S', n: b.w, len: w, at: u => [x0 + u, z0 + d], yaw: 0, ok: open(b.x + Math.floor(b.w / 2), b.y + b.h + 1) },
        { f: 'E', n: b.h, len: d, at: u => [x0 + w, z0 + d - u], yaw: Math.PI / 2, ok: open(b.x + b.w + 1, b.y + Math.floor(b.h / 2)) },
      ].filter(s2 => s2.ok);
      if (!sides.length) return;
      const r = rng(bi * 4111 + 17), reg = typeof zoneAt === 'function' && zoneAt(x0 + w / 2, z0 + d / 2) === 'regime', PP = b.__prop;
      const freeK = (sd, k) => !(PP && PP.f === sd.f && k >= PP.k0 - 1 && k <= PP.k1);   // non sopra il ritratto del Garante
      sides.forEach(sd => {
        const wallK = (b.__gwall[sd.f] || []).filter(k => freeK(sd, k)).sort((a, c) => a - c);
        // 1) murale: su una fila di almeno 3 moduli ciechi del piano terra
        let run = [], best = []; wallK.forEach(k => { if (run.length && k === run[run.length - 1] + 1) run.push(k); else run = [k]; if (run.length > best.length) best = run.slice(); });
        if (best.length >= 2 && !reg && r() < .6) {
          const mw = best.length * TS - .5, mh = Math.min(MG - .5, mw / 3), u = (best[0] + best.length / 2) * TS;
          const m = new THREE.Mesh(new THREE.PlaneGeometry(mw, mh), PT(Math.floor(r() * 6))); place(m, sd, u, base + .35 + mh / 2, .045); addStatic(m, true); cnt.murales++;
          best.forEach(k => { const i = wallK.indexOf(k); if (i >= 0) wallK.splice(i, 1); });
        }
        // 2) manifesti: incollati a strati sul muro pieno del piano terra, uno sull'altro
        wallK.forEach(k => {
          if (r() > (reg ? .25 : .55)) return;
          const n = 2 + Math.floor(r() * 5), u0 = k * TS + .35 + r() * (TS - 1.2);
          for (let j = 0; j < n; j++) {
            const kk = reg ? (r() < .7 ? 0 : 5) : Math.floor(r() * 12), pw = .52 + r() * .2, ph = pw * 1.4;
            const m = new THREE.Mesh(mvSheet(pw, ph, r, 1), P(kk % 12));
            place(m, sd, Math.min(sd.len - .4, u0 + (j % 3) * .42 + (r() - .5) * .2), base + .95 + Math.floor(j / 3) * .62 + (r() - .5) * .25, .05 + j * .006);
            m.rotateZ((r() - .5) * .14); addStatic(m, true); cnt.manifesti++;
          }
        });
        // 3) stendardo: dal cornicione, su un'asta con due staffe; il regime ne mette di più
        if (fl >= 2 && r() < (reg ? .8 : .18) && sd.len >= 4) {
          const bw = Math.min(1.7, sd.len * .25), bh = Math.min(hgt - MG + .4, bw * 3), u = TS * (1 + Math.floor(r() * Math.max(1, sd.n - 2))) , ytop = b.__top - .5;
          if (bh > 1.6) {
            const g = new THREE.Group(); place(g, sd, Math.min(sd.len - bw / 2 - .2, Math.max(bw / 2 + .2, u)), ytop, 0);
            const pole = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, bw + .3, 6), iron); pole.rotation.z = Math.PI / 2; pole.position.set(0, 0, .45); g.add(pole);
            [-1, 1].forEach(sg => { const br = new THREE.Mesh(new THREE.BoxGeometry(.05, .05, .45), iron); br.position.set(sg * bw * .45, 0, .22); g.add(br); });
            const geo = new THREE.PlaneGeometry(bw, bh, 7, 16); geo.translate(0, -bh / 2 - .04, 0);
            const cloth = new THREE.Mesh(geo, C('st' + (bi % 6), (typeof propTex === 'function' ? propTex('telone', bi % 9).map : mvFlag(0)), 0)); cloth.position.set(0, 0, .47); g.add(cloth);
            const wt = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, bw, 5), iron); wt.rotation.z = Math.PI / 2; wt.position.set(0, -bh - .06, .47); g.add(wt);
            scene.add(g); g.updateMatrixWorld(true); addStatic(g, true); scene.remove(g); cnt.stendardi++;
          }
        }
        // 4) bandiera: asta inclinata fissata al muro al primo piano
        if (fl >= 2 && r() < (reg ? .5 : .12)) {
          const g = new THREE.Group(); place(g, sd, TS * (.5 + Math.floor(r() * sd.n)), base + MG + .6, 0);
          const a = .6, L = 2.4, pole = new THREE.Mesh(new THREE.CylinderGeometry(.03, .04, L, 6), iron);
          pole.position.set(0, Math.sin(a) * L / 2, Math.cos(a) * L / 2); pole.rotation.x = Math.PI / 2 - a; g.add(pole);
          const plate = new THREE.Mesh(new THREE.BoxGeometry(.2, .3, .05), iron); plate.position.set(0, 0, .03); g.add(plate);
          const fw = 1.5, fh = 1, geo = new THREE.PlaneGeometry(fw, fh, 10, 6); geo.translate(fw / 2, -fh / 2, 0); geo.rotateY(-Math.PI / 2); geo.rotateX(-a);
          const fk = reg ? 0 : (r() < .7 ? 1 : 0), fl0 = new THREE.Mesh(geo, C('fl' + fk, mvFlag(fk), 1)); fl0.position.set(0, Math.sin(a) * .6, Math.cos(a) * .6); g.add(fl0);
          scene.add(g); g.updateMatrixWorld(true); addStatic(g, true); scene.remove(g); cnt.bandiere++;
        }
      });
    });
    window.__muri = cnt;
  }
