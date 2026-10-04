  // ---- [inverno] la neve sul terreno ----
  // Neve sporca, bagnata e segnata dove passa la gente: fanghiglia sulle strade, impronte e pozzanghere su marciapiedi
  // e cortili, cumuli grigi ai bordi. Candida solo dove non passa nessuno: le dorsali, il fitto della foresta.
  // Fuliggine di carbone al porto cargo e alla Base. Nella prateria dei beduini la neve non c'è: erba secca e brina.
  // I bordi sono curvi: la quantità di neve si calcola per casella su una tela piccola, si allarga sfumata
  // e una soglia rumorosa la ritaglia in chiazze dal contorno morbido. Agli incroci, i solchi curvi delle gomme.
  function snowPass(x, tx0, ty0, n, m) {
    const T = G.T, P = TP, WD = M.world && M.world.districtAt, B = 2, NW = n + B * 2, NH = m + B * 2;
    const isRoad = (tx, ty) => { if (tx < 0 || ty < 0 || tx >= G.GW || ty >= G.GH) return false; const i = ty * G.GW + tx; return RW[i] > 0 || gT(tx, ty) === T.VIA; };
    const blot = (px, py, w, h, col) => { x.fillStyle = col; x.fillRect(px, py, w, h); };
    const hex = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
    // 1) quantità e colore della neve per casella (con un bordo di 2 caselle, così i blocchi si raccordano)
    const sc = mk(NW, NH), sx = sc.getContext('2d'), img = sx.createImageData(NW, NH);
    const info = [];
    for (let j = 0; j < NH; j++) for (let i = 0; i < NW; i++) {
      const tx = tx0 + i - B, ty = ty0 + j - B, o = (j * NW + i) * 4;
      if (tx < 0 || ty < 0 || tx >= G.GW || ty >= G.GH) continue;
      const v = gT(tx, ty), z = zoneT(tx, ty), d = WD ? WD(tx * TS) : 'centro', road = isRoad(tx, ty);
      const paved = v === T.COB || v === T.PIAZZA || v === T.WALK || v === T.QUAY || v === T.STAIRS || v === T.PIER, natural = !road && !paved && v !== T.BLD && v !== T.WATER && v !== T.FOUNT;
      const sooty = d === 'base' || d === 'porto' || v === T.QUAY;
      let nearRoad = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]]) if (isRoad(tx + dx, ty + dy)) nearRoad++;
      const virgin = natural && !nearRoad && (z === ZN.MONTE || z === ZN.MACCHIA) && !sooty;
      let a = 0, col = '#a8acb2';
      if (v === T.WATER || v === T.FOUNT) a = 0;
      else if (v === T.BLD) { a = .7; col = '#a2a6ac'; }
      else if (d === 'prateria' && natural) { a = Math.max(0, (tx * TS - 128) / 30) * .5; col = '#b4b6b8'; }
      else if (d === 'prateria' && road) { a = .55; col = '#6a5e4c'; }   // pista di terra gelata
      else if (road) { a = .5; col = sooty ? '#4e4a48' : '#5c5854'; }
      else if (paved) { a = .62; col = sooty ? '#727274' : '#868a8f'; }
      else if (virgin) { a = .94; col = '#c8ccd2'; }
      else if (d === 'foresta') { a = .76; col = '#aeb2b8'; }
      else { a = .8; col = sooty ? '#8e8e90' : '#aeb2b8'; }
      if (!road && nearRoad && natural && d !== 'prateria') { a = Math.min(1, a + .15); col = sooty ? '#88888a' : '#a2a6ac'; }
      const c = hex(col); img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = Math.round(a * 255);
      if (i >= B && j >= B && i < NW - B && j < NH - B) info.push({ tx, ty, px: (i - B) * P, py: (j - B) * P, road, paved, natural, virgin, sooty, prairie: d === 'prateria' && natural });
    }
    sx.putImageData(img, 0, 0);
    // 2) sotto: terra fradicia scura (il verde d'estate non spunta), erba secca in prateria
    info.forEach(q => { if (!q.natural) return; const r = rng((q.tx * 4561 + q.ty * 9203) >>> 0);
      if (q.prairie) { const wx = q.tx * TS, wy = q.ty * TS, k = vnz(wx / 40, wy / 40) + vnz(wx / 9, wy / 9) * .4; blot(q.px, q.py, P, P, `rgb(${Math.round(122 + k * 30)},${Math.round(108 + k * 26)},${Math.round(74 + k * 16)})`); }   // erba secca color paglia, a macchie larghe
      else blot(q.px, q.py, P, P, pick(r, ['#4e463e', '#524a40', '#4a423c'])); });
    // 3) la neve: velo sfumato, poi chiazze col contorno morbido ritagliate dal rumore
    x.save(); x.imageSmoothingEnabled = true;
    // la mappa a una casella per pixel, ingrandita in modo lineare, fa losanghe a spigolo: la si sfuma con un raggio di ~0,6 caselle
    const BP = B * P, big = mk(NW * P, NH * P), bx = big.getContext('2d'); bx.imageSmoothingEnabled = true;
    try { bx.filter = 'blur(' + Math.round(P * .6) + 'px)'; } catch (e) {}
    bx.drawImage(sc, 0, 0, NW, NH, 0, 0, NW * P, NH * P); try { bx.filter = 'none'; } catch (e) {}
    x.globalAlpha = .5; x.drawImage(big, BP, BP, n * P, m * P, 0, 0, n * P, m * P); x.globalAlpha = 1;
    const id = bx.getImageData(BP, BP, n * P, m * P), D = id.data, X0 = tx0 * P, Y0 = ty0 * P;
    for (let py = 0; py < m * P; py++) for (let px = 0; px < n * P; px++) {
      const o = (py * n * P + px) * 4, a = D[o + 3] / 255; if (!a) continue;
      const wx = X0 + px, wy = Y0 + py, urban = a < .75;
      // in città il bordo della neve è morbido e a macchie larghe: niente rumore fine, niente scalini
      const nz = urban ? vnz(wx / 30, wy / 30) : vnz(wx / 22, wy / 22) * .65 + vnz(wx / 5, wy / 5) * .35;
      const k = urban ? Math.max(0, Math.min(1, (a + (nz - .5) * .3 - .4) * 4)) : Math.max(0, Math.min(1, (a + nz * .5 - .58) * 6));
      D[o + 3] = Math.round(k * 255 * .88);
    }
    const outc = mk(n * P, m * P); outc.getContext('2d').putImageData(id, 0, 0); x.drawImage(outc, 0, 0);
    x.restore();
    // 4) dettagli: fanghiglia, impronte, pozzanghere, fuliggine, erba secca
    info.forEach(q => {
      const r = rng((q.tx * 7717 + q.ty * 3301) >>> 0), px = q.px, py = q.py;
      if (q.prairie) { for (let k = 0; k < 6; k++) blot(px + Math.floor(r() * P), py + Math.floor(r() * P), 1, 2, pick(r, ['#8a7a56', '#5e5440'])); if (r() < .25) blot(px + Math.floor(r() * P), py + Math.floor(r() * P), 3, 1, 'rgba(210,214,220,.45)'); return; }
      if (q.virgin) { for (let k = 0; k < 3; k++) blot(px + Math.floor(r() * P), py + Math.floor(r() * P), 1 + Math.floor(r() * 2), 1, pick(r, ['rgba(255,255,255,.7)', 'rgba(176,192,214,.45)'])); return; }
      if (q.road) { for (let k = 0; k < 4; k++) blot(px + Math.floor(r() * P), py + Math.floor(r() * P), 1 + Math.floor(r() * 3), 1, 'rgba(52,48,46,.35)'); if (r() < .18) blot(px + Math.floor(r() * 8), py + Math.floor(r() * 8), 5 + Math.floor(r() * 5), 3, 'rgba(40,44,52,.4)'); }
      else {
        if (q.paved || r() < .4) for (let k = 0; k < (q.paved ? 4 : 2); k++) { const fx = px + Math.floor(r() * (P - 3)), fy = py + Math.floor(r() * (P - 3)); blot(fx, fy, 1, 2, 'rgba(60,58,60,.42)'); blot(fx + 2, fy + 1, 1, 2, 'rgba(60,58,60,.42)'); }
        if (q.paved && r() < .2) blot(px + Math.floor(r() * 9), py + Math.floor(r() * 9), 4 + Math.floor(r() * 5), 2 + Math.floor(r() * 3), 'rgba(38,42,50,.36)');
      }
      if (q.sooty && r() < .4) blot(px + Math.floor(r() * P), py + Math.floor(r() * P), 2 + Math.floor(r() * 4), 2, 'rgba(26,24,26,.4)');
    });
    // 5) i solchi delle gomme: lungo le strade, e agli incroci archi che girano
    const X1 = (tx0 + n) * TS, Y1 = (ty0 + m) * TS, X0m = tx0 * TS, Y0m = ty0 * TS;
    x.lineCap = 'round';
    (M.roads || []).forEach(rd => {
      if (rd.kind === 'vicolo') return;
      const lanes = rd.w >= 6 ? [-rd.w * .25, rd.w * .25] : [0];
      lanes.forEach(lo => [-.55, .55].forEach(wo => {
        x.beginPath(); let on = false;
        for (let k = 0; k < rd.pts.length - 1; k++) {
          const [ax, ay] = rd.pts[k], [bx2, by2] = rd.pts[k + 1], L = Math.hypot(bx2 - ax, by2 - ay) || 1, nx = -(by2 - ay) / L, ny = (bx2 - ax) / L;
          if (ax < X0m - 6 || ax > X1 + 6 || ay < Y0m - 6 || ay > Y1 + 6) { on = false; continue; }
          const px = (ax + nx * (lo + wo) - X0m) * PPM, py = (ay + ny * (lo + wo) - Y0m) * PPM;
          if (!on) { x.moveTo(px, py); on = true; } else x.lineTo(px, py);
        }
        x.lineWidth = 1.6; x.strokeStyle = rd.kind === 'sterrato' ? 'rgba(70,58,46,.5)' : 'rgba(40,38,38,.42)'; x.stroke();
      }));
    });
    junctions().forEach(([jx, jy, jr]) => {
      if (jx < X0m - 12 || jx > X1 + 12 || jy < Y0m - 12 || jy > Y1 + 12) return;
      const r = rng((Math.round(jx) * 31 + Math.round(jy) * 17) >>> 0);
      x.globalAlpha = .3; x.fillStyle = '#4a4644'; x.beginPath(); x.ellipse((jx - X0m) * PPM, (jy - Y0m) * PPM, jr * .85 * PPM, jr * .85 * PPM, 0, 0, 6.3); x.fill(); x.globalAlpha = 1;
      for (let q = 0; q < 6; q++) {
        const a0 = Math.floor(r() * 4) * Math.PI / 2 + Math.PI / 4, R = jr * (.9 + r() * .7), cx = jx + Math.cos(a0) * R * .95, cy = jy + Math.sin(a0) * R * .95, st = a0 + Math.PI - .9, en = st + 1.8;
        [0, 1.2].forEach(dr => { x.beginPath(); x.arc((cx - X0m) * PPM, (cy - Y0m) * PPM, (R + dr - .6) * PPM, st, en); x.lineWidth = 1.4; x.strokeStyle = 'rgba(38,36,36,.4)'; x.stroke(); });
      }
    });
  }
  // rumore di valore liscio (per i contorni della neve)
  function vnz(x, y) { const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy); const A = th(x0, y0, 333), Bq = th(x0 + 1, y0, 333), C = th(x0, y0 + 1, 333), Dq = th(x0 + 1, y0 + 1, 333); return A + (Bq - A) * u + (C - A) * v + (A - Bq - C + Dq) * u * v - .5; }
