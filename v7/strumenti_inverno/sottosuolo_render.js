  // ================= [monte] SOTTO TERRA E SOPRA IL VUOTO =================
  // Sotto terra: la superficie sparisce, restano i cunicoli scavati (pavimento, pareti di terra o di roccia, puntelli),
  // le stanze col loro arredo, la lanterna. In superficie: le botole, gli imbocchi nelle pareti, i pozzi delle grotte, il Ponte del Diavolo.
  const UGR = { key: null, grp: null, lights: [], prev: null, surf: null, surfRev: -1, lantern: null };
  const ugMats = {};
  const ugM = (c, o) => ugMats[c + JSON.stringify(o || {})] || (ugMats[c + JSON.stringify(o || {})] = new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 1, metalness: 0, flatShading: true }, o || {})));
  function ugTex(kind) {
    if (ugMats['tex' + kind]) return ugMats['tex' + kind];
    const c = mk(32, 32), x = c.getContext('2d'), r = rng(kind === 'roccia' ? 77 : 78);
    x.fillStyle = kind === 'roccia' ? '#5a5652' : '#4a3a2c'; x.fillRect(0, 0, 32, 32);
    for (let i = 0; i < 160; i++) { x.fillStyle = kind === 'roccia' ? pick(r, ['#6a6662', '#4a4642', '#76706a', '#3e3a38']) : pick(r, ['#5a4634', '#3e3024', '#664e3a', '#2e241c', '#7a6a58']); x.fillRect(Math.floor(r() * 32), Math.floor(r() * 32), 1 + Math.floor(r() * 3), 1 + Math.floor(r() * 2)); }
    if (kind === 'roccia') for (let k = 0; k < 5; k++) { x.fillStyle = 'rgba(20,18,18,.5)'; x.fillRect(0, Math.floor(r() * 32), 32, 1); }
    const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return (ugMats['tex' + kind] = new THREE.MeshStandardMaterial({ map: t, roughness: 1, metalness: 0 }));
  }
  // il toro inciso nella Grotta del Romito, e l'affresco sbiadito dell'eremo
  function ugPicture(kind) {
    const c = mk(64, 40), x = c.getContext('2d'); x.fillStyle = kind === 'toro' ? '#6e6862' : '#8a7e6a'; x.fillRect(0, 0, 64, 40);
    if (kind === 'toro') {
      x.strokeStyle = '#e8e2d6'; x.lineWidth = 1.4; x.beginPath();
      x.moveTo(10, 22); x.bezierCurveTo(14, 12, 30, 10, 44, 13); x.bezierCurveTo(50, 12, 54, 14, 55, 18); x.lineTo(58, 16); x.moveTo(55, 18); x.lineTo(56, 24); x.lineTo(50, 26);
      x.bezierCurveTo(44, 27, 30, 28, 18, 27); x.lineTo(16, 34); x.moveTo(22, 27); x.lineTo(21, 35); x.moveTo(42, 27); x.lineTo(43, 35); x.moveTo(48, 26); x.lineTo(50, 34);
      x.moveTo(10, 22); x.lineTo(6, 28); x.moveTo(52, 15); x.quadraticCurveTo(56, 6, 62, 8); x.moveTo(50, 14); x.quadraticCurveTo(50, 7, 55, 4); x.stroke();
      x.strokeStyle = 'rgba(232,226,214,.35)'; x.beginPath(); x.moveTo(26, 15); x.lineTo(30, 24); x.moveTo(34, 14); x.lineTo(36, 23); x.stroke();
    } else {
      x.fillStyle = '#5a6a8a'; x.fillRect(18, 4, 28, 34); x.fillStyle = '#d8c070'; x.beginPath(); x.arc(32, 12, 6, 0, 6.3); x.fill();
      x.fillStyle = '#c8a888'; x.beginPath(); x.arc(32, 13, 3.4, 0, 6.3); x.fill(); x.fillStyle = '#8a3a2a'; x.fillRect(26, 18, 12, 18);
      x.fillStyle = 'rgba(138,126,106,.55)'; for (let i = 0; i < 40; i++) x.fillRect(Math.random() * 64, Math.random() * 40, 3, 2);
    }
    const t = new THREE.CanvasTexture(c); t.magFilter = THREE.LinearFilter; return new THREE.MeshBasicMaterial({ map: t, transparent: kind === 'toro', opacity: 1 });
  }
  function buildUG(L) {
    const grp = new THREE.Group(), GWd = G.GW, T = G.T, has = (tx, ty) => tx >= 0 && ty >= 0 && tx < G.GW && ty < G.GH && L.ug[ty * GWd + tx] > 0;
    const quad = [];   // pavimento: una lastra per casella, inclinata coi vicini
    const floorV = (tx, ty, cx, cy) => { let s = 0, c = 0; for (const [a, b] of [[tx + cx - 1, ty + cy - 1], [tx + cx, ty + cy - 1], [tx + cx - 1, ty + cy], [tx + cx, ty + cy]]) if (has(a, b)) { s += L.fl[b * GWd + a]; c++; } return c ? s / c : L.fl[ty * GWd + tx]; };
    const fpos = [], fuv = [], wposR = [], wposT = [], wuvR = [], wuvT = [];
    const wallQuad = (arr, uv, x0, z0, x1, z1, y0, y1) => { arr.push(x0, y0, z0, x1, y0, z1, x1, y1, z1, x0, y0, z0, x1, y1, z1, x0, y1, z0); const L2 = Math.hypot(x1 - x0, z1 - z0) / 2, H2 = (y1 - y0) / 2; uv.push(0, 0, L2, 0, L2, H2, 0, 0, L2, H2, 0, H2); };
    const props = [], rocks = [];
    for (let ty = 0; ty < G.GH; ty++) for (let tx = 0; tx < G.GW; tx++) {
      const i = ty * GWd + tx; if (!L.ug[i]) continue;
      const x0 = tx * TS, z0 = ty * TS, x1 = x0 + TS, z1 = z0 + TS, h00 = floorV(tx, ty, 0, 0), h10 = floorV(tx, ty, 1, 0), h01 = floorV(tx, ty, 0, 1), h11 = floorV(tx, ty, 1, 1);
      fpos.push(x0, h00, z0, x0, h01, z1, x1, h11, z1, x0, h00, z0, x1, h11, z1, x1, h10, z0); fuv.push(0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0);
      const rockK = (gT(tx, ty) === T.ROCK || gT(tx, ty) === T.CLIFF || L.kind[i] === 1), arr = rockK ? wposR : wposT, uv = rockK ? wuvR : wuvT, f = L.fl[i];
      // pareti dove finisce lo scavo; quelle verso la camera sono basse (si vede dentro)
      const cy2 = Math.cos(cam.yaw), sy2 = Math.sin(cam.yaw);
      [[0, -1, x0, z0, x1, z0], [0, 1, x1, z1, x0, z1], [-1, 0, x0, z1, x0, z0], [1, 0, x1, z0, x1, z1]].forEach(([dx, dy, a, b, c2, d]) => {
        if (has(tx + dx, ty + dy)) return; const P = L.portals.find(P => P.kind === 'imbocco' && P.u[0] === tx && P.u[1] === ty && P.s[0] === tx + dx && P.s[1] === ty + dy); if (P) return;
        const toCam = dx * sy2 + dy * cy2 > .3, top = f + (toCam ? .55 : 2.7);
        wallQuad(arr, uv, a, b, c2, d, f - .2, top);
        if (!toCam && hash2i(tx * 3 + dx, ty * 3 + dy) < .35) rocks.push([(a + c2) / 2 - dx * .2, f + .3, (b + d) / 2 - dy * .2]);
      });
      // puntelli di legno nei cunicoli scavati a mano, ogni tanto
      if (L.kind[i] === 2 && (tx + ty) % 3 === 0) props.push([x0 + 1, f, z0 + 1]);
    }
    const mkGeo = (pos, uv) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals(); return g; };
    if (fpos.length) { const m = new THREE.Mesh(mkGeo(fpos, fuv), ugTex('terra')); m.receiveShadow = true; grp.add(m); }
    if (wposT.length) { const m = new THREE.Mesh(mkGeo(wposT, wuvT), ugTex('terra')); m.material.side = THREE.DoubleSide; grp.add(m); }
    if (wposR.length) { const m = new THREE.Mesh(mkGeo(wposR, wuvR), ugTex('roccia')); m.material.side = THREE.DoubleSide; grp.add(m); }
    const wood = ugM('#6a4a30');
    props.forEach(([x, y, z]) => { const g = new THREE.Group(); [[-.85, 0], [.85, 0]].forEach(([dx]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(.16, 2.3, .16), wood); b.position.set(dx, 1.15, 0); g.add(b); }); const t = new THREE.Mesh(new THREE.BoxGeometry(1.9, .16, .2), wood); t.position.y = 2.3; g.add(t); g.position.set(x, y, z); g.rotation.y = hash2i(x, z) < .5 ? 0 : Math.PI / 2; grp.add(g); });
    rocks.forEach(([x, y, z]) => { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(.35 + hash2i(x, z) * .3, 0), ugM('#55504a')); m.position.set(x, y - .1, z); grp.add(m); });
    // scale nei pozzi e nelle botole
    L.portals.forEach(P => {
      if (P.kind !== 'botola' && P.kind !== 'pozzo') return; const i = P.u[1] * GWd + P.u[0], f = L.fl[i], top = M.elev[i] + .2, x = (P.u[0] + .5) * TS, z = (P.u[1] + .25) * TS;
      const g = new THREE.Group(); [-.3, .3].forEach(dx => { const b = new THREE.Mesh(new THREE.BoxGeometry(.08, top - f, .08), wood); b.position.set(dx, (top - f) / 2, 0); g.add(b); });
      for (let y = .3; y < top - f; y += .35) { const s = new THREE.Mesh(new THREE.BoxGeometry(.6, .05, .06), wood); s.position.set(0, y, 0); g.add(s); }
      g.position.set(x, f, z); grp.add(g);
      const sh = new THREE.Mesh(new THREE.CylinderGeometry(.9, .9, top - f + .2, 10, 1, true), ugM('#2a2420', { side: THREE.BackSide })); sh.position.set(x, (top + f) / 2, z + .3); grp.add(sh);
    });
    // stanze: arredo secondo cosa sono
    L.rooms.forEach(R => {
      const g = new THREE.Group(); g.position.set(R.x, R.f, R.y);
      if (R.deco === 'toro' || R.deco === 'eremo') {
        const pic = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.5), ugPicture(R.deco)); pic.position.set(0, 1.4, -1.85); g.add(pic);
        if (R.deco === 'eremo') { const alt = new THREE.Mesh(new THREE.BoxGeometry(1.4, .9, .6), ugM('#8a8276')); alt.position.set(0, .45, -1.4); g.add(alt); for (let k = 0; k < 5; k++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, .22, 6), new THREE.MeshBasicMaterial({ color: '#f0e6c8' })); c.position.set(-.5 + k * .25, 1, -1.35); g.add(c); } const cr = new THREE.Mesh(new THREE.BoxGeometry(.06, .7, .06), wood); cr.position.set(0, 2.4, -1.8); g.add(cr); const cr2 = new THREE.Mesh(new THREE.BoxGeometry(.4, .06, .06), wood); cr2.position.set(0, 2.55, -1.8); g.add(cr2); }
        else { for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.DodecahedronGeometry(.25, 0), ugM('#d8d0c0')); b.position.set(-.8 + k * .5, .1, -.6 + k * .2); b.scale.set(1, .4, 2); g.add(b); } }
        UGR.lights.push([R.x, R.f + 1.6, R.y, R.deco === 'eremo' ? '#ffb060' : '#9ab0d0']);
      } else if (R.deco === 'covo') {
        const cot = new THREE.Mesh(new THREE.BoxGeometry(.8, .4, 1.9), ugM('#5a5a3a')); cot.position.set(-1.6, .2, 0); g.add(cot);
        const box = new THREE.Mesh(new THREE.BoxGeometry(.9, .6, .6), wood); box.position.set(1.5, .3, -1.4); g.add(box);
        const tb = new THREE.Mesh(new THREE.BoxGeometry(1, .08, .7), wood); tb.position.set(1.4, .75, .9); g.add(tb);
        UGR.lights.push([R.x + 1.4, R.f + 1.2, R.y + .9, '#ffb060']);
      }
      grp.add(g);
    });
    return grp;
  }
  const hash2i = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
  // il passaggio sotto terra: come per gli interni, si nasconde il mondo di sopra e si accende la lanterna
  function ugPass(st) {
    const p = st.player, L = st.lv, on = !!(p.lv && p.lv.k === 'ug' && L);
    const key = on ? L.rev + ':' + (Math.round(((cam.yaw % 6.2832) + 6.2832) % 6.2832 / (Math.PI / 2)) & 3) : null;
    if (key !== UGR.key) {
      if (UGR.grp) { scene.remove(UGR.grp); UGR.grp.traverse(o => { if (o.geometry) o.geometry.dispose(); }); UGR.grp = null; }
      UGR.lights.length = 0; if (UGR.lightObjs) UGR.lightObjs.forEach(l => scene.remove(l)); UGR.lightObjs = [];
      UGR.key = key;
      if (on) { UGR.grp = buildUG(L); scene.add(UGR.grp); UGR.lightObjs = UGR.lights.map(([x, y, z, c]) => { const l = new THREE.PointLight(c, 1.4, 9, 1.6); l.position.set(x, y, z); scene.add(l); return l; }); }
      else if (UGR.was) scene.children.forEach(o => { if (o.userData.__hidUG) { o.visible = true; o.userData.__hidUG = false; } });
    }
    UGR.was = on;
    if (!UGR.lantern) { UGR.lantern = new THREE.PointLight('#ffc070', 0, 11, 1.5); scene.add(UGR.lantern); }
    if (!on) { UGR.lantern.intensity = 0; return false; }
    hemi.intensity *= .12; moon.intensity *= .05; fillAmb.intensity *= .25;
    const pg = dyn.people.__player, h = Livelli.heightOf(st, p);
    UGR.lantern.position.set(p.x + Math.cos(p.face) * .4, h + 1.7, p.y + Math.sin(p.face) * .4); UGR.lantern.intensity = 1.6 + Math.sin(st.clock * 9) * .06;
    scene.children.forEach(o => { if (o === UGR.grp || o === pg || o === UGR.lantern || UGR.lightObjs.includes(o)) return; if (o.isLight && o !== moon && o !== hemi && o !== fillAmb) { if (o.visible) { o.visible = false; o.userData.__hidUG = true; } return; } if (o.isLight) return; if (o.visible) { o.visible = false; o.userData.__hidUG = true; } });
    UGR.grp.visible = true; if (pg) pg.visible = true;
    return true;
  }
  // in superficie: botole, imbocchi, pozzi (si rifanno quando cambia lo scavo) e il Ponte del Diavolo (una volta sola)
  function surfacePortals(st) {
    const L = st.lv; if (!L || L.rev === UGR.surfRev) return; UGR.surfRev = L.rev;
    if (UGR.surf) { scene.remove(UGR.surf); UGR.surf.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
    const g = new THREE.Group(), wood = ugM('#6a4a30'), dark = new THREE.MeshBasicMaterial({ color: '#050404' }), rockM = ugM('#6a6460');
    L.portals.forEach(P => {
      const [sx, sy] = P.s, cx = (sx + .5) * TS, cz = (sy + .5) * TS;
      if (P.kind === 'botola') { const y = groundH(cx, cz); const h = new THREE.Group(); for (let k = 0; k < 4; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.3, .07, .3), wood); b.position.set(0, .04, -.48 + k * .32); h.add(b); } const ring = new THREE.Mesh(new THREE.TorusGeometry(.12, .025, 4, 8), ugM('#3a3a3a', { metalness: .6 })); ring.rotation.x = Math.PI / 2; ring.position.set(.4, .09, 0); h.add(ring); const sn = new THREE.Mesh(new THREE.BoxGeometry(.9, .03, .7), ugM('#dfe3e8')); sn.position.set(-.15, .09, .1); h.add(sn); h.position.set(cx, y, cz); h.rotation.y = hash2i(sx, sy) * 6; g.add(h); }
      else if (P.kind === 'pozzo') { const y = groundH(cx, cz); for (let k = 0; k < 9; k++) { const a = k / 9 * 6.28, s = new THREE.Mesh(new THREE.DodecahedronGeometry(.32, 0), rockM); s.position.set(cx + Math.cos(a) * .95, y + .15, cz + Math.sin(a) * .95); g.add(s); } const hole = new THREE.Mesh(new THREE.CircleGeometry(.8, 12), dark); hole.rotation.x = -Math.PI / 2; hole.position.set(cx, y + .05, cz); g.add(hole); const lt = new THREE.Group(); [-.3, .3].forEach(dx => { const b = new THREE.Mesh(new THREE.BoxGeometry(.07, 1.2, .07), wood); b.position.set(dx, .5, 0); lt.add(b); }); lt.position.set(cx, y, cz - .5); g.add(lt); }
      else if (P.kind === 'imbocco') {
        const [ux, uy] = P.u, dx = ux - sx, dy = uy - sy, ex = (sx + .5 + dx * .5) * TS, ez = (sy + .5 + dy * .5) * TS, y = M.elev[sy * G.GW + sx];
        const m = new THREE.Group(); m.position.set(ex - dx * .15, y, ez - dy * .15); m.rotation.y = Math.atan2(-dx, -dy);
        const hole = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.2), dark); hole.position.set(0, 1.1, -.02); m.add(hole);
        if (P.nat) { for (let k = 0; k < 7; k++) { const a = k / 6 * Math.PI, s = new THREE.Mesh(new THREE.DodecahedronGeometry(.45 + hash2i(k, sx) * .3, 0), rockM); s.position.set(Math.cos(a) * 1.15, Math.sin(a) * 1.5 + .4, .1); m.add(s); } }
        else { [[-.85, 1.15], [.85, 1.15]].forEach(([x, yy]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(.18, 2.3, .18), wood); b.position.set(x, yy, .05); m.add(b); }); const t = new THREE.Mesh(new THREE.BoxGeometry(2, .2, .22), wood); t.position.set(0, 2.3, .05); m.add(t); }
        g.add(m);
      }
    });
    scene.add(g); UGR.surf = g;
  }
  function buildBridges() {
    const W0 = M.world; if (!W0 || !W0.BRIDGES || typeof Livelli === 'undefined') return;
    const wood = sm('#6a4c34', { roughness: 1 }), woodD = sm('#4a3424', { roughness: 1 }), rope = sm('#8a7a5a', { roughness: 1 }), snow = sm('#dde2e8', { roughness: 1 });
    Livelli.BR.forEach(B => {
      const g = new THREE.Group(), n = Math.ceil(B.len / .45), ang = Math.atan2(B.uy, B.ux), px = -B.uy, pz = B.ux;
      for (let k = 0; k <= n; k++) {
        const t = k / n, x = B.a[0] + B.ux * B.len * t, z = B.a[1] + B.uy * B.len * t, y = Livelli.deckH(B, t) - .08;
        const pl = new THREE.Mesh(new THREE.BoxGeometry(.32, .07, B.w + .2), hash2i(k, 3) < .15 ? woodD : wood); pl.position.set(x, y, z); pl.rotation.y = -ang; pl.rotation.x = (hash2i(k, 5) - .5) * .06; g.add(pl);
        if (hash2i(k, 7) < .5) { const sn = new THREE.Mesh(new THREE.BoxGeometry(.3, .03, B.w * .6), snow); sn.position.set(x, y + .05, z + (hash2i(k, 9) - .5) * .4); sn.rotation.y = -ang; g.add(sn); }
        if (k % 4 === 0) [-1, 1].forEach(sd => { const post = new THREE.Mesh(new THREE.BoxGeometry(.08, 1.05, .08), woodD); post.position.set(x + px * sd * (B.w / 2 + .05), y + .52, z + pz * sd * (B.w / 2 + .05)); g.add(post); });
      }
      // corrimano di corda: segue il ponte con la sua curva
      [-1, 1].forEach(sd => { for (const hh of [1.02, .6]) { const pts = []; for (let k = 0; k <= 24; k++) { const t = k / 24; pts.push(new THREE.Vector3(B.a[0] + B.ux * B.len * t + px * sd * (B.w / 2 + .05), Livelli.deckH(B, t) + hh, B.a[1] + B.uy * B.len * t + pz * sd * (B.w / 2 + .05))); } const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, .03, 4), rope); g.add(tube); } });
      // le ancore ai due capi
      [[B.a, -1], [B.b, 1]].forEach(([q, s2]) => [-1, 1].forEach(sd => { const y = groundH(q[0], q[1]); const st2 = new THREE.Mesh(new THREE.BoxGeometry(.3, 1.6, .3), woodD); st2.position.set(q[0] + px * sd * (B.w / 2 + .2) - B.ux * s2 * .2, y + .8, q[1] + pz * sd * (B.w / 2 + .2) - B.uy * s2 * .2); g.add(st2); }));
      g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      scene.add(g);
    });
  }
