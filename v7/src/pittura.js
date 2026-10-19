/* Porto Vecchio — I vestiti dipinti sul corpo.
   Niente gusci sopra il corpo: il vestito È la superficie del personaggio, dipinta. Così non ci sono compenetrazioni,
   il corpo si piega come è stato fatto, le misure sono quelle esatte del modello.
   Per ogni modello si rifanno una volta le mesh del corpo: triangoli separati, raggruppati per regione
   (busto, braccio sinistro e destro, gamba sinistra e destra; testa, mani e piedi restano col loro materiale)
   e con le coordinate di stoffa: giro attorno all'osso e lunghezza lungo l'osso (le stesse della Sartoria).
   Per ogni persona si dipingono cinque tele (busto, braccia, gambe) a strati, dal capo più interno al più esterno:
   tessuto vero (Sartoria.TESS), orli, cuciture, colletti, revers, bottoni, tasche, cinture, polsini, costine, ombre e pieghe.
   Il rilievo (bumpMap) viene dalla stessa pittura: cuciture e bordi incavati, trama del tessuto.
   Restano oggetti veri solo le cose che sporgono davvero: cappelli, falde di gonne e cappotti, scarpe, accessori. */
var Pittura = (function () {
  'use strict';
  const S = () => window.Sartoria;
  const cl = (x, a, b) => x < a ? a : x > b ? b : x, lerp = (a, b, t) => a + (b - a) * t, sm = t => t * t * (3 - 2 * t);
  const rgb = c => { const C = new THREE.Color(c); return [C.r, C.g, C.b]; };
  const mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)], mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const REG = ['T', 'AL', 'AR', 'LL', 'LR'];
  const SIZE = { T: [256, 320], AL: [64, 256], AR: [64, 256], LL: [96, 320], LR: [96, 320] };   // ~3,5 mm per pixel: bordi precisi   // ~7 mm per pixel: pixel grossi e netti

  // =====================================================================================
  // LE MESH DEL CORPO CON LE COORDINATE DI STOFFA (una volta per modello e per mesh)
  // =====================================================================================
  const GEO = new Map();
  function regionOf(B, i) {
    const p = B.part[i]; if (!p) { const y = B.P[i * 3 + 1], x = Math.abs(B.P[i * 3]); return y > B.crotch && y < (B.neckY || B.neck) && x < .2 ? 0 : -1; }   // ossa fuori elenco (petto del modello Formal): è busto
    if (p === 'torso' && B.side[i]) { const j = B.bones['UpperArm' + (B.side[i] > 0 ? 'L' : 'R')]; if (j && Math.abs(B.P[i * 3]) > Math.abs(j.x) - .012 && Math.hypot(B.P[i * 3] - j.x, B.P[i * 3 + 1] - j.y, B.P[i * 3 + 2] - j.z) < .05) return B.side[i] > 0 ? 1 : 2; }   // solo attorno al giunto della spalla   // oltre l'attaccatura: è già manica
    if (p === 'torso' || p === 'collo' || p === 'bacino') return 0;
    if (p === 'braccia' || p === 'avambracci') return B.side[i] > 0 ? 1 : 2;
    if (p === 'cosce' || p === 'polpacci') return B.side[i] > 0 ? 3 : 4;
    if (p === 'piedi' && B.side[i]) { const ft = B.bones['Foot' + (B.side[i] > 0 ? 'L' : 'R')]; if (ft && B.P[i * 3 + 1] > ft.y + .035) return B.side[i] > 0 ? 3 : 4; }   // [pulizia] il gambale del calzino del kit (legato all'osso del piede) è gamba: si stira col polpaccio
    return -1;
  }
  function frame(B) {   // i tubi e gli intervalli di ogni regione
    if (B.pit) return B.pit; const Sa = S(), T = Sa.tube(B, 'tronco');
    const sLo = T.sAtY(B.crotch - .14), sHi = T.sAtY((B.bones.Head ? B.bones.Head.y : 1.55) + .02);
    const tubes = [T, Sa.tube(B, 'manicaL'), Sa.tube(B, 'manicaR'), Sa.tube(B, 'gambaL'), Sa.tube(B, 'gambaR')];
    tubes.forEach(t => { t.Bref = B; });
    const circ = tb => { let best = 0; for (let i = 0; i <= tb.ns; i += 4) { let t = 0; for (let k = 0; k < tb.R[i].length; k++) t += tb.R[i][k]; best = Math.max(best, t / tb.R[i].length); } return best * Math.PI * 2; };
    B.pit = { tubes, range: [[sLo, sHi], [0, tubes[1].L], [0, tubes[2].L], [0, tubes[3].L], [0, tubes[4].L]], circ: tubes.map(circ) };
    return B.pit;
  }
  // il profilo "stirato" di un tubo: lisciato lungo l'asse e attorno, chiuso a involucro (niente conche, gradini, muscoli)
  const IRON = new Map();
  function ironed(tb) {
    if (IRON.has(tb)) return IRON.get(tb); const n = tb.ns, RG = tb.R[0].length, ds = tb.ds;
    const win = (A, w, f) => A.map((r, i) => { const o = new Float32Array(RG); for (let q = 0; q < RG; q++) { let m = f === 'min' ? 9 : 0; for (let k = -w; k <= w; k++) { const v = A[cl(i + k, 0, n)][q]; m = f === 'min' ? Math.min(m, v) : Math.max(m, v); } o[q] = m; } return o; });
    // apertura (minimo poi massimo su ±4 cm): via i rigonfiamenti stretti (orli gonfi, tasche, risvolti dei vestiti del kit), restano spalle, petto, glutei
    const w = Math.max(1, Math.round(.06 / ds));
    let R = win(win(tb.R, w, 'min'), w, 'max');
    const sg = Math.max(1, Math.round(.03 / ds));
    R = R.map((r, i) => { const o = new Float32Array(RG); for (let q = 0; q < RG; q++) { let a = 0, ww = 0; for (let k = -2 * sg; k <= 2 * sg; k++) { const g = Math.exp(-k * k / (2 * sg * sg)); a += R[cl(i + k, 0, n)][q] * g; ww += g; } o[q] = a / ww; } return o; });
    R = R.map(r => { const o = new Float32Array(RG); for (let q = 0; q < RG; q++) o[q] = (r[(q + RG - 2) % RG] + 2 * r[(q + RG - 1) % RG] + 3 * r[q] + 2 * r[(q + 1) % RG] + r[(q + 2) % RG]) / 9; return o; });
    // taglio secco: la sezione va verso un rettangolo smussato (superellisse), davanti e dietro piatti, fianchi dritti
    // la vita si riempie: tra il petto e i fianchi la stoffa va dritta (il corpo del kit è strizzato in vita)
    if (tb.kind === 'tronco') { const yOf = i => tb.S[i].y, iAt = y => { let b = 0, bd = 9; for (let i = 0; i <= n; i++) { const d = Math.abs(yOf(i) - y); if (d < bd) { bd = d; b = i; } } return b; };
      const B0 = tb.Bref; if (B0) { const ih = iAt(B0.bones.Hips.y - .02), ic = iAt(B0.bones.Chest.y - .04); if (ic > ih + 2) { const Rh = R[ih], Rc = R[ic];
        for (let i = ih + 1; i < ic; i++) { const t = (i - ih) / (ic - ih); for (let q = 0; q < RG; q++) R[i][q] = Math.max(R[i][q], lerp(R[i][q], lerp(Rh[q], Rc[q], t), .3)); } } } }
    // le anche: sotto la vita la sezione diventa un ovale liscio (niente spigoli e gradini dei pantaloncini del kit)
    if (tb.kind === 'tronco' && tb.Bref) { const B0 = tb.Bref; for (let i = 0; i <= n; i++) { const y = tb.S[i].y; if (y > B0.waist + .02) continue; const r = R[i]; let W = 0, Df = 0, Db = 0;
        for (let q = 0; q < RG; q++) { const a = q / RG * Math.PI * 2; W = Math.max(W, Math.abs(Math.sin(a)) * r[q]); const z = Math.cos(a) * r[q]; if (z > 0) Df = Math.max(Df, z); else Db = Math.max(Db, -z); }
        const k = cl((B0.waist + .02 - y) / .06, 0, 1); for (let q = 0; q < RG; q++) { const a = q / RG * Math.PI * 2, D = Math.cos(a) >= 0 ? Df : Db, e = 2.2, rb = 1 / Math.pow(Math.pow(Math.abs(Math.cos(a)) / Math.max(D, .02), e) + Math.pow(Math.abs(Math.sin(a)) / Math.max(W, .02), e), 1 / e); r[q] = lerp(r[q], rb, k); } } }
    // la stoffa cade dalla parte più sporgente (seno, pettorali, scapole) dritta fino alla vita: niente conche sotto
    if (tb.kind === 'tronco' && tb.Bref) { const B0 = tb.Bref, yOf = i => tb.S[i].y; let iw = 0, ic = n; for (let i = 0; i <= n; i++) { if (yOf(i) < B0.waist) iw = i; if (yOf(i) < B0.bones.Chest.y + .06) ic = i; }
      for (let q = 0; q < RG; q++) { let ia = iw; for (let i = iw; i <= ic; i++) if (R[i][q] > R[ia][q]) ia = i; for (let i = iw + 1; i < ia; i++) { const t = (i - iw) / (ia - iw); R[i][q] = Math.max(R[i][q], lerp(R[i][q], lerp(R[iw][q], R[ia][q], t), .45)); } } }
    const kb = tb.kind === 'tronco' ? .3 : .15, e = 2.8;   // appena squadrata: piani, non scatole (solo sopra la vita)
    const yW = tb.Bref ? tb.Bref.waist : -9;
    R = R.map((r, i) => { if (tb.kind === 'tronco' && tb.S[i].y < yW + .04) return r; let W = 0, Df = 0, Db = 0; for (let q = 0; q < RG; q++) { const a = q / RG * Math.PI * 2, x = Math.abs(Math.sin(a)) * r[q], z = Math.cos(a) * r[q]; W = Math.max(W, x); if (z > 0) Df = Math.max(Df, z); else Db = Math.max(Db, -z); }
      const o = new Float32Array(RG); for (let q = 0; q < RG; q++) { const a = q / RG * Math.PI * 2, ca = Math.abs(Math.cos(a)), sa = Math.abs(Math.sin(a)), D = Math.cos(a) >= 0 ? Df : Db;
        const rb = 1 / Math.pow(Math.pow(ca / Math.max(D, .01), e) + Math.pow(sa / Math.max(W, .01), e), 1 / e); o[q] = lerp(r[q], Math.min(rb, r[q] + .03), kb); } return o; });
    if (tb.Bref && (tb.kind === 'tronco' || /^gamba/.test(tb.kind || ''))) sartoriaForma(tb, R);
    // [pulizia] il polpaccio vero: nei modelli coi pantaloni del kit la gamba sotto il ginocchio è un tubo dritto (con il risvolto in fondo).
    // Si cappa il raggio con il profilo di una gamba: pieno al polpaccio, sottile alla caviglia (la forma attorno resta quella del modello)
    if (tb.Bref && /^gamba[LR]$/.test(tb.kind || '')) { const B0 = tb.Bref, sd = tb.kind.slice(-1), kn = B0.bones['LowerLeg' + sd], ft = B0.bones['Foot' + sd];
      if (kn && ft && kn.y > ft.y + .2) { const yK = kn.y, yA = ft.y + .02, mean = r => { let a = 0; for (let q = 0; q < RG; q++) a += r[q]; return a / RG; };
        let rc = 0, nc = 0; for (let i = 0; i <= n; i++) { const y = tb.S[i].y; if (y < yK - .16 || y > yK - .06) continue; rc += mean(R[i]); nc++; } rc = nc ? rc / nc : .058; rc = Math.min(rc, .062);
        for (let i = 0; i <= n; i++) { const y = tb.S[i].y; if (y > yK) continue; const t = cl((y - yA) / (yK - yA), 0, 1), f = t < .6 ? lerp(.56, 1, sm(t / .6)) : lerp(1, .9, (t - .6) / .4), m = mean(R[i]), k = lerp(1, Math.min(1, rc * f / Math.max(m, 1e-4)), sm(cl((yK - y) / .07, 0, 1))); if (k < 1) for (let q = 0; q < RG; q++) R[i][q] *= k; } } }
    IRON.set(tb, R); return R;
  }
  // [forma] il modellato di un capo ben tagliato: non un tubo, ma la linea che valorizza il corpo.
  // Uomo: spalle e torace pieni, petto a piano, si stringe in vita (la V), glutei tondi. Donna: vita segnata, fianchi e glutei pieni.
  // Fattori sul raggio stirato per altezza e angolo (davanti, fianchi, dietro), con transizioni morbide (gaussiane).
  const FEMMINE = /^(Casual|Formal)$/;
  let FORMA_K = 2;   // l'intensità del modellato (1 = appena accennato). [proporzioni] era 3,5: vita strizzata, spalle troppo larghe
  function sartoriaForma(tb, R) {
    const B0 = tb.Bref, leg = tb.kind !== 'tronco', fem = FEMMINE.test(B0.key), n = tb.ns, RG = R[0].length, b = B0.bones, nY = S().neckY(B0);
    const yW = B0.waist, yH = b.Hips.y, yC = b.Chest.y, yCr = B0.crotch, g = (y, c, w) => Math.exp(-((y - c) * (y - c)) / (2 * w * w));
    const yG = Math.min(yH - .05, (yH + yCr) / 2 + .02);   // il punto più pieno dei glutei
    for (let i = 0; i <= n; i++) { const y = tb.S[i].y; if (y > nY - .02 || y < yCr - .12 || leg && y < yCr - .15) continue; const r = R[i], cut = cl((nY - .02 - y) / .06, 0, 1);
      for (let q = 0; q < RG; q++) { const a = q / RG * Math.PI * 2, ca = Math.cos(a), sa = Math.abs(Math.sin(a)), fr = Math.max(0, ca), bk = Math.max(0, -ca), side = sa * sa;
        let k = 1; const A = FORMA_K;
        if (leg) {   // la coscia in alto: qui sta il sedere vero (nel modello i glutei sono delle cosce)
          k += bk * A * (fem ? .08 : .09) * g(y, yG, .05) - fr * A * .015 * g(y, yG, .05);
          if (fem) k += side * A * .035 * g(y, yG + .02, .05);
        } else if (fem) {
          k += side * (- A * .1 * g(y, yW, .055) + A * .05 * g(y, yG + .02, .06));        // vita segnata, fianchi
          k += fr * (- A * .05 * g(y, yW - .01, .05));                                  // pancia piatta
          k += bk * (- A * .05 * g(y, yW + .01, .05) + A * .06 * g(y, yG + .02, .05));      // la curva della schiena, l'attacco dei glutei
        } else {
          k += side * ( A * .04 * g(y, yC - .03, .08) - A * .06 * g(y, yW, .06));          // torace largo, vita stretta: la V
          k += fr * ( A * .012 * g(y, yC + .02, .09) - A * .04 * g(y, yW - .01, .05));      // il petto appena pieno e largo (a piano, non a seno), la pancia piatta
          k += bk * ( A * .025 * g(y, yC + .03, .07) - A * .035 * g(y, yW + .02, .05) + A * .045 * g(y, yG + .02, .05));   // le scapole, la schiena che rientra, l'attacco dei glutei
        }
        // tra i glutei, sotto: la stoffa aderente segue il solco (appena)
        if (!leg && ca < -.9 && y < yG + .02 && y > yCr - .02) k -= .035 * (1 - (Math.PI - Math.abs(a - Math.PI)) * 0) * cl((-ca - .9) / .1, 0, 1) * g(y, yG - .03, .05);
        r[q] *= 1 + (k - 1) * cut; } }
    // il giro lisciato attorno (niente spigoli dalle gaussiane)
    for (let i = 0; i <= n; i++) { const r = R[i], c0 = r.slice(); for (let q = 0; q < RG; q++) r[q] = (c0[(q + RG - 1) % RG] + 2 * c0[q] + c0[(q + 1) % RG]) / 4; }
  }
  // l'altezza del taglio busto/gambe del modello (il punto più alto del confine, sui fianchi): sotto di lì la stoffa dipinta si spezzerebbe
  function cutY(B) {
    if (B.cutY) return B.cutY; const ax = frame(B).tubes[0].S[0], mins = new Array(24).fill(9);
    for (let i = 0; i < B.part.length; i++) { if (regionOf(B, i) !== 0) continue; const y = B.P[i * 3 + 1]; if (y > B.waist) continue; const a = Math.atan2(B.P[i * 3] - ax.x, B.P[i * 3 + 2] - ax.z), k = Math.floor((a + Math.PI) / (Math.PI * 2) * 24) % 24; mins[k] = Math.min(mins[k], y); }
    B.cutY = Math.min(B.waist - .02, Math.max(...mins.filter(v => v < 9)) + .01); return B.cutY;
  }
  // gli uomini: busto più largo (spalle e torace), le anche lisce e dritte
  const MASCHI = /^(Casual_2|Casual_Hoodie|Worker)$/;
  function shape(B, tb, s, a, r) {
    if (tb.kind !== 'tronco') return r; const y = tb.S[cl(Math.round(s / tb.ds), 0, tb.ns)].y, sa = Math.abs(Math.sin(a));
    if (MASCHI.test(B.key)) r *= 1 + .015 * sa * sa * cl((y - B.waist + .05) / .25, 0, 1);
    return r;
  }
  function ironRadius(R, tb, s, a) { const RG = R[0].length, fi = cl(s / tb.ds, 0, tb.ns), i0 = Math.floor(fi), i1 = Math.min(tb.ns, i0 + 1), t = fi - i0, fs = (((a / (Math.PI * 2)) * RG) % RG + RG) % RG, q0 = Math.floor(fs), q1 = (q0 + 1) % RG, u = fs - q0;
    return lerp(lerp(R[i0][q0], R[i0][q1], u), lerp(R[i1][q0], R[i1][q1], u), t); }
  // la posizione stirata di un vertice del corpo (per la sua parte, così un vertice condiviso va sempre nello stesso posto)
  function ironPos(B, g, out) { const I = ironAll(B); return out.set(I[g * 3], I[g * 3 + 1], I[g * 3 + 2]); }
  // tutti i vertici stirati, poi la cucitura busto/gambe si raccorda: i doppioni (mesh diverse del kit) vanno nello stesso posto
  // e lo spostamento si liscia in una fascia attorno al confine (niente gradino tra il bacino e le cosce)
  function ironAll(B) {
    if (B.IP) return B.IP; const n = B.part.length, v = new THREE.Vector3(), I = new Float32Array(n * 3), Dp = new Float32Array(n * 3), reg = new Int8Array(n);
    // la zona di un vertice: quella della maggior parte dei suoi triangoli (un vertice del busto in mezzo alla manica si stira come la manica)
    const R0 = new Int8Array(n); for (let g = 0; g < n; g++) R0[g] = regionOf(B, g);
    const vote = Array.from({ length: n }, () => null), tr0 = B.tris;
    for (let t = 0; t < tr0.length; t += 3) { const a = R0[tr0[t]], b = R0[tr0[t + 1]], c = R0[tr0[t + 2]], tr = a === b || a === c ? a : b === c ? b : a; if (tr < 0) continue; for (let k = 0; k < 3; k++) { const g = tr0[t + k]; (vote[g] || (vote[g] = new Int16Array(5)))[tr]++; } }
    const RV = new Int8Array(n); for (let g = 0; g < n; g++) { RV[g] = R0[g]; const vv = vote[g]; if (!vv || R0[g] < 0) continue; let best = R0[g], bn = vv[R0[g]]; for (let r = 0; r < 5; r++) if (vv[r] > bn * 1.5 + .5) { best = r; bn = vv[r]; } RV[g] = best; }
    for (let g = 0; g < n; g++) { ironPos0(B, g, v, RV[g]); I[g * 3] = v.x; I[g * 3 + 1] = v.y; I[g * 3 + 2] = v.z; reg[g] = RV[g]; for (let k = 0; k < 3; k++) Dp[g * 3 + k] = I[g * 3 + k] - B.P[g * 3 + k]; }
    // i gruppi saldati (stessa posizione)
    const gid = new Int32Array(n), km = new Map(); let ng = 0; for (let g = 0; g < n; g++) { const k = Math.round(B.P[g * 3] * 1e4) + ',' + Math.round(B.P[g * 3 + 1] * 1e4) + ',' + Math.round(B.P[g * 3 + 2] * 1e4); let id = km.get(k); if (id === undefined) km.set(k, id = ng++); gid[g] = id; }
    const GD = new Float32Array(ng * 3), GP = new Float32Array(ng * 3), GC = new Int32Array(ng), GT = new Uint8Array(ng), GL = new Uint8Array(ng);
    for (let g = 0; g < n; g++) { const i = gid[g]; for (let k = 0; k < 3; k++) GP[i * 3 + k] = B.P[g * 3 + k]; if (reg[g] < 0) continue; GC[i]++; for (let k = 0; k < 3; k++) GD[i * 3 + k] += Dp[g * 3 + k]; if (reg[g] === 0) GT[i] = 1; if (reg[g] >= 3) GL[i] = 1; }
    for (let i = 0; i < ng; i++) if (GC[i]) for (let k = 0; k < 3; k++) GD[i * 3 + k] /= GC[i];
    const nb = Array.from({ length: ng }, () => new Set()), tr = B.tris;
    for (let t = 0; t < tr.length; t += 3) for (let a = 0; a < 3; a++) { const x = gid[tr[t + a]], y = gid[tr[t + (a + 1) % 3]]; if (x !== y) { nb[x].add(y); nb[y].add(x); } }
    // il confine: gruppi di busto e gamba insieme, o lati che uniscono busto e gamba
    const seam = []; for (let i = 0; i < ng; i++) { let s = GT[i] && GL[i]; if (!s && GT[i]) for (const j of nb[i]) if (GL[j] && !GT[j]) { s = 1; break; } if (s && GP[i * 3 + 1] > B.crotch - .05 && GP[i * 3 + 1] < B.waist) seam.push(i); }
    const BAND = .09, wt = new Float32Array(ng);
    if (seam.length) for (let i = 0; i < ng; i++) { if (!GT[i] && !GL[i]) continue; const y = GP[i * 3 + 1]; if (y < B.crotch - .2 || y > B.waist + .1) continue; let d = 9; for (const j of seam) { const dx = GP[i * 3] - GP[j * 3], dy = y - GP[j * 3 + 1], dz = GP[i * 3 + 2] - GP[j * 3 + 2]; const dd = dx * dx + dy * dy + dz * dz; if (dd < d) d = dd; } d = Math.sqrt(d); if (d < BAND) wt[i] = 1 - sm(d / BAND); }
    for (let it = 0; it < 40; it++) { const N2 = GD.slice(); for (let i = 0; i < ng; i++) { if (!wt[i] || !nb[i].size) continue; let x = 0, y = 0, z = 0, m = 0; for (const j of nb[i]) { if (!GC[j]) continue; x += GD[j * 3]; y += GD[j * 3 + 1]; z += GD[j * 3 + 2]; m++; } if (!m) continue; const k = wt[i] * .6;
        N2[i * 3] = lerp(GD[i * 3], x / m, k); N2[i * 3 + 1] = lerp(GD[i * 3 + 1], y / m, k); N2[i * 3 + 2] = lerp(GD[i * 3 + 2], z / m, k); } GD.set(N2); }
    for (let g = 0; g < n; g++) { if (reg[g] < 0) continue; const i = gid[g]; if (GC[i] < 2 && !wt[i] || !GC[i]) continue; for (let k = 0; k < 3; k++) I[g * 3 + k] = B.P[g * 3 + k] + GD[i * 3 + k]; }
    B.IP = I; B.ironSeam = { gid, wt, GP }; return I;
  }
  function ironPos0(B, g, out, rF) {
    const r = rF !== undefined ? rF : regionOf(B, g); out.set(B.P[g * 3], B.P[g * 3 + 1], B.P[g * 3 + 2]); if (r < 0) return out;
    const F = frame(B), tb = F.tubes[r], q = axial(tb, out), fr = S().frameAt(tb, q.s), R = ironed(tb), rr = shape(B, tb, q.s, q.a, ironRadius(R, tb, q.s, q.a)); q.r = q.r !== undefined ? q.r : out.clone().sub(fr.p).length(); q.i = q.s / tb.ds;
    // vicino a mani, piedi, collo (dove il corpo resta com'è) lo stiro sfuma
    let k = 1; if (r > 0) k = cl((tb.L - q.i * tb.ds) / (r >= 3 ? .015 : .06), 0, 1) * cl(q.i * tb.ds / .05, 0, 1);   // [pulizia] sulle gambe fino alla caviglia (sennò il risvolto del kit resta) else { const ny = S().neckY(B); k = cl((ny - out.y) / .04, 0, 1) * cl((out.y - (B.crotch + .02)) / .07, 0, 1); const j = B.bones['UpperArm' + (out.x - (B.bones.Hips ? B.bones.Hips.x : 0) > 0 === (B.bones.UpperArmL && B.bones.UpperArmL.x > (B.bones.Hips ? B.bones.Hips.x : 0)) ? 'L' : 'R')]; if (j) k *= cl((out.distanceTo(j) - .06) / .12, 0, 1); }   // vicino al giro manica il busto resta com'è (niente punte verso il braccio)   // al cavallo, tra le gambe, il corpo resta com'è
    // [forma] l'avambraccio verso il polso: affusolato (niente svasature dei polsini del kit); il raggio scende in linea verso quello del polso vero
    if (r === 1 || r === 2) { const w = B.bones['Wrist' + (r === 1 ? 'L' : 'R')], sw = w ? tb.sNear(w) : tb.L, s0 = sw - .14;
      const kw = cl((sw - .012 - q.s) / .035, 0, 1); k *= kw;   // al polso il corpo resta com'è (la mano non si tocca: niente punte)
      if (q.s > s0 && kw > 0) { const t = cl((q.s - s0) / (sw - s0), 0, 1), r0 = ironRadius(R, tb, s0, q.a), cap = lerp(r0, Math.min(r0, .03), t) * (1 + .1 * Math.abs(Math.sin(q.a))); const tgt = lerp(q.r, Math.min(Math.max(q.r, rr * k + q.r * (1 - k)), cap), kw); if (Math.abs(tgt - q.r) < 1e-5 || q.r < 1e-4) return out; const dir = out.clone().sub(fr.p); dir.addScaledVector(fr.t, -dir.dot(fr.t)); dir.normalize(); return out.addScaledVector(dir, tgt - q.r); } }
    const d = cl(rr - q.r, -.06, .045) * k; if (Math.abs(d) < 1e-5 || q.r < 1e-4) return out;
    const dir = out.clone().sub(fr.p); dir.addScaledVector(fr.t, -dir.dot(fr.t)); dir.normalize(); return out.addScaledVector(dir, d);
  }
  // =====================================================================================
  // [corpo] IL CORPO CONTINUO: sotto i vestiti dipinti non più il mosaico del kit (felpa, gilet, strisce, tasche, ginocchiere,
  // scarpe alte: pezzi sovrapposti che stirati lasciavano crepe, fasce e buchi) ma una superficie nostra, una griglia per tubo
  // (busto, braccia, gambe): il raggio stirato (le forme della sartoria), i pesi delle ossa del punto del corpo colpito dal raggio.
  // Il busto si chiude al cavallo stringendosi sul profilo delle due cosce; in alto diventa il collo. Mani, piedi e testa restano del kit.
  // =====================================================================================
  let CORPO_ON = true;   // (Pittura.corpo(false) per confrontare col mosaico del kit)
  const CORPO = { T: 64, A: 28, L: 36 };   // colonne attorno: busto, braccia, gambe
  // i pesi del punto: media sui vicini (±4 cm lungo l'asse, ±2 settori), così al ginocchio e al gomito la pelle piega morbida invece di fare uno scalino
  function pesi(tb, ii, q) { const M = new Map(), n = Math.max(1, Math.round(.04 / tb.ds)); let t = 0;
    for (let di = -n; di <= n; di++) { const i2 = cl(ii + di, 0, tb.ns), wi = 1 - Math.abs(di) / (n + 1); for (let dq = -2; dq <= 2; dq++) { const w = tb.W && tb.W[i2] && tb.W[i2][(q + dq + 64) % 64]; if (!w) continue; const k = wi * (1 - Math.abs(dq) / 3); w.forEach(([bi, wk]) => { M.set(bi, (M.get(bi) || 0) + wk * k); t += wk * k; }); } }
    if (!t) return [[0, 1]]; return [...M.entries()].sort((x, y) => y[1] - x[1]).slice(0, 4); }
  function corpo(B) {
    if (B.corpo) return B.corpo; const F = frame(B), Sa = S(), b = B.bones, nY = Sa.neckY(B), out = [];
    const legR = (r, y, d0, o) => {   // dalla retta o + d0 t (orizzontale) il punto più lontano ancora dentro la sezione della coscia r a quota y
      const tb = F.tubes[r], Rl = ironed(tb), s = tb.sAtY(y), fr = Sa.frameAt(tb, s), v = new THREE.Vector3(); let best = 0;
      for (let t = 0; t < .32; t += .003) { v.copy(o).addScaledVector(d0, t).sub(fr.p); v.addScaledVector(fr.t, -v.dot(fr.t)); const a = Math.atan2(v.dot(fr.sd), v.dot(fr.f)); if (v.length() <= ironRadius(Rl, tb, s, a) + .001) best = t; }
      return best; };
    for (let r = 0; r < 5; r++) {
      const tb = F.tubes[r], R = ironed(tb), NA = r === 0 ? CORPO.T : r < 3 ? CORPO.A : CORPO.L, [r0, r1] = F.range[r];
      let sA, sB;
      if (r === 0) { sA = tb.sAtY(B.crotch - .004); sB = tb.sAtY(b.Head.y - .005); }
      else if (r < 3) { const w = b['Wrist' + (r === 1 ? 'L' : 'R')]; sA = 0; sB = w ? Math.min(tb.L, tb.sNear(w) + .01) : tb.L; }
      else { sA = tb.sAtY(b.Hips.y - .02); sB = tb.sAtY((B.ankle[r === 3 ? 'L' : 'R'] || { y: .1 }).y - .01); }
      if (sB < sA) { const t = sA; sA = sB; sB = t; }
      let nr = Math.max(4, Math.round((sB - sA) / .01)); const P = [], VI = [], SI = [], SW = [];
      const handR = null, sWr = 0;
      const yHi = b.Hips.y - .02, nc = B.neckC, rn = B.neckR || .055;
      // le righe: sull'asse; il braccio in cima si chiude a cupola (il deltoide) che entra nella spalla, sennò il tubo aperto affiora
      const ROWS = []; if (r === 1 || r === 2) [[.03, 0], [.026, .45], [.018, .75], [.008, .93]].forEach(([bk, rk]) => ROWS.push({ sv: sA, bk, rk }));
      for (let i = 0; i <= nr; i++) ROWS.push({ sv: sA + (sB - sA) * i / nr, bk: 0, rk: 1 });
      const nr0 = nr; nr = ROWS.length - 1;
      for (let i = 0; i <= nr; i++) {
        const sv = ROWS[i].sv, fr = Sa.frameAt(tb, sv), ii = cl(Math.round(sv / tb.ds), 0, tb.ns);
        for (let j = 0; j <= NA; j++) {
          const a = -Math.PI + j / NA * Math.PI * 2, dir = fr.f.clone().multiplyScalar(Math.cos(a)).addScaledVector(fr.sd, Math.sin(a)).normalize();
          let rr = shape(B, tb, sv, a, ironRadius(R, tb, sv, a)), c = fr.p.clone();
          if (handR && sv > sWr - .02) { const bi = cl(Math.floor((sv - (sWr - .03)) / .005), 0, 11), hr = handR[bi]; if (hr > 0) rr = lerp(rr, Math.max(rr * .9, hr + .0015), sm(cl((sv - (sWr - .02)) / .02, 0, 1))); }
          if (r === 0) { const y = fr.p.y;
            if (y < yHi) { const k = sm(cl((yHi - y) / Math.max(.02, yHi - B.crotch), 0, 1)), o = fr.p, u = Math.max(legR(3, y, dir, o), legR(4, y, dir, o)); rr = lerp(rr, Math.min(rr, u + .002), k); }   // il cavallo
            const kn = sm(cl((y - (nY - .025)) / .04, 0, 1)); if (kn > 0) { c.x = lerp(c.x, nc[0], kn); c.z = lerp(c.z, nc[1], kn); rr = lerp(rr, rn * (1 - .06 * Math.abs(Math.sin(a))), kn); } }   // il collo: un cilindro appena ovale centrato sul collo vero
          if (r === 1 || r === 2) rr *= 1 + .12 * (1 - sm(cl(sv / .09, 0, 1)));   // il deltoide: la cima del braccio piena, copre l'attaccatura
          if (ROWS[i].bk) { rr *= ROWS[i].rk; c.addScaledVector(fr.t, -ROWS[i].bk); }
          const p = c.addScaledVector(dir, rr), q = ((Math.round((a / (Math.PI * 2)) * 64) % 64) + 64) % 64, w = pesi(tb, ii, q);
          let tw = 0; w.forEach(e => { tw += e[1]; }); const ww = w.map(e => [e[0], tw ? e[1] / tw : 0]); while (ww.length < 4) ww.push([0, 0]);
          P.push(p); VI.push({ l: p.clone().applyMatrix4(B.reli).toArray(), p: p.toArray(), d: dir.toArray(), s: sv, a }); ww.slice(0, 4).forEach(e => { SI.push(e[0]); SW.push(e[1]); });
        } }
      // [corpo] alla spalla il busto passa sotto il braccio (sennò affiora a chiazze dalla manica): dove sta dentro il tubo del braccio, rientra 4 mm sotto la sua pelle
      if (r === 0) for (const ra of [1, 2]) { const ta = F.tubes[ra], Ra = ironed(ta); for (const p of P) { const q = axial(ta, p); if (q.s > .2 || q.s < .004 || q.r === undefined) continue; const ar = ironRadius(Ra, ta, q.s, q.a) * (1 + .12 * (1 - sm(cl(q.s / .09, 0, 1)))); if (q.r > ar + .035) continue; const f2 = Sa.frameAt(ta, q.s), d2 = p.clone().sub(f2.p); d2.addScaledVector(f2.t, -d2.dot(f2.t)); const L2 = d2.length(), w2 = 1 - sm(cl((L2 - ar) / .035, 0, 1)), tg = Math.max(0, ar - .004); if (L2 > 1e-5 && tg < L2) p.addScaledVector(d2, (tg - L2) / L2 * w2 * (1 - sm(cl((q.s - .12) / .08, 0, 1)))); } }
      if (r === 0) P.forEach((p, k) => { VI[k].p = p.toArray(); VI[k].l = p.clone().applyMatrix4(B.reli).toArray(); });
      // le normali dalla griglia (lisce: stoffa e pelle continue)
      const N = [], id = (i, j) => i * (NA + 1) + ((j % NA) + NA) % NA;
      for (let i = 0; i <= nr; i++) for (let j = 0; j <= NA; j++) { const pu = P[id(i, j + 1)].clone().sub(P[id(i, j - 1)]), pv = P[id(Math.min(nr, i + 1), j)].clone().sub(P[id(Math.max(0, i - 1), j)]), n = pv.cross(pu); if (n.dot(new THREE.Vector3().fromArray(VI[id(i, j)].d)) < 0) n.negate(); N.push(n.normalize()); }
      const tris = []; for (let i = 0; i < nr; i++) for (let j = 0; j < NA; j++) { const a0 = i * (NA + 1) + j, b0 = a0 + 1, c0 = a0 + NA + 1, d0 = c0 + 1; tris.push(a0, c0, b0, b0, c0, d0); }
      const UV = VI.map((L, k) => [(k % (NA + 1)) / NA, (L.s - r0) / (r1 - r0)]);
      out.push({ r, P, N, UV, VI, SI, SW, tris });
    }
    B.corpo = out; return out;
  }
  // la proiezione esatta sull'asse: il campione il cui piano perpendicolare passa per il punto (non il più vicino in linea d'aria,
  // che sbaglia per i punti lontani dall'asse, come gli orli svasati del kit)
  function axial(tb, p) {
    let best = -1, bs = 9, bd = 9; const v = new THREE.Vector3();
    for (let i = 0; i < tb.ns; i++) { const a = v.copy(p).sub(tb.S[i]).dot(tb.T[i]), b = v.copy(p).sub(tb.S[i + 1]).dot(tb.T[i + 1]);
      if (a >= 0 && b <= 0) { const t = a / (a - b + 1e-12), q = tb.S[i].clone().lerp(tb.S[i + 1], t), d = q.distanceTo(p); if (d < bd) { bd = d; bs = (i + t) * tb.ds; best = i; } } }
    if (best < 0) { const q = tb.proj(p); return { s: q.i * tb.ds, a: q.a, i: q.i }; }
    const i = Math.round(bs / tb.ds), fr = S().frameAt(tb, bs), r = v.copy(p).sub(fr.p); r.addScaledVector(fr.t, -r.dot(fr.t));
    return { s: bs, a: Math.atan2(r.dot(fr.sd), r.dot(fr.f)), i, r: r.length() };
  }
  // la pelle coperta da un vestito del kit: un raggio dall'asse della sua parte attraverso il vertice; se colpisce stoffa del kit più fuori, è coperta
  function coveredSkin(B) {
    if (B.covSkin) return B.covSkin; const n = B.part.length, CV = new Uint8Array(n), F = frame(B), tr = B.tris, P = B.P;
    const cloth = i => !/^(Skin|Eye|Eyebrows|Hair|Moustache)/i.test(B.srcMat[B.srcOf[i]] || 'Skin');
    const T = []; for (let t = 0; t < tr.length; t += 3) if (cloth(tr[t]) && cloth(tr[t + 1]) && cloth(tr[t + 2])) { const y0 = Math.min(P[tr[t] * 3 + 1], P[tr[t + 1] * 3 + 1], P[tr[t + 2] * 3 + 1]), y1 = Math.max(P[tr[t] * 3 + 1], P[tr[t + 1] * 3 + 1], P[tr[t + 2] * 3 + 1]); T.push([t, y0, y1]); }
    const v = new THREE.Vector3();
    // [pulizia] anche la stoffa del kit sotto altra stoffa del kit (il collo della scarpa alta dentro i pantaloni, la camicia infilata):
    // stirata finirebbe sulla stessa superficie dello strato sopra e farebbe fasce e risvolti. Per la stoffa serve un distacco vero (2 mm)
    for (let i = 0; i < n; i++) {
      const ci = cloth(i), r = regionOf(B, i); if (r < 0) continue; v.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]);
      const tb = F.tubes[r], ax = axial(tb, v), fr = S().frameAt(tb, ax.s), d = v.clone().sub(fr.p); d.addScaledVector(fr.t, -d.dot(fr.t)); const r0 = d.length(); if (r0 < 1e-4) continue; d.divideScalar(r0);
      const o = fr.p, ox = o.x, oy = v.y, oz = o.z;   // raggio orizzontale-radiale dal punto dell'asse alla stessa quota
      for (const [t, y0, y1] of T) { if (v.y < y0 - .002 || v.y > y1 + .002) continue;
        const a = tr[t] * 3, b = tr[t + 1] * 3, c = tr[t + 2] * 3, e1x = P[b] - P[a], e1y = P[b + 1] - P[a + 1], e1z = P[b + 2] - P[a + 2], e2x = P[c] - P[a], e2y = P[c + 1] - P[a + 1], e2z = P[c + 2] - P[a + 2];
        const px = d.y * e2z - d.z * e2y, py = d.z * e2x - d.x * e2z, pz = d.x * e2y - d.y * e2x, det = e1x * px + e1y * py + e1z * pz; if (Math.abs(det) < 1e-12) continue;
        const id = 1 / det, tx = v.x - d.x * r0 - P[a], ty = v.y - d.y * r0 - P[a + 1], tz = v.z - d.z * r0 - P[a + 2], u = (tx * px + ty * py + tz * pz) * id; if (u < 0 || u > 1) continue;
        const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x, w = (d.x * qx + d.y * qy + d.z * qz) * id; if (w < 0 || u + w > 1) continue;
        const dist = (e2x * qx + e2y * qy + e2z * qz) * id; if (dist > r0 + (ci ? .002 : -.0005) && dist < r0 + .05) { CV[i] = 1; break; } }
    }
    B.covSkin = CV; return CV;
  }
  function paintGeo(B, src, si) {
    const key = B.key + '|' + si; if (GEO.has(key)) return GEO.get(key);
    const geo = src.userData.geo0 || src.geometry, gm = B.gmaps[si]; if (!gm) { GEO.set(key, null); return null; }
    const F = frame(B), idx = geo.index ? geo.index.array : null, nt = (idx ? idx.length : geo.attributes.position.count) / 3;
    const m0 = (Array.isArray(src.material) ? src.material[0] : src.material) || {}, kc = !/^(Skin|Eye|Eyebrows|Hair|Moustache)/i.test((src.userData.pitOrig ? (Array.isArray(src.userData.pitOrig.mat) ? src.userData.pitOrig.mat[0] : src.userData.pitOrig.mat) : m0).name || '') ? .0018 : 0;   // la stoffa del kit sta un filo sopra la pelle che copre (niente sfarfallio)
    const v = new THREE.Vector3(), ironCache = [], dropT = new Set(), noN = new Set(), byReg = [[], [], [], [], [], []];   // 0..4 regioni, 5 = resta com'è
    const res0 = {};
    const kanga = kc && /Purple/.test((src.userData.pitOrig ? (Array.isArray(src.userData.pitOrig.mat) ? src.userData.pitOrig.mat[0] : src.userData.pitOrig.mat) : m0).name || '');   // [pulizia] la tasca canguro c'è solo nella felpa viola del kit (Casual_Hoodie): sul top corto della donna toglieva l'orlo sotto il seno e lasciava i buchi
    for (let t = 0; t < nt; t++) {
      const c = [0, 1, 2].map(k => idx ? idx[t * 3 + k] : t * 3 + k), r = c.map(q => gm[q] >= 0 ? regionOf(B, gm[q]) : -1);
      const cnt = {}; r.forEach(x => { if (x >= 0 || !kc) cnt[x] = (cnt[x] || 0) + 1; }); let best = -1, bn = 0; for (const k in cnt) if (cnt[k] > bn) { bn = cnt[k]; best = +k; }   // nei vestiti del kit i pezzetti senza zona (zip, tasche) vanno con la zona vicina
      if (CORPO_ON && best < 0 && !/Head/i.test(src.name) && c.every(q => gm[q] >= 0) && !c.some(q => /^(mani|piedi)$/.test(B.part[gm[q]] || ''))) continue;   // [corpo] resti del corpo del kit fuori dalle zone (sulle spalle): via
      byReg[best < 0 ? 5 : best].push(t);
    }
    const attrs = geo.attributes, out = new THREE.BufferGeometry(), N = nt * 3, keys = Object.keys(attrs).filter(k => k !== 'uv');
    const arr = {}; keys.forEach(k => { arr[k] = new attrs[k].array.constructor(N * attrs[k].itemSize); });
    const UV = new Float32Array(N * 2), SRC = new Int32Array(N), VI = new Array(N), VR = new Int8Array(N).fill(-1), order = [], groups = [];
    let w = 0;
    byReg.forEach((L, reg) => {
      if (!L.length) return; const start = w;
      L.forEach(t => {
        const c = [0, 1, 2].map(k => idx ? idx[t * 3 + k] : t * 3 + k);
        // coordinate di stoffa dei tre angoli nel tubo della regione del triangolo (stesso tubo: niente strappi)
        let uu = [0, 0, 0], vv = [0, 0, 0];
        if (reg < 5) {
          const tb = F.tubes[reg], [s0, s1] = F.range[reg];
          c.forEach((q, k) => { const g = gm[q]; if (g >= 0) v.set(B.P[g * 3], B.P[g * 3 + 1], B.P[g * 3 + 2]); else v.fromBufferAttribute(attrs.position, q).applyMatrix4(B.rel); const P0 = axial(tb, v); uu[k] = (P0.a + Math.PI) / (Math.PI * 2); vv[k] = (P0.s - s0) / (s1 - s0); });
          if (Math.max(...uu) - Math.min(...uu) > .5) uu = uu.map(x => x < .5 ? x + 1 : x);   // il triangolo a cavallo della cucitura dietro
          // la pelle sotto i vestiti del kit: stirate finirebbero sulla stessa superficie (pixel contesi). Si toglie
          { const CV = coveredSkin(B); if (c.every(q => gm[q] >= 0 && CV[gm[q]])) dropT.add(w / 3); }
          // i bordi dei vestiti del kit (risvolti, orli che girano dentro): facce rivolte all'asse o in su/giù. Stirate si accartoccerebbero: via
          if (kc) { const P3 = c.map(q => { const g = gm[q]; return g >= 0 ? new THREE.Vector3(B.P[g * 3], B.P[g * 3 + 1], B.P[g * 3 + 2]) : new THREE.Vector3().fromBufferAttribute(attrs.position, q).applyMatrix4(B.rel); });
            const n = P3[1].clone().sub(P3[0]).cross(P3[2].clone().sub(P3[0])), ln = n.length(); if (ln > 1e-12) { n.divideScalar(ln); const cc = P3[0].clone().add(P3[1]).add(P3[2]).divideScalar(3), ax = axial(tb, cc), fr = S().frameAt(tb, ax.s), rd = cc.clone().sub(fr.p); rd.addScaledVector(fr.t, -rd.dot(fr.t)); rd.normalize();
              if (kanga && reg === 0 && rd.z > .25 && cc.y > B.crotch + .06 && cc.y < B.waist + .14 && n.dot(rd) < .8) dropT.add(w / 3);   // [strati] la tasca canguro della felpa del kit: le sue pareti e il bordo (tutto ciò che non guarda fuori) via
              else if (n.dot(rd) < -.7 && (cc.y < B.waist + .1 || reg === 1 || reg === 2)) dropT.add(w / 3);   /* anche i polsini del kit */ else if (reg === 0 && n.dot(rd) < -.2 && cc.y > S().neckY(B) - .07) dropT.add(w / 3);   /* [pulizia] il dentro dello scollo del kit (la mezzaluna scura sul collo) */ else if (Math.abs(n.dot(rd)) < .35 && Math.abs(n.dot(fr.t)) < .7 && (() => { const rr = P3.map(p => { const a2 = axial(tb, p), f2 = S().frameAt(tb, a2.s), d2 = p.clone().sub(f2.p); d2.addScaledVector(f2.t, -d2.dot(f2.t)); return d2.length(); }); return Math.max(...rr) - Math.min(...rr) < .012; })()) dropT.add(w / 3);   /* [pulizia] le pareti di spessore del kit (bordi di tasche, ginocchiere, gilet): sottili e di taglio, stirate fanno righe e crepe */ else if (Math.abs(n.dot(fr.t)) > .8 && n.dot(rd) < .3) { if (kanga && reg === 0 && cc.y < B.waist + .16 && cc.y > B.crotch + .1 && rd.z > .3) dropT.add(w / 3); else noN.add(w / 3); } } }   // [strati] le tasche e i risvolti del kit sulla pancia (la canguro della felpa): via, sennò fanno un lembo
        }
        c.forEach((q, k) => { keys.forEach(a => { const sz = attrs[a].itemSize; for (let j = 0; j < sz; j++) arr[a][w * sz + j] = attrs[a].array[q * sz + j]; });
          const g = gm[q], rv = reg < 5 ? reg : (g >= 0 ? regionOf(B, g) : -1); if (g >= 0 && rv >= 0 && rv < 5) { let L = ironCache[q]; if (!L) { const bp = ironPos(B, g, new THREE.Vector3()), tb = F.tubes[rv], ax = axial(tb, bp), fr = S().frameAt(tb, ax.s), d = bp.clone().sub(fr.p); d.addScaledVector(fr.t, -d.dot(fr.t)); d.normalize();
              L = ironCache[q] = { l: bp.clone().applyMatrix4(B.reli).toArray(), p: bp.toArray(), d: d.toArray(), s: ax.s, a: ax.a }; }
            arr.position[w * 3] = L.l[0]; arr.position[w * 3 + 1] = L.l[1]; arr.position[w * 3 + 2] = L.l[2]; VI[w] = L; VR[w] = rv; }   // [strati] anche i vertici del corpo nei triangoli di mano e piede: stessa posizione dei vicini (niente punte)
          SRC[w] = q; UV[w * 2] = uu[k]; UV[w * 2 + 1] = vv[k]; w++; });
      });
      groups.push({ start, count: w - start, materialIndex: reg < 5 ? 1 + reg : 0 });
    });
    keys.forEach(a => out.setAttribute(a, new THREE.BufferAttribute(arr[a], attrs[a].itemSize, attrs[a].normalized)));
    out.setAttribute('uv', new THREE.BufferAttribute(UV, 2)); groups.forEach(gr => out.addGroup(gr.start, gr.count, gr.materialIndex));
    // normali lisce sulla forma stirata (stoffa continua, non triangoli a caso): somma delle facce per punto, saldando i vertici doppi delle cuciture del kit
    { const PA = arr.position, NA = arr.normal, inReg = new Uint8Array(N); groups.forEach(gr => { if (gr.materialIndex > 0) for (let k = gr.start; k < gr.start + gr.count; k++) inReg[k] = 1; });
      const key = k => Math.round(PA[k * 3] * 1e6) + ',' + Math.round(PA[k * 3 + 1] * 1e6) + ',' + Math.round(PA[k * 3 + 2] * 1e6), acc = new Map(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
      for (let k = 0; k < N; k += 3) { if (!inReg[k] || dropT.has(k / 3) || noN.has(k / 3)) continue; a.fromArray(PA, k * 3); b.fromArray(PA, k * 3 + 3); c.fromArray(PA, k * 3 + 6); const n = b.clone().sub(a).cross(c.clone().sub(a));   // pesata con l'area
        for (let j = 0; j < 3; j++) { const kk = key(k + j); let v = acc.get(kk); if (!v) acc.set(kk, v = new THREE.Vector3()); v.add(n); } }
      for (let k = 0; k < N; k++) { if (!inReg[k]) continue; const v = acc.get(key(k)); if (!v || v.lengthSq() < 1e-30) continue; const n = v.clone().normalize(); NA[k * 3] = n.x; NA[k * 3 + 1] = n.y; NA[k * 3 + 2] = n.z; } }
    // [corpo] il mosaico del kit nelle cinque zone si toglie tutto; il corpo continuo si aggiunge alla mesh della pelle del busto
    let tube0 = -1;
    if (CORPO_ON) {
      groups.forEach(gr => { if (gr.materialIndex > 0) for (let k = gr.start; k < gr.start + gr.count; k += 3) dropT.add(k / 3); });
      const mo = (src.userData.pitOrig ? (Array.isArray(src.userData.pitOrig.mat) ? src.userData.pitOrig.mat[0] : src.userData.pitOrig.mat) : m0).name || '';
      if (/Body/i.test(src.name) && /^Skin/i.test(mo) && !B.corpoHost) { B.corpoHost = src.name;
        const C = corpo(B); let add = 0; C.forEach(c => { add += c.tris.length; }); const N2 = N + add;
        const nm = new THREE.Matrix3().setFromMatrix4(B.reli), ext = (A, sz) => { const o = new A.constructor(N2 * sz); o.set(A); return o; };
        keys.forEach(k => { arr[k] = ext(arr[k], attrs[k].itemSize); }); const UV2 = ext(UV, 2), SRC2 = ext(SRC, 1).fill(-1, N), VR2 = ext(VR, 1).fill(-1, N); VI.length = N2;
        let q = N; tube0 = N; const pa = new THREE.Vector3(), pb = new THREE.Vector3(), pc = new THREE.Vector3();
        C.forEach(c => { const st = q;
          for (let t = 0; t < c.tris.length; t += 3) { let tri = [c.tris[t], c.tris[t + 1], c.tris[t + 2]];
            pa.fromArray(c.VI[tri[0]].p); pb.fromArray(c.VI[tri[1]].p); pc.fromArray(c.VI[tri[2]].p); if (pb.sub(pa).cross(pc.sub(pa)).dot(c.N[tri[0]].clone().add(c.N[tri[1]]).add(c.N[tri[2]])) < 0) tri = [tri[0], tri[2], tri[1]];   // girati verso fuori
            for (const k of tri) { const L = c.VI[k], n = c.N[k].clone().applyMatrix3(nm).normalize();
              keys.forEach(a2 => { const sz = attrs[a2].itemSize, A = arr[a2];
                if (a2 === 'position') { A[q * 3] = L.l[0]; A[q * 3 + 1] = L.l[1]; A[q * 3 + 2] = L.l[2]; }
                else if (a2 === 'normal') { A[q * 3] = n.x; A[q * 3 + 1] = n.y; A[q * 3 + 2] = n.z; }
                else if (a2 === 'skinIndex') for (let j = 0; j < 4; j++) A[q * 4 + j] = c.SI[k * 4 + j];
                else if (a2 === 'skinWeight') for (let j = 0; j < 4; j++) A[q * 4 + j] = c.SW[k * 4 + j];
                else for (let j = 0; j < sz; j++) A[q * sz + j] = 1; });
              UV2[q * 2] = c.UV[k][0]; UV2[q * 2 + 1] = c.UV[k][1]; VI[q] = L; VR2[q] = c.r; q++; } }
          groups.push({ start: st, count: q - st, materialIndex: 1 + c.r }); out.addGroup(st, q - st, 1 + c.r); });
        keys.forEach(k => out.setAttribute(k, new THREE.BufferAttribute(arr[k], attrs[k].itemSize, attrs[k].normalized))); out.setAttribute('uv', new THREE.BufferAttribute(UV2, 2));
        res0.SRC = SRC2; res0.VR = VR2; } }
    out.boundingSphere = geo.boundingSphere; out.boundingBox = geo.boundingBox; out.userData.pittura = true;
    // le parti del kit che non sono pelle (cappuccio della felpa, scarpe del kit…) rimaste fuori dalle regioni: si possono nascondere
    const ms = Array.isArray(src.material) ? src.material : [src.material], mname = (src.userData.pitOrig ? (Array.isArray(src.userData.pitOrig.mat) ? src.userData.pitOrig.mat[0] : src.userData.pitOrig.mat) : ms[0]).name || '';
    const res = { dropT, noN, VI, VR: res0.VR || VR, tube0, geo: out, regs: groups.filter(g => g.materialIndex > 0).map(g => g.materialIndex - 1), SRC: res0.SRC || SRC, kitCloth: !/Head/i.test(src.name) && !/^(Skin|Eye|Eyebrows|Hair|Moustache)/i.test(mname), groups };   // mai le mesh della testa (capelli col nome di un colore, es. 'Red')
    GEO.set(key, res); return res;
  }

  // =====================================================================================
  // LA PITTURA
  // =====================================================================================
  const D = '#ece8dc';
  // un capo dipinto: in quale regione e dove (s in metri lungo il tubo, angolo) copre, e come
  function plan(B, c, k, all) {
    const Sa = S(), CUT = Sa.CUT_(), base = CUT[c.id] || { cl: 1, fab: 'cotone' }, C = Object.assign({ id: c.id }, base, (c.var && typeof c.var === 'object') ? c.var : {});
    const P = new Set(c.parti || []), F = frame(B), T = F.tubes[0], L = {};
    C.parti = c.parti || [];
    if (base.poncho) { C.L = L; C.col = c.col; C.A = rgb(c.col || '#808080'); C.B = C.A; C.C = C.A; return C; }   // il poncho è tutto in rilievo (mantella)
    C.col = c.col; C.A = rgb(c.col || '#808080'); if (C.stampa) C.stampaK = c.stampa !== undefined ? c.stampa : hsh(String(c.col || '').length * 7 + (parseInt(String(c.col || '0').slice(1), 16) | 0), c.id.length) * 1e6; ['aperta', 'fab', 'c2', 'c3', 'usura', 'tasche', 'fronte', 'collo', 'polsi'].forEach(k => { if (c[k] !== undefined && k !== 'fab' || (k === 'fab' && c.fabV)) C[k] = k === 'fab' ? c.fabV : c[k]; });
    const l = C.A[0] * .3 + C.A[1] * .59 + C.A[2] * .11; C.B = rgb(C.c2 || (l > .5 ? '#2a2a30' : D)); C.C = rgb(C.c3 || (l > .5 ? '#5a5a60' : '#a8a090'));
    const trous = !C.gonna && !C.solo_gonna && P.has('bacino') && (!P.has('torso') || C.intera), top = P.has('torso') && !C.solo_gonna;
    if (top) {
      const Ls = Sa.lengths(B, T, 'tronco', C, [...P]);
      let yb = Ls.yb; if (C.gonna || C.poncho) yb = B.waist - .02;   // la falda la fa la geometria
      if (!C.gonna && !C.poncho) yb = Math.max(yb, cutY(B));   // l'orlo dritto sopra il taglio (le giacche continuano con la falda in rilievo)
      if (C.cl >= 3 && !C.gonna && !C.poncho && !C.corto && !C.davanti && P.has('bacino')) { yb = B.waist + .015; C.falda3d = 1; }   // la giacca dipinta si ferma alla vita: sotto c'è la falda in rilievo (davanti, nell'apertura, si vede quello che sta sotto)
      if (C.cl <= 1 && !C.oversize && all.slice(all.indexOf(c) + 1).some(o => (CUT[o.id] || {}).cl === 2 && (o.parti || []).includes('bacino'))) { yb = B.waist - .02; C.infilata = 1; }   // infilata solo se i pantaloni stanno sopra   // infilata nei pantaloni
      L.T = { s0: T.sAtY(yb), s1: Ls.s1, yb, yt: Ls.yt };
    }
    if (trous || C.solo_gonna) L.T = Object.assign(L.T || {}, { p0: T.sAtY(B.crotch - .12), p1: T.sAtY(B.waist + .03) });
    for (const sd of ['L', 'R']) {
      if (top && !C.smanicato && !C.davanti && (P.has('braccia') || P.has('avambracci'))) { const tb = F.tubes[sd === 'L' ? 1 : 2], Ls = Sa.lengths(B, tb, 'manica' + sd, C, [...P]); if (Ls.s1 > .02) L['A' + sd] = Ls; }
      if (trous || C.velo || C.stretti && P.has('cosce')) { const tb = F.tubes[sd === 'L' ? 3 : 4], Ls = Object.assign({}, Sa.lengths(B, tb, 'gamba' + sd, C, [...P])); Ls.s1 = Math.min(Ls.s1, tb.L - .035); L['L' + sd] = Ls; }
      if (C.pettorina) { /* la salopette: pettorina dipinta sul busto */ L.T = Object.assign(L.T || {}, { bib: 1 }); }
      // giacche e cappotti che scendono sotto l'inforcatura, gonne e falde: continuano dipinti sulle cosce
      // (sotto le falde la gamba ha la stessa stoffa: se passa attraverso, non si vede)
      const openCoat = C.cl >= 5 && C.gonna && !C.solo_gonna && !C.poncho; const hem = openCoat ? null : C.gonna || C.solo_gonna || C.poncho ? (Sa.lengths(B, T, 'gonna', C, [...P]).yb) : null;   // niente più continuazione dipinta sulle cosce: sotto il taglio va la falda   // ogni capo che scende sotto la vita continua sulle cosce fino al suo orlo
      if (hem !== null && hem !== undefined && !L['L' + sd]) L['L' + sd] = { falda: hem, s1: 9, kn: 0, sCr: 0 };
    }
    C.L = L; return C;
  }
  // lo scollo (quanto scende dalla base del collo) per angolo, come nella Sartoria
  function neckDrop(C, a) {
    const fa = Math.cos(a), c = C.collo; let d = 0;
    if (c === 'v' || c === 'revers' || c === 'revers_pelle' || c === 'camicia_aperta') { const w = c === 'v' ? .55 : .7, dep = c === 'v' ? .1 : c === 'camicia_aperta' ? .11 : .2; if (Math.abs(a) < w) d = dep * (1 - Math.abs(a) / w); }
    if (c === 'giro' || c === 'polo' || c === 'camicia' || c === 'alto_zip' || c === 'cappuccio' || c === 'giro') d = Math.max(0, fa) * .025;
    if (c === 'barca') d = Math.max(0, Math.abs(fa)) * .02;
    if (c === 'canotta' || C.spalline_sottili) { const sa = Math.abs(Math.abs(a) - Math.PI / 2);   // scollo dritto davanti e dietro, giro manica largo: niente buco a goccia
      d = sa < .55 ? 0 : (fa > 0 ? .075 : .05) * sm(cl((sa - .55) / .35, 0, 1)); }
    if (c === 'alto') d = -.07; if (c === 'alto_zip') d = -.04;
    // ai lati e dietro lo scollo sale sul trapezio fino alla base del collo (niente pelle sulle spalle)
    if (!/canotta|barca/.test(c || '') && !C.spalline_sottili) d -= .018 * (1 - Math.max(0, fa));
    return d;
  }
  // il colore del tessuto in un punto (metri): la piastrella del tessuto della Sartoria
  // il colore della stoffa in un punto (metri), a campiture: 2-3 toni a blocchi grossi, motivi grandi e leggibili
  const hsh = (a, b) => { let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  function fabric(C, xm, ym) {
    const A = C.A, B = C.B, Cc = C.C, tone = 1;   // tinta unita (i corpi del kit sono già irregolari: niente macchie sopra)
    let c = A, h = .5; const f = C.fab;
    const md = (v, m) => ((v % m) + m) % m;
    if (f === 'righe') c = md(ym, .06) < .02 ? A : B;   // marinara: righe orizzontali
    else if (f === 'righe_v') c = md(xm, .08) < .04 ? A : B;
    else if (f === 'regimental') { const d = md(xm + ym, .06); c = d < .016 ? B : d > .022 && d < .027 ? Cc : A; }   // righe diagonali della cravatta
    else if (f === 'raso') c = A;
    else if (f === 'gessato') { if (md(xm, .07) < .006) c = mixc(A, B, .28); }
    else if (f === 'tartan' || f === 'madras' || f === 'galles') { const bx = md(xm, .14) < .045, by = md(ym, .14) < .045, tx = md(xm, .14) > .09 && md(xm, .14) < .1, ty = md(ym, .14) > .09 && md(ym, .14) < .1; c = bx && by ? mul(B, .85) : bx || by ? mixc(A, B, .6) : A; if (tx || ty) c = mixc(c, Cc, .8); }
    else if (f === 'vichy' || f === 'pied') { const bx = md(xm, .05) < .025, by = md(ym, .05) < .025; c = bx && by ? B : bx || by ? mixc(A, B, .5) : A; }
    else if (f === 'fiori' || f === 'liberty' || f === 'paisley' || f === 'pois') { const cs = f === 'fiori' ? .09 : .05, cx = Math.floor(xm / cs), cy = Math.floor(ym / cs), r = hsh(cx * 7 + 3, cy * 13 + 1), ox = (hsh(cx, cy * 3) - .5) * cs * .4, oy = (hsh(cx * 5, cy) - .5) * cs * .4, d = Math.hypot(md(xm, cs) - cs / 2 - ox, md(ym, cs) - cs / 2 - oy); if (d < cs * (f === 'pois' ? .2 : .32)) c = r < .5 ? B : Cc; else if (f === 'fiori' && d < cs * .45 && r > .6) c = mixc(Cc, [.15, .3, .15], .5); }
    else if (f === 'maculato') {   // [drip] leopardo vero: rosette a C spezzate (2-4 macchie attorno a un cuore più caldo), punti pieni sparsi, pelo a ciocche
      const cs = .075, gx = xm / cs, gy = ym / cs * 1.15, cx = Math.floor(gx), cy = Math.floor(gy); let best = 9, bx = 0, by = 0, bid = 0;
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const X = cx + i, Y = cy + j, px = X + .2 + .6 * hsh(X * 7 + 1, Y * 3 + 2), py = Y + .2 + .6 * hsh(X * 5 + 3, Y * 11 + 7), d = Math.hypot(gx - px, gy - py); if (d < best) { best = d; bx = gx - px; by = gy - py; bid = X * 131 + Y; } }
      const rr = .3 + .08 * hsh(bid, 5), solid = hsh(bid, 9) < .22, ang = Math.atan2(by, bx), seg = Math.sin(ang * (2 + Math.floor(hsh(bid, 4) * 2)) + hsh(bid, 6) * 6) > -.35;
      c = A; if (solid) { if (best < rr * .55) c = B; } else if (best < rr * .62) c = mixc(A, Cc, .85); else if (best < rr && seg) c = B;
      c = mul(c, .9 + .2 * hsh(Math.floor(xm / .006), Math.floor(ym / .018))); h = .5 + .3 * hsh(Math.floor(xm / .006), Math.floor(ym / .018)); }
    else if (f === 'etnico') { const y0 = md(ym, .2); if (y0 < .02 || (y0 > .1 && y0 < .115)) c = Cc; else if (y0 > .03 && y0 < .08) { const z = Math.abs(md(xm, .06) - .03) + Math.abs(y0 - .055); c = z < .022 ? B : A; } }
    else if (f === 'piumino') { const P = C.oca ? .095 : .07, t = md(ym, P); c = mul(A, t < .008 ? .55 : .86 + .24 * Math.sin(t / P * Math.PI)); h = t < .008 ? .1 : .5 + .4 * Math.sin(t / P * Math.PI); }
    else if (f === 'velluto' || f === 'costine' || f === 'trecce') { if (md(xm, .02) < .007) { c = mul(A, .86); h = .3; } else h = .7; }
    else if (f === 'denim') c = mul(A, md(xm + ym, .007) < .0035 ? .97 : 1.02);   // saia sottile, uniforme
    else if (f === 'pelo' || f === 'montone') { const q = hsh(Math.floor(xm / .007), Math.floor(ym / .022 + hsh(Math.floor(xm / .007), 3))), tip = hsh(Math.floor(xm / .014), Math.floor(ym / .05)); c = mul(A, .78 + q * .32 + (tip > .8 ? .12 : 0)); h = .35 + q * .55; }   // [drip] il pelo: ciocche lunghe con le punte più chiare
    return [...mul(c, tone), h];
  }
  // [forma] la mappa delle posizioni: per ogni pixel di ogni tela il punto vero del corpo (stirato, a riposo), dai triangoli rasterizzati
  // nelle coordinate di stoffa. I dettagli che vivono nello spazio del corpo (tasche dietro, sprone) si disegnano su questa: niente strappi
  // dove il corpo esce dal tubo (glutei pieni) o passa dal busto alle cosce.
  function posMap(B, srcs) {
    if (B.posMap) return B.posMap; const M = {};
    REG.forEach(R => { const [W, H] = SIZE[R]; M[R] = { W, H, P: new Float32Array(W * H * 3).fill(NaN) }; });
    srcs.forEach((src, si) => { const pg = paintGeo(B, src, si); if (!pg) return; const UV = pg.geo.attributes.uv.array;
      pg.groups.forEach(gr => { const ri = gr.materialIndex - 1; if (ri < 0 || ri > 4) return; const T = M[REG[ri]], W = T.W, H = T.H;
        for (let w0 = gr.start; w0 < gr.start + gr.count; w0 += 3) { const L0 = pg.VI[w0], L1 = pg.VI[w0 + 1], L2 = pg.VI[w0 + 2]; if (!L0 || !L1 || !L2 || pg.dropT.has(w0 / 3)) continue;
          const X = [0, 1, 2].map(k => UV[(w0 + k) * 2] * W - .5), Y = [0, 1, 2].map(k => UV[(w0 + k) * 2 + 1] * H - .5), Ls = [L0, L1, L2];
          const x0 = Math.floor(Math.min(...X)), x1 = Math.ceil(Math.max(...X)), y0 = Math.max(0, Math.floor(Math.min(...Y))), y1 = Math.min(H - 1, Math.ceil(Math.max(...Y)));
          const d = (X[1] - X[0]) * (Y[2] - Y[0]) - (X[2] - X[0]) * (Y[1] - Y[0]); if (Math.abs(d) < 1e-9 || x1 - x0 > W / 2) continue;
          for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) {
            const b1 = ((px - X[0]) * (Y[2] - Y[0]) - (X[2] - X[0]) * (py - Y[0])) / d, b2 = ((X[1] - X[0]) * (py - Y[0]) - (px - X[0]) * (Y[1] - Y[0])) / d, b0 = 1 - b1 - b2;
            if (b0 < -.02 || b1 < -.02 || b2 < -.02) continue; const q = ((py * W) + ((px % W) + W) % W) * 3;
            for (let k = 0; k < 3; k++) T.P[q + k] = b0 * Ls[0].p[k] + b1 * Ls[1].p[k] + b2 * Ls[2].p[k]; } } }); });
    // i buchi (pixel che nessun triangolo tocca): dal vicino
    REG.forEach(R => { const T = M[R], W = T.W, H = T.H; for (let it = 0; it < 3; it++) { const P0 = T.P.slice(); for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) { const q = (py * W + px) * 3; if (!isNaN(P0[q])) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const yy = py + dy; if (yy < 0 || yy >= H) continue; const q2 = (yy * W + ((px + dx + W) % W)) * 3; if (!isNaN(P0[q2])) { T.P[q] = P0[q2]; T.P[q + 1] = P0[q2 + 1]; T.P[q + 2] = P0[q2 + 2]; break; } } } } });
    B.posMap = M; return M;
  }
  // dipinge le cinque tele di una persona. W[reg] = { c: Uint8ClampedArray rgba, h: bump }
  function paint(B, outfit, skin) {
    const F = frame(B), SK = rgb(skin || '#dcae88'), Sa = S(), CUT = Sa.CUT_();
    const list = outfit.filter(c => c.parti && c.parti.some(p => /torso|braccia|avambracci|bacino|cosce|polpacci|collo/.test(p)));
    // ordine degli strati (come la Sartoria): classe, poi l'ordine scelto
    const ranked = rankOutfit(list, CUT);
    const plans = ranked.map((c, k) => plan(B, c, k, ranked));
    const nY = Sa.neckY(B), out = {};
    const shoe = outfit.find(c => /^(scarpe|scarpe_eleganti|scarpe_tela|scarpe_corsa|mocassini)/.test(c.id)), sock = outfit.find(c => c.id === 'calzini' || c.id === 'calze_sport' || c.id === 'calze_nylon' || c.id === 'calzamaglia');
    const ankle = shoe ? rgb(sock && sock.col || '#2a2a2e') : null;
    const LO = legOrder(outfit), socksOver = LO.socksOver, sockTop = LO.sock && LO.sock.id === 'calze_sport' ? .34 : .27, sockCol = sock ? rgb(sock.col || '#2a2a2e') : null;
    const bt = outfit.find(c => /^stivali/.test(c.id)), boots = bt ? { top: bt.id === 'stivali' ? .34 : .3, col: rgb(bt.col || '#2a1e18'), risv: bt.id !== 'stivali' } : null;
    REG.forEach((R, ri) => {
      const [W, H] = SIZE[R], tb = F.tubes[ri], [s0, s1] = F.range[ri], circ = F.circ[ri], col = new Uint8ClampedArray(W * H * 4), hh = new Uint8ClampedArray(W * H * 4);
      for (let py = 0; py < H; py++) {
        const sv = lerp(s0, s1, (py + .5) / H), fr = S().frameAt(tb, sv), y0 = fr.p.y;
        for (let px = 0; px < W; px++) {
          const u = (px + .5) / W, a = u * Math.PI * 2 - Math.PI, xm = u * circ, i = (py * W + px) * 4;
          const PM = B.posMap && B.posMap[R], pq = (py * W + px) * 3; CUR.p = PM && !isNaN(PM.P[pq]) ? CUR.v.set(PM.P[pq], PM.P[pq + 1], PM.P[pq + 2]) : null;
          const y = R[0] === 'L' ? surfY(tb, sv, a) : y0;   // sulle gambe l'altezza vera del punto (l'asse è inclinato): orli dritti tra busto e gambe
          let c = SK, h = .5, shade = 1;
          // ombre del corpo: ascelle, inforcatura, interno coscia
          let top = -1;
          for (let k = plans.length - 1; k >= 0; k--) {
            const C = plans[k], r = paintAt(B, C, R, ri, a, sv, y, xm, nY, tb); if (!r) continue;
            c = r.c; h = r.h; shade = r.s; top = k; break;
          }
          // il colletto della camicia esce sopra il maglione o la giacca (se quelli non hanno il collo alto)
          if (R === 'T' && top >= 0) for (let k = 0; k < top; k++) { const C = plans[k]; if (!/^(camicia|polo|camicia_aperta)$/.test(C.collo || '')) continue;
            const O = plans[top]; if (/alto|cappuccio|montone|pelo/.test(O.collo || '')) break;
            const tip = Math.abs(a) < .55 ? (.55 - Math.abs(a)) * .08 : 0, dy = nY - neckDrop(C, a) - y, oy = nY - neckDrop(O, a) - y;
            if (dy >= 0 && dy < .035 + tip && oy < .012 + tip * .7) { const f0 = fabric(C, xm, sv); c = mul([f0[0], f0[1], f0[2]], 1.06); h = .7; shade = (dy > .031 + tip || dy < .003) ? .7 : 1; } }
          if (R === 'T') { const side = Math.max(0, Math.abs(Math.sin(a)) - .7) / .3, arm = cl(1 - Math.abs(y - (nY - .2)) / .1, 0, 1); shade *= 1 - .18 * side * arm; }
          if (R[0] === 'L') { const inner = cl(1 - Math.abs(a - (R === 'LL' ? -Math.PI / 2 : Math.PI / 2)) / .9, 0, 1), up = cl(1 - (sv - .1) / .25, 0, 1); shade *= 1 - .15 * inner * up; }
          // sotto l'orlo, con le scarpe: il calzino (niente caviglia nuda che sbuca dietro la scarpa)
          if (R[0] === 'L' && ankle && top < 0 && y < .16) { c = ankle; h = .5; shade = y < .06 ? .8 : 1; }
          // gli stivali: il gambale dipinto sul polpaccio, sopra i pantaloni, con l'orlo dritto
          // i calzini messi sopra i pantaloni: la gamba dei pantaloni infilata nel calzino
          if (R[0] === 'L' && socksOver && y < sockTop) { const e = sockTop - y, rib = .5 + .5 * Math.sin(xm / .005 * Math.PI); c = mul(sockCol, .9 + rib * .15); h = rib; shade = e < .006 ? .6 : 1; top = -1; }
          if (R[0] === 'L' && boots && y < boots.top && top < 0) { const e = boots.top - y, f0 = boots.col; c = mul(f0, .95 + .1 * (hsh(Math.floor(xm / .03), Math.floor(y / .03)) > .6 ? 1 : 0)); h = .6; shade = e < .008 ? .55 : e < .03 && boots.risv ? 1.08 : 1; top = -1; if (y < .05) shade *= .5; }
          // ---- il volume dipinto, come nella pixel art: luce di forma, pieghe, toni a gradini, contorni ----
          if (top >= 0) {
            const C = plans[top], fa = Math.cos(a - .45);   // luce da davanti-sinistra
            
            
            if (R !== 'T' || y < nY - .03) shade *= 1 - .08 * cl((Math.abs(Math.sin(a)) - .75) / .25, 0, 1);   // i fianchi girano nell'ombra
          }
          // toni a gradini (pixel art): niente sfumature continue
          
          col[i] = c[0] * 255 * shade; col[i + 1] = c[1] * 255 * shade; col[i + 2] = c[2] * 255 * shade; col[i + 3] = 255;
          const Ct = top >= 0 ? plans[top] : null, rf = Ct ? (FIN[Ct.fab] !== undefined ? FIN[Ct.fab] : .85) : .415;   // la pelle: come il materiale Skin del kit
          // grana della finitura: la lana ha il pelo, la pelle la grana, il nylon un riflesso più pulito
          if (Ct && /lana|panno|feltro|trecce|costine|scamosciato|montone|pelo/.test(Ct.fab)) { const n = (hsh(px * 7 + ri, py * 13) - .5) * (/panno|feltro/.test(Ct.fab) ? .3 : 1); col[i] = cl(col[i] * (1 + n * .07), 0, 255); col[i + 1] = cl(col[i + 1] * (1 + n * .07), 0, 255); col[i + 2] = cl(col[i + 2] * (1 + n * .07), 0, 255); h += n * .15; }   // il panno è liscio: appena una grana
          if (Ct && /pelle|gomma/.test(Ct.fab)) h += (hsh(px >> 1, py >> 1) - .5) * .2;
          hh[i] = hh[i + 2] = cl(h, 0, 1) * 255; hh[i + 1] = rf * 255; hh[i + 3] = 255;
        }
      }
      out[R] = { W, H, col, hh };
    });
    return { out, plans };
  }
  // le pieghe disegnate: tratti scuri dove la stoffa si raccoglie (sopra la cintura, al cavallo, ai gomiti, alle caviglie, sotto le ascelle)
  function fold(B, C, R, a, sv, y, xm, nY) {
    const md = (v, m) => ((v % m) + m) % m, stroke = (d, w) => Math.abs(d) < w;
    let k = 1;
    if (R === 'T') {
      // la maglia o la camicia che si gonfia sopra la cintura: archi corti orizzontali
      if (C.cl !== 2 && y > B.waist && y < B.waist + .07 && Math.abs(Math.sin(a)) < .85) { const ph = md(xm + Math.sin(y * 90) * .01, .07); if (stroke(ph - .035, .006) && md(y, .03) < .012) k *= .8; }
      // le pieghe a raggiera dall'ascella verso il petto
      const yA = nY - .2; if (C.cl !== 2 && y > yA - .08 && y < yA + .03 && Math.abs(Math.abs(a) - 1.25) < .35) { const t = (Math.abs(a) - 1.25) * .12 + (y - yA) * .6; if (stroke(md(t, .025) - .0125, .004)) k *= .82; }
      // il cavallo dei pantaloni: tratti obliqui
      if (C.cl === 2 && y < B.crotch + .07 && y > B.crotch - .02 && Math.abs(a) < .6) { const t = Math.abs(a) * .14 - (B.crotch + .07 - y) * .7; if (stroke(md(t, .03) - .015, .004)) k *= .8; }
    }
    if (R[0] === 'A') {
      const tb = frame(B).tubes[R === 'AL' ? 1 : 2], la = tb.sNear(B.bones['LowerArm' + R[1]]);
      if (Math.abs(sv - la) < .05) { const t = (sv - la) + Math.cos(a) * .01; if (stroke(md(t, .022) - .011, .004)) k *= .8; }
      if (sv > la + .06) { const t = sv + Math.sin(a * 2) * .02; if (stroke(md(t, .07) - .035, .0035) && Math.cos(a) < .3) k *= .86; }   // pieghe lunghe sull'avambraccio
    }
    if (R[0] === 'L') {
      const sd = R[1], tb = frame(B).tubes[R === 'LL' ? 3 : 4], kn = tb.sNear(B.bones['LowerLeg' + sd]), an = tb.sNear(B.ankle[sd]);
      if (Math.abs(sv - kn) < .06 && Math.cos(a) < 0) { const t = (sv - kn) + Math.sin(a) * .01; if (stroke(md(t, .025) - .0125, .004)) k *= .8; }
      if (an - sv < .1 && an - sv > 0 && C.cl === 2) { const t = (an - sv) - Math.abs(Math.sin(a)) * .03; if (stroke(md(t, .035) - .0175, .004)) k *= .78; }   // la "rottura" del pantalone sulla scarpa
      if (sv < .2 && sv > .05) { const t = sv + a * .03; if (stroke(md(t, .06) - .03, .003) && Math.abs(Math.sin(a)) > .5) k *= .86; }
    }
    return k;
  }
  // lo spessore di ogni capo (metri sopra il corpo): la camicia aderisce, il cappotto stacca, il piumino gonfia
  function spessore(C) {
    if (C.oca) return .04; if (C.fab === 'piumino') return C.smanicato ? .026 : .03; if (C.largo) return .016; if (C.oversize) return C.cl >= 3 ? .016 : .007; if (/pelo|montone|maculato/.test(C.fab) || /pelliccia|montone/.test(C.id)) return .024;
    if (C.fab === 'trecce') return .011; return { 0: .001, 1: .0025, 2: .0045, 3: .008, 4: .012, 5: .017, 6: .012 }[C.cl] || .003;
  }
  // il volume vero di certi capi: gli spicchi gonfi del piumino (anelli attorno a busto e maniche), le gambe larghe che scendono dritte
  function volume(B, C, r, L) {
    let o = 0; const md = (v, m) => ((v % m) + m) % m;
    if (C.fab === 'piumino' && r <= 2) { const P = C.oca ? .095 : .07, t = md(L.s - (r === 0 ? 0 : 0), P) / P; o += (C.oca ? .011 : .007) * (Math.pow(Math.sin(t * Math.PI), .6) - .5); }
    if (C.largo && r >= 3) o += .004 + .02 * cl((L.s - .12) / .5, 0, 1);
    if (C.morbido && r >= 3) o += .009 * cl(L.s / .1, 0, 1) * (1 - .75 * cl((L.s - .4) / .35, 0, 1));   // la tuta: morbida sulla coscia, si stringe verso la caviglia (rastremata)
    return o;
  }
  // le spalle strutturate (giacche, cappotti, divise): l'imbottitura allarga e squadra la spalla; i maglioni la ammorbidiscono appena
  function spalla(B, C, r, L, nY) {
    const pad = C.cl >= 4 && !/pelle|piumino|pelo|montone/.test(C.fab) ? .01 : C.cl === 3 ? .003 : 0; if (!pad) return 0;
    if (r === 0) { const y = L.p[1], side = Math.abs(Math.sin(L.a)); return pad * cl((y - (nY - .08)) / .05, 0, 1) * cl((side - .55) / .35, 0, 1); }   // solo in cima: la spalla si squadra, non scende
    if (r === 1 || r === 2) return pad * .6 * cl(1 - L.s / .04, 0, 1);   // la testa della manica
    return 0;
  }
  // la finitura: quanto è opaca (1) o lucida (0,3) la stoffa
  const FIN = { pelle: .38, gomma: .45, nylon: .55, piumino: .32, raso: .3, ripstop: .55, cordura: .6, denim: .8, cotone: .85, jersey: .9, pique: .88, tela: .8,
    panno: .95, lana: .97, feltro: .98, spina: .93, gessato: .9, galles: .93, pied: .93, tartan: .92, vichy: .88, madras: .88, trecce: .98, costine: .96, velluto: .7, scamosciato: .98, pelo: .9, montone: .97, maculato: .9 };
  // il capo più esterno in un punto (per spessore e finitura)
  // [strati] lo spessore vero in un punto: il capo che si vede più quelli che gli stanno sotto, schiacciati.
  // Chi sta fuori passa sopra a tutto (strati annidati, niente compenetrazioni); un capo stretto messo sopra uno più largo
  // (le mutande sopra i pantaloni larghi, l'elastico sopra il maglione) lo strizza: sotto conta solo lo spessore della stoffa.
  function stackOff(B, plans, ri, L, nY) {
    const F = frame(B), R = REG[ri], tb = F.tubes[ri], xm = (L.a + Math.PI) / (Math.PI * 2) * F.circ[ri], cov = [];
    for (let k = 0; k < plans.length; k++) if (paintAt(B, plans[k], R, ri, L.a, L.s, L.p[1], xm, nY, tb)) cov.push(plans[k]);
    if (!cov.length) return { C: null, off: 0 };
    const C = cov[cov.length - 1]; let off = spessore(C) + spalla(B, C, ri, L, nY) + volume(B, C, ri, L);
    for (let k = 0; k < cov.length - 1; k++) { const U = cov[k], tight = (C.cl || 0) < (U.cl || 0), vu = Math.max(0, volume(B, U, ri, L));
      off += tight ? spessore(U) * .75 + vu * .3 : spessore(U) * .35 + vu * .5; }
    return { C, off, cov };
  }
  // lo spessore vero in un punto della superficie (per i pezzi in rilievo: cinture, orli, sciarpe, tracolle stanno sopra l'ultimo strato)
  function offAt(B, plans, r, s, a) { const p = surfI(B, r, s, a, 0); return stackOff(B, plans, r, { s, a, p: [p.x, p.y, p.z] }, S().neckY(B)).off; }
  function topAt(B, plans, ri, a, sv, y, nY) {
    const F = frame(B), R = REG[ri], tb = F.tubes[ri], xm = (a + Math.PI) / (Math.PI * 2) * F.circ[ri];
    for (let k = plans.length - 1; k >= 0; k--) if (paintAt(B, plans[k], R, ri, a, sv, y, xm, nY, tb)) return plans[k];
    return null;
  }
  // il cuore: cosa c'è dipinto nel punto (a, sv) della regione R per il capo C (null = il capo non copre qui)
  // il giro manica dei capi senza maniche (gilet, smanicati): quanto un punto sta oltre il piano verticale dell'attaccatura del braccio (>0: è braccio)
  const gapF = t => .03 + .32 * Math.pow(cl((t - .66) / .34, 0, 1), 2);   // l'apertura davanti della falda della giacca (come in Sartoria)
  const giroManica = C => C.smanicato && C.collo !== 'canotta' && !C.spalline_sottili;
  function armSide(B, p) {
    let best = -9; for (const sd of ['L', 'R']) { const j = B.bones['UpperArm' + sd], c = B.bones.Chest || B.bones.Hips; if (!j || !c) continue; const n = j.clone().sub(c).setY(0).normalize(); const lo = j.y - .085 - p.y; best = Math.max(best, p.clone().sub(j).dot(n) + .004 - (lo > 0 ? lo * 1.5 + lo * lo * 40 : 0)); }   // sotto l'ascella il giro manica si chiude in tondo
    return best;
  }
  const PXC = new Map();
  function stampaPix(C) {
    const Sa = S(), L = C.stampe || Sa.STAMPE, k = L[(C.stampaK >>> 0) % L.length], key = k + '|' + C.col; if (PXC.has(key)) return PXC.get(key);
    let r = null; try { const im = Sa.printMat(k, C.col || '#d8d0c0').map.image, x = im.getContext('2d'); r = { n: im.width, d: x.getImageData(0, 0, im.width, im.height).data }; } catch (e) { r = null; }
    PXC.set(key, r); return r;
  }
  // distanza dal bordo della tasca dietro (dentro: >= 0; fuori: -1). Il pentagono: in alto sotto lo sprone, la punta in basso sul gluteo
  const CUR = { p: null, v: new THREE.Vector3() };   // il punto vero del corpo per il pixel che si sta dipingendo (dalla mappa delle posizioni)
  function backPocket(B, p) {
    const b = B.bones, hx = b.Hips.x, fem = FEMMINE.test(B.key), yTop = B.waist - .05, yBot = (b.Hips.y + B.crotch) / 2 - (fem ? .005 : .02), w = fem ? .056 : .062;
    if (p.z > b.Hips.z - .03) return -1; const dx = Math.abs(p.x - hx), cx = fem ? .075 : .082, X = (dx - cx) * (p.x > hx ? 1 : -1) * 1, t = (yTop - p.y) / (yTop - yBot);
    if (t < 0 || t > 1.18) return -1; const tilt = (fem ? .18 : .12) * (yTop - p.y), xx = Math.abs(dx - cx - tilt * 0) + 0, half = w * (1 - .1 * t);
    if (xx > half) return -1; const tip = t > 1 ? (t - 1) / .18 : 0; if (tip > 0 && xx > half * (1 - tip)) return -1;
    const eSide = (half - xx), eTop = (p.y > yTop - .001 ? 0 : yTop - p.y), eBot = t > 1 ? (half * (1 - tip) - xx) * .7 : 9; return Math.min(eSide, eTop, eBot, t <= 1 ? 9 : 9);
  }
  // le tre strisce (d: metri dalla linea centrale): 1 = striscia, 2 = il filo d'ombra sul bordo, 0 = niente
  const TRE_W = .013, TRE_G = .008;   // esagerate: si leggono da lontano
  function tre(d) { const tot = 3 * TRE_W + 2 * TRE_G, x = d + tot / 2; if (x < -.001 || x > tot + .001) return 0; const m = x % (TRE_W + TRE_G); if (m < TRE_W) return m < .0012 || m > TRE_W - .0012 ? 2 : 1; return 0; }
  let F0 = ri => 0;
  function paintAt(B, C, R, ri, a, sv, y, xm, nY, tb) {
    F0 = r => frame(B).circ[r];
    const L = C.L, dark = (c, k) => mul(c, k);
    const line = (d, w) => Math.abs(d) < w;   // una cucitura larga w metri
    let base = null, edge = 9;
    if (R === 'T') {
      const T = L.T; if (!T) return null;
      const inTop = T.s0 !== undefined && (() => { const top = nY - neckDrop(C, a); return y >= T.yb - (C.orlo === 'punte' && Math.abs(a) < .5 ? .04 * (1 - Math.abs(a) / .5) : 0) && y <= top; })();
      const inPel = T.p0 !== undefined && sv >= T.p0 && sv <= T.p1 && (C.solo_gonna || y > B.crotch - .02 - .07 * Math.pow(Math.abs(Math.sin(a)), 1.5));
      const inBib = T.bib && Math.abs(a) < .72 && y < B.bones.Chest.y + .04 && y > B.waist - .02;
      if (!inTop && !inPel && !inBib) return null;
      if (C.aperta && inTop && Math.abs(a) < .3) return null;
      // canotta e vestiti a spalline: sopra l'ascella copre solo la spallina vicino al collo (il deltoide resta nudo)
      if (inTop && (C.collo === 'canotta' || C.spalline_sottili) && y > nY - .17) { const pS = S().surf(tb, sv, a, 0), nx = B.neckC ? B.neckC[0] : 0; if (Math.abs(pS.x - nx) > (B.neckR || .06) + (C.spalline_sottili ? .03 : .05)) return null; }   // aperta davanti: si vede quello che c'è sotto
      if (inTop && giroManica(C)) { const e = -armSide(B, S().surf(tb, sv, a, 0)); if (e < 0 && !inPel) return null; }
      if (inTop) edge = Math.min(y - T.yb, nY - neckDrop(C, a) - y);
      if (inPel && !inTop) edge = Math.min(B.waist + .03 - y, 9);
    } else if (R[0] === 'A') {
      const Ls = L[R];
      if (!Ls && giroManica(C) && L.T && L.T.s0 !== undefined) { const e = -armSide(B, S().surf(tb, sv, a, 0)); if (e < 0) return null; edge = e; }   // gilet e smanicati: il giro manica è un piano sull'attaccatura del braccio (stesso confine sul busto e sulla manica)
      else { if (!Ls || sv > Ls.s1) return null; edge = Ls.s1 - sv; }
    } else {
      const Ls = L[R]; if (!Ls) return null;
      if (Ls.falda !== undefined) { if (y < Ls.falda) return null; const f0 = fabric(C, xm, sv); const e = y - Ls.falda; let c0 = [f0[0], f0[1], f0[2]], h0 = .3 + f0[3] * .4, s0 = (C.gonna || C.solo_gonna || C.poncho) ? .6 : e < .008 ? .5 : e < .02 ? .88 + .12 * (e - .008) / .012 : 1;   // sotto le falde: l'ombra interna
        if (C.costine && e < .05) { const rib = .5 + .5 * Math.sin(xm / .006 * Math.PI); c0 = mul(C.A, .82 + rib * .22); h0 = rib; }
        if ((C.cl >= 4 || C.poncho) && !C.costine && e >= .008 && e < .04) s0 *= .72;
        return { c: c0, h: h0, s: s0 }; }
      if (sv > Ls.s1) return null; edge = Ls.s1 - sv;
    }
    let f = fabric(C, xm, sv); let c = [f[0], f[1], f[2]], h = .3 + f[3] * .4, s = 1;
    // l'orlo: piega scura e un filo d'ombra prima
    const conFalda = R === 'T' && C.cl >= 3 && !C.corto && !C.davanti && !C.gonna && L.T && L.T.yb !== undefined && y - L.T.yb < .05 && (C.parti || []).includes('bacino');   // giacca con la falda in rilievo: niente orlo dipinto, prosegue la falda
    if (!conFalda) { if (edge < .008) { s *= .5; h = .1; } else if (edge < .02) s *= .88 + .12 * (edge - .008) / .012; }
    // i capi pesanti hanno la bordura scura all'orlo (come nei riferimenti)
    if ((C.cl >= 4 || C.poncho) && !C.costine && edge >= .008 && edge < .04 && !conFalda) s *= .72;
    const R2 = Math.PI / 2;
    if (R === 'T') {
      const xf = a * .14;
      // il numero della canotta da basket e della maglia da calcio: davanti piccolo, dietro grande
      if (C.numero) { const n = 1 + Math.floor(hsh(C.id.length, (parseInt(String(C.col || '0').slice(1), 16) | 0)) * 98), back = Math.cos(a) < 0, sc = back ? .15 : .09, yT = B.bones.Chest.y + (back ? .04 : 0), ax = back ? (a > 0 ? a - Math.PI : a + Math.PI) : a;
        const ds = String(n), dw = sc * .62, X = ax * .15, x0 = -ds.length * dw / 2, v = (yT - y) / sc;
        if (v >= 0 && v < 1 && X >= x0 && X < -x0) { const di = Math.floor((X - x0) / dw), u = ((X - x0) - di * dw) / dw, SEG = [0x3f, 0x06, 0x5b, 0x4f, 0x66, 0x6d, 0x7d, 0x07, 0x7f, 0x6f][+ds[di]], t = .17;
          const on = (k, hit) => (SEG >> k & 1) && hit, ink = (on(0, v < t && u > .1 && u < .9) || on(1, u > .78 && u < .95 && v > .05 && v < .5) || on(2, u > .78 && u < .95 && v > .5 && v < .95) || on(3, v > 1 - t && u > .1 && u < .9) || on(4, u > .05 && u < .22 && v > .5 && v < .95) || on(5, u > .05 && u < .22 && v > .05 && v < .5) || on(6, Math.abs(v - .5) < t / 2 && u > .1 && u < .9));
          if (ink) { c = rgb(C.bande || C.c2 || '#ece8e0'); h = .55; } } }
      // la stampa sul petto (come la stampa della Sartoria): un disegno che copre il davanti
      if (C.stampa) { const PX = stampaPix(C), big = C.oversize ? 1.2 : 1, yT = B.bones.Chest.y + .05, u = (a + .62 * big) / (1.24 * big), v = (yT - y) / (.22 * big);
        if (PX && u >= 0 && u < 1 && v >= 0 && v < 1) { const k = (Math.floor(v * PX.n) * PX.n + Math.floor(u * PX.n)) * 4, q = [PX.d[k] / 255, PX.d[k + 1] / 255, PX.d[k + 2] / 255]; if (Math.abs(q[0] - C.A[0]) + Math.abs(q[1] - C.A[1]) + Math.abs(q[2] - C.A[2]) > .1) { c = q; h = .45; } } }
      if (C.aperta) { const ea = Math.abs(a) - .3; if (ea < .06) { s *= ea < .03 ? .55 : .85; h = .2; }   // il bordo aperto (con la zip)
        if (Math.abs(Math.abs(a) - .42) < .04 && y > nY - .17 && y < nY - .02) { c = [.92, .9, .86]; s = 1; h = .7; } }   // i cordini del cappuccio   // metri dal centro davanti (all'incirca, sul petto)
      // cuciture laterali
      if (line(Math.abs(a) - R2, .012) && C.fab !== 'piumino') { s *= .82; h = .15; }
      // costine all'orlo e allo scollo (maglioni, felpe)
      if (C.costine && y - (L.T.yb || 0) < .05 && y >= L.T.yb) { const rib = .5 + .5 * Math.sin(xm / .006 * Math.PI); c = mul(C.A, .82 + rib * .22); h = rib; }
      if (/giro|barca|canotta/.test(C.collo || '') && nY - neckDrop(C, a) - y < .018) { const rib = .5 + .5 * Math.sin(xm / .005 * Math.PI); c = mul(C.A, .85 + rib * .2); h = rib; if (nY - neckDrop(C, a) - y < .008) s *= .6; }
      // colletto della camicia e della polo: fascia che gira, punte davanti
      if ((C.collo === 'camicia' || C.collo === 'polo' || C.collo === 'camicia_aperta') && L.T.s0 !== undefined) {
        const top = nY - neckDrop(C, a), dy = top - y, tip = Math.abs(a) < .55 ? (.55 - Math.abs(a)) * .08 : 0, wcol = .035 + tip;
        if (dy < wcol && dy >= 0) { c = mul(C.A, 1.06); if (dy > wcol - .008 || dy < .007) { s *= .68; h = .1; } else h = .7; if (Math.abs(a) < .05) { s *= .7; } }
      }
      // revers: due ali a V dal collo fino al primo bottone, larghe al petto e strette in basso, con la tacca (lo scollo dove si incontrano collo e revers)
      if (/revers/.test(C.collo || '') && L.T.s0 !== undefined && y > nY - .21 && Math.cos(a) > 0) {
        const X = Math.abs(a) * .14, k = cl((y - (nY - .2)) / .2, 0, 1), w0 = .098 * k, notchY = nY - .068, lw = y > notchY ? .03 + (y - notchY) * .1 : .066 * sm(cl((y - (nY - .2)) / .1, 0, 1)), d = X - w0;
        if (d >= 0 && d < lw) { c = mul(C.A, 1.09); h = .75; if (d > lw - .006) { s *= .6; h = .05; } else if (d < .004) s *= .8;
          if (y < notchY + .006 && y > notchY - .012 && d > .026) { s *= .5; h = .05; } }   // la tacca
        else if (d >= lw && d < lw + .01) s *= .84;   // l'ombra sotto il revers
      }
      if (/revers/.test(C.collo || '') && L.T.s0 !== undefined && Math.cos(a) <= 0) { const dy = nY - neckDrop(C, a) - y; if (dy >= 0 && dy < .032) { c = mul(C.A, 1.06); h = .7; if (dy > .027) { s *= .6; h = .05; } } }   // il collo dietro
      // giacche e giacconi aperti sotto l'ultimo bottone: il bordo davanti che si divide (linea scura che si allarga verso l'orlo)
      if (C.cl >= 4 && !C.gonna && !C.falda3d && L.T.s0 !== undefined && /bottoni|doppio/.test(C.fronte || '') && y < B.waist + .06) { const t = cl((B.waist + .06 - y) / .12, 0, 1), ea = .03 + t * .2;
        if (Math.abs(a) < ea - .02) return null; if (Math.abs(Math.abs(a) - ea) < .025) { s *= .5; h = .05; } }
      // abbottonatura: listino e bottoni; doppio petto; zip
      const fr = C.fronte;
      if (fr && L.T.s0 !== undefined && y < nY - neckDrop(C, 0) - .01 && y > L.T.yb + .01) {
        if (fr === 'zip' || fr === 'zip_obl') { const ax = fr === 'zip_obl' ? a + (y - B.waist) * 1.2 - .25 : a; if (Math.abs(ax) < .025) { const tooth = Math.floor(y / .004) % 2; c = tooth ? [.75, .75, .72] : [.15, .15, .16]; h = .8; s = 1; } else if (Math.abs(ax) < .04) { s *= .85; h = .2; } }
        else {
          const dbl = fr === 'doppio', step = fr === 'polo' ? .03 : .085, yTop = nY - neckDrop(C, 0) - .02, ylo = fr === 'polo' ? yTop - .08 : L.T.yb;
          if (!dbl && line(a - .03, .006) && y > ylo) { s *= .78; h = .1; }   // il bordo del listino
          if (dbl && line(a - .6, .008) && y > L.T.yb) { s *= .78; h = .1; }
          if (y > ylo) for (let yy = yTop; yy > ylo + .02; yy -= step) { for (const ax of dbl ? [-.42, .42] : [0]) { const dx = (a - ax) * .14, dyb = y - yy, r = Math.hypot(dx, dyb); if (r < (C.cl >= 4 ? .015 : .011)) { const metal = /oro|rame/.test(fr); c = metal ? [.78, .62, .25] : C.cl >= 4 ? [.12, .1, .1] : [.9, .88, .84]; h = 1 - r / .012; s = r > .011 ? .6 : 1; } } }
        }
      }
      // tasche: petto, giacca, cappotto
      (C.tasche || []).forEach(t => {
        const chestY = B.bones.Chest.y - .03, hipY = B.bones.Hips.y;
        const box = (ax0, ax1, y0, y1, flap) => { for (const sd of [-1, 1]) { const aa = a * sd; if (aa < ax0 || aa > ax1 || y < y0 || y > y1) continue; const e = Math.min((aa - ax0) * .14, (ax1 - aa) * .14, y - y0, y1 - y); if (e < .008) { s *= .7; h = .1; } else if (flap && y1 - y < .03) { s *= y1 - y < .033 && y1 - y > .027 ? .7 : .95; h = .7; } } };
        if (t === 'petto') { const aa = a; if (aa > .32 && aa < .7 && y > chestY - .07 && y < chestY + .02) { const e = Math.min((aa - .32) * .14, (.7 - aa) * .14, y - chestY + .07, chestY + .02 - y); if (e < .008) { s *= .75; h = .1; } } }
        if (t === 'petto2') box(.3, .72, chestY - .07, chestY + .03, 1);
        if (t === 'giacca' || t === 'cappotto' || t === 'divisa') box(.4, .95, hipY - .02 + (t === 'cappotto' ? -.04 : .02), hipY + .015 + (t === 'cappotto' ? -.04 : .02), 1);
        if (t === 'canguro' && Math.abs(a) < .9 && y < B.waist + .1 && y > (L.T.yb || 0) + .05) { const e = Math.min((.9 - Math.abs(a)) * .14, B.waist + .1 - y); if (e < .004) { s *= .7; h = .1; } }
      });
      // la cintura (pantaloni) e i passanti
      if (C.cl === 2 && C.cintura && y > B.waist - .005 && y < B.waist + .028 && !C.solo_gonna) {
        const leather = /cuoio|jeans/.test(C.cintura); c = leather ? [.28, .17, .1] : mul(C.A, .7); h = .6; s = 1;
        if (y < B.waist - .002 || y > B.waist + .025) s *= .65;
        if (Math.abs(a) < .14 && y > B.waist + .002 && y < B.waist + .022) { const e = Math.min(.14 - Math.abs(a), Math.abs(y - B.waist - .012)); c = [.82, .76, .55]; s = Math.abs(a) > .1 || Math.abs(y - B.waist - .012) > .007 ? 1 : .35; h = .9; }
        for (const pa of [-2.6, -1.5, -.6, .6, 1.5, 2.6, Math.PI]) if (Math.abs(a - pa) < .05) { c = mul(C.A, .9); s = .85; }
      }
      // pantaloni sul busto (bacino): patta, tasche oblique, tasche dietro, cuciture
      if (C.cl === 2 && !C.solo_gonna && y < B.waist - .005) {
        if (a > .03 && a < .2 && y > B.crotch + .015 && line(a - (.2 - Math.pow(cl((B.crotch + .07 - y) / .055, 0, 1), 3) * .17), .012)) { s *= .72; h = .1; }   // la patta a J
        if (line(a, .008) && y < B.crotch + .08) { s *= .82; }
        if ((C.tasche || []).includes('oblique') || (C.tasche || []).includes('jeans')) for (const sd of [-1, 1]) { const aa = a * sd, t0 = (B.waist - y) / .09; if (t0 > 0 && t0 < 1 && line(aa - lerp(.62, 1.3, t0), .03)) { s *= .62; h = .1; } }
      }
      // pettorina della salopette e bretelle
      if (L.T.bib) { if (Math.abs(a) < .72 && y > B.bones.Chest.y + .03) { s *= .7; } }
    }
    if (R[0] === 'A' && L[R]) {
      const Ls = L[R], end = Ls.s1;
      if (C.polsi && end - sv < .045 && end > Ls.la) { c = mul(C.A, 1.04); h = .7; if (end - sv > .042 || end - sv < .003) { s *= .7; h = .1; } }
      if (C.costine && end - sv < .05 && end > Ls.la) { const rib = .5 + .5 * Math.sin(xm / .006 * Math.PI); c = mul(C.A, .82 + rib * .22); h = rib; }
      if (C.bande && sv < end - (C.costine ? .05 : .01)) { const k = tre((Math.abs(a) - R2) * F0(ri) / (Math.PI * 2)); if (k) { c = k > 1 ? mul(rgb(C.bande), .8) : rgb(C.bande); h = k > 1 ? .2 : .65; } }   // le tre strisce lungo la manica
      // pieghe al gomito (dentro) e alla spalla: archi più scuri


      if (sv < .02) { s *= .8; h = .15; }   // l'attaccatura alla spalla
    }
    // le tasche dietro dei jeans: pentagoni sui glutei (non sulla vita), con la doppia cucitura; misurate nello spazio del corpo,
    // così passano senza strappi dal bacino alle cosce (nel modello il sedere sta nelle cosce)
    if (R[0] === 'L') {
      const Ls = L[R], end = Ls.s1, sg = R === 'LL' ? 1 : -1;
      if (line(Math.abs(a) - R2, .02)) { s *= C.cuciture ? 1 : .82; if (C.cuciture) c = mixc(c, rgb(C.cuciture), .7); h = .15; }   // cucitura laterale
      if (C.banda && sv < end - (C.polsino ? .045 : .005)) { const k = tre((a - sg * R2) * F0(ri) / (Math.PI * 2) / 1.3); if (k) { c = k > 1 ? mul(rgb(C.banda), .8) : rgb(C.banda); h = k > 1 ? .2 : .65; } }   // le tre strisce lungo la gamba
      if (C.piega && line(a, .015)) { s *= 1.08; h = .9; }
      const kn = Math.abs(sv - Ls.kn);   // (niente tratti dipinti dietro il ginocchio: le pieghe le dà la forma)
      /* niente chiazze: i jeans sono uniformi */
      if (C.polsino && end - sv < .045) { const rib = .5 + .5 * Math.sin(xm / .005 * Math.PI); c = mul(C.A, .8 + rib * .2); h = rib; if (end - sv < .004) s *= .6; }   // l'elastico in fondo alla tuta
      if (C.risvolto && end - sv < .04) { c = mul(c, 1.04); if (end - sv > .037 || end - sv < .003) { s *= .65; h = .1; } }
      if ((C.tasche || []).includes('cargo')) { const sk = Ls.sCr + (Ls.kn - Ls.sCr) * .45, aa = a - sg * R2; if (Math.abs(aa) < .6 && sv > sk - .07 && sv < sk + .07) { const e = Math.min((.6 - Math.abs(aa)) * .07, sv - sk + .07, sk + .07 - sv); if (e < .008) { s *= .7; h = .1; } else if (sk + .07 - sv < .03) { s *= .93; h = .7; if (Math.abs(sk + .07 - sv - .03) < .002) s *= .7; } } }
    }
    return { c, h, s };
  }

  // =====================================================================================
  // APPLICARE: mesh del corpo rifatte, materiali per persona (tele dipinte)
  // =====================================================================================
  const MCACHE = new Map(); let mcount = 0;
  function mats(sig, P) {
    if (MCACHE.has(sig)) return MCACHE.get(sig);
    const M = REG.map(R => {
      const { W, H, col, hh } = P.out[R], mk = (data) => { const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d'), id = x.createImageData(W, H); id.data.set(data); x.putImageData(id, 0, 0);
        const T = new THREE.CanvasTexture(cv); T.flipY = false; T.wrapS = THREE.RepeatWrapping; T.wrapT = THREE.ClampToEdgeWrapping; T.magFilter = THREE.NearestFilter; T.minFilter = THREE.NearestMipmapLinearFilter; T.anisotropy = 4; return T; };
      // [pulizia] la luce propria come il resto del personaggio (models.js: emissive = colore × 0,3), texel per texel: la pelle dipinta è identica a quella di viso e mani (prima un grigio fisso: il busto nudo pareva una maglietta color carne)
      const bh = mk(hh), cm = mk(col), m = new THREE.MeshStandardMaterial({ map: cm, bumpMap: bh, bumpScale: .0015, roughnessMap: bh, roughness: 1, metalness: 0, emissiveMap: cm }); m.emissive = new THREE.Color(.3, .3, .3); m.userData.pittura = true; return m;
    });
    MCACHE.set(sig, M); if (++mcount > 160) { const k = MCACHE.keys().next().value; MCACHE.delete(k); }
    return M;
  }
  // veste g dipingendo il corpo. Ritorna i piani (per sapere cosa c'è, es. le falde da fare in geometria)
  function dipingi(g, outfit, look, PARTI) {
    const Sa = S(); if (!Sa) return null; const B = Sa.body(g, PARTI); if (!B) return null;
    const srcs = []; g.traverse(o => { if (o.isSkinnedMesh && !o.userData.vesti) srcs.push(o); });
    const skin = (look && look.skin) || '#dcae88';
    const sig = B.key + '|' + skin + '|' + JSON.stringify(outfit.map(c => [c.id, c.col, c.parti]));
    posMap(B, srcs);
    let P = null, M = MCACHE.get(sig); if (!M) { P = paint(B, outfit, skin); M = mats(sig, P); }
    if (!B.welded) { B.welded = 1; weld(B, g, srcs); }
    const plans = paintPlans(B, outfit), nY = Sa.neckY(B);
    // sotto l'ascella e lungo il fianco, dove il braccio sta attaccato al busto, lo spessore si assottiglia (non entra nel braccio)
    const armFade = p => { let f = 1; for (const sd of ['L', 'R']) { const j = B.bones['UpperArm' + sd], e = B.bones['LowerArm' + sd]; if (!j || !e) continue; const ax = e.clone().sub(j), L2 = ax.lengthSq(), v = new THREE.Vector3(p[0], p[1], p[2]).sub(j), t = cl(v.dot(ax) / L2, -.2, 1), d = v.sub(ax.multiplyScalar(t)).length(); f = Math.min(f, .25 + .75 * cl((d - .06) / .06, 0, 1)); } return f; };
    // i punti nello stesso posto (doppioni tra busto e gambe, anche in mesh diverse) si staccano insieme: stessa direzione, lo spessore maggiore
    const pk = L => Math.round(L.p[0] * 2e4) + ',' + Math.round(L.p[1] * 2e4) + ',' + Math.round(L.p[2] * 2e4), J = new Map(), memo = new Map();
    srcs.forEach((src, si) => { const pg = paintGeo(B, src, si); if (!pg) return;
      for (let w0 = 0; w0 < pg.VI.length; w0++) { const L = pg.VI[w0]; if (!L) continue; let off = memo.get(L); if (off === undefined) { const SO = stackOff(B, plans, pg.VR[w0], L, nY), C = SO.C; off = SO.off; if (C && C.smanicato && (pg.VR[w0] === 1 || pg.VR[w0] === 2)) off = 0; if (off && pg.VR[w0] === 0) off *= armFade(L.p); memo.set(L, off); }
        const k = pk(L); let j = J.get(k); if (!j) J.set(k, j = { o: 0, d: new THREE.Vector3(), seen: new Set() }); j.o = Math.max(j.o, off); if (!j.seen.has(L)) { j.seen.add(L); j.d.x += L.d[0]; j.d.y += L.d[1]; j.d.z += L.d[2]; } } });
    J.forEach(j => j.d.normalize());
    // dove un capo spesso finisce su uno sottile (giro manica dello smanicato, orlo del piumino) lo scalino diventa uno smusso: niente pareti a punta
    { const NB = new Map(), link = (a, b) => { if (a === b) return; let x = NB.get(a); if (!x) NB.set(a, x = new Set()); x.add(b); };
      srcs.forEach((src, si) => { const pg = paintGeo(B, src, si); if (!pg) return; for (let w0 = 0; w0 + 2 < pg.VI.length; w0 += 3) { const L0 = pg.VI[w0], L1 = pg.VI[w0 + 1], L2 = pg.VI[w0 + 2]; if (!L0 || !L1 || !L2) continue; const k0 = J.get(pk(L0)), k1 = J.get(pk(L1)), k2 = J.get(pk(L2)); link(k0, k1); link(k1, k0); link(k1, k2); link(k2, k1); link(k0, k2); link(k2, k0); } });
      for (let it = 0; it < 3; it++) { const nv = new Map(); NB.forEach((nb, j) => { let mx = 0, sum = 0; nb.forEach(q => { mx = Math.max(mx, Math.abs(q.o - j.o)); sum += q.o; }); if (mx > .006) nv.set(j, lerp(j.o, sum / nb.size, .5)); }); nv.forEach((v, j) => { j.o = v; }); } }
    srcs.forEach((src, si) => {
      const pg = paintGeo(B, src, si); if (!pg) return;
      if (!src.userData.pitOrig) src.userData.pitOrig = { geo: src.userData.geo0 || src.geometry, mat: src.material };
      const m0 = Array.isArray(src.userData.pitOrig.mat) ? src.userData.pitOrig.mat[0] : src.material;
      // quello che sta sotto scarpe e guanti (e i resti dei vestiti del kit sotto i nostri) si toglie davvero: un indice per persona
      const hid = src.userData.hid, gpos = pg.geo.attributes.position, idx = [], grp = [], gmS = B.gmaps[si] || [], closed = outfit.some(c => /^(scarpe|scarpe_eleganti|scarpe_tela|scarpe_corsa|mocassini|tacchi|stivali|stivali_pelle|stivali_cowboy|scarpe_skate|scarpe_air)$/.test(c.id)), pumps = outfit.some(c => c.id === 'tacchi');
      // [strati] il materiale originale di ogni vertice (i resti dei polsini del kit sulle mani sono stoffa, non pelle)
      const om = src.userData.pitOrig.mat, oms = Array.isArray(om) ? om : [om], og = src.userData.pitOrig.geo, vMat = new Uint8Array(og.attributes.position.count);
      if (og.groups && og.groups.length && og.index) og.groups.forEach(gr => { for (let k = gr.start; k < gr.start + gr.count; k++) vMat[og.index.array[k]] = gr.materialIndex; });
      const clothV = x => { const m = oms[vMat[x]] || oms[0]; return m && !/^(Skin|Eye|Eyebrows|Hair|Moustache)/i.test(m.name || ''); };
      // le maniche lunghe: i triangoli della mano che risalgono nell'avambraccio (le punte del polso del kit) si tolgono, la manica li copre
      const longSleeve = {}; ['L', 'R'].forEach((sd, k) => { const tb = frame(B).tubes[k + 1], w = B.bones['Wrist' + sd]; longSleeve[sd] = w && plans.some(C => C.L['A' + sd] && C.L['A' + sd].s1 > tb.sNear(w) - .07); });
      const wristCut = q => wristUp(q);   // i triangoli a cavallo mano/avambraccio (le punte)
      const wristUp = q => q.some(x => { const b = gmS[x]; if (!(b >= 0) || B.part[b] !== 'mani') return false; const sd = B.side[b] > 0 ? 'L' : 'R'; if (!longSleeve[sd] && !CORPO_ON) return false; const w = B.bones['Wrist' + sd], e = B.bones['LowerArm' + sd], ax = w.clone().sub(e).normalize(); return (B.P[b * 3] - w.x) * ax.x + (B.P[b * 3 + 1] - w.y) * ax.y + (B.P[b * 3 + 2] - w.z) * ax.z < (longSleeve[sd] ? -.03 : -.004); });   // [corpo] col corpo continuo sempre: il braccio arriva fino al polso
      const keepT = (w0, reg) => { if (pg.dropT.has(w0 / 3)) return false;
        const q = [pg.SRC[w0], pg.SRC[w0 + 1], pg.SRC[w0 + 2]]; if (hid && hid.length && q.every(x => hid[x])) return false;
        if (wristCut(q)) return false;
        if (reg === 0) { const q0 = q; if (q0.every(clothV) && q0.some(x => { const b = gmS[x]; return b >= 0 && B.part[b] === 'mani'; })) return false; }   // i polsini del kit, rimasti sulle mani const q = [pg.SRC[w0], pg.SRC[w0 + 1], pg.SRC[w0 + 2]]; if (hid && hid.length && q.every(x => hid[x])) return false;
        if (closed && q.some(x => { const b = gmS[x]; return b >= 0 && (B.part[b] === 'piedi' || B.part[b] === 'polpacci' && B.P[b * 3 + 1] < .06) && !(pumps && !pg.kitCloth && B.P[b * 3 + 1] > .04); })) return false;   // anche il tallone (che il modello mette nel polpaccio)   // con le décolleté resta il collo del piede   // dentro le scarpe vere
        if (closed && reg === 0 && pg.kitCloth && /Feet/i.test(src.name)) return false;
        if (CORPO_ON && /Feet/i.test(src.name)) return false;   // [corpo] i piedi del kit sono scarpe: via sempre (scarpe vere o piede nudo da vestiario.js)   // le scarpe del kit (col calzino bianco): via del tutto
        if (reg === 0 && pg.kitCloth) { const y = (gpos.getY(w0) + gpos.getY(w0 + 1) + gpos.getY(w0 + 2)) / 3; const yy = new THREE.Vector3(gpos.getX(w0), y, gpos.getZ(w0)).applyMatrix4(B.rel).y; if (yy > .3) return false; }   // vestiti del kit fuori dalle regioni (non i piedi)
        return true; };
      // sotto le falde (gonne, cappotti, poncho) la gamba non si vede: si toglie, così non può bucare la stoffa
      const underF = w0 => { for (let j = 0; j < 3; j++) { const L = pg.VI[w0 + j], r = pg.VR[w0 + j]; if (!L || r < 3) return false; const C = topAt(B, plans, r, L.a, L.s, L.p[1], nY), Ls = C && C.L[REG[r]]; if (!C || !(C.gonna || C.solo_gonna || C.poncho) || !Ls || Ls.falda === undefined || L.p[1] < Ls.falda + .015 || L.p[1] > B.waist) return false; } return true; };
      // sotto i cappotti lunghi: le gambe dietro e ai lati non si vedono (si tolgono: camminando non bucano la falda); davanti, nell'apertura, restano
      const jk = plans.find(C => C.cl >= 3 && !C.gonna && !C.poncho && !C.corto && !C.davanti && (C.parti || []).includes('bacino') && (C.parti || []).includes('torso'));
      const coat = plans.find(C => C.cl >= 5 && C.gonna && !C.solo_gonna && !C.poncho) || jk, coatHem = !coat ? 9 : coat === jk ? Math.min(B.bones.Hips.y - .15, B.crotch - .01) : Sa.lengths(B, frame(B).tubes[0], 'gonna', coat, coat.parti || ['torso', 'bacino', 'cosce']).yb, tc = frame(B).tubes[0], gapA = coat === jk ? .42 : .5;   // anche la falda corta delle giacche
      // sotto la falda della giacca il busto dipinto non si vede (fuori dall'apertura davanti): via, niente sfarfallio
      const jkF = jk && jk.falda3d, yTopF = B.waist + .06, ybF = Math.min(B.bones.Hips.y - .15, B.crotch - .01);
      const underJk = w0 => { if (!jkF) return false; for (let j = 0; j < 3; j++) { const L = pg.VI[w0 + j]; if (!L || pg.VR[w0 + j] !== 0 || L.p[1] > B.waist + .03) return false; const t = cl((yTopF - L.p[1]) / (yTopF - ybF), 0, 1), g = gapF(t), ax = tc.S[0], ang = Math.abs(Math.atan2(L.p[0] - ax.x, L.p[2] - ax.z)); if (ang < g + .07) return false; } return true; };
      const underCoat = w0 => { if (!coat) return false; for (let j = 0; j < 3; j++) { const L = pg.VI[w0 + j], r = pg.VR[w0 + j]; if (!L || r < 3 || L.p[1] < coatHem + .04 || L.p[1] > B.crotch + .02) return false; const ax = tc.S[0], ang = Math.atan2(L.p[0] - ax.x, L.p[2] - ax.z); if (Math.abs(ang) < gapA) return false; if (coat === jk && L.p[2] - ax.z > -.02 && Math.abs(L.p[0] - ax.x) < .075) return false; } return true; };   // l'interno coscia davanti si vede dall'apertura
      pg.groups.forEach(gr => { const st = idx.length; for (let w0 = gr.start; w0 < gr.start + gr.count; w0 += 3) if (keepT(w0, gr.materialIndex) && !(gr.materialIndex >= 4 && (underF(w0) || underCoat(w0))) && !(gr.materialIndex === 1 && underJk(w0))) idx.push(w0, w0 + 1, w0 + 2); if (idx.length > st) grp.push([st, idx.length - st, gr.materialIndex]); });
      const pgeo = new THREE.BufferGeometry(); for (const k in pg.geo.attributes) pgeo.setAttribute(k, pg.geo.attributes[k]); pgeo.setIndex(idx);
      // lo spessore del capo che si vede: la superficie si stacca dal corpo di quanto è spesso (per persona)
      { const pos0 = pg.geo.attributes.position, pos = new THREE.BufferAttribute(new Float32Array(pos0.array), 3), v3 = new THREE.Vector3();
        for (let w0 = 0; w0 < pos.count; w0++) { const L = pg.VI[w0]; if (!L) continue; const j = J.get(pk(L)); let off = j.o;
          if (jkF && pg.VR[w0] === 0 && L.p[1] < yTopF - .002) { const t = cl((yTopF - L.p[1]) / (yTopF - ybF), 0, 1), g = gapF(t), ax = tc.S[0], ang = Math.abs(Math.atan2(L.p[0] - ax.x, L.p[2] - ax.z)); if (ang > g + .07) off -= .007 * cl((yTopF - .002 - L.p[1]) / .006, 0, 1); }   // sotto la falda il busto rientra: la falda passa sopra pulita
          if (!off) continue; v3.set(L.p[0] + j.d.x * off, L.p[1] + j.d.y * off, L.p[2] + j.d.z * off).applyMatrix4(B.reli); pos.setXYZ(w0, v3.x, v3.y, v3.z); }
        pgeo.setAttribute('position', pos); decals(src, pg, pos, idx, B, plans, outfit); } grp.forEach(g0 => pgeo.addGroup(g0[0], g0[1], g0[2]));
      pgeo.boundingSphere = pg.geo.boundingSphere; pgeo.userData.pittura = true;
      src.geometry = pgeo; src.material = [Array.isArray(src.material) ? src.material[0] : src.material, ...M];
    });
    return { B, sig };
  }
  // =====================================================================================
  // LE DECALCOMANIE: dettagli netti sopra il vestito dipinto (tasche dietro dei jeans, …)
  // Si prendono i triangoli veri del corpo sotto il dettaglio (stessi pesi dello scheletro: si piegano col corpo),
  // staccati di un filo, e ci si proietta sopra un disegno nitido (proiezione piana nello spazio del corpo a riposo).
  // =====================================================================================
  const DTEX = new Map();
  function decalTex(kind, col, col2) {
    const key = kind + '|' + col + '|' + col2; if (DTEX.has(key)) return DTEX.get(key);
    const N = 256, cv = document.createElement('canvas'); cv.width = cv.height = N; const x = cv.getContext('2d');
    if (kind === 'tasca') {   // la tasca a pentagono: bordo appena in ombra, doppia cucitura, il ricamo ad arco al centro
      const P = (k) => { const m = k * N; return [[m, m], [N - m, m], [N - m, N * .8 - m * .4], [N / 2, N - m], [m, N * .8 - m * .4]]; };
      const path = pts => { x.beginPath(); pts.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.closePath(); };
      path(P(.0)); x.fillStyle = col2; x.globalAlpha = 1; x.fill();   // la stoffa della tasca (stesso colore, appena più scura: è un altro strato)
      x.globalAlpha = 1; x.lineWidth = 7; x.strokeStyle = 'rgba(0,0,0,.35)'; path(P(.012)); x.stroke();
      x.setLineDash([9, 6]); x.lineWidth = 4; x.strokeStyle = col; path(P(.05)); x.stroke(); path(P(.1)); x.stroke();
      x.beginPath(); x.moveTo(N * .22, N * .42); x.quadraticCurveTo(N * .5, N * .28, N * .78, N * .42); x.moveTo(N * .22, N * .5); x.quadraticCurveTo(N * .5, N * .36, N * .78, N * .5); x.stroke();
      x.setLineDash([]); }
    const T = new THREE.CanvasTexture(cv); T.anisotropy = 4; T.wrapS = T.wrapT = THREE.ClampToEdgeWrapping; DTEX.set(key, T); return T;
  }
  function decals(src, pg, pos, idx, B, plans, outfit) {
    const jeans = plans.filter(C => C.cl === 2 && (C.tasche || []).includes('jeans')).pop(); if (!jeans) return;
    // la tasca si vede solo se in quel punto i jeans sono il capo di sopra
    const b = B.bones, hx = b.Hips.x, fem = FEMMINE.test(B.key), yTop = B.waist - .045, yBot = (b.Hips.y + B.crotch) / 2 - (fem ? 0 : .015), w = fem ? .105 : .125, cxo = fem ? .088 : .085;
    const nY = S().neckY(B), u2l = new THREE.Vector3(1, 0, 0).applyMatrix3(new THREE.Matrix3().setFromMatrix4(B.reli)).length() * .0012, nor = pg.geo.attributes.normal, si = pg.geo.attributes.skinIndex, sw = pg.geo.attributes.skinWeight;
    for (const sd of [1, -1]) {
      const x0 = hx + sd * cxo - w / 2, P = [], N = [], U = [], SI = [], SW = [];
      for (let k = 0; k < idx.length; k += 3) { const t = [idx[k], idx[k + 1], idx[k + 2]], L = t.map(q => pg.VI[q]); if (L.some(l => !l)) continue;
        const inside = L.some(l => l.p[2] < b.Hips.z - .02 && l.p[1] < yTop + .01 && l.p[1] > yBot - .03 && l.p[0] > x0 - .01 && l.p[0] < x0 + w + .01); if (!inside) continue;
        if (!L.every(l => l.p[2] < b.Hips.z)) continue;
        const top = topAt(B, plans, pg.VR[t[0]], L[0].a, L[0].s, L[0].p[1], nY); if (top !== jeans) continue;
        for (const q of t) { const l = pg.VI[q]; P.push(pos.getX(q) + nor.getX(q) * u2l, pos.getY(q) + nor.getY(q) * u2l, pos.getZ(q) + nor.getZ(q) * u2l); N.push(nor.getX(q), nor.getY(q), nor.getZ(q));
          let u = (l.p[0] - x0) / w; if (sd < 0) u = 1 - u; U.push(u, 1 - (yTop - l.p[1]) / (yTop - yBot + .025)); for (let j = 0; j < 4; j++) { SI.push(si.array[q * 4 + j]); SW.push(sw.array[q * 4 + j]); } } }
      if (!P.length) continue;
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
      g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(SI, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(SW, 4));
      const A = jeans.A, dk = '#' + new THREE.Color().setRGB(A[0] * .96, A[1] * .96, A[2] * .96).getHexString();
      const m = new THREE.MeshStandardMaterial({ map: decalTex('tasca', jeans.cuciture || '#c8a050', dk), transparent: false, alphaTest: .5, roughness: .95, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2 }); m.emissiveMap = m.map; m.emissive = new THREE.Color(.3, .3, .3);
      // fuori dal pentagono trasparente: l'alpha dal disegno
      m.alphaMap = null; m.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <alphatest_fragment>', 'if (vUv.x < 0. || vUv.x > 1. || vUv.y < 0. || vUv.y > 1. || diffuseColor.a < .5) discard;'); };
      m.map.premultiplyAlpha = false; m.transparent = false; m.alphaTest = .5;
      const mesh = new THREE.SkinnedMesh(g, m); mesh.userData.vesti = true; mesh.frustumCulled = false; mesh.castShadow = false;
      mesh.position.copy(src.position); mesh.quaternion.copy(src.quaternion); mesh.scale.copy(src.scale); src.parent.add(mesh); mesh.bind(src.skeleton, src.bindMatrix);
    }
  }
  // le normali saldate su tutto il modello (i pezzi del kit — busto, gambe, piedi — sono mesh diverse: senza questo, righe scure dove si toccano)
  function weld(B, g, srcs) {
    g.updateMatrixWorld(true); const gi = new THREE.Matrix4().copy(g.matrixWorld).invert(), acc = new Map(), L = [];
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), key = v => Math.round(v.x * 2e4) + ',' + Math.round(v.y * 2e4) + ',' + Math.round(v.z * 2e4);
    srcs.forEach((src, si) => { const pg = paintGeo(B, src, si); if (!pg) return; const M = new THREE.Matrix4().multiplyMatrices(gi, src.matrixWorld), NM = new THREE.Matrix3().getNormalMatrix(M), P = pg.geo.attributes.position, N = pg.geo.attributes.normal, keys = new Array(P.count), inReg = new Uint8Array(P.count);
      pg.groups.forEach(gr => { if (gr.materialIndex > 0) for (let k = gr.start; k < gr.start + gr.count; k++) inReg[k] = gr.materialIndex; });
      if (pg.tube0 >= 0) inReg.fill(0, pg.tube0);   // [corpo] il corpo continuo ha già le sue normali lisce
      for (let k = 0; k < P.count; k++) keys[k] = key(a.fromBufferAttribute(P, k).applyMatrix4(M));
      for (let k = 0; k < P.count; k += 3) { if (!inReg[k] || pg.dropT.has(k / 3) || pg.noN.has(k / 3)) continue; a.fromBufferAttribute(P, k).applyMatrix4(M); b.fromBufferAttribute(P, k + 1).applyMatrix4(M); c.fromBufferAttribute(P, k + 2).applyMatrix4(M); const n = b.sub(a).cross(c.sub(a));
        for (let j = 0; j < 3; j++) { let v = acc.get(keys[k + j]); if (!v) acc.set(keys[k + j], v = new THREE.Vector3()); v.add(n); } }
      L.push({ N, keys, inReg, NMi: new THREE.Matrix3().copy(NM).invert() }); });
    // il confine busto/gambe: lì le due parti hanno assi diversi, le facce agganciate farebbero uno spigolo di luce. Si sfuma alla normale liscia
    const KR = new Map(); L.forEach(({ keys, inReg }) => { for (let k = 0; k < keys.length; k++) if (inReg[k]) KR.set(keys[k], (KR.get(keys[k]) || 0) | (inReg[k] === 1 ? 1 : inReg[k] >= 4 ? 2 : 0)); });
    const seamP = []; KR.forEach((m, kk) => { if (m === 3) { const p = kk.split(',').map(x => +x / 2e4); if (p[1] > B.crotch - .05 && p[1] < B.waist) seamP.push(p); } });
    const seamK = kk => { if (!seamP.length) return 1; const p = kk.split(',').map(x => +x / 2e4); if (p[1] < B.crotch - .2 || p[1] > B.waist + .12) return 1; let d = 9; for (const q of seamP) d = Math.min(d, (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2); return sm(cl(Math.sqrt(d) / .1, 0, 1)); };
    // luce a pannelli: la normale si aggancia a 8 facce attorno all'asse della parte (e 3 inclinazioni): piani netti, spigoli di piega, come stoffa tagliata
    const F = frame(B), snap = new Map(), sn = new THREE.Vector3();
    const snapped = (kk, v, reg) => { const k2 = kk + '|' + reg; let r = snap.get(k2); if (r) return r; const tb = F.tubes[reg], p = new THREE.Vector3(...kk.split(',').map(x => +x / 2e4)), q = axial(tb, p), fr = S().frameAt(tb, q.s);
      const n = v.clone().normalize(), nt = n.dot(fr.t), nf = n.dot(fr.f), ns = n.dot(fr.sd), ang = Math.round(Math.atan2(ns, nf) / (Math.PI / 6)) * (Math.PI / 6), tilt = Math.max(-.45, Math.min(.45, Math.round(nt / .3) * .3)), h = Math.sqrt(1 - tilt * tilt);
      r = fr.t.clone().multiplyScalar(tilt).addScaledVector(fr.f, Math.cos(ang) * h).addScaledVector(fr.sd, Math.sin(ang) * h).normalize(); const f = (reg === 0 || reg >= 3) ? seamK(kk) * .7 : .7; r.multiplyScalar(f).addScaledVector(n, 1 - f).normalize(); snap.set(k2, r); return r; };   // facce geometriche, ammorbidite
    L.forEach(({ N, keys, inReg, NMi }) => { for (let k = 0; k < N.count; k++) { if (!inReg[k]) continue; const v = acc.get(keys[k]); if (!v || v.lengthSq() < 1e-30) continue; a.copy(snapped(keys[k], v, inReg[k] - 1)).applyMatrix3(NMi).normalize(); N.setXYZ(k, a.x, a.y, a.z); } N.needsUpdate = true; });
  }
  function spoglia(g) { g.traverse(o => { if (o.isSkinnedMesh && o.userData.pitOrig) { o.geometry = o.userData.pitOrig.geo; o.material = o.userData.pitOrig.mat; o.userData.pitOrig = null; } }); }
  // il materiale a campiture per i pezzi in rilievo (falde, cinture, risvolti): stessa pittura, una piastrella che si ripete
  const BMAT = new Map();
  function blockMat(fab, col, c2, c3, opt) {
    opt = opt || {}; const key = [fab, col, c2, c3, opt.dark || 0, opt.liscio ? 1 : 0].join('|'); if (BMAT.has(key)) return BMAT.get(key);
    const C = { fab, A: rgb(col || '#808080'), B: rgb(c2 || col || '#808080'), C: rgb(c3 || col || '#808080') }, N = 64, sz = .45, cv = document.createElement('canvas'); cv.width = cv.height = N;
    const x = cv.getContext('2d'), id = x.createImageData(N, N);
    for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) { const f = fabric(C, (px + .5) / N * sz, (py + .5) / N * sz), i = (py * N + px) * 4, k = opt.dark ? .72 : 1; id.data[i] = f[0] * 255 * k; id.data[i + 1] = f[1] * 255 * k; id.data[i + 2] = f[2] * 255 * k; id.data[i + 3] = 255; }
    x.putImageData(id, 0, 0); const T = new THREE.CanvasTexture(cv); T.wrapS = T.wrapT = THREE.RepeatWrapping; T.magFilter = THREE.NearestFilter; T.minFilter = THREE.NearestMipmapLinearFilter; T.repeat.set(1 / sz, 1 / sz);
    const m = opt.liscio ? new THREE.MeshStandardMaterial({ map: T, vertexColors: opt.vc !== false, side: THREE.DoubleSide, roughness: 1, metalness: 0 }) : new THREE.MeshLambertMaterial({ map: T, vertexColors: opt.vc !== false, side: THREE.DoubleSide, flatShading: true });
    m.emissiveMap = T; m.emissive = new THREE.Color(.3, .3, .3); BMAT.set(key, m); return m;   // le falde con la stessa luce del vestito dipinto (colore × 0,3, come mats)
  }
  // un punto sulla superficie stirata (quella che si vede) della regione r, staccato di off
  function surfI(B, r, s, a, off) {
    const F = frame(B), tb = F.tubes[r], fr = S().frameAt(tb, s), raw = S().surf(tb, s, a, 0).sub(fr.p).length(), rr = shape(B, tb, s, a, ironRadius(ironed(tb), tb, s, a));
    let k = 1; if (r > 0) k = cl((tb.L - s) / .06, 0, 1) * cl(s / .05, 0, 1);
    const R0 = raw + cl(rr - raw, -.06, .045) * k + off;
    return fr.p.clone().addScaledVector(fr.f, Math.cos(a) * R0).addScaledVector(fr.sd, Math.sin(a) * R0);
  }
  // il raggio della pelle dipinta attorno a un anello (s) di braccio o gamba, per n angoli (il più esterno entro ±1,2 cm; buchi riempiti dai vicini)
  function limbRing(B, r, s, n) {
    const F = frame(B), tb = F.tubes[r], I = ironAll(B), fr = S().frameAt(tb, s); B._lax = B._lax || {};
    if (!B._lax[r]) { const L = []; const v = new THREE.Vector3(); for (let g = 0; g < B.part.length; g++) { if (regionOf(B, g) !== r) continue; v.set(I[g * 3], I[g * 3 + 1], I[g * 3 + 2]); L.push(axial(tb, v).s, g); } B._lax[r] = L; }
    const L = B._lax[r], pts = []; for (let k = 0; k < L.length; k += 2) if (Math.abs(L[k] - s) < .018) { const g = L[k + 1], p = new THREE.Vector3(I[g * 3], I[g * 3 + 1], I[g * 3 + 2]), d = p.sub(fr.p); pts.push([d.dot(fr.f), d.dot(fr.sd)]); }
    const R = new Float32Array(n); let cx = 0, cy = 0;
    if (pts.length >= 4) { let x0 = 9, x1 = -9, y0 = 9, y1 = -9; pts.forEach(([x, y]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }); cx = (x0 + x1) / 2; cy = (y0 + y1) / 2;
      pts.forEach(([x, y]) => { const a = Math.atan2(y - cy, x - cx), b = ((Math.floor((a + Math.PI) / (Math.PI * 2) * n) % n) + n) % n, d = Math.hypot(x - cx, y - cy); if (d > R[b]) R[b] = d; });
      for (let it = 0; it < n; it++) for (let k = 0; k < n; k++) if (!R[k]) R[k] = Math.max(R[(k + 1) % n], R[(k + n - 1) % n]); }
    else for (let k = 0; k < n; k++) R[k] = surfI(B, r, s, -Math.PI + (k + .5) / n * Math.PI * 2, 0).distanceTo(fr.p);
    const sm = Array.from(R, (x, k) => Math.max(x, (R[(k + n - 1) % n] + R[(k + 1) % n]) / 2));
    return { R: sm, c: fr.p.clone().addScaledVector(fr.f, cx).addScaledVector(fr.sd, cy), fr };
  }
  // l'anello sull'avambraccio: asse dell'osso (gomito → polso), raggio dalla pelle vera attorno (70° percentile, a ellisse un po' più larga ai lati)
  function armRing(B, r, s, n) {
    const sd = r === 1 ? 'L' : 'R', tb = frame(B).tubes[r], fr0 = S().frameAt(tb, s), el = B.bones['LowerArm' + sd], upper = el && s < tb.sNear(el);   // sopra il gomito: il braccio (spalla → gomito), sotto: l'avambraccio
    const j0 = upper ? B.bones['UpperArm' + sd] : el, j1 = upper ? el : B.bones['Wrist' + sd], partName = upper ? 'braccia' : 'avambracci'; if (!j0 || !j1) return limbRing(B, r, s, n);
    const ax = j1.clone().sub(j0), Lx = ax.length(); ax.normalize(); const t = cl(fr0.p.clone().sub(j0).dot(ax), 0, Lx), c = j0.clone().addScaledVector(ax, t), I = ironAll(B);
    // il centro: quello della pelle attorno (l'osso del kit non sta al centro dell'avambraccio)
    const near = []; for (let g = 0; g < B.part.length; g++) { if (B.part[g] !== partName || B.side[g] !== (r === 1 ? 1 : -1)) continue; const v = new THREE.Vector3(I[g * 3], I[g * 3 + 1], I[g * 3 + 2]), along = v.clone().sub(j0).dot(ax); if (Math.abs(along - t) < .05) near.push(v); }
    if (near.length) { const m = near.reduce((a, v) => a.add(v), new THREE.Vector3()).divideScalar(near.length), d0 = m.sub(c); c.add(d0.addScaledVector(ax, -d0.dot(ax))); }
    const ds = near.map(v => { const d = v.clone().sub(c); d.addScaledVector(ax, -d.dot(ax)); return d.length(); });
    ds.sort((a, b) => a - b); const R0 = ds.length ? ds[Math.floor(ds.length * .7)] : .03;
    const f = new THREE.Vector3(0, 0, 1).addScaledVector(ax, -ax.z).normalize(), sv = ax.clone().cross(f).normalize(), R = [];
    for (let k = 0; k < n; k++) { const a = -Math.PI + (k + .5) / n * Math.PI * 2; R.push(R0 * (1 + .08 * Math.abs(Math.sin(a)))); }
    return { R, c, fr: { f, sd: sv, t: ax, p: c } };
  }
  // il bordino in rilievo di un orlo: anello a n facce attorno alla regione r, all'altezza s (metri sul tubo), alto h, spesso th
  function orlo(B, r, s, h, off, th, n, mat) {
    if (r === 1 || r === 2) { const tb = frame(B).tubes[r], w = B.bones['Wrist' + (r === 1 ? 'L' : 'R')]; if (w && tb.sNear) s = Math.min(s, tb.sNear(w) - h / 2 + .018); }   // fino al polso: copre l'attacco della mano (lì il tubo prende la mano)
    // [forma] l'anello non segue le punte del corpo (in fondo alla manica il tubo prende anche la mano e le dita): raggio limitato attorno alla mediana, poi lisciato
    // sulle braccia e le gambe l'anello si misura sulla pelle vera dipinta (vertici stirati di quella zona, mani e piedi esclusi):
    // il tubo, vicino al polso e alla caviglia, prende anche le dita e il tallone
    const P = [], ring = (ds, o) => { if (r === 0) { const q = []; for (let k = 0; k < n; k++) q.push(surfI(B, r, s + ds, -Math.PI + (k + .5) / n * Math.PI * 2, o)); return q; }
      const LR = r <= 2 ? armRing(B, r, s + ds, n) : limbRing(B, r, s + ds, n), fr = LR.fr, q = [];
      for (let k = 0; k < n; k++) { const a = -Math.PI + (k + .5) / n * Math.PI * 2; q.push(LR.c.clone().addScaledVector(fr.f, Math.cos(a) * (LR.R[k] + o)).addScaledVector(fr.sd, Math.sin(a) * (LR.R[k] + o))); } return q; };
    const ob = ring(-h / 2, off), ot = ring(h / 2, off), ib = ring(-h / 2, off - th), it = ring(h / 2, off - th);
    const quad = (a, b, c, d) => P.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, a.x, a.y, a.z, c.x, c.y, c.z, d.x, d.y, d.z);
    for (let k = 0; k < n; k++) { const j = (k + 1) % n; quad(ob[k], ob[j], ot[j], ot[k]); quad(ot[k], ot[j], it[j], it[k]); quad(ib[k], ib[j], ob[j], ob[k]); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.computeVertexNormals();
    const uv = []; for (let i = 0; i < P.length; i += 3) uv.push(P[i] + P[i + 2], P[i + 1]); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    return new THREE.Mesh(g, mat);
  }
  // i bordi netti di un vestito dipinto: fine manica, orlo della maglia, orlo dei pantaloni (solo il capo più esterno di ogni zona)
  // lo spessore più alto attorno a un anello (s fisso) della regione r: il bordino in rilievo ci sta sopra in ogni punto
  function ringOff(B, plans, r, s, n) { let m = 0; n = n || 12; for (let k = 0; k < n; k++) m = Math.max(m, offAt(B, plans, r, s, -Math.PI + (k + .5) / n * Math.PI * 2)); return m; }
  // il capo che si vede in un punto (a, s) della regione r
  function topOf(B, plans, r, s, a) { const p = surfI(B, r, s, a, 0); return topAt(B, plans, r, a, s, p.y, S().neckY(B)); }
  // i bordi netti di un vestito dipinto: fine manica, orlo dei pantaloni, elastico dell'intimo.
  // Ogni capo ha il suo bordo dove finisce e si vede (non solo il più esterno: le mutande sopra i jeans hanno il loro elastico
  // e i jeans sotto il loro orlo), e il bordo sta sopra la superficie vera, cioè sopra tutti gli strati in quel punto.
  function bordi(g, B, outfit, AT) {
    const P = paintPlans(B, outfit), Sa = S(), F = frame(B); if (!P) return;
    const mat = C => blockMat(C.fab, '#' + new THREE.Color().setRGB(C.A[0] * .9, C.A[1] * .9, C.A[2] * .9).getHexString(), '#' + new THREE.Color().setRGB(C.B[0], C.B[1], C.B[2]).getHexString(), null, { vc: false });
    const LO = legOrder(outfit), boots = LO.bootsOver || LO.socksOver;   // pantaloni dentro stivali o calzini: niente orlo in rilievo
    const shows = (C, r, s) => [0, Math.PI / 2, Math.PI, -Math.PI / 2].some(a => topOf(B, P, r, s, a) === C);   // a quell'altezza il capo è quello di sopra (almeno da un lato)
    for (const sd of ['L', 'R']) {
      const RA = 'A' + sd, ri = sd === 'L' ? 1 : 2;
      P.forEach(CA => { if (!CA.L[RA] || (CA.polsi && CA.L[RA].s1 > CA.L[RA].la)) return; const Ls = CA.L[RA], sH = Ls.s1 - .008; if (!shows(CA, ri, sH - .01)) return;
        const lng = Ls.s1 > Ls.la, tbA = F.tubes[ri], wA = B.bones['Wrist' + sd], sW = wA ? tbA.sNear(wA) : sH, off = ringOff(B, P, ri, sH - .006), o = new THREE.Group();
        // il polsino delle maniche lunghe: alto (5-6 cm), dalla fine della manica dipinta fino al polso, chiude l'attacco della mano
        o.add(lng ? orlo(B, ri, sW - .016, .066, off + .0035, .006 + spessore(CA), 14, mat(CA)) : orlo(B, ri, sH, .016, off + .0035, .005 + spessore(CA), 12, mat(CA))); AT(Ls.s1 < Ls.la - .02 ? 'UpperArm' + sd : 'LowerArm' + sd, o); });
      const RL = 'L' + sd, rl = sd === 'L' ? 3 : 4;
      P.forEach(CL => { if (!CL.L[RL] || CL.L[RL].falda !== undefined || CL.risvolto) return; const Ls = CL.L[RL]; if (Ls.s1 >= F.tubes[rl].L + .01) return;
        const last = !P.slice(P.indexOf(CL) + 1).some(o => o.L[RL] && o.L[RL].falda === undefined && o.L[RL].s1 > Ls.s1 - .02 && (o.cl || 0) >= (CL.cl || 0));   // l'orlo in fondo alla gamba: solo se nessuno ci scende sopra
        if (CL.cl === 2 && boots && last) return; const sH = Ls.s1 - .01; if (!shows(CL, rl, sH - .012)) return;
        const el = CL.elastico, off = ringOff(B, P, rl, sH - .008) + (el ? .0015 : .004), o = new THREE.Group();
        o.add(orlo(B, rl, sH, el ? .014 : .02, off, el ? .004 : .006 + spessore(CL), 12, el ? blockMat('costine', '#' + new THREE.Color().setRGB(C2h(CL.A, .92)[0], C2h(CL.A, .92)[1], C2h(CL.A, .92)[2]).getHexString(), null, null, { vc: false }) : mat(CL)));
        AT((Ls.s1 < Ls.kn - .02 ? 'UpperLeg' : 'LowerLeg') + sd, o); });
    }
    // l'elastico in vita dell'intimo (e della tuta) quando sta sopra un altro capo: una fascia a costine in rilievo che stringe
    const tb = F.tubes[0];
    P.forEach(C => { if (!C.elastico || !C.L.T || C.L.T.p1 === undefined) return; const s = C.L.T.p1 - .012; if (!shows(C, 0, s - .01)) return;
      const off = ringOff(B, P, 0, s - .01, 16), o = new THREE.Group(), col = '#' + new THREE.Color().setRGB(...C2h(C.A, .9)).getHexString();
      o.add(orlo(B, 0, s, .026, off + .002, .005, 20, blockMat('costine', col, col, col, { vc: false }))); AT('Hips', o); });
  }
  const C2h = (A, k) => [A[0] * k, A[1] * k, A[2] * k];
  // l'ordine degli strati: di norma per tipo (intimo, maglie, pantaloni, giacche, cappotti), ma nella stessa zona del guardaroba
  // vale l'ordine in cui li hai indossati: le mutande sopra i pantaloni stanno sopra, il gilet sotto la camicia sta sotto
  function rankOutfit(list, CUT) {
    const last = {}, R = list.map((c, i) => { const z = c.zona || 'x'; let r = ((CUT[c.id] || {}).cl || 1) * 10 + i * .01; if (last[z] !== undefined && r <= last[z]) r = last[z] + .01; last[z] = r; return { c, r }; });
    // tra zone diverse decide l'ordine in cui ti sei vestito: la maglia messa dopo i pantaloni sta fuori (sopra di loro)
    // per ogni coppia di capi di zone diverse che coprono le stesse parti, quello messo dopo sta sopra (giacche e cappotti restano sopra a tutto)
    for (let it = 0; it < 3; it++) R.forEach(t => { if (!(t.c.when > 0)) return; R.forEach(b => { if (b === t || !(b.c.when > 0) || (t.c.zona || 'x') === (b.c.zona || 'y') || t.c.when <= b.c.when || t.r > b.r) return;
      if (((CUT[b.c.id] || {}).cl || 1) >= 4) return; const ex = l => l.includes('torso') ? l.concat(['bacino']) : l, pt = ex(t.c.parti || []), pb = ex(b.c.parti || []); if (!pt.some(p => pb.includes(p))) return; /* la maglia scende sulla vita: tocca i pantaloni */ t.r = b.r + .005; }); });
    return R.sort((a, b) => a.r - b.r).map(o => o.c);
  }
  // gambe: pantaloni, calzini, stivali. Chi sta sopra? Lo dice l'ordine in cui ti sei vestito (gli abitanti: stivali sopra, calzini sotto)
  function legOrder(outfit) {
    const CUT = S().CUT_(), pants = outfit.filter(c => (c.parti || []).includes('polpacci') && ((CUT[c.id] || {}).cl === 2 || (CUT[c.id] || {}).intera)).pop(),
      sock = outfit.find(c => c.id === 'calzini' || c.id === 'calze_sport'), bt = outfit.find(c => /^stivali/.test(c.id)), known = o => o && o.when > 0;
    return { pants, sock, bt, socksOver: !!(pants && sock && known(sock) && known(pants) && sopra(sock, pants)), bootsOver: !!(bt && (!pants || !(known(bt) && known(pants)) || sopra(bt, pants))) };
  }
  // chi sta sopra a chi, tra zone diverse (calzini e stivali rispetto ai pantaloni)
  function sopra(a, b) { return !!(a && b && (a.when || 0) > (b.when || 0)); }
  const surfY = (tb, sv, a) => S().surf(tb, sv, a, 0).y;
  function paintPlans(B, outfit) {
    const CUT = S().CUT_(), list = outfit.filter(c => c.parti && c.parti.some(p => /torso|braccia|avambracci|bacino|cosce|polpacci|collo/.test(p)));
    const ranked = rankOutfit(list, CUT);
    return ranked.map((c, k) => plan(B, c, k, ranked));
  }
  // il raggio della superficie dipinta del busto (stirata) a (s, angolo) sul tubo del tronco: le falde in rilievo ci si raccordano a filo
  function raggio(B, s, a) { const tb = frame(B).tubes[0]; return shape(B, tb, s, a, ironRadius(ironed(tb), tb, s, a)); }
  return { corpoOn: on => { CORPO_ON = !!on; GEO.clear(); }, limbRing, forma: k => { FORMA_K = k; IRON.clear(); }, offAt, ringOff, topOf, stackOff, raggio, ironAll, cutY, plan, paintPlans, legOrder, rankOutfit, sopra, spessore, dipingi, spoglia, paint, paintGeo, frame, blockMat, bordi, surfI, orlo };
})();
