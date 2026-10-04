  // ================= [monte] IL BOSCO VERO: modelli del kit Natura (Quaternius, CC0) =================
  // Vicino alla camera ogni casella d'albero diventa un albero-modello (pini larici, lecci e ulivi contorti, castagni e faggi spogli),
  // le pareti si coprono di massi, la fiumara di ciottoli, le terrazze di muri a secco. Lontano restano gli alberi semplici.
  // Ogni albero sta su una casella TREE: si abbatte e resta il ceppo.
  const NAT = { ok: false, models: {}, mats: {} };
  // le chiome tra la camera e il giocatore si aprono (retinatura): il giocatore nel bosco si vede sempre
  const NATU = { pl: { value: new THREE.Vector3(0, -999, 0) }, cm: { value: new THREE.Vector3(0, 100, 0) } };
  function natMat(map, leafy, tint) {
    const k = (map ? map.uuid : 'x') + (leafy ? 'L' : 'B') + (tint || ''); if (NAT.mats[k]) return NAT.mats[k];
    if (map) { map.magFilter = THREE.LinearFilter; map.minFilter = THREE.LinearMipmapLinearFilter; map.generateMipmaps = true; map.needsUpdate = true; }
    const m = new THREE.MeshLambertMaterial({ map, color: tint || '#ffffff', alphaTest: leafy ? .5 : 0, side: leafy ? THREE.DoubleSide : THREE.FrontSide });
    m.onBeforeCompile = sh => {
      sh.uniforms.vTime = VEGU.time; sh.uniforms.uPl = NATU.pl; sh.uniforms.uCm = NATU.cm;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aSnow; attribute float aSway; uniform float vTime; varying float vSnow; varying vec3 vWP;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          vSnow = aSnow;
          float ph = instanceMatrix[3].x * .37 + instanceMatrix[3].z * .29;
          transformed.x += (sin(vTime * 1.3 + ph) * .05 + sin(vTime * 3.1 + ph * 2.) * .014) * aSway;
          transformed.z += cos(vTime * 1.1 + ph) * .04 * aSway;`).replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
          vWP = (modelMatrix * instanceMatrix * vec4(transformed, 1.)).xyz;`);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vSnow; varying vec3 vWP; uniform vec3 uPl; uniform vec3 uCm;')
        .replace('#include <color_fragment>', `#include <color_fragment>
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.86, .89, .94), clamp(vSnow, 0., 1.) * .6);
          { vec3 ab = uCm - uPl; float t = clamp(dot(vWP - uPl, ab) / dot(ab, ab), 0., 1.); float d = length(vWP - (uPl + ab * t));
            float open = (1. - smoothstep(1.6, 3.4, d)) * step(.04, t) * step(vWP.y, uPl.y + 30.) * step(uPl.y + .9, vWP.y);
            vec2 q = floor(gl_FragCoord.xy); float dth = fract(sin(dot(q, vec2(12.9898, 78.233))) * 43758.5453);
            if (open > dth * .9 + .1) discard; }`);
    };
    NAT.mats[k] = m; return m;
  }
  // un modello del kit -> pezzi (geometria nello spazio del modello + materiale), con neve sulle facce in su e ondeggiare in alto
  function natModel(name, snowK) {
    if (NAT.models[name] !== undefined) return NAT.models[name];
    if (name === '__ceppo') { const bark = natModel('Pine_1'); const geo = new THREE.CylinderGeometry(.28, .38, .5, 9); geo.translate(0, .25, 0); const top = new THREE.CircleGeometry(.28, 9); top.rotateX(-Math.PI / 2); top.translate(0, .5, 0);
      const mkp = (g, mat) => { const c = g.attributes.position.count; g.setAttribute('aSnow', new THREE.BufferAttribute(new Float32Array(c), 1)); g.setAttribute('aSway', new THREE.BufferAttribute(new Float32Array(c), 1)); return { geo: g, mat }; };
      return (NAT.models[name] = { parts: [mkp(geo, bark ? bark.parts.find(q => !q.leafy).mat : natMat(null, false, '#6a5040')), mkp(top, natMat(null, false, '#d8b888'))], top: .5 }); }
    if (typeof Kit === 'undefined' || !Kit.has || !Kit.has('natura/' + name)) return (NAT.models[name] = null);
    const g = Kit.get('natura/' + name); g.updateMatrixWorld(true); const parts = []; let top = 0;
    g.traverse(o => { if (!o.isMesh) return; const geo = o.geometry.clone(); geo.applyMatrix4(o.matrixWorld); geo.computeBoundingBox(); top = Math.max(top, geo.boundingBox.max.y); parts.push({ geo, src: o.material }); });
    parts.forEach(p => {
      const geo = p.geo, n = geo.attributes.normal, pos = geo.attributes.position, cnt = pos.count, sn = new Float32Array(cnt), sw = new Float32Array(cnt);
      const leafy = !!(p.src && p.src.map && /Lea|Leaf|Grass/i.test((p.src.name || '') + (p.src.map.name || '')));
      for (let i = 0; i < cnt; i++) { const ny = n ? n.getY(i) : 1, y = pos.getY(i); sn[i] = Math.max(0, ny - .55) * 1.4 * (snowK === undefined ? 1 : snowK) * (leafy ? .25 + .35 * (y / (top || 1)) : .8); sw[i] = Math.max(0, y - top * .35) / (top || 1) * (leafy ? 1.6 : .6); }
      geo.setAttribute('aSnow', new THREE.BufferAttribute(sn, 1)); geo.setAttribute('aSway', new THREE.BufferAttribute(sw, 1));
      p.leafy = leafy; p.mat = natMat(p.src && p.src.map, leafy);
    });
    return (NAT.models[name] = { parts, top });
  }
  // scelta dell'albero per la casella: quota, segni del terreno, zona
  const NM = { pine: ['Pine_1', 'Pine_2', 'Pine_3', 'Pine_4', 'Pine_5'], oak: ['CommonTree_1', 'CommonTree_2', 'CommonTree_3', 'CommonTree_4', 'CommonTree_5'], olive: ['TwistedTree_1', 'TwistedTree_2', 'TwistedTree_3', 'TwistedTree_4', 'TwistedTree_5'], bare: ['DeadTree_1', 'DeadTree_2', 'DeadTree_3', 'DeadTree_4', 'DeadTree_5'] };
  function natTree(tx, ty, r) {
    const W0 = M.world, i = ty * G.GW + tx, f = W0 && W0.feat ? W0.feat[i] : 0, MF = (W0 && W0.MF) || {}, e = M.elev[i], z = zoneT(tx, ty), q = r();
    if (f & MF.TERR) return [pick(r, NM.olive), .3 + r() * .1];
    if (f & MF.ALTO) return q < .82 ? [pick(r, NM.pine), .8 + r() * .35] : [pick(r, NM.bare), .42 + r() * .12];
    if (e > 24) return q < .55 ? [pick(r, NM.bare), .34 + r() * .1] : ['Pine_5', .7 + r() * .2];
    if (z === ZN.DESERTO) return [pick(r, NM.bare), .3 + r() * .1];
    if (z === ZN.CITTA) return [pick(r, NM.oak), .62 + r() * .15];
    if (e < 5) return q < .45 ? [pick(r, NM.olive), .28 + r() * .1] : q < .8 ? [pick(r, NM.oak), .62 + r() * .2] : [pick(r, NM.pine), .8 + r() * .3];
    if (e < 15) return q < .38 ? [pick(r, NM.oak), .66 + r() * .22] : q < .72 ? [pick(r, NM.bare), .4 + r() * .14] : [pick(r, NM.pine), .85 + r() * .3];
    return q < .55 ? [pick(r, NM.pine), .85 + r() * .35] : q < .85 ? [pick(r, NM.bare), .42 + r() * .12] : [pick(r, NM.oak), .7 + r() * .2];
  }
  const nM4 = new THREE.Matrix4(), nQ = new THREE.Quaternion(), nE = new THREE.Euler(), nV = new THREE.Vector3(), nS = new THREE.Vector3(), nC = new THREE.Color();
  function buildNat(tx0, ty0, n, m) {
    const grp = new THREE.Group(); grp.name = 'nat';
    if (typeof Kit === 'undefined' || !Kit.has || !Kit.has('natura/Pine_1')) return grp;
    const T = G.T, W0 = M.world, F = W0 && W0.feat, MF = (W0 && W0.MF) || {}, orig = W0 && W0.grid;
    const B = new Map();   // nome -> [{x,y,z,s,ry,rx,rz,sy,col}]
    const add = (name, x, y, z, s, ry, o) => { if (!natModel(name)) return; let a = B.get(name); if (!a) B.set(name, a = []); a.push(Object.assign({ x, y, z, s, ry, rx: 0, rz: 0, sy: 1, col: null }, o || {})); };
    const STONE = ['#8a8680', '#7c7872', '#9a948a', '#6e6a66'];
    // composizione come in un bosco vero: macchie fitte e radure, sottobosco ai piedi degli alberi, margini morbidi,
    // massi con le felci attorno, ciottoli ai bordi dei sentieri, funghi sotto gli alberi secchi
    const isT = (a, b) => gT(a, b) === T.TREE, nearT = (a, b) => { let c = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && isT(a + dx, b + dy)) c++; return c; };
    const isTrail = (a, b) => { if (a < 0 || b < 0 || a >= G.GW || b >= G.GH) return false; const k = b * G.GW + a; return RW[k] > 0 && gT(a, b) === T.DIRT; };
    const thick = (x, z) => .5 + vnz(x / 26, z / 26) * .7 + vnz(x / 9, z / 9) * .3;   // 0..1: quanto è fitta la macchia qui
    const LEAF = ['#e8f0e0', '#f4f2e4', '#e0ead8', '#fff8e8'], ROCKC = ['#a8a8a2', '#9c9c96', '#b4b2aa'];
    for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) {
      const tx = tx0 + i, ty = ty0 + j, ii = ty * G.GW + tx, v = gT(tx, ty), f = F ? F[ii] : 0, r = rng((tx * 50411 + ty * 81239) >>> 0);
      const cx = tx * TS + .6 + r() * .8, cz = ty * TS + .6 + r() * .8, th = thick(tx * TS, ty * TS), nt = nearT(tx, ty);
      const under = (x, z, s0) => { const q = r(); add(q < .45 ? 'Fern_1' : q < .75 ? 'Bush_Common' : q < .9 ? 'Grass_Wispy_Tall' : 'Plant_1_Big', x, 0, z, s0 * (q < .45 ? .32 : q < .75 ? .55 : .9), r() * 6.28, { ground: true, col: pick(r, LEAF) }); };
      if (v === T.TREE) {
        const [name, s] = natTree(tx, ty, r), big = (th > .55 ? 1.05 : th < .35 ? .82 : .94) * .78;
        add(name, cx, groundH(cx, cz) - .15, cz, s * big * (.9 + r() * .2), r() * 6.28, { rx: (r() - .5) * .06, rz: (r() - .5) * .06, col: pick(r, LEAF) });
        const k = (th > .5 ? 2 : 1) + (nt < 5 ? 1 : 0); for (let q = 0; q < k; q++) if (r() < .55) under(tx * TS + r() * 2, ty * TS + r() * 2, .8 + r() * .5);
        if (/DeadTree/.test(name) && r() < .45) for (let q = 0; q < 3; q++) add(r() < .7 ? 'Mushroom_Common' : 'Mushroom_Laetiporus', cx + (r() - .5) * 1.2, 0, cz + (r() - .5) * 1.2, .5 + r() * .5, r() * 6.28, { ground: true, col: '#f0e8dc' });
      } else if (orig && orig[ii] === T.TREE) {
        add('__ceppo', cx, groundH(cx, cz) - .05, cz, 1, r() * 6.28, { col: '#c8b8a0' });
        if (r() < .5) add('Bush_Common', tx * TS + r() * 2, 0, ty * TS + r() * 2, .4, r() * 6.28, { ground: true, col: pick(r, LEAF) });
      } else if (v === T.CLIFF) {
        if (f & 512) continue;
        if (r() < .2) { const x = tx * TS + .4 + r() * 1.2, z = ty * TS + .4 + r() * 1.2, s = .4 + r() * .35; add('Rock_Medium_' + (1 + Math.floor(r() * 3)), x, groundH(x, z) - .6 * s, z, s, r() * 6.28, { sy: 1 + r() * .5, col: pick(r, ROCKC) }); }
      } else if (v === T.ROCK) {
        if (f & MF.DITA) { for (let q = 0; q < 2; q++) { const x = tx * TS + .4 + r() * 1.2, z = ty * TS + .4 + r() * 1.2, s = .8 + r() * .5; add('Rock_Medium_' + (1 + Math.floor(r() * 3)), x, groundH(x, z) - 1.2 * s, z, s, r() * 6.28, { sy: 1.6 + r(), col: pick(r, ['#c89a80', '#b88a70', '#d0a688']) }); } }
        else if (r() < .14) { const s = .3 + th * .4 + r() * .3; add('Rock_Medium_' + (1 + Math.floor(r() * 3)), cx, groundH(cx, cz) - .35 * s, cz, s, r() * 6.28, { col: pick(r, ROCKC) }); if (r() < .6) under(cx + 1.2, cz + (r() - .5) * 2, .7); }
      } else if (v === T.GRAVEL) {
        for (let q = 0; q < 2; q++) { const x = tx * TS + r() * 2, z = ty * TS + r() * 2; add(pick(r, ['Pebble_Round_1', 'Pebble_Round_3', 'Pebble_Square_2', 'Pebble_Square_4']), x, groundH(x, z) - .02, z, 1.6 + r() * 2, r() * 6.28, { col: pick(r, ['#f0ece4', '#e4e0d8', '#d8d4cc']) }); }
        if (r() < .08) { const s = .5 + r() * .6; add('Rock_Medium_' + (1 + Math.floor(r() * 3)), cx, groundH(cx, cz) - .3 * s, cz, s, r() * 6.28, { col: '#d0ccc4' }); }
      } else if (v === T.SHRUB || v === T.GRASS) {
        const edge = nt > 0, z0 = zoneT(tx, ty);
        if (z0 === ZN.DESERTO || z0 === ZN.CITTA) { }
        else if (edge && r() < (v === T.SHRUB ? .8 : .55)) { under(cx, cz, 1); if (r() < .4) add('Grass_Wispy_Tall', tx * TS + r() * 2, 0, ty * TS + r() * 2, .9 + r() * .4, r() * 6.28, { ground: true, col: '#f0e4c0' }); }
        else if (v === T.SHRUB && th > .45 && r() < .5) add('Bush_Common', cx, groundH(cx, cz) - .1, cz, .55 + r() * .3, r() * 6.28, { col: pick(r, LEAF) });
        else if ((f & (MF.TERR | MF.ALTO | MF.BORGO) || M.elev[ii] > 3) && r() < .12) add('Grass_Wispy_Short', cx, groundH(cx, cz) - .05, cz, 1 + r() * .4, r() * 6.28, { col: '#f0e4c0' });
      }
      if (v !== T.DIRT && v !== T.CLIFF && v !== T.TREE && r() < .35 && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => isTrail(tx + dx, ty + dy))) { const x = tx * TS + r() * 2, z = ty * TS + r() * 2; add(pick(r, ['Pebble_Round_1', 'Pebble_Square_2', 'Pebble_Round_3']), x, groundH(x, z) - .02, z, 1.4 + r(), r() * 6.28, { col: '#d8d4cc' }); }
      if (f & 256 && v !== T.CLIFF) for (let q = 0; q < 3; q++) { const x = tx * TS + .5 + q * .5, z = ty * TS + .5 + q * .5; add('RockPath_Square_Small_1', x, groundH(x, z) - .05, z, .9, r() * .4, { col: '#b4b0a8' }); }
    }
    // muri a secco delle terrazze: una fila di pietre piatte sul ciglio (la parete sotto è dipinta a pietra)
    for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) {
      const tx = tx0 + i, ty = ty0 + j, ii = ty * G.GW + tx; if (!F || !(F[ii] & 512) || gT(tx, ty) !== T.CLIFF) continue;
      let best = null, bd = 1.1; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nn = (ty + dy) * G.GW + tx + dx, d = M.elev[ii] - M.elev[nn]; if (d > bd) { bd = d; best = [dx, dy]; } }
      if (!best) continue; const r = rng((tx * 9301 + ty * 4933) >>> 0);
      for (let q = 0; q < 3; q++) { const u = (q + .5) / 3 - .5, x = (tx + .5 + best[0] * .35) * TS + (best[0] ? 0 : u * TS), z = (ty + .5 + best[1] * .35) * TS + (best[1] ? 0 : u * TS); add('Pebble_Square_' + (r() < .5 ? 2 : 4), x, groundH(x, z) - .05, z, 2.6 + r() * .8, (best[0] ? Math.PI / 2 : 0) + (r() - .5) * .3, { sy: 1.6, col: pick(r, ['#c8c2b6', '#b8b2a6', '#d4cec2']) }); }
    }
    for (const [name, arr] of B) {
      const mdl = natModel(name); if (!mdl) continue;
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, z0 = 1e9, z1 = -1e9;
      arr.forEach(o => { if (o.ground) o.y = groundH(o.x, o.z) - .05; x0 = Math.min(x0, o.x); x1 = Math.max(x1, o.x); y0 = Math.min(y0, o.y); y1 = Math.max(y1, o.y + mdl.top * o.s * o.sy); z0 = Math.min(z0, o.z); z1 = Math.max(z1, o.z); });
      const sph = new THREE.Sphere(new THREE.Vector3((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), Math.hypot(x1 - x0, y1 - y0, z1 - z0) / 2 + 10);
      const tree = /Tree|Pine/.test(name);
      mdl.parts.forEach(p => {
        const g2 = p.geo.clone(); g2.boundingSphere = sph;
        const im = new THREE.InstancedMesh(g2, p.mat, arr.length);
        arr.forEach((o, k) => { nE.set(o.rx, o.ry, o.rz, 'YXZ'); nQ.setFromEuler(nE); nV.set(o.x, o.y, o.z); nS.set(o.s, o.s * o.sy, o.s); nM4.compose(nV, nQ, nS); im.setMatrixAt(k, nM4); im.setColorAt(k, nC.set(o.col || '#ffffff')); });
        im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
        im.castShadow = tree && !LOWQ.on; im.receiveShadow = !tree; grp.add(im);
      });
    }
    return grp;
  }
