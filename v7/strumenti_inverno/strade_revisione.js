  // ================= [strade1] REVISIONE DELLE STRADE =================
  // Le strade come opere vere, viste da vicino: segnaletica orizzontale consumata (mezzeria tratteggiata, continua in curva e
  // prima degli incroci, linee di margine fuori città, STOP e triangoli sulle strade che danno la precedenza, frecce, stalli),
  // sampietrini nelle vie vecchie verso il porto e sotto l'asfalto consumato, buche col fango e l'acqua, caditoie e tombini,
  // scivoli dei marciapiedi alle strisce, semafori agli incroci grandi della città (di notte gialli lampeggianti, c'è il coprifuoco),
  // cartelli (stop, precedenza, attraversamento, inizio e fine città, limiti, frecce in curva), paletti delineatori, guardrail a
  // doppia onda con le testate, ringhiere sul mare in città, cantieri con la rete arancione, le barriere bianche e rosse, le lampade
  // gialle e lo scavo, i new jersey di cemento ai posti di blocco. Tutto deterministico: pittura e oggetti leggono le stesse liste.
  const S1 = { tex: {}, heads: [], blink: [], ramp: null };
  const COB1 = { via_porto: 1, via_alta: 1 };                       // le vie vecchie verso il porto restano di sampietrini
  const urb1 = rd => rd.kind === 'citta' || rd.kind === 'litoranea';
  const asph1 = rd => rd.kind !== 'sterrato' && rd.kind !== 'vicolo' && !COB1[rd.id];
  const cityAt1 = (x, z) => { const tx = Math.floor(x / TS), tz = Math.floor(z / TS); return tx >= 0 && tz >= 0 && tx < G.GW && tz < G.GH && zoneT(tx, tz) === ZN.CITTA; };
  const sideOf1 = rd => urb1(rd) ? 2 : 0;
  // per ogni strada: distanza progressiva, direzione e curvatura a ogni punto
  function geo1(rd) {
    if (rd._g1) return rd._g1; const P = rd.pts, n = P.length, s = new Float32Array(n), ux = new Float32Array(n), uy = new Float32Array(n), cv = new Float32Array(n);
    for (let k = 1; k < n; k++) s[k] = s[k - 1] + Math.hypot(P[k][0] - P[k - 1][0], P[k][1] - P[k - 1][1]);
    for (let k = 0; k < n; k++) { const a = P[Math.max(0, k - 1)], c = P[Math.min(n - 1, k + 1)], L = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1; ux[k] = (c[0] - a[0]) / L; uy[k] = (c[1] - a[1]) / L; }
    for (let k = 0; k < n; k++) { let a = k, b = k; while (a > 0 && s[k] - s[a] < 7) a--; while (b < n - 1 && s[b] - s[k] < 7) b++; cv[k] = Math.atan2(ux[a] * uy[b] - uy[a] * ux[b], ux[a] * ux[b] + uy[a] * uy[b]); }   // svolta in 14 m (segno = verso)
    return (rd._g1 = { s, ux, uy, cv, n });
  }
  // incroci: ogni braccio sa di che strada è, se la strada passa o finisce lì, e chi deve dare la precedenza
  const PRI1 = rd => rd.kind === 'litoranea' ? 0 : rd.kind === 'strada' ? 1 : rd.kind === 'citta' ? (rd.main ? 2 : 3) : 4;
  let J1 = null;
  function junc1() {
    if (J1) return J1; J1 = [];
    const R = (M.roads || []).filter(rd => rd.kind !== 'vicolo' && rd.kind !== 'sterrato' && rd.pts && rd.pts.length > 2);
    junctions().forEach(([jx, jy, jr]) => {
      const arms = [];
      R.forEach(rd => { const P = rd.pts, g = geo1(rd); let best = 1e9, bs = 0;
        for (let k = 0; k < P.length - 1; k++) { const ax = P[k][0], ay = P[k][1], dx = P[k + 1][0] - ax, dy = P[k + 1][1] - ay, L2 = dx * dx + dy * dy || 1e-6, t = clamp(((jx - ax) * dx + (jy - ay) * dy) / L2, 0, 1), d = Math.hypot(ax + dx * t - jx, ay + dy * t - jy); if (d < best) { best = d; bs = g.s[k] + t * Math.sqrt(L2); } }
        if (best > rd.w / 2 + 2) return; const tot = g.s[g.n - 1], mine = [];
        [-1, 1].forEach(sg => { const s1 = bs + sg * (jr + 6); if (s1 < 0 || s1 > tot) return; let k = 0; while (k < g.n - 2 && g.s[k + 1] < s1) k++; const t = (s1 - g.s[k]) / ((g.s[k + 1] - g.s[k]) || 1), qx = P[k][0] + (P[k + 1][0] - P[k][0]) * t, qy = P[k][1] + (P[k + 1][1] - P[k][1]) * t, dx = qx - jx, dy = qy - jy, L = Math.hypot(dx, dy); if (L < jr * .6) return;
          const ux = dx / L, uy = dy / L; if (arms.some(o => o.ux * ux + o.uy * uy > .94)) return; mine.push({ rd, ux, uy, w: rd.w }); });
        mine.forEach(a => { a.through = mine.length === 2; arms.push(a); }); });
      if (arms.length < 2) return;
      // chi passa ha la precedenza; se passano tutti, la più importante (o la più larga)
      const top = arms.reduce((b, a) => !b || (a.through && !b.through) || (a.through === b.through && (PRI1(a.rd) < PRI1(b.rd) || (PRI1(a.rd) === PRI1(b.rd) && a.w > b.w))) ? a : b, null);
      arms.forEach(a => { a.minor = a.rd !== top.rd; });
      const city = cityAt1(jx, jy), big = arms.filter(a => urb1(a.rd) && a.w >= 7).length;
      J1.push({ x: jx, y: jy, r: jr, arms, city, signal: city && arms.length >= 3 && big >= 3 });
    });
    // semafori solo agli incroci grandi, lontani fra loro
    const sig = J1.filter(j => j.signal).sort((a, b) => b.arms.reduce((s, a2) => s + a2.w, 0) - a.arms.reduce((s, a2) => s + a2.w, 0)); const keep = [];
    sig.forEach(j => { if (keep.length < 9 && !keep.some(o => Math.hypot(o.x - j.x, o.y - j.y) < 60)) keep.push(j); else j.signal = false; });
    return J1;
  }
  // ricerca veloce: incrocio più vicino (con il suo raggio)
  let JH1 = null;
  function nearJ1(x, y, extra) { if (!JH1) { JH1 = new Map(); junctions().forEach(j => { const k = Math.floor(j[0] / 24) * 4096 + Math.floor(j[1] / 24); (JH1.get(k) || JH1.set(k, []).get(k)).push(j); }); }
    const i0 = Math.floor(x / 24), j0 = Math.floor(y / 24); let best = 1e9; for (let i = i0 - 1; i <= i0 + 1; i++) for (let j = j0 - 1; j <= j0 + 1; j++) for (const q of JH1.get(i * 4096 + j) || []) best = Math.min(best, Math.hypot(q[0] - x, q[1] - y) - q[2] - (extra || 0)); return best; }   // <0: dentro
  // ---- dove passa la carreggiata (per non mettere i cartelli in mezzo alla strada) ----
  let CH1 = null;
  function onCarr1(x, z, pad, not) {
    if (!CH1) { CH1 = new Map(); (M.roads || []).forEach(rd => { if (!rd.pts || rd.kind === 'sterrato' && rd.w < 3) return; const P = rd.pts; for (let k = 0; k < P.length - 1; k++) { const k2 = Math.floor(P[k][0] / 8) * 4096 + Math.floor(P[k][1] / 8); (CH1.get(k2) || CH1.set(k2, []).get(k2)).push([P[k][0], P[k][1], P[k + 1][0], P[k + 1][1], rd.w / 2, rd]); } }); }
    const i0 = Math.floor(x / 8), j0 = Math.floor(z / 8);
    for (let i = i0 - 2; i <= i0 + 2; i++) for (let j = j0 - 2; j <= j0 + 2; j++) for (const s of CH1.get(i * 4096 + j) || []) { if (s[5] === not) continue; const dx = s[2] - s[0], dz = s[3] - s[1], L2 = dx * dx + dz * dz || 1, t = clamp(((x - s[0]) * dx + (z - s[1]) * dz) / L2, 0, 1); if (Math.hypot(s[0] + dx * t - x, s[1] + dz * t - z) < s[4] + (pad || 0)) return true; }
    return false;
  }
  const solid1 = (x, z) => { const T = G.T, v = G.tileAt(Math.floor(x / TS), Math.floor(z / TS)); return v === T.BLD || v === T.WATER || v === T.CLIFF || v === T.FOUNT || v === T.TREE || v === undefined; };
  function busy1(x, z, r) { let hit = false; hashNear(x, z, r + 2, rec => { if (hit || rec.gone35 || rec.state !== 0) return; if (Math.abs(rec.c.x - x) < rec.he.x + r && Math.abs(rec.c.z - z) < rec.he.z + r) hit = true; }); return hit; }
  const okSpot1 = (x, z, r) => !solid1(x, z) && !onCarr1(x, z, .15) && !busy1(x, z, r || .3);

  // ================= PITTURA DEL SUOLO =================
  // pattern a 8 px/m: sampietrini a coda di pavone (esagerati: 25 cm), allineati al mondo come quelli di [isola35]
  function sampCanvas1() {
    if (S1.samp) return S1.samp; const S = 128, c = mk(S, S), x = c.getContext('2d'), img = x.createImageData(S, S), d = img.data, A = 16;   // archi da 2 m
    for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) {
      const row = Math.floor(py / A), off = row % 2 ? A / 2 : 0, cx = Math.floor((px + off) / A) * A - off + A / 2, cy = (row + 1) * A, dx = px + .5 - cx, dy = py + .5 - cy, rr = Math.hypot(dx, dy);
      const ring = Math.floor(rr / 2), ang = Math.atan2(-dy, dx), seg = Math.floor(ang * rr / 2.1 + ring * .5), joint = rr % 2 < .55 || (ang * rr / 2.1 + ring * .5) % 1 < .3;
      const h = th(seg, ring * 131 + row * 17 + Math.floor((px + off) / A) * 7, 91), g = joint ? 30 + h * 10 : 70 + h * 34, w = th(seg, ring, 92) < .08 ? 18 : 0;
      const o = (py * S + px) * 4; d[o] = g + 4 - w * .2; d[o + 1] = g + (joint ? 0 : 1) + w * .4; d[o + 2] = g - 6 - w * .3; d[o + 3] = 255;
    }
    x.putImageData(img, 0, 0); return (S1.samp = c);
  }
  function sampPat1(x, X0, Y0) { const c = sampCanvas1(), p = x.createPattern(c, 'repeat'), sc = 16 * PPM / c.width; try { p.setTransform(new DOMMatrix([sc, 0, 0, sc, -((X0 * PPM) % (16 * PPM)), -((Y0 * PPM) % (16 * PPM))])); } catch (e) {} return p; }
  const inBox1 = (px, py, X0, Y0, X1, Y1, pad) => px > X0 - pad && px < X1 + pad && py > Y0 - pad && py < Y1 + pad;
  // macchie di asfalto consumato che lasciano vedere i sampietrini di sotto, caditoie e tombini: liste fisse per strada
  let SURF1 = null;
  function surfList1() {
    if (SURF1) return SURF1; SURF1 = { patch: [], drain: [], man: [] };
    (M.roads || []).forEach((rd, ri) => { if (!asph1(rd) || !rd.pts || rd.pts.length < 4) return; const g = geo1(rd), P = rd.pts, r = rng(ri * 7919 + 101), city = urb1(rd);
      let next = 8 + r() * 20, nd = 6 + r() * 8, nm = 15 + r() * 30;
      for (let k = 1; k < g.n - 1; k++) { const s = g.s[k], nx = -g.uy[k], ny = g.ux[k], [x0, y0] = P[k];
        if (nearJ1(x0, y0, 1) < 0) continue;
        if (city && s > next && cityAt1(x0, y0)) { next = s + 14 + r() * 30; if (r() < .55) { const sd = r() < .5 ? 1 : -1, len = 1.5 + r() * 4, wid = .8 + r() * 1.4, lat = sd * (rd.w / 2 - wid / 2 - .1 - r() * (rd.w / 4)); SURF1.patch.push([x0 + nx * lat, y0 + ny * lat, len, wid, Math.atan2(g.uy[k], g.ux[k]), ri * 31 + k]); } }
        if (city && s > nd && cityAt1(x0, y0)) { nd = s + 10 + r() * 9; [-1, 1].forEach(sd => { if (r() < .75) SURF1.drain.push([x0 + nx * sd * (rd.w / 2 - .22), y0 + ny * sd * (rd.w / 2 - .22), Math.atan2(g.uy[k], g.ux[k])]); }); }
        if (s > nm) { nm = s + 25 + r() * 40; const lat = (r() - .5) * rd.w * .4; SURF1.man.push([x0 + nx * lat, y0 + ny * lat, ri + k]); }
      } });
    return SURF1;
  }
  function surf1(x, tx0, ty0, n, m) {
    const X0 = tx0 * TS, Y0 = ty0 * TS, X1 = (tx0 + n) * TS, Y1 = (ty0 + m) * TS, cx = (wx) => (wx - X0) * PPM, cy = (wy) => (wy - Y0) * PPM;
    // vie di sampietrini (sopra l'asfalto che smoothRoads ha steso): cordolo scuro, pietre, una fila di guide di granito ai lati
    x.lineJoin = 'round'; x.lineCap = 'round';
    (M.roads || []).forEach(rd => { if (!COB1[rd.id] || !rd.pts) return; let near = false; for (const p of rd.pts) if (inBox1(p[0], p[1], X0, Y0, X1, Y1, rd.w + 4)) { near = true; break; } if (!near) return;
      const path = () => { x.beginPath(); rd.pts.forEach((p, k) => k ? x.lineTo(cx(p[0]), cy(p[1])) : x.moveTo(cx(p[0]), cy(p[1]))); };
      path(); x.lineWidth = (rd.w + .5) * PPM; x.strokeStyle = '#2a2624'; x.stroke();
      path(); x.lineWidth = rd.w * PPM; x.strokeStyle = sampPat1(x, X0, Y0); x.stroke();
      path(); x.lineWidth = .5 * PPM; x.strokeStyle = 'rgba(150,144,134,.55)'; x.stroke();                   // guida centrale di granito (per le ruote dei carri)
    });
    x.lineCap = 'butt';
    const S = surfList1();
    S.patch.forEach(([px, py, len, wid, ang, seed]) => { if (!inBox1(px, py, X0, Y0, X1, Y1, 5)) return; const r = rng(seed);
      x.save(); x.translate(cx(px), cy(py)); x.rotate(ang); x.beginPath();
      for (let q = 0; q <= 14; q++) { const a = q / 14 * Math.PI * 2, k = .78 + r() * .3; x.lineTo(Math.cos(a) * len / 2 * PPM * k, Math.sin(a) * wid / 2 * PPM * k); } x.closePath();
      x.fillStyle = 'rgba(20,18,18,.6)'; x.fill(); x.save(); x.clip(); x.rotate(-ang); x.translate(-cx(px), -cy(py)); x.fillStyle = sampPat1(x, X0, Y0); x.fillRect(cx(px) - len * PPM, cy(py) - len * PPM, len * 2 * PPM, len * 2 * PPM); x.restore();
      x.strokeStyle = 'rgba(70,66,62,.7)'; x.lineWidth = 1; x.stroke(); x.restore(); });
    S.drain.forEach(([px, py, ang]) => { if (!inBox1(px, py, X0, Y0, X1, Y1, 2)) return; x.save(); x.translate(cx(px), cy(py)); x.rotate(ang);
      x.fillStyle = '#121012'; x.fillRect(-3, -2, 6, 4); x.fillStyle = '#4a4644'; for (let i = -2; i <= 2; i += 2) x.fillRect(i, -2, 1, 4); x.fillStyle = 'rgba(80,76,72,.6)'; x.fillRect(-4, -2.5, 8, 1); x.restore(); });
    S.man.forEach(([px, py, seed]) => { if (!inBox1(px, py, X0, Y0, X1, Y1, 2)) return; const X = cx(px), Y = cy(py);
      x.fillStyle = '#1e1c1e'; x.beginPath(); x.arc(X, Y, 3.4, 0, 6.3); x.fill(); x.fillStyle = '#3e3a3a'; x.beginPath(); x.arc(X, Y, 2.7, 0, 6.3); x.fill();
      x.fillStyle = 'rgba(20,18,18,.8)'; for (let i = -2; i <= 2; i += 2) x.fillRect(X - 2, Y + i, 4, 1); x.fillStyle = 'rgba(120,80,50,.4)'; x.fillRect(X - 1 + (seed % 3), Y - 2, 1, 1); });
  }

  // ---- segnaletica orizzontale: vernice consumata a puntini, con la grana del mondo (uguale fra i blocchi) ----
  function dotLine1(x, X0, Y0, ax, ay, bx, by, wear, col, sz, seed) {   // vernice a tratti continui con buchi d'usura (uguale fra i blocchi)
    const L = Math.hypot(bx - ax, by - ay), st = Math.max(1, Math.ceil(L / .25)); x.lineWidth = (sz || 2) * .65; x.lineCap = 'butt';
    for (let q = 0; q < st; q++) { const t0 = q / st, t1 = (q + 1) / st, wx = ax + (bx - ax) * t0, wy = ay + (by - ay) * t0, h = th(Math.round(wx * 4), Math.round(wy * 4), seed || 41); if (h < wear * .7) continue;
      x.strokeStyle = `rgba(${col},${(.5 + (h - wear * .7) * .4).toFixed(2)})`; x.beginPath(); x.moveTo((wx - X0) * PPM, (wy - Y0) * PPM); x.lineTo((ax + (bx - ax) * t1 - X0) * PPM, (ay + (by - ay) * t1 - Y0) * PPM); x.stroke(); }
  }
  const WHITE1 = '226,222,206', YEL1 = '214,170,60';
  function marks1(x, tx0, ty0, n, m) {
    const X0 = tx0 * TS, Y0 = ty0 * TS, X1 = (tx0 + n) * TS, Y1 = (ty0 + m) * TS;
    (M.roads || []).forEach((rd, ri) => {
      if (!asph1(rd) || !rd.pts || rd.pts.length < 3) return; const g = geo1(rd), P = rd.pts, city0 = urb1(rd);
      const wear = rd.kind === 'litoranea' ? .2 : rd.kind === 'strada' ? .28 : .34;
      for (let k = 0; k < g.n - 1; k++) {
        const [ax, ay] = P[k], [bx, by] = P[k + 1]; if (!inBox1(ax, ay, X0, Y0, X1, Y1, rd.w + 6)) continue;
        const mx = (ax + bx) / 2, my = (ay + by) / 2, dj = nearJ1(mx, my, 0); if (dj < .5) continue;   // dentro l'incrocio niente linee
        const nx = -g.uy[k], ny = g.ux[k], city = cityAt1(mx, my), s = g.s[k];
        if (onCarr1(mx, my, -.3, rd)) continue;   // dentro un'altra strada
        // mezzeria: tratteggiata, continua in curva, sulle salite cieche e prima degli incroci (fuori città)
        if (rd.w >= 5.5) {
          const curve = Math.abs(g.cv[k]) > (city ? 9 : .42), appr = !city && dj < 18, cont = curve || appr, period = city ? 6 : 9, on = city ? 3 : 4.5;
          if (cont) { dotLine1(x, X0, Y0, ax, ay, bx, by, wear, WHITE1, 2, 41); if (!city && Math.abs(g.cv[k]) > .7) { dotLine1(x, X0, Y0, ax + nx * .3, ay + ny * .3, bx + nx * .3, by + ny * .3, wear, WHITE1, 2, 43); } }   // doppia continua nelle curve strette
          else if ((s % period) < on) dotLine1(x, X0, Y0, ax, ay, bx, by, wear, WHITE1, 2, 41);
        }
        // linee di margine: solo fuori città, e non sulla bocca degli incroci
        if (!city && dj > 3 && (rd.kind === 'strada' || rd.kind === 'litoranea')) [-1, 1].forEach(sd => { const o = sd * (rd.w / 2 - .35); if (onCarr1(mx + nx * (o + sd * .6), my + ny * (o + sd * .6), 0, rd) || onCarr1(mx + nx * o, my + ny * o, -.2, rd)) return; dotLine1(x, X0, Y0, ax + nx * o, ay + ny * o, bx + nx * o, by + ny * o, wear + .08, WHITE1, 2, 47 + sd); });
        // stalli di sosta lungo le vie larghe di città: una tacca ogni 5 m sul bordo destro e sinistro
        if (city && city0 && rd.w >= 8 && dj > 8 && Math.floor(s / 5) !== Math.floor(g.s[k + 1] / 5)) [1].forEach(sd => { const o = sd * (rd.w / 2 - .1), o2 = sd * (rd.w / 2 - 1.9);   /* un lato solo: restano 6 m di corsie */ dotLine1(x, X0, Y0, ax + nx * o, ay + ny * o, ax + nx * o2, ay + ny * o2, wear + .1, WHITE1, 2, 49); });
      }
    });
    // agli incroci: STOP o triangoli sulle strade che danno la precedenza, frecce sulle altre in città
    junc1().forEach(J => { if (!inBox1(J.x, J.y, X0, Y0, X1, Y1, 30)) return;
      J.arms.forEach((a, ai) => { const ux = a.ux, uy = a.uy, rx = uy, ry = -ux, lane = a.w / 2;   // destra di chi arriva (va verso -u)
        const d0 = J.r + (J.city ? 3.4 : 1.2), sx = J.x + ux * d0, sy = J.y + uy * d0, seed = (Math.round(J.x * 3 + J.y * 7 + ai) >>> 0);
        if (a.minor && !J.signal) {
          // linea d'arresto o fila di triangoli sulla corsia di chi arriva
          if (J.city || a.w >= 6.5) { for (let o = .2; o < lane - .15; o += .12) for (let w = 0; w < .45; w += .12) { const px = sx + rx * o + ux * w, py = sy + ry * o + uy * w; if (th(Math.round(px * 8), Math.round(py * 8), 61) > .18) { x.fillStyle = `rgba(${WHITE1},.8)`; x.fillRect(Math.round((px - X0) * PPM), Math.round((py - Y0) * PPM), 1, 1); } }
            // STOP scritto lungo la corsia, allungato per chi lo legge guidando
            const tx = sx + ux * 2.6 + rx * lane / 2, ty = sy + uy * 2.6 + ry * lane / 2; x.save(); x.translate((tx - X0) * PPM, (ty - Y0) * PPM); x.rotate(Math.atan2(-ux, uy)); x.scale(1, 2.4);
            x.font = 'bold 7px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = `rgba(${WHITE1},.72)`; x.fillText('STOP', 0, 0); x.restore(); }
          else for (let o = .4; o < lane - .2; o += .7) { const px = sx + rx * o, py = sy + ry * o; x.save(); x.translate((px - X0) * PPM, (py - Y0) * PPM); x.rotate(Math.atan2(uy, ux)); x.fillStyle = `rgba(${WHITE1},.75)`; x.beginPath(); x.moveTo(5, 0); x.lineTo(0, -2.2); x.lineTo(0, 2.2); x.closePath(); x.fill(); x.restore(); }
        }
        if (J.city && (J.signal || !a.minor) && a.w >= 7) {   // linea d'arresto e freccia dritta sulla corsia di chi arriva
          if (J.signal) for (let o = .2; o < lane - .15; o += .12) for (let w = 0; w < .45; w += .12) { const px = sx + rx * o + ux * w, py = sy + ry * o + uy * w; if (th(Math.round(px * 8), Math.round(py * 8), 63) > .2) { x.fillStyle = `rgba(${WHITE1},.8)`; x.fillRect(Math.round((px - X0) * PPM), Math.round((py - Y0) * PPM), 1, 1); } }
          const fx = sx + ux * 7 + rx * lane / 2, fy = sy + uy * 7 + ry * lane / 2; x.save(); x.translate((fx - X0) * PPM, (fy - Y0) * PPM); x.rotate(Math.atan2(-uy, -ux)); x.fillStyle = `rgba(${WHITE1},.62)`;
          x.fillRect(-14, -1, 16, 2); x.beginPath(); x.moveTo(8, 0); x.lineTo(1, -4); x.lineTo(1, 4); x.closePath(); x.fill(); x.restore(); }
      }); });
  }

  // ---- buche: fango, acqua ferma, bordi rotti, ragnatela di crepe; più fitte fuori città, al porto e in periferia ----
  let HOLES1 = null;
  function holes1List() {
    if (HOLES1) return HOLES1; HOLES1 = [];
    (M.roads || []).forEach((rd, ri) => { if (!asph1(rd) || !rd.pts || rd.pts.length < 4) return; const g = geo1(rd), P = rd.pts, r = rng(ri * 104729 + 7);
      let next = 6 + r() * 20;
      for (let k = 1; k < g.n - 1; k++) { if (g.s[k] < next) continue; const [x0, y0] = P[k], city = cityAt1(x0, y0), port = x0 > 1160;
        next = g.s[k] + (port ? 9 : city ? 26 : 16) + r() * (city ? 40 : 26); if (nearJ1(x0, y0, 0) < 1) continue;
        const nx = -g.uy[k], ny = g.ux[k], cnt = r() < .25 ? 2 + Math.floor(r() * 3) : 1;   // a volte un tratto dissestato
        for (let q = 0; q < cnt; q++) { const lat = (r() - .5) * (rd.w - 1.4), along = (r() - .5) * (cnt > 1 ? 5 : 0), sz = .3 + r() * (cnt > 1 ? .55 : .8);
          HOLES1.push({ x: x0 + nx * lat + g.ux[k] * along, y: y0 + ny * lat + g.uy[k] * along, sz, wet: r() < .55, ang: r() * 3, seed: (ri * 1000 + k * 7 + q) >>> 0 }); } } });
    return HOLES1;
  }
  // ---- cantieri: in città (scavo nella corsia, rete arancione, barriere) e i 9 fuori città di [isola31] restano ----
  let WORKS1 = null;
  function works1() {
    if (WORKS1) return WORKS1; WORKS1 = []; const r = rng(3101), RD = (M.roads || []).filter(rd => asph1(rd) && rd.kind === 'citta' && rd.w >= 7 && rd.pts.length > 30);
    for (let tries = 0; tries < 200 && WORKS1.length < 5 && RD.length; tries++) {
      const rd = pick(r, RD), g = geo1(rd), k = 10 + Math.floor(r() * (g.n - 20)), [x0, y0] = rd.pts[k];
      if (!cityAt1(x0, y0) || junc1().some(J => (J.arms.length >= 3 || J.arms.some(a => a.minor)) && Math.hypot(J.x - x0, J.y - y0) < J.r + 14) || nearJ1(x0, y0, 3) < 0 || Math.abs(g.cv[k]) > .4 || WORKS1.some(w => Math.hypot(w.x - x0, w.y - y0) < 70)) continue;
      const sd = r() < .5 ? 1 : -1, ux = g.ux[k], uy = g.uy[k], nx = -uy * sd, ny = ux * sd, lat = rd.w / 4;
      WORKS1.push({ x: x0 + nx * lat, y: y0 + ny * lat, ux, uy, nx, ny, w: rd.w, len: 5 + r() * 3, wid: 1.4 + r() * .5, rd, seed: tries * 13 + 5 });
    }
    return WORKS1;
  }
  function holes1(x, tx0, ty0, n, m) {
    const X0 = tx0 * TS, Y0 = ty0 * TS, X1 = (tx0 + n) * TS, Y1 = (ty0 + m) * TS;
    holes1List().forEach(h => { if (!inBox1(h.x, h.y, X0, Y0, X1, Y1, 3)) return; const r = rng(h.seed), X = (h.x - X0) * PPM, Y = (h.y - Y0) * PPM, R0 = h.sz * PPM;
      // crepe a ragnatela attorno
      x.strokeStyle = 'rgba(16,14,16,.55)'; x.lineWidth = 1; for (let q = 0; q < 5; q++) { let a = r() * 6.3, px = X + Math.cos(a) * R0, py = Y + Math.sin(a) * R0 * .7; x.beginPath(); x.moveTo(px, py); for (let s = 0; s < 3; s++) { a += (r() - .5) * 1.2; px += Math.cos(a) * (2 + r() * 4); py += Math.sin(a) * (2 + r() * 4); x.lineTo(px, py); } x.stroke(); }
      // bordo sbrecciato chiaro, poi il fondo di ghiaia e fango
      const blob = (rad, col) => { x.fillStyle = col; x.beginPath(); for (let q = 0; q <= 11; q++) { const a = q / 11 * 6.3 + h.ang, k = .72 + th(h.seed, q, 71) * .4; x.lineTo(X + Math.cos(a) * rad * k, Y + Math.sin(a) * rad * k * .75); } x.closePath(); x.fill(); };
      blob(R0 + 1.5, 'rgba(84,80,76,.7)'); blob(R0, '#1a1716'); blob(R0 * .78, '#2c2622');
      for (let q = 0; q < 4; q++) { x.fillStyle = pick(r, ['#5a544c', '#46403a', '#6a645a']); x.fillRect(Math.round(X + (r() - .5) * R0), Math.round(Y + (r() - .5) * R0 * .6), 1, 1); }
      if (h.wet) { blob(R0 * .62, 'rgba(46,52,58,.95)'); x.fillStyle = 'rgba(150,160,168,.35)'; x.fillRect(Math.round(X - R0 * .3), Math.round(Y - R0 * .2), Math.max(1, Math.round(R0 * .4)), 1); }   // acqua ferma col riflesso
    });
    works1().forEach(w => { if (!inBox1(w.x, w.y, X0, Y0, X1, Y1, 8)) return; const r = rng(w.seed);
      x.save(); x.translate((w.x - X0) * PPM, (w.y - Y0) * PPM); x.rotate(Math.atan2(w.uy, w.ux));
      const L = w.len * PPM, W = w.wid * PPM;
      x.fillStyle = 'rgba(60,56,52,.8)'; x.fillRect(-L / 2 - 4, -W / 2 - 3, L + 8, W + 6);   // asfalto tagliato a sega
      x.fillStyle = '#2a2018'; x.fillRect(-L / 2, -W / 2, L, W); for (let q = 0; q < 50; q++) { x.fillStyle = pick(r, ['#4a3a2a', '#3a2c20', '#5a4a38', '#6a6058']); x.fillRect(-L / 2 + r() * L, -W / 2 + r() * W, 1 + Math.floor(r() * 2), 1); }   // terra e sassi
      x.fillStyle = '#1a1410'; x.fillRect(-L / 4, -W / 2 + 2, L / 2, W - 4);   // lo scavo vero, buio
      x.fillStyle = '#5c5a58'; x.fillRect(L / 4 - 2, -W / 2, 14, W); x.fillStyle = 'rgba(30,30,30,.5)'; for (let q = 0; q < 14; q += 3) x.fillRect(L / 4 - 2 + q, -W / 2, 1, W);   // piastra d'acciaio
      x.restore(); });
  }

  // ---- scivoli dei marciapiedi davanti alle strisce: il marciapiede scende a filo strada ----
  function scivoli1(H, R, NW, NH) {
    const ramp = new Float32Array(H.length); S1.ramp = ramp;
    crossings35().forEach(c => { const ux = c.ux, uy = c.uy, rx = -uy, ry = ux, half = c.w / 2, ext = half + 2.6;
      const x0 = c.x - ext - 2, x1 = c.x + ext + 2, z0 = c.y - ext - 2, z1 = c.y + ext + 2;
      for (let j = Math.max(0, Math.floor(z0 / R)); j <= Math.min(NH - 1, Math.ceil(z1 / R)); j++) for (let i = Math.max(0, Math.floor(x0 / R)); i <= Math.min(NW - 1, Math.ceil(x1 / R)); i++) {
        const k = j * NW + i; if (H[k] < .002) continue; const dx = i * R - c.x, dz = j * R - c.y, al = Math.abs(dx * ux + dz * uy), pe = Math.abs(dx * rx + dz * ry);
        if (pe < half - .5 || pe > ext) continue;
        const sstep = (a, b, t) => { t = clamp((t - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
        const low = (1 - sstep(1.2, 1.9, al)) * (1 - sstep(half + 1.1, half + 2.3, pe)); if (low <= ramp[k]) continue;
        ramp[k] = low; H[k] *= 1 - .82 * low; }
    });
  }
  function scivoloCol1(c, k) { const a = S1.ramp && S1.ramp[k]; if (a > .05) c.lerp(_c35.set('#8c857a'), a * .6); return c; }

  // ================= OGGETTI =================
  function signTex1(kind, text) {
    const key = kind + '|' + (text || ''); if (S1.tex[key]) return S1.tex[key];
    const W = kind === 'name' || kind === 'city' || kind === 'cityend' || kind === 'trail' ? 128 : 64, Hh = kind === 'name' || kind === 'trail' ? 32 : kind === 'city' || kind === 'cityend' ? 56 : 64, c = mk(W, Hh), x = c.getContext('2d'), rr = rng(key.length * 97 + (text || '').length * 7);
    x.clearRect(0, 0, W, Hh); x.textAlign = 'center'; x.textBaseline = 'middle';
    const poly = (pts, fill) => { x.beginPath(); pts.forEach(([a, b], i) => i ? x.lineTo(a, b) : x.moveTo(a, b)); x.closePath(); x.fillStyle = fill; x.fill(); };
    if (kind === 'stop') { const o = []; for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; o.push([32 + Math.cos(a) * 30, 32 + Math.sin(a) * 30]); } poly(o, '#e8e2d4'); const o2 = o.map(([a, b]) => [32 + (a - 32) * .88, 32 + (b - 32) * .88]); poly(o2, '#a82a22'); x.fillStyle = '#ece6d8'; x.font = 'bold 17px sans-serif'; x.fillText('STOP', 32, 33); }
    else if (kind === 'yield') { poly([[3, 6], [61, 6], [32, 60]], '#a82a22'); poly([[13, 11], [51, 11], [32, 47]], '#e8e2d4'); }
    else if (kind === 'ped') { x.fillStyle = '#2a4a7a'; x.fillRect(3, 3, 58, 58); x.strokeStyle = '#e8e2d4'; x.lineWidth = 2; x.strokeRect(5, 5, 54, 54); poly([[32, 9], [57, 53], [7, 53]], '#e8e2d4');
      x.fillStyle = '#1a1a1a'; x.fillRect(16, 47, 32, 3); for (let i = 0; i < 4; i++) x.fillRect(18 + i * 8, 42, 5, 3); x.beginPath(); x.arc(33, 22, 3, 0, 6.3); x.fill(); x.lineWidth = 3; x.strokeStyle = '#1a1a1a'; x.beginPath(); x.moveTo(33, 25); x.lineTo(31, 34); x.lineTo(27, 41); x.moveTo(31, 34); x.lineTo(36, 41); x.moveTo(32, 28); x.lineTo(26, 31); x.moveTo(32, 28); x.lineTo(38, 31); x.stroke(); }
    else if (kind === 'noentry') { x.fillStyle = '#a82a22'; x.beginPath(); x.arc(32, 32, 29, 0, 6.3); x.fill(); x.fillStyle = '#e8e2d4'; x.fillRect(12, 27, 40, 10); }
    else if (kind === 'speed') { x.fillStyle = '#e8e2d4'; x.beginPath(); x.arc(32, 32, 29, 0, 6.3); x.fill(); x.strokeStyle = '#a82a22'; x.lineWidth = 7; x.beginPath(); x.arc(32, 32, 25, 0, 6.3); x.stroke(); x.fillStyle = '#1a1a1a'; x.font = 'bold 22px sans-serif'; x.fillText(text, 32, 34); }
    else if (kind === 'chev') { x.fillStyle = '#a82a22'; x.fillRect(4, 8, 56, 48); x.fillStyle = '#e8e2d4'; for (let i = 0; i < 2; i++) { const o = 14 + i * 18; poly([[o, 12], [o + 12, 32], [o, 52], [o + 7, 52], [o + 19, 32], [o + 7, 12]], '#e8e2d4'); } }
    else if (kind === 'works') { poly([[32, 4], [61, 58], [3, 58]], '#a82a22'); poly([[32, 14], [52, 52], [12, 52]], '#e0c040'); x.fillStyle = '#1a1a1a'; x.beginPath(); x.arc(30, 27, 3, 0, 6.3); x.fill(); x.fillRect(27, 31, 5, 10); x.fillRect(32, 33, 8, 2); x.fillRect(39, 31, 2, 14); x.fillRect(22, 44, 22, 3); poly([[24, 41], [32, 41], [36, 47], [20, 47]], '#1a1a1a'); }
    else if (kind === 'narrow') { poly([[32, 4], [61, 58], [3, 58]], '#a82a22'); poly([[32, 14], [52, 52], [12, 52]], '#e0c040'); x.fillStyle = '#1a1a1a'; poly([[24, 50], [28, 50], [28, 34], [24, 28]], '#1a1a1a'); x.fillRect(36, 26, 4, 24); }
    else if (kind === 'city' || kind === 'cityend') { x.fillStyle = '#e8e2d4'; x.fillRect(2, 2, W - 4, Hh - 4); x.strokeStyle = '#1a1a1a'; x.lineWidth = 3; x.strokeRect(5, 5, W - 10, Hh - 10); x.fillStyle = '#1a1a1a'; x.font = 'bold 19px sans-serif'; x.fillText(text, W / 2, Hh / 2 + 1);
      if (kind === 'cityend') { x.strokeStyle = '#a82a22'; x.lineWidth = 6; x.beginPath(); x.moveTo(8, Hh - 8); x.lineTo(W - 8, 8); x.stroke(); } }
    else if (kind === 'cam') { x.fillStyle = '#e0c040'; x.fillRect(2, 2, 60, 60); x.strokeStyle = '#1a1a1a'; x.lineWidth = 3; x.strokeRect(4, 4, 56, 56); x.fillStyle = '#1a1a1a'; x.fillRect(16, 14, 26, 14); x.fillRect(42, 18, 8, 6); x.fillRect(22, 28, 4, 8); x.fillRect(14, 36, 16, 3); x.font = 'bold 8px sans-serif'; x.fillText('ВИДЕО-', 32, 46); x.fillText('КОНТРОЛЬ', 32, 55); }
    else if (kind === 'pedzone') { x.fillStyle = '#2a4a7a'; x.fillRect(3, 3, 58, 58); x.fillStyle = '#e8e2d4'; x.beginPath(); x.arc(32, 32, 24, 0, 6.3); x.fill(); x.fillStyle = '#1a1a1a'; x.beginPath(); x.arc(28, 16, 4, 0, 6.3); x.fill(); x.lineWidth = 4; x.strokeStyle = '#1a1a1a'; x.beginPath(); x.moveTo(28, 20); x.lineTo(26, 34); x.lineTo(20, 46); x.moveTo(26, 34); x.lineTo(33, 46); x.moveTo(27, 25); x.lineTo(19, 30); x.moveTo(27, 25); x.lineTo(36, 30); x.stroke(); x.beginPath(); x.arc(40, 30, 3, 0, 6.3); x.fill(); x.beginPath(); x.moveTo(40, 33); x.lineTo(40, 42); x.stroke(); }
    else if (kind === 'nopark') { x.fillStyle = '#2a4a8a'; x.beginPath(); x.arc(32, 32, 27, 0, 6.3); x.fill(); x.strokeStyle = '#a82a22'; x.lineWidth = 6; x.beginPath(); x.arc(32, 32, 25, 0, 6.3); x.stroke(); x.beginPath(); x.moveTo(14, 14); x.lineTo(50, 50); x.stroke(); }
    else if (kind === 'trail') { x.clearRect(0, 0, W, Hh); x.fillStyle = '#c8b08a'; x.beginPath(); x.moveTo(2, 2); x.lineTo(W - 18, 2); x.lineTo(W - 2, Hh / 2); x.lineTo(W - 18, Hh - 2); x.lineTo(2, Hh - 2); x.closePath(); x.fill(); x.fillStyle = '#e8e2d4'; x.fillRect(W - 30, 2, 8, Hh - 4); x.fillStyle = '#b02a22'; x.fillRect(W - 22, 2, 5, Hh - 4); x.fillStyle = '#3a2a1a'; let fs = 14; x.font = 'bold ' + fs + 'px serif'; while (x.measureText(text).width > W - 44 && fs > 7) { fs--; x.font = 'bold ' + fs + 'px serif'; } x.fillText(text, (W - 30) / 2 + 2, Hh / 2 + 1); for (let i = 0; i < 5; i++) { x.fillStyle = 'rgba(90,60,30,.35)'; x.fillRect(4, 4 + i * 5, W - 40, 1); } }
    else if (kind === 'name') { x.fillStyle = '#d8d2c4'; x.fillRect(1, 1, W - 2, Hh - 2); x.strokeStyle = '#3a3a3a'; x.lineWidth = 2; x.strokeRect(3, 3, W - 6, Hh - 6); x.fillStyle = '#2a2a2a'; let fs = 15; x.font = 'bold ' + fs + 'px serif'; while (x.measureText(text).width > W - 12 && fs > 8) { fs--; x.font = 'bold ' + fs + 'px serif'; } x.fillText(text, W / 2, Hh / 2 + 1); }
    // ruggine, adesivi, fori di proiettile, sole che ha mangiato il rosso
    x.globalCompositeOperation = 'source-atop';
    for (let k = 0; k < 12; k++) { x.fillStyle = `rgba(${90 + rr() * 40},${50 + rr() * 20},30,${rr() * .45})`; x.beginPath(); x.arc(rr() * W, rr() * Hh, 1 + rr() * 4, 0, 6.3); x.fill(); }
    x.fillStyle = 'rgba(230,220,200,.12)'; x.fillRect(0, 0, W, Hh * .4);
    for (let k = 0; k < 2 + Math.floor(rr() * 3); k++) { x.fillStyle = '#121212'; x.beginPath(); x.arc(8 + rr() * (W - 16), 8 + rr() * (Hh - 16), 1.3, 0, 6.3); x.fill(); }
    if (rr() < .4) { x.fillStyle = pick(rr, ['#c8b030', '#e8e2d4', '#8a2a2a', '#2a2a2a']); x.fillRect(6 + rr() * (W - 20), 6 + rr() * (Hh - 16), 10, 6); }
    x.globalCompositeOperation = 'source-over';
    return (S1.tex[key] = canvasTex(c));
  }
  const signMat1 = (kind, text) => { const k = 'm|' + kind + '|' + (text || ''); return S1.tex[k] || (S1.tex[k] = new THREE.MeshStandardMaterial({ map: signTex1(kind, text), transparent: true, alphaTest: .5, roughness: .55, metalness: .1 })); };
  const signDim1 = kind => kind === 'name' ? [1, .25] : kind === 'city' || kind === 'cityend' ? [1.5, .66] : [.75, .75];
  // un palo con uno o più cartelli, dall'alto in basso; piastra di metallo dietro (il retro è grigio)
  function signPost1(x, z, rot, plates, r) {
    if (!okSpot1(x, z, .2)) return null; const g = G0(), post = sm('#5a5c5e', { metalness: .5, roughness: .6 }), back = sm('#4a4c4e', { metalness: .4, roughness: .7 });
    let y = 2.55; const tilt = r() < .15 ? (r() - .5) * .35 : (r() - .5) * .05;
    plates.forEach(([kind, text]) => { const [w, h] = signDim1(kind); add(g, new THREE.Mesh(new THREE.PlaneGeometry(w, h), signMat1(kind, text)), 0, y - h / 2, .045);
      const bk = kind === 'stop' || kind === 'speed' || kind === 'noentry' || kind === 'nopark' ? cyl(w * .47, w * .47, .02, 12, back) : box(w * .94, h * .94, .02, back); if (bk.geometry.type === 'CylinderGeometry') bk.rotation.x = Math.PI / 2; add(g, bk, 0, y - h / 2, .02, bk.rotation.x, 0, 0); y -= h + .06; });
    add(g, cyl(.04, .045, 2.6, 6, post), 0, 1.3, 0); add(g, cyl(.07, .07, .06, 6, sm('#3a3a3a')), 0, .03, 0);
    g.rotation.z = tilt; return place(g, x, z, rot);
  }
  // ---- semafori: palo zincato, lanterna a tre luci con le visiere, pannello nero; le luci le accende tickStrade1 ----
  function semaforo1(J, a, phase) {
    const ux = a.ux, uy = a.uy, rx = uy, ry = -ux, d = J.r + 2.4, off = a.w / 2 + .75, x0 = J.x + ux * d + rx * off, z0 = J.y + uy * d + ry * off; let x = x0, z = z0;
    for (const sh of [0, .9, -.9, 1.8]) { const x2 = x0 + ux * sh, z2 = z0 + uy * sh; if (!solid1(x2, z2) && !onCarr1(x2, z2, .1) && !busy1(x2, z2, .35)) { x = x2; z = z2; break; } if (sh === 1.8) return false; }   // non sopra un lampione o un arredo
    const g = G0(), galv = sm('#7a7c7a', { metalness: .55, roughness: .5 }), blk = sm('#1c1c1e', { roughness: .6 }), rot = Math.atan2(ux, uy);
    add(g, cyl(.07, .08, 3.4, 8, galv), 0, 1.7, 0); add(g, cyl(.12, .14, .3, 8, sm('#3a3a3a')), 0, .15, 0);
    add(g, box(.34, 1.02, .26, blk), 0, 3.0, .12); add(g, box(.5, 1.2, .03, blk), 0, 3.0, -.02);                // lanterna e pannello di contrasto
    for (let i = 0; i < 3; i++) { add(g, box(.3, .05, .2, blk), 0, 3.45 - i * .32, .33, -.3, 0, 0); }          // visiere
    add(g, box(.22, .5, .16, blk), -.32, 1.75, .06); add(g, box(.24, .05, .14, blk), -.32, 2.02, .16);          // il pedonale, spento
    add(g, new THREE.Mesh(new THREE.PlaneGeometry(.42, .42), signMat1('ped')), .02, 2.3, -.1, 0, Math.PI, 0);
    const o = place(g, x, z, rot), last = DZ.props[DZ.props.length - 1], rec = last && last.obj === o ? last : null, gy = groundH(x, z);
    // le tre lenti: mesh vive (cambiano colore), più l'alone
    const lens = ['#3a0c0a', '#3a2a08', '#0a2a14'].map((c, i) => { const m = new THREE.Mesh(new THREE.CircleGeometry(.1, 10), new THREE.MeshBasicMaterial({ color: c, toneMapped: false, fog: false }));
      m.position.set(x + Math.sin(rot) * .26, gy + 3.32 - i * .32, z + Math.cos(rot) * .26); m.rotation.y = rot; scene.add(m); return m; });
    const gl = glow(x + Math.sin(rot) * .32, gy + 3.0, z + Math.cos(rot) * .32, '#ffffff', 1.3, false); gl.material.opacity = 0;
    S1.heads.push({ lens, gl, phase, rec, ofs: (Math.round(J.x + J.y) % 7) * 1.3, gy }); return true;
  }
  const LAMP1 = [['#ff3a24', '#3a0c0a'], ['#ffb020', '#3a2a08'], ['#40ff90', '#0a2a14']];
  function tickStrade1(time, night) {
    S1.heads.forEach(h => {
      if (h.rec && h.rec.state !== 0) { if (h.lens[0].visible) { h.lens.forEach(m => { m.visible = false; }); h.gl.visible = false; } return; }
      let on = -1;
      if (night > .72) on = Math.sin(time * 4.2 + h.ofs) > 0 ? 1 : -1;   // il coprifuoco: giallo lampeggiante
      else { const t = (time + h.ofs) % 38, A = t < 14 ? 2 : t < 17 ? 1 : 0, B = t >= 19 && t < 33 ? 2 : t >= 33 && t < 36 ? 1 : 0; on = h.phase ? B : A; }
      h.lens.forEach((m, i) => m.material.color.set(LAMP1[i][i === on ? 0 : 1]));
      if (on >= 0) { h.gl.material.color.set(LAMP1[on][0]); h.gl.position.y = h.gy + 3.32 - (2 - on) * .32; h.gl.material.opacity = .25 + night * .55; } else h.gl.material.opacity = 0;
    });
    S1.blink.forEach(b => { b.material.opacity = Math.sin(time * 5 + b.userData.ph) > .2 ? .55 + night * .4 : .04; });
  }
  // ---- jersey di cemento o di plastica (bianchi e rossi, si riempiono d'acqua) ----
  let JG1 = null;
  function jersey1(x, z, rot, plastic, col) {
    if (!JG1) { const s = new THREE.Shape(); [[-.3, 0], [.3, 0], [.28, .08], [.12, .26], [.08, .8], [-.08, .8], [-.12, .26], [-.28, .08]].forEach(([a, b], i) => i ? s.lineTo(a, b) : s.moveTo(a, b)); JG1 = new THREE.ExtrudeGeometry(s, { depth: 1.9, bevelEnabled: false }); JG1.translate(0, 0, -.95); }
    const g = G0(), m = new THREE.Mesh(JG1, plastic ? sm(col || '#c8c2b6', { roughness: .7 }) : concrete(pick(rng(Math.round(x * 13 + z)), ['#8e8a82', '#86827a', '#7e7a72']))); m.scale.set(1, plastic ? .9 : 1, 1); g.add(m);
    if (!plastic) add(g, box(.62, .1, 1.9, sm('#3a3632', { roughness: 1 })), 0, .03, 0);
    return place(g, x, z, rot);
  }
  // rete arancione da cantiere fra due paletti
  function netTex1() { if (S1.net) return S1.net; const c = mk(32, 32), x = c.getContext('2d'); x.clearRect(0, 0, 32, 32); x.strokeStyle = '#e06a1e'; x.lineWidth = 2;
    for (let i = -32; i < 64; i += 8) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 16, 32); x.stroke(); x.beginPath(); x.moveTo(i + 16, 0); x.lineTo(i, 32); x.stroke(); }
    x.fillStyle = '#e06a1e'; x.fillRect(0, 0, 32, 2); x.fillRect(0, 30, 32, 2); const t = canvasTex(c); t.wrapS = THREE.RepeatWrapping; return (S1.net = t); }
  function netFence1(ax, az, bx, bz) {
    const L = Math.hypot(bx - ax, bz - az); if (L < .3) return; const g = G0(), mt = new THREE.MeshLambertMaterial({ map: netTex1(), transparent: true, alphaTest: .4, side: THREE.DoubleSide }); mt.map = mt.map.clone(); mt.map.needsUpdate = true; mt.map.repeat.set(L / 1.1, 1);
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(L, 1), mt); add(g, pl, 0, .6, 0);
    [-L / 2, L / 2].forEach(o => { add(g, cyl(.02, .02, 1.2, 5, PM.iron()), o, .6, 0); add(g, box(.3, .12, .2, concrete('#7a7672')), o, .06, 0); });
    g.position.set((ax + bx) / 2, groundH((ax + bx) / 2, (az + bz) / 2), (az + bz) / 2); g.rotation.y = Math.atan2(-(bz - az), bx - ax); addStatic(g);
  }
  function lampada1(x, y, z) { const s = glow(x, y, z, '#f0a030', 1.2, false); s.userData.ph = (x * 7 + z * 3) % 6; S1.blink.push(s); add(scene, new THREE.Mesh(new THREE.SphereGeometry(.07, 6, 4), sb('#f0a030')), x, y, z); }

  function buildStrade1() {
    const T = G.T, r = rng(1986); let n = 0;
    // 1) semafori e cartelli agli incroci
    junc1().forEach(J => {
      const a0 = J.arms[0]; J.arms.forEach(a => { a.phase = Math.abs(a.ux * a0.ux + a.uy * a0.uy) > .6 ? 0 : 1; });
      J.arms.forEach(a => {
        const rx = a.uy, ry = -a.ux, rot = Math.atan2(a.ux, a.uy);
        if (J.signal) { if (semaforo1(J, a, a.phase)) n++; return; }
        if (a.minor) { const d = J.r + (J.city ? 2.2 : 2), off = a.w / 2 + (J.city ? .8 : 1.1), x = J.x + a.ux * d + rx * off, z = J.y + a.uy * d + ry * off;
          const big = J.arms.some(b => !b.minor && (b.rd.kind === 'litoranea' || b.w >= 8));
          const plates = [[big || J.city && a.w >= 7 ? 'stop' : 'yield']]; if (J.city && r() < .5) plates.push(['name', a.rd.name]);
          if (signPost1(x, z, rot, plates, r)) n++; }
      });
    });
    // 2) attraversamenti pedonali: il cartello blu dove non c'è il semaforo
    crossings35().forEach((c, i) => { if (junc1().some(J => J.signal && Math.hypot(J.x - c.x, J.y - c.y) < J.r + 6)) return; if (r() < .35) return;
      const rx = c.uy, ry = -c.ux, x = c.x + c.ux * 1.6 + rx * (c.w / 2 + .7), z = c.y + c.uy * 1.6 + ry * (c.w / 2 + .7); if (signPost1(x, z, Math.atan2(c.ux, c.uy), [['ped']], r)) n++; });
    // 3) inizio e fine città, limiti; frecce nelle curve; paletti delineatori — fuori città
    const NAME = 'ПОРТО-ВЕККЬО';
    (M.roads || []).forEach((rd, ri) => {
      if (!asph1(rd) || !rd.pts || rd.pts.length < 10) return; const g = geo1(rd), P = rd.pts, side = sideOf1(rd), rr = rng(ri * 31 + 9);
      const ext = rd.kind === 'strada' || rd.kind === 'litoranea';
      // cambi di zona stabili (25 m di città da una parte e di campagna dall'altra)
      if (ext) { let last = -999; for (let k = 3; k < g.n - 3; k++) { const c1 = cityAt1(P[k][0], P[k][1]), c0 = cityAt1(P[k - 1][0], P[k - 1][1]); if (c1 === c0 || g.s[k] - last < 60) continue;
        let okz = true; for (let q = k; q < g.n && g.s[q] - g.s[k] < 25; q += 2) if (cityAt1(P[q][0], P[q][1]) !== c1) { okz = false; break; } for (let q = k - 1; q >= 0 && g.s[k] - g.s[q] < 25; q -= 2) if (cityAt1(P[q][0], P[q][1]) === c1) { okz = false; break; } if (!okz) continue;
        last = g.s[k]; const fx = g.ux[k], fy = g.uy[k], into = c1 ? 1 : -1;   // verso di chi entra in città
        // chi entra: cartello col nome e il 50, alla sua destra; chi esce: il nome sbarrato e il 70
        [[into, 'city', '50'], [-into, 'cityend', '70']].forEach(([dir, kind, lim]) => { const dx = fx * dir, dy = fy * dir, rx = -dy, ry = dx, off = rd.w / 2 + side + .8, x = P[k][0] + rx * off - dx * 4, z = P[k][1] + ry * off - dy * 4;
          if (signPost1(x, z, Math.atan2(-dx, -dy), [[kind, NAME], ['speed', lim]], rr)) n++; }); } }
      if (!ext) return;
      // frecce di curva sul lato esterno delle curve strette, paletti ogni 20 m
      let nextD = 6 + rr() * 10, inCurve = -99;
      for (let k = 2; k < g.n - 2; k++) {
        const [x0, z0] = P[k]; if (cityAt1(x0, z0) || nearJ1(x0, z0, 4) < 0) continue; const nx = -g.uy[k], nz = g.ux[k], cv = g.cv[k];
        if (Math.abs(cv) > .62 && g.s[k] - inCurve > 6) { inCurve = g.s[k]; const sd = cv > 0 ? -1 : 1, off = rd.w / 2 + side + .9, x = x0 + nx * sd * off, z = z0 + nz * sd * off;   // il lato esterno
          const e = rd.edge ? rd.edge[k * 2 + (sd > 0 ? 0 : 1)] : 0;
          if (e !== 1 && okSpot1(x, z, .2)) { const gg = G0(); add(gg, cyl(.035, .04, 1.4, 6, sm('#5a5c5e', { metalness: .5 })), 0, .7, 0); add(gg, new THREE.Mesh(new THREE.PlaneGeometry(.6, .5), new THREE.MeshStandardMaterial({ map: signTex1('chev'), transparent: true, alphaTest: .5, side: THREE.DoubleSide, roughness: .6 })), 0, 1.15, 0, 0, cv > 0 ? 0 : Math.PI, 0); place(gg, x, z, Math.atan2(-nx * sd, -nz * sd)); n++; } }
        if (g.s[k] < nextD) continue; nextD = g.s[k] + 20 + rr() * 4;
        [0, 1].forEach(si => { const sd = si ? -1 : 1, e = rd.edge ? rd.edge[k * 2 + si] : 0; if (e) return;   // dove c'è guardrail, roccia o mare no
          const off = rd.w / 2 + side + .55, x = x0 + nx * sd * off, z = z0 + nz * sd * off; if (!okSpot1(x, z, .15) || rr() < .15) return;
          const gg = G0(), wh = sm('#d8d4ca', { roughness: .7 }); add(gg, box(.1, .95, .1, wh), 0, .47, 0, rr() < .1 ? (rr() - .5) * .5 : 0, 0, 0); add(gg, box(.105, .14, .105, sm('#1a1a1a')), 0, .8, 0); add(gg, box(.04, .1, .02, sb(si ? '#c84a1a' : '#e8e0d0')), 0, .8, .055);
          place(gg, x, z, Math.atan2(g.ux[k], g.uy[k])); n++; });
      }
    });
    // 4) ringhiere sul mare e sui salti in città (fuori città pensa il guardrail di [isola31])
    const rail = sm('#3a4440', { metalness: .5, roughness: .6 }), railR = sm('#6a4a36', { metalness: .3, roughness: .8 }), cap = concrete('#8a8680');
    (M.roads || []).forEach(rd => { if (!rd.edge || !urb1(rd)) return; const g0 = geo1(rd), P = rd.pts, side = sideOf1(rd);
      [0, 1].forEach(si => { let run = []; const flush = () => { if (run.length >= 3) { const g = new THREE.Group(), rm = r() < .3 ? railR : rail;
          for (let k = 0; k < run.length; k++) { const q = run[k], y = groundH(q.x, q.z); add(g, box(.06, 1.0, .06, rm), q.x, y + .5, q.z);
            if (k < run.length - 1) { const q2 = run[k + 1], y2 = groundH(q2.x, q2.z), L = Math.hypot(q2.x - q.x, q2.z - q.z), ang = Math.atan2(-(q2.z - q.z), q2.x - q.x), sl = Math.atan2(y2 - y, L);
              [.98, .5].forEach(hh => add(g, box(L + .04, .05, .05, rm), (q.x + q2.x) / 2, (y + y2) / 2 + hh, (q.z + q2.z) / 2, 0, ang, sl));
              add(g, box(L + .04, .22, .3, cap), (q.x + q2.x) / 2, (y + y2) / 2 + .02, (q.z + q2.z) / 2, 0, ang, sl);   // cordolo di cemento sotto
              for (let t = .33; t < 1; t += .33) add(g, box(.025, .5, .025, rm), q.x + (q2.x - q.x) * t, y + (y2 - y) * t + .73, q.z + (q2.z - q.z) * t); } }
          addStatic(g); n++; } run = []; };
        for (let k = 1; k < P.length - 1; k++) { const e = rd.edge[k * 2 + si], sd = si ? -1 : 1, nx = -g0.uy[k] * sd, nz = g0.ux[k] * sd, off = rd.w / 2 + side + .25, x = P[k][0] + nx * off, z = P[k][1] + nz * off;
          if (!((e === 2 || e === 3) && cityAt1(x, z)) || nearJ1(x, z, 1) < 0 || G.tileAt(Math.floor(x / TS), Math.floor(z / TS)) === T.BLD) { flush(); continue; }
          if (run.length && Math.hypot(run[run.length - 1].x - x, run[run.length - 1].z - z) < 2) continue; run.push({ x, z }); }
        flush(); }); });
    // 5) cantieri in città: scavo dipinto, rete arancione attorno, barriere bianche e rosse a imbuto, cartelli, lampade gialle, ghiaia
    works1().forEach(w => {
      const { ux, uy, nx, ny } = w, L = w.len / 2 + .5, W = w.wid / 2 + .4, c = (a, b) => [w.x + ux * a + nx * b, w.y + uy * a + ny * b];
      [[-L, -W, L, -W], [L, -W, L, W], [L, W, -L, W], [-L, W, -L, -W]].forEach(([a1, b1, a2, b2]) => { const p = c(a1, b1), q = c(a2, b2); netFence1(p[0], p[1], q[0], q[1]); });
      for (let q = 0; q < 4; q++) { const p = c(-L - 2 - q * 2, -W + q * .45 - .9), col = q % 2 ? '#c8c2b6' : '#a83a2a'; jersey1(p[0], p[1], Math.atan2(ux, uy) + .22, true, col); const pl = c(-L - 2 - q * 2, -W + q * .45 - .9); if (q % 2 === 0) lampada1(pl[0], groundH(pl[0], pl[1]) + .85, pl[1]); }
      [c(L, -W), c(L, W), c(-L, W)].forEach(p => lampada1(p[0], groundH(p[0], p[1]) + 1.25, p[1]));
      // cartelli: lavori e strettoia 25 m prima, sul lato di chi arriva
      const back = 22, s1 = c(-L - back, 0), side = w.w / 2 + 1, sx = s1[0] + nx * (side - w.w / 4), sz = s1[1] + ny * (side - w.w / 4);
      signPost1(sx, sz, Math.atan2(-ux, -uy), [['works'], ['narrow']], r);
      const pile = c(L + 1.4, 0); const gp = G0(); add(gp, new THREE.Mesh(new THREE.ConeGeometry(1.1, .7, 9), sm('#8a8478', { roughness: 1 })), 0, .3, 0); add(gp, new THREE.Mesh(new THREE.ConeGeometry(.7, .5, 8), sm('#6a5a44', { roughness: 1 })), .9, .22, .4);
      add(gp, cyl(.35, .35, .5, 10, PM.wood()), -.8, .25, -.6, Math.PI / 2, 0, 0); place(gp, pile[0], pile[1], r() * 6);   // ghiaia, terra, bobina di cavo
      n++;
    });
    // 6) new jersey ai posti di blocco della Tutela e alla Base: file di cemento con lo spazio per passare
    [G.PLACES.varco, G.PLACES.piazza_gov, G.PLACES.muro, G.PLACES.eliporto, G.PLACES.molo_cargo].forEach((p, pi) => { if (!p) return;
      for (let row = 0; row < 2; row++) { const a = pi * 1.1 + row * Math.PI, cx = p.x + Math.cos(a) * 11, cz = p.y + Math.sin(a) * 11, tx = -Math.sin(a), tz = Math.cos(a);
        for (let q = -3; q <= 3; q++) { if (q === 0) continue; const x = cx + tx * q * 2, z = cz + tz * q * 2; if (!okSpot1(x, z, .5)) continue; jersey1(x, z, Math.atan2(tx, tz), false); n++; } } });
    if (window.__dbg35) console.log('[dbg] strade1', n, 'semafori', JSON.stringify(junc1().filter(j => j.signal).map(j => [Math.round(j.x), Math.round(j.y)])), 'cantieri', JSON.stringify(works1().map(w => [Math.round(w.x), Math.round(w.y)])), 'buche', holes1List().length);
    return n;
  }

  // ================= [strade1] LA VITA PER TERRA =================
  // Come nei riferimenti di Andrea: la strada è piena di cose lasciate, portate dal vento, dimenticate. Nella canaletta contro il
  // cordolo carte, lattine, bottiglie, foglie e mozziconi; al piede dei muri erbacce, cartoni, sacchi, mattoni e calcinacci, cassette,
  // pile di giornali; ciuffi d'erba che spuntano fra cordolo e asfalto, fra le lastre, fra i basoli dei vicoli. Tutto fuso nella geometria
  // statica (non si urta): solo le cose più grandi occupano posto (OCC35) e non finiscono addosso agli arredi.
  function grassTex1(kind) {
    const key = 'gr' + kind; if (S1.tex[key]) return S1.tex[key]; const c = mk(32, 32), x = c.getContext('2d'), r = rng(kind * 17 + 3); x.clearRect(0, 0, 32, 32);
    const cols = [['#6a7a3a', '#56682e', '#8a8a48', '#4a5a2a'], ['#9a8a52', '#8a7444', '#b0a066', '#76663c'], ['#4e6a34', '#3e5a2a', '#62803e', '#2e4a22']][kind];
    for (let i = 0; i < 26; i++) { const bx = 4 + r() * 24, h = 10 + r() * 21, lean = (r() - .5) * 10; x.strokeStyle = pick(r, cols); x.lineWidth = 1 + (r() < .3 ? 1 : 0); x.beginPath(); x.moveTo(bx, 32); x.quadraticCurveTo(bx + lean * .3, 32 - h * .6, bx + lean, 32 - h); x.stroke(); }
    const t = canvasTex(c); return (S1.tex[key] = t);
  }
  let TUFT1 = null;
  function tuftGeo1() { if (TUFT1) return TUFT1; const P = [], U = [], N = [];   // tre piani incrociati, base a terra
    for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3, cx = Math.cos(a) * .5, cz = Math.sin(a) * .5, q = [[-cx, 0, -cz, 0, 0], [cx, 0, cz, 1, 0], [cx, 1, cz, 1, 1], [-cx, 1, -cz, 0, 1]];
      [0, 1, 2, 0, 2, 3].forEach(k => { P.push(q[k][0], q[k][1], q[k][2]); U.push(q[k][3], q[k][4]); N.push(0, 1, 0); }); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); return (TUFT1 = g); }
  const tuftMat1 = kind => { const k = 'tm' + kind; return S1.tex[k] || (S1.tex[k] = new THREE.MeshLambertMaterial({ map: grassTex1(kind), transparent: true, alphaTest: .45, side: THREE.DoubleSide })); };
  // carta, giornali, volantini, cartone: un atlante 4×2 di pezzi piatti
  function paperTex1() {
    if (S1.tex.paper) return S1.tex.paper; const c = mk(128, 64), x = c.getContext('2d'), r = rng(77);
    for (let i = 0; i < 8; i++) { const ox = (i % 4) * 32, oy = Math.floor(i / 4) * 32, kind = i % 4;
      x.fillStyle = ['#d8d2c2', '#cfc8b4', '#b8955e', '#e2dccc'][kind]; x.fillRect(ox + 1, oy + 1, 30, 30);
      if (kind === 0 || kind === 1) { x.fillStyle = 'rgba(40,36,34,.75)'; x.fillRect(ox + 3, oy + 3, 26, 4); for (let l = 9; l < 29; l += 2) x.fillRect(ox + 3 + (l % 4), oy + l, 10 + r() * 14, 1); if (r() < .6) { x.fillStyle = 'rgba(60,56,54,.6)'; x.fillRect(ox + 18, oy + 10, 10, 8); } }
      else if (kind === 2) { x.fillStyle = 'rgba(90,64,34,.6)'; x.fillRect(ox + 1, oy + 15, 30, 1); x.fillStyle = 'rgba(40,30,20,.7)'; x.font = 'bold 8px sans-serif'; x.fillText(pick(r, ['ХРУПКО', '↑↑', 'РЫБА', '사과']), ox + 4, oy + 26); }
      else { x.fillStyle = pick(r, ['#a82a22', '#2a4a7a', '#1a1a1a']); x.fillRect(ox + 4, oy + 4, 24, 10); x.fillStyle = 'rgba(30,30,30,.7)'; for (let l = 17; l < 28; l += 3) x.fillRect(ox + 5, oy + l, 22, 1); }
      x.fillStyle = 'rgba(70,60,46,.35)'; for (let k = 0; k < 6; k++) x.fillRect(ox + r() * 28, oy + r() * 28, 3 + r() * 6, 2 + r() * 4);   // sporco e acqua
    }
    const t = canvasTex(c); return (S1.tex.paper = t);
  }
  function piece1(kind, w, h) { const g = new THREE.PlaneGeometry(w, h), uv = g.attributes.uv, ox = (kind % 4) / 4, oy = 1 - Math.floor(kind / 4) / 2 - .5;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, ox + uv.getX(i) * .25, oy + uv.getY(i) * .5); g.rotateX(-Math.PI / 2); return g; }
  let PAPM1 = null; const paperM = () => PAPM1 || (PAPM1 = new THREE.MeshLambertMaterial({ map: paperTex1() }));
  function buildVita1() {
    const T = G.T, r = rng(4242); let n = 0, nt = 0;
    const paperM = new THREE.MeshLambertMaterial({ map: paperTex1(), side: THREE.DoubleSide });
    const can = [sm('#a8322a', { metalness: .6, roughness: .4 }), sm('#b8b8b0', { metalness: .7, roughness: .35 }), sm('#2a5a8a', { metalness: .6, roughness: .4 })], glass = [sm('#2a5a32', { roughness: .2, metalness: .1 }), sm('#6a4a22', { roughness: .2 }), sm('#9aa8a0', { roughness: .15 })];
    const bag = [sm('#1a1a1c', { roughness: .35 }), sm('#3a4a5a', { roughness: .4 }), sm('#d8d4c8', { roughness: .5 })], brick = sm('#8a4a36', { roughness: 1 }), rubble = [concrete('#8a867e'), concrete('#6e6a64'), sm('#7a6a5a', { roughness: 1 })];
    const card = sm('#9a7a4a', { roughness: 1 }), leaf = [sm('#7a5a2a', { roughness: 1 }), sm('#5a4a28', { roughness: 1 }), sm('#8a6a34', { roughness: 1 })];
    const at = (x, z) => groundH(x, z);
    const stat = (mesh, x, z, ry, y0) => { mesh.position.set(x, at(x, z) + (y0 || 0), z); mesh.rotation.y = ry; addStatic(mesh); n++; };
    const tuft = (x, z, s, kind) => { const m = new THREE.Mesh(tuftGeo1(), tuftMat1(kind)); m.scale.set(s * (.8 + r() * .5), s, s * (.8 + r() * .5)); m.position.set(x, at(x, z) - .02, z); m.rotation.y = r() * 6; addStatic(m, true); nt++; };
    const paper = (x, z) => { const k = Math.floor(r() * 8), w = k % 4 === 2 ? .5 + r() * .5 : .22 + r() * .25, m = new THREE.Mesh(piece1(k, w, w * (.7 + r() * .5)), paperM); m.rotation.set(0, 0, 0); m.position.set(x, at(x, z) + .015, z); m.rotation.y = r() * 6; m.rotation.x = (r() - .5) * .2; addStatic(m, true); n++; };
    const smallThing = (x, z) => { const q = r();
      if (q < .3) { const m = cyl(.033, .033, .12, 7, pick(r, can)); m.rotation.z = Math.PI / 2; m.position.set(x, at(x, z) + .035, z); m.rotation.y = r() * 6; addStatic(m, true); n++; }   // lattina schiacciata a terra
      else if (q < .48) { const g = G0(), gm = pick(r, glass); add(g, cyl(.04, .04, .2, 7, gm), 0, 0, 0); add(g, cyl(.015, .03, .08, 6, gm), 0, .13, 0); g.rotation.set(0, r() * 6, Math.PI / 2 - .05); g.position.set(x, at(x, z) + .04, z); addStatic(g, true); n++; }   // bottiglia
      else if (q < .7) { for (let i = 0; i < 4 + Math.floor(r() * 6); i++) { const m = new THREE.Mesh(new THREE.CircleGeometry(.05 + r() * .04, 5), pick(r, leaf)); m.rotation.x = -Math.PI / 2; const lx = x + (r() - .5) * .6, lz = z + (r() - .5) * .4; m.position.set(lx, at(lx, lz) + .012, lz); addStatic(m, true); n++; } }   // foglie secche
      else paper(x, z); };
    const bigThing = (x, z, ry) => { const q = r(), g = G0();
      if (q < .22) { const k = 2 + Math.floor(r() * 3); for (let i = 0; i < k; i++) add(g, new THREE.Mesh(new THREE.SphereGeometry(.22 + r() * .1, 6, 5), pick(r, bag)), (r() - .5) * .5, .16, (r() - .5) * .4, 0, r() * 3, 0); }   // sacchi della spazzatura
      else if (q < .42) { for (let i = 0; i < 4 + Math.floor(r() * 6); i++) add(g, new THREE.Mesh(new THREE.DodecahedronGeometry(.06 + r() * .14, 0), pick(r, rubble)), (r() - .5) * .8, .06, (r() - .5) * .5, r(), r(), r()); for (let i = 0; i < 3; i++) add(g, box(.22, .07, .11, brick), (r() - .5) * .7, .04 + i * .02, (r() - .5) * .4, 0, r() * 3, r() * .3); }   // calcinacci e mattoni
      else if (q < .58) { add(g, box(.55 + r() * .3, .03, .4 + r() * .2, card), 0, .02, 0, 0, 0, .05); if (r() < .6) add(g, box(.4, .3, .3, card), (r() - .5) * .3, .17, .1, 0, r(), 0); }   // cartoni appiattiti, una scatola
      else if (q < .7) { for (let i = 0; i < 5; i++) add(g, box(.32, .025, .24, sm(pick(r, ['#d4cebe', '#c8c2b0', '#bcb6a2']), { roughness: 1 })), (r() - .5) * .04, .015 + i * .025, (r() - .5) * .04, 0, (r() - .5) * .3, 0); add(g, box(.33, .01, .01, sm('#6a5a3a')), 0, .14, 0); }   // pila di giornali legata
      else if (q < .82) { add(g, cyl(.28, .28, .17, 12, sm('#1c1c1c', { roughness: .9 })), 0, .085, 0); if (r() < .5) add(g, cyl(.28, .28, .17, 12, sm('#1c1c1c', { roughness: .9 })), .05, .26, .03); }   // copertoni
      else { add(g, box(.5, .28, .34, sm(pick(r, ['#2a5a8a', '#a8322a', '#3a6a3a', '#8a7a4a']), { roughness: .7 })), 0, .14, 0); for (let i = 0; i < 3; i++) add(g, cyl(.035, .035, .2, 6, pick(r, glass)), -.15 + i * .15, .38, 0); }   // cassetta di vuoti
      if (!OCC35.free(x, z, .45, .35)) return false; OCC35.mark(x, z, .45, .35); g.position.set(x, at(x, z), z); g.rotation.y = ry; addStatic(g); n++; return true; };
    // 1) lungo le vie: canaletta, cordolo, marciapiede, piede del muro
    (M.roads || []).forEach((rd, ri) => {
      if (!rd.pts || rd.pts.length < 3 || rd.kind === 'sterrato') return; const g = geo1(rd), P = rd.pts, side = sideOf1(rd), vic = rd.kind === 'vicolo', rr = rng(ri * 911 + 3);
      for (let k = 1; k < g.n - 1; k++) {
        if (g.s[k] % 1.3 > (g.s[k] - g.s[k - 1]) + .01 && g.s[k] > 2) continue;   // un passo ogni ~1,3 m
        const [x0, z0] = P[k]; if (!cityAt1(x0, z0) && !vic) continue; if (nearJ1(x0, z0, 0) < -1) continue;
        const nx = -g.uy[k], nz = g.ux[k], ry = Math.atan2(g.ux[k], g.uy[k]);
        [-1, 1].forEach(sd => {
          const off = (o) => [x0 + nx * sd * o, z0 + nz * sd * o];
          // canaletta: carte, lattine, bottiglie, foglie contro il cordolo
          { const [x, z] = off(rd.w / 2 - .25 - rr() * .2); if (rr() < (vic ? .2 : .42) && !solid1(x, z)) smallThing(x, z); }
          // erba che spunta fra cordolo e asfalto (o fra i basoli lungo il muro, nei vicoli)
          { const [x, z] = off(rd.w / 2 + (vic ? -.15 : .02)); if (rr() < (vic ? .45 : .38) && !solid1(x, z)) tuft(x, z, .26 + rr() * .3, rr() < .5 ? 0 : 1); }
          if (vic || !side) return;
          // sul marciapiede: un foglio, un volantino, erba fra le lastre
          { const [x, z] = off(rd.w / 2 + .5 + rr() * (side - .9)); if (!solid1(x, z) && !onCarr1(x, z, 0)) { const q = rr(); if (q < .14) paper(x, z); else if (q < .2) smallThing(x, z); else if (q < .34) tuft(x, z, .18 + rr() * .16, 0); } }
          // al piede del muro: erbacce fitte, e le cose grandi
          { const [x, z] = off(rd.w / 2 + side - .3); const behind = off(rd.w / 2 + side + .9); const wall = G.tileAt(Math.floor(behind[0] / TS), Math.floor(behind[1] / TS)) === T.BLD;
            if (!solid1(x, z) && !onCarr1(x, z, 0)) { if (rr() < (wall ? .6 : .4)) for (let q = 0; q < 1 + Math.floor(rr() * 4); q++) tuft(x + (rr() - .5) * .7, z + (rr() - .5) * .6, .28 + rr() * .4, rr() < .35 ? 2 : rr() < .6 ? 0 : 1);
              if (rr() < (wall ? .22 : .1)) bigThing(x, z, ry + (rr() - .5) * .6); else if (rr() < .3) smallThing(x, z); } }
        });
        // nei vicoli anche qualcosa in mezzo, contro il muro
        if (vic && rr() < .16) { const sd = rr() < .5 ? 1 : -1, x = x0 + nx * sd * (rd.w / 2 - .4), z = z0 + nz * sd * (rd.w / 2 - .4); if (!solid1(x, z)) bigThing(x, z, ry); }
      }
    });
    // 2) piazze, cortili, soglie: erba nelle fughe, cartacce sparse
    for (let ty = 0; ty < G.GH; ty++) for (let tx = 0; tx < G.GW; tx++) {
      if (zoneT(tx, ty) !== ZN.CITTA) continue; const v = gT(tx, ty); if (v !== T.PIAZZA && v !== T.WALK && v !== T.COB && v !== T.DIRT) continue;
      const h = th(tx, ty, 4242); if (h > (v === T.DIRT ? .6 : .3)) continue; const x = tx * TS + .3 + th(tx, ty, 4243) * 1.4, z = ty * TS + .3 + th(tx, ty, 4244) * 1.4; if (solid1(x, z) || busy1(x, z, .15)) continue;
      if (h < .17) tuft(x, z, .2 + h * 2, v === T.DIRT ? 1 : 0); else if (h < .24) paper(x, z); else smallThing(x, z);
    }
    if (window.__dbg35) console.log('[dbg] vita1 oggetti', n, 'ciuffi', nt);
    return n + nt;
  }

  // ================= [strade1] SENTIERI E CIOTTOLATI SENZA GRADINI =================
  // Fuori città le caselle di terra battuta e di ciottolato erano quadrati da 2 m: ogni bordo una scaletta. Ora la casella si
  // dipinge come il terreno naturale che ha attorno, e la terra o i ciottoli si stendono sopra come una forma continua: un disco
  // per casella e un raccordo verso le caselle uguali vicine (anche in diagonale), col bordo morbido. Sui ciottoli in pendenza le
  // file seguono il mondo, non la casella.
  const K1 = v => { const T = G.T; return v === T.DIRT ? 1 : v === T.COB || v === T.STAIRS ? 2 : 0; };
  const blobTile1 = (tx, ty) => { if (tx < 0 || ty < 0 || tx >= G.GW || ty >= G.GH) return 0; const ii = ty * G.GW + tx; if (zoneT(tx, ty) === ZN.CITTA || RECT[ii]) return 0; const v = gT(tx, ty), k = K1(v); if (k === 1 && RW[ii] > 0) return 0; return k; };
  function natural1(tx, ty) {
    const T = G.T, cnt = new Map(); [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([a, b]) => { const v = gT(tx + a, ty + b); if (v === T.GRASS || v === T.TREE || v === T.SHRUB || v === T.FIELD || v === T.DESERT || v === T.GRAVEL || v === T.ROCK) cnt.set(v, (cnt.get(v) || 0) + (a && b ? 1 : 2)); });
    let best = T.GRASS, bn = 0; cnt.forEach((c, v) => { if (c > bn) { bn = c; best = v; } }); return best;
  }
  function blobPat1(kind, x) {
    const key = 'bp' + kind; let c = S1.tex[key];
    if (!c) { const S = 64, r = rng(kind * 31 + 1); c = mk(S, S); const g = c.getContext('2d');
      if (kind === 1) { g.fillStyle = '#86684a'; g.fillRect(0, 0, S, S); for (let i = 0; i < 700; i++) { g.fillStyle = pick(r, ['#94765a', '#7a5e42', '#9a7e60', '#6e5440', '#a08868']); g.fillRect(Math.floor(r() * S), Math.floor(r() * S), 1 + (r() < .2 ? 1 : 0), 1); } for (let i = 0; i < 14; i++) { g.fillStyle = 'rgba(60,44,30,.35)'; g.fillRect(Math.floor(r() * S), Math.floor(r() * S), 3 + Math.floor(r() * 5), 1); } }
      else { g.fillStyle = '#34303a'; g.fillRect(0, 0, S, S); for (let sy = 0; sy < S; sy += 3) { const off = Math.floor(r() * 4); for (let sx = -off; sx < S; sx += 4 + (r() < .3 ? 1 : 0)) { g.fillStyle = pick(r, ['#827a86', '#746c7a', '#8e8692', '#686072', '#7a7066']); g.fillRect(sx, sy, 3, 2); } } for (let i = 0; i < 30; i++) { g.fillStyle = pick(r, ['rgba(70,90,40,.6)', 'rgba(50,64,32,.55)']); g.fillRect(Math.floor(r() * S), Math.floor(r() * S / 3) * 3 + 2, 2, 1); } }
      S1.tex[key] = c; }
    return x.createPattern(c, 'repeat');
  }
  function blobs1(x, tx0, ty0, n, m) {
    const X0 = tx0 * TS, Y0 = ty0 * TS, H = TS / 2;
    [1, 2].forEach(kind => {
      const list = []; for (let j = -2; j < m + 2; j++) for (let i = -2; i < n + 2; i++) if (blobTile1(tx0 + i, ty0 + j) === kind) list.push([tx0 + i, ty0 + j]); if (!list.length) return;
      const shape = (w) => { x.beginPath(); list.forEach(([tx, ty]) => { const cx = (tx * TS + H - X0) * PPM, cy = (ty * TS + H - Y0) * PPM;
          // un disco un po' storto per casella (rumore del mondo, uguale fra i blocchi) e i raccordi verso le uguali
          const rr = (w + (th(tx, ty, 811) - .5) * .5) * PPM; x.moveTo(cx + rr, cy); x.arc(cx, cy, rr, 0, 6.2832);
          [[1, 0], [0, 1], [1, 1], [-1, 1]].forEach(([a, b]) => { if (blobTile1(tx + a, ty + b) !== kind) return; if (a && b && blobTile1(tx + a, ty) === kind && blobTile1(tx, ty + b) === kind) return;
            const ex = cx + a * TS * PPM, ey = cy + b * TS * PPM, L = Math.hypot(ex - cx, ey - cy), nx = -(ey - cy) / L * w * PPM * .92, ny = (ex - cx) / L * w * PPM * .92;
            x.moveTo(cx + nx, cy + ny); x.lineTo(ex + nx, ey + ny); x.lineTo(ex - nx, ey - ny); x.lineTo(cx - nx, cy - ny); x.closePath(); }); });
        x.fill('nonzero'); };
      x.fillStyle = kind === 1 ? 'rgba(70,54,38,.45)' : 'rgba(30,28,32,.55)'; shape(1.42);            // bordo morbido: terra smossa, fuga scura
      const p = blobPat1(kind, x); try { p.setTransform(new DOMMatrix([1, 0, 0, 1, -((X0 * PPM) % 64), -((Y0 * PPM) % 64)])); } catch (e) {}
      x.fillStyle = p; shape(1.18);
    });
  }

  // ---- il bosco: radura o sottobosco è un campo continuo fra i centri delle caselle, non una decisione per casella ----
  function openTile1(tx, ty) {
    const T = G.T; if (tx < 0 || ty < 0 || tx >= G.GW || ty >= G.GH) return .5; const ii = ty * G.GW + tx; let v = gT(tx, ty);
    if (RW[ii] > 0 && (v === T.VIA || v === T.DIRT)) return .55;   // sotto e accanto alle strade: a metà, la strada la dipinge smoothRoads
    if (v === T.GRASS) return 1; if (v === T.SHRUB) return vnz((tx * TS + 1) / 23 + 17, (ty * TS + 1) / 23 + 17) > .05 ? .8 : .3; if (v === T.TREE) return 0; return .5;
  }
  function open1(X, Y, k1) {   // media pesata sulle caselle entro 5 m: le radure hanno contorni naturali
    const cx = X / TS - .5, cy = Y / TS - .5, i0 = Math.round(cx), j0 = Math.round(cy); let sw = 0, sv = 0;
    for (let j = j0 - 2; j <= j0 + 2; j++) for (let i = i0 - 2; i <= i0 + 2; i++) { const d = Math.hypot(i - cx, j - cy), w = Math.max(0, 1 - d / 2.6); if (w <= 0) continue; const ww = w * w; sw += ww; sv += ww * openTile1(i, j); }
    return sv / (sw || 1) + k1 * .6 + vnz(X / 4.3 + 9, Y / 4.3 + 9) * .25 > .5;
  }
  // ---- tagli di roccia e muri di sostegno: forma continua (dischi e raccordi fra caselle uguali) col bordo che sfuma ----
  function opere1(x, tx0, ty0, n, m, F, cut, wall) {
    const P = TP, list = [[], []];
    for (let j = -1; j <= m; j++) for (let i = -1; i <= n; i++) { const tx = tx0 + i, ty = ty0 + j; if (tx < 0 || ty < 0 || tx >= G.GW || ty >= G.GH) continue; const f = F[ty * G.GW + tx]; if (f & 16384) list[1].push([i, j]); else if (f & 1024) list[0].push([i, j]); }
    const has = (k, i, j) => { const tx = tx0 + i, ty = ty0 + j; if (tx < 0 || ty < 0 || tx >= G.GW || ty >= G.GH) return false; const f = F[ty * G.GW + tx]; return k ? !!(f & 16384) : !!(f & 1024) && !(f & 16384); };
    [0, 1].forEach(k => { if (!list[k].length) return;
      const shape = rad => { x.beginPath(); list[k].forEach(([i, j]) => { const cx = i * P + P / 2, cy = j * P + P / 2, rr = rad * P * (.92 + th(tx0 + i, ty0 + j, 917) * .16); x.moveTo(cx + rr, cy); x.arc(cx, cy, rr, 0, 6.2832);
        [[1, 0], [0, 1], [1, 1], [-1, 1]].forEach(([a, b]) => { if (!has(k, i + a, j + b)) return; if (a && b && has(k, i + a, j) && has(k, i, j + b)) return; const ex = cx + a * P, ey = cy + b * P, L = Math.hypot(a, b) * P, nx = -(ey - cy) / L * rad * P * .9, ny = (ex - cx) / L * rad * P * .9;
          x.moveTo(cx + nx, cy + ny); x.lineTo(ex + nx, ey + ny); x.lineTo(ex - nx, ey - ny); x.lineTo(cx - nx, cy - ny); x.closePath(); }); }); x.fill('nonzero'); };
      x.globalAlpha = .45; x.fillStyle = k ? wall : cut; shape(.74); x.globalAlpha = 1; shape(.58);
    });
  }

  // ================= [strade1] CONTINUITÀ: TERRENO A MEZZO METRO, STERRATE CONSUMATE DAL PASSAGGIO =================
  // Il terreno naturale fuori dal bosco non è più un quadrato di colore per casella: ogni mezzo metro sceglie il suo tipo da un voto
  // pesato delle caselle entro 5 m (più un rumore per tipo), e il colore varia con un rumore continuo del mondo. Le sterrate sono
  // opere usate: banchina d'erba pestata, bordo sfrangiato, terra battuta con ghiaia, solchi delle ruote con la gobba d'erba e le
  // pozzanghere sulle carrabili, centro lucidato e sassi ai margini sui sentieri. L'asfalto fuori città ha il bordo sbrecciato.
  const NATC1 = { 9: [[74, 104, 52], [92, 100, 56]], 18: [[86, 96, 56], [100, 98, 62]], 13: [[52, 60, 36], [62, 54, 36]], 16: [[176, 146, 100], [160, 132, 90]], 12: [[112, 106, 100], [96, 92, 86]], 20: [[150, 144, 134], [124, 118, 110]] };   // ... roccia, ghiaia   // erba, macchia, sottobosco, deserto, roccia
  function natType1(tx, ty) { const T = G.T; if (tx < 0 || ty < 0 || tx >= G.GW || ty >= G.GH) return -1; const ii = ty * G.GW + tx; let v = gT(tx, ty); if (!RECT[ii] && RW[ii] > 0 && (v === T.VIA || v === T.DIRT)) v = groundFor(zoneT(tx, ty)); if (blobTile1(tx, ty)) v = natural1(tx, ty); return NATC1[v] ? v : -1; }
  function natSub1(x, px, py, P, tx, ty, r, v, z) {
    if (!NATC1[v] || z === ZN.CITTA) return false; const S4 = P / 4, wx = tx * TS, wy = ty * TS, votes = new Map(), T = G.T;
    const near = []; for (let j = ty - 3; j <= ty + 3; j++) for (let i = tx - 3; i <= tx + 3; i++) { const t = natType1(i, j); if (t >= 0) near.push([i + .5, j + .5, t]); }
    for (let sj = 0; sj < 4; sj++) for (let si = 0; si < 4; si++) {
      const X = wx + (si + .5) * .5, Y = wy + (sj + .5) * .5, cx = X / TS, cy = Y / TS; votes.clear();
      for (const [i, j, t] of near) { const d = Math.hypot(i - cx, j - cy), w = Math.max(0, 1 - d / 2.6); if (w > 0) votes.set(t, (votes.get(t) || 0) + w * w); }
      let best = v, bv = -1; votes.forEach((s, t) => { const q = s * (1 + vnz(X / 3.7 + t * 13, Y / 3.7 - t * 7) * .9); if (q > bv) { bv = q; best = t; } });
      const pal = NATC1[best], k = vnz(X / 7, Y / 7) + vnz(X / 2.1, Y / 2.1) * .35, mix = Math.max(0, Math.min(1, .5 + vnz(X / 13 + 5, Y / 13 + 5) * 1.4)), dry = z === ZN.MONTE || z === ZN.DESERTO || z === ZN.SPIAGGIA;
      let c0 = pal[0].map((q, i2) => q + (pal[1][i2] - q) * mix); if (best === 9 && dry) c0 = [c0[0] + 22, c0[1] - 4, c0[2] - 4];
      const f = 1 + k * .22; x.fillStyle = `rgb(${Math.round(c0[0] * f)},${Math.round(c0[1] * f)},${Math.round(c0[2] * f)})`; const sx = px + si * S4, sy = py + sj * S4; x.fillRect(sx, sy, S4, S4);
      for (let q = 0; q < 2; q++) { const g = .75 + r() * .5; x.fillStyle = `rgb(${Math.round(c0[0] * g)},${Math.round(c0[1] * g)},${Math.round(c0[2] * g)})`; x.fillRect(sx + Math.floor(r() * S4), sy + Math.floor(r() * S4), 1, 1 + (best === 9 && r() < .5 ? 1 : 0)); }
    }
    return true;
  }
  // polilinea spostata di lato (o > 0 a sinistra della direzione), dentro il riquadro del blocco
  function offPath1(x, rd, o, X0, Y0, X1, Y1, pad) { const g = geo1(rd), P = rd.pts; let on = false; x.beginPath();
    for (let k = 0; k < g.n; k++) { const px = P[k][0] - g.uy[k] * o, py = P[k][1] + g.ux[k] * o; if (!inBox1(px, py, X0, Y0, X1, Y1, pad)) { on = false; continue; } const cx = (px - X0) * PPM, cy = (py - Y0) * PPM; if (on) x.lineTo(cx, cy); else { x.moveTo(cx, cy); on = true; } } }
  function dirtPat1(x, X0, Y0) {
    let c = S1.tex.dirtc; if (!c) { const S = 128, r = rng(5150); c = mk(S, S); const g = c.getContext('2d'), img = g.createImageData(S, S), d = img.data;
      for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) { const n1 = vnz(px / 9, py / 9) + vnz(px / 3, py / 3) * .5, o = (py * S + px) * 4, b = 128 + n1 * 26; d[o] = b + 6; d[o + 1] = b * .82; d[o + 2] = b * .6; d[o + 3] = 255; }
      g.putImageData(img, 0, 0); for (let i = 0; i < 900; i++) { const v2 = 110 + Math.floor(r() * 90); g.fillStyle = `rgb(${v2},${v2 - 8},${v2 - 20})`; g.fillRect(Math.floor(r() * S), Math.floor(r() * S), 1, 1); }   // ghiaino
      for (let i = 0; i < 60; i++) { g.fillStyle = pick(r, ['#5a4632', '#463626', '#9a8c78']); g.fillRect(Math.floor(r() * S), Math.floor(r() * S), 2, 1 + (r() < .4 ? 1 : 0)); }   // sassi
      S1.tex.dirtc = c; }
    const p = x.createPattern(c, 'repeat'), sc = 16 * PPM / c.width; try { p.setTransform(new DOMMatrix([sc, 0, 0, sc, -((X0 * PPM) % (16 * PPM)), -((Y0 * PPM) % (16 * PPM))])); } catch (e) {} return p;
  }
  function sterrato1(x, tx0, ty0, n, m) {
    const X0 = tx0 * TS, Y0 = ty0 * TS, X1 = (tx0 + n) * TS, Y1 = (ty0 + m) * TS;
    x.lineJoin = 'round'; x.lineCap = 'round';
    const R = (M.roads || []).filter(rd => rd.kind === 'sterrato' && rd.pts && rd.pts.length > 1 && rd.pts.some(p => inBox1(p[0], p[1], X0, Y0, X1, Y1, rd.w + 6)));
    // 1) banchina d'erba pestata, 2) bordo sfrangiato, 3) terra battuta: le larghe prima, così i sentieri restano leggibili sopra
    R.sort((a, b) => b.w - a.w);
    R.forEach(rd => { offPath1(x, rd, 0, X0, Y0, X1, Y1, rd.w + 6); x.lineWidth = (rd.w + 2.4) * PPM; x.strokeStyle = 'rgba(92,80,54,.22)'; x.stroke(); x.lineWidth = (rd.w + 1.1) * PPM; x.strokeStyle = 'rgba(88,70,48,.38)'; x.stroke(); });
    R.forEach(rd => { const g = geo1(rd), P = rd.pts; x.fillStyle = dirtPat1(x, X0, Y0);
      for (let k = 0; k < g.n; k++) { const [ax, ay] = P[k]; if (!inBox1(ax, ay, X0, Y0, X1, Y1, rd.w + 3)) continue;
        for (const sd of [-1, 1]) { const e = rd.w / 2 + vnz(ax * 1.3 + sd * 50, ay * 1.3) * .5, bx = ax - g.uy[k] * e * sd, by = ay + g.ux[k] * e * sd, rr = (.25 + (vnz(ax * 2.1, ay * 2.1 + sd * 9) + .5) * .3) * PPM; x.beginPath(); x.arc((bx - X0) * PPM, (by - Y0) * PPM, rr, 0, 6.2832); x.fill(); } }
      offPath1(x, rd, 0, X0, Y0, X1, Y1, rd.w + 6); x.lineWidth = rd.w * PPM; x.strokeStyle = dirtPat1(x, X0, Y0); x.stroke(); });
    // 4) il passaggio: solchi e gobba sulle carrabili, centro lucidato sui sentieri; pozzanghere e sassi
    R.forEach((rd, ri) => { const g = geo1(rd), P = rd.pts, cart = rd.w >= 2.8;
      if (cart) { const o = Math.min(rd.w / 2 - .45, .85);
        [-o, o].forEach(oo => { offPath1(x, rd, oo, X0, Y0, X1, Y1, rd.w + 6); x.lineWidth = .5 * PPM; x.strokeStyle = 'rgba(62,46,32,.55)'; x.stroke(); x.lineWidth = .22 * PPM; x.strokeStyle = 'rgba(40,30,22,.45)'; x.stroke(); });
        offPath1(x, rd, 0, X0, Y0, X1, Y1, rd.w + 6); x.lineWidth = .55 * PPM; x.strokeStyle = 'rgba(108,108,62,.32)'; x.stroke();   // la gobba d'erba fra i solchi
        if (rd.w >= 4.5) [-o - .3, o + .3].forEach(oo => { offPath1(x, rd, oo, X0, Y0, X1, Y1, rd.w + 6); x.lineWidth = .3 * PPM; x.strokeStyle = 'rgba(176,150,112,.25)'; x.stroke(); });   // il bordo del solco schiacciato e chiaro
      } else { offPath1(x, rd, 0, X0, Y0, X1, Y1, rd.w + 6); x.lineWidth = rd.w * .5 * PPM; x.strokeStyle = 'rgba(176,148,108,.32)'; x.stroke(); x.lineWidth = rd.w * .22 * PPM; x.strokeStyle = 'rgba(196,170,128,.22)'; x.stroke(); }
      const r = rng(ri * 7717 + 3); let nextP = 4 + r() * 12;
      for (let k = 1; k < g.n; k++) { const [ax, ay] = P[k]; if (!inBox1(ax, ay, X0, Y0, X1, Y1, 3)) continue; const s = g.s[k], nx = -g.uy[k], ny = g.ux[k], h = th(Math.round(ax * 3), Math.round(ay * 3), 5151);
        if (cart && h < .045) { const oo = (h < .022 ? -1 : 1) * Math.min(rd.w / 2 - .45, .85), cx = (ax + nx * oo - X0) * PPM, cy = (ay + ny * oo - Y0) * PPM; x.save(); x.translate(cx, cy); x.rotate(Math.atan2(g.uy[k], g.ux[k])); x.fillStyle = 'rgba(40,34,30,.8)'; x.beginPath(); x.ellipse(0, 0, (.6 + h * 20) * PPM, .3 * PPM, 0, 0, 6.3); x.fill(); x.fillStyle = 'rgba(70,82,92,.75)'; x.beginPath(); x.ellipse(0, 0, (.45 + h * 16) * PPM, .2 * PPM, 0, 0, 6.3); x.fill(); x.fillStyle = 'rgba(150,160,166,.4)'; x.fillRect(-2, -1, 3, 1); x.restore(); }   // pozzanghera nel solco
        if (h > .7) { const sd = h > .85 ? 1 : -1, oo = sd * (rd.w / 2 + .1 + (h - .7) * 2), cx = (ax + nx * oo - X0) * PPM, cy = (ay + ny * oo - Y0) * PPM; x.fillStyle = pick(r, ['#8a8478', '#6e6860', '#a49c8e']); x.fillRect(Math.round(cx), Math.round(cy), 2, 1 + (h > .8 ? 1 : 0)); x.fillStyle = 'rgba(20,18,16,.5)'; x.fillRect(Math.round(cx), Math.round(cy) + 1, 2, 1); }   // sassi sul margine
      } });
    x.lineCap = 'butt';
  }
  // asfalto: tracce delle ruote sulle corsie; fuori città il bordo sbrecciato sulla banchina di ghiaia
  function usura1(x, tx0, ty0, n, m) {
    const X0 = tx0 * TS, Y0 = ty0 * TS, X1 = (tx0 + n) * TS, Y1 = (ty0 + m) * TS;
    x.lineJoin = 'round'; x.lineCap = 'round';
    (M.roads || []).forEach(rd => { if (!asph1(rd) || !rd.pts || !rd.pts.some(p => inBox1(p[0], p[1], X0, Y0, X1, Y1, rd.w + 4))) return; const g = geo1(rd), P = rd.pts;
      if (rd.w >= 5) [-1, 1].forEach(sd => [-.75, .75].forEach(d => { const o = sd * rd.w / 4 + d; offPath1(x, rd, o, X0, Y0, X1, Y1, rd.w + 4); x.lineWidth = .55 * PPM; x.strokeStyle = 'rgba(16,14,14,.13)'; x.stroke(); }));
      if (urb1(rd) && rd.kind !== 'litoranea') return;
      for (let k = 0; k < g.n; k++) { const [ax, ay] = P[k]; if (!inBox1(ax, ay, X0, Y0, X1, Y1, rd.w + 2) || cityAt1(ax, ay)) continue;
        for (const sd of [-1, 1]) { const h = vnz(ax * .9 + sd * 31, ay * .9); if (h < -.1) continue; const e = rd.w / 2 - .15 - h * .5, bx = ax - g.uy[k] * e * sd, by = ay + g.ux[k] * e * sd;
          x.fillStyle = 'rgba(96,88,76,.9)'; x.beginPath(); x.arc((bx - X0) * PPM, (by - Y0) * PPM, (.2 + h * .5) * PPM, 0, 6.2832); x.fill(); } } });
    x.lineCap = 'butt';
  }


  // ================= [strade1] QUARTA PASSATA: RACCORDI, CUNETTE, SEGNAVIA, CIPPI, OLIO =================
  // Dove una sterrata sbocca sull'asfalto le ruote portano fango e ghiaia; a monte delle strade scavate corre la cunetta (di cemento
  // sull'asfalto, un fosso sulle sterrate); negli stalli e davanti alle linee d'arresto le macchie d'olio. Fuori: cippi chilometrici,
  // segnavia di legno all'imbocco dei sentieri, ometti di pietra lungo le tracce.
  let MUD1 = null;
  function mud1List() {
    if (MUD1) return MUD1; MUD1 = []; const A = (M.roads || []).filter(rd => asph1(rd) && rd.pts);
    (M.roads || []).forEach(rd => { if (rd.kind !== 'sterrato' || !rd.pts || rd.pts.length < 3 || rd.traccia) return;
      [[0, 1], [rd.pts.length - 1, rd.pts.length - 2]].forEach(([e, f]) => { const [x, y] = rd.pts[e];
        for (const o of A) { const P = o.pts; let bd = 1e9, bk = 0; for (let k = 0; k < P.length; k++) { const d = Math.hypot(P[k][0] - x, P[k][1] - y); if (d < bd) { bd = d; bk = k; } }
          if (bd < o.w / 2 + 2.5) { const g = geo1(o); MUD1.push({ x, y, ux: g.ux[bk], uy: g.uy[bk], w: o.w, dx: x - rd.pts[f][0], dy: y - rd.pts[f][1], seed: Math.round(x * 7 + y) >>> 0 }); return; } } }); });
    return MUD1;
  }
  function raccordi1(x, tx0, ty0, n, m) {
    const X0 = tx0 * TS, Y0 = ty0 * TS, X1 = (tx0 + n) * TS, Y1 = (ty0 + m) * TS, C = (wx, wy) => [(wx - X0) * PPM, (wy - Y0) * PPM];
    // fango e ghiaia sulla bocca, scie delle ruote che girano nei due versi
    mud1List().forEach(q => { if (!inBox1(q.x, q.y, X0, Y0, X1, Y1, 12)) return; const r = rng(q.seed);
      for (let i = 0; i < 70; i++) { const a = r() * 6.28, d = Math.sqrt(r()) * 3, [cx, cy] = C(q.x + Math.cos(a) * d, q.y + Math.sin(a) * d); x.fillStyle = `rgba(${100 + r() * 30},${76 + r() * 20},${50 + r() * 10},${(.65 * (1 - d / 3.2)).toFixed(2)})`; x.fillRect(Math.round(cx), Math.round(cy), 1 + (r() < .3 ? 1 : 0), 1); }
      [-1, 1].forEach(sd => [-.8, .8].forEach(o => { for (let t = 0; t < 9; t += .25) { const al = .45 * (1 - t / 9); if (th(Math.round(t * 4), Math.round(o * 10 + sd), q.seed % 997) < .3) continue; const wx = q.x + q.ux * sd * t - q.uy * o * .5 + (q.ux * sd) * 0, wy = q.y + q.uy * sd * t + q.ux * o * .5, [cx, cy] = C(wx, wy); x.fillStyle = `rgba(92,70,48,${al.toFixed(2)})`; x.fillRect(Math.round(cx), Math.round(cy), 2, 1); } })); });
    (M.roads || []).forEach(rd => { if (!rd.edge || !rd.pts || rd.traccia || !rd.pts.some(p => inBox1(p[0], p[1], X0, Y0, X1, Y1, rd.w + 4))) return; const g = geo1(rd), P = rd.pts, asph = asph1(rd);
      if (!asph && rd.kind !== 'sterrato') return;
      // cunetta a monte (bordo 1 = roccia tagliata, o pendio che sale)
      [0, 1].forEach(si => { const sd = si ? -1 : 1, o = sd * (rd.w / 2 + (asph ? .35 : .25));
        for (let k = 0; k < g.n - 1; k++) { if (rd.edge[k * 2 + si] !== 1 || rd.edge[(k + 1) * 2 + si] !== 1 || cityAt1(P[k][0], P[k][1])) continue;
          const [ax, ay] = C(P[k][0] - g.uy[k] * o, P[k][1] + g.ux[k] * o), [bx, by] = C(P[k + 1][0] - g.uy[k + 1] * o, P[k + 1][1] + g.ux[k + 1] * o);
          x.lineCap = 'round'; x.beginPath(); x.moveTo(ax, ay); x.lineTo(bx, by);
          if (asph) { x.lineWidth = .55 * PPM; x.strokeStyle = 'rgba(132,128,120,.9)'; x.stroke(); x.lineWidth = .16 * PPM; x.strokeStyle = 'rgba(34,32,30,.75)'; x.stroke(); }   // cemento e il filo d'acqua
          else { x.lineWidth = .5 * PPM; x.strokeStyle = 'rgba(52,40,30,.6)'; x.stroke(); if (th(k, si, 5252) < .08) { x.fillStyle = 'rgba(66,78,86,.7)'; x.beginPath(); x.ellipse((ax + bx) / 2, (ay + by) / 2, 4, 2, Math.atan2(by - ay, bx - ax), 0, 6.3); x.fill(); } } } });
      // olio: negli stalli e davanti alle linee d'arresto
      if (asph && urb1(rd) && rd.w >= 8) { for (let k = 0; k < g.n; k++) { const [px, py] = P[k]; if (!inBox1(px, py, X0, Y0, X1, Y1, 3) || !cityAt1(px, py) || nearJ1(px, py, 8) < 0) continue;
          if (Math.floor(g.s[k] / 5) === Math.floor((g.s[k - 1] || -9) / 5)) continue; if (th(k, 1, 5353) > .55) continue; const o = rd.w / 2 - 1, [cx, cy] = C(px - g.uy[k] * o + g.ux[k] * 2.5, py + g.ux[k] * o + g.uy[k] * 2.5);
          x.fillStyle = 'rgba(10,10,14,.35)'; x.beginPath(); x.ellipse(cx, cy, 5 + th(k, 2, 5353) * 4, 3, Math.atan2(g.uy[k], g.ux[k]), 0, 6.3); x.fill(); } }
    });
    junc1().forEach(J => { if (!J.city || !inBox1(J.x, J.y, X0, Y0, X1, Y1, 20)) return; J.arms.forEach((a, i) => { const d = J.r + 5, o = a.w / 4, [cx, cy] = C(J.x + a.ux * d + a.uy * o, J.y + a.uy * d - a.ux * o); x.fillStyle = 'rgba(10,10,14,.3)'; x.beginPath(); x.ellipse(cx, cy, 6, 3.5, Math.atan2(a.uy, a.ux), 0, 6.3); x.fill(); }); });
  }
  function buildSegnavia1() {
    const r = rng(777), wood = sm('#6a4a30', { roughness: 1 }), woodL = sm('#8a6440', { roughness: 1 }), stone = [sm('#8a847a', { roughness: 1 }), sm('#6e6862', { roughness: 1 }), sm('#9a9286', { roughness: 1 })]; let n = 0;
    const R = M.roads || [];
    R.forEach((rd, ri) => {
      if (!rd.pts || rd.pts.length < 4) return; const g = geo1(rd), P = rd.pts;
      // segnavia di legno all'imbocco dei sentieri e delle sterrate con un nome
      if (rd.kind === 'sterrato' && rd.name) [[0, 1], [g.n - 1, -1]].forEach(([e, dir]) => { const [x0, z0] = P[e];
        const touches = R.some(o => o !== rd && o.pts && (o.kind !== 'sterrato' || o.w > rd.w) && o.pts.some(q => Math.hypot(q[0] - x0, q[1] - z0) < o.w / 2 + 2.5)); if (!touches) return;
        const k = Math.max(0, Math.min(g.n - 1, e + dir * 3)), ux = g.ux[k] * dir, uz = g.uy[k] * dir, sx = P[k][0] + uz * (rd.w / 2 + .8), sz = P[k][1] - ux * (rd.w / 2 + .8);
        if (!okSpot1(sx, sz, .25)) return; const gg = G0(); add(gg, box(.1, 1.9, .1, wood), 0, .95, 0);
        const name = rd.name.replace(/^(Sentiero|Mulattiera|Sterrata|Strada) (del |della |dei |delle |di |dello |degli )?/i, '').slice(0, 22);
        const bd = new THREE.Mesh(new THREE.PlaneGeometry(1.05, .24), new THREE.MeshStandardMaterial({ map: signTex1('trail', name), transparent: true, alphaTest: .5, side: THREE.DoubleSide, roughness: 1 })); add(gg, bd, .45, 1.65, .06);
        add(gg, box(.12, .14, .12, woodL), 0, 1.92, 0); place(gg, sx, sz, Math.atan2(-uz, ux)); n++; });
      // ometti di pietra lungo le tracce, dove il bosco si apre
      if (rd.traccia) { let next = 20 + r() * 30; for (let k = 1; k < g.n; k++) { if (g.s[k] < next) continue; next = g.s[k] + 30 + r() * 30; const sd = r() < .5 ? 1 : -1, x = P[k][0] - g.uy[k] * sd * 1.2, z = P[k][1] + g.ux[k] * sd * 1.2;
          if (!okSpot1(x, z, .3)) continue; const gg = G0(); let y = 0; for (let q = 0; q < 3 + Math.floor(r() * 3); q++) { const s0 = .22 - q * .035; const st = new THREE.Mesh(new THREE.DodecahedronGeometry(s0, 0), pick(r, stone)); st.scale.set(1, .55, 1); add(gg, st, (r() - .5) * .04, y + s0 * .45, (r() - .5) * .04, 0, r() * 3, 0); y += s0 * .9; }
          place(gg, x, z, r() * 6); n++; } }
      // cippi chilometrici ogni 200 m fuori città
      if ((rd.kind === 'strada' || rd.kind === 'litoranea') && g.s[g.n - 1] > 250) { const side = sideOf1(rd); for (let k = 1; k < g.n; k++) { if (Math.floor(g.s[k] / 200) === Math.floor(g.s[k - 1] / 200)) continue; const [px, pz] = P[k]; if (cityAt1(px, pz) || nearJ1(px, pz, 4) < 0) continue;
          const x = px + g.uy[k] * (rd.w / 2 + side + .7), z = pz - g.ux[k] * (rd.w / 2 + side + .7); if (!okSpot1(x, z, .2)) continue; const gg = G0(); add(gg, box(.26, .5, .14, sm('#d8d2c4', { roughness: .9 })), 0, .25, 0); add(gg, box(.27, .12, .15, sm('#a82a22', { roughness: .8 })), 0, .5, 0);
          place(gg, x, z, Math.atan2(g.ux[k], g.uy[k]) + Math.PI / 2); n++; } }
    });
    if (window.__dbg35) console.log('[dbg] segnavia1', n);
    return n;
  }

  // ================= [strade1] QUINTA PASSATA: SVOLTE, SCALINATE, IMPALCATURE, TELECAMERE, PALETTI, ORTI =================
  // Le svolte: fra due bracci di un incrocio l'angolo non è più lo spigolo di due strisce sovrapposte, ma una curva di 4 m tangente
  // ai due bordi (la Bézier col controllo nello spigolo è tangente a tutti e due).
  function svolte1(x, tx0, ty0, n, m) {
    const X0 = tx0 * TS, Y0 = ty0 * TS, X1 = (tx0 + n) * TS, Y1 = (ty0 + m) * TS, C = (a, b) => [(a - X0) * PPM, (b - Y0) * PPM];
    junc1().forEach(J => { if (!inBox1(J.x, J.y, X0, Y0, X1, Y1, 20)) return;
      const A = J.arms.slice().sort((p, q) => Math.atan2(p.uy, p.ux) - Math.atan2(q.uy, q.ux));
      for (let i = 0; i < A.length; i++) { const a = A[i], b = A[(i + 1) % A.length]; if (A.length === 2 && i === 1) break;
        let th0 = Math.atan2(b.uy, b.ux) - Math.atan2(a.uy, a.ux); while (th0 <= 0) th0 += Math.PI * 2; if (th0 < .5 || th0 > 2.7) continue;
        const dirt = a.rd.kind === 'sterrato' || b.rd.kind === 'sterrato'; if (COB1[a.rd.id] || COB1[b.rd.id]) continue;
        // bordo di a verso b e bordo di b verso a
        let nax = -a.uy, nay = a.ux; if (nax * b.ux + nay * b.uy < 0) { nax = -nax; nay = -nay; } let nbx = -b.uy, nby = b.ux; if (nbx * a.ux + nby * a.uy < 0) { nbx = -nbx; nby = -nby; }
        const pax = J.x + nax * a.w / 2, pay = J.y + nay * a.w / 2, pbx = J.x + nbx * b.w / 2, pby = J.y + nby * b.w / 2, den = a.ux * b.uy - a.uy * b.ux; if (Math.abs(den) < .1) continue;
        const t = ((pbx - pax) * b.uy - (pby - pay) * b.ux) / den, cx = pax + a.ux * t, cy = pay + a.uy * t, R = J.city ? 3.2 : 4.5, d = R / Math.tan(th0 / 2);
        const qa = C(cx + a.ux * d, cy + a.uy * d), qb = C(cx + b.ux * d, cy + b.uy * d), cc = C(cx, cy);
        x.beginPath(); x.moveTo(cc[0], cc[1]); x.lineTo(qa[0], qa[1]); x.quadraticCurveTo(cc[0], cc[1], qb[0], qb[1]); x.closePath();
        // prima il bordo (banchina), poi il fondo
        x.fillStyle = dirt ? dirtPat1(x, X0, Y0) : pat35(x, 'asfalto', X0, Y0); x.fill();
        x.save(); x.clip(); x.lineWidth = 1.2 * PPM; x.strokeStyle = dirt ? 'rgba(88,70,48,.4)' : 'rgba(20,18,18,.35)'; x.beginPath(); x.moveTo(qa[0], qa[1]); x.quadraticCurveTo(cc[0], cc[1], qb[0], qb[1]); x.stroke(); x.restore();
      } });
  }
  function buildUrbano1() {
    const T = G.T, r = rng(5555); let n = 0, ns = 0, ni = 0, nc = 0, np = 0, no = 0;
    const stone = sm('#7e786e', { roughness: .95 }), nose = sm('#a49c8e', { roughness: .9 }), iron = sm('#2a2c2e', { metalness: .5, roughness: .5 }), log = sm('#5a4430', { roughness: 1 });
    // 1) scalinate dove vicoli e sentieri superano il 15%: scalini di pietra col mancorrente in città, tronchi coi picchetti sui sentieri
    (M.roads || []).forEach(rd => { if (!rd.h || !rd.pts || !(rd.kind === 'vicolo' || rd.traccia || (rd.kind === 'sterrato' && rd.w <= 2))) return; const g = geo1(rd), P = rd.pts, vic = rd.kind === 'vicolo';
      let run = []; const flush = () => { if (run.length < 2) { run = []; return; } const k0 = run[0], k1 = run[run.length - 1], s0 = g.s[k0], s1 = g.s[k1]; if (s1 - s0 < 1.6) { run = []; return; }
        const at = s => { let k = k0; while (k < k1 && g.s[k + 1] < s) k++; const t = (s - g.s[k]) / ((g.s[k + 1] - g.s[k]) || 1); return [P[k][0] + (P[k + 1][0] - P[k][0]) * t, P[k][1] + (P[k + 1][1] - P[k][1]) * t, g.ux[k], g.uy[k]]; };
        const gr = new THREE.Group(), tread = vic ? .42 : 1.1, wd = vic ? rd.w - .3 : Math.min(rd.w, 1.3);
        for (let s = s0; s < s1 - tread * .5; s += tread) { const [ax, az, ux, uz] = at(s), [bx, bz] = at(Math.min(s1, s + tread)), ha = groundH(ax, az), hb = groundH(bx, bz), top = Math.max(ha, hb), low = Math.min(ha, hb), mx = (ax + bx) / 2, mz = (az + bz) / 2, rot = Math.atan2(ux, uz);
          if (vic) { const st = box(wd, top - low + .08, tread + .03, stone); st.position.set(mx, (top + low) / 2 - .02, mz); st.rotation.y = rot; gr.add(st); const hi = ha > hb ? [ax, az] : [bx, bz]; const ns2 = box(wd, .05, .06, nose); ns2.position.set(hi[0] + (mx - hi[0]) * .05, top + .02, hi[1] + (mz - hi[1]) * .05); ns2.rotation.y = rot; gr.add(ns2); }
          else { const lg = cyl(.09, .09, wd, 6, log); lg.rotation.set(0, rot + Math.PI / 2, Math.PI / 2); lg.position.set(mx, (ha + hb) / 2 + .06, mz); gr.add(lg); [-1, 1].forEach(sd => { const pk = box(.05, .3, .05, log); pk.position.set(mx + uz * sd * wd / 2, (ha + hb) / 2 + .1, mz - ux * sd * wd / 2); gr.add(pk); }); }
          ns++; }
        // mancorrente: in città ai due lati (tubo su piantane), sui sentieri una staccionata da un lato
        [-1, 1].forEach(sd => { if (!vic && sd < 0) return; const off = vic ? rd.w / 2 - .12 : Math.min(rd.w, 1.3) / 2 + .25; let prev = null;
          for (let s = s0; s <= s1 + .01; s += Math.min(1.5, (s1 - s0) / Math.max(1, Math.round((s1 - s0) / 1.5)))) { const [px, pz, ux, uz] = at(Math.min(s, s1)), x = px + uz * sd * off, z = pz - ux * sd * off, y = groundH(x, z);
            const pp = box(.05, .95, .05, vic ? iron : log); pp.position.set(x, y + .47, z); gr.add(pp);
            if (prev) { const L = Math.hypot(x - prev[0], z - prev[1]), tb = box(L + .04, .05, .05, vic ? iron : log); tb.position.set((x + prev[0]) / 2, (y + prev[2]) / 2 + .92, (z + prev[1]) / 2); tb.rotation.set(0, Math.atan2(-(z - prev[1]), x - prev[0]), Math.atan2(y - prev[2], L)); gr.add(tb);
              if (!vic) { const tb2 = tb.clone(); tb2.position.y -= .45; gr.add(tb2); } }
            prev = [x, z, y]; } });
        addStatic(gr); n++; run = []; };
      for (let k = 1; k < g.n; k++) { const L = g.s[k] - g.s[k - 1]; if (L > 0 && Math.abs(rd.h[k] - rd.h[k - 1]) / L > .15 && nearJ1(P[k][0], P[k][1], 0) > 0) { if (!run.length) run.push(k - 1); run.push(k); } else flush(); } flush(); });
    // 2) impalcature su qualche facciata verso strada: tubi, tavole, diagonali, rete verde, il cartello; la porta resta libera
    const net = new THREE.MeshLambertMaterial({ color: '#3a5a3e', transparent: true, opacity: .55, side: THREE.DoubleSide, depthWrite: false }), tube = sm('#8a8c8e', { metalness: .6, roughness: .4 }), plank = sm('#8a6a44', { roughness: 1 });
    const cand = dyn.buildings.filter(rec => rec.b && rec.box3 && !rec.shack && !rec.special && cityAt1((rec.b.x + rec.b.w / 2) * TS, (rec.b.y + rec.b.h / 2) * TS) && (rec.b.fl || 1) >= 2);
    for (let tries = 0; tries < 60 && ni < 6 && cand.length; tries++) { const rec = pick(r, cand), b = rec.b, bb = rec.box3; if (rec.__imp) continue;
      const sides = [[0, -1], [0, 1], [-1, 0], [1, 0]].filter(([a, c]) => { const tx = a > 0 ? b.x + b.w : a < 0 ? b.x - 1 : b.x + Math.floor(b.w / 2), ty = c > 0 ? b.y + b.h : c < 0 ? b.y - 1 : b.y + Math.floor(b.h / 2), v = G.tileAt(tx, ty); return v === T.WALK || v === T.VIA || v === T.PIAZZA; }); if (!sides.length) continue;
      const [a, c] = pick(r, sides), along = a ? [0, 1] : [1, 0], L = a ? bb.max.z - bb.min.z : bb.max.x - bb.min.x, H = Math.min(bb.max.y - bb.min.y - .3, 9.5), y0 = bb.min.y;
      const fx = a > 0 ? bb.max.x : a < 0 ? bb.min.x : (bb.min.x + bb.max.x) / 2, fz = c > 0 ? bb.max.z : c < 0 ? bb.min.z : (bb.min.z + bb.max.z) / 2, door = b.door ? [(b.door[0] + .5) * TS, (b.door[1] + .5) * TS] : null;
      const gr = new THREE.Group(), lv = Math.max(2, Math.floor(H / 2)); let any = false;
      for (let u = -L / 2 + .4; u <= L / 2 - .4; u += 1.8) { const bx = fx + along[0] * u, bz = fz + along[1] * u; if (door && Math.hypot(door[0] - bx, door[1] - bz) < 1.6) continue;
        for (const dd of [.35, 1.35]) { const px = bx + a * dd, pz = bz + c * dd; if (onCarr1(px, pz, 0)) continue; any = true; const t1 = box(.05, H, .05, tube); t1.position.set(px, y0 + H / 2, pz); gr.add(t1); }
        for (let l = 1; l <= lv; l++) { const yy = y0 + l * 2; if (yy > y0 + H) break; const pl = box(a ? 1.1 : 1.8, .05, a ? 1.8 : 1.1, plank); pl.position.set(bx + a * .85, yy, bz + c * .85); gr.add(pl); const rl = box(a ? .04 : 1.8, .04, a ? 1.8 : .04, tube); rl.position.set(bx + a * 1.35, yy + 1, bz + c * 1.35); gr.add(rl); }
        const dg = box(.04, Math.hypot(1.8, 2), .04, tube); dg.position.set(bx + a * 1.38, y0 + 1, bz + c * 1.38); dg.rotation.set(a ? .73 : 0, 0, a ? 0 : .73); gr.add(dg); }
      if (!any) continue; const nw = new THREE.Mesh(new THREE.PlaneGeometry(L - .6, H * .7), net); nw.position.set(fx + a * 1.42, y0 + H * .62, fz + c * 1.42); nw.rotation.y = a ? Math.PI / 2 : 0; gr.add(nw);
      const sg = new THREE.Mesh(new THREE.PlaneGeometry(.75, .75), signMat1('works')); sg.position.set(fx + a * 1.45 + along[0] * (L / 2 - 1), y0 + 2.4, fz + c * 1.45 + along[1] * (L / 2 - 1)); sg.rotation.y = Math.atan2(a, c); gr.add(sg);
      addStatic(gr); rec.__imp = true; ni++; n++; }
    // 3) telecamere del regime: palo, braccio, telecamera che gira piano, il led rosso e il cartello della videosorveglianza
    const camPts = []; ['piazza', 'piazza_gov', 'varco', 'muro', 'governo', 'garante', 'ministero', 'caserma'].forEach(id => { const p = G.PLACES[id]; if (p) camPts.push([p.x, p.y]); }); junc1().filter(J => J.signal).forEach(J => camPts.push([J.x, J.y]));
    S1.cams = S1.cams || [];
    camPts.forEach(([cx0, cz0], ci) => { for (let t = 0; t < 10; t++) { const a = ci * 1.7 + t * .9, d = 6 + t * .8, x = cx0 + Math.cos(a) * d, z = cz0 + Math.sin(a) * d; if (!okSpot1(x, z, .3)) continue;
        const gg = G0(), gal = sm('#6a6c6e', { metalness: .5, roughness: .5 }); add(gg, cyl(.06, .08, 4.2, 8, gal), 0, 2.1, 0); add(gg, box(.9, .06, .06, gal), .45, 4.1, 0);
        add(gg, new THREE.Mesh(new THREE.PlaneGeometry(.55, .55), signMat1('cam')), 0, 2.3, .09); add(gg, box(.5, .5, .02, sm('#4a4c4e', { metalness: .4 })), 0, 2.3, .07);
        place(gg, x, z, a + Math.PI); const y = groundH(x, z) + 3.95, hx = x + Math.cos(-(a + Math.PI)) * .85, hz = z + Math.sin(-(a + Math.PI)) * .85;
        const head = new THREE.Group(); add(head, box(.34, .18, .2, sm('#d8d6d0', { roughness: .5 })), .1, 0, 0); add(head, box(.4, .04, .26, sm('#b8b6b0')), .1, .11, 0); add(head, cyl(.06, .06, .04, 8, sm('#121214')), .28, 0, 0, 0, 0, Math.PI / 2);
        const led = new THREE.Mesh(new THREE.SphereGeometry(.025, 6, 4), sb('#ff2a1a')); add(head, led, -.05, .06, .1); head.position.set(hx, y, hz); scene.add(head);
        S1.cams.push({ head, led, base: Math.atan2(cz0 - hz, cx0 - hx), ph: ci * 1.3 }); nc++; break; } });
    // 4) paletti: agli angoli degli incroci di città e allo sbocco dei vicoli sulle vie larghe; zona pedonale e divieto di sosta
    const paletto = (x, z) => { const gg = G0(), ir = sm('#26282a', { metalness: .5, roughness: .5 }); add(gg, cyl(.055, .065, .9, 8, ir), 0, .45, 0); add(gg, cyl(.058, .058, .08, 8, sm('#d8d4ca', { roughness: .6 })), 0, .74, 0); add(gg, new THREE.Mesh(new THREE.SphereGeometry(.06, 8, 4, 0, 6.3, 0, 1.6), ir), 0, .9, 0); place(gg, x, z, 0); np++; };
    junc1().forEach(J => { if (!J.city || J.arms.length < 3) return; J.arms.forEach(a => { const rx = a.uy, ry = -a.ux, d = J.r + 1, o = a.w / 2 + .4, x = J.x + a.ux * d + rx * o, z = J.y + a.uy * d + ry * o; if (swH(x, z) > .1 && okSpot1(x, z, .25)) paletto(x, z); }); });
    (M.roads || []).forEach(rd => { if (rd.kind !== 'vicolo' || !rd.pts || rd.pts.length < 3) return; const g = geo1(rd), P = rd.pts;
      [[0, 1], [g.n - 1, -1]].forEach(([e, dir]) => { const [x0, z0] = P[e]; if (!(M.roads || []).some(o => o !== rd && urb1(o) && o.pts.some(q => Math.hypot(q[0] - x0, q[1] - z0) < o.w / 2 + 2))) return;
        const k = Math.max(0, Math.min(g.n - 1, e + dir * 2)), ux = g.ux[k] * dir, uz = g.uy[k] * dir, cx = P[k][0], cz = P[k][1];
        const open = junc1().some(J => J.arms.length >= 3 && Math.hypot(J.x - cx, J.y - cz) < J.r + 9) || gT(Math.floor(cx / TS), Math.floor(cz / TS)) === T.PIAZZA;   // non dentro gli incroci larghi né sulle piazze
        if (!open && r() < .5) [-1, 1].forEach(o => { const x = cx + uz * o * (rd.w / 4), z = cz - ux * o * (rd.w / 4); if (!solid1(x, z) && !busy1(x, z, .25) && !onCarr1(x, z, .2, rd)) paletto(x, z); });
        if (r() < .5) { const sx = cx + uz * (rd.w / 2 - .2), sz = cz - ux * (rd.w / 2 - .2); signPost1(sx, sz, Math.atan2(-ux, -uz), [['pedzone']], r); } }); });
    junc1().forEach(J => { if (!J.city || r() < .5) return; const a = pick(r, J.arms), rx = a.uy, ry = -a.ux, x = J.x + a.ux * (J.r + 9) + rx * (a.w / 2 + .7), z = J.y + a.uy * (J.r + 9) + ry * (a.w / 2 + .7); signPost1(x, z, Math.atan2(a.ux, a.uy), [['nopark']], r); });
    // 5) orti nei cortili d'erba della città: aiuole di terra, cavoli e porri d'inverno, canne legate, recinto di pali, il bidone dell'acqua
    const soil = sm('#3a2a1e', { roughness: 1 }), cab = [sm('#4a6a3a', { roughness: .9 }), sm('#5a7a48', { roughness: .9 }), sm('#6a5a7a', { roughness: .9 })], cane = sm('#a08a5a', { roughness: 1 }), done = [];
    for (let ty = 2; ty < G.GH - 3 && no < 30; ty++) for (let tx = 2; tx < G.GW - 3 && no < 30; tx++) {
      if (zoneT(tx, ty) !== ZN.CITTA || th(tx, ty, 6060) > .2) continue; let ok = true; for (let j = 0; j < 2 && ok; j++) for (let i = 0; i < 3 && ok; i++) { const v = gT(tx + i, ty + j); if ((v !== T.GRASS && v !== T.DIRT) || RW[(ty + j) * G.GW + tx + i] > 0) ok = false; } if (!ok) continue;
      const cx = (tx + 1.5) * TS, cz = (ty + 1) * TS; if (done.some(([a, b]) => Math.hypot(a - cx, b - cz) < 14) || !OCC35.free(cx, cz, 2.6, 1.6)) continue; OCC35.mark(cx, cz, 2.6, 1.6); done.push([cx, cz]);
      const gg = G0(); for (let row = 0; row < 3; row++) { const zz = -1 + row * 1; add(gg, box(4.2, .14, .7, soil), 0, .07, zz); for (let q = 0; q < 6; q++) { if (r() < .2) continue; const kind = r(); if (kind < .6) add(gg, new THREE.Mesh(new THREE.SphereGeometry(.16 + r() * .06, 6, 5), pick(r, cab)), -1.8 + q * .7, .22, zz, 0, r() * 3, 0); else { add(gg, cyl(.015, .015, 1.2, 4, cane), -1.8 + q * .7, .74, zz, (r() - .5) * .15, 0, (r() - .5) * .15); } } }
      for (let q = 0; q < 10; q++) { const t = q / 9, px = -2.4 + t * 4.8; [-1.6, 1.6].forEach(pz => add(gg, box(.05, .7 + r() * .2, .05, log), px, .35, pz, 0, 0, (r() - .5) * .1)); } add(gg, box(4.8, .03, .03, log), 0, .55, -1.6); add(gg, box(4.8, .03, .03, log), 0, .55, 1.6);
      add(gg, cyl(.28, .28, .85, 10, sm('#2a4a6a', { roughness: .6 })), 2.1, .43, 1.1); if (r() < .3) { add(gg, box(.05, 1.6, .05, log), -2, .8, 0); add(gg, box(.8, .05, .05, log), -2, 1.3, 0); add(gg, new THREE.Mesh(new THREE.SphereGeometry(.14, 6, 5), sm('#c8b88a')), -2, 1.65, 0); add(gg, box(.5, .6, .2, sm('#6a2a2a', { roughness: 1 })), -2, 1.1, 0); }   // spaventapasseri
      gg.position.set(cx, groundH(cx, cz), cz); gg.rotation.y = r() < .5 ? 0 : Math.PI / 2; addStatic(gg); no++; n++; }
    // 6) parchimetri lungo gli stalli (lato destro delle vie larghe), distributori di giornali agli angoli e davanti a bar e tabacchi
    let npm = 0, ngz = 0; const zinc = sm('#8a8e90', { metalness: .55, roughness: .45 }), dark = sm('#2a2c30', { metalness: .4, roughness: .5 });
    const parchimetro = (x, z, rot) => { const gg = G0(); add(gg, cyl(.04, .05, 1.05, 8, dark), 0, .52, 0); add(gg, box(.24, .34, .18, zinc), 0, 1.2, 0); add(gg, new THREE.Mesh(new THREE.SphereGeometry(.13, 10, 6, 0, 6.3, 0, 1.6), zinc), 0, 1.37, 0);
      add(gg, box(.15, .08, .01, sm('#c8d0b0', { roughness: .2 })), 0, 1.28, .095); add(gg, box(.04, .01, .01, sm('#111111')), 0, 1.16, .095); add(gg, box(.07, .05, .02, sm('#a82a22')), .06, 1.1, .095); place(gg, x, z, rot); npm++; };
    const GZ = [['ПРАВДА ОСТРОВА', '#8a2a24'], ['IL GARANTE', '#2a3a6a'], ['ВЕЧЕРНИЙ ПОРТ', '#c89a30'], ['섬 신문', '#3a5a3a'], ['LA SERA', '#5a5a5a']];
    const giornali = (x, z, rot) => { const gg = G0(), k = Math.floor(r() * GZ.length), c = sm(GZ[k][1], { roughness: .6, metalness: .2 });
      [-.22, .22].forEach(o => add(gg, box(.04, .5, .04, dark), o, .25, 0)); add(gg, box(.5, .55, .4, c), 0, .78, 0); add(gg, box(.52, .05, .42, c), 0, 1.08, 0);
      add(gg, box(.36, .26, .01, sm('#b8c0c4', { roughness: .15, metalness: .3 })), 0, .82, .205); add(gg, new THREE.Mesh(new THREE.PlaneGeometry(.3, .2), paperM()), 0, .82, .212);
      add(gg, new THREE.Mesh(new THREE.PlaneGeometry(.48, .1), new THREE.MeshLambertMaterial({ map: signTexture(GZ[k][0], '#f0ead8', GZ[k][1]) })), 0, 1.0, .202); add(gg, box(.1, .03, .03, zinc), 0, .64, .21);
      if (!OCC35.free(x, z, .35, .35)) return false; OCC35.mark(x, z, .35, .35); place(gg, x, z, rot); ngz++; return true; };
    (M.roads || []).forEach(rd => { if (!asph1(rd) || !urb1(rd) || rd.w < 8 || !rd.pts) return; const g = geo1(rd), P = rd.pts; let next = 8;
      for (let k = 1; k < g.n; k++) { if (g.s[k] < next) continue; const [px, pz] = P[k]; if (!cityAt1(px, pz) || nearJ1(px, pz, 8) < 0) continue; next = g.s[k] + 22 + r() * 10;
        const x = px - g.uy[k] * (rd.w / 2 + .45), z = pz + g.ux[k] * (rd.w / 2 + .45); if (swH(x, z) > .1 && okSpot1(x, z, .25)) parchimetro(x, z, Math.atan2(g.uy[k], -g.ux[k])); } });
    junc1().forEach(J => { if (!J.city || J.arms.length < 3 || r() < .4) return; const a = pick(r, J.arms), rx = -a.uy, ry = a.ux, x0 = J.x + a.ux * (J.r + 3) + rx * (a.w / 2 + 1.2), z0 = J.y + a.uy * (J.r + 3) + ry * (a.w / 2 + 1.2), rot = Math.atan2(-rx, -ry);
      if (swH(x0, z0) < .1 || solid1(x0, z0)) return; const k = 1 + Math.floor(r() * 3); for (let q = 0; q < k; q++) giornali(x0 + a.ux * q * .58, z0 + a.uy * q * .58, rot); });
    doors35().forEach(d => { if (!d.bar || r() < .5 || !cityAt1(d.x, d.y)) return; for (let t = 0; t < 6; t++) { const a = t * 1.05 + r(), x = d.x + Math.cos(a) * 2.2, z = d.y + Math.sin(a) * 2.2; if (!solid1(x, z) && !onCarr1(x, z, .3) && giornali(x, z, a + Math.PI)) break; } });
    if (window.__dbg35) console.log('[dbg] urbano1 parchimetri', npm, 'giornali', ngz);
    if (window.__dbg35) console.log('[dbg] urbano1 scalini', ns, 'impalcature', ni, 'telecamere', nc, 'paletti', np, 'orti', no);
    return n;
  }
  function tickUrbano1(time, night) { (S1.cams || []).forEach(c => { c.head.rotation.y = -(c.base + Math.sin(time * .25 + c.ph) * .9); c.led.visible = Math.sin(time * 3 + c.ph) > -.2; }); }
