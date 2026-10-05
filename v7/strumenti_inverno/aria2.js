  // ================= [luci3] ACQUA, NEBBIOLINA, VAPORE, FUMO =================
  // nebbiolina bassa che prende la luce dei lampioni e delle vetrine; fumo dai camini delle case abitate;
  // il vapore dei tombini preso dalla luce vicina.
  const AIR2 = { on: false };
  const MISTN = 14;
  function initAir2() {
    AIR2.on = true;
    // --- nebbiolina: due veli bassi, illuminati dalle sorgenti vicine ---
    AIR2.lp = Array.from({ length: MISTN }, () => new THREE.Vector3(0, -99, 0)); AIR2.lc = Array.from({ length: MISTN }, () => new THREE.Vector3());
    AIR2.mist = [[.55, 0], [1.5, 1]].map(([hy, k]) => {
      const mat = new THREE.ShaderMaterial({
        uniforms: { time: { value: 0 }, ctr: { value: new THREE.Vector2() }, base: { value: new THREE.Color() }, amt: { value: .2 }, k: { value: k }, lp: { value: AIR2.lp }, lc: { value: AIR2.lc } },
        vertexShader: 'varying vec3 vP; void main(){ vec4 w = modelMatrix*vec4(position,1.); vP = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }',
        fragmentShader: `uniform float time; uniform vec2 ctr; uniform vec3 base; uniform float amt; uniform float k; uniform vec3 lp[${MISTN}]; uniform vec3 lc[${MISTN}]; varying vec3 vP;
          float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
          float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
          void main(){
            vec2 p = vP.xz*.11 + vec2(time*.03*(1.+k), time*.017);
            float f = n(p)*.55 + n(p*2.1+5.)*.3 + n(p*4.7+9.)*.15;
            float a = smoothstep(.3, .75, f) * amt * (1. - smoothstep(30., 46., distance(vP.xz, ctr)));
            vec3 L = vec3(0.); for (int i=0;i<${MISTN};i++){ vec3 q = lp[i]; float dd = distance(vP.xz, q.xz); float rr = 3.5 + max(0., q.y - vP.y) * 1.2; L += lc[i] * pow(max(0., 1. - dd/rr), 2.); }
            vec3 col = base + L;
            gl_FragColor = vec4(col, a * (.55 + min(1., dot(L, vec3(.33))) * 1.2)); }`,
        transparent: true, depthWrite: false, fog: false,
      });
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(100, 100, 1, 1), mat); pl.rotation.x = -Math.PI / 2; pl.renderOrder = 4; pl.userData.hy = hy; scene.add(pl); return pl;
    });
    // --- camini: sulle case (non sul regime né sui magazzini), uno su due fuma ---
    AIR2.ch = [];
    const brick = sm('#8a6656', { roughness: 1 }), capM = sm('#4a4644', { roughness: 1 });
    dyn.buildings.forEach((rec, bi) => {
      const b = rec.b, bb = rec.box3; if (!b || !bb || b.warehouse) return;
      const u = String(b.use || '') + String(b.kind || ''); if (/caserma|rocca|hangar|deposito|commiss|cultura|baracca|chiesa/.test(u)) return;
      const w = bb.max.x - bb.min.x, d = bb.max.z - bb.min.z; if (w < 3 || d < 3) return;
      const r = rng(bi * 977 + 13); if (r() < .3) return;
      const top = rec.flat ? bb.max.y - 2.5 : bb.max.y - .5, cx = bb.min.x + w * (.2 + r() * .6), cz = bb.min.z + d * (.2 + r() * .6);
      const g = new THREE.Group(), hh = 1.3 + r() * .7;
      const st = box(.7, hh, .7, brick); st.position.set(0, hh / 2, 0); g.add(st);
      const cap = box(.9, .12, .9, capM); cap.position.set(0, hh + .05, 0); g.add(cap);
      g.position.set(cx, top, cz); scene.add(g);
      if (r() < .62) AIR2.ch.push({ x: cx, y: top + hh + .15, z: cz, ph: r() * 20, k: .8 + r() * .5 });
    });
    const smM = new THREE.SpriteMaterial({ map: smokeTexture(), color: '#6a6c70', transparent: true, opacity: 0, depthWrite: false });
    AIR2.smoke = []; for (let i = 0; i < 150; i++) { const sp = new THREE.Sprite(smM.clone()); sp.visible = false; sp.renderOrder = 3; scene.add(sp); AIR2.smoke.push(sp); }
    // --- tombini: il chiusino sotto ogni sbuffo di vapore in strada ---
    const lidM = sm('#1a1a1e', { roughness: .5, metalness: .5 }), seen = {};
    VX.steam.forEach(s => { if (s.k > .9) return; const key = Math.round(s.x * 4) + ',' + Math.round(s.z * 4); if (seen[key]) return; seen[key] = 1;
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(.42, .42, .04, 14), lidM); lid.position.set(s.x, s.y - .02, s.z); scene.add(lid); });
  }
  function tickAir2(time, night) {
    if (!AIR2.on) initAir2();
    // nebbiolina: le sorgenti più vicine la accendono
    const src = (dyn.reflList || []).filter(L => !L.off && L.base > 0);
    for (let i = 0; i < MISTN; i++) { const L = src[i];
      if (L) { AIR2.lp[i].set(L.x, L.y, L.z); const kk = night * Math.min(1.4, L.base * .35) * (L.spill ? .7 : 1); AIR2.lc[i].set(L.color.r * kk, L.color.g * kk, L.color.b * kk); }
      else { AIR2.lp[i].set(0, -99, 0); AIR2.lc[i].set(0, 0, 0); } }
    AIR2.mist.forEach((pl, k) => { const U = pl.material.uniforms; U.time.value = time; U.ctr.value.set(cam.x, cam.y);
      pl.position.set(cam.x, cam.h + pl.userData.hy, cam.y);
      U.base.value.copy(scene.fog.color).multiplyScalar(.55 + (1 - night) * .6); U.amt.value = (.16 + night * .1) * (k ? .7 : 1); });
    // fumo dai camini vicini: sale, si allarga, il vento lo piega verso est
    let q = 0; const cx = cam.x, cz = cam.y;
    const near = AIR2.ch.filter(c => { const a = c.x - cx, b = c.z - cz; return a * a + b * b < 55 * 55; });
    for (const c of near) { for (let j = 0; j < 5 && q < AIR2.smoke.length; j++) {
      const t = ((time * .12 + c.ph + j * .2) % 1), sp = AIR2.smoke[q++], sz = (.7 + t * 3.4) * c.k;
      sp.position.set(c.x + t * t * 4.5 + Math.sin(time * .7 + c.ph + j) * .3 * t, c.y + .2 + t * 5, c.z + t * .8); sp.material.rotation = c.ph + j + t;
      sp.scale.set(sz, sz, 1); sp.material.opacity = Math.pow(1 - t, 1.3) * Math.min(1, t * 6) * (.62 - night * .2);
      sp.material.color.setRGB(.3 + night * .32, .31 + night * .32, .33 + night * .32); sp.visible = true; } }   // fumo di carbone: scuro sulla neve di giorno, chiaro nel buio
    for (; q < AIR2.smoke.length; q++) AIR2.smoke[q].visible = false;
    // vapore dei tombini: di notte prende il colore della luce più vicina
    if (!AIR2.tinted && LSRC.length) { AIR2.tinted = true; VX.steam.forEach(s => { let best = null, bd = 64; LSRC.forEach(L => { if (L.off) return; const d = (L.x - s.x) ** 2 + (L.z - s.z) ** 2; if (d < bd) { bd = d; best = L; } }); s.lc = best ? best.color : null; }); }
    if (!AIR2.puffy) { AIR2.puffy = true; const st = smokeTexture(); VX.steam.forEach(s => { s.sp.material.map = st; s.sp.material.needsUpdate = true; }); }
    VX.steam.forEach(s => { if (!s.lc) return; s.sp.material.color.setRGB(.85, .86, .89).lerp(s.lc, night * .55); });
  }
