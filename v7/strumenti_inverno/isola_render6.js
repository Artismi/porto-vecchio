  // ================= [isola38] IL MARCIAPIEDE VERO, IL VERDE CHE SI RIPRENDE LA CITTÀ, GLI INCROCI CURATI =================
  // Il marciapiede non si sfuma più (la sfocatura lo mangiava e lo spargeva sulla carreggiata): è il tratto fra 0 e 2,1 m dal
  // bordo della strada, ritagliato con una curva di livello liscia (niente gradini della griglia), alto 15 cm con il cordolo
  // dritto in pietra verso la strada. Poi il verde come in una città lasciata andare: erba nelle crepe lungo i cordoli e i
  // muri, cespugli, alberi cresciuti dove c'è terra. Agli incroci: paletti agli angoli, tombini, caditoie, erbacce.
  function marciapiedi38(F) {
    if (!F || !F.S38) return 0;
    const { R, NW, NH, S38, D38, C38 } = F;
    const terr = (x, z) => { const fx = x / TS, fz = z / TS; if (fx < 0 || fz < 0 || fx >= G.GW || fz >= G.GH) return -2;
      const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, h00 = VH(i, j), h10 = VH(i + 1, j), h01 = VH(i, j + 1), h11 = VH(i + 1, j + 1);
      return u <= v ? h00 + (h11 - h01) * u + (h01 - h00) * v : h00 + (h10 - h00) * u + (h11 - h10) * v; };
    const HC = .15, pos = [], col = [], uv = [], wpos = [], wcol = [], c = new THREE.Color(), cs = new THREE.Color('#8e897f'), cp = new THREE.Color('#5f5b54'), ce = new THREE.Color('#4c4843');
    const topCol = (x, z, dc, de) => {   // dc: distanza dal ciglio verso la strada, de: dal lato delle case
      const n = vnz(x / 3.1, z / 3.1) * .22 + vnz(x / .9, z / .9) * .08;
      if (dc < .28) c.copy(cs); else c.copy(cp).lerp(ce, Math.max(0, 1 - de / .45) * .8);
      c.multiplyScalar(1 + n); return c; };
    const emitTop = (P) => { for (let q = 1; q < P.length - 1; q++) for (const p of [P[0], P[q], P[q + 1]]) { pos.push(p.x, terr(p.x, p.z) + HC, p.z); topCol(p.x, p.z, p.dc, p.de); col.push(c.r, c.g, c.b); uv.push(p.x / 2, p.z / 2); } };
    const emitWall = (a, b) => { const curb = (a.dc + b.dc) * .5 < 1, w = curb ? cs : ce, ya0 = terr(a.x, a.z) - .06, yb0 = terr(b.x, b.z) - .06, ya1 = ya0 + .06 + HC, yb1 = yb0 + .06 + HC;
      [[a.x, ya0, a.z], [b.x, yb0, b.z], [b.x, yb1, b.z], [a.x, ya0, a.z], [b.x, yb1, b.z], [a.x, ya1, a.z]].forEach((p, k) => { wpos.push(p[0], p[1], p[2]); const s = k === 2 || k === 4 || k === 5 ? 1 : .62; wcol.push(w.r * s, w.g * s, w.b * s); }); };
    const V = (i, j) => { const k = j * NW + i, s = S38[k], d = D38[k]; return { x: i * R, z: j * R, s, dc: d, de: 2.1 - d, iso: false }; };
    const lerpP = (p, q) => { const t = p.s / (p.s - q.s); return { x: p.x + (q.x - p.x) * t, z: p.z + (q.z - p.z) * t, s: 0, dc: p.dc + (q.dc - p.dc) * t, de: p.de + (q.de - p.de) * t, iso: true }; };
    const clip = (T3) => { const out = []; for (let k = 0; k < 3; k++) { const p = T3[k], q = T3[(k + 1) % 3]; if (p.s >= 0) out.push(p); if ((p.s >= 0) !== (q.s >= 0)) out.push(lerpP(p, q)); } return out; };
    let nt = 0;
    for (let j = 0; j < NH - 1; j++) for (let i = 0; i < NW - 1; i++) {
      const k = j * NW + i; if (!(C38[k] || C38[k + 1] || C38[k + NW] || C38[k + NW + 1])) continue;
      if (S38[k] < 0 && S38[k + 1] < 0 && S38[k + NW] < 0 && S38[k + NW + 1] < 0) continue;
      const a = V(i, j), b = V(i, j + 1), cc = V(i + 1, j + 1), d = V(i + 1, j);
      for (const T3 of [[a, b, cc], [a, cc, d]]) { const P = clip(T3); if (P.length < 3) continue; emitTop(P); nt++;
        for (let q = 0; q < P.length; q++) { const p1 = P[q], p2 = P[(q + 1) % P.length]; if (p1.iso && p2.iso) emitWall(p1, p2); } }
    }
    if (!pos.length) return 0;
    const g1 = new THREE.BufferGeometry(); g1.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g1.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g1.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g1.computeVertexNormals();
    const g2 = new THREE.BufferGeometry(); g2.setAttribute('position', new THREE.Float32BufferAttribute(wpos, 3)); g2.setAttribute('color', new THREE.Float32BufferAttribute(wcol, 3)); g2.computeVertexNormals();
    const top = new THREE.Mesh(g1, new THREE.MeshLambertMaterial({ map: lastre35(), vertexColors: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
    const wall = new THREE.Mesh(g2, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
    [top, wall].forEach(m => { m.receiveShadow = true; m.frustumCulled = false; scene.add(m); });
    return nt;
  }

  // ---- il verde che cresce nelle crepe: lungo il cordolo e ai piedi delle case, a ciuffi, più fitto dove nessuno pulisce ----
  function erbaCrepe38(add, tx0, ty0, n, m) {
    const X0 = tx0 * TS, Y0 = ty0 * TS, X1 = (tx0 + n) * TS, Y1 = (ty0 + m) * TS, LEAF = ['#e8f0e0', '#f4f2e4', '#e0ead8', '#fff8e8', '#f0e8c8'];
    (M.roads || []).forEach((rd, ri) => {
      if (!(rd.kind === 'citta' || rd.kind === 'litoranea' || rd.kind === 'vicolo')) return;
      const P = rd.pts, offs = rd.kind === 'vicolo' ? [rd.w / 2 - .15] : [rd.w / 2 + .12, rd.w / 2 + 2.0];
      let acc = 0;
      for (let k = 0; k < P.length - 1; k++) { const [ax, az] = P[k], [bx, bz] = P[k + 1], L = Math.hypot(bx - ax, bz - az) || 1, nx = -(bz - az) / L, nz = (bx - ax) / L;
        for (let s = 0; s < L; s += .9) { acc += .9; const x0 = ax + (bx - ax) * s / L, z0 = az + (bz - az) * s / L; if (x0 < X0 - 3 || x0 >= X1 + 3 || z0 < Y0 - 3 || z0 >= Y1 + 3) continue;
          offs.forEach((o, oi) => [-1, 1].forEach(sd => {
            const x = x0 + nx * sd * o, z = z0 + nz * sd * o; if (x < X0 || x >= X1 || z < Y0 || z >= Y1) return;
            const wild = vnz(x / 14, z / 14) + .5, h = th(Math.round(x * 3), Math.round(z * 3), 381 + oi); if (h > .12 + wild * .55) return;
            if (zoneT(Math.floor(x / TS), Math.floor(z / TS)) !== ZN.CITTA || gT(Math.floor(x / TS), Math.floor(z / TS)) === G.T.BLD || nearJ(x, z, 1)) return;
            const q = th(Math.round(x * 5), Math.round(z * 5), 382), r = rng((Math.round(x * 31) ^ Math.round(z * 17)) >>> 0);
            add(q < .45 ? 'Grass_Wispy_Short' : q < .75 ? 'Grass_Common_Tall' : q < .9 ? 'Plant_1' : 'Fern_1', x + (r() - .5) * .3, 0, z + (r() - .5) * .3, q < .45 ? .7 + r() * .5 : q < .75 ? .35 + r() * .35 + wild * .25 : q < .9 ? .3 + r() * .2 : .22 + r() * .12, r() * 6.28, { ground: true, col: pick(r, LEAF) });
          })); } }
    });
  }

  // ---- gli incroci: paletti sugli angoli del marciapiede, il tombino in mezzo, le caditoie sul ciglio, le erbacce negli angoli ----
  function incroci38() {
    const r = rng(3838); let n = 0;
    const city = (x, z) => zoneT(Math.floor(x / TS), Math.floor(z / TS)) === ZN.CITTA;
    const iron = sm('#2a2a2e', { roughness: .7, metalness: .4 }), conc = sm('#77736c', { roughness: 1 }), grate = sm('#1c1b1e', { roughness: .6, metalness: .5 });
    const tombino = (x, z, rr) => { const g = G0(); add(g, cyl(rr, rr, .03, 14, grate), 0, .015, 0); add(g, cyl(rr * .7, rr * .7, .035, 14, iron), 0, .02, 0); DZ.hint = 'static'; place(g, x, z, r() * 6); n++; };
    junctions().forEach(([jx, jy, jr]) => {
      if (!city(jx, jy)) return; const arms = armsAt(jx, jy, jr); if (arms.length < 2) return;
      tombino(jx + (r() - .5) * 2, jy + (r() - .5) * 2, .36);
      for (let i = 0; i < arms.length; i++) for (let j = 0; j < arms.length; j++) {
        if (i === j) continue; const a = arms[i], b = arms[j], cr = a.ux * b.uy - a.uy * b.ux; if (cr <= 0 || a.ux * b.ux + a.uy * b.uy > .7) continue;   // due bracci vicini, in senso orario
        // l'angolo fra i due bracci: sul marciapiede, appena dentro il ciglio
        let bx = a.ux + b.ux, by = a.uy + b.uy; const L = Math.hypot(bx, by) || 1; bx /= L; by /= L;
        const ca = a.ux * b.ux + a.uy * b.uy, sinH = Math.sqrt(Math.max(.08, (1 - ca) / 2)), dd = (Math.max(a.w, b.w) / 2 + .7) / sinH, cx = jx + bx * dd, cz = jy + by * dd;
        if (swH(cx, cz) < .1) continue;
        [-.9, 0, .9].forEach((o, q) => { if (q === 1 && r() < .5) return; const px = cx - by * o, pz = cz + bx * o; if (swH(px, pz) < .1) return; bollard(px, pz); n++; });
        const g = G0(); add(g, box(.62, .02, .32, grate), 0, .01, 0); for (let k = -2; k <= 2; k++) add(g, box(.04, .025, .3, iron), k * .12, .015, 0);
        const gx = jx + a.ux * (jr + 2) - a.uy * (a.w / 2 - .25), gz = jy + a.uy * (jr + 2) + a.ux * (a.w / 2 - .25); DZ.hint = 'static'; place(g, gx, gz, Math.atan2(a.ux, a.uy)); n++;
      }
    });
    // caditoie lungo i cordoli delle vie larghe, ogni 20-30 m
    (M.roads || []).filter(rd => rd.kind === 'citta' || rd.kind === 'litoranea').forEach((rd, ri) => {
      let acc = 0, next = 12 + r() * 10; const P = rd.pts;
      for (let k = 0; k < P.length - 1; k++) { const [ax, az] = P[k], [bx, bz] = P[k + 1], L = Math.hypot(bx - ax, bz - az) || 1; acc += L; if (acc < next) continue; acc = 0; next = 20 + r() * 12;
        const nx = -(bz - az) / L, nz = (bx - ax) / L, sd = r() < .5 ? 1 : -1, x = ax + nx * sd * (rd.w / 2 - .25), z = az + nz * sd * (rd.w / 2 - .25); if (!city(x, z) || nearJ(x, z, 2)) continue;
        const g = G0(); add(g, box(.62, .02, .32, grate), 0, .01, 0); for (let q = -2; q <= 2; q++) add(g, box(.04, .025, .3, iron), q * .12, .015, 0); DZ.hint = 'static'; place(g, x, z, Math.atan2(bx - ax, bz - az) + Math.PI / 2); n++;
        if (r() < .4) tombino(ax + (bx - ax) * .5 + nx * sd * rd.w * .2, az + (bz - az) * .5 + nz * sd * rd.w * .2, .32); }
    });
    return n;
  }
