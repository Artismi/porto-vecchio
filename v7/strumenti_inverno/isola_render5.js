  // ================= [isola36] IL SUOLO DEL BOSCO E DEL TAVOLATO =================
  // Niente caselle: sotto gli alberi aghi e muschio a macchie larghe, nelle radure erba secca, ai piedi della parete un ghiaione
  // a fascia continua che si dirada verso il bosco, sul pianoro roccia bagnata ed erba bassa. Si dipinge a mezzo metro con
  // rumori lisci e con la distanza vera dalla parete, così i bordi sono curvi e non seguono la griglia.
  function bosco36(x, px, py, P, tx, ty, r, v, z, ii) {
    const W0 = M.world, T = G.T; if (!W0 || !W0.TAV || !W0.XG || tx * TS >= W0.XG || z === ZN.CITTA) return false;   // la testa, il collo e il monte
    if (RW[ii] > 0 && (v === T.VIA || v === T.DIRT)) return false;
    const F = W0.feat ? W0.feat[ii] : 0, talus = !!(F & 8192), top = !!(F & 2048);
    if (!(v === T.TREE || v === T.SHRUB || v === T.GRASS || ((v === T.GRAVEL || v === T.ROCK) && (talus || top)))) return false;
    const TV = W0.TAV, S4 = P / 4, wx = tx * TS, wy = ty * TS;
    for (let sj = 0; sj < 4; sj++) for (let si = 0; si < 4; si++) {
      const X = wx + (si + .5) * .5, Y = wy + (sj + .5) * .5, k1 = vnz(X / 9, Y / 9) + vnz(X / 2.6, Y / 2.6) * .4, k2 = vnz(X / 23 + 17, Y / 23 + 17);
      const sx = px + si * S4, sy = py + sj * S4; let col;
      if (talus) {   // distanza dalla parete: vicino tutto pietrame, poi pietre nel muschio, poi il bosco
        const dd = Math.hypot(X - TV.x, Y - TV.y) - W0.tavR(Math.atan2(Y - TV.y, X - TV.x)), t = Math.max(0, Math.min(1, (dd - 2) / 24));
        const rock = 1 - t * 1.6 + k1 * .55;
        if (rock > .35) { const g = 66 + Math.floor((k1 + .5) * 26) + Math.floor(r() * 10); col = `rgb(${g},${g - 3},${g - 7})`; x.fillStyle = col; x.fillRect(sx, sy, S4, S4); x.fillStyle = 'rgba(20,18,16,.55)'; x.fillRect(sx + Math.floor(r() * 3), sy + Math.floor(r() * 3), 2, 1); if (r() < .5) { x.fillStyle = 'rgba(150,146,136,.5)'; x.fillRect(sx + Math.floor(r() * 3), sy + Math.floor(r() * 3), 1, 1); } continue; }
        if (rock > .05 && r() < .5) { x.fillStyle = '#58544e'; x.fillRect(sx, sy, S4, S4); continue; }
      }
      if (top) {   // il pianoro: roccia nera bagnata, cuscini d'erba bassa e di muschio, pozze
        const q = k1 + k2 * .6;
        col = q > .18 ? `rgb(${52 + Math.floor(k2 * 20)},${50 + Math.floor(k2 * 18)},${46})` : q > -.12 ? `rgb(${60 + Math.floor(k1 * 18)},${66 + Math.floor(k1 * 20)},${40})` : `rgb(${44},${56 + Math.floor(k1 * 14)},${36})`;
        x.fillStyle = col; x.fillRect(sx, sy, S4, S4); if (r() < .35) { x.fillStyle = pick(r, ['#6a6e44', '#4a5432', '#7a7250']); x.fillRect(sx + Math.floor(r() * S4), sy + Math.floor(r() * S4), 1, 1 + Math.floor(r() * 2)); } continue;
      }
      // il bosco: aghi e foglie marce, muschio dove è umido; nelle radure erba secca a ciuffi
      const open = v === T.GRASS || (v === T.SHRUB && k2 > .05);
      if (open) { const g = Math.floor((k1 + .5) * 18); col = k2 > .12 ? `rgb(${86 + g},${80 + g},${48 + g / 2})` : `rgb(${62 + g},${72 + g},${40 + g / 2})`; }
      else { const g = Math.floor((k1 + .5) * 14); col = k2 > -.05 ? `rgb(${44 + g},${36 + g},${26 + g / 2})` : `rgb(${36 + g / 2},${48 + g},${28})`; }
      x.fillStyle = col; x.fillRect(sx, sy, S4, S4);
      for (let q = 0; q < 2; q++) { x.fillStyle = open ? pick(r, ['#9a8a58', '#7a7a48', '#5a6234', '#a89868']) : pick(r, ['#5a4628', '#3e4a2a', '#6a5432', '#2a3420']); x.fillRect(sx + Math.floor(r() * S4), sy + Math.floor(r() * S4), 1, 1 + (open ? Math.floor(r() * 2) : 0)); }
    }
    return true;
  }
  // il colore di un albero del bosco: a macchie larghe come in un bosco vero (larici gialli, faggi rossicci, abeti scuri, pini chiari)
  function treeCol36(name, x, z, r) {
    const k = vnz(x / 34, z / 34) + vnz(x / 11, z / 11) * .35, j = r();
    if (/Pine/.test(name)) return k > .15 ? pick(r, ['#e8f0d0', '#f0f4d8']) : k < -.15 ? pick(r, ['#b8d0c0', '#c4d8c8']) : pick(r, ['#d4e4cc', '#dce8d0']);
    if (/Common/.test(name)) return k > .1 ? pick(r, ['#f4d890', '#f0c878', '#e8d8a0']) : k < -.2 ? pick(r, ['#e8a878', '#dca070']) : j < .5 ? '#e0e8b8' : '#f0e0b0';
    if (/Twisted/.test(name)) return pick(r, ['#d8e0c0', '#c8d4b0']);
    return pick(r, ['#e8e0d8', '#d8d0c4', '#f0e8dc']);
  }
