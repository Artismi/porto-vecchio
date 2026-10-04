  // ================= [inverno] VOLUMI E ARIA =================
  // Quello che sta tra il muro e la strada (zoccolo, gradini, neve ammucchiata, marciapiedi col cordolo)
  // e lo spessore dell'aria (coni di luce, aloni a terra, vapore, nebbia a strati che cresce con la distanza).
  const VX = { cones: [], decals: [], steam: [], fog: [] };
  function buildVolumes() {
    const T = G.T, r = rng(4242), I4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), S = new THREE.Vector3(), C = new THREE.Color();
    const big = new THREE.Sphere(new THREE.Vector3(G.WW / 2, 0, G.WH / 2), Math.hypot(G.WW, G.WH));
    // ---- zoccoli e gradini ----
    const plinthM = sm('#4a4642', { roughness: 1 }), stepM = sm('#6a6660', { roughness: 1 });
    const piles = [];
    dyn.buildings.forEach(rec => {
      const b = rec.b, g = rec.geo; if (!b || !g) return;
      const base = g.y0, low = Math.min(groundH(g.x0, g.z0), groundH(g.x0 + g.w, g.z0 + g.d), base);
      const zh = .55 + (base - low);
      const pl = box(g.w + .18, zh, g.d + .18, plinthM); pl.position.set(g.x0 + g.w / 2, low + zh / 2 - .02, g.z0 + g.d / 2); addStatic(pl);
      // gradini davanti alla porta
      if (b.door) {
        const [dx, dy] = b.door, cx = dx * TS + 1, cz = dy * TS + 1, side = dy >= b.y + b.h ? [0, 1] : dy < b.y ? [0, -1] : dx >= b.x + b.w ? [1, 0] : [-1, 0];
        const ex = side[0] ? (side[0] > 0 ? g.x0 + g.w : g.x0) : cx, ez = side[1] ? (side[1] > 0 ? g.z0 + g.d : g.z0) : cz;
        [[.5, .2], [1, .1]].forEach(([dep, hh], k) => { const st = box(side[0] ? dep : 1.7, hh + (base - low), side[1] ? dep : 1.7, stepM); st.position.set(ex + side[0] * dep / 2, low + (hh + base - low) / 2, ez + side[1] * dep / 2); addStatic(st); });
      }
      // neve ammucchiata contro i muri (non contro le porte né sul lato della strada principale tutta spalata)
      const sides = [[g.x0, g.z0 + g.d + .25, g.w, 0], [g.x0, g.z0 - .25, g.w, 0], [g.x0 + g.w + .25, g.z0, g.d, 1], [g.x0 - .25, g.z0, g.d, 1]];
      sides.forEach(([sx, sz, L, vert]) => {
        for (let u = .6; u < L - .4; u += 1.3 + r() * .6) {
          const px = vert ? sx : sx + u, pz = vert ? sz + u : sz, tx = Math.floor(px / TS), tz = Math.floor(pz / TS), v = G.tileAt(tx, tz);
          if (v === T.VIA || v === T.WATER || v === T.BLD || (b.door && tx === b.door[0] && tz === b.door[1])) continue;
          if (r() < .25) continue;
          piles.push([px, groundH(px, pz), pz, 1 + r() * .9, .3 + r() * .35, .55 + r() * .3, vert]);
        }
      });
    });
    if (piles.length) {
      const geo = new THREE.SphereGeometry(1, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2); geo.boundingSphere = big;
      const im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#ffffff' }), piles.length);
      piles.forEach(([x, y, z, l, h, d, vert], k) => { E.set(0, vert ? Math.PI / 2 : 0, 0); Q.setFromEuler(E); V.set(x, y - .05, z); S.set(l, h, d); I4.compose(V, Q, S); im.setMatrixAt(k, I4); im.setColorAt(k, C.set(pick(r, ['#b4b8be', '#aaaeb4', '#bcc0c6', '#9ea2a8']))); });
      im.receiveShadow = true; im.castShadow = false; scene.add(im);
    }
    // (i marciapiedi sono ora una superficie liscia: buildSidewalks)
    // ---- coni di luce sotto lampioni e riflettori, aloni colorati a terra (neve bagnata) ----
    const glowT = glowTexture(), coneG = new THREE.ConeGeometry(1, 1, 14, 1, true); coneG.translate(0, -.5, 0);
    LSRC.forEach(L => {
      const gy = groundH(L.x, L.z), hh = L.y - gy;
      if (!L.always && hh > 2.5 && hh < 9 && VX.cones.length < 220) {
        const m = new THREE.Mesh(coneG, new THREE.MeshBasicMaterial({ color: L.color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
        m.position.set(L.x, L.y, L.z); m.scale.set(hh * .42, hh, hh * .42); scene.add(m); VX.cones.push(m);
      }
      if (VX.decals.length < 320) {
        const sz = Math.min(9, (L.dist || 8) * .7), d = new THREE.Mesh(new THREE.PlaneGeometry(sz, sz), new THREE.MeshBasicMaterial({ map: glowT, color: L.color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
        d.rotation.x = -Math.PI / 2; d.position.set(L.x, gy + .06, L.z); scene.add(d); VX.decals.push({ m: d, always: !!L.always });
      }
    });
    // ---- vapore: dai barili col fuoco e dai tombini del centro ----
    const vents = (typeof WX !== 'undefined' ? WX.fires : []).map(f => [f.g.position.x, f.g.position.y + .6, f.g.position.z, 1]);
    for (let k = 0; k < 600 && vents.length < 70; k++) { const x = 352 + r() * 110, z = 90 + r() * 80, v = G.tileAt(Math.floor(x / TS), Math.floor(z / TS)); if (v === T.VIA) vents.push([x, groundH(x, z) + .05, z, .7]); }
    const sMat = new THREE.SpriteMaterial({ map: glowT, color: '#d8dce4', transparent: true, opacity: 0, depthWrite: false });
    vents.forEach(([x, y, z, k]) => { for (let q = 0; q < 3; q++) { const sp = new THREE.Sprite(sMat.clone()); sp.position.set(x, y, z); scene.add(sp); VX.steam.push({ sp, x, y, z, k, ph: r() * 10 + q * 1.3 }); } });
    // ---- nebbia a strati: due veli che scorrono, radi vicino a te, fitti lontano ----
    [3, 7.5].forEach((hy, k) => {
      const mat = new THREE.ShaderMaterial({
        uniforms: { time: { value: 0 }, col: { value: new THREE.Color('#c0c4ca') }, ctr: { value: new THREE.Vector2() }, amt: { value: .3 }, k: { value: k } },
        vertexShader: 'varying vec3 vP; void main(){ vec4 w = modelMatrix*vec4(position,1.); vP = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }',
        fragmentShader: `uniform float time; uniform vec3 col; uniform vec2 ctr; uniform float amt; uniform float k; varying vec3 vP;
          float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
          float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
          void main(){ vec2 p = vP.xz*.035 + vec2(time*.012*(1.+k), time*.006);
            float f = n(p)*.6 + n(p*2.3+7.)*.3 + n(p*5.1+3.)*.1;
            float d = distance(vP.xz, ctr);
            float a = smoothstep(.38, .8, f) * smoothstep(18., 70., d) * amt;
            gl_FragColor = vec4(col, a); }`,
        transparent: true, depthWrite: false, fog: false,
      });
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(420, 420, 1, 1), mat); pl.rotation.x = -Math.PI / 2; pl.position.y = hy; pl.renderOrder = 5; scene.add(pl); VX.fog.push(pl);
    });
  }
  function tickVolumes(time, night) {
    VX.cones.forEach(m => { m.material.opacity = night * .07; m.visible = night > .05; });
    VX.decals.forEach(d => { d.m.material.opacity = (d.always ? .2 + night * .35 : night * .4); });
    VX.steam.forEach(s => { const t = ((time * .35 + s.ph) % 3) / 3, sz = (.6 + t * 2.2) * s.k; s.sp.position.set(s.x + Math.sin(time + s.ph) * .3 * t, s.y + t * 3.2, s.z + t * .8); s.sp.scale.set(sz, sz, 1); s.sp.material.opacity = (1 - t) * t * 1.1 * (.35 + night * .25); });
    VX.fog.forEach((pl, k) => { const U = pl.material.uniforms; U.time.value = time; U.col.value.copy(scene.fog.color).lerp(new THREE.Color('#d0d4da'), .3 * (1 - night)); U.ctr.value.set(cam.x, cam.y); U.amt.value = .22 + night * .1 - k * .06; pl.position.x = cam.x; pl.position.z = cam.y; });
  }
