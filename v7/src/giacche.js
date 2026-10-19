/* Porto Vecchio — Le giacche: guscio fatto a sagoma (come nei giochi dell'era PS2), non pittura sul corpo.
   La giacca è un pezzo solo: busto a anelli (spalle squadrate, caduta dritta), maniche a tubo, e una texture sua dove sono dipinti
   anche quello che si vede dentro: la camicia nello scollo a V, la cravatta, il colletto della camicia, i polsini.
   Il corpo sotto il guscio si toglie (niente compenetrazioni: sotto non c'è più niente da bucare).
   Gli strati dell'inventario: il capo più esterno del busto decide il guscio; i capi sotto mostrano solo quello che spunta
   (colletto sopra il collo della giacca, polsini sotto la manica, camicia e cravatta nella V).
   Usata da vestiario.js (Vesti3D) e da pittura.js (che non dipinge sotto il guscio). */
var Giacche = (function () {
  'use strict';
  const cl = (x, a, b) => x < a ? a : x > b ? b : x, lerp = (a, b, t) => a + (b - a) * t, sm = t => { t = cl(t, 0, 1); return t * t * (3 - 2 * t); };
  const REVERS = /revers/;
  // ---------------- LA SCELTA: il capo di fuori del busto e quello che spunta ----------------
  function scegli(outfit) {
    if (typeof Sartoria === 'undefined') return null; const CUT = Sartoria.CUT_();
    const torso = outfit.filter(c => (c.parti || []).includes('torso') && !(CUT[c.id] || {}).solo_gonna);
    const ord = torso.map((c, k) => ({ c, k, w: c.when || 0 })).sort((a, b) => (a.w - b.w) || (a.k - b.k)).map(x => x.c);   // l'ordine vero in cui ti vesti
    const top = ord[ord.length - 1]; if (!top) return null; const T = Object.assign({}, CUT[top.id] || {}, top.var && typeof top.var === 'object' ? top.var : {});
    if (!REVERS.test(T.collo || '') || (T.cl || 0) >= 5 || T.gonna) return null;   // per ora la giacca (non cappotti né giubbotti di pelle lunghi)
    const sotto = ord.slice(0, -1), shirt = sotto.slice().reverse().find(c => /^(camicia|polo|camicia_aperta)$/.test(((c.var && c.var.collo) || (CUT[c.id] || {}).collo) || ''));
    const maglia = sotto[sotto.length - 1] || null, tie = shirt ? outfit.find(c => c.acc === 'cravatta') : null;
    return { J: top, JC: T, shirt, shirtC: shirt ? Object.assign({}, CUT[shirt.id] || {}, shirt.var && typeof shirt.var === 'object' ? shirt.var : {}) : null, maglia, tie };
  }
  // ---------------- LE MISURE ----------------
  function misure(B) {
    const b = B.bones, nY = Sartoria.neckY(B), [nx, nz] = B.neckC, hips = b.Hips.y, chest = (b.Chest || b.Spine || b.Hips).y;
    const yHem = Math.max(B.crotch + .035, hips - .13), arm = { L: b.UpperArmL, R: b.UpperArmR };
    const ySh = Math.max(arm.L.y, arm.R.y) + .012;
    return { nY, nx, nz, hips, chest, waist: B.waist, yHem, ySh, yPit: ySh - .085, cx: (arm.L.x + arm.R.x) / 2 };
  }
  // la sezione del corpo a una quota: per 2·N direzioni attorno al centro, il punto più lontano (pelle)
  function sezione(B, y, cx, cz, N, conBraccia, band) {
    const R = new Float32Array(N), C = B.corpo; band = band || .016;
    const add = (p) => { if (Math.abs(p[1] - y) > band) return; const dx = p[0] - cx, dz = p[2] - cz, a = Math.atan2(dx, dz), i = ((Math.round((a + Math.PI) / (Math.PI * 2) * N) % N) + N) % N, r = Math.hypot(dx, dz); if (r > R[i]) R[i] = r; };
    C[0].VI.forEach(L => add(L.p)); if (band < .01 && B.head) for (let k = 0; k < B.head.length; k += 3) add([B.head[k], B.head[k + 1], B.head[k + 2]]); if (conBraccia) for (const r of [1, 2]) C[r].VI.forEach(L => { if (L.s < .1) add(L.p); });
    for (let it = 0; it < N; it++) { let any = 0; for (let i = 0; i < N; i++) if (!R[i]) { R[i] = Math.max(R[(i + 1) % N], R[(i + N - 1) % N]); any = 1; } if (!any) break; }
    for (let it = 0; it < 2; it++) { const c0 = R.slice(); for (let i = 0; i < N; i++) R[i] = Math.max(c0[i], (c0[(i + 1) % N] + c0[(i + N - 1) % N]) / 2); }
    return R;
  }
  // il centro davanti-dietro del busto a una quota (a metà tra petto e schiena)
  function centroZ(B, y, cx) { let lo = 9, hi = -9; B.corpo[0].VI.forEach(L => { if (Math.abs(L.p[1] - y) < .015 && Math.abs(L.p[0] - cx) < .05) { lo = Math.min(lo, L.p[2]); hi = Math.max(hi, L.p[2]); } }); return lo < hi ? (lo + hi) / 2 : B.neckC[1]; }
  // ---------------- IL GUSCIO DEL BUSTO ----------------
  const NA = 20;   // lati attorno (basso numero di poligoni, ma tondo abbastanza)
  function busto(B, M, info) {
    const { nY, nx, nz } = M, nR = B.neckR || .055, EASE = .016;
    // gli anelli: [quota, tipo]. Dalla falda al collo della giacca, poi il colletto della camicia
    const zH = centroZ(B, M.hips, M.cx), zC = centroZ(B, M.chest, M.cx);
    const sec = (y, br) => { const z = lerp(zH, zC, cl((y - M.hips) / Math.max(.05, M.chest - M.hips), 0, 1)); return { R: sezione(B, y, M.cx, z, NA, br), cz: z }; };
    const sH = sec(M.hips), sC = sec(M.chest), sP = sec(M.yPit), sS = sec(M.ySh - .02, true);
    const ring = (y, cx, cz, R) => ({ y, cx, cz, R: Array.from(R) });
    const R0 = Array.from({ length: NA }, (_, i) => Math.max(sH.R[i], sC.R[i] * .96) + EASE + .006);   // [stile] caduta dritta: dal petto alla falda niente vita stretta
    const RC = Array.from({ length: NA }, (_, i) => Math.max(sC.R[i], sP.R[i]) + EASE);
    // le spalle: squadrate, larghe fino all'attaccatura del braccio, appena imbottite
    const RS = Array.from({ length: NA }, (_, i) => { const a = -Math.PI + i / NA * Math.PI * 2, side = Math.abs(Math.sin(a)); return Math.max(sS.R[i] + EASE, RC[i] * (1 - .25 * (1 - side))); });
    const czS = lerp(sS.cz, nz, .25), nk = y => sezione(B, y, nx, nz, NA, false, .006), rN = Array.from(nk(nY - .01), r => Math.max(r, nR) + .016), rNc = Array.from(nk(nY + .015), (r, i) => Math.min(Math.max(r, nR) + .007, rN[i] - .003));   // il collo vero, misurato
    const rings = [
      ring(M.yHem, M.cx, zH, R0), ring(M.hips, M.cx, zH, R0), ring(M.waist, M.cx, lerp(zH, zC, .5), R0.map((r, i) => Math.max(r - .004, RC[i]))),
      ring(M.chest, M.cx, zC, RC), ring(M.yPit, M.cx, sP.cz, RC.map((r, i) => Math.max(r, sP.R[i] + EASE))), ring(M.ySh - .02, M.cx, sS.cz, RS),
      ring(M.ySh + .006, lerp(M.cx, nx, .2), czS, RS.map((r, i) => { const a = -Math.PI + i / NA * Math.PI * 2; return lerp(r, nR + .03, .35 + .25 * Math.abs(Math.cos(a))); })),   // il piano delle spalle
      ring(nY - .022, nx, nz, rN), ring(nY + .002, nx, nz, rN),    // il collo della giacca
      ring(nY + .002, nx, nz, rNc), ring(nY + .028, nx, nz, rNc), ring(nY + .028, nx, nz, rNc.map(r => r - .006)) ];   // il colletto della camicia (spunta sopra)
    const kJ = 9;   // da questo anello in su: la camicia
    // il colletto davanti è più basso che dietro (non va contro il mento)
    const dip = (k, a) => k >= kJ - 1 ? -.014 * sm(1 - Math.abs(a) / 1.2) : 0;
    const P = [], U = [], I = [], yLo = M.yHem, yHi = nY + .035;
    rings.forEach((rg, k) => { for (let i = 0; i <= NA; i++) { const a = -Math.PI + (i % NA) / NA * Math.PI * 2, r = rg.R[i % NA], y = rg.y + dip(k, a);
      P.push(rg.cx + Math.sin(a) * r, y, rg.cz + Math.cos(a) * r); U.push(i / NA, k >= kJ ? .985 + .015 * (k - kJ) / 3 : (y - yLo) / (yHi - yLo) * .97); } });
    const W = NA + 1; for (let k = 0; k < rings.length - 1; k++) for (let i = 0; i < NA; i++) { const a = k * W + i, b = a + 1, c = a + W, d = c + 1; I.push(a, b, c, b, d, c); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setIndex(I); g.computeVertexNormals();
    return { geo: g, rings, kJ, yLo, yHi };
  }
  // ---------------- LE MANICHE ----------------
  function manica(B, M, sd) {
    const F = Pittura.frame(B), r = sd === 'L' ? 1 : 2, tb = F.tubes[r], C = B.corpo[r], w = B.bones['Wrist' + sd], sW = w ? tb.sNear(w) : tb.L, EASE = .012, N = 12;
    const sEnd = sW - .03, sCuff = sW - .005;   // la manica finisce un dito prima del polso; il polsino della camicia ne spunta
    const meas = s => { const R = new Float32Array(N); C.VI.forEach(L => { if (Math.abs(L.s - s) > .02) return; const fr = Sartoria.frameAt(tb, L.s), v = new THREE.Vector3().fromArray(L.p).sub(fr.p); v.addScaledVector(fr.t, -v.dot(fr.t)); const a = Math.atan2(v.dot(fr.sd), v.dot(fr.f)), i = ((Math.round((a + Math.PI) / (Math.PI * 2) * N) % N) + N) % N; R[i] = Math.max(R[i], v.length()); });
      for (let it = 0; it < N; it++) for (let i = 0; i < N; i++) if (!R[i]) R[i] = Math.max(R[(i + 1) % N], R[(i + N - 1) % N]); return R; };
    const top = meas(.06), avg = R => R.reduce((x, y) => x + y, 0) / N, rTop = avg(top);
    const ss = [-.01, .03, .07, .1, .16, .22, .28, sEnd - .04, sEnd].filter((s, k, A) => s <= sEnd && (k === 0 || s > A[k - 1]));
    const rings = ss.map(s => { const R = meas(Math.max(.01, Math.min(sW - .01, s))); return { s, R: Array.from(R, x => Math.max(x, rTop * (s < .12 ? 1 : lerp(.95, .7, cl((s - .12) / (sEnd - .12), 0, 1)))) + EASE - (s < 0 ? .012 : 0)) }; });   // [stile] la manica cade dritta dal braccio pieno
    const cuffR = meas(sCuff).map(x => x + .005); rings.push({ s: sEnd, R: Array.from(cuffR), polsino: 1 }, { s: sCuff + .006, R: Array.from(cuffR), polsino: 1 });
    const P = [], U = [], I = [];
    rings.forEach((rg, k) => { const s = rg.s, fr = Sartoria.frameAt(tb, Math.max(0, s)), p0 = fr.p.clone().addScaledVector(fr.t, Math.min(0, s)); for (let i = 0; i <= N; i++) { const a = -Math.PI + (i % N) / N * Math.PI * 2, rr = rg.R[i % N], p = p0.clone().addScaledVector(fr.f, Math.cos(a) * rr).addScaledVector(fr.sd, Math.sin(a) * rr);
      P.push(p.x, p.y, p.z); U.push(i / N, rg.polsino ? (k === rings.length - 2 ? .93 : 1) : cl((s + .035) / (sEnd + .035), 0, 1) * .9); } });
    const W = N + 1; for (let k = 0; k < rings.length - 1; k++) for (let i = 0; i < N; i++) { const a = k * W + i, b = a + 1, c = a + W, d = c + 1; I.push(a, c, b, b, c, d); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setIndex(I); g.computeVertexNormals();
    // le normali verso fuori (il tubo del braccio sinistro e destro hanno il riferimento a specchio)
    { const nn = g.attributes.normal, k = W * 3 + 3, cen = Sartoria.frameAt(tb, .1).p, v = new THREE.Vector3(P[k * 3], P[k * 3 + 1], P[k * 3 + 2]).sub(cen); if (v.x * nn.getX(k) + v.y * nn.getY(k) + v.z * nn.getZ(k) < 0) { for (let t = 0; t < I.length; t += 3) { const x = I[t + 1]; I[t + 1] = I[t + 2]; I[t + 2] = x; } g.setIndex(I); g.computeVertexNormals(); } }
    return { geo: g, sCuff, sEnd };
  }
  // ---------------- LA TEXTURE (dipinta come una tela, con le ombre fatte a mano) ----------------
  const TEX = new Map();
  const hex = c => '#' + new THREE.Color(c).getHexString();
  const mix = (c, k) => { const q = new THREE.Color(c); return '#' + q.multiplyScalar(k).getHexString(); };
  function tela(info, M, sh, kind) {
    const J = info.J, jc = J.col || '#2a2e3a', mc = info.maglia ? (info.maglia.col || '#e8e2d4') : null, sc = info.shirt ? (info.shirt.col || '#f0ece2') : (info.maglia ? info.maglia.col || '#e8e2d4' : '#e8e2d4'), tc = info.tie ? (info.tie.col || '#b0202a') : null;
    const gess = /gessato/.test(info.JC.fab || '') || /completo/.test(J.id), aperta = info.shirtC && info.shirtC.collo === 'camicia_aperta', polo = info.shirtC && info.shirtC.collo === 'polo';
    const vc = mc || sc, key = [kind, jc, sc, vc, tc, gess, aperta, polo, J.id].join('|');   // vc: nella V si vede lo strato subito sotto la giacca if (TEX.has(key)) return TEX.get(key);
    const W = kind === 'busto' ? 1024 : 256, H = kind === 'busto' ? 768 : 512, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d');
    const lum = new THREE.Color(jc), Lj = lum.r * .3 + lum.g * .59 + lum.b * .11, line = Lj > .5 ? mix(jc, .45) : mix(jc, .45), light = mix(jc, Lj > .5 ? 1 : 1.25);
    x.fillStyle = hex(jc); x.fillRect(0, 0, W, H);
    const Rm = .15, PX = W / (Math.PI * 2 * Rm);   // pixel per metro attorno al busto (circa)
    if (gess) { x.fillStyle = Lj > .5 ? mix(jc, .8) : mix(jc, 1.7); const step = .016 * PX; for (let u = 0; u < W; u += step) x.fillRect(u, 0, Math.max(1, .0014 * PX), H); }   // il gessato: righe fini ogni 1,6 cm
    if (kind === 'manica') {
      // la piega del gomito e l'ombra sotto; il polsino della camicia in fondo; tre bottoni
      const g0 = x.createLinearGradient(0, 0, W, 0); g0.addColorStop(0, 'rgba(0,0,0,.28)'); g0.addColorStop(.3, 'rgba(0,0,0,0)'); g0.addColorStop(.7, 'rgba(0,0,0,0)'); g0.addColorStop(1, 'rgba(0,0,0,.28)'); x.fillStyle = g0; x.fillRect(0, 0, W, H);
      // in cima alla tela (v alto) il polso: il polsino della camicia, l'orlo della manica con la sua ombra, i bottoni
      x.fillStyle = hex(sc); x.fillRect(0, 0, W, H * .1); x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(0, H * .1 - 4, W, 4);
      x.fillStyle = line; x.fillRect(0, H * .1, W, 3);
      x.fillStyle = mix(jc, .4); for (let k = 0; k < 3; k++) { x.beginPath(); x.arc(W * .25, H * (.13 + k * .022), 4, 0, 7); x.fill(); }
      const T = new THREE.CanvasTexture(cv); T.anisotropy = 4; TEX.set(key, T); return T; }
    // il busto: u = angolo (0 = dietro, 0,5 = davanti), v = quota (dalla falda al collo; in cima il colletto della camicia)
    const U = a => (a + Math.PI) / (Math.PI * 2) * W, V = y => H - (y - sh.yLo) / (sh.yHi - sh.yLo) * .97 * H, Xu = X => X * PX;   // X: metri dal centro davanti
    const cxp = W / 2, { nY } = M, yVb = Math.min(nY - .24, M.waist + .05), yN = nY - .085, xVt = .06, wl = y => lerp(.016, .085, sm((y - yVb) / (yN - yVb)));   // [stile] V fino al bottone in vita, revers larghi
    const xV = y => cl((y - yVb) / (nY - .01 - yVb), 0, 1) * xVt;
    const poly = (pts, fill, stroke, lw) => { x.beginPath(); pts.forEach(([X, y], k) => { const px = cxp + Xu(X), py = V(y); k ? x.lineTo(px, py) : x.moveTo(px, py); }); x.closePath(); if (fill) { x.fillStyle = fill; x.fill(); } if (stroke) { x.strokeStyle = stroke; x.lineWidth = lw || 3; x.lineJoin = 'round'; x.stroke(); } };
    // ombre fatte a mano: i fianchi più scuri, la schiena un po', la luce sul petto e sulle spalle
    { const g0 = x.createLinearGradient(0, 0, W, 0); [[0, .2], [.18, .3], [.3, .05], [.5, 0], [.7, .05], [.82, .3], [1, .2]].forEach(([t, a]) => g0.addColorStop(t, 'rgba(0,0,0,' + a + ')')); x.fillStyle = g0; x.fillRect(0, 0, W, H);
      const g1 = x.createLinearGradient(0, V(M.ySh + .01), 0, V(M.chest - .05)); g1.addColorStop(0, 'rgba(255,255,255,.10)'); g1.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g1; x.fillRect(0, V(M.ySh + .01), W, V(M.chest - .05) - V(M.ySh + .01));
      const g2 = x.createLinearGradient(0, V(M.yHem + .05), 0, V(M.yHem)); g2.addColorStop(0, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(0,0,0,.3)'); x.fillStyle = g2; x.fillRect(0, V(M.yHem + .05), W, V(M.yHem) - V(M.yHem + .05)); }
    // la V: la camicia (o la maglia) dentro, la cravatta
    poly([[-xV(nY + .01) - .004, nY + .01], [xV(nY + .01) + .004, nY + .01], [0, yVb]], hex(vc));
    { const gV = x.createLinearGradient(0, V(nY), 0, V(yVb)); gV.addColorStop(0, 'rgba(0,0,0,.05)'); gV.addColorStop(1, 'rgba(0,0,0,.25)'); x.fillStyle = gV; poly([[-xV(nY + .01), nY + .01], [xV(nY + .01), nY + .01], [0, yVb]], 'rgba(0,0,0,0)'); x.fill(); }
    if (aperta) { poly([[-.03, nY + .01], [.03, nY + .01], [0, nY - .12]], hex(info.skin || '#d8a888')); }   // aperta sul petto
    if (tc) { const yK = nY - .002, yK0 = nY - .04, tip = yVb + .01;
      poly([[-.02, yK0], [-.042, tip + .025], [0, tip - .015], [.042, tip + .025], [.02, yK0]], hex(tc), mix(tc, .55), 3);   // la pala, larga
      x.save(); x.clip(); x.fillStyle = 'rgba(0,0,0,.12)'; for (let k = -10; k < 10; k++) { x.save(); x.translate(cxp + Xu(k * .012), V(yK0)); x.rotate(.6); x.fillRect(-1, 0, 3, H); x.restore(); } x.restore();
      poly([[-.026, yK], [.026, yK], [.016, yK0], [-.016, yK0]], mix(tc, .9), mix(tc, .5), 3); }   // il nodo grosso
    // il colletto della camicia davanti: due punte che scendono sulla V (sopra la cravatta), contorno scuro
    if (!aperta) for (const sg of [-1, 1]) poly([[sg * .004, nY + .012], [sg * .056, nY + .012], [sg * .06, nY - .004], [sg * .036, nY - .065], [sg * .008, nY - .012]], hex(sc), mix(sc, .45), 3);
    // i revers: le ali dalla V all'orlo, la tacca in alto; un filo più chiari, contorno scuro e ombra sotto
    for (const sg of [-1, 1]) {
      const pts = []; for (let k = 0; k <= 12; k++) { const y = lerp(yVb, yN, k / 12); pts.push([sg * xV(y), y]); }
      const top = [[sg * xV(yN + .03), yN + .03], [sg * (xV(yN) + .03), yN + .012], [sg * (xV(yN) + .042), yN], [sg * (xV(yN) + wl(yN) + .006), yN + .016]];   // la tacca: il collo sopra, la punta del revers sotto
      const outer = []; for (let k = 12; k >= 0; k--) { const y = lerp(yVb, yN, k / 12); outer.push([sg * (xV(y) + wl(y)), y]); }
      poly(outer.map(([X, y]) => [X + sg * .01, y - .006]), 'rgba(0,0,0,.28)');   // l'ombra del revers sulla giacca
      poly([...pts, ...top.slice(2), ...outer], light, line, 3);
      if (gess) { x.save(); poly([...pts, ...top.slice(2), ...outer], null); x.clip(); x.fillStyle = Lj > .5 ? mix(jc, .8) : mix(jc, 1.7); for (let k = -12; k < 12; k++) { x.save(); x.translate(cxp + Xu(k * .016), V(yVb)); x.rotate(-sg * .35); x.fillRect(0, -H, Math.max(1, .0014 * PX), H * 2); x.restore(); } x.restore(); }
      // il collo della giacca davanti: dalla tacca sale al collo (la gola), sopra il revers
      poly([[sg * xV(yN + .03), yN + .03], [sg * (xV(yN) + .042), yN], [sg * .085, nY - .03], [sg * .06, nY + .004], [sg * .03, nY + .004]], light, line, 3); }
    // il collo della giacca attorno al collo (gli anelli del collo): fascia col contorno sotto, tranne davanti dove c'è la camicia
    { const yA = nY - .024, yB2 = nY + .004, aF = .62; x.fillStyle = light; x.fillRect(0, V(yB2), U(-aF), V(yA) - V(yB2)); x.fillRect(U(aF), V(yB2), W - U(aF), V(yA) - V(yB2));
      x.fillStyle = line; x.fillRect(0, V(yA), U(-aF), 3); x.fillRect(U(aF), V(yA), W - U(aF), 3); x.fillRect(0, V(yB2), U(-aF), 2); x.fillRect(U(aF), V(yB2), W - U(aF), 2); }
    if (aperta) for (const sg of [-1, 1]) {   // l'aperta alla Scarface: le punte larghe del colletto stese sopra i revers, contorno scuro e ombra sotto
      poly([[sg * .03, nY + .012], [sg * .075, nY + .006], [sg * .135, nY - .085], [sg * .095, nY - .075], [sg * .045, nY - .06], [sg * .02, nY - .02]].map(([X, y]) => [X + sg * .006, y - .006]), 'rgba(0,0,0,.3)');
      poly([[sg * .03, nY + .012], [sg * .075, nY + .006], [sg * .135, nY - .085], [sg * .095, nY - .075], [sg * .045, nY - .06], [sg * .02, nY - .02]], hex(sc), mix(sc, .45), 3); }
    // l'abbottonatura: il bordo davanti sotto la V, i bottoni, i quarti che si aprono in fondo
    x.strokeStyle = line; x.lineWidth = 3; x.beginPath(); x.moveTo(cxp, V(yVb)); x.lineTo(cxp, V(M.hips + .02)); x.quadraticCurveTo(cxp + Xu(.01), V(M.yHem + .02), cxp + Xu(.05), V(M.yHem)); x.stroke();
    x.beginPath(); x.moveTo(cxp, V(M.hips + .02)); x.quadraticCurveTo(cxp - Xu(.01), V(M.yHem + .02), cxp - Xu(.05), V(M.yHem)); x.stroke();
    x.fillStyle = mix(jc, .35); for (const yb of [yVb - .012, yVb - .1]) { x.beginPath(); x.arc(cxp + Xu(.006), V(yb), 6, 0, 7); x.fill(); }
    // le tasche: i patti sui fianchi e il taschino a sinistra
    for (const sg of [-1, 1]) poly([[sg * .07, M.hips + .03], [sg * .17, M.hips + .03], [sg * .17, M.hips - .005], [sg * .07, M.hips - .005]], null, line, 3);
    poly([[.075, M.chest + .02], [.14, M.chest + .025], [.14, M.chest + .012], [.075, M.chest + .007]], null, line, 3);
    // in cima: il colletto della camicia (spunta sopra il collo della giacca), con l'ombra della giacca sotto
    x.fillStyle = hex(sc); x.fillRect(0, 0, W, H * .015 + 2); x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(0, H * .015, W, 2);
    const T = new THREE.CanvasTexture(cv); T.anisotropy = 8; T.minFilter = THREE.LinearMipmapLinearFilter; TEX.set(key, T); return T;
  }
  // ---------------- COSA COPRE (per la pittura: il corpo sotto il guscio si toglie) ----------------
  function copre(B, gu, reg, L) {
    if (!gu || !L) return false; const M = gu.M || (gu.M = misure(B));
    if (reg === 1) return L.p[1] > M.yHem + .006 && L.p[1] < M.nY - .004;
    if (reg === 2 || reg === 3) { const tb = Pittura.frame(B).tubes[reg - 1], w = B.bones[reg === 2 ? 'WristL' : 'WristR']; return L.s < (w ? tb.sNear(w) : tb.L) - .012; }
    return false;
  }
  // ---------------- IL PEZZO ----------------
  function costruisci(B, info, look) {
    const M = misure(B), sh = busto(B, M, info), o = new THREE.Group(); info.skin = look && look.skin;
    const mt = new THREE.MeshLambertMaterial({ map: tela(info, M, sh, 'busto') }); o.add(new THREE.Mesh(sh.geo, mt));
    const mm = new THREE.MeshLambertMaterial({ map: tela(info, M, sh, 'manica') });
    for (const sd of ['L', 'R']) o.add(new THREE.Mesh(manica(B, M, sd).geo, mm));
    return o;
  }
  return { scegli, copre, costruisci, misure };
})();
if (typeof module !== 'undefined') module.exports = Giacche;
